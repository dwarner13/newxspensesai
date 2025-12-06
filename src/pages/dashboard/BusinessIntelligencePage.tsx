/**
 * BusinessIntelligencePage Component
 * 
 * Complete workspace layout for Business Intelligence
 * 
 * Layout:
 * - Left column (33%): Dash Workspace Panel
 * - Center column (42%): Dash Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { DashWorkspacePanel } from '../../components/business/DashWorkspacePanel';
import { DashUnifiedCard } from '../../components/business/DashUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { DashWorkspaceOverlay } from '../../components/chat/DashWorkspaceOverlay'; // Create if needed

export function BusinessIntelligencePage() {
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
          {/* LEFT COLUMN (col-span-4 = 33%): Dash Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <DashWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-8 = 67%): Dash Unified Card - Activity Feed handled by DashboardLayout */}
          <section className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <DashUnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>
        </div>
      </DashboardSection>

      {/* Dash Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when DashWorkspaceOverlay is created */}
      {/* <DashWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}

