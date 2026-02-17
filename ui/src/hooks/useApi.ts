/**
 * Custom hooks for API calls
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../lib/api';
import type { ApiResponse } from '../lib/api';

export function useAsync<T>(
  asyncFunction: () => Promise<ApiResponse<T>>,
  immediate = true
) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const asyncFunctionRef = useRef(asyncFunction);

  // Update ref when function changes
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
  }, [asyncFunction]);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await asyncFunctionRef.current();
      if (response.success && response.data) {
        setData(response.data);
      } else if (response.error) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { loading, data, error, execute };
}

// Olympics hooks
export function useOlympics() {
  return useAsync(() => apiClient.listOlympics());
}

export function useCurrentOlympics() {
  return useAsync(() => apiClient.getCurrentOlympics());
}

export function useOlympicsYear(year: number | null) {
  return useAsync(
    () => apiClient.getOlympics(year!),
    year !== null
  );
}

// Teams hooks
export function useTeams(year: number | null) {
  return useAsync(
    () => apiClient.listTeams(year!),
    year !== null
  );
}

export function useTeam(year: number | null, teamId: string | null) {
  return useAsync(
    () => apiClient.getTeam(year!, teamId!),
    year !== null && teamId !== null
  );
}

// Events hooks
export function useEvents(
  year: number | null,
  filters?: { day?: number; completed?: boolean }
) {
  return useAsync(
    () => apiClient.listEvents(year!, filters),
    year !== null
  );
}

export function useEvent(year: number | null, eventId: string | null) {
  return useAsync(
    () => apiClient.getEvent(year!, eventId!),
    year !== null && eventId !== null
  );
}

// Scores hooks
export function useScores(year: number | null) {
  return useAsync(
    () => apiClient.listScores(year!),
    year !== null
  );
}

export function useEventScores(year: number | null, eventId: string | null) {
  return useAsync(
    () => apiClient.listEventScores(year!, eventId!),
    year !== null && eventId !== null
  );
}

// Media hooks
export function useListMedia(
  year: number | null,
  params?: { eventId?: string; teamId?: string; person?: string; status?: string }
) {
  return useAsync(
    () => apiClient.listMedia(year!, params),
    year !== null
  );
}

export function useMedia(year: number | null, mediaId: string | null) {
  return useAsync(
    () => apiClient.getMedia(year!, mediaId!),
    year !== null && mediaId !== null
  );
}

// Mutation hook for POST/PUT/DELETE operations
export function useMutation<TArgs extends any[], TResult>(
  mutationFn: (...args: TArgs) => Promise<ApiResponse<TResult>>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await mutationFn(...args);
        if (response.success && response.data) {
          return response.data;
        } else if (response.error) {
          setError(response.error.message);
          return null;
        }
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn]
  );

  return { mutate, loading, error };
}

