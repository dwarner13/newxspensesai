/**
 * BillRemindersPage Component
 * 
 * Complete workspace layout for Bill Reminders
 * 
 * Layout:
 * - Left column (33%): Bills Workspace Panel
 * - Center column (42%): Bills Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { BillsWorkspacePanel } from '../../components/workspace/planning/BillsWorkspacePanel';
import { BillsUnifiedCard } from '../../components/workspace/planning/BillsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { BillsWorkspaceOverlay } from '../../components/chat/BillsWorkspaceOverlay'; // Create if needed

export default function BillRemindersPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<BillsWorkspacePanel />}
        center={
          <BillsUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'bill-reminders',
                context: {
                  page: 'bill-reminders',
                  data: {
                    source: 'bill-reminders-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'bill-reminders',
                context: {
                  page: 'bill-reminders',
                  data: {
                    source: 'bill-reminders-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="bill-reminders" />}
      />

      {/* Bills Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when BillsWorkspaceOverlay is created */}
      {/* <BillsWorkspaceOverlay 
        open={isBillsWorkspaceOpen} 
        onClose={closeBillsWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeBillsWorkspace}
      /> */}
    </>
  );
}
