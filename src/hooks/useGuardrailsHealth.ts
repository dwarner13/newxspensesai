console.log("GUARDRAILS_HEALTH_BUILD_MARKER=2025-12-27_STACK_ON");

/**
 * Guardrails Health Check Hook
 * 
 * Polls the guardrails-health endpoint to get real-time status.
 * Updates every 30-60 seconds while chat is open.
 */

import { useState, useEffect, useRef } from 'react';

export interface GuardrailsHealthStatus {
  status: 'active' | 'degraded' | 'offline';
  checks: {
    moderation: boolean;
    pii_masking: boolean;
    logging: boolean;
  };
  last_check_at: string;
  version: string;
  error?: string;
}

export function useGuardrailsHealth(isOpen: boolean, pollIntervalMs: number = 30000, pausePolling: boolean = false) {
  const [health, setHealth] = useState<GuardrailsHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<number>(0);
  const lastGoodHealthRef = useRef<GuardrailsHealthStatus | null>(null);

  const checkHealth = async () => {
    // Throttle: Don't check more than once per 5 seconds
    const now = Date.now();
    if (now - lastCheckRef.current < 5000) {
      return;
    }
    lastCheckRef.current = now;

    try {
      const res = await fetch('/.netlify/functions/guardrails-health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // CRITICAL: Handle non-200 responses gracefully
      // Endpoint should always return 200 (even if status is 'offline'), but handle edge cases
      if (!res.ok) {
        // If endpoint returns non-200, try to parse error response, otherwise use offline status
        let errorData: any = null;
        try {
          errorData = await res.json();
        } catch {
          // Ignore JSON parse errors
        }
        
        // If error response has status field, use it; otherwise throw
        if (errorData && typeof errorData.status === 'string') {
          setHealth({
            status: errorData.status === 'active' ? 'active' : errorData.status === 'degraded' ? 'degraded' : 'offline',
            checks: errorData.checks || { moderation: false, pii_masking: false, logging: false },
            last_check_at: errorData.last_check_at || new Date().toISOString(),
            version: errorData.version || '1.0.0',
            error: `HTTP ${res.status}: ${res.statusText}`,
          });
          setIsLoading(false);
          setError(null);
          return;
        }
        
        throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
      }

      // Parse JSON response - handle parse errors gracefully
      let data: GuardrailsHealthStatus;
      try {
        data = await res.json() as GuardrailsHealthStatus;
      } catch (parseError) {
        // If JSON parse fails, return offline status
        throw new Error('Invalid JSON response from health endpoint');
      }
      
      // Cache last good health status (for brief offline periods)
      if (data.status !== 'offline') {
        lastGoodHealthRef.current = data;
      }
      
      // Dev-only debug log on first poll
      if (import.meta.env.DEV && !lastGoodHealthRef.current) {
        console.info('[guardrails] status', data);
      }
      
      setHealth(data);
      setIsLoading(false);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      // Dev-only debug log on error
      if (import.meta.env.DEV) {
        console.warn('[guardrails] health error', err);
      }
      
      setError(error);
      setIsLoading(false);
      
      // Use cached health if available and recent (< 60 seconds), otherwise set offline
      const cacheAge = lastGoodHealthRef.current 
        ? Date.now() - new Date(lastGoodHealthRef.current.last_check_at).getTime()
        : Infinity;
      
      if (lastGoodHealthRef.current && cacheAge < 60000) {
        // Use cached status but mark as potentially stale
        setHealth({
          ...lastGoodHealthRef.current,
          status: 'degraded', // Degrade cached status
          error: `Connection failed: ${error.message}`,
        });
      } else {
        // Set offline status on error
        setHealth({
          status: 'offline',
          checks: {
            moderation: false,
            pii_masking: false,
            logging: false,
          },
          last_check_at: new Date().toISOString(),
          version: '1.0.0',
          error: error.message,
        });
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Clear polling when chat closes
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Initial check immediately (unless paused)
    if (!pausePolling) {
      checkHealth();
    }

    // Set up polling (pause during streaming to reduce load)
    if (!pausePolling) {
      pollIntervalRef.current = setInterval(() => {
        checkHealth();
      }, pollIntervalMs);
    } else {
      // Clear interval if paused
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    // Cleanup on unmount or when isOpen/pausePolling changes
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, pollIntervalMs, pausePolling, checkHealth]);

  return {
    health,
    isLoading,
    error,
    refetch: checkHealth,
  };
}

