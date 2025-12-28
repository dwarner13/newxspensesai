/**
 * AIFinancialTherapistPage Component
 * 
 * Complete workspace layout for AI Financial Therapist (Serenity)
 * 
 * ⚠️ LAYOUT CONTRACT: This page is the GOLD STANDARD for dashboard layout.
 * Spotify, Financial Story, and other entertainment pages MUST match this exact structure.
 * 
 * Layout:
 * - Left column (33%): Therapist Workspace Panel
 * - Center column (42%): Therapist Unified Card
 * - Right column (25%): Activity Feed
 * 
 * DO NOT:
 * - Add custom wrappers, padding, or spacing
 * - Change DashboardPageShell props or structure
 * - Modify column widths or grid behavior
 * - Add page-specific layout overrides
 * 
 * REFERENCE: This page uses DashboardPageShell → DashboardThreeColumnLayout
 * All styling comes from shared components (TherapistWorkspacePanel, EmployeeUnifiedCardBase)
 */

import React from 'react';
import { TherapistWorkspacePanel } from '../../components/workspace/entertainment/TherapistWorkspacePanel';
import { TherapistUnifiedCard } from '../../components/workspace/entertainment/TherapistUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export default function AIFinancialTherapistPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  // VERIFICATION: Reference implementation (gold standard)
  if (import.meta.env.DEV) {
    console.log('[UI] 🏆 Reference layout: AIFinancialTherapistPage (Serenity)', {
      layout: 'DashboardPageShell → DashboardThreeColumnLayout',
      left: 'TherapistWorkspacePanel',
      center: 'TherapistUnifiedCard (EmployeeUnifiedCardBase)',
      right: 'ActivityFeedSidebar',
      isGoldStandard: true,
    });
  }

  return (
    <>
      <DashboardPageShell
        left={<TherapistWorkspacePanel />}
        center={
          <TherapistUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'financial-therapist',
                context: {
                  page: 'financial-therapist',
                  data: {
                    source: 'financial-therapist-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'financial-therapist',
                context: {
                  page: 'financial-therapist',
                  data: {
                    source: 'financial-therapist-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="financial-therapist" />}
      />
    </>
  );
}

