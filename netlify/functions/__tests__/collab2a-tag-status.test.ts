/**
 * COLLAB-2a — read-only Prime → Tag consultation (tag_status). All Supabase access is an
 * in-memory fake. No network, no database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  resolveTagStatusScope,
  summarizeTagStatus,
  classifyCategorySource,
  C4_PROVENANCE_CAVEAT,
  type TagStatusRow,
} from '../../../src/shared/tag-status';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows
type Row = Record<string, any>;
type Call = { table: string; ops: string[]; filters: Array<[string, string, unknown]>; limit?: number; offset?: number };

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-11-23T15:00:00Z');

let db: Record<string, Row[]> = {};
let calls: Call[] = [];
let failTable: string | null = null;

function q(table: string) {
  const call: Call = { table, ops: [], filters: [] };
  calls.push(call);
  const rows = () => (db[table] || []).filter(r => call.filters.every(([op, k, v]) =>
    op === 'eq' ? r[k] === v : op === 'gte' ? String(r[k] ?? '') >= String(v) : op === 'lte' ? String(r[k] ?? '') <= String(v) : op === 'not' ? r[k] !== null && r[k] !== undefined : true));
  const result = () => {
    if (failTable === table) return { data: null, error: { code: 'X' }, count: null };
    let out = rows();
    const ord = call.ops.find(o => o.startsWith('order:'));
    if (ord) { const asc = ord.endsWith(':asc'); out = [...out].sort((a, b) => (asc ? String(a.date).localeCompare(String(b.date)) : String(b.date).localeCompare(String(a.date)))); }
    if (call.ops.includes('head')) return { data: null, error: null, count: out.length };
    // P-LIVE-02: tag_status pages with .range(); honour it (offset + page size).
    const from = call.offset ?? 0;
    return { data: call.limit !== undefined ? out.slice(from, from + call.limit) : out.slice(from), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- proxy chain
  const proxy: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result()).then(res, rej);
      return (...args: unknown[]) => {
        if (prop === 'select') { call.ops.push('select'); const o = args[1] as { head?: boolean } | undefined; if (o?.head) call.ops.push('head'); }
        else if (prop === 'eq' || prop === 'gte' || prop === 'lte') call.filters.push([prop, String(args[0]), args[1]]);
        else if (prop === 'not') call.filters.push(['not', String(args[0]), null]);
        else if (prop === 'order') call.ops.push(`order:${(args[1] as { ascending: boolean }).ascending ? 'asc' : 'desc'}`);
        else if (prop === 'limit') call.limit = Number(args[0]);
        else if (prop === 'range') { call.offset = Number(args[0]); call.limit = Number(args[1]) - Number(args[0]) + 1; }
        else call.ops.push(prop);
        return proxy;
      };
    },
  });
  return proxy;
}

vi.mock('../../../src/server/db', () => ({ getSupabaseServerClient: () => ({ from: (t: string) => q(t) }) }));
const tool = await import('../../../src/agent/tools/impl/tag_status');

function tx(id: string, user: string, merchant: string, category: string, source: string | null, date: string, amount = -10): Row {
  return { id, user_id: user, merchant_name: merchant, category, category_source: source, amount, date };
}

let logs: string[] = [];
let spies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  failTable = null;
  calls = [];
  logs = [];
  db = {
    transactions: [
      tx('a1', USER_A, '7-ELEVEN STORE', 'Transfers', 'ai', '2026-11-03'),
      tx('a2', USER_A, '7-ELEVEN STORE', 'Transfers', 'tag_rule', '2026-11-04'),
      tx('a3', USER_A, 'SOBEYS', 'Business Income', 'manual', '2026-11-05'),          // customer-confirmed → never proposed
      tx('a4', USER_A, 'NETFLIX', 'Subscriptions', 'user_correction', '2026-11-06'),
      tx('a5', USER_A, 'MYSTERY', 'Uncategorized', null, '2026-11-07'),
      tx('a6', USER_A, 'SOMEWHERE', 'Other', 'needs_review', '2026-11-08'),
      tx('a7', USER_A, '7-ELEVEN STORE', 'Transfers', 'ai', '2026-05-01'),              // outside November
      tx('b1', USER_B, '7-ELEVEN STORE', 'Transfers', 'ai', '2026-11-03'),             // other customer
    ],
    tag_category_feedback: [
      { user_id: USER_A, merchant: 'NETFLIX', created_at: '2026-11-01T00:00:00Z' },
      { user_id: USER_A, merchant: 'NETFLIX', created_at: '2026-10-20T00:00:00Z' },
      { user_id: USER_A, merchant: 'OLD', created_at: '2025-01-01T00:00:00Z' },        // older than 90 days
      { user_id: USER_B, merchant: 'SECRET B', created_at: '2026-11-01T00:00:00Z' },
    ],
  };
  spies = (['log', 'warn', 'error', 'info'] as const).map(m => vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(' ')); }));
});
afterEach(() => spies.forEach(s => s.mockRestore()));

const run = (input: Row, userId = USER_A) => tool.execute(input as never, { userId, now: () => NOW });
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Result typing
const val = (r: any) => r.value;

describe('scope precedence (owner decision)', () => {
  it('1. explicit customer period', () => {
    expect(resolveTagStatusScope({ startDate: '2026-10-01', endDate: '2026-10-31', periodSource: 'requested' }, NOW)).toMatchObject({ source: 'requested_period', startDate: '2026-10-01', endDate: '2026-10-31' });
  });
  const imp = '33333333-3333-4333-8333-333333333333';
  it('2. explicitly referenced document beats the conversation period (Phase 2 order)', () => {
    expect(resolveTagStatusScope({ importId: imp }, NOW)).toMatchObject({ source: 'document', importId: imp });
    expect(resolveTagStatusScope({ importId: imp, startDate: '2026-09-01', endDate: '2026-09-30', periodSource: 'conversation' }, NOW))
      .toMatchObject({ source: 'document', importId: imp });
  });
  it('3. established conversation period when no request or document', () => {
    expect(resolveTagStatusScope({ startDate: '2026-09-01', endDate: '2026-09-30', periodSource: 'conversation' }, NOW).source).toBe('conversation_period');
  });
  it('requested period + document are never silently combined: requested wins and the conflict is explained', () => {
    const s = resolveTagStatusScope({ importId: imp, startDate: '2026-10-01', endDate: '2026-10-31', periodSource: 'requested' }, NOW);
    expect(s).toMatchObject({ source: 'requested_period', startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(s.importId).toBeUndefined();
    expect(s.conflict).toMatch(/Both a period and a specific statement were referenced/);
    const summary = summarizeTagStatus({ scope: s, rows: [], queryFailed: false, capped: false, userHasAnyTransactions: true, coverage: null, feedbackMerchants: [] });
    expect(summary.caveats).toContain(s.conflict);
  });
  it('no conflict note when only one scope is given', () => {
    expect(resolveTagStatusScope({ startDate: '2026-10-01', endDate: '2026-10-31' }, NOW).conflict).toBeUndefined();
  });
  // P-LIVE-02 (owner 2026-11-25) supersedes the 2026-11-23 current-month fallback: categorization
  // status is about outstanding work, so with no period or statement the scope is ALL history.
  it('4. no period and no statement → all imported transactions (never the current month), clearly labelled', () => {
    const s = resolveTagStatusScope({}, NOW);
    expect(s).toEqual({ source: 'all_history', label: 'all imported transactions (entire history)' });
  });
  it('invalid or reversed dates are never used; the scope falls back to all history', () => {
    expect(resolveTagStatusScope({ startDate: '2026-12-01', endDate: '2026-01-01' }, NOW).source).toBe('all_history');
    expect(resolveTagStatusScope({ startDate: 'last month' }, NOW).source).toBe('all_history');
  });
  it('an explicit all-history request beats a conversation period and a statement; a requested period still wins', () => {
    expect(resolveTagStatusScope({ allHistory: true, startDate: '2026-11-01', endDate: '2026-11-30', periodSource: 'conversation' }, NOW).source).toBe('all_history');
    expect(resolveTagStatusScope({ allHistory: true, importId: '33333333-3333-4333-8333-333333333333' }, NOW).source).toBe('all_history');
    expect(resolveTagStatusScope({ allHistory: true, startDate: '2026-10-01', endDate: '2026-10-31' }, NOW).source).toBe('requested_period');
  });
});

describe('category source classification (C4 caveat)', () => {
  it.each([
    ['manual', 'customer_confirmed'], ['manual_edit', 'customer_confirmed'], ['user_correction', 'customer_confirmed'], ['user_chat', 'customer_confirmed'], ['user_edit', 'customer_confirmed'],
    ['tag_rule', 'possibly_customer_approved'], ['tag_chat', 'possibly_customer_approved'],
    ['ai', 'automatic'], ['bulk_fix', 'automatic'], ['merchant_sweep', 'automatic'], ['learned', 'automatic'], ['tag_single', 'automatic'], ['hardcoded', 'automatic'],
    ['needs_review', 'needs_review'], [null, 'unknown'], ['something_new', 'unknown'],
  ])('%s → %s', (src, want) => { expect(classifyCategorySource(src)).toBe(want); });
});

describe('tag_status tool', () => {
  it('own data only, ALL history by default (P-LIVE-02); counts by source; all-time corrections; caveat always present', async () => {
    const v = val(await run({}));
    expect(v.status).toBe('ok');
    expect(v.scope.source).toBe('all_history');
    // a7 (May) is included: outstanding work is never limited to the current month
    expect(v.totals).toEqual({ transactionCount: 7, categorized: 6, uncategorized: 1, otherCount: 1 });
    expect(v.provenance).toEqual({ customer_confirmed: 2, possibly_customer_approved: 1, automatic: 2, needs_review: 1, unknown: 1 });
    expect(v.needsReviewCount).toBe(1);
    expect(v.protectedFromProposals).toBe(3);
    // all-history scope → the whole correction log (incl. the one older than 90 days)
    expect(v.recentCorrections).toEqual({ available: true, count: 3, topMerchants: ['NETFLIX', 'OLD'], windowDays: null });
    expect(v.caveats).toContain(C4_PROVENANCE_CAVEAT);
    expect(v.readOnly).toBe(true);
    expect(() => tool.outputSchema.parse(v)).not.toThrow();
  });

  it('every query is filtered by the verified user; nothing from another customer leaks', async () => {
    const v = val(await run({}));
    for (const c of calls) expect(c.filters).toContainEqual(['eq', 'user_id', USER_A]);
    expect(JSON.stringify(v)).not.toContain('SECRET B');
  });

  it('PB-06: suspected misclassification is proposed; customer-confirmed rows are never proposed', async () => {
    const v = val(await run({}));
    const seven = v.anomalies.find((a: Row) => a.merchant === '7-ELEVEN STORE');
    // a1 ('ai') is proposed; a2 ('tag_rule', possibly customer-approved) is not.
    // all history: a1 and a7 ('ai') are proposed; a2 is not.
    expect(seven).toMatchObject({ kind: 'likely_miscategorized', currentCategory: 'Transfers', suggestedCategory: 'Food & Dining', count: 2 });
    expect(v.anomalies.find((a: Row) => a.merchant === 'SOBEYS')).toBeUndefined(); // 'manual' = customer-confirmed
  });

  it('findings carry no amounts, transaction ids or dates', async () => {
    db.transactions.push(tx('a8', USER_A, 'TIM', 'Food', 'ai', '2026-11-09', -4), tx('a9', USER_A, 'TIM', 'Food', 'ai', '2026-11-10', -5), tx('a10', USER_A, 'TIM', 'Food', 'ai', '2026-11-11', -900));
    const v = val(await run({}));
    const s = JSON.stringify(v.anomalies);
    expect(s).not.toMatch(/"(transactionIds|samples|totalAmount|medianAmount|amount)"/);
    expect(s).not.toMatch(/900|2026-11-1\d/);
    expect(v.anomalies.some((a: Row) => a.kind === 'possible_amount_misread')).toBe(true);
  });

  it('explicit period is honoured and NOT widened when empty; outside coverage is distinguished', async () => {
    const v = val(await run({ startDate: '2027-01-01', endDate: '2027-01-31', periodSource: 'requested' }));
    expect(v.status).toBe('outside_imported_coverage');
    expect(v.scope).toMatchObject({ source: 'requested_period', startDate: '2027-01-01', endDate: '2027-01-31' });
    expect(v.totals.transactionCount).toBe(0);
    expect(v.caveats.join(' ')).toMatch(/Do not widen the period/);
    expect(v.coverage).toEqual({ earliestDate: '2026-05-01', latestDate: '2026-11-08' });
  });

  it('zero matching transactions inside coverage → no_transactions_in_period', async () => {
    expect(val(await run({ startDate: '2026-07-01', endDate: '2026-07-31' })).status).toBe('no_transactions_in_period');
  });

  it('no imported data at all → no_imported_data', async () => {
    db.transactions = db.transactions.filter(r => r.user_id !== USER_A);
    expect(val(await run({})).status).toBe('no_imported_data');
  });

  it('query failure → query_error (never guessed)', async () => {
    failTable = 'transactions';
    const v = val(await run({}));
    expect(v.status).toBe('query_error');
    expect(v.anomalies).toEqual([]);
    expect(v.caveats.join(' ')).toMatch(/could not be retrieved; do not guess/);
  });

  it('correction history failure is disclosed, the rest still answers', async () => {
    failTable = 'tag_category_feedback';
    const v = val(await run({}));
    expect(v.status).toBe('ok');
    expect(v.recentCorrections.available).toBe(false);
    expect(v.caveats.join(' ')).toMatch(/correction history could not be retrieved/);
  });

  it('logs carry counts and status only — never merchant names', async () => {
    await run({});
    const all = logs.join('\n');
    expect(all).toMatch(/\[tag_status\] status=ok scope=all_history rows=7/);
    for (const m of ['7-ELEVEN', 'SOBEYS', 'NETFLIX', 'MYSTERY']) expect(all).not.toContain(m);
  });

  it('rejects a userId in the input (identity comes only from the verified context)', () => {
    expect(() => tool.inputSchema.parse({ userId: USER_B })).toThrow();
  });

  it('missing verified user → query_error with no database access', async () => {
    const v = val(await tool.execute({} as never, { userId: '', now: () => NOW }));
    expect(v.status).toBe('query_error');
    expect(calls).toHaveLength(0);
  });

  it('summarize handles partial (capped) reads', () => {
    const rows: TagStatusRow[] = [{ id: 'x', merchant_name: 'A', category: 'Food', category_source: 'ai', amount: -1, date: '2026-11-01' }];
    const s = summarizeTagStatus({ scope: resolveTagStatusScope({}, NOW), rows, queryFailed: false, capped: true, userHasAnyTransactions: true, coverage: null, feedbackMerchants: [] });
    expect(s.status).toBe('partial');
    expect(s.caveats.join(' ')).toMatch(/counts are minimums/);
  });
});

describe('read-only guarantees and wiring', () => {
  const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../../..', p), 'utf8');
  it('the tool and shared modules contain no write calls', () => {
    for (const f of ['src/agent/tools/impl/tag_status.ts', 'src/shared/tag-status.ts', 'src/shared/tag-review-rules.ts']) {
      expect(read(f)).not.toMatch(/\.(insert|update|upsert|delete|rpc)\(/);
    }
  });
  it('registered as non-mutating with no confirmation', () => {
    const idx = read('src/agent/tools/index.ts');
    const block = idx.slice(idx.indexOf("['tag_status', {"), idx.indexOf("['tag_status', {") + 1400);
    expect(block).toMatch(/mutates: false/);
    expect(block).toMatch(/requiresConfirm: false/);
    expect(block).toMatch(/READ-ONLY/);
  });
  it('Prime gets tag_status from code (no database tool-list change)', () => {
    expect(read('netlify/functions/chat.ts')).toMatch(/if \(!employeeTools\.includes\('tag_status'\)\) \{\n\s+employeeTools = \[\.\.\.employeeTools, 'tag_status'\];/);
  });
  it('Prime authority message carries the flag-and-propose rule', async () => {
    const { buildPrimeAuthoritySystemMessage } = await import('../_shared/primePolicy');
    const msg = buildPrimeAuthoritySystemMessage({ lane: 'deep', intent: 'general', hasDocs: false, hasSnapshot: false });
    expect(msg).toContain('TAG CONSULTATION (code-owned; read-only):');
    expect(msg).toMatch(/Findings are PROPOSALS\. Never say a category was changed/);
    expect(msg).toMatch(/Never propose changing customer-confirmed or possibly customer-approved categories/);
    expect(msg).toMatch(/Never widen the period on your own/);
  });
});
