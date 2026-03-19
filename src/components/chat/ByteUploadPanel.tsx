/**
 * Byte Upload Panel Component
 * 
 * Compact upload UI for Byte chat that reuses Smart Import upload logic.
 * Shows drag-and-drop area and upload button, matching the Smart Import AI page behavior.
 */

// ====== BYTE UPLOAD PANEL ======

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, ExternalLink, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartImport } from '../../hooks/useSmartImport';
import { GuardrailsActivePill } from '../upload/GuardrailsActivePill';
import { emitSecurityMessage } from '../../lib/primeSecurityMessages';
import { getSupabase } from '../../lib/supabase';
import { DocumentViewerModal } from '../ui/DocumentViewerModal';
import type { UploadQueueItem } from '../../lib/upload/uploadQueue';
import toast from 'react-hot-toast';

let activeQueueOwnerId: string | null = null;

type SmartImportHook = ReturnType<typeof useSmartImport>;

export interface ByteUploadPanelProps {
  /** Optional callback when upload completes */
  onUploadCompleted?: (importId?: string) => void;
  /** Compact mode - hide drag area, show only header */
  compact?: boolean;
  /** Callback when drag state changes (for overlay coordination) */
  onDragStateChange?: (isDragging: boolean) => void;
  /** Optional smart import hook (shared with parent) */
  smartImport?: SmartImportHook;
}

export function ByteUploadPanel({
  onUploadCompleted,
  compact = false,
  onDragStateChange,
  smartImport: smartImportProp,
}: ByteUploadPanelProps) {
  const navigate = useNavigate();
  const { userId, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentUploadIds, setCurrentUploadIds] = useState<string[]>([]);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardingUploadId, setDiscardingUploadId] = useState<string | null>(null);
  const [lastUploadedFiles, setLastUploadedFiles] = useState<string[]>([]);
  const [lastSummaryId, setLastSummaryId] = useState<string | null>(null);
  const queueClearTimeoutRef = useRef<number | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{
    id: string;
    imageUrl?: string;
    originalFilename?: string;
    mimeType?: string;
    extractedData?: any;
    processingStatus?: string;
    createdAt?: string;
    redactedText?: string;
    redactionSummary?: string;
    ocrEngine?: string;
    ocrConfidence?: number;
  } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isRetryingOcr, setIsRetryingOcr] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showResetUpload, setShowResetUpload] = useState(false);
  const [expandedParsedByDoc, setExpandedParsedByDoc] = useState<Record<string, boolean>>({});
  const [debugSearch, setDebugSearch] = useState('');
  const [includeAllAccounts, setIncludeAllAccounts] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('ocr_debug_include_all_accounts') === '1';
  });
  const queueOwnerIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [isQueueOwner, setIsQueueOwner] = useState(false);
  
  // Use the same Smart Import hook as the main page
  const hookSmartImport = useSmartImport(userId || undefined, 'chat');
  const smartImport = smartImportProp || hookSmartImport;
  const {
    uploading: isUploading,
    progress: uploadProgress,
    uploadFileCount,
    uploadFiles,
    uploadStatus,
    lastUploadSummary,
    lastDebugPayload,
    resetUploadState,
    refreshDebugPayload,
    uploadQueue,
  } = smartImport;
  const debugEnabled = import.meta.env.VITE_OCR_DEBUG === '1';
  const isProcessing =
    uploadStatus.step === 'uploading' ||
    uploadStatus.step === 'processing' ||
    isUploading ||
    uploadQueue.isUploading;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('ocr_debug_include_all_accounts', includeAllAccounts ? '1' : '0');
    if (debugEnabled && refreshDebugPayload) {
      refreshDebugPayload({ includeAllAccounts });
    }
  }, [includeAllAccounts, debugEnabled, refreshDebugPayload]);

  useEffect(() => {
    if (!debugEnabled || !refreshDebugPayload) return;
    if (!isProcessing && uploadStatus.step !== 'completed') return;
    const timer = window.setInterval(() => {
      refreshDebugPayload({ includeAllAccounts });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [debugEnabled, refreshDebugPayload, includeAllAccounts, isProcessing, uploadStatus.step]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }

      const fileArray = Array.from(files);
      setLastUploadedFiles(fileArray.map((file) => file.name));
      setLastSummaryId(null);
      e.target.value = ''; // Reset input

      const toastId = toast.loading(`Uploading ${fileArray.length} file(s)...`);

      try {
        const results = await uploadFiles(userId, fileArray, 'chat');

        const rejected = results?.filter((r: any) => r?.rejected) ?? [];
        const successful = results?.filter((r: any) => !r?.rejected) ?? [];

        if (rejected.length > 0) {
          rejected.forEach((r: any) => {
            toast.error(`File was rejected: ${r.reason || 'Unknown error'}`, { id: toastId });
          });
        }

        if (successful.length > 0) {
          // Track upload IDs for discard functionality
          const docIds = successful.map((r: any) => r.docId).filter(Boolean);
          setCurrentUploadIds(docIds);
          
          // Emit security message (once per upload)
          if (userId && docIds.length > 0) {
            emitSecurityMessage(userId, 'upload_processing_started', docIds[0]);
          }
          
          toast.success(
            `${successful.length} file(s) uploaded successfully. Byte is processing them now.`,
            { id: toastId }
          );
          onUploadCompleted?.();
        }

        if (successful.length === 0 && rejected.length === 0) {
          toast.dismiss(toastId);
        }
      } catch (err: any) {
        console.error('[ByteUploadPanel] Upload error:', err);
        
        // Emit security message for failed/canceled upload
        if (userId) {
          emitSecurityMessage(userId, 'upload_failed_or_canceled');
        }
        
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, uploadFiles, onUploadCompleted]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
      onDragStateChange?.(true);
    }
  }, [isDragging, onDragStateChange]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) {
      setIsDragging(false);
      onDragStateChange?.(false);
    }
  }, [isDragging, onDragStateChange]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      onDragStateChange?.(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      if (!userId) {
        toast.error('Please log in to upload files');
        return;
      }

      const fileArray = Array.from(files);
      setLastUploadedFiles(fileArray.map((file) => file.name));
      setLastSummaryId(null);
      const toastId = toast.loading(`Uploading ${fileArray.length} file(s)...`);

      try {
        const results = await uploadFiles(userId, fileArray, 'chat');

        const rejected = results?.filter((r: any) => r?.rejected) ?? [];
        const successful = results?.filter((r: any) => !r?.rejected) ?? [];

        if (rejected.length > 0) {
          rejected.forEach((r: any) => {
            toast.error(`File was rejected: ${r.reason || 'Unknown error'}`, { id: toastId });
          });
        }

        if (successful.length > 0) {
          // Track upload IDs for discard functionality
          const docIds = successful.map((r: any) => r.docId).filter(Boolean);
          setCurrentUploadIds(docIds);
          
          // Emit security message (once per upload)
          if (userId && docIds.length > 0) {
            emitSecurityMessage(userId, 'upload_processing_started', docIds[0]);
          }
          
          toast.success(
            `${successful.length} file(s) uploaded successfully. Byte is processing them now.`,
            { id: toastId }
          );
          onUploadCompleted?.();
        }

        if (successful.length === 0 && rejected.length === 0) {
          toast.dismiss(toastId);
        }
      } catch (err: any) {
        console.error('[ByteUploadPanel] Upload error:', err);
        
        // Emit security message for failed/canceled upload
        if (userId) {
          emitSecurityMessage(userId, 'upload_failed_or_canceled');
        }
        
        toast.error(`Upload failed: ${err?.message || 'Unknown error'}`, { id: toastId });
      }
    },
    [userId, uploadFiles, onUploadCompleted, onDragStateChange]
  );

  const handleButtonClick = useCallback(() => {
    if (!userId) {
      toast.error('Please log in to upload files');
      return;
    }
    // Keep queue history visible between consecutive uploads so users can
    // track how many files were uploaded in this chat session.
    setIsCollapsed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  }, [userId]);

  const handleOpenFullConsole = useCallback(() => {
    navigate('/dashboard/smart-import-ai');
  }, [navigate]);

  const handleDiscard = useCallback(async (uploadId: string) => {
    if (!userId || !user) {
      toast.error('Please log in to discard uploads');
      return;
    }

    setDiscardingUploadId(uploadId);
    setShowDiscardConfirm(false);

    try {
      // Get Supabase session token
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not available');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Call delete endpoint
      const response = await fetch('/.netlify/functions/delete-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to discard upload');
      }

      const result = await response.json();

      // Remove from current upload IDs
      setCurrentUploadIds(prev => prev.filter(id => id !== uploadId));

      // Emit success message
      await emitSecurityMessage(userId, 'upload_discard_success', uploadId);

      toast.success('Upload discarded successfully');
    } catch (err: any) {
      console.error('[ByteUploadPanel] Discard error:', err);
      
      // Emit failure message
      if (userId) {
        await emitSecurityMessage(userId, 'upload_discard_failed', uploadId);
      }
      
      toast.error(`Failed to discard upload: ${err?.message || 'Unknown error'}`);
    } finally {
      setDiscardingUploadId(null);
    }
  }, [userId, user]);

  // Reset upload IDs when upload completes or fails
  useEffect(() => {
    if (uploadStatus.step === 'completed' || uploadStatus.step === 'error') {
      // Keep IDs for a bit to allow discard, then clear after delay
      const timeoutId = setTimeout(() => {
        setCurrentUploadIds([]);
      }, 30000); // Clear after 30 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [uploadStatus.step]);

  useEffect(() => {
    if (uploadStatus.step !== 'completed' || !lastUploadSummary?.id) return;
    if (lastSummaryId === lastUploadSummary.id) return;
    setLastSummaryId(lastUploadSummary.id);
    if (onUploadCompleted) {
      onUploadCompleted(lastUploadSummary.id);
    }
  }, [uploadStatus.step, lastUploadSummary?.id, lastSummaryId, onUploadCompleted]);

  useEffect(() => {
    if (!compact || uploadQueue.items.length === 0) return;
    const hasActive = uploadQueue.items.some((item) => item.status === 'uploading' || item.status === 'pending');
    if (!hasActive) {
      setIsCollapsed(true);
      return;
    }
    setIsCollapsed(false);
  }, [compact, uploadQueue.items]);

  const handleViewDocument = useCallback(async (item: UploadQueueItem) => {
    const docId = item.result?.docId;
    if (!docId) return;

    setViewerDoc({
      id: docId,
      originalFilename: item.file?.name || 'Document',
      processingStatus: item.result?.queued ? 'processing' : 'completed',
    });
    setViewerOpen(true);

    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data: docData, error: docError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      if (docError || !docData) return;

      let imageUrl: string | null = null;
      let downloadUrl: string | null = null;
      if (docData.storage_path) {
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('docs')
            .createSignedUrl(docData.storage_path, 60);
          if (!urlError) {
            imageUrl = urlData?.signedUrl || null;
          }
        } catch {
          // no-op
        }
      }
      if (!imageUrl && docData.storage_path) {
        const { data: publicData } = supabase.storage
          .from('docs')
          .getPublicUrl(docData.storage_path);
        imageUrl = publicData?.publicUrl || null;
      }
      if (docData.storage_path) {
        try {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('docs')
            .download(docData.storage_path);
          if (!downloadError && fileData) {
            downloadUrl = URL.createObjectURL(fileData);
          }
        } catch {
          // no-op
        }
      }

      setViewerDoc({
        id: docData.id,
        imageUrl: imageUrl || null,
        downloadUrl: downloadUrl || null,
        originalFilename: docData.original_name || docData.file_name || 'Document',
        mimeType: docData.mime_type || undefined,
        extractedData: docData.extracted_data || null,
        processingStatus: docData.status || 'unknown',
        createdAt: docData.created_at,
        redactedText: docData.redacted_text || null,
        redactionSummary: docData.redaction_summary || null,
        ocrEngine: docData.ocr_engine || null,
        ocrConfidence: docData.ocr_confidence || null,
      });
    } catch {
      // Keep safe shell
    }
  }, []);

  const handleRetryOcr = useCallback(async (docId: string) => {
    if (!userId) return;
    setIsRetryingOcr(true);
    try {
      await fetch('/.netlify/functions/smart-import-finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId, retry: true }),
      });
      toast.success('Retrying OCR...');
    } catch {
      toast.error('Failed to retry OCR');
    } finally {
      setIsRetryingOcr(false);
    }
  }, [userId]);

  useEffect(() => {
    if (queueClearTimeoutRef.current) {
      window.clearTimeout(queueClearTimeoutRef.current);
      queueClearTimeoutRef.current = null;
    }
  }, [uploadQueue]);

  useEffect(() => {
    const id = queueOwnerIdRef.current;
    if (!activeQueueOwnerId) {
      activeQueueOwnerId = id;
      setIsQueueOwner(true);
    } else if (activeQueueOwnerId === id) {
      setIsQueueOwner(true);
    }
    return () => {
      if (activeQueueOwnerId === id) {
        activeQueueOwnerId = null;
      }
    };
  }, []);

  const showProgressBar =
    isProcessing ||
    (typeof uploadProgress === 'number' && uploadProgress > 0 && uploadProgress < 100) ||
    uploadStatus.step === 'completed';
  const canDiscard = currentUploadIds.length > 0 && (isProcessing || uploadStatus.step === 'error');
  const queueItemsForDisplay = (uploadQueue.items || []).map((item) => {
    if (item.status !== 'completed') return item;
    if (isProcessing || uploadStatus.step === 'processing') {
      return { ...item, status: 'processing' as const };
    }
    if (uploadStatus.step === 'completed') {
      return { ...item, status: 'summarized' as const };
    }
    return item;
  });
  const activeSlotCount = queueItemsForDisplay.filter(
    (item) => item.status === 'pending' || item.status === 'uploading' || item.status === 'processing'
  ).length;
  const slotLimit = 5;
  const getQueueStatusLabel = (status: UploadQueueItem['status']) => {
    if (status === 'pending') return 'Uploading';
    if (status === 'uploading') return 'Uploading';
    if (status === 'processing') return 'Byte is scanning...';
    if (status === 'summarized') return 'Summary ready';
    if (status === 'completed') return 'Completed';
    if (status === 'error') return 'Needs retry';
    if (status === 'cancelled') return 'Cancelled';
    return 'In progress';
  };

  useEffect(() => {
    if (!isProcessing) {
      setShowResetUpload(false);
      return;
    }
    if (uploadQueue.isUploading) {
      setShowResetUpload(false);
      return;
    }
    const timer = window.setTimeout(() => {
      if (isProcessing && !uploadQueue.isUploading) {
        setShowResetUpload(true);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isProcessing, uploadQueue.isUploading]);

  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2.5 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="text-xs font-medium text-slate-200">
              Upload statements / receipts
            </div>
            {/* Guardrails Active Pill */}
            {isProcessing && (
              <GuardrailsActivePill isActive={true} />
            )}
          </div>
          <div className="text-[10px] text-slate-400 leading-tight">
            Any file type • Max 25MB
          </div>
          <div className="mt-1 text-[10px] text-cyan-200/85 tabular-nums">
            Batch Status · Slots: {Math.min(activeSlotCount, slotLimit)}/{slotLimit}
          </div>
          {showProgressBar && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>
                  {uploadStatus.step === 'processing' ? 'Processing' : 'Uploading'}
                </span>
                {uploadFileCount?.total ? (
                  <span>
                    {uploadFileCount.current}/{uploadFileCount.total}
                  </span>
                ) : null}
              </div>
              <div className="w-full bg-slate-800/60 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    uploadStatus.step === 'processing'
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
                      : 'bg-gradient-to-r from-sky-400 to-cyan-400'
                  }`}
                  style={{ width: `${Math.max(8, uploadProgress || 0)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 transition-colors flex items-center gap-1"
            onClick={handleButtonClick}
          >
            <UploadCloud className="w-3 h-3" />
            Upload
          </button>
          {/* Discard Button */}
          {canDiscard && (
            <button
              type="button"
              onClick={() => {
                if (currentUploadIds.length === 1) {
                  setShowDiscardConfirm(true);
                } else {
                  // Multiple uploads - discard first one for now
                  setShowDiscardConfirm(true);
                }
              }}
              disabled={discardingUploadId !== null}
              className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3 h-3" />
              Discard
            </button>
          )}
          {(showResetUpload || debugEnabled) && (
            <button
              type="button"
              onClick={() => {
                resetUploadState?.();
                toast.success('Upload queue reset');
              }}
              className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-amber-500/40 text-amber-200 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            className="shrink-0 text-[10px] px-2 py-1 rounded-md border border-sky-500/40 text-sky-300 hover:bg-sky-500/10 transition-colors flex items-center gap-1"
            onClick={handleOpenFullConsole}
          >
            <ExternalLink className="w-3 h-3" />
            Console
          </button>
        </div>
      </div>


      {isQueueOwner && uploadQueue.items.length > 0 && (
        <div className="mt-2">
          {compact && isCollapsed ? (
            <div className="flex items-center justify-between rounded-xl bg-white/6 px-3 py-2 text-xs text-slate-200 backdrop-blur-sm">
              <span>
                {uploadQueue.items.length} upload{uploadQueue.items.length === 1 ? '' : 's'} uploading
              </span>
              <div className="flex items-center gap-2">
                {uploadQueue.items[0]?.result?.docId && (
                  <button
                    type="button"
                    onClick={() => handleViewDocument(uploadQueue.items[0])}
                    className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    View
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCollapsed(false)}
                  className="px-2 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Show
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-2">
                {queueItemsForDisplay.map((item) => (
                  <div
                    key={item.id}
                    className="min-w-[220px] max-w-[220px] rounded-xl bg-white/8 px-2.5 py-2 backdrop-blur-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-sky-300" />
                          <div className="truncate text-[11px] font-semibold text-slate-100">
                            {item.file?.name || 'Document'}
                          </div>
                        </div>
                        <div className="mt-1 text-[10px] text-cyan-200/90">
                          {getQueueStatusLabel(item.status)}
                        </div>
                      </div>
                      {item.status === 'error' ? (
                        <button
                          type="button"
                          onClick={() => uploadQueue.retry(item.id)}
                          className="shrink-0 rounded-md bg-amber-500/20 px-1.5 py-1 text-[9px] text-amber-100 hover:bg-amber-500/30"
                        >
                          Retry
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {debugEnabled && (
        <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="mb-2 text-[11px] font-semibold text-amber-200">Import Debug Panel</div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={debugSearch}
              onChange={(e) => setDebugSearch(e.target.value)}
              placeholder="Search OCR text..."
              className="flex-1 min-w-[160px] rounded-md border border-amber-500/30 bg-slate-950/60 px-2 py-1 text-[10px] text-amber-100 placeholder:text-amber-300/60"
            />
            <label className="flex items-center gap-2 text-[10px] text-amber-200">
              <input
                type="checkbox"
                checked={includeAllAccounts}
                onChange={(e) => setIncludeAllAccounts(e.target.checked)}
              />
              Include all accounts (debug)
            </label>
            <button
              type="button"
              onClick={() => refreshDebugPayload?.({ includeAllAccounts })}
              className="text-[10px] px-2 py-1 rounded-md border border-amber-500/30 text-amber-200 hover:bg-amber-500/10 transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-3">
            {(!lastDebugPayload || lastDebugPayload.length === 0) && (
              <div className="rounded-lg border border-amber-500/20 bg-slate-900/60 p-2 text-[10px] text-amber-200">
                No debug payload yet. Click Refresh after OCR finishes.
              </div>
            )}
            {(lastDebugPayload || []).map((item) => (
              <div key={item.docId} className="rounded-lg border border-amber-500/20 bg-slate-900/60 p-2"> 
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-amber-100">
                  <span>Doc: …{item.docId?.slice(-6)}</span>
                  {item.importId && <span>Import: …{item.importId.slice(-6)}</span>}
                  {item.ocrEngineUsed && <span>OCR: {item.ocrEngineUsed}</span>}
                  <span>Text: {item.rawTextLength} chars</span>
                </div>
                {item.parseWarnings?.length > 0 && (
                  <div className="mt-1 text-[10px] text-amber-300">
                    Warnings: {item.parseWarnings.join(', ')}
                  </div>
                )}
                {item.parseError && (
                  <div className="mt-1 text-[10px] text-red-300">
                    Parse error: {item.parseError}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-[10px] px-2 py-1 rounded-md border border-amber-500/30 text-amber-200 hover:bg-amber-500/10 transition-colors"
                    onClick={() =>
                      setExpandedParsedByDoc((prev) => ({
                        ...prev,
                        [item.docId]: !prev[item.docId],
                      }))
                    }
                  >
                    {expandedParsedByDoc[item.docId] ? 'Hide parsed JSON' : 'Show parsed JSON'}
                  </button>
                </div>
                {Array.isArray(item.parsedTransactions) && (
                  <div className="mt-1 text-[10px] text-amber-200">
                    Low confidence: {item.parsedTransactions.filter((tx: any) => typeof tx?.confidence === 'number' && tx.confidence < 0.6).length}
                  </div>
                )}
                {expandedParsedByDoc[item.docId] && (
                  <div className="mt-2">
                    <div className="text-[10px] text-amber-200 mb-1">Parsed transactions</div>
                    <pre className="max-h-40 overflow-auto rounded-md bg-slate-950/70 p-2 text-[10px] text-slate-200 whitespace-pre-wrap">
                      {JSON.stringify(item.parsedTransactions || [], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drag and drop area - hidden in compact mode (overlay handles drag) */}
      {!compact && (
        <div
          className={`
            relative border border-dashed rounded-lg p-2.5 text-center transition-all duration-200
            ${
              isDragging
                ? 'border-sky-400 bg-sky-500/10 shadow-md shadow-sky-500/20'
                : 'border-sky-500/30 hover:border-sky-500/50 hover:bg-sky-500/5'
            }
            ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isUploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              <div className="text-[10px] text-slate-300">
                {uploadFileCount?.total && uploadFileCount.total > 1
                  ? `Uploading ${uploadFileCount.current}/${uploadFileCount.total}...`
                  : 'Uploading...'}
              </div>
              {uploadProgress !== null && uploadProgress > 0 && (
                <div className="w-full max-w-[200px] bg-slate-800/50 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-400 to-sky-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-sky-400" />
              <div className="text-[10px] font-medium text-slate-300">
                Click or drag files
              </div>
              <div className="text-[9px] text-slate-500">
                Max 25MB
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Hidden file input for compact mode */}
      {compact && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.csv,.xls,.xlsx,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}

      {/* Discard Confirmation Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/60 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Discard this upload?</h3>
            <p className="text-sm text-slate-300 mb-6">
              Discarding removes this upload and any extracted data. Continue?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const uploadId = currentUploadIds[0];
                  if (uploadId) {
                    handleDiscard(uploadId);
                  }
                }}
                disabled={discardingUploadId !== null}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {discardingUploadId ? 'Discarding...' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      )}
      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onRetryOcr={handleRetryOcr}
        isRetryingOcr={isRetryingOcr}
        mode="preview"
        documentData={viewerDoc}
      />
    </div>
  );
}





