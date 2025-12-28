/**
 * BusinessIntelligencePage Component
 * 
 * Complete workspace layout for Business Intelligence
 * 
 * Layout:
 * - Left column (33%): Dash Workspace Panel
 * - Center column (42%): Dash Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { DashWorkspacePanel } from '../../components/business/DashWorkspacePanel';
import { DashUnifiedCard } from '../../components/business/DashUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function BusinessIntelligencePage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<DashWorkspacePanel />}
        center={
          <DashUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'dash-analytics',
                context: {
                  page: 'business-intelligence',
                  data: {
                    source: 'business-intelligence-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'dash-analytics',
                context: {
                  page: 'business-intelligence',
                  data: {
                    source: 'business-intelligence-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="business-intelligence" />}
      />
    </>
  );
}

