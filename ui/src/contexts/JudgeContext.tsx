/**
 * Judge Context - Manages judge identity via local storage
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

const JUDGE_NAME_KEY = 'familyOlympics_judgeName';

interface JudgeContextType {
  judgeName: string | null;
  setJudgeName: (name: string) => void;
  clearJudgeName: () => void;
}

const JudgeContext = createContext<JudgeContextType | undefined>(undefined);

export const JudgeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [judgeName, setJudgeNameState] = useState<string | null>(null);

  // Load judge name from local storage on mount
  useEffect(() => {
    const storedName = localStorage.getItem(JUDGE_NAME_KEY);
    if (storedName) {
      setJudgeNameState(storedName);
    }
  }, []);

  const setJudgeName = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      localStorage.setItem(JUDGE_NAME_KEY, trimmedName);
      setJudgeNameState(trimmedName);
    }
  };

  const clearJudgeName = () => {
    localStorage.removeItem(JUDGE_NAME_KEY);
    setJudgeNameState(null);
  };

  return (
    <JudgeContext.Provider value={{ judgeName, setJudgeName, clearJudgeName }}>
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

