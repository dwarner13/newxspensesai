/**
 * AIFinancialFreedomPage Component
 * 
 * Complete workspace layout for Liberty (AI Financial Freedom)
 * 
 * Layout:
 * - Left column (33%): Liberty Workspace Panel
 * - Center column (42%): Liberty Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { LibertyWorkspacePanel } from '../../components/workspace/employees/LibertyWorkspacePanel';
import { LibertyUnifiedCard } from '../../components/workspace/employees/LibertyUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { LibertyWorkspaceOverlay } from '../../components/chat/LibertyWorkspaceOverlay'; // Create if needed

export default function AIFinancialFreedomPage() {
  const [isLibertyWorkspaceOpen, setIsLibertyWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openLibertyWorkspace = () => {
    setIsLibertyWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeLibertyWorkspace = () => {
    setIsLibertyWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeLibertyWorkspace = () => {
    setIsLibertyWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Liberty Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <LibertyWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Liberty Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <LibertyUnifiedCard onExpandClick={openLibertyWorkspace} onChatInputClick={openLibertyWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Liberty Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when LibertyWorkspaceOverlay is created */}
      {/* <LibertyWorkspaceOverlay 
        open={isLibertyWorkspaceOpen} 
        onClose={closeLibertyWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeLibertyWorkspace}
      /> */}
    </>
  );
}
