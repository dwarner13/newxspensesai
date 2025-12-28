/**
 * TaxAssistantPage Component
 * 
 * Complete workspace layout for Tax Assistant
 * 
 * Layout:
 * - Left column (33%): Tax Workspace Panel
 * - Center column (42%): Tax Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { TaxWorkspacePanel } from '../../components/tax/TaxWorkspacePanel';
import { TaxUnifiedCard } from '../../components/tax/TaxUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { TaxWorkspaceOverlay } from '../../components/chat/TaxWorkspaceOverlay'; // Create if needed

export default function TaxAssistantPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<TaxWorkspacePanel />}
        center={
          <TaxUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'tax-assistant',
                context: {
                  page: 'tax-assistant',
                  data: {
                    source: 'tax-assistant-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'tax-assistant',
                context: {
                  page: 'tax-assistant',
                  data: {
                    source: 'tax-assistant-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="tax-assistant" />}
      />

      {/* Tax Workspace Overlay - Floating centered chatbot */}
      {/* Uncomment when TaxWorkspaceOverlay is created */}
      {/* <TaxWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}

