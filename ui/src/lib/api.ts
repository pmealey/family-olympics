/**
 * API Client for Family Olympics Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface Olympics {
  year: number;
  placementPoints: Record<string, number>;
  currentYear?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Team {
  year: number;
  teamId: string;
  name: string;
  color: 'green' | 'pink' | 'yellow' | 'orange';
  members: string[];
  bonusPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  year: number;
  eventId: string;
  name?: string | null;
  sponsor?: string | null;
  location?: string | null;
  rulesUrl?: string | null;
  scoringType: 'placement' | 'judged' | 'none';
  judgedCategories?: string[] | null;
  scheduledDay?: number | null;
  scheduledTime?: string | null;
  status: 'upcoming' | 'in-progress' | 'completed';
  createdAt?: string;
  updatedAt?: string;
}

export interface PlacementScore {
  eventId: string;
  scoreId: string;
  year: number;
  teamId: string;
  place: number;
  rawScore: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JudgeScore {
  eventId: string;
  scoreId: string;
  year: number;
  teamId: string;
  judgeName: string;
  categoryScores: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

export type Score = PlacementScore | JudgeScore;

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add existing headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        headers[key] = value as string;
      });
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error',
        },
      };
    }
  }

  // Olympics endpoints
  async listOlympics() {
    return this.request<{ years: Olympics[] }>('/olympics');
  }

  async getCurrentOlympics() {
    return this.request<Olympics>('/olympics/current');
  }

  async getOlympics(year: number) {
    return this.request<Olympics>(`/olympics/${year}`);
  }

  async createOlympics(data: {
    year: number;
    placementPoints: Record<string, number>;
  }) {
    return this.request<Olympics>('/olympics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOlympics(
    year: number,
    data: {
      placementPoints?: Record<string, number>;
      currentYear?: boolean;
    }
  ) {
    return this.request<Olympics>(`/olympics/${year}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOlympics(year: number) {
    return this.request<{ deleted: boolean }>(`/olympics/${year}`, {
      method: 'DELETE',
    });
  }

  // Teams endpoints
  async listTeams(year: number) {
    return this.request<{ teams: Team[] }>(`/olympics/${year}/teams`);
  }

  async getTeam(year: number, teamId: string) {
    return this.request<Team>(`/olympics/${year}/teams/${teamId}`);
  }

  async createTeam(
    year: number,
    data: {
      name: string;
      color: 'green' | 'pink' | 'yellow' | 'orange';
      members: string[];
    }
  ) {
    return this.request<Team>(`/olympics/${year}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTeam(
    year: number,
    teamId: string,
    data: {
      name?: string;
      color?: 'green' | 'pink' | 'yellow' | 'orange';
      members?: string[];
      bonusPoints?: number;
    }
  ) {
    return this.request<Team>(`/olympics/${year}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTeam(year: number, teamId: string) {
    return this.request<{ deleted: boolean }>(
      `/olympics/${year}/teams/${teamId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Events endpoints
  async listEvents(year: number, filters?: { day?: number; status?: string }) {
    let endpoint = `/olympics/${year}/events`;
    const params = new URLSearchParams();
    if (filters?.day) params.append('day', filters.day.toString());
    if (filters?.status) params.append('status', filters.status);
    if (params.toString()) endpoint += `?${params.toString()}`;

    return this.request<{ events: Event[] }>(endpoint);
  }

  async getEvent(year: number, eventId: string) {
    return this.request<Event>(`/olympics/${year}/events/${eventId}`);
  }

  async createEvent(
    year: number,
    data: {
      name: string;
      scoringType?: 'placement' | 'judged' | 'none';
      sponsor?: string | null;
      location?: string | null;
      rulesUrl?: string | null;
      judgedCategories?: string[] | null;
      scheduledDay?: number | null;
      scheduledTime?: string | null;
    }
  ) {
    return this.request<Event>(`/olympics/${year}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(
    year: number,
    eventId: string,
    data: {
      name?: string | null;
      sponsor?: string | null;
      location?: string | null;
      rulesUrl?: string | null;
      scoringType?: 'placement' | 'judged' | 'none';
      judgedCategories?: string[] | null;
      scheduledDay?: number | null;
      scheduledTime?: string | null;
      status?: 'upcoming' | 'in-progress' | 'completed';
    }
  ) {
    return this.request<Event>(`/olympics/${year}/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(year: number, eventId: string) {
    return this.request<{ deleted: boolean }>(
      `/olympics/${year}/events/${eventId}`,
      {
        method: 'DELETE',
      }
    );
  }

  // Scores endpoints
  async listScores(year: number) {
    return this.request<{ scores: Score[] }>(`/olympics/${year}/scores`);
  }

  async listEventScores(year: number, eventId: string) {
    return this.request<{ scores: Score[] }>(
      `/olympics/${year}/events/${eventId}/scores`
    );
  }

  async submitPlacementScores(
    year: number,
    eventId: string,
    placements: {
      teamId: string;
      place: number;
      rawScore: string;
    }[]
  ) {
    return this.request<{ scores: PlacementScore[] }>(
      `/olympics/${year}/events/${eventId}/scores/placement`,
      {
        method: 'POST',
        body: JSON.stringify({ placements }),
      }
    );
  }

  async submitJudgeScore(
    year: number,
    eventId: string,
    data: {
      judgeName: string;
      teamId: string;
      categoryScores: Record<string, number>;
    }
  ) {
    return this.request<JudgeScore>(
      `/olympics/${year}/events/${eventId}/scores/judge`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async updateJudgeScore(
    year: number,
    eventId: string,
    data: {
      judgeName: string;
      teamId: string;
      categoryScores: Record<string, number>;
    }
  ) {
    return this.request<JudgeScore>(
      `/olympics/${year}/events/${eventId}/scores/judge`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async deleteScore(year: number, eventId: string, scoreId: string) {
    return this.request<{ deleted: boolean }>(
      `/olympics/${year}/events/${eventId}/scores/${encodeURIComponent(scoreId)}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

