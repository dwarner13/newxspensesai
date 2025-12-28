/**
 * Prime Chat Context
 * 
 * Provides a single, canonical Prime chat instance that can be accessed from:
 * 1. Center panel on /dashboard/prime-chat (via EmployeeChatWorkspace)
 * 2. Right sidebar on ANY dashboard page (via UnifiedAssistantChat)
 * 
 * Both share the same messages, session, and state.
 */

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { usePrimeChat, type ChatMessage, type UploadItem } from '../hooks/usePrimeChat';
import { useAuth } from './AuthContext';

interface PrimeChatContextValue {
  // Chat state
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  uploads: UploadItem[];
  
  // Chat actions
  send: (text?: string | Promise<string>, opts?: { files?: UploadItem[] }) => Promise<void>;
  stop: () => void;
  addUploadFiles: (files: FileList | File[]) => void;
  removeUpload: (id: string) => void;
  
  // Metadata
  headers: {
    guardrails?: string;
    piiMask?: string;
    memoryHit?: string;
    memoryCount?: string;
    sessionSummary?: string;
    sessionSummarized?: string;
    employee?: string;
    routeConfidence?: string;
    streamChunkCount?: string;
  };
  activeEmployeeSlug: string;
  toolCalls: Array<{
    tool: string;
    args?: any;
    result?: any;
    timestamp: number;
  }>;
  
  // Session management
  conversationId: string | undefined;
  setConversationId: (id: string | undefined) => void;
}

const PrimeChatContext = createContext<PrimeChatContextValue | null>(null);

interface PrimeChatProviderProps {
  children: React.ReactNode;
  conversationId?: string;
  initialQuestion?: string;
}

export function PrimeChatProvider({ 
  children, 
  conversationId: externalConversationId,
  initialQuestion 
}: PrimeChatProviderProps) {
  const { userId } = useAuth();
  const [conversationId, setConversationId] = useState<string | undefined>(externalConversationId);
  
  // Use the canonical Prime chat hook
  const primeChat = usePrimeChat(
    userId || 'temp-user',
    conversationId,
    'prime', // Always use Prime
    undefined, // No custom system prompt
    [] // No initial messages - let hook manage state
  );
  
  // Handle initial question if provided
  React.useEffect(() => {
    if (initialQuestion && primeChat.messages.length === 0) {
      // Send initial question after a short delay to ensure hook is ready
      setTimeout(() => {
        primeChat.send(initialQuestion).catch(console.error);
      }, 100);
    }
  }, [initialQuestion, primeChat.messages.length, primeChat.send]);
  
  // Sync external conversationId changes
  React.useEffect(() => {
    if (externalConversationId !== undefined) {
      setConversationId(externalConversationId);
    }
  }, [externalConversationId]);
  
  const value: PrimeChatContextValue = useMemo(() => ({
    messages: primeChat.messages,
    input: primeChat.input,
    setInput: primeChat.setInput,
    isStreaming: primeChat.isStreaming,
    uploads: primeChat.uploads,
    send: primeChat.send,
    stop: primeChat.stop,
    addUploadFiles: primeChat.addUploadFiles,
    removeUpload: primeChat.removeUpload,
    headers: primeChat.headers,
    activeEmployeeSlug: primeChat.activeEmployeeSlug || 'prime-boss',
    toolCalls: primeChat.toolCalls,
    conversationId,
    setConversationId,
  }), [primeChat, conversationId]);
  
  return (
    <PrimeChatContext.Provider value={value}>
      {children}
    </PrimeChatContext.Provider>
  );
}

export function usePrimeChatContext(): PrimeChatContextValue {
  const context = useContext(PrimeChatContext);
  if (!context) {
    throw new Error('usePrimeChatContext must be used within PrimeChatProvider');
  }
  return context;
}










