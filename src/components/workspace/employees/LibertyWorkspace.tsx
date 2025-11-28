/**
 * LibertyWorkspace Component
 * 
 * Wrapper around AIWorkspaceOverlay with Liberty-specific configuration
 */

import React from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface LibertyWorkspaceProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function LibertyWorkspace({ open, onClose, conversationId, initialQuestion }: LibertyWorkspaceProps) {
  const theme = getEmployeeTheme('liberty');

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      employeeSlug="liberty-ai"
      title="Liberty — Financial Freedom"
      subtitle="Financial freedom specialist · Helps you break free from debt and achieve financial independence."
      workspaceLabel="Freedom Workspace"
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

