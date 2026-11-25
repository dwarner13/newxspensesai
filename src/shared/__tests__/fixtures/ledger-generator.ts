/**
 * FST-2 S0 — synthetic multi-account ledger with an INDEPENDENT oracle.
 *
 * Every row is generated from a named KIND whose expected classification is written here by hand
 * (the owner's rules, D-1 included), not computed by the engine. Tests compare the engine, the
 * summary endpoint, the exports and the tax report against this oracle.
 *
 * Accounts are imports (the transactions table has no account column): a chequing statement,
 * a credit-card statement, a savings statement, and a DUPLICATE re-import of part of the
 * chequing statement (possible duplicates).
 */

export type Kind =
  | 'payroll'            // income
  | 'interest_earned'    // income
  | 'refund'             // income (flagged possible refund)
  | 'purchase'           // spending
  | 'card_purchase'      // spending (on the card account)
  | 'interest_charged'   // spending
  | 'bank_fee'           // spending
  | 'transfer_out'       // transfer_out
  | 'transfer_in'        // transfer_in
  | 'card_payment_bank'  // debt_payment (bank side)
  | 'card_payment_card'  // debt_repayment_in (card side, D-1)
  | 'savings_out'        // savings_investment
  | 'uncategorized'      // spending (type expense, no category)
  | 'credit_typed';      // unclassified (type 'Credit'): in NO total

export type Bucket = 'income' | 'spending' | 'transferIn' | 'transferOut' | 'debtPayments' | 'debtRepaymentsIn' | 'savingsInvestment' | 'unclassified';

/** Hand-written expected bucket per kind (the oracle). */
export const KIND_BUCKET: Record<Kind, Bucket> = {
  payroll: 'income',
  interest_earned: 'income',
  refund: 'income',
  purchase: 'spending',
  card_purchase: 'spending',
  interest_charged: 'spending',
  bank_fee: 'spending',
  transfer_out: 'transferOut',
  transfer_in: 'transferIn',
  card_payment_bank: 'debtPayments',
  card_payment_card: 'debtRepaymentsIn',
  savings_out: 'savingsInvestment',
  uncategorized: 'spending',
  credit_typed: 'unclassified',
};

/** Hand-written expected tax section per kind (internal movement is never an expense). */
export const KIND_TAX_SECTION: Record<Kind, string | null> = {
  payroll: 'income',
  interest_earned: 'income',
  refund: 'income',
  purchase: 'meals',               // generated with category "Food & Dining"
  card_purchase: 'personal',       // "Shopping"
  interest_charged: 'business',    // "Bank Fees"
  bank_fee: 'business',            // "Bank Fees"
  transfer_out: 'internal',
  transfer_in: 'internal',
  card_payment_bank: 'internal',
  card_payment_card: 'internal',
  savings_out: 'internal',
  uncategorized: 'other',
  credit_typed: null,              // unsectioned (type has no direction)
};

const SHAPE: Record<Kind, { type: string; category: string | null; subcategory?: string; sign: 1 | -1; merchant: string }> = {
  payroll: { type: 'income', category: 'Income', sign: 1, merchant: 'Synthetic Employer Payroll' },
  interest_earned: { type: 'income', category: 'Interest', sign: 1, merchant: 'Savings Interest' },
  refund: { type: 'income', category: 'Shopping', sign: 1, merchant: 'Synthetic Store Refund' },
  purchase: { type: 'expense', category: 'Food & Dining', sign: -1, merchant: 'Synthetic Cafe' },
  card_purchase: { type: 'expense', category: 'Shopping', sign: -1, merchant: 'Synthetic Store' },
  interest_charged: { type: 'expense', category: 'Bank Fees', subcategory: 'Interest', sign: -1, merchant: 'Card Interest' },
  bank_fee: { type: 'expense', category: 'Bank Fees', sign: -1, merchant: 'Monthly Fee' },
  transfer_out: { type: 'expense', category: 'Transfers', sign: -1, merchant: 'E-Transfer Out' },
  transfer_in: { type: 'income', category: 'Transfers', sign: 1, merchant: 'E-Transfer In' },
  card_payment_bank: { type: 'expense', category: 'Credit Card Payments', sign: -1, merchant: 'Card Payment' },
  card_payment_card: { type: 'income', category: 'Credit Card Payments', sign: 1, merchant: 'Payment Received' },
  savings_out: { type: 'expense', category: 'Savings', sign: -1, merchant: 'To Savings' },
  uncategorized: { type: 'expense', category: null, sign: -1, merchant: 'Unknown Merchant' },
  credit_typed: { type: 'Credit', category: 'Shopping', sign: 1, merchant: 'Ambiguous Credit' },
};

const ACCOUNT_OF: Record<Kind, 'chequing' | 'card' | 'savings'> = {
  payroll: 'chequing', interest_earned: 'savings', refund: 'card', purchase: 'chequing', card_purchase: 'card',
  interest_charged: 'card', bank_fee: 'chequing', transfer_out: 'chequing', transfer_in: 'savings',
  card_payment_bank: 'chequing', card_payment_card: 'card', savings_out: 'chequing', uncategorized: 'chequing',
  credit_typed: 'card',
};

export const IMPORTS = {
  chequing: '11111111-0000-4000-8000-000000000001',
  card: '11111111-0000-4000-8000-000000000002',
  savings: '11111111-0000-4000-8000-000000000003',
  chequingReimport: '11111111-0000-4000-8000-000000000004',
} as const;

const KINDS = Object.keys(SHAPE) as Kind[];

export interface LedgerRow {
  id: string; user_id: string; date: string; amount: number; type: string;
  category: string | null; subcategory: string | null; merchant_name: string; merchant: string;
  description: string; import_id: string; category_source: string | null; kind: Kind;
}

export interface Oracle {
  count: number;
  cents: Record<Bucket, number>;
  counts: Record<Bucket, number>;
  taxSections: Record<string, { cents: number; count: number }>;
  unsectioned: number;
  possibleDuplicates: number;
  possibleRefunds: number;
}

/**
 * `n` rows for `userId` over 2023-01-01 … 2025-12-28, cycling through every kind. The last
 * `dupes` chequing purchases are imported AGAIN under a second import (identical date, amount,
 * merchant) — the signature of a statement imported twice.
 */
export function generateLedger(n: number, userId = 'u-fst2', opts: { dupes?: number } = {}): { rows: LedgerRow[]; oracle: Oracle } {
  const rows: LedgerRow[] = [];
  const dupes = Math.min(opts.dupes ?? 25, Math.floor(n / 20));
  const base = n - dupes;
  for (let i = 0; i < base; i++) {
    const kind = KINDS[i % KINDS.length];
    const s = SHAPE[kind];
    const day = (i % 28) + 1;
    const month = Math.floor(i / 28) % 12 + 1;
    const year = 2023 + (Math.floor(i / (28 * 12)) % 3);
    const cents = 100 + ((i * 37) % 9900); // 1.00 … 99.99, deterministic
    rows.push({
      id: `${userId}-t${String(i).padStart(6, '0')}`,
      user_id: userId,
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      amount: (s.sign * cents) / 100,
      type: s.type,
      category: s.category,
      subcategory: s.subcategory ?? null,
      merchant_name: s.merchant,
      merchant: s.merchant,
      description: `${s.merchant} ${i}`,
      import_id: IMPORTS[ACCOUNT_OF[kind]],
      category_source: 'ai',
      kind,
    });
  }
  // duplicate re-import of chequing purchases
  const chequingPurchases = rows.filter(r => r.kind === 'purchase').slice(-dupes);
  chequingPurchases.forEach((r, k) => rows.push({ ...r, id: `${userId}-dup${String(k).padStart(5, '0')}`, import_id: IMPORTS.chequingReimport }));

  const zero = (): Record<Bucket, number> => ({ income: 0, spending: 0, transferIn: 0, transferOut: 0, debtPayments: 0, debtRepaymentsIn: 0, savingsInvestment: 0, unclassified: 0 });
  const oracle: Oracle = { count: rows.length, cents: zero(), counts: zero(), taxSections: {}, unsectioned: 0, possibleDuplicates: chequingPurchases.length, possibleRefunds: 0 };
  for (const r of rows) {
    const b = KIND_BUCKET[r.kind];
    const c = Math.round(Math.abs(r.amount) * 100);
    oracle.cents[b] += c;
    oracle.counts[b] += 1;
    if (r.kind === 'refund') oracle.possibleRefunds += 1;
    const sec = KIND_TAX_SECTION[r.kind];
    if (sec === null) { oracle.unsectioned += 1; continue; }
    const t = (oracle.taxSections[sec] ||= { cents: 0, count: 0 });
    t.cents += c;
    t.count += 1;
  }
  return { rows, oracle };
}

/** Oracle restricted to an inclusive date range (for period tests). */
export function oracleFor(rows: readonly LedgerRow[], start: string, end: string): Oracle {
  const inRange = rows.filter(r => r.date >= start && r.date <= end);
  const zero = (): Record<Bucket, number> => ({ income: 0, spending: 0, transferIn: 0, transferOut: 0, debtPayments: 0, debtRepaymentsIn: 0, savingsInvestment: 0, unclassified: 0 });
  const o: Oracle = { count: inRange.length, cents: zero(), counts: zero(), taxSections: {}, unsectioned: 0, possibleDuplicates: 0, possibleRefunds: 0 };
  for (const r of inRange) {
    const b = KIND_BUCKET[r.kind];
    const c = Math.round(Math.abs(r.amount) * 100);
    o.cents[b] += c; o.counts[b] += 1;
    if (r.kind === 'refund') o.possibleRefunds += 1;
    const sec = KIND_TAX_SECTION[r.kind];
    if (sec === null) { o.unsectioned += 1; continue; }
    const t = (o.taxSections[sec] ||= { cents: 0, count: 0 });
    t.cents += c; t.count += 1;
  }
  return o;
}
