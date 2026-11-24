/**
 * L-D3 — statement period from EXISTING metadata (owner conditional GO 2026-11-24; sources and
 * meaning verified by Attachments HQ). Pure; shared by Prime (L-B/L-C) and the transaction drawer.
 *
 * Order (first that applies):
 *  1. imports.statement_breakdown_json.statement_meta.period_start/end      (ISO, written at commit)
 *  2. user_documents.extracted_data.claude_vision.period.{start,end}         (ISO, Vision extraction)
 *  3. user_documents.metadata.statement_summary.statement_period             (text AS PRINTED)
 *       - always shown verbatim, labelled "as printed on the statement";
 *       - a date range is derived ONLY from an unambiguous parse (ISO or month-name dates);
 *         numeric d/m vs m/d forms are never guessed.
 *  4. otherwise: not recorded.
 * No backfill, no second store, no guessing.
 */

export type StatementPeriodSource = 'statement_meta' | 'vision_extraction' | 'document_period' | 'printed_text' | 'none';

export interface StatementPeriod {
  start: string | null;
  end: string | null;
  /** Verbatim printed text when that is the source (shown as-is; whitespace collapsed). */
  printedText: string | null;
  /**
   * True when the printed text is a single "period ending" date (stored as "X - X", e.g. BMO's
   * "For the period ending Oct 15, 2025"). The start is unknown, so it never counts as coverage.
   */
  printedEndingOnly: boolean;
  source: StatementPeriodSource;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

function isoOf(y: number, m: number, d: number): string | null {
  if (!(y >= 1990 && y <= 2100) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null; // reject Feb 30 etc.
  return dt.toISOString().slice(0, 10);
}

/** One unambiguous date: ISO, "Oct 15, 2025", "October 15 2025", "15 Oct 2025". Numeric d/m forms → null. */
export function parseUnambiguousDate(text: string): string | null {
  // Normalize whitespace and "Oct 15,2025" → "Oct 15, 2025" (no ambiguity introduced).
  const t = String(text || '').trim().replace(/\s+/g, ' ').replace(/,\s*/g, ', ');
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return isoOf(+m[1], +m[2], +m[3]);
  m = t.match(/^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/);
  if (m && MONTHS[m[1].toLowerCase()]) return isoOf(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  m = t.match(/^(\d{1,2}) ([A-Za-z]{3,9})\.?,? (\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()]) return isoOf(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  return null;
}

/** "Oct 15, 2025 - Nov 14, 2025" / "Oct 15, 2025 to Nov 14, 2025" → ISO range, only if BOTH ends are unambiguous. */
export function parsePrintedPeriod(text: string): { start: string; end: string } | null {
  const parts = String(text || '').split(/\s+(?:-|–|—|to|through)\s+/i);
  if (parts.length !== 2) return null;
  const start = parseUnambiguousDate(parts[0]);
  const end = parseUnambiguousDate(parts[1]);
  return start && end && start <= end ? { start, end } : null;
}

const iso = (v: unknown): string | null => (typeof v === 'string' && ISO.test(v.slice(0, 10)) ? v.slice(0, 10) : null);

export function resolveStatementPeriod(input: {
  statementMeta?: { period_start?: unknown; period_end?: unknown } | null;
  visionPeriod?: { start?: unknown; end?: unknown } | null;
  /** Legacy user_documents.period_start/end columns (ISO; nothing writes them today). */
  documentPeriod?: { start?: unknown; end?: unknown } | null;
  printedPeriod?: unknown;
}): StatementPeriod {
  const ms = iso(input.statementMeta?.period_start), me = iso(input.statementMeta?.period_end);
  if (ms && me) return { start: ms, end: me, printedText: null, printedEndingOnly: false, source: 'statement_meta' };
  const vs = iso(input.visionPeriod?.start), ve = iso(input.visionPeriod?.end);
  if (vs && ve && vs <= ve) return { start: vs, end: ve, printedText: null, printedEndingOnly: false, source: 'vision_extraction' };
  const ds = iso(input.documentPeriod?.start), de = iso(input.documentPeriod?.end);
  // Legacy columns have their own provenance label (nothing writes them today).
  if (ds && de && ds <= de) return { start: ds, end: de, printedText: null, printedEndingOnly: false, source: 'document_period' };
  const printed = typeof input.printedPeriod === 'string' ? input.printedPeriod.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  if (printed) {
    const r = parsePrintedPeriod(printed);
    // "X - X" is how a single "period ending X" is stored: an END date only. Never a one-day range,
    // never coverage; shown as the printed ending date.
    if (r && r.start === r.end) {
      const endingText = printed.split(/\s+(?:-|–|—|to|through)\s+/i)[0].trim();
      return { start: null, end: null, printedText: endingText, printedEndingOnly: true, source: 'printed_text' };
    }
    return { start: r?.start ?? null, end: r?.end ?? null, printedText: printed, printedEndingOnly: false, source: 'printed_text' };
  }
  return { start: null, end: null, printedText: null, printedEndingOnly: false, source: 'none' };
}
