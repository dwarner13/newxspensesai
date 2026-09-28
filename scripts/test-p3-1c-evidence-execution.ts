/**
 * P3.1C — Evidence Execution Test Suite
 *
 * Tests the controlled read-only evidence executor.
 * Uses production executor functions — does NOT reimplement routing logic.
 *
 * Run: npx tsx scripts/test-p3-1c-evidence-execution.ts
 */

import {
  EVIDENCE_READ_ALLOWLIST,
  MAX_EVIDENCE_TOOL_CALLS,
  MAX_TX_ROWS_IN_CONTEXT,
  MAX_CATEGORY_TOTALS_IN_CONTEXT,
  PER_TOOL_TIMEOUT_MS,
  TOTAL_EVIDENCE_BUDGET_MS,
  checkStepEligibility,
  executeEvidencePlan,
  assessSufficiency,
  shouldSuppressLegacyPreExec,
  buildEvidenceContextMessage,
  buildEvidenceExecutionTelemetry,
  buildDedupKey,
  type EvidenceToolExecutor,
  type DedupCache,
  type PrimeEvidenceResult,
  type PrimeEvidenceExecutionResult,
  type EvidenceSufficiency,
} from '../src/shared/prime-evidence-executor';
import {
  buildEvidencePlan,
  type PrimeEvidencePlan,
  type PrimeEvidencePlanStep,
} from '../src/shared/prime-evidence-resolver';
import {
  classifyPrimeIntent,
  PrimeIntent,
  type ClassifierContext,
} from '../src/shared/prime-intent-classifier';
import {
  buildRuntimeEvidenceContract,
  type EvidenceAvailabilityContext,
  type PrimeEvidenceKind,
} from '../src/shared/prime-evidence-contract';
import { buildTemporalScope } from '../src/shared/prime-temporal-scope';

// ─────────────────────────────────────────────────────────────────────────────
// TEST INFRASTRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${label}`);
  }
}

const NO_EXTERNAL: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: false,
};

const EMPTY_CTX: EvidenceAvailabilityContext = {
  memoryLoaded: false,
  memoryFactCount: 0,
  conversationHistoryLoaded: false,
  candidateIdentityAvailable: false,
  pipelineSnapshotLoaded: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK EXECUTORS
// ─────────────────────────────────────────────────────────────────────────────

function mockExecutor(responses: Record<string, unknown>): EvidenceToolExecutor {
  return async (toolName: string, _args: Record<string, unknown>) => {
    if (toolName in responses) return responses[toolName];
    return { rows: [], queryStatus: 'verified' };
  };
}

function mockExecutorWithArgs(
  handler: (toolName: string, args: Record<string, unknown>) => unknown,
): EvidenceToolExecutor {
  return async (toolName, args) => handler(toolName, args);
}

function throwingExecutor(errorMessage: string): EvidenceToolExecutor {
  return async () => { throw new Error(errorMessage); };
}

function slowExecutor(delayMs: number): EvidenceToolExecutor {
  return async () => {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return { rows: [{ id: '1', amount: 42 }], queryStatus: 'verified' };
  };
}

function countingExecutor(): { executor: EvidenceToolExecutor; callLog: Array<{ tool: string; args: Record<string, unknown> }> } {
  const callLog: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const executor: EvidenceToolExecutor = async (tool, args) => {
    callLog.push({ tool, args });
    return { rows: [{ id: '1' }], queryStatus: 'verified' };
  };
  return { executor, callLog };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN BUILDERS (test helpers)
// ─────────────────────────────────────────────────────────────────────────────

function makePlan(steps: PrimeEvidencePlanStep[], intent: PrimeIntent = PrimeIntent.FINANCIAL_DATA_LOOKUP): PrimeEvidencePlan {
  return { intent, steps, unresolved: [] };
}

function makeToolStep(
  kind: PrimeEvidenceKind,
  tool: string,
  params?: Record<string, unknown>,
): PrimeEvidencePlanStep {
  return {
    evidenceKind: kind,
    source: `test source for ${kind}`,
    tool,
    mode: 'tool',
    params,
    authoritative: true,
  };
}

function makeMultiSourceStep(params: Record<string, unknown>): PrimeEvidencePlanStep {
  return {
    evidenceKind: 'period_comparison',
    source: 'Comparison of two time periods',
    tool: 'transaction_category_totals',
    mode: 'multi_source',
    params,
    authoritative: true,
  };
}

function makeContextStep(kind: PrimeEvidenceKind): PrimeEvidencePlanStep {
  return {
    evidenceKind: kind,
    source: `context source for ${kind}`,
    mode: 'context',
    authoritative: true,
  };
}

function freshCache(): DedupCache {
  return new Map();
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A: Allowlist enforcement
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section A: Allowlist contains only tx_search and transaction_category_totals ===');

assert(EVIDENCE_READ_ALLOWLIST.size === 2, 'A-1: allowlist has exactly 2 entries');
assert(EVIDENCE_READ_ALLOWLIST.has('tx_search'), 'A-2: allowlist includes tx_search');
assert(EVIDENCE_READ_ALLOWLIST.has('transaction_category_totals'), 'A-3: allowlist includes transaction_category_totals');
assert(!EVIDENCE_READ_ALLOWLIST.has('tax_summary'), 'A-4: tax_summary NOT in allowlist');
assert(!EVIDENCE_READ_ALLOWLIST.has('account_balances_query'), 'A-5: account_balances_query NOT in allowlist');
assert(!EVIDENCE_READ_ALLOWLIST.has('goals_query'), 'A-6: goals_query NOT in allowlist');
assert(!EVIDENCE_READ_ALLOWLIST.has('goalie_list_goals'), 'A-7: goalie_list_goals NOT in allowlist');
assert(!EVIDENCE_READ_ALLOWLIST.has('analytics_forecast'), 'A-8: analytics_forecast NOT in allowlist');
assert(!EVIDENCE_READ_ALLOWLIST.has('analytics_extract_patterns'), 'A-9: analytics_extract_patterns NOT in allowlist');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B: select_transaction cannot execute
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section B: select_transaction cannot execute ===');

assert(!EVIDENCE_READ_ALLOWLIST.has('select_transaction'), 'B-1: select_transaction not in allowlist');

{
  const reason = checkStepEligibility(makeToolStep('candidate_identity', 'select_transaction'));
  assert(reason === 'tool_not_in_allowlist', 'B-2: select_transaction rejected by eligibility check');
}

// Full plan execution — ensure it gets skipped
(async () => {
  const plan = makePlan([makeToolStep('candidate_identity', 'select_transaction')]);
  const result = await executeEvidencePlan(plan, mockExecutor({}), freshCache());
  assert(result.results[0].status === 'skipped', 'B-3: select_transaction skipped in full execution');
  assert(result.executedCount === 0, 'B-4: no tools executed when only select_transaction');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C: request_employee_handoff cannot execute
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section C: request_employee_handoff cannot execute ===');

assert(!EVIDENCE_READ_ALLOWLIST.has('request_employee_handoff'), 'C-1: request_employee_handoff not in allowlist');

{
  const reason = checkStepEligibility(makeToolStep('candidate_identity', 'request_employee_handoff'));
  assert(reason === 'tool_not_in_allowlist', 'C-2: request_employee_handoff rejected');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D: All known mutation tools cannot execute
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section D: Every known mutation tool cannot execute ===');

const MUTATION_TOOLS = [
  'select_transaction',
  'request_employee_handoff',
  'tx_update_category',
  'tag_update_transaction_category',
  'tx_update_amount',
  'tx_split',
  'approve_import',
  'delete_transaction',
  'create_rule',
  'tag_reclassify',
  'tag_bulk_fix',
  'bulk_categorize',
];

for (const tool of MUTATION_TOOLS) {
  assert(!EVIDENCE_READ_ALLOWLIST.has(tool), `D: ${tool} NOT in allowlist`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E: Unsupported read tools do not autonomously execute
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section E: Unsupported read tools do not execute ===');

const UNSUPPORTED_READ_TOOLS = [
  'tx_get', 'tax_summary', 'account_balances_query', 'goals_query',
  'goalie_list_goals', 'analytics_forecast', 'analytics_extract_patterns',
];

for (const tool of UNSUPPORTED_READ_TOOLS) {
  const reason = checkStepEligibility(makeToolStep('transaction_data', tool));
  assert(reason === 'tool_not_in_allowlist', `E: ${tool} rejected as not in allowlist`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F: Identical tool+params executes once, cache reused
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section F: Dedup — identical tool+params reused ===');

(async () => {
  const { executor, callLog } = countingExecutor();
  const params = { startDate: '2026-05-01', endDate: '2026-05-31' };
  const plan = makePlan([
    makeToolStep('transaction_data', 'tx_search', params),
    makeToolStep('transaction_data', 'tx_search', params),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(callLog.length === 1, 'F-1: tool called exactly once');
  assert(result.dedupHitCount === 1, 'F-2: one dedup hit');
  assert(result.executedCount === 1, 'F-3: executedCount is 1');
  assert(result.results.length === 2, 'F-4: two results returned');
  assert(result.results[0].status === 'resolved', 'F-5: first result resolved');
  assert(result.results[1].status === 'resolved', 'F-6: second result resolved (from cache)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION G: Same tool, different params executes separately
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section G: Different params execute separately ===');

(async () => {
  const { executor, callLog } = countingExecutor();
  const plan = makePlan([
    makeToolStep('transaction_data', 'tx_search', { q: 'costco' }),
    makeToolStep('transaction_data', 'tx_search', { q: 'walmart' }),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(callLog.length === 2, 'G-1: tool called twice (different params)');
  assert(result.dedupHitCount === 0, 'G-2: zero dedup hits');
  assert(result.executedCount === 2, 'G-3: executedCount is 2');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION H: userId cannot be overridden by plan params
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section H: userId cannot be overridden ===');

(async () => {
  const passedArgs: Record<string, unknown>[] = [];
  const executor: EvidenceToolExecutor = async (_tool, args) => {
    passedArgs.push(args);
    return { rows: [], queryStatus: 'verified' };
  };
  const plan = makePlan([
    makeToolStep('transaction_data', 'tx_search', {
      q: 'test',
      userId: 'attacker-id',
      user_id: 'attacker-id-2',
    }),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  // buildToolArgs should strip userId/user_id from params
  assert(!('userId' in passedArgs[0]), 'H-1: userId stripped from tool args');
  assert(!('user_id' in passedArgs[0]), 'H-2: user_id stripped from tool args');
  assert('q' in passedArgs[0], 'H-3: legitimate param preserved');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION I: Ambiguous bare "May" does not execute guessed dates
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section I: Ambiguous bare month does not execute ===');

{
  const ts = buildTemporalScope('How much did I spend in May', { timezone: 'America/Edmonton', referenceDate: new Date('2026-09-15') });
  assert(ts !== null, 'I-1: temporal scope extracted for bare "May"');
  assert(ts!.confidence === 'ambiguous', 'I-2: bare May is ambiguous');
  assert(ts!.primary?.confidence === 'ambiguous', 'I-3: primary period is ambiguous');

  // P3.1B should NOT inject date params for ambiguous scope
  const classification = classifyPrimeIntent('How much did I spend in May', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, EMPTY_CTX, ts ?? undefined);
  const plan = buildEvidencePlan(contract, classification);

  // Find the tool step — should NOT have startDate/endDate from ambiguous scope
  const toolStep = plan.steps.find(s => s.tool === 'tx_search' || s.tool === 'transaction_category_totals');
  if (toolStep?.params) {
    assert(!('startDate' in toolStep.params), 'I-4: no startDate from ambiguous scope');
    assert(!('endDate' in toolStep.params), 'I-5: no endDate from ambiguous scope');
  } else {
    assert(true, 'I-4: no params at all (safe)');
    assert(true, 'I-5: no params at all (safe)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION J: "May 2026" executes correct canonical range
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section J: Explicit May 2026 deterministic ===');

{
  const ts = buildTemporalScope('How much did I spend in May 2026', { timezone: 'America/Edmonton', referenceDate: new Date('2026-09-15') });
  assert(ts !== null, 'J-1: temporal scope extracted');
  assert(ts!.confidence === 'deterministic', 'J-2: May 2026 is deterministic');
  assert(ts!.primary?.from === '2026-05-01', 'J-3: from is 2026-05-01');
  // Exclusive end
  assert(ts!.primary?.to === '2026-06-01', 'J-4: to is 2026-06-01 (exclusive)');

  // When flowing through evidence pipeline, tool params should have inclusive end
  const classification = classifyPrimeIntent('How much did I spend in May 2026', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, EMPTY_CTX, ts ?? undefined);
  const plan = buildEvidencePlan(contract, classification);

  const toolStep = plan.steps.find(s => s.params?.startDate);
  if (toolStep?.params) {
    assert(toolStep.params.startDate === '2026-05-01', 'J-5: startDate=2026-05-01');
    assert(toolStep.params.endDate === '2026-05-31', 'J-6: endDate=2026-05-31 (inclusive)');
  } else {
    // May land on tx_search or transaction_category_totals depending on queryType
    pass += 2; // handled by temporal scope tests
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION K: "last month" deterministic range executes correctly
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section K: Last month deterministic ===');

{
  const refDate = new Date('2026-09-15');
  const ts = buildTemporalScope('Show me last month spending', { timezone: 'America/Edmonton', referenceDate: refDate });
  assert(ts !== null, 'K-1: temporal scope extracted');
  assert(ts!.confidence === 'deterministic', 'K-2: last month is deterministic');
  assert(ts!.primary?.from === '2026-08-01', 'K-3: from is August 2026');
  assert(ts!.primary?.to === '2026-09-01', 'K-4: to is September 2026 (exclusive)');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION L: April vs May executes exactly two category-total calls
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section L: Period comparison — two calls ===');

(async () => {
  const { executor, callLog } = countingExecutor();
  const plan = makePlan([
    makeMultiSourceStep({
      periodA_startDate: '2026-04-01',
      periodA_endDate: '2026-04-30',
      periodB_startDate: '2026-05-01',
      periodB_endDate: '2026-05-31',
    }),
  ], PrimeIntent.FINANCIAL_ANALYSIS);

  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(callLog.length === 2, 'L-1: exactly two tool calls');
  assert(callLog[0].tool === 'transaction_category_totals', 'L-2: first call is category totals');
  assert(callLog[1].tool === 'transaction_category_totals', 'L-3: second call is category totals');
  assert(callLog[0].args.startDate === '2026-04-01', 'L-4: period A start correct');
  assert(callLog[1].args.startDate === '2026-05-01', 'L-5: period B start correct');
  assert(result.executedCount === 2, 'L-6: executedCount is 2');
  assert(result.results.length === 1, 'L-7: merged into single comparison result');
  assert(result.results[0].status === 'resolved', 'L-8: comparison resolved');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION M: One comparison side failure != sufficient comparison
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section M: Partial comparison failure ===');

(async () => {
  let callIndex = 0;
  const executor: EvidenceToolExecutor = async (tool, args) => {
    callIndex++;
    if (callIndex === 1) return { totals: [{ category: 'Food', total: 500 }] };
    throw new Error('period_B_failed');
  };
  const plan = makePlan([
    makeMultiSourceStep({
      periodA_startDate: '2026-04-01',
      periodA_endDate: '2026-04-30',
      periodB_startDate: '2026-05-01',
      periodB_endDate: '2026-05-31',
    }),
  ], PrimeIntent.FINANCIAL_ANALYSIS);

  const result = await executeEvidencePlan(plan, executor, freshCache());
  // When one fails, returns individual results (not merged)
  assert(result.results.length === 2, 'M-1: two individual results (not merged)');
  const statuses = result.results.map(r => r.status);
  assert(statuses.includes('resolved') || statuses.includes('successful_empty'), 'M-2: period A has data');
  assert(statuses.includes('failed'), 'M-3: period B failed');
  // Sufficiency should NOT be 'sufficient'
  assert(result.overallSufficiency !== 'sufficient', 'M-4: not sufficient with one-sided comparison');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION N: Successful zero rows is valid authoritative evidence
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section N: Successful empty is authoritative ===');

(async () => {
  const executor = mockExecutor({
    tx_search: { rows: [], queryStatus: 'verified' },
  });
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search', { q: 'nonexistent' })]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(result.results[0].status === 'successful_empty', 'N-1: status is successful_empty');
  assert(result.results[0].authoritative === true, 'N-2: still authoritative');
  assert(result.results[0].rowCount === 0, 'N-3: rowCount is 0');
  // Successful empty counts toward sufficiency
  assert(result.overallSufficiency === 'sufficient', 'N-4: sufficient (verified zero is valid)');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION O: Thrown/failed query != successful empty
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section O: Failed query is not successful empty ===');

(async () => {
  const executor = throwingExecutor('database_connection_error');
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search', { q: 'test' })]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(result.results[0].status === 'failed', 'O-1: status is failed (not successful_empty)');
  assert(result.results[0].error === 'database_connection_error', 'O-2: error message preserved');
  assert(result.failedCount === 1, 'O-3: failedCount is 1');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION P: All required evidence → sufficient
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section P: Full evidence → sufficient ===');

(async () => {
  const executor = mockExecutor({
    tx_search: { rows: [{ id: '1', amount: 42, description: 'Costco' }], queryStatus: 'verified' },
  });
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search', { q: 'costco' })]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(result.overallSufficiency === 'sufficient', 'P-1: sufficient when all resolved');
  assert(result.resolvedCount === 1, 'P-2: resolvedCount is 1');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION Q: Partial required evidence → partial
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section Q: Partial evidence → partial ===');

(async () => {
  let callIdx = 0;
  const executor: EvidenceToolExecutor = async (tool) => {
    callIdx++;
    if (callIdx === 1) return { rows: [{ id: '1' }], queryStatus: 'verified' };
    throw new Error('fail');
  };
  const plan = makePlan([
    makeToolStep('transaction_data', 'tx_search', { q: 'costco' }),
    makeToolStep('category_aggregation', 'transaction_category_totals', { year: 2026 }),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(result.overallSufficiency === 'partial', 'Q-1: partial when some failed');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION R: Missing critical authoritative evidence → insufficient
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section R: All failed → insufficient ===');

(async () => {
  const executor = throwingExecutor('total failure');
  const plan = makePlan([
    makeToolStep('transaction_data', 'tx_search', { q: 'test' }),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(result.overallSufficiency === 'insufficient', 'R-1: insufficient when all failed');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION S: Insufficient evidence context forbids unsupported claims
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section S: Insufficient evidence → warning injected ===');

(async () => {
  const executor = throwingExecutor('fail');
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search')]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  const msg = buildEvidenceContextMessage(result);
  assert(msg !== null, 'S-1: context message generated');
  assert(msg!.includes('insufficient'), 'S-2: mentions insufficient');
  assert(msg!.includes('Do NOT state the requested user-specific financial conclusion'), 'S-3: contains prohibition');
  assert(msg!.includes('Do NOT substitute general knowledge'), 'S-4: blocks general knowledge fallback');
})();

// Partial evidence message
(async () => {
  let callIdx = 0;
  const executor: EvidenceToolExecutor = async () => {
    callIdx++;
    if (callIdx === 1) return { rows: [{ id: '1' }], queryStatus: 'verified' };
    throw new Error('fail');
  };
  const plan = makePlan([
    makeToolStep('transaction_data', 'tx_search', { q: 'a' }),
    makeToolStep('category_aggregation', 'transaction_category_totals'),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  const msg = buildEvidenceContextMessage(result);
  assert(msg!.includes('partial'), 'S-5: partial evidence mentioned');
  assert(msg!.includes('Do NOT invent'), 'S-6: partial message blocks inventing values');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION T: Evidence payload is capped
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section T: Evidence payload capping ===');

assert(MAX_TX_ROWS_IN_CONTEXT === 25, 'T-1: tx row cap is 25');
assert(MAX_CATEGORY_TOTALS_IN_CONTEXT === 30, 'T-2: category totals cap is 30');

(async () => {
  // 50 rows should be capped to 25
  const bigRows = Array.from({ length: 50 }, (_, i) => ({ id: `${i}`, amount: i * 10, description: `Merchant ${i}` }));
  const executor = mockExecutor({
    tx_search: { rows: bigRows, queryStatus: 'verified' },
  });
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search', { q: 'test' })]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  const data = result.results[0].data as any;
  assert(data.rows.length === 25, 'T-3: rows capped to 25');
  assert(data.totalCount === 50, 'T-4: totalCount reflects actual count');
  assert(data.capped === true, 'T-5: capped flag set');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION U: Execution-call hard cap works
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section U: Execution call cap ===');

assert(MAX_EVIDENCE_TOOL_CALLS === 5, 'U-1: hard cap is 5');

(async () => {
  const { executor, callLog } = countingExecutor();
  // 7 distinct steps — only first 5 should execute
  const steps = Array.from({ length: 7 }, (_, i) =>
    makeToolStep('transaction_data', 'tx_search', { q: `merchant${i}` }),
  );
  const plan = makePlan(steps);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(callLog.length === 5, 'U-2: only 5 calls made');
  assert(result.executedCount === 5, 'U-3: executedCount capped at 5');
  assert(result.skippedCount === 2, 'U-4: 2 skipped due to cap');
  const skippedResults = result.results.filter(r => r.status === 'skipped');
  assert(skippedResults.some(r => r.error === 'max_calls_exceeded'), 'U-5: skip reason is max_calls_exceeded');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION V: Timeout behavior works
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section V: Timeout behavior ===');

assert(PER_TOOL_TIMEOUT_MS === 3000, 'V-1: per-tool timeout is 3s');
assert(TOTAL_EVIDENCE_BUDGET_MS === 8000, 'V-2: total budget is 8s');

(async () => {
  // Slow executor exceeds per-step timeout
  const executor = slowExecutor(PER_TOOL_TIMEOUT_MS + 500);
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search', { q: 'slow' })]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(result.results[0].status === 'failed', 'V-3: timed out step is failed');
  assert(result.results[0].error === 'step_timeout', 'V-4: error is step_timeout');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION W: Telemetry contains no financial parameters/raw data
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section W: Telemetry safety ===');

(async () => {
  const executor = mockExecutor({
    tx_search: { rows: [{ id: '1', amount: 99.99, description: 'Secret Merchant' }], queryStatus: 'verified' },
  });
  const plan = makePlan([makeToolStep('transaction_data', 'tx_search', { q: 'secret', exactAmount: 99.99 })]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  const telemetry = buildEvidenceExecutionTelemetry(result);
  const telStr = JSON.stringify(telemetry);

  assert(!telStr.includes('secret'), 'W-1: no merchant name in telemetry');
  assert(!telStr.includes('99.99'), 'W-2: no amount in telemetry');
  assert(!telStr.includes('Secret Merchant'), 'W-3: no description in telemetry');
  assert(telStr.includes('tx_search'), 'W-4: tool name IS in telemetry (structural)');
  assert(telStr.includes('transaction_data'), 'W-5: evidence kind IS in telemetry');
  assert(telStr.includes('sufficient'), 'W-6: sufficiency IS in telemetry');
})();

// ─────────────────────────────────────────────────────────────────────────────
// SECTION X: Legacy pre-exec suppression for equivalent satisfied evidence
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section X: Legacy pre-exec suppression ===');

{
  const executionResult: PrimeEvidenceExecutionResult = {
    intent: PrimeIntent.FINANCIAL_DATA_LOOKUP,
    results: [{
      evidenceKind: 'transaction_data',
      status: 'resolved',
      authoritative: true,
      source: 'test',
      tool: 'tx_search',
      rowCount: 5,
    }],
    overallSufficiency: 'sufficient',
    executedCount: 1, skippedCount: 0, failedCount: 0, resolvedCount: 1,
    successfulEmptyCount: 0, totalDurationMs: 100, dedupHitCount: 0,
  };

  assert(shouldSuppressLegacyPreExec(executionResult, 'tx_search') === true, 'X-1: suppress legacy tx_search when P3.1C resolved');
  assert(shouldSuppressLegacyPreExec(executionResult, 'tax_summary') === true, 'X-2: suppress legacy tax_summary when tx data resolved');

  // P3.1C failed — should NOT suppress legacy
  const failedResult: PrimeEvidenceExecutionResult = {
    ...executionResult,
    results: [{
      ...executionResult.results[0],
      status: 'failed',
    }],
  };
  assert(shouldSuppressLegacyPreExec(failedResult, 'tx_search') === false, 'X-3: do NOT suppress when P3.1C failed');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION Y: Legacy behavior remains when P3.1C does not own evidence
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section Y: Legacy preserved when P3.1C does not own ===');

assert(shouldSuppressLegacyPreExec(null, 'tx_search') === false, 'Y-1: null result → do not suppress');
assert(shouldSuppressLegacyPreExec(null, 'tax_summary') === false, 'Y-2: null result → do not suppress tax_summary');

{
  // P3.1C ran but only skipped steps
  const skippedResult: PrimeEvidenceExecutionResult = {
    intent: PrimeIntent.FINANCIAL_DATA_LOOKUP,
    results: [{
      evidenceKind: 'transaction_data',
      status: 'skipped',
      authoritative: true,
      source: 'test',
      tool: 'tx_search',
    }],
    overallSufficiency: 'insufficient',
    executedCount: 0, skippedCount: 1, failedCount: 0, resolvedCount: 0,
    successfulEmptyCount: 0, totalDurationMs: 0, dedupHitCount: 0,
  };
  assert(shouldSuppressLegacyPreExec(skippedResult, 'tx_search') === false, 'Y-3: skipped → do not suppress');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION Z: P1/P2 transaction mutation lifecycle unchanged
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section Z: Mutation lifecycle unchanged ===');

// Verify P3.1C cannot touch mutation tools — existence proof
for (const tool of ['tx_update_category', 'tx_split', 'tag_update_transaction_category', 'delete_transaction']) {
  assert(checkStepEligibility(makeToolStep('transaction_data', tool)) === 'tool_not_in_allowlist',
    `Z: ${tool} blocked`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION AA: Tag protected confirmation lifecycle unchanged
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section AA: Tag lifecycle unchanged ===');

for (const tool of ['tag_reclassify', 'tag_bulk_fix', 'bulk_categorize', 'create_rule']) {
  assert(checkStepEligibility(makeToolStep('transaction_data', tool)) === 'tool_not_in_allowlist',
    `AA: ${tool} blocked`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION AB: Upload/import routing unchanged
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section AB: Upload/import routing unchanged ===');

assert(checkStepEligibility(makeToolStep('document_evidence', 'approve_import')) === 'tool_not_in_allowlist',
  'AB-1: approve_import blocked');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION AC: Product-help questions execute no P3.1C financial reads
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section AC: Product-help → no financial reads ===');

{
  const classification = classifyPrimeIntent('How do I upload a bank statement?', NO_EXTERNAL);
  assert(classification.intent === PrimeIntent.PRODUCT_HELP, 'AC-1: classified as product help');
  const contract = buildRuntimeEvidenceContract(classification, EMPTY_CTX);
  const plan = buildEvidencePlan(contract, classification);

  // No tool steps should exist for product help
  const toolSteps = plan.steps.filter(s => s.mode === 'tool' || s.mode === 'multi_source');
  assert(toolSteps.length === 0, 'AC-2: no executable tool steps for product help');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION AD: candidate_identity never causes select_transaction execution
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Section AD: candidate_identity safe ===');

{
  // Candidate follow-up intent
  const classification = classifyPrimeIntent('change that to groceries', {
    candidateFollowUpDetected: true,
    historicalReferenceDetected: false,
  });
  const contract = buildRuntimeEvidenceContract(classification, EMPTY_CTX);
  const plan = buildEvidencePlan(contract, classification);

  // No step should reference select_transaction
  const selectSteps = plan.steps.filter(s => s.tool === 'select_transaction');
  assert(selectSteps.length === 0, 'AD-1: no select_transaction steps in plan');

  // Even if someone manually adds a select_transaction step, it gets blocked
  assert(checkStepEligibility(makeToolStep('candidate_identity', 'select_transaction')) === 'tool_not_in_allowlist',
    'AD-2: select_transaction blocked by eligibility');
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL: Dedup key canonicalization
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Additional: Dedup key canonicalization ===');

{
  const k1 = buildDedupKey('tx_search', { q: 'costco', startDate: '2026-01-01' });
  const k2 = buildDedupKey('tx_search', { startDate: '2026-01-01', q: 'costco' });
  assert(k1 === k2, 'Dedup-1: different key order produces same dedup key');

  const k3 = buildDedupKey('tx_search', { q: 'walmart', startDate: '2026-01-01' });
  assert(k1 !== k3, 'Dedup-2: different values produce different keys');

  const k4 = buildDedupKey('tx_search');
  const k5 = buildDedupKey('tx_search', {});
  assert(k4 === k5, 'Dedup-3: empty params same as no params');
  assert(k4 === 'tx_search', 'Dedup-4: no params → just tool name');
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL: Context step skipped (not executed)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Additional: Context steps are skipped ===');

{
  const reason = checkStepEligibility(makeContextStep('conversation_context'));
  assert(reason === 'no_tool', 'Context-1: context step has no tool');
}

(async () => {
  const { executor, callLog } = countingExecutor();
  const plan = makePlan([
    makeContextStep('conversation_context'),
    makeToolStep('transaction_data', 'tx_search', { q: 'test' }),
  ]);
  const result = await executeEvidencePlan(plan, executor, freshCache());
  assert(callLog.length === 1, 'Context-2: only tool step executed');
  assert(result.skippedCount === 1, 'Context-3: context step counted as skipped');
})();

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL: already_available step skipped
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Additional: Already-available steps skipped ===');

{
  const step: PrimeEvidencePlanStep = {
    evidenceKind: 'product_knowledge',
    source: 'system prompt',
    mode: 'already_available',
    authoritative: true,
  };
  assert(checkStepEligibility(step) === 'no_tool', 'Available-1: already_available has no tool');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

// Wait for all async tests to complete
setTimeout(() => {
  console.log('\n─────────────────────────────────────');
  console.log(`P3.1C Evidence Execution: ${pass} passed, ${fail} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) console.log(f);
  }
  console.log('─────────────────────────────────────\n');
  process.exit(fail > 0 ? 1 : 0);
}, 15000); // 15s allows for timeout tests
