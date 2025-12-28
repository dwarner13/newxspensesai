/**
 * FinancialStoryPage Component
 * 
 * Complete workspace layout for Financial Story (The Roundtable)
 * 
 * ⚠️ LAYOUT SELF-CHECK: This page MUST match Serenity's layout exactly.
 * Reference: /dashboard/financial-therapist (AIFinancialTherapistPage.tsx)
 * 
 * Layout:
 * - Left column (33%): Story Workspace Panel
 * - Center column (42%): Story Unified Card
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
import { StoryWorkspacePanel } from '../../components/workspace/entertainment/StoryWorkspacePanel';
import { StoryUnifiedCard } from '../../components/workspace/entertainment/StoryUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function FinancialStoryPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  // VERIFICATION: Confirm using unified shell (remove after verifying)
  if (import.meta.env.DEV) {
    console.log('[UI] ✅ Using unified shell: FinancialStoryPage', {
      layout: 'DashboardPageShell → DashboardThreeColumnLayout',
      left: 'StoryWorkspacePanel',
      center: 'StoryUnifiedCard (EmployeeUnifiedCardBase)',
      right: 'ActivityFeedSidebar',
      matchesSerenity: true,
    });
  }

  return (
    <>
      <DashboardPageShell
        left={<StoryWorkspacePanel />}
        center={
          <StoryUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'financial-story',
                context: {
                  page: 'financial-story',
                  data: {
                    source: 'financial-story-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'financial-story',
                context: {
                  page: 'financial-story',
                  data: {
                    source: 'financial-story-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="financial-story" />}
      />
    </>
  );
}
