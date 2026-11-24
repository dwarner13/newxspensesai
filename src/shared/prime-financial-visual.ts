/**
 * P-1 item 4/5 — typed, validated financial visuals for Prime's chat (owner GO).
 *
 * Contract: a visual is DATA built server-side, deterministically, from a verified tool result.
 * The model never supplies numbers, HTML, JavaScript or chart code. The client validates the
 * payload again (validateFinancialVisual) before rendering, and renders nothing if it fails.
 *
 * v1 kind: 'category_breakdown' — spending by category from transaction_category_totals
 * (queryStatus 'verified', ordinary spending only, no single-category filter, ≥ 2 categories).
 * Rendered by the existing src/pages/PrimeChatV2/SpendingBreakdown.tsx.
 * Future kinds (e.g. 'period_comparison') extend the union; each needs its own owner GO.
 */

export const MAX_BREAKDOWN_ROWS = 6; // top 5 + "Other"

export interface CategoryBreakdownVisual {
  kind: 'category_breakdown';
  version: 1;
  source: 'transaction_category_totals';
  /** Inclusive dates of the verified rows (from the tool's dateRange). */
  period: { start: string; end: string } | null;
  currency: string;
  rows: Array<{ label: string; amount: number; count: number }>;
  /** Sum of the rows (ordinary spending only), computed in cents. */
  total: number;
  transactionCount: number;
}

export type FinancialVisual = CategoryBreakdownVisual;

type ToolRow = { category?: unknown; totalCents?: unknown; totalAmount?: unknown; transactionCount?: unknown; purpose?: unknown; direction?: unknown };
type ToolOutput = { categoryTotals?: unknown; queryStatus?: unknown; dateRange?: { start?: unknown; end?: unknown } | null; categoryFilter?: unknown } | null | undefined;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const toCents = (r: ToolRow): number | null => {
  if (typeof r.totalCents === 'number' && Number.isFinite(r.totalCents)) return Math.round(Math.abs(r.totalCents));
  if (typeof r.totalAmount === 'number' && Number.isFinite(r.totalAmount)) return Math.round(Math.abs(r.totalAmount) * 100);
  return null;
};
const cleanLabel = (v: unknown): string => {
  const s = typeof v === 'string' ? v.split('').filter(ch => ch.charCodeAt(0) >= 32 && ch !== '<' && ch !== '>').join('').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
  return s || 'Uncategorized';
};

/** Build a breakdown from a transaction_category_totals result, or null when it does not qualify. */
export function buildCategoryBreakdownVisual(output: ToolOutput, currency?: string | null): CategoryBreakdownVisual | null {
  if (!output || output.queryStatus !== 'verified') return null;
  if (typeof output.categoryFilter === 'string' && output.categoryFilter) return null; // single category ≠ breakdown
  const rows = Array.isArray(output.categoryTotals) ? (output.categoryTotals as ToolRow[]) : [];
  const spending = rows
    .filter(r => r && r.purpose === 'spending' && r.direction === 'outflow')
    .map(r => ({ label: cleanLabel(r.category), cents: toCents(r), count: typeof r.transactionCount === 'number' ? r.transactionCount : 0 }))
    .filter((r): r is { label: string; cents: number; count: number } => r.cents !== null && r.cents > 0);
  if (spending.length < 2) return null;
  spending.sort((a, b) => b.cents - a.cents);
  const head = spending.slice(0, MAX_BREAKDOWN_ROWS - 1);
  const tail = spending.slice(MAX_BREAKDOWN_ROWS - 1);
  if (tail.length === 1) head.push(tail[0]);
  else if (tail.length > 1) head.push({ label: 'Other', cents: tail.reduce((s, r) => s + r.cents, 0), count: tail.reduce((s, r) => s + r.count, 0) });
  const totalCents = spending.reduce((s, r) => s + r.cents, 0);
  const ds = output.dateRange?.start, de = output.dateRange?.end;
  const period = typeof ds === 'string' && typeof de === 'string' && ISO.test(ds) && ISO.test(de) && ds <= de ? { start: ds, end: de } : null;
  const cur = String(currency || 'CAD').toUpperCase();
  return {
    kind: 'category_breakdown',
    version: 1,
    source: 'transaction_category_totals',
    period,
    currency: CURRENCY.test(cur) ? cur : 'CAD',
    rows: head.map(r => ({ label: r.label, amount: r.cents / 100, count: r.count })),
    total: totalCents / 100,
    transactionCount: spending.reduce((s, r) => s + r.count, 0),
  };
}

/** Client-side guard: returns the visual only if it matches the contract exactly; else null. */
export function validateFinancialVisual(v: unknown): FinancialVisual | null {
  if (!v || typeof v !== 'object') return null;
  const x = v as Record<string, unknown>;
  if (x.kind !== 'category_breakdown' || x.version !== 1 || x.source !== 'transaction_category_totals') return null;
  if (typeof x.currency !== 'string' || !CURRENCY.test(x.currency)) return null;
  if (x.period !== null) {
    const p = x.period as Record<string, unknown> | undefined;
    if (!p || typeof p.start !== 'string' || typeof p.end !== 'string' || !ISO.test(p.start) || !ISO.test(p.end)) return null;
  }
  if (!Array.isArray(x.rows) || x.rows.length < 2 || x.rows.length > MAX_BREAKDOWN_ROWS) return null;
  let cents = 0;
  for (const r of x.rows as Array<Record<string, unknown>>) {
    if (!r || typeof r.label !== 'string' || !r.label || r.label.length > 40 || /[<>]/.test(r.label)) return null;
    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount <= 0) return null;
    if (typeof r.count !== 'number' || !Number.isInteger(r.count) || r.count < 0) return null;
    cents += Math.round(r.amount * 100);
  }
  if (typeof x.total !== 'number' || Math.round(x.total * 100) !== cents) return null; // rows must add up
  if (typeof x.transactionCount !== 'number' || !Number.isInteger(x.transactionCount)) return null;
  return v as FinancialVisual;
}
