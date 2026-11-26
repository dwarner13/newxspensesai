import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import { fetchTransactionsInRange, type RangeFetchClient } from '../../../shared/transaction-range-fetch';
import {
  buildPeriodAggregate,
  centsToDollars,
  aggregateQueryStatus,
  completenessOutputSchema,
  toCompletenessOutput,
  type PeriodAggregate,
  type AggregateRow,
} from '../../../shared/period-aggregate';
import { buildStatementBreakdown, type StatementBreakdown } from '../../../shared/statement-breakdown';

export const id = 'cash_flow_summary';

export const inputSchema = z.object({
  startDate: z.string(), // YYYY-MM-DD format (inclusive)
  endDate: z.string(),   // YYYY-MM-DD format (inclusive)
});

const centsSchema = z.object({
  income: z.number(),
  /** P-LIVE-03: money back on an ordinary spending category (not income). */
  refunds: z.number(),
  spending: z.number(),
  transferIn: z.number(),
  transferOut: z.number(),
  debtPayments: z.number(),
  /** D-1: payments received on the customer's own card/loan (internal; not income). */
  debtRepaymentsIn: z.number(),
  savingsInvestment: z.number(),
  otherNonSpend: z.number(),
  classificationConflict: z.number(),
  totalInflow: z.number(),
  totalOutflow: z.number(),
  rawNetCashMovement: z.number(),
  netExcludingInternalMovements: z.number(),
  netExcludingTransfersAndSavings: z.number(),
});

export const outputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  // ── Compatibility fields (derived from the authoritative aggregate; null on query_error) ──
  /** Inflow excluding transfers in. */
  income: z.number().nullable(),
  /** Ordinary consumption spending only. */
  spending: z.number().nullable(),
  /** COMPATIBILITY aggregate: transfersOut + debtPayments + savingsInvestment + otherNonSpend + classificationConflict. Prefer the specific buckets. */
  nonSpend: z.number().nullable(),
  /** Owner 2026-11-26: NET CASH FLOW = total deposits − total withdrawals (= rawNetCashMovement). */
  netCashFlow: z.number().nullable(),
  /** income + refunds − (spending + debt payments + other non-spend + conflicts): transfers, savings and cash excluded. Never "net cash flow". */
  netExcludingTransfersAndSavings: z.number().optional(),
  /** Transactions that contributed to the totals. */
  transactionCount: z.number(),
  incomeTransactionCount: z.number(),
  spendingTransactionCount: z.number(),
  /** Count of the transactions in `nonSpend`. */
  nonSpendTransactionCount: z.number(),
  queryStatus: z.enum(['verified', 'verified_zero', 'partial', 'query_error']),
  /** Present only when queryStatus = 'query_error'. */
  error: z.string().optional(),
  // ── Authoritative facts (present unless queryStatus = 'query_error') ──
  debtPayments: z.number().optional(),
  /** D-1: card/loan payments received on the customer's own account — not income, not spending. */
  debtRepaymentsIn: z.number().optional(),
  transfersIn: z.number().optional(),
  transfersOut: z.number().optional(),
  savingsInvestment: z.number().optional(),
  otherNonSpend: z.number().optional(),
  classificationConflict: z.number().optional(),
  totalInflow: z.number().optional(),
  totalOutflow: z.number().optional(),
  /** totalInflow − totalOutflow: ALL classified cash movement, transfers and savings included. */
  rawNetCashMovement: z.number().optional(),
  /** income − (spending + debtPayments + otherNonSpend + classificationConflict): transfers and savings/investment excluded. */
  netExcludingInternalMovements: z.number().optional(),
  /** P-LIVE-03: refunds (money back on a spending category) — never part of income. */
  refunds: z.number().optional(),
  /** The same values in integer cents. */
  cents: centsSchema.optional(),
  /**
   * P-LIVE-03 (owner 2026-11-26): the reconciled statement breakdown. Every line comes from the
   * shared classification; inflow lines sum to totalDeposits and outflow lines to totalWithdrawals.
   * Present THESE lines and totals; never add lines together or re-derive totals.
   */
  statementBreakdown: z.object({
    lines: z.array(z.object({ key: z.string(), label: z.string(), direction: z.enum(['inflow', 'outflow']), amount: z.number(), count: z.number() })),
    totalDeposits: z.number(),
    totalWithdrawals: z.number(),
    net: z.number(),
    depositCount: z.number(),
    withdrawalCount: z.number(),
    reconciled: z.boolean(),
    unexplainedDifference: z.object({ deposits: z.number(), withdrawals: z.number() }),
    unplacedCount: z.number(),
  }).optional(),
  categories: z.array(z.object({
    category: z.string(),
    direction: z.enum(['inflow', 'outflow']),
    purpose: z.string(),
    total: z.number(),
    totalCents: z.number(),
    count: z.number(),
  })).optional(),
  completeness: completenessOutputSchema.optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * P3.2A / V1-A CP3 — Cash Flow Summary (authoritative period aggregate)
 *
 * Read-only, user-scoped. Fetches EVERY transaction in the inclusive `date`
 * range (paged) and aggregates it with the shared CP2 foundation:
 * type decides direction, category/subcategory decide purpose, sign never
 * decides direction, integer cents throughout. Refunds/reversals are not
 * identified (no reliable data signal).
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient() as unknown as RangeFetchClient;

    const fetched = await fetchTransactionsInRange(supabase, {
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    if (fetched.error) {
      console.error('[cash_flow_summary] Query error:', fetched.error);
      return Ok({
        startDate: input.startDate,
        endDate: input.endDate,
        income: null,
        spending: null,
        nonSpend: null,
        netCashFlow: null,
        transactionCount: 0,
        incomeTransactionCount: 0,
        spendingTransactionCount: 0,
        nonSpendTransactionCount: 0,
        queryStatus: 'query_error' as const,
        error: fetched.error,
      });
    }

    const agg = buildPeriodAggregate(fetched.rows, {
      fetch: fetched,
      period: { start: input.startDate, end: input.endDate },
    });
    return Ok(toCashFlowOutput(input, agg, buildStatementBreakdown(inPeriod(fetched.rows, input))));
  } catch (error) {
    console.error('[cash_flow_summary] Error:', error);
    return Err(error as Error);
  }
}

/** Rows inside the requested inclusive period (the breakdown covers exactly the aggregate's rows). */
function inPeriod(rows: ReadonlyArray<AggregateRow>, input: Input): AggregateRow[] {
  return rows.filter(r => typeof r.date === 'string' && r.date.slice(0, 10) >= input.startDate && r.date.slice(0, 10) <= input.endDate);
}

/** P-LIVE-03: the breakdown in dollars for the tool output. */
export function toBreakdownOutput(b: StatementBreakdown): NonNullable<Output['statementBreakdown']> {
  return {
    lines: b.lines.filter(l => l.count > 0).map(l => ({ key: l.key, label: l.label, direction: l.direction, amount: centsToDollars(l.cents), count: l.count })),
    totalDeposits: centsToDollars(b.raw.depositsCents),
    totalWithdrawals: centsToDollars(b.raw.withdrawalsCents),
    net: centsToDollars(b.raw.netCents),
    depositCount: b.raw.depositCount,
    withdrawalCount: b.raw.withdrawalCount,
    reconciled: b.reconciled,
    unexplainedDifference: { deposits: centsToDollars(b.unexplainedDifferenceCents.deposits), withdrawals: centsToDollars(b.unexplainedDifferenceCents.withdrawals) },
    unplacedCount: b.unplaced.count,
  };
}

/** Pure mapping from the shared aggregate to the tool output. */
export function toCashFlowOutput(input: Input, agg: PeriodAggregate, breakdown?: StatementBreakdown): Output {
  const c = agg.cents;
  const n = agg.counts;
  const nonSpendCents = c.transferOut + c.debtPayments + c.savingsInvestment + c.otherNonSpend + c.classificationConflict;
  const nonSpendCount = n.transferOut + n.debtPayments + n.savingsInvestment + n.otherNonSpend + n.classificationConflict;
  return {
    startDate: input.startDate,
    endDate: input.endDate,
    income: centsToDollars(c.income),
    refunds: centsToDollars(c.refunds),
    spending: centsToDollars(c.spending),
    nonSpend: centsToDollars(nonSpendCents),
    netCashFlow: centsToDollars(c.rawNetCashMovement),
    netExcludingTransfersAndSavings: centsToDollars(c.netExcludingTransfersAndSavings),
    transactionCount: n.included,
    incomeTransactionCount: n.income,
    spendingTransactionCount: n.spending,
    nonSpendTransactionCount: nonSpendCount,
    queryStatus: aggregateQueryStatus(agg),
    debtPayments: centsToDollars(c.debtPayments),
    debtRepaymentsIn: centsToDollars(c.debtRepaymentsIn),
    transfersIn: centsToDollars(c.transferIn),
    transfersOut: centsToDollars(c.transferOut),
    savingsInvestment: centsToDollars(c.savingsInvestment),
    otherNonSpend: centsToDollars(c.otherNonSpend),
    classificationConflict: centsToDollars(c.classificationConflict),
    totalInflow: centsToDollars(c.totalInflow),
    totalOutflow: centsToDollars(c.totalOutflow),
    rawNetCashMovement: centsToDollars(c.rawNetCashMovement),
    netExcludingInternalMovements: centsToDollars(c.netExcludingInternalMovements),
    cents: { ...c },
    categories: agg.categories.map(e => ({
      category: e.category,
      direction: e.direction,
      purpose: e.purpose,
      total: centsToDollars(e.totalCents),
      totalCents: e.totalCents,
      count: e.count,
    })),
    completeness: toCompletenessOutput(agg),
    ...(breakdown ? { statementBreakdown: toBreakdownOutput(breakdown) } : {}),
  };
}
