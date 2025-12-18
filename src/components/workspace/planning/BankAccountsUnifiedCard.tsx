/**
 * BankAccountsUnifiedCard Component
 * 
 * Unified card for Bank Accounts workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Plus, RefreshCw, Settings } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface BankAccountsUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function BankAccountsUnifiedCard({ onExpandClick, onChatInputClick }: BankAccountsUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Bank Accounts
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'bank-accounts',
      context: {
        page: 'bank-accounts',
        data: {
          source: 'workspace-bank-accounts',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Bank Accounts
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Add Account',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Sync All',
      icon: <RefreshCw className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Manage',
      icon: <Settings className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="bank-accounts"
      primaryActionLabel="Chat about your bank accounts"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

