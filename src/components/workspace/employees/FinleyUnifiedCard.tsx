/**
 * FinleyUnifiedCard Component
 * 
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { MessageSquare, History, Lightbulb } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';

interface FinleyUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function FinleyUnifiedCard({ onExpandClick, onChatInputClick }: FinleyUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();

  // Handler to open unified chat with Finley
  const handleChatClick = useCallback(() => {
    console.log('[FinleyUnifiedCard] Opening chat with Finley...');
    openChat({
      initialEmployeeSlug: 'finley-forecasts',
      context: {
        page: 'ai-chat-assistant',
        data: {
          source: 'workspace-finley',
        },
      },
    });
    console.log('[FinleyUnifiedCard] Chat opened, isOpen should be true');
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Finley
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Ask',
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'History',
      icon: <History className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Advice',
      icon: <Lightbulb className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="finley-forecasts"
      primaryActionLabel="Chat with Finley about your finances"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}


