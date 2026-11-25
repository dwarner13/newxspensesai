/**
 * T-ACT-SAFE — Tag's AI-initiated rules, bulk moves and renames are server proposals with signed
 * receipts, confirmed explicitly through tag-action commit_proposal (owner GO 2026-11-25).
 * Real tag-copilot + tag-action + shared conversation platform over an in-memory fake. Synthetic data only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const faults = { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false };
let txUpdateCalls = 0;
const get = (row: Row, col: string) => (col.includes('->>') ? (row[col.split('->>')[0]] || {})[col.split('->>')[1]] : row[col]);

function builder(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  let payload: Row | null = null;
  let onConflict: string[] = [];
  let order: { col: string; asc: boolean } | null = null;
  let lim = Infinity;
  let rng: [number, number] | null = null;
  let head = false;
  const rows = () => (db[table] ||= []);
  const matches = () => rows().filter(r => filters.every(f => f(r)));
  const run = () => {
    if (op === 'insert') {
      if (table === 'tag_activity_log' && faults.activityLog) return { data: null, error: { message: 'log down' } };
      if (table === 'chat_messages' && faults.uniqueOnClaim && payload!.role === 'user' && payload!.client_message_id) return { data: null, error: { code: '23505', message: 'duplicate key' } };
      if (table === 'chat_messages' && faults.assistantInsert && payload!.role === 'assistant') return { data: null, error: { code: '500', message: 'down' } };
      if (table === 'chat_sessions' && rows().some(r => r.id === payload!.id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
      const row = { id: payload!.id ?? `${table}-${rows().length + 1}`, created_at: new Date(Date.now() + rows().length).toISOString(), ...payload };
      rows().push(row);
      return { data: row, error: null };
    }
    if (op === 'update') {
      if (table === 'transactions') { txUpdateCalls++; if (faults.txUpdate) return { data: null, error: { message: 'tx update failed' } }; }
      const m = matches(); m.forEach(r => Object.assign(r, payload)); return { data: m, error: null };
    }
    if (op === 'upsert') {
      const existing = rows().find(r => onConflict.every(c => r[c] === payload![c]));
      if (existing) Object.assign(existing, payload); else rows().push({ ...payload });
      return { data: null, error: null };
    }
    let m = matches();
    if (order) m = [...m].sort((a, b) => (order!.asc ? 1 : -1) * String(a[order!.col]).localeCompare(String(b[order!.col])));
    const count = m.length;
    if (rng) m = m.slice(rng[0], rng[1] + 1);
    return { data: head ? null : m.slice(0, lim), error: null, count };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (_c?: string, o?: any) => { if (o?.head) head = true; return b; },
    neq: (c: string, v: unknown) => { filters.push(r => get(r, c) !== v); return b; },
    gte: (c: string, v: string) => { filters.push(r => r[c] != null && r[c] >= v); return b; },
    lte: (c: string, v: string) => { filters.push(r => r[c] != null && r[c] <= v); return b; },
    is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return b; },
    ilike: (c: string, pat: string) => {
      const re = new RegExp('^' + pat.split('%').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      filters.push(r => re.test(String(r[c] ?? '')));
      return b;
    },
    or: () => b,
    not: () => b,
    range: (a: number, z: number) => { rng = [a, z]; return b; },
    eq: (c: string, v: unknown) => { filters.push(r => get(r, c) === v); return b; },
    in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(get(r, c))); return b; },
    order: (col: string, o?: { ascending?: boolean }) => { order = { col, asc: o?.ascending !== false }; return b; },
    limit: (n: number) => { lim = n; return b; },
    insert: (r: Row) => { op = 'insert'; payload = r; return b; },
    update: (p: Row) => { op = 'update'; payload = p; return b; },
    upsert: (p: Row, o?: { onConflict?: string }) => { op = 'upsert'; payload = p; onConflict = (o?.onConflict || '').split(',').filter(Boolean); return b; },
    maybeSingle: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    single: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
const fakeClient = { from: (t: string) => builder(t), rpc: () => builder('rpc') };
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const authState = { userId: ALICE as string | null };
vi.mock('../_shared/verifyAuth.js', () => ({
  verifyAuth: async () => (authState.userId ? { userId: authState.userId, error: null } : { userId: null, error: 'unauthorized' }),
}));

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.CONVERSATION_SIGNING_SECRET = 'test-signing-secret-not-real-0123456789abcdef';

type Res = { statusCode: number; body: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function act(body: Record<string, unknown>): Promise<{ res: Res; json: any }> {
  const { handler } = await import('../tag-action');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(body) }, {},
  );
  return { res, json: JSON.parse(res.body) };
}
const convo = (customerText: string, clientMessageId: string, extra: Record<string, unknown> = {}) => ({ conversation: { customerText, clientMessageId, ...extra } });


const modelPlan: unknown[] = [];
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn(async () => modelPlan.shift() ?? { content: [{ type: 'text', text: 'Sure thing.' }] }),
    };
  },
}));
vi.mock('../_shared/logAiActivity.js', () => ({ logAiActivity: async () => undefined }));
vi.mock('../_shared/txSearchCore.js', () => ({ searchTransactions: async () => ({ transactions: [], totalMatches: 0, returnedCount: 0 }) }));
process.env.ANTHROPIC_API_KEY = 'test-key';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chat(message: string, extra: Record<string, unknown> = {}): Promise<any> {
  const { handler } = await import('../tag-copilot');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify({ message, ...extra }) }, {},
  );
  return JSON.parse(res.body);
}
const tool = (name: string, input: Record<string, unknown>, text = 'Done! All taken care of.') => ({
  content: [{ type: 'text', text }, { type: 'tool_use', id: `tu_${name}`, name, input }],
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yes = (out: any, id: string, over: Record<string, unknown> = {}) =>
  act({ intent: 'commit_proposal', action: out.proposal.action, subject: out.proposal.subject, ...over, ...convo('yes', id, { sessionId: out.sessionId }) });

const msgs = (sessionId: unknown) => (db.chat_messages || []).filter(m => m.session_id === sessionId);
// Synthetic data only.
const id = (n: number) => `cccccccc-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number, user: string, merchant: string, category: string, source: string | null = 'ai') => ({
  id: id(n), user_id: user, merchant_name: merchant, merchant, description: `POS ${merchant} #${n}`,
  amount: -(n + 1), posted_at: '2026-10-01', date: '2026-10-01', category, subcategory: null, category_source: source,
});
const t = (n: number) => db.transactions.find(r => r.id === id(n))!;

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0;
  authState.userId = ALICE;
  modelPlan.length = 0;
  db.transactions = [
    row(1, ALICE, 'CORNER COFFEE 01', 'Shopping'),
    row(2, ALICE, 'CORNER COFFEE 02', 'Shopping'),
    row(3, ALICE, 'CORNER COFFEE 03', 'Shopping', 'manual'),      // customer-confirmed: never moved
    row(4, ALICE, 'CORNER COFFEE 04', 'Shopping', 'tag_rule'),    // protected (C4)
    row(5, ALICE, 'SQ *GRAINS', 'Other'),
    row(6, ALICE, 'SQ *GRAINS', 'Other'),
    row(7, ALICE, 'OTHER STORE', 'Other', 'user_edit'),            // customer-confirmed Other: kept
    row(8, BOB, 'CORNER COFFEE 01', 'Shopping'),                   // another customer
    row(9, BOB, 'SQ *GRAINS', 'Other'),
  ];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('T-ACT-SAFE — merchant rules: future-only unless explicitly proposed', () => {
  it('a rule proposal writes nothing, says FUTURE imports, and states the existing count it will NOT change', async () => {
    modelPlan.push(tool('set_category_rule', { vendor: 'corner coffee', category: 'Food & Dining' }));
    const out = await chat('always put corner coffee in food & dining', { clientMessageId: 'msg_act_0001' });
    expect(out.reply).not.toMatch(/Done!/);
    expect(out.reply).toBe('Save a rule so **future imports** matching "corner coffee" are categorized as **Food & Dining**? This does **not** change your 4 existing transactions matching "corner coffee" — tell me if you want those changed too. Say yes to confirm.');
    expect(out.proposal).toMatchObject({ kind: 'action', action: 'save_merchant_rule', subject: { merchantPattern: 'CORNER COFFEE', targetCategory: 'Food & Dining', applyToExisting: 'no', affected: 0 } });
    expect(txUpdateCalls).toBe(0);
    expect(db.category_rules ?? []).toHaveLength(0);
    const stored = msgs(out.sessionId).filter(m => m.role === 'assistant').pop();
    expect(stored.metadata.actionReceipt).toMatchObject({ action: 'save_merchant_rule', state: 'proposed' });
  });

  it('"yes" saves the rule only — existing transactions (and the other customer) are untouched', async () => {
    modelPlan.push(tool('set_category_rule', { vendor: 'corner coffee', category: 'Food & Dining' }));
    const out = await chat('always put corner coffee in food & dining', { clientMessageId: 'msg_act_0002' });
    const { json } = await yes(out, 'msg_act_0003');
    expect(json.conversation.receipt).toMatchObject({ action: 'save_merchant_rule', state: 'completed', tool: 'save_merchant_rule', success: true, count: 0 });
    expect(json.conversation.reply).toContain('Your existing transactions were not changed.');
    expect(txUpdateCalls).toBe(0);
    expect(db.category_rules).toEqual([expect.objectContaining({ user_id: ALICE, merchant_pattern: 'CORNER COFFEE', category: 'Food & Dining' })]);
    expect([1, 2, 3, 4].map(n => t(n).category)).toEqual(['Shopping', 'Shopping', 'Shopping', 'Shopping']);
  });

  it('only when explicitly asked: the proposal says how many EXISTING transactions change and which stay; "yes" moves exactly those', async () => {
    modelPlan.push(tool('set_category_rule', { vendor: 'corner coffee', category: 'Food & Dining', applyToExisting: true }));
    const out = await chat('always put corner coffee in food & dining and fix the old ones too', { clientMessageId: 'msg_act_0004' });
    expect(out.reply).toContain('AND change **2** of your **existing** "corner coffee" transactions to **Food & Dining** now (2 transactions you\'ve already categorized yourself will stay as they are)');
    const { json } = await yes(out, 'msg_act_0005');
    expect(json.conversation.receipt).toMatchObject({ state: 'completed', count: 2 });
    expect([1, 2].map(n => t(n).category)).toEqual(['Food & Dining', 'Food & Dining']);
    expect(t(3)).toMatchObject({ category: 'Shopping', category_source: 'manual' });
    expect(t(4)).toMatchObject({ category: 'Shopping', category_source: 'tag_rule' });
    expect(t(8).category).toBe('Shopping');
  });
});

describe('T-ACT-SAFE — bulk category moves', () => {
  it('proposal shows the exact move and count; customer-confirmed Other is kept; "yes" moves exactly those, no rule', async () => {
    modelPlan.push(tool('bulk_recategorize', { from_category: 'Other', to_category: 'Food & Dining' }));
    const out = await chat('move all Other to Food & Dining', { clientMessageId: 'msg_act_0010' });
    expect(out.reply).toBe('Move **2** existing transactions from **Other** to **Food & Dining**? 1 transaction in Other that you categorized yourself will stay as they are. This changes existing transactions only — no rule is saved for future imports. Say yes to confirm.');
    expect(txUpdateCalls).toBe(0);
    const { json } = await yes(out, 'msg_act_0011');
    expect(json.conversation.receipt).toMatchObject({ action: 'bulk_move_category', state: 'completed', count: 2 });
    expect([5, 6].map(n => t(n).category)).toEqual(['Food & Dining', 'Food & Dining']);
    expect(t(7).category).toBe('Other');
    expect(t(9).category).toBe('Other');
    expect(db.category_rules ?? []).toHaveLength(0);
    expect(db.tag_activity_log).toEqual([expect.objectContaining({ user_id: ALICE, action_type: 'bulk_move_category', old_value: 'Other', new_value: 'Food & Dining' })]);
  });
});

describe('T-ACT-SAFE — merchant renames keep the original imported text', () => {
  it('renames merchant_name only; `merchant` and `description` are unchanged; other customer untouched', async () => {
    modelPlan.push(tool('rename_merchant', { from_name: 'SQ *GRAINS', to_name: 'Grains Bakery' }));
    const out = await chat('rename SQ *GRAINS to Grains Bakery', { clientMessageId: 'msg_act_0020' });
    expect(out.reply).toBe('Rename **2** transactions from "SQ *GRAINS" to "Grains Bakery"? Only the displayed merchant name changes — the original imported description is kept for your records, and categories and rules are not changed. Say yes to confirm.');
    const { json } = await yes(out, 'msg_act_0021');
    expect(json.conversation.receipt).toMatchObject({ action: 'rename_merchant', state: 'completed', count: 2 });
    for (const n of [5, 6]) expect(t(n)).toMatchObject({ merchant_name: 'Grains Bakery', merchant: 'SQ *GRAINS', description: `POS SQ *GRAINS #${n}`, category: 'Other' });
    expect(t(9).merchant_name).toBe('SQ *GRAINS');
  });
});

describe('T-ACT-SAFE — stale, replay, duplicate, tampering and cross-account', () => {
  it('a stale proposal (scope changed since) changes nothing', async () => {
    modelPlan.push(tool('bulk_recategorize', { from_category: 'Other', to_category: 'Food & Dining' }));
    const out = await chat('move all Other to Food & Dining', { clientMessageId: 'msg_act_0030' });
    db.transactions.push(row(10, ALICE, 'NEW IMPORT', 'Other'));
    const { json } = await yes(out, 'msg_act_0031');
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'stale' });
    expect(json.conversation.reply).toContain('it would now affect 3 transactions, not 2');
    expect(txUpdateCalls).toBe(0);
  });
  it('a stale proposal with the SAME count but different rows also changes nothing', async () => {
    modelPlan.push(tool('bulk_recategorize', { from_category: 'Other', to_category: 'Food & Dining' }));
    const out = await chat('move all Other to Food & Dining', { clientMessageId: 'msg_act_0032' });
    t(5).category = 'Groceries';
    db.transactions.push(row(11, ALICE, 'NEW IMPORT', 'Other'));
    const { json } = await yes(out, 'msg_act_0033');
    expect(json.conversation.receipt.reason).toBe('stale');
    expect(txUpdateCalls).toBe(0);
  });
  it('replay: a second "yes" after completion changes nothing; a retried "yes" (same id) is a duplicate', async () => {
    modelPlan.push(tool('bulk_recategorize', { from_category: 'Other', to_category: 'Food & Dining' }));
    const out = await chat('move all Other to Food & Dining', { clientMessageId: 'msg_act_0040' });
    await yes(out, 'msg_act_0041');
    const dup = await yes(out, 'msg_act_0041');
    expect(dup.json).toMatchObject({ duplicate: true, executed: false });
    const replay = await yes(out, 'msg_act_0042');
    expect(replay.json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(1);
  });
  it('a tampered confirmation (different category / scope than signed) changes nothing', async () => {
    modelPlan.push(tool('bulk_recategorize', { from_category: 'Other', to_category: 'Food & Dining' }));
    const out = await chat('move all Other to Food & Dining', { clientMessageId: 'msg_act_0050' });
    const tampered = { ...out.proposal.subject, toCategory: 'Income' };
    const { json } = await act({ intent: 'commit_proposal', action: 'bulk_move_category', subject: tampered, ...convo('yes', 'msg_act_0051', { sessionId: out.sessionId }) });
    expect(json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(0);
  });
  it('another customer cannot confirm (or even see) this customer\'s proposal', async () => {
    modelPlan.push(tool('bulk_recategorize', { from_category: 'Other', to_category: 'Food & Dining' }));
    const out = await chat('move all Other to Food & Dining', { clientMessageId: 'msg_act_0060' });
    authState.userId = BOB;
    const { json } = await yes(out, 'msg_act_0061');
    expect(json.executed).toBe(false);
    expect(t(9).category).toBe('Other');
    expect([5, 6].map(n => t(n).category)).toEqual(['Other', 'Other']);
  });
  it('an intervening Tag reply voids the proposal (lookback 1)', async () => {
    modelPlan.push(tool('rename_merchant', { from_name: 'SQ *GRAINS', to_name: 'Grains Bakery' }));
    const out = await chat('rename SQ *GRAINS to Grains Bakery', { clientMessageId: 'msg_act_0070' });
    await chat('wait, what does SQ mean?', { clientMessageId: 'msg_act_0071', sessionId: out.sessionId });
    const { json } = await yes(out, 'msg_act_0072');
    expect(json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(0);
  });
  it('an unknown action is rejected outright', async () => {
    const r = await act({ intent: 'commit_proposal', action: 'delete_everything', subject: {}, ...convo('yes', 'msg_act_0080') });
    expect(r.res.statusCode).toBe(400);
  });
});

describe('T-ACT-SAFE — no mutation relies on prompt instructions alone', () => {
  it('tag-copilot contains no transaction / rule / memory writes at all', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../tag-copilot.ts'), 'utf8');
    expect(src).not.toMatch(/\.(update|upsert|insert|delete)\(/);
  });
});
