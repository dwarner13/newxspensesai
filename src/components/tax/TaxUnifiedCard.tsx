/**
 * TaxUnifiedCard Component
 * 
 * Unified card for Tax Assistant workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling (matches DashUnifiedCard pattern)
 */

import React, { useCallback } from 'react';
import { Search, Upload, FileText } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../workspace/employees/EmployeeUnifiedCardBase';

interface TaxUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function TaxUnifiedCard({ onExpandClick, onChatInputClick }: TaxUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Ledger
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'tax-assistant',
      context: {
        page: 'tax-assistant',
        data: {
          source: 'workspace-tax',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Tax Assistant
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Find Deductions',
      icon: <Search className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Upload',
      icon: <Upload className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Summary',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="tax-assistant"
      primaryActionLabel="Chat with Ledger about your tax deductions"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

