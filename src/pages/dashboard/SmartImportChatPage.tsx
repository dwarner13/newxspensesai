/**
 * SmartImportChatPage Component
 * 
 * Complete workspace layout for Byte (Smart Import AI)
 * 
 * Layout:
 * - Left column (33%): Byte Workspace Panel with 6 status cards
 * - Center column (42%): Byte Unified Card (single card with header, messages, input)
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { ByteWorkspacePanel } from '../../components/smart-import/ByteWorkspacePanel';
import { ByteUnifiedCard } from '../../components/smart-import/ByteUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
import { ByteWorkspaceOverlay } from '../../components/chat/ByteWorkspaceOverlay';

export function SmartImportChatPage() {
  const [isByteWorkspaceOpen, setIsByteWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openByteWorkspace = () => {
    setIsByteWorkspaceOpen(true);
    setIsMinimized(false); // Restore from minimized state
  };
  const closeByteWorkspace = () => {
    setIsByteWorkspaceOpen(false);
    setIsMinimized(false); // Clear minimized state when closing
  };
  const minimizeByteWorkspace = () => {
    setIsByteWorkspaceOpen(false);
    setIsMinimized(true); // Hide overlay but preserve chat state
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Byte Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <ByteWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Byte Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <ByteUnifiedCard onExpandClick={openByteWorkspace} onChatInputClick={openByteWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Byte Workspace Overlay - Floating centered chatbot */}
      <ByteWorkspaceOverlay 
        open={isByteWorkspaceOpen} 
        onClose={closeByteWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeByteWorkspace}
      />
    </>
  );
}
