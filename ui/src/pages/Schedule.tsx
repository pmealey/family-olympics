import React, { useMemo } from 'react';
import { EventCard, Loading, Card, CardBody, PageTransition, EmptyState, ErrorMessage, RefreshButton } from '../components';
import { useCurrentOlympics, useEvents } from '../hooks/useApi';
import type { Event } from '../lib/api';

export const Schedule: React.FC = () => {
  const { data: olympics, loading: olympicsLoading, error: olympicsError, execute: refetchOlympics } = useCurrentOlympics();
  const { data: eventsData, loading: eventsLoading, error: eventsError, execute: refetchEvents } = useEvents(olympics?.year || null);

  const events = eventsData?.events || [];

  // Group events by day and sort by time
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, Event[]> = {
      0: [],
      1: [],
      2: [],
    };

    events.forEach((event) => {
      const day = event.scheduledDay === 1 || event.scheduledDay === 2 ? event.scheduledDay : 0;
      if (grouped[day]) {
        grouped[day].push(event);
      }
    });

    // Sort events within each day by scheduledTime
    Object.keys(grouped).forEach((dayKey) => {
      const day = parseInt(dayKey);
      grouped[day].sort((a, b) => {
        // Events without time go to the end
        if (!a.scheduledTime && !b.scheduledTime) return 0;
        if (!a.scheduledTime) return 1;
        if (!b.scheduledTime) return -1;
        return a.scheduledTime.localeCompare(b.scheduledTime);
      });
    });

    return grouped;
  }, [events]);

  // Format day header with date
  const formatDayHeader = (day: number) => {
    // scheduledTime only contains time (HH:MM), not date information
    // So we just return the day name
    return day === 1 ? 'Day 1' : 'Day 2';
  };

  const isLoading = olympicsLoading || eventsLoading;
  const error = olympicsError || eventsError;

  const handleRefresh = async () => {
    await Promise.all([refetchOlympics(), refetchEvents()]);
  };

  // Error state
  if (error) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold">Schedule</h2>
          <ErrorMessage
            title="Failed to load schedule"
            message={error}
            onRetry={handleRefresh}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Schedule</h2>
        <RefreshButton onRefresh={handleRefresh} />
      </div>

      {isLoading ? (
        <div className="py-8">
          <Loading />
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No events scheduled yet"
          description="Check back soon! Events will appear here once they're added."
        />
      ) : (
        <>
          {/* Unscheduled */}
          {eventsByDay[0].length > 0 && (
            <div>
              <h3 className="text-lg font-display font-semibold mb-3 text-winter-gray">
                Unscheduled
              </h3>
              <div className="space-y-6">
                {eventsByDay[0].map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            </div>
          )}

          {/* Day 1 */}
          <div>
            <h3 className="text-lg font-display font-semibold mb-3 text-winter-gray">
              {formatDayHeader(1)}
            </h3>
            {eventsByDay[1].length === 0 ? (
              <Card>
                <CardBody>
                  <div className="text-center py-4 text-winter-gray text-sm">
                    <p>No events scheduled for Day 1</p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-6">
                {eventsByDay[1].map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            )}
          </div>

          {/* Day 2 */}
          <div>
            <h3 className="text-lg font-display font-semibold mb-3 text-winter-gray">
              {formatDayHeader(2)}
            </h3>
            {eventsByDay[2].length === 0 ? (
              <Card>
                <CardBody>
                  <div className="text-center py-4 text-winter-gray text-sm">
                    <p>No events scheduled for Day 2</p>
                  </div>
                </CardBody>
              </Card>
            ) : (
              <div className="space-y-6">
                {eventsByDay[2].map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </PageTransition>
  );
};
