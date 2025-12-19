/**
 * useAIStatus Hook
 * 
 * Determines the current AI system state for the header indicator
 * Returns: "idle" | "processing" | "responding"
 * 
 * Priority:
 * - If responding (chat streaming) → "responding"
 * - Else if processing (jobs/imports) → "processing"
 * - Else → "idle"
 */

import { useMemo } from 'react';
import { useUnifiedChatLauncher } from './useUnifiedChatLauncher';
import { useJobsSystemStore } from '../state/jobsSystemStore';

export type AIStatusState = 'idle' | 'processing' | 'responding';

export function useAIStatus(): AIStatusState {
  const { isOpen: isChatOpen, isWorking: isChatWorking } = useUnifiedChatLauncher();
  const { runningCount } = useJobsSystemStore();

  return useMemo(() => {
    // Responding: Chat is open AND working/streaming
    // Note: isChatWorking is set by chat components when streaming
    const isResponding = isChatOpen && isChatWorking;

    // Processing: Active jobs running OR Smart Import processing
    // For now, we use runningCount from jobs store
    // Smart Import processing can be added later if needed
    const isProcessing = runningCount > 0;

    // Priority: responding > processing > idle
    if (isResponding) {
      return 'responding';
    } else if (isProcessing) {
      return 'processing';
    } else {
      return 'idle';
    }
  }, [isChatOpen, isChatWorking, runningCount]);
}





