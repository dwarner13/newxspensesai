/**
 * C2-E2A-F1 — bring the transaction Prime asked Tag to review into view on Transactions.
 *
 * If the current filters hide it, switch to filters that list it (its own year, other
 * filters cleared) — once, never looping. If it is beyond the rendered "load more" rows,
 * extend them. Then scroll its row (`[data-tx-id]`) to the centre. A transaction that is
 * not in the loaded set is never invented as a row; Tag still focuses the verified record.
 */
import { useEffect, useRef } from 'react';
import { filtersRevealing, visibleCountFor, type TxListFilters } from '@/lib/tagReview';

type TxLike = { id: string; date?: string | null; posted_at?: string | null };

export function useRevealReviewedTransaction(p: {
  highlightTxId: string | null;
  transactions: TxLike[];
  filtered: TxLike[];
  visibleCount: number;
  setVisibleCount: (n: number) => void;
  applyFilters: (f: TxListFilters) => void;
}): void {
  const { highlightTxId, transactions, filtered, visibleCount, setVisibleCount, applyFilters } = p;
  const revealedRef = useRef<string | null>(null);
  const filterResetRef = useRef<string | null>(null);

  useEffect(() => {
    if (!highlightTxId) { revealedRef.current = null; filterResetRef.current = null; return; }
    if (revealedRef.current === highlightTxId) return;
    const tx = transactions.find(t => t.id === highlightTxId);
    if (!tx) return;
    const idx = filtered.findIndex(t => t.id === highlightTxId);
    if (idx === -1) {
      if (filterResetRef.current === highlightTxId) return; // already reset once; never loop
      filterResetRef.current = highlightTxId;
      applyFilters(filtersRevealing(tx.date || tx.posted_at));
      return;
    }
    const need = visibleCountFor(idx, visibleCount);
    if (need !== visibleCount) { setVisibleCount(need); return; }
    revealedRef.current = highlightTxId;
    const id = highlightTxId;
    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-tx-id="${CSS.escape(id)}"]`);
      if (!el) return;
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
  }, [highlightTxId, transactions, filtered, visibleCount, setVisibleCount, applyFilters]);
}
