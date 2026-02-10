/**
 * Judge Context - Manages judge identity via local storage
 * Supports Council of Unaffiliated Neutral Folks (CUNF) and team representatives.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const JUDGE_STORAGE_KEY = 'familyOlympics_judge';
const LEGACY_JUDGE_NAME_KEY = 'familyOlympics_judgeName';

export type JudgeRole = 'cunf' | 'team';

interface StoredJudge {
  judgeName: string;
  judgeRole: JudgeRole;
  judgeTeamId: string | null;
}

interface JudgeContextType {
  judgeName: string | null;
  judgeRole: JudgeRole | null;
  judgeTeamId: string | null;
  setJudgeName: (name: string) => void;
  setJudgeAsCunf: (name: string) => void;
  setJudgeAsTeamRep: (name: string, teamId: string) => void;
  clearJudgeName: () => void;
}

const JudgeContext = createContext<JudgeContextType | undefined>(undefined);

function loadStored(): StoredJudge | null {
  try {
    const raw = localStorage.getItem(JUDGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredJudge;
      if (parsed.judgeName && (parsed.judgeRole === 'cunf' || parsed.judgeRole === 'team')) {
        return {
          judgeName: parsed.judgeName,
          judgeRole: parsed.judgeRole,
          judgeTeamId: parsed.judgeRole === 'team' ? parsed.judgeTeamId ?? null : null,
        };
      }
    }
    // Migrate legacy key: treat as CUNF
    const legacyName = localStorage.getItem(LEGACY_JUDGE_NAME_KEY);
    if (legacyName && legacyName.trim()) {
      const migrated: StoredJudge = {
        judgeName: legacyName.trim(),
        judgeRole: 'cunf',
        judgeTeamId: null,
      };
      localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_JUDGE_NAME_KEY);
      return migrated;
    }
  } catch {
    // ignore
  }
  return null;
}

export const JudgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stored, setStored] = useState<StoredJudge | null>(null);

  useEffect(() => {
    setStored(loadStored());
  }, []);

  const setJudgeName = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      const next: StoredJudge = {
        judgeName: trimmedName,
        judgeRole: stored?.judgeRole ?? 'cunf',
        judgeTeamId: stored?.judgeRole === 'team' ? stored.judgeTeamId : null,
      };
      localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(next));
      setStored(next);
    }
  };

  const setJudgeAsCunf = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      const next: StoredJudge = {
        judgeName: trimmedName,
        judgeRole: 'cunf',
        judgeTeamId: null,
      };
      localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(next));
      setStored(next);
    }
  };

  const setJudgeAsTeamRep = (name: string, teamId: string) => {
    const trimmedName = name.trim();
    if (trimmedName && teamId) {
      const next: StoredJudge = {
        judgeName: trimmedName,
        judgeRole: 'team',
        judgeTeamId: teamId,
      };
      localStorage.setItem(JUDGE_STORAGE_KEY, JSON.stringify(next));
      setStored(next);
    }
  };

  const clearJudgeName = () => {
    localStorage.removeItem(JUDGE_STORAGE_KEY);
    setStored(null);
  };

  return (
    <JudgeContext.Provider
      value={{
        judgeName: stored?.judgeName ?? null,
        judgeRole: stored?.judgeRole ?? null,
        judgeTeamId: stored?.judgeTeamId ?? null,
        setJudgeName,
        setJudgeAsCunf,
        setJudgeAsTeamRep,
        clearJudgeName,
      }}
    >
      {children}
    </JudgeContext.Provider>
  );
};

export const useJudge = (): JudgeContextType => {
  const context = useContext(JudgeContext);
  if (context === undefined) {
    throw new Error('useJudge must be used within a JudgeProvider');
  }
  return context;
};

