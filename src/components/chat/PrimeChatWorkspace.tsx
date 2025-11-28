/**
 * PrimeChatWorkspace Component
 * 
 * Docked version of the unified chat UI for Prime in the middle column workspace
 * Wraps EmployeeChatWorkspace with Prime-specific defaults
 * 
 * This component shares the same backend (/netlify/functions/chat) and state management
 * as UnifiedAssistantChat, ensuring consistency across both interfaces.
 */

import React from 'react';
import { EmployeeChatWorkspace } from './EmployeeChatWorkspace';

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
  return (
    <EmployeeChatWorkspace
      employeeSlug={initialEmployeeSlug}
      initialQuestion={initialQuestion}
      conversationId={conversationId}
      className={className}
      showHeader={showHeader}
    />
  );
}
