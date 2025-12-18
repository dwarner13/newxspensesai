/**
 * DebtUnifiedCard Component
 * 
 * Unified card for Debt Payoff Planner workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { FileText, DollarSign, GitBranch } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface DebtUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function DebtUnifiedCard({ onExpandClick, onChatInputClick }: DebtUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Debt Payoff Planner
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'debt-payoff-planner',
      context: {
        page: 'debt-payoff-planner',
        data: {
          source: 'workspace-debt',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Debt Payoff Planner
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'View Plan',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Payment',
      icon: <DollarSign className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Compare',
      icon: <GitBranch className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="debt-payoff-planner"
      primaryActionLabel="Chat with Debt about your payoff plan"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

