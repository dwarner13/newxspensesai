/**
 * WellnessStudioPage Component
 * 
 * Complete workspace layout for Wellness Studio
 * 
 * Layout:
 * - Left column (33%): Wellness Workspace Panel
 * - Center column (42%): Wellness Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { WellnessWorkspacePanel } from '../../components/workspace/entertainment/WellnessWorkspacePanel';
import { WellnessUnifiedCard } from '../../components/workspace/entertainment/WellnessUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function WellnessStudioPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isWellnessWorkspaceOpen, setIsWellnessWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openWellnessWorkspace = () => {
    setIsWellnessWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeWellnessWorkspace = () => {
    setIsWellnessWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeWellnessWorkspace = () => {
    setIsWellnessWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <WellnessWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <WellnessUnifiedCard onExpandClick={openWellnessWorkspace} onChatInputClick={openWellnessWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="wellness-studio" />
            }
          />
        </section>
      </DashboardSection>
    </>
  );
}
