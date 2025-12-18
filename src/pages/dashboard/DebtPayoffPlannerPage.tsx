/**
 * DebtPayoffPlannerPage Component
 * 
 * Complete workspace layout for Debt Payoff Planner
 * 
 * Layout:
 * - Left column (33%): Debt Workspace Panel
 * - Center column (42%): Debt Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { DebtWorkspacePanel } from '../../components/workspace/planning/DebtWorkspacePanel';
import { DebtUnifiedCard } from '../../components/workspace/planning/DebtUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { DebtWorkspaceOverlay } from '../../components/chat/DebtWorkspaceOverlay'; // Create if needed

export default function DebtPayoffPlannerPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<DebtWorkspacePanel />}
        center={
          <DebtUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'debt-payoff-planner',
                context: {
                  page: 'debt-payoff-planner',
                  data: {
                    source: 'debt-payoff-planner-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'debt-payoff-planner',
                context: {
                  page: 'debt-payoff-planner',
                  data: {
                    source: 'debt-payoff-planner-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="debt-payoff-planner" />}
      />

      {/* Debt Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when DebtWorkspaceOverlay is created */}
      {/* <DebtWorkspaceOverlay 
        open={isDebtWorkspaceOpen} 
        onClose={closeDebtWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeDebtWorkspace}
      /> */}
    </>
  );
}
