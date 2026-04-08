/**
 * ByteUnifiedCard Component
 * 
 * Unified employee card for Byte (Smart Import AI)
 * Uses EmployeeUnifiedCardBase for consistent premium styling.
 * Contains action buttons (Upload, Queue, Stats) in the header section
 * Stats display is in ByteWorkspacePanel (left column)
 * Upload functionality is handled here in the center card
 */

import React, { useRef, useCallback } from 'react';
import { Upload, List, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useByteQueueStats } from '../../hooks/useByteQueueStats';
import { useSmartImportUploadState } from '../../hooks/useSmartImportUploadState';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { EMPLOYEE_SLUGS } from '@/lib/ai/employeeSlugs';
import { EmployeeUnifiedCardBase, type SecondaryAction } from '../workspace/employees/EmployeeUnifiedCardBase';
import toast from 'react-hot-toast';
import { isSmartImportOpsDashboardV1Enabled } from '../../lib/featureFlags';

interface ByteUnifiedCardProps {
  onExpandClick?: () => void;
  onChatInputClick?: () => void;
  onUploadClick?: () => void;
  onUploadStart?: () => void; // Callback when upload starts (for auto-opening console)
  // Upload props from parent hook instance
  onUploadFiles?: (userId: string, files: File[], source?: 'upload' | 'chat') => Promise<any[]>;
  uploadFileCount?: { current: number; total: number };
  uploadProgress?: number | null;
  isUploading?: boolean;
}

export function ByteUnifiedCard({ 
  onExpandClick, 
  onChatInputClick, 
  onUploadClick,
  onUploadStart,
  onUploadFiles,
  uploadFileCount,
  uploadProgress,
  isUploading = false,
}: ByteUnifiedCardProps) {
  const { userId } = useAuth();
  const { refetch: refetchStats } = useByteQueueStats();
  const { openChat } = useUnifiedChatLauncher();
  const opsDashboardEnabled = isSmartImportOpsDashboardV1Enabled();
  
  // Task B: Shared upload state hook (must be at component level)
  const { addUpload } = useSmartImportUploadState();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler to open unified chat with Byte
  const handleChatClick = useCallback(() => {
    if (opsDashboardEnabled) {
      openChat({
        initialEmployeeSlug: EMPLOYEE_SLUGS.PRIME,
        force: true,
        routeHint: '/dashboard/prime-chat',
        context: {
          page: 'smart-import',
          data: {
            source: 'smart-import-ops-dashboard',
            intent: 'import-review',
          },
        },
        initialQuestion:
          'Please review my latest import status and summarize what is ready, what needs category review, and the next action.',
      });
      return;
    }

    console.log('[ByteUnifiedCard] Opening chat with Byte...');

    // ALWAYS clear old Byte thread so we start fresh (per-user key)
    try {
      if (userId) {
        const threadKey = `chat_thread_${userId}_byte-docs`;
        localStorage.removeItem(threadKey);
        console.log('[ByteUnifiedCard] Cleared old Byte thread from localStorage');
      }
    } catch (e) {
      console.error('[ByteUnifiedCard] Failed to clear localStorage:', e);
    }

    openChat({
      initialEmployeeSlug: EMPLOYEE_SLUGS.BYTE,
      force: true,
      context: {
        page: 'smart-import',
        data: {
          source: 'workspace-byte',
        },
      },
    });
    console.log('[ByteUnifiedCard] Chat opened, isOpen should be true');
    if (onChatInputClick) {
      onChatInputClick();
    }
  }, [openChat, onChatInputClick, opsDashboardEnabled]);

  // Handle file upload - universal uploader (no validation, Smart Import handles everything)
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;

      if (!files || files.length === 0) {
        return;
      }

      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }

      // IMPORTANT: build the array immediately from the FileList
      const fileArray = Array.from(files);

      // Clear input AFTER we build the array,
      // so the user can re-select the same file later
      e.target.value = '';

      if (fileArray.length === 0) {
        console.warn('[ByteUnifiedCard] fileArray is empty after conversion – aborting upload');
        toast.error('No files to upload');
        return;
      }

      if (!onUploadFiles) {
        console.error('[ByteUnifiedCard] onUploadFiles prop is missing!');
        toast.error('Upload function not available');
        return;
      }

      // Task B: Add to shared upload state immediately
      fileArray.forEach((file, index) => {
        addUpload({
          fileName: file.name,
          source: 'workspace',
          status: 'uploading',
          progress: 5,
        });
      });

      // Auto-open Byte console when upload starts
      if (onUploadStart) {
        onUploadStart();
      }

      const toastId = toast.loading(`Uploading ${fileArray.length} file(s)...`);

      try {
        const results = await onUploadFiles(userId, fileArray, 'upload');

        const rejected = results?.filter((r: any) => r?.rejected) ?? [];
        const successful = results?.filter((r: any) => !r?.rejected) ?? [];

        if (rejected.length > 0) {
          rejected.forEach((r: any) => {
            toast.error(`File was rejected: ${r.reason || 'Unknown error'}`, { id: toastId });
          });
        }

        if (successful.length > 0) {
          toast.success(
            `${successful.length} file(s) uploaded successfully. Byte is processing them now.`,
            { id: toastId }
          );
          // Refresh queue stats after successful upload
          refetchStats();
        }

        if (successful.length === 0 && rejected.length === 0) {
          toast.dismiss(toastId);
        }
      } catch (err: any) {
        console.error('[ByteUnifiedCard] Upload error:', err);
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, onUploadFiles, refetchStats]
  );

  const handleUploadButtonClick = useCallback(() => {
    // Auto-open Byte console when upload button is clicked
    if (onUploadStart) {
      onUploadStart();
    }
    if (onUploadClick) {
      onUploadClick();
    } else {
      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }
      fileInputRef.current?.click();
    }
  }, [userId, onUploadClick, onUploadStart]);

  const handleQueueClick = useCallback(() => {
    // Scroll to workspace panel
    const workspacePanel = document.querySelector('[data-workspace-panel]');
    if (workspacePanel) {
      workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleStatsClick = useCallback(() => {
    // Scroll to workspace panel stats section
    const workspacePanel = document.querySelector('[data-workspace-panel]');
    if (workspacePanel) {
      workspacePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Secondary actions for Byte
  const secondaryActions: SecondaryAction[] = [
    {
      label: isUploading ? `Uploading... ${uploadProgress ?? 0}%` : 'Upload',
      icon: <Upload className="h-4 w-4" />,
      onClick: handleUploadButtonClick,
      disabled: isUploading || !userId,
    },
    {
      label: 'Queue',
      icon: <List className="h-4 w-4" />,
      onClick: handleQueueClick,
    },
    {
      label: 'Stats',
      icon: <BarChart3 className="h-4 w-4" />,
      onClick: handleStatsClick,
    },
  ];

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.heic"
        onChange={handleFileSelect}
        className="hidden"
      />
      <EmployeeUnifiedCardBase
        employeeSlug="byte-docs"
        primaryActionLabel={opsDashboardEnabled ? "Ask Prime about this import" : "Chat with Byte about your imports"}
        onPrimaryActionClick={handleChatClick}
        secondaryActions={secondaryActions}
        footerStatusText={
          opsDashboardEnabled
            ? "For guided imports and insights, upload directly through Prime chat."
            : "Online 24/7"
        }
      />
    </>
  );
}
