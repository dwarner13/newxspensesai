/**
 * GoalieUnifiedCard Component
 * 
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Target, TrendingUp, Lightbulb } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';

interface GoalieUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function GoalieUnifiedCard({ onExpandClick, onChatInputClick }: GoalieUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();

  // Handler to open unified chat with Goalie
  const handleChatClick = useCallback(() => {
    console.log('[GoalieUnifiedCard] Opening chat with Goalie...');
    openChat({
      initialEmployeeSlug: 'goalie-goals',
      context: {
        page: 'goal-concierge',
        data: {
          source: 'workspace-goalie',
        },
      },
    });
    console.log('[GoalieUnifiedCard] Chat opened, isOpen should be true');
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Goalie
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'New Goal',
      icon: <Target className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Progress',
      icon: <TrendingUp className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Suggestions',
      icon: <Lightbulb className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="goalie-goals"
      primaryActionLabel="Chat with Goalie about your goals"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}




