/**
 * JudgeScoreEntry Page - Score entry for a specific event
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJudge } from '../contexts';
import {
  useCurrentOlympics,
  useEvent,
  useTeams,
  useEventScores,
  useMutation,
} from '../hooks/useApi';
import { apiClient } from '../lib/api';
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Loading,
  ScoreInput,
  TeamColorIndicator,
} from '../components';
import type { JudgeScore, Team } from '../lib/api';

export const JudgeScoreEntry: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { judgeName } = useJudge();

  const { data: olympics, loading: olympicsLoading } = useCurrentOlympics();
  const { data: event, loading: eventLoading } = useEvent(
    olympics?.year || null,
    eventId || null
  );
  const { data: teamsData, loading: teamsLoading } = useTeams(olympics?.year || null);
  const {
    data: scoresData,
    loading: scoresLoading,
    execute: refreshScores,
  } = useEventScores(olympics?.year || null, eventId || null);

  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});
  const [showAggregates, setShowAggregates] = useState(false);

  const { mutate: submitScore, loading: submitting, error: submitError } = useMutation(
    (year: number, eventId: string, data: any) =>
      apiClient.submitJudgeScore(year, eventId, data)
  );

  // Get teams that need scoring and calculate progress
  const { teamsToScore, totalTeams, scoredCount } = useMemo(() => {
    if (!teamsData?.teams || !judgeName) {
      return { teamsToScore: [], totalTeams: 0, scoredCount: 0 };
    }

    const judgeScores = (scoresData?.scores || []).filter(
      (score): score is JudgeScore =>
        'judgeName' in score && score.judgeName === judgeName
    );

    const scoredTeamIds = new Set(judgeScores.map((score) => score.teamId));
    const teamsToScore = teamsData.teams.filter(
      (team) => !scoredTeamIds.has(team.teamId)
    );

    return {
      teamsToScore,
      totalTeams: teamsData.teams.length,
      scoredCount: scoredTeamIds.size,
    };
  }, [teamsData, scoresData, judgeName]);

  const currentTeam = teamsToScore[currentTeamIndex];

  // Reset category scores when team changes
  useEffect(() => {
    // Reset to empty scores for each new team
    setCategoryScores({});
  }, [currentTeam?.teamId]);

  // Calculate total score and check if all categories are scored
  const { totalScore, allCategoriesScored } = useMemo(() => {
    const categoriesCount = event?.judgedCategories?.length || 0;
    const scoredCount = Object.keys(categoryScores).length;
    const total = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);
    
    return {
      totalScore: total,
      allCategoriesScored: scoredCount === categoriesCount && categoriesCount > 0,
    };
  }, [categoryScores, event?.judgedCategories]);

  const maxScore = (event?.judgedCategories?.length || 0) * 10;

  const handleScoreChange = (category: string, score: number) => {
    setCategoryScores((prev) => ({
      ...prev,
      [category]: score,
    }));
  };

  const handleSubmit = async () => {
    if (!olympics || !eventId || !currentTeam || !judgeName) return;
    
    // Validate that all categories have been scored
    if (!allCategoriesScored) {
      return;
    }

    const result = await submitScore(olympics.year, eventId, {
      judgeName,
      teamId: currentTeam.teamId,
      categoryScores,
    });

    if (result) {
      // Refresh scores to update the list
      await refreshScores();

      // After refresh, teamsToScore will be recalculated and the scored team removed
      // So we keep currentTeamIndex at 0 to always show the first unscored team
      // If there are more teams to score, stay at index 0 (next unscored team)
      // If no more teams, show aggregates
      // Note: teamsToScore.length here is the OLD length before refresh
      // We'll check in the next render cycle if there are more teams
      setCurrentTeamIndex(0);
      
      // Check if this was the last team (will be recalculated on next render)
      if (teamsToScore.length <= 1) {
        setShowAggregates(true);
      }
    }
  };

  const handleBack = () => {
    navigate('/judge/events');
  };

  if (olympicsLoading || eventLoading || teamsLoading || scoresLoading) {
    return <Loading />;
  }

  if (!olympics || !event) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-winter-gray">Event not found.</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Show aggregate view if all teams are scored or user requested it
  if (showAggregates || teamsToScore.length === 0) {
    return (
      <AggregateScoresView
        event={event}
        teams={teamsData?.teams || []}
        allScores={scoresData?.scores || []}
        judgeName={judgeName!}
        year={olympics!.year}
        eventId={eventId!}
        onBack={handleBack}
        onContinue={() => setShowAggregates(false)}
        hasMoreToScore={teamsToScore.length > 0}
        onRefresh={refreshScores}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowAggregates(true)}>
          View Scores
        </Button>
      </div>

      {/* Event Title */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold">{event.name}</h2>
        <p className="text-winter-gray mt-1">
          Scoring: {currentTeam?.name || 'Unknown Team'}
        </p>
        <p className="text-sm text-winter-gray mt-1">
          Team {scoredCount + 1} of {totalTeams}
        </p>
      </div>

      {/* Score Entry Card */}
      <Card teamColor={currentTeam?.color}>
        <CardBody className="space-y-6">
          {/* Team Name with Color Indicator */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <TeamColorIndicator color={currentTeam?.color} size="lg" />
            <h3 className="text-xl font-display font-semibold">{currentTeam?.name}</h3>
          </div>

          {/* Category Scores */}
          {event.judgedCategories?.map((category) => (
            <ScoreInput
              key={category}
              label={category}
              value={categoryScores[category] || null}
              onChange={(score) => handleScoreChange(category, score)}
              disabled={submitting}
            />
          ))}

          {/* Total Score Display */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium text-winter-dark">Total:</span>
              <span className="text-2xl font-display font-bold text-winter-accent">
                {totalScore} / {maxScore}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}
        </CardBody>

        <CardFooter className="space-y-3">
          <Button 
            fullWidth 
            onClick={handleSubmit} 
            loading={submitting}
            disabled={!allCategoriesScored}
          >
            Submit Scores
          </Button>

          {!allCategoriesScored && (
            <p className="text-center text-sm text-red-500">
              Please score all categories before submitting
            </p>
          )}

          {allCategoriesScored && teamsToScore.length > 1 && (
            <p className="text-center text-sm text-winter-gray">
              Next: {teamsToScore[1]?.name} →
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

interface AggregateScoresViewProps {
  event: any;
  teams: Team[];
  allScores: any[];
  judgeName: string;
  year: number;
  eventId: string;
  onBack: () => void;
  onContinue: () => void;
  hasMoreToScore: boolean;
  onRefresh: () => void;
}

const AggregateScoresView: React.FC<AggregateScoresViewProps> = ({
  event,
  teams,
  allScores,
  judgeName,
  year,
  eventId,
  onBack,
  onContinue,
  hasMoreToScore,
  onRefresh,
}) => {
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [editScores, setEditScores] = useState<Record<string, number>>({});

  const { mutate: updateScore, loading: updating } = useMutation(
    (year: number, eventId: string, data: any) =>
      apiClient.updateJudgeScore(year, eventId, data)
  );

  const { mutate: deleteScore, loading: deleting } = useMutation(
    (year: number, eventId: string, scoreId: string) =>
      apiClient.deleteScore(year, eventId, scoreId)
  );
  // Calculate aggregate scores
  const aggregates = useMemo(() => {
    const teamScores: Record<
      string,
      {
        team: Team;
        totalScore: number;
        categoryTotals: Record<string, number>;
        judgeCount: number;
      }
    > = {};

    // Initialize for all teams
    teams.forEach((team) => {
      teamScores[team.teamId] = {
        team,
        totalScore: 0,
        categoryTotals: {},
        judgeCount: 0,
      };
    });

    // Aggregate judge scores
    allScores
      .filter((score): score is JudgeScore => 'judgeName' in score)
      .forEach((score) => {
        if (!teamScores[score.teamId]) return;

        const teamScore = teamScores[score.teamId];
        teamScore.judgeCount++;

        Object.entries(score.categoryScores).forEach(([category, value]) => {
          teamScore.categoryTotals[category] =
            (teamScore.categoryTotals[category] || 0) + value;
          teamScore.totalScore += value;
        });
      });

    // Sort by total score descending
    return Object.values(teamScores)
      .filter((ts) => ts.judgeCount > 0)
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [teams, allScores]);

  const myScores = useMemo(() => {
    return allScores.filter(
      (score): score is JudgeScore =>
        'judgeName' in score && score.judgeName === judgeName
    );
  }, [allScores, judgeName]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back to Events
        </Button>
        {hasMoreToScore && (
          <Button variant="secondary" size="sm" onClick={onContinue}>
            Continue Scoring
          </Button>
        )}
      </div>

      {/* Event Title */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold">{event.name}</h2>
        <p className="text-winter-gray mt-1">Score Summary</p>
      </div>

      {/* Your Scores */}
      <div className="space-y-3">
        <h3 className="text-lg font-display font-semibold">Your Scores</h3>
        {myScores.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-winter-gray py-4">
                You haven't scored any teams yet.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {myScores.map((score) => {
              const team = teams.find((t) => t.teamId === score.teamId);
              const total = Object.values(score.categoryScores).reduce(
                (sum, val) => sum + val,
                0
              );
              const isEditing = editingScoreId === score.scoreId;
              
              return (
                <Card key={score.scoreId} teamColor={team?.color}>
                  <CardBody className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TeamColorIndicator color={team?.color} />
                        <span className="font-medium">{team?.name}</span>
                      </div>
                      <span className="text-lg font-semibold text-winter-accent">
                        {isEditing 
                          ? Object.values(editScores).reduce((sum, val) => sum + val, 0)
                          : total
                        } pts
                      </span>
                    </div>

                    {/* Category Breakdown */}
                    {isEditing ? (
                      <div className="space-y-3 pt-3 border-t border-gray-200">
                        {event.judgedCategories?.map((category: string) => (
                          <ScoreInput
                            key={category}
                            label={category}
                            value={editScores[category] || null}
                            onChange={(newScore) =>
                              setEditScores((prev) => ({ ...prev, [category]: newScore }))
                            }
                            disabled={updating}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(score.categoryScores).map(([category, value]) => (
                          <div key={category} className="flex justify-between">
                            <span className="text-winter-gray">{category}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={async () => {
                              const result = await updateScore(year, eventId, {
                                judgeName,
                                teamId: score.teamId,
                                categoryScores: editScores,
                              });
                              if (result) {
                                setEditingScoreId(null);
                                setEditScores({});
                                await onRefresh();
                              }
                            }}
                            loading={updating}
                            disabled={Object.keys(editScores).length !== event.judgedCategories?.length}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingScoreId(null);
                              setEditScores({});
                            }}
                            disabled={updating}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingScoreId(score.scoreId);
                              setEditScores(score.categoryScores);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              if (confirm(`Delete your score for ${team?.name}?`)) {
                                const result = await deleteScore(year, eventId, score.scoreId);
                                if (result) {
                                  await onRefresh();
                                }
                              }
                            }}
                            loading={deleting}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Aggregate Scores */}
      <div className="space-y-3">
        <h3 className="text-lg font-display font-semibold">Current Standings</h3>
        {aggregates.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-center text-winter-gray py-4">
                No scores submitted yet.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {aggregates.map((agg, index) => {
              const isLeader = index === 0;
              return (
                <Card
                  key={agg.team.teamId}
                  teamColor={agg.team.color}
                  className={isLeader ? 'ring-2 ring-yellow-400' : ''}
                >
                  <CardBody>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isLeader && <span className="text-2xl">👑</span>}
                          <TeamColorIndicator color={agg.team.color} />
                          <div>
                            <div className="font-medium">{agg.team.name}</div>
                            <div className="text-xs text-winter-gray">
                              {agg.judgeCount} judge{agg.judgeCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-display font-bold text-winter-accent">
                            {agg.totalScore}
                          </div>
                          <div className="text-xs text-winter-gray">total pts</div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

