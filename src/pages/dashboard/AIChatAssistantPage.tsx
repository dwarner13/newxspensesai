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

import React, { useState } from 'react';
import { FinleyWorkspacePanel } from '../../components/workspace/employees/FinleyWorkspacePanel';
import { FinleyUnifiedCard } from '../../components/workspace/employees/FinleyUnifiedCard';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { FinleyWorkspace } from '../../components/workspace/employees/FinleyWorkspace';
import { useScrollToTop } from '../../hooks/useScrollToTop';

export function AIChatAssistantPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isFinleyWorkspaceOpen, setIsFinleyWorkspaceOpen] = useState(false);

  const openFinleyWorkspace = () => setIsFinleyWorkspaceOpen(true);
  const closeFinleyWorkspace = () => setIsFinleyWorkspaceOpen(false);

  return (
    <>
      <DashboardSection className="flex flex-col">
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <FinleyWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <FinleyUnifiedCard onExpandClick={openFinleyWorkspace} onChatInputClick={openFinleyWorkspace} />
              </div>
            }
            right={
              <ActivityFeedSidebar scope="ai-chat-assistant" />
            }
          />
        </section>
      </DashboardSection>

      {/* Finley Workspace Overlay - Floating centered chatbot */}
      <FinleyWorkspace 
        open={isFinleyWorkspaceOpen} 
        onClose={closeFinleyWorkspace} 
      />
    </>
  );
}

