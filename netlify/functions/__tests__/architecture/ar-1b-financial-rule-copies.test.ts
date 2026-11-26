/**
 * AR-1b (owner GO 2026-11-26): permanent protection against competing financial calculations.
 * Owner: Prime HQ (harness); each baseline entry is fixed by its file's owning team (spec §6E,
 * AR1B_FINANCIAL_RULE_COPY_AUDIT.md) and retired only after a VERIFIED replacement.
 * Rules: R1 classifier copies · R2 amount aggregation in transaction readers · R3 legacy engine
 * exports · R4 capped transaction reads · R6 forbidden screen labels. A NEW hit fails; a fixed entry
 * must leave the baseline (shrink-only). The 2027-01-25 expiry is a maximum remediation deadline,
 * not permission to launch with active financial inaccuracies.
 */
import { describe, it, expect } from 'vitest';
import path from 'path';
import { scanAll, scanFile, hitKey } from '../../../../src/shared/__tests__/fixtures/ar1b-scan';
import BASELINE from '../../../../src/shared/__tests__/fixtures/ar1b-baseline.json';

const ROOT = path.join(__dirname, '../../../..');

describe('AR-1b: no new financial-rule copies outside the shared engine', () => {
  const current = new Set(scanAll(ROOT).map(hitKey));
  const baseline = new Set((BASELINE as { entries: string[] }).entries);

  it('no NEW rule copy (R1/R2/R3/R4/R6) anywhere in src or netlify/functions', () => {
    expect([...current].filter(k => !baseline.has(k))).toEqual([]);
  });

  it('fixed copies leave the baseline (shrink-only)', () => {
    expect([...baseline].filter(k => !current.has(k))).toEqual([]);
  });

  it('the baseline carries owner and expiry (§5A)', () => {
    expect(BASELINE).toMatchObject({ owner: expect.any(String), expires: '2027-01-25' });
  });

  it('scanner self-test: each rule fires, and authoritative modules are exempt', () => {
    const src = `
      import { isIncomeBroad } from '@/shared/financial-taxonomy';
      const isIncome = (t) => /PAYMENT|CREDIT|REFUND/.test(t.merchant);
      const NON_SPEND_CATEGORIES = new Set(['transfers']);
      const rows = await sb.from('transactions').select('*').limit(5000);
      let totalSpend = 0; for (const t of rows) totalSpend += t.amount;
      const label = 'Net Flow';
    `;
    const rules = scanFile('src/pages/X/useThing.ts', src).map(h => h.rule).sort();
    expect(rules).toEqual(expect.arrayContaining(['R1', 'R2', 'R3', 'R4', 'R6']));
    expect(scanFile('src/shared/period-aggregate.ts', src)).toEqual([]);
  });
});
