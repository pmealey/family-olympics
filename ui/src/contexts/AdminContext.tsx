/**
 * Admin Context for managing global admin state
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '../lib/api';
import type { Olympics, Team, Event, Score } from '../lib/api';

interface AdminContextType {
  // Current year
  currentYear: number | null;
  setCurrentYear: (year: number | null) => void;
  
  // Olympics data
  olympicsYears: Olympics[];
  setOlympicsYears: (years: Olympics[]) => void;
  currentOlympics: Olympics | null;
  setCurrentOlympics: (olympics: Olympics | null) => void;
  
  // Teams data
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  
  // Events data
  events: Event[];
  setEvents: (events: Event[]) => void;
  
  // Scores data
  scores: Score[];
  setScores: (scores: Score[]) => void;
  
  // Loading states
  loading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Refresh functions
  refreshOlympics: () => Promise<void>;
  refreshTeams: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshScores: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [olympicsYears, setOlympicsYears] = useState<Olympics[]>([]);
  const [currentOlympics, setCurrentOlympics] = useState<Olympics | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);

  // Load current olympics on mount
  useEffect(() => {
    const loadCurrentOlympics = async () => {
      console.log('[AdminContext] Loading current Olympics...');
      const response = await apiClient.getCurrentOlympics();
      console.log('[AdminContext] getCurrentOlympics response:', response);
      
      if (response.success && response.data) {
        console.log('[AdminContext] Setting current Olympics:', response.data);
        setCurrentOlympics(response.data);
        setCurrentYear(response.data.year);
      } else {
        console.warn('[AdminContext] No current Olympics found or error:', response.error);
        // Try to load all years and use the first one
        const yearsResponse = await apiClient.listOlympics();
        console.log('[AdminContext] listOlympics response:', yearsResponse);
        
        if (yearsResponse.success && yearsResponse.data?.years && yearsResponse.data.years.length > 0) {
          setOlympicsYears(yearsResponse.data.years);
          
          // Now fetch the full Olympics data for the first year
          const firstYearNumber = yearsResponse.data.years[0].year;
          console.log('[AdminContext] Fetching full data for year:', firstYearNumber);
          
          const fullYearResponse = await apiClient.getOlympics(firstYearNumber);
          console.log('[AdminContext] Full year response:', fullYearResponse);
          
          if (fullYearResponse.success && fullYearResponse.data) {
            console.log('[AdminContext] Using year:', fullYearResponse.data);
            setCurrentOlympics(fullYearResponse.data);
            setCurrentYear(fullYearResponse.data.year);
          } else {
            console.error('[AdminContext] Failed to load full year data');
          }
        } else {
          console.log('[AdminContext] No Olympics years found at all');
        }
      }
    };
    loadCurrentOlympics();
  }, []);

  const refreshOlympics = async () => {
    setLoading(true);
    try {
      const [yearsResponse, currentResponse] = await Promise.all([
        apiClient.listOlympics(),
        apiClient.getCurrentOlympics(),
      ]);

      if (yearsResponse.success && yearsResponse.data) {
        setOlympicsYears(yearsResponse.data.years);
      }

      if (currentResponse.success && currentResponse.data) {
        setCurrentOlympics(currentResponse.data);
        if (!currentYear) {
          setCurrentYear(currentResponse.data.year);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshTeams = async () => {
    if (!currentYear) return;
    
    setLoading(true);
    try {
      const response = await apiClient.listTeams(currentYear);
      if (response.success && response.data) {
        setTeams(response.data.teams);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshEvents = async () => {
    if (!currentYear) return;
    
    setLoading(true);
    try {
      const response = await apiClient.listEvents(currentYear);
      if (response.success && response.data) {
        setEvents(response.data.events);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshScores = async () => {
    if (!currentYear) return;
    
    setLoading(true);
    try {
      const response = await apiClient.listScores(currentYear);
      if (response.success && response.data) {
        setScores(response.data.scores);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      refreshOlympics(),
      refreshTeams(),
      refreshEvents(),
      refreshScores(),
    ]);
  };

  // Load data when currentYear changes
  useEffect(() => {
    if (currentYear) {
      refreshTeams();
      refreshEvents();
      refreshScores();
    }
  }, [currentYear]);

  const value: AdminContextType = {
    currentYear,
    setCurrentYear,
    olympicsYears,
    setOlympicsYears,
    currentOlympics,
    setCurrentOlympics,
    teams,
    setTeams,
    events,
    setEvents,
    scores,
    setScores,
    loading,
    setLoading,
    refreshOlympics,
    refreshTeams,
    refreshEvents,
    refreshScores,
    refreshAll,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

