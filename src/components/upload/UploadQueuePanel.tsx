/**
 * Upload Queue Panel Component
 * 
 * Displays upload queue with per-file progress, speed, ETA, and status.
 * Supports cancel and retry actions.
 */

import React, { useEffect, useState } from 'react';
import { UploadQueueItem, UploadQueueProgress } from '../../lib/upload/uploadQueue';
import { X, RefreshCw, CheckCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';

export interface UploadQueuePanelProps {
  items: UploadQueueItem[];
  progress: UploadQueueProgress;
  onCancel?: (uploadId: string) => void;
  onRetry?: (uploadId: string) => void;
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
    case 'completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'uploading':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    case 'pending':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    case 'cancelled':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getStatusIcon(status: UploadQueueItem['status']) {
  switch (status) {
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
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Overall Progress */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Upload Queue ({progress.completed}/{progress.total})
          </h3>
          {progress.overallSpeed > 0 && (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {formatSpeed(progress.overallSpeed)} • {formatTime(progress.overallEta)}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.overallProgress}%` }}
          />
        </div>
      </div>

      {/* File List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.file.name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                  >
                    {getStatusIcon(item.status)}
                    <span className="capitalize">{item.status}</span>
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {formatFileSize(item.file.size)}
                </div>

                {/* Progress Bar */}
                {item.status === 'uploading' && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}

                {/* Speed and ETA */}
                {item.status === 'uploading' && item.speed > 0 && (
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                    <span>{formatSpeed(item.speed)}</span>
                    {item.eta > 0 && <span>ETA: {formatTime(item.eta)}</span>}
                    <span>{item.progress.toFixed(0)}%</span>
                  </div>
                )}

                {/* Error Message */}
                {item.status === 'error' && item.error && (
                  <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {item.error}
                  </div>
                )}

                {/* Integrity Verification Badge */}
                {item.status === 'completed' && item.result?.docId && (() => {
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
              <div className="flex items-center gap-2">
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
          </div>
        ))}
      </div>
    </div>
  );
}

