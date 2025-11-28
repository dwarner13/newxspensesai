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
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { DebtWorkspaceOverlay } from '../../components/chat/DebtWorkspaceOverlay'; // Create if needed

export default function DebtPayoffPlannerPage() {
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
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Debt Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <DebtWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Debt Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <DebtUnifiedCard onExpandClick={openDebtWorkspace} onChatInputClick={openDebtWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
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
