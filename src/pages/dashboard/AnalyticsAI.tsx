/**
 * AnalyticsAI Component
 * 
 * Complete workspace layout for Analytics (AI Insights Engine)
 * 
 * Layout:
 * - Left column (33%): Analytics Workspace Panel
 * - Center column (42%): Analytics Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useEffect } from 'react';
import { AnalyticsWorkspacePanel } from '../../components/workspace/employees/AnalyticsWorkspacePanel';
import { AnalyticsUnifiedCard } from '../../components/workspace/employees/AnalyticsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function AnalyticsAI() {
  // Debug: Log component mount
  useEffect(() => {
    console.log('[AnalyticsAI] Component mounted', window.location.pathname);
  }, []);

  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();
  
  // Unified chat is opened via AnalyticsUnifiedCard using useUnifiedChatLauncher
  // No local chat state needed - all chat goes through UnifiedAssistantChat

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<AnalyticsWorkspacePanel />}
        center={
          <AnalyticsUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'crystal-analytics',
                context: {
                  page: 'analytics-ai',
                  source: 'analytics-ai-page',
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'crystal-analytics',
                context: {
                  page: 'analytics-ai',
                  source: 'analytics-ai-page',
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="analytics-ai" />}
      />
    </>
  );
}
