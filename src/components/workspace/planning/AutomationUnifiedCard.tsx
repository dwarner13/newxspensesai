/**
 * AutomationUnifiedCard Component
 * 
 * Unified card for Smart Automation workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { Plus, List, Layout } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../employees/EmployeeUnifiedCardBase';

interface AutomationUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function AutomationUnifiedCard({ onExpandClick, onChatInputClick }: AutomationUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Automation
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'smart-automation',
      context: {
        page: 'smart-automation',
        data: {
          source: 'workspace-automation',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Automation
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Create Rule',
      icon: <Plus className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Logs',
      icon: <List className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Templates',
      icon: <Layout className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="smart-automation"
      primaryActionLabel="Chat with Automation about your rules"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

