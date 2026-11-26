/**
 * fst2-summary-2 (owner GO 2026-11-26, UNIFIED FINANCIAL ENGINE). Pure assembly of the additive
 * contract fields from the ONE shared engine — no arithmetic of its own beyond grouping and summing
 * the engine's already-classified cents:
 *   buildPeriodAggregate (labels, refunds, categories) · buildStatementBreakdown (reconciled lines)
 *   · statement-coverage + coverage-insights (comparability, periods, insights)
 *   · TAX_SECTIONS (possible business expenses, needs review only).
 * Contract: Desktop/xspensesai-security-evidence/FST2_SUMMARY_2_CONTRACT.md.
 */
import { buildPeriodAggregate, type AggregateRow, type PeriodAggregate } from '../../../src/shared/period-aggregate';
import { buildStatementBreakdown } from '../../../src/shared/statement-breakdown';
import { toBreakdownOutput } from '../../../src/agent/tools/impl/cash_flow_summary';
import type { StatementCoverage } from '../../../src/shared/statement-coverage';
import { comparablePeriods, periodFigures, buildInsights, buildCategoryInsights, comparisonAllowed, type Insight } from '../../../src/shared/coverage-insights';
import { coverageForPeriod } from '../../../src/shared/statement-coverage';
import { countNeedsCategory } from '../../../src/shared/needs-category-rule';

export const CATEGORY_INSIGHT_TOP_N = 5;
import { classifyTransactions, isOutflowTx } from '../../../src/shared/financial-sections';

const dollars = (c: number) => Math.round(c) / 100;
const money = (cents: number, count?: number) => (count === undefined ? { amount: dollars(cents), cents } : { amount: dollars(cents), cents, count });

export const BUSINESS_EXPENSE_SECTIONS = ['vehicle', 'home', 'meals', 'business'] as const;
export const POSSIBLE_BUSINESS_EXPENSES_WORDING =
  'Possible business expenses — needs your review (not a tax decision): {count} transactions, {amount}.';

/**
 * Owner decision 2026-11-26 (FINANCIAL CONTRACT DECISIONS): two separate signals.
 *  - retrieval: every transaction in scope was read from the database (otherwise status 'partial'
 *    and NO totals — this block only exists when retrieval is complete);
 *  - statementCoverage: whether imported statements cover the whole requested range.
 * Unknown / partial coverage prohibits comparisons and completeness claims, but NOT accurately
 * labelled recorded totals.
 */
export type StatementCoverageState = 'complete' | 'partial' | 'unknown' | 'none';
export const TOTALS_LABEL_WORDING: Readonly<Record<StatementCoverageState, string>> = {
  complete: 'Complete for {range} (your imported statements cover this whole period).',
  partial: 'Recorded transactions for {range}. Your imported statements do not cover the whole period, so this is not a complete picture.',
  unknown: 'Recorded transactions for {range}. Statement coverage for this period is unknown, so this may not be a complete picture.',
  none: 'Recorded transactions for {range}. No imported statement covers this period.',
};

export interface SummaryV2Row extends AggregateRow { import_id?: string | null; merchant_name?: string | null; merchant?: string | null }

function labelsOf(agg: PeriodAggregate) {
  const c = agg.cents; const n = agg.counts;
  return {
    deposits: money(c.totalInflow, n.income + n.refunds + n.transferIn + n.debtRepaymentsIn),
    withdrawals: money(c.totalOutflow, n.spending + n.transferOut + n.debtPayments + n.savingsInvestment + n.otherNonSpend + n.classificationConflict),
    netCashFlow: money(c.rawNetCashMovement),
    actualIncome: money(c.income, n.income),
    actualSpending: money(c.spending, n.spending),
    refunds: money(c.refunds, n.refunds),
  };
}

function periodRow(label: string, start: string, end: string, agg: PeriodAggregate) {
  const l = labelsOf(agg);
  return {
    start, end, label,
    deposits: l.deposits.amount, withdrawals: l.withdrawals.amount, netCashFlow: l.netCashFlow.amount,
    actualIncome: l.actualIncome.amount, actualSpending: l.actualSpending.amount, refunds: l.refunds.amount,
    count: agg.counts.included,
  };
}

export function buildSummaryV2(input: {
  rows: ReadonlyArray<SummaryV2Row>;
  agg: PeriodAggregate;
  scope: { startDate: string; endDate: string };
  coverage: StatementCoverage;
  accountLabels: Map<string, string>;
}) {
  const { rows, agg, scope, coverage, accountLabels } = input;
  const inRange = rows.filter(r => typeof r.date === 'string' && r.date.slice(0, 10) >= scope.startDate && r.date.slice(0, 10) <= scope.endDate);
  const breakdown = buildStatementBreakdown(inRange);
  // The ONE review rule (shared with the client's needsCategory): no category / Uncategorized / Needs Review.
  const needsReviewCount = countNeedsCategory(inRange);

  // Spending by category: purpose 'spending' only.
  const spendCats = agg.categories.filter(c => c.purpose === 'spending');
  const spendingByCategory = spendCats.map(c => ({
    category: c.category, amount: dollars(c.totalCents), cents: c.totalCents, count: c.count,
    share: agg.cents.spending > 0 ? Math.round((c.totalCents / agg.cents.spending) * 100) : 0,
  }));

  // Comparable periods inside the requested range (fully covered only).
  const comparable = comparablePeriods(coverage).filter(p => p.start >= scope.startDate && p.end <= scope.endDate);
  const figures = periodFigures(inRange, comparable);
  const periods = figures.map(f => periodRow(f.label, f.start, f.end, f.agg));
  const insights: Insight[] = [
    ...buildInsights(agg, figures, needsReviewCount),
    ...buildCategoryInsights(figures, spendCats.slice(0, CATEGORY_INSIGHT_TOP_N).map(c => c.category)),
  ];

  // Calendar months the transactions fall in (UI/UX Q4): totals with their coverage, NEVER comparable.
  const monthKeys = [...new Set(inRange.map(r => String(r.date).slice(0, 7)))].sort();
  const calendarMonths = monthKeys.map(k => {
    const start = `${k}-01`;
    const y = +k.slice(0, 4); const m = +k.slice(5, 7);
    const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 0)).toISOString().slice(0, 10);
    const a = buildPeriodAggregate(inRange, { fetch: { complete: true, truncated: false, rowsFetched: inRange.length }, period: { start, end } });
    const cov = coverageForPeriod(coverage, start, end).overall;
    return { ...periodRow(k, start, end, a), coverage: cov === 'complete' ? 'complete' as const : cov === 'unknown' ? 'unknown' as const : 'partial' as const, comparable: false as const };
  });
  const comparison = comparisonAllowed(coverage);
  const rangeCov = coverageForPeriod(coverage, scope.startDate, scope.endDate).overall;
  const statementCoverage: StatementCoverageState = rangeCov === 'complete' ? 'complete' : rangeCov === 'incomplete' ? 'partial' : rangeCov === 'none' ? 'none' : 'unknown';
  const dataQuality = {
    retrieval: 'complete' as const,
    statementCoverage,
    allowed: { recordedTotals: true, completenessClaims: statementCoverage === 'complete', comparisons: comparison.allowed },
    totalsLabel: TOTALS_LABEL_WORDING[statementCoverage].replace('{range}', `${scope.startDate} to ${scope.endDate}`),
  };

  // Per statement (import) within the range.
  const byImport = new Map<string, SummaryV2Row[]>();
  for (const r of inRange) {
    const id = String(r.import_id ?? '');
    if (!id) continue;
    if (!byImport.has(id)) byImport.set(id, []);
    byImport.get(id)!.push(r);
  }
  const perStatement = [...byImport.entries()].map(([importId, list]) => {
    const a = buildPeriodAggregate(list, { fetch: { complete: true, truncated: false, rowsFetched: list.length } });
    const dates = list.map(r => String(r.date).slice(0, 10)).sort();
    return { importId, label: accountLabels.get(importId) ?? 'Imported statement', ...periodRow(accountLabels.get(importId) ?? 'Imported statement', dates[0], dates[dates.length - 1], a), periodStart: dates[0], periodEnd: dates[dates.length - 1] };
  }).sort((a, b) => a.periodStart.localeCompare(b.periodStart));

  // Goals / Score inputs: only from comparable periods; never "latest month income − expenses".
  const goals = {
    averageNetCashFlowPerPeriod: periods.length ? Math.round((periods.reduce((s, p) => s + p.netCashFlow * 100, 0) / periods.length)) / 100 : null,
    periodsUsed: periods.length,
    savingsContributions: dollars(agg.cents.savingsInvestment),
  };

  // Possible business expenses: shared tax sections on outflows; needs review, never a deduction.
  const outflows = inRange.filter(r => isOutflowTx(r as never)) as never[];
  const sections = classifyTransactions(outflows);
  let pbCents = 0; let pbCount = 0; const pbCats = new Set<string>();
  for (const id of BUSINESS_EXPENSE_SECTIONS) {
    const sec = sections.get(id);
    if (!sec) continue;
    for (const tx of sec.transactions as Array<{ amount?: unknown; category?: string | null }>) {
      pbCents += Math.round(Math.abs(Number(tx.amount) || 0) * 100);
      pbCount++;
      if (tx.category) pbCats.add(tx.category);
    }
  }

  return {
    dataQuality,
    labels: labelsOf(agg),
    netExcludingTransfersAndSavings: money(agg.cents.netExcludingTransfersAndSavings),
    spendingByCategory,
    statementBreakdown: toBreakdownOutput(breakdown),
    coverage: {
      status: coverage.status,
      accounts: coverage.accounts.map(a => ({ label: a.label, statementCount: a.statementCount, periods: a.periods ?? [], gaps: a.gaps })),
      completedWithoutPeriod: coverage.completedWithoutPeriod,
      limitations: coverage.limitations,
      comparison,
    },
    periods,
    calendarMonths,
    needsReviewCount,
    perStatement,
    goals,
    possibleBusinessExpenses: { status: 'needs_review' as const, count: pbCount, amount: dollars(pbCents), cents: pbCents, categories: [...pbCats].sort(), wording: POSSIBLE_BUSINESS_EXPENSES_WORDING },
    insights,
  };
}
