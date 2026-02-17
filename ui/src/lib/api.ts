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
  hasGalleryPassword?: boolean;
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
  details?: string | null;
  location?: string | null;
  rulesUrl?: string | null;
  displayRulesAndRegulations?: boolean;
  scoringType: 'placement' | 'judged' | 'none';
  judgedCategories?: string[] | null;
  scheduledDay?: number | null;
  scheduledTime?: string | null;
  completed?: boolean;
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
  private galleryToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setGalleryToken(token: string | null): void {
    this.galleryToken = token;
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

      if (response.status === 401) {
        this.galleryToken = null;
      }

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
      galleryPassword?: string;
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

  async validateGalleryPassword(year: number, password: string) {
    return this.request<{ token: string; expiresAt: number }>(
      `/olympics/${year}/gallery/validate`,
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
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
  async listEvents(year: number, filters?: { day?: number; completed?: boolean }) {
    let endpoint = `/olympics/${year}/events`;
    const params = new URLSearchParams();
    if (filters?.day) params.append('day', filters.day.toString());
    if (filters?.completed !== undefined) params.append('completed', filters.completed.toString());
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
      details?: string | null;
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
      details?: string | null;
      location?: string | null;
      rulesUrl?: string | null;
      scoringType?: 'placement' | 'judged' | 'none';
      judgedCategories?: string[] | null;
      scheduledDay?: number | null;
      scheduledTime?: string | null;
      completed?: boolean;
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

  // Media endpoints (send X-Gallery-Token when set for gallery protection)
  private mediaHeaders(): Record<string, string> | undefined {
    if (this.galleryToken) {
      return { 'X-Gallery-Token': this.galleryToken };
    }
    return undefined;
  }

  async requestMediaUploadUrl(
    year: number,
    data: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      type: 'image' | 'video';
      tags?: { eventId?: string; teamId?: string; persons?: string[] };
      uploadedBy?: string;
      caption?: string;
      thumbnailExt?: string;
      displayExt?: string;
    }
  ) {
    return this.request<{
      uploadUrl: string;
      thumbnailUploadUrl?: string;
      displayUploadUrl?: string;
      mediaId: string;
      expiresIn: number;
    }>(
      `/olympics/${year}/media/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: this.mediaHeaders(),
      }
    );
  }

  async listMedia(
    year: number,
    params?: { eventId?: string; teamId?: string; person?: string; limit?: number; nextToken?: string }
  ) {
    const searchParams = new URLSearchParams();
    if (params?.eventId) searchParams.append('eventId', params.eventId);
    if (params?.teamId) searchParams.append('teamId', params.teamId);
    if (params?.person) searchParams.append('person', params.person);
    if (params?.limit != null) searchParams.append('limit', String(params.limit));
    if (params?.nextToken) searchParams.append('nextToken', params.nextToken);
    const qs = searchParams.toString();
    return this.request<{ media: MediaItem[]; nextToken?: string }>(
      `/olympics/${year}/media${qs ? `?${qs}` : ''}`,
      { headers: this.mediaHeaders() }
    );
  }

  async getMedia(year: number, mediaId: string) {
    return this.request<MediaItem>(
      `/olympics/${year}/media/${encodeURIComponent(mediaId)}`,
      { headers: this.mediaHeaders() }
    );
  }

  async deleteMedia(year: number, mediaId: string) {
    return this.request<{ deleted: boolean }>(
      `/olympics/${year}/media/${encodeURIComponent(mediaId)}`,
      { method: 'DELETE', headers: this.mediaHeaders() }
    );
  }
}

export interface MediaItem {
  year: number;
  mediaId: string;
  type: 'image' | 'video';
  originalKey?: string;
  thumbnailKey?: string;
  displayKey?: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  displayUrl?: string;
  mimeType?: string;
  fileSize?: number;
  tags?: { eventId?: string; teamId?: string; persons?: string[] };
  uploadedBy?: string;
  caption?: string;
  createdAt?: string;
  updatedAt?: string;
  eventId?: string;
  teamId?: string;
}

export const apiClient = new ApiClient(API_BASE_URL);

