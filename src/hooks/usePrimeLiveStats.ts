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

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  const { userId } = useAuth();
  const [data, setData] = useState<PrimeLiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(undefined);

    try {
      const url = `/.netlify/functions/prime-live-stats?userId=${encodeURIComponent(userId)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Prime stats: ${response.status} ${response.statusText}`);
      }

      const result: PrimeLiveStats = await response.json();
      setData(result);
      setIsError(false);
      setErrorMessage(undefined);
    } catch (error: any) {
      console.error('[usePrimeLiveStats] Error fetching stats:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load Prime stats');
      // Keep existing data on error (don't clear it)
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchStats();
  }, [userId]); // Only depend on userId, not fetchStats

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchStats();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [userId]); // Only depend on userId, fetchStats is stable

  return {
    data,
    isLoading,
    isError,
    errorMessage,
    refetch: fetchStats,
  };
}





