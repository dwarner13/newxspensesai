/**
 * DashWorkspace Component
 * 
 * Wrapper around AIWorkspaceOverlay with Dash-specific configuration
 */

import React from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface DashWorkspaceProps {
  open: boolean;
  onClose: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function DashWorkspace({ open, onClose, conversationId, initialQuestion }: DashWorkspaceProps) {
  const theme = getEmployeeTheme('dash');

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      employeeSlug="dash"
      title="Dash — Analytics AI"
      subtitle="Analytics specialist · Helps you understand your financial data through advanced analytics, insights, and visualizations."
      workspaceLabel="Analytics Workspace"
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

