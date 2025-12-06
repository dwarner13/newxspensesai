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
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { CrystalWorkspaceOverlay } from '../../components/chat/CrystalWorkspaceOverlay'; // Create if needed

export default function SpendingPredictionsPage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <CrystalWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <CrystalUnifiedCard onExpandClick={openCrystalWorkspace} onChatInputClick={openCrystalWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="spending-predictions" />
            }
          />
        </section>
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
