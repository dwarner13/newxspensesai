/**
 * PrimeUnifiedCard Component
 * 
 * Unified employee card for Prime (AI Command Center)
 * Uses EmployeeUnifiedCardBase for consistent premium styling matching Byte hero card.
 * Contains action buttons (Open Chat, Assign Task, View Team) in the header section.
 */

import React, { useCallback } from 'react';
import { MessageSquare, Briefcase, Users } from 'lucide-react';
import { useUnifiedChatLauncher } from '../../../hooks/useUnifiedChatLauncher';
import { EmployeeUnifiedCardBase, type SecondaryAction } from './EmployeeUnifiedCardBase';
import { usePrimeOverlaySafe } from '../../../context/PrimeOverlayContext';

interface PrimeUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
  primePanel?: 'none' | 'team' | 'tasks' | 'chat'; // Panel state from parent (kept for compatibility)
  onPrimePanelChange?: (panel: 'none' | 'team' | 'tasks' | 'chat') => void; // Callback to update parent state (kept for compatibility)
}

export function PrimeUnifiedCard({ 
  onChatInputClick,
  primePanel: externalPrimePanel,
  onPrimePanelChange,
}: PrimeUnifiedCardProps) {
  const { openChat } = useUnifiedChatLauncher();
  const { setPrimeToolsOpen } = usePrimeOverlaySafe();

  // Handler to open unified chat with Prime
  const handleChatClick = useCallback(() => {
    console.log('[PrimeUnifiedCard] Opening chat with Prime...');
    openChat({
      initialEmployeeSlug: 'prime-boss',
      context: {
        page: 'prime-chat',
        data: {
          source: 'prime-unified-card',
        },
      },
    });
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick]);

  // Handler for Assign Task action
  const handleAssignTask = useCallback(() => {
    // TODO: Open Prime Tools / command actions when implemented
    // For now, open Prime Tools panel if available
    try {
      setPrimeToolsOpen(true);
    } catch (err) {
      console.log('[PrimeUnifiedCard] Prime Tools not available');
    }
  }, [setPrimeToolsOpen]);

  // Handler for View Team action
  const handleViewTeam = useCallback(() => {
    // TODO: Navigate to employee/team page when implemented
    // For now, no-op
    console.log('[PrimeUnifiedCard] View Team clicked (TODO: implement navigation)');
  }, []);

  // Secondary actions for Prime (3 action pills matching Byte pattern)
  const secondaryActions: SecondaryAction[] = [
    {
      label: 'Open Chat',
      icon: <MessageSquare className="h-4 w-4" />,
      onClick: handleChatClick,
    },
    {
      label: 'Assign Task',
      icon: <Briefcase className="h-4 w-4" />,
      onClick: handleAssignTask,
    },
    {
      label: 'View Team',
      icon: <Users className="h-4 w-4" />,
      onClick: handleViewTeam,
    },
  ];

  return (
    <EmployeeUnifiedCardBase
      employeeSlug="prime-boss"
      primaryActionLabel="Chat with Prime about your finances"
      onPrimaryActionClick={handleChatClick}
      secondaryActions={secondaryActions}
      footerStatusText="Online"
    />
  );
}
