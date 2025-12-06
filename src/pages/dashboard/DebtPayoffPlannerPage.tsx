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

import React, { useState } from 'react';
import { DebtWorkspacePanel } from '../../components/workspace/planning/DebtWorkspacePanel';
import { DebtUnifiedCard } from '../../components/workspace/planning/DebtUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { DebtWorkspaceOverlay } from '../../components/chat/DebtWorkspaceOverlay'; // Create if needed

export default function DebtPayoffPlannerPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isDebtWorkspaceOpen, setIsDebtWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openDebtWorkspace = () => {
    setIsDebtWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeDebtWorkspace = () => {
    setIsDebtWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeDebtWorkspace = () => {
    setIsDebtWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <DebtWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <DebtUnifiedCard onExpandClick={openDebtWorkspace} onChatInputClick={openDebtWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="debt-payoff-planner" />
            }
          />
        </section>
      </DashboardSection>

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
