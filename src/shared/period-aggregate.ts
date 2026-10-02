/**
 * PERIOD AGGREGATE (Prime V1-A CP2)
 *
 * Pure, deterministic aggregate over already-fetched transaction rows. Every
 * money figure is integer cents and every row goes through the ONE shared
 * classifier (classifyCashFlow), so cash-flow buckets and category totals
 * built here cannot disagree about the same rows.
 *
 * Completeness is PROPAGATED from the fetch, never inferred from row counts:
 * a truncated fetch yields a correct-looking but non-authoritative aggregate.
 *
 * Refunds/reversals are not identified (no reliable data signal) — see
 * classifyCashFlow in financial-taxonomy.ts.
 */

import { z } from 'zod';
import {
  amountToCents,
  classifyCashFlow,
  type CashFlowConflict,
  type CashFlowDirection,
  type CashFlowPurpose,
} from './financial-taxonomy';

export interface AggregateRow {
  id?: string | null;
  date?: string | null;
  amount?: unknown;
  type?: string | null;
  category?: string | null;
  subcategory?: string | null;
}

/** What the fetch knows about the row set it returned. */
export interface AggregateFetchCompleteness {
  /** The requested range was fully exhausted. */
  complete: boolean;
  /** Rows exist beyond what was fetched. */
  truncated: boolean;
  rowsFetched: number;
}

export interface AggregateCategoryTotal {
  /** Stored category ("Uncategorized" when empty). */
  category: string;
  direction: Exclude<CashFlowDirection, 'unclassified'>;
  purpose: Exclude<CashFlowPurpose, 'unclassified'>;
  totalCents: number;
  count: number;
  /** Earliest / latest `date` among the rows in this entry. */
  firstDate: string;
  lastDate: string;
}

export interface PeriodAggregate {
  /** Inclusive YYYY-MM-DD bounds, when known. */
  period: { start: string; end: string } | null;
  cents: {
    /** Inflow excluding transfers in. */
    income: number;
    /** Ordinary consumption only. */
    spending: number;
    transferIn: number;
    transferOut: number;
    debtPayments: number;
    /** Outflow to savings / investments (incl. TFSA/RRSP) — internal money movement. */
    savingsInvestment: number;
    /** Other canonical non-spend outflow (reserved; no canonical entry maps here today). */
    otherNonSpend: number;
    /** Outflow whose category contradicts its type (e.g. expense + "Income"). */
    classificationConflict: number;
    /** income + transferIn */
    totalInflow: number;
    /** spending + transferOut + debtPayments + savingsInvestment + otherNonSpend + classificationConflict */
    totalOutflow: number;
    /**
     * ALL classified cash in minus ALL classified cash out:
     * totalInflow − totalOutflow (transfers, savings/investment movement,
     * debt payments, spending, income and every other classified movement).
     */
    rawNetCashMovement: number;
    /**
     * User-facing net with internal money movements removed:
     * income − (spending + debtPayments + otherNonSpend + classificationConflict).
     * Excludes transfers in/out and savings/investment movement.
     */
    netExcludingInternalMovements: number;
  };
  counts: {
    /** Rows that contributed to money totals. */
    included: number;
    income: number;
    spending: number;
    transferIn: number;
    transferOut: number;
    debtPayments: number;
    savingsInvestment: number;
    otherNonSpend: number;
    classificationConflict: number;
  };
  /** Sorted by totalCents desc, then category, then purpose. */
  categories: AggregateCategoryTotal[];
  completeness: {
    /** Fetch exhausted the range (propagated). */
    complete: boolean;
    truncated: boolean;
    /** Safe to present as an authoritative period total (data completeness). */
    authoritative: boolean;
    /**
     * Classification completeness (separate from data completeness): false when
     * any in-period row could not contribute because its type is unsupported or
     * its amount is missing/invalid — the money totals then do not cover it.
     */
    classificationComplete: boolean;
    /** Known |amount| (cents) of in-period rows with an unsupported type. */
    unclassifiedCents: number;
    rowsFetched: number;
    /**
     * Rows SUPPLIED to the builder that could not contribute. A date-range
     * fetch cannot select rows whose `date` is null, so `missingDate` only
     * counts supplied rows — it is never a count of such database rows.
     */
    excluded: {
      missingAmount: number;
      missingDate: number;
      outOfPeriod: number;
      unclassifiedType: number;
    };
    conflicts: Record<CashFlowConflict, number>;
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

// ─────────────────────────────────────────────────────────────────────────────
// Tool-output helpers (shared by cash_flow_summary and transaction_category_totals)
// ─────────────────────────────────────────────────────────────────────────────

/** Integer cents → dollars, for tool JSON only (aggregation stays in cents). */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

export type AggregateQueryStatus = 'verified' | 'verified_zero' | 'partial';

/** partial = data incomplete; verified_zero = complete and nothing contributed. */
export function aggregateQueryStatus(agg: PeriodAggregate, includedCount = agg.counts.included): AggregateQueryStatus {
  if (!agg.completeness.complete || agg.completeness.truncated) return 'partial';
  return includedCount === 0 ? 'verified_zero' : 'verified';
}

export const completenessOutputSchema = z.object({
  /** The requested range was fully fetched. */
  dataComplete: z.boolean(),
  truncated: z.boolean(),
  /** Data completeness: safe to present the totals as complete for the period. */
  authoritative: z.boolean(),
  /** Classification completeness: false when some rows could not be classified. */
  classificationComplete: z.boolean(),
  rowsFetched: z.number(),
  excluded: z.object({
    missingAmount: z.number(),
    missingDate: z.number(),
    outOfPeriod: z.number(),
    unclassifiedType: z.number(),
  }),
  /** Known magnitude of unsupported-type rows (in no bucket). */
  unclassifiedCents: z.number(),
  unclassifiedAmount: z.number(),
  conflicts: z.object({
    income_category_on_outflow: z.number(),
    non_spend_category_on_inflow: z.number(),
    negative_inflow: z.number(),
  }),
});

export type CompletenessOutput = z.infer<typeof completenessOutputSchema>;

export function toCompletenessOutput(agg: PeriodAggregate): CompletenessOutput {
  const c = agg.completeness;
  return {
    dataComplete: c.complete,
    truncated: c.truncated,
    authoritative: c.authoritative,
    classificationComplete: c.classificationComplete,
    rowsFetched: c.rowsFetched,
    excluded: { ...c.excluded },
    unclassifiedCents: c.unclassifiedCents,
    unclassifiedAmount: centsToDollars(c.unclassifiedCents),
    conflicts: { ...c.conflicts },
  };
}

type Bucket = Exclude<CashFlowPurpose, 'unclassified'>;
const BUCKET_KEY: Record<Bucket, keyof PeriodAggregate['counts'] & keyof PeriodAggregate['cents']> = {
  income: 'income',
  spending: 'spending',
  transfer_in: 'transferIn',
  transfer_out: 'transferOut',
  debt_payment: 'debtPayments',
  savings_investment: 'savingsInvestment',
  other_non_spend: 'otherNonSpend',
  classification_conflict: 'classificationConflict',
};

/** Build the aggregate. `fetch` is the fetch's own completeness report. */
export function buildPeriodAggregate(
  rows: ReadonlyArray<AggregateRow>,
  opts: { fetch: AggregateFetchCompleteness; period?: { start: string; end: string } | null },
): PeriodAggregate {
  const period = opts.period ?? null;
  const sums = {
    income: 0, spending: 0, transferIn: 0, transferOut: 0,
    debtPayments: 0, savingsInvestment: 0, otherNonSpend: 0, classificationConflict: 0,
  };
  const counts: PeriodAggregate['counts'] = {
    included: 0, income: 0, spending: 0, transferIn: 0, transferOut: 0,
    debtPayments: 0, savingsInvestment: 0, otherNonSpend: 0, classificationConflict: 0,
  };
  const excluded = { missingAmount: 0, missingDate: 0, outOfPeriod: 0, unclassifiedType: 0 };
  let unclassifiedCents = 0;
  const conflicts: Record<CashFlowConflict, number> = {
    income_category_on_outflow: 0,
    non_spend_category_on_inflow: 0,
    negative_inflow: 0,
  };
  const categoryMap = new Map<string, AggregateCategoryTotal>();

  for (const row of rows) {
    const date = typeof row.date === 'string' && ISO_DATE.test(row.date) ? row.date.slice(0, 10) : null;
    if (!date) { excluded.missingDate++; continue; }
    if (period && (date < period.start || date > period.end)) { excluded.outOfPeriod++; continue; }

    const c = classifyCashFlow(row);
    for (const conflict of c.conflicts) conflicts[conflict]++;
    if (c.excluded === 'unclassified_type' || c.direction === 'unclassified' || c.purpose === 'unclassified') {
      excluded.unclassifiedType++;
      // Magnitude is known even though direction is not; never counted in any bucket.
      unclassifiedCents += amountToCents(row.amount) ?? 0;
      continue;
    }
    if (c.excluded === 'missing_amount' || c.amountCents === null) { excluded.missingAmount++; continue; }

    const amount = c.amountCents;
    const key = BUCKET_KEY[c.purpose];
    sums[key] += amount;
    counts[key]++;
    counts.included++;

    const category = (row.category || '').trim() || 'Uncategorized';
    const mapKey = `${category}\u0000${c.purpose}`;
    const entry = categoryMap.get(mapKey);
    if (entry) {
      entry.totalCents += amount;
      entry.count++;
      if (date < entry.firstDate) entry.firstDate = date;
      if (date > entry.lastDate) entry.lastDate = date;
    } else {
      categoryMap.set(mapKey, {
        category, direction: c.direction, purpose: c.purpose, totalCents: amount, count: 1, firstDate: date, lastDate: date,
      });
    }
  }

  const totalInflow = sums.income + sums.transferIn;
  const totalOutflow = sums.spending + sums.transferOut + sums.debtPayments
    + sums.savingsInvestment + sums.otherNonSpend + sums.classificationConflict;
  const categories = [...categoryMap.values()].sort((a, b) =>
    b.totalCents - a.totalCents || a.category.localeCompare(b.category) || a.purpose.localeCompare(b.purpose),
  );
  const complete = opts.fetch.complete && !opts.fetch.truncated;

  return {
    period,
    cents: {
      ...sums,
      totalInflow,
      totalOutflow,
      rawNetCashMovement: totalInflow - totalOutflow,
      netExcludingInternalMovements:
        sums.income - (sums.spending + sums.debtPayments + sums.otherNonSpend + sums.classificationConflict),
    },
    counts,
    categories,
    completeness: {
      complete,
      truncated: opts.fetch.truncated,
      authoritative: complete,
      classificationComplete: excluded.unclassifiedType === 0 && excluded.missingAmount === 0,
      unclassifiedCents,
      rowsFetched: opts.fetch.rowsFetched,
      excluded,
      conflicts,
    },
  };
}
