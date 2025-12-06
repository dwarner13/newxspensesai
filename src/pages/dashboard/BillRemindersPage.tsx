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
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { BillsWorkspaceOverlay } from '../../components/chat/BillsWorkspaceOverlay'; // Create if needed

export default function BillRemindersPage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <BillsWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <BillsUnifiedCard onExpandClick={openBillsWorkspace} onChatInputClick={openBillsWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="bill-reminders" />
            }
          />
        </section>
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
