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
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function PersonalPodcastPage() {
  // Scroll to top when page loads
  useScrollToTop();
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
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <PodcastWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <PodcastUnifiedCard onExpandClick={openPodcastWorkspace} onChatInputClick={openPodcastWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="personal-podcast" />
            }
          />
        </section>
      </DashboardSection>
    </>
  );
}
