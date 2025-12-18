/**
 * AnalyticsAIPage Component
 * 
 * Complete workspace layout for Analytics (AI Insights Engine)
 * 
 * Layout:
 * - Left column (33%): Analytics Workspace Panel
 * - Center column (42%): Analytics Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { AnalyticsWorkspacePanel } from '../../components/workspace/employees/AnalyticsWorkspacePanel';
import { AnalyticsUnifiedCard } from '../../components/workspace/employees/AnalyticsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { AnalyticsWorkspaceOverlay } from '../../components/chat/AnalyticsWorkspaceOverlay'; // Create if needed

export function AnalyticsAIPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<AnalyticsWorkspacePanel />}
        center={<AnalyticsUnifiedCard 
          onExpandClick={() => {
            openChat({
              initialEmployeeSlug: 'crystal-analytics',
              context: {
                page: 'analytics-ai',
                data: {
                  source: 'analytics-ai-page',
                },
              },
            });
          }}
          onChatInputClick={() => {
            openChat({
              initialEmployeeSlug: 'crystal-analytics',
              context: {
                page: 'analytics-ai',
                data: {
                  source: 'analytics-ai-page',
                },
              },
            });
          }}
        />}
        right={<ActivityFeedSidebar scope="analytics-ai" />}
      />
    </>
  );
}

