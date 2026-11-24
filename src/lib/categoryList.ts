/**
 * K-a — pure helpers for the compact Categories list (no React).
 */

/** Share of total expenses as a whole percent (0–100); 0 when there is no total. */
export function categoryShare(spent: number, totalSpent: number): number {
  if (!(totalSpent > 0) || !(spent > 0)) return 0;
  return Math.min(100, Math.round((spent / totalSpent) * 100));
}

/** "↑12%" / "↓5%" / "" with a tone; small moves are neutral. */
export function trendLabel(trend: number): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (!trend) return { text: '', tone: 'flat' };
  const text = `${trend > 0 ? '↑' : '↓'}${Math.abs(trend)}%`;
  if (trend > 10) return { text, tone: 'up' };
  if (trend < -5) return { text, tone: 'down' };
  return { text, tone: 'flat' };
}

/** "Jun 2025" from "2025-06". */
export function formatMonthPeriod(p: string): string {
  const [year, month] = String(p).split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = Number(month);
  return m >= 1 && m <= 12 ? `${months[m - 1]} ${year}` : String(p);
}
