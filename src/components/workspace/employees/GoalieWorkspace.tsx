/**
 * GoalieWorkspace Component
 * 
 * Wrapper around AIWorkspaceOverlay with Goalie-specific configuration
 */

import React from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface GoalieWorkspaceProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function GoalieWorkspace({ open, onClose, conversationId, initialQuestion }: GoalieWorkspaceProps) {
  const theme = getEmployeeTheme('goalie');

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      employeeSlug="goalie-ai"
      title="Goalie — Goal Concierge"
      subtitle="Goal planning specialist · Set goals, track progress, and stay accountable with your always-on financial coach."
      workspaceLabel="Goals Workspace"
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

