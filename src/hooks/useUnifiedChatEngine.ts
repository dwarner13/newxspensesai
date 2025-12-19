/**
 * Unified Chat Engine Hook
 * 
 * Wraps usePrimeChat to provide a consistent API for all chat UIs.
 * This is the canonical chat engine - all chat components should use this hook.
 * 
 * Migration note: This replaces useStreamChat in UnifiedAssistantChat and
 * standardizes on usePrimeChat's mature implementation with better header/guardrails handling.
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePrimeChat, type ChatMessage, type ChatHeaders, type UploadItem } from './usePrimeChat';

export interface UnifiedChatEngineOptions {
  /** Employee slug (e.g., 'prime-boss', 'tag-ai', 'byte-docs') */
  employeeSlug?: string;
  
  /** Initial messages to populate on mount */
  initialMessages?: ChatMessage[];
  
  /** System prompt override */
  systemPromptOverride?: string | null;
  
  /** Conversation/session ID */
  conversationId?: string;
  
  /** Error callback */
  onError?: (error: Error) => void;
}

export interface UnifiedChatEngineReturn {
  /** Chat messages */
  messages: ChatMessage[];
  
  /** Send message function */
  sendMessage: (content: string, options?: { documentIds?: string[] }) => Promise<void>;
  
  /** Whether streaming is in progress */
  isStreaming: boolean;
  
  /** Error state (if any) */
  error: Error | null;
  
  /** Whether a tool is currently executing */
  isToolExecuting: boolean;
  
  /** Current tool being executed (if any) */
  currentTool: string | null;
  
  /** Active employee slug (may change after handoff) */
  activeEmployeeSlug: string | undefined;
  
  /** Response headers (guardrails, PII mask, etc.) */
  headers: ChatHeaders;
  
  /** Upload items */
  uploads: UploadItem[];
  
  /** Add upload files */
  addUploadFiles: (files: FileList | File[]) => Promise<void>;
  
  /** Remove upload */
  removeUpload: (id: string) => void;
  
  /** Cancel current stream */
  cancelStream: () => void;
  
  /** Clear all messages */
  clearMessages: () => void;
  
  /** Input value (for components that need it) */
  input: string;
  
  /** Set input value */
  setInput: (value: string) => void;
  
  /** Pending tool confirmation (if any) */
  pendingConfirmation: import('./usePrimeChat').PendingConfirmation | null;
  
  /** Confirm tool execution */
  confirmToolExecution: (confirmation: import('./usePrimeChat').PendingConfirmation) => Promise<void>;
  
  /** Cancel tool execution */
  cancelToolExecution: () => void;
}

/**
 * Map employee slug to usePrimeChat's EmployeeOverride type
 */
function mapEmployeeSlugToOverride(employeeSlug?: string): 'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian' | undefined {
  if (!employeeSlug) return undefined;
  
  // Map canonical slugs to override values
  const slugMap: Record<string, 'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian'> = {
    'prime-boss': 'prime',
    'byte-docs': 'byte',
    'tag-ai': 'tag',
    'crystal-analytics': 'crystal',
    'crystal-ai': 'crystal',
    'goalie-ai': 'goalie',
    'automa-automation': 'automa',
    'blitz-debt': 'blitz',
    'liberty-freedom': 'liberty',
    'chime-bills': 'chime',
    'roundtable-podcast': 'roundtable',
    'serenity-therapist': 'serenity',
    'harmony-wellness': 'harmony',
    'wave-spotify': 'wave',
    'ledger-tax': 'ledger',
    'tax-assistant': 'ledger', // Tax Assistant page uses Ledger employee
    'intelia-bi': 'intelia',
    'dash-analytics': 'dash',
    'custodian-settings': 'custodian',
    'custodian': 'custodian',
  };
  
  return slugMap[employeeSlug] || 'prime'; // Default to prime
}

/**
 * Unified Chat Engine Hook
 * 
 * Provides a consistent API for all chat UIs, wrapping usePrimeChat.
 */
export function useUnifiedChatEngine(options: UnifiedChatEngineOptions = {}): UnifiedChatEngineReturn {
  const { userId } = useAuth();
  
  // Map employee slug to override format
  const employeeOverride = useMemo(() => {
    return mapEmployeeSlugToOverride(options.employeeSlug);
  }, [options.employeeSlug]);
  
  // Use usePrimeChat under the hood
  const primeChat = usePrimeChat(
    userId || 'temp-user',
    options.conversationId,
    employeeOverride,
    options.systemPromptOverride,
    options.initialMessages
  );
  
  // Derive tool execution state from toolCalls array
  const isToolExecuting = useMemo(() => {
    return primeChat.toolCalls.length > 0 && 
           primeChat.toolCalls.some(tc => tc.tool && !tc.result);
  }, [primeChat.toolCalls]);
  
  const currentTool = useMemo(() => {
    const executingTool = primeChat.toolCalls.find(tc => tc.tool && !tc.result);
    return executingTool?.tool || null;
  }, [primeChat.toolCalls]);
  
  // Wrap send to match useStreamChat's API (sendMessage takes just content string)
  const sendMessage = useCallback(async (content: string, sendOptions?: { documentIds?: string[] }) => {
    try {
      await primeChat.send(content, { documentIds: sendOptions?.documentIds });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      options.onError?.(error);
      throw error;
    }
  }, [primeChat.send, options.onError]);
  
  // Wrap stop as cancelStream
  const cancelStream = useCallback(() => {
    primeChat.stop();
  }, [primeChat.stop]);
  
  // Clear messages (reset to initial messages if provided)
  const clearMessages = useCallback(() => {
    // Note: usePrimeChat doesn't expose clearMessages directly
    // We'll need to work with the component to handle this
    // For now, this is a no-op - components can manage their own message clearing
    // if needed by resetting initialMessages prop
  }, []);
  
  // Extract error from messages (usePrimeChat adds error messages to the messages array)
  const error = useMemo(() => {
    const errorMessage = primeChat.messages.find(m => 
      m.role === 'assistant' && 
      m.content.toLowerCase().includes('error') &&
      m.content.toLowerCase().includes('sorry')
    );
    return errorMessage ? new Error(errorMessage.content) : null;
  }, [primeChat.messages]);
  
  return {
    messages: primeChat.messages,
    sendMessage,
    isStreaming: primeChat.isStreaming,
    error,
    isToolExecuting,
    currentTool,
    activeEmployeeSlug: primeChat.activeEmployeeSlug,
    headers: primeChat.headers,
    uploads: primeChat.uploads,
    addUploadFiles: primeChat.addUploadFiles,
    removeUpload: primeChat.removeUpload,
    cancelStream,
    clearMessages,
    input: primeChat.input,
    setInput: primeChat.setInput,
    pendingConfirmation: primeChat.pendingConfirmation,
    confirmToolExecution: primeChat.confirmToolExecution,
    cancelToolExecution: primeChat.cancelToolExecution,
  };
}


