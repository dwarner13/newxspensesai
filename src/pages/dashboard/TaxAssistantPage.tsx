/**
 * TaxAssistantPage Component
 * 
 * Complete workspace layout for Tax Assistant
 * 
 * Layout:
 * - Left column (33%): Tax Workspace Panel
 * - Center column (42%): Tax Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { TaxWorkspacePanel } from '../../components/tax/TaxWorkspacePanel';
import { TaxUnifiedCard } from '../../components/tax/TaxUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { useScrollToTop } from '../../hooks/useScrollToTop';
// import { TaxWorkspaceOverlay } from '../../components/chat/TaxWorkspaceOverlay'; // Create if needed

export function TaxAssistantPage() {
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
          {/* LEFT COLUMN (col-span-4 = 33%): Tax Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <TaxWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-8 = 67%): Tax Unified Card - Activity Feed handled by DashboardLayout */}
          <section className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <TaxUnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>
        </div>
      </DashboardSection>

      {/* Tax Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when TaxWorkspaceOverlay is created */}
      {/* <TaxWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}

