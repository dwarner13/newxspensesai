/**
 * Coverage-gated comparisons and typed insights (owner GO 2026-11-26, UNIFIED FINANCIAL ENGINE;
 * design: AI Architecture HQ). Built ON the existing statement coverage (statement-coverage.ts:
 * summarizeStatementCoverage / coverageForPeriod), not a second coverage model. Shared by
 * financial-summary (every screen) and the chat path (every employee), so cards and chat can never
 * disagree about whether a comparison may be made.
 *
 * Coverage is the statements' own periods (completed imports only). A completed import without a
 * recorded period makes coverage UNKNOWN, so nothing is comparable (never inferred from transaction
 * dates).
 *
 * Comparability (exact rule):
 *  - one account: its consecutive statement periods;
 *  - several accounts: calendar months that every account fully covers (coverageForPeriod 'complete');
 *  - two periods are comparable when both qualify, cover the same accounts, do not overlap, and their
 *    lengths differ by at most 15%.
 * Thresholds (server-side only): a trend needs 2 comparable periods and a change of at least 10%;
 * "stable" needs 3 comparable periods with every consecutive change under 10%.
 */
import { coverageForPeriod, type StatementCoverage } from './statement-coverage';
import { buildPeriodAggregate, type AggregateRow, type PeriodAggregate } from './period-aggregate';

export interface ComparablePeriod { start: string; end: string; label: string; accounts: string[] }

export const TREND_MIN_PERIODS = 2;
export const STABLE_MIN_PERIODS = 3;
export const TREND_THRESHOLD = 0.10;
export const LENGTH_TOLERANCE = 0.15;

const dayNum = (d: string) => Math.floor(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000);
const fromDay = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
const length = (p: { start: string; end: string }) => dayNum(p.end) - dayNum(p.start) + 1;

/** The periods that may be compared, oldest first. */
export function comparablePeriods(cov: StatementCoverage): ComparablePeriod[] {
  if (cov.status !== 'ok' || cov.importsTruncated || cov.accounts.length === 0 || cov.completedWithoutPeriod > 0) return [];
  if (cov.accounts.length === 1) {
    const a = cov.accounts[0];
    return (a.periods ?? []).map(p => ({ start: p.start, end: p.end, label: `${p.start} to ${p.end}`, accounts: [a.label] }));
  }
  const first = cov.accounts.map(a => a.earliestPeriodStart!).sort()[0];
  const last = cov.accounts.map(a => a.latestPeriodEnd!).sort().slice(-1)[0];
  const out: ComparablePeriod[] = [];
  let y = +first.slice(0, 4); let m = +first.slice(5, 7);
  for (let guard = 0; guard < 600; guard++) {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    if (start > last) break;
    const ny = m === 12 ? y + 1 : y; const nm = m === 12 ? 1 : m + 1;
    const end = fromDay(dayNum(`${ny}-${String(nm).padStart(2, '0')}-01`) - 1);
    if (coverageForPeriod(cov, start, end).overall === 'complete') {
      out.push({ start, end, label: start.slice(0, 7), accounts: cov.accounts.map(a => a.label) });
    }
    y = ny; m = nm;
  }
  return out;
}

export function canCompare(a: ComparablePeriod, b: ComparablePeriod): boolean {
  const same = a.accounts.length === b.accounts.length && a.accounts.every(k => b.accounts.includes(k));
  const overlap = !(a.end < b.start || b.end < a.start);
  return same && !overlap && Math.abs(length(a) - length(b)) / Math.max(length(a), length(b)) <= LENGTH_TOLERANCE;
}

/** Comparable periods restricted to consecutive comparable pairs (oldest first). */
function comparableChain(periods: ComparablePeriod[]): ComparablePeriod[] {
  const chain: ComparablePeriod[] = [];
  for (const p of periods) {
    if (chain.length && !canCompare(chain[chain.length - 1], p)) chain.length = 0;
    chain.push(p);
  }
  return chain;
}

// ── Typed insights (clients render them from a fixed wording table; no client thresholds) ──

export type InsightKind = 'trend' | 'stable' | 'top_category' | 'needs_review' | 'not_enough_history';
export interface Insight {
  kind: InsightKind;
  subject: 'actual_spending' | 'category' | 'transactions';
  category?: string;
  direction?: 'up' | 'down';
  /** Rounded % change (trend) or share of spending (top_category). */
  percent?: number;
  count?: number;
  periods?: Array<{ start: string; end: string }>;
  coverage: { complete: boolean; periodsAvailable: number; periodsRequired: number };
}

export interface PeriodFigures { start: string; end: string; label: string; agg: PeriodAggregate }

export function periodFigures(rows: ReadonlyArray<AggregateRow>, periods: ReadonlyArray<ComparablePeriod>): PeriodFigures[] {
  return periods.map(p => ({
    start: p.start, end: p.end, label: p.label,
    agg: buildPeriodAggregate(rows, { fetch: { complete: true, truncated: false, rowsFetched: rows.length }, period: { start: p.start, end: p.end } }),
  }));
}

export function buildInsights(totals: PeriodAggregate, figures: ReadonlyArray<PeriodFigures>, unresolvedCount: number): Insight[] {
  const out: Insight[] = [];
  const chain = comparableChain(figures.map(f => ({ start: f.start, end: f.end, label: f.label, accounts: ['*'] })));
  const usable = figures.slice(figures.length - chain.length);
  const n = usable.length;
  const s = usable.map(f => f.agg.cents.spending);
  const change = (a: number, b: number) => (a > 0 ? (b - a) / a : null);
  const recent = n >= TREND_MIN_PERIODS ? change(s[n - 2], s[n - 1]) : null;

  if (recent === null) {
    out.push({ kind: 'not_enough_history', subject: 'actual_spending', coverage: { complete: false, periodsAvailable: n, periodsRequired: TREND_MIN_PERIODS } });
  } else if (Math.abs(recent) >= TREND_THRESHOLD) {
    out.push({ kind: 'trend', subject: 'actual_spending', direction: recent > 0 ? 'up' : 'down', percent: Math.round(recent * 100), periods: usable.slice(-2).map(f => ({ start: f.start, end: f.end })), coverage: { complete: true, periodsAvailable: n, periodsRequired: TREND_MIN_PERIODS } });
  } else if (n >= STABLE_MIN_PERIODS && s.slice(-STABLE_MIN_PERIODS).every((v, i, a) => i === 0 || (change(a[i - 1], v) !== null && Math.abs(change(a[i - 1], v)!) < TREND_THRESHOLD))) {
    out.push({ kind: 'stable', subject: 'actual_spending', periods: usable.slice(-STABLE_MIN_PERIODS).map(f => ({ start: f.start, end: f.end })), coverage: { complete: true, periodsAvailable: n, periodsRequired: STABLE_MIN_PERIODS } });
  } else {
    out.push({ kind: 'not_enough_history', subject: 'actual_spending', coverage: { complete: false, periodsAvailable: n, periodsRequired: STABLE_MIN_PERIODS } });
  }

  const spendCats = totals.categories.filter(c => c.purpose === 'spending');
  if (spendCats.length && totals.cents.spending > 0) {
    const top = spendCats[0];
    out.push({ kind: 'top_category', subject: 'category', category: top.category, percent: Math.round((top.totalCents / totals.cents.spending) * 100), count: top.count, coverage: { complete: true, periodsAvailable: n, periodsRequired: 0 } });
  }
  if (unresolvedCount > 0) out.push({ kind: 'needs_review', subject: 'transactions', count: unresolvedCount, coverage: { complete: true, periodsAvailable: n, periodsRequired: 0 } });
  return out;
}

/**
 * Category-level trend / stable claims for the top-N spending categories (UI/UX Q2). Same thresholds
 * and the same comparable chain as actual spending; nothing is emitted without passing coverage.
 */
export function buildCategoryInsights(figures: ReadonlyArray<PeriodFigures>, categories: readonly string[]): Insight[] {
  const chain = comparableChain(figures.map(f => ({ start: f.start, end: f.end, label: f.label, accounts: ['*'] })));
  const usable = figures.slice(figures.length - chain.length);
  const n = usable.length;
  if (n < TREND_MIN_PERIODS) return [];
  const out: Insight[] = [];
  const centsFor = (f: PeriodFigures, cat: string) => f.agg.categories.filter(c => c.purpose === 'spending' && c.category === cat).reduce((s, c) => s + c.totalCents, 0);
  for (const cat of categories) {
    const s = usable.map(f => centsFor(f, cat));
    const ch = (a: number, b: number) => (a > 0 ? (b - a) / a : null);
    const recent = ch(s[n - 2], s[n - 1]);
    if (recent !== null && Math.abs(recent) >= TREND_THRESHOLD) {
      out.push({ kind: 'trend', subject: 'category', category: cat, direction: recent > 0 ? 'up' : 'down', percent: Math.round(recent * 100), periods: usable.slice(-2).map(f => ({ start: f.start, end: f.end })), coverage: { complete: true, periodsAvailable: n, periodsRequired: TREND_MIN_PERIODS } });
    } else if (recent !== null && n >= STABLE_MIN_PERIODS && s.slice(-STABLE_MIN_PERIODS).every((v, i, a) => i === 0 || (ch(a[i - 1], v) !== null && Math.abs(ch(a[i - 1], v)!) < TREND_THRESHOLD))) {
      out.push({ kind: 'stable', subject: 'category', category: cat, periods: usable.slice(-STABLE_MIN_PERIODS).map(f => ({ start: f.start, end: f.end })), coverage: { complete: true, periodsAvailable: n, periodsRequired: STABLE_MIN_PERIODS } });
    }
  }
  return out;
}

/** G1 (Architecture review): comparison permission for a REQUESTED range (periods fully inside it). */
export function comparisonAllowedInRange(cov: StatementCoverage, start: string, end: string): { allowed: boolean; periodsAvailable: number; reason: string } {
  const chain = comparableChain(comparablePeriods(cov).filter(p => p.start >= start && p.end <= end));
  if (chain.length >= TREND_MIN_PERIODS) return { allowed: true, periodsAvailable: chain.length, reason: 'comparable statement periods in this range' };
  const all = comparisonAllowed(cov);
  return { allowed: false, periodsAvailable: chain.length, reason: all.allowed ? `only ${chain.length} complete comparable statement period(s) in this range` : all.reason };
}

/** For chat (every employee): may a comparison / trend / stability claim be made? */
export function comparisonAllowed(cov: StatementCoverage): { allowed: boolean; periodsAvailable: number; reason: string } {
  const chain = comparableChain(comparablePeriods(cov));
  if (chain.length >= TREND_MIN_PERIODS) return { allowed: true, periodsAvailable: chain.length, reason: 'comparable statement periods available' };
  const reason = cov.status === 'no_statements' ? 'no statements imported'
    : cov.status !== 'ok' ? 'statement coverage could not be read'
      : cov.importsTruncated ? 'not every import could be checked'
      : cov.completedWithoutPeriod > 0 ? 'some imported statements have no recorded period'
        : `only ${chain.length} complete comparable statement period(s)`;
  return { allowed: false, periodsAvailable: chain.length, reason };
}
