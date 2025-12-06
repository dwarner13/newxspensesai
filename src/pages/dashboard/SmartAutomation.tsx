/**
 * SmartAutomationPage Component
 * 
 * Complete workspace layout for Smart Automation
 * 
 * Layout:
 * - Left column (33%): Automation Workspace Panel
 * - Center column (42%): Automation Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { AutomationWorkspacePanel } from '../../components/workspace/planning/AutomationWorkspacePanel';
import { AutomationUnifiedCard } from '../../components/workspace/planning/AutomationUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { AutomationWorkspaceOverlay } from '../../components/chat/AutomationWorkspaceOverlay'; // Create if needed

export default function SmartAutomationPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isAutomationWorkspaceOpen, setIsAutomationWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openAutomationWorkspace = () => {
    setIsAutomationWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeAutomationWorkspace = () => {
    setIsAutomationWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeAutomationWorkspace = () => {
    setIsAutomationWorkspaceOpen(false);
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
                <AutomationWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <AutomationUnifiedCard onExpandClick={openAutomationWorkspace} onChatInputClick={openAutomationWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="smart-automation" />
            }
          />
        </section>
      </DashboardSection>

      {/* Automation Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when AutomationWorkspaceOverlay is created */}
      {/* <AutomationWorkspaceOverlay 
        open={isAutomationWorkspaceOpen} 
        onClose={closeAutomationWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeAutomationWorkspace}
      /> */}
    </>
  );
}
