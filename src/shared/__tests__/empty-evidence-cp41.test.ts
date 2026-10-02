/**
 * Prime V1-A CP4.1 — authoritative empty evidence is a verified zero, not missing evidence.
 *
 * Live bug: P3.1C cash_flow_summary (Sep 1–30, 0 rows, complete) → successful_empty,
 * but chat.ts told the legacy grounding layer queryStatus='verified'. Prime's honest
 * "no matching transactions" answer then tripped the false-zero validator, and the
 * retry ran tax_summary {year: 2026} — Jan–Jun 2026 data presented as September.
 *
 * Final hardening: verified_zero requires PROVEN complete empty evidence (authoritative,
 * not partial, classification not incomplete); suppression stays a separate, looser
 * question; a "$0" component inside a non-zero answer is not an overall zero claim.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  legacyQueryStatusFromP31C,
  shouldSuppressLegacyPreExec,
  type PrimeEvidenceExecutionResult,
} from '../prime-evidence-executor';
import { buildPreExecutionPlan, detectsFalseZero, validateGroundedAnswer } from '../financial-grounding';
import { classifyFinancialQuery } from '../financial-query-classifier';

type Step = { kind: string; status: string; authoritative?: boolean; data?: unknown };
const exec = (...steps: Step[]) => ({
  intent: 'financial_data_lookup',
  overallSufficiency: 'sufficient',
  results: steps.map(s => ({
    evidenceKind: s.kind, status: s.status, authoritative: s.authoritative ?? true, source: 's', tool: 't',
    ...(s.data !== undefined ? { data: s.data } : {}),
  })),
  executedCount: steps.length, skippedCount: 0, failedCount: 0, resolvedCount: 0, successfulEmptyCount: 0, totalDurationMs: 1, dedupHitCount: 0,
}) as unknown as PrimeEvidenceExecutionResult;

// Shapes of real cash_flow_summary data (CP3 output) for the empty cases.
const COMPLETE_EMPTY = { transactionCount: 0, queryStatus: 'verified_zero', completeness: { dataComplete: true, truncated: false, authoritative: true, classificationComplete: true, rowsFetched: 0 } };
const PARTIAL_EMPTY = { transactionCount: 0, queryStatus: 'partial', completeness: { dataComplete: false, truncated: true, authoritative: false, classificationComplete: false, rowsFetched: 20000 } };
const UNCLASSIFIED_EMPTY = { transactionCount: 0, queryStatus: 'verified_zero', completeness: { dataComplete: true, truncated: false, authoritative: true, classificationComplete: false, rowsFetched: 12 } };

const SEPTEMBER = 'How much did I spend in September?';
// The wording P3.1C's successful_empty policy asks Prime to use.
const HONEST_EMPTY = 'I found no matching spending transactions in the currently imported data for September 2026.';

/** Mirrors the chat.ts grounding decisions using only the production functions. */
function legacyFlow(message: string, p31c: PrimeEvidenceExecutionResult | null, answer: string) {
  const fc = classifyFinancialQuery(message);
  const plan = buildPreExecutionPlan(fc, 2026);
  const suppressed = plan.toolName ? shouldSuppressLegacyPreExec(p31c, plan.toolName) : false;
  // chat.ts suppression branch: a proven status → grounded; suppressed but unproven → not grounded
  const status = suppressed ? legacyQueryStatusFromP31C(p31c, plan.toolName!) : null;
  const evidence = status ? { grounded: true, toolName: plan.toolName, queryStatus: status } : { grounded: false };
  const validation = validateGroundedAnswer(answer, evidence as never, fc);
  const falseZero = validation === 'false_zero_ungrounded' || validation === 'false_zero_without_evidence';
  // chat.ts false-zero retry: gated by the existing suppression function
  const retryBlockedByP31C = falseZero && suppressed;
  const retryRunsLegacyTool = falseZero && !!plan.shouldPreExecute && !!plan.toolName && !suppressed;
  return { plan, evidence, validation, falseZero, retryRunsLegacyTool, retryBlockedByP31C };
}

describe('CP4.1 status mapping (P3.1C → legacy query status)', () => {
  it('1. resolved (authoritative) → verified', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'resolved' }), 'tax_summary')).toBe('verified');
  });
  it('2. complete authoritative successful_empty → verified_zero', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'successful_empty', data: COMPLETE_EMPTY }), 'tax_summary')).toBe('verified_zero');
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'successful_empty' }), 'tax_summary')).toBe('verified_zero');
  });
  it('3. failed → no authoritative override', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'failed' }), 'tax_summary')).toBeNull();
  });
  it('4. skipped / unavailable / nothing executed / not run → no authoritative override', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'skipped' }), 'tax_summary')).toBeNull();
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'unavailable' }), 'tax_summary')).toBeNull();
    expect(legacyQueryStatusFromP31C(exec(), 'tax_summary')).toBeNull();
    expect(legacyQueryStatusFromP31C(null, 'tax_summary')).toBeNull();
  });
  it('resolved data anywhere in the relevant kinds wins over an empty one', () => {
    const mixed = exec({ kind: 'category_aggregation', status: 'successful_empty' }, { kind: 'transaction_data', status: 'resolved' });
    expect(legacyQueryStatusFromP31C(mixed, 'tax_summary')).toBe('verified');
  });
  it('irrelevant kinds and unknown legacy tools never override', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'resolved' }), 'tx_search')).toBeNull();
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'resolved' }), 'merchant_totals')).toBeNull();
  });
});

describe('CP4.1 verified_zero means PROVEN zero', () => {
  it('partial / truncated successful_empty → NOT verified_zero', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'successful_empty', authoritative: false, data: PARTIAL_EMPTY }), 'tax_summary')).toBeNull();
    // dedup-cache path keeps the step's authoritative=true; the partial data still disqualifies it
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'successful_empty', authoritative: true, data: PARTIAL_EMPTY }), 'tax_summary')).toBeNull();
  });
  it('non-authoritative successful_empty → NOT verified_zero', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'successful_empty', authoritative: false, data: COMPLETE_EMPTY }), 'tax_summary')).toBeNull();
  });
  it('classificationComplete:false successful_empty (rows fetched, none classifiable) → NOT verified_zero', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'successful_empty', data: UNCLASSIFIED_EMPTY }), 'tax_summary')).toBeNull();
  });
  it('one unproven empty among relevant empties → NOT verified_zero', () => {
    const r = exec({ kind: 'cash_flow', status: 'successful_empty', data: COMPLETE_EMPTY }, { kind: 'category_aggregation', status: 'successful_empty', authoritative: false });
    expect(legacyQueryStatusFromP31C(r, 'tax_summary')).toBeNull();
  });
  it('non-authoritative resolved data → no verified status (data found but not authoritative)', () => {
    expect(legacyQueryStatusFromP31C(exec({ kind: 'cash_flow', status: 'resolved', authoritative: false }), 'tax_summary')).toBeNull();
  });
  it('suppression and status are different questions: unproven empty still suppresses legacy evidence', () => {
    const partial = exec({ kind: 'cash_flow', status: 'successful_empty', authoritative: false, data: PARTIAL_EMPTY });
    expect(shouldSuppressLegacyPreExec(partial, 'tax_summary')).toBe(true);
    expect(legacyQueryStatusFromP31C(partial, 'tax_summary')).toBeNull();
    // failures neither suppress nor prove anything
    const failed = exec({ kind: 'cash_flow', status: 'failed' });
    expect(shouldSuppressLegacyPreExec(failed, 'tax_summary')).toBe(false);
    expect(legacyQueryStatusFromP31C(failed, 'tax_summary')).toBeNull();
  });
  it('partial / uncertain empty evidence cannot authorize a zero answer', () => {
    const r = legacyFlow(SEPTEMBER, exec({ kind: 'cash_flow', status: 'successful_empty', authoritative: false, data: PARTIAL_EMPTY }), HONEST_EMPTY);
    expect(r.evidence).toEqual({ grounded: false });
    expect(r.validation).toBe('false_zero_ungrounded');
  });
  it('partial / uncertain empty evidence still cannot trigger unrelated tax_summary replacement', () => {
    const r = legacyFlow(SEPTEMBER, exec({ kind: 'cash_flow', status: 'successful_empty', data: UNCLASSIFIED_EMPTY }), HONEST_EMPTY);
    expect(r.falseZero).toBe(true);
    expect(r.retryRunsLegacyTool).toBe(false);
    expect(r.retryBlockedByP31C).toBe(true); // → chat.ts honest "could not confirm" fallback
  });
});

describe('CP4.1 false-zero detector: amount and text claims', () => {
  it.each([
    'You spent $0 in May.',
    'You spent $0.00 in May.',
    'Your total spending was $0.',
    'I found no spending transactions in May.',
    'There were no matching transactions.',
    'You had zero income in May.',
  ])('zero / no-data claim: %s', (t) => {
    expect(detectsFalseZero(t)).toBe(true);
  });

  it.each([
    'You spent $4,250 in May. Transfers were $0.00.',
    'Your income was $8,000 and debt payments were $0.',
    'Total outflow was $5,000. Savings/investments were $0.00.',
    'You spent $100.50.',
    'Your average transaction was $0.50.',
    'Your net movement was -$0.50.',
    'You spent $4,250; one category had $0.',
    'Spending was $4,250, compared with $0 last month.',
  ])('not an overall zero claim: %s', (t) => {
    expect(detectsFalseZero(t)).toBe(false);
  });

  it('honest no-data prose is still a zero / no-data claim', () => {
    expect(detectsFalseZero(HONEST_EMPTY)).toBe(true);
  });
  it('accepted conservative limit: a $0 current value beside a non-zero comparison is not flagged', () => {
    expect(detectsFalseZero('You spent $0 in May, compared with $4,250 last month.')).toBe(false);
  });
});

describe('CP4.1 live scenario: September spending with no imported September rows', () => {
  const emptyCashFlow = exec({ kind: 'cash_flow', status: 'successful_empty', data: COMPLETE_EMPTY });

  it('5. verified empty → the honest no-data answer passes false-zero validation', () => {
    const r = legacyFlow(SEPTEMBER, emptyCashFlow, HONEST_EMPTY);
    expect(r.plan.toolName).toBe('tax_summary');
    expect(r.evidence).toMatchObject({ grounded: true, queryStatus: 'verified_zero' });
    expect(r.validation).toBeNull();
  });
  it('6. no tax_summary retry (validation passes, and the retry gate is closed anyway)', () => {
    const r = legacyFlow(SEPTEMBER, emptyCashFlow, HONEST_EMPTY);
    expect(r.retryRunsLegacyTool).toBe(false);
    expect(shouldSuppressLegacyPreExec(emptyCashFlow, 'tax_summary')).toBe(true);
  });
  it('7. resolved cash_flow: a zero claim still fails validation, but tax_summary is never retried', () => {
    const r = legacyFlow(SEPTEMBER, exec({ kind: 'cash_flow', status: 'resolved' }), 'You spent $0 in May.');
    expect(r.validation).toBe('false_zero_without_evidence');
    expect(r.retryRunsLegacyTool).toBe(false);
  });
  it('resolved cash_flow: a non-zero answer with a $0.00 component passes validation', () => {
    const r = legacyFlow(SEPTEMBER, exec({ kind: 'cash_flow', status: 'resolved' }), 'You spent $4,250 in September. Transfers were $0.00.');
    expect(r.validation).toBeNull();
  });
});

describe('CP4.1 genuine false-zero protection is unchanged', () => {
  it('8. no P3.1C evidence: an invented zero is still caught and the legacy retry still runs', () => {
    const r = legacyFlow(SEPTEMBER, null, HONEST_EMPTY);
    expect(r.validation).toBe('false_zero_ungrounded');
    expect(r.retryRunsLegacyTool).toBe(true);
  });
  it('9. failed P3.1C evidence: the invented zero is caught and the legacy retry remains available', () => {
    const r = legacyFlow(SEPTEMBER, exec({ kind: 'cash_flow', status: 'failed' }), 'You spent $0 in September.');
    expect(r.validation).toBe('false_zero_ungrounded');
    expect(r.retryRunsLegacyTool).toBe(true);
  });
  it('verified (non-empty) legacy evidence still rejects a zero claim', () => {
    const fc = classifyFinancialQuery(SEPTEMBER);
    expect(validateGroundedAnswer('You spent $0 in September.', { grounded: true, queryStatus: 'verified' } as never, fc))
      .toBe('false_zero_without_evidence');
  });
  it('10. refund unsupported-subject protection unchanged (no legacy plan, no hard stop)', () => {
    const fc = classifyFinancialQuery('How much was refunded last month?');
    expect(buildPreExecutionPlan(fc, 2026).shouldPreExecute).toBe(false);
    expect(validateGroundedAnswer('There were no refunds.', { grounded: false } as never, fc)).toBeNull();
  });
});

describe('CP4.1 existing suppression mapping unchanged', () => {
  it('11. cash_flow suppresses tax_summary only', () => {
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'cash_flow', status: 'resolved' }), 'tax_summary')).toBe(true);
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'cash_flow', status: 'successful_empty' }), 'tax_summary')).toBe(true);
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'cash_flow', status: 'resolved' }), 'tx_search')).toBe(false);
  });
  it('12. category_aggregation suppresses tax_summary, not tx_search', () => {
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'category_aggregation', status: 'resolved' }), 'tax_summary')).toBe(true);
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'category_aggregation', status: 'successful_empty' }), 'tax_summary')).toBe(true);
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'category_aggregation', status: 'resolved' }), 'tx_search')).toBe(false);
  });
  it('13. transaction_data suppresses tx_search and tax_summary; failures suppress nothing', () => {
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'transaction_data', status: 'resolved' }), 'tx_search')).toBe(true);
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'transaction_data', status: 'successful_empty' }), 'tax_summary')).toBe(true);
    expect(shouldSuppressLegacyPreExec(exec({ kind: 'transaction_data', status: 'failed' }), 'tx_search')).toBe(false);
  });
});

describe('CP4.1 chat.ts wiring (structural)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');

  it('the P3.1C suppression branch uses the proven status and never fabricates verified', () => {
    expect(chat).not.toContain("financialEvidence = { grounded: true, toolName: plan.toolName as any, queryStatus: 'verified', fromContext: false };");
    expect(chat).toContain("const gateQueryStatus = p31cSuppressed ? legacyQueryStatusFromP31C(p31cResult, plan.toolName!) : 'verified';");
    expect(chat).toContain('? { grounded: true, toolName: plan.toolName as any, queryStatus: gateQueryStatus, fromContext: false }');
    expect(chat).toContain(': { grounded: false };');
  });
  it('the false-zero retry is gated by the existing suppression function', () => {
    expect(chat).toContain('const p31cRetrySuppressed = plan.toolName ? shouldSuppressLegacyPreExec(p31cResult, plan.toolName) : false;');
    expect(chat).toContain('if (!p31cRetrySuppressed && plan.shouldPreExecute && plan.toolName && toolModules[plan.toolName] && !untrustedMerchantRetry) {');
  });
  it('unproven scoped evidence gets the honest could-not-confirm fallback, not "I found financial data"', () => {
    expect(chat).toContain('retryBlockedByP31C && !financialEvidence.grounded');
    expect(chat).toContain("I wasn't able to confirm a reliable result for that period from your imported data");
  });
  it('financial-grounding.ts no longer carries the bare $0 token pattern', () => {
    const grounding = fs.readFileSync(path.resolve(__dirname, '../financial-grounding.ts'), 'utf8');
    expect(grounding).not.toContain('/\\$0(\\.00)?\\b/');
    expect(grounding).toContain('assertsOnlyZeroAmounts(response) || FALSE_ZERO_PATTERNS.some');
  });
});
