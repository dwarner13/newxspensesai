/**
 * WellnessStudioPage Component
 * 
 * Complete workspace layout for Wellness Studio
 * 
 * Layout:
 * - Left column (33%): Wellness Workspace Panel
 * - Center column (42%): Wellness Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { WellnessWorkspacePanel } from '../../components/workspace/entertainment/WellnessWorkspacePanel';
import { WellnessUnifiedCard } from '../../components/workspace/entertainment/WellnessUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';

export default function WellnessStudioPage() {
  const [isWellnessWorkspaceOpen, setIsWellnessWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openWellnessWorkspace = () => {
    setIsWellnessWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeWellnessWorkspace = () => {
    setIsWellnessWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeWellnessWorkspace = () => {
    setIsWellnessWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Wellness Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <WellnessWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Wellness Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <WellnessUnifiedCard onExpandClick={openWellnessWorkspace} onChatInputClick={openWellnessWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>
    </>
  );
}
