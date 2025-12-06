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

import React, { useState } from 'react';
import { AnalyticsWorkspacePanel } from '../../components/workspace/employees/AnalyticsWorkspacePanel';
import { AnalyticsUnifiedCard } from '../../components/workspace/employees/AnalyticsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { AnalyticsWorkspaceOverlay } from '../../components/chat/AnalyticsWorkspaceOverlay'; // Create if needed

export function AnalyticsAIPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isAnalyticsWorkspaceOpen, setIsAnalyticsWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openAnalyticsWorkspace = () => {
    setIsAnalyticsWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeAnalyticsWorkspace = () => {
    setIsAnalyticsWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeAnalyticsWorkspace = () => {
    setIsAnalyticsWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <AnalyticsWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <AnalyticsUnifiedCard onExpandClick={openAnalyticsWorkspace} onChatInputClick={openAnalyticsWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="analytics" />
            }
          />
        </section>
      </DashboardSection>

      {/* Analytics Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when AnalyticsWorkspaceOverlay is created */}
      {/* <AnalyticsWorkspaceOverlay 
        open={isAnalyticsWorkspaceOpen} 
        onClose={closeAnalyticsWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeAnalyticsWorkspace}
      /> */}
    </>
  );
}

