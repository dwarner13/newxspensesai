/**
 * useChatHistory Hook
 * 
 * Reusable hook for loading chat history from the database.
 * Extracted from EmployeeChatPage to be used across all chat components.
 * 
 * Features:
 * - Loads messages from chat_messages table
 * - Uses sessionId from localStorage
 * - Filters out system messages
 * - Converts to ChatMessage format
 * - Auto-loads on mount (optional)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSupabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface UseChatHistoryOptions {
  employeeSlug: string;
  limit?: number;
  autoLoad?: boolean;
}

export function useChatHistory({ 
  employeeSlug, 
  limit = 50, 
  autoLoad = true 
}: UseChatHistoryOptions) {
  const { user, userId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get session ID from localStorage
  // Format: chat_session_{userId}_{employeeSlug}
  useEffect(() => {
    if (!userId || !employeeSlug) return;
    
    try {
      const storageKey = `chat_session_${userId}_${employeeSlug}`;
      const storedSessionId = localStorage.getItem(storageKey);
      
      if (storedSessionId) {
        setSessionId(storedSessionId);
      }
    } catch (e) {
      console.warn('[useChatHistory] Failed to read sessionId from localStorage:', e);
    }
  }, [userId, employeeSlug]);

  // Load message history from database
  const loadHistory = useCallback(async () => {
    if (!sessionId || !userId) {
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

      // Fetch messages from chat_messages table
      const { data, error: fetchError } = await supabase
        .from('chat_messages')
        .select('id, role, content, created_at')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (fetchError) {
        console.warn('[useChatHistory] Failed to load message history:', fetchError);
        setError(fetchError as any);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Convert database messages to ChatMessage format
        // Filter out system messages (they're handled separately)
        const loadedMessages: ChatMessage[] = data
          .filter(m => m.role !== 'system')
          .map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content || '',
            createdAt: m.created_at,
          }));

        setMessages(loadedMessages);
        console.log(`[useChatHistory] Loaded ${loadedMessages.length} previous messages from session ${sessionId.substring(0, 8)}...`);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      console.error('[useChatHistory] Error loading chat history:', err);
      setError(err);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, userId, limit]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && sessionId && userId) {
      loadHistory();
    }
  }, [autoLoad, sessionId, userId, loadHistory]);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    loadHistory,
    setMessages, // Allow manual updates (e.g., when new messages arrive)
  };
}

