/**
 * The ONE client hook for financial figures (FST-2; owner GO 2026-11-26). Every financial screen
 * reads its totals, labels, categories, coverage and insights from here. No screen computes money.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFinancialSummary, type SummaryRequest, type SummaryResult } from '@/lib/financialSummary';

export type AggregateState = { status: 'loading' } | SummaryResult;

export function useFinancialSummary(req: SummaryRequest | null): AggregateState & { refetch: () => void } {
  const { userId } = useAuth();
  const [state, setState] = useState<AggregateState>({ status: 'loading' });
  const [nonce, setNonce] = useState(0);
  const key = req ? `${req.startDate}|${req.endDate}|${(req.importIds ?? []).slice().sort().join(',')}` : '';

  useEffect(() => {
    if (!req || !userId) return;
    let live = true;
    setState({ status: 'loading' });
    void fetchFinancialSummary(req).then(r => { if (live) setState(r); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, userId, nonce]);

  // Same refresh signals the rest of the app already uses after a verified save.
  useEffect(() => {
    const again = () => setNonce(n => n + 1);
    window.addEventListener('transactions:refresh', again);
    window.addEventListener('tag:stats-refresh', again);
    return () => {
      window.removeEventListener('transactions:refresh', again);
      window.removeEventListener('tag:stats-refresh', again);
    };
  }, []);

  const refetch = useCallback(() => setNonce(n => n + 1), []);
  return { ...state, refetch };
}
