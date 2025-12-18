/**
 * SmartImportChatPage Component
 * 
 * Complete workspace layout for Byte (Smart Import AI)
 * 
 * Layout:
 * - Left column (33%): Byte Workspace Panel with 6 status cards
 * - Center column (42%): Byte Unified Card (single card with header, messages, input)
 * - Right column (25%): Activity Feed
 * 
 * ⚠️ CHAT ARCHITECTURE SAFEGUARD:
 * - This page MUST NOT render any legacy/inline chat components
 * - All chat for Byte should go through UnifiedAssistantChat via useUnifiedChatLauncher()
 * - ByteUnifiedCard only triggers chat opening - it does NOT render inline chat
 * - The unified slide-out chat is rendered globally by DashboardLayout
 */

import React, { useState, useEffect } from 'react';
import { ByteWorkspacePanel } from '../../components/smart-import/ByteWorkspacePanel';
import { ByteUnifiedCard } from '../../components/smart-import/ByteUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useByteQueueStats } from '../../hooks/useByteQueueStats';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { MessageSquare } from 'lucide-react';

export function SmartImportChatPage() {
  // Scroll to top when page loads
  useScrollToTop();
  useEffect(() => {
    console.log("[route-mount]", "/dashboard/smart-import-ai", "SmartImportChatPage");
  }, []);
  const { openChat } = useUnifiedChatLauncher();
  
  // UI-only helper state for Byte console status display
  const [processingLabel, setProcessingLabel] = useState<string | undefined>();
  const [lastImportSummary, setLastImportSummary] = useState<string | undefined>();
  
  // Single shared Smart Import hook instance for this page
  const smartImport = useSmartImport();
  
  // Destructure what we need from the shared hook instance
  const {
    uploading: isUploading,
    progress: uploadProgress,
    uploadFileCount,
    lastUploadSummary,
    uploadFiles,
  } = smartImport;

  // Get queue stats for health label
  const { data: queueStats } = useByteQueueStats();
  
  // Update lastImportSummary when lastUploadSummary changes
  useEffect(() => {
    if (lastUploadSummary?.transactionCount) {
      setLastImportSummary(
        `Last import: ${lastUploadSummary.transactionCount} transaction${lastUploadSummary.transactionCount !== 1 ? 's' : ''} from ${lastUploadSummary.fileCount} file${lastUploadSummary.fileCount !== 1 ? 's' : ''}`
      );
    } else if (lastUploadSummary?.fileCount) {
      setLastImportSummary(
        `Last import: ${lastUploadSummary.fileCount} file${lastUploadSummary.fileCount !== 1 ? 's' : ''}`
      );
    }
  }, [lastUploadSummary]);

  // Update processingLabel based on uploading state
  useEffect(() => {
    if (isUploading) {
      setProcessingLabel(`Byte is processing your document${uploadFileCount?.total && uploadFileCount.total > 1 ? 's' : ''}…`);
    } else {
      // Clear processing label when upload completes
      setProcessingLabel(undefined);
    }
  }, [isUploading, uploadFileCount]);

  return (
    <>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={<ByteWorkspacePanel />}
        center={
          <ByteUnifiedCard 
            onExpandClick={() => {
              openChat({
                initialEmployeeSlug: 'byte-docs',
                context: {
                  page: 'smart-import',
                  data: {
                    source: 'smart-import-page',
                  },
                },
              });
            }}
            onChatInputClick={() => {
              openChat({
                initialEmployeeSlug: 'byte-docs',
                context: {
                  page: 'smart-import',
                  data: {
                    source: 'smart-import-page',
                  },
                },
              });
            }}
            onUploadStart={() => {
              // Open chat when upload starts
              openChat({
                initialEmployeeSlug: 'byte-docs',
                context: {
                  page: 'smart-import',
                  data: {
                    source: 'smart-import-upload',
                  },
                },
              });
            }}
            onUploadFiles={uploadFiles}
            uploadFileCount={uploadFileCount}
            uploadProgress={uploadProgress}
            isUploading={isUploading}
          />
        }
        right={
          <ActivityFeedSidebar 
            scope="smart-import"
            lastUploadSummary={lastUploadSummary}
          />
        }
      />
    </>
  );
}
