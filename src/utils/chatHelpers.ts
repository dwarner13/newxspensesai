/**
 * Chat Helper Utilities
 * 
 * Provides convenient functions for opening the unified chat from any page
 * with specific employees and context.
 */

import { useUnifiedChatLauncher } from '../hooks/useUnifiedChatLauncher';

/**
 * Hook to get chat launcher functions
 * Use this in any component to open chat with a specific employee
 * 
 * @example
 * ```tsx
 * const { openChatWithEmployee } = useChatHelpers();
 * 
 * <button onClick={() => openChatWithEmployee('tag-ai', { page: 'transactions' })}>
 *   Ask Tag about these transactions
 * </button>
 * ```
 */
export function useChatHelpers() {
  const { openChat } = useUnifiedChatLauncher();

  const openChatWithEmployee = (
    employeeSlug: string,
    options?: {
      context?: { page?: string; filters?: any; selectionIds?: string[]; data?: any };
      initialQuestion?: string;
    }
  ) => {
    openChat({
      initialEmployeeSlug: employeeSlug,
      context: options?.context,
      initialQuestion: options?.initialQuestion,
    });
  };

  return {
    openChatWithEmployee,
    openChat, // Also expose the full openChat function for advanced use cases
  };
}

/**
 * Employee slug mappings for common use cases
 */
export const CHAT_EMPLOYEES = {
  PRIME: 'prime-boss',
  BYTE: 'byte-doc',
  TAG: 'tag-ai',
  CRYSTAL: 'crystal-ai',
  LIBERTY: 'liberty-ai',
  GOALIE: 'goalie-ai',
  FINLEY: 'finley-ai',
  BLITZ: 'blitz-ai',
  CHIME: 'chime-ai',
  LEDGER: 'ledger-tax',
} as const;






