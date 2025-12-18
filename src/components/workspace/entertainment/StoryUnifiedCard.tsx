/**
 * StoryUnifiedCard Component
 * 
 * Unified card for Financial Story workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Plus, Clock, Share2 } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface StoryUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function StoryUnifiedCard({ onExpandClick, onChatInputClick }: StoryUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Story
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'financial-story',
      context: {
        page: 'financial-story',
        data: {
          source: 'workspace-story',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Story
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Create Story',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Timeline',
      icon: <Clock className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Share',
      icon: <Share2 className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="financial-story"
      primaryActionLabel="Chat about your financial story"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

