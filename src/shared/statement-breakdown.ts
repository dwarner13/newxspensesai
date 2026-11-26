/**
 * Reconciled statement breakdown (P-LIVE-03, owner 2026-11-26).
 *
 * A finer VIEW of the shared cash-flow classification (classifyCashFlow + buildPeriodAggregate):
 * no second engine. Every row is assigned to exactly one line; inflow lines must add up to the
 * raw deposits and outflow lines to the raw withdrawals (both by the row's type, the engine's
 * direction rule), and the result is cross-checked against buildPeriodAggregate. Any difference
 * is reported as a number, never explained by guessing (no "overdraft"/"missing deposits").
 */
import { classifyCashFlow, CANONICAL_CATEGORIES, type CashFlowPurpose } from './financial-taxonomy';

const CANONICAL_SET: ReadonlySet<string> = new Set([...CANONICAL_CATEGORIES, 'Income', 'Transfers', 'Debt Payments', 'Needs Review', 'Uncategorized'].map(c => String(c).toLowerCase()));
import { buildPeriodAggregate, type AggregateRow } from './period-aggregate';

export type BreakdownLineKey =
  // inflows
  | 'employment_income' | 'business_deposits' | 'other_deposits' | 'incoming_transfers' | 'cash_deposits'
  | 'refunds' | 'card_loan_payments_received'
  // outflows
  | 'everyday_spending' | 'mortgage_payments' | 'loan_repayments' | 'credit_card_payments'
  | 'savings_contributions' | 'outgoing_transfers' | 'cash_withdrawals' | 'other_non_spend' | 'unresolved';

export const BREAKDOWN_LINE_LABEL: Readonly<Record<BreakdownLineKey, string>> = {
  employment_income: 'Employment income',
  business_deposits: 'Business deposits',
  other_deposits: 'Other deposits',
  incoming_transfers: 'Incoming transfers',
  cash_deposits: 'Cash deposits',
  refunds: 'Refunds',
  card_loan_payments_received: 'Card/loan payments received',
  everyday_spending: 'Everyday spending',
  mortgage_payments: 'Mortgage payments',
  loan_repayments: 'Loan repayments',
  credit_card_payments: 'Credit card payments',
  savings_contributions: 'Savings contributions',
  outgoing_transfers: 'Outgoing transfers',
  cash_withdrawals: 'Cash withdrawals',
  other_non_spend: 'Other non-spend outflows',
  unresolved: 'Unresolved (needs review)',
};

const INFLOW_ORDER: BreakdownLineKey[] = ['employment_income', 'business_deposits', 'other_deposits', 'incoming_transfers',
  'cash_deposits', 'refunds', 'card_loan_payments_received'];
const OUTFLOW_ORDER: BreakdownLineKey[] = ['everyday_spending', 'mortgage_payments', 'loan_repayments', 'credit_card_payments',
  'savings_contributions', 'outgoing_transfers', 'cash_withdrawals', 'other_non_spend', 'unresolved'];

export interface BreakdownLine {
  key: BreakdownLineKey;
  label: string;
  direction: 'inflow' | 'outflow';
  cents: number;
  count: number;
}

export interface StatementBreakdown {
  lines: BreakdownLine[];
  /** Raw totals by the row's type (the engine's direction rule). */
  raw: { depositsCents: number; withdrawalsCents: number; netCents: number; depositCount: number; withdrawalCount: number };
  /** Sums of the lines. */
  lines_total: { depositsCents: number; withdrawalsCents: number; netCents: number };
  /** Rows that could not be placed (unsupported type or missing amount): never guessed. */
  unplaced: { count: number; reasons: Record<'unclassified_type' | 'missing_amount' | 'missing_date', number> };
  /** Lines − raw (0 when reconciled). */
  unexplainedDifferenceCents: { deposits: number; withdrawals: number };
  /** Lines equal raw AND equal buildPeriodAggregate's totals, with nothing unplaced. */
  reconciled: boolean;
  /** Same totals as the shared aggregate (guards against this view drifting from the engine). */
  engineAgrees: boolean;
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const EMPLOYMENT = new Set(['employment', 'employment income', 'payroll', 'salary', 'wages', 'pay']);
const UNRESOLVED_CATEGORIES = new Set(['', 'needs review', 'uncategorized']);

function lineFor(purpose: CashFlowPurpose, category: string, subcategory: string): BreakdownLineKey | null {
  switch (purpose) {
    case 'income':
      if (category === 'employment income' || EMPLOYMENT.has(subcategory)) return 'employment_income';
      if (category === 'business income' || subcategory === 'business') return 'business_deposits';
      return 'other_deposits';
    case 'refund': return 'refunds';
    case 'transfer_in': return subcategory === 'atm withdrawal' || subcategory === 'cash deposit' ? 'cash_deposits' : 'incoming_transfers';
    case 'debt_repayment_in': return 'card_loan_payments_received';
    case 'spending': return UNRESOLVED_CATEGORIES.has(category) ? 'unresolved' : 'everyday_spending';
    case 'classification_conflict': return 'unresolved';
    case 'debt_payment':
      if (subcategory === 'mortgage' || category === 'mortgage') return 'mortgage_payments';
      if (/credit card/.test(category) || /credit card/.test(subcategory)) return 'credit_card_payments';
      return 'loan_repayments';
    case 'savings_investment': return 'savings_contributions';
    case 'transfer_out': return subcategory === 'atm withdrawal' || category === 'cash withdrawal' ? 'cash_withdrawals' : 'outgoing_transfers';
    case 'other_non_spend': return 'other_non_spend';
    default: return null;
  }
}

export function buildStatementBreakdown(rows: ReadonlyArray<AggregateRow>): StatementBreakdown {
  const acc = new Map<BreakdownLineKey, { cents: number; count: number }>();
  const raw = { depositsCents: 0, withdrawalsCents: 0, depositCount: 0, withdrawalCount: 0 };
  const reasons = { unclassified_type: 0, missing_amount: 0, missing_date: 0 };

  for (const row of rows) {
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(row.date)) { reasons.missing_date++; continue; }
    const c = classifyCashFlow(row);
    if (c.direction === 'unclassified' || c.excluded === 'unclassified_type') { reasons.unclassified_type++; continue; }
    if (c.excluded === 'missing_amount' || c.amountCents === null) { reasons.missing_amount++; continue; }
    if (c.direction === 'inflow') { raw.depositsCents += c.amountCents; raw.depositCount++; }
    else { raw.withdrawalsCents += c.amountCents; raw.withdrawalCount++; }
    const key = lineFor(c.purpose, norm(row.category), norm(row.subcategory));
    if (!key) { reasons.unclassified_type++; continue; }
    const a = acc.get(key) ?? { cents: 0, count: 0 };
    a.cents += c.amountCents; a.count++;
    acc.set(key, a);
  }

  const lines: BreakdownLine[] = [
    ...INFLOW_ORDER.map(key => ({ key, direction: 'inflow' as const })),
    ...OUTFLOW_ORDER.map(key => ({ key, direction: 'outflow' as const })),
  ].map(({ key, direction }) => ({ key, label: BREAKDOWN_LINE_LABEL[key], direction, cents: acc.get(key)?.cents ?? 0, count: acc.get(key)?.count ?? 0 }));

  const dep = lines.filter(l => l.direction === 'inflow').reduce((s, l) => s + l.cents, 0);
  const wdr = lines.filter(l => l.direction === 'outflow').reduce((s, l) => s + l.cents, 0);
  const unplacedCount = reasons.unclassified_type + reasons.missing_amount + reasons.missing_date;

  const agg = buildPeriodAggregate(rows, { fetch: { complete: true, truncated: false, rowsFetched: rows.length } });
  const engineAgrees = agg.cents.totalInflow === dep && agg.cents.totalOutflow === wdr;
  const diff = { deposits: dep - raw.depositsCents, withdrawals: wdr - raw.withdrawalsCents };

  return {
    lines,
    raw: { ...raw, netCents: raw.depositsCents - raw.withdrawalsCents },
    lines_total: { depositsCents: dep, withdrawalsCents: wdr, netCents: dep - wdr },
    unplaced: { count: unplacedCount, reasons },
    unexplainedDifferenceCents: diff,
    reconciled: diff.deposits === 0 && diff.withdrawals === 0 && unplacedCount === 0 && engineAgrees,
    engineAgrees,
  };
}

/**
 * Rows extracted from a document by the worker chain (Byte/Tag workers), converted to engine rows.
 * Owner GO 2026-11-26 (UNIFIED FINANCIAL ENGINE; AR1b-TG-21): totals over extracted rows come from
 * the shared engine, never from model-supplied is_spend / category_totals. Direction is taken ONLY
 * from the extracted debit/credit side (bank evidence); a row without one stays unclassified and is
 * reported as unplaced, never guessed.
 */
/**
 * Tag HQ review (2026-11-26, blocking): the worker chain's category names mapped DETERMINISTICALLY to
 * canonical engine categories, so the engine's purpose never depends on the model's wording.
 * 'Cash Withdrawal' is Transfers / ATM Withdrawal (never spending). Unknown names → Needs Review.
 */
export const WORKER_CATEGORY_MAP: Readonly<Record<string, { category: string; subcategory: string | null }>> = {
  'income': { category: 'Income', subcategory: null },
  'transfer': { category: 'Transfers', subcategory: null },
  'bank fee': { category: 'Bank Fees', subcategory: null },
  'credit card payment': { category: 'Debt Payments', subcategory: 'Credit Card' },
  'subscription': { category: 'Subscriptions', subcategory: null },
  'software/ai': { category: 'Subscriptions', subcategory: 'Software' },
  'fitness/health': { category: 'Healthcare', subcategory: null },
  'retail': { category: 'Shopping', subcategory: null },
  'groceries': { category: 'Groceries', subcategory: null },
  'dining': { category: 'Food & Dining', subcategory: null },
  'cash withdrawal': { category: 'Transfers', subcategory: 'ATM Withdrawal' },
  'insurance': { category: 'Insurance', subcategory: null },
  'utilities': { category: 'Utilities', subcategory: null },
  'other': { category: 'Other', subcategory: null },
};

export interface ExtractedRow { direction?: unknown; amount?: unknown; category?: unknown; subcategory?: unknown; date?: unknown }
function canonicalCategory(category: unknown, subcategory: unknown): { category: string | null; subcategory: string | null } {
  const mapped = typeof category === 'string' ? WORKER_CATEGORY_MAP[category.trim().toLowerCase()] : undefined;
  if (mapped) return { category: mapped.category, subcategory: mapped.subcategory ?? (typeof subcategory === 'string' ? subcategory : null) };
  // A canonical category name passes through; anything else the worker should not have produced is
  // flagged for review (unresolved line), never silently counted as everyday spending (Tag HQ note).
  if (typeof category === 'string' && CANONICAL_SET.has(category.trim().toLowerCase())) {
    return { category: category.trim(), subcategory: typeof subcategory === 'string' ? subcategory : null };
  }
  return { category: typeof category === 'string' && category.trim() ? 'Needs Review' : null, subcategory: null };
}

export function engineRowsFromExtracted(rows: ReadonlyArray<ExtractedRow>, fallbackDate = '1970-01-01'): AggregateRow[] {
  return rows.map((r, i) => {
    const dir = String(r.direction ?? '').toLowerCase();
    const type = dir === 'credit' ? 'income' : dir === 'debit' ? 'expense' : null;
    const abs = Math.abs(Number(r.amount));
    const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r.date) ? r.date.slice(0, 10) : fallbackDate;
    return {
      id: `extracted-${i}`,
      date,
      amount: Number.isFinite(abs) ? (type === 'income' ? abs : -abs) : null,
      type,
      ...canonicalCategory(r.category, r.subcategory),
    };
  });
}
