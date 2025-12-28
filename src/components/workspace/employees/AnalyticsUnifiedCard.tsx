/**
 * AnalyticsUnifiedCard Component
 * 
 * Unified card for Analytics (AI Insights Engine) workspace
 * Uses EmployeeUnifiedCardBase for consistent premium styling
 */

import React, { useCallback } from 'react';
import { FileText, Lightbulb, Download } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';

interface AnalyticsUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
}

export function AnalyticsUnifiedCard({ onExpandClick, onChatInputClick }: AnalyticsUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  
  // Handler to open unified chat with Crystal
  const handleChatClick = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'crystal-analytics',
      context: {
        page: 'analytics',
        data: {
          source: 'workspace-analytics',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Secondary actions for Analytics
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Report',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => onExpandClick?.(),
    },
    {
      label: 'Insights',
      icon: <Lightbulb className="h-4 w-4" />,
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
      employeeSlug="crystal-analytics"
      primaryActionLabel="Chat with Crystal about your analytics"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online 24/7"
    />
  );
}

