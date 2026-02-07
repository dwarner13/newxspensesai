/**
 * ByteWorkspacePanel Component
 * 
 * Left sidebar panel for Byte workspace showing real-time stats and upload functionality
 * Single source of truth for Smart Import workspace
 */

import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, BarChart3, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DocumentViewerModal } from '../ui/DocumentViewerModal';
import type { DocumentStats } from '../../hooks/useDocumentStats';

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
  stats?: DocumentStats | null;
  statsLoading?: boolean;
  statsError?: boolean;
}

export function ByteWorkspacePanel({ 
  isUploading: legacyIsUploading,
  uploadProgress: legacyProgress,
  uploadFileCount: legacyFileCount,
  stats,
  statsLoading = false,
  statsError = false,
}: ByteWorkspacePanelProps) {
  const { user } = useAuth();

  const [recentDocuments, setRecentDocuments] = useState<Array<{id: string; name: string; text: string; date: string; status?: string}>>([]);
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

  useEffect(() => {
    if (statsLoading) return;
    if (!user?.id) {
      setRecentDocuments([]);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      return;
    }
    supabase
      .from('user_documents')
      .select('id, original_name, ocr_text, ocr_completed_at, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setRecentDocuments(
            data.map(d => ({
              id: d.id,
              name: d.original_name,
              text: d.ocr_text || '',
              date: d.ocr_completed_at || d.created_at || '',
              status: d.status,
            }))
          );
        }
      });
  }, [statsLoading, user?.id]);

  
  
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

      {/* Recent Extractions */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-white">Recent Extractions</h4>
          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full">OCR</span>
        </div>
        {recentDocuments.length === 0 ? (
          <p className="text-sm text-slate-400">No uploads yet</p>
        ) : (
          <div className="space-y-2">
            {recentDocuments.map(doc => (
              <div
                key={doc.id}
                className="text-xs cursor-pointer hover:bg-slate-700/50 rounded p-2 transition-colors"
                onClick={() => {
                  setViewerDoc({
                    id: doc.id,
                    originalFilename: doc.name,
                    ocrText: doc.text,
                    createdAt: doc.date,
                    processingStatus: doc.status || 'completed',
                  });
                  setViewerOpen(true);
                }}
              >
                <div className="text-slate-300 font-medium truncate">📄 {doc.name}</div>
                {doc.text ? (
                  <div className="text-slate-500 truncate">{doc.text.substring(0, 80)}...</div>
                ) : (
                  <div className="text-slate-500 truncate">
                    {doc.status ? `${doc.status}…` : 'Processing…'}
                  </div>
                )}
              </div>
            ))}
          </div>
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

      <DocumentViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        documentData={viewerDoc}
      />
    </div>
  );
}
