import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'familyOlympics_galleryToken';

interface StoredAuth {
  token: string;
  expiresAt: number;
}

function getStored(year: number): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Record<string, StoredAuth>;
    const entry = data[String(year)];
    if (!entry || !entry.expiresAt) return null;
    if (entry.expiresAt < Date.now()) return null;
    return entry;
  } catch {
    return null;
  }
}

function setStored(year: number, auth: StoredAuth): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = (raw ? JSON.parse(raw) : {}) as Record<string, StoredAuth>;
    data[String(year)] = auth;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearStored(year: number): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, StoredAuth>;
    delete data[String(year)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useGalleryAuth(year: number | null) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [stored, setStoredState] = useState<StoredAuth | null>(
    () => (year !== null ? getStored(year) : null)
  );

  useEffect(() => {
    setStoredState(year !== null ? getStored(year) : null);
  }, [year]);

  const isAuthenticated = stored !== null;
  const token = stored?.token ?? null;

  const authenticate = useCallback(
    async (
      password: string,
      validateFn: (
        y: number,
        p: string
      ) => Promise<{
        success: boolean;
        data?: { token: string; expiresAt: number };
        error?: { message: string };
      }>
    ) => {
      if (year === null) return false;
      setAuthError(null);
      const response = await validateFn(year, password);
      if (response.success && response.data) {
        const auth = {
          token: response.data.token,
          expiresAt: response.data.expiresAt,
        };
        setStored(year, auth);
        setStoredState(auth);
        return true;
      }
      setAuthError(response.error?.message ?? 'Invalid password');
      return false;
    },
    [year]
  );

  const logout = useCallback(() => {
    if (year !== null) clearStored(year);
    setStoredState(null);
    setAuthError(null);
  }, [year]);

  return {
    isAuthenticated,
    token,
    authError,
    authenticate,
    logout,
  };
}
