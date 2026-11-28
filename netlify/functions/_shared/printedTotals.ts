/**
 * Printed statement totals: keep EVERY source, never let one overwrite another
 * (owner GO 2026-11-26; AR-1c §C5 direction). SERVER-ONLY, pure.
 *
 * Sources of bank-printed totals for one import:
 *   - 'claude_vision'  : Claude Vision's statementSummary (same response as the extracted rows,
 *                        so NOT independent of the row extractor);
 *   - flat-text        : totals read from the Google Vision OCR text by a text parser
 *                        (today parseBmoStatementTotals; its `source` names the strategy).
 *                        Independent of the row extractor.
 *
 * Storage on imports.statement_breakdown_json:
 *   - printedTotalsSources: { claude_vision?: T, ocr_text?: T }  — one entry per source family,
 *     refreshed only by that same family, never removed by another (the evidence record).
 *   - statementTotals: unchanged contract for every existing reader (the commit-import gate,
 *     tx-update-amount, ReviewStatementPage, statementReview): Vision when present, otherwise
 *     the flat-text totals. Deciding "reconciled" vs "reconciled_same_source" is AR-1c §C5's
 *     staged-reconciliation work and is NOT changed here.
 *   - flatTextTotals: the existing diagnostic key, now always kept when flat-text totals exist
 *     (previously lost when Vision overwrote statementTotals).
 */

export type PrintedTotals = {
  totalDeducted: number | null;
  totalAdded: number | null;
  openingBalance?: number | null;
  closingBalance?: number | null;
  source: string;
};

export const VISION_TOTALS_SOURCE = 'claude_vision';
/**
 * Source family = extraction CHANNEL (AR-1c §C5 ruling): Claude reading the PDF and Google Vision OCR
 * text are different channels; two parsers over the same OCR text are the same channel.
 * 'native_pdf_text' is reserved for future totals read from the PDF's own text layer (separate
 * channel from Google OCR text); nothing writes it yet.
 */
export type PrintedTotalsFamily = 'claude_vision' | 'ocr_text' | 'native_pdf_text';
/**
 * Channel that produced the staged ROWS. ai_fallback and the text parsers read the Google OCR
 * text, so they are 'ocr_text'; the OpenAI vision parser reads the document images itself.
 */
export type RowsSource = 'claude_vision' | 'ocr_text' | 'openai_vision';
const FAMILIES: readonly PrintedTotalsFamily[] = ['claude_vision', 'ocr_text', 'native_pdf_text'];

export function totalsFamily(t: { source?: unknown } | null | undefined): PrintedTotalsFamily | null {
  if (!t || typeof t !== 'object') return null;
  const s = (t as { source?: unknown }).source;
  if (typeof s !== 'string' || !s) return null;
  return s === VISION_TOTALS_SOURCE ? 'claude_vision' : 'ocr_text';
}

type Sbd = Record<string, unknown>;

/**
 * Returns a NEW statement_breakdown_json with `totals` recorded, preserving every other source.
 * Never removes keys; never lets one family overwrite another family's evidence.
 */
export function mergePrintedTotals(existing: Sbd | null | undefined, totals: PrintedTotals): Sbd {
  const sbd: Sbd = existing && typeof existing === 'object' ? { ...existing } : {};
  const family = totalsFamily(totals);
  if (!family) return sbd;
  const stamped = { ...totals };

  const prevSources = sbd.printedTotalsSources && typeof sbd.printedTotalsSources === 'object'
    ? { ...(sbd.printedTotalsSources as Record<string, unknown>) }
    : {};
  // Migrate evidence written before this change: a flat-text statementTotals or flatTextTotals.
  const current = sbd.statementTotals as PrintedTotals | undefined;
  if (totalsFamily(current) === 'ocr_text' && !prevSources.ocr_text) prevSources.ocr_text = current;
  if (totalsFamily(sbd.flatTextTotals as PrintedTotals | undefined) === 'ocr_text' && !prevSources.ocr_text) {
    prevSources.ocr_text = sbd.flatTextTotals;
  }
  if (totalsFamily(current) === 'claude_vision' && !prevSources.claude_vision) prevSources.claude_vision = current;

  prevSources[family] = stamped;
  sbd.printedTotalsSources = prevSources;
  const prevCheck = sbd.printedTotalsCheck as { rowsSource?: RowsSource } | undefined;

  if (family === 'claude_vision') {
    // Existing contract: Vision totals are what the gate reads today.
    sbd.statementTotals = stamped;
  } else {
    // Flat-text totals never overwrite Vision totals.
    if (!current || totalsFamily(current) !== 'claude_vision') sbd.statementTotals = stamped;
  }
  // The diagnostic key always carries the independent OCR-text totals when they exist.
  if (prevSources.ocr_text) sbd.flatTextTotals = prevSources.ocr_text;
  sbd.printedTotalsCheck = comparePrintedTotalsSources(prevSources as Record<string, PrintedTotals | undefined>, prevCheck?.rowsSource);
  return sbd;
}

/**
 * Records which channel produced the staged rows (known only after extraction) and recomputes
 * independence. Returns a NEW breakdown; printed totals themselves are untouched.
 */
export function recordRowsSource(existing: Sbd | null | undefined, rowsSource: RowsSource): Sbd {
  const sbd: Sbd = existing && typeof existing === 'object' ? { ...existing } : {};
  const sources = (sbd.printedTotalsSources && typeof sbd.printedTotalsSources === 'object'
    ? sbd.printedTotalsSources
    : {}) as Record<string, PrintedTotals | undefined>;
  sbd.printedTotalsCheck = comparePrintedTotalsSources(sources, rowsSource);
  return sbd;
}

/** normalize's viaMethod → rows channel. */
export function rowsSourceFromViaMethod(viaMethod: string): RowsSource {
  if (viaMethod === 'claude-vision') return 'claude_vision';
  if (viaMethod === 'vision-parse') return 'openai_vision';
  return 'ocr_text';
}

export const PRINTED_TOTALS_TOLERANCE = 0.05;

export type PrintedTotalsCheck = {
  /** Source families present (e.g. ['claude_vision', 'ocr_text']). */
  sources: PrintedTotalsFamily[];
  /** Channel that produced the staged rows; absent until extraction has run. */
  rowsSource?: RowsSource;
  /** Families from a different channel than rowsSource ([] while rowsSource is unknown). */
  independentSources: PrintedTotalsFamily[];
  /** 'agree' / 'disagree' when two sources have both totals; 'single_source' otherwise. */
  comparison: 'agree' | 'disagree' | 'single_source';
  tolerance: number;
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * Compares the printed-total sources. It decides nothing about reconciliation status — AR-1c §C5
 * consumes this ("reconciled" only against an independent source, else "reconciled_same_source";
 * independent sources that disagree hold the import).
 */
export function comparePrintedTotalsSources(sources: Record<string, PrintedTotals | undefined>, rowsSource?: RowsSource): PrintedTotalsCheck {
  const families = FAMILIES.filter((f) => sources[f]);
  // Independence is relative to the channel that produced the ROWS; unknown rows channel → none.
  const independentSources = rowsSource ? families.filter((f) => f !== rowsSource) : [];
  let comparison: PrintedTotalsCheck['comparison'] = 'single_source';
  const v = sources.claude_vision;
  const o = sources.ocr_text;
  if (v && o) {
    const pairs = [[num(v.totalDeducted), num(o.totalDeducted)], [num(v.totalAdded), num(o.totalAdded)]];
    if (pairs.every(([a, b]) => a !== null && b !== null)) {
      comparison = pairs.every(([a, b]) => Math.abs(Math.abs(a as number) - Math.abs(b as number)) <= PRINTED_TOTALS_TOLERANCE)
        ? 'agree'
        : 'disagree';
    }
  }
  return { sources: [...families], ...(rowsSource ? { rowsSource } : {}), independentSources: [...independentSources], comparison, tolerance: PRINTED_TOTALS_TOLERANCE };
}
