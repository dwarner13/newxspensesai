/**
 * The shared financial label map (owner 2026-11-26; AR-1b R6). Every screen uses these words for the
 * fst2-summary-2 fields. Never "Net Flow", "Income" for deposits, or "Deductions Found".
 */
export const FINANCIAL_LABELS = {
  deposits: 'Deposits',
  withdrawals: 'Withdrawals',
  netCashFlow: 'Net Cash Flow',
  actualIncome: 'Actual Income',
  actualSpending: 'Actual Spending',
  refunds: 'Refunds',
  netExcludingTransfersAndSavings: 'Net excluding transfers and savings',
  possibleBusinessExpenses: 'Possible business expenses',
  possibleBusinessExpensesSub: 'Needs your review (not a tax decision)',
  needsReview: 'Need review',
} as const;

/** One-line definitions for tooltips / Show Me How. */
export const FINANCIAL_LABEL_HELP = {
  deposits: 'Every amount that came into your accounts.',
  withdrawals: 'Every amount that left your accounts.',
  netCashFlow: 'Deposits minus withdrawals.',
  actualIncome: 'Pay, business and other income. Excludes transfers in, refunds and card or loan payments received.',
  actualSpending: 'Everyday spending. Excludes transfers, cash withdrawals, debt payments (including mortgage) and savings.',
} as const;
