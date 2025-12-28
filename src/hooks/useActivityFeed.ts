import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

export type ActivityEvent = {
  id: string;
  createdAt: string;
  actorSlug: string;
  actorLabel: string;
  title: string;
  description?: string;
  category: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  metadata?: Record<string, unknown>;
  readAt?: string | null;
  eventType?: string; // For filtering specific event types (e.g., 'byte.import.completed')
};

type UseActivityFeedOptions = {
  limit?: number;
  category?: string;
  unreadOnly?: boolean;
  pollMs?: number; // default 60000 (60s)
};

type UseActivityFeedResult = {
  events: ActivityEvent[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  refetch: () => Promise<void>;
};

export function useActivityFeed(
  options: UseActivityFeedOptions = {}
): UseActivityFeedResult {
  const { userId, isDemoUser, ready, profile } = useAuth();
  const {
    limit = 30,
    category,
    unreadOnly = false,
    pollMs = 60000, // 60 seconds default
  } = options;

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  
  // Track consecutive failures for exponential backoff
  const failureCountRef = useRef(0);
  const lastFailureTimeRef = useRef<number>(0);
  const isFunctionDisabledRef = useRef(false);

  // Check if onboarding is completed
  const isOnboardingCompleted = profile?.onboarding_completed === true;
  
  // Check if function exists (dev mode only - check once)
  const checkFunctionExists = useCallback(async (): Promise<boolean> => {
    if (!import.meta.env.DEV || isFunctionDisabledRef.current) {
      return !isFunctionDisabledRef.current;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout
      
      // Use GET instead of HEAD to avoid 405 Method Not Allowed
      const response = await fetch('/.netlify/functions/activity-feed', {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const exists = response.status !== 404;
      if (!exists) {
        isFunctionDisabledRef.current = true;
        if (import.meta.env.DEV) {
          console.info('[useActivityFeed] Function not found, disabling quietly');
        }
      }
      return exists;
    } catch {
      // Network error or timeout - assume function exists for now
      return true;
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    // Guard: Only fetch when auth is ready AND userId exists AND is NOT a demo user
    if (!ready || !userId || isDemoUser) {
      setIsLoading(false);
      setIsError(false);
      setEvents([]);
      return;
    }

    // Guard: Don't fetch during onboarding
    if (!isOnboardingCompleted) {
      setIsLoading(false);
      setIsError(false);
      setEvents([]);
      return;
    }

    // Guard: Check if function exists in dev mode (only once)
    if (import.meta.env.DEV && !isFunctionDisabledRef.current) {
      const functionExists = await checkFunctionExists();
      if (!functionExists) {
        setIsLoading(false);
        setIsError(false);
        setEvents([]);
        return;
      }
    }

    // Guard: Function disabled (404 detected previously)
    if (isFunctionDisabledRef.current) {
      setIsLoading(false);
      setIsError(false);
      setEvents([]);
      return;
    }

    // Exponential backoff: Wait if we've had recent failures
    const now = Date.now();
    const timeSinceLastFailure = now - lastFailureTimeRef.current;
    const backoffDelay = Math.min(1000 * Math.pow(2, failureCountRef.current), 30000); // Max 30s
    
    if (failureCountRef.current > 0 && timeSinceLastFailure < backoffDelay) {
      // Still in backoff period, skip this fetch
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage(undefined);

      // Get Supabase session token for Authorization header
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('[useActivityFeed] No session token available, skipping fetch');
        setIsLoading(false);
        setIsError(false);
        setEvents([]);
        return;
      }

      // Build query parameters (userId no longer required - extracted from token)
      const params = new URLSearchParams({
        limit: limit.toString(),
      });

      if (category) {
        params.append('category', category);
      }

      if (unreadOnly) {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(
        `/.netlify/functions/activity-feed?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Handle 404 gracefully (function doesn't exist)
        if (response.status === 404) {
          isFunctionDisabledRef.current = true;
          setIsLoading(false);
          setIsError(false);
          setEvents([]);
          failureCountRef.current = 0; // Reset failure count
          // Don't log 404 errors - fail silently
          return;
        }

        // Handle other errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch activity events (${response.status})`);
      }

      const data = await response.json();
      setEvents(data.events || []);
      
      // Reset failure count on success
      failureCountRef.current = 0;
      lastFailureTimeRef.current = 0;
    } catch (error: any) {
      // Increment failure count and record failure time
      failureCountRef.current += 1;
      lastFailureTimeRef.current = Date.now();
      
      // Only log errors if not a 404 and not too many failures
      if (failureCountRef.current <= 3) {
        // Log first few failures for debugging
        if (import.meta.env.DEV) {
          console.warn(`[useActivityFeed] Error fetching events (attempt ${failureCountRef.current}):`, error.message);
        }
      }
      // After 3 failures, fail silently to avoid console spam
      
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load activity feed');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [ready, userId, isDemoUser, limit, category, unreadOnly, isOnboardingCompleted, checkFunctionExists]);

  // Initial fetch on mount - but respect guards
  useEffect(() => {
    // Only fetch if all conditions are met
    if (ready && userId && !isDemoUser && isOnboardingCompleted && !isFunctionDisabledRef.current) {
      fetchEvents();
    } else {
      // Guards prevent fetching - set loading to false immediately
      setIsLoading(false);
    }
  }, [ready, userId, isDemoUser, isOnboardingCompleted, fetchEvents]);

  // Set up polling if pollMs is provided
  // Only poll when: userId exists, onboarding completed, function exists, and pollMs > 0
  // CRITICAL: Pause polling during chat streaming to reduce load
  // Note: This hook doesn't have direct access to streaming state, but can be extended if needed
  useEffect(() => {
    if (!userId || !isOnboardingCompleted || isFunctionDisabledRef.current || pollMs <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchEvents();
    }, pollMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [userId, pollMs, fetchEvents, isOnboardingCompleted]);

  return {
    events,
    isLoading,
    isError,
    errorMessage,
    refetch: fetchEvents,
  };
}










