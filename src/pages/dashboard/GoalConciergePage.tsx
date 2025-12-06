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
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { GoalieWorkspaceOverlay } from '../../components/chat/GoalieWorkspaceOverlay'; // Create if needed

export default function GoalConciergePage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <GoalieWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <GoalieUnifiedCard onExpandClick={openGoalieWorkspace} onChatInputClick={openGoalieWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="goal-concierge" />
            }
          />
        </section>
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
