/**
 * SpotifyIntegrationPage Component
 * 
 * Complete workspace layout for Spotify Integration
 * 
 * Layout:
 * - Left column (33%): Spotify Workspace Panel
 * - Center column (42%): Spotify Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { SpotifyWorkspacePanel } from '../../components/workspace/entertainment/SpotifyWorkspacePanel';
import { SpotifyUnifiedCard } from '../../components/workspace/entertainment/SpotifyUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function SpotifyIntegrationPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<SpotifyWorkspacePanel />}
        center={
          <SpotifyUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'spotify-integration',
                context: {
                  page: 'spotify-integration',
                  data: {
                    source: 'spotify-integration-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'spotify-integration',
                context: {
                  page: 'spotify-integration',
                  data: {
                    source: 'spotify-integration-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="spotify-integration" />}
      />
    </>
  );
}
