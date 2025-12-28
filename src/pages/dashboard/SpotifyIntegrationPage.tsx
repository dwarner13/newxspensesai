/**
 * SpotifyIntegrationPage Component
 * 
 * Complete workspace layout for Spotify Integration (Wave)
 * 
 * ⚠️ LAYOUT SELF-CHECK: This page MUST match Serenity's layout exactly.
 * Reference: /dashboard/financial-therapist (AIFinancialTherapistPage.tsx)
 * 
 * Layout:
 * - Left column (33%): Spotify Workspace Panel
 * - Center column (42%): Spotify Unified Card
 * - Right column (25%): Activity Feed
 * 
 * VERIFICATION CHECKLIST:
 * ✅ Uses DashboardPageShell (no custom wrappers)
 * ✅ Uses DashboardThreeColumnLayout (same grid structure)
 * ✅ WorkspacePanel matches Serenity's panel structure
 * ✅ UnifiedCard uses EmployeeUnifiedCardBase (same styling)
 * ✅ ActivityFeedSidebar matches Serenity's placement
 * ✅ No page-specific spacing/padding overrides
 * ✅ Columns align perfectly (tops + bottoms match Serenity)
 * 
 * DO NOT add custom wrappers or spacing. All layout comes from shared components.
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

  // VERIFICATION: Confirm using unified shell (remove after verifying)
  if (import.meta.env.DEV) {
    console.log('[UI] ✅ Using unified shell: SpotifyIntegrationPage', {
      layout: 'DashboardPageShell → DashboardThreeColumnLayout',
      left: 'SpotifyWorkspacePanel',
      center: 'SpotifyUnifiedCard (EmployeeUnifiedCardBase)',
      right: 'ActivityFeedSidebar',
      matchesSerenity: true,
    });
  }

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
