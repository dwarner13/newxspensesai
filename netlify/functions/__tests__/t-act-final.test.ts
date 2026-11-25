/**
 * T-ACT-FINAL — one action safety contract however a change is initiated (owner GO 2026-11-25):
 * typed merchant requests, the Save-rule button and legacy tag-chat model tags. Synthetic data only.
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


// tag-chat (legacy drawer chat) runs on OpenAI: the model's reply is planned per test.
const openaiPlan: string[] = [];
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: vi.fn(async () => ({ choices: [{ message: { content: openaiPlan.shift() ?? 'Sure.' } }] })) } };
  },
}));
vi.mock('../_shared/tag-learning.js', () => ({ getLearnedCategoryForTransaction: async () => null }));
process.env.OPENAI_API_KEY = 'test-key';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tagChat(body: Record<string, unknown>): Promise<any> {
  const { handler } = await import('../tag-chat');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(body) }, {},
  );
  return JSON.parse(res.body);
}

// Synthetic data only.
const id = (n: number) => `dddddddd-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number, user: string, merchant: string, category: string, source: string | null = 'ai') => ({
  id: id(n), user_id: user, merchant_name: merchant, merchant, description: `POS ${merchant} #${n}`,
  amount: -(n + 1), posted_at: '2026-10-01', date: '2026-10-01', category, subcategory: null, category_source: source, type: 'expense',
});
const t = (n: number) => db.transactions.find(r => r.id === id(n))!;
const snapshot = () => JSON.stringify(db.transactions.map(r => [r.id, r.category, r.category_source, r.merchant_name, r.type]));

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0;
  authState.userId = ALICE;
  openaiPlan.length = 0;
  db.transactions = [
    row(1, ALICE, 'CORNER COFFEE 01', 'Shopping'),
    row(2, ALICE, 'CORNER COFFEE 02', 'Shopping', 'manual'),   // customer-confirmed
    row(3, ALICE, '', 'Shopping', 'user_edit'),                  // customer-confirmed, no merchant name
    row(4, BOB, 'CORNER COFFEE 01', 'Shopping'),
  ];
  db.category_rules = [{ id: 'r1', user_id: ALICE, merchant_pattern: 'KEEP ME', match_value: 'KEEP ME', category: 'Travel', is_active: true }];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('T-ACT-FINAL — customer-typed "change all X to Y" uses the same contract', () => {
  it('proposal keeps customer-confirmed rows and states the exact count; "yes" changes exactly those; the legacy commit is gone', async () => {
    const p = await act({ intent: 'preview', matchValue: 'corner coffee', targetCategory: 'Food & Dining', ...convo('change all corner coffee to food & dining', 'msg_fin_0001') });
    expect(p.json.conversation.reply).toContain('AND change **1** of your **existing** "corner coffee" transaction to **Food & Dining** now (1 transaction with a protected category (set by you, or of unverified origin) will stay as they are)');
    expect(txUpdateCalls).toBe(0);
    const legacy = await act({ intent: 'commit', matchValue: 'corner coffee', targetCategory: 'Food & Dining', affectedIds: [id(1), id(2)], ...convo('yes', 'msg_fin_0002', { sessionId: p.json.conversation.sessionId }) });
    expect(legacy.res.statusCode).toBe(410);
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_fin_0003', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'completed', count: 1, success: true });
    expect(t(1).category).toBe('Food & Dining');
    expect(t(2)).toMatchObject({ category: 'Shopping', category_source: 'manual' });
    expect(t(4).category).toBe('Shopping');
  });
});

describe('T-ACT-FINAL — "Save rule" button: future imports only, never a silent historical change', () => {
  it('saves the rule, changes NO existing transaction, records the action', async () => {
    const before = snapshot();
    const { res, json } = await act({ intent: 'save_rule', matchValue: 'corner coffee', targetCategory: 'Food & Dining', matchType: 'contains' });
    expect(res.statusCode).toBe(200);
    expect(json).toMatchObject({ ok: true, backfill_count: 0, existingTransactionsChanged: 0 });
    expect(snapshot()).toBe(before);
    expect(txUpdateCalls).toBe(0);
    expect(db.category_rules).toEqual(expect.arrayContaining([expect.objectContaining({ user_id: ALICE, merchant_pattern: 'CORNER COFFEE', category: 'Food & Dining' })]));
    expect(db.tag_activity_log).toEqual([expect.objectContaining({ user_id: ALICE, action_type: 'save_merchant_rule' })]);
  });
  it('an unrecognised category is refused (never silently "Other")', async () => {
    const { res } = await act({ intent: 'save_rule', matchValue: 'corner coffee', targetCategory: 'Pizza', matchType: 'contains' });
    expect(res.statusCode).toBe(400);
    expect(db.category_rules).toHaveLength(1);
  });
});

describe('T-ACT-FINAL — legacy tag-chat: text the MODEL writes never changes data', () => {
  const MODEL_TAGS = [
    'Saved! <correction>{"merchant_pattern":"CORNER COFFEE","category":"Food & Dining","subcategory":null,"min_amount":null,"max_amount":null}</correction>',
    'Deleting it. <delete_rule>{"merchant_pattern":"%"}</delete_rule>',
    'Let me sweep. <merchant_sweep/>',
    'Rule saved.\nSAVE_RULE:{"merchant_pattern":"CORNER COFFEE","category":"Food & Dining","match_type":"contains","amount_min":null,"amount_max":null}',
    'Done {"action":"recategorize","category":"Food & Dining"}',
  ];
  for (const modelReply of MODEL_TAGS) {
    it(`no write for: ${modelReply.slice(0, 40)}…`, async () => {
      const before = snapshot();
      const rulesBefore = JSON.stringify(db.category_rules);
      openaiPlan.push(modelReply);
      const out = await tagChat({ message: 'corner coffee is food & dining', transactionId: id(1), merchant: 'CORNER COFFEE 01', context: 'page', pageContext: { transactionCount: 4 } });
      expect(snapshot()).toBe(before);
      expect(JSON.stringify(db.category_rules)).toBe(rulesBefore);
      expect(txUpdateCalls).toBe(0);
      expect(db.vendor_category_memory ?? []).toHaveLength(0);
      expect(out.reply).not.toMatch(/<correction>|<delete_rule>|<merchant_sweep|SAVE_RULE:|"action"\s*:/);
      expect(out.reply).toContain("I haven't changed anything here.");
      expect(out.rule_saved).toBe(false);
    });
  }
  it('tag-chat contains no transaction / rule / memory writes (only its own conversation log)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(__dirname, '../tag-chat.ts'), 'utf8');
    const writes = src.match(/from\('([a-z_]+)'\)\s*\.(update|upsert|insert|delete)\(/g) ?? [];
    expect(writes.every(w => w.includes("'tag_conversations'"))).toBe(true);
    expect(src).not.toMatch(/\.(update|delete)\(/);
  });
});

describe('T-ACT-FINAL — no competing confirmation mechanisms in the clients', () => {
  it('no client sends the retired merchant commit', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    for (const f of ['../../../src/components/transactions/TagCopilotPanel.tsx', '../../../src/hooks/useTagChatActions.ts', '../../../src/pages/dashboard/SmartCategoriesPage.tsx']) {
      const src = readFileSync(resolve(__dirname, f), 'utf8');
      expect(src).not.toMatch(/intent: 'commit',/);
    }
    const hook = readFileSync(resolve(__dirname, '../../../src/hooks/useTagChatActions.ts'), 'utf8');
    expect(hook).toContain("intent: 'commit_proposal'");
    expect(hook).toContain('detectUserActionIntent(message)');
    const smart = readFileSync(resolve(__dirname, '../../../src/pages/dashboard/SmartCategoriesPage.tsx'), 'utf8');
    expect(smart).toContain("intent: 'commit_proposal'");
  });
});

describe('T-ACT-FINAL — every confirmed action is recorded for employee collaboration (stable action_type)', () => {
  it('commit_single and commit_proposal both write tag_activity_log with the receipt action name', async () => {
    const p1 = await act({ intent: 'preview_single', transactionId: id(1), targetPhrase: 'Groceries', ...convo('change this to groceries', 'msg_fin_0101') });
    await act({ intent: 'commit_single', transactionId: id(1), targetCategory: 'Groceries', targetSubcategory: null, ...convo('yes', 'msg_fin_0102', { sessionId: p1.json.conversation.sessionId }) });
    const p2 = await act({ intent: 'preview', matchValue: 'corner coffee', targetCategory: 'Travel', ...convo('change all corner coffee to travel', 'msg_fin_0103', { sessionId: p1.json.conversation.sessionId }) });
    await act({ intent: 'commit_proposal', action: p2.json.proposal.action, subject: p2.json.proposal.subject, ...convo('yes', 'msg_fin_0104', { sessionId: p1.json.conversation.sessionId }) });
    expect((db.tag_activity_log ?? []).map(r => r.action_type)).toEqual(['recategorize_single_transaction', 'save_merchant_rule']);
    expect(db.tag_activity_log.every(r => r.user_id === ALICE)).toBe(true);
  });
});
