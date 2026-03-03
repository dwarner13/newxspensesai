/**
 * useImportList Hook
 *
 * Fetches the list of uploaded statement imports for the current user.
 * Used by MonthNavigator to let users switch between statements.
 */

import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ImportListItem {
  id: string;
  status: string;
  created_at: string;
  /** Formatted month label, e.g. "Jan 2025" */
  label: string;
  /** Original document filename */
  docName: string;
}

export interface UseImportListResult {
  imports: ImportListItem[];
  isLoading: boolean;
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function useImportList(): UseImportListResult {
  const { userId } = useAuth();
  const [imports, setImports] = useState<ImportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchImports = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('imports')
        .select('id, status, created_at, document:user_documents(id, original_name)')
        .eq('user_id', userId)
        .in('status', ['parsed', 'committed', 'analyzed_crystal'])
        .order('created_at', { ascending: false })
        .limit(36);

      if (error) {
        console.error('[useImportList] Error fetching imports:', error);
        return;
      }

      const items: ImportListItem[] = (data || []).map((row) => {
        const r = row as Record<string, unknown>;
        const doc = r.document as Record<string, unknown> | null;
        return {
          id: String(r.id || ''),
          status: String(r.status || ''),
          created_at: String(r.created_at || ''),
          label: formatMonthLabel(String(r.created_at || '')),
          docName: String(doc?.original_name || 'Statement'),
        };
      });

      setImports(items);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchImports();
  }, [fetchImports]);

  return { imports, isLoading };
}
