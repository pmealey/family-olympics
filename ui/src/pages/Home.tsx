import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, CardBody, Logo, TeamColorIndicator, Loading, PageTransition, RefreshButton } from '../components';
import { useCurrentOlympics, useTeams, useScores, useEvents } from '../hooks/useApi';
import { calculateStandings, getMedalEmoji, formatPoints, getCompletedEventsCount } from '../lib/standings';

export const Home: React.FC = () => {
  const { data: olympics, loading: olympicsLoading, error: olympicsError, execute: refetchOlympics } = useCurrentOlympics();
  const { data: teamsData, loading: teamsLoading, execute: refetchTeams } = useTeams(olympics?.year || null);
  const { data: scoresData, loading: scoresLoading, execute: refetchScores } = useScores(olympics?.year || null);
  const { data: eventsData, loading: eventsLoading, execute: refetchEvents } = useEvents(olympics?.year || null);

  const teams = teamsData?.teams || [];
  const scores = scoresData?.scores || [];
  const events = eventsData?.events || [];

  // Calculate standings
  const standings = useMemo(() => {
    if (!olympics || teams.length === 0) return [];
    return calculateStandings(olympics, teams, scores);
  }, [olympics, teams, scores]);

  const completedEventsCount = useMemo(() => {
    return getCompletedEventsCount(scores);
  }, [scores]);

  const isLoading = olympicsLoading || teamsLoading || scoresLoading || eventsLoading;

  const handleRefresh = async () => {
    await Promise.all([
      refetchOlympics(),
      refetchTeams(),
      refetchScores(),
      refetchEvents(),
    ]);
  };

  // Error state
  if (olympicsError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Failed to load Olympics data</p>
              <p className="text-winter-gray text-sm">{olympicsError}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      {/* Logo and Title */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 text-center">
        <Logo size="lg" className="mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-winter-dark">
          Family Olympics {olympics?.year || ''}
        </h2>
      </div>

      {/* Schedule CTA */}
      <Link className="block" to="/schedule">
        <Button variant="primary" size="lg" fullWidth>
          📅 Schedule
        </Button>
      </Link>

      {/* Gallery CTA */}
      <Link className="block" to="/gallery">
        <Button variant="secondary" size="lg" fullWidth>
          📷 Gallery
        </Button>
      </Link>

      {/* Current Standings */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="text-lg sm:text-xl font-display font-bold">
              Current Standings
            </h3>
            <RefreshButton onRefresh={handleRefresh} />
          </div>
          
          {isLoading ? (
            <div className="py-8">
              <Loading />
            </div>
          ) : standings.length === 0 ? (
            <div className="text-center py-8 text-winter-gray">
              <p>No teams or scores yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 sm:space-y-3">
                {standings.map((standing) => (
                  <Link
                    key={standing.team.teamId}
                    to={`/teams/${standing.team.teamId}`}
                    className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-gray-50 rounded-lg transition-all hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xl sm:text-2xl shrink-0">
                        {getMedalEmoji(standing.rank) || `${standing.rank}.`}
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <TeamColorIndicator color={standing.team.color} size="sm" />
                        <span className="font-semibold truncate">{standing.team.name}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-base sm:text-lg shrink-0">
                      {formatPoints(standing.totalPoints)}
                    </span>
                  </Link>
                ))}
              </div>
              
              <div className="text-center text-sm text-winter-gray mt-4">
                Events completed: {completedEventsCount}/{events.length}
              </div>
            </>
          )}
        </CardBody>
      </Card>
      </div>
    </PageTransition>
  );
};

