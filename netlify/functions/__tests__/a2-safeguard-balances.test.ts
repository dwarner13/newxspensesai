/* eslint-disable @typescript-eslint/no-explicit-any -- fake client */
/**
 * Owner "FINAL A-2 APPROVAL" safeguard 4 (2026-11-27): individual stored balances may be quoted with
 * source, account and date; no aggregate balance is computed or claimed. Synthetic values only.
 */
import { describe, it, expect, vi } from 'vitest';

const rows = [
  { id: 'a1', name: 'Everyday Chequing', type: 'checking', balance: 1200, currency: 'CAD', updated_at: '2026-11-20T10:00:00Z' },
  { id: 'a2', name: 'Savings', type: 'savings', balance: 300, currency: 'CAD', updated_at: '2026-11-18T10:00:00Z' },
];
vi.mock('../../../src/server/db', () => ({
  getSupabaseServerClient: () => ({
    from: () => {
      const q: any = { select: () => q, eq: () => q, then: (res: any) => res({ data: rows, error: null }) };
      return q;
    },
  }),
}));

const { execute, ACCOUNT_BALANCE_SOURCE_NOTE } = await import('../../../src/agent/tools/impl/account_balances_query');
const { verifyReplyFigures } = await import('../../../src/shared/turn-evidence-ledger');
const { admitToolEvidence } = await import('../../../src/shared/financial-evidence-registry');
const { figuresFromToolResult } = await import('../../../src/shared/statement-reconciliation-guard');

describe('safeguard 4: stored balances singly, with source, account and date; never a total', () => {
  it('each account carries its source and as-of date; totalBalance is always null', async () => {
    const r: any = await execute({ accountType: 'all' } as any, { userId: 'u' });
    expect(r.value.totalBalance).toBeNull();
    expect(r.value.accounts.map((a: any) => [a.name, a.source, a.asOf])).toEqual([
      ['Everyday Chequing', 'verified_db', '2026-11-20T10:00:00Z'],
      ['Savings', 'verified_db', '2026-11-18T10:00:00Z'],
    ]);
    expect(ACCOUNT_BALANCE_SOURCE_NOTE).toMatch(/account name/);
    expect(ACCOUNT_BALANCE_SOURCE_NOTE).toMatch(/Never add balances together/);
  });

  it('a single stored balance verifies; an aggregate of balances never does', async () => {
    const r: any = await execute({ accountType: 'all' } as any, { userId: 'u' });
    const ev = admitToolEvidence('account_balances_query', r.value);
    const recordFigures = ev.admit === 'single_value' ? figuresFromToolResult(ev.payload, []) : [];
    const check = (reply: string) => verifyReplyFigures(reply, { toolFigures: [], recordFigures, userMessage: 'balances?' }).ok;
    expect(check('Your Everyday Chequing balance was $1,200.00 as recorded on Nov 20.')).toBe(true);
    expect(check('Your total balance across both accounts is $1,500.00.')).toBe(false);
  });
});
