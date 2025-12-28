/**
 * Import List Component
 * 
 * Displays a list of all imports for the current user with:
 * - File name
 * - Status chip (Uploaded → Parsing → Parsed → Committed)
 * - Transaction count
 * - Date range (if available)
 * - Total income/expenses (if committed)
 * - Action buttons (Commit, View Transactions)
 * 
 * This component provides the "Smart Import Summary UI" that shows import history
 * and allows users to commit parsed imports or view committed transactions.
 */

import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { CheckCircle, Clock, AlertCircle, FileText, Calendar, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CommitImportResponse } from '@/types/smartImport';

interface ImportRecord {
  id: string;
  file_url: string;
  file_type: string;
  status: 'pending' | 'parsing' | 'parsed' | 'committed' | 'failed';
  created_at: string;
  committed_at: string | null;
  committed_count: number | null;
  error: string | null;
}

interface ImportListProps {
  onImportSelected?: (importId: string) => void;
}

export default function ImportList({ onImportSelected }: ImportListProps) {
  const { userId } = useAuthContext();
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchImports();
    }
  }, [userId]);

  /**
   * Fetch all imports for the current user
   * Orders by created_at descending (newest first)
   */
  const fetchImports = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('imports')
        .select('id, file_url, file_type, status, created_at, committed_at, committed_count, error')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to 50 most recent imports
      
      if (error) {
        console.error('[ImportList] Error fetching imports:', error);
        toast.error('Failed to load imports');
        return;
      }
      
      setImports(data || []);
    } catch (error: any) {
      console.error('[ImportList] Error:', error);
      toast.error('Failed to load imports');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Commit an import (move from staging to final transactions)
   * Only works if import status is 'parsed'
   */
  const handleCommit = async (importId: string) => {
    if (!userId) return;
    
    setCommitting(importId);
    try {
      const response = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ userId, importId }),
      });

      const result: CommitImportResponse = await response.json();
      
      if (!result.success && !result.ok && !result.committed) {
        throw new Error(result.error || result.message || 'Commit failed');
      }
      
      toast.success(`Committed ${result.committed || 0} transaction${result.committed !== 1 ? 's' : ''}`);
      
      // Refresh the list to show updated status
      await fetchImports();
      
      // Dispatch event to refresh transactions page
      window.dispatchEvent(new CustomEvent('transactionsImported', {
        detail: { count: result.committed || 0, importId }
      }));
      
      // Call callback if provided
      if (onImportSelected) {
        onImportSelected(importId);
      }
    } catch (error: any) {
      console.error('[ImportList] Commit error:', error);
      toast.error(error.message || 'Failed to commit import');
    } finally {
      setCommitting(null);
    }
  };

  /**
   * Get file name from file_url
   * Extracts filename from storage path
   */
  const getFileName = (fileUrl: string): string => {
    if (!fileUrl) return 'Unknown file';
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || 'Unknown file';
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Get status chip component
   */
  const StatusChip = ({ status }: { status: ImportRecord['status'] }) => {
    const configs = {
      pending: { label: 'Uploaded', color: 'bg-slate-100 text-slate-700', icon: Clock },
      parsing: { label: 'Parsing', color: 'bg-blue-100 text-blue-700', icon: Clock },
      parsed: { label: 'Parsed', color: 'bg-yellow-100 text-yellow-700', icon: FileText },
      committed: { label: 'Committed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    };
    
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading imports...</div>
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <p className="text-slate-600">No imports yet</p>
        <p className="text-sm text-slate-500 mt-2">Upload a document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {imports.map((importRecord) => (
        <div
          key={importRecord.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900">
                  {getFileName(importRecord.file_url)}
                </h3>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(importRecord.created_at)}
                </div>
                {importRecord.committed_count !== null && (
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} />
                    {importRecord.committed_count} transaction{importRecord.committed_count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            <StatusChip status={importRecord.status} />
          </div>

          {importRecord.error && (
            <div className="mb-3 p-2 rounded bg-red-50 border border-red-200">
              <p className="text-xs text-red-700">{importRecord.error}</p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            {importRecord.status === 'parsed' && (
              <button
                onClick={() => handleCommit(importRecord.id)}
                disabled={committing === importRecord.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {committing === importRecord.id ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Commit Import
                  </>
                )}
              </button>
            )}
            
            {importRecord.status === 'committed' && (
              <Link
                to={`/transactions?importId=${importRecord.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
              >
                View Transactions
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            
            {importRecord.status === 'failed' && (
              <button
                onClick={() => fetchImports()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

