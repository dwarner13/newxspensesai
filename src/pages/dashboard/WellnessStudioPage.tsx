/**
 * WellnessStudioPage Component
 * 
 * Complete workspace layout for Wellness Studio (Harmony)
 * 
 * ⚠️ LAYOUT SELF-CHECK: This page MUST match Serenity's layout exactly.
 * Reference: /dashboard/financial-therapist (AIFinancialTherapistPage.tsx)
 * 
 * Layout:
 * - Left column (33%): Wellness Workspace Panel
 * - Center column (42%): Wellness Unified Card
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
import { WellnessWorkspacePanel } from '../../components/workspace/entertainment/WellnessWorkspacePanel';
import { WellnessUnifiedCard } from '../../components/workspace/entertainment/WellnessUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function WellnessStudioPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<WellnessWorkspacePanel />}
        center={
          <WellnessUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'wellness-studio',
                context: {
                  page: 'wellness-studio',
                  data: {
                    source: 'wellness-studio-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'wellness-studio',
                context: {
                  page: 'wellness-studio',
                  data: {
                    source: 'wellness-studio-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="wellness-studio" />}
      />
    </>
  );
}
