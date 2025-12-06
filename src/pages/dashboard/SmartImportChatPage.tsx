/**
 * SmartImportChatPage Component
 * 
 * Complete workspace layout for Byte (Smart Import AI)
 * 
 * Layout:
 * - Left column (33%): Byte Workspace Panel with 6 status cards
 * - Center column (42%): Byte Unified Card (single card with header, messages, input)
 * - Right column (25%): Activity Feed
 */

import React, { useState, useEffect } from 'react';
import { ByteWorkspacePanel } from '../../components/smart-import/ByteWorkspacePanel';
import { ByteUnifiedCard } from '../../components/smart-import/ByteUnifiedCard';
import { ByteSmartImportConsole } from '../../components/smart-import/ByteSmartImportConsole';
import { DashboardSection } from '../../components/ui/DashboardSection';
import { DashboardThreeColumnLayout } from '../../components/layout/DashboardThreeColumnLayout';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useByteQueueStats } from '../../hooks/useByteQueueStats';

export function SmartImportChatPage() {
  // Scroll to top when page loads
  useScrollToTop();
  const [isByteConsoleOpen, setIsByteConsoleOpen] = useState(false);
  
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

  // Format queue health label (UI-only helper)
  const queueHealthLabel = queueStats?.health?.status === 'good'
    ? 'Healthy'
    : queueStats?.health?.status === 'warning'
    ? 'Processing'
    : queueStats?.health?.status === 'error'
    ? 'Issues detected'
    : undefined;

  const openByteConsole = () => {
    setIsByteConsoleOpen(true);
  };
  const closeByteConsole = () => {
    setIsByteConsoleOpen(false);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        <section className="mt-6 min-h-[520px]">
          <DashboardThreeColumnLayout
            left={
              <div className="h-full flex flex-col">
                <ByteWorkspacePanel />
              </div>
            }
            middle={
              <div className="h-full flex flex-col">
                <ByteUnifiedCard 
                  onExpandClick={openByteConsole} 
                  onChatInputClick={openByteConsole}
                  onUploadStart={openByteConsole}
                  onUploadFiles={uploadFiles}
                  uploadFileCount={uploadFileCount}
                  uploadProgress={uploadProgress}
                  isUploading={isUploading}
                />
              </div>
            }
            right={
              <ActivityFeedSidebar 
                scope="smart-import"
                lastUploadSummary={lastUploadSummary}
              />
            }
          />
        </section>
      </DashboardSection>

      {/* Floating Byte Smart Import Console - positioned above middle content, not covering activity feed */}
      <div className="relative z-[30]">
        <ByteSmartImportConsole
          isOpen={isByteConsoleOpen}
          onClose={closeByteConsole}
          lastImportSummary={lastImportSummary}
          queueHealthLabel={queueHealthLabel}
          isUploading={isUploading}
        />
      </div>
    </>
  );
}
