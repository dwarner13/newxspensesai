/**
 * Shared presentation helpers for Transactions UI (issuer pills, category accents).
 */

/** Clean statement / issuer labels for filter pills. */
export function sanitizeIssuerPillLabel(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return 'Unknown';
  const lower = s.toLowerCase();
  if (lower.includes('nsaction')) return 'Unknown';
  if (s.length > 30) return 'Unknown';
  return s;
}

/** Background class for category dot in transaction feed (Tailwind). */
export function categoryDotClass(category: string | null | undefined): string {
  const c = String(category || 'Other').trim();
  const map: Record<string, string> = {
    Income: 'bg-emerald-500',
    Groceries: 'bg-amber-500',
    'Food & Dining': 'bg-orange-500',
    Transportation: 'bg-blue-500',
    Shopping: 'bg-purple-500',
    Subscriptions: 'bg-indigo-500',
    'Personal Care': 'bg-pink-500',
    Healthcare: 'bg-red-500',
    'Bank Fees': 'bg-slate-500',
    Transfers: 'bg-slate-600',
    Uncategorized: 'bg-slate-500',
    Other: 'bg-slate-500',
  };
  return map[c] || 'bg-slate-500';
}
