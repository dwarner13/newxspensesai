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

import React, { useState } from 'react';
import { AnalyticsWorkspacePanel } from '../../components/analytics/AnalyticsWorkspacePanel';
import { AnalyticsUnifiedCard } from '../../components/analytics/AnalyticsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { AnalyticsWorkspaceOverlay } from '../../components/chat/AnalyticsWorkspaceOverlay'; // Create if needed

export function AnalyticsPage() {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openWorkspace = () => {
    setIsWorkspaceOpen(true);
    setIsMinimized(false);
  };

  const closeWorkspace = () => {
    setIsWorkspaceOpen(false);
    setIsMinimized(false);
  };

  const minimizeWorkspace = () => {
    setIsWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Analytics Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <AnalyticsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Analytics Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <AnalyticsUnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed - ONLY ONE */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

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
