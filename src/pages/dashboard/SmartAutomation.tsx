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
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { AutomationWorkspaceOverlay } from '../../components/chat/AutomationWorkspaceOverlay'; // Create if needed

export default function SmartAutomationPage() {
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
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Automation Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <AutomationWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Automation Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <AutomationUnifiedCard onExpandClick={openAutomationWorkspace} onChatInputClick={openAutomationWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
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
