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

import React from 'react';
import { PodcastWorkspacePanel } from '../../components/workspace/entertainment/PodcastWorkspacePanel';
import { PodcastUnifiedCard } from '../../components/workspace/entertainment/PodcastUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function PersonalPodcastPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<PodcastWorkspacePanel />}
        center={
          <PodcastUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'personal-podcast',
                context: {
                  page: 'personal-podcast',
                  data: {
                    source: 'personal-podcast-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'personal-podcast',
                context: {
                  page: 'personal-podcast',
                  data: {
                    source: 'personal-podcast-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="personal-podcast" />}
      />
    </>
  );
}
