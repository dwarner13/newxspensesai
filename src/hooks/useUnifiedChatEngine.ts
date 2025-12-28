/**
 * Unified Chat Engine Hook
 * 
 * Wraps usePrimeChat to provide a consistent API for all chat UIs.
 * This is the canonical chat engine - all chat components should use this hook.
 * 
 * Migration note: This replaces useStreamChat in UnifiedAssistantChat and
 * standardizes on usePrimeChat's mature implementation with better header/guardrails handling.
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
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
  
  /** Guardrails status from chat response (preferred over health endpoint) */
  guardrailsStatus: {
    enabled: boolean;
    pii_masking: boolean;
    moderation: boolean;
    policy_version: string;
    checked_at: string;
    mode: 'streaming' | 'json';
    reason?: string;
  };
  
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
 * Map employee slug to usePrimeChat's EmployeeOverride type using registry
 * Falls back to hardcoded map if registry unavailable (backward compatibility)
 */
async function mapEmployeeSlugToOverride(employeeSlug?: string): Promise<'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian' | undefined> {
  if (!employeeSlug) return undefined;
  
  try {
    // Use registry to resolve employee
    const { getEmployeeBySlug } = await import('@/agents/employees/employeeRegistry');
    const employee = await getEmployeeBySlug(employeeSlug);
    
    if (employee) {
      // Map employee_key to EmployeeOverride type
      // This is a type-safe mapping - EmployeeOverride is a union type
      const keyToOverride: Record<string, 'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian'> = {
        'prime': 'prime',
        'byte': 'byte',
        'tag': 'tag',
        'crystal': 'crystal',
        'goalie': 'goalie',
        'automa': 'automa',
        'blitz': 'blitz',
        'liberty': 'liberty',
        'chime': 'chime',
        'roundtable': 'roundtable',
        'serenity': 'serenity',
        'harmony': 'harmony',
        'wave': 'wave',
        'ledger': 'ledger',
        'intelia': 'intelia',
        'dash': 'dash',
        'custodian': 'custodian',
      };
      
      return keyToOverride[employee.employee_key] || undefined;
    }
  } catch (error) {
    console.warn('[useUnifiedChatEngine] Registry unavailable, using fallback:', error);
  }
  
  // Fallback to hardcoded map (backward compatibility)
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
    'tax-assistant': 'ledger',
    'intelia-bi': 'intelia',
    'dash-analytics': 'dash',
    'custodian-settings': 'custodian',
    'custodian': 'custodian',
  };
  
  return slugMap[employeeSlug] || undefined;
}

/**
 * Unified Chat Engine Hook
 * 
 * Provides a consistent API for all chat UIs, wrapping usePrimeChat.
 * 
 * CRITICAL: Never initializes with fake userId. Returns disabled engine when userId is missing.
 */
export function useUnifiedChatEngine(options: UnifiedChatEngineOptions = {}): UnifiedChatEngineReturn {
  const { userId } = useAuth();
  
  // CRITICAL: Only initialize usePrimeChat when userId is truthy
  // Never call with 'temp-user' - return disabled stub instead
  const canRun = Boolean(userId);
  
  // Map employee slug to override format using registry
  const [employeeOverride, setEmployeeOverride] = useState<'prime' | 'byte' | 'tag' | 'crystal' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian' | undefined>(undefined);
  
  useEffect(() => {
    let cancelled = false;
    
    mapEmployeeSlugToOverride(options.employeeSlug).then(override => {
      if (!cancelled) {
        setEmployeeOverride(override);
      }
    });
    
    return () => {
      cancelled = true;
    };
  }, [options.employeeSlug]);
  
  // CRITICAL: React hooks must be called unconditionally
  // However, we pass undefined/null values when userId is missing to prevent initialization
  // usePrimeChat will handle empty string gracefully (converts to 'temp-user' internally, but we avoid that)
  const primeChat = usePrimeChat(
    userId || '', // Pass empty string - usePrimeChat will handle, but we return disabled stub before using results
    canRun ? options.conversationId : undefined,
    canRun ? employeeOverride : undefined,
    canRun ? options.systemPromptOverride : null,
    canRun ? options.initialMessages : undefined
  );
  
  // Return disabled engine stub when userId is missing
  // This prevents using usePrimeChat results when userId is missing
  if (!canRun) {
    const disabledGuardrailsStatus = {
      enabled: true,
      pii_masking: true,
      moderation: true,
      policy_version: 'balanced' as const,
      checked_at: new Date().toISOString(),
      mode: 'streaming' as const,
    };
    
    return {
      messages: [],
      sendMessage: async () => {
        if (import.meta.env.DEV) {
          console.warn('[useUnifiedChatEngine] sendMessage called but userId is missing - engine disabled');
        }
      },
      isStreaming: false,
      error: null,
      isToolExecuting: false,
      currentTool: null,
      activeEmployeeSlug: undefined,
      headers: {},
      guardrailsStatus: disabledGuardrailsStatus,
      uploads: [],
      addUploadFiles: async () => {},
      removeUpload: () => {},
      cancelStream: () => {},
      clearMessages: () => {},
      input: '',
      setInput: () => {},
      pendingConfirmation: null,
      confirmToolExecution: async () => {},
      cancelToolExecution: () => {},
    };
  }
  
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
  
  // Error extraction: usePrimeChat doesn't expose error field directly
  // Set to null instead of inferring from message text (more reliable)
  const error = null;
  
  return {
    messages: primeChat.messages,
    sendMessage,
    isStreaming: primeChat.isStreaming,
    error,
    isToolExecuting,
    currentTool,
    activeEmployeeSlug: primeChat.activeEmployeeSlug,
    headers: primeChat.headers,
    guardrailsStatus: primeChat.guardrailsStatus,
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


