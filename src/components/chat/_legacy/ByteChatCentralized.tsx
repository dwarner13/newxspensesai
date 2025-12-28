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
// LEGACY: SharedChatInterface has been archived
// This component is deprecated - use UnifiedAssistantChat instead
// import { SharedChatInterface } from './SharedChatInterface.tsx';

interface ByteChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ByteChatCentralized: React.FC<ByteChatCentralizedProps> = ({
  isOpen,
  onClose,
}) => {
  // LEGACY: This component is deprecated
  // SharedChatInterface has been archived
  // TODO: Migrate test pages to use UnifiedAssistantChat
  console.warn('[ByteChatCentralized] This component is deprecated. Use UnifiedAssistantChat instead.');
  return (
    <div className="p-4 text-center text-gray-400">
      <p>Legacy component deprecated. Use UnifiedAssistantChat with employeeSlug="byte-docs"</p>
    </div>
  );
  
  // Original implementation (archived):
  // return (
  //   <SharedChatInterface
  //     employeeSlug="byte-docs"
  //     isOpen={isOpen}
  //     onClose={onClose}
  //     mode="modal"
  //     customizations={{...}}
  //   />
  // );
};

export default ByteChatCentralized;

