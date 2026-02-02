/**
 * JudgeEvents Page - List of events available for judging
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../contexts';
import { useCurrentOlympics, useEvents, useTeams, useEventScores } from '../hooks/useApi';
import { Card, CardBody, Button, Loading, StatusBadge } from '../components';
import type { Event, JudgeScore } from '../lib/api';

export const JudgeEvents: React.FC = () => {
  const navigate = useNavigate();
  const { judgeName, clearJudgeName } = useJudge();
  const { data: olympics, loading: olympicsLoading } = useCurrentOlympics();
  const { data: eventsData, loading: eventsLoading } = useEvents(
    olympics?.year || null,
    { status: 'in-progress' }
  );
  const { data: teamsData } = useTeams(olympics?.year || null);

  const judgedEvents = useMemo(() => {
    return eventsData?.events?.filter((event) => event.scoringType === 'judged') || [];
  }, [eventsData]);

  const handleEditName = () => {
    clearJudgeName();
    navigate('/judge');
  };

  if (olympicsLoading || eventsLoading) {
    return <Loading />;
  }

  if (!olympics) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold">Judge Portal</h2>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-winter-gray">No active Olympics found.</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">
            👋 Hi, {judgeName}!
          </h2>
          <p className="text-sm text-winter-gray mt-1">
            Select an event to score teams
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEditName}
          aria-label="Change judge name"
        >
          Edit
        </Button>
      </div>

      {/* Events to Judge */}
      <div className="space-y-4">
        <h3 className="text-lg font-display font-semibold">Events to Judge</h3>

        {judgedEvents.length === 0 ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <span className="text-6xl mb-4 block">📋</span>
                <p className="text-winter-gray">
                  No events are currently available for judging.
                </p>
                <p className="text-sm text-winter-gray mt-2">
                  Check back when events are in progress!
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          judgedEvents.map((event) => (
            <JudgeEventCard
              key={event.eventId}
              event={event}
              judgeName={judgeName!}
              year={olympics.year}
              teams={teamsData?.teams || []}
              onScore={() => navigate(`/judge/events/${event.eventId}/score`)}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface JudgeEventCardProps {
  event: Event;
  judgeName: string;
  year: number;
  teams: Array<{ teamId: string; name: string }>;
  onScore: () => void;
}

const JudgeEventCard: React.FC<JudgeEventCardProps> = ({
  event,
  judgeName,
  year,
  teams,
  onScore,
}) => {
  const { data: scoresData } = useEventScores(year, event.eventId);

  const scoringStatus = useMemo(() => {
    if (!scoresData?.scores) {
      return { scored: [], unscored: teams };
    }

    const judgeScores = scoresData.scores.filter(
      (score): score is JudgeScore =>
        'judgeName' in score && score.judgeName === judgeName
    );

    const scoredTeamIds = new Set(judgeScores.map((score) => score.teamId));
    const scored = teams.filter((team) => scoredTeamIds.has(team.teamId));
    const unscored = teams.filter((team) => !scoredTeamIds.has(team.teamId));

    return { scored, unscored };
  }, [scoresData, teams, judgeName]);

  const isComplete = scoringStatus.unscored.length === 0 && teams.length > 0;

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          {/* Event Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-lg font-display font-semibold">
                {event.name || 'Untitled Event'}
              </h4>
              {event.location && (
                <p className="text-sm text-winter-gray mt-1">📍 {event.location}</p>
              )}
            </div>
            <StatusBadge status={event.status} />
          </div>

          {/* Scoring Progress */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-winter-dark">Your scores:</p>
            <div className="grid grid-cols-2 gap-2">
              {scoringStatus.scored.map((team) => (
                <div
                  key={team.teamId}
                  className="flex items-center text-sm text-green-600"
                >
                  <span className="mr-2">✓</span>
                  <span>{team.name}</span>
                </div>
              ))}
              {scoringStatus.unscored.map((team) => (
                <div
                  key={team.teamId}
                  className="flex items-center text-sm text-winter-gray"
                >
                  <span className="mr-2">○</span>
                  <span>{team.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {isComplete ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600 font-medium">
                  ✓ All teams scored
                </span>
                <Button variant="ghost" size="sm" onClick={onScore}>
                  View Scores
                </Button>
              </div>
            ) : (
              <Button fullWidth onClick={onScore}>
                {scoringStatus.scored.length > 0 ? 'Continue Scoring' : 'Start Scoring'}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

