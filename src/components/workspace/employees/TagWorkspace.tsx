/**
 * TagWorkspace Component
 * 
 * ⚠️ LEGACY - DEPRECATED - DO NOT USE
 * 
 * This component is being phased out in favor of UnifiedAssistantChat.
 * All new chat implementations should use:
 * - useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'tag-ai' })
 * - UnifiedAssistantChat (rendered globally by DashboardLayout)
 * 
 * Wrapper around AIWorkspaceOverlay with Tag-specific configuration
 * 
 * @deprecated Use UnifiedAssistantChat instead
 */

import React from 'react';
import { AIWorkspaceOverlay } from '../AIWorkspaceOverlay';
import { getEmployeeTheme } from '../../../config/employeeThemes';

interface TagWorkspaceProps {
  open: boolean;
  onClose: () => void;
  minimized?: boolean;
  onMinimize?: () => void;
  conversationId?: string;
  initialQuestion?: string;
}

export function TagWorkspace({ 
  open, 
  onClose, 
  minimized = false,
  onMinimize,
  conversationId, 
  initialQuestion 
}: TagWorkspaceProps) {
  const theme = getEmployeeTheme('tag');
  
  // Default minimize handler: hide overlay but preserve chat state
  const handleMinimize = onMinimize || onClose;

  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      minimized={minimized}
      employeeSlug="tag-ai"
      title="Tag — Smart Categories"
      subtitle="Transaction categorization specialist · Learns from your corrections and patterns."
      workspaceLabel="Categories Workspace"
      avatarEmoji={theme.emoji}
      avatarColorClass={`${theme.avatarBg} shadow-lg ${theme.avatarShadow}`}
      avatarShadowColorClass={theme.avatarShadow}
      workspacePillColorClass={theme.pill}
      inputPlaceholder={theme.placeholder}
      sendButtonColorClass={`bg-gradient-to-br ${theme.sendGradient} ${theme.sendShadow}`}
      guardrailsText={{
        active: 'Guardrails Active · PII protection on',
        unknown: 'Guardrails Status Unknown',
      }}
      showMinimize={true}
      onMinimize={handleMinimize}
      conversationId={conversationId}
      initialQuestion={initialQuestion}
    />
  );
}

