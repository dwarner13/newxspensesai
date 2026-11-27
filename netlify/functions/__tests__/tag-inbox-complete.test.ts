/**
 * tag-inbox (top bar, Transactions "Needs your input", proactive follow-up) — AI Architecture HQ
 * pre-staging finding, fixed 2026-11-26: complete paged reads (no silent .limit(500)/.limit(1000)),
 * the ONE review rule, engine amounts by direction (no |amount| sums), honest incompleteness and errors.
 * Synthetic data only; the fake enforces a 1,000-row API cap and evaluates the real filters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
const fault = { table: '' };
const CAP = 1000;

function matchClause(r: Row, clause: string): boolean {
  const [col, op, ...rest] = clause.split('.');
  const val = rest.join('.');
  const v = r[col];
  if (op === 'is') return val === 'null' ? v === null || v === undefined : false;
  if (op === 'eq') return String(v ?? '') === val && v !== null && v !== undefined;
  if (op === 'ilike') return typeof v === 'string' && v.toLowerCase() === val.toLowerCase();
  throw new Error('unsupported clause ' + clause);
}
function builder(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let head = false; let rng: [number, number] | null = null; let lim: number | null = null; const orders: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = {
    select: (_c: string, o?: { head?: boolean }) => { head = !!o?.head; return q; },
    eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q; },
    or: (f: string) => { const cl = f.split(','); filters.push(r => cl.some(x => matchClause(r, x))); return q; },
    not: (c: string, op: string, v: unknown) => { filters.push(r => !matchClause(r, `${c}.${op}.${v === null ? 'null' : v}`)); return q; },
    order: (c: string) => { orders.push(c); return q; },
    range: (a: number, b: number) => { rng = [a, b]; return q; },
    limit: (n: number) => { lim = n; return q; },
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve().then(() => {
      if (fault.table === table) return { data: null, error: { message: 'down' }, count: null };
      let m = (db[table] || []).filter(r => filters.every(f => f(r)));
      for (const c of [...orders].reverse()) m = [...m].sort((a, z) => (String(a[c] ?? '') < String(z[c] ?? '') ? -1 : String(a[c] ?? '') > String(z[c] ?? '') ? 1 : 0));
      const count = m.length;
      if (rng) m = m.slice(rng[0], rng[1] + 1);
      if (lim !== null) m = m.slice(0, lim);
      m = m.slice(0, CAP); // hosted PostgREST row cap
      return { data: head ? null : m, error: null, count };
    }).then(res, rej),
  };
  return q;
}
const fake = { from: (t: string) => builder(t) };
vi.mock('../_shared/supabase.js', () => ({ serverSupabase: () => fake }));
vi.mock('../_shared/verifyAuth.js', () => ({ verifyAuth: async () => ({ userId: 'u-inbox', error: null }) }));

const U = 'u-inbox';
let n = 0;
const tx = (merchant: string, category: string | null, extra: Row = {}): Row => ({
  id: `t${String(++n).padStart(6, '0')}`, user_id: U, merchant_name: merchant, amount: -10, type: 'expense', category, subcategory: null,
  date: `2026-${String(1 + (n % 9)).padStart(2, '0')}-1${n % 9}`, ...extra,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inbox(): Promise<{ status: number; body: any }> {
  const { handler } = await import('../tag-inbox');
  const res = await (handler as unknown as (e: unknown, c: unknown) => Promise<{ statusCode: number; body: string }>)({ httpMethod: 'GET', headers: { authorization: 'Bearer t' } }, {});
  return { status: res.statusCode, body: JSON.parse(res.body) };
}

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  fault.table = ''; n = 0;
  db.category_rules = []; db.imports = [];
  for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => {});
});

describe('tag-inbox counts come from a complete read (no silent 500 / 1,000-row cut)', () => {
  it('2,600 rows needing review behind a 1,000-row cap: every merchant count is exact', async () => {
    db.transactions = [
      ...Array.from({ length: 1800 }, () => tx('CORNER COFFEE', 'Uncategorized')),
      ...Array.from({ length: 700 }, () => tx('GRAINS BAKERY', null)),
      ...Array.from({ length: 100 }, () => tx('LATTE BAR', 'needs review')),
    ];
    const { status, body } = await inbox();
    expect(status).toBe(200);
    expect(body.unresolved_complete).toBe(true);
    expect(body.unresolved_transaction_count).toBe(2600);
    expect(body.unresolved.map((u: { merchant_name: string; transaction_count: number }) => [u.merchant_name, u.transaction_count]))
      .toEqual([['CORNER COFFEE', 1800], ['GRAINS BAKERY', 700], ['LATTE BAR', 100]]);
    expect(body.badge_count).toBe(3);
  });
  it('the ONE review rule: "Other" (and real categories) never count as needing review', async () => {
    db.transactions = [tx('A SHOP', 'Other'), tx('B SHOP', 'Groceries'), tx('C SHOP', ''), tx('D SHOP', 'NEEDS REVIEW')];
    const { body } = await inbox();
    expect(body.unresolved.map((u: { merchant_name: string }) => u.merchant_name).sort()).toEqual(['C SHOP', 'D SHOP']);
  });
  it('amounts come from the engine by direction: a refund is never added as a charge', async () => {
    db.transactions = [tx('CORNER COFFEE', 'Uncategorized', { amount: -12.5 }), tx('CORNER COFFEE', 'Uncategorized', { amount: -7.5 }), tx('CORNER COFFEE', 'Uncategorized', { amount: 4, type: 'income' })];
    const { body } = await inbox();
    expect(body.unresolved[0]).toMatchObject({ transaction_count: 3, total_amount: 20, inflow_amount: 4 });
  });
  it('rule suggestions count every categorized transaction (1,500 behind the cap → count 1,500)', async () => {
    db.transactions = Array.from({ length: 1500 }, () => tx('SOBEYS', 'Groceries'));
    const { body } = await inbox();
    expect(body.rule_suggestions_complete).toBe(true);
    expect(body.rule_suggestions[0]).toMatchObject({ merchant_name: 'SOBEYS', category: 'Groceries', count: 1500, consistency: 100 });
  });
});

describe('tag-inbox is honest about failures', () => {
  it('a read error is a 503, never an empty "nothing to review"', async () => {
    db.transactions = [tx('CORNER COFFEE', 'Uncategorized')];
    fault.table = 'transactions';
    const { status, body } = await inbox();
    expect(status).toBe(503);
    expect(body.error).toBe('inbox_unavailable');
    expect(body.badge_count).toBeUndefined();
  });
  it('the source has no capped reads left for counted sets', () => {
    const src = readFileSync(resolve(__dirname, '../tag-inbox.ts'), 'utf8');
    expect(src).not.toMatch(/\.limit\((500|1000)\)/);
    expect(src).toContain('.or(NEEDS_CATEGORY_OR_FILTER)');
    expect(src).not.toMatch(/Math\.abs\(Number\(tx\.amount/);
  });
});
