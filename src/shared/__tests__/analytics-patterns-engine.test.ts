/* eslint-disable @typescript-eslint/no-explicit-any -- tool result shape */
/**
 * AR-1b FR-041 (owner GO 2026-11-26): analytics_extract_patterns spending comes from the shared
 * engine — transfers, card payments, cash and savings are never spending. Synthetic rows only.
 */
import { describe, it, expect } from 'vitest';
import { execute } from '../../agent/tools/impl/analytics_extract_patterns';

describe('analytics_extract_patterns on the shared engine', () => {
  it('spending excludes transfers, card payments and cash withdrawals', async () => {
    const r: any = await execute({
      structuredData: { transactions: [
        { date: '2026-03-02', amount: -80, merchant: 'GROCER', category: 'Groceries' },
        { date: '2026-03-03', amount: -40, merchant: 'CAFE', category: 'Dining' },
        { date: '2026-03-04', amount: -500, merchant: 'BANK', category: 'Transfer' },
        { date: '2026-03-05', amount: -300, merchant: 'CARD', category: 'Credit Card Payment' },
        { date: '2026-03-06', amount: -100, merchant: 'ATM', category: 'Cash Withdrawal' },
        { date: '2026-03-07', amount: 2000, merchant: 'EMPLOYER', category: 'Income' },
      ] },
      analysisType: 'spending',
    } as any, { userId: 'u' });
    expect(r.ok).toBe(true);
    const s = r.value.patterns.spending;
    expect(s.totalSpending).toBe(120);                       // was 1,020
    expect(s.topCategories.map((c: any) => c.category)).toEqual(['Groceries', 'Food & Dining']);
    expect(s.topMerchants.map((m: any) => m.merchant)).not.toContain('BANK');
  });
});
