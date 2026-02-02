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
  
  // Loading states (granular for each data type)
  loading: boolean;
  setLoading: (loading: boolean) => void;
  olympicsLoading: boolean;
  teamsLoading: boolean;
  eventsLoading: boolean;
  scoresLoading: boolean;
  
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
  
  // Granular loading states - start true to indicate initial load pending
  const [olympicsLoading, setOlympicsLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(true);

  // Load current olympics on mount
  useEffect(() => {
    const loadCurrentOlympics = async () => {
      setOlympicsLoading(true);
      console.log('[AdminContext] Loading current Olympics...');
      try {
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
      } finally {
        setOlympicsLoading(false);
      }
    };
    loadCurrentOlympics();
  }, []);

  const refreshOlympics = async () => {
    setLoading(true);
    setOlympicsLoading(true);
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
      setOlympicsLoading(false);
    }
  };

  const refreshTeams = async () => {
    if (!currentYear) {
      setTeamsLoading(false);
      return;
    }
    
    setLoading(true);
    setTeamsLoading(true);
    try {
      const response = await apiClient.listTeams(currentYear);
      if (response.success && response.data) {
        setTeams(response.data.teams);
      }
    } finally {
      setLoading(false);
      setTeamsLoading(false);
    }
  };

  const refreshEvents = async () => {
    if (!currentYear) {
      setEventsLoading(false);
      return;
    }
    
    setLoading(true);
    setEventsLoading(true);
    try {
      const response = await apiClient.listEvents(currentYear);
      if (response.success && response.data) {
        setEvents(response.data.events);
      }
    } finally {
      setLoading(false);
      setEventsLoading(false);
    }
  };

  const refreshScores = async () => {
    if (!currentYear) {
      setScoresLoading(false);
      return;
    }
    
    setLoading(true);
    setScoresLoading(true);
    try {
      const response = await apiClient.listScores(currentYear);
      if (response.success && response.data) {
        setScores(response.data.scores);
      }
    } finally {
      setLoading(false);
      setScoresLoading(false);
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
    olympicsLoading,
    teamsLoading,
    eventsLoading,
    scoresLoading,
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

