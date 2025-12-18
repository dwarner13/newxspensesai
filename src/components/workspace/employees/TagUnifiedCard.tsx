/**
 * TagUnifiedCard Component
 * 
 * Unified card for Tag (Smart Categories AI) workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Sparkles, CheckCircle, Plus } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';

interface TagUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function TagUnifiedCard({ onExpandClick, onChatInputClick }: TagUnifiedCardProps) {
  // Use unified chat launcher instead of inline chat
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Tag
  const handleChatClick = useCallback(() => {
    console.log('[TagUnifiedCard] Opening chat with Tag...');
    openChat({
      initialEmployeeSlug: 'tag-ai',
      context: {
        page: 'smart-categories',
        data: {
          source: 'workspace-tag',
        },
      },
    });
    console.log('[TagUnifiedCard] Chat opened, isOpen should be true');
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Tag
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Auto-Tag',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Review',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'New',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="tag-ai"
      primaryActionLabel="Chat with Tag about your categories"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

