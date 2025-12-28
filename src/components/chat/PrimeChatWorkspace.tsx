/**
 * PrimeChatWorkspace Component
 * 
 * Docked version of the unified chat UI for Prime in the middle column workspace
 * Wraps EmployeeChatWorkspace with Prime-specific defaults
 * 
 * This component shares the same backend (/netlify/functions/chat) and state management
 * as UnifiedAssistantChat, ensuring consistency across both interfaces.
 */

import React, { useEffect } from 'react';
import { EmployeeChatWorkspace } from './EmployeeChatWorkspace';
import { usePrimeChat } from '../../hooks/usePrimeChat';
import { useAuth } from '../../contexts/AuthContext';

interface PrimeChatWorkspaceProps {
  initialEmployeeSlug?: string;
  initialQuestion?: string;
  conversationId?: string;
  className?: string;
  showHeader?: boolean;
}

export function PrimeChatWorkspace({
  initialEmployeeSlug = 'prime-boss',
  initialQuestion,
  conversationId,
  className,
  showHeader = true,
}: PrimeChatWorkspaceProps) {
  const { userId } = useAuth();
  
  // Map employee slug to employeeOverride format
  const employeeOverride = initialEmployeeSlug === 'prime-boss' ? 'prime' : undefined;
  
  const primeChat = usePrimeChat(
    userId || 'temp-user',
    conversationId,
    employeeOverride,
    undefined, // No custom system prompt
    [] // No initial messages
  );

  // Send initial question if provided
  useEffect(() => {
    if (initialQuestion && primeChat.messages.length === 0) {
      setTimeout(() => {
        primeChat.send(initialQuestion);
      }, 500);
    }
  }, [initialQuestion, primeChat.messages.length]);

  return (
    <EmployeeChatWorkspace
      employeeSlug={initialEmployeeSlug}
      messages={primeChat.messages}
      input={primeChat.input}
      setInput={primeChat.setInput}
      isStreaming={primeChat.isStreaming}
      send={primeChat.send}
      uploads={primeChat.uploads}
      addUploadFiles={primeChat.addUploadFiles}
      removeUpload={primeChat.removeUpload}
      activeEmployeeSlug={primeChat.activeEmployeeSlug}
      headers={primeChat.headers}
      className={className}
      showHeader={showHeader}
      showComposer={true}
      initialQuestion={initialQuestion}
      conversationId={conversationId}
    />
  );
}
