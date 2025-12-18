/**
 * AnalyticsPage Component
 * 
 * Complete workspace layout for Analytics
 * 
 * Layout:
 * - Left column (33%): Analytics Workspace Panel
 * - Center column (42%): Analytics Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { AnalyticsWorkspacePanel } from '../../components/analytics/AnalyticsWorkspacePanel';
import { AnalyticsUnifiedCard } from '../../components/analytics/AnalyticsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { AnalyticsWorkspaceOverlay } from '../../components/chat/AnalyticsWorkspaceOverlay'; // Create if needed

export default function AnalyticsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<AnalyticsWorkspacePanel />}
        center={
          <AnalyticsUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'analytics',
                context: {
                  page: 'analytics',
                  data: {
                    source: 'analytics-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'analytics',
                context: {
                  page: 'analytics',
                  data: {
                    source: 'analytics-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="analytics" />}
      />

      {/* Analytics Workspace Overlay */}
      {/* Uncomment when AnalyticsWorkspaceOverlay is created */}
      {/* <AnalyticsWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}
