/**
 * PrimeWorkspace Component
 * 
 * ⚠️ LEGACY - DEPRECATED - DO NOT USE
 * 
 * This component is being phased out in favor of UnifiedAssistantChat.
 * All new chat implementations should use:
 * - useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'prime-boss' })
 * - UnifiedAssistantChat (rendered globally by DashboardLayout)
 * 
 * Wrapper around AIWorkspaceOverlay with Prime-specific configuration
 * 
 * @deprecated Use UnifiedAssistantChat instead
 */

import React, { useEffect } from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface PrimeWorkspaceProps {
  open: boolean;
  onClose: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function PrimeWorkspace({ 
  open, 
  onClose, 
  minimized = false,
  onMinimize,
  conversationId, 
  initialQuestion 
}: PrimeWorkspaceProps) {
  const theme = getEmployeeTheme('prime');
  
  // Debug logging
  useEffect(() => {
    console.log('[PrimeWorkspace] Component rendered with open:', open, 'minimized:', minimized);
  }, [open, minimized]);
  
  // Default minimize handler: hide overlay but preserve chat state
  const handleMinimize = onMinimize || onClose;

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      minimized={minimized}
      employeeSlug="prime-boss"
      title="Prime — AI Command Center"
      subtitle="Your financial CEO, routing tasks and coordinating your AI team."
      workspaceLabel="Prime Workspace"
      avatarEmoji={theme.emoji}
      avatarColorClass={`${theme.avatarBg} shadow-lg ${theme.avatarShadow}`}
      avatarShadowColorClass={theme.avatarShadow}
      workspacePillColorClass={theme.pill}
      inputPlaceholder={theme.placeholder}
      sendButtonColorClass={`bg-gradient-to-br ${theme.sendGradient} ${theme.sendShadow}`}
      guardrailsText={{
        active: 'Guardrails Active · PII protection on',
        unknown: 'Guardrails: Offline · Protection unavailable', // Never show "Unknown"
      }}
      showMinimize={true}
      onMinimize={handleMinimize}
      conversationId={conversationId}
      initialQuestion={initialQuestion}
      allowedEmployees={[
        "prime-boss",
        "byte-docs",
        "tag-ai",
        "crystal-analytics",
        "finley-forecasts",
      ]}
    />
  );
}

