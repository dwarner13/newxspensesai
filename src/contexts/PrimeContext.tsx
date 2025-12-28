/**
 * Prime Context Provider
 * 
 * Provides PrimeState to UI components (read-only).
 * Phase M0: Parallel implementation, no behavior changes.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type { PrimeState } from '../types/prime-state';

const PrimeContext = createContext<PrimeState | null>(null);

export function PrimeProvider({ children }: { children: React.ReactNode }) {
  const [primeState, setPrimeState] = useState<PrimeState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, ready } = useAuth();
  
  useEffect(() => {
    // Don't fetch until auth is ready and userId exists
    if (!ready || !userId) {
      setIsLoading(false);
      return;
    }
    
    // Fetch Prime state from backend
    const fetchPrimeState = async () => {
      try {
        // Get auth token for Authorization header
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
        });

        if (!res.ok) {
          console.warn('[PrimeContext] Failed to fetch Prime state:', res.status, res.statusText);
          setIsLoading(false);
          return;
        }

        const state = await res.json();
        setPrimeState(state);
        
        // Dev logging
        if (import.meta.env.DEV) {
          console.log('[PrimeContext] PrimeState loaded:', {
            currentStage: state.currentStage,
            hasTransactions: state.financialSnapshot.hasTransactions,
            suggestedAction: state.suggestedNextAction?.id,
            lastUpdated: state.lastUpdated,
          });
        }
      } catch (error: any) {
        console.error('[PrimeContext] Error fetching Prime state:', error);
        // Fail-safe: don't crash app, just return null
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPrimeState();
    
    // Refresh every 30 seconds (M0 polling)
    const interval = setInterval(fetchPrimeState, 30000);
    return () => clearInterval(interval);
  }, [userId, ready]);
  
  return (
    <PrimeContext.Provider value={primeState}>
      {children}
    </PrimeContext.Provider>
  );
}

export function usePrimeState(): PrimeState | null {
  return useContext(PrimeContext);
}



