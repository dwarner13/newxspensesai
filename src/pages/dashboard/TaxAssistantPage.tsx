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
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { TaxWorkspaceOverlay } from '../../components/chat/TaxWorkspaceOverlay'; // Create if needed

export function TaxAssistantPage() {
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
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Tax Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <TaxWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Tax Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <TaxUnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed - ONLY ONE */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
            <ActivityPanel />
          </aside>
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

