/**
 * AIChatAssistantPage Component
 * 
 * Complete workspace layout for Finley (AI Financial Assistant)
 * 
 * Layout:
 * - Left column (33%): Finley Workspace Panel
 * - Center column (42%): Finley Unified Card
 * - Right column (25%): Activity Feed
 */

import React, { useEffect } from 'react';
import { FinleyWorkspacePanel } from '../../components/workspace/employees/FinleyWorkspacePanel';
import { FinleyUnifiedCard } from '../../components/workspace/employees/FinleyUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

export function AIChatAssistantPage() {
  // Scroll to top when page loads
  useScrollToTop();
  useEffect(() => {
    console.log("[route-mount]", "/dashboard/ai-chat-assistant", "AIChatAssistantPage");
  }, []);
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<FinleyWorkspacePanel />}
        center={
          <FinleyUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'finley-forecasts',
                context: {
                  page: 'ai-chat-assistant',
                  data: {
                    source: 'ai-chat-assistant-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'finley-forecasts',
                context: {
                  page: 'ai-chat-assistant',
                  data: {
                    source: 'ai-chat-assistant-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="ai-chat-assistant" />}
      />
    </>
  );
}

