/**
 * Smart Import Card Component
 * 
 * Displays recent uploads with status badges and quick actions
 * Shows most recent 3 uploads from imports table
 * Provides CTA to upload new documents
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle, Clock, AlertCircle, ArrowRight, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface RecentImport {
  id: string;
  file_url: string;
  file_type: string;
  status: 'pending' | 'parsing' | 'parsed' | 'committed' | 'failed';
  created_at: string;
  committed_count: number | null;
}

interface SmartImportCardProps {
  className?: string;
}

export const SmartImportCard: React.FC<SmartImportCardProps> = ({ className }) => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [recentImports, setRecentImports] = useState<RecentImport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRecentImports();
    }
  }, [userId]);

  const fetchRecentImports = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('imports')
        .select('id, file_url, file_type, status, created_at, committed_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) {
        console.error('[SmartImportCard] Error fetching imports:', error);
        return;
      }
      
      setRecentImports(data || []);
    } catch (error) {
      console.error('[SmartImportCard] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'Queued' },
      parsing: { icon: Clock, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Processing' },
      parsed: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Parsed' },
      committed: { icon: CheckCircle, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: 'Complete' },
      failed: { icon: AlertCircle, color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'Failed' },
    };
    
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
        badge.color
      )}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getFileName = (fileUrl: string) => {
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      return pathParts[pathParts.length - 1] || 'Document';
    } catch {
      return fileUrl.split('/').pop() || 'Document';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleUploadClick = () => {
    navigate('/dashboard/smart-import-ai?auto=upload');
  };

  const handleViewResults = (importId: string) => {
    navigate(`/dashboard/smart-import-ai?importId=${importId}`);
  };

  return (
    <div className={cn(
      "rounded-3xl border border-slate-700/60 bg-slate-900/70 backdrop-blur shadow-[0_18px_45px_rgba(0,0,0,0.45)] p-6 h-full flex flex-col",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">Smart Import</h3>
            <p className="text-xs text-slate-400">Upload receipts & statements</p>
          </div>
        </div>
      </div>

      {/* Recent Uploads List */}
      <div className="space-y-3 mb-6 flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
        ) : recentImports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-400 mb-1">No uploads yet</p>
            <p className="text-xs text-slate-500">Upload your first document to get started</p>
          </div>
        ) : (
          recentImports.map((importItem) => (
            <div
              key={importItem.id}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-200 truncate">
                    {getFileName(importItem.file_url)}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(importItem.status)}
                  {importItem.committed_count !== null && (
                    <span className="text-xs text-slate-400">
                      {importItem.committed_count} transactions
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {formatDate(importItem.created_at)}
                  </span>
                </div>
              </div>
              {importItem.status === 'parsed' && (
                <button
                  onClick={() => handleViewResults(importItem.id)}
                  className="ml-3 p-1.5 rounded-md hover:bg-slate-700/50 transition-colors flex-shrink-0"
                  title="View Results"
                >
                  <Eye className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* CTA Button - Always at bottom */}
      <div className="mt-auto flex-shrink-0">
        <button
          onClick={handleUploadClick}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:opacity-90 text-white rounded-xl px-4 py-3 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Receipt/Statement</span>
        </button>

        {/* View All Link */}
        {recentImports.length > 0 && (
          <button
            onClick={() => navigate('/dashboard/smart-import-ai')}
            className="w-full mt-3 text-sm text-slate-400 hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
          >
            <span>View All Imports</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

