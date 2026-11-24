/**
 * LIVE-UI-04 — Account and Statement facts for the transaction drawer.
 *
 * The statement period uses Prime HQ's shared rule (src/shared/statement-period.ts,
 * resolveStatementPeriod, L-D3), so the drawer and Prime always agree. Order:
 *   1. imports.statement_breakdown_json.statement_meta.period_start / period_end
 *   2. user_documents.extracted_data.claude_vision.period.{start,end}
 *   3. user_documents.period_start / period_end (legacy columns; usually empty)
 *   4. user_documents.metadata.statement_summary.statement_period, shown verbatim "(as printed)";
 *      a single "period ending" date reads "Period ending <date> (as printed)"
 *   5. otherwise "Statement period unavailable"
 * Never derived from transaction dates, file names or the issuer. The drawer selects only
 * those JSON paths (no OCR text); any query error degrades to "unavailable".
 */
import { formatCalendarDate } from '@/lib/calendarDate';
import { resolveStatementPeriod, type StatementPeriod } from '@/shared/statement-period';

export const STATEMENT_PERIOD_UNAVAILABLE = 'Statement period unavailable';

export interface StatementFacts {
  /** "BMO" or null */
  issuer: string | null;
  /** "1234" or null */
  last4: string | null;
  /** "May 17 – Jun 16, 2025", printed text, or null when not recorded */
  period: string | null;
  /** true when `period` is the statement's own printed text */
  periodAsPrinted?: boolean;
}

export function formatStatementPeriod(start: unknown, end: unknown): string | null {
  const s = formatCalendarDate(typeof start === 'string' ? start : null, 'short');
  const e = formatCalendarDate(typeof end === 'string' ? end : null, 'medium');
  return s && e ? `${s} – ${e}` : null;
}

/** Display text for a resolved period (shared rule's result). */
export function periodDisplay(p: StatementPeriod): { period: string | null; periodAsPrinted: boolean } {
  if (p.source === 'printed_text' && p.printedText) {
    return { period: p.printedEndingOnly ? `Period ending ${p.printedText}` : p.printedText, periodAsPrinted: true };
  }
  if (p.start && p.end) return { period: formatStatementPeriod(p.start, p.end), periodAsPrinted: false };
  return { period: null, periodAsPrinted: false };
}

export function factsFromStatementMeta(meta: unknown, sanitizeIssuer: (s: string) => string): StatementFacts {
  const m = (meta && typeof meta === 'object' ? meta : {}) as Record<string, unknown>;
  const issuerRaw = String(m.issuer || m.bank_name || '').trim();
  const last4 = String(m.account_last4 || '').replace(/\D/g, '').slice(-4);
  return {
    issuer: issuerRaw.length > 1 ? sanitizeIssuer(issuerRaw) : null,
    last4: last4.length === 4 ? last4 : null,
    ...periodDisplay(resolveStatementPeriod({ statementMeta: m as { period_start?: unknown; period_end?: unknown } })),
  };
}

/** Fill a missing period from the import's document, using the shared rule's remaining sources. */
export function withDocumentPeriod(
  f: StatementFacts,
  doc: { vision_period?: unknown; printed_period?: unknown; period_start?: unknown; period_end?: unknown } | null | undefined,
): StatementFacts {
  if (f.period || !doc) return f;
  const vp = (doc.vision_period && typeof doc.vision_period === 'object' ? doc.vision_period : null) as { start?: unknown; end?: unknown } | null;
  const p = resolveStatementPeriod({
    visionPeriod: vp,
    documentPeriod: { start: doc.period_start, end: doc.period_end },
    printedPeriod: doc.printed_period,
  });
  const d = periodDisplay(p);
  return d.period ? { ...f, ...d } : f;
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
