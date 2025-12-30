import React, { useMemo } from 'react';
import { EventCard, Loading, Card, CardBody } from '../components';
import { useCurrentOlympics, useEvents } from '../hooks/useApi';
import type { Event } from '../lib/api';

export const Schedule: React.FC = () => {
  const { data: olympics, loading: olympicsLoading, error: olympicsError } = useCurrentOlympics();
  const { data: eventsData, loading: eventsLoading, error: eventsError } = useEvents(olympics?.year || null);

  const events = eventsData?.events || [];

  // Group events by day and sort by displayOrder and time
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, Event[]> = {
      1: [],
      2: [],
    };

    events.forEach((event) => {
      const day = event.scheduledDay || 1;
      if (grouped[day]) {
        grouped[day].push(event);
      }
    });

    // Sort events within each day by displayOrder, then by time
    Object.keys(grouped).forEach((dayKey) => {
      const day = parseInt(dayKey);
      grouped[day].sort((a, b) => {
        // First sort by displayOrder if available
        if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
          if (a.displayOrder !== b.displayOrder) {
            return a.displayOrder - b.displayOrder;
          }
        }
        // Then by time
        if (a.scheduledTime && b.scheduledTime) {
          return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
        }
        return 0;
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold">Schedule</h2>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Failed to load schedule</p>
              <p className="text-winter-gray text-sm">{error}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Schedule</h2>
      </div>

      {isLoading ? (
        <div className="py-8">
          <Loading />
        </div>
      ) : events.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8 text-winter-gray">
              <p>No events scheduled yet</p>
              <p className="text-sm mt-2">Check back soon!</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
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
              <div className="space-y-3">
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
              <div className="space-y-3">
                {eventsByDay[2].map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
