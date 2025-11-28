/**
 * PrimeChatPage Component
 * 
 * Complete workspace layout for Prime (AI Command Center)
 * 
 * Layout:
 * - Left column (33%): Prime Workspace Panel
 * - Center column (42%): Prime Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { PrimeWorkspacePanel } from '../../components/workspace/employees/PrimeWorkspacePanel';
import { PrimeUnifiedCard } from '../../components/workspace/employees/PrimeUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
import { PrimeWorkspace } from '../../components/workspace/employees/PrimeWorkspace';

export function PrimeChatPage() {
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
          
          {/* LEFT COLUMN (col-span-4 = 33%): Prime Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <PrimeWorkspacePanel />
          </section>
          
          {/* CENTER COLUMN (col-span-5 = 42%): Prime Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <PrimeUnifiedCard 
              onExpandClick={openWorkspace} 
              onChatInputClick={openWorkspace} 
            />
          </section>
          
          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed - ONLY ONE */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
          
        </div>
      </DashboardSection>

      {/* Prime Workspace Overlay - Floating centered chatbot */}
      <PrimeWorkspace 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      />
    </>
  );
}
