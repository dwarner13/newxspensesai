/**
 * ByteWorkspacePanel Component
 * 
 * Left sidebar panel for Byte workspace showing real-time stats and upload functionality
 * Single source of truth for Smart Import workspace
 */

import React from 'react';
import { FileText, Clock, CheckCircle, BarChart3, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { useByteQueueStats } from '../../hooks/useByteQueueStats';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useSmartImportUploadState } from '../../hooks/useSmartImportUploadState';

interface StatusCard {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  badge: 'active' | 'queue' | 'done' | 'summary' | 'processing' | 'stats';
  icon: React.ReactNode;
  progress?: number; // For processing queue
  trend?: string; // For monthly stats
}

const statusCards: StatusCard[] = [
  {
    id: '1',
    title: 'Recent uploads',
    description: '5 documents processed',
    timestamp: '2m ago',
    badge: 'active',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: '2',
    title: 'Pending documents',
    description: '2 files in queue',
    timestamp: '5m ago',
    badge: 'queue',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: '3',
    title: 'Last processed file',
    description: 'receipt_2024_01.pdf',
    timestamp: '12m ago',
    badge: 'done',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  {
    id: '4',
    title: 'Extraction summary',
    description: '24 transactions found',
    timestamp: '1h ago',
    badge: 'summary',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: '5',
    title: 'Processing Queue Status',
    description: '3 items in progress',
    timestamp: 'Just now',
    badge: 'processing',
    icon: <Loader2 className="w-4 h-4" />,
    progress: 60,
  },
  {
    id: '6',
    title: 'Monthly Statistics',
    description: '247 documents this month',
    timestamp: 'Updated daily',
    badge: 'stats',
    icon: <TrendingUp className="w-4 h-4" />,
    trend: '+15% vs last month',
  },
];

const badgeStyles = {
  active: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  queue: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  done: 'bg-green-400/10 text-green-400 border-green-400/30',
  summary: 'bg-purple-400/10 text-purple-400 border-purple-400/30',
  processing: 'bg-orange-400/10 text-orange-400 border-orange-400/30',
  stats: 'bg-green-400/10 text-green-400 border-green-400/30',
};

const badgeLabels = {
  active: 'Active',
  queue: 'Queue',
  done: '✓ Done',
  summary: 'Summary',
  processing: 'Processing',
  stats: 'Stats',
};

interface ByteWorkspacePanelProps {
  // Legacy props kept for backward compatibility, but we use shared state from hook
  isUploading?: boolean;
  uploadProgress?: number;
  uploadFileCount?: { current: number; total: number };
}

export function ByteWorkspacePanel({ 
  isUploading: legacyIsUploading,
  uploadProgress: legacyProgress,
  uploadFileCount: legacyFileCount
}: ByteWorkspacePanelProps) {
  const { data: stats, isLoading: statsLoading, isError: statsError } = useByteQueueStats();
  
  // Use shared upload status from Smart Import hook
  const { uploadStatus, uploadFileCount } = useSmartImport();
  
  // Task C: Shared upload state for synchronized status display
  const { uploads: sharedUploads } = useSmartImportUploadState();
  const activeUploads = sharedUploads.filter(u => u.status !== 'completed' && u.status !== 'failed');
  
  // Show live upload strip when not idle and not error
  const showLiveUpload = uploadStatus.step !== 'idle' && uploadStatus.step !== 'error';
  
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-full flex flex-col" data-workspace-panel>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">BYTE WORKSPACE</h3>
          <p className="text-sm text-slate-400">Document processing status</p>
        </div>
      </div>

      {/* Processing Queue Status */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
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
                ✓ {stats.queue.completed} completed
              </p>
            )}
          </>
        )}
        
        {/* Live Upload Progress Strip - Shows when file is uploading or processing */}
        {showLiveUpload && (
          <div className="mt-4 rounded-2xl border border-sky-500/40 bg-slate-950/70 px-4 py-3 shadow-[0_0_20px_rgba(56,189,248,0.25)]">
            <div className="flex items-center justify-between gap-3">
              {/* Left: animated Byte icon + text */}
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/80">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500/40" />
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/80">
                    <FileText className="h-4 w-4 text-slate-950" />
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                    {uploadStatus.step === 'completed' ? 'Completed' : 'In progress'}
                  </span>
                  <span className="text-sm text-slate-100">
                    {uploadStatus.fileName ?? 'Document'} •{' '}
                    {uploadStatus.step === 'processing'
                      ? 'Processing & normalizing…'
                      : 'Uploading to Smart Import…'}
                  </span>
                </div>
              </div>

              {/* Right: percentage */}
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-slate-400">Progress</span>
                <span className="text-lg font-semibold text-sky-300 tabular-nums">
                  {Math.max(5, uploadStatus.progress).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-sky-400 transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(5, uploadStatus.progress)}%` }}
              />
            </div>

            {/* Helper text */}
            <p className="mt-2 text-[11px] text-slate-400">
              {uploadStatus.step === 'processing'
                ? 'Reading, cleaning and organizing your transactions…'
                : 'Byte is scanning, cleaning, and preparing your transactions for Smart Categories.'}
            </p>
          </div>
        )}

        {/* Task C: Live imports strip from shared upload state */}
        {activeUploads.length > 0 && (
          <div className="mt-3 rounded-2xl bg-slate-900/80 border border-slate-800 px-3 py-2 text-xs text-slate-300">
            <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
              Live imports
            </p>
            {activeUploads.map(upload => (
              <div key={upload.id} className="flex items-center justify-between py-0.5">
                <span className="truncate max-w-[65%]">{upload.fileName}</span>
                <span className="text-[11px] text-slate-400">
                  {upload.status === 'uploading' && 'Uploading…'}
                  {upload.status === 'processing' && 'Processing…'}
                  {upload.status === 'failed' && 'Failed'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Statistics */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">Monthly Statistics</h4>
          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
            Stats
          </span>
        </div>
        {statsError ? (
          <p className="text-sm text-red-400">Unable to load stats</p>
        ) : statsLoading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading stats...</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">
              {stats?.monthly?.totalThisMonth ?? 0} documents this month
            </p>
            {stats?.monthly?.deltaPercent !== undefined && stats.monthly.deltaPercent !== 0 && (
              <p className="text-xs text-green-400 mt-1">
                📈 {stats.monthly.deltaPercent > 0 ? '+' : ''}{stats.monthly.deltaPercent}% vs last month
              </p>
            )}
          </>
        )}
      </div>

      {/* Import Health */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">Import Health</h4>
          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
            Healthy
          </span>
        </div>
        {statsError ? (
          <p className="text-sm text-red-400">Unable to load health status</p>
        ) : statsLoading ? (
          <p className="text-sm text-slate-500 animate-pulse">Loading health status...</p>
        ) : (
          <p className="text-sm text-slate-400">
            {stats?.health?.status === 'good' ? 'All systems operational' : 'Some issues detected'}
          </p>
        )}
      </div>

      <div className="flex-1" />
    </div>
  );
}
