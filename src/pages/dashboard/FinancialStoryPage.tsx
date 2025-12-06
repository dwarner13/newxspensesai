/**
 * FinancialStoryPage Component
 * 
 * Complete workspace layout for Financial Story
 * 
 * Layout:
 * - Left column (33%): Story Workspace Panel
 * - Center column (42%): Story Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useState } from 'react';
import { StoryWorkspacePanel } from '../../components/workspace/entertainment/StoryWorkspacePanel';
import { StoryUnifiedCard } from '../../components/workspace/entertainment/StoryUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export default function FinancialStoryPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isStoryWorkspaceOpen, setIsStoryWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const openStoryWorkspace = () => {
    setIsStoryWorkspaceOpen(true);
    setIsMinimized(false);
  };
  const closeStoryWorkspace = () => {
    setIsStoryWorkspaceOpen(false);
    setIsMinimized(false);
  };
  const minimizeStoryWorkspace = () => {
    setIsStoryWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <StoryWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <StoryUnifiedCard onExpandClick={openStoryWorkspace} onChatInputClick={openStoryWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="financial-story" />
            }
          />
        </section>
      </DashboardSection>
    </>
  );
}
