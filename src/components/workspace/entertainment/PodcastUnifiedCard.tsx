/**
 * PodcastUnifiedCard Component
 * 
 * Unified card for Personal Podcast workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Plus, Library, Share2 } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface PodcastUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function PodcastUnifiedCard({ onExpandClick, onChatInputClick }: PodcastUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Podcast
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'personal-podcast',
      context: {
        page: 'personal-podcast',
        data: {
          source: 'workspace-podcast',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Podcast
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'New Episode',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Library',
      icon: <Library className="h-4 w-4" />,
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
      employeeSlug="personal-podcast"
      primaryActionLabel="Chat about your podcast"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

