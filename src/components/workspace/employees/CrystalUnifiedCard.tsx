/**
 * CrystalUnifiedCard Component
 * 
 * Unified card for Crystal (Spending Predictions AI) workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { TrendingUp, Bell, Sliders } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';

interface CrystalUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function CrystalUnifiedCard({ onExpandClick, onChatInputClick }: CrystalUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Crystal
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'crystal-spending',
      context: {
        page: 'spending-predictions',
        data: {
          source: 'workspace-crystal',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Crystal
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Forecast',
      icon: <TrendingUp className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Alerts',
      icon: <Bell className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Model',
      icon: <Sliders className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="crystal-spending"
      primaryActionLabel="Chat with Crystal about your spending predictions"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}
