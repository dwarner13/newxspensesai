import { useState, useCallback, useRef } from 'react';
import { StreamEvent } from '../../types/ai';
import { CHAT_ENDPOINT, verifyChatBackend } from '../../lib/chatEndpoint';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    id: string;
    name: string;
    status: 'pending' | 'executing' | 'completed' | 'error';
    result?: any;
  }>;
  processingTime?: number;
}

interface UseStreamChatOptions {
  onError?: (error: Error) => void;
  conversationId?: string;
}

export function useStreamChat(options: UseStreamChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isToolExecuting, setIsToolExecuting] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const sendMessage = useCallback(async (content: string) => {
    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setError(null);
    setIsToolExecuting(false);
    setCurrentTool(null);
    
    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
    };
    
    setMessages(prev => [...prev, assistantMessage]);
    
    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      console.log('[useStreamChat] using endpoint:', CHAT_ENDPOINT);
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`,
        },
        body: JSON.stringify({
          userId: localStorage.getItem('anonymous_user_id') || `anon-${Date.now()}`,
          employeeSlug: 'prime-boss',
          message: content,
          sessionId: options.conversationId,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });
      
      // Verify we're hitting the v2 backend
      verifyChatBackend(response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No response body');
      }
      
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true});
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              const event = data as StreamEvent;
              
              switch (event.type) {
                case 'text':
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content += event.content;
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'tool_call':
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.toolCalls = lastMessage.toolCalls || [];
                      lastMessage.toolCalls.push({
                        id: event.tool.id,
                        name: event.tool.name,
                        status: 'pending',
                      });
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'tool_executing':
                  setIsToolExecuting(true);
                  setCurrentTool(event.tool);
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      const toolCall = lastMessage.toolCalls?.find(tc => tc.name === event.tool);
                      if (toolCall) {
                        toolCall.status = 'executing';
                      }
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'confirmation_required':
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'assistant') {
                      lastMessage.content += `\n\n⚠️ **Confirmation Required**\n${event.summary}\n\nPlease confirm by saying "yes" or "confirm" to proceed.`;
                    }
                    return newMessages;
                  });
                  break;
                  
                case 'error':
                  throw new Error(event.error);
                  
                case 'done':
                  setIsStreaming(false);
                  setIsToolExecuting(false);
                  setCurrentTool(null);
                  
                  if (event.processingTime) {
                    setMessages(prev => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage && lastMessage.role === 'assistant') {
                        lastMessage.processingTime = event.processingTime;
                      }
                      return newMessages;
                    });
                  }
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (err) {
      const error = err as Error;
      
      if (error.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        setError(error);
        options.onError?.(error);
        
        // Remove assistant message if error
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsStreaming(false);
      setIsToolExecuting(false);
      setCurrentTool(null);
      abortControllerRef.current = null;
    }
  }, [options]);
  
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);
  
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);
  
  return {
    messages,
    isStreaming,
    error,
    isToolExecuting,
    currentTool,
    sendMessage,
    cancelStream,
    clearMessages,
  };
}
