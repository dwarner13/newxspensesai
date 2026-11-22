/**
 * C2-G2 (Part C) — a dashboard-snapshot match is never verified financial evidence.
 *
 * Previously: if the browser snapshot (prime_context.taxSummary) had a section/subcategory
 * matching the asked category, chat.ts set financialEvidence = { grounded, verified,
 * fromContext } and SKIPPED the server pre-execution — Prime could answer from unverified
 * browser numbers. Now the match is only logged and the request continues through the
 * existing server evidence path and its gates.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyFinancialQuery } from '../../../src/shared/financial-query-classifier';
import { isAnswerInContext, buildPreExecutionPlan } from '../../../src/shared/financial-grounding';

const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
const YEAR = new Date().getFullYear();
// A browser snapshot with a matching section — the case C2-G1 identified.
const snapshot = [{ section: 'Groceries', total: 9999.99, topSubcategories: [{ name: 'Gas & Fuel', total: 1234.56 }] }] as unknown as Parameters<typeof isAnswerInContext>[1];

describe('the snapshot-only case still exists at the classifier level (so the guard matters)', () => {
  it('isAnswerInContext matches a category from the browser snapshot and claims "verified"', () => {
    const c = classifyFinancialQuery('How much did I spend on groceries?');
    const r = isAnswerInContext(c, snapshot, YEAR);
    expect(r).toMatchObject({ grounded: true, queryStatus: 'verified', fromContext: true });
  });
});

describe('chat.ts never accepts it as evidence', () => {
  const block = chat.slice(chat.indexOf('const taxSummary = Array.isArray(pc.taxSummary) ? pc.taxSummary : [];'), chat.indexOf('// Pre-execute the right tool'));

  it('the snapshot match is only logged; financialEvidence is not set from it', () => {
    expect(block).toContain("console.log('[FinancialGrounding] snapshot-only match ignored — continuing to the verified evidence path');");
    expect(block).not.toMatch(/financialEvidence\s*=\s*contextEvidence/);
    expect(block).not.toContain('fromContext=true');
    expect(chat).not.toMatch(/financialEvidence\s*=\s*contextEvidence/);
  });

  it('the request always reaches the existing server pre-execution path and its gates', () => {
    const after = chat.slice(chat.indexOf('// Pre-execute the right tool'), chat.indexOf('// Pre-execute the right tool') + 4000);
    expect(after).toContain('const plan = buildPreExecutionPlan(financialClassification, contextYear);');
    expect(after).toContain('shouldSuppressLegacyPreExec(p31cResult, plan.toolName)'); // P3.1C gate
    expect(after).toContain('const periodUnresolvedTaxSummary'); // C2-F gate
    expect(after).toContain('!untrustedMerchantPreExec'); // merchant-trust gate
  });

  it('for the snapshot case the server path has a real plan to run', () => {
    const c = classifyFinancialQuery('How much did I spend on groceries?');
    expect(buildPreExecutionPlan(c, YEAR).shouldPreExecute).toBe(true);
  });
});
