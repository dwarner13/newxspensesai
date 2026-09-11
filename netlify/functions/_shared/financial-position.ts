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
 */

import type { SupabaseClient } from '@supabase/supabase-js';

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
  missingAreas: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// NON-SPEND CATEGORIES (canonical — matches financial-snapshot.ts)
// ─────────────────────────────────────────────────────────────────────────────

const NON_SPEND_CATEGORIES = new Set([
  'transfers', 'transfer',
  'loan payments', 'loan payment',
  'credit card payments', 'credit card payment',
  'investments', 'investment',
  'debt payments', 'debt payment',
  'income', 'business income',
]);

function isNonSpend(category: string | null): boolean {
  if (!category) return false;
  return NON_SPEND_CATEGORIES.has(category.trim().toLowerCase());
}

function isIncomeTx(tx: { type?: string | null; category?: string | null }): boolean {
  return tx.type === 'income' || tx.type === 'Credit' || (tx.category || '').toLowerCase() === 'income';
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
    } catch {
      localYear = now.getFullYear();
      localMonth = now.getMonth();
    }
  } else {
    localYear = now.getFullYear();
    localMonth = now.getMonth();
  }
  const monthStart = `${localYear}-${String(localMonth + 1).padStart(2, '0')}-01`;
  const nextMonth = localMonth === 11
    ? `${localYear + 1}-01-01`
    : `${localYear}-${String(localMonth + 2).padStart(2, '0')}-01`;

  // ── Fetch data in parallel (fail-safe) ──
  let txResult: { data: any[] | null; error: any } = { data: null, error: null };
  let goalsResult: { data: any[] | null; error: any } = { data: null, error: null };
  try {
    const results = await Promise.all([
      sb.from('transactions')
        .select('date, amount, category, type')
        .eq('user_id', userId)
        .then((r: any) => r)
        .catch((e: any) => ({ data: null, error: e })),
      sb.from('goals')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .then((r: any) => r)
        .catch(() => ({ data: null, error: { message: 'goals query failed' } })),
    ]);
    txResult = results[0];
    goalsResult = results[1];
  } catch (fetchErr: any) {
    console.warn('[buildFinancialPosition] Parallel fetch failed:', fetchErr?.message);
  }

  const transactions = txResult.data || [];
  const txError = txResult.error;

  // ── Data coverage ──
  const dates = transactions.map((t: any) => t.date).filter(Boolean).sort();
  const firstTx = dates.length > 0 ? dates[0] : null;
  const lastTx = dates.length > 0 ? dates[dates.length - 1] : null;
  let monthsCovered = 0;
  if (firstTx && lastTx) {
    const first = new Date(firstTx);
    const last = new Date(lastTx);
    monthsCovered = Math.max(1, Math.round((last.getTime() - first.getTime()) / (30.44 * 24 * 60 * 60 * 1000)));
  }

  const dataCoverage: DataCoverage = {
    firstTransaction: firstTx,
    lastTransaction: lastTx,
    transactionCount: transactions.length,
    monthsCovered,
  };

  // ── Income ──
  const incomeTxs = transactions.filter((t: any) => isIncomeTx(t));
  const currentMonthIncomeTxs = incomeTxs.filter((t: any) =>
    t.date && t.date >= monthStart && t.date < nextMonth
  );

  const periodIncomeTotal = incomeTxs.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
  const monthlyIncomeTotal = currentMonthIncomeTxs.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);

  const income: IncomeArea = transactions.length === 0 || txError
    ? { status: 'unavailable', source: 'unavailable' }
    : {
        status: 'verified',
        source: 'verified_db',
        periodTotal: {
          amount: Math.round(periodIncomeTotal * 100) / 100,
          currency,
          status: 'verified',
          source: 'verified_db',
          periodStart: firstTx!,
          periodEnd: lastTx!,
        },
        monthlyIncome: {
          amount: Math.round(monthlyIncomeTotal * 100) / 100,
          currency,
          status: 'verified',
          source: 'verified_db',
          periodStart: monthStart,
          periodEnd: nextMonth,
        },
      };

  // ── Spending ──
  const spendTxs = transactions.filter((t: any) =>
    !isIncomeTx(t) && !isNonSpend(t.category)
  );
  const currentMonthSpendTxs = spendTxs.filter((t: any) =>
    t.date && t.date >= monthStart && t.date < nextMonth
  );

  const periodSpendTotal = spendTxs.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);
  const monthlySpendTotal = currentMonthSpendTxs.reduce((s: number, t: any) => s + Math.abs(t.amount || 0), 0);

  // Top categories (period-wide)
  const catMap: Record<string, number> = {};
  for (const t of spendTxs) {
    if (t.category) catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount || 0);
  }
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }));

  const spending: SpendingArea = transactions.length === 0 || txError
    ? { status: 'unavailable', source: 'unavailable' }
    : {
        status: 'verified',
        source: 'verified_db',
        periodTotal: {
          amount: Math.round(periodSpendTotal * 100) / 100,
          currency,
          status: 'verified',
          source: 'verified_db',
          periodStart: firstTx!,
          periodEnd: lastTx!,
        },
        monthlySpend: {
          amount: Math.round(monthlySpendTotal * 100) / 100,
          currency,
          status: 'verified',
          source: 'verified_db',
          periodStart: monthStart,
          periodEnd: nextMonth,
        },
        topCategories,
      };

  // ── Cash flow ──
  const cashFlow: CashFlowArea = transactions.length === 0 || txError
    ? { status: 'unavailable', source: 'unavailable' }
    : {
        status: 'estimated',
        source: 'derived',
        monthlyNet: {
          amount: Math.round((monthlyIncomeTotal - monthlySpendTotal) * 100) / 100,
          currency,
          status: 'estimated',
          source: 'derived',
          periodStart: monthStart,
          periodEnd: nextMonth,
          basis: 'current-month income minus current-month spending (excluding non-spend categories)',
        },
      };

  // ── Savings ──
  const savings: FinancialArea = { status: 'unavailable', source: 'unavailable' };

  // ── Debt ──
  const debt: FinancialArea = { status: 'unavailable', source: 'unavailable' };

  // ── Goals ──
  let goals: GoalsArea;
  if (goalsResult.error || goalsResult.data === null) {
    goals = { status: 'unavailable', source: 'unavailable' };
  } else if (goalsResult.data.length === 0) {
    goals = { status: 'verified_zero', source: 'verified_db', activeCount: 0 };
  } else {
    goals = { status: 'verified', source: 'verified_db', activeCount: goalsResult.data.length };
  }

  // ── Time horizon ──
  const timeHorizon: TimeHorizonArea = { status: 'unavailable', source: 'unavailable' };

  // ── Missing areas ──
  const missingAreas: string[] = [];
  if (savings.status === 'unavailable') missingAreas.push('savings/investment balances');
  if (debt.status === 'unavailable') missingAreas.push('debt balances, rates, and terms');
  if (timeHorizon.status === 'unavailable') missingAreas.push('retirement/goal timeline');
  if (income.status === 'unavailable') missingAreas.push('income data');

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
    missingAreas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT TEXT REPRESENTATION (for future Prime injection)
// ─────────────────────────────────────────────────────────────────────────────

export function formatPositionForPrompt(pos: FinancialPosition): string {
  const lines: string[] = ['FINANCIAL POSITION:'];

  // Income
  if (pos.income.status === 'verified' && pos.income.periodTotal) {
    const pt = pos.income.periodTotal;
    lines.push(`Income: $${pt.amount.toLocaleString('en-CA')} (${pt.periodStart} to ${pt.periodEnd}, verified)`);
    if (pos.income.monthlyIncome) {
      lines.push(`  Current month: $${pos.income.monthlyIncome.amount.toLocaleString('en-CA')}`);
    }
  } else {
    lines.push('Income: unavailable');
  }

  // Spending
  if (pos.spending.status === 'verified' && pos.spending.periodTotal) {
    const pt = pos.spending.periodTotal;
    lines.push(`Spending: $${pt.amount.toLocaleString('en-CA')} (${pt.periodStart} to ${pt.periodEnd}, verified, excludes transfers/debt/investments)`);
    if (pos.spending.monthlySpend) {
      lines.push(`  Current month: $${pos.spending.monthlySpend.amount.toLocaleString('en-CA')}`);
    }
    if (pos.spending.topCategories && pos.spending.topCategories.length > 0) {
      lines.push(`  Top: ${pos.spending.topCategories.map(c => `${c.category}=$${c.amount.toLocaleString('en-CA')}`).join(', ')}`);
    }
  } else {
    lines.push('Spending: unavailable');
  }

  // Cash flow
  if (pos.cashFlow.status !== 'unavailable' && pos.cashFlow.monthlyNet) {
    const mn = pos.cashFlow.monthlyNet;
    lines.push(`Cash flow (current month, estimated): $${mn.amount.toLocaleString('en-CA')}`);
  }

  // Savings
  lines.push(`Savings/investments: ${pos.savings.status}`);

  // Debt
  lines.push(`Debt details: ${pos.debt.status}`);

  // Goals
  if (pos.goals.status === 'verified_zero') {
    lines.push('Goals: none set');
  } else if (pos.goals.status === 'verified') {
    lines.push(`Goals: ${pos.goals.activeCount} active`);
  } else {
    lines.push(`Goals: ${pos.goals.status}`);
  }

  // Time horizon
  lines.push(`Retirement/timeline: ${pos.timeHorizon.status}`);

  // Coverage
  if (pos.dataCoverage.transactionCount > 0) {
    lines.push(`Data: ${pos.dataCoverage.transactionCount} transactions, ${pos.dataCoverage.firstTransaction} to ${pos.dataCoverage.lastTransaction} (~${pos.dataCoverage.monthsCovered} months)`);
  } else {
    lines.push('Data: no transactions');
  }

  // Missing
  if (pos.missingAreas.length > 0) {
    lines.push(`Missing: ${pos.missingAreas.join('; ')}`);
  }

  return lines.join('\n');
}
