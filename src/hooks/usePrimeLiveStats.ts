/**
 * usePrimeLiveStats Hook
 * 
 * Fetches real-time Prime Command Center statistics:
 * - Employee online status
 * - Total/online employee counts
 * - Live tasks count
 * - Success rate
 * 
 * Auto-refreshes every 60 seconds to keep dashboard fresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { QUIET_MODE } from '../lib/quietMode';

export type PrimeLiveStats = {
  employees: {
    slug: string;
    name: string;
    role: string;
    status: 'online' | 'idle' | 'offline';
    lastActivityAt: string | null;
  }[];
  totalEmployees: number;
  onlineEmployees: number;
  liveTasks: number;
  successRate: number; // 0–1 (multiply by 100 for display)
};

export type UsePrimeLiveStatsResult = {
  data: PrimeLiveStats | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => Promise<void>;
};

const REFRESH_INTERVAL_MS = 60000; // 60 seconds while tab is visible
const HIDDEN_REFRESH_INTERVAL_MS = 180000; // 3 minutes when tab is hidden
const QUIET_REFRESH_INTERVAL_MS = 120000; // 2 minutes in quiet mode
// Dedup window matches the refresh interval so staggered component intervals
// all share the same fetch rather than producing N requests per cycle.
const DEDUPE_WINDOW_MS = 55000;
let sharedInFlightFetch: Promise<PrimeLiveStats | null> | null = null;
let sharedLastFetchAt = 0;
let sharedLastAttemptAt = 0;
let sharedLastData: PrimeLiveStats | null = null;

export function usePrimeLiveStats(): UsePrimeLiveStatsResult {
  const { userId, isDemoUser, ready } = useAuth();
  const [data, setData] = useState<PrimeLiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  
  // Track if function is disabled (404 detected) - persists across renders
  const isFunctionDisabledRef = useRef(false);

  const fetchStats = useCallback(async (force = false) => {
    if (QUIET_MODE) {
      setIsLoading(false);
      setIsError(false);
      setErrorMessage(undefined);
      return;
    }

    // Only fetch when auth is ready AND userId exists AND is NOT a demo user
    if (!ready || !userId || isDemoUser) {
      setIsLoading(false);
      return;
    }
    
    // Guard: Function disabled (404 detected previously) - stop refetching
    if (isFunctionDisabledRef.current) {
      setIsLoading(false);
      setIsError(false);
      setErrorMessage(undefined);
      return;
    }

    const now = Date.now();
    // Hard global throttle: prevents request storms when multiple components
    // repeatedly mount/remount before sharedLastData is available.
    if (!force && now - sharedLastAttemptAt < DEDUPE_WINDOW_MS) {
      if (sharedLastData) {
        setData(sharedLastData);
      }
      setIsLoading(false);
      setIsError(false);
      setErrorMessage(undefined);
      return;
    }

    if (!force && sharedLastData && now - sharedLastFetchAt < DEDUPE_WINDOW_MS) {
      setData(sharedLastData);
      setIsLoading(false);
      setIsError(false);
      setErrorMessage(undefined);
      return;
    }

    if (sharedInFlightFetch) {
      try {
        const shared = await sharedInFlightFetch;
        if (shared) {
          setData(shared);
        }
        setIsLoading(false);
        setIsError(false);
        setErrorMessage(undefined);
      } catch (error: any) {
        setIsError(true);
        setErrorMessage(error?.message || 'Failed to load Prime stats');
      }
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(undefined);

    try {
      sharedLastAttemptAt = Date.now();
      sharedInFlightFetch = (async () => {
        // Get Supabase session token for Authorization header
        const supabase = getSupabase();
        if (!supabase) {
          console.warn('[usePrimeLiveStats] Supabase client not available, skipping fetch');
          return null;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          console.warn('[usePrimeLiveStats] No session token available, skipping fetch');
          return null;
        }

        const url = `/.netlify/functions/prime-live-stats?userId=${encodeURIComponent(userId)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 404) {
          // Function doesn't exist - disable silently
          isFunctionDisabledRef.current = true;
          if (import.meta.env.DEV) {
            console.info('[usePrimeLiveStats] Function not found (404), disabling quietly');
          }
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch Prime stats: ${response.status} ${response.statusText}`);
        }

        const result: PrimeLiveStats = await response.json();
        return result;
      })();

      const result = await sharedInFlightFetch;
      sharedLastFetchAt = Date.now();
      if (result) {
        sharedLastData = result;
      }
      if (!result) {
        setIsLoading(false);
        setIsError(false);
        setErrorMessage(undefined);
        return;
      }
      setData(result);
      setIsError(false);
      setErrorMessage(undefined);
    } catch (error: any) {
      // Only log/set error if not a 404 (404 already handled above)
      if (!error.message?.includes('404')) {
        console.error('[usePrimeLiveStats] Error fetching stats:', error);
        setIsError(true);
        setErrorMessage(error.message || 'Failed to load Prime stats');
      } else {
        // 404 - disable silently
        isFunctionDisabledRef.current = true;
        setIsLoading(false);
        setIsError(false);
        setErrorMessage(undefined);
        if (import.meta.env.DEV) {
          console.info('[usePrimeLiveStats] Function not found (404), disabling quietly');
        }
      }
      // Keep existing data on error (don't clear it)
    } finally {
      sharedInFlightFetch = null;
      setIsLoading(false);
    }
  }, [ready, userId, isDemoUser]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    if (QUIET_MODE) {
      setIsLoading(false);
      return;
    }
    fetchStats();
  }, [ready, userId, isDemoUser, fetchStats]);

  // Auto-refresh every minute while visible (slower when tab is hidden).
  // CRITICAL: Pause polling during chat streaming to reduce load
  // Note: This hook doesn't have direct access to streaming state, but can be extended if needed
  useEffect(() => {
    if (QUIET_MODE || !ready || !userId || isDemoUser || isFunctionDisabledRef.current) return;

    const pollMs =
      document.visibilityState === 'hidden'
        ? HIDDEN_REFRESH_INTERVAL_MS
        : QUIET_MODE
          ? QUIET_REFRESH_INTERVAL_MS
          : REFRESH_INTERVAL_MS;
    const interval = setInterval(() => {
      fetchStats();
    }, pollMs);

    return () => clearInterval(interval);
  }, [ready, userId, isDemoUser, fetchStats]);

  return {
    data,
    isLoading,
    isError,
    errorMessage,
    refetch: () => fetchStats(true),
  };
}





