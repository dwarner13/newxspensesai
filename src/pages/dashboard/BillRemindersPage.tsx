/**
 * BillRemindersPage Component
 * 
 * Complete workspace layout for Bill Reminders
 * 
 * Layout:
 * - Left column (33%): Bills Workspace Panel
 * - Center column (42%): Bills Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { BillsWorkspacePanel } from '../../components/workspace/planning/BillsWorkspacePanel';
import { BillsUnifiedCard } from '../../components/workspace/planning/BillsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { BillsWorkspaceOverlay } from '../../components/chat/BillsWorkspaceOverlay'; // Create if needed

export default function BillRemindersPage() {
  const [isBillsWorkspaceOpen, setIsBillsWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openBillsWorkspace = () => {
    setIsBillsWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeBillsWorkspace = () => {
    setIsBillsWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeBillsWorkspace = () => {
    setIsBillsWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Bills Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <BillsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Bills Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <BillsUnifiedCard onExpandClick={openBillsWorkspace} onChatInputClick={openBillsWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Bills Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when BillsWorkspaceOverlay is created */}
      {/* <BillsWorkspaceOverlay 
        open={isBillsWorkspaceOpen} 
        onClose={closeBillsWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeBillsWorkspace}
      /> */}
    </>
  );
}
