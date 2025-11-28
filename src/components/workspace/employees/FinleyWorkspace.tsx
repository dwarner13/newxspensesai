/**
 * FinleyWorkspace Component
 * 
 * Wrapper around AIWorkspaceOverlay with Finley-specific configuration
 */

import React from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface FinleyWorkspaceProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function FinleyWorkspace({ open, onClose, conversationId, initialQuestion }: FinleyWorkspaceProps) {
  const theme = getEmployeeTheme('finley');

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      employeeSlug="finley-ai"
      title="Finley — AI Financial Assistant"
      subtitle="Personalized financial brain · Ask anything about your finances, get insights, and plan your future."
      workspaceLabel="Financial Assistant Workspace"
      avatarEmoji={theme.emoji}
      avatarColorClass={`${theme.avatarBg} shadow-lg ${theme.avatarShadow}`}
      avatarShadowColorClass={theme.avatarShadow}
      workspacePillColorClass={theme.pill}
      inputPlaceholder={theme.placeholder}
      sendButtonColorClass={`bg-gradient-to-br ${theme.sendGradient} ${theme.sendShadow}`}
      conversationId={conversationId}
      initialQuestion={initialQuestion}
    />
  );
}

