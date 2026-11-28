/**
 * AR-5 / owner safeguard 5 (FINAL A-2 APPROVAL, 2026-11-27) — owner: Tag HQ.
 * Tag category rules never silently rewrite historical transactions or override approved customer
 * corrections. (a) rules change existing rows only when the signed proposal names them (count,
 * confirmation, reversibility); (b) nothing overrides a customer-approved correction; (c) every
 * rule / automation path is classified and guarded. Synthetic data only.
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
    if (op === 'insert' && Array.isArray(payload)) {
      // Batch insert (history-first change records): one row per element; returns the inserted rows.
      if (table === 'tag_activity_log' && faults.activityLog) return { data: null, error: { message: 'log down' } };
      const inserted = (payload as unknown as Row[]).map(one => ({ id: `${table}-${rows().length + 1}`, ...one })).map(r => { rows().push(r); return r; });
      return { data: inserted, error: null };
    }
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
    // Evaluates the clauses the protection filters use (col.is.null, col.not.in.(…), col.in.(…), col.eq.x, and(…)).
    or: (f: string) => {
      const clauses: string[] = [];
      let depth = 0; let cur = '';
      for (const ch of f) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) { clauses.push(cur); cur = ''; } else cur += ch;
      }
      if (cur) clauses.push(cur);
      const test = (r: Row, c: string): boolean => {
        if (c.startsWith('and(')) {
          const inner = c.slice(4, -1); const parts: string[] = []; let d = 0; let k = '';
          for (const ch of inner) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { parts.push(k); k = ''; } else k += ch; }
          if (k) parts.push(k);
          return parts.every(x => test(r, x));
        }
        const [col, op2, ...rest] = c.split('.'); const v = rest.join('.');
        if (op2 === 'is') return (r[col] ?? null) === null;
        if (op2 === 'not') { const list = v.replace(/^in\.\(/, '').replace(/\)$/, '').split(','); return !list.includes(String(r[col] ?? '')); }
        if (op2 === 'in') { const list = v.replace(/^\(/, '').replace(/\)$/, '').split(','); return list.includes(String(r[col] ?? '')); }
        if (op2 === 'eq') return String(r[col] ?? '') === v;
        return true;
      };
      filters.push(r => clauses.some(c => test(r, c)));
      return b;
    },
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
vi.mock('../../_shared/verifyAuth.js', () => ({
  verifyAuth: async () => (authState.userId ? { userId: authState.userId, error: null } : { userId: null, error: 'unauthorized' }),
}));

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.CONVERSATION_SIGNING_SECRET = 'test-signing-secret-not-real-0123456789abcdef';

type Res = { statusCode: number; body: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function act(body: Record<string, unknown>): Promise<{ res: Res; json: any }> {
  const { handler } = await import('../../tag-action');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(body) }, {},
  );
  return { res, json: JSON.parse(res.body) };
}
const convo = (customerText: string, clientMessageId: string, extra: Record<string, unknown> = {}) => ({ conversation: { customerText, clientMessageId, ...extra } });


import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Synthetic data only.
const r = (id: string, category: string | null, source: string | null, extra: Row = {}) => ({
  id, user_id: ALICE, merchant_name: 'CORNER COFFEE', merchant: 'CORNER COFFEE', description: 'POS CORNER COFFEE', amount: -4.5,
  type: 'expense', date: '2026-10-02', posted_at: '2026-10-02', category, subcategory: null, category_source: source, import_id: 'imp-ar5', ...extra,
});
const t = (id: string) => db.transactions.find(x => x.id === id)!;
const history = () => (db.tag_activity_log ?? []).filter(x => String(x.change_source).endsWith('.row'));

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(faults, { txUpdate: false, assistantInsert: false, uniqueOnClaim: false, activityLog: false });
  txUpdateCalls = 0; authState.userId = ALICE;
  db.transactions = [
    r('ar5-gap', 'Uncategorized', null),                 // historical gap
    r('ar5-ai', 'Food & Dining', 'ai'),                   // historical, machine-set
    r('ar5-edit', 'Groceries', 'user_edit'),              // customer correction (verified)
    r('ar5-manual', 'Other', 'manual'),                   // customer "Other" (protected)
    r('ar5-bob', 'Uncategorized', null, { user_id: BOB }),
  ];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('Safeguard 5 (a) — a rule changes existing transactions only when the signed proposal names them', () => {
  it('a rule saved from a button affects FUTURE imports only: no existing transaction changes', async () => {
    const s = await act({ intent: 'save_rule', matchValue: 'corner coffee', targetCategory: 'Food & Dining' });
    expect(s.res.statusCode).toBe(200);
    expect(s.json).toMatchObject({ existingTransactionsChanged: 0 });
    expect(txUpdateCalls).toBe(0);
  });
  it('"apply to existing" states the exact count and the protected rows kept; only those rows change after "yes"; each change is recorded with its previous value', async () => {
    const p = await act({ intent: 'preview', matchValue: 'corner coffee', targetCategory: 'Shopping', ...convo('change all corner coffee to Shopping', 'msg_ar5_0001') });
    expect(p.json.conversation.receipt).toMatchObject({ state: 'proposed', result: { matchCount: 2 } });
    expect(p.json.conversation.reply).toMatch(/\*\*2\*\* of your \*\*existing\*\*/);
    expect(p.json.conversation.reply).toMatch(/2 transactions with a protected category .* will stay as they are/);
    expect(txUpdateCalls).toBe(0); // nothing changes before the confirmation
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0002', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'completed', count: 2 });
    expect([t('ar5-gap').category, t('ar5-ai').category]).toEqual(['Shopping', 'Shopping']);
    expect(t('ar5-edit')).toMatchObject({ category: 'Groceries', category_source: 'user_edit' });
    expect(t('ar5-manual')).toMatchObject({ category: 'Other', category_source: 'manual' });
    expect(t('ar5-bob').category).toBe('Uncategorized');
    // Reversibility: one record per changed transaction with its value before the change.
    expect(history().map(h => [h.transaction_id, h.previous_category, h.new_category]).sort())
      .toEqual([['ar5-ai', 'Food & Dining', 'Shopping'], ['ar5-gap', 'Uncategorized', 'Shopping']]);
    expect(history().every(h => /Before this change \(receipt msg_ar5_0001\); reversible/.test(String(h.change_note)))).toBe(true);
    // The records are enough to put every row back exactly.
    for (const h of history()) t(String(h.transaction_id)).category = h.previous_category;
    expect([t('ar5-gap').category, t('ar5-ai').category]).toEqual(['Uncategorized', 'Food & Dining']);
  });
});

describe('Safeguard 5 (b) — nothing overrides a customer-approved correction', () => {
  it('a category move from a customer button is the same signed proposal: count, protected kept, reversible', async () => {
    db.transactions.push(r('ar5-edit2', 'Food & Dining', 'user_edit'));
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move Food & Dining to Groceries', 'msg_ar5_0003') });
    expect(p.json.conversation.receipt).toMatchObject({ state: 'proposed', result: { matchCount: 1 } });
    expect(p.json.conversation.reply).toMatch(/Move \*\*1\*\* existing transaction from \*\*Food & Dining\*\* to \*\*Groceries\*\*\?/);
    expect(p.json.conversation.reply).toMatch(/1 transaction in Food & Dining with a protected category/);
    expect(txUpdateCalls).toBe(0);
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0004', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'completed', count: 1 });
    expect(t('ar5-ai').category).toBe('Groceries');
    expect(t('ar5-edit2')).toMatchObject({ category: 'Food & Dining', category_source: 'user_edit' });
    expect(history().map(h => [h.transaction_id, h.previous_category])).toEqual([['ar5-ai', 'Food & Dining']]);
  });
  it('a row the customer corrects AFTER the proposal is never overwritten (the confirmation is rejected as stale)', async () => {
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move Food & Dining to Groceries', 'msg_ar5_0005') });
    t('ar5-ai').category_source = 'user_edit'; // the customer fixes it in the drawer meanwhile
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0006', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.reason).toBe('stale');
    expect(t('ar5-ai')).toMatchObject({ category: 'Food & Dining', category_source: 'user_edit' });
    expect(txUpdateCalls).toBe(0);
  });
  it('the database write itself re-checks protection (a protected source is excluded by the update filter)', async () => {
    // Bypass the scope read: the signed subject is current, but the row turns protected between the
    // scope check and the write. The update's own source filter keeps it.
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move', 'msg_ar5_0007') });
    const realFrom = fakeClient.from;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fakeClient as any).from = (tb: string) => {
      const b = realFrom(tb);
      if (tb === 'transactions') { const up = b.update; b.update = (pl: Row) => { t('ar5-ai').category_source = 'manual'; return up(pl); }; }
      return b;
    };
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0008', { sessionId: p.json.conversation.sessionId }) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fakeClient as any).from = realFrom;
    expect(t('ar5-ai')).toMatchObject({ category: 'Food & Dining', category_source: 'manual' });
    expect(c.json.conversation.receipt.count ?? 0).toBe(0);
    expect(history()).toHaveLength(0); // nothing changed, nothing recorded
  });
});

describe('Part 2 §9 — no change ships without its record (history first, fail closed)', () => {
  const voided = () => (db.tag_activity_log ?? []).filter(x => String(x.change_source).endsWith('.void'));
  it('history write fails → NOTHING changes and the customer is told so', async () => {
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move', 'msg_ar5_0101') });
    faults.activityLog = true;
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0102', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'history_not_saved' });
    expect(c.json.conversation.reply).toBe("I couldn't save the record of this change, so I didn't change anything. Please try again.");
    expect(t('ar5-ai').category).toBe('Food & Dining');
    expect(txUpdateCalls).toBe(0);
  });
  it('the update fails after the record was written → the record is voided, nothing changed', async () => {
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move', 'msg_ar5_0103') });
    faults.txUpdate = true;
    const c = await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0104', { sessionId: p.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt.state).toBe('failed');
    expect(t('ar5-ai').category).toBe('Food & Dining');
    expect(history()).toHaveLength(0);
    expect(voided().map(v => [v.transaction_id, v.change_source])).toEqual([['ar5-ai', 'bulk_move_category.row.void']]);
  });
  it('a row the write filter skipped (protected meanwhile) has its record voided — history never claims an unapplied change', async () => {
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move', 'msg_ar5_0105') });
    const realFrom = fakeClient.from;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fakeClient as any).from = (tb: string) => {
      const b = realFrom(tb);
      if (tb === 'transactions') { const up = b.update; b.update = (pl: Row) => { t('ar5-ai').category_source = 'manual'; return up(pl); }; }
      return b;
    };
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0106', { sessionId: p.json.conversation.sessionId }) });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fakeClient as any).from = realFrom;
    expect(t('ar5-ai')).toMatchObject({ category: 'Food & Dining', category_source: 'manual' });
    expect(history()).toHaveLength(0);
    expect(voided()).toHaveLength(1);
  });
  it('a successful change keeps exactly one live record per changed row', async () => {
    const p = await act({ intent: 'propose_bulk_move', fromCategory: 'Food & Dining', toCategory: 'Groceries', ...convo('move', 'msg_ar5_0107') });
    await act({ intent: 'commit_proposal', action: p.json.proposal.action, subject: p.json.proposal.subject, ...convo('yes', 'msg_ar5_0108', { sessionId: p.json.conversation.sessionId }) });
    expect(history().map(h => h.transaction_id)).toEqual(['ar5-ai']);
    expect(voided()).toHaveLength(0);
  });
  it('a single-transaction confirmation is fail-closed too', async () => {
    db.transactions.push(r('eeeeeeee-0000-4000-8000-0000000000a5', 'Uncategorized', null));
    const pre = await act({ intent: 'preview_single', transactionId: 'eeeeeeee-0000-4000-8000-0000000000a5', targetPhrase: 'groceries', ...convo('make this groceries', 'msg_ar5_0109') });
    expect(pre.json.conversation.receipt.state).toBe('proposed');
    faults.activityLog = true;
    const c = await act({ intent: 'commit_single', transactionId: 'eeeeeeee-0000-4000-8000-0000000000a5', targetCategory: 'Groceries', targetSubcategory: null, ...convo('yes', 'msg_ar5_0110', { sessionId: pre.json.conversation.sessionId }) });
    expect(c.json.conversation.receipt).toMatchObject({ state: 'failed', reason: 'history_not_saved' });
    expect(c.json.conversation.reply).toBe("I couldn't save the record of this change, so I didn't change anything. Please try again.");
    expect(t('eeeeeeee-0000-4000-8000-0000000000a5').category).toBe('Uncategorized');
  });
});

describe('Safeguard 5 (c) — every rule / automation path is classified and guarded (static AR)', () => {
  const ROOT = resolve(__dirname, '../../../..');
  const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  /** Every server file that updates the transactions table, and how it is allowed to. */
  const WRITERS: Record<string, { kind: 'proposal_commit' | 'automatic_guarded' | 'customer_direct' | 'not_category' | 'retired'; must: RegExp[] }> = {
    'netlify/functions/_shared/tagProposals.ts': { kind: 'proposal_commit', must: [/q = q\.or\(AUTO_UPDATE_SOURCE_FILTER\)/, /reason: 'stale'/] },
    'netlify/functions/tag-action.ts': { kind: 'proposal_commit', must: [/isAutoWritable/, /\.or\(AUTO_UPDATE_SOURCE_FILTER\)/, /proposalMatches/] },
    'netlify/functions/apply-category-rules.ts': { kind: 'automatic_guarded', must: [/AUTO_UPDATE_SOURCE_FILTER|IMPORT_UPDATE_CATEGORY_FILTER/] },
    'netlify/functions/tag-categorize-committed.ts': { kind: 'automatic_guarded', must: [/AUTO_UPDATE_SOURCE_FILTER/, /partitionAutoWritable|isAutoWritable/] },
    'netlify/functions/tag-reclassify-other.ts': { kind: 'automatic_guarded', must: [/AUTO_UPDATE_SOURCE_FILTER|isAutoWritable|partitionAutoWritable/] },
    'netlify/functions/tag-merchant-sweep.ts': { kind: 'automatic_guarded', must: [/merchant_name/] },
    'netlify/functions/tx-update-category.ts': { kind: 'customer_direct', must: [/CUSTOMER_EDIT_SOURCE/, /ai_origin_refused/] },
    'netlify/functions/tx-split.ts': { kind: 'customer_direct', must: [/user_id/] },
    'netlify/functions/_shared/receiptMatching.ts': { kind: 'not_category', must: [] },
    'netlify/functions/_shared/transactions_store.ts': { kind: 'not_category', must: [] },
    'netlify/functions/update-vendor-category.ts': { kind: 'retired', must: [/UPDATE_VENDOR_CATEGORY_RETIRED = true/, /statusCode: 410/] },
  };
  const writersNow = (() => {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) { if (!['__tests__', 'node_modules'].includes(e.name)) walk(rel); continue; }
        if (!/\.ts$/.test(e.name)) continue;
        const s = strip(read(rel));
        const re = /\.from\(\s*['"`]transactions['"`]\s*\)/g; let m: RegExpExecArray | null;
        while ((m = re.exec(s))) { const end = s.indexOf(';', m.index); if (/\.(update|upsert)\(/.test(s.slice(m.index, end < 0 ? undefined : end))) { out.push(rel); break; } }
      }
    };
    walk('netlify/functions');
    return out.sort();
  })();
  it('the classification covers exactly the server files that update transactions (a new writer fails here)', () => {
    expect(writersNow).toEqual(Object.keys(WRITERS).sort());
  });
  it.each(Object.entries(WRITERS))('%s carries its guard', (file, w) => {
    const s = strip(read(file));
    for (const rx of w.must) expect(s, `${file} (${w.kind})`).toMatch(rx);
  });
  it('no scheduled (cron) function exists that could re-apply rules unattended', () => {
    expect(read('netlify.toml')).not.toMatch(/schedule\s*=/);
  });
  it('the legacy income→expense pass stays deleted; the live Tag pages never write transactions from the browser', () => {
    expect(strip(read('netlify/functions/tag-categorize-committed.ts'))).not.toMatch(/KNOWN_EXPENSE_MERCHANTS|amount:\s*Math\.abs/);
    for (const page of ['src/pages/dashboard/SmartCategoriesPage.tsx', 'src/pages/dashboard/TransactionsPageV2.tsx']) {
      const s = strip(read(page));
      expect(s, page).not.toMatch(/\.from\(\s*['"`]transactions['"`]\s*\)\s*\.update\(/);
    }
  });
  it('per-row change history is never counted as separate completed actions (tag_status)', () => {
    expect(read('src/agent/tools/impl/tag_status.ts')).toMatch(/\.filter\(t => !\/\(\\\.row\|\\\.void\)\$\/\.test\(t\)\)/);
  });
  it('the automatic writers are covered by behavioural protection tests (C4)', () => {
    const c4 = read('netlify/functions/__tests__/c4-customer-correction-protection.test.ts');
    for (const name of ['tag-categorize-committed', 'tag-reclassify-other', 'tag-merchant-sweep', 'apply-category-rules']) expect(c4, name).toContain(name);
  });
});
