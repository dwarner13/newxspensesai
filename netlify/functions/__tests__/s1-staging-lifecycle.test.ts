/**
 * S-1 staged-row lifecycle (owner GO 2026-11-26).
 *
 * After commit, an import's staging rows stay as read-only history (no deletion, no migration).
 * They must never be processed again: no edit, no re-open, no Tag write, no "pending" row or total.
 * Fail closed when import status cannot be read. Retry/recovery (commit idempotency, the
 * "staging exists" skip signals) is unchanged. Synthetic data only; all Supabase access is fake.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type DbCall = { table: string; op: string; filters: Array<[string, unknown]>; payload?: unknown };

const USER = '11111111-1111-4111-8111-111111111111';
const TOKEN = 'user-jwt';
const IMP_OPEN = 'a0a0a0a0-0000-4000-8000-000000000001';
const IMP_DONE = 'a0a0a0a0-0000-4000-8000-000000000002';
const STG_OPEN = 'c0c0c0c0-0000-4000-8000-000000000001';
const STG_DONE = 'c0c0c0c0-0000-4000-8000-000000000002';

let db: Record<string, Row[]> = {};
let dbCalls: DbCall[] = [];
let failImportsRead = false;

function seed() {
  db = {
    imports: [
      { id: IMP_OPEN, user_id: USER, status: 'parsed', statement_breakdown_json: { statementTotals: { totalDeducted: 10, totalAdded: 0 } } },
      { id: IMP_DONE, user_id: USER, status: 'committed', statement_breakdown_json: { statementTotals: { totalDeducted: 10, totalAdded: 0 } } },
    ],
    transactions_staging: [
      { id: STG_OPEN, user_id: USER, import_id: IMP_OPEN, tag_status: 'needs_review', tag_category: null, parsed_at: '2031-01-02', data_json: { description: 'Synthetic Cafe', merchant: 'Synthetic Cafe', amount: -10, date: '2031-01-02' } },
      { id: STG_DONE, user_id: USER, import_id: IMP_DONE, tag_status: 'needs_review', tag_category: null, parsed_at: '2031-01-01', data_json: { description: 'Synthetic Cafe', merchant: 'Synthetic Cafe', amount: -10, date: '2031-01-01' } },
    ],
    transactions: [
      { id: 'tx-done-1', user_id: USER, import_id: IMP_DONE, merchant_name: 'Synthetic Cafe', amount: -10, category: 'Dining', posted_at: '2031-01-01' },
    ],
    tag_category_feedback: [],
    vendor_category_memory: [],
  };
}

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | null = null;
  let range: [number, number] | null = null;
  const matches = () =>
    (db[table] || []).filter((r) =>
      filters.every(([k, v]) => {
        if (k.startsWith('in:')) return (v as unknown[]).includes(r[k.slice(3)]);
        if (k.startsWith('neq:')) return r[k.slice(4)] !== v;
        return r[k] === v;
      })
    );
  const run = () => {
    dbCalls.push({ table, op, filters: [...filters], payload });
    if (failImportsRead && table === 'imports' && op === 'select') return { data: null, error: { message: 'synthetic read failure' } };
    if (op === 'insert' || op === 'upsert') {
      const rows = (Array.isArray(payload) ? payload : [payload]).map((p, i) => ({ id: `${table}-${(db[table] || []).length + i + 1}`, ...p }));
      (db[table] ||= []).push(...rows);
      return { data: rows, error: null };
    }
    if (op === 'update') { const rows = matches(); rows.forEach((r) => Object.assign(r, payload)); return { data: rows, error: null }; }
    const rows = matches();
    return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
  const q: any = new Proxy({}, {
    get(_t, prop: string) {
      switch (prop) {
        case 'insert': return (p: Row) => { op = 'insert'; payload = p; return q; };
        case 'upsert': return (p: Row) => { op = 'upsert'; payload = p; return q; };
        case 'update': return (p: Row) => { op = 'update'; payload = p; return q; };
        case 'eq': return (k: string, v: unknown) => { filters.push([k, v]); return q; };
        case 'neq': return (k: string, v: unknown) => { filters.push([`neq:${k}`, v]); return q; };
        case 'in': return (k: string, v: unknown[]) => { filters.push([`in:${k}`, v]); return q; };
        case 'range': return (a: number, b: number) => { range = [a, b]; return q; };
        case 'single': return async () => { const r = run(); if (r.error) return r; const row = (r.data as Row[])[0]; return row ? { data: row, error: null } : { data: null, error: { message: 'no rows' } }; };
        case 'maybeSingle': return async () => { const r = run(); if (r.error) return r; return { data: (r.data as Row[])[0] ?? null, error: null }; };
        case 'then': return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej);
        default: return () => q; // select, order, limit, or, ilike, gte, lte, not, is …
      }
    },
  });
  return q;
}

const fakeClient = {
  auth: { getUser: async (t: string) => (t === TOKEN ? { data: { user: { id: USER } }, error: null } : { data: { user: null }, error: { message: 'invalid' } }) },
  from: (table: string) => query(table),
};
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient, serverSupabase: () => fakeClient }));
vi.mock('../../../src/lib/ai/userActivity', () => ({ logUserEvent: async () => undefined, recalcFluency: async () => undefined }));

const lifecycle = await import('../_shared/importLifecycle');
const txAmount = await import('../tx-update-amount');
const txCategory = await import('../tx-update-category');
const tagBatch = await import('../tag-categorize-batch');
const txSearch = await import('../tx-search');
const tagLearning = await import('../_shared/tag-learning');

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler shapes
async function invoke(h: any, body: Row) {
  const res = await h({ httpMethod: 'POST', headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }, {});
  let json: Row = {};
  try { json = JSON.parse(res.body || '{}'); } catch { json = {}; }
  return { statusCode: res.statusCode as number, json };
}
const writes = (table?: string) => dbCalls.filter((c) => c.op !== 'select' && (!table || c.table === table));
let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  seed();
  dbCalls = [];
  failImportsRead = false;
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => logSpies.forEach((s) => s.mockRestore()));

describe('importLifecycle', () => {
  it('reports committed imports for the user; fails closed on a read error', async () => {
    const r = await lifecycle.committedImportIds(fakeClient, USER, [IMP_OPEN, IMP_DONE, null, IMP_DONE]);
    expect(r).toEqual({ ok: true, committed: new Set([IMP_DONE]) });
    expect(await lifecycle.isImportCommitted(fakeClient, USER, IMP_OPEN)).toBe(false);
    expect(await lifecycle.isImportCommitted(fakeClient, USER, IMP_DONE)).toBe(true);
    failImportsRead = true;
    expect(await lifecycle.committedImportIds(fakeClient, USER, [IMP_OPEN])).toEqual({ ok: false });
    expect(await lifecycle.isImportCommitted(fakeClient, USER, IMP_OPEN)).toBeNull();
  });
});

describe('tx-update-amount: a committed import is never re-opened', () => {
  it('editing a committed import’s staging row → 409 import_committed; no staging or imports write', async () => {
    const r = await invoke(txAmount.handler, { id: STG_DONE, amount: -99 });
    expect(r.statusCode).toBe(409);
    expect(r.json.error).toBe('import_committed');
    expect(writes()).toHaveLength(0);
    expect(db.imports.find((i) => i.id === IMP_DONE)?.status).toBe('committed');
    expect(db.transactions_staging.find((s) => s.id === STG_DONE)?.data_json.amount).toBe(-10);
  });

  it('import status unreadable → 503, nothing written (fail closed)', async () => {
    failImportsRead = true;
    const r = await invoke(txAmount.handler, { id: STG_OPEN, amount: -12 });
    expect(r.statusCode).toBe(503);
    expect(writes()).toHaveLength(0);
  });

  it('an open (parsed) import can still be edited; every imports.status write excludes committed rows', async () => {
    const r = await invoke(txAmount.handler, { id: STG_OPEN, amount: -12 });
    expect(r.statusCode).toBe(200);
    for (const w of writes('imports').filter((c) => (c.payload as Row)?.status)) {
      expect(w.filters).toContainEqual(['neq:status', 'committed']);
    }
  });
});

describe('tx-update-category: committed staging copies are read-only', () => {
  it('table=transactions_staging on a committed import → 409; nothing written, no Tag learning', async () => {
    const r = await invoke(txCategory.handler, { id: STG_DONE, category: 'Coffee', table: 'transactions_staging' });
    expect(r.statusCode).toBe(409);
    expect(r.json.error).toBe('import_committed');
    expect(writes()).toHaveLength(0);
  });

  it('an open import’s staging row can still be categorized', async () => {
    const r = await invoke(txCategory.handler, { id: STG_OPEN, category: 'Coffee', table: 'transactions_staging', disableLearning: true });
    expect(r.statusCode).toBe(200);
    expect(db.transactions_staging.find((s) => s.id === STG_OPEN)?.data_json.category).toBe('Coffee');
  });
});

describe('Tag learning distinguishes pending from completed imports', () => {
  it('a correction updates only needs_review staging rows of OPEN imports', async () => {
    await tagLearning.learnFromCorrection(fakeClient as never, { userId: USER, transactionId: 'tx-done-1', merchant: 'Synthetic Cafe', oldCategory: 'Dining', newCategory: 'Coffee' });
    await new Promise((r) => setTimeout(r, 20)); // memory application is non-blocking
    expect(db.transactions_staging.find((s) => s.id === STG_OPEN)?.tag_category).toBe('Coffee');
    expect(db.transactions_staging.find((s) => s.id === STG_DONE)?.tag_category).toBeNull();
    expect(db.transactions_staging.find((s) => s.id === STG_DONE)?.tag_status).toBe('needs_review');
  });

  it('import status unreadable → no staging row is touched', async () => {
    failImportsRead = true;
    await tagLearning.learnFromCorrection(fakeClient as never, { userId: USER, transactionId: 'tx-done-1', merchant: 'Synthetic Cafe', oldCategory: 'Dining', newCategory: 'Coffee' });
    await new Promise((r) => setTimeout(r, 20));
    expect(writes('transactions_staging')).toHaveLength(0);
  });

  it('tag-categorize-batch on a committed import processes nothing; status unreadable → 503', async () => {
    const r = await invoke(tagBatch.handler, { importId: IMP_DONE });
    expect(r.statusCode).toBe(200);
    expect(r.json).toMatchObject({ ok: true, processed: 0, reason: 'import_committed' });
    expect(writes('transactions_staging')).toHaveLength(0);
    failImportsRead = true;
    const r2 = await invoke(tagBatch.handler, { importId: IMP_OPEN });
    expect(r2.statusCode).toBe(503);
    expect(writes('transactions_staging')).toHaveLength(0);
  });
});

describe('pending readers never show a committed import’s staging copies', () => {
  it('tx-search includePending returns only the open import’s staged row', async () => {
    const r = await invoke(txSearch.handler, { includePending: true, limit: 50 });
    const ids = (r.json.pendingRows || []).map((p: Row) => p.id);
    expect(ids).toContain(STG_OPEN);
    expect(ids).not.toContain(STG_DONE);
  });

  it('tx-search includePending with import status unreadable → no pending rows', async () => {
    failImportsRead = true;
    const r = await invoke(txSearch.handler, { includePending: true, limit: 50 });
    expect(r.json.pendingRows || []).toEqual([]);
  });

  it('usePendingTransactions helper treats a committed join as not pending', async () => {
    const { isCommittedImportJoin } = await import('../../../src/hooks/usePendingTransactions');
    expect(isCommittedImportJoin({ status: 'committed' })).toBe(true);
    expect(isCommittedImportJoin([{ status: 'committed' }])).toBe(true);
    expect(isCommittedImportJoin({ status: 'parsed' })).toBe(false);
    expect(isCommittedImportJoin(null)).toBe(false);
  });
});

describe('wiring (static)', () => {
  const root = path.resolve(__dirname, '../../..');
  const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

  it('chat.ts: includePending and the merchant fallback exclude committed imports’ staging rows', () => {
    const chat = read('netlify/functions/chat.ts');
    expect(chat).toMatch(/const stagedLifecycle = stagedRead\.error \? null : await committedImportIds\(/);
    expect(chat).toMatch(/!\(r\?\.import_id && stagedLifecycle\.committed\.has\(String\(r\.import_id\)\)\)/);
    expect(chat).toMatch(/if \(matched\.length === 0 && importCommittedForFallback === false\)/);
  });

  it('TransactionsPage approve re-checks import status and refuses committed imports (fail closed)', () => {
    const page = read('src/pages/dashboard/TransactionsPage.tsx');
    expect(page).toMatch(/\.from\('imports'\)\s*\n\s*\.select\('id, status'\)/);
    expect(page).toMatch(/if \(targets\.some\(\(t\) => t\.import_id && committedIds\.has\(t\.import_id\)\)\)/);
    expect(page).toMatch(/if \(importErr\) \{\s*\n\s*toast\.error\("Couldn't check whether this statement is already imported/);
  });

  it('UnifiedAssistantChat offers no staging clarifications for a committed import', () => {
    const uac = read('src/components/chat/UnifiedAssistantChat.tsx');
    expect(uac).toMatch(/if \(importErr \|\| !importRow \|\| importRow\.status === 'committed'\) return \[\];/);
  });

  it('retry/recovery signals are unchanged: commit idempotency and the staging-exists skips remain', () => {
    expect(read('netlify/functions/commit-import.ts')).toMatch(/importRecord\?\.status === 'committed'/);
    expect(read('netlify/functions/smart-import-sync.ts')).toMatch(/existingImport\.status === 'committed'/);
    expect(read('netlify/functions/normalize-transactions.ts')).toMatch(/latestStatus === 'parsed' \|\| latestStatus === 'committed'/);
  });

  it('no staging rows are deleted by any S-1 change', () => {
    for (const f of ['netlify/functions/_shared/importLifecycle.ts', 'netlify/functions/tx-update-amount.ts', 'netlify/functions/tx-update-category.ts', 'netlify/functions/tag-categorize-batch.ts', 'netlify/functions/_shared/tag-learning.ts', 'netlify/functions/tx-search.ts']) {
      expect(read(f)).not.toMatch(/from\('transactions_staging'\)[\s\S]{0,80}\.delete\(/);
    }
  });
});
