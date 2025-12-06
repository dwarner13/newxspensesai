import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
  const { userId } = useAuth();
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

  const fetchEvents = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setIsError(false);
      setEvents([]);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage(undefined);

      // Build query parameters
      const params = new URLSearchParams({
        userId,
        limit: limit.toString(),
      });

      if (category) {
        params.append('category', category);
      }

      if (unreadOnly) {
        params.append('unreadOnly', 'true');
      }

      const response = await fetch(
        `/.netlify/functions/activity-feed?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch activity events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error: any) {
      console.error('[useActivityFeed] Error fetching events:', error);
      setIsError(true);
      setErrorMessage(error.message || 'Failed to load activity feed');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit, category, unreadOnly]);

  // Initial fetch on mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Set up polling if pollMs is provided
  useEffect(() => {
    if (!userId || pollMs <= 0) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchEvents();
    }, pollMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [userId, pollMs, fetchEvents]);

  return {
    events,
    isLoading,
    isError,
    errorMessage,
    refetch: fetchEvents,
  };
}








