/**
 * TherapistUnifiedCard Component
 * 
 * Unified card for AI Financial Therapist workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Play, Heart, BookOpen } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface TherapistUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function TherapistUnifiedCard({ onExpandClick, onChatInputClick }: TherapistUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Therapist
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'financial-therapist',
      context: {
        page: 'financial-therapist',
        data: {
          source: 'workspace-therapist',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Therapist
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Start Session',
      icon: <Play className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Mood Check',
      icon: <Heart className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Resources',
      icon: <BookOpen className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="financial-therapist"
      primaryActionLabel="Chat with Therapist about your money wellness"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

