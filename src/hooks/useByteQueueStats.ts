/**
 * useByteQueueStats Hook
 * 
 * Fetches real-time statistics for Byte workspace from smart_import_stats endpoint.
 * Auto-refreshes every 20 seconds to keep stats up-to-date while OCR is running.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  const { userId } = useAuth();
  const [data, setData] = useState<ByteQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Track if function is disabled (404 detected) - persists across renders
  const isFunctionDisabledRef = useRef(false);

  const fetchStats = useCallback(async () => {
    if (!userId) {
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
        return;
      }

      if (!response.ok) {
        throw new Error(`Stats fetch failed: ${response.status} ${response.statusText}`);
      }

      const stats = await response.json();
      setData(stats);
      setIsLoading(false);
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
      } else {
        // Other errors - log and set error state
        console.error('[useByteQueueStats] Error fetching stats:', error);
        setIsError(true);
        setIsLoading(false);
      }
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 20 seconds
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      fetchStats();
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [userId, fetchStats]);

  return {
    data,
    isLoading,
    isError,
    refetch: fetchStats,
  };
}










