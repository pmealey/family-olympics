/**
 * Standings calculation utilities
 */

import type { Olympics, Team, Score, PlacementScore } from './api';

export interface TeamStanding {
  team: Team;
  totalPoints: number;
  eventPoints: Record<string, number>;
  bonusPoints: number;
  rank: number;
}

/**
 * Check if a score is a placement score (vs judge score)
 */
function isPlacementScore(score: Score): score is PlacementScore {
  return 'place' in score && 'rawScore' in score;
}

/**
 * Calculate standings from teams and scores
 */
export function calculateStandings(
  olympics: Olympics,
  teams: Team[],
  scores: Score[]
): TeamStanding[] {
  const placementPoints = olympics.placementPoints;

  // Initialize team points
  const teamPointsMap: Record<string, TeamStanding> = {};
  teams.forEach((team) => {
    teamPointsMap[team.teamId] = {
      team,
      eventPoints: {},
      bonusPoints: team.bonusPoints || 0,
      totalPoints: team.bonusPoints || 0,
      rank: 0,
    };
  });

  // Group scores by event
  const scoresByEvent: Record<string, Score[]> = {};
  scores.forEach((score) => {
    if (!scoresByEvent[score.eventId]) {
      scoresByEvent[score.eventId] = [];
    }
    scoresByEvent[score.eventId].push(score);
  });

  // For each event, calculate placements and points
  for (const [eventId, eventScores] of Object.entries(scoresByEvent)) {
    // Get placement scores (not judge scores)
    const placements = eventScores.filter(isPlacementScore);

    placements.forEach((score) => {
      // Only add points if the team exists in our map
      if (teamPointsMap[score.teamId]) {
        const points = placementPoints[score.place.toString()] || 0;
        teamPointsMap[score.teamId].eventPoints[eventId] = points;
        teamPointsMap[score.teamId].totalPoints += points;
      }
    });
  }

  // Convert to array and sort by total points descending
  const standings = Object.values(teamPointsMap).sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  // Assign ranks
  standings.forEach((standing, index) => {
    standing.rank = index + 1;
  });

  return standings;
}

/**
 * Get the medal emoji for a rank
 */
export function getMedalEmoji(rank: number): string {
  switch (rank) {
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
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  return points === 1 ? '1 pt' : `${points} pts`;
}

/**
 * Get completed events count from scores
 */
export function getCompletedEventsCount(scores: Score[]): number {
  const eventIds = new Set<string>();
  scores.filter(isPlacementScore).forEach((score) => {
    eventIds.add(score.eventId);
  });
  return eventIds.size;
}

