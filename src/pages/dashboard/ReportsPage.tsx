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
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { ReportsWorkspaceOverlay } from '../../components/chat/ReportsWorkspaceOverlay'; // Create if needed

export function ReportsPage() {
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
          {/* LEFT COLUMN (col-span-4 = 33%): Reports Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <ReportsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Reports Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <ReportsUnifiedCard 
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
