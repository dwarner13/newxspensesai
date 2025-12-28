/**
 * SettingsPage Component
 * 
 * Complete workspace layout for Settings
 * 
 * Layout:
 * - Left column (33%): Settings Workspace Panel
 * - Center column (42%): Settings Unified Card
 * - Right column (25%): Activity Feed
 */

import React from 'react';
import { SettingsWorkspacePanel } from '../../components/settings/SettingsWorkspacePanel';
import { SettingsUnifiedCard } from '../../components/settings/SettingsUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
// import { SettingsWorkspaceOverlay } from '../../components/chat/SettingsWorkspaceOverlay'; // Create if needed

export default function SettingsPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const { openChat } = useUnifiedChatLauncher();

  return (
    <>
      <DashboardPageShell
        left={<SettingsWorkspacePanel />}
        center={
          <SettingsUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'settings',
                context: {
                  page: 'settings',
                  data: {
                    source: 'settings-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'settings',
                context: {
                  page: 'settings',
                  data: {
                    source: 'settings-page',
                  },
                },
              });
            }}
          />
        }
        right={<ActivityFeedSidebar scope="settings" />}
      />

      {/* Settings Workspace Overlay */}
      {/* Uncomment when SettingsWorkspaceOverlay is created */}
      {/* <SettingsWorkspaceOverlay 
        open={isWorkspaceOpen} 
        onClose={closeWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeWorkspace}
      /> */}
    </>
  );
}

