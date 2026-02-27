import { renderStatementBreakdownMarkdown } from '../netlify/functions/_lib/renderStatementBreakdown.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function indexOfHeading(markdown: string, heading: string): number {
  return markdown.indexOf(`## ${heading}`);
}

const fixture: any = {
  version: 1,
  import_id: 'fixture-import',
  document_id: 'fixture-doc',
  user_id: 'fixture-user',
  created_at: new Date().toISOString(),
  statement_meta: {
    issuer: 'RBC ION Visa',
    account_last4: '7223',
    period_start: '2025-12-16',
    period_end: '2026-01-14',
    statement_type: 'credit_card',
  },
  previous_balance: 286.73,
  new_balance: 74.14,
  minimum_payment_due: 10.0,
  due_date: '2026-02-04',
  credit_limit: 500,
  available_credit: 425.86,
  statement_math: {
    previous_balance: 286.73,
    payments_credits: -790.85,
    purchases_debits: 578.26,
    cash_advances: 0,
    interest: 0,
    fees: 0,
    new_balance: 74.14,
  },
  rewards: {
    previous_points: 3021,
    points_earned: 579,
    bonus_points: 7,
    new_points_balance: 3607,
  },
  rates: {
    purchase_apr: 20.99,
    cash_advance_apr: 22.99,
  },
  transactions: [
    { activity_date: '2025-12-18', posted_date: '2025-12-18', merchant: 'CURSOR USAGE', amount: 113.51, fx: { amount: 80.24, currency: 'USD', rate: 1.414631 } },
    { activity_date: '2026-01-12', posted_date: '2026-01-12', merchant: 'PAYMENT - THANK YOU', amount: -500.0 },
  ],
  totals: {
    total_debits: 578.26,
    total_credits: 790.85,
    net: -212.59,
    transaction_count: 2,
  },
  flags: {
    duplicate_count: 0,
    refund_count: 0,
    needs_review_count: 0,
    low_confidence_count: 0,
    missing_date_count: 0,
  },
  confidence: {
    overall: 'high',
    ocr_confidence: 0.93,
    parse_confidence: 0.92,
    transaction_match_rate: 1,
    reconciled: true,
    recon_method: 'direct_debits',
  },
  notes: ['No overlimit fee this period.'],
};

const markdown = renderStatementBreakdownMarkdown(fixture, { includeNextActions: true });
console.log(markdown);

const orderedHeadings = [
  'Statement overview',
  'How the bank calculated your new balance',
  'Rewards',
  'Interest rates and fees',
  'Transactions',
  'Quick totals',
  'Important notes',
  'Next actions',
];

let lastIndex = -1;
for (const heading of orderedHeadings) {
  const currentIndex = indexOfHeading(markdown, heading);
  assert(currentIndex >= 0, `Missing heading: ${heading}`);
  assert(currentIndex > lastIndex, `Heading order incorrect near: ${heading}`);
  lastIndex = currentIndex;
}

console.log('PASS statement-render-smoke');

