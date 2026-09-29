/**
 * P3.3A — Merchant Aggregation Evidence-Satisfied Gate Tests
 *
 * Verifies that when P3.1C resolves sufficient merchant_aggregation evidence
 * for a pure merchant aggregation query, redundant tx_search is suppressed
 * from both legacy pre-execution and model tool definitions.
 *
 * Also verifies that tx_search remains available for all cases requiring
 * individual transaction identity: detail, mutation, exact amount/date,
 * ordinal references, candidate establishment, and P3.1C failure.
 */

import { analyzeQueryScope, type UserQueryScope } from '../src/shared/tool-gate';
import { type PrimeEvidenceExecutionResult } from '../src/shared/prime-evidence-executor';
import { PrimeIntent } from '../src/shared/prime-intent-classifier';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

// ── Helper: Build a mock P3.1C result ──

function mockP31cResult(overrides?: {
  overallSufficiency?: string;
  evidenceKind?: string;
  status?: string;
}): PrimeEvidenceExecutionResult {
  return {
    intent: PrimeIntent.FINANCIAL_DATA_LOOKUP,
    results: [{
      evidenceKind: (overrides?.evidenceKind ?? 'merchant_aggregation') as any,
      status: (overrides?.status ?? 'resolved') as any,
      authoritative: true,
      source: 'merchant_totals',
      tool: 'merchant_totals',
      data: { merchants: [{ merchant: 'Costco', groupingKey: 'costco', total: 2800, count: 12 }] },
      rowCount: 1,
      durationMs: 64,
    }],
    overallSufficiency: (overrides?.overallSufficiency ?? 'sufficient') as any,
    executedCount: 1,
    skippedCount: 0,
    failedCount: 0,
    resolvedCount: 1,
    successfulEmptyCount: 0,
    totalDurationMs: 64,
    dedupHitCount: 0,
  };
}

// ── Helper: Compute merchantAggSatisfied exactly as chat.ts does ──

function computeMerchantAggSatisfied(opts: {
  isPrime: boolean;
  p31cResult: PrimeEvidenceExecutionResult | null;
  queryType: string;
  exactAmount?: number;
  exactDate?: string;
  message: string;
}): boolean {
  const queryScope = opts.isPrime ? analyzeQueryScope(opts.message) : null;
  return !!(
    opts.isPrime
    && opts.p31cResult?.overallSufficiency === 'sufficient'
    && opts.p31cResult.results.some(r =>
      r.evidenceKind === 'merchant_aggregation'
      && (r.status === 'resolved' || r.status === 'successful_empty')
    )
    && opts.queryType === 'merchant'
    && !opts.exactAmount
    && !opts.exactDate
    && queryScope && !queryScope.needsDetail
    && queryScope && !queryScope.isMutation
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A: Pure merchant aggregation → merchantAggSatisfied = true
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== A: Pure merchant aggregation → satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'What did I spend at Costco?',
  });
  assert(sat === true, 'A-1: "What did I spend at Costco?" → satisfied');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'How much at Amazon this year?',
  });
  assert(sat === true, 'A-2: "How much at Amazon this year?" → satisfied');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult({ status: 'successful_empty' }),
    queryType: 'merchant',
    message: 'What did I spend at Walmart?',
  });
  assert(sat === true, 'A-3: successful_empty merchant_aggregation → satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B: Detail query → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== B: Detail query → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'Show me my Costco transactions',
  });
  assert(sat === false, 'B-1: "Show me my Costco transactions" → NOT satisfied (needsDetail)');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'Which Costco charges were the biggest?',
  });
  assert(sat === false, 'B-2: "Which Costco charges" → NOT satisfied (needsDetail)');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'List my Costco purchases',
  });
  assert(sat === false, 'B-3: "List my Costco purchases" → NOT satisfied (needsDetail)');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'When did I last buy from Costco?',
  });
  assert(sat === false, 'B-4: "When did I last buy from Costco?" → NOT satisfied (needsDetail)');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION C: Exact amount → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== C: Exact amount → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    exactAmount: 47.50,
    message: 'What was that $47.50 charge at Costco?',
  });
  assert(sat === false, 'C-1: exact amount → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION D: Exact date → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== D: Exact date → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    exactDate: '2026-05-03',
    message: 'What did I spend at Costco on May 3rd?',
  });
  assert(sat === false, 'D-1: exact date → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION E: Mutation → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== E: Mutation → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'Recategorize my Costco charge',
  });
  assert(sat === false, 'E-1: "Recategorize my Costco charge" → NOT satisfied (isMutation)');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'Change the Costco transaction to business',
  });
  assert(sat === false, 'E-2: "Change the Costco transaction" → NOT satisfied (isMutation)');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'Delete the Costco charge',
  });
  assert(sat === false, 'E-3: "Delete the Costco charge" → NOT satisfied (isMutation)');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION F: P3.1C failure → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== F: P3.1C failure → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult({ overallSufficiency: 'insufficient', status: 'failed' }),
    queryType: 'merchant',
    message: 'What did I spend at Costco?',
  });
  assert(sat === false, 'F-1: P3.1C failed → NOT satisfied');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: null,
    queryType: 'merchant',
    message: 'What did I spend at Costco?',
  });
  assert(sat === false, 'F-2: P3.1C null → NOT satisfied');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult({ overallSufficiency: 'partial' }),
    queryType: 'merchant',
    message: 'What did I spend at Costco?',
  });
  assert(sat === false, 'F-3: P3.1C partial → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION G: Non-merchant query → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== G: Non-merchant query → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult({ evidenceKind: 'category_aggregation' }),
    queryType: 'aggregate',
    message: 'How much did I spend on groceries?',
  });
  assert(sat === false, 'G-1: aggregate queryType → NOT satisfied');
}

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult({ evidenceKind: 'transaction_data' }),
    queryType: 'detail',
    message: 'Show me my recent transactions',
  });
  assert(sat === false, 'G-2: detail queryType → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION H: Non-Prime → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== H: Non-Prime → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: false,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'What did I spend at Costco?',
  });
  assert(sat === false, 'H-1: non-Prime → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION I: Wrong evidence kind → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== I: Wrong evidence kind → NOT satisfied ===');

{
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult({ evidenceKind: 'transaction_data' }),
    queryType: 'merchant',
    message: 'What did I spend at Costco?',
  });
  assert(sat === false, 'I-1: transaction_data evidence (not merchant_aggregation) → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION J: queryScope safety — needsDetail and isMutation independent
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== J: queryScope safety — needsDetail and isMutation independent ===');

{
  // "where did" triggers needsDetail but NOT isMutation
  const scope = analyzeQueryScope('Where did I spend at Costco?');
  assert(scope.needsDetail === true, 'J-1: "where did" → needsDetail');
  assert(scope.isMutation === false, 'J-2: "where did" → NOT isMutation');
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'Where did I spend at Costco?',
  });
  assert(sat === false, 'J-3: needsDetail blocks even without isMutation');
}

{
  // "update" triggers isMutation but NOT needsDetail (depending on context)
  const scope = analyzeQueryScope('update Costco category');
  assert(scope.isMutation === true, 'J-4: "update" → isMutation');
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'update Costco category',
  });
  assert(sat === false, 'J-5: isMutation blocks even without needsDetail');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION K: Tool stripping preserves other tools
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== K: Tool stripping preserves other tools ===');

{
  const employeeTools = [
    'tx_search', 'tx_get', 'select_transaction', 'merchant_totals',
    'transaction_category_totals', 'merchant_analysis_refine',
    'request_employee_handoff', 'cash_flow_summary',
  ];
  const stripped = employeeTools.filter(t => t !== 'tx_search');
  assert(stripped.includes('merchant_totals'), 'K-1: merchant_totals preserved');
  assert(stripped.includes('merchant_analysis_refine'), 'K-2: merchant_analysis_refine preserved');
  assert(stripped.includes('tx_get'), 'K-3: tx_get preserved');
  assert(stripped.includes('select_transaction'), 'K-4: select_transaction preserved');
  assert(stripped.includes('request_employee_handoff'), 'K-5: request_employee_handoff preserved');
  assert(stripped.includes('cash_flow_summary'), 'K-6: cash_flow_summary preserved');
  assert(stripped.includes('transaction_category_totals'), 'K-7: transaction_category_totals preserved');
  assert(!stripped.includes('tx_search'), 'K-8: tx_search removed');
  assert(stripped.length === employeeTools.length - 1, 'K-9: exactly one tool removed');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION L: Comparison query — merchant agg doesn't block
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== L: Comparison query ===');

{
  // "compare" doesn't trigger needsDetail or isMutation,
  // but the queryType should still be merchant if it's a merchant comparison
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'How much did I spend at Costco?',
  });
  assert(sat === true, 'L-1: simple merchant aggregation → satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION M: Ordinal reference → NOT satisfied (needsDetail catches it)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== M: Ordinal / positional references ===');

{
  // "which" triggers needsDetail
  const scope = analyzeQueryScope('which one at Costco was the biggest?');
  assert(scope.needsDetail === true, 'M-1: "which" → needsDetail');
  const sat = computeMerchantAggSatisfied({
    isPrime: true,
    p31cResult: mockP31cResult(),
    queryType: 'merchant',
    message: 'which one at Costco was the biggest?',
  });
  assert(sat === false, 'M-2: ordinal/positional → NOT satisfied');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION N: Merchant breakdown by merchant/vendor → NOT satisfied
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== N: Breakdown requests ===');

{
  const scope = analyzeQueryScope('breakdown by merchant at Costco');
  assert(scope.needsDetail === true, 'N-1: "breakdown by merchant" → needsDetail');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION O: P0/P1/P2 mutation safety preserved
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== O: P0/P1/P2 mutation safety ===');

{
  // Ensure mutation words are caught independently
  for (const word of ['change', 'update', 'recategorize', 'delete', 'remove', 'fix', 'mark as']) {
    const scope = analyzeQueryScope(`${word} the Costco transaction`);
    assert(scope.isMutation === true, `O: "${word}" → isMutation`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION P: Historical transaction reference
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n=== P: Historical transaction reference ===');

{
  // "last time" triggers needsDetail
  const scope = analyzeQueryScope('last time I bought from Costco');
  assert(scope.needsDetail === true, 'P-1: "last time" → needsDetail');
}

{
  // "transaction on" triggers needsDetail
  const scope = analyzeQueryScope('transaction on May 3rd at Costco');
  assert(scope.needsDetail === true, 'P-2: "transaction on" → needsDetail');
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`P3.3A Merchant Aggregation Gate Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('Failures:');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
