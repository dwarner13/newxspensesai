/**
 * useImportList Hook
 *
 * Fetches the list of uploaded statement imports for the current user.
 * Used by MonthNavigator to let users switch between statements.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ImportBreakdown {
  totals?: {
    total_debits: number;
    total_credits: number;
    net: number;
    transaction_count: number;
  };
  category_totals?: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  top_merchants?: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  statementTotals?: {
    totalDeducted?: number;
    totalAdded?: number;
    source?: string;
  };
}

export interface ImportListItem {
  id: string;
  status: string;
  created_at: string;
  /** Formatted date label, e.g. "Mar 13, 2026" */
  label: string;
  /** Human-readable statement label (issuer/last4 or filename fallback) */
  statementLabel: string;
  /** Original document filename */
  docName: string;
  /** Issuer from imports.issuer column (e.g. 'BMO', 'TD') */
  issuer: string | null;
  /** Statement breakdown data from imports table */
  breakdown: ImportBreakdown | null;
}

export interface UseImportListResult {
  imports: ImportListItem[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

function formatImportDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildStatementLabel(
  row: Record<string, unknown>,
  docName: string,
  doc: Record<string, unknown> | null
): string {
  const breakdown = (row.statement_breakdown_json as Record<string, unknown> | null) || null;
  const statementMeta = (breakdown?.statement_meta as Record<string, unknown> | null) || null;
  const issuer = String(statementMeta?.issuer || '').trim();
  const accountLast4 = String(statementMeta?.account_last4 || '').trim();

  if (issuer) {
    return accountLast4 ? `${issuer} - ----${accountLast4}` : issuer;
  }

  const docMetadata = (doc?.metadata as Record<string, unknown> | null) || null;
  const accountSummary = (docMetadata?.account_summary as Record<string, unknown> | null) || null;
  const metadataInstitution = String(accountSummary?.institution || '').trim();
  if (metadataInstitution) {
    return metadataInstitution;
  }

  const cleaned = String(docName || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    const KNOWN_BANKS: Record<string, string> = {
    'rbc': 'RBC', 'td': 'TD', 'bmo': 'BMO', 'cibc': 'CIBC', 'scotia': 'Scotiabank',
    'scotiabank': 'Scotiabank', 'tangerine': 'Tangerine', 'simplii': 'Simplii',
    'capital one': 'Capital One', 'capitalone': 'Capital One', 'amex': 'Amex',
    'american express': 'Amex', 'chase': 'Chase', 'triangle': 'Triangle',
    'canadian tire': 'Canadian Tire', 'desjardins': 'Desjardins', 'national bank': 'National Bank',
    'rogers': 'Rogers', 'mbna': 'MBNA', 'hsbc': 'HSBC', 'pc financial': 'PC Financial',
  };
  const lowerCleaned = cleaned.toLowerCase();
  for (const [key, bankName] of Object.entries(KNOWN_BANKS)) {
    if (lowerCleaned.includes(key)) return bankName;
  }
  return 'Statement';
}

export function useImportList(): UseImportListResult {
  const { userId } = useAuth();
  const [imports, setImports] = useState<ImportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const realtimeRefetchTimerRef = useRef<number | null>(null);

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
        .select('id, status, issuer, created_at, statement_breakdown_json, document:user_documents(id, original_name, metadata)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(36);

      if (error) {
        console.error('[useImportList] Error fetching imports:', error);
        return;
      }

      const items: ImportListItem[] = (data || []).map((row) => {
        const r = row as Record<string, unknown>;
        const doc = r.document as Record<string, unknown> | null;
        const docName = String(doc?.original_name || 'Statement');
        const rawBreakdown = (r.statement_breakdown_json as ImportBreakdown | null) || null;
        return {
          id: String(r.id || ''),
          status: String(r.status || ''),
          created_at: String(r.created_at || ''),
          label: formatImportDateLabel(String(r.created_at || '')),
          statementLabel: buildStatementLabel(r, docName, doc),
          docName,
          issuer: (r.issuer as string | null) ?? null,
          breakdown: rawBreakdown,
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

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('imports-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'imports',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (realtimeRefetchTimerRef.current !== null) {
            window.clearTimeout(realtimeRefetchTimerRef.current);
          }
          realtimeRefetchTimerRef.current = window.setTimeout(() => {
            realtimeRefetchTimerRef.current = null;
            void fetchImports();
          }, 500);
        }
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      void fetchImports();
    }, 30000);

    return () => {
      if (realtimeRefetchTimerRef.current !== null) {
        window.clearTimeout(realtimeRefetchTimerRef.current);
        realtimeRefetchTimerRef.current = null;
      }
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [fetchImports, userId]);

  return { imports, isLoading, refetch: fetchImports };
}
