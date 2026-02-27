import { renderStatementBreakdownMarkdown } from '../netlify/functions-dist/_lib/renderStatementBreakdown.mjs';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function headingIndex(markdown: string, heading: string): number {
  return markdown.indexOf(`## ${heading}`);
}

function assertHeadingOrder(markdown: string, headings: string[]): void {
  let last = -1;
  for (const heading of headings) {
    const idx = headingIndex(markdown, heading);
    assert(idx >= 0, `Missing heading: ${heading}`);
    assert(idx > last, `Heading out of order: ${heading}`);
    last = idx;
  }
}

const fixtureWithOptionalSections: any = {
  statement_meta: {
    issuer: 'RBC',
    account_last4: '7223',
    period_start: '2025-12-16',
    period_end: '2026-01-14',
  },
  previous_balance: 1200,
  new_balance: 980,
  minimum_payment_due: 50,
  due_date: '2026-02-10',
  credit_limit: 5000,
  available_credit: 4020,
  statement_math: {
    previous_balance: 1200,
    payments_credits: -500,
    purchases_debits: 220,
    cash_advances: 100,
    interest: 60,
    fees: 100,
    new_balance: 1180,
  },
  rewards: {
    points_previous: 1000,
    points_earned: 200,
    points_new_balance: 1200,
  },
  rates: {
    purchase_apr: 20.99,
  },
  transactions: [
    { activity_date: '2026-01-01', posted_date: '2026-01-02', merchant: 'ESSO', amount: 52.31 },
    { activity_date: '2026-01-03', merchant: 'PAYMENT THANK YOU', amount: -200.0 },
  ],
  notes: ['Time to pay estimate: 11 months'],
};

const fixtureWithoutOptionalSections: any = {
  statement_meta: {
    issuer: 'RBC',
    account_last4: '7223',
  },
  transactions: [{ activity_date: '2026-01-01', merchant: 'Coffee Shop', amount: 5.75 }],
};

const markdownA = renderStatementBreakdownMarkdown(fixtureWithOptionalSections, { includeNextActions: true });
console.log(markdownA);
assertHeadingOrder(markdownA, [
  'Statement overview',
  'How the bank calculated your new balance',
  'Rewards',
  'Interest rates and fees',
  'Transactions',
  'Quick totals',
  'Important notes',
  'Next actions',
]);
assert(/\n1\.\s/.test(markdownA), 'Transactions must be numbered list');

const markdownB = renderStatementBreakdownMarkdown(fixtureWithoutOptionalSections, { includeNextActions: true });
assert(headingIndex(markdownB, 'Rewards') === -1, 'Rewards heading must be omitted when empty');
assert(headingIndex(markdownB, 'Interest rates and fees') === -1, 'Rates/fees heading must be omitted when empty');
assertHeadingOrder(markdownB, [
  'Statement overview',
  'How the bank calculated your new balance',
  'Transactions',
  'Quick totals',
  'Important notes',
  'Next actions',
]);

console.log('PASS statement-breakdown-render-smoke');
