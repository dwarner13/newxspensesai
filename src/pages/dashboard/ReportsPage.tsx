/**
 * ReportsPage Component
 * 
 * Complete workspace layout for Reports
 * 
 * Layout:
 * - Left column (33%): Reports Workspace Panel
 * - Center column (42%): Reports Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { ReportsWorkspacePanel } from '../../components/reports/ReportsWorkspacePanel';
import { ReportsUnifiedCard } from '../../components/reports/ReportsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { ReportsWorkspaceOverlay } from '../../components/chat/ReportsWorkspaceOverlay'; // Create if needed

export default function ReportsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<ReportsWorkspacePanel />}
        center={
          <ReportsUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'reports',
                context: {
                  page: 'reports',
                  data: {
                    source: 'reports-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'reports',
                context: {
                  page: 'reports',
                  data: {
                    source: 'reports-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="reports" />}
      />

      {/* Reports Workspace Overlay */}
      {/* Uncomment when ReportsWorkspaceOverlay is created */}
      {/* <ReportsWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}
