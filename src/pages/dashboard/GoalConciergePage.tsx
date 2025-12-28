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

import React, { useEffect } from 'react';
import { GoalieWorkspacePanel } from '../../components/workspace/employees/GoalieWorkspacePanel';
import { GoalieUnifiedCard } from '../../components/workspace/employees/GoalieUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { GoalieWorkspaceOverlay } from '../../components/chat/GoalieWorkspaceOverlay'; // Create if needed

export default function GoalConciergePage() {
  // Scroll to top when page loads
  useScrollToTop();
  useEffect(() => {
    console.log("[route-mount]", "/dashboard/goal-concierge", "GoalConciergePage");
  }, []);
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<GoalieWorkspacePanel />}
        center={
          <GoalieUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'goalie-goals',
                context: {
                  page: 'goal-concierge',
                  data: {
                    source: 'goal-concierge-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'goalie-goals',
                context: {
                  page: 'goal-concierge',
                  data: {
                    source: 'goal-concierge-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="goal-concierge" />}
      />

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
