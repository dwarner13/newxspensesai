/**
 * GoalConciergePage Component
 * 
 * Complete workspace layout for Goalie (AI Goal Concierge)
 * 
 * Layout:
 * - Left column (33%): Goalie Workspace Panel
 * - Center column (42%): Goalie Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { GoalieWorkspacePanel } from '../../components/workspace/employees/GoalieWorkspacePanel';
import { GoalieUnifiedCard } from '../../components/workspace/employees/GoalieUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { GoalieWorkspaceOverlay } from '../../components/chat/GoalieWorkspaceOverlay'; // Create if needed

export default function GoalConciergePage() {
  const [isGoalieWorkspaceOpen, setIsGoalieWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openGoalieWorkspace = () => {
    setIsGoalieWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeGoalieWorkspace = () => {
    setIsGoalieWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeGoalieWorkspace = () => {
    setIsGoalieWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Goalie Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <GoalieWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Goalie Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <GoalieUnifiedCard onExpandClick={openGoalieWorkspace} onChatInputClick={openGoalieWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Goalie Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when GoalieWorkspaceOverlay is created */}
      {/* <GoalieWorkspaceOverlay 
        open={isGoalieWorkspaceOpen} 
        onClose={closeGoalieWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeGoalieWorkspace}
      /> */}
    </>
  );
}
