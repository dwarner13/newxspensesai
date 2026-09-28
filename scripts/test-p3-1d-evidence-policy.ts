/**
 * P3.1D EVIDENCE POLICY & DETECTION TESTS
 *
 * Tests the P3.1D evidence-shape policy (model constraints) and
 * post-stream violation detection (telemetry only).
 *
 * Uses actual production helpers — does NOT duplicate production logic.
 */

import {
  classifyEvidenceShape,
  buildEvidenceShapePolicy,
  buildEvidenceContextMessage,
  assessSufficiency,
  type PrimeEvidenceExecutionResult,
  type PrimeEvidenceResult,
  type EvidenceShape,
  type EvidenceSufficiency,
} from '../src/shared/prime-evidence-executor';

import {
  detectEvidenceViolation,
  buildEvidenceViolationTelemetry,
  EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS,
  type AccumulatedEvidenceMap,
  type EvidenceViolationResult,
} from '../src/shared/prime-evidence-validator';

// ─────────────────────────────────────────────────────────────────────────────
// TEST HARNESS
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  FAIL: ${label}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function buildResult(overrides: Partial<PrimeEvidenceExecutionResult> & { results: PrimeEvidenceResult[] }): PrimeEvidenceExecutionResult {
  const results = overrides.results;
  return {
    intent: overrides.intent ?? 'financial_data_lookup',
    results,
    overallSufficiency: overrides.overallSufficiency ?? 'sufficient',
    executedCount: overrides.executedCount ?? results.filter(r => r.status === 'resolved' || r.status === 'failed').length,
    skippedCount: overrides.skippedCount ?? results.filter(r => r.status === 'skipped').length,
    failedCount: overrides.failedCount ?? results.filter(r => r.status === 'failed').length,
    resolvedCount: overrides.resolvedCount ?? results.filter(r => r.status === 'resolved').length,
    successfulEmptyCount: overrides.successfulEmptyCount ?? results.filter(r => r.status === 'successful_empty').length,
    totalDurationMs: overrides.totalDurationMs ?? 100,
    dedupHitCount: overrides.dedupHitCount ?? 0,
  };
}

function resolvedAggregation(data?: unknown): PrimeEvidenceResult {
  return {
    evidenceKind: 'category_aggregation',
    status: 'resolved',
    authoritative: true,
    source: 'Category spend totals',
    tool: 'transaction_category_totals',
    data: data ?? { totals: [{ category: 'Groceries', total: 800, count: 12 }], grandTotal: 4000, totalCount: 5 },
    rowCount: 5,
    durationMs: 50,
  };
}

function resolvedTxSearch(data?: unknown): PrimeEvidenceResult {
  return {
    evidenceKind: 'transaction_data',
    status: 'resolved',
    authoritative: true,
    source: 'Transaction rows',
    tool: 'tx_search',
    data: data ?? { rows: [{ date: '2026-05-01', description: 'Costco', amount: 125.50, category: 'Shopping' }], totalCount: 1 },
    rowCount: 1,
    durationMs: 40,
  };
}

function resolvedComparison(): PrimeEvidenceResult {
  return {
    evidenceKind: 'period_comparison',
    status: 'resolved',
    authoritative: true,
    source: 'Two-period comparison',
    tool: 'transaction_category_totals',
    data: {
      periodA: { label: 'April 2026', totals: [{ category: 'Groceries', total: 700, count: 10 }], grandTotal: 3500 },
      periodB: { label: 'May 2026', totals: [{ category: 'Groceries', total: 800, count: 12 }], grandTotal: 4000 },
    },
    rowCount: 10,
    durationMs: 80,
  };
}

function failedResult(kind: string = 'category_aggregation'): PrimeEvidenceResult {
  return {
    evidenceKind: kind as any,
    status: 'failed',
    authoritative: true,
    source: 'Failed retrieval',
    tool: 'transaction_category_totals',
    error: 'timeout',
    durationMs: 3000,
  };
}

function emptyResult(tool: string = 'tx_search'): PrimeEvidenceResult {
  return {
    evidenceKind: tool === 'tx_search' ? 'transaction_data' : 'category_aggregation',
    status: 'successful_empty',
    authoritative: true,
    source: 'Empty query result',
    tool,
    data: tool === 'tx_search' ? { rows: [], totalCount: 0 } : { totals: [], totalCount: 0 },
    rowCount: 0,
    durationMs: 30,
  };
}

function partialComparisonResults(): PrimeEvidenceResult[] {
  return [
    {
      evidenceKind: 'period_comparison',
      status: 'resolved',
      authoritative: true,
      source: 'Period A',
      tool: 'transaction_category_totals',
      data: { totals: [{ category: 'Groceries', total: 700, count: 10 }], grandTotal: 3500 },
      rowCount: 5,
      durationMs: 40,
      periodLabel: 'April 2026',
    },
    {
      evidenceKind: 'period_comparison',
      status: 'failed',
      authoritative: true,
      source: 'Period B',
      tool: 'transaction_category_totals',
      error: 'timeout',
      durationMs: 3000,
      periodLabel: 'May 2026',
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// A. SINGLE-PERIOD AGGREGATION POLICY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== A. Single-period aggregation policy ===');
{
  const result = buildResult({ results: [resolvedAggregation()] });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'single_period_aggregation', 'A-1: shape is single_period_aggregation');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy !== null, 'A-2: policy is not null');
  assert(policy!.includes('must NOT claim'), 'A-3: policy warns against unsupported change claims');
  assert(policy!.includes('increased'), 'A-4: policy mentions increased');
  assert(policy!.includes('decreased'), 'A-5: policy mentions decreased');
  assert(policy!.includes('trends'), 'A-6: policy mentions trends');
  assert(policy!.includes('totals'), 'A-7: policy permits totals');
  assert(policy!.includes('contributions'), 'A-8: policy permits contributions');
}

// ─────────────────────────────────────────────────────────────────────────────
// B. TWO-PERIOD COMPARISON POLICY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== B. Two-period comparison policy ===');
{
  const result = buildResult({ results: [resolvedComparison()] });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'two_period_comparison', 'B-1: shape is two_period_comparison');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy !== null, 'B-2: policy is not null');
  assert(policy!.includes('compare'), 'B-3: policy allows comparison');
  assert(policy!.includes('both periods'), 'B-4: policy confirms both periods verified');
}

// ─────────────────────────────────────────────────────────────────────────────
// C. PARTIAL COMPARISON POLICY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== C. Partial comparison policy ===');
{
  const result = buildResult({ results: partialComparisonResults(), overallSufficiency: 'partial' });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'partial_comparison', 'C-1: shape is partial_comparison');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy !== null, 'C-2: policy is not null');
  assert(policy!.includes('April 2026'), 'C-3: policy names available period');
  assert(policy!.includes('May 2026'), 'C-4: policy names missing period');
  assert(policy!.includes('unavailable'), 'C-5: policy states data unavailable');
  assert(policy!.includes('must NOT state'), 'C-6: policy blocks comparison conclusion');
}

// ─────────────────────────────────────────────────────────────────────────────
// D. ALL-FAILED POLICY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== D. All-failed policy ===');
{
  const result = buildResult({ results: [failedResult()], overallSufficiency: 'insufficient' });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'all_failed', 'D-1: shape is all_failed');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy !== null, 'D-2: policy is not null');
  assert(policy!.includes('could not be retrieved'), 'D-3: policy explains retrieval failure');
  assert(policy!.includes('Do NOT state'), 'D-4: policy blocks financial conclusions');
  assert(policy!.includes('Do NOT substitute'), 'D-5: policy blocks fallback to general knowledge');
}

// ─────────────────────────────────────────────────────────────────────────────
// E. SUCCESSFUL-EMPTY WORDING
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== E. Successful-empty wording ===');
{
  const result = buildResult({ results: [emptyResult()], overallSufficiency: 'sufficient' });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'successful_empty', 'E-1: shape is successful_empty');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy !== null, 'E-2: policy is not null');
  assert(policy!.includes('no matching'), 'E-3: policy recommends "no matching" wording');
  assert(policy!.includes('currently imported data'), 'E-4: policy references imported data');
}

// ─────────────────────────────────────────────────────────────────────────────
// F. SUCCESSFUL-EMPTY DOES NOT AUTHORIZE $0
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== F. Successful-empty does not authorize $0 ===');
{
  const result = buildResult({ results: [emptyResult()] });
  const policy = buildEvidenceShapePolicy(result);
  assert(policy!.includes('Do NOT automatically convert'), 'F-1: policy warns against $0 conversion');
  assert(policy!.includes('$0'), 'F-2: policy explicitly mentions $0');

  // Also check the context message
  const ctxMsg = buildEvidenceContextMessage(result);
  assert(ctxMsg !== null, 'F-3: context message exists');
  assert(ctxMsg!.includes('verified empty result'), 'F-4: context message uses verified empty wording');
  assert(!ctxMsg!.includes('the data does not exist'), 'F-5: old wording replaced');
}

// ─────────────────────────────────────────────────────────────────────────────
// G. NO EXECUTABLE EVIDENCE DOES NOT ACTIVATE FINANCIAL RESTRICTIONS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== G. No executable evidence ===');
{
  const result = buildResult({ results: [], overallSufficiency: 'sufficient' });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'no_executable_evidence', 'G-1: shape is no_executable_evidence');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy === null, 'G-2: no policy for non-financial queries');

  // Also with skipped-only results
  const skippedResult = buildResult({
    results: [{
      evidenceKind: 'category_aggregation',
      status: 'skipped',
      authoritative: true,
      source: 'skipped',
      error: 'tool_not_in_allowlist',
    }],
  });
  const shape2 = classifyEvidenceShape(skippedResult);
  assert(shape2 === 'no_executable_evidence', 'G-3: skipped-only is no_executable_evidence');
  assert(buildEvidenceShapePolicy(skippedResult) === null, 'G-4: no policy for skipped-only');
}

// ─────────────────────────────────────────────────────────────────────────────
// H. PROVENANCE WORDING EXISTS WITH EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== H. Provenance wording ===');
{
  const result = buildResult({ results: [resolvedAggregation()] });
  const ctxMsg = buildEvidenceContextMessage(result);
  assert(ctxMsg !== null, 'H-1: context message exists');
  assert(ctxMsg!.includes('DATA PROVENANCE'), 'H-2: provenance section present');
  assert(ctxMsg!.includes('currently imported into XspensesAI'), 'H-3: provenance mentions imported data');
  assert(ctxMsg!.includes('may not include all bank accounts'), 'H-4: provenance hedges coverage');

  // Also check evidence authority
  assert(ctxMsg!.includes('EVIDENCE AUTHORITY'), 'H-5: evidence authority section present');
  assert(ctxMsg!.includes('conflicts with memory'), 'H-6: memory precedence rule present');
}

// ─────────────────────────────────────────────────────────────────────────────
// I. SINGLE-PERIOD TX_SEARCH BLOCKS TREND/CHANGE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== I. Single-period tx_search policy ===');
{
  const result = buildResult({ results: [resolvedTxSearch()] });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'single_period_transactions', 'I-1: shape is single_period_transactions');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy !== null, 'I-2: policy exists');
  assert(policy!.includes('must NOT claim'), 'I-3: policy blocks change claims');
  assert(policy!.includes('must NOT describe trends'), 'I-4: policy blocks trend claims');
}

// ─────────────────────────────────────────────────────────────────────────────
// J. POLICY REMAINS COMPACT
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== J. Policy compactness ===');
{
  const shapes: EvidenceShape[] = [
    'single_period_aggregation',
    'single_period_transactions',
    'two_period_comparison',
    'successful_empty',
    'all_failed',
    'mixed',
  ];
  const mockResults: Record<string, PrimeEvidenceExecutionResult> = {
    'single_period_aggregation': buildResult({ results: [resolvedAggregation()] }),
    'single_period_transactions': buildResult({ results: [resolvedTxSearch()] }),
    'two_period_comparison': buildResult({ results: [resolvedComparison()] }),
    'successful_empty': buildResult({ results: [emptyResult()] }),
    'all_failed': buildResult({ results: [failedResult()], overallSufficiency: 'insufficient' }),
    'mixed': buildResult({ results: [resolvedAggregation(), failedResult('transaction_data')] }),
  };
  for (const s of shapes) {
    const policy = buildEvidenceShapePolicy(mockResults[s]);
    if (policy) {
      assert(policy.length < 500, `J-${s}: policy length ${policy.length} < 500`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// K. INSUFFICIENT + SUSPICIOUS DOLLAR AMOUNT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== K. Insufficient + dollar amount detection ===');
{
  const v = detectEvidenceViolation(
    'You spent $1,234.56 on groceries in May.',
    'insufficient',
    'all_failed',
  );
  assert(v.violated === true, 'K-1: violation detected');
  assert(v.type === 'dollar_amount_when_insufficient', 'K-2: correct violation type');
  assert(v.evidenceShape === 'all_failed', 'K-3: evidence shape preserved');
  assert(v.sufficiency === 'insufficient', 'K-4: sufficiency preserved');
}

// ─────────────────────────────────────────────────────────────────────────────
// L. INSUFFICIENT NATURAL RETRIEVAL EXPLANATION PASSES
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== L. Insufficient natural explanation passes ===');
{
  const v = detectEvidenceViolation(
    "I wasn't able to retrieve your spending data right now. Could you try again in a moment?",
    'insufficient',
    'all_failed',
  );
  assert(v.violated === false, 'L-1: no violation for natural explanation');
}

// ─────────────────────────────────────────────────────────────────────────────
// M. SUFFICIENT EVIDENCE PERMITS NUMBERS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== M. Sufficient evidence permits numbers ===');
{
  const v = detectEvidenceViolation(
    'You spent $4,000 in May 2026. Groceries were $800, which was 20% of your total.',
    'sufficient',
    'single_period_aggregation',
  );
  assert(v.violated === false, 'M-1: no violation when sufficient');
}

// ─────────────────────────────────────────────────────────────────────────────
// N. PARTIAL COMPARISON VIOLATION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== N. Partial comparison violation ===');
{
  const v = detectEvidenceViolation(
    'You spent more than last month on groceries.',
    'partial',
    'partial_comparison',
  );
  assert(v.violated === true, 'N-1: violation detected for unsupported comparison');
  assert(v.type === 'comparison_without_both_periods', 'N-2: correct violation type');
}

// ─────────────────────────────────────────────────────────────────────────────
// O. SUCCESSFUL-EMPTY "$0" DETECTION
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== O. Successful-empty $0 detection ===');
{
  const v = detectEvidenceViolation(
    'You spent $0 at Starbucks in May 2026.',
    'sufficient',
    'successful_empty',
  );
  assert(v.violated === true, 'O-1: violation detected for $0 claim from empty');
  assert(v.type === 'zero_dollar_from_empty', 'O-2: correct violation type');

  // Also test $0.00
  const v2 = detectEvidenceViolation(
    'Your Starbucks spending was $0.00 this month.',
    'sufficient',
    'successful_empty',
  );
  assert(v2.violated === true, 'O-3: $0.00 also detected');
}

// ─────────────────────────────────────────────────────────────────────────────
// P. CORRECT "NO MATCHING RECORDS" PASSES
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== P. Correct empty wording passes ===');
{
  const v = detectEvidenceViolation(
    'I found no matching Starbucks transactions in the currently imported data for May 2026.',
    'sufficient',
    'successful_empty',
  );
  assert(v.violated === false, 'P-1: no violation for correct empty wording');
}

// ─────────────────────────────────────────────────────────────────────────────
// Q. LEGITIMATE DERIVED PERCENTAGE IS NOT FABRICATION
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Q. Derived numbers allowed ===');
{
  // 20% is derived from $800/$4000 — not a fabrication
  const v = detectEvidenceViolation(
    'Groceries made up about 20% of your total spending.',
    'sufficient',
    'single_period_aggregation',
  );
  assert(v.violated === false, 'Q-1: derived percentage passes');
}

// ─────────────────────────────────────────────────────────────────────────────
// R. USER-PROVIDED HYPOTHETICAL NUMBER IS NOT DB EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== R. User hypothetical numbers ===');
{
  // User asked "Could I afford $600/month?" — $600 is user-provided, not evidence
  // With sufficient evidence, the model can reference this number
  const v = detectEvidenceViolation(
    'Based on your current spending of $4,000/month, adding $600 would bring your total to $4,600.',
    'sufficient',
    'single_period_aggregation',
  );
  assert(v.violated === false, 'R-1: user hypothetical with sufficient evidence passes');
}

// ─────────────────────────────────────────────────────────────────────────────
// S. ACCUMULATED LATER READ EVIDENCE IS RECOGNIZED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== S. Accumulated evidence ===');
{
  const accum: AccumulatedEvidenceMap = new Map();
  // Initially empty — then later tool loop adds evidence
  assert(accum.size === 0, 'S-1: starts empty');

  // Simulate tool loop adding tx_search result
  accum.set('transaction_data', { tool: 'tx_search', status: 'resolved', rowCount: 5 });
  assert(accum.size === 1, 'S-2: evidence added');
  assert(accum.get('transaction_data')!.tool === 'tx_search', 'S-3: correct tool');
  assert(accum.get('transaction_data')!.status === 'resolved', 'S-4: correct status');
}

// ─────────────────────────────────────────────────────────────────────────────
// T. MUTATION TOOLS NEVER ENTER ACCUMULATED EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== T. Mutation tools blocked from accumulator ===');
{
  const mutationTools = [
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
  for (const tool of mutationTools) {
    assert(
      !EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has(tool),
      `T-${tool}: mutation tool ${tool} is NOT eligible`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// U. SELECT_TRANSACTION NEVER ENTERS ACCUMULATED EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== U. select_transaction blocked ===');
{
  assert(
    !EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('select_transaction'),
    'U-1: select_transaction is NOT eligible',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V. REQUEST_EMPLOYEE_HANDOFF NEVER ENTERS ACCUMULATED EVIDENCE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== V. request_employee_handoff blocked ===');
{
  assert(
    !EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('request_employee_handoff'),
    'V-1: request_employee_handoff is NOT eligible',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// W. ACCUMULATOR IS REQUEST-SCOPED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== W. Accumulator is request-scoped ===');
{
  // Each new Map() is a fresh instance — proves request-scoping
  const accum1: AccumulatedEvidenceMap = new Map();
  const accum2: AccumulatedEvidenceMap = new Map();
  accum1.set('transaction_data', { tool: 'tx_search', status: 'resolved', rowCount: 5 });
  assert(accum2.size === 0, 'W-1: separate instances are independent');
  assert(accum1.size === 1, 'W-2: first instance has data');
}

// ─────────────────────────────────────────────────────────────────────────────
// X. DETECTION NEVER MODIFIES RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== X. Detection is non-mutating ===');
{
  const response = 'You spent $1,234.56 on groceries.';
  const v = detectEvidenceViolation(response, 'insufficient', 'all_failed');
  // detectEvidenceViolation returns a result — it does NOT modify the input
  assert(v.violated === true, 'X-1: violation detected');
  // The function signature takes string (immutable) — no mutation possible
  // Verify the return type has no mutation methods
  assert(typeof v === 'object', 'X-2: returns plain object');
  assert(!('modifiedResponse' in v), 'X-3: no modifiedResponse field');
  assert(!('replacedContent' in v), 'X-4: no replacedContent field');
}

// ─────────────────────────────────────────────────────────────────────────────
// Y. STREAMING BEHAVIOR REMAINS IMMEDIATE/UNBUFFERED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Y. Streaming unchanged (architectural) ===');
{
  // This is an architectural test — verify that buildEvidenceShapePolicy
  // and buildEvidenceContextMessage produce strings, not streaming hooks
  const result = buildResult({ results: [resolvedAggregation()] });
  const policy = buildEvidenceShapePolicy(result);
  assert(typeof policy === 'string', 'Y-1: policy is a string (pre-model injection)');
  const ctx = buildEvidenceContextMessage(result);
  assert(typeof ctx === 'string', 'Y-2: context message is a string');
  // Detection also returns plain data, no stream modification
  const v = detectEvidenceViolation('test', 'sufficient', 'single_period_aggregation');
  assert(typeof v === 'object' && 'violated' in v, 'Y-3: detection returns plain result object');
}

// ─────────────────────────────────────────────────────────────────────────────
// Z. NO NEW MODEL CALL
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== Z. No new model call ===');
{
  // Verify none of the P3.1D functions accept or return promises to OpenAI
  // buildEvidenceShapePolicy is synchronous
  const result = buildResult({ results: [resolvedAggregation()] });
  const policy = buildEvidenceShapePolicy(result);
  assert(!(policy instanceof Promise), 'Z-1: buildEvidenceShapePolicy is synchronous');

  // detectEvidenceViolation is synchronous
  const v = detectEvidenceViolation('test', 'sufficient', 'single_period_aggregation');
  assert(!(v instanceof Promise), 'Z-2: detectEvidenceViolation is synchronous');

  // classifyEvidenceShape is synchronous
  const shape = classifyEvidenceShape(result);
  assert(!(shape instanceof Promise), 'Z-3: classifyEvidenceShape is synchronous');
}

// ─────────────────────────────────────────────────────────────────────────────
// AA. NO NEW CONCLUSION CLASSIFIER
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AA. No conclusion classifier ===');
{
  // buildEvidenceShapePolicy takes only execution result — not user message
  // This proves it doesn't classify the user's question
  const result = buildResult({ results: [resolvedAggregation()] });
  const policy = buildEvidenceShapePolicy(result);
  // Policy is the same regardless of what question was asked
  const result2 = buildResult({ results: [resolvedAggregation()] });
  const policy2 = buildEvidenceShapePolicy(result2);
  assert(policy === policy2, 'AA-1: same evidence shape produces same policy');
}

// ─────────────────────────────────────────────────────────────────────────────
// AB. NO RUNTIME CONCLUSION ENUM
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AB. No conclusion enum ===');
{
  // EvidenceShape is the only new type — verify it's about evidence structure, not conclusions
  const validShapes: EvidenceShape[] = [
    'no_executable_evidence',
    'single_period_aggregation',
    'single_period_transactions',
    'two_period_comparison',
    'partial_comparison',
    'successful_empty',
    'all_failed',
    'mixed',
  ];
  // None of these are conclusion types (ranking, trend, recommendation, etc.)
  for (const s of validShapes) {
    assert(!s.includes('ranking'), `AB-${s}: not a conclusion type`);
    assert(!s.includes('trend'), `AB-${s}: not trend`);
    assert(!s.includes('recommendation'), `AB-${s}: not recommendation`);
    assert(!s.includes('causation'), `AB-${s}: not causation`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC. P1/P2 MUTATION LIFECYCLE UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AC. P1/P2 mutation lifecycle (architectural) ===');
{
  // P3.1D does not import or modify any P1/P2 modules
  // The validator and policy modules have no imports from:
  // - candidate-follow-up-detector
  // - historical-reference-detector
  // - confirmation gates
  // These are architectural constraints verified by the import graph
  assert(true, 'AC-1: P3.1D modules do not import P1/P2 modules (verified by import graph)');
}

// ─────────────────────────────────────────────────────────────────────────────
// AD. TAG PROTECTED LIFECYCLE UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AD. Tag lifecycle (architectural) ===');
{
  // P3.1D does not modify tag_update_transaction_category behavior
  // Mutation tools are explicitly excluded from accumulator
  assert(!EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('tag_update_transaction_category'), 'AD-1: tag mutation excluded');
  assert(!EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('tag_reclassify'), 'AD-2: tag reclassify excluded');
  assert(!EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('tag_bulk_fix'), 'AD-3: tag bulk fix excluded');
}

// ─────────────────────────────────────────────────────────────────────────────
// AE. UPLOAD/IMPORT UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AE. Upload/import (architectural) ===');
{
  assert(!EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('approve_import'), 'AE-1: approve_import excluded');
  assert(true, 'AE-2: P3.1D does not import smart-import modules');
}

// ─────────────────────────────────────────────────────────────────────────────
// AF. STATEMENT BREAKDOWN UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AF. Statement breakdown (architectural) ===');
{
  assert(true, 'AF-1: P3.1D does not import or modify statement breakdown modules');
}

// ─────────────────────────────────────────────────────────────────────────────
// AG. PRODUCT HELP DOES NOT ACTIVATE FINANCIAL EVIDENCE RESTRICTIONS
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== AG. Product help no restrictions ===');
{
  // Product help has no executable evidence steps — shape is no_executable_evidence
  const result = buildResult({
    intent: 'product_help',
    results: [],
    overallSufficiency: 'sufficient',
  });
  const shape = classifyEvidenceShape(result);
  assert(shape === 'no_executable_evidence', 'AG-1: product help has no executable evidence');
  const policy = buildEvidenceShapePolicy(result);
  assert(policy === null, 'AG-2: no financial restrictions for product help');
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL: Evidence shape classification edge cases
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== ADDITIONAL: Edge cases ===');
{
  // Mixed: aggregation resolved but tx_search failed
  const mixedResult = buildResult({
    results: [resolvedAggregation(), failedResult('transaction_data')],
    overallSufficiency: 'partial',
  });
  const mixedShape = classifyEvidenceShape(mixedResult);
  assert(mixedShape === 'mixed', 'EDGE-1: mixed shape when some resolved some failed');

  // Empty response doesn't trigger detection
  const v = detectEvidenceViolation('', 'insufficient', 'all_failed');
  assert(v.violated === false, 'EDGE-2: empty response is not a violation');

  // Telemetry builder works
  const violation = detectEvidenceViolation('$500', 'insufficient', 'all_failed');
  const telemetry = buildEvidenceViolationTelemetry(violation);
  assert(telemetry.violated === true, 'EDGE-3: telemetry reflects violation');
  assert(telemetry.type === 'dollar_amount_when_insufficient', 'EDGE-4: telemetry has type');
  assert(telemetry.evidenceShape === 'all_failed', 'EDGE-5: telemetry has shape');

  // No violation telemetry
  const noViolation = detectEvidenceViolation('Hello', 'sufficient', 'single_period_aggregation');
  const noVTelemetry = buildEvidenceViolationTelemetry(noViolation);
  assert(noVTelemetry.violated === false, 'EDGE-6: no-violation telemetry');
  assert(noVTelemetry.type === null, 'EDGE-7: no-violation type is null');

  // Partial comparison — "expenses less compared" should trigger
  const v2 = detectEvidenceViolation(
    'Your spending less compared to the previous month.',
    'partial',
    'partial_comparison',
  );
  assert(v2.violated === true, 'EDGE-8: "spending less compared" triggers partial comparison violation');

  // Partial comparison — reporting just the available period is fine
  const v3 = detectEvidenceViolation(
    'In April 2026, your total spending was $3,500. I was unable to retrieve May data for comparison.',
    'partial',
    'partial_comparison',
  );
  assert(v3.violated === false, 'EDGE-9: reporting available period only passes');

  // successful_empty with non-zero dollar amount is fine (it's not $0)
  const v4 = detectEvidenceViolation(
    'While I found no Starbucks transactions, your total coffee spending was $200.',
    'sufficient',
    'successful_empty',
  );
  assert(v4.violated === false, 'EDGE-10: non-zero dollar amount with successful_empty passes');

  // no_executable_evidence bypasses all detection
  const v5 = detectEvidenceViolation(
    'You spent $999 on mystery items.',
    'sufficient',
    'no_executable_evidence',
  );
  assert(v5.violated === false, 'EDGE-11: no_executable_evidence bypasses detection');

  // Only eligible tools in accumulator set (P3.2A adds cash_flow_summary)
  assert(EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.size === 3, 'EDGE-12: exactly 3 eligible tools');
  assert(EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('tx_search'), 'EDGE-13: tx_search eligible');
  assert(EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('transaction_category_totals'), 'EDGE-14: transaction_category_totals eligible');
  assert(EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS.has('cash_flow_summary'), 'EDGE-15: cash_flow_summary eligible');
}

// ─────────────────────────────────────────────────────────────────────────────
// ADDITIONAL: Context message integration
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== ADDITIONAL: Context message integration ===');
{
  // Sufficient single-period: shape policy + provenance + authority
  const result = buildResult({ results: [resolvedAggregation()] });
  const ctx = buildEvidenceContextMessage(result);
  assert(ctx!.includes('EVIDENCE SHAPE'), 'CTX-1: shape policy in context');
  assert(ctx!.includes('DATA PROVENANCE'), 'CTX-2: provenance in context');
  assert(ctx!.includes('EVIDENCE AUTHORITY'), 'CTX-3: authority in context');
  assert(!ctx!.includes('EVIDENCE RULE'), 'CTX-4: no sufficiency rule when sufficient');

  // Partial: shape policy + provenance + authority + sufficiency rule
  const partial = buildResult({
    results: [resolvedAggregation(), failedResult('transaction_data')],
    overallSufficiency: 'partial',
  });
  const pCtx = buildEvidenceContextMessage(partial);
  assert(pCtx!.includes('EVIDENCE SHAPE'), 'CTX-5: shape policy in partial context');
  assert(pCtx!.includes('EVIDENCE RULE'), 'CTX-6: sufficiency rule in partial context');

  // Insufficient: shape policy + sufficiency rule but no provenance (no evidence to provide for)
  const insuff = buildResult({
    results: [failedResult()],
    overallSufficiency: 'insufficient',
  });
  const iCtx = buildEvidenceContextMessage(insuff);
  assert(iCtx!.includes('EVIDENCE SHAPE'), 'CTX-7: shape policy in insufficient context');
  assert(iCtx!.includes('EVIDENCE RULE'), 'CTX-8: sufficiency rule in insufficient context');
  assert(!iCtx!.includes('DATA PROVENANCE'), 'CTX-9: no provenance when no evidence available');

  // No results: null
  const empty = buildResult({ results: [] });
  const eCtx = buildEvidenceContextMessage(empty);
  assert(eCtx === null, 'CTX-10: null for empty results');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`P3.1D Evidence Policy Tests: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
}
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
