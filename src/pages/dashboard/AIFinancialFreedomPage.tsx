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
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { LibertyWorkspaceOverlay } from '../../components/chat/LibertyWorkspaceOverlay'; // Create if needed

export default function AIFinancialFreedomPage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <LibertyWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <LibertyUnifiedCard onExpandClick={openLibertyWorkspace} onChatInputClick={openLibertyWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="ai-financial-freedom" />
            }
          />
        </section>
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
