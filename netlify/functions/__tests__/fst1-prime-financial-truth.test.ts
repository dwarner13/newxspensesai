/**
 * FST-1 — Prime financial source of truth (P-G1, P-G2, P-G3, P-G5, P-G6, P-G7).
 * Behaviour runs against a fake client that caps every request at 1,000 rows,
 * like the hosted API. Fixtures: 501, 801, 1001, 1501 transactions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { makeCappedClient, syntheticTransactions, expectedTotals } from '../../../src/shared/__tests__/fixtures/capped-supabase';
import { buildFinancialPosition, formatPositionForPrompt } from '../_shared/financial-position';
import { buildFinancialSnapshot } from '../_shared/financial-snapshot';
import { sanitizePrimeContext } from '../_shared/primeContextSanitizer';

const SIZES = [501, 801, 1001, 1501];
const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('P-G1 financial position: complete, exact, labelled', () => {
  for (const n of SIZES) {
    it(`${n} transactions → verified, exact cents and counts, COMPLETE scope line`, async () => {
      const client = makeCappedClient({ transactions: syntheticTransactions(n), goals: [] }, { shuffleUnordered: true });
      const pos = await buildFinancialPosition({ supabase: client as any, userId: 'u-synthetic', currency: 'CAD' });
      const want = expectedTotals(n);
      expect(pos.income.status).toBe('verified');
      expect(pos.income.periodTotal!.amount).toBe(want.income / 100);
      expect(pos.income.periodTotal!.transactionCount).toBe(want.incomeCount);
      expect(pos.spending.periodTotal!.amount).toBe(want.spending / 100);
      expect(pos.spending.periodTotal!.transactionCount).toBe(want.spendingCount);
      expect(pos.dataCoverage.transactionCount).toBe(n);
      expect(pos.dataCoverage.complete).toBe(true);
      const text = formatPositionForPrompt(pos);
      expect(text).toContain(`${n} transactions read; COMPLETE read`);
      expect(text).toContain('all imported accounts');
      expect(text).toContain('CAD (profile currency, assumed');
      expect(text).not.toContain('PARTIAL');
    });
  }

  it('a truncated read is PARTIAL, never "verified", and Prime is told not to call it a total', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(20_050), goals: [] });
    const pos = await buildFinancialPosition({ supabase: client as any, userId: 'u-synthetic' });
    expect(pos.income.status).toBe('partial');
    expect(pos.spending.status).toBe('partial');
    expect(pos.dataCoverage.truncated).toBe(true);
    const text = formatPositionForPrompt(pos);
    expect(text).toContain('PARTIAL read');
    expect(text).toContain('WARNING: these figures are PARTIAL');
    expect(text).not.toContain('verified sum of imported transactions only');
  }, 60_000);

  it('a failed read is unavailable (never zero, never browser numbers)', async () => {
    const client = makeCappedClient({ transactions: syntheticTransactions(1501), goals: [] }, { failOnRequest: 2, failTable: 'transactions' });
    const pos = await buildFinancialPosition({ supabase: client as any, userId: 'u-synthetic' });
    expect(pos.income.status).toBe('unavailable');
    expect(formatPositionForPrompt(pos)).toContain('Income: unavailable');
  });

  it('transfers, card payments, loans and savings are not spending; "Credit"-typed rows are disclosed, not guessed', async () => {
    const rows = [
      { id: 'a', user_id: 'u', date: '2026-01-02', amount: -100, type: 'expense', category: 'Groceries' },
      { id: 'b', user_id: 'u', date: '2026-01-03', amount: -500, type: 'expense', category: 'Transfers' },
      { id: 'c', user_id: 'u', date: '2026-01-04', amount: -300, type: 'expense', category: 'Credit Card Payments' },
      { id: 'd', user_id: 'u', date: '2026-01-05', amount: -200, type: 'expense', category: 'Loan Payments' },
      { id: 'e', user_id: 'u', date: '2026-01-06', amount: -50, type: 'expense', category: 'Investments' },
      { id: 'f', user_id: 'u', date: '2026-01-07', amount: 2000, type: 'income', category: 'Income' },
      { id: 'g', user_id: 'u', date: '2026-01-08', amount: 40, type: 'Credit', category: 'Shopping' },
      { id: 'h', user_id: 'u', date: '2026-01-09', amount: 25, type: 'income', category: 'Shopping', merchant_name: 'Store', import_id: 'i1' },
    ];
    const pos = await buildFinancialPosition({ supabase: makeCappedClient({ transactions: rows, goals: [] }) as any, userId: 'u' });
    expect(pos.spending.periodTotal!.amount).toBe(100);
    // P-LIVE-03 (owner 2026-11-26): the Shopping inflow is a refund, not income.
    expect(pos.income.periodTotal!.amount).toBe(2000);
    expect(pos.dataCoverage.unclassifiedCount).toBe(1);
    expect(pos.signals.possibleRefunds.count).toBe(1);
    const text = formatPositionForPrompt(pos);
    expect(text).toContain('1 transactions ($40.00) have a type with no clear direction and are in NO total');
    expect(text).toContain('look like refunds');
  });

  it('a statement imported twice is disclosed as possible duplicates (totals unchanged)', async () => {
    const a = syntheticTransactions(30, 'u', { importId: 'A' });
    const b = syntheticTransactions(30, 'u', { importId: 'B' }).map(r => ({ ...r, id: `b-${r.id}` }));
    const pos = await buildFinancialPosition({ supabase: makeCappedClient({ transactions: [...a, ...b], goals: [] }) as any, userId: 'u' });
    expect(pos.signals.possibleDuplicates.count).toBe(30);
    expect(pos.spending.periodTotal!.amount).toBe((expectedTotals(30).spending * 2) / 100);
    expect(formatPositionForPrompt(pos)).toContain('30 possible duplicate-import transactions');
  });

  it('a confirmed Tag correction is reflected on the next position (no cache)', async () => {
    const rows = syntheticTransactions(1001);
    const client = makeCappedClient({ transactions: rows, goals: [] });
    const before = await buildFinancialPosition({ supabase: client as any, userId: 'u-synthetic' });
    const target = rows.find(r => r.category === 'Dining')!;
    target.category = 'Transfers';
    const after = await buildFinancialPosition({ supabase: client as any, userId: 'u-synthetic' });
    expect(after.spending.periodTotal!.amount).toBeCloseTo(before.spending.periodTotal!.amount - Math.abs(Number(target.amount)), 2);
  });
});

describe('P-G2 financial snapshot (fast lanes) uses the engine, with no stale cache', () => {
  it('1501 rows: complete, exact count; a recategorisation changes the next snapshot', async () => {
    const today = new Date();
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const rows = syntheticTransactions(1501).map((r, i) => ({ ...r, date: `${ym}-${String((i % 27) + 1).padStart(2, '0')}` }));
    const client = makeCappedClient({ transactions: rows, goals: [], debt: [] }, { shuffleUnordered: true });
    const s1 = await buildFinancialSnapshot(client as any, 'u-synthetic', null);
    expect(s1.dataComplete).toBe(true);
    expect(s1.transactionCount).toBe(1501);
    expect(Math.round(s1.monthlySpend * 100)).toBe(expectedTotals(1501).spending);
    const target = rows.find(r => r.category === 'Fuel')!;
    target.category = 'Transfers';
    const s2 = await buildFinancialSnapshot(client as any, 'u-synthetic', null);
    expect(Math.round(s2.monthlySpend * 100)).toBe(expectedTotals(1501).spending - Math.round(Math.abs(Number(target.amount)) * 100));
  });

  it('browser-supplied amounts are dropped at the boundary', () => {
    const out = sanitizePrimeContext({
      financialSnapshot: { hasTransactions: true, uncategorizedCount: 3, monthlySpend: 999999, topCategories: [{ name: 'X', amount: 1 }] },
      totalSpent: 123, totalIncome: 456, transactionCount: 7,
    }) as any;
    expect(out.financialSnapshot.monthlySpend).toBeUndefined();
    expect(out.financialSnapshot.topCategories).toBeUndefined();
    expect(out.financialSnapshot.hasTransactions).toBe(true);
    expect(out.totalSpent).toBeUndefined();
    expect(out.totalIncome).toBeUndefined();
  });

  it('chat.ts no longer falls back to browser totals and labels browser import summaries', () => {
    const chat = read('chat.ts');
    expect(chat).not.toMatch(/Total Income: \$\{pc\.totalIncome\}/);
    expect(chat).not.toMatch(/Total Spent: \$\{pc\.totalSpent\}/);
    expect(chat).toContain('FINANCIAL POSITION: unavailable right now');
    expect(chat).toContain('BROWSER-SUPPLIED DISPLAY CONTEXT, NOT VERIFIED');
    expect(chat).toContain('withServerFinancialSnapshot(');
  });
});

describe('P-G5 / P-G6 statement reads are complete and disclose scope', () => {
  const chat = read('chat.ts');
  const body = (name: string) => {
    const a = chat.indexOf(`async function ${name}(`);
    const b = chat.indexOf('\nasync function ', a + 10);
    return chat.slice(a, b > a ? b : a + 8000);
  };
  it('merchant spend: paged, outflows only, refunds reported, partial disclosed', () => {
    const src = body('loadMerchantSpendForLatestImportBestEffort');
    expect(src).not.toContain('.limit(500)');
    expect(src).not.toContain('.limit(800)');
    expect(src).toContain('pagedSelectAll');
    expect(src).toContain("classifyCashFlow(row).direction !== 'inflow'");
    expect(chat.match(/merchantSpendNotes\(merchantSpend/g)?.length).toBe(3);
  });
  it('statement Q&A: paged by import, widening disclosed', () => {
    const src = body('loadStatementQaRows');
    expect(src).not.toContain('.limit(800)');
    expect(src).toContain("q.eq('import_id', req.importId)");
    expect(chat).toContain('statementQaNotes(qaRows, Boolean(qaRequest.importId))');
  });
});

// ── P-G3 briefing: behaviour through the real handler ──
const state: { client: any; profile: any } = { client: null, profile: null };
vi.mock('../_shared/supabase.js', () => ({ serverSupabase: () => state.client }));
vi.mock('../_shared/verifyAuth.js', () => ({ verifyAuth: async () => ({ userId: 'u-synthetic', error: null }) }));

describe('P-G3 Prime briefing', () => {
  let prompts: string[] = [];
  beforeEach(() => {
    prompts = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      prompts.push(body.system + '\n' + body.messages[0].content);
      return { json: async () => ({ content: [{ text: 'ok' }] }) } as any;
    }));
  });

  const run = async (n: number, profile: any) => {
    const tables: Record<string, any[]> = {
      transactions: syntheticTransactions(n),
      imports: [{ id: 'imp-1', user_id: 'u-synthetic', file_url: 'x/statement.pdf', created_at: '2026-01-15T00:00:00Z' }],
      user_notifications: [],
      profiles: profile ? [{ id: 'u-synthetic', ...profile }] : [],
    };
    state.client = makeCappedClient(tables, { shuffleUnordered: true });
    const { handler } = await import('../prime-briefing');
    const res: any = await (handler as any)({ httpMethod: 'POST', body: JSON.stringify({ importId: 'imp-1' }), headers: {} }, {});
    return { res, notif: tables.user_notifications[0] ?? null };
  };

  for (const n of SIZES) {
    it(`${n} transactions: exact totals, customer's own name, scope line`, async () => {
      await run(n, { first_name: 'Avery', full_name: 'Avery Test' });
      const p = prompts[0];
      const want = expectedTotals(n);
      expect(p).toContain('Generate a briefing for Avery');
      expect(p).not.toMatch(/Darrell/);
      expect(p).toContain(`Income: $${(want.income / 100).toFixed(2)}`);
      expect(p).toContain(`$${(want.spending / 100).toFixed(2)}`);
      expect(p).toContain(`${n} transactions; complete`);
      expect(p).toContain('never give tax advice');
    });
  }

  it('no name on file: never invents one', async () => {
    await run(501, null);
    expect(prompts[0]).toContain('the customer (no name on file');
    expect(prompts[0]).not.toMatch(/Darrell/);
  });

  it('source has no hard-coded name and no unordered .limit(1500)', () => {
    const src = read('prime-briefing.ts');
    expect(src).not.toMatch(/Darrell/);
    expect(src).not.toMatch(/\.limit\(1500\)/);
  });
});
