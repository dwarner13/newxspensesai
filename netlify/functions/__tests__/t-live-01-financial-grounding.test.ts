/**
 * T-LIVE-01 — Tag financial grounding (owner live acceptance finding, staging 9275ddb).
 *
 * Reproduces the failure classes from the owner's live acceptance test (a greeting answered with
 * unsolicited, inflated expense / income totals and a health verdict; then a partial search sum
 * presented as an income total, against a merchant breakdown that did not reconcile) on SYNTHETIC
 * fixtures only — no real customer figures appear in this file — and
 * proves the corrected behaviour:
 *   - the shared engine (buildPeriodAggregate / classifyCashFlow / computeIntegritySignals) is
 *     verified against hand-computed fixtures before Tag relies on it;
 *   - Tag's figures come only from that engine, paged past the 1,000-row API cap, spending only,
 *     with period / accounts / currency / completeness;
 *   - breakdowns reconcile exactly or name the remainder;
 *   - search totals cover all matches or are labelled a sample with no dollar total;
 *   - greetings never trigger financial figures;
 *   - categorization progress uses exact counts and preserves customer-kept "Other".
 * Prime HQ's capped fake client (fixtures/capped-supabase.ts) is the shared cap model.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { buildPeriodAggregate } from '../../../src/shared/period-aggregate';
import { computeIntegritySignals } from '../../../src/shared/financial-integrity-signals';
import { makeCappedClient, syntheticTransactions, expectedTotals, type FakeRow } from '../../../src/shared/__tests__/fixtures/capped-supabase';
import {
  summarizeTagSpending,
  loadTagSpendingSummary,
  formatSpendingBlock,
  formatScopeLine,
  categorizationProgressFromCounts,
  formatProgressBlock,
  loadCategorizationProgress,
  summarizeSearchTotals,
  isSmallTalk,
  formatCents,
  CUSTOMER_KEPT_SOURCES,
  type TagSpendingScope,
} from '../_shared/tagFinancialContext';
import { merchantGroupingKey } from '../_shared/merchantNormalize';

const USER = '33333333-3333-4333-8333-333333333333';
const SCOPE: TagSpendingScope = { period: { start: '2026-01-01', end: '2026-12-31' }, periodSource: 'requested', currency: 'CAD', accounts: ['Bank · chequing', 'Card · visa'], undatedRows: 0 };
const COMPLETE = { complete: true, truncated: false, rowsFetched: 0 };

// A household ledger built to expose every double-counting path the owner saw. Cents are hand-computed.
let n = 0;
const tx = (date: string, amount: number, type: string, category: string, merchant: string, importId = 'imp-bank'): FakeRow => ({
  id: `f-${String(++n).padStart(4, '0')}`, user_id: USER, date, posted_at: date, amount, type, category, subcategory: null,
  merchant_name: merchant, description: merchant, import_id: importId, category_source: 'ai',
});
const LEDGER: FakeRow[] = [
  tx('2026-01-15', 5000, 'income', 'Income', 'ACME PAYROLL'),                 // income 500000
  tx('2026-02-15', 1000, 'income', 'Employment Income', 'ACME PAYROLL'),      // income 100000 (old Tag: "spent")
  tx('2026-01-20', -2000, 'expense', 'Transfers', 'TFR TO SAVINGS ACCT'),     // transfer out 200000
  tx('2026-01-20', 2000, 'income', 'Transfers', 'TFR FROM CHEQUING', 'imp-sav'), // transfer in 200000
  tx('2026-01-25', -1500, 'expense', 'Credit Card Payments', 'VISA PAYMENT'), // debt payment 150000
  tx('2026-01-25', 1500, 'income', 'Credit Card Payments', 'PAYMENT THANK YOU', 'imp-card'), // D-1: debt repayment received (not income)
  tx('2026-01-05', -1000, 'expense', 'Groceries', 'SAVE ON FOODS', 'imp-card'), // spending 100000
  tx('2026-01-06', -500, 'expense', 'Dining', 'CACTUS CLUB', 'imp-card'),       // spending 50000
  tx('2026-01-07', 50, 'income', 'Shopping', 'AMAZON REFUND', 'imp-card'),      // income 5000, possible refund
  tx('2026-01-08', -30, 'expense', 'Income', 'MISLABELLED FEE'),               // classification conflict 3000
  tx('2026-01-09', -400, 'expense', 'Savings', 'TFSA CONTRIBUTION'),            // savings 40000
];

/** The pre-fix tag-copilot arithmetic (9275ddb), kept here only to reproduce the failure. */
function legacyTagTotals(rows: FakeRow[]) {
  let spent = 0; let income = 0;
  for (const t of rows) {
    const amt = Math.abs(Number(t.amount || 0));
    if ((t.category || 'Other') === 'Income') { income += amt; continue; }
    spent += amt;
  }
  return { spent, income };
}

describe('T-LIVE-01 — shared engine verified against deterministic fixtures', () => {
  it('classifies the household ledger exactly (integer cents)', () => {
    const agg = buildPeriodAggregate(LEDGER, { fetch: { ...COMPLETE, rowsFetched: LEDGER.length }, period: SCOPE.period });
    expect(agg.cents.spending).toBe(150000);              // groceries + dining only
    expect(agg.cents.transferOut).toBe(200000);
    expect(agg.cents.transferIn).toBe(200000);
    expect(agg.cents.debtPayments).toBe(150000);          // bank-side card payment is not spending
    expect(agg.cents.savingsInvestment).toBe(40000);
    expect(agg.cents.classificationConflict).toBe(3000);
    // D-1 (owner-approved 2026-11-25, engine 4c7e3023): the card-side payment received is a debt
    // repayment — visible, never income, never spending. Income = payroll + Employment Income + refund.
    expect(agg.cents.income).toBe(500000 + 100000 + 5000);
    expect(agg.cents.debtRepaymentsIn).toBe(150000);
    expect(agg.cents.totalInflow).toBe(500000 + 100000 + 5000 + 200000 + 150000);
    expect(agg.completeness.conflicts.non_spend_category_on_inflow).toBe(0);
    expect(agg.completeness.conflicts.income_category_on_outflow).toBe(1);
    expect(agg.completeness.authoritative).toBe(true);
  });

  it('a truncated fetch is never authoritative', () => {
    const agg = buildPeriodAggregate(LEDGER, { fetch: { complete: false, truncated: true, rowsFetched: LEDGER.length }, period: SCOPE.period });
    expect(agg.completeness.authoritative).toBe(false);
  });

  it('integrity signals flag (never remove) refunds and cross-import duplicates', () => {
    const dupe = { ...LEDGER[6], id: 'f-dupe', import_id: 'imp-card-again' };
    const sig = computeIntegritySignals([...LEDGER, dupe], { merchantKey: merchantGroupingKey });
    expect(sig.possibleRefunds).toEqual({ count: 1, cents: 5000 });
    expect(sig.possibleDuplicates).toEqual({ count: 1, cents: 100000, groups: 1 });
    // Two identical purchases inside ONE import are legitimate.
    const twin = { ...LEDGER[6], id: 'f-twin' };
    expect(computeIntegritySignals([...LEDGER, twin], { merchantKey: merchantGroupingKey }).possibleDuplicates.count).toBe(0);
  });
});

describe('T-LIVE-01 — the inflated expense / income totals failure, reproduced and corrected', () => {
  it('the legacy arithmetic inflates spending with transfers, card payments, savings and income rows', () => {
    const legacy = legacyTagTotals(LEDGER);
    // 2000+2000+1500+1500+1000+500+50+400+1000(Employment Income) = 9,950 "spent" vs 1,500 real spending.
    expect(legacy.spent).toBe(9950);
    // Misses Employment Income, yet counts the $30 OUTFLOW labelled "Income" as income.
    expect(legacy.income).toBe(5030);
    const s = summarizeTagSpending(LEDGER, { fetch: { ...COMPLETE, rowsFetched: LEDGER.length }, scope: SCOPE });
    expect(s.spending.cents).toBe(150000);
    expect(legacy.spent * 100 / s.spending.cents).toBeGreaterThan(6); // the owner saw ~4.6x income
  });

  it('Tag spending view: categories and merchants reconcile exactly; non-spend is disclosed separately', () => {
    const s = summarizeTagSpending(LEDGER, { fetch: { ...COMPLETE, rowsFetched: LEDGER.length }, scope: SCOPE });
    expect(s.reconciled).toBe(true);
    expect(s.authoritative).toBe(true);
    expect(s.categories).toEqual([
      { label: 'Groceries', cents: 100000, count: 1 },
      { label: 'Dining', cents: 50000, count: 1 },
    ]);
    expect(s.notSpending).toEqual({ transferOutCents: 200000, debtPaymentCents: 150000, savingsInvestmentCents: 40000, classificationConflictCents: 3000 });
    const block = formatSpendingBlock(s);
    expect(block).toContain('Spending total: $1,500.00 across 2 transactions');
    expect(block).toContain('Period 2026-01-01 to 2026-12-31');
    expect(block).toContain('Currency: CAD');
    expect(block).toContain('Accounts: Bank · chequing, Card · visa');
    expect(block).toContain('Data: complete');
    expect(block).toContain('possible refunds');
    // Tag gets NO income figure at all.
    expect(block).not.toMatch(/income: \$|Total income|TOTAL INCOME/i);
  });

  it('merchant breakdown: top N plus an "all other merchants" remainder that sums to the total', () => {
    const rows = syntheticTransactions(600, USER);
    const s = summarizeTagSpending(rows, { fetch: { ...COMPLETE, rowsFetched: 600 }, scope: { ...SCOPE, period: { start: '2025-01-01', end: '2026-12-31' } }, topMerchants: 15 });
    expect(s.merchants).toHaveLength(15);
    expect(s.merchantsRemainder?.groups).toBe(37 - 15);
    const sum = s.merchants.reduce((a, m) => a + m.cents, 0) + (s.merchantsRemainder?.cents ?? 0);
    expect(sum).toBe(s.spending.cents);
    expect(s.spending.cents).toBe(expectedTotals(600).spending);
    const block = formatSpendingBlock(s);
    expect(block).toMatch(/All other merchants \(22\): \$/);
    expect(block).toContain('add up exactly to the spending total');
  });

  it('a partial read is labelled PARTIAL and never presented as the full picture', () => {
    const s = summarizeTagSpending(LEDGER, { fetch: { complete: false, truncated: true, rowsFetched: LEDGER.length }, scope: SCOPE });
    expect(s.authoritative).toBe(false);
    expect(formatScopeLine(s)).toContain('PARTIAL');
    expect(formatSpendingBlock(s)).toContain('Never present them as the full picture');
  });

  it('possible duplicate imports are disclosed with count and amount and stay in the total', () => {
    const dupe = { ...LEDGER[6], id: 'f-dupe2', import_id: 'imp-card-again' };
    const s = summarizeTagSpending([...LEDGER, dupe], { fetch: { ...COMPLETE, rowsFetched: 12 }, scope: SCOPE });
    expect(s.spending.cents).toBe(250000);
    expect(formatSpendingBlock(s)).toContain('Possible duplicate imports: 1 transaction ($1,000.00)');
  });
});

describe('T-LIVE-01 — paging past the 1,000-row API cap (Prime HQ cap model)', () => {
  for (const size of [500, 800, 1000, 1500]) {
    it(`${size} transactions: complete, exact spending, all rows read`, async () => {
      const client = makeCappedClient({ transactions: syntheticTransactions(size, USER), profiles: [{ id: USER, currency: 'CAD' }], imports: [{ id: 'imp-1', filename: 'statement.pdf', issuer: 'Bank' }] }, { shuffleUnordered: true });
      const s = await loadTagSpendingSummary(client, USER);
      expect(s.completeness?.rowsFetched).toBe(size);
      expect(s.authoritative).toBe(true);
      expect(s.spending.cents).toBe(expectedTotals(size).spending);
      expect(s.spending.count).toBe(expectedTotals(size).spendingCount);
      expect(s.scope.periodSource).toBe('full_history');
      expect(s.scope.accounts).toEqual(['Bank · statement']);
      expect(formatScopeLine(s)).toContain(`complete (${size} transactions read)`);
    });
  }

  it('the legacy single capped select under-counts 1,500 transactions without saying so', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(1500, USER) }, { shuffleUnordered: true });
    const { data } = await client.from('transactions').select('amount, category').eq('user_id', USER).limit(1500);
    expect((data as unknown[]).length).toBe(1000);
  });

  it('undated rows are disclosed, never silently dropped', async () => {
    const rows = [...syntheticTransactions(20, USER), { id: 'nodate', user_id: USER, date: null, amount: -5, type: 'expense', category: 'Dining', merchant_name: 'X', import_id: 'imp-1' }];
    const s = await loadTagSpendingSummary(makeCappedClient({ transactions: rows }), USER);
    expect(s.scope.undatedRows).toBe(1);
    expect(formatScopeLine(s)).toContain('1 transaction with no date not included');
  });

  it('statement scope uses only that statement\'s rows', async () => {
    const rows = [...syntheticTransactions(50, USER, { importId: 'imp-a' }), ...syntheticTransactions(30, USER, { importId: 'imp-b' }).map(r => ({ ...r, id: `b-${r.id}` }))];
    const s = await loadTagSpendingSummary(makeCappedClient({ transactions: rows }), USER, { importId: 'imp-b' });
    expect(s.spending.cents).toBe(expectedTotals(30).spending);
    expect(s.scope.periodSource).toBe('statement');
  });

  it('a failed read yields no figures at all', async () => {
    const s = await loadTagSpendingSummary(makeCappedClient({ transactions: syntheticTransactions(1200, USER) }, { failOnRequest: 5 }), USER);
    expect(s.status).toBe('unavailable');
    expect(formatSpendingBlock(s)).toContain('Do not state any spending total');
  });
});

describe('T-LIVE-01 — search totals (a partial sample presented as a total, reproduced)', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, amount: 1000 + i, merchant_name: `Payer ${i % 4}`, date: `2026-03-${String(i + 1).padStart(2, '0')}` }));
  it('a partial result carries NO dollar total and is labelled a sample', () => {
    const r = summarizeSearchTotals({ rows, totalMatches: 140, classification: new Map(), currency: 'CAD', filtersLabel: 'category Income, all dates, all accounts' });
    expect(r.complete).toBe(false);
    expect(r.text).toContain('SAMPLE ONLY: showing the 25 newest of 140');
    expect(r.text).not.toContain('$');
  });
  it('a complete result splits spending / money in / transfers and the merchant lines reconcile', () => {
    const all = [
      { id: 'a', amount: -10, merchant_name: 'Tim Hortons', date: '2026-03-01' },
      { id: 'b', amount: -20, merchant_name: 'TIM HORTONS #123', date: '2026-03-02' },
      { id: 'c', amount: -500, merchant_name: 'VISA PAYMENT', date: '2026-03-03' },
      { id: 'd', amount: 700, merchant_name: 'ACME', date: '2026-03-04' },
      { id: 'e', amount: 300, merchant_name: 'TFR FROM SAVINGS', date: '2026-03-04' },
      { id: 'f', amount: 200, merchant_name: 'PAYMENT THANK YOU', date: '2026-03-04' },
    ];
    const cls = new Map([
      ['a', { type: 'expense', category: 'Dining', subcategory: null }],
      ['b', { type: 'expense', category: 'Dining', subcategory: null }],
      ['c', { type: 'expense', category: 'Credit Card Payments', subcategory: null }],
      ['d', { type: 'income', category: 'Income', subcategory: null }],
      ['e', { type: 'income', category: 'Transfers', subcategory: null }],
      ['f', { type: 'income', category: 'Credit Card Payments', subcategory: null }], // D-1: debt repayment received
    ]);
    const r = summarizeSearchTotals({ rows: all, totalMatches: 6, classification: cls, currency: 'CAD', filtersLabel: 'all dates' });
    expect(r.complete).toBe(true);
    expect(r.text).toContain('Spending: $30.00 across 2 transactions');
    // An incoming transfer is internal movement, never money in (T-LIVE-01 / D-1 direction).
    expect(r.text).toContain('Transfers / debt payments / savings, in or out (not spending, not income): $1,000.00 across 3 transactions');
    expect(r.text).toContain('Money in: $700.00 across 1 transaction');
    expect(r.text).toContain('2026-03-01 to 2026-03-04');
    expect(r.text).not.toMatch(/employer|salary/i);
  });
});

describe('T-LIVE-01 — categorization progress (full scope, customer-kept "Other" preserved)', () => {
  it('Other kept by the customer is not unfinished; automatic Other is', () => {
    const p = categorizationProgressFromCounts({ total: 100, uncategorized: 0, needsReview: 0, otherTotal: 7, otherUnconfirmed: 0 }, 'all');
    expect(p.allCategorized).toBe(true);
    expect(p.otherKeptByCustomer).toBe(7);
    expect(formatProgressBlock(p)).toContain('everything in this scope is categorized');
    const q = categorizationProgressFromCounts({ total: 100, uncategorized: 0, needsReview: 2, otherTotal: 7, otherUnconfirmed: 3 }, 'all');
    expect(q.allCategorized).toBe(false);
    expect(q.unfinished).toBe(5);
    expect(formatProgressBlock(q)).toContain('Do NOT say everything is categorized');
  });
  it('unavailable counts never allow a completeness claim', () => {
    const p = categorizationProgressFromCounts(null, 'all');
    expect(p.allCategorized).toBeNull();
    expect(formatProgressBlock(p)).toContain('Do not say whether everything is categorized');
  });
  it('counts are exact (head counts over the full scope) and protect C4 customer / tag_rule / tag_chat sources', async () => {
    const calls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') return (res: (v: unknown) => void) => res({ count: 3, error: null });
        return (...args: unknown[]) => { calls.push(`${prop}(${args.map(a => JSON.stringify(a)).join(',')})`); return q; };
      },
    });
    const p = await loadCategorizationProgress({ from: () => q }, USER);
    expect(p.available).toBe(true);
    expect(calls.filter(c => c.startsWith('select(')).every(c => c.includes('"head":true') && c.includes('"count":"exact"'))).toBe(true);
    expect(calls.some(c => c.includes('limit('))).toBe(false);
    expect(CUSTOMER_KEPT_SOURCES).toEqual(expect.arrayContaining(['manual', 'user_edit', 'tag_rule', 'tag_chat']));
    expect(calls).toContain(`or("category_source.is.null,category_source.not.in.(${CUSTOMER_KEPT_SOURCES.join(',')})")`);
  });
});

describe('T-LIVE-01 — natural greetings', () => {
  it('recognises pure greetings and nothing else', () => {
    for (const m of ['hi tag how are you', 'Hey Tag!', 'good morning', "how's it going?", 'thanks tag']) expect(isSmallTalk(m)).toBe(true);
    for (const m of ['hi tag, how much did I spend on groceries?', 'ok', 'yes', 'hey fix costco', 'how are my finances', '']) expect(isSmallTalk(m)).toBe(false);
  });
});

// ─── Handler-level: the real tag-copilot over the capped fake ──────────────────────────────────
const fake = { client: makeCappedClient({}) as ReturnType<typeof makeCappedClient> };
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: (t: string) => fake.client.from(t), rpc: () => Promise.resolve({ data: null, error: null }) }) }));
const modelCalls: Array<{ system: string; messages: unknown[] }> = [];
const modelPlan: unknown[] = [];
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn(async (args: { system: string; messages: unknown[] }) => {
        modelCalls.push({ system: args.system, messages: args.messages });
        return modelPlan.shift() ?? { content: [{ type: 'text', text: 'Doing great, thanks!' }] };
      }),
    };
  },
}));
vi.mock('../_shared/verifyAuth.js', () => ({ verifyAuth: async () => ({ userId: USER, error: null }) }));
vi.mock('../_shared/logAiActivity.js', () => ({ logAiActivity: async () => undefined }));
const search = { result: { transactions: [] as unknown[], totalMatches: 0, returnedCount: 0 } };
vi.mock('../_shared/txSearchCore.js', () => ({ searchTransactions: async () => search.result }));
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.CONVERSATION_SIGNING_SECRET = 'test-signing-secret-not-real-0123456789abcdef';

async function callTag(message: string) {
  const { handler } = await import('../tag-copilot');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<{ statusCode: number; body: string }>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify({ message, newConversation: true }) }, {},
  );
  return JSON.parse(res.body) as { reply: string };
}

describe('T-LIVE-01 — tag-copilot handler', () => {
  beforeEach(() => {
    modelCalls.length = 0; modelPlan.length = 0;
    fake.client = makeCappedClient({ transactions: LEDGER.map(r => ({ ...r })), profiles: [{ id: USER, currency: 'CAD' }], imports: [] });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('"hi tag how are you": no figures in the prompt and no transaction reads', async () => {
    await callTag('hi tag how are you');
    const system = modelCalls[0].system;
    expect(system).toContain('THIS MESSAGE IS A GREETING OR PLEASANTRY');
    expect(system).not.toContain('VERIFIED SPENDING TOTALS (calculated');
    // No customer figure at all (the prompt's static style examples aside).
    expect(system).not.toMatch(/1,500\.00|5,000|2,000|Spending total|CATEGORIZATION PROGRESS \(exact/);
    expect(system).not.toMatch(/Total spent|Total income|USER'S FINANCES/);
    expect(fake.client.log.filter(l => l.table === 'transactions')).toHaveLength(0);
  });

  it('a real question gets only verified spending (with scope) and no income or total-spent figure', async () => {
    await callTag('which categories do I spend the most on?');
    const system = modelCalls[0].system;
    expect(system).toContain('Spending total: $1,500.00 across 2 transactions');
    expect(system).toMatch(/SCOPE: Period 2026-01-05 to 2026-02-15 \(all imported history\)/);
    expect(system).toContain('Currency: CAD');
    expect(system).not.toMatch(/Total income|Total spent|USER'S FINANCES|\$9,950|\$5,000\.00/);
    expect(system).toContain("That's Prime's department");
    expect(system).toContain('No tax advice');
    expect(system).toContain('Never say who a payer is');
    expect(system).not.toContain('44%');
  });

  it('search with 25 of 140 matches: the model and the fallback get no dollar total', async () => {
    search.result = {
      transactions: Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, merchant_name: `Payer ${i % 4}`, amount: 1234.56, category: 'Income', subcategory: null, posted_at: `2026-03-${String(i + 1).padStart(2, '0')}`, date: null, description: null, import_id: null })),
      totalMatches: 140, returnedCount: 25,
    };
    modelPlan.push(
      { content: [{ type: 'tool_use', id: 'tu1', name: 'search_transactions', input: { category: 'Income', limit: 25 } }] },
      { content: [] }, // second call returns nothing → deterministic fallback
    );
    const out = await callTag('show me my income transactions');
    const toolResult = JSON.stringify(modelCalls[1].messages);
    expect(toolResult).toContain('SAMPLE ONLY: showing the 25 newest of 140');
    expect(toolResult).not.toMatch(/total \$|totaling/i);
    expect(out.reply).toContain("I don't have a verified total");
    expect(out.reply).not.toMatch(/totaling|\$\d/);
  });
});

describe('T-LIVE-01 / P-G4 — legacy tag-chat no longer presents capped totals as complete', () => {
  const src = readFileSync(resolve(__dirname, '../tag-chat.ts'), 'utf8');
  it('no capped "COMPLETE" totals, no income/total-spent figures, no browser totals, no model-computed totals', () => {
    expect(src).not.toContain('.limit(10000)');
    expect(src).not.toContain('COMPLETE CATEGORY TOTALS');
    expect(src).not.toMatch(/Total income: \$|TOTAL INCOME|Total spent: \$|TOTAL SPENT/);
    expect(src).not.toContain('pageContext.totalIncome');
    expect(src).not.toContain('pageContext.totalSpent');
    expect(src).not.toContain('Compute the answer from the context');
    expect(src).not.toContain('totalling $[X]');
    expect(src).not.toContain('your books are looking clean');
    expect(src).toContain('loadTagSpendingSummary');
    expect(src).toContain('loadCategorizationProgress');
    expect(src).toContain('TAG_FINANCIAL_RULES');
  });
  it('no customer reply text or merchant names in logs', () => {
    expect(src).not.toContain("console.log('[tag-chat] RAW REPLY:'");
    expect(src).not.toMatch(/merchant priority:', \{ merchant:/);
  });
  it('formatCents is exact for large values', () => {
    expect(formatCents(123456789)).toBe('$1,234,567.89');
    expect(formatCents(0)).toBe('$0.00');
  });
});
