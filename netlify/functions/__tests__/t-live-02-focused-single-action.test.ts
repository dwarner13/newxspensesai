/**
 * T-LIVE-02 — focused-transaction change requests (owner live finding, staging 9275ddb), server side.
 * Real tag-action handler + shared conversation platform over an in-memory fake; synthetic data only.
 * Harness copied from t-h1b-tag-action-conversation.test.ts.
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

// Synthetic transactions (no real customer data). FOCUS mirrors the owner's case shape only.
const FOCUS = 'aaaaaaaa-0000-4000-8000-000000000001';
const SAME_MERCHANT = 'aaaaaaaa-0000-4000-8000-000000000002';
const OTHER = 'aaaaaaaa-0000-4000-8000-000000000003';
const BOBS = 'bbbbbbbb-0000-4000-8000-000000000001';
const tx = (id: string) => db.transactions.find(t => t.id === id)!;
const msgs = (sessionId: unknown) => (db.chat_messages || []).filter(m => m.session_id === sessionId);

const OWNER_TEXT = 'can we change this to food and beverage';
const proposeFocused = (id = 'msg_single_0001', phrase = 'food and beverage', text = OWNER_TEXT, extra: Record<string, unknown> = {}, transactionId = FOCUS) =>
  act({ intent: 'preview_single', transactionId, targetPhrase: phrase, ...convo(text, id, extra) });
const confirmFocused = (id: string, sessionId: unknown, over: Record<string, unknown> = {}) =>
  act({ intent: 'commit_single', transactionId: FOCUS, targetCategory: 'Food & Dining', targetSubcategory: null, ...over, ...convo('yes', id, { sessionId }) });

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0;
  authState.userId = ALICE;
  db.transactions = [
    { id: FOCUS, user_id: ALICE, merchant_name: 'SAMPLE EVENTS CO', amount: -12.34, posted_at: '2026-11-03', date: '2026-11-03', category: 'Shopping', subcategory: null },
    { id: SAME_MERCHANT, user_id: ALICE, merchant_name: 'SAMPLE EVENTS CO', amount: -40, posted_at: '2026-10-03', date: '2026-10-03', category: 'Shopping', subcategory: null },
    { id: OTHER, user_id: ALICE, merchant_name: 'THIS IS IT CAFE', amount: -6, posted_at: '2026-11-01', date: '2026-11-01', category: 'Shopping', subcategory: null },
    { id: BOBS, user_id: BOB, merchant_name: 'SAMPLE EVENTS CO', amount: -10, posted_at: '2026-11-03', date: '2026-11-03', category: 'Shopping', subcategory: null },
  ];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('T-LIVE-02 — the owner\'s exact interaction', () => {
  it('focused SAMPLE EVENTS CO + "can we change this to food and beverage" → ONE-transaction proposal, nothing changed', async () => {
    const { json } = await proposeFocused();
    expect(json).toMatchObject({ ok: true, intent: 'preview_single', executed: false, transactionId: FOCUS, targetCategory: 'Food & Dining', targetSubcategory: null, matchCount: 1 });
    const reply: string = json.conversation.reply;
    expect(reply).not.toMatch(/didn't find any matching|THIS"/);
    expect(reply).toContain('There\'s no "food and beverage" category — the closest is **Food & Dining**.');
    expect(reply).toContain('Change this **SAMPLE EVENTS CO** transaction ($12.34 on 2026-11-03) from **Shopping** to **Food & Dining**?');
    expect(reply).toContain('Only this one transaction changes — no rule is saved and no other transactions are touched. Say yes to confirm.');
    expect(json.conversation.receipt).toMatchObject({
      action: 'recategorize_single_transaction', state: 'proposed',
      subject: { transactionId: FOCUS, targetCategory: 'Food & Dining', targetSubcategory: null }, result: { matchCount: 1 },
    });
    expect(txUpdateCalls).toBe(0);
    expect(tx(FOCUS).category).toBe('Shopping');
    const [user, assistant] = msgs(json.conversation.sessionId);
    expect(user).toMatchObject({ role: 'user', content: OWNER_TEXT });
    expect(assistant.metadata.actionReceipt.state).toBe('proposed');
  });

  it('"yes" changes ONLY the focused transaction — no rule, no merchant memory, no other row', async () => {
    const p = await proposeFocused();
    const { json } = await confirmFocused('msg_single_0002', p.json.conversation.sessionId);
    expect(json).toMatchObject({ ok: true, intent: 'commit_single', executed: true, updatedCount: 1 });
    expect(json.conversation.receipt).toMatchObject({ action: 'recategorize_single_transaction', state: 'completed', tool: 'recategorize_single_transaction', success: true, count: 1, result: { affectedCount: 1 } });
    expect(json.conversation.reply).toBe('Done — this **SAMPLE EVENTS CO** transaction is now in **Food & Dining**. No other transactions or rules were changed.');
    expect(tx(FOCUS)).toMatchObject({ category: 'Food & Dining', subcategory: null, category_source: 'tag_chat' });
    expect(tx(SAME_MERCHANT).category).toBe('Shopping');
    expect(tx(OTHER).category).toBe('Shopping');
    expect(tx(BOBS).category).toBe('Shopping');
    expect(db.category_rules ?? []).toHaveLength(0);
    expect(db.vendor_category_memory ?? []).toHaveLength(0);
    expect(txUpdateCalls).toBe(1);
  });

  it('a retried "yes" (same message id) never changes it twice', async () => {
    const p = await proposeFocused();
    await confirmFocused('msg_single_0002', p.json.conversation.sessionId);
    const again = await confirmFocused('msg_single_0002', p.json.conversation.sessionId);
    expect(again.json).toMatchObject({ duplicate: true, executed: false });
    expect(txUpdateCalls).toBe(1);
  });
});

describe('T-LIVE-02 — ownership and signed-proposal safeguards', () => {
  it('another customer\'s transaction id is never proposed or changed', async () => {
    const { json } = await proposeFocused('msg_single_0003', 'food and beverage', OWNER_TEXT, {}, BOBS);
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'not_found' });
    expect(json.conversation.reply).toBe("I can't find that transaction in your account, so nothing has changed.");
    expect(tx(BOBS).category).toBe('Shopping');
  });
  it('a confirmation with no preceding proposal changes nothing', async () => {
    const p = await act({ intent: 'cancel_proposal', ...convo('hello', 'msg_single_0004') });
    const { json } = await confirmFocused('msg_single_0005', p.json.conversation.sessionId);
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'no_matching_proposal' });
    expect(txUpdateCalls).toBe(0);
  });
  it('a confirmation for a DIFFERENT transaction or category than proposed changes nothing', async () => {
    const p = await proposeFocused();
    const sid = p.json.conversation.sessionId;
    const other = await confirmFocused('msg_single_0006', sid, { transactionId: SAME_MERCHANT });
    expect(other.json.conversation.receipt.reason).toBe('no_matching_proposal');
    const p2 = await proposeFocused('msg_single_0007', 'food and beverage', OWNER_TEXT, { sessionId: sid });
    const cat = await confirmFocused('msg_single_0008', p2.json.conversation.sessionId, { targetCategory: 'Travel' });
    expect(cat.json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(0);
    expect(tx(SAME_MERCHANT).category).toBe('Shopping');
  });
  it('a merchant-wide confirmation can never consume a single-transaction proposal', async () => {
    const p = await proposeFocused();
    const merchantEcho = { merchantPattern: 'SAMPLE EVENTS CO', targetCategory: 'Food & Dining', targetSubcategory: null, applyToExisting: 'yes', matchType: 'contains', affected: 2, fingerprint: 'x' };
    const { json } = await act({ intent: 'commit_proposal', action: 'save_merchant_rule', subject: merchantEcho, ...convo('yes', 'msg_single_0009', { sessionId: p.json.conversation.sessionId }) });
    expect(json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(0);
  });
  it('"no" cancels the single proposal, after which "yes" changes nothing', async () => {
    const p = await proposeFocused();
    const sid = p.json.conversation.sessionId;
    const c = await act({ intent: 'cancel_proposal', ...convo('no', 'msg_single_0010', { sessionId: sid }) });
    expect(c.json.conversation.receipt).toMatchObject({ action: 'recategorize_single_transaction', state: 'cancelled' });
    const y = await confirmFocused('msg_single_0011', sid);
    expect(y.json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(0);
  });
  it('requires a conversation (signed receipts) and a valid transaction id', async () => {
    expect((await act({ intent: 'preview_single', transactionId: FOCUS, targetPhrase: 'Groceries' })).res.statusCode).toBe(400);
    expect((await act({ intent: 'preview_single', transactionId: 'this', targetPhrase: 'Groceries', ...convo('x', 'msg_single_0012') })).res.statusCode).toBe(400);
  });
});

describe('T-LIVE-02 — category resolution (never a silent substitution)', () => {
  it('an exact category is proposed without a "closest" note', async () => {
    const { json } = await proposeFocused('msg_single_0013', 'Groceries', 'change this to Groceries');
    expect(json.targetCategory).toBe('Groceries');
    expect(json.conversation.reply).not.toContain('closest');
  });
  it('an ambiguous phrase asks which category and proposes nothing', async () => {
    const { json } = await proposeFocused('msg_single_0014', 'gas and groceries', 'change this to gas and groceries');
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'category_ambiguous' });
    expect(json.conversation.reply).toContain('could mean **Groceries** or **Transportation**');
  });
  it('an unknown phrase asks (never becomes "Other")', async () => {
    const { json } = await proposeFocused('msg_single_0015', 'pizza', 'change this to pizza');
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'category_unknown' });
    expect(json.conversation.reply).toContain('I don\'t have a "pizza" category');
  });
  it('already in that category: nothing to change', async () => {
    const { json } = await proposeFocused('msg_single_0016', 'shopping', 'change this to shopping');
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'already_in_category' });
  });
  it('merchant-wide path: "Food And Beverage" is proposed as Food & Dining WITH the note, and the confirmation binds', async () => {
    const p = await act({ intent: 'preview', matchValue: 'SAMPLE EVENTS', targetCategory: 'Food And Beverage', ...convo('change all SAMPLE EVENTS to food and beverage', 'msg_single_0017') });
    expect(p.json.conversation.receipt).toMatchObject({ state: 'proposed', action: 'save_merchant_rule', subject: { targetCategory: 'Food & Dining' } });
    expect(p.json.conversation.reply).toContain('There\'s no "Food And Beverage" category — the closest is **Food & Dining**.');
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_single_0018', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.state).toBe('completed');
    expect(tx(FOCUS).category).toBe('Food & Dining');
    expect(tx(SAME_MERCHANT).category).toBe('Food & Dining');
  });
  it('merchant-wide path: an unknown category asks instead of proposing "Other"', async () => {
    const { json } = await act({ intent: 'preview', matchValue: 'SAMPLE EVENTS', targetCategory: 'Pizza', ...convo('change all SAMPLE EVENTS to pizza', 'msg_single_0019') });
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'category_unresolved' });
    expect(json.conversation.reply).not.toContain('**Other**');
  });
});

// ─── Tag's chat path: update_single_transaction only PROPOSES; "yes" goes through tag-action ─────
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
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify({ message, focusedTransaction: { id: FOCUS }, ...extra }) }, {},
  );
  return JSON.parse(res.body);
}
const toolCall = (transaction_id: string, category: string, text = 'Done! I changed it for you.') => ({
  content: [
    { type: 'text', text },
    { type: 'tool_use', id: 'tu_single', name: 'update_single_transaction', input: { transaction_id, category } },
  ],
});

describe('T-LIVE-02 — Tag chat tool is proposal-only (server-enforced confirmation)', () => {
  beforeEach(() => { modelPlan.length = 0; });

  it('the model calling update_single_transaction changes NOTHING and shows the server proposal (never "Done")', async () => {
    modelPlan.push(toolCall(FOCUS, 'Food & Dining'));
    const out = await chat(OWNER_TEXT, { clientMessageId: 'msg_chat_0001' });
    expect(txUpdateCalls).toBe(0);
    expect(tx(FOCUS).category).toBe('Shopping');
    expect(out.reply).not.toMatch(/Done!|I changed it/);
    expect(out.reply).toContain('Change this **SAMPLE EVENTS CO** transaction ($12.34 on 2026-11-03) from **Shopping** to **Food & Dining**?');
    expect(out.proposal).toEqual({ kind: 'single', transactionId: FOCUS, targetCategory: 'Food & Dining', targetSubcategory: null });
    expect(out.action).toMatchObject({ tool: 'update_single_transaction', applied: false, proposalOnly: true });
    const stored = msgs(out.sessionId).filter(m => m.role === 'assistant').pop();
    expect(stored.metadata.actionReceipt).toMatchObject({ action: 'recategorize_single_transaction', state: 'proposed', subject: { transactionId: FOCUS, targetCategory: 'Food & Dining' } });
    expect(stored.metadata.actionReceipt.success).toBeUndefined();
  });

  it('the customer\'s "yes" (tag-action commit_single) then changes exactly that one transaction', async () => {
    modelPlan.push(toolCall(FOCUS, 'Food & Dining'));
    const out = await chat(OWNER_TEXT, { clientMessageId: 'msg_chat_0002' });
    const { json } = await confirmFocused('msg_chat_0003', out.sessionId);
    expect(json.conversation.receipt).toMatchObject({ state: 'completed', count: 1 });
    expect(tx(FOCUS)).toMatchObject({ category: 'Food & Dining', category_source: 'tag_chat' });
    expect(tx(SAME_MERCHANT).category).toBe('Shopping');
    expect(db.category_rules ?? []).toHaveLength(0);
  });

  it('a tool call naming another customer\'s transaction proposes nothing', async () => {
    modelPlan.push(toolCall(BOBS, 'Food & Dining'));
    const out = await chat('change this to food', { clientMessageId: 'msg_chat_0004' });
    expect(out.proposal).toBeUndefined();
    expect(out.reply).toBe("I can't find that transaction in your account, so nothing has changed.");
    expect(txUpdateCalls).toBe(0);
  });

  it('an ordinary Tag reply after the proposal voids it: a later "yes" changes nothing', async () => {
    modelPlan.push(toolCall(FOCUS, 'Food & Dining'));
    const out = await chat(OWNER_TEXT, { clientMessageId: 'msg_chat_0005' });
    await chat('actually, what is this merchant?', { clientMessageId: 'msg_chat_0006', sessionId: out.sessionId });
    const { json } = await confirmFocused('msg_chat_0007', out.sessionId);
    expect(json.conversation.receipt.reason).toBe('no_matching_proposal');
    expect(txUpdateCalls).toBe(0);
  });
});
