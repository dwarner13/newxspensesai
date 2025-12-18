/**
 * CrystalWorkspace Component
 * 
 * ⚠️ LEGACY - DEPRECATED - DO NOT USE
 * 
 * This component is being phased out in favor of UnifiedAssistantChat.
 * All new chat implementations should use:
 * - useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'crystal-analytics' })
 * - UnifiedAssistantChat (rendered globally by DashboardLayout)
 * 
 * Wrapper around AIWorkspaceOverlay with Crystal-specific configuration
 * 
 * @deprecated Use UnifiedAssistantChat instead
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

