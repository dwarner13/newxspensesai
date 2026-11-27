/**
 * Reports data — UX-FST2-10 (owner FST-2 GO: Reports in scope; AR-1b FR-010 launch blocker).
 * Every figure is the shared engine's (fst2-summary-2, all imported data): grand totals with the
 * owner's labels, perStatement[] for each statement, spendingByCategory, and periods[] (comparable
 * statement periods only) for the trend chart. Retired from the browser: the type/category income
 * rule (everything else, transfers and debt included, counted as 'spent'), per-statement and
 * issuer sums, calendar-month buckets and category sums. Gap G5 (Prime HQ): perStatement dates are
 * the first and last transaction dates, not the printed statement period, so they are labelled as
 * transaction dates and no period or reconciliation claim is made.
 */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFinancialSummary } from './useFinancialSummary';
import { allTimeRange, type FinancialSummary } from '../lib/financialSummary';
import { hasFigures } from '../components/finance/FinancialState';
import { insightText, spendingClaim } from '../lib/insightWording';

export interface StatementSummary {
  importId: string;
  issuer: string;
  createdAt: string;
  txCount: number;
  /** Server Actual Spending / Actual Income for this statement (null when the server has no rows for it). */
  totalSpent: number | null;
  totalIncome: number | null;
  /** First / last TRANSACTION dates in the statement (G5: not the printed statement period). */
  earliestDate: string | null;
  latestDate: string | null;
}

export interface IssuerGroup {
  issuer: string;
  statements: StatementSummary[];
  txCount: number;
}

/** A comparable statement period (server periods[]); never a calendar-month bucket. */
export interface MonthlyTrend {
  month: string;
  spent: number;
  income: number;
}

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface ReportsData {
  financial: ReturnType<typeof useFinancialSummary>;
  summary: FinancialSummary | null;
  issuerGroups: IssuerGroup[];
  grandTotalSpent: number;
  grandTotalIncome: number;
  netCashFlow: number;
  grandTxCount: number;
  monthlyTrends: MonthlyTrend[];
  topCategories: CategoryTotal[];
  spendingClaimText: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useReportsData(): ReportsData {
  const { userId } = useAuth();
  const [imports, setImports] = useState<Array<{ id: string; issuer: string | null; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scope = useMemo(() => allTimeRange(), []);
  const financial = useFinancialSummary(scope);

  // Statement list (labels only, no money): committed imports.
  const fetchImports = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase not available');
      const { data, error: e } = await sb
        .from('imports')
        .select('id, issuer, created_at, status')
        .eq('user_id', userId)
        .eq('status', 'committed')
        .order('created_at', { ascending: false });
      if (e) throw e;
      setImports(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchImports(); }, [fetchImports]);

  const refetch = useCallback(() => { void fetchImports(); financial.refetch(); }, [fetchImports, financial]);

  return useMemo(() => {
    const summary = hasFigures(financial) ? financial.summary : null;
    const perStatement = new Map((summary?.perStatement ?? []).map(p => [p.importId, p]));

    const statements: StatementSummary[] = imports.map(imp => {
      const p = perStatement.get(imp.id);
      return {
        importId: imp.id,
        issuer: imp.issuer || p?.label || 'Unknown',
        createdAt: imp.created_at,
        txCount: p ? p.count : 0,
        totalSpent: p ? p.actualSpending : null,
        totalIncome: p ? p.actualIncome : null,
        earliestDate: p?.periodStart ?? null,
        latestDate: p?.periodEnd ?? null,
      };
    });

    const issuerMap = new Map<string, StatementSummary[]>();
    for (const s of statements) {
      if (!issuerMap.has(s.issuer)) issuerMap.set(s.issuer, []);
      issuerMap.get(s.issuer)!.push(s);
    }
    const issuerGroups: IssuerGroup[] = Array.from(issuerMap.entries()).map(([issuer, stmts]) => ({
      issuer,
      statements: stmts,
      txCount: stmts.reduce((n, st) => n + st.txCount, 0), // a count, not money
    }));

    const claim = summary ? spendingClaim(summary.insights) : null;
    return {
      financial,
      summary,
      issuerGroups,
      grandTotalSpent: summary ? summary.labels.actualSpending.amount : 0,
      grandTotalIncome: summary ? summary.labels.actualIncome.amount : 0,
      netCashFlow: summary ? summary.labels.netCashFlow.amount : 0,
      grandTxCount: summary ? summary.transactionCount : 0,
      monthlyTrends: (summary?.periods ?? []).map(p => ({ month: p.label, spent: p.actualSpending, income: p.actualIncome })),
      topCategories: (summary?.spendingByCategory ?? []).slice(0, 8).map(c => ({ category: c.category, total: c.amount })),
      spendingClaimText: claim && summary ? insightText(claim, summary.wording) : null,
      loading: loading || financial.status === 'loading',
      error,
      refetch,
    };
  }, [imports, loading, error, financial, refetch]);
}
