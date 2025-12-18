/**
 * SmartAutomationPage Component
 * 
 * Complete workspace layout for Smart Automation
 * 
 * Layout:
 * - Left column (33%): Automation Workspace Panel
 * - Center column (42%): Automation Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useEffect } from 'react';
import { AutomationWorkspacePanel } from '../../components/workspace/planning/AutomationWorkspacePanel';
import { AutomationUnifiedCard } from '../../components/workspace/planning/AutomationUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { AutomationWorkspaceOverlay } from '../../components/chat/AutomationWorkspaceOverlay'; // Create if needed

export default function SmartAutomationPage() {
  // Scroll to top when page loads
  useScrollToTop();
  useEffect(() => {
    console.log("[route-mount]", "/dashboard/smart-automation", "SmartAutomationPage");
  }, []);
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<AutomationWorkspacePanel />}
        center={
          <AutomationUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'smart-automation',
                context: {
                  page: 'smart-automation',
                  data: {
                    source: 'smart-automation-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'smart-automation',
                context: {
                  page: 'smart-automation',
                  data: {
                    source: 'smart-automation-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="smart-automation" />}
      />

      {/* Automation Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when AutomationWorkspaceOverlay is created */}
      {/* <AutomationWorkspaceOverlay 
        open={isAutomationWorkspaceOpen} 
        onClose={closeAutomationWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeAutomationWorkspace}
      /> */}
    </>
  );
}
