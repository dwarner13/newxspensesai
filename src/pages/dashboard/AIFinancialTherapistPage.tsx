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

import React, { useState } from 'react';
import { TherapistWorkspacePanel } from '../../components/workspace/entertainment/TherapistWorkspacePanel';
import { TherapistUnifiedCard } from '../../components/workspace/entertainment/TherapistUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function AIFinancialTherapistPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isTherapistWorkspaceOpen, setIsTherapistWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openTherapistWorkspace = () => {
    setIsTherapistWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeTherapistWorkspace = () => {
    setIsTherapistWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeTherapistWorkspace = () => {
    setIsTherapistWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <TherapistWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <TherapistUnifiedCard onExpandClick={openTherapistWorkspace} onChatInputClick={openTherapistWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="financial-therapist" />
            }
          />
        </section>
      </DashboardSection>
    </>
  );
}

