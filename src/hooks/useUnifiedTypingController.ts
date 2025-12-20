/**
 * Unified Typing Controller Hook
 * 
 * Single source of truth for typing state across all employees.
 * Manages typing indicators for:
 * - Normal message streaming (on send)
 * - On-open greeting typing (config-driven)
 * 
 * All employees use this same system - no custom typing logic allowed.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface TypingState {
  isTyping: boolean;
  employeeSlug: string | null;
  conversationId: string | null;
}

/**
 * Unified typing controller hook
 * 
 * @param conversationId - Current conversation ID (for cleanup on switch)
 * @param employeeSlug - Current employee slug (for cleanup on switch)
 * @returns Typing state and control functions
 */
export function useUnifiedTypingController(
  conversationId: string | null = null,
  employeeSlug: string | null = null
) {
  const [typingState, setTypingState] = useState<TypingState>({
    isTyping: false,
    employeeSlug: null,
    conversationId: null,
  });

  const previousEmployeeSlugRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);

  // Cleanup typing state when employee or conversation changes
  useEffect(() => {
    if (
      employeeSlug !== previousEmployeeSlugRef.current ||
      conversationId !== previousConversationIdRef.current
    ) {
      // End typing if employee or conversation changed
      setTypingState({
        isTyping: false,
        employeeSlug: null,
        conversationId: null,
      });
      previousEmployeeSlugRef.current = employeeSlug;
      previousConversationIdRef.current = conversationId;
    }
  }, [employeeSlug, conversationId]);

  /**
   * Begin typing indicator
   */
  const beginTyping = useCallback((empSlug: string, convId: string | null = null) => {
    setTypingState({
      isTyping: true,
      employeeSlug: empSlug,
      conversationId: convId || conversationId,
    });
  }, [conversationId]);

  /**
   * End typing indicator
   */
  const endTyping = useCallback(() => {
    setTypingState({
      isTyping: false,
      employeeSlug: null,
      conversationId: null,
    });
  }, []);

  /**
   * Helper: Wrap async function with typing indicator
   * Automatically shows typing, executes function, then hides typing
   */
  const withTyping = useCallback(async <T,>(
    empSlug: string,
    asyncFn: () => Promise<T>,
    convId: string | null = null
  ): Promise<T> => {
    beginTyping(empSlug, convId);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      endTyping();
    }
  }, [beginTyping, endTyping]);

  /**
   * Check if currently typing for a specific employee
   */
  const isTypingFor = useCallback((empSlug: string): boolean => {
    return typingState.isTyping && typingState.employeeSlug === empSlug;
  }, [typingState]);

  return {
    isTyping: typingState.isTyping,
    typingEmployeeSlug: typingState.employeeSlug,
    beginTyping,
    endTyping,
    withTyping,
    isTypingFor,
  };
}






