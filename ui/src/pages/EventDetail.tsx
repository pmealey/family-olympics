import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Card, CardBody, StatusBadge, TeamColorIndicator, Loading } from '../components';
import { useCurrentOlympics, useEvent, useEventScores, useTeams } from '../hooks/useApi';
import type { PlacementScore, Team } from '../lib/api';
import { formatPoints } from '../lib/standings';

export const EventDetail: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: olympics, loading: olympicsLoading } = useCurrentOlympics();
  const { data: event, loading: eventLoading, error: eventError } = useEvent(
    olympics?.year || null,
    eventId || null
  );
  const { data: scoresData, loading: scoresLoading } = useEventScores(
    olympics?.year || null,
    eventId || null
  );
  const { data: teamsData, loading: teamsLoading } = useTeams(olympics?.year || null);

  const scores = scoresData?.scores || [];
  const teams = teamsData?.teams || [];

  // Create a map of teamId to team for quick lookup
  const teamMap = useMemo(() => {
    const map: Record<string, Team> = {};
    teams.forEach((team) => {
      map[team.teamId] = team;
    });
    return map;
  }, [teams]);

  // Get placement scores sorted by place
  const placementScores = useMemo(() => {
    const placements = scores.filter(
      (score): score is PlacementScore => 'place' in score && 'rawScore' in score
    );
    return placements.sort((a, b) => a.place - b.place);
  }, [scores]);

  // Calculate points for each placement
  const getPointsForPlace = (place: number): number => {
    if (!olympics?.placementPoints) return 0;
    return olympics.placementPoints[place.toString()] || 0;
  };

  // Format time for display
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';

    try {
      // Time is always in HH:MM format from the admin time input
      // Prepend a date to make it parseable
      const date = new Date(`2000-01-01T${timeString}`);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return timeString;
      }
      
      // Only show the time portion (not the dummy date)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  // Get medal emoji
  const getMedalEmoji = (place: number): string => {
    switch (place) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      case 4:
        return '🏅';
      default:
        return '';
    }
  };

  const isLoading = olympicsLoading || eventLoading || scoresLoading || teamsLoading;

  // Error state
  if (eventError) {
    return (
      <div className="space-y-6">
        <Link to="/schedule">
          <Button variant="ghost" size="sm">
            ← Back to Schedule
          </Button>
        </Link>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Failed to load event</p>
              <p className="text-winter-gray text-sm">{eventError}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link to="/schedule">
          <Button variant="ghost" size="sm">
            ← Back to Schedule
          </Button>
        </Link>
        <div className="py-8">
          <Loading />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-6">
        <Link to="/schedule">
          <Button variant="ghost" size="sm">
            ← Back to Schedule
          </Button>
        </Link>
        <Card>
          <CardBody>
            <div className="text-center py-8 text-winter-gray">
              <p>Event not found</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const hasDay = event.scheduledDay === 1 || event.scheduledDay === 2;
  const hasTime = Boolean(event.scheduledTime);
  const hasDateRow = hasDay || hasTime;

  return (
    <div className="space-y-6">
      <Link to="/schedule">
        <Button variant="ghost" size="sm">
          ← Back to Schedule
        </Button>
      </Link>

      {/* Event Header */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-display font-bold">{event.name || 'Untitled Event'}</h2>
            <StatusBadge completed={event.completed} />
          </div>

          <div className="space-y-2 text-winter-gray">
            {event.sponsor && (
              <div className="flex items-center space-x-2">
                <span>🤝</span>
                <span>Sponsored by {event.sponsor}</span>
              </div>
            )}

            {hasDateRow && (
              <div className="flex items-center space-x-2">
                <span>📅</span>
                <span>
                  {hasDay && `Day ${event.scheduledDay}`}
                  {hasDay && hasTime ? ' • ' : ''}
                  {hasTime ? formatTime(event.scheduledTime || undefined) : ''}
                </span>
              </div>
            )}

            {event.location && (
              <div className="flex items-center space-x-2">
                <span>📍</span>
                <span>{event.location}</span>
              </div>
            )}

            {event.scoringType && (
              <div className="flex items-center space-x-2">
                <span>🎯</span>
                <span className="capitalize">
                  {event.scoringType === 'judged'
                    ? `Judged Event${event.judgedCategories?.length ? ` (${event.judgedCategories.length} categories)` : ''}`
                    : event.scoringType === 'none'
                    ? 'Non-Scoring Event'
                    : 'Placement Event'}
                </span>
              </div>
            )}
          </div>

          {event.details && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-winter-gray whitespace-pre-wrap">{event.details}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Results Section - show for completed scoring events with scores */}
      {event.scoringType !== 'none' && event.completed && placementScores.length > 0 && (
        <Card>
          <CardBody>
            <h3 className="text-xl font-display font-bold mb-4">Results</h3>
            <div className="space-y-3">
              {placementScores.map((score) => {
                const team = teamMap[score.teamId];
                if (!team) return null;

                const points = getPointsForPlace(score.place);

                return (
                  <div
                    key={score.scoreId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-2xl min-w-[2.5rem]">
                        {getMedalEmoji(score.place) || `${score.place}.`}
                      </span>
                      <TeamColorIndicator color={team.color} size="sm" />
                      <div className="flex-1">
                        <div className="font-semibold">{team.name}</div>
                        <div className="text-sm text-winter-gray">
                          {score.rawScore}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-lg">
                        +{formatPoints(points)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Awaiting Results Message - show for incomplete scoring events */}
      {event.scoringType !== 'none' && !event.completed && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="text-xl font-display font-bold mb-2">
                Awaiting Results
              </h3>
              <p className="text-winter-gray">
                Results will appear here once scoring is complete
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Rules Section */}
      {event.rulesUrl && (
        <Card>
          <CardBody>
            <h3 className="text-xl font-display font-bold mb-4">
              Rules & Regulations
            </h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
              <iframe
                src={event.rulesUrl}
                className="w-full h-full"
                style={{ minHeight: '400px', border: 'none' }}
                title={`Rules for ${event.name || 'Untitled Event'}`}
              />
            </div>
            <div className="mt-4 text-center">
              <a
                href={event.rulesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-winter-accent hover:text-winter-accent-dark font-medium"
              >
                Open rules in new tab →
              </a>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};

