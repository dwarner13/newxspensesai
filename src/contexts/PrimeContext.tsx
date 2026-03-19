/**
 * Prime Context Provider
 * 
 * Provides PrimeState to UI components (read-only).
 * Phase M0: Parallel implementation, no behavior changes.
 */

import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import type { PrimeState } from '../types/prime-state';
import { QUIET_MODE } from '../lib/quietMode';

export const PrimeContext = createContext<PrimeState | null>(null);
const DEBUG = import.meta.env.DEV && (import.meta.env.VITE_DEBUG_PRIME_STATE === 'true' || import.meta.env.VITE_DEBUG_PRIME_STATE === '1');

export function PrimeProvider({ children }: { children: React.ReactNode }) {
  const [primeState, setPrimeState] = useState<PrimeState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, ready } = useAuth();
  const inFlightRef = useRef<AbortController | null>(null);
  const inFlightUserIdRef = useRef<string | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  const lastUserIdRef = useRef<string | null>(null);
  
  const fetchPrimeState = useCallback(async (targetUserId: string, options: { force?: boolean } = {}) => {
    const { force = false } = options;
    if (!targetUserId) return;

    const now = Date.now();
    if (!force && lastUserIdRef.current === targetUserId && now - lastFetchAtRef.current < 15000) {
      if (DEBUG) {
        console.debug('[PrimeContext] Skipping fetch (deduped)', { targetUserId });
      }
      return;
    }

    if (!force && inFlightRef.current && inFlightUserIdRef.current === targetUserId) {
      if (DEBUG) {
        console.debug('[PrimeContext] Skipping fetch (in-flight same user)', { targetUserId });
      }
      return;
    }

    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }

    const controller = new AbortController();
    inFlightRef.current = controller;
    inFlightUserIdRef.current = targetUserId;

    try {
      const { getSupabase } = await import('../lib/supabase');
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        console.warn('[PrimeContext] No auth token available');
        setIsLoading(false);
        return;
      }

      const res = await fetch('/.netlify/functions/prime-state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        console.warn('[PrimeContext] Failed to fetch Prime state:', res.status, res.statusText);
        setIsLoading(false);
        return;
      }

      const state = await res.json();
      setPrimeState(state);
      lastFetchAtRef.current = Date.now();
      lastUserIdRef.current = targetUserId;

      if (DEBUG) {
        console.debug('[PrimeContext] PrimeState loaded', {
          currentStage: state.currentStage,
          hasTransactions: state.financialSnapshot.hasTransactions,
          suggestedAction: state.suggestedNextAction?.id,
          lastUpdated: state.lastUpdated,
        });
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('[PrimeContext] Error fetching Prime state:', error);
    } finally {
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
        inFlightUserIdRef.current = null;
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (QUIET_MODE) {
      setIsLoading(false);
      return;
    }

    if (!ready || !userId) {
      setIsLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    setIsLoading(true);
    fetchPrimeState(userId, { force: true });

    if (!QUIET_MODE) {
      const intervalId = setInterval(() => {
        if (document.hidden) return;
        fetchPrimeState(userId);
      }, 60000);

      const handleVisibility = () => {
        if (!document.hidden) {
          fetchPrimeState(userId);
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', handleVisibility);
        if (inFlightRef.current) {
          inFlightRef.current.abort();
          inFlightRef.current = null;
          inFlightUserIdRef.current = null;
        }
      };
    }

    return () => {
      if (inFlightRef.current) {
        inFlightRef.current.abort();
        inFlightRef.current = null;
        inFlightUserIdRef.current = null;
      }
    };
  }, [userId, ready, fetchPrimeState]);
  
  return (
    <PrimeContext.Provider value={primeState}>
      {children}
    </PrimeContext.Provider>
  );
}

