/**
 * Owner GO 2026-11-25 "Tag customer correction protection" (C4 Batch 1, code-only).
 * The four automatic writers — daily auto-categorizer (tag-categorize-committed), Reclassify Other
 * (tag-reclassify-other), post-import merchant sweep (tag-merchant-sweep) and post-upload rule
 * application (apply-category-rules) — never overwrite customer-confirmed, possibly-approved or
 * unknown-provenance classifications (approved "Other" included), never invent / silently "Other" an
 * unknown category (A4), and never rewrite imported merchant text. Synthetic data only.
 *
 * The in-memory fake evaluates PostgREST filters (incl. `or(...)` with nested `and(...)`), so the
 * protection re-checked INSIDE each update is exercised — including a customer edit that lands
 * between the select and the update.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isAutoWritable, isImportWritable, isProtectedSource,
  AUTO_UPDATE_CATEGORY_FILTER, AUTO_UPDATE_SOURCE_FILTER, IMPORT_UPDATE_CATEGORY_FILTER,
} from '../_shared/categorySource';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
const hooks: { afterSelect: null | (() => void) } = { afterSelect: null };
let txUpdates = 0;

/** Minimal PostgREST filter-expression evaluator for or(...) strings. */
function splitTop(expr: string): string[] {
  const out: string[] = []; let depth = 0; let cur = '';
  for (const ch of expr) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function evalCond(row: Row, cond: string): boolean {
  if (cond.startsWith('and(')) return splitTop(cond.slice(4, -1)).every(c => evalCond(row, c));
  if (cond.startsWith('or(')) return splitTop(cond.slice(3, -1)).some(c => evalCond(row, c));
  const [col, ...rest] = cond.split('.');
  const v = row[col] ?? null;
  const op = rest[0];
  if (op === 'is') return v === null;
  if (op === 'eq') return String(v ?? '') === rest.slice(1).join('.') && v !== null;
  if (op === 'in') return rest.slice(1).join('.').replace(/^\(|\)$/g, '').split(',').includes(String(v));
  if (op === 'not' && rest[1] === 'in') return v !== null && !rest.slice(2).join('.').replace(/^\(|\)$/g, '').split(',').includes(String(v));
  throw new Error('unsupported filter ' + cond);
}
const evalOr = (row: Row, expr: string) => splitTop(expr).some(c => evalCond(row, c));

function builder(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let op: 'select' | 'update' | 'insert' | 'upsert' = 'select';
  let payload: Row | null = null;
  let head = false; let lim = Infinity;
  const rows = () => (db[table] ||= []);
  const run = () => {
    const m = rows().filter(r => filters.every(f => f(r)));
    if (op === 'update') {
      if (table === 'transactions') txUpdates++;
      m.forEach(r => Object.assign(r, payload));
      return { data: m.map(r => ({ id: r.id })), error: null, count: m.length };
    }
    if (op === 'insert' || op === 'upsert') { rows().push({ ...payload }); return { data: null, error: null }; }
    const out = { data: head ? null : m.slice(0, lim).map(r => ({ ...r })), error: null, count: m.length };
    if (table === 'transactions' && hooks.afterSelect) { const h = hooks.afterSelect; hooks.afterSelect = null; h(); }
    return out;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (_c?: string, o?: any) => { if (o?.head) head = true; return b; },
    eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return b; },
    neq: (c: string, v: unknown) => { filters.push(r => r[c] !== v); return b; },
    gte: (c: string, v: string) => { filters.push(r => r[c] != null && r[c] >= v); return b; },
    lte: (c: string, v: string) => { filters.push(r => r[c] != null && r[c] <= v); return b; },
    in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(r[c])); return b; },
    is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return b; },
    ilike: (c: string, p: string) => { const re = new RegExp('^' + p.split('%').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i'); filters.push(r => re.test(String(r[c] ?? ''))); return b; },
    or: (expr: string) => { filters.push(r => evalOr(r, expr)); return b; },
    not: (c: string, o: string, v: unknown) => {
      if (o === 'in') { const vals = String(v).replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/"/g, '')); filters.push(r => !vals.includes(String(r[c]))); }
      else if (o === 'eq') filters.push(r => r[c] !== v);
      else if (o === 'is') filters.push(r => (r[c] ?? null) !== v);
      return b;
    },
    order: () => b,
    limit: (n: number) => { lim = n; return b; },
    range: () => b,
    update: (p: Row) => { op = 'update'; payload = p; return b; },
    insert: (p: Row) => { op = 'insert'; payload = p; return b; },
    upsert: (p: Row) => { op = 'upsert'; payload = p; return b; },
    maybeSingle: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    single: async () => { const r = run(); return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }; },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
const fakeClient = { from: (t: string) => builder(t), rpc: async () => ({ data: null, error: null }) };
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeClient }));
vi.mock('../_shared/supabase.js', () => ({ serverSupabase: () => fakeClient }));
const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
vi.mock('../_shared/verifyAuth.js', () => ({ verifyAuth: async () => ({ userId: ALICE, error: null }) }));
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

type Res = { statusCode: number; body: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call(fn: string, body: Record<string, unknown> = {}, query: Record<string, string> = {}): Promise<any> {
  const mod = await import(`../${fn}`);
  const res = await (mod.handler as (e: unknown, c: unknown) => Promise<Res>)(
    { httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body), queryStringParameters: query }, {},
  );
  return JSON.parse(res.body);
}

const recent = new Date(Date.now() - 5 * 86400000).toISOString();
const old = new Date(Date.now() - 400 * 86400000).toISOString();
const tx = (id: string, category: string | null, source: string | null, merchant: string, extra: Row = {}): Row => ({
  id, user_id: ALICE, category, category_source: source, merchant_name: merchant, merchant, description: `POS ${merchant}`,
  amount: -12.5, type: 'expense', posted_at: recent, date: recent.slice(0, 10), import_id: 'imp-new', subcategory: null, ...extra,
});
const get = (id: string) => db.transactions.find(r => r.id === id)!;
const PROTECTED_IDS = ['p-manual-other', 'p-null-other', 'p-null-real', 'p-user-edit', 'p-tag-rule', 'p-user-gap'];
const snapshotProtected = () => JSON.stringify(PROTECTED_IDS.map(id => { const r = get(id); return [r.category, r.category_source, r.merchant_name]; }));

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  txUpdates = 0; hooks.afterSelect = null;
  db.transactions = [
    tx('w-gap', 'Uncategorized', null, 'NETFLIX.COM'),
    tx('w-ai-other', 'Other', 'ai', 'NETFLIX.COM'),
    tx('w-review', 'Needs Review', 'needs_review', 'NETFLIX.COM'),
    tx('p-manual-other', 'Other', 'manual', 'NETFLIX.COM'),        // customer-approved Other
    tx('p-null-other', 'Other', null, 'NETFLIX.COM'),               // ambiguous provenance
    tx('p-null-real', 'Groceries', null, 'NETFLIX.COM'),            // old drawer edit (no source)
    tx('p-user-edit', 'Shopping', 'user_edit', 'NETFLIX.COM'),
    tx('p-tag-rule', 'Food & Dining', 'tag_rule', 'NETFLIX.COM'),
    tx('p-user-gap', 'Needs Review', 'user_edit', 'NETFLIX.COM'),   // customer deliberately chose Needs Review
    { ...tx('bob-gap', 'Uncategorized', null, 'NETFLIX.COM'), user_id: BOB },
  ];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('the protection rule (pure) and its database form agree on every row', () => {
  it('only gaps and machine-assigned "Other" are writable; everything else is protected', () => {
    const writable = db.transactions.filter(r => r.user_id === ALICE && isAutoWritable(r)).map(r => r.id);
    expect(writable).toEqual(['w-gap', 'w-ai-other', 'w-review']);
    expect(isProtectedSource('tag_chat')).toBe(true);
    expect(isAutoWritable({ category: 'Other', category_source: 'learned' })).toBe(false); // may be the customer's own choice
  });
  it('the update-time filters accept exactly the same rows (customer edits after the select are never overwritten)', () => {
    for (const r of db.transactions) {
      const dbSays = evalOr(r, AUTO_UPDATE_CATEGORY_FILTER) && evalOr(r, AUTO_UPDATE_SOURCE_FILTER);
      expect(dbSays, r.id).toBe(isAutoWritable(r));
    }
  });
  it('import-scoped processing may also replace a category the import pipeline itself assigned — never a protected one', () => {
    expect(isImportWritable({ category: 'Shopping', category_source: 'ai' })).toBe(true);
    expect(isImportWritable({ category: 'Shopping', category_source: 'user_edit' })).toBe(false);
    expect(isImportWritable({ category: 'Shopping', category_source: null })).toBe(false);
    for (const r of [...db.transactions, tx('x', 'Shopping', 'ai', 'X')]) {
      const dbSays = evalOr(r, IMPORT_UPDATE_CATEGORY_FILTER) && evalOr(r, AUTO_UPDATE_SOURCE_FILTER);
      expect(dbSays, r.id).toBe(isImportWritable(r));
    }
  });
});

describe('daily auto-categorizer (tag-categorize-committed)', () => {
  it('fills gaps, never touches protected rows, reports them, and counts only verified updates', async () => {
    const before = snapshotProtected();
    const out = await call('tag-categorize-committed');
    expect(snapshotProtected()).toBe(before);
    expect(get('bob-gap').category).toBe('Uncategorized');
    expect(get('w-gap').category).not.toBe('Uncategorized');
    expect(out.skippedProtected).toBe(2); // the approved and the unknown-provenance "Other" it selected
  });
  it('A4: an unknown memory category is unresolved (Needs Review), never a silent "Other"', async () => {
    db.vendor_category_memory = [{ user_id: ALICE, vendor_key: 'zz unknown shop', category: 'Pizza' }];
    db.transactions.push(tx('w-unknown', 'Uncategorized', null, 'ZZ UNKNOWN SHOP'));
    await call('tag-categorize-committed');
    expect(get('w-unknown').category).toBe('Needs Review');
  });
  it('a customer edit that lands after the select is never overwritten', async () => {
    hooks.afterSelect = () => { Object.assign(get('w-gap'), { category: 'Travel', category_source: 'user_edit' }); };
    await call('tag-categorize-committed');
    expect(get('w-gap')).toMatchObject({ category: 'Travel', category_source: 'user_edit' });
  });
});

describe('Reclassify Other (tag-reclassify-other)', () => {
  it('protected rows untouched; map matches labelled merchant_map (never tag_rule); verified counts', async () => {
    const before = snapshotProtected();
    const out = await call('tag-reclassify-other');
    expect(snapshotProtected()).toBe(before);
    expect(out.skipped_protected).toBe(3); // approved Other, unknown-provenance Other, customer-chosen Needs Review
    for (const id of ['w-gap', 'w-ai-other', 'w-review']) {
      const r = get(id);
      expect(r.category_source).not.toBe('tag_rule');
    }
    expect(get('bob-gap').category).toBe('Uncategorized');
  });
});

describe('post-import merchant sweep (tag-merchant-sweep)', () => {
  it('only a truly missing merchant_name on an unprotected gap row is flagged', async () => {
    db.transactions.push(
      tx('s-gap', 'Uncategorized', null, ''),
      tx('s-protected', 'Groceries', 'user_edit', ''),
      { ...tx('s-legacy-only', 'Uncategorized', null, 'REAL NAME'), merchant: '' },
    );
    const out = await call('tag-merchant-sweep');
    expect(get('s-gap')).toMatchObject({ category: 'Needs Review', subcategory: 'Unknown Merchant - Verify' });
    expect(get('s-protected')).toMatchObject({ category: 'Groceries', category_source: 'user_edit' });
    expect(get('s-legacy-only').category).toBe('Uncategorized');
    expect(out.queued).toBe(1);
  });
});

describe('post-upload rule application (apply-category-rules)', () => {
  beforeEach(() => {
    db.category_rules = [{ user_id: ALICE, match_type: 'contains', match_value: 'netflix', merchant_pattern: 'NETFLIX', category: 'Subscriptions', is_active: true }];
  });
  it('import-scoped: the customer\'s rule applies to the new import (incl. pipeline-assigned rows); protected rows and merchant text untouched', async () => {
    db.transactions.push(tx('i-ai', 'Shopping', 'ai', 'NETFLIX.COM 866-579'));
    const before = snapshotProtected();
    const out = await call('apply-category-rules', { import_id: 'imp-new' });
    expect(snapshotProtected()).toBe(before);
    expect(get('i-ai')).toMatchObject({ category: 'Subscriptions', merchant_name: 'NETFLIX.COM 866-579' });
    expect(get('w-gap').category).toBe('Subscriptions');
    expect(out.skippedProtected).toBe(PROTECTED_IDS.length);
  });
  it('unscoped: gaps only, last 90 days — no silent historical recategorization', async () => {
    db.transactions.push(tx('h-old-gap', 'Uncategorized', null, 'NETFLIX.COM', { posted_at: old }));
    db.transactions.push(tx('h-recent-ai', 'Shopping', 'ai', 'NETFLIX.COM'));
    await call('apply-category-rules', {});
    expect(get('w-gap').category).toBe('Subscriptions');
    expect(get('h-old-gap').category).toBe('Uncategorized');
    expect(get('h-recent-ai').category).toBe('Shopping'); // a real category is never re-processed outside an import
  });
  it('A4: a rule with an unknown category never writes an invented category or "Other"', async () => {
    db.category_rules = [{ user_id: ALICE, match_type: 'contains', match_value: 'netflix', merchant_pattern: 'NETFLIX', category: 'pizza time', is_active: true }];
    await call('apply-category-rules', { import_id: 'imp-new' });
    expect(get('w-gap').category).not.toMatch(/pizza/i);
    expect(get('w-gap').category).not.toBe('Other');
  });
  it('approved reusable rules stay customer-specific: another customer\'s rows are never touched', async () => {
    await call('apply-category-rules', { import_id: 'imp-new' });
    expect(get('bob-gap').category).toBe('Uncategorized');
  });
});
