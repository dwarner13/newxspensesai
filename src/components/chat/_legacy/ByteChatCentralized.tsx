/**
 * LEGACY: Deprecated chat UI. Dashboard now uses UnifiedAssistantChat + useUnifiedChatLauncher.
 * Kept only for reference and should not be used in new code.
 * 
 * Byte Chat - Centralized Runtime Integration
 * ============================================
 * Phase 3.3: Now uses SharedChatInterface for consistency
 * Document processing specialist powered by centralized chat runtime
 */

import React from 'react';
import { SharedChatInterface } from './SharedChatInterface';

interface ByteChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ByteChatCentralized: React.FC<ByteChatCentralizedProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <SharedChatInterface
      employeeSlug="byte-docs"
      isOpen={isOpen}
      onClose={onClose}
      mode="modal"
      customizations={{
        emoji: "📄",
        title: "Byte",
        subtitle: "Document Processing Specialist",
        welcomeMessage: "Hello! I'm Byte 📄. I'm your document processing specialist! I love organizing data and turning chaotic documents into beautiful, structured information. What document can I help you with today?",
        placeholder: "Ask Byte anything about your documents...",
      }}
    />
  );
};

export default ByteChatCentralized;

