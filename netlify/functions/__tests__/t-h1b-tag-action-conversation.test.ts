/**
 * T-H1b — Tag action turns (preview → confirmation → completed / failed / cancelled) are saved in the
 * customer's Tag conversation with SERVER-composed replies and receipts.
 *
 * The real tag-action handler and the real shared conversation platform run; auth is mocked and the
 * database is an in-memory fake (transactions, rules, memory, chat_sessions, chat_messages).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
    if (rng) m = m.slice(rng[0], rng[1] + 1);
    return { data: m.slice(0, lim), error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    select: () => b,
    // T-ACT-FINAL: the shared proposal builder pages (range) and matches merchants (ilike).
    ilike: (c: string, pat: string) => {
      const re = new RegExp('^' + pat.split('%').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
      filters.push(r => re.test(String(r[c] ?? '')));
      return b;
    },
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
process.env.CONVERSATION_SIGNING_SECRET = 'test-signing-secret-not-real-0123456789abcdef'; // P-8: dedicated reply-signing key

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
// T-ACT-FINAL: the typed merchant path is the shared proposal contract. A preview returns the signed
// proposal; the "yes" is tag-action commit_proposal echoing it back (the retired `commit` returns 410).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastProposal: any = null;
const UBER_FALLBACK = { action: 'save_merchant_rule', subject: { merchantPattern: 'UBER', targetCategory: 'Transportation', targetSubcategory: null, applyToExisting: 'yes', matchType: 'contains', affected: 2, fingerprint: 'unknown' } };
const proposeUber = async (id = 'msg_prop_00001', extra: Record<string, unknown> = {}) => {
  const r = await act({ intent: 'preview', matchValue: 'uber', targetCategory: 'Transportation', ...convo('move uber to Transportation', id, extra) });
  if (r.json?.proposal) lastProposal = r.json.proposal;
  return r;
};
const confirmUber = (id: string, sessionId: unknown, extra: Record<string, unknown> = {}) => {
  const prop = lastProposal ?? UBER_FALLBACK;
  return act({ intent: 'commit_proposal', action: prop.action, subject: prop.subject, ...convo('yes', id, { sessionId, ...extra }) });
};
const tx = (id: string) => db.transactions.find(t => t.id === id)!;
const msgs = (sessionId: unknown) => (db.chat_messages || []).filter(m => m.session_id === sessionId);

let logged: string[] = [];
beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0;
  authState.userId = ALICE;
  lastProposal = null;
  db.transactions = [
    { id: 't1', user_id: ALICE, merchant_name: 'UBER TRIP', amount: -18.5, posted_at: '2026-11-03', category: 'Travel' },
    { id: 't2', user_id: ALICE, merchant_name: 'UBER EATS', amount: -22.1, posted_at: '2026-11-02', category: 'Food & Dining' },
    { id: 't3', user_id: ALICE, merchant_name: 'COSTCO WHSE', amount: -84.19, posted_at: '2026-11-01', category: 'Groceries' },
    { id: 'b1', user_id: BOB, merchant_name: 'UBER TRIP', amount: -9, posted_at: '2026-11-03', category: 'Travel' },
  ];
  logged = [];
  for (const m of ['log', 'warn', 'error', 'info'] as const) {
    vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logged.push(a.map(String).join(' ')); });
  }
});
afterEach(() => { vi.restoreAllMocks(); });

describe('T-H1b — preview is a server-recorded proposal (never described as done)', () => {
  it('stores the customer message and a server-written proposal with a "proposed" receipt; nothing changes', async () => {
    const { json } = await proposeUber();
    expect(json).toMatchObject({ ok: true, intent: 'preview', matchCount: 2, executed: false });
    // T-ACT-FINAL: the typed request is the shared contract (future rule + existing transactions, spelled out).
    expect(json.conversation).toMatchObject({ persisted: true, duplicate: false, receipt: { v: 1, employee: 'tag-ai', action: 'save_merchant_rule', state: 'proposed', result: { matchCount: 2 } } });
    expect(json.conversation.reply).toBe('Save a rule so **future imports** matching "uber" are categorized as **Transportation**, AND change **2** of your **existing** "uber" transactions to **Transportation** now? Say yes to confirm.');
    expect(json.proposal).toMatchObject({ kind: 'action', action: 'save_merchant_rule', subject: { merchantPattern: 'UBER', applyToExisting: 'yes', affected: 2 } });
    expect(json.conversation.reply).not.toMatch(/\bDone\b|Moved \d/);
    expect(tx('t1').category).toBe('Travel');
    const [user, reply] = msgs(json.conversation.sessionId);
    expect(user).toMatchObject({ role: 'user', content: 'move uber to Transportation', user_id: ALICE, employee_key: 'tag' });
    expect(reply).toMatchObject({ role: 'assistant', content: json.conversation.reply });
    expect(reply.metadata.actionReceipt.state).toBe('proposed');
  });

  it('a preview with no matches is a failed proposal ("no_matches"), not a pending one', async () => {
    const { json } = await act({ intent: 'preview', matchValue: 'starbucks', targetCategory: 'Coffee', ...convo('move starbucks to Coffee', 'msg_none_00001') });
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'no_matches' });
    expect(json.conversation.reply).toContain("didn't find any matching");
  });
});

describe('T-H1b — confirmation completes only the server-recorded proposal', () => {
  it('confirmed → completed: updates exactly the matched rows, verified count, rule saved, receipt + intent stored', async () => {
    const p = await proposeUber();
    const { json } = await confirmUber('msg_conf_00001', p.json.conversation.sessionId);
    expect(json).toMatchObject({ ok: true, intent: 'commit_proposal', executed: true, updatedCount: 2 });
    expect(json.conversation.receipt).toMatchObject({ state: 'completed', result: { affectedCount: 2 }, proposalRef: 'msg_prop_00001', tool: 'save_merchant_rule', success: true, count: 2 });
    expect(json.conversation.reply).toBe('Done — saved the rule for future "UBER" imports (**Transportation**) and changed **2** existing transactions.');
    expect([tx('t1').category, tx('t2').category, tx('t3').category, tx('b1').category]).toEqual(['Transportation', 'Transportation', 'Groceries', 'Travel']);
    expect(tx('t1').category_source).toBe('tag_rule');
    expect(db.category_rules).toHaveLength(1);
    const confirmRow = msgs(json.conversation.sessionId).find(m => m.metadata?.client_message_id === 'msg_conf_00001');
    expect(confirmRow.metadata.actionIntent).toMatchObject({ state: 'confirmed', proposalRef: 'msg_prop_00001', matchesProposal: true });
  });

  it('rejected confirmation: no pending proposal → nothing changes, receipt failed/no_matching_proposal', async () => {
    const first = await act({ intent: 'preview', matchValue: 'costco', targetCategory: 'Shopping', ...convo('move costco to Shopping', 'msg_other_0001') });
    const { json } = await confirmUber('msg_conf_00002', first.json.conversation.sessionId);
    expect(json).toMatchObject({ ok: false, executed: false, error: 'no_matching_proposal' });
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'no_matching_proposal' });
    expect(txUpdateCalls).toBe(0);
    expect(tx('t1').category).toBe('Travel');
  });

  it('a confirmation that does not directly follow the proposal is not honoured', async () => {
    const p = await proposeUber();
    await act({ intent: 'preview', matchValue: 'costco', targetCategory: 'Shopping', ...convo('and costco?', 'msg_mid_00001', { sessionId: p.json.conversation.sessionId }) });
    const { json } = await confirmUber('msg_conf_00003', p.json.conversation.sessionId);
    expect(json.executed).toBe(false);
    expect(tx('t1').category).toBe('Travel');
  });

  it('an ordinary Tag reply between the proposal and the "yes" voids the proposal', async () => {
    const p = await proposeUber();
    // e.g. a Tag Copilot chat turn (no action receipt) answered in the same conversation
    db.chat_messages.push({ id: 'plain-reply', session_id: p.json.conversation.sessionId, user_id: ALICE, role: 'assistant', content: 'Uber is usually transport.', created_at: new Date(Date.now() + 60_000).toISOString(), metadata: { employee_slug: 'tag-ai' } });
    const { json } = await confirmUber('msg_conf_00008', p.json.conversation.sessionId);
    expect(json).toMatchObject({ executed: false, error: 'no_matching_proposal' });
    expect(txUpdateCalls).toBe(0);
  });

  it('cancelled: the proposal is cancelled, nothing changes, and a later "yes" cannot apply it', async () => {
    const p = await proposeUber();
    const c = await act({ intent: 'cancel_proposal', ...convo('no thanks', 'msg_cancel_001', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'cancelled', proposalRef: 'msg_prop_00001' });
    expect(c.json.conversation.reply).toBe("Okay, I won't change anything.");
    const late = await confirmUber('msg_conf_00004', p.json.conversation.sessionId);
    expect(late.json.executed).toBe(false);
    expect(txUpdateCalls).toBe(0);
  });

  it('failed action: a database error is a failed receipt and the reply never claims success', async () => {
    const p = await proposeUber();
    faults.txUpdate = true;
    const { json } = await confirmUber('msg_conf_00005', p.json.conversation.sessionId);
    expect(json).toMatchObject({ ok: false, executed: false });
    expect(json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'update_failed', count: 0 });
    expect(json.conversation.reply).not.toMatch(/\bDone\b/);
    expect(json.conversation.persisted).toBe(true);
  });

  it('a browser-altered proposal (or the retired id-list commit) is never honoured', async () => {
    const p = await proposeUber();
    // Tampered echo: widen the scope to Costco.
    const altered = { ...lastProposal.subject, merchantPattern: 'COSTCO', affected: 3 };
    const tampered = await act({ intent: 'commit_proposal', action: 'save_merchant_rule', subject: altered, ...convo('yes', 'msg_conf_00006', { sessionId: p.json.conversation.sessionId }) });
    expect(tampered.json.conversation.receipt.reason).toBe('no_matching_proposal');
    // The legacy commit with a client id list (incl. Costco and Bob's row) is retired.
    const legacy = await act({ intent: 'commit', matchValue: 'uber', targetCategory: 'Transportation', affectedIds: ['t1', 't3', 'b1'], ...convo('yes', 'msg_conf_00007', { sessionId: p.json.conversation.sessionId }) });
    expect(legacy.res.statusCode).toBe(410);
    expect(txUpdateCalls).toBe(0);
    expect(tx('t3').category).toBe('Groceries');
    expect(tx('b1').category).toBe('Travel');
  });
});

describe('T-H1b — retries, concurrency and partial persistence never repeat the action', () => {
  it('a retried confirmation returns the stored completed receipt and does not update again', async () => {
    const p = await proposeUber();
    const first = await confirmUber('msg_conf_00010', p.json.conversation.sessionId);
    const callsAfterFirst = txUpdateCalls;
    const retry = await confirmUber('msg_conf_00010', p.json.conversation.sessionId);
    expect(txUpdateCalls).toBe(callsAfterFirst);
    expect(retry.json).toMatchObject({ duplicate: true, executed: false });
    expect(retry.json.conversation).toMatchObject({ persisted: true, reply: first.json.conversation.reply, receipt: { state: 'completed' } });
  });

  it('a unique conflict with nothing stored in this session is a conflict: nothing runs, nothing is claimed as saved', async () => {
    const p = await proposeUber();
    faults.uniqueOnClaim = true;
    const { json } = await confirmUber('msg_conf_00011', p.json.conversation.sessionId);
    expect(json).toMatchObject({ ok: false, error: 'conflict', executed: false });
    expect(json.conversation).toMatchObject({ persisted: false, conflict: true, receipt: null });
    expect(json.conversation.reply).toContain('send it again');
    expect(txUpdateCalls).toBe(0);
  });

  it('a concurrent request whose message is already stored (it won the race) is a duplicate: nothing runs again', async () => {
    const p = await proposeUber();
    // The winning request stored the confirmation; this request's insert then hits the unique index.
    db.chat_messages.push({ id: 'winner', session_id: p.json.conversation.sessionId, user_id: ALICE, role: 'user', content: 'yes', created_at: new Date(Date.now() + 1000).toISOString(), metadata: { client_message_id: 'msg_conf_00013' } });
    faults.uniqueOnClaim = true;
    const { json } = await confirmUber('msg_conf_00013', p.json.conversation.sessionId);
    expect(json).toMatchObject({ duplicate: true, executed: false });
    expect(json.conversation.reply).toContain("outcome wasn't recorded");
    expect(txUpdateCalls).toBe(0);
  });

  it('financial writes are set-to-value: applying the same change twice leaves the same state (idempotent beyond chat dedup)', async () => {
    const p = await proposeUber();
    await confirmUber('msg_conf_00050', p.json.conversation.sessionId);
    const snapshot = JSON.stringify({ tx: db.transactions.map(t => [t.id, t.category, t.subcategory, t.category_source]), rules: db.category_rules.map(r => [r.merchant_pattern, r.category, r.is_active]), memory: db.vendor_category_memory.map(m => [m.vendor_key, m.category]) });
    // Proposing again finds nothing left to change; confirming it re-saves the same rule only.
    const again1 = await proposeUber('msg_prop_00051', { sessionId: p.json.conversation.sessionId });
    expect(again1.json.proposal.subject.affected).toBe(0);
    await confirmUber('msg_conf_00052', p.json.conversation.sessionId);
    const again = JSON.stringify({ tx: db.transactions.map(t => [t.id, t.category, t.subcategory, t.category_source]), rules: db.category_rules.map(r => [r.merchant_pattern, r.category, r.is_active]), memory: db.vendor_category_memory.map(m => [m.vendor_key, m.category]) });
    expect(again).toBe(snapshot);
    expect(db.category_rules).toHaveLength(1);
    expect(db.vendor_category_memory).toHaveLength(1);
  });

  it('action succeeded but the reply could not be saved: both states reported; a retry does not act again', async () => {
    const p = await proposeUber();
    faults.assistantInsert = true;
    const { json } = await confirmUber('msg_conf_00012', p.json.conversation.sessionId);
    expect(json).toMatchObject({ executed: true, updatedCount: 2 });
    expect(json.conversation).toMatchObject({ persisted: false, receipt: { state: 'completed' } });
    faults.assistantInsert = false;
    const callsAfter = txUpdateCalls;
    const retry = await confirmUber('msg_conf_00012', p.json.conversation.sessionId);
    expect(txUpdateCalls).toBe(callsAfter);
    expect(retry.json).toMatchObject({ duplicate: true, executed: false });
    expect(retry.json.conversation).toMatchObject({ persisted: false, receipt: null });
    expect(retry.json.conversation.reply).toContain('Nothing was run again');
  });
});

describe('T-H1b — ownership, masking, restoration, compatibility', () => {
  it("another customer's session id is never used; their proposal cannot be confirmed", async () => {
    authState.userId = BOB;
    const bob = await proposeUber('msg_bobprop_01');
    authState.userId = ALICE;
    const { json } = await confirmUber('msg_conf_00020', bob.json.conversation.sessionId);
    expect(json.conversation.sessionId).not.toBe(bob.json.conversation.sessionId);
    expect(json.executed).toBe(false);
    expect(tx('t1').category).toBe('Travel');
    expect(tx('b1').category).toBe('Travel');
    expect(msgs(bob.json.conversation.sessionId).every(m => m.user_id === BOB)).toBe(true);
  });

  it('unauthenticated requests are rejected and store nothing', async () => {
    authState.userId = null;
    const { res } = await proposeUber();
    expect(res.statusCode).toBe(401);
    expect(db.chat_messages ?? []).toHaveLength(0);
  });

  it('customer text is masked before storage; logs carry no customer text or merchant', async () => {
    const { json } = await act({ intent: 'preview', matchValue: 'uber', targetCategory: 'Transportation', ...convo('move uber to Transportation, card 4519 0123 4567 8901 SECRETMARK', 'msg_mask_00001') });
    const user = msgs(json.conversation.sessionId)[0];
    expect(user.content).not.toContain('4519 0123 4567 8901');
    expect(user.content).toContain('SECRETMARK');
    expect(logged.join('\n')).not.toContain('SECRETMARK');
  });

  it('restoration: the conversation holds the full proposal → confirmation → completion in order', async () => {
    const p = await proposeUber();
    await confirmUber('msg_conf_00030', p.json.conversation.sessionId);
    const turns = msgs(p.json.conversation.sessionId).map(m => [m.role, m.metadata?.actionReceipt?.state ?? m.metadata?.actionIntent?.state ?? null]);
    expect(turns).toEqual([['user', null], ['assistant', 'proposed'], ['user', 'confirmed'], ['assistant', 'completed']]);
    // P-4: thread_id references the customer's Tag thread (chat_threads), never the session id.
    const threadIds = new Set((db.chat_threads || []).map(t => t.id));
    for (const m of msgs(p.json.conversation.sessionId)) {
      expect(threadIds.has(m.thread_id)).toBe(true);
      expect(m.thread_id).not.toBe(p.json.conversation.sessionId);
      expect(m.employee_key).toBe('tag');
    }
    const confirmRow = msgs(p.json.conversation.sessionId)[2];
    expect(typeof confirmRow.message_uid).toBe('string');
  });

  it('without conversation fields, preview is read-only and the legacy commit is retired (410, nothing changes)', async () => {
    const preview = await act({ intent: 'preview', matchValue: 'uber', targetCategory: 'Transportation' });
    expect(preview.json).toMatchObject({ ok: true, intent: 'preview', matchCount: 2, affectedIds: ['t1', 't2'] });
    expect(preview.json.conversation).toBeUndefined();
    const commit = await act({ intent: 'commit', matchValue: 'uber', targetCategory: 'Transportation', affectedIds: ['t1', 't2', 'missing'] });
    expect(commit.res.statusCode).toBe(410);
    expect(txUpdateCalls).toBe(0);
    expect(db.category_rules ?? []).toHaveLength(0);
    expect(db.chat_messages ?? []).toHaveLength(0);
  });

  it('conversation without customer text is rejected before anything runs', async () => {
    const { res } = await act({ intent: 'commit', matchValue: 'uber', targetCategory: 'Transportation', conversation: { clientMessageId: 'msg_bad_00001' } });
    expect(res.statusCode).toBe(400);
    expect(txUpdateCalls).toBe(0);
  });
});

describe('tag-action audit log (non-blocking)', () => {
  it('fix_type succeeds and writes the activity log (the old .catch() threw a TypeError and returned 500)', async () => {
    const { res, json } = await act({ intent: 'fix_type', transactionId: 't1', newType: 'income' });
    expect(res.statusCode).toBe(200);
    expect(json).toMatchObject({ ok: true, intent: 'fix_type', newType: 'income' });
    expect(tx('t1')).toMatchObject({ type: 'income', category: 'Income', category_source: 'user_type_fix' });
    expect(db.tag_activity_log).toHaveLength(1);
    expect(db.tag_activity_log[0]).toMatchObject({ user_id: ALICE, action_type: 'type_fix', transaction_id: 't1' });
  });
  it("a failed log write never fails the customer's change", async () => {
    faults.activityLog = true;
    const { res, json } = await act({ intent: 'fix_type', transactionId: 't2', newType: 'income' });
    expect(res.statusCode).toBe(200);
    expect(json.ok).toBe(true);
    expect(tx('t2').type).toBe('income');
  });
  it('no Supabase query in tag-action chains .catch() (builders are thenables without catch)', () => {
    const src = readFileSync(resolve(__dirname, '../tag-action.ts'), 'utf8');
    expect(src).not.toMatch(/\}\)\.catch\(\(\) => \{\}\);/);
  });
});
