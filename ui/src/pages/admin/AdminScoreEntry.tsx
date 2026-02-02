/**
 * Score Entry Page for individual events
 * - Placement event scoring
 * - Judged event results viewing and finalization
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Button, Input, Select, TeamColorIndicator, StatusBadge, Loading } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import type { Event, Score, PlacementScore, JudgeScore } from '../../lib/api';
import { useMutation } from '../../hooks/useApi';

export const AdminScoreEntry: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentYear, events, teams, teamsLoading, refreshScores, refreshEvents } = useAdmin();

  const [event, setEvent] = useState<Event | null>(null);
  const [eventScores, setEventScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  // Placement scoring state
  const [placementData, setPlacementData] = useState<Record<string, {
    place: number;
    rawScore: string;
  }>>({});

  const [isResetting, setIsResetting] = useState(false);

  // Find event from context or load it
  useEffect(() => {
    if (events.length > 0 && eventId) {
      const foundEvent = events.find(e => e.eventId === eventId);
      setEvent(foundEvent || null);
    }
  }, [events, eventId]);

  // Load event scores
  useEffect(() => {
    const loadData = async () => {
      if (!currentYear || !eventId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Load event if not in context
      if (!event) {
        const eventResponse = await apiClient.getEvent(currentYear, eventId);
        if (eventResponse.success && eventResponse.data) {
          setEvent(eventResponse.data);
        }
      }

      // Load scores
      const scoresResponse = await apiClient.listEventScores(currentYear, eventId);
      if (scoresResponse.success && scoresResponse.data) {
        setEventScores(scoresResponse.data.scores);
      }

      setLoading(false);
    };

    loadData();
  }, [currentYear, eventId]);

  const { mutate: submitPlacementScores, loading: placementLoading } = useMutation(
    (year: number, eventId: string, placements: any[]) =>
      apiClient.submitPlacementScores(year, eventId, placements)
  );

  const handleSubmitPlacement = async () => {
    if (!currentYear || !event) return;

    const placements = Object.entries(placementData)
      .filter(([_, data]) => data.place > 0)
      .map(([teamId, data]) => ({
        teamId,
        place: data.place,
        rawScore: data.rawScore,
      }));

    if (placements.length === 0) {
      alert('Please enter at least one placement');
      return;
    }

    const result = await submitPlacementScores(currentYear, event.eventId, placements);
    if (result) {
      // Reload scores
      const scoresResponse = await apiClient.listEventScores(currentYear, event.eventId);
      if (scoresResponse.success && scoresResponse.data) {
        setEventScores(scoresResponse.data.scores);
      }
      await refreshScores();
      // Mark event as completed
      await apiClient.updateEvent(currentYear, event.eventId, { completed: true });
      await refreshEvents();
      // Update local event state
      setEvent(prev => prev ? { ...prev, completed: true } : null);
      setPlacementData({});
    }
  };

  const updatePlacement = (teamId: string, field: string, value: any) => {
    setPlacementData({
      ...placementData,
      [teamId]: {
        ...placementData[teamId],
        place: placementData[teamId]?.place || 0,
        rawScore: placementData[teamId]?.rawScore || '',
        [field]: value,
      },
    });
  };

  // Calculate judged event results
  const calculateJudgedResults = () => {
    if (!event || event.scoringType !== 'judged') return [];

    const judgeScores = eventScores.filter(s => 'judgeName' in s) as JudgeScore[];

    // Group by team
    const teamScores: Record<string, {
      teamId: string;
      totalScore: number;
      judgeCount: number;
      categoryTotals: Record<string, number>;
    }> = {};

    judgeScores.forEach(score => {
      if (!teamScores[score.teamId]) {
        teamScores[score.teamId] = {
          teamId: score.teamId,
          totalScore: 0,
          judgeCount: 0,
          categoryTotals: {},
        };
      }

      const team = teamScores[score.teamId];
      team.judgeCount++;

      Object.entries(score.categoryScores).forEach(([category, value]) => {
        team.categoryTotals[category] = (team.categoryTotals[category] || 0) + value;
        team.totalScore += value;
      });
    });

    // Sort by total score
    const ranked = Object.values(teamScores).sort((a, b) => b.totalScore - a.totalScore);

    return ranked.map((team, index) => ({
      ...team,
      suggestedPlace: index + 1,
      team: teams.find(t => t.teamId === team.teamId),
    }));
  };

  const handleFinalizePlacement = async (results: any[]) => {
    if (!currentYear || !event) return;

    const placements = results.map((result, index) => ({
      teamId: result.teamId,
      place: index + 1,
      rawScore: result.totalScore.toString(),
    }));

    const submitResult = await submitPlacementScores(currentYear, event.eventId, placements);
    if (submitResult) {
      // Reload scores
      const scoresResponse = await apiClient.listEventScores(currentYear, event.eventId);
      if (scoresResponse.success && scoresResponse.data) {
        setEventScores(scoresResponse.data.scores);
      }
      await refreshScores();
      // Mark event as completed
      await apiClient.updateEvent(currentYear, event.eventId, { completed: true });
      await refreshEvents();
      // Update local event state
      setEvent(prev => prev ? { ...prev, completed: true } : null);
    }
  };

  const handleResetScores = async () => {
    if (!currentYear || !event || eventScores.length === 0 || isResetting) return;

    setIsResetting(true);
    try {
      // Delete all scores for this event
      for (const score of eventScores) {
        await apiClient.deleteScore(currentYear, event.eventId, score.scoreId);
      }

      // Note: Resetting scores does NOT uncomplete the event per requirements

      // Refresh data
      const scoresResponse = await apiClient.listEventScores(currentYear, event.eventId);
      if (scoresResponse.success && scoresResponse.data) {
        setEventScores(scoresResponse.data.scores);
      }
      await refreshScores();
      setPlacementData({});
    } finally {
      setIsResetting(false);
    }
  };

  const placementScores = eventScores.filter(s => 'place' in s) as PlacementScore[];
  const judgeScores = eventScores.filter(s => 'judgeName' in s) as JudgeScore[];
  const judgedResults = event?.scoringType === 'judged' ? calculateJudgedResults() : [];

  // Get unique judges
  const uniqueJudges = [...new Set(judgeScores.map(s => s.judgeName))];

  if (!currentYear) {
    return (
      <Card>
        <CardBody>
          <p className="text-center text-winter-gray py-8">
            Please configure an Olympics year first
          </p>
        </CardBody>
      </Card>
    );
  }

  if (loading || teamsLoading) {
    return <Loading message="Loading event data..." />;
  }

  if (!event) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/scores')}>
          ← Back to Scores
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

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/scores')}>
        ← Back
      </Button>

      {/* Event Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-display font-bold break-words">{event.name || 'Untitled Event'}</h2>
          <p className="text-winter-gray mt-1 capitalize text-sm">{event.scoringType} scoring</p>
        </div>
        <StatusBadge completed={event.completed} />
      </div>

      {/* Placement Event Scoring */}
      {event.scoringType === 'placement' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">
              Score Placement Event
            </h3>
          </CardHeader>
          <CardBody>
            {placementScores.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">✓ This event has been scored</p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-display font-semibold mb-2">Results:</h4>
                  {placementScores
                    .sort((a, b) => a.place - b.place)
                    .map((score) => {
                      const team = teams.find(t => t.teamId === score.teamId);
                      return (
                        <div key={score.scoreId} className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-ice-blue rounded">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-bold text-winter-blue shrink-0">
                              {score.place === 1 ? '🥇' : score.place === 2 ? '🥈' : score.place === 3 ? '🥉' : score.place === 4 ? '🏅' : `${score.place}th`}
                            </span>
                            {team && <TeamColorIndicator color={team.color} />}
                            <span className="font-medium truncate">{team?.name}</span>
                          </div>
                          <span className="font-mono text-sm shrink-0">{score.rawScore}</span>
                        </div>
                      );
                    })}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleResetScores}
                    disabled={isResetting}
                    variant="secondary"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Scores'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-winter-gray mb-4">
                  Enter placement and scores for each team:
                </p>

                {teams.map((team) => (
                  <div key={team.teamId} className="border border-winter-gray/20 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TeamColorIndicator color={team.color} />
                      <span className="font-display font-bold truncate">{team.name}</span>
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                      <Select
                        label="Place"
                        value={placementData[team.teamId]?.place?.toString() || ''}
                        onChange={(e) => updatePlacement(team.teamId, 'place', parseInt(e.target.value) || 0)}
                        options={[
                          { value: '', label: 'Not placed' },
                          { value: '1', label: '1st' },
                          { value: '2', label: '2nd' },
                          { value: '3', label: '3rd' },
                          { value: '4', label: '4th' },
                        ]}
                      />

                      <Input
                        label="Score"
                        value={placementData[team.teamId]?.rawScore || ''}
                        onChange={(e) => updatePlacement(team.teamId, 'rawScore', e.target.value)}
                        placeholder="2:34 or 15"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleSubmitPlacement} disabled={placementLoading}>
                    {placementLoading ? 'Saving...' : 'Save & Complete Event'}
                  </Button>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Judged Event Results */}
      {event.scoringType === 'judged' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">
              Judge Scores
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Judge Submission Status */}
              <div>
                <h4 className="font-display font-semibold mb-3">Judge Submissions:</h4>
                <div className="flex flex-wrap gap-2">
                  {uniqueJudges.length === 0 ? (
                    <p className="text-winter-gray">No judge scores submitted yet</p>
                  ) : (
                    uniqueJudges.map((judge) => (
                      <span
                        key={judge}
                        className="px-3 py-1 bg-winter-blue/10 text-winter-blue rounded-full text-sm font-medium"
                      >
                        ✓ {judge}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Auto-Calculated Results */}
              {judgedResults.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold mb-3">Auto-Calculated Results:</h4>
                  <div className="space-y-2">
                      {judgedResults.map((result) => (
                      <div
                        key={result.teamId}
                        className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-ice-blue rounded-lg"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-bold text-winter-blue text-base sm:text-lg shrink-0">
                            {result.suggestedPlace}.
                          </span>
                          {result.team && <TeamColorIndicator color={result.team.color} />}
                          <span className="font-display font-bold truncate">{result.team?.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-base sm:text-lg">{result.totalScore} pts</div>
                          <div className="text-xs text-winter-gray">
                            {result.judgeCount} judge{result.judgeCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {placementScores.length === 0 ? (
                    <div className="flex flex-wrap gap-2 pt-4 border-t mt-4">
                      <Button onClick={() => handleFinalizePlacement(judgedResults)} disabled={placementLoading} className="flex-1 xs:flex-none">
                        {placementLoading ? 'Finalizing...' : 'Finalize Results'}
                      </Button>
                      {judgeScores.length > 0 && (
                        <Button
                          onClick={handleResetScores}
                          disabled={isResetting}
                          variant="secondary"
                          className="flex-1 xs:flex-none"
                        >
                          {isResetting ? 'Resetting...' : 'Reset Scores'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-800 font-medium">✓ Results have been finalized</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleResetScores}
                          disabled={isResetting}
                          variant="secondary"
                        >
                          {isResetting ? 'Resetting...' : 'Reset All Scores'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No scores yet message */}
              {judgedResults.length === 0 && judgeScores.length === 0 && (
                <div className="text-center py-8">
                  <span className="text-4xl mb-4 block">⏳</span>
                  <p className="text-winter-gray">
                    Waiting for judges to submit their scores.
                  </p>
                </div>
              )}

              {/* Detailed Breakdown */}
              {judgeScores.length > 0 && (
                <div>
                  <h4 className="font-display font-semibold mb-3">Detailed Scores:</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-winter-gray/10">
                        <tr>
                          <th className="px-3 py-2 text-left">Judge</th>
                          <th className="px-3 py-2 text-left">Team</th>
                          {event.judgedCategories?.map((cat) => (
                            <th key={cat} className="px-3 py-2 text-center">{cat}</th>
                          ))}
                          <th className="px-3 py-2 text-center">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {judgeScores.map((score) => {
                          const team = teams.find(t => t.teamId === score.teamId);
                          const total = Object.values(score.categoryScores).reduce((a, b) => a + b, 0);
                          return (
                            <tr key={score.scoreId} className="border-t border-winter-gray/10">
                              <td className="px-3 py-2">{score.judgeName}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {team && <TeamColorIndicator color={team.color} size="sm" />}
                                  {team?.name}
                                </div>
                              </td>
                              {event.judgedCategories?.map((cat) => (
                                <td key={cat} className="px-3 py-2 text-center font-mono">
                                  {score.categoryScores[cat] || '-'}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-center font-mono font-bold">
                                {total}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
