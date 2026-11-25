/**
 * Owner GO 2026-11-25: customer bulk buttons. "Apply suggestions" becomes a signed server proposal;
 * undo / fix_type_bulk / bulk_normalize_subcategory retired; interim bulk_apply hardened. Synthetic data only.
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


// Synthetic data only.
const IMP = 'imp-new-statement';
const r = (id: string, user: string, merchant: string, category: string | null, source: string | null, importId = IMP) => ({
  id, user_id: user, merchant_name: merchant, merchant, description: `POS ${merchant}`, amount: -9.5, type: 'expense',
  posted_at: '2026-11-01', date: '2026-11-01', category, subcategory: null, category_source: source, import_id: importId,
});
const t = (id: string) => db.transactions.find(x => x.id === id)!;

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0;
  authState.userId = ALICE;
  db.transactions = [
    r('a1', ALICE, 'CORNER COFFEE 7', 'Uncategorized', null),
    r('a2', ALICE, 'CORNER COFFEE 8', 'Needs Review', 'needs_review'),
    r('a3', ALICE, 'CORNER COFFEE 9', 'Other', 'manual'),          // customer-approved Other: never suggested
    r('a4', ALICE, 'GRAINS BAKERY', 'Uncategorized', null),        // no rule / history: unsure
    r('b1', BOB, 'CORNER COFFEE 7', 'Uncategorized', null),
  ];
  db.category_rules = [{ user_id: ALICE, match_type: 'contains', match_value: 'corner coffee', merchant_pattern: 'CORNER COFFEE', category: 'Food & Dining', is_active: true }];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

const propose = (id: string, extra: Record<string, unknown> = {}) =>
  act({ intent: 'propose_import_suggestions', importId: IMP, ...convo("Apply Tag's suggestions for this statement", id, extra) });

describe('"Apply suggestions" is a server-computed, signed proposal the customer confirms', () => {
  it('the proposal states the exact count, never includes a customer-approved row, and changes nothing yet', async () => {
    const p = await propose('msg_btn_0001');
    expect(p.json.conversation.receipt).toMatchObject({ action: 'apply_import_suggestions', state: 'proposed', result: { matchCount: 2 } });
    expect(p.json.conversation.reply).toContain("Apply Tag's suggestions to **2** transactions from this statement");
    expect(p.json.conversation.reply).toContain('1 transaction you categorized yourself will stay as they are');
    expect(txUpdateCalls).toBe(0);
  });
  it('"yes" applies exactly those rows (verified count), keeps the approved Other, never touches another customer, records it', async () => {
    const p = await propose('msg_btn_0002');
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_btn_0003', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'completed', count: 2, success: true });
    expect([t('a1').category, t('a2').category]).toEqual(['Food & Dining', 'Food & Dining']);
    expect(t('a3')).toMatchObject({ category: 'Other', category_source: 'manual' });
    expect(t('a4').category).toBe('Uncategorized');
    expect(t('b1').category).toBe('Uncategorized');
    expect((db.tag_activity_log ?? []).map(x => x.action_type)).toContain('apply_import_suggestions');
  });
  it('a stale proposal (the statement changed since) changes nothing', async () => {
    const p = await propose('msg_btn_0004');
    db.transactions.push(r('a5', ALICE, 'CORNER COFFEE 10', 'Uncategorized', null));
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_btn_0005', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.reason).toBe('stale');
    expect(txUpdateCalls).toBe(0);
  });
  it('requires a conversation (signed receipt)', async () => {
    const res = await act({ intent: 'propose_import_suggestions', importId: IMP });
    expect(res.res.statusCode).toBe(400);
  });
});

describe('legacy bulk buttons', () => {
  it('undo, fix_type_bulk and bulk_normalize_subcategory are retired (410) and change nothing', async () => {
    for (const intent of ['undo', 'fix_type_bulk', 'bulk_normalize_subcategory']) {
      const res = await act({ intent, affectedIds: ['a1'], previousCategory: 'Travel', newType: 'income', matchValue: 'corner' });
      expect(res.res.statusCode, intent).toBe(410);
    }
    expect(txUpdateCalls).toBe(0);
  });
  it('single-transaction fix_type (ordinary manual editing in the drawer) still works', async () => {
    const res = await act({ intent: 'fix_type', transactionId: 'a1', newType: 'income' });
    expect(res.json).toMatchObject({ ok: true, intent: 'fix_type' });
  });
  it('interim bulk_apply: protected rows and unknown categories are skipped; the reported count is verified', async () => {
    const res = await act({ intent: 'bulk_apply', groups: [{ ids: ['a1', 'a3', 'b1'], category: 'Food & Dining' }, { ids: ['a4'], category: 'Pizza Night' }] });
    expect(res.json).toMatchObject({ ok: true, applied: 1, skippedProtected: 2 }); // the customer's Other + another customer's id
    expect(t('a1').category).toBe('Food & Dining');
    expect(t('a3')).toMatchObject({ category: 'Other', category_source: 'manual' });
    expect(t('b1').category).toBe('Uncategorized');
    expect(t('a4').category).toBe('Uncategorized');
  });
});

describe('clients use the confirmation system for bulk changes', () => {
  it('the Transactions page "Apply" proposes and confirms (no direct bulk_apply); the sweep only suggests', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const page = readFileSync(resolve(__dirname, '../../../src/pages/dashboard/TransactionsPageV2.tsx'), 'utf8');
    const fn = page.slice(page.indexOf('const applySweepFromChat = useCallback('), page.indexOf('const dismissSweep = useCallback('));
    expect(fn).toContain("intent: 'propose_import_suggestions'");
    expect(fn).toContain("intent: 'commit_proposal'");
    expect(fn).not.toContain("'bulk_apply'");
    expect(page).toContain("import toast from 'react-hot-toast';");
    const sweep = readFileSync(resolve(__dirname, '../tag-background-sweep.ts'), 'utf8');
    expect(sweep).toContain('computeImportSuggestions(');
    expect(sweep).not.toContain('categorized automatically');
    expect(sweep).not.toMatch(/\.(update|upsert|delete)\(/);
  });
});

describe('focused-transaction logic lives in a neutral shared module', () => {
  it('Tag\'s import path re-exports the same implementation', async () => {
    const neutral = await import('../_shared/focusedTransaction');
    const tagPath = await import('../_shared/tagFocusedTransaction');
    expect(tagPath.resolveFocusedTransaction).toBe(neutral.resolveFocusedTransaction);
  });
});
