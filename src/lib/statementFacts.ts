/**
 * LIVE-UI-04 — Account and Statement facts for the transaction drawer.
 *
 * Statement period comes only from verified sources, in this order (same as Prime's L-B):
 *   1. imports.statement_breakdown_json.statement_meta.period_start / period_end
 *   2. user_documents.period_start / period_end for the import's document
 *   3. otherwise "Statement period unavailable"
 * It is never derived from transaction dates, and the Statement cell never repeats the
 * issuer (the old fallback showed "BMO" for both Account and Statement).
 */
import { formatCalendarDate } from '@/lib/calendarDate';

export const STATEMENT_PERIOD_UNAVAILABLE = 'Statement period unavailable';

export interface StatementFacts {
  /** "BMO" or null */
  issuer: string | null;
  /** "1234" or null */
  last4: string | null;
  /** "May 17 – Jun 16, 2025" or null when not recorded */
  period: string | null;
}

export function formatStatementPeriod(start: unknown, end: unknown): string | null {
  const s = formatCalendarDate(typeof start === 'string' ? start : null, 'short');
  const e = formatCalendarDate(typeof end === 'string' ? end : null, 'medium');
  return s && e ? `${s} – ${e}` : null;
}

export function factsFromStatementMeta(meta: unknown, sanitizeIssuer: (s: string) => string): StatementFacts {
  const m = (meta && typeof meta === 'object' ? meta : {}) as Record<string, unknown>;
  const issuerRaw = String(m.issuer || m.bank_name || '').trim();
  const last4 = String(m.account_last4 || '').replace(/\D/g, '').slice(-4);
  return {
    issuer: issuerRaw.length > 1 ? sanitizeIssuer(issuerRaw) : null,
    last4: last4.length === 4 ? last4 : null,
    period: formatStatementPeriod(m.period_start, m.period_end),
  };
}

/** Account cell text, or null when nothing verified is known. */
export function accountText(f: StatementFacts | null): string | null {
  if (!f) return null;
  const t = [f.issuer, f.last4 ? `•••• ${f.last4}` : null].filter(Boolean).join(' ');
  return t || null;
}

/** Statement cell text: the verified period, or the explicit "unavailable" wording. */
export function statementText(f: StatementFacts | null): string {
  return f?.period || STATEMENT_PERIOD_UNAVAILABLE;
}
