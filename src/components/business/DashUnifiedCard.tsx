/**
 * DashUnifiedCard Component
 * 
 * Unified card for Business Intelligence workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { FileText, Lightbulb, BarChart3 } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../workspace/employees/EmployeeUnifiedCardBase';

interface DashUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function DashUnifiedCard({ onExpandClick, onChatInputClick }: DashUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Dash
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'dash-analytics',
      context: {
        page: 'business-intelligence',
        data: {
          source: 'workspace-dash',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Dash
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'New Report',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Insights',
      icon: <Lightbulb className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'KPIs',
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="dash-analytics"
      primaryActionLabel="Chat with Dash about your business insights"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

