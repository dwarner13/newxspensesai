/**
 * TransactionsUnifiedCard Component
 * 
 * Unified card for Transactions workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface TransactionsUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function TransactionsUnifiedCard({ onExpandClick, onChatInputClick }: TransactionsUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Transactions
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'transactions',
      context: {
        page: 'transactions',
        data: {
          source: 'workspace-transactions',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Transactions
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Add',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Import',
      icon: <Upload className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Export',
      icon: <Download className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="transactions"
      primaryActionLabel="Chat about your transactions"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

