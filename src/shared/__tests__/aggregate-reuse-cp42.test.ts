/**
 * Prime V1-A CP4.2 — aggregate evidence reuse.
 *
 * Live: "How much did I spend in September?" — P3.1C ran cash_flow_summary
 * {2026-09-01..2026-09-30} (authoritative, complete, empty, sufficient), but the tool
 * stayed model-visible, so o4-mini re-ran the identical call and needed a second round
 * trip. CP4.2: aggregate evidence states its scope, and an exactly-satisfied aggregate
 * tool is not exposed to the model. Production pipeline only (classifier → temporal
 * scope → contract → plan → real P3.1C executor with an injected tool runner).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyPrimeIntent } from '../prime-intent-classifier';
import { buildTemporalScope } from '../prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../prime-evidence-contract';
import { buildEvidencePlan, type PrimeEvidencePlan } from '../prime-evidence-resolver';
import {
  executeEvidencePlan,
  buildEvidenceContextMessage,
  satisfiedAggregateEvidenceKinds,
  lookupP31CCachedResult,
  legacyQueryStatusFromP31C,
  shouldSuppressLegacyPreExec,
  buildDedupKey,
  AGGREGATE_EVIDENCE_TOOLS,
  type DedupCache,
  type PrimeEvidenceExecutionResult,
} from '../prime-evidence-executor';
import { analyzeQueryScope } from '../tool-gate';
import { buildPreExecutionPlan, validateGroundedAnswer } from '../financial-grounding';
import { classifyFinancialQuery } from '../financial-query-classifier';

const REF = new Date('2026-10-01T18:00:00Z');
const CTX = { timezone: 'America/Edmonton', referenceDate: REF };
const AVAIL = { memoryLoaded: false, memoryFactCount: 0, conversationHistoryLoaded: false, candidateIdentityAvailable: false, pipelineSnapshotLoaded: false };

// Representative Prime tool list: every tool CP4.2 must leave alone, plus the two it owns.
const PRIME_TOOLS = [
  'tx_search', 'tx_get', 'select_transaction', 'merchant_totals', 'merchant_analysis_refine',
  'update_transaction_category', 'request_confirmation', 'delegate_to_employee',
  'account_balances', 'goals_list', 'forecast_cash_flow', 'tax_summary',
  'cash_flow_summary', 'transaction_category_totals',
];

type Completeness = { dataComplete?: boolean; truncated?: boolean; authoritative?: boolean; classificationComplete?: boolean; rowsFetched?: number };
type RunnerOpts = {
  cashFlowCount?: number; queryStatus?: string; completeness?: Completeness;
  categoryEntries?: number; categoryQueryStatus?: string; fail?: string;
};

/** Injected tool runner returning the real CP3 output shapes. */
function runner(o: RunnerOpts = {}) {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const exec = async (tool: string, args: Record<string, unknown>) => {
    calls.push({ tool, args });
    if (o.fail === tool) return { error: 'boom' };
    if (tool === 'cash_flow_summary') {
      const n = o.cashFlowCount ?? 0;
      return {
        startDate: args.startDate, endDate: args.endDate,
        income: 0, spending: n ? 4250 : 0, nonSpend: 0, netCashFlow: n ? -4250 : 0,
        transactionCount: n, incomeTransactionCount: 0, spendingTransactionCount: n, nonSpendTransactionCount: 0,
        queryStatus: o.queryStatus ?? (n ? 'verified' : 'verified_zero'),
        completeness: { dataComplete: true, truncated: false, authoritative: true, classificationComplete: true, rowsFetched: n, ...o.completeness },
      };
    }
    if (tool === 'transaction_category_totals') {
      const n = o.categoryEntries ?? 2;
      return {
        categoryTotals: Array.from({ length: n }, (_, i) => ({ category: `C${i}`, totalAmount: 10 * (i + 1), transactionCount: 1 })),
        queryStatus: o.categoryQueryStatus ?? 'verified',
        completeness: { dataComplete: true, truncated: false, authoritative: true, classificationComplete: true, rowsFetched: n, ...o.completeness },
      };
    }
    return { rows: [{ id: 'r1' }], queryStatus: 'verified' };
  };
  return { exec, calls };
}

async function run(message: string, o: RunnerOpts = {}, ext: { candidateFollowUpDetected?: boolean } = {}) {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: !!ext.candidateFollowUpDetected, historicalReferenceDetected: false });
  const ts = buildTemporalScope(message, CTX, intent.financialClassification?.years);
  const contract = buildRuntimeEvidenceContract(intent, AVAIL, ts ?? undefined);
  const plan: PrimeEvidencePlan = buildEvidencePlan(contract, intent);
  const r = runner(o);
  const cache: DedupCache = new Map();
  const result = await executeEvidencePlan(plan, r.exec, cache);
  const kinds = satisfiedAggregateEvidenceKinds({
    plan, result, financialClassification: intent.financialClassification, temporalScope: ts, queryScope: analyzeQueryScope(message),
  });
  const satisfiedTools = new Set<string>(kinds.map(k => AGGREGATE_EVIDENCE_TOOLS[k]));
  // the exact filter both chat.ts builders apply (after the existing P3.3A/P3.3B tx_search strip)
  const modelTools = PRIME_TOOLS.filter(t => !satisfiedTools.has(t));
  return { intent, ts, plan, result, kinds, satisfiedTools, modelTools, calls: r.calls, cache, context: buildEvidenceContextMessage(result) ?? '' };
}

const SEPT = 'How much did I spend in September?';
const BREAKDOWN = 'Category breakdown for September.';

describe('CP4.2 aggregate evidence satisfied', () => {
  it('1. complete authoritative resolved cash_flow → satisfied', async () => {
    expect((await run(SEPT, { cashFlowCount: 12 })).kinds).toEqual(['cash_flow']);
  });
  it('2. complete authoritative successful_empty cash_flow → satisfied', async () => {
    const r = await run(SEPT);
    expect(r.result.results[0].status).toBe('successful_empty');
    expect(r.kinds).toEqual(['cash_flow']);
  });
  it('3. partial cash_flow → NOT satisfied', async () => {
    expect((await run(SEPT, { queryStatus: 'partial', completeness: { truncated: true, dataComplete: false } })).kinds).toEqual([]);
  });
  it('4. non-authoritative cash_flow → NOT satisfied', async () => {
    const r = await run(SEPT, { cashFlowCount: 3 });
    const nonAuth = { ...r.result, results: r.result.results.map(x => ({ ...x, authoritative: false })) };
    expect(satisfiedAggregateEvidenceKinds({ plan: r.plan, result: nonAuth, financialClassification: r.intent.financialClassification, temporalScope: r.ts, queryScope: analyzeQueryScope(SEPT) })).toEqual([]);
  });
  it('5. failed cash_flow → NOT satisfied', async () => {
    expect((await run(SEPT, { fail: 'cash_flow_summary' })).kinds).toEqual([]);
  });
  it('6. unresolved cash_flow (no period) → NOT satisfied', async () => {
    const r = await run('How much did I spend?');
    expect(r.plan.unresolved.length).toBeGreaterThan(0);
    expect(r.kinds).toEqual([]);
  });
  it('7. classificationComplete:false cash_flow → NOT satisfied', async () => {
    expect((await run(SEPT, { cashFlowCount: 4, completeness: { classificationComplete: false } })).kinds).toEqual([]);
  });
  it('8. sufficient category_aggregation → satisfied', async () => {
    expect((await run(BREAKDOWN)).kinds).toEqual(['category_aggregation']);
  });
  it('9. partial category_aggregation → NOT satisfied', async () => {
    expect((await run(BREAKDOWN, { categoryQueryStatus: 'partial' })).kinds).toEqual([]);
  });
  it('scope mismatch → NOT satisfied (result for a different period than the plan step)', async () => {
    const r = await run(SEPT);
    const shifted = { ...r.result, results: r.result.results.map(x => ({ ...x, scope: { startDate: '2026-08-01', endDate: '2026-08-31' } })) };
    expect(satisfiedAggregateEvidenceKinds({ plan: r.plan, result: shifted, financialClassification: r.intent.financialClassification, temporalScope: r.ts, queryScope: analyzeQueryScope(SEPT) })).toEqual([]);
  });
  it('insufficient overall sufficiency → NOT satisfied', async () => {
    const r = await run(SEPT);
    const insufficient = { ...r.result, overallSufficiency: 'partial' } as PrimeEvidenceExecutionResult;
    expect(satisfiedAggregateEvidenceKinds({ plan: r.plan, result: insufficient, financialClassification: r.intent.financialClassification, temporalScope: r.ts, queryScope: analyzeQueryScope(SEPT) })).toEqual([]);
  });
});

describe('CP4.2 evidence context states the authoritative scope', () => {
  it('10. September successful_empty context includes 2026-09-01 and 2026-09-30', async () => {
    const r = await run(SEPT);
    expect(r.context).toContain('[cash_flow] status=successful_empty authoritative=true tool=cash_flow_summary period=2026-09-01 through 2026-09-30');
  });
  it('11. the period comes from execution scope, not month text', async () => {
    const aug = await run('How much did I spend in August?');
    expect(aug.context).toContain('period=2026-08-01 through 2026-08-31');
    const range = await run('How much did I spend from September 3 to September 17?');
    expect(range.context).toContain('period=2026-09-03 through 2026-09-17');
    expect(range.context).not.toMatch(/september/i);
    expect(r_scope(range.result)).toEqual({ startDate: '2026-09-03', endDate: '2026-09-17' });
  });
  it('resolved aggregate evidence also carries its scope', async () => {
    expect((await run(SEPT, { cashFlowCount: 5 })).context).toContain('[cash_flow] status=resolved authoritative=true tool=cash_flow_summary period=2026-09-01 through 2026-09-30');
  });
});
const r_scope = (res: PrimeEvidenceExecutionResult) => res.results[0].scope;

describe('CP4.2 removes ONLY satisfied aggregate tools', () => {
  it('12. satisfied cash_flow removes cash_flow_summary only', async () => {
    const r = await run(SEPT);
    expect([...r.satisfiedTools]).toEqual(['cash_flow_summary']);
    expect(r.modelTools).toEqual(PRIME_TOOLS.filter(t => t !== 'cash_flow_summary'));
  });
  it('13. satisfied category aggregation removes transaction_category_totals only', async () => {
    const r = await run(BREAKDOWN);
    expect(r.modelTools).toEqual(PRIME_TOOLS.filter(t => t !== 'transaction_category_totals'));
  });
  it('14. both satisfied remove only those two tools', () => {
    const plan = {
      intent: 'financial_data_lookup', unresolved: [],
      steps: [
        { evidenceKind: 'cash_flow', mode: 'tool', tool: 'cash_flow_summary', params: { startDate: '2026-09-01', endDate: '2026-09-30' }, authoritative: true, source: 's' },
        { evidenceKind: 'category_aggregation', mode: 'tool', tool: 'transaction_category_totals', params: { startDate: '2026-09-01', endDate: '2026-09-30' }, authoritative: true, source: 's' },
      ],
    } as unknown as PrimeEvidencePlan;
    const scope = { startDate: '2026-09-01', endDate: '2026-09-30' };
    const result = {
      intent: 'financial_data_lookup', overallSufficiency: 'sufficient',
      results: [
        { evidenceKind: 'cash_flow', status: 'successful_empty', authoritative: true, source: 's', tool: 'cash_flow_summary', data: { queryStatus: 'verified_zero' }, scope },
        { evidenceKind: 'category_aggregation', status: 'resolved', authoritative: true, source: 's', tool: 'transaction_category_totals', data: { queryStatus: 'verified' }, scope },
      ],
    } as unknown as PrimeEvidenceExecutionResult;
    const kinds = satisfiedAggregateEvidenceKinds({ plan, result, financialClassification: { requestShape: 'aggregate', queryType: 'aggregate' }, temporalScope: null, queryScope: analyzeQueryScope(SEPT) });
    const tools = new Set<string>(kinds.map(k => AGGREGATE_EVIDENCE_TOOLS[k]));
    expect(PRIME_TOOLS.filter(t => !tools.has(t))).toEqual(PRIME_TOOLS.filter(t => t !== 'cash_flow_summary' && t !== 'transaction_category_totals'));
  });
  it('15–18. tx_search, select_transaction, merchant, mutation/confirmation and other tools remain', async () => {
    const r = await run(SEPT);
    for (const t of ['tx_search', 'tx_get', 'select_transaction', 'merchant_totals', 'merchant_analysis_refine',
      'update_transaction_category', 'request_confirmation', 'delegate_to_employee', 'account_balances',
      'goals_list', 'forecast_cash_flow', 'tax_summary']) {
      expect(r.modelTools).toContain(t);
    }
  });
});

describe('CP4.2 request-shape safety', () => {
  it('19. a list request keeps transaction capability (nothing removed)', async () => {
    const r = await run('How much did I spend in September and list the transactions?');
    expect(r.kinds).toEqual([]);
    expect(r.modelTools).toEqual(PRIME_TOOLS);
  });
  it('20. a merchant request is not hijacked by generic aggregate suppression', async () => {
    const r = await run('How much did I spend at Costco in September?');
    expect(r.intent.financialClassification?.queryType).toBe('merchant');
    expect(r.kinds).toEqual([]);
    expect(r.modelTools).toEqual(PRIME_TOOLS);
  });
  it('21. a comparison whose second period was not executed keeps the aggregate tool', async () => {
    // CP4 plans only the primary cash_flow period here; the comparison period is in the temporal scope.
    const r = await run('How much did I spend in September compared with August?');
    expect(r.plan.steps.some(s => s.tool === 'cash_flow_summary')).toBe(true);
    expect(r.ts?.comparison).toBeTruthy();
    expect(r.kinds).toEqual([]);
    expect(r.modelTools).toContain('cash_flow_summary');
  });
  it('22. a two-period comparison is never treated as satisfied in CP4.2 (conservative)', async () => {
    const r = await run('Compare my spending this month and last month.');
    expect(r.kinds).toEqual([]);
    expect(r.modelTools).toContain('cash_flow_summary');
    expect(r.modelTools).toContain('transaction_category_totals');
  });
  it('a mutation request keeps identity / mutation tools and removes nothing', async () => {
    const r = await run('How much did I spend in September and change the third transaction to Shopping?');
    expect(r.kinds).toEqual([]);
    expect(r.modelTools).toEqual(PRIME_TOOLS);
  });
  it('candidate follow-ups never plan aggregates, so nothing is removed', async () => {
    const r = await run('What was the total of those?', {}, { candidateFollowUpDetected: true });
    expect(r.kinds).toEqual([]);
  });
});

describe('CP4.2 September live reproduction', () => {
  it('23. one P3.1C call, empty, scoped context, cash_flow_summary not model-visible', async () => {
    const r = await run(SEPT);
    expect(r.calls).toEqual([{ tool: 'cash_flow_summary', args: { startDate: '2026-09-01', endDate: '2026-09-30' } }]);
    expect(r.result.overallSufficiency).toBe('sufficient');
    expect(r.result.results[0]).toMatchObject({ evidenceKind: 'cash_flow', status: 'successful_empty', authoritative: true });
    expect(r.context).toContain('period=2026-09-01 through 2026-09-30');
    expect(r.modelTools).not.toContain('cash_flow_summary');
  });
  it('24. CP4.1 verified_zero unchanged', async () => {
    const r = await run(SEPT);
    expect(legacyQueryStatusFromP31C(r.result, 'tax_summary')).toBe('verified_zero');
    expect(shouldSuppressLegacyPreExec(r.result, 'tax_summary')).toBe(true);
  });
  it('25. CP4.1 false-zero protection unchanged', async () => {
    const fc = classifyFinancialQuery(SEPT);
    const honest = 'I found no matching spending transactions in the currently imported data for September 2026.';
    expect(validateGroundedAnswer(honest, { grounded: true, queryStatus: 'verified_zero' } as never, fc)).toBeNull();
    expect(validateGroundedAnswer(honest, { grounded: false } as never, fc)).toBe('false_zero_ungrounded');
  });
  it('26. refund behaviour unchanged (no plan, no legacy pre-run, nothing removed)', async () => {
    const r = await run('How much was refunded last month?');
    expect(r.calls).toEqual([]);
    expect(r.kinds).toEqual([]);
    expect(buildPreExecutionPlan(classifyFinancialQuery('How much was refunded last month?'), 2026).shouldPreExecute).toBe(false);
  });
});

describe('CP4.2 model-loop exact-call cache (secondary defence)', () => {
  it('27. an exact duplicate cash_flow_summary reuses the P3.1C cache', async () => {
    const r = await run(SEPT);
    const hit = lookupP31CCachedResult(r.cache, 'cash_flow_summary', { endDate: '2026-09-30', startDate: '2026-09-01' });
    expect(hit).toBeDefined();
    expect((hit!.data as Record<string, unknown>).transactionCount).toBe(0);
  });
  it('28. different date args do NOT reuse the cache', async () => {
    const r = await run(SEPT);
    expect(lookupP31CCachedResult(r.cache, 'cash_flow_summary', { startDate: '2026-08-01', endDate: '2026-08-31' })).toBeUndefined();
    expect(lookupP31CCachedResult(r.cache, 'cash_flow_summary', { startDate: '2026-09-01', endDate: '2026-09-29' })).toBeUndefined();
  });
  it('29. partial cached cash flow is not reused; failed calls are never cached', async () => {
    const partial = await run(SEPT, { queryStatus: 'partial', completeness: { truncated: true } });
    expect(partial.cache.size).toBe(1);
    expect(lookupP31CCachedResult(partial.cache, 'cash_flow_summary', { startDate: '2026-09-01', endDate: '2026-09-30' })).toBeUndefined();
    const failed = await run(SEPT, { fail: 'cash_flow_summary' });
    expect(failed.cache.size).toBe(0);
    expect(lookupP31CCachedResult(failed.cache, 'cash_flow_summary', { startDate: '2026-09-01', endDate: '2026-09-30' })).toBeUndefined();
  });
  it('30. transaction_category_totals / tx_search exact duplicates keep the existing reuse; other tools never', async () => {
    const r = await run(BREAKDOWN);
    expect(lookupP31CCachedResult(r.cache, 'transaction_category_totals', { startDate: '2026-09-01', endDate: '2026-09-30' })).toBeDefined();
    const cache: DedupCache = new Map([[buildDedupKey('tx_search', { q: 'x' }), { data: { rows: [] }, rowCount: 0 }]]);
    expect(lookupP31CCachedResult(cache, 'tx_search', { q: 'x' })).toBeDefined();
    cache.set(buildDedupKey('merchant_totals', { merchant: 'x' }), { data: {}, rowCount: 1 });
    expect(lookupP31CCachedResult(cache, 'merchant_totals', { merchant: 'x' })).toBeUndefined();
  });
});

describe('CP4.2 chat.ts wiring (structural)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
  it('both Prime tool builders apply only the satisfied-aggregate filter', () => {
    expect(chat.match(/\)\.filter\(t => !satisfiedAggregateTools\.has\(t\)\); \/\/ V1-A CP4\.2/g)?.length).toBe(2);
    expect(chat).toContain('satisfiedAggregateEvidenceKinds({');
    expect(chat).toContain('}).map(kind => AGGREGATE_EVIDENCE_TOOLS[kind])');
  });
  it('the three model-loop cache sites use the shared exact-call lookup', () => {
    expect(chat.match(/lookupP31CCachedResult\(p31cDedupCache, toolName, args as Record<string, unknown>\)/g)?.length).toBe(3);
    expect(chat).not.toContain("(toolName === 'tx_search' || toolName === 'transaction_category_totals')\n");
  });
  it('the existing P3.3A / P3.3B tx_search strip is unchanged', () => {
    expect(chat.match(/const stripTxSearch = merchantAggSatisfied \|\| b2cCandidatesSatisfied;/g)?.length).toBe(2);
  });
});
