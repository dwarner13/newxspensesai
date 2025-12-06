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

import React, { useState } from 'react';
import { ReportsWorkspacePanel } from '../../components/reports/ReportsWorkspacePanel';
import { ReportsUnifiedCard } from '../../components/reports/ReportsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { ReportsWorkspaceOverlay } from '../../components/chat/ReportsWorkspaceOverlay'; // Create if needed

export default function ReportsPage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <div className="grid grid-cols-12 gap-0 items-stretch overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Reports Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <ReportsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-8 = 67%): Reports Unified Card - Activity Feed handled by DashboardLayout */}
          <section className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <ReportsUnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>
        </div>
      </DashboardSection>

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
