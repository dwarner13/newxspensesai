/**
 * Centralized Chat Hook
 * ======================
 * React hook for interacting with the centralized chat runtime
 * Handles SSE streaming, session management, and state
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  employee?: {
    slug: string;
    title: string;
    emoji?: string;
  };
  metadata?: {
    tool_calls?: any[];
    citations?: any[];
    feedback?: any;
  };
}

export interface UseChatOptions {
  employeeSlug?: string;
  sessionId?: string | null;
  onError?: (error: Error) => void;
  apiEndpoint?: string;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  error: Error | null;
  sendMessage: (text: string) => Promise<void>;
  createOrUseSession: (employeeSlug: string) => Promise<void>;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    employeeSlug: initialEmployeeSlug = 'byte-doc',
    sessionId: initialSessionId = null,
    onError,
    apiEndpoint = '/.netlify/functions/chat',
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [currentEmployeeSlug, setCurrentEmployeeSlug] = useState(initialEmployeeSlug);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const lastUserMessageRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`chat_session_${currentEmployeeSlug}`);
    if (stored && !initialSessionId) {
      setSessionId(stored);
    }
  }, [currentEmployeeSlug, initialSessionId]);

  // Save session to localStorage
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`chat_session_${currentEmployeeSlug}`, sessionId);
    }
  }, [sessionId, currentEmployeeSlug]);

  // ============================================================================
  // Send Message Function
  // ============================================================================

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      if (isLoading) return;

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Save user message for retry
      lastUserMessageRef.current = text;

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Prepare AI message placeholder
      const aiMessageId = `assistant-${Date.now()}`;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, aiMessage]);

      try {
        // Call API
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: getUserId(),
            employeeSlug: currentEmployeeSlug,
            message: text,
            session_id: sessionId,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle SSE stream
        if (response.headers.get('content-type')?.includes('text/event-stream')) {
          await handleSSEStream(response, aiMessageId);
        } else {
          // Handle JSON response (non-streaming)
          const data = await response.json();
          updateAIMessage(aiMessageId, data.content, data.employee);
          if (data.session_id) {
            setSessionId(data.session_id);
          }
        }

        setIsLoading(false);
      } catch (err) {
        const error = err as Error;
        
        // Don't show error if request was aborted
        if (error.name === 'AbortError') {
          setIsLoading(false);
          return;
        }

        console.error('Chat error:', error);
        setError(error);
        setIsLoading(false);

        // Update AI message with error
        updateAIMessage(
          aiMessageId,
          `⚠️ Error: ${error.message}. Please try again.`,
          undefined
        );

        if (onError) {
          onError(error);
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [isLoading, sessionId, currentEmployeeSlug, apiEndpoint, onError]
  );

  // ============================================================================
  // SSE Stream Handler
  // ============================================================================

  const handleSSEStream = useCallback(
    async (response: Response, messageId: string) => {
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case 'start':
                  // Update session ID
                  if (data.session_id) {
                    setSessionId(data.session_id);
                  }
                  // Update employee info
                  if (data.employee) {
                    updateAIMessage(messageId, '', data.employee);
                  }
                  break;

                case 'text':
                  // Append text to AI message
                  appendToAIMessage(messageId, data.content || '');
                  break;

                case 'tool_call':
                  // Show tool call in progress
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === messageId
                        ? {
                            ...msg,
                            metadata: {
                              ...msg.metadata,
                              tool_calls: [
                                ...(msg.metadata?.tool_calls || []),
                                data.tool,
                              ],
                            },
                          }
                        : msg
                    )
                  );
                  break;

                case 'tool_result':
                  // Update tool call status
                  setMessages(prev =>
                    prev.map(msg => {
                      if (msg.id === messageId && msg.metadata?.tool_calls) {
                        const updatedCalls = msg.metadata.tool_calls.map((tc: any) =>
                          tc.id === data.tool_call_id
                            ? { ...tc, status: 'completed', result: data.result }
                            : tc
                        );
                        return {
                          ...msg,
                          metadata: { ...msg.metadata, tool_calls: updatedCalls },
                        };
                      }
                      return msg;
                    })
                  );
                  break;

                case 'done':
                  // Stream complete
                  if (data.total_tokens) {
                    updateAIMessage(messageId, undefined, undefined, {
                      total_tokens: data.total_tokens,
                    });
                  }
                  break;

                case 'error':
                  throw new Error(data.error || 'Stream error');
              }
            } catch (e) {
              console.warn('Failed to parse SSE event:', line, e);
            }
          }
        }
      }
    },
    []
  );

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const updateAIMessage = useCallback(
    (
      messageId: string,
      content?: string,
      employee?: any,
      metadata?: any
    ) => {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                ...(content !== undefined && { content }),
                ...(employee && { employee }),
                ...(metadata && { metadata: { ...msg.metadata, ...metadata } }),
              }
            : msg
        )
      );
    },
    []
  );

  const appendToAIMessage = useCallback((messageId: string, text: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content: msg.content + text }
          : msg
      )
    );
  }, []);

  const createOrUseSession = useCallback(async (employeeSlug: string) => {
    setCurrentEmployeeSlug(employeeSlug);
    
    // Check localStorage for existing session
    const stored = localStorage.getItem(`chat_session_${employeeSlug}`);
    if (stored) {
      setSessionId(stored);
    } else {
      // Session will be created on first message
      setSessionId(null);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem(`chat_session_${currentEmployeeSlug}`);
  }, [currentEmployeeSlug]);

  const retryLastMessage = useCallback(async () => {
    if (lastUserMessageRef.current) {
      await sendMessage(lastUserMessageRef.current);
    }
  }, [sendMessage]);

  // ============================================================================
  // Cleanup
  // ============================================================================

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    messages,
    sessionId,
    isLoading,
    error,
    sendMessage,
    createOrUseSession,
    clearMessages,
    retryLastMessage,
  };
}

// ============================================================================
// Utilities
// ============================================================================

function getUserId(): string {
  // Try to get from auth context or localStorage
  // For now, generate a stable ID based on browser
  const stored = localStorage.getItem('anonymous_user_id');
  if (stored) return stored;

  const newId = `anon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('anonymous_user_id', newId);
  return newId;
}

// ============================================================================
// Export
// ============================================================================

export default useChat;

