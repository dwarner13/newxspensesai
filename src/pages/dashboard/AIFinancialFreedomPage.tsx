/**
 * AIFinancialFreedomPage Component
 * 
 * Complete workspace layout for Liberty (AI Financial Freedom)
 * 
 * Layout:
 * - Left column (33%): Liberty Workspace Panel
 * - Center column (42%): Liberty Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { LibertyWorkspacePanel } from '../../components/workspace/employees/LibertyWorkspacePanel';
import { LibertyUnifiedCard } from '../../components/workspace/employees/LibertyUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { LibertyWorkspaceOverlay } from '../../components/chat/LibertyWorkspaceOverlay'; // Create if needed

export default function AIFinancialFreedomPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<LibertyWorkspacePanel />}
        center={
          <LibertyUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'liberty-financial-freedom',
                context: {
                  page: 'ai-financial-freedom',
                  data: {
                    source: 'ai-financial-freedom-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'liberty-financial-freedom',
                context: {
                  page: 'ai-financial-freedom',
                  data: {
                    source: 'ai-financial-freedom-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="ai-financial-freedom" />}
      />

      {/* Liberty Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when LibertyWorkspaceOverlay is created */}
      {/* <LibertyWorkspaceOverlay 
        open={isLibertyWorkspaceOpen} 
        onClose={closeLibertyWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeLibertyWorkspace}
      /> */}
    </>
  );
}
