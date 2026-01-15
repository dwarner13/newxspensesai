/**
 * useByteQueueStats Hook
 * 
 * Fetches real-time statistics for Byte workspace from smart_import_stats endpoint.
 * Auto-refreshes every 2.5 seconds to keep stats up-to-date while OCR is running.
 * Stops polling when no imports are pending/processing.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { onBus } from '../lib/bus';
import { getSupabase } from '../lib/supabase';
import { QUIET_MODE } from '../lib/quietMode';

export interface ByteQueueStats {
  queue: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  monthly: {
    totalThisMonth: number;
    totalLastMonth: number;
    deltaPercent: number;
  };
  health: {
    failedLast24h: number;
    status: 'good' | 'warning' | 'error';
  };
}

export function useByteQueueStats() {
  const { userId, session } = useAuth();
  const [data, setData] = useState<ByteQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Track if function is disabled (404 detected) - persists across renders
  const isFunctionDisabledRef = useRef(false);
  
  // Singleton: Track polling interval to ensure only one exists at a time
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollerIdRef = useRef<string>(`poller-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  
  // Helper to stop polling and clear ref
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      if (import.meta.env.DEV) {
        console.log(`[useByteQueueStats] 🛑 Polling stopped - pollerId: ${pollerIdRef.current}`);
      }
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    // QUIET MODE GATE: Skip fetch when quiet mode is active
    if (QUIET_MODE) {
      setIsLoading(false);
      setIsError(false);
      return;
    }
    
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    // Get fresh session token at call time (not stale)
    const supabase = getSupabase();
    if (!supabase) {
      if (import.meta.env.DEV) {
        console.warn('[useByteQueueStats] Supabase client not available, skipping fetch');
      }
      setIsLoading(false);
      return;
    }
    
    const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !freshSession?.access_token) {
      if (import.meta.env.DEV) {
        console.warn(`[useByteQueueStats] No session token available (pollerId: ${pollerIdRef.current}), skipping fetch`);
      }
      setIsLoading(false);
      return;
    }
    
    // Guard: Function disabled (404 detected previously) - stop refetching
    if (isFunctionDisabledRef.current) {
      setIsLoading(false);
      setIsError(false);
      return;
    }

    try {
      setIsError(false);
      const response = await fetch('/.netlify/functions/smart_import_stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshSession.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (response.status === 404) {
        // Function doesn't exist - disable silently
        isFunctionDisabledRef.current = true;
        setIsLoading(false);
        setIsError(false);
        if (import.meta.env.DEV) {
          console.info('[useByteQueueStats] Function not found (404), disabling quietly');
        }
        // Stop polling on 404
        stopPolling();
        return;
      }

      if (response.status === 401) {
        // 401 - authentication issue, stop polling
        if (import.meta.env.DEV) {
          console.warn(`[useByteQueueStats] 401 Unauthorized (pollerId: ${pollerIdRef.current}), stopping poll`);
        }
        stopPolling();
        setIsError(true);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Stats fetch failed: ${response.status} ${response.statusText}`);
      }

      const stats = await response.json();
      setData(stats);
      setIsLoading(false);
      
      // Check if there are no pending/processing imports - stop polling if queue is idle
      const hasActiveImports = (stats.queue?.pending || 0) > 0 || (stats.queue?.processing || 0) > 0;
      if (!hasActiveImports && intervalRef.current) {
        if (import.meta.env.DEV) {
          console.log(`[useByteQueueStats] ✅ Queue idle, stopping poll - pollerId: ${pollerIdRef.current}`);
        }
        stopPolling();
      }
    } catch (error: any) {
      // Check if error is a 404
      const is404 = error.message?.includes('404') || error.message?.includes('Not Found');
      
      if (is404) {
        // 404 - disable silently
        isFunctionDisabledRef.current = true;
        setIsLoading(false);
        setIsError(false);
        if (import.meta.env.DEV) {
          console.info('[useByteQueueStats] Function not found (404), disabling quietly');
        }
        // Stop polling on 404
        stopPolling();
      } else {
        // Other errors - log and set error state
        console.error('[useByteQueueStats] Error fetching stats:', error);
        setIsError(true);
        setIsLoading(false);
      }
    }
  }, [userId, stopPolling]);

  // Initial fetch - skip if quiet mode is active
  useEffect(() => {
    if (QUIET_MODE) {
      setIsLoading(false);
      setIsError(false);
      return;
    }
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 2.5 seconds (2500ms) - SINGLETON: ensure only one interval exists
  // QUIET MODE: Don't start polling when quiet mode is active
  useEffect(() => {
    // QUIET MODE GATE: Skip polling entirely when quiet mode is active
    if (QUIET_MODE) {
      return;
    }
    
    if (!userId) return;
    
    // SINGLETON GUARD: If polling already active, don't start another
    if (intervalRef.current) {
      if (import.meta.env.DEV) {
        console.log(`[useByteQueueStats] ⛔ Polling already active, skipping start`);
      }
      return;
    }

    if (import.meta.env.DEV) {
      console.log(`[useByteQueueStats] 🚀 Polling started - pollerId: ${pollerIdRef.current}, interval: 2500ms`);
    }

    intervalRef.current = setInterval(() => {
      fetchStats();
    }, 2500); // 2.5 seconds

    return () => {
      stopPolling();
    };
  }, [userId, fetchStats, stopPolling]);
  
  // Stop polling when import completes (listen to BYTE_IMPORT_COMPLETED event)
  useEffect(() => {
    if (!userId) return;
    
    const handleImportCompleted = () => {
      if (intervalRef.current) {
        if (import.meta.env.DEV) {
          console.log(`[useByteQueueStats] 🛑 Polling stopped (import completed) - pollerId: ${pollerIdRef.current}`);
        }
        stopPolling();
      }
    };
    
    const unsubscribe = onBus('BYTE_IMPORT_COMPLETED', handleImportCompleted);
    return unsubscribe;
  }, [userId, stopPolling]);

  return {
    data,
    isLoading,
    isError,
    refetch: fetchStats,
  };
}










