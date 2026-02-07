import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';
import { warn } from '../lib/logger';
import { QUIET_MODE } from '../lib/quietMode';

// DEV-only override: Use this userId when actual userId is missing (for testing)
const DEV_FORCE_USER_ID = '938a2e17-0e49-45ff-bb98-810db46e5e65';

// Conditional logging: Only log if both DEV and VITE_DEBUG_ACTIVITY_FEED are true
const shouldLog = import.meta.env.DEV && import.meta.env.VITE_DEBUG_ACTIVITY_FEED === 'true';

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
  
  // Track if we've already logged 400 response body (one-time only)
  const hasLogged400Ref = useRef(false);
  
  // Singleton: Track polling interval to prevent duplicates (StrictMode safe)
  const intervalRef = useRef<number | null>(null);
  const activePollerIdRef = useRef<string | null>(null);
  
  // AbortController: Cancel previous fetch when new fetch starts
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Throttle: Track when last fetch finished to prevent fetch storms
  const lastFetchFinishTimeRef = useRef<number>(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  
  // Helper to stop polling and clear refs (StrictMode safe)
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      activePollerIdRef.current = null;
    }
  }, []);

  // Check if onboarding is completed
  const isOnboardingCompleted = profile?.onboarding_completed === true;
  
  // Check if function exists (dev mode only - check once)
  // REMOVED: No longer fetches without query params - server now returns 200 in dev for missing params
  const checkFunctionExists = useCallback(async (): Promise<boolean> => {
    if (!import.meta.env.DEV || isFunctionDisabledRef.current) {
      return !isFunctionDisabledRef.current;
    }
    // Function exists check is no longer needed - server is dev-safe
    // Return true to allow normal fetch to proceed
    return true;
  }, []);

  const fetchEvents = useCallback(async () => {
    // QUIET MODE GATE: VITE_QUIET_MODE or VITE_CHAT_QUIET_MODE pauses activity feed polling
    // Purpose: Suppress background polling noise during OCR/Smart Import debugging
    // This is NOT a bug - activity feed is intentionally paused, AbortError is ignored
    // Re-enable: Remove VITE_QUIET_MODE or VITE_CHAT_QUIET_MODE from .env.local or set to false
    if (QUIET_MODE) {
      setIsLoading(false);
      setIsError(false);
      setEvents([]);
      return;
    }

    // Guard: Only fetch when auth is ready AND is NOT a demo user
    if (!ready || isDemoUser) {
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

    // Guard: Only fetch when document is visible (prevents background fetch storms)
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      if (shouldLog) {
        console.log('[useActivityFeed] Skipped: Document not visible');
      }
      return;
    }

    // Throttle: Skip if last fetch finished < 2000ms ago (prevents fetch storms)
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchFinishTimeRef.current;
    if (timeSinceLastFetch < 2000) {
      if (shouldLog) {
        console.log(`[useActivityFeed] Throttled: Last fetch finished ${timeSinceLastFetch}ms ago (min 2000ms)`);
      }
      return;
    }

    // Exponential backoff: Wait if we've had recent failures
    const timeSinceLastFailure = now - lastFailureTimeRef.current;
    const backoffDelay = Math.min(1000 * Math.pow(2, failureCountRef.current), 30000); // Max 30s
    
    if (failureCountRef.current > 0 && timeSinceLastFailure < backoffDelay) {
      // Still in backoff period, skip this fetch
      if (shouldLog) {
        console.log(`[useActivityFeed] Backoff: Waiting ${backoffDelay - timeSinceLastFailure}ms more`);
      }
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage(undefined);

      // Get Supabase session to retrieve userId and access token
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      const session = data?.session;
      let sessionUserId = session?.user?.id;
      const token = session?.access_token;
      
      // DEV-ONLY OVERRIDE: Use DEV_FORCE_USER_ID when userId is missing (for testing)
      // Priority: session userId > hook userId > DEV_FORCE_USER_ID (DEV only)
      let effectiveUserId = userId;
      if (!effectiveUserId || (typeof effectiveUserId === 'string' && effectiveUserId.trim().length < 8)) {
        if (import.meta.env.DEV) {
          effectiveUserId = DEV_FORCE_USER_ID;
          if (shouldLog) {
            console.log('[useActivityFeed] DEV MODE: Using DEV_FORCE_USER_ID (hook userId missing):', effectiveUserId);
          }
        } else {
          // Production: skip if userId is invalid
          setIsLoading(false);
          setIsError(false);
          setEvents([]);
          return;
        }
      }
      
      let finalUserId: string | undefined = sessionUserId || effectiveUserId;
      
      // If no userId from session or hook, use DEV override (DEV only)
      if ((!finalUserId || (typeof finalUserId === 'string' && finalUserId.trim().length < 8)) && import.meta.env.DEV) {
        finalUserId = DEV_FORCE_USER_ID;
        if (shouldLog) {
          console.log('[useActivityFeed] DEV MODE: Using DEV_FORCE_USER_ID:', finalUserId);
        }
      }
      
      // HARD GUARD: Do NOTHING until finalUserId is a non-empty string
      if (!finalUserId || typeof finalUserId !== 'string' || finalUserId.trim().length === 0) {
        if (shouldLog) {
          console.log('[useActivityFeed] Skipped: No valid userId available');
        }
        setIsLoading(false);
        setIsError(false);
        setEvents([]);
        return;
      }
      
      // Note: Server is dev-safe (returns 200 with empty events if token missing in dev)
      // So we can proceed with fetch even if token is missing in dev mode
      // In production, server will return 401, but client should still attempt fetch
      if (sessionError) {
        if (shouldLog) {
          console.log('[useActivityFeed] Session error, but proceeding (server is dev-safe)');
        }
        // Continue to fetch - server will handle missing token gracefully in dev
      }

      // Build query string with userId (required by function - netlify/functions/activity-feed.ts expects ?userId=...)
      // Ensure exactly one polling fetch call exists, and it calls the built url with userId query string
      // URL format must be EXACTLY: "/.netlify/functions/activity-feed?userId=...&limit=...&category=...&unreadOnly=true"
      const url = `/.netlify/functions/activity-feed?userId=${encodeURIComponent(finalUserId)}&limit=${limit}${category ? `&category=${encodeURIComponent(category)}` : ''}${unreadOnly ? '&unreadOnly=true' : ''}`;

      // AbortController: Cancel previous fetch if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        if (shouldLog) {
          console.log('[useActivityFeed] Aborted previous fetch');
        }
      }
      
      // Create new AbortController for this fetch
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Build headers - Keep Authorization header when token exists (server is dev-safe if missing)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          if (shouldLog) {
            console.log('[useActivityFeed] Fetch aborted (new fetch started or component unmounted)');
          }
          return;
        }
        throw err;
      }

      if (!response.ok) {
        // Handle 400: Missing userId or invalid request - stop polling permanently
        if (response.status === 400) {
          // One-time logging of 400 response body (only if debug enabled)
          if (shouldLog && !hasLogged400Ref.current) {
            try {
              const errorBody = await response.clone().json();
              console.error('[useActivityFeed] 400 Bad Request Response Body:', errorBody);
              hasLogged400Ref.current = true; // Mark as logged - won't log again this session
            } catch {
              // If response body can't be parsed, just log status
              console.error('[useActivityFeed] 400 Bad Request - response body not parseable');
              hasLogged400Ref.current = true;
            }
          }
          
          // Stop polling permanently and silence further requests
          isFunctionDisabledRef.current = true;
          stopPolling();
          setIsLoading(false);
          setIsError(false);
          setEvents([]);
          failureCountRef.current = 0;
          lastFetchFinishTimeRef.current = Date.now();
          return;
        }
        
        // Handle 404 gracefully (function doesn't exist)
        if (response.status === 404) {
          isFunctionDisabledRef.current = true;
          stopPolling();
          setIsLoading(false);
          setIsError(false);
          setEvents([]);
          failureCountRef.current = 0; // Reset failure count
          lastFetchFinishTimeRef.current = Date.now();
          // Don't log 404 errors - fail silently
          return;
        }

        // Handle other errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch activity events (${response.status})`);
      }

      const responseData = await response.json();
      setEvents(responseData.events || []);
      
      // Reset failure count on success
      failureCountRef.current = 0;
      lastFailureTimeRef.current = 0;
      lastFetchFinishTimeRef.current = Date.now(); // Track when fetch finished
      
      if (shouldLog) {
        console.log('[useActivityFeed] ✅ Fetch successful, events:', responseData.events?.length || 0);
      }
    } catch (error: any) {
      // Ignore AbortError (no scary console noise)
      if (error?.name === 'AbortError') {
        if (shouldLog) {
          console.log('[useActivityFeed] Fetch aborted (new fetch started or component unmounted)');
        }
        return;
      }
      
      // Increment failure count and record failure time
      failureCountRef.current += 1;
      lastFailureTimeRef.current = Date.now();
      lastFetchFinishTimeRef.current = Date.now(); // Track even on failure
      
      // Only log errors if debug enabled and not too many failures
      if (shouldLog && failureCountRef.current <= 3) {
        warn(`[useActivityFeed] Error fetching events (attempt ${failureCountRef.current}):`, error.message);
      }
      // After 3 failures, fail silently to avoid console spam
      
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load activity feed');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [ready, userId, isDemoUser, limit, category, unreadOnly, isOnboardingCompleted, checkFunctionExists, stopPolling]);

  const safeFetchEvents = useCallback(() => {
    const p = fetchEvents();
    inFlightRef.current = p;
    return p.catch((err: any) => {
      // Abort is expected during route changes / unmount / new fetch
      if (err?.name === 'AbortError') return;
      console.error('[useActivityFeed] fetch failed', err);
    }).finally(() => {
      if (inFlightRef.current === p) {
        inFlightRef.current = null;
      }
    });
  }, [fetchEvents]);

  // Initial fetch on mount - but respect guards
  // HARD GUARD: Never fetch unless userId exists and is valid
  // QUIET MODE: Skip initial fetch when quiet mode is active
  useEffect(() => {
    // QUIET MODE GATE: Skip initial fetch when quiet mode is active
    if (QUIET_MODE) {
      setIsLoading(false);
      setIsError(false);
      setEvents([]);
      return;
    }
    
    // HARD GUARD: Do NOT fetch if userId is invalid
    if (!userId || typeof userId !== 'string' || userId.trim().length < 8) {
      setIsLoading(false);
      return;
    }
    
    // Guard: Only fetch when document is visible
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      setIsLoading(false);
      return;
    }
    
    // Only fetch if all conditions are met
    if (ready && !isDemoUser && isOnboardingCompleted && !isFunctionDisabledRef.current) {
      void safeFetchEvents();
    } else {
      // Guards prevent fetching - set loading to false immediately
      setIsLoading(false);
    }
  }, [ready, userId, isDemoUser, isOnboardingCompleted, safeFetchEvents]);

  // Set up polling if pollMs is provided
  // HARD GUARD: Never start polling if userId is missing/invalid (prevents 400 spam)
  // QUIET MODE: Don't start polling when QUIET_MODE is active
  // STRICTMODE SAFE: Singleton pattern prevents duplicate intervals in dev StrictMode
  useEffect(() => {
    // QUIET MODE GATE: Skip polling entirely when quiet mode is active
    if (QUIET_MODE) {
      return;
    }
    
    // HARD GUARD: Do NOT fetch, do NOT start intervals if userId is invalid
    if (!userId || typeof userId !== 'string' || userId.trim().length < 8) {
      return;
    }
    
    if (!isOnboardingCompleted || isFunctionDisabledRef.current || pollMs <= 0) {
      return;
    }
    
    // SINGLETON GUARD: If polling already active, don't start another (StrictMode safe)
    if (intervalRef.current) {
      if (shouldLog) {
        console.log(`[useActivityFeed] ⛔ Polling already active (pollerId: ${activePollerIdRef.current}), skipping start`);
      }
      return;
    }

    // Start polling with unique poller ID
    activePollerIdRef.current = `poller-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    intervalRef.current = window.setInterval(() => {
      // Guard: Only poll when document is visible
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void safeFetchEvents();
      } else {
        if (shouldLog) {
          console.log('[useActivityFeed] Poll skipped: Document not visible');
        }
      }
    }, pollMs);

    if (shouldLog) {
      console.log(`[useActivityFeed] 🚀 Polling started - pollerId: ${activePollerIdRef.current}, interval: ${pollMs}ms`);
    }

    return () => {
      stopPolling();
    };
  }, [userId, pollMs, safeFetchEvents, isOnboardingCompleted, stopPolling]);

  // Cleanup: Abort any pending fetch on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (err: any) {
          if (err?.name !== 'AbortError') {
            console.error('[useActivityFeed] Abort failed', err);
          }
        }
        abortControllerRef.current = null;
      }
      if (inFlightRef.current) {
        inFlightRef.current.catch(() => {});
      }
    };
  }, []);

  // Suppress unhandled AbortError rejections during unmounts/routes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      if (reason?.name === 'AbortError') {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  return {
    events,
    isLoading,
    isError,
    errorMessage,
    refetch: safeFetchEvents,
  };
}
