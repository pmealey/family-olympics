/**
 * JudgeEvents Page - List of events available for judging
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../contexts';
import { useCurrentOlympics, useEvents, useTeams, useEventScores } from '../hooks/useApi';
import { Card, CardBody, Button, Loading } from '../components';
import type { Event, JudgeScore } from '../lib/api';

export const JudgeEvents: React.FC = () => {
  const navigate = useNavigate();
  const { judgeName, judgeTeamId, clearJudgeName } = useJudge();
  const { data: olympics, loading: olympicsLoading } = useCurrentOlympics();
  const { data: eventsData, loading: eventsLoading } = useEvents(
    olympics?.year || null
  );
  const { data: teamsData } = useTeams(olympics?.year || null);

  const judgedEvents = useMemo(() => {
    // Show judged events that are NOT completed
    return eventsData?.events?.filter((event) => 
      event.scoringType === 'judged' && !event.completed
    ) || [];
  }, [eventsData]);

  // Team reps judge only the other three teams; CUNF judges all four
  const teamsJudgeCanScore = useMemo(() => {
    const teams = teamsData?.teams ?? [];
    if (judgeTeamId) {
      return teams.filter((t) => t.teamId !== judgeTeamId);
    }
    return teams;
  }, [teamsData?.teams, judgeTeamId]);

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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-display font-bold truncate">
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
          className="shrink-0"
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
                  All judged events have been completed.
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
              teams={teamsJudgeCanScore}
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
  const { data: scoresData, loading: scoresLoading } = useEventScores(year, event.eventId);

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
          </div>

          {/* Scoring Progress */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-winter-dark">Your scores:</p>
            {scoresLoading ? (
              <div className="flex items-center gap-2 text-sm text-winter-gray py-2">
                <div className="w-4 h-4 border-2 border-winter-gray/30 border-t-winter-blue rounded-full animate-spin" />
                <span>Loading scores...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-1 sm:gap-2">
                {scoringStatus.scored.map((team) => (
                  <div
                    key={team.teamId}
                    className="flex items-center text-sm text-green-600"
                  >
                    <span className="mr-2 shrink-0">✓</span>
                    <span className="truncate">{team.name}</span>
                  </div>
                ))}
                {scoringStatus.unscored.map((team) => (
                  <div
                    key={team.teamId}
                    className="flex items-center text-sm text-winter-gray"
                  >
                    <span className="mr-2 shrink-0">○</span>
                    <span className="truncate">{team.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {scoresLoading ? (
              <Button fullWidth disabled>
                Loading...
              </Button>
            ) : isComplete ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
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

