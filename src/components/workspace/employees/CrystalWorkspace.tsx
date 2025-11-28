/**
 * CrystalWorkspace Component
 * 
 * Wrapper around AIWorkspaceOverlay with Crystal-specific configuration
 */

import React from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface CrystalWorkspaceProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function CrystalWorkspace({ open, onClose, conversationId, initialQuestion }: CrystalWorkspaceProps) {
  const theme = getEmployeeTheme('crystal');

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      employeeSlug="crystal-ai"
      title="Crystal — Spending Predictions"
      subtitle="Forecasting specialist · Predicts spending trends and future financial patterns."
      workspaceLabel="Predictions Workspace"
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

