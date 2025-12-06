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

import React, { useState } from 'react';
import { AnalyticsWorkspacePanel } from '../../components/workspace/employees/AnalyticsWorkspacePanel';
import { AnalyticsUnifiedCard } from '../../components/workspace/employees/AnalyticsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
// import { AnalyticsWorkspaceOverlay } from '../../components/chat/AnalyticsWorkspaceOverlay'; // Create if needed

export default function AnalyticsAI() {
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
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 2-column grid: col-span-4 (33%), col-span-8 (67%) - Activity Feed handled by DashboardLayout */}
        <div className="grid grid-cols-12 gap-0 items-stretch overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Analytics Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <AnalyticsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-8 = 67%): Analytics Unified Card */}
          <section className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <AnalyticsUnifiedCard onExpandClick={openAnalyticsWorkspace} onChatInputClick={openAnalyticsWorkspace} />
          </section>
        </div>
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
