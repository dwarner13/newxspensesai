/**
 * LIVE-UI-04 — Account and Statement facts for the transaction drawer.
 *
 * Statement period comes only from verified sources, in this order (agreed with Prime HQ
 * and Attachments HQ; same as Prime's statement inventory, L-D3):
 *   1. imports.statement_breakdown_json.statement_meta.period_start / period_end
 *   2. user_documents.extracted_data.claude_vision.period.{start,end} (ISO, Vision extraction)
 *   3. user_documents.metadata.statement_summary.statement_period, verbatim, "(as printed)"
 *   4. otherwise "Statement period unavailable"
 * Only those JSON paths are selected (never the whole extracted_data / metadata, which can
 * hold OCR text). Any query error degrades to "unavailable".
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
  /** true when `period` is the statement's own printed text, shown verbatim */
  periodAsPrinted?: boolean;
}

export const PRINTED_PERIOD_MAX = 60;

/**
 * Period text exactly as printed on the statement (metadata.statement_summary.statement_period).
 * Shown verbatim (whitespace collapsed, length-capped); never re-parsed into dates here.
 */
export function printedPeriodText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let t = value.replace(/\s+/g, ' ').trim();
  if (t.length < 4) return null;
  // BMO "For the period ending Oct 15, 2025" is stored as "Oct 15, 2025 - Oct 15, 2025";
  // shown verbatim it reads as a one-day period.
  const halves = t.split(/\s+[-–—]\s+|\s+to\s+/i);
  if (halves.length === 2 && halves[0].trim().toLowerCase() === halves[1].trim().toLowerCase()) {
    t = `Period ending ${halves[1].trim()}`;
  }
  return t.length > PRINTED_PERIOD_MAX ? `${t.slice(0, PRINTED_PERIOD_MAX - 1).trimEnd()}…` : t;
}

/**
 * Fill a missing period from the import's document, in the agreed order (same as Prime's
 * statement inventory, L-D3): Claude Vision's extracted ISO period, then the printed text.
 */
export function withDocumentPeriod(f: StatementFacts, doc: { vision_period?: unknown; printed_period?: unknown } | null | undefined): StatementFacts {
  if (f.period || !doc) return f;
  const vp = (doc.vision_period && typeof doc.vision_period === 'object' ? doc.vision_period : {}) as Record<string, unknown>;
  const vision = formatStatementPeriod(vp.start, vp.end);
  if (vision) return { ...f, period: vision, periodAsPrinted: false };
  const printed = printedPeriodText(doc.printed_period);
  if (printed) return { ...f, period: printed, periodAsPrinted: true };
  return f;
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
  if (!f?.period) return STATEMENT_PERIOD_UNAVAILABLE;
  return f.periodAsPrinted ? `${f.period} (as printed)` : f.period;
}
