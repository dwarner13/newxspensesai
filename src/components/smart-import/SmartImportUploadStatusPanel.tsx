import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentStats } from '../../hooks/useDocumentStats';
import type { UploadQueueItem, UploadQueueProgress } from '../../lib/upload/uploadQueue';
import { UploadQueuePanel } from '../upload/UploadQueuePanel';
import { DocumentViewerModal } from '../ui/DocumentViewerModal';
import { getSupabase } from '../../lib/supabase';

interface SmartImportUploadStatusPanelProps {
  stats?: DocumentStats | null;
  statsLoading?: boolean;
  statsError?: boolean;
  userId?: string;
  uploadQueue: {
    items: UploadQueueItem[];
    progress: UploadQueueProgress;
    cancel: (uploadId: string) => void;
    retry: (uploadId: string) => void;
  };
}

export function SmartImportUploadStatusPanel({
  stats,
  statsLoading = false,
  statsError = false,
  userId,
  uploadQueue,
}: SmartImportUploadStatusPanelProps) {
  const [viewerDoc, setViewerDoc] = useState<{
    id: string;
    imageUrl?: string;
    originalFilename?: string;
    extractedData?: any;
    processingStatus?: string;
    createdAt?: string;
    ocrText?: string;
    redactedText?: string;
    redactionSummary?: string;
    ocrEngine?: string;
    ocrConfidence?: number;
  } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [isRetryingOcr, setIsRetryingOcr] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

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
      if (docData.storage_path) {
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('original_docs')
            .createSignedUrl(docData.storage_path, 60);
          if (!urlError) {
            imageUrl = urlData?.signedUrl || null;
          }
        } catch {
          // no-op
        }
        if (!imageUrl) {
          try {
            const { data: urlData2, error: urlError2 } = await supabase.storage
              .from('redacted_docs')
              .createSignedUrl(docData.storage_path, 60);
            if (!urlError2) {
              imageUrl = urlData2?.signedUrl || null;
            }
          } catch {
            // no-op
          }
        }
      }

      setViewerDoc({
        id: docData.id,
        imageUrl: imageUrl || docData.storage_path || null,
        originalFilename: docData.original_name || docData.file_name || 'Document',
        mimeType: docData.mime_type || undefined,
        extractedData: docData.extracted_data || null,
        processingStatus: docData.status || 'unknown',
        createdAt: docData.created_at,
        ocrText: docData.ocr_text || null,
        redactedText: docData.redacted_text || null,
        redactionSummary: docData.redaction_summary || null,
        ocrEngine: docData.ocr_engine || null,
        ocrConfidence: docData.ocr_confidence || null,
      });
    } catch {
      // Keep safe shell
    }
  }, []);

  const refreshDocument = useCallback(async (docId: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data: docData, error: docError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('id', docId)
      .maybeSingle();

    if (docError || !docData) return;

    let imageUrl: string | null = null;
    if (docData.storage_path) {
      try {
        const { data: urlData, error: urlError } = await supabase.storage
          .from('original_docs')
          .createSignedUrl(docData.storage_path, 60);
        if (!urlError) {
          imageUrl = urlData?.signedUrl || null;
        }
      } catch {
        // no-op
      }
      if (!imageUrl) {
        try {
          const { data: urlData2, error: urlError2 } = await supabase.storage
            .from('redacted_docs')
            .createSignedUrl(docData.storage_path, 60);
          if (!urlError2) {
            imageUrl = urlData2?.signedUrl || null;
          }
        } catch {
          // no-op
        }
      }
    }

    setViewerDoc({
      id: docData.id,
      imageUrl: imageUrl || docData.storage_path || null,
      originalFilename: docData.original_name || docData.file_name || 'Document',
      mimeType: docData.mime_type || undefined,
      extractedData: docData.extracted_data || null,
      processingStatus: docData.status || 'unknown',
      createdAt: docData.created_at,
      ocrText: docData.ocr_text || null,
      redactedText: docData.redacted_text || null,
      redactionSummary: docData.redaction_summary || null,
      ocrEngine: docData.ocr_engine || null,
      ocrConfidence: docData.ocr_confidence || null,
    });
  }, []);

  const handleRetryOcr = useCallback(async (docId: string) => {
    if (!userId) return;
    setIsRetryingOcr(true);
    try {
      await fetch('/.netlify/functions/smart-import-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, docId }),
      });
      await refreshDocument(docId);
    } finally {
      setIsRetryingOcr(false);
    }
  }, [userId, refreshDocument]);

  useEffect(() => {
    if (!viewerOpen || !viewerDoc?.id) return;
    const docId = viewerDoc.id;

    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
    }

    refreshTimerRef.current = window.setInterval(() => {
      refreshDocument(docId);
    }, 4000);

    return () => {
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [viewerOpen, viewerDoc?.id, refreshDocument]);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-white">Processing Queue Status</h4>
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">
              Processing
            </span>
          </div>
          {statsError ? (
            <p className="text-sm text-red-400">Unable to load stats</p>
          ) : statsLoading ? (
            <p className="text-sm text-slate-500 animate-pulse">Loading stats...</p>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                {((stats?.queue.pending || 0) + (stats?.queue.processing || 0)) || 0} items in progress
              </p>
              {(stats?.queue.completed || 0) > 0 && (
                <p className="text-xs text-green-400 mt-1">
                  ✓ {stats?.queue.completed || 0} completed
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_0_0_1px_rgba(255,255,255,0.04)] p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-white">Upload Progress</h4>
            <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-1 rounded-full">
              Queue
            </span>
          </div>
          {uploadQueue.items.length === 0 ? (
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-4 py-6 text-center text-xs text-slate-400">
              No active uploads
            </div>
          ) : (
            <UploadQueuePanel
              items={uploadQueue.items}
              progress={uploadQueue.progress}
              onCancel={uploadQueue.cancel}
              onRetry={uploadQueue.retry}
              onViewDocument={handleViewDocument}
              className="border border-slate-700/70 shadow-none"
            />
          )}
        </div>
      </div>

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onRetryOcr={handleRetryOcr}
        isRetryingOcr={isRetryingOcr}
        documentData={viewerDoc}
      />
    </>
  );
}
