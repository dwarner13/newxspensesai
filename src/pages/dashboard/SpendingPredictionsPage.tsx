/**
 * SpendingPredictionsPage Component
 * 
 * Complete workspace layout for Crystal (Spending Predictions AI)
 * 
 * Layout:
 * - Left column (33%): Crystal Workspace Panel
 * - Center column (42%): Crystal Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { CrystalWorkspacePanel } from '../../components/workspace/employees/CrystalWorkspacePanel';
import { CrystalUnifiedCard } from '../../components/workspace/employees/CrystalUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { CrystalWorkspaceOverlay } from '../../components/chat/CrystalWorkspaceOverlay'; // Create if needed

export default function SpendingPredictionsPage() {
  const [isCrystalWorkspaceOpen, setIsCrystalWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openCrystalWorkspace = () => {
    setIsCrystalWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeCrystalWorkspace = () => {
    setIsCrystalWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeCrystalWorkspace = () => {
    setIsCrystalWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Crystal Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <CrystalWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Crystal Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <CrystalUnifiedCard onExpandClick={openCrystalWorkspace} onChatInputClick={openCrystalWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Crystal Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when CrystalWorkspaceOverlay is created */}
      {/* <CrystalWorkspaceOverlay 
        open={isCrystalWorkspaceOpen} 
        onClose={closeCrystalWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeCrystalWorkspace}
      /> */}
    </>
  );
}
