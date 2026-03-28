import { useEffect, useState, useCallback, useMemo } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface StatementSummary {
  importId: string;
  issuer: string;
  createdAt: string;
  txCount: number;
  totalSpent: number;
  totalIncome: number;
  earliestDate: string | null;
  latestDate: string | null;
}

export interface IssuerGroup {
  issuer: string;
  statements: StatementSummary[];
  totalSpent: number;
  totalIncome: number;
  txCount: number;
}

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
  issuerGroups: IssuerGroup[];
  grandTotalSpent: number;
  grandTotalIncome: number;
  grandTxCount: number;
  monthlyTrends: MonthlyTrend[];
  topCategories: CategoryTotal[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function useReportsData(): ReportsData {
  const { userId } = useAuth();
  const [imports, setImports] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Supabase not available');

      const [impRes, txRes] = await Promise.all([
        sb.from('imports')
          .select('id, issuer, created_at, status')
          .eq('user_id', userId)
          .eq('status', 'committed')
          .order('created_at', { ascending: false }),
        sb.from('transactions')
          .select('id, import_id, amount, posted_at, category, type')
          .eq('user_id', userId),
      ]);

      if (impRes.error) throw impRes.error;
      if (txRes.error) throw txRes.error;

      setImports(impRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err: any) {
      console.error('[useReportsData] fetch error:', err);
      setError(err?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return useMemo(() => {
    if (loading || error) {
      return {
        issuerGroups: [], grandTotalSpent: 0, grandTotalIncome: 0, grandTxCount: 0,
        monthlyTrends: [], topCategories: [], loading, error, refetch: fetchData,
      };
    }

    // Build per-import summaries
    const txByImport = new Map<string, any[]>();
    for (const tx of transactions) {
      const key = tx.import_id || '__none__';
      if (!txByImport.has(key)) txByImport.set(key, []);
      txByImport.get(key)!.push(tx);
    }

    const summaries: StatementSummary[] = imports.map(imp => {
      const txs = txByImport.get(imp.id) || [];
      let totalSpent = 0;
      let totalIncome = 0;
      let earliest: string | null = null;
      let latest: string | null = null;

      for (const tx of txs) {
        const amt = Math.abs(Number(tx.amount) || 0);
        const isIncome = tx.type === 'income' || (tx.category || '').toLowerCase() === 'income';
        if (isIncome) totalIncome += amt;
        else totalSpent += amt;
        const d = tx.posted_at;
        if (d) {
          if (!earliest || d < earliest) earliest = d;
          if (!latest || d > latest) latest = d;
        }
      }

      return {
        importId: imp.id,
        issuer: imp.issuer || 'Unknown',
        createdAt: imp.created_at,
        txCount: txs.length,
        totalSpent,
        totalIncome,
        earliestDate: earliest,
        latestDate: latest,
      };
    });

    // Group by issuer
    const issuerMap = new Map<string, StatementSummary[]>();
    for (const s of summaries) {
      if (!issuerMap.has(s.issuer)) issuerMap.set(s.issuer, []);
      issuerMap.get(s.issuer)!.push(s);
    }
    const issuerGroups: IssuerGroup[] = Array.from(issuerMap.entries()).map(([issuer, stmts]) => ({
      issuer,
      statements: stmts,
      totalSpent: stmts.reduce((s, st) => s + st.totalSpent, 0),
      totalIncome: stmts.reduce((s, st) => s + st.totalIncome, 0),
      txCount: stmts.reduce((s, st) => s + st.txCount, 0),
    }));

    // Grand totals
    const grandTotalSpent = issuerGroups.reduce((s, g) => s + g.totalSpent, 0);
    const grandTotalIncome = issuerGroups.reduce((s, g) => s + g.totalIncome, 0);
    const grandTxCount = transactions.length;

    // Monthly trends
    const monthMap = new Map<string, { spent: number; income: number }>();
    for (const tx of transactions) {
      const d = tx.posted_at;
      if (!d) continue;
      const dt = new Date(d);
      const key = MONTH_NAMES[dt.getMonth()] + ' ' + dt.getFullYear();
      if (!monthMap.has(key)) monthMap.set(key, { spent: 0, income: 0 });
      const entry = monthMap.get(key)!;
      const amt = Math.abs(Number(tx.amount) || 0);
      const isInc = tx.type === 'income' || (tx.category || '').toLowerCase() === 'income';
      if (isInc) entry.income += amt;
      else entry.spent += amt;
    }
    const monthlyTrends: MonthlyTrend[] = Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, spent: Math.round(v.spent), income: Math.round(v.income) }))
      .sort((a, b) => {
        const pa = a.month.split(' ');
        const pb = b.month.split(' ');
        const ya = Number(pa[1]), yb = Number(pb[1]);
        if (ya !== yb) return ya - yb;
        return MONTH_NAMES.indexOf(pa[0]) - MONTH_NAMES.indexOf(pb[0]);
      });

    // Top categories (expenses only)
    const catMap = new Map<string, number>();
    for (const tx of transactions) {
      const isInc = tx.type === 'income' || (tx.category || '').toLowerCase() === 'income';
      if (isInc) continue;
      const amt = Math.abs(Number(tx.amount) || 0);
      const cat = tx.category || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + amt);
    }
    const topCategories: CategoryTotal[] = Array.from(catMap.entries())
      .map(([category, total]) => ({ category, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return {
      issuerGroups, grandTotalSpent, grandTotalIncome, grandTxCount,
      monthlyTrends, topCategories, loading, error, refetch: fetchData,
    };
  }, [imports, transactions, loading, error, fetchData]);
}
