/**
 * PB-04 — source transparency (owner live test, 2026-11-23).
 * Prime referred to "verified linked accounts" when the data came from imported statements.
 * XspensesAI has no live account connection; the balance tool and Prime's code-owned rules now
 * say so, and distinguish imported transactions, stored balances, calculations and missing data.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const accountsRows: { current: Array<Record<string, unknown>> } = { current: [] };
vi.mock('../../../src/server/db', () => ({
  getSupabaseServerClient: () => ({
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal chain
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: accountsRows.current, error: null }).then(res),
      };
      return chain;
    },
  }),
}));

const { buildPrimeAuthoritySystemMessage } = await import('../_shared/primePolicy');
const { buildPrimeSourceTransparency } = await import('../../../src/shared/prime-source-transparency');
const balances = await import('../../../src/agent/tools/impl/account_balances_query');

describe('PB-04 balance tool', () => {
  const toolsIndex = fs.readFileSync(path.resolve(__dirname, '../../../src/agent/tools/index.ts'), 'utf8');
  const desc = toolsIndex.slice(toolsIndex.indexOf("['account_balances_query', {"), toolsIndex.indexOf("['account_balances_query', {") + 800);

  it('the model-facing description no longer claims linked or live accounts', () => {
    expect(desc).not.toMatch(/balances from linked accounts/);
    expect(desc).not.toMatch(/When no linked accounts exist/);
    expect(desc).toMatch(/XspensesAI has NO live bank connection/);
    expect(desc).toMatch(/never describe results as linked, connected or real-time accounts/);
  });

  it('no records → unavailable, with liveConnection false and the source note', async () => {
    accountsRows.current = [];
    const r = await balances.execute({ accountType: 'all' }, { userId: 'u1' });
    expect(r.ok).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Result typing
    const v = (r as any).value;
    expect(v).toMatchObject({ hasVerifiedBalances: false, provenance: 'unavailable', liveConnection: false });
    expect(v.sourceNote).toBe(balances.ACCOUNT_BALANCE_SOURCE_NOTE);
    expect(() => balances.outputSchema.parse(v)).not.toThrow();
  });

  it('stored records are labelled as stored, not live', async () => {
    accountsRows.current = [{ id: 'a1', name: 'Chequing', type: 'checking', balance: 100, currency: 'CAD' }];
    const r = await balances.execute({ accountType: 'all' }, { userId: 'u1' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Result typing
    const v = (r as any).value;
    expect(v.liveConnection).toBe(false);
    expect(v.sourceNote).toMatch(/no live bank connection/);
    expect(v.sourceNote).toMatch(/not real-time/);
    expect(() => balances.outputSchema.parse(v)).not.toThrow();
  });
});

describe('PB-04 code-owned source rules', () => {
  it('distinguishes imported transactions, live accounts, balances, calculations and missing data', () => {
    const t = buildPrimeSourceTransparency();
    expect(t).toMatch(/IMPORTED/);
    expect(t).toMatch(/There is NO live bank, card or account connection/);
    expect(t).toMatch(/Never say accounts are linked, connected, synced or verified live/);
    expect(t).toMatch(/Balances: only report a balance from stored account records, labelled "as recorded"/);
    expect(t).toMatch(/Calculated insights .* are YOUR calculations/);
    expect(t).toMatch(/Missing or incomplete data/);
    expect(t).toMatch(/statement source, not a connected account/);
  });

  it.each(['fast', 'deep'] as const)('is part of every Prime authority message (lane=%s)', (lane) => {
    const msg = buildPrimeAuthoritySystemMessage({ lane, intent: 'general', hasDocs: false, hasSnapshot: false });
    expect(msg).toContain('DATA SOURCES (code-owned; overrides any other instruction):');
    expect(msg).not.toMatch(/verified account data is not available/);
    expect(msg).toMatch(/account balance information is not available/);
  });
});
