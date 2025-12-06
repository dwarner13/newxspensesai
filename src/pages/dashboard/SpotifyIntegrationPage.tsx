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

import React, { useState } from 'react';
import { SpotifyWorkspacePanel } from '../../components/workspace/entertainment/SpotifyWorkspacePanel';
import { SpotifyUnifiedCard } from '../../components/workspace/entertainment/SpotifyUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function SpotifyIntegrationPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isSpotifyWorkspaceOpen, setIsSpotifyWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openSpotifyWorkspace = () => {
    setIsSpotifyWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeSpotifyWorkspace = () => {
    setIsSpotifyWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeSpotifyWorkspace = () => {
    setIsSpotifyWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <div className="grid grid-cols-12 gap-0 items-stretch overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Spotify Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col overflow-hidden">
            <SpotifyWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-8 = 67%): Spotify Unified Card - Activity Feed handled by DashboardLayout */}
          <section className="col-span-12 lg:col-span-8 flex flex-col overflow-hidden">
            <SpotifyUnifiedCard onExpandClick={openSpotifyWorkspace} onChatInputClick={openSpotifyWorkspace} />
          </section>
        </div>
      </DashboardSection>
    </>
  );
}
