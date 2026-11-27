/**
 * Typed insights -> text (AI Architecture HQ design; wording fixed in the fst2-summary-2 contract).
 * The server decides WHETHER a claim holds (coverage gate, thresholds); the client only phrases it.
 * No arithmetic, no thresholds, no interpretation here.
 */
import type { Insight, FinancialSummary } from '@/lib/financialSummary';

type ServerWording = FinancialSummary['wording'];

/**
 * LA-4: the review line every screen uses (Prime HQ wording guide). Amounts only when the
 * server's read was complete; unclassified named only when non-zero. No arithmetic here.
 */
export function needsReviewText(
  nr: FinancialSummary['needsReview'] | undefined,
  fallbackCount: number,
  money: (cents: number) => string,
): string {
  const count = nr && typeof nr.count === 'number' ? nr.count : fallbackCount;
  const noun = `${count} need${count === 1 ? 's' : ''} a category`;
  if (!nr || !nr.complete || !nr.outflow || !nr.inflow) return noun;
  const parts = [`${money(nr.outflow.cents)} going out`, `${money(nr.inflow.cents)} coming in`];
  if (nr.unclassified && nr.unclassified.count > 0) parts.push(`${money(nr.unclassified.cents)} without a direction`);
  return `${noun}: ${parts.join(', ')}`;
}

/** Fill a server template ({category}, {direction}, {percent}, {count}, {periodsAvailable}, {periodsRequired}). */
function fill(t: string, i: Insight): string | null {
  const v: Record<string, string | number | undefined> = { category: i.category, direction: i.direction, percent: i.percent, count: i.count ?? 0, periodsAvailable: i.coverage.periodsAvailable, periodsRequired: i.coverage.periodsRequired };
  let missing = false;
  const out = t.replace(/\{(\w+)\}/g, (_, k: string) => { const x = v[k]; if (x === undefined) { missing = true; return ''; } return String(x); });
  return missing ? null : out;
}

function serverKey(i: Insight): string {
  if (i.kind === 'trend' || i.kind === 'stable') return `${i.kind}_${i.subject === 'category' ? 'category' : 'actual_spending'}`;
  return i.kind;
}

export function insightText(i: Insight, wording?: ServerWording): string | null {
  // Coverage gate stays on the client too: no trend / stable text without server coverage.
  if ((i.kind === 'trend' || i.kind === 'stable') && !i.coverage.complete) return null;
  const t = wording?.insights?.[serverKey(i)];
  if (t) return fill(t, i);
  switch (i.kind) {
    case 'trend': {
      // Only ever rendered from a server 'trend' that passed coverage.
      if (!i.coverage.complete || !i.direction || typeof i.percent !== 'number') return null;
      const what = i.subject === 'category' && i.category ? `${i.category} spending` : 'Actual spending';
      return `${what} is ${i.direction} ${i.percent}% compared with the previous statement period.`;
    }
    case 'stable': {
      if (!i.coverage.complete) return null;
      const what = i.subject === 'category' && i.category ? `${i.category} spending` : 'Actual spending';
      // G9 (AI Architecture HQ): name only the periods the server actually compared (its `periods`),
      // never every available period.
      const compared = i.periods?.length ?? i.coverage.periodsRequired;
      return `${what} has stayed within 10% across your last ${compared} statement periods.`;
    }
    case 'not_enough_history':
      return `Not enough statement history to compare yet (${i.coverage.periodsAvailable} of ${i.coverage.periodsRequired} complete statement periods).`;
    case 'top_category':
      if (!i.category || typeof i.percent !== 'number') return null;
      return `${i.category} is ${i.percent}% of actual spending (${i.count ?? 0} transactions).`;
    case 'needs_review':
      return `${i.count ?? 0} transactions need your review.`;
    default:
      return null;
  }
}

/** The server's category-level trend for one category, if it passed coverage (Categories badges). */
export function categoryTrend(insights: ReadonlyArray<Insight>, category: string): Insight | null {
  return insights.find(i => i.subject === 'category' && i.category === category && i.kind === 'trend' && i.coverage.complete && !!i.direction && typeof i.percent === 'number') ?? null;
}

/** The overall spending claim to show on a card: trend, else stable, else not enough history. */
export function spendingClaim(insights: ReadonlyArray<Insight>): Insight | null {
  const overall = insights.filter(i => i.subject === 'actual_spending');
  return overall.find(i => i.kind === 'trend') ?? overall.find(i => i.kind === 'stable') ?? overall.find(i => i.kind === 'not_enough_history') ?? null;
}

export const POSSIBLE_BUSINESS_EXPENSES_TEXT = (count: number, amount: string) =>
  `Possible business expenses — needs your review (not a tax decision): ${count} transactions, ${amount}.`;
