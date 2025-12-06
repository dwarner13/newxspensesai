/**
 * useChatSessions Hook
 * 
 * Fetches recent chat sessions grouped by employee for the chat history sidebar.
 * Shows last message date/time and preview.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

export interface ChatSession {
  id: string;
  employee_slug: string;
  title: string | null;
  message_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

interface UseChatSessionsOptions {
  limit?: number; // Total sessions to fetch (default: 50)
  perEmployee?: number; // Sessions per employee (default: 10)
  autoLoad?: boolean;
}

export function useChatSessions({ 
  limit = 50, 
  perEmployee = 10,
  autoLoad = true 
}: UseChatSessionsOptions = {}) {
  const { user, userId } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch chat sessions with last message preview
  const loadSessions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      // Fetch recent sessions with message count
      // Use updated_at for sorting (updated when messages are added)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id, employee_slug, title, message_count, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit * 2); // Fetch more to account for grouping

      if (sessionsError) {
        console.warn('[useChatSessions] Failed to load sessions:', sessionsError);
        setError(sessionsError as any);
        setIsLoading(false);
        return;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      // For each session, get the last message preview
      const sessionsWithPreview: ChatSession[] = await Promise.all(
        sessionsData.map(async (session) => {
          // Get last message for preview
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('content, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: session.id,
            employee_slug: session.employee_slug || 'prime-boss',
            title: session.title,
            message_count: session.message_count || 0,
            last_message_at: lastMessage?.created_at || session.updated_at || session.created_at,
            last_message_preview: lastMessage?.content 
              ? (lastMessage.content.length > 60 
                  ? lastMessage.content.substring(0, 60) + '...' 
                  : lastMessage.content)
              : null,
            created_at: session.created_at,
          };
        })
      );

      // Group by employee and limit per employee
      const grouped = new Map<string, ChatSession[]>();
      sessionsWithPreview.forEach(session => {
        const employee = session.employee_slug;
        if (!grouped.has(employee)) {
          grouped.set(employee, []);
        }
        grouped.get(employee)!.push(session);
      });

      // Take up to perEmployee sessions per employee, then flatten
      const result: ChatSession[] = [];
      grouped.forEach((employeeSessions) => {
        result.push(...employeeSessions.slice(0, perEmployee));
      });

      // Sort by last_message_at descending
      result.sort((a, b) => {
        const timeA = new Date(a.last_message_at || a.created_at).getTime();
        const timeB = new Date(b.last_message_at || b.created_at).getTime();
        return timeB - timeA;
      });

      // Limit total results
      setSessions(result.slice(0, limit));
    } catch (err: any) {
      console.error('[useChatSessions] Error loading chat sessions:', err);
      setError(err);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit, perEmployee]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && userId) {
      loadSessions();
    }
  }, [autoLoad, userId, loadSessions]);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
  };
}

