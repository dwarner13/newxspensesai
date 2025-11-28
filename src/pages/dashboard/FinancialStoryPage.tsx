/**
 * FinancialStoryPage Component
 * 
 * Complete workspace layout for Financial Story
 * 
 * Layout:
 * - Left column (33%): Story Workspace Panel
 * - Center column (42%): Story Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { StoryWorkspacePanel } from '../../components/workspace/entertainment/StoryWorkspacePanel';
import { StoryUnifiedCard } from '../../components/workspace/entertainment/StoryUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';

export default function FinancialStoryPage() {
  const [isStoryWorkspaceOpen, setIsStoryWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openStoryWorkspace = () => {
    setIsStoryWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeStoryWorkspace = () => {
    setIsStoryWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeStoryWorkspace = () => {
    setIsStoryWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Story Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <StoryWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Story Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <StoryUnifiedCard onExpandClick={openStoryWorkspace} onChatInputClick={openStoryWorkspace} />
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
