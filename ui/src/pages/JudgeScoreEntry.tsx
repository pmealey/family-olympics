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
  const { judgeName, judgeTeamId } = useJudge();

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

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [categoryScores, setCategoryScores] = useState<Record<string, number>>({});
  const [showAggregates, setShowAggregates] = useState(false);

  const { mutate: submitScore, loading: submitting, error: submitError } = useMutation(
    (year: number, eventId: string, data: any) =>
      apiClient.submitJudgeScore(year, eventId, data)
  );

  // Teams this judge is allowed to score (team reps exclude their own team)
  const allowedTeams = useMemo(() => {
    const teams = teamsData?.teams ?? [];
    if (judgeTeamId) {
      return teams.filter((t) => t.teamId !== judgeTeamId);
    }
    return teams;
  }, [teamsData?.teams, judgeTeamId]);

  // Get teams that still need scoring and progress
  const { teamsToScore, totalTeams, scoredCount } = useMemo(() => {
    if (!allowedTeams.length || !judgeName) {
      return { teamsToScore: [], totalTeams: 0, scoredCount: 0 };
    }

    const judgeScores = (scoresData?.scores || []).filter(
      (score): score is JudgeScore =>
        'judgeName' in score && score.judgeName === judgeName
    );

    const scoredTeamIds = new Set(judgeScores.map((score) => score.teamId));
    const teamsToScore = allowedTeams.filter(
      (team) => !scoredTeamIds.has(team.teamId)
    );

    return {
      teamsToScore,
      totalTeams: allowedTeams.length,
      scoredCount: scoredTeamIds.size,
    };
  }, [allowedTeams, scoresData, judgeName]);

  const currentTeam = selectedTeamId
    ? teamsToScore.find((t) => t.teamId === selectedTeamId) ?? null
    : null;

  // Reset category scores when selected team changes
  useEffect(() => {
    setCategoryScores({});
  }, [selectedTeamId]);

  // Clear selection if selected team was just scored (no longer in list)
  const selectedStillUnscored = selectedTeamId && teamsToScore.some((t) => t.teamId === selectedTeamId);
  useEffect(() => {
    if (selectedTeamId && !selectedStillUnscored) {
      setSelectedTeamId(null);
    }
  }, [selectedTeamId, selectedStillUnscored]);

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
      await refreshScores();
      setSelectedTeamId(null);
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

  const judgedCategories = (event.judgedCategories || []).filter(Boolean);

  if (event.scoringType !== 'judged') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h3 className="text-xl font-display font-bold mb-2">
                This event isn’t a judged event
              </h3>
              <p className="text-winter-gray">
                Ask an admin to set the scoring type to “Judged”.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (judgedCategories.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h3 className="text-xl font-display font-bold mb-2">
                No judging categories configured
              </h3>
              <p className="text-winter-gray">
                Ask an admin to edit this event and add judging categories.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Check if event is completed - judges cannot score completed events
  if (event.completed) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack}>
          ← Back
        </Button>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">✅</span>
              <h3 className="text-xl font-display font-bold mb-2">
                Event Completed
              </h3>
              <p className="text-winter-gray">
                This event has been completed and can no longer be scored.
              </p>
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

  // Team picker: choose which team to score next (flexible order)
  if (!selectedTeamId || !currentTeam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            ← Back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAggregates(true)}>
            View Scores
          </Button>
        </div>
        <div className="text-center px-2">
          <h2 className="text-xl sm:text-2xl font-display font-bold break-words">{event.name || 'Untitled Event'}</h2>
          <p className="text-winter-gray mt-1">
            Choose a team to score ({scoredCount} of {totalTeams} done)
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {teamsToScore.map((team) => (
            <Card
              key={team.teamId}
              teamColor={team.color}
              onClick={() => setSelectedTeamId(team.teamId)}
            >
              <CardBody className="flex flex-row items-center gap-3">
                <TeamColorIndicator color={team.color} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-display font-semibold truncate">{team.name}</div>
                  <div className="text-sm text-winter-gray">Tap to enter scores</div>
                </div>
                <span className="text-winter-gray shrink-0">→</span>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Score entry form for the selected team
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => setSelectedTeamId(null)}>
          ← Team list
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowAggregates(true)}>
          View Scores
        </Button>
      </div>

      <div className="text-center px-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold break-words">{event.name || 'Untitled Event'}</h2>
        <p className="text-winter-gray mt-1 truncate">
          Scoring: {currentTeam.name}
        </p>
        <p className="text-sm text-winter-gray mt-1">
          {scoredCount + 1} of {totalTeams} scored
        </p>
      </div>

      <Card teamColor={currentTeam.color}>
        <CardBody className="space-y-6">
          <div className="flex items-center gap-2 sm:gap-3 pb-4 border-b border-gray-200">
            <TeamColorIndicator color={currentTeam.color} size="lg" />
            <h3 className="text-lg sm:text-xl font-display font-semibold truncate">{currentTeam.name}</h3>
          </div>

          {judgedCategories.map((category) => (
            <ScoreInput
              key={category}
              label={category}
              value={categoryScores[category] || null}
              onChange={(score) => handleScoreChange(category, score)}
              disabled={submitting}
            />
          ))}

          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base sm:text-lg font-medium text-winter-dark">Total:</span>
              <span className="text-xl sm:text-2xl font-display font-bold text-winter-accent">
                {totalScore} / {maxScore}
              </span>
            </div>
          </div>

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
              Return to team list to score another
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

    // Sort by total score descending; include all teams (0-score teams at bottom)
    const sorted = Object.values(teamScores).sort((a, b) => {
      if (a.judgeCount === 0 && b.judgeCount === 0) return 0;
      if (a.judgeCount === 0) return 1;
      if (b.judgeCount === 0) return -1;
      return b.totalScore - a.totalScore;
    });

    // Assign place with ties: same score = same place; next distinct score skips (e.g. two 1st → next is 3rd)
    let nextPlace = 1;
    return sorted.map((agg, i) => {
      let place = 0;
      if (agg.judgeCount > 0) {
        if (i === 0 || sorted[i - 1].totalScore !== agg.totalScore) {
          nextPlace = i + 1;
        }
        place = nextPlace;
      }
      return { ...agg, place };
    });
  }, [teams, allScores]);

  const myScores = useMemo(() => {
    return allScores.filter(
      (score): score is JudgeScore =>
        'judgeName' in score && score.judgeName === judgeName
    );
  }, [allScores, judgeName]);

  const judgedCategories = (event?.judgedCategories || []).filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        {hasMoreToScore && (
          <Button variant="secondary" size="sm" onClick={onContinue}>
            Continue
          </Button>
        )}
      </div>

      {/* Event Title */}
      <div className="text-center px-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold break-words">{event.name || 'Untitled Event'}</h2>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <TeamColorIndicator color={team?.color} />
                        <span className="font-medium truncate">{team?.name}</span>
                      </div>
                      <span className="text-base sm:text-lg font-semibold text-winter-accent shrink-0">
                        {isEditing 
                          ? Object.values(editScores).reduce((sum, val) => sum + val, 0)
                          : total
                        } pts
                      </span>
                    </div>

                    {/* Category Breakdown */}
                    {isEditing ? (
                      <div className="space-y-3 pt-3 border-t border-gray-200">
                        {judgedCategories.map((category: string) => (
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
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-1 sm:gap-2 text-sm">
                        {Object.entries(score.categoryScores).map(([category, value]) => (
                          <div key={category} className="flex justify-between gap-2">
                            <span className="text-winter-gray truncate">{category}:</span>
                            <span className="font-medium shrink-0">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
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
                            disabled={
                              judgedCategories.length === 0 ||
                              Object.keys(editScores).length !== judgedCategories.length
                            }
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
            {aggregates.map((agg) => {
              const hasScores = agg.judgeCount > 0;
              const place = 'place' in agg ? agg.place : 0;
              const isTiedForFirst = hasScores && place === 1;
              return (
                <Card
                  key={agg.team.teamId}
                  teamColor={agg.team.color}
                  className={isTiedForFirst ? 'ring-2 ring-yellow-400' : ''}
                >
                  <CardBody>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isTiedForFirst && <span className="text-xl sm:text-2xl shrink-0">👑</span>}
                          {hasScores && (
                            <span className="font-bold text-winter-blue text-base sm:text-lg shrink-0">
                              {place}.
                            </span>
                          )}
                          <TeamColorIndicator color={agg.team.color} />
                          <div className="min-w-0">
                            <div className="font-medium truncate">{agg.team.name}</div>
                            <div className="text-xs text-winter-gray">
                              {hasScores
                                ? `${agg.judgeCount} judge${agg.judgeCount !== 1 ? 's' : ''}`
                                : 'No scores yet'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {hasScores ? (
                            <>
                              <div className="text-xl sm:text-2xl font-display font-bold text-winter-accent">
                                {agg.totalScore}
                              </div>
                              <div className="text-xs text-winter-gray">total pts</div>
                            </>
                          ) : (
                            <div className="text-sm text-winter-gray">—</div>
                          )}
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

