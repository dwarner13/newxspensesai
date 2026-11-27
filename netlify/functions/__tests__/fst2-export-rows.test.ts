/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles for handler events and fake DB rows */
/**
 * financial-export kind 'rows' — the Transactions page export (UI/UX TX-PAGING, AR-1b item 2).
 * Fake database capped at 1,000 rows per request (hosted API behaviour). Synthetic data only.
 * Sign oracle is hand-written per generated kind (KIND_BUCKET), independent of classifyCashFlow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeCappedClient, type FakeRow } from '../../../src/shared/__tests__/fixtures/capped-supabase';
import { generateLedger, KIND_BUCKET, IMPORTS, type LedgerRow, type Bucket } from '../../../src/shared/__tests__/fixtures/ledger-generator';

const state: { client: any; tokens: Record<string, string> } = { client: null, tokens: {} };
vi.mock('../_shared/supabase.js', () => ({ admin: () => state.client, serverSupabase: () => state.client }));
vi.mock('../_shared/verifyAuth.js', () => ({
  verifyAuth: async (event: any) => {
    const t = String(event?.headers?.authorization || '').replace(/^Bearer /, '');
    const userId = state.tokens[t];
    return userId ? { userId, error: null } : { userId: null, error: 'Unauthorized' };
  },
}));

const { handler: exporter } = await import('../financial-export');
const { LEDGER_MAX_ROWS } = await import('../_shared/financial-ledger');

const A = 'user-a';
const B = 'user-b';
const INFLOW: ReadonlySet<Bucket> = new Set(['income', 'refunds', 'transferIn', 'debtRepaymentsIn']);

function db(rows: unknown[]): Record<string, FakeRow[]> {
  return {
    transactions: rows as FakeRow[],
    imports: [
      { id: IMPORTS.chequing, user_id: A, file_url: 'x/chequing.pdf', created_at: '2023-01-01', statement_breakdown_json: { statement_meta: { issuer: 'Synthetic Bank', account_last4: '0001' } } },
      { id: IMPORTS.card, user_id: A, file_url: 'x/card.pdf', created_at: '2023-01-02' },
    ],
    profiles: [{ id: A, currency: 'CAD' }, { id: B, currency: 'CAD' }],
  };
}
const call = (body: unknown, token = 'tok-a') =>
  (exporter as any)({ httpMethod: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }, {});

function parse(csv: string): { header: string[]; rows: string[][] } {
  const split = (l: string) => {
    const out: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  };
  const lines = csv.split('\r\n').filter(Boolean);
  return { header: split(lines[0]), rows: lines.slice(1).map(split) };
}

beforeEach(() => { state.tokens = { 'tok-a': A, 'tok-b': B }; });

describe("financial-export kind 'rows'", () => {
  it('all time at 3,000 (over the 1,000-row API cap): every row, engine-direction signs, no header block', async () => {
    const { rows } = generateLedger(3000, A);
    const other = generateLedger(200, B).rows;
    state.client = makeCappedClient(db([...rows, ...other]));
    const res = await call({ kind: 'rows' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['X-Transaction-Count']).toBe(String(rows.length));
    expect(res.headers['Content-Disposition']).toContain('xspensesai-transactions-all-time.csv');
    const { header, rows: out } = parse(res.body);
    expect(res.body.startsWith('#')).toBe(false);
    expect(header).toEqual(['Date', 'Merchant', 'Amount', 'Category', 'Subcategory', 'Statement']);
    expect(out.length).toBe(rows.length);
    // Sign oracle (hand-written bucket per kind), matched by date+merchant+absolute amount multiset.
    const key = (d: string, m: string, abs: string) => `${d}|${m}|${abs}`;
    const expected = new Map<string, string[]>();
    for (const r of rows as LedgerRow[]) {
      const b = KIND_BUCKET[r.kind];
      const abs = Math.abs(r.amount).toFixed(2);
      const signed = b === 'unclassified' ? r.amount.toFixed(2) : INFLOW.has(b) ? abs : `-${abs}`;
      const k = key(r.date, r.merchant_name || 'Unknown', abs);
      expected.set(k, [...(expected.get(k) ?? []), signed].sort());
    }
    const got = new Map<string, string[]>();
    for (const o of out) {
      const k = key(o[0], o[1], o[2].replace(/^-/, ''));
      got.set(k, [...(got.get(k) ?? []), o[2]].sort());
    }
    expect(got).toEqual(expected);
  });

  it('all time keeps undated rows (sorted last, posted date used); a date range excludes them', async () => {
    const { rows } = generateLedger(1200, A);
    const undated = [
      { ...rows[0], id: `${A}-undated-1`, date: null, posted_at: '2024-03-05T10:00:00Z' },
      { ...rows[1], id: `${A}-undated-2`, date: null, posted_at: null },
    ];
    state.client = makeCappedClient(db([...rows, ...undated]));
    const all = parse((await call({ kind: 'rows' })).body).rows;
    expect(all.length).toBe(rows.length + 2);
    expect(all.slice(-2).map(r => r[0]).sort()).toEqual(['', '2024-03-05']);
    const ranged = await call({ kind: 'rows', startDate: '2023-01-01', endDate: '2025-12-31' });
    expect(ranged.statusCode).toBe(200);
    expect(parse(ranged.body).rows.length).toBe(rows.filter(r => r.date >= '2023-01-01' && r.date <= '2025-12-31').length);
    expect(ranged.headers['Content-Disposition']).toContain('2023-01-01-to-2025-12-31');
  });

  it('statement scope: only that import, labelled; another customer\'s import id yields nothing of theirs', async () => {
    const { rows } = generateLedger(1500, A);
    const theirs = generateLedger(300, B).rows;
    state.client = makeCappedClient(db([...rows, ...theirs]));
    const res = await call({ kind: 'rows', importIds: [IMPORTS.chequing] });
    expect(res.statusCode).toBe(200);
    const out = parse(res.body).rows;
    expect(out.length).toBe(rows.filter(r => r.import_id === IMPORTS.chequing).length);
    expect(new Set(out.map(r => r[5]))).toEqual(new Set(['Synthetic Bank ••0001']));
    const b = await call({ kind: 'rows', importIds: [IMPORTS.chequing] }, 'tok-b');
    expect(parse(b.body).rows.length).toBe(theirs.filter(r => r.import_id === IMPORTS.chequing).length);
    expect(b.body).not.toContain(`${A}-`);
  });

  it('validation: one date only → 400; bad import id → 400; no token → 401', async () => {
    state.client = makeCappedClient(db(generateLedger(10, A).rows));
    expect((await call({ kind: 'rows', startDate: '2024-01-01' })).statusCode).toBe(400);
    expect((await call({ kind: 'rows', endDate: '2024-01-01' })).statusCode).toBe(400);
    expect((await call({ kind: 'rows', importIds: ['not-a-uuid'] })).statusCode).toBe(400);
    expect((await call({ kind: 'rows' }, 'nope')).statusCode).toBe(401);
  });

  it('churn during the read → 409 partial, no file', async () => {
    const { rows } = generateLedger(3000, A);
    let k = 0;
    state.client = makeCappedClient(db(rows), {
      onRequest: (_n: number, table: string) => { if (table === 'transactions' && ++k % 2 === 0) rows.push({ ...rows[0], id: `${A}-ins-${k}` }); },
    });
    const res = await call({ kind: 'rows' });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).status).toBe('partial');
  });

  it(`over the ${LEDGER_MAX_ROWS.toLocaleString('en-CA')}-row ledger ceiling → 409 over_limit with guidance, no file`, async () => {
    const big = Array.from({ length: LEDGER_MAX_ROWS + 1 }, (_, i) => ({
      id: `${A}-${String(i).padStart(6, '0')}`, user_id: A, date: '2024-01-01', amount: -1, type: 'debit',
      category: 'Groceries', subcategory: null, merchant_name: 'Synthetic', import_id: IMPORTS.card,
    }));
    state.client = makeCappedClient(db(big));
    const res = await call({ kind: 'rows' });
    expect(res.statusCode).toBe(409);
    const b = JSON.parse(res.body);
    expect(b.reason).toBe('over_limit');
    expect(b.error).toMatch(/Choose a year, date range or statement/);
  }, 60_000);

  it('a file over the response size limit → 413 too_large, never a truncated download (applies to every kind)', async () => {
    const huge = 'M'.repeat(2_000_000);
    const rows = [0, 1, 2].map(i => ({ id: `${A}-h${i}`, user_id: A, date: '2024-01-0' + (i + 1), amount: -5, type: 'debit', category: 'Groceries', subcategory: null, merchant_name: huge, description: '', import_id: IMPORTS.card }));
    state.client = makeCappedClient(db(rows));
    const r1 = await call({ kind: 'rows' });
    expect(r1.statusCode).toBe(413);
    expect(JSON.parse(r1.body).status).toBe('too_large');
    const r2 = await call({ kind: 'accountant', startDate: '2024-01-01', endDate: '2024-12-31' });
    expect(r2.statusCode).toBe(413);
  });

  it('CSV injection: a merchant starting with = is neutralised', async () => {
    const rows = [{ id: `${A}-x`, user_id: A, date: '2024-02-01', amount: -9.5, type: 'debit', category: 'Shopping', subcategory: null, merchant_name: '=HYPERLINK("x")', import_id: IMPORTS.card }];
    state.client = makeCappedClient(db(rows));
    const out = parse((await call({ kind: 'rows' })).body).rows;
    expect(out[0][1].startsWith("'=")).toBe(true);
    expect(out[0][2]).toBe('-9.50');
  });
});
