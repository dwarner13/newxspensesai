/**
 * AIFinancialTherapistPage Component
 * 
 * Complete workspace layout for AI Financial Therapist
 * 
 * Layout:
 * - Left column (33%): Therapist Workspace Panel
 * - Center column (42%): Therapist Unified Card
 * - Right column (25%): Activity Feed
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

