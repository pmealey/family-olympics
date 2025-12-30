/**
 * Scores Management Tab (Step 2.6 & 2.7)
 * - Placement event scoring
 * - Judged event results viewing and finalization
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button, Input, Select, TeamColorIndicator } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import type { Event, Score, PlacementScore, JudgeScore } from '../../lib/api';
import { useMutation } from '../../hooks/useApi';

export const AdminScores: React.FC = () => {
  const { currentYear, events, teams, refreshScores } = useAdmin();
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventScores, setEventScores] = useState<Score[]>([]);

  // Placement scoring state
  const [placementData, setPlacementData] = useState<Record<string, {
    place: number;
    rawScore: string;
    rawScoreType: 'time' | 'number' | 'text';
  }>>({});

  useEffect(() => {
    if (currentYear && selectedEvent) {
      loadEventScores();
    }
  }, [currentYear, selectedEvent]);

  const loadEventScores = async () => {
    if (!currentYear || !selectedEvent) return;
    
    const response = await apiClient.listEventScores(currentYear, selectedEvent.eventId);
    if (response.success && response.data) {
      setEventScores(response.data.scores);
    }
  };

  const { mutate: submitPlacementScores, loading: placementLoading } = useMutation(
    (year: number, eventId: string, placements: any[]) =>
      apiClient.submitPlacementScores(year, eventId, placements)
  );

  const handleSubmitPlacement = async () => {
    if (!currentYear || !selectedEvent) return;

    const placements = Object.entries(placementData)
      .filter(([_, data]) => data.place > 0)
      .map(([teamId, data]) => ({
        teamId,
        place: data.place,
        rawScore: data.rawScore,
        rawScoreType: data.rawScoreType,
      }));

    if (placements.length === 0) {
      alert('Please enter at least one placement');
      return;
    }

    const result = await submitPlacementScores(currentYear, selectedEvent.eventId, placements);
    if (result) {
      await loadEventScores();
      await refreshScores();
      // Mark event as completed
      await apiClient.updateEvent(currentYear, selectedEvent.eventId, { status: 'completed' });
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
        rawScoreType: placementData[teamId]?.rawScoreType || 'time',
        [field]: value,
      },
    });
  };

  // Calculate judged event results
  const calculateJudgedResults = () => {
    if (!selectedEvent || selectedEvent.scoringType !== 'judged') return [];

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
    if (!currentYear || !selectedEvent) return;

    const placements = results.map((result, index) => ({
      teamId: result.teamId,
      place: index + 1,
      rawScore: result.totalScore.toString(),
      rawScoreType: 'number' as const,
    }));

    const submitResult = await submitPlacementScores(currentYear, selectedEvent.eventId, placements);
    if (submitResult) {
      await loadEventScores();
      await refreshScores();
      // Mark event as completed
      await apiClient.updateEvent(currentYear, selectedEvent.eventId, { status: 'completed' });
    }
  };

  // Get list of events that need scoring
  const eventsNeedingScores = events.filter(e => 
    e.status === 'in-progress' || e.status === 'completed'
  );

  const placementScores = eventScores.filter(s => 'place' in s) as PlacementScore[];
  const judgeScores = eventScores.filter(s => 'judgeName' in s) as JudgeScore[];
  const judgedResults = selectedEvent?.scoringType === 'judged' ? calculateJudgedResults() : [];

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-display font-bold">Score Events</h2>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-display font-semibold">Select Event to Score</h3>
        </CardHeader>
        <CardBody>
          {eventsNeedingScores.length === 0 ? (
            <p className="text-winter-gray text-center py-4">
              No events ready for scoring. Events must be in-progress or completed.
            </p>
          ) : (
            <Select
              label="Event"
              value={selectedEvent?.eventId || ''}
              onChange={(e) => {
                const event = events.find(ev => ev.eventId === e.target.value);
                setSelectedEvent(event || null);
                setPlacementData({});
              }}
              options={[
                { value: '', label: 'Select an event...' },
                ...eventsNeedingScores.map(e => ({
                  value: e.eventId,
                  label: `${e.name} (${e.scoringType})`,
                })),
              ]}
            />
          )}
        </CardBody>
      </Card>

      {/* Placement Event Scoring */}
      {selectedEvent && selectedEvent.scoringType === 'placement' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">
              Score Placement Event: {selectedEvent.name}
            </h3>
          </CardHeader>
          <CardBody>
            {placementScores.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">✓ This event has already been scored</p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-display font-semibold mb-2">Current Results:</h4>
                  {placementScores
                    .sort((a, b) => a.place - b.place)
                    .map((score) => {
                      const team = teams.find(t => t.teamId === score.teamId);
                      return (
                        <div key={score.scoreId} className="flex items-center justify-between p-3 bg-ice-blue rounded">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-winter-blue">
                              {score.place === 1 ? '🥇' : score.place === 2 ? '🥈' : score.place === 3 ? '🥉' : `${score.place}th`}
                            </span>
                            {team && <TeamColorIndicator color={team.color} />}
                            <span className="font-medium">{team?.name}</span>
                          </div>
                          <span className="font-mono">{score.rawScore}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-winter-gray mb-4">
                  Enter placement and scores for each team:
                </p>
                
                {teams.map((team) => (
                  <div key={team.teamId} className="border border-winter-gray/20 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <TeamColorIndicator color={team.color} />
                      <span className="font-display font-bold">{team.name}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Select
                        label="Place"
                        value={placementData[team.teamId]?.place?.toString() || ''}
                        onChange={(e) => updatePlacement(team.teamId, 'place', parseInt(e.target.value) || 0)}
                        options={[
                          { value: '', label: 'Not placed' },
                          { value: '1', label: '1st Place' },
                          { value: '2', label: '2nd Place' },
                          { value: '3', label: '3rd Place' },
                          { value: '4', label: '4th Place' },
                        ]}
                      />
                      
                      <Input
                        label="Score"
                        value={placementData[team.teamId]?.rawScore || ''}
                        onChange={(e) => updatePlacement(team.teamId, 'rawScore', e.target.value)}
                        placeholder="2:34 or 15"
                      />
                      
                      <Select
                        label="Type"
                        value={placementData[team.teamId]?.rawScoreType || 'time'}
                        onChange={(e) => updatePlacement(team.teamId, 'rawScoreType', e.target.value)}
                        options={[
                          { value: 'time', label: 'Time' },
                          { value: 'number', label: 'Number' },
                          { value: 'text', label: 'Text' },
                        ]}
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
      {selectedEvent && selectedEvent.scoringType === 'judged' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-display font-semibold">
              Judge Scores: {selectedEvent.name}
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
                        className="flex items-center justify-between p-4 bg-ice-blue rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-winter-blue text-lg">
                            {result.suggestedPlace}.
                          </span>
                          {result.team && <TeamColorIndicator color={result.team.color} />}
                          <span className="font-display font-bold">{result.team?.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-lg">{result.totalScore} pts</div>
                          <div className="text-xs text-winter-gray">
                            {result.judgeCount} judge{result.judgeCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {placementScores.length === 0 ? (
                    <div className="flex gap-2 pt-4 border-t mt-4">
                      <Button onClick={() => handleFinalizePlacement(judgedResults)} disabled={placementLoading}>
                        {placementLoading ? 'Finalizing...' : 'Confirm & Finalize Results'}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <p className="text-green-800 font-medium">✓ Results have been finalized</p>
                    </div>
                  )}
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
                          {selectedEvent.judgedCategories?.map((cat) => (
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
                              {selectedEvent.judgedCategories?.map((cat) => (
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

