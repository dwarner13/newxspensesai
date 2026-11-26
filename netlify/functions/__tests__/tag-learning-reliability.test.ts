/**
 * Owner GO "Tag reliability" 2026-11-26 — the two learning flaws and the learning-path requirements.
 * Synthetic data only; in-memory database fake (no network, no database).
 *
 *  Flaw 1  retroactive staging apply skipped rows (OFFSET paging over a shrinking filter; silent 10-page cap)
 *  Flaw 2  check-then-write: status read once, rows updated one by one without the conditions or error checks
 *  Req     never claim learning on a failed save; customer decisions preserved; automatic rules never
 *          override approvals; unknown AI categories require review; customer "Other" respected.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
const hooks: { beforeUpdate?: (table: string) => void; failImports?: boolean; failUpdate?: boolean } = {};
let updateStatements = 0;

function builder(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let op: 'select' | 'update' | 'insert' | 'upsert' = 'select';
  let payload: Row | null = null;
  let orderCol: string | null = null; let orderAsc = true; let lim: number | null = null; let rng: [number, number] | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {
    select: () => b,
    eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return b; },
    gt: (c: string, v: unknown) => { filters.push(r => String(r[c]) > String(v)); return b; },
    in: (c: string, vs: unknown[]) => { filters.push(r => vs.includes(r[c])); return b; },
    is: (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return b; },
    ilike: (c: string, pat: string) => { const q = pat.replace(/%/g, '').toLowerCase(); filters.push(r => String(r[c] ?? '').toLowerCase().includes(q)); return b; },
    order: (c: string, o?: { ascending?: boolean }) => { if (!orderCol) { orderCol = c; orderAsc = o?.ascending !== false; } return b; },
    limit: (n: number) => { lim = n; return b; },
    range: (f: number, t: number) => { rng = [f, t]; return b; },
    update: (p: Row) => { op = 'update'; payload = p; return b; },
    insert: (p: Row) => { op = 'insert'; payload = p; return b; },
    upsert: (p: Row) => { op = 'upsert'; payload = p; return b; },
    single: () => b, maybeSingle: () => b,
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve().then(() => run()).then(res, rej),
  };
  function run() {
    if (table === 'imports' && hooks.failImports) return { data: null, error: { message: 'imports down' } };
    const rows = (db[table] ||= []);
    if (op === 'insert' || op === 'upsert') { const row = { id: `${table}-${rows.length + 1}`, ...payload }; rows.push(row); return { data: row, error: null }; }
    let m = rows.filter(r => filters.every(f => f(r)));
    if (op === 'update') {
      hooks.beforeUpdate?.(table);
      if (table === 'transactions_staging') updateStatements++;
      if (hooks.failUpdate) return { data: null, error: { message: 'update failed' } };
      m = rows.filter(r => filters.every(f => f(r)));
      for (const r of m) Object.assign(r, payload);
      return { data: m.map(r => ({ id: r.id })), error: null };
    }
    if (orderCol) { const c = orderCol; m = [...m].sort((a, z) => (String(a[c]) < String(z[c]) ? -1 : String(a[c]) > String(z[c]) ? 1 : 0) * (orderAsc ? 1 : -1)); }
    if (rng) m = m.slice(rng[0], rng[1] + 1);
    if (lim !== null) m = m.slice(0, lim);
    return { data: m, error: null };
  }
  return b;
}
const fake = { from: (t: string) => builder(t) };
vi.mock('../_shared/supabase.js', () => ({ serverSupabase: () => fake, admin: () => fake }));
vi.mock('../_shared/supabase', () => ({ serverSupabase: () => fake, admin: () => fake }));
vi.mock('../_shared/upload', () => ({ admin: () => fake }));
const aiReply = { text: '' as string };
vi.mock('openai', () => ({
  OpenAI: class { chat = { completions: { create: async () => ({ choices: [{ message: { content: aiReply.text } }] }) } }; },
  default: class { chat = { completions: { create: async () => ({ choices: [{ message: { content: aiReply.text } }] }) } }; },
}));

import { applyMemoryToNeedsReviewStaging, getLearnedCategoryForTransaction, learnFromCorrection } from '../_shared/tag-learning';
import { categorizeTransaction, categorizeTransactionWithLearning } from '../_shared/categorize';
import { isKnownCategory } from '../tag-categorize-batch';

const U = 'u-learn';
const staged = (i: number, vendor: string, extra: Row = {}): Row => ({
  id: `s${String(i).padStart(6, '0')}`, user_id: U, import_id: 'imp-open', tag_status: 'needs_review', tag_category: null,
  data_json: { description: vendor, amount: -9.5 }, ...extra,
});

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  for (const k of Object.keys(hooks)) delete (hooks as Record<string, unknown>)[k];
  updateStatements = 0; aiReply.text = '';
  db.imports = [{ id: 'imp-open', user_id: U, status: 'parsed' }, { id: 'imp-done', user_id: U, status: 'committed' }];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});

describe('Flaw 1 — the retroactive apply reads every waiting row (no skipped rows, no silent cap)', () => {
  it('6,000 waiting rows, every other one for this merchant: all 3,000 are updated (old code: ~1,250)', async () => {
    db.transactions_staging = Array.from({ length: 6000 }, (_, i) => staged(i, i % 2 === 0 ? 'CORNER COFFEE' : 'GRAINS BAKERY'));
    const o = await applyMemoryToNeedsReviewStaging(fake as never, U, 'corner coffee', 'Food & Dining');
    expect(o).toEqual({ applied: 3000, complete: true });
    expect(db.transactions_staging.filter(r => r.tag_status === 'needs_review' && String((r.data_json as Row).description) === 'CORNER COFFEE')).toHaveLength(0);
    expect(db.transactions_staging.filter(r => String((r.data_json as Row).description) === 'GRAINS BAKERY').every(r => r.tag_status === 'needs_review')).toBe(true);
    // One guarded statement per page, not one per row.
    expect(updateStatements).toBeLessThanOrEqual(12);
  });
});

describe('Flaw 2 — the write carries its own conditions and is checked', () => {
  it('a row the customer decided between the read and the write is not overwritten', async () => {
    db.transactions_staging = [staged(1, 'CORNER COFFEE'), staged(2, 'CORNER COFFEE')];
    hooks.beforeUpdate = () => { db.transactions_staging[0].tag_status = 'approved'; db.transactions_staging[0].tag_category = 'Groceries'; };
    const o = await applyMemoryToNeedsReviewStaging(fake as never, U, 'corner coffee', 'Food & Dining');
    expect(o.applied).toBe(1);
    expect(db.transactions_staging[0]).toMatchObject({ tag_status: 'approved', tag_category: 'Groceries' });
  });
  it("a committed import's rows are never written; unreadable status writes nothing", async () => {
    db.transactions_staging = [staged(1, 'CORNER COFFEE', { import_id: 'imp-done' }), staged(2, 'CORNER COFFEE')];
    expect((await applyMemoryToNeedsReviewStaging(fake as never, U, 'corner coffee', 'Food & Dining')).applied).toBe(1);
    expect(db.transactions_staging[0].tag_status).toBe('needs_review');
    db.transactions_staging[1].tag_status = 'needs_review';
    hooks.failImports = true;
    expect(await applyMemoryToNeedsReviewStaging(fake as never, U, 'corner coffee', 'Food & Dining')).toEqual({ applied: 0, complete: false });
    expect(updateStatements).toBe(1);
  });
  it('a failed write is reported (complete:false), never thrown away silently', async () => {
    db.transactions_staging = [staged(1, 'CORNER COFFEE')];
    hooks.failUpdate = true;
    expect(await applyMemoryToNeedsReviewStaging(fake as never, U, 'corner coffee', 'Food & Dining')).toEqual({ applied: 0, complete: false });
  });
});

describe('Requirement — never report learning when saving fails', () => {
  it('memory save failure → memory:"failed"; staging is not touched', async () => {
    db.transactions_staging = [staged(1, 'CORNER COFFEE')];
    const orig = fake.from;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fake as any).from = (t: string) => { const b = orig(t); if (t === 'vendor_category_memory') b.upsert = () => ({ then: (r: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'down' } }).then(r) }); return b; };
    const o = await learnFromCorrection(fake as never, { userId: U, transactionId: 't1', merchant: 'CORNER COFFEE', oldCategory: 'Uncategorized', newCategory: 'Food & Dining' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fake as any).from = orig;
    expect(o.memory).toBe('failed');
    await new Promise(r => setTimeout(r, 0));
    expect(db.transactions_staging[0].tag_status).toBe('needs_review');
  });
});

describe('Requirement — unknown categories are never applied automatically; they require review', () => {
  it('the retroactive apply skips an unrecognised category (rows stay in review)', async () => {
    db.transactions_staging = [staged(1, 'CORNER COFFEE')];
    expect(await applyMemoryToNeedsReviewStaging(fake as never, U, 'corner coffee', 'Coffee Habit')).toEqual({ applied: 0, complete: true, skipped: 'unknown_category' });
    expect(db.transactions_staging[0].tag_status).toBe('needs_review');
  });
  it('import categorizer: an invented AI category becomes Needs Review, never the raw text', async () => {
    aiReply.text = 'Coffee Habit';
    expect(await categorizeTransaction('POS LATTE BAR', 'LATTE BAR', -12.5, U)).toMatchObject({ category: 'Needs Review', source: 'ai', confidence: 0 });
    aiReply.text = 'Food & Dining';
    expect(await categorizeTransaction('POS LATTE BAR', 'LATTE BAR', -12.5, U)).toMatchObject({ category: 'Food & Dining', source: 'ai' });
  });
  it('import categorizer: no answer leaves the row Uncategorized (source none) — never a silent "Other"', async () => {
    // Under $10 the AI is not called and no rule matches.
    expect(await categorizeTransactionWithLearning({ userId: U, merchant: 'ZQX 4471', description: 'ZQX 4471', amount: 4 })).toEqual({ category: 'Uncategorized', confidence: 0, source: 'none' });
  });
  it('batch categorizer: only canonical names / aliases are "known"; memory and rules with unknown ones force review', () => {
    expect(isKnownCategory('Food & Dining')).toBe(true);
    expect(isKnownCategory('Groceries::Supermarket')).toBe(true);
    expect(isKnownCategory('Coffee Habit')).toBe(false);
    expect(isKnownCategory('')).toBe(false);
    const src = readFileSync(resolve(__dirname, '../tag-categorize-batch.ts'), 'utf8');
    expect(src).toMatch(/const known = isKnownCategory\(memory\.category\)[\s\S]{0,600}forceNeedsReview: true/);
    expect(src).toMatch(/const known = isKnownCategory\(rule\.category\)[\s\S]{0,600}forceNeedsReview: true/);
  });
});

describe('Requirement — learned categories come only from the customer’s corrections for this exact merchant', () => {
  const fb = (merchant: string, cat: string, n: number) => Array.from({ length: n }, (_, i) => ({ id: `${merchant}-${cat}-${i}`, user_id: U, merchant, new_category: cat, created_at: `2026-10-${10 + i}` }));
  it('corrections for a similar-named merchant are never applied to this one', async () => {
    db.tag_category_feedback = fb('SOBEYS LIQUOR', 'Food & Dining', 3);
    expect(await getLearnedCategoryForTransaction(fake as never, U, 'SOBEYS')).toBeNull();
  });
  it('two corrections for the exact merchant are', async () => {
    db.tag_category_feedback = [...fb('SOBEYS', 'Groceries', 2), ...fb('SOBEYS LIQUOR', 'Food & Dining', 3)];
    expect(await getLearnedCategoryForTransaction(fake as never, U, 'SOBEYS')).toEqual({ category: 'Groceries', count: 2 });
  });
});

describe('Requirement — customer decisions and customer "Other" are respected (static guarantees)', () => {
  const src = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');
  it('the retroactive apply only ever writes rows still awaiting review', () => {
    const s = src('_shared/tag-learning.ts');
    const fn = s.slice(s.indexOf('export async function applyMemoryToNeedsReviewStaging'), s.indexOf('export async function learnFromCorrection'));
    const updates = fn.split(".update(payload)").length - 1;
    expect(updates).toBe(2);
    expect(fn.split(".eq('tag_status', 'needs_review')").length - 1).toBeGreaterThanOrEqual(3); // read + both writes
  });
  it('the import categorizer is used only for rows without a category (a customer "Other" is kept)', () => {
    const s = src('commit-import.ts');
    expect(s).toMatch(/if \(!category \|\| category === 'Uncategorized'\) \{[\s\S]{0,200}categorizeTransactionWithLearning/);
  });
});
