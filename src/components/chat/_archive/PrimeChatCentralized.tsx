/**
 * LEGACY: Deprecated chat UI. Dashboard now uses UnifiedAssistantChat + useUnifiedChatLauncher.
 * Kept only for reference and should not be used in new code.
 * 
 * Prime Chat - Centralized Runtime Integration
 * ============================================
 * Phase 3.3: Now uses SharedChatInterface for consistency
 * CEO/Orchestrator powered by centralized chat runtime
 */

import React from 'react';
import { SharedChatInterface } from './SharedChatInterface.tsx';

interface PrimeChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrimeChatCentralized: React.FC<PrimeChatCentralizedProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <SharedChatInterface
      employeeSlug="prime-boss"
      isOpen={isOpen}
      onClose={onClose}
      mode="modal"
      customizations={{
        emoji: "👑",
        title: "Prime",
        subtitle: "CEO & Strategic Orchestrator",
        welcomeMessage: "👑 Welcome! I'm Prime. Your strategic AI CEO and orchestrator of 30+ specialized AI employees. I'm here to coordinate your entire financial team and help you achieve your goals.",
        placeholder: "Ask Prime anything about your finances...",
      }}
    />
  );
};

export default PrimeChatCentralized;

