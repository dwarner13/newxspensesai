/**
 * FST-2 S2 — CSV builder for the authoritative exports (pure; no I/O).
 *
 * Every data row is one transaction from the complete, count-verified ledger read, classified by
 * the shared engine (classifyCashFlow, D-1 included) and, for tax/accountant exports, assigned a
 * tax section by the shared TAX_SECTIONS (internal movement first). The header block states the
 * scope, completeness, reconciliation totals per classification and integrity notes, so the
 * accountant can check that the rows add up to the stated totals.
 */
import { classifyCashFlow, amountToCents, type CashFlowPurpose } from '../../../src/shared/financial-taxonomy';
import { TAX_SECTIONS } from '../../../src/shared/financial-sections';
import type { PeriodAggregate } from '../../../src/shared/period-aggregate';
import type { FinancialIntegritySignals } from '../../../src/shared/financial-integrity-signals';
import type { LedgerRow } from './financial-ledger';

export type ExportKind = 'transactions' | 'accountant' | 'tax';

export const PURPOSE_LABEL: Record<CashFlowPurpose, string> = {
  income: 'Income',
  refund: 'Refund',
  spending: 'Spending',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
  debt_payment: 'Debt payment',
  debt_repayment_in: 'Card/loan payment received',
  savings_investment: 'Savings/investment',
  other_non_spend: 'Other non-spend',
  classification_conflict: 'Needs review (category contradicts type)',
  unclassified: 'Unclassified (type has no direction; in no total)',
};

/** Tax section (first match wins), or null when no section claims the row. */
export function taxSectionOf(tx: LedgerRow): { id: string; title: string } | null {
  for (const s of TAX_SECTIONS) {
    if (s.matchFn({ ...tx, amount: Number(tx.amount) } as never)) return { id: s.id, title: s.title };
  }
  return null;
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // CSV injection guard: a leading = + - @ (or tab/CR) is neutralised for spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
const money = (cents: number) => (cents / 100).toFixed(2);

export interface ExportInput {
  kind: ExportKind;
  rows: readonly LedgerRow[];
  startDate: string;
  endDate: string;
  currency: string;
  accounts: Map<string, string>;
  accountScopeLabel: string;
  agg: PeriodAggregate;
  signals: FinancialIntegritySignals;
  countVerified: boolean;
}

export interface ExportResult {
  csv: string;
  rowCount: number;
  /** Cents per classification label, from the rows written (for reconciliation). */
  rowTotalsCents: Record<string, number>;
}

export function buildExportCsv(input: ExportInput): ExportResult {
  const { kind, rows, agg, signals } = input;
  const withSection = kind !== 'transactions';
  const header = ['Date', 'Description', 'Merchant', 'Category', 'Subcategory', 'Type', 'Classification', 'Amount', `Absolute amount (${input.currency})`, 'Account', ...(withSection ? ['Tax section'] : []), 'Transaction ID'];
  const lines: string[] = [];
  const rowTotalsCents: Record<string, number> = {};

  const sorted = [...rows].sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
  for (const r of sorted) {
    const c = classifyCashFlow(r);
    const label = PURPOSE_LABEL[c.purpose];
    const cents = amountToCents(r.amount);
    if (cents !== null) rowTotalsCents[label] = (rowTotalsCents[label] || 0) + cents;
    const section = withSection ? taxSectionOf(r) : null;
    lines.push([
      r.date, r.description ?? '', r.merchant_name || r.merchant || '', r.category ?? '', r.subcategory ?? '', r.type ?? '',
      label, r.amount ?? '', cents === null ? '' : money(cents),
      r.import_id ? (input.accounts.get(String(r.import_id)) ?? 'Imported statement') : '',
      ...(withSection ? [section?.title ?? 'Unsectioned (type has no direction)'] : []),
      r.id,
    ].map(cell).join(','));
  }

  const c = agg.cents;
  const n = agg.counts;
  const title = kind === 'tax' ? 'Tax-year transactions organized for your accountant'
    : kind === 'accountant' ? 'Accountant-ready transaction export' : 'Transaction export';
  const meta = [
    `# XspensesAI — ${title}`,
    `# Scope: ${input.startDate} to ${input.endDate}; ${input.accountScopeLabel}; currency ${input.currency} (profile currency, assumed — transactions carry no currency)`,
    `# Status: COMPLETE — ${rows.length} transactions; every transaction in scope was read${input.countVerified ? ' and the count was verified' : ''}`,
    `# Totals (${input.currency}): income ${money(c.income)} (${n.income}); spending ${money(c.spending)} (${n.spending}); transfers in ${money(c.transferIn)} (${n.transferIn}); transfers out ${money(c.transferOut)} (${n.transferOut}); debt payments ${money(c.debtPayments)} (${n.debtPayments}); card/loan payments received ${money(c.debtRepaymentsIn)} (${n.debtRepaymentsIn}); savings/investment ${money(c.savingsInvestment)} (${n.savingsInvestment}); needs review ${money(c.classificationConflict)} (${n.classificationConflict})`,
    `# Net (income − spending − debt payments − needs review; internal movements excluded): ${money(c.netExcludingInternalMovements)}`,
    `# Integrity: ${agg.completeness.excluded.unclassifiedType} transactions (${money(agg.completeness.unclassifiedCents)}) have a type with no direction and are in no total; ${signals.possibleDuplicates.count} possible duplicate-import transactions (${money(signals.possibleDuplicates.cents)}) are INCLUDED; ${signals.possibleRefunds.count} inflows (${money(signals.possibleRefunds.cents)}) look like refunds and are counted as income`,
    '# Organized for your accountant. Not tax advice: XspensesAI does not determine whether any amount is deductible.',
  ];
  if (withSection) {
    const bySection = new Map<string, { cents: number; count: number }>();
    for (const r of rows) {
      const t = taxSectionOf(r)?.title ?? 'Unsectioned (type has no direction)';
      const e = bySection.get(t) || { cents: 0, count: 0 };
      e.cents += amountToCents(r.amount) ?? 0; e.count++;
      bySection.set(t, e);
    }
    meta.push(`# Tax sections (${input.currency}): ${[...bySection.entries()].map(([t, e]) => `${t} ${money(e.cents)} (${e.count})`).join('; ')}`);
  }
  const csv = [...meta, header.map(cell).join(','), ...lines].join('\r\n') + '\r\n';
  return { csv, rowCount: lines.length, rowTotalsCents };
}
