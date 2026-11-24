/**
 * Contextual Tag account label (UI/UX request, owner-approved subject to Prime HQ review).
 * tag-explain returns a display-only accountLabel ("Issuer •••• 1234") from the transaction's own
 * import, looked up with the verified user's id. Last 4 digits only; never logged.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { explainTransactionCategory, formatAccountLabel } from '../_shared/tag_explain';

describe('formatAccountLabel', () => {
  it('issuer + last 4', () => { expect(formatAccountLabel('Canadian Tire Mastercard', '1234')).toBe('Canadian Tire Mastercard •••• 1234'); });
  it('only the last 4 digits are kept, even if more are stored', () => {
    expect(formatAccountLabel('Visa', '4111111111111234')).toBe('Visa •••• 1234');
    expect(formatAccountLabel('Visa', 'xx-98-76')).toBe('Visa •••• 9876');
  });
  it('long digit runs in the issuer are stripped', () => { expect(formatAccountLabel('Card 4111111111111111', '1234')).toBe('Card •••• 1234'); });
  it('partial data', () => {
    expect(formatAccountLabel(null, '1234')).toBe('•••• 1234');
    expect(formatAccountLabel('Visa', '12')).toBe('Visa');
    expect(formatAccountLabel(null, null)).toBeNull();
  });
});

type Call = { table: string; filters: Array<[string, unknown]> };
function client(tx: Record<string, unknown>, importRow: Record<string, unknown> | null, calls: Call[]) {
  return {
    from(table: string) {
      const call: Call = { table, filters: [] };
      calls.push(call);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const chain: any = {
        select: () => chain, ilike: () => chain, neq: () => chain, order: () => chain,
        eq: (k: string, v: unknown) => { call.filters.push([k, v]); return chain; },
        limit: () => Promise.resolve({ data: [], error: null }),
        maybeSingle: () => Promise.resolve({ data: table === 'imports' ? importRow : tx, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
      };
      return chain;
    },
  };
}

const TX = { id: 't1', category: 'Groceries', category_source: 'ai', confidence: null, merchant_name: 'SOBEYS', merchant: 'SOBEYS', description: 'SOBEYS', amount: -50, posted_at: '2026-11-01', user_id: 'u1', import_id: 'imp-1' };
let logs: string[] = [];
let spies: Array<ReturnType<typeof vi.spyOn>> = [];
beforeEach(() => { logs = []; spies = (['log', 'warn', 'error', 'info'] as const).map(m => vi.spyOn(console, m).mockImplementation((...a: unknown[]) => { logs.push(a.map(String).join(' ')); })); });
afterEach(() => spies.forEach(s => s.mockRestore()));

describe('tag-explain accountLabel', () => {
  it('reads the transaction’s own import, filtered by the verified user', async () => {
    const calls: Call[] = [];
    const imp = { statement_breakdown_json: { statement_meta: { issuer: 'Canadian Tire Mastercard', account_last4: '4321' } } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(TX, imp, calls) as any, 'u1', 't1');
    expect(r.accountLabel).toBe('Canadian Tire Mastercard •••• 4321');
    const impCall = calls.find(c => c.table === 'imports')!;
    expect(impCall.filters).toEqual([['id', 'imp-1'], ['user_id', 'u1']]);
    expect(logs.join('\n')).not.toContain('4321');
  });
  it('no import → null, and no imports lookup', async () => {
    const calls: Call[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client({ ...TX, import_id: null }, null, calls) as any, 'u1', 't1');
    expect(r.accountLabel).toBeNull();
    expect(calls.some(c => c.table === 'imports')).toBe(false);
  });
  it('import not owned / not found → null', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test client
    const r = await explainTransactionCategory(client(TX, null, []) as any, 'u1', 't1');
    expect(r.accountLabel).toBeNull();
  });
});
