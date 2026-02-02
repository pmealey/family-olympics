/**
 * Scores Management Tab - Event list for scoring
 * Shows all scoreable events as cards, clicking navigates to scoring subpage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, StatusBadge, Loading } from '../../components';
import { useAdmin } from '../../contexts/AdminContext';
import { apiClient } from '../../lib/api';
import type { Event, Score, PlacementScore, JudgeScore } from '../../lib/api';

export const AdminScores: React.FC = () => {
  const navigate = useNavigate();
  const { currentYear, events, eventsLoading, refreshEvents } = useAdmin();
  const [eventScoresMap, setEventScoresMap] = useState<Record<string, Score[]>>({});
  const [scoresLoading, setScoresLoading] = useState(true);

  // Get list of scoreable events (exclude non-scoring events)
  const scoreableEvents = useMemo(() => {
    return events
      .filter(e => e.scoringType !== 'none')
      .sort((a, b) => {
        // Sort by scheduled day first, then by time
        const dayA = a.scheduledDay || 999;
        const dayB = b.scheduledDay || 999;
        if (dayA !== dayB) return dayA - dayB;
        
        const timeA = a.scheduledTime || '';
        const timeB = b.scheduledTime || '';
        return timeA.localeCompare(timeB);
      });
  }, [events]);

  // Load scores for all scoreable events
  useEffect(() => {
    const loadAllScores = async () => {
      // Don't load scores until events are loaded
      if (eventsLoading) return;
      
      if (!currentYear || scoreableEvents.length === 0) {
        setScoresLoading(false);
        return;
      }

      setScoresLoading(true);
      const scoresMap: Record<string, Score[]> = {};
      
      for (const event of scoreableEvents) {
        const response = await apiClient.listEventScores(currentYear, event.eventId);
        if (response.success && response.data) {
          scoresMap[event.eventId] = response.data.scores;
        }
      }
      
      setEventScoresMap(scoresMap);
      setScoresLoading(false);
    };

    loadAllScores();
  }, [currentYear, scoreableEvents, eventsLoading]);

  // Refresh events when component mounts
  useEffect(() => {
    if (currentYear) {
      refreshEvents();
    }
  }, [currentYear]);

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return null;
    try {
      const date = new Date(`2000-01-01T${timeString}`);
      if (isNaN(date.getTime())) return timeString;
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getScoredStatus = (event: Event): { scored: boolean; label: string } => {
    const scores = eventScoresMap[event.eventId] || [];
    const placementScores = scores.filter(s => 'place' in s) as PlacementScore[];
    const judgeScores = scores.filter(s => 'judgeName' in s) as JudgeScore[];

    if (event.scoringType === 'placement') {
      if (placementScores.length > 0) {
        return { scored: true, label: 'Scored' };
      }
      return { scored: false, label: 'Not scored' };
    }

    if (event.scoringType === 'judged') {
      if (placementScores.length > 0) {
        return { scored: true, label: 'Finalized' };
      }
      if (judgeScores.length > 0) {
        const uniqueJudges = new Set(judgeScores.map(s => s.judgeName));
        return { scored: false, label: `${uniqueJudges.size} judge${uniqueJudges.size !== 1 ? 's' : ''} submitted` };
      }
      return { scored: false, label: 'No scores' };
    }

    return { scored: false, label: '' };
  };

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

  // Combined loading state: show loading while events OR scores are loading
  const isLoading = eventsLoading || scoresLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-display font-bold">Score Events</h2>
      </div>

      {isLoading ? (
        <Loading message="Loading events..." />
      ) : scoreableEvents.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <span className="text-6xl mb-4 block">🎯</span>
              <h3 className="text-xl font-display font-semibold mb-2">No Scoreable Events</h3>
              <p className="text-winter-gray">
                Create events with placement or judged scoring type to score them here.
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {scoreableEvents.map((event) => {
            const scoredStatus = getScoredStatus(event);
            const hasDay = event.scheduledDay === 1 || event.scheduledDay === 2;
            const hasTime = Boolean(event.scheduledTime);

            return (
              <Card
                key={event.eventId}
                onClick={() => navigate(`/admin/scores/${event.eventId}`)}
                className="cursor-pointer hover:shadow-md transition-shadow"
              >
                <CardBody>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-start gap-2">
                      <h4 className="text-base sm:text-lg font-display font-bold break-words flex-1 min-w-0">
                        {event.name || 'Untitled Event'}
                      </h4>
                      <div className="flex flex-wrap gap-1 shrink-0">
                        <span className="px-2 py-0.5 bg-winter-gray/10 text-winter-gray rounded text-xs capitalize">
                          {event.scoringType}
                        </span>
                        <StatusBadge completed={event.completed} />
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-winter-gray">
                      {(hasDay || hasTime) && (
                        <div className="flex items-center space-x-2">
                          <span>🕐</span>
                          <span>
                            {hasDay && `Day ${event.scheduledDay}`}
                            {hasDay && hasTime ? ' • ' : ''}
                            {hasTime && formatTime(event.scheduledTime)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <span>{scoredStatus.scored ? '✅' : '⏳'}</span>
                        <span>{scoredStatus.label}</span>
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
  );
};

