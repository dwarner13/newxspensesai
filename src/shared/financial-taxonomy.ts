/**
 * CANONICAL FINANCIAL TAXONOMY
 *
 * Single source of truth for:
 * - NON_SPEND categories and subcategories
 * - Income classification
 * - Category/subcategory taxonomy
 * - Natural-language category aliases
 * - Query result semantics
 *
 * RULES:
 * - Pure TypeScript only. No React, no Supabase, no Node-only APIs.
 * - Every consumer (frontend hooks, backend functions, agent tools) should import from here.
 * - Do NOT duplicate these definitions elsewhere.
 * - All category/subcategory values must match EXISTING database taxonomy.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal transaction shape for classification. No DB/ORM dependency. */
export interface ClassifiableTransaction {
  category?: string | null;
  subcategory?: string | null;
  type?: string | null;
  amount?: number;
  merchant_name?: string | null;
  merchant?: string | null;
}

/** Result of resolving a natural-language category term. */
export interface CategoryResolution {
  /** Canonical DB category value */
  category: string;
  /** Canonical DB subcategory value (if applicable) */
  subcategory?: string;
  /** Which tax section this belongs to */
  section?: string;
}

/**
 * Query result status — distinguishes real zeros from tool/data limitations.
 *
 * - verified:              data found, totals are real
 * - verified_zero:         query executed successfully, genuinely zero results
 * - unresolved_category:   the category term could not be mapped to DB taxonomy
 * - insufficient_scope:    data source doesn't cover the requested time range / depth
 * - query_error:           an error occurred during execution
 */
export type QueryResultStatus =
  | 'verified'
  | 'verified_zero'
  | 'unresolved_category'
  | 'insufficient_scope'
  | 'query_error';

// ─────────────────────────────────────────────────────────────────────────────
// NON_SPEND CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categories that represent internal money movement, NOT real spending.
 * Excluded from spending/expense totals (monthlyExpenses, totalSpent, etc.).
 *
 * CANONICAL LIST — do not duplicate. Import and use isNonSpendCategory() instead.
 *
 * All values are lowercase for case-insensitive matching.
 */
export const NON_SPEND_CATEGORIES: ReadonlySet<string> = new Set([
  'transfers',
  'transfer',
  'loan payments',
  'loan payment',
  'credit card payments',
  'credit card payment',
  'investments',
  'investment',
  'debt payments',
  'debt payment',
  'income',
  'business income',
  'savings',
]);

/**
 * Subcategories that represent internal money movement even when the parent
 * category might look like a spend category.
 *
 * Example: subcategory="Car Loan" under category="Transportation" is a debt
 * payment that happens to be vehicle-related.
 */
export const NON_SPEND_SUBCATEGORIES: ReadonlySet<string> = new Set([
  'car loan',
  'loan payment',
  'loan payments',
  'credit card payment',
  'credit card payments',
  'credit card',
  'transfer',
  'transfers',
  'e-transfer',
  'investment',
  'investments',
  'tfsa',
  'rrsp',
  'debt payment',
  'debt payments',
  'atm withdrawal',
  'points redemption',
  'credit card payment',
]);

/** Check if a category represents non-spend (internal money movement). */
export function isNonSpendCategory(category: string | null | undefined): boolean {
  if (!category) return false;
  return NON_SPEND_CATEGORIES.has(category.trim().toLowerCase());
}

/**
 * Check if a transaction represents non-spend based on BOTH category and subcategory.
 *
 * NOTE ON TAX SECTION USAGE:
 * This function is used for SPENDING TOTAL calculations (excluding transfers from
 * expense sums). It is NOT used for Tax Section claiming — see financial-sections.ts
 * for the NON_SPEND decision documentation.
 */
export function isNonSpendTransaction(tx: { category?: string | null; subcategory?: string | null }): boolean {
  if (isNonSpendCategory(tx.category)) return true;
  if (!tx.subcategory) return false;
  return NON_SPEND_SUBCATEGORIES.has(tx.subcategory.trim().toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// INCOME CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merchant name patterns that indicate income transactions.
 * Matched against uppercased, trimmed merchant_name.
 */
export const INCOME_MERCHANT_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

/**
 * CASH FLOW income check — used by financial-position.ts and cash_flow_summary.
 *
 * Checks type field ('income' or 'Credit') and category field ('income').
 * The 'Credit' type represents credits/deposits on bank statements and is
 * counted as income for cash flow purposes.
 *
 * Does NOT include merchant pattern heuristics (unlike isIncomeBroad).
 * Does NOT check 'business income' category (that's covered by isNonSpendCategory).
 */
export function isIncomeCashFlow(tx: { type?: string | null; category?: string | null }): boolean {
  return tx.type === 'income' || tx.type === 'Credit' || (tx.category || '').toLowerCase() === 'income';
}

/**
 * STRICT income check — used for Tax Section first-match-wins claiming.
 *
 * Only uses the `type` field which is set by commit-import and is the most
 * reliable signal. This matches TaxWorkspacePage behavior and correctly
 * identifies the $2,149.84 fuel rebate as income.
 *
 * DO NOT add category/merchant heuristics here — that causes false claiming
 * (e.g., a "PAYMENT - CREDIT" merchant at a restaurant would be claimed as
 * income before Meals).
 */
export function isIncomeStrict(tx: ClassifiableTransaction): boolean {
  return (tx.type || '').toLowerCase() === 'income';
}

/**
 * BROAD income check — used for income aggregation totals and display.
 *
 * Includes type field, category field, and merchant pattern heuristics.
 * This matches the behavior used by usePrimeBriefingData, useDashboardData,
 * useStoryData, useCategoriesData, useXspenseScore, and prime-briefing.ts.
 *
 * IMPORTANT: Do NOT use this for first-match-wins Tax Section claiming.
 * Use isIncomeStrict() for that purpose.
 */
export function isIncomeBroad(tx: ClassifiableTransaction): boolean {
  const txType = (tx.type || '').toLowerCase();
  if (txType === 'income') return true;

  const cat = (tx.category || '').toLowerCase();
  if (cat === 'income' || cat === 'business income') return true;

  const merchant = (tx.merchant_name || '').toUpperCase().trim();
  if (merchant && INCOME_MERCHANT_PATTERNS.test(merchant)) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// CASH-FLOW CLASSIFICATION (Prime V1-A CP2)
// ─────────────────────────────────────────────────────────────────────────────
//
// One deterministic rule for authoritative aggregates:
//   - TYPE decides direction (inflow / outflow). Sign NEVER decides direction.
//   - CATEGORY, then SUBCATEGORY, decide purpose within that direction. Neither
//     ever flips direction.
//   - Money is |amount| in integer cents. Invalid amounts are excluded, never $0.
//   - Disagreements between type, category and sign are surfaced as conflicts,
//     not silently corrected.
// Refunds/reversals cannot be identified from current data (no refund type,
// `direction` is null, sign is unreliable) — they are NOT detected here.

export type CashFlowDirection = 'inflow' | 'outflow' | 'unclassified';

export type CashFlowPurpose =
  /** Inflow that is not a transfer. */
  | 'income'
  /** Ordinary consumption outflow. */
  | 'spending'
  | 'transfer_in'
  | 'transfer_out'
  /** Outflow to debt / loan / credit-card payment. */
  | 'debt_payment'
  /** Outflow to savings / investments (incl. TFSA/RRSP) — internal money movement. */
  | 'savings_investment'
  /** Other canonical non-spend outflow (e.g. ATM withdrawal, points redemption). */
  | 'other_non_spend'
  /** Outflow whose category contradicts its type (e.g. expense + "Income"). */
  | 'classification_conflict'
  | 'unclassified';

export type CashFlowConflict =
  /** Outflow (by type) carrying an income category, e.g. expense + "Income". */
  | 'income_category_on_outflow'
  /** Inflow (by type) carrying a debt / savings / other non-spend category or subcategory. */
  | 'non_spend_category_on_inflow'
  /** Inflow (by type) with a negative stored amount — possible reversal, not inferred. */
  | 'negative_inflow';

export type CashFlowExclusion = 'unclassified_type' | 'missing_amount';

export interface CashFlowClassification {
  direction: CashFlowDirection;
  purpose: CashFlowPurpose;
  /** |amount| in integer cents; null when excluded. */
  amountCents: number | null;
  /** Why the row cannot contribute to money totals (null = it can). */
  excluded: CashFlowExclusion | null;
  conflicts: CashFlowConflict[];
}

/**
 * Types with an established, unambiguous direction (compared case-insensitively).
 * 'Credit'/'Debit' are deliberately NOT here: commit-import documents that
 * credit-card statements label purchases as 'Credit', so it is not a reliable
 * inflow signal. Such rows are 'unclassified' and counted, never guessed.
 */
const CASH_FLOW_INFLOW_TYPES: ReadonlySet<string> = new Set(['income']);
const CASH_FLOW_OUTFLOW_TYPES: ReadonlySet<string> = new Set(['expense', 'purchase']);

export type NonSpendPurpose =
  | 'transfer'
  | 'debt_payment'
  | 'savings_investment'
  | 'other_non_spend'
  | 'income_category';

/**
 * Purpose of every canonical NON_SPEND_CATEGORIES entry (same list, no second
 * taxonomy — a test asserts the key sets are identical).
 */
export const NON_SPEND_CATEGORY_PURPOSE: Readonly<Record<string, NonSpendPurpose>> = {
  'transfers': 'transfer',
  'transfer': 'transfer',
  'loan payments': 'debt_payment',
  'loan payment': 'debt_payment',
  'credit card payments': 'debt_payment',
  'credit card payment': 'debt_payment',
  'debt payments': 'debt_payment',
  'debt payment': 'debt_payment',
  'investments': 'savings_investment',
  'investment': 'savings_investment',
  'savings': 'savings_investment',
  'income': 'income_category',
  'business income': 'income_category',
};

/**
 * Purpose of every canonical NON_SPEND_SUBCATEGORIES entry (same list — a test
 * asserts the key sets are identical).
 */
export const NON_SPEND_SUBCATEGORY_PURPOSE: Readonly<Record<string, Exclude<NonSpendPurpose, 'income_category'>>> = {
  'car loan': 'debt_payment',
  'loan payment': 'debt_payment',
  'loan payments': 'debt_payment',
  'credit card payment': 'debt_payment',
  'credit card payments': 'debt_payment',
  'credit card': 'debt_payment',
  'debt payment': 'debt_payment',
  'debt payments': 'debt_payment',
  'transfer': 'transfer',
  'transfers': 'transfer',
  'e-transfer': 'transfer',
  'investment': 'savings_investment',
  'investments': 'savings_investment',
  'tfsa': 'savings_investment',
  'rrsp': 'savings_investment',
  'atm withdrawal': 'other_non_spend',
  'points redemption': 'other_non_spend',
};

/**
 * Canonical income categories (CANONICAL_CATEGORIES 'Income', 'Business Income',
 * 'Employment Income'). Used ONLY to detect the income-category-on-outflow
 * conflict — never to set direction.
 */
export const INCOME_CATEGORIES: ReadonlySet<string> = new Set(['income', 'business income', 'employment income']);

/** Direction from `type` alone. */
export function cashFlowDirectionForType(type: string | null | undefined): CashFlowDirection {
  const t = (type || '').trim().toLowerCase();
  if (CASH_FLOW_INFLOW_TYPES.has(t)) return 'inflow';
  if (CASH_FLOW_OUTFLOW_TYPES.has(t)) return 'outflow';
  return 'unclassified';
}

/** Parse a stored amount; null for missing / non-numeric / non-finite values. */
export function parseTransactionAmount(amount: unknown): number | null {
  const n = typeof amount === 'number' ? amount
    : typeof amount === 'string' && amount.trim() !== '' ? Number(amount)
      : NaN;
  return Number.isFinite(n) ? n : null;
}

/** |amount| → integer cents (null when the amount is invalid). */
export function amountToCents(amount: unknown): number | null {
  const n = parseTransactionAmount(amount);
  return n === null ? null : Math.round(Math.abs(n) * 100);
}

const OUTFLOW_PURPOSE: Readonly<Record<Exclude<NonSpendPurpose, 'income_category'>, CashFlowPurpose>> = {
  transfer: 'transfer_out',
  debt_payment: 'debt_payment',
  savings_investment: 'savings_investment',
  other_non_spend: 'other_non_spend',
};

/**
 * Classify one transaction for authoritative aggregates.
 * Pure and deterministic: no DB, no model, no natural-language parsing.
 *
 * Purpose precedence (within the type-decided direction):
 *   outflow: income category → classification_conflict; else category purpose;
 *            else subcategory purpose; else spending.
 *   inflow:  transfer category or subcategory → transfer_in; else income.
 */
export function classifyCashFlow(tx: {
  type?: string | null;
  category?: string | null;
  subcategory?: string | null;
  amount?: unknown;
}): CashFlowClassification {
  const direction = cashFlowDirectionForType(tx.type);
  if (direction === 'unclassified') {
    return { direction, purpose: 'unclassified', amountCents: null, excluded: 'unclassified_type', conflicts: [] };
  }

  const parsed = parseTransactionAmount(tx.amount);
  const conflicts: CashFlowConflict[] = [];
  const category = (tx.category || '').trim().toLowerCase();
  const subcategory = (tx.subcategory || '').trim().toLowerCase();
  const categoryPurpose = NON_SPEND_CATEGORY_PURPOSE[category];
  const subcategoryPurpose = NON_SPEND_SUBCATEGORY_PURPOSE[subcategory];

  let purpose: CashFlowPurpose;
  if (direction === 'inflow') {
    if (categoryPurpose === 'transfer' || (!categoryPurpose && subcategoryPurpose === 'transfer')) {
      purpose = 'transfer_in';
    } else {
      purpose = 'income';
      const nonSpend = categoryPurpose ?? subcategoryPurpose;
      if (nonSpend && nonSpend !== 'income_category') {
        conflicts.push('non_spend_category_on_inflow');
      }
    }
    if (parsed !== null && parsed < 0) conflicts.push('negative_inflow');
  } else if (INCOME_CATEGORIES.has(category)) {
    purpose = 'classification_conflict';
    conflicts.push('income_category_on_outflow');
  } else if (categoryPurpose && categoryPurpose !== 'income_category') {
    purpose = OUTFLOW_PURPOSE[categoryPurpose];
  } else if (subcategoryPurpose) {
    purpose = OUTFLOW_PURPOSE[subcategoryPurpose];
  } else {
    purpose = 'spending';
  }

  if (parsed === null) {
    return { direction, purpose, amountCents: null, excluded: 'missing_amount', conflicts };
  }
  return { direction, purpose, amountCents: Math.round(Math.abs(parsed) * 100), excluded: null, conflicts };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY / SUBCATEGORY TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical DB categories — derived from merchantCategoryMap.ts, TaxWorkspacePage
 * section matchers, and existing transaction data.
 *
 * These are the ONLY valid category values in the database. Adding new categories
 * here requires corresponding changes to Tag categorization and Tax Section matchers.
 */
export const CANONICAL_CATEGORIES = [
  'Transportation',
  'Automotive',
  'Food & Dining',
  'Groceries',
  'Entertainment',
  'Personal Care',
  'Healthcare',
  'Shopping',
  'Subscriptions',
  'Bank Fees',
  'Housing',
  'Utilities',
  'Rent or Lease',
  'Home / Rent / Lease',
  'Insurance',
  'Transfers',
  'Debt Payments',
  'Investments',
  'Income',
  'Business Income',
  'Employment Income',
  'Business Expenses',
  'Advertising',
  'Technology',
  'Office Supplies',
  'Professional Services',
  'Travel',
  'Savings',
  'Needs Review',
] as const;

export type CanonicalCategory = typeof CANONICAL_CATEGORIES[number];

/**
 * Canonical DB subcategories — derived from merchantCategoryMap.ts and
 * TaxWorkspacePage bucket definitions.
 *
 * Organized by parent category for reference. The resolver uses these
 * to validate resolution targets.
 */
export const CANONICAL_SUBCATEGORIES: Record<string, readonly string[]> = {
  Transportation: [
    'Gas & Fuel', 'Parking', 'Vehicle Maintenance', 'Vehicle Registration',
    'Car Loan', 'Car Wash', 'Car Rental', 'Vehicle Insurance', 'Vehicle Services',
    'Traffic Fine', 'Rideshare',
  ],
  'Food & Dining': [
    'Coffee & Drinks', 'Restaurants', 'Fast Food', 'Delivery',
    'Restaurants / Dining',
  ],
  Groceries: ['Food Supply'],
  Entertainment: [
    'Gaming & Lottery', 'Golf', 'Sports', 'Events', 'Streaming',
    'Events / Tickets',
  ],
  'Personal Care': [
    'Gym & Fitness', 'Hair & Beauty', 'Massage & Wellness',
    'Pharmacy', 'Clothing', 'Nail Care',
  ],
  Healthcare: [
    'Supplements', 'Chiropractic', 'Vision', 'Medical', 'Pharmacy',
    'Dental',
  ],
  Shopping: ['Auto & Hardware', 'Online Shopping', 'General Shopping'],
  Subscriptions: ['Streaming', 'Software & AI', 'Software'],
  'Bank Fees': [
    'Balance Protection', 'Banking', 'Credit Services', 'Professional Fees',
    'Interest', 'Cash Advance Fee', 'Overlimit Fee', 'Foreign Transaction Fee',
    'Annual Fee',
  ],
  Housing: ['Rent or Mortgage', 'Utilities', 'Mortgage / Rent', 'Condo Fees', 'Home Insurance'],
  Utilities: ['Phone & Internet'],
  'Debt Payments': ['Credit Card', 'Loan Payment', 'Credit Card Payment'],
  Transfers: ['e-Transfer', 'ATM Withdrawal', 'Credit Card Payment', 'Points Redemption'],
  Income: ['Employment', 'Tax Refund', 'Government Rebate', 'Investment', 'Business Income'],
  'Business Expenses': ['Professional Services'],
  Insurance: ['Business Insurance'],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// NATURAL-LANGUAGE CATEGORY RESOLVER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps natural-language terms to canonical DB category + subcategory.
 *
 * All keys are lowercase. All values reference EXISTING database taxonomy.
 * Derived from:
 * - TaxWorkspacePage bucket keywords
 * - merchantCategoryMap.ts category assignments
 * - Common user query patterns
 *
 * DO NOT invent category/subcategory values here. Every value must exist
 * in CANONICAL_CATEGORIES or CANONICAL_SUBCATEGORIES above.
 */
const CATEGORY_ALIAS_MAP: Record<string, CategoryResolution> = {
  // ── Vehicle / Transportation ──
  'fuel':                 { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'gas':                  { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'gasoline':             { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'gas / fuel':           { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'gas & fuel':           { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'gas and fuel':         { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'vehicle fuel':         { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'car fuel':             { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'petrol':               { category: 'Transportation', subcategory: 'Gas & Fuel', section: 'vehicle' },
  'parking':              { category: 'Transportation', subcategory: 'Parking', section: 'vehicle' },
  'car wash':             { category: 'Transportation', subcategory: 'Car Wash', section: 'vehicle' },
  'vehicle maintenance':  { category: 'Transportation', subcategory: 'Vehicle Maintenance', section: 'vehicle' },
  'car maintenance':      { category: 'Transportation', subcategory: 'Vehicle Maintenance', section: 'vehicle' },
  'car repair':           { category: 'Transportation', subcategory: 'Vehicle Maintenance', section: 'vehicle' },
  'car repairs':          { category: 'Transportation', subcategory: 'Vehicle Maintenance', section: 'vehicle' },
  'oil change':           { category: 'Transportation', subcategory: 'Vehicle Maintenance', section: 'vehicle' },
  'vehicle registration': { category: 'Transportation', subcategory: 'Vehicle Registration', section: 'vehicle' },
  'car registration':     { category: 'Transportation', subcategory: 'Vehicle Registration', section: 'vehicle' },
  'car loan':             { category: 'Transportation', subcategory: 'Car Loan', section: 'vehicle' },
  'car payment':          { category: 'Transportation', subcategory: 'Car Loan', section: 'vehicle' },
  'car payments':         { category: 'Transportation', subcategory: 'Car Loan', section: 'vehicle' },
  'vehicle insurance':    { category: 'Transportation', subcategory: 'Vehicle Insurance', section: 'vehicle' },
  'car insurance':        { category: 'Transportation', subcategory: 'Vehicle Insurance', section: 'vehicle' },
  'auto insurance':       { category: 'Transportation', subcategory: 'Vehicle Insurance', section: 'vehicle' },
  'car rental':           { category: 'Transportation', subcategory: 'Car Rental', section: 'vehicle' },
  'rideshare':            { category: 'Transportation', subcategory: 'Rideshare', section: 'vehicle' },
  'taxi':                 { category: 'Transportation', subcategory: 'Rideshare', section: 'vehicle' },
  'uber':                 { category: 'Transportation', subcategory: 'Rideshare', section: 'vehicle' },
  'traffic fine':         { category: 'Transportation', subcategory: 'Traffic Fine', section: 'vehicle' },
  'traffic fines':        { category: 'Transportation', subcategory: 'Traffic Fine', section: 'vehicle' },
  'vehicle':              { category: 'Transportation', section: 'vehicle' },
  'vehicle expenses':     { category: 'Transportation', section: 'vehicle' },
  'transportation':       { category: 'Transportation', section: 'vehicle' },
  'automotive':           { category: 'Automotive', section: 'vehicle' },

  // ── Food & Dining ──
  'restaurants':          { category: 'Food & Dining', subcategory: 'Restaurants', section: 'meals' },
  'restaurant':           { category: 'Food & Dining', subcategory: 'Restaurants', section: 'meals' },
  'dining':               { category: 'Food & Dining', subcategory: 'Restaurants', section: 'meals' },
  'dining out':           { category: 'Food & Dining', subcategory: 'Restaurants', section: 'meals' },
  'eating out':           { category: 'Food & Dining', subcategory: 'Restaurants', section: 'meals' },
  'coffee':               { category: 'Food & Dining', subcategory: 'Coffee & Drinks', section: 'meals' },
  'coffee & drinks':      { category: 'Food & Dining', subcategory: 'Coffee & Drinks', section: 'meals' },
  'fast food':            { category: 'Food & Dining', subcategory: 'Fast Food', section: 'meals' },
  'takeout':              { category: 'Food & Dining', subcategory: 'Delivery', section: 'meals' },
  'delivery':             { category: 'Food & Dining', subcategory: 'Delivery', section: 'meals' },
  'food':                 { category: 'Food & Dining', section: 'meals' },
  'food & dining':        { category: 'Food & Dining', section: 'meals' },
  'food and dining':      { category: 'Food & Dining', section: 'meals' },
  'meals':                { category: 'Food & Dining', section: 'meals' },
  'meals & entertainment': { category: 'Food & Dining', section: 'meals' },

  // ── Groceries ──
  'groceries':            { category: 'Groceries' },
  'grocery':              { category: 'Groceries' },

  // ── Home / Housing ──
  'rent':                 { category: 'Housing', subcategory: 'Rent or Mortgage', section: 'home' },
  'mortgage':             { category: 'Housing', subcategory: 'Rent or Mortgage', section: 'home' },
  'mortgage / rent':      { category: 'Housing', subcategory: 'Rent or Mortgage', section: 'home' },
  'condo fees':           { category: 'Housing', subcategory: 'Condo Fees', section: 'home' },
  'home insurance':       { category: 'Housing', subcategory: 'Home Insurance', section: 'home' },
  'housing':              { category: 'Housing', section: 'home' },
  'home':                 { category: 'Housing', section: 'home' },
  'home expenses':        { category: 'Housing', section: 'home' },

  // ── Utilities ──
  'utilities':            { category: 'Utilities', section: 'home' },
  'internet':             { category: 'Utilities', subcategory: 'Phone & Internet', section: 'home' },
  'phone':                { category: 'Utilities', subcategory: 'Phone & Internet', section: 'home' },
  'electricity':          { category: 'Utilities', section: 'home' },
  'electric':             { category: 'Utilities', section: 'home' },

  // ── Entertainment ──
  'entertainment':        { category: 'Entertainment', section: 'meals' },
  'golf':                 { category: 'Entertainment', subcategory: 'Golf' },
  'gambling':             { category: 'Entertainment', subcategory: 'Gaming & Lottery' },
  'casino':               { category: 'Entertainment', subcategory: 'Gaming & Lottery' },
  'streaming':            { category: 'Subscriptions', subcategory: 'Streaming' },

  // ── Personal Care ──
  'personal care':        { category: 'Personal Care', section: 'personal' },
  'fitness':              { category: 'Personal Care', subcategory: 'Gym & Fitness', section: 'personal' },
  'gym':                  { category: 'Personal Care', subcategory: 'Gym & Fitness', section: 'personal' },
  'hair':                 { category: 'Personal Care', subcategory: 'Hair & Beauty', section: 'personal' },
  'salon':                { category: 'Personal Care', subcategory: 'Hair & Beauty', section: 'personal' },
  'massage':              { category: 'Personal Care', subcategory: 'Massage & Wellness', section: 'personal' },
  'spa':                  { category: 'Personal Care', subcategory: 'Massage & Wellness', section: 'personal' },
  'wellness':             { category: 'Personal Care', subcategory: 'Massage & Wellness', section: 'personal' },

  // ── Healthcare ──
  'healthcare':           { category: 'Healthcare', section: 'personal' },
  'pharmacy':             { category: 'Healthcare', subcategory: 'Pharmacy', section: 'personal' },
  'medical':              { category: 'Healthcare', subcategory: 'Medical', section: 'personal' },
  'dental':               { category: 'Healthcare', subcategory: 'Dental', section: 'personal' },
  'dentist':              { category: 'Healthcare', subcategory: 'Dental', section: 'personal' },
  'vision':               { category: 'Healthcare', subcategory: 'Vision', section: 'personal' },
  'supplements':          { category: 'Healthcare', subcategory: 'Supplements', section: 'personal' },
  'chiropractic':         { category: 'Healthcare', subcategory: 'Chiropractic', section: 'personal' },

  // ── Shopping ──
  'shopping':             { category: 'Shopping', section: 'personal' },
  'online shopping':      { category: 'Shopping', subcategory: 'Online Shopping', section: 'personal' },
  'clothing':             { category: 'Shopping', section: 'personal' },

  // ── Subscriptions / Business ──
  'subscriptions':        { category: 'Subscriptions', section: 'business' },
  'software':             { category: 'Subscriptions', subcategory: 'Software & AI', section: 'business' },
  'bank fees':            { category: 'Bank Fees', section: 'business' },
  'insurance':            { category: 'Insurance' },
  'business insurance':   { category: 'Insurance', subcategory: 'Business Insurance', section: 'business' },
  'professional services': { category: 'Professional Services', section: 'business' },
  'business expenses':    { category: 'Business Expenses', section: 'business' },
  'advertising':          { category: 'Advertising', section: 'business' },

  // ── Transfers / Debt ──
  'transfers':            { category: 'Transfers' },
  'transfer':             { category: 'Transfers' },
  'e-transfer':           { category: 'Transfers', subcategory: 'e-Transfer' },
  'debt payments':        { category: 'Debt Payments' },
  'loan payments':        { category: 'Debt Payments', subcategory: 'Loan Payment' },
  'credit card payments': { category: 'Debt Payments', subcategory: 'Credit Card' },
  'investments':          { category: 'Investments' },

  // ── Income ──
  'income':               { category: 'Income', section: 'income' },
  'employment':           { category: 'Income', subcategory: 'Employment', section: 'income' },
  'business income':      { category: 'Business Income', section: 'income' },

  // ── Travel ──
  'travel':               { category: 'Travel', section: 'personal' },
};

/**
 * Resolve a natural-language category term to canonical DB values.
 *
 * Returns null for unknown terms — callers must handle the unresolved case
 * explicitly (e.g., return QueryResultStatus = 'unresolved_category').
 *
 * @param input - Natural-language term (e.g., "fuel", "gas & fuel", "restaurants")
 * @returns CategoryResolution or null if the term cannot be resolved
 */
export function resolveCategory(input: string): CategoryResolution | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;
  return CATEGORY_ALIAS_MAP[normalized] ?? null;
}

/**
 * Try to resolve a category string. If it matches a canonical category name
 * exactly (case-insensitive), return it as-is. Otherwise try the alias map.
 */
export function resolveCategoryOrPassthrough(input: string): CategoryResolution | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // First: check alias map
  const aliased = resolveCategory(trimmed);
  if (aliased) return aliased;

  // Second: check if it's already a canonical category name (case-insensitive)
  const lower = trimmed.toLowerCase();
  for (const cat of CANONICAL_CATEGORIES) {
    if (cat.toLowerCase() === lower) {
      return { category: cat };
    }
  }

  return null;
}
