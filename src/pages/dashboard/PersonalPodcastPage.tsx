/**
 * PersonalPodcastPage Component
 * 
 * Complete workspace layout for Personal Podcast
 * 
 * Layout:
 * - Left column (33%): Podcast Workspace Panel
 * - Center column (42%): Podcast Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { PodcastWorkspacePanel } from '../../components/workspace/entertainment/PodcastWorkspacePanel';
import { PodcastUnifiedCard } from '../../components/workspace/entertainment/PodcastUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';

export default function PersonalPodcastPage() {
  const [isPodcastWorkspaceOpen, setIsPodcastWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openPodcastWorkspace = () => {
    setIsPodcastWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closePodcastWorkspace = () => {
    setIsPodcastWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizePodcastWorkspace = () => {
    setIsPodcastWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Podcast Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
            <PodcastWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Podcast Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
            <PodcastUnifiedCard onExpandClick={openPodcastWorkspace} onChatInputClick={openPodcastWorkspace} />
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
