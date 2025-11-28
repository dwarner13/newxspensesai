/**
 * SettingsPage Component
 * 
 * Complete workspace layout for Settings
 * 
 * Layout:
 * - Left column (33%): Settings Workspace Panel
 * - Center column (42%): Settings Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { SettingsWorkspacePanel } from '../../components/settings/SettingsWorkspacePanel';
import { SettingsUnifiedCard } from '../../components/settings/SettingsUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
// import { SettingsWorkspaceOverlay } from '../../components/chat/SettingsWorkspaceOverlay'; // Create if needed

export function SettingsPage() {
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
          {/* LEFT COLUMN (col-span-4 = 33%): Settings Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <SettingsWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Settings Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <SettingsUnifiedCard 
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

      {/* Settings Workspace Overlay */}
      {/* Uncomment when SettingsWorkspaceOverlay is created */}
      {/* <SettingsWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}

