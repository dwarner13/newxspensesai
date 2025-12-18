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
