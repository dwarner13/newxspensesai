/**
 * C1 / C3 — financial-integrity containment.
 *
 * C1: tag-categorize-committed's legacy "known-expense merchant correction" pass rewrote
 *     type AND negated amount on income rows from a hardcoded merchant list. It now runs only
 *     when TAG_LEGACY_INCOME_TO_EXPENSE_CONVERSION === '1'. Disabled (the default), the function
 *     never changes type, amount or sign; normal categorization and the response shape stay.
 * C3: Tag's AmountAnomalyCard wrote committed amounts from the browser (positive-only, so an
 *     expense flipped sign) and logged a "correction". It is now review-only.
 *
 * All Supabase access is an in-memory fake; no network, no database.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
type Call = { table: string; op: string; filters: Array<[string, unknown]>; payload?: Row };

const USER = '11111111-1111-4111-8111-111111111111';
const ENV = 'TAG_LEGACY_INCOME_TO_EXPENSE_CONVERSION';

let calls: Call[] = [];
let incomeRows: Row[] = [];
let uncategorizedRows: Row[] = [];

function query(table: string) {
  const filters: Array<[string, unknown]> = [];
  let op = 'select';
  let payload: Row | undefined;
  const run = () => {
    calls.push({ table, op, filters: [...filters], payload });
    if (op === 'update') return { data: null, error: null };
    if (table !== 'transactions') return { data: [], error: null };
    if (filters.some(([k]) => k === 'or')) return { data: uncategorizedRows, error: null };
    if (filters.some(([k, v]) => k === 'type' && v === 'income')) return { data: incomeRows, error: null };
    return { data: [], error: null };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable query-builder stand-in
  const q: any = {
    select: () => q,
    update: (p: Row) => { op = 'update'; payload = p; return q; },
    eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
    in: (k: string, v: unknown) => { filters.push([`in:${k}`, v]); return q; },
    or: (v: string) => { filters.push(['or', v]); return q; },
    not: (k: string, o: string, v: unknown) => { filters.push([`not:${k}:${o}`, v]); return q; },
    order: () => q,
    limit: () => q,
    then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
  };
  return q;
}

const fakeClient = { from: (t: string) => query(t) };
vi.mock('../_shared/supabase', () => ({ admin: () => fakeClient, serverSupabase: () => fakeClient }));
vi.mock('../_shared/verifyAuth', () => ({
  verifyAuth: async (event: Row) =>
    event.headers?.authorization === 'Bearer ok' ? { userId: USER } : { userId: '', error: 'Unauthorized' },
}));

const mod = await import('../tag-categorize-committed');

async function invoke() {
  const res = await mod.handler(
    { httpMethod: 'POST', headers: { authorization: 'Bearer ok' }, body: JSON.stringify({}) } as never,
    {} as never,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Netlify handler response
  const r = res as any;
  return { statusCode: r.statusCode as number, json: JSON.parse(r.body || '{}') as Row };
}
const txUpdates = () => calls.filter((c) => c.table === 'transactions' && c.op === 'update');
const touchesTypeOrAmount = (c: Call) =>
  !!c.payload && (Object.prototype.hasOwnProperty.call(c.payload, 'type') || Object.prototype.hasOwnProperty.call(c.payload, 'amount'));

let logSpies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => {
  calls = [];
  delete process.env[ENV];
  // An uncategorized row (so the function proceeds past its early return) and income rows,
  // one of which is a merchant on the legacy list.
  uncategorizedRows = [{ id: 'tx-unc', merchant_name: 'Starbucks', merchant: 'Starbucks', amount: -5.25, description: 'Starbucks', type: 'expense' }];
  incomeRows = [
    { id: 'tx-inc-listed', merchant_name: 'Golfzon Calgary', amount: 120, type: 'income' },
    { id: 'tx-inc-payroll', merchant_name: 'Payroll Deposit', amount: 2500, type: 'income' },
  ];
  logSpies = (['log', 'warn', 'error', 'info'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  delete process.env[ENV];
  logSpies.forEach((s) => s.mockRestore());
});

describe('C1 — legacy income-to-expense conversion is disabled by default', () => {
  it('flag helper: only the exact string "1" enables it', () => {
    expect(mod.LEGACY_INCOME_TO_EXPENSE_ENV).toBe(ENV);
    for (const v of [undefined, '', '0', 'true', 'TRUE', 'yes', ' 1', '1 ']) {
      if (v === undefined) delete process.env[ENV]; else process.env[ENV] = v;
      expect(mod.isLegacyIncomeToExpenseConversionEnabled()).toBe(false);
    }
    process.env[ENV] = '1';
    expect(mod.isLegacyIncomeToExpenseConversionEnabled()).toBe(true);
  });

  it('variable absent: no transaction update changes type, amount or sign; income rows are not even queried', async () => {
    const { statusCode, json } = await invoke();
    expect(statusCode).toBe(200);
    expect(txUpdates().some(touchesTypeOrAmount)).toBe(false);
    expect(txUpdates().some((c) => c.filters.some(([k, v]) => k === 'id' && v === 'tx-inc-listed'))).toBe(false);
    expect(calls.some((c) => c.table === 'transactions' && c.op === 'select' && c.filters.some(([k, v]) => k === 'type' && v === 'income'))).toBe(false);
    expect(json.typeEnforced).toBe(0);
  });

  it('variable set to anything other than "1" behaves exactly like absent', async () => {
    for (const v of ['0', 'true', 'false', 'on']) {
      calls = [];
      process.env[ENV] = v;
      await invoke();
      expect(txUpdates().some(touchesTypeOrAmount)).toBe(false);
    }
  });

  it('normal categorization still runs when disabled, and the response contract is unchanged', async () => {
    const { json } = await invoke();
    expect(Object.keys(json).sort()).toEqual(['ok', 'reclassified', 'total', 'typeEnforced', 'updated'].sort());
    expect(json.ok).toBe(true);
    expect(json.total).toBe(1);
    const catUpdates = txUpdates().filter((c) => c.filters.some(([k, v]) => k === 'id' && v === 'tx-unc'));
    expect(catUpdates.length).toBeGreaterThan(0);
    for (const c of catUpdates) {
      expect(c.payload).toHaveProperty('category');
      expect(touchesTypeOrAmount(c)).toBe(false);
      expect(c.filters).toContainEqual(['user_id', USER]);
    }
  });

  it('explicitly enabled ("1"): the legacy path is preserved exactly (listed merchant only, user-scoped)', async () => {
    process.env[ENV] = '1';
    const { json } = await invoke();
    const flips = txUpdates().filter(touchesTypeOrAmount);
    expect(flips).toHaveLength(1);
    expect(flips[0].payload).toMatchObject({ type: 'expense', amount: -120 });
    expect(flips[0].filters).toEqual(expect.arrayContaining([['id', 'tx-inc-listed'], ['user_id', USER]]));
    expect(txUpdates().some((c) => c.filters.some(([k, v]) => k === 'id' && v === 'tx-inc-payroll'))).toBe(false);
    expect(json.typeEnforced).toBe(1);
  });

  it('no deployed or example config enables it', () => {
    const root = path.resolve(__dirname, '../../..');
    const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    expect(example).toContain('# TAG_LEGACY_INCOME_TO_EXPENSE_CONVERSION=');
    expect(example).not.toMatch(/^\s*TAG_LEGACY_INCOME_TO_EXPENSE_CONVERSION\s*=/m);
    const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
    expect(toml).not.toContain('TAG_LEGACY_INCOME_TO_EXPENSE_CONVERSION');
  });
});

describe('C3 — AmountAnomalyCard is review-only', () => {
  const panel = fs.readFileSync(path.resolve(__dirname, '../../../src/components/transactions/TagCopilotPanel.tsx'), 'utf8');
  const start = panel.indexOf('function AmountAnomalyCard(');
  const card = panel.slice(start, panel.indexOf('function TagAvatar(', start));

  it('the card exists and contains no data writes of any kind', () => {
    expect(start).toBeGreaterThan(-1);
    expect(card).not.toMatch(/\.from\(/);
    expect(card).not.toMatch(/\.(update|insert|upsert|delete|rpc)\(/);
    expect(card).not.toMatch(/supabase|getSupabase|fetch\(/);
  });

  it('the file no longer writes amounts or amount-correction logs anywhere', () => {
    expect(panel).not.toMatch(/from\(["']transactions["']\)\s*\.update\(\s*\{\s*amount/);
    expect(panel).not.toContain('amount_corrected');
    expect(panel).not.toContain('tag_anomaly_review');
  });

  it('no amount input and no fixed/corrected success wording', () => {
    expect(card).not.toMatch(/<input/);
    expect(card).not.toMatch(/Correct Amount|Looks Fine|Saving\.\.\.|\bSave\b/);
    expect(card).not.toMatch(/\b(fixed|corrected)\b/i);
  });

  it('owner-approved wording and actions', () => {
    expect(card).toContain('Review transaction amount');
    expect(card).toContain('Tag thinks this amount may be a misread. Compare it with your statement. Amount corrections are temporarily unavailable.');
    expect(card).not.toContain('This transaction amount may need attention.');
    expect(card).toContain('>Review transaction</button>');
    expect(card).toContain('>Dismiss</button>');
  });

  it('Review navigates to the exact transaction via the existing helper; Dismiss is local state only', () => {
    expect(panel).toContain('import { buildTagReviewPath } from "@/lib/tagReview";');
    expect(card).toContain('const reviewPath = buildTagReviewPath(firstId);');
    expect(card).toContain('onClick={() => { if (reviewPath) navigate(reviewPath); }}');
    expect(card).toContain('onClick={() => setDismissed(true)}');
  });

  it('the mount passes no database client or refresh callback', () => {
    expect(panel).toContain('<AmountAnomalyCard key={issue.id} issue={issue} />');
  });
});
