import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardBody, Loading, PageTransition, TeamColorIndicator, ErrorMessage, RefreshButton, MediaUpload } from '../components';
import { useCurrentOlympics, useTeam, useEvents, useTeams } from '../hooks/useApi';

export const TeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: olympics, loading: olympicsLoading, execute: refetchOlympics } = useCurrentOlympics();
  const { data: team, loading: teamLoading, error: teamError, execute: refetchTeam } = useTeam(
    olympics?.year ?? null,
    teamId ?? null
  );
  const { data: eventsData } = useEvents(olympics?.year ?? null);
  const { data: teamsData } = useTeams(olympics?.year ?? null);

  const events = eventsData?.events ?? [];
  const teams = teamsData?.teams ?? [];
  const isLoading = olympicsLoading || teamLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchOlympics(), refetchTeam()]);
  };

  if (teamError) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <header className="space-y-1">
            <Link
              to="/"
              className="inline-block text-sm text-winter-gray hover:text-winter-accent transition-colors rounded focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
              aria-label="Back to home"
            >
              ← Back to Home
            </Link>
          </header>
          <ErrorMessage
            title="Failed to load team"
            message={teamError}
            onRetry={handleRefresh}
          />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <header className="space-y-1">
          <Link
            to="/"
            className="inline-block text-sm text-winter-gray hover:text-winter-accent transition-colors rounded focus:outline-none focus:ring-2 focus:ring-winter-accent/50"
            aria-label="Back to home"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-winter-dark m-0">
              Team roster
            </h1>
            <RefreshButton onRefresh={handleRefresh} />
          </div>
        </header>

        {isLoading ? (
          <div className="py-8">
            <Loading />
          </div>
        ) : team ? (
          <Card>
            <CardBody>
              <div className="flex items-center gap-3 mb-6">
                <TeamColorIndicator color={team.color} size="md" />
                <h2 className="text-lg sm:text-xl font-display font-bold text-winter-dark m-0">
                  {team.name}
                </h2>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-winter-gray uppercase tracking-wide mb-2">
                  Members
                </h3>
                {team.members && team.members.length > 0 ? (
                  <ul className="list-none p-0 m-0 space-y-2">
                    {team.members.map((member, index) => (
                      <li
                        key={index}
                        className="py-2 px-3 bg-gray-50 rounded-lg text-winter-dark"
                      >
                        {member}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-winter-gray text-sm">No members listed</p>
                )}
              </div>

              {/* Gallery section */}
              {olympics?.year && teamId && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-winter-gray uppercase tracking-wide mb-2">
                    Photos &amp; videos
                  </h3>
                  <p className="text-winter-gray text-sm mb-3">
                    View or upload photos and videos for this team.
                  </p>
                  <Link
                    to={`/gallery?teamId=${encodeURIComponent(teamId)}`}
                    className="inline-block mb-4"
                  >
                    <span className="text-winter-accent hover:text-winter-accent-dark font-medium text-sm">
                      📷 View gallery →
                    </span>
                  </Link>
                  <MediaUpload
                    year={olympics.year}
                    events={events}
                    teams={teams}
                    initialTeamId={teamId}
                    onUploadComplete={() => {}}
                  />
                </div>
              )}
            </CardBody>
          </Card>
        ) : null}
      </div>
    </PageTransition>
  );
};
