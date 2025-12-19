/**
 * WellnessUnifiedCard Component
 * 
 * Unified card for Wellness Studio workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Sparkles, Heart, Headphones } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface WellnessUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function WellnessUnifiedCard({ onExpandClick, onChatInputClick }: WellnessUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Wellness
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'wellness-studio',
      context: {
        page: 'wellness-studio',
        data: {
          source: 'workspace-wellness',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Wellness
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Daily Practice',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Track Mood',
      icon: <Heart className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Meditations',
      icon: <Headphones className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="wellness-studio"
      primaryActionLabel="Chat with Harmony about your financial self-care"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

