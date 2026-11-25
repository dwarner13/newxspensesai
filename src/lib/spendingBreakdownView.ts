/**
 * P-UI-3 — display helpers for Prime's verified category breakdown (meta.financialVisual,
 * contract src/shared/prime-financial-visual.ts). Display only: every figure comes from the
 * validated payload; nothing is computed here except each row's share for the bar width.
 */
import { formatCalendarDate } from '@/lib/calendarDate';
import type { CategoryBreakdownVisual } from '@/shared/prime-financial-visual';

/** Category colours assigned client-side, in row order (rows arrive sorted, largest first). */
export const BREAKDOWN_COLORS = ['#22d3ee', '#c8a64e', '#a78bfa', '#34d399', '#f87171', '#94a3b8'] as const;

export function breakdownTitle(v: Pick<CategoryBreakdownVisual, 'period'>): string {
  if (!v.period) return 'Spending breakdown';
  const s = formatCalendarDate(v.period.start, 'short');
  const e = formatCalendarDate(v.period.end, 'medium');
  return s && e ? `Spending · ${s} – ${e}` : 'Spending breakdown';
}

export function formatBreakdownAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Share of the total, 0–100 (bar width only). */
export function breakdownShare(amount: number, total: number): number {
  if (!(total > 0) || !(amount > 0)) return 0;
  return Math.min(100, Math.round((amount / total) * 100));
}
