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
  summary?: string | null;
  tags?: string[];
  employees_involved?: string[];
  pinned?: boolean;
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

  // Fetch chat sessions from Custodian summaries
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

      // Fetch conversation summaries from Custodian (ordered by last_message_at desc)
      // Handle both convo_id and conversation_id column names for backward compatibility
      // Fallback to chat_sessions if chat_convo_summaries doesn't exist
      let summariesData: any[] | null = null;
      let summariesError: any = null;

      try {
        const result = await supabase
          .from('chat_convo_summaries')
          .select('convo_id, conversation_id, title, summary, tags, employees_involved, started_at, last_message_at, pinned')
          .eq('user_id', userId)
          .order('last_message_at', { ascending: false })
          .limit(limit * 2); // Fetch more to account for grouping

        summariesData = result.data;
        summariesError = result.error;
      } catch (err) {
        console.log('[useChatSessions] chat_convo_summaries table not available, using fallback');
        summariesError = err;
      }

      // If chat_convo_summaries fails, fallback to chat_sessions table
      if (summariesError || !summariesData) {
        console.log('[useChatSessions] chat_convo_summaries not available, using chat_sessions fallback');
        
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('chat_sessions')
            .select('id, user_id, employee_slug, title, last_message_at, created_at')
            .eq('user_id', userId)
            .order('last_message_at', { ascending: false })
            .limit(limit * 2);

          if (fallbackError) {
            console.error('[useChatSessions] Fallback to chat_sessions also failed:', fallbackError);
            setSessions([]);
            setIsLoading(false);
            return;
          }

          // Transform chat_sessions to expected format
          summariesData = fallbackData?.map((session: any) => ({
            convo_id: session.id,
            conversation_id: session.id,
            title: session.title || `Chat with ${session.employee_slug || 'AI'}`,
            summary: null,
            tags: [],
            employees_involved: session.employee_slug ? [session.employee_slug] : [],
            started_at: session.created_at,
            last_message_at: session.last_message_at || session.created_at,
            pinned: false
          })) || [];
        } catch (fallbackErr) {
          console.error('[useChatSessions] Error in fallback query:', fallbackErr);
          setSessions([]);
          setIsLoading(false);
          return;
        }
      }

      if (!summariesData || summariesData.length === 0) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      // Convert summaries to ChatSession format
      // Get employee_slug from employees_involved (use first one or 'prime-boss' as fallback)
      // Support both convo_id and conversation_id for backward compatibility
      const sessionsWithPreview: ChatSession[] = summariesData.map((summary: any) => {
        const employeeSlug = summary.employees_involved && summary.employees_involved.length > 0
          ? summary.employees_involved[0]
          : 'prime-boss';

        // Use conversation_id if available, fallback to convo_id (handle both column names)
        const conversationId = summary.conversation_id ?? summary.convo_id ?? null;

        return {
          id: conversationId || '',
          employee_slug: employeeSlug,
          title: summary.title,
          message_count: 0, // Not tracked in summaries
          last_message_at: summary.last_message_at,
          last_message_preview: summary.summary || null,
          created_at: summary.started_at,
          summary: summary.summary,
          tags: summary.tags || [],
          employees_involved: summary.employees_involved || [],
          pinned: summary.pinned || false,
        };
      });

      // Group by employee (use first employee from employees_involved or employee_slug)
      const grouped = new Map<string, ChatSession[]>();
      sessionsWithPreview.forEach(session => {
        // Use first employee from employees_involved if available, otherwise use employee_slug
        const primaryEmployee = (session.employees_involved && session.employees_involved.length > 0)
          ? session.employees_involved[0]
          : session.employee_slug;
        
        if (!grouped.has(primaryEmployee)) {
          grouped.set(primaryEmployee, []);
        }
        grouped.get(primaryEmployee)!.push(session);
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

