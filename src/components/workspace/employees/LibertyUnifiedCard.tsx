/**
 * LibertyUnifiedCard Component
 * 
 * Unified card for Liberty (AI Financial Freedom) workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { FileText, DollarSign, TrendingUp } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';

interface LibertyUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function LibertyUnifiedCard({ onExpandClick, onChatInputClick }: LibertyUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Liberty
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'liberty-financial-freedom',
      context: {
        page: 'ai-financial-freedom',
        data: {
          source: 'workspace-liberty',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Liberty
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Review Debt Plan',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Interest Saved',
      icon: <DollarSign className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Progress',
      icon: <TrendingUp className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="liberty-financial-freedom"
      primaryActionLabel="Chat with Liberty about your financial freedom"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}




