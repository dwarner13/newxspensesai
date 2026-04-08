/**
 * Upload Queue Panel Component
 * 
 * Displays upload queue with per-file progress, speed, ETA, and status.
 * Supports cancel and retry actions.
 */

import React, { useEffect, useState } from 'react';
import { UploadQueueItem, UploadQueueProgress } from '../../lib/upload/uploadQueue';
import { X, RefreshCw, CheckCircle, AlertCircle, Loader2, Clock, Eye } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

export interface UploadQueuePanelProps {
  items: UploadQueueItem[];
  progress: UploadQueueProgress;
  onCancel?: (uploadId: string) => void;
  onRetry?: (uploadId: string) => void;
  onViewDocument?: (item: UploadQueueItem) => void;
  onReprocessDocument?: (item: UploadQueueItem) => void;
  showIntegrityBadge?: boolean;
  showHeader?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function formatSpeed(mbps: number): string {
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(2)} Gbps`;
  }
  return `${mbps.toFixed(2)} Mbps`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function getStatusColor(status: UploadQueueItem['status']): string {
  switch (status) {
    case 'committed':
      return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40';
    case 'ready_for_approval':
      return 'bg-amber-500/15 text-amber-200 border border-amber-500/40';
    case 'summarized':
      return 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/40';
    case 'processing':
      return 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/40';
    case 'completed':
      return 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40';
    case 'error':
      return 'bg-red-500/15 text-red-200 border border-red-500/40';
    case 'uploading':
      return 'bg-sky-500/15 text-sky-200 border border-sky-500/40';
    case 'pending':
      return 'bg-slate-700/40 text-slate-200 border border-slate-600/60';
    case 'cancelled':
      return 'bg-amber-500/15 text-amber-200 border border-amber-500/40';
    default:
      return 'bg-slate-700/40 text-slate-200 border border-slate-600/60';
  }
}

function getStatusIcon(status: UploadQueueItem['status']) {
  switch (status) {
    case 'committed':
      return <CheckCircle className="w-4 h-4" />;
    case 'ready_for_approval':
      return <AlertCircle className="w-4 h-4" />;
    case 'summarized':
      return <CheckCircle className="w-4 h-4" />;
    case 'processing':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'error':
      return <AlertCircle className="w-4 h-4" />;
    case 'uploading':
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case 'pending':
      return <Clock className="w-4 h-4" />;
    case 'cancelled':
      return <X className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

export function UploadQueuePanel({
  items,
  progress,
  onCancel,
  onRetry,
  onViewDocument,
  onReprocessDocument,
  showIntegrityBadge = true,
  showHeader = true,
  className = '',
}: UploadQueuePanelProps) {
  const [integrityStatus, setIntegrityStatus] = useState<Map<string, { verified: boolean; reason?: string }>>(new Map());

  // Check integrity status for completed items
  useEffect(() => {
    const checkIntegrity = async () => {
      const completedItems = items.filter(item => item.status === 'completed' && item.result?.docId);
      if (completedItems.length === 0) return;

      const sb = getSupabase();
      if (!sb) return;

      // Get docIds from completed items
      const docIds = completedItems
        .map(item => item.result?.docId)
        .filter(Boolean) as string[];

      if (docIds.length === 0) return;

      try {
        // Check document statuses
        const { data: docs } = await sb
          .from('user_documents')
          .select('id, status, ocr_text, storage_path')
          .in('id', docIds);

        if (!docs) return;

        const statusMap = new Map<string, { verified: boolean; reason?: string }>();
        
        for (const doc of docs) {
          const verified = doc.status === 'ready' && !!doc.ocr_text && !!doc.storage_path;
          statusMap.set(doc.id, {
            verified,
            reason: verified ? undefined : `Status: ${doc.status}, OCR: ${doc.ocr_text ? 'yes' : 'no'}`,
          });
        }

        setIntegrityStatus(statusMap);
      } catch (error) {
        console.error('[UploadQueuePanel] Error checking integrity:', error);
      }
    };

    checkIntegrity();
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm shadow-[0_10px_30px_rgba(15,23,42,0.35)] ${className}`}>
      {showHeader && (
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-100">
              Upload Queue ({progress.completed}/{progress.total})
            </h3>
            {progress.overallSpeed > 0 && (
              <span className="text-xs text-slate-400">
                {formatSpeed(progress.overallSpeed)} - {formatTime(progress.overallEta)}
              </span>
            )}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* File List */}
      <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-slate-900/80 transition-colors">
            {(() => {
              const fileName = item.file?.name || 'Document';
              const fileSize = typeof item.file?.size === 'number' ? item.file.size : 0;
              const safeProgress = Number.isFinite(item.progress) ? item.progress : 0;
              return (
            <div className="flex items-start justify-between gap-4">
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-100 truncate max-w-full">
                    {fileName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                  >
                    {getStatusIcon(item.status)}
                    <span className="capitalize">{item.status}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  {formatFileSize(fileSize)}
                </div>

                {/* Progress Bar */}
                {(item.status === 'uploading' || item.status === 'processing') && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mb-2">
                    <div
                      className={`${item.status === 'processing' ? 'bg-cyan-400' : 'bg-sky-400'} h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${safeProgress}%` }}
                    />
                  </div>
                )}

                {/* Speed and ETA */}
                {(item.status === 'uploading' || item.status === 'processing') && item.speed > 0 && (
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>{formatSpeed(item.speed)}</span>
                    {item.eta > 0 && <span>ETA: {formatTime(item.eta)}</span>}
                    <span>{safeProgress.toFixed(0)}%</span>
                  </div>
                )}

                {/* Error Message */}
                {item.status === 'error' && item.error && (
                  <div className="text-xs text-red-400 mt-1">
                    {item.error}
                  </div>
                )}

                {/* Integrity Verification Badge */}
                {showIntegrityBadge && item.status === 'completed' && item.result?.docId && (() => {
                  const integrity = integrityStatus.get(item.result.docId);
                  if (integrity) {
                    return (
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                            integrity.verified
                              ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40'
                              : 'bg-amber-500/15 text-amber-200 border border-amber-500/40'
                          }`}
                          title={integrity.reason || (integrity.verified ? 'Verified' : 'Warning')}
                        >
                          {integrity.verified ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Verified ✅
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              Warning
                            </>
                          )}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {item.status === 'completed' && item.result?.docId && onViewDocument && (
                  <button
                    onClick={() => onViewDocument(item)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                    title="View document"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                )}
                {item.status === 'completed' &&
                  item.result?.docId &&
                  onReprocessDocument &&
                  (item.result?.reused === true || item.result?.queued === true) && (
                    <button
                      onClick={() => onReprocessDocument(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
                      title="Reprocess this file"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reprocess
                    </button>
                  )}
                {item.status === 'uploading' && onCancel && (
                  <button
                    onClick={() => onCancel(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Cancel upload"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {item.status === 'error' && onRetry && (
                  <button
                    onClick={() => onRetry(item.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Retry upload"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}

