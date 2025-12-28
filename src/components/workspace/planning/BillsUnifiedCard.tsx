/**
 * BillsUnifiedCard Component
 * 
 * Unified card for Bill Reminder workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Plus, Calendar, Bell } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface BillsUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function BillsUnifiedCard({ onExpandClick, onChatInputClick }: BillsUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Bills
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'bill-reminders',
      context: {
        page: 'bill-reminders',
        data: {
          source: 'workspace-bills',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Bills
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Add Bill',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Calendar',
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Reminders',
      icon: <Bell className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="bill-reminders"
      primaryActionLabel="Chat with Chime about your bills and reminders"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

