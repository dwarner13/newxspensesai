/**
 * usePrimeLiveStats Hook
 * 
 * Fetches real-time Prime Command Center statistics:
 * - Employee online status
 * - Total/online employee counts
 * - Live tasks count
 * - Success rate
 * 
 * Auto-refreshes every 30 seconds to keep dashboard fresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

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

const REFRESH_INTERVAL_MS = 30000; // 30 seconds

export function usePrimeLiveStats(): UsePrimeLiveStatsResult {
  const { userId, isDemoUser, ready } = useAuth();
  const [data, setData] = useState<PrimeLiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  
  // Track if function is disabled (404 detected) - persists across renders
  const isFunctionDisabledRef = useRef(false);

  const fetchStats = useCallback(async () => {
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

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(undefined);

    try {
      // Get Supabase session token for Authorization header
      const supabase = getSupabase();
      if (!supabase) {
        console.warn('[usePrimeLiveStats] Supabase client not available, skipping fetch');
        setIsLoading(false);
        setIsError(false);
        return;
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('[usePrimeLiveStats] No session token available, skipping fetch');
        setIsLoading(false);
        setIsError(false);
        return;
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
        setIsLoading(false);
        setIsError(false);
        setErrorMessage(undefined);
        if (import.meta.env.DEV) {
          console.info('[usePrimeLiveStats] Function not found (404), disabling quietly');
        }
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch Prime stats: ${response.status} ${response.statusText}`);
      }

      const result: PrimeLiveStats = await response.json();
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
      setIsLoading(false);
    }
  }, [ready, userId, isDemoUser]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchStats();
  }, [ready, userId, isDemoUser, fetchStats]);

  // Auto-refresh every 30 seconds (only if function is enabled)
  // CRITICAL: Pause polling during chat streaming to reduce load
  // Note: This hook doesn't have direct access to streaming state, but can be extended if needed
  useEffect(() => {
    if (!ready || !userId || isDemoUser || isFunctionDisabledRef.current) return;

    const interval = setInterval(() => {
      fetchStats();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ready, userId, isDemoUser, fetchStats]);

  return {
    data,
    isLoading,
    isError,
    errorMessage,
    refetch: fetchStats,
  };
}





