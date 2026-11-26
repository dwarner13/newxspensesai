/**
 * FINANCIAL POSITION — Canonical Read-Only Financial Overview
 *
 * Gives Prime a structured understanding of the user's financial situation
 * with provenance tracking on every material value.
 *
 * RULES:
 * - Pure TypeScript. No React, no LLM calls.
 * - Unknown NEVER becomes zero. Use status: 'unavailable'.
 * - verified_zero only when an authoritative source proves zero.
 * - Period-aware: aggregates carry periodStart/periodEnd.
 * - Does NOT replace financial grounding for factual queries.
 * - Does NOT infer debt/savings from transaction categories.
 * - Does NOT automatically annualize multi-period totals.
 *
 * FST-1 (financial source of truth, P-G1): every figure comes from the ONE
 * shared engine — fetchTransactionsInRange (complete, paged, ordered) +
 * buildPeriodAggregate (integer cents, classifyCashFlow). A figure is
 * 'verified' ONLY when the read was complete; otherwise it is 'partial' and
 * says so. Rows whose type has no established direction (e.g. 'Credit' /
 * 'Debit') are in no total and are disclosed, never guessed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchTransactionsInRange,
  TRANSACTION_SIGNAL_COLUMNS,
  type RangeFetchClient,
} from '../../../src/shared/transaction-range-fetch';
import { buildPeriodAggregate, type PeriodAggregate } from '../../../src/shared/period-aggregate';
import { computeIntegritySignals, type FinancialIntegritySignals } from '../../../src/shared/financial-integrity-signals';
import { merchantGroupingKey } from './merchantNormalize';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type FinancialSource =
  | 'verified_db'
  | 'conversation'
  | 'profile'
  | 'derived'
  | 'unavailable';

export type DataStatus =
  | 'verified'
  | 'verified_zero'
  /** Computed from an incomplete read — never presented as a complete total. */
  | 'partial'
  | 'user_stated'
  | 'estimated'
  | 'unavailable';

export interface FinancialValue {
  amount: number;
  currency: string;
  status: DataStatus;
  source: FinancialSource;
  periodStart?: string;
  periodEnd?: string;
  /** Number of transactions that contributed to this figure. */
  transactionCount?: number;
  /** Explanation when status is 'estimated' or 'derived' */
  basis?: string;
}

export interface FinancialArea {
  status: DataStatus;
  source: FinancialSource;
}

export interface IncomeArea extends FinancialArea {
  monthlyIncome?: FinancialValue;
  periodTotal?: FinancialValue;
}

export interface SpendingArea extends FinancialArea {
  monthlySpend?: FinancialValue;
  periodTotal?: FinancialValue;
  topCategories?: Array<{ category: string; amount: number }>;
}

export interface CashFlowArea extends FinancialArea {
  monthlyNet?: FinancialValue;
}

export interface GoalsArea extends FinancialArea {
  activeCount?: number;
}

export interface TimeHorizonArea {
  status: DataStatus;
  source: FinancialSource;
  description?: string;
}

export interface DataCoverage {
  firstTransaction: string | null;
  lastTransaction: string | null;
  transactionCount: number;
  monthsCovered: number;
  /** Every dated transaction was read (FST-1). */
  complete: boolean;
  truncated: boolean;
  /** Rows in no total because their type has no established direction. */
  unclassifiedCount: number;
  unclassifiedAmount: number;
  /** Rows in no total because their amount is missing or invalid. */
  missingAmountCount: number;
  /** Outflows/inflows whose category contradicts their type (still counted, disclosed). */
  conflictCount: number;
}

export interface FinancialScope {
  /** Transactions carry no account column: every imported account is in scope. */
  accounts: 'all_imported_accounts';
  /** Transactions carry no currency column: the profile currency is assumed. */
  currency: string;
  currencyBasis: 'profile_assumed';
}

export interface FinancialPosition {
  asOf: string;
  currency: string;
  userId: string;

  income: IncomeArea;
  spending: SpendingArea;
  cashFlow: CashFlowArea;
  savings: FinancialArea;
  debt: FinancialArea;
  goals: GoalsArea;
  timeHorizon: TimeHorizonArea;
  dataCoverage: DataCoverage;
  scope: FinancialScope;
  signals: FinancialIntegritySignals;
  missingAreas: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildFinancialPositionInput {
  supabase: SupabaseClient;
  userId: string;
  currency?: string;
  userTimezone?: string | null;
}

/** Widest valid YYYY-MM-DD range: every dated transaction. */
const ALL_TIME = { startDate: '1900-01-01', endDate: '9999-12-31' };

const dollars = (cents: number) => Math.round(cents) / 100;

function lastDayOfMonth(year: number, month0: number): string {
  const d = new Date(Date.UTC(year, month0 + 1, 0));
  return d.toISOString().slice(0, 10);
}

export async function buildFinancialPosition(
  input: BuildFinancialPositionInput,
): Promise<FinancialPosition> {
  const { supabase: sb, userId, currency = 'CAD', userTimezone } = input;

  // ── Resolve current-month boundaries (timezone-aware) ──
  let localYear: number, localMonth: number;
  const now = new Date();
  if (userTimezone) {
    try {
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone, year: 'numeric', month: '2-digit',
      });
      const parts = fmt.formatToParts(now);
      localYear = parseInt(parts.find(p => p.type === 'year')?.value || '', 10);
      localMonth = parseInt(parts.find(p => p.type === 'month')?.value || '', 10) - 1;
      if (!Number.isFinite(localYear) || !Number.isFinite(localMonth)) throw new Error('bad tz parts');
    } catch {
      localYear = now.getFullYear();
      localMonth = now.getMonth();
    }
  } else {
    localYear = now.getFullYear();
    localMonth = now.getMonth();
  }
  const monthStart = `${localYear}-${String(localMonth + 1).padStart(2, '0')}-01`;
  const monthEnd = lastDayOfMonth(localYear, localMonth);

  // ── Fetch (fail-safe): complete paged transactions + active goals ──
  const [fetchResult, goalsResult] = await Promise.all([
    fetchTransactionsInRange(sb as unknown as RangeFetchClient, { userId, ...ALL_TIME }, { columns: TRANSACTION_SIGNAL_COLUMNS })
      .catch((e: unknown) => ({
        rows: [], rowsFetched: 0, pagesFetched: 0, complete: false, truncated: false, duplicatesSkipped: 0,
        error: e instanceof Error ? e.message : 'fetch_exception',
      })),
    Promise.resolve(
      sb.from('goals').select('id, status').eq('user_id', userId).eq('status', 'active'),
    )
      .then((r: any) => r)
      .catch(() => ({ data: null, error: { message: 'goals query failed' } })),
  ]);

  const txError = fetchResult.error;
  const rows = fetchResult.rows;
  const fetchInfo = { complete: fetchResult.complete, truncated: fetchResult.truncated, rowsFetched: fetchResult.rowsFetched };
  const all: PeriodAggregate = buildPeriodAggregate(rows, { fetch: fetchInfo, period: null });
  const month: PeriodAggregate = buildPeriodAggregate(rows, { fetch: fetchInfo, period: { start: monthStart, end: monthEnd } });
  const signals = computeIntegritySignals(rows, { merchantKey: merchantGroupingKey });

  // ── Data coverage (rows are ordered by date, so first/last are exact when complete) ──
  const dates = rows.map(t => t.date).filter((d): d is string => typeof d === 'string' && d.length >= 10).map(d => d.slice(0, 10));
  const firstTx = dates.length > 0 ? dates.reduce((m, d) => (d < m ? d : m)) : null;
  const lastTx = dates.length > 0 ? dates.reduce((m, d) => (d > m ? d : m)) : null;
  let monthsCovered = 0;
  if (firstTx && lastTx) {
    const first = new Date(firstTx);
    const last = new Date(lastTx);
    monthsCovered = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
  }
  const conflictCount = Object.values(all.completeness.conflicts).reduce((s, n) => s + n, 0);

  const dataCoverage: DataCoverage = {
    firstTransaction: firstTx,
    lastTransaction: lastTx,
    transactionCount: txError ? 0 : fetchResult.rowsFetched,
    monthsCovered,
    complete: !txError && all.completeness.complete,
    truncated: all.completeness.truncated,
    unclassifiedCount: all.completeness.excluded.unclassifiedType,
    unclassifiedAmount: dollars(all.completeness.unclassifiedCents),
    missingAmountCount: all.completeness.excluded.missingAmount,
    conflictCount,
  };

  const unavailable = !!txError || rows.length === 0;
  const status: DataStatus = dataCoverage.complete ? 'verified' : 'partial';
  const value = (cents: number, count: number, start: string, end: string): FinancialValue => ({
    amount: dollars(cents), currency, status, source: 'verified_db', periodStart: start, periodEnd: end, transactionCount: count,
  });

  // ── Income (inflow excluding transfers in) ──
  const income: IncomeArea = unavailable
    ? { status: 'unavailable', source: 'unavailable' }
    : {
        status,
        source: 'verified_db',
        periodTotal: value(all.cents.income, all.counts.income, firstTx!, lastTx!),
        monthlyIncome: value(month.cents.income, month.counts.income, monthStart, monthEnd),
      };

  // ── Spending (ordinary consumption only; transfers, debt, savings excluded) ──
  const topCategories = all.categories
    .filter(c => c.purpose === 'spending')
    .slice(0, 5)
    .map(c => ({ category: c.category, amount: dollars(c.totalCents) }));

  const spending: SpendingArea = unavailable
    ? { status: 'unavailable', source: 'unavailable' }
    : {
        status,
        source: 'verified_db',
        periodTotal: value(all.cents.spending, all.counts.spending, firstTx!, lastTx!),
        monthlySpend: value(month.cents.spending, month.counts.spending, monthStart, monthEnd),
        topCategories,
      };

  // ── Cash flow (current month, net excluding internal movements) ──
  const cashFlow: CashFlowArea = unavailable
    ? { status: 'unavailable', source: 'unavailable' }
    : {
        status: dataCoverage.complete ? 'estimated' : 'partial',
        source: 'derived',
        monthlyNet: {
          amount: dollars(month.cents.netExcludingInternalMovements),
          currency,
          status: dataCoverage.complete ? 'estimated' : 'partial',
          source: 'derived',
          periodStart: monthStart,
          periodEnd: monthEnd,
          transactionCount: month.counts.included,
          basis: 'current-month income minus spending, debt payments and classification conflicts (transfers and savings/investment movements excluded)',
        },
      };

  const savings: FinancialArea = { status: 'unavailable', source: 'unavailable' };
  const debt: FinancialArea = { status: 'unavailable', source: 'unavailable' };

  // ── Goals ──
  let goals: GoalsArea;
  if (goalsResult?.error || !Array.isArray(goalsResult?.data)) {
    goals = { status: 'unavailable', source: 'unavailable' };
  } else if (goalsResult.data.length === 0) {
    goals = { status: 'verified_zero', source: 'verified_db', activeCount: 0 };
  } else {
    goals = { status: 'verified', source: 'verified_db', activeCount: goalsResult.data.length };
  }

  const timeHorizon: TimeHorizonArea = { status: 'unavailable', source: 'unavailable' };

  const missingAreas: string[] = [];
  if (savings.status === 'unavailable') missingAreas.push('savings/investment balances');
  if (debt.status === 'unavailable') missingAreas.push('debt balances, rates, and terms');
  if (timeHorizon.status === 'unavailable') missingAreas.push('retirement/goal timeline');
  if (income.status === 'unavailable') missingAreas.push('income data');
  if (!unavailable && !dataCoverage.complete) missingAreas.push('complete transaction history (read was incomplete)');

  return {
    asOf: now.toISOString(),
    currency,
    userId,
    income,
    spending,
    cashFlow,
    savings,
    debt,
    goals,
    timeHorizon,
    dataCoverage,
    scope: { accounts: 'all_imported_accounts', currency, currencyBasis: 'profile_assumed' },
    signals,
    missingAreas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT TEXT REPRESENTATION (Prime prompt injection)
// ─────────────────────────────────────────────────────────────────────────────

const money = (n: number) => `$${n.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function formatPositionForPrompt(pos: FinancialPosition): string {
  const lines: string[] = ['FINANCIAL POSITION:'];
  const cov = pos.dataCoverage;
  const partial = pos.income.status === 'partial' || pos.spending.status === 'partial';

  // Scope line — every figure below is bounded by it (FST-1 requirement 6).
  if (cov.transactionCount > 0) {
    lines.push(`Scope: ${cov.firstTransaction} to ${cov.lastTransaction}; all imported accounts; ${pos.currency} (profile currency, assumed — transactions carry no currency); ${cov.transactionCount} transactions read; ${cov.complete !== false ? 'COMPLETE read' : 'PARTIAL read — NOT every transaction could be read'}`);
  }
  if (partial) {
    lines.push('WARNING: these figures are PARTIAL. Never call them total, complete or verified; say they cover only the transactions that could be read, and offer to retry.');
  }

  // Income
  if ((pos.income.status === 'verified' || pos.income.status === 'partial') && pos.income.periodTotal) {
    const pt = pos.income.periodTotal;
    const label = pos.income.status === 'verified' ? 'verified sum of imported transactions only' : 'PARTIAL sum (incomplete read)';
    // C2-G1: imported records only — not necessarily all income sources
    lines.push(`Income: ${money(pt.amount)} (${pt.periodStart} to ${pt.periodEnd}; ${pt.transactionCount ?? 0} transactions; ${label} — may not include every income source or account; a multi-month total, not an annual salary)`);
    if (pos.income.monthlyIncome) {
      lines.push(`  Current month (${pos.income.monthlyIncome.periodStart} to ${pos.income.monthlyIncome.periodEnd}): ${money(pos.income.monthlyIncome.amount)} (${pos.income.monthlyIncome.transactionCount ?? 0} transactions)`);
    }
  } else {
    lines.push('Income: unavailable');
  }

  // Spending
  if ((pos.spending.status === 'verified' || pos.spending.status === 'partial') && pos.spending.periodTotal) {
    const pt = pos.spending.periodTotal;
    const label = pos.spending.status === 'verified' ? 'verified sum of imported transactions only' : 'PARTIAL sum (incomplete read)';
    // C2-G1: imported records only — never complete household or annual living expenses
    lines.push(`Spending: ${money(pt.amount)} (${pt.periodStart} to ${pt.periodEnd}; ${pt.transactionCount ?? 0} transactions; ${label}, excludes transfers/debt/investments — may not include every account or all household spending; a multi-month total, not annual living expenses; do not annualize or treat it as a retirement spending need without saying so)`);
    if (pos.spending.monthlySpend) {
      lines.push(`  Current month (${pos.spending.monthlySpend.periodStart} to ${pos.spending.monthlySpend.periodEnd}): ${money(pos.spending.monthlySpend.amount)} (${pos.spending.monthlySpend.transactionCount ?? 0} transactions)`);
    }
    if (pos.spending.topCategories && pos.spending.topCategories.length > 0) {
      lines.push(`  Top: ${pos.spending.topCategories.map(c => `${c.category}=${money(c.amount)}`).join(', ')}`);
    }
  } else {
    lines.push('Spending: unavailable');
  }

  // Cash flow
  if (pos.cashFlow.status !== 'unavailable' && pos.cashFlow.monthlyNet) {
    const mn = pos.cashFlow.monthlyNet;
    lines.push(`Cash flow (current month, ${pos.cashFlow.status === 'partial' ? 'PARTIAL' : 'estimated'}): ${money(mn.amount)}`);
  }

  // Disclosures: rows in no total, conflicts, possible duplicates/refunds.
  const notes: string[] = [];
  const sig = pos.signals;
  if ((cov.unclassifiedCount ?? 0) > 0) notes.push(`${cov.unclassifiedCount} transactions (${money(cov.unclassifiedAmount)}) have a type with no clear direction and are in NO total`);
  if ((cov.missingAmountCount ?? 0) > 0) notes.push(`${cov.missingAmountCount} transactions have no valid amount and are in no total`);
  if ((cov.conflictCount ?? 0) > 0) notes.push(`${cov.conflictCount} transactions have a category that contradicts their type (counted, may need review)`);
  if (sig && sig.possibleDuplicates.count > 0) notes.push(`${sig.possibleDuplicates.count} possible duplicate-import transactions (${money(sig.possibleDuplicates.cents / 100)}) are INCLUDED in the totals`);
  if (sig && sig.possibleRefunds.count > 0) notes.push(`${sig.possibleRefunds.count} inflows (${money(sig.possibleRefunds.cents / 100)}) look like refunds and are counted as income`);
  if (notes.length > 0) lines.push(`Data notes: ${notes.join('; ')}`);

  lines.push(`Savings/investments: ${pos.savings.status}`);
  lines.push(`Debt details: ${pos.debt.status}`);

  if (pos.goals.status === 'verified_zero') {
    lines.push('Goals: none set');
  } else if (pos.goals.status === 'verified') {
    lines.push(`Goals: ${pos.goals.activeCount} active`);
  } else {
    lines.push(`Goals: ${pos.goals.status}`);
  }

  lines.push(`Retirement/timeline: ${pos.timeHorizon.status}`);

  if (cov.transactionCount > 0) {
    lines.push(`Data: ${cov.transactionCount} transactions, ${cov.firstTransaction} to ${cov.lastTransaction} (~${cov.monthsCovered} months)`);
  } else {
    lines.push('Data: no transactions');
  }

  if (pos.missingAreas.length > 0) {
    lines.push(`Missing: ${pos.missingAreas.join('; ')}`);
  }

  return lines.join('\n');
}
