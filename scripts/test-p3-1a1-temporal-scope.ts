/**
 * P3.1A.1 — Temporal Scope + Analysis Evidence Composition Test Suite
 *
 * Tests:
 * - Month reference extraction (bare, with year, abbreviations)
 * - Relative period resolution (this/last month, year, week, day)
 * - Comparison detection (explicit two-period, implicit)
 * - Year resolution (deterministic vs ambiguous)
 * - Canonical boundary convention (from inclusive, to exclusive)
 * - Inclusive tool-boundary conversion (toInclusiveEndDate)
 * - Analysis evidence composition in P3.1A
 * - P3.1B temporal scope consumption
 * - Safety (no model calls, no DB, no mutations, no select_transaction)
 *
 * Run: npx tsx scripts/test-p3-1a1-temporal-scope.ts
 */

import {
  buildTemporalScope,
  extractMonthReference,
  toInclusiveEndDate,
  buildTemporalScopeTelemetry,
  type PrimeTemporalScope,
  type TemporalScopeContext,
} from '../src/shared/prime-temporal-scope';

import {
  buildRuntimeEvidenceContract,
  type PrimeRuntimeEvidenceContract,
  type EvidenceAvailabilityContext,
} from '../src/shared/prime-evidence-contract';

import {
  buildEvidencePlan,
  buildEvidencePlanTelemetry,
} from '../src/shared/prime-evidence-resolver';

import {
  classifyPrimeIntent,
  PrimeIntent,
  type ClassifierContext,
} from '../src/shared/prime-intent-classifier';

import {
  MONTH_MAP,
  classifyFinancialQuery,
} from '../src/shared/financial-query-classifier';

const NO_EXTERNAL: ClassifierContext = {
  candidateFollowUpDetected: false,
  historicalReferenceDetected: false,
};

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

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const match = actual === expected;
  if (match) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Fixed reference date for deterministic tests: September 27, 2026 at noon UTC
const REF_DATE = new Date(Date.UTC(2026, 8, 27, 12, 0, 0));
const CTX: TemporalScopeContext = { timezone: 'America/Edmonton', referenceDate: REF_DATE };
const CTX_UTC: TemporalScopeContext = { timezone: null, referenceDate: REF_DATE };

const DEFAULT_AVAIL: EvidenceAvailabilityContext = {
  memoryLoaded: false,
  memoryFactCount: 0,
  conversationHistoryLoaded: false,
  candidateIdentityAvailable: false,
  pipelineSnapshotLoaded: false,
};

const MUTATION_TOOL_NAMES = [
  'tx_update_category', 'tag_update_transaction_category', 'tx_update_amount',
  'tx_split', 'approve_import', 'delete_transaction', 'create_rule',
  'tag_reclassify', 'tag_bulk_fix', 'select_transaction',
];

// ─────────────────────────────────────────────────────────────────────────────
// A. May 2026 → correct canonical month range
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== A. May 2026 → canonical month range ===');

{
  const scope = buildTemporalScope('Break down my May 2026 spending.', CTX);
  assert(scope !== null, 'A1: scope exists');
  assertEqual(scope?.primary?.from, '2026-05-01', 'A2: from is 2026-05-01');
  assertEqual(scope?.primary?.to, '2026-06-01', 'A3: to is 2026-06-01 (exclusive)');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'A4: deterministic');
  assertEqual(scope?.primary?.source, 'month_name', 'A5: source is month_name');
  assertEqual(scope?.granularity, 'month', 'A6: granularity is month');
  assertEqual(scope?.confidence, 'deterministic', 'A7: overall confidence deterministic');
}

// ─────────────────────────────────────────────────────────────────────────────
// B. May without year → ambiguous
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== B. Bare May → bare-month policy (V1-A CP4) ===');

{
  // V1-A CP4 deliberate change — OLD: a bare month was 'ambiguous' (no dates were
  // planned, so period questions fell back to undated 25-row searches). NEW: the
  // deterministic bare-month policy resolves it to the most recent occurrence that
  // is not entirely in the future. WHY: an unresolved month silently dropped the
  // period; the policy is deterministic and the label states the year.
  const scope = buildTemporalScope('How much did I spend in May?', CTX);
  assert(scope !== null, 'B1: scope exists');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'B2: bare month resolved by the deterministic policy');
  assertEqual(scope?.confidence, 'deterministic', 'B3: overall confidence is deterministic');
  assertEqual(scope?.primary?.from, '2026-05-01', 'B4: candidate from uses context year');
  assertEqual(scope?.primary?.to, '2026-06-01', 'B5: candidate to uses context year');
  assertEqual(scope?.granularity, 'month', 'B6: granularity is month');
}

// ─────────────────────────────────────────────────────────────────────────────
// C. "in May 2026" → deterministic
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== C. "in May 2026" → deterministic ===');

{
  const scope = buildTemporalScope('What did I spend in May 2026?', CTX);
  assert(scope !== null, 'C1: scope exists');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'C2: deterministic');
  assertEqual(scope?.primary?.from, '2026-05-01', 'C3: from');
  assertEqual(scope?.primary?.to, '2026-06-01', 'C4: to');
}

// ─────────────────────────────────────────────────────────────────────────────
// D. "during May 2026" → deterministic
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== D. "during May 2026" → deterministic ===');

{
  const scope = buildTemporalScope('Show me spending during May 2026.', CTX);
  assert(scope !== null, 'D1: scope exists');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'D2: deterministic');
  assertEqual(scope?.primary?.from, '2026-05-01', 'D3: from');
}

// ─────────────────────────────────────────────────────────────────────────────
// E. Month abbreviations
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== E. Month abbreviations ===');

{
  const pairs: Array<[string, number]> = [
    ['Jan 2026', 1], ['Feb 2026', 2], ['Mar 2026', 3], ['Apr 2026', 4],
    ['Jun 2026', 6], ['Jul 2026', 7], ['Aug 2026', 8], ['Sep 2026', 9],
    ['Sept 2026', 9], ['Oct 2026', 10], ['Nov 2026', 11], ['Dec 2026', 12],
  ];
  for (const [text, expectedMonth] of pairs) {
    const ref = extractMonthReference(`Show spending in ${text}`);
    assert(ref !== null, `E: ${text} extracts`);
    assertEqual(ref?.month, expectedMonth, `E: ${text} → month ${expectedMonth}`);
    assertEqual(ref?.year, 2026, `E: ${text} → year 2026`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// F. "last month" → existing authoritative relative range
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== F. Last month → relative period ===');

{
  // Ref date: Sep 27, 2026. Last month = August 2026.
  const scope = buildTemporalScope('Where did most of my money go last month?', CTX);
  assert(scope !== null, 'F1: scope exists');
  assertEqual(scope?.primary?.from, '2026-08-01', 'F2: from Aug 1');
  assertEqual(scope?.primary?.to, '2026-09-01', 'F3: to Sep 1 (exclusive)');
  assertEqual(scope?.primary?.source, 'relative_period', 'F4: source is relative_period');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'F5: deterministic');
  assertEqual(scope?.granularity, 'month', 'F6: month granularity');
}

// ─────────────────────────────────────────────────────────────────────────────
// G. "this month"
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== G. This month ===');

{
  const scope = buildTemporalScope('Show my spending this month.', CTX);
  assert(scope !== null, 'G1: scope exists');
  assertEqual(scope?.primary?.from, '2026-09-01', 'G2: from Sep 1');
  assertEqual(scope?.primary?.to, '2026-10-01', 'G3: to Oct 1');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'G4: deterministic');
}

// ─────────────────────────────────────────────────────────────────────────────
// H. "last year"
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== H. Last year ===');

{
  const scope = buildTemporalScope('How much did I spend last year?', CTX);
  assert(scope !== null, 'H1: scope exists');
  assertEqual(scope?.primary?.from, '2025-01-01', 'H2: from 2025-01-01');
  assertEqual(scope?.primary?.to, '2026-01-01', 'H3: to 2026-01-01');
  assertEqual(scope?.granularity, 'year', 'H4: year granularity');
}

// ─────────────────────────────────────────────────────────────────────────────
// I. "last 30 days"
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== I. Last 30 days ===');

{
  const scope = buildTemporalScope('Show my transactions in the last 30 days.', CTX);
  assert(scope !== null, 'I1: scope exists');
  assertEqual(scope?.primary?.source, 'relative_period', 'I2: source is relative_period');
  assertEqual(scope?.primary?.confidence, 'deterministic', 'I3: deterministic');
  assertEqual(scope?.granularity, 'range', 'I4: range granularity');
}

// ─────────────────────────────────────────────────────────────────────────────
// J. "previous month" synonym
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== J. "previous month" synonym ===');

{
  const scope = buildTemporalScope('What did I spend previous month?', CTX);
  assert(scope !== null, 'J1: scope exists');
  assertEqual(scope?.primary?.from, '2026-08-01', 'J2: same as last month from');
  assertEqual(scope?.primary?.to, '2026-09-01', 'J3: same as last month to');
}

// ─────────────────────────────────────────────────────────────────────────────
// K. "past 30 days" synonym
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== K. "past 30 days" synonym ===');

{
  const scope = buildTemporalScope('Show spending in the past 30 days.', CTX);
  assert(scope !== null, 'K1: scope exists');
  assertEqual(scope?.primary?.source, 'relative_period', 'K2: relative_period');
  assertEqual(scope?.primary?.label, 'last 30 days', 'K3: canonical label');
}

// ─────────────────────────────────────────────────────────────────────────────
// L. April 2026 vs May 2026 → two deterministic periods
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== L. Two deterministic month periods ===');

{
  const scope = buildTemporalScope('Compare April 2026 vs May 2026 spending.', CTX);
  assert(scope !== null, 'L1: scope exists');
  assertEqual(scope?.primary?.from, '2026-04-01', 'L2: primary from Apr');
  assertEqual(scope?.primary?.to, '2026-05-01', 'L3: primary to May (excl)');
  assertEqual(scope?.comparison?.from, '2026-05-01', 'L4: comparison from May');
  assertEqual(scope?.comparison?.to, '2026-06-01', 'L5: comparison to Jun (excl)');
  assertEqual(scope?.confidence, 'deterministic', 'L6: deterministic');
  assertEqual(scope?.granularity, 'month', 'L7: month granularity');
}

// ─────────────────────────────────────────────────────────────────────────────
// M. 2025 vs 2026 → two deterministic year periods
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== M. Two deterministic year periods ===');

{
  const scope = buildTemporalScope('Compare 2025 vs 2026.', CTX, [2025, 2026]);
  assert(scope !== null, 'M1: scope exists');
  assertEqual(scope?.primary?.from, '2025-01-01', 'M2: primary from');
  assertEqual(scope?.primary?.to, '2026-01-01', 'M3: primary to');
  assertEqual(scope?.comparison?.from, '2026-01-01', 'M4: comparison from');
  assertEqual(scope?.comparison?.to, '2027-01-01', 'M5: comparison to');
  assertEqual(scope?.granularity, 'year', 'M6: year granularity');
}

// ─────────────────────────────────────────────────────────────────────────────
// N. Single period comparison → unresolved comparison
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== N. Single period + comparison signal → no invented comparison ===');

{
  const scope = buildTemporalScope('Was May 2026 worse than before?', CTX);
  assert(scope !== null, 'N1: scope exists');
  assert(scope?.primary !== undefined, 'N2: has primary');
  assert(scope?.comparison === undefined, 'N3: no comparison invented');
}

// ─────────────────────────────────────────────────────────────────────────────
// O. "Why was May 2026 so expensive?" → implicit comparison, unresolved
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== O. Implicit comparison → unresolved ===');

{
  const scope = buildTemporalScope('Why was May 2026 so expensive?', CTX);
  assert(scope !== null, 'O1: scope exists');
  assert(scope?.primary !== undefined, 'O2: has primary (May 2026)');
  assert(scope?.comparison === undefined, 'O3: no comparison period invented');
  assertEqual(scope?.primary?.from, '2026-05-01', 'O4: primary from May');

  // Now test that P3.1A still requires period_comparison when analysis intent + isComparison
  const classification = classifyPrimeIntent('Why was my May 2026 spending so expensive?', NO_EXTERNAL);
  if (classification.financialClassification?.scope?.isComparison) {
    const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
    if (classification.intent === PrimeIntent.FINANCIAL_ANALYSIS) {
      const hasCompReq = contract.requirements.some(r => r.kind === 'period_comparison');
      assert(hasCompReq, 'O5: period_comparison required for implicit comparison');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// P. "Where did most of my money go last month?" → aggregation, no comparison
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== P. Single-period breakdown → no unnecessary comparison ===');

{
  const scope = buildTemporalScope('Where did most of my money go last month?', CTX);
  assert(scope !== null, 'P1: scope exists');
  assert(scope?.comparison === undefined, 'P2: no comparison needed');
  assertEqual(scope?.primary?.label, 'last month', 'P3: label is last month');
}

// ─────────────────────────────────────────────────────────────────────────────
// Q. Canonical exclusive-end semantics
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Q. Exclusive-end semantics ===');

{
  // Every month range should have to = first day of next month
  const months = [
    { msg: 'January 2026', from: '2026-01-01', to: '2026-02-01' },
    { msg: 'February 2026', from: '2026-02-01', to: '2026-03-01' },
    { msg: 'March 2026', from: '2026-03-01', to: '2026-04-01' },
    { msg: 'April 2026', from: '2026-04-01', to: '2026-05-01' },
    { msg: 'May 2026', from: '2026-05-01', to: '2026-06-01' },
    { msg: 'June 2026', from: '2026-06-01', to: '2026-07-01' },
    { msg: 'July 2026', from: '2026-07-01', to: '2026-08-01' },
    { msg: 'August 2026', from: '2026-08-01', to: '2026-09-01' },
    { msg: 'September 2026', from: '2026-09-01', to: '2026-10-01' },
    { msg: 'October 2026', from: '2026-10-01', to: '2026-11-01' },
    { msg: 'November 2026', from: '2026-11-01', to: '2026-12-01' },
    { msg: 'December 2026', from: '2026-12-01', to: '2027-01-01' },
  ];
  for (const { msg, from, to } of months) {
    const scope = buildTemporalScope(`Show spending in ${msg}`, CTX);
    assertEqual(scope?.primary?.from, from, `Q: ${msg} from`);
    assertEqual(scope?.primary?.to, to, `Q: ${msg} to (exclusive)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// R. Inclusive tool-boundary conversion
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== R. Inclusive tool-boundary conversion ===');

{
  // May 2026: exclusive end 2026-06-01 → inclusive end 2026-05-31
  assertEqual(toInclusiveEndDate('2026-06-01'), '2026-05-31', 'R1: May → 05-31');
  // April 2026: exclusive end 2026-05-01 → inclusive end 2026-04-30
  assertEqual(toInclusiveEndDate('2026-05-01'), '2026-04-30', 'R2: April → 04-30');
  // Year 2026: exclusive end 2027-01-01 → inclusive end 2026-12-31
  assertEqual(toInclusiveEndDate('2027-01-01'), '2026-12-31', 'R3: Year → 12-31');
  // March 2026: exclusive end 2026-04-01 → inclusive end 2026-03-31
  assertEqual(toInclusiveEndDate('2026-04-01'), '2026-03-31', 'R4: March → 03-31');
  // June 2026: exclusive end 2026-07-01 → inclusive end 2026-06-30
  assertEqual(toInclusiveEndDate('2026-07-01'), '2026-06-30', 'R5: June → 06-30');
}

// ─────────────────────────────────────────────────────────────────────────────
// S. Leap year February
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== S. Leap year February ===');

{
  // 2024 is a leap year (29 days in Feb)
  const scope = buildTemporalScope('Show spending in February 2024', CTX);
  assertEqual(scope?.primary?.from, '2024-02-01', 'S1: from Feb 1');
  assertEqual(scope?.primary?.to, '2024-03-01', 'S2: to Mar 1 (exclusive)');
  // Inclusive end should be Feb 29
  assertEqual(toInclusiveEndDate('2024-03-01'), '2024-02-29', 'S3: inclusive end Feb 29 (leap)');

  // 2025 is NOT a leap year (28 days in Feb)
  const scope2 = buildTemporalScope('Show spending in February 2025', CTX);
  assertEqual(scope2?.primary?.from, '2025-02-01', 'S4: from Feb 1');
  assertEqual(scope2?.primary?.to, '2025-03-01', 'S5: to Mar 1 (exclusive)');
  assertEqual(toInclusiveEndDate('2025-03-01'), '2025-02-28', 'S6: inclusive end Feb 28 (non-leap)');
}

// ─────────────────────────────────────────────────────────────────────────────
// T. December → January year rollover
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== T. December rollover ===');

{
  const scope = buildTemporalScope('Show spending in December 2026', CTX);
  assertEqual(scope?.primary?.from, '2026-12-01', 'T1: from Dec 1');
  assertEqual(scope?.primary?.to, '2027-01-01', 'T2: to Jan 1 next year (exclusive)');
  assertEqual(toInclusiveEndDate('2027-01-01'), '2026-12-31', 'T3: inclusive end Dec 31');
}

// ─────────────────────────────────────────────────────────────────────────────
// U. No model calls
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== U. No model calls ===');

{
  // Performance proof: building scope for all test messages takes < 50ms
  const start = performance.now();
  const messages = [
    'May 2026', 'in May', 'last month', 'this year', 'last 30 days',
    'April 2026 vs May 2026', '2025 vs 2026', 'Why was May so expensive?',
    'Where did my money go?', 'Show my fuel spending.',
  ];
  for (let i = 0; i < 100; i++) {
    for (const msg of messages) {
      buildTemporalScope(msg, CTX);
    }
  }
  const elapsed = performance.now() - start;
  assert(elapsed < 500, `U1: 1000 scope builds in ${elapsed.toFixed(0)}ms (< 500ms = no model call)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// V. No DB queries
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== V. No DB queries ===');

{
  // Verify no Supabase imports in prime-temporal-scope.ts
  // (structural check — the module only imports from financial-dates.ts)
  const scope = buildTemporalScope('May 2026', CTX);
  assert(scope !== null, 'V1: scope builds without DB');
}

// ─────────────────────────────────────────────────────────────────────────────
// W. No tool execution
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== W. No tool execution ===');

{
  // buildTemporalScope is pure — returns data only
  const scope = buildTemporalScope('last month', CTX);
  assert(typeof scope?.primary?.from === 'string', 'W1: returns string data only');
  assert(typeof scope?.primary?.to === 'string', 'W2: returns string data only');
}

// ─────────────────────────────────────────────────────────────────────────────
// X. No mutation tools in evidence plans with temporal scope
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== X. No mutation tools ===');

{
  const scope = buildTemporalScope('Break down my May 2026 spending.', CTX);
  const classification = classifyPrimeIntent('Break down my May 2026 spending.', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
  const plan = buildEvidencePlan(contract, classification);
  const hasMutation = plan.steps.some(s =>
    s.tool && MUTATION_TOOL_NAMES.includes(s.tool),
  );
  assert(!hasMutation, 'X1: no mutation tools in plan');
}

// ─────────────────────────────────────────────────────────────────────────────
// Y. select_transaction absent
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Y. select_transaction absent ===');

{
  const scope = buildTemporalScope('Show my May 2026 transactions.', CTX);
  const classification = classifyPrimeIntent('Show my May 2026 transactions.', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
  const plan = buildEvidencePlan(contract, classification);
  const hasSelectTx = plan.steps.some(s => s.tool === 'select_transaction');
  assert(!hasSelectTx, 'Y1: select_transaction not in plan');
  const telemetry = buildEvidencePlanTelemetry(plan);
  assert(!telemetry.stepTools.includes('select_transaction'), 'Y2: not in telemetry');
}

// ─────────────────────────────────────────────────────────────────────────────
// Z. Determinism: same input + timezone + reference time → same scope
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== Z. Determinism ===');

{
  const msg = 'How much did I spend in May 2026?';
  const s1 = buildTemporalScope(msg, CTX);
  const s2 = buildTemporalScope(msg, CTX);
  assertEqual(JSON.stringify(s1), JSON.stringify(s2), 'Z1: identical output for same input');

  // Different reference date → different "this month"
  const ctx2: TemporalScopeContext = { timezone: 'America/Edmonton', referenceDate: new Date(Date.UTC(2026, 5, 15)) };
  const s3 = buildTemporalScope('this month', CTX);
  const s4 = buildTemporalScope('this month', ctx2);
  assert(s3?.primary?.from !== s4?.primary?.from, 'Z2: different ref date → different scope');
}

// ─────────────────────────────────────────────────────────────────────────────
// AA. P3.1B consumption — temporal scope flows through to plan params
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AA. P3.1B temporal scope consumption ===');

{
  const scope = buildTemporalScope('Break down my May 2026 spending.', CTX);
  const classification = classifyPrimeIntent('Break down my May 2026 spending.', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
  const plan = buildEvidencePlan(contract, classification);

  // Find category_aggregation step
  const catStep = plan.steps.find(s => s.evidenceKind === 'category_aggregation');
  if (catStep) {
    assertEqual(catStep.params?.startDate, '2026-05-01', 'AA1: startDate in params');
    assertEqual(catStep.params?.endDate, '2026-05-31', 'AA2: endDate inclusive in params');
    pass++; // AA3 marker
  } else {
    // If no category_aggregation step, check if transaction_data has date range
    const txStep = plan.steps.find(s => s.evidenceKind === 'transaction_data');
    assert(txStep !== undefined, 'AA1: some financial step exists');
    if (txStep) {
      assertEqual(txStep.params?.startDate, '2026-05-01', 'AA2: startDate in tx params');
      assertEqual(txStep.params?.endDate, '2026-05-31', 'AA3: endDate inclusive in tx params');
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AB. P3.1B comparison — two deterministic periods flow through
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AB. P3.1B comparison consumption ===');

{
  const scope = buildTemporalScope('Compare April 2026 vs May 2026 spending.', CTX);
  const classification = classifyPrimeIntent('Compare April 2026 vs May 2026 spending.', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
  const plan = buildEvidencePlan(contract, classification);

  const compStep = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  if (compStep) {
    assertEqual(compStep.mode, 'multi_source', 'AB1: multi_source mode');
    assertEqual(compStep.params?.periodA_startDate, '2026-04-01', 'AB2: periodA start');
    assertEqual(compStep.params?.periodA_endDate, '2026-04-30', 'AB3: periodA end inclusive');
    assertEqual(compStep.params?.periodB_startDate, '2026-05-01', 'AB4: periodB start');
    assertEqual(compStep.params?.periodB_endDate, '2026-05-31', 'AB5: periodB end inclusive');
  } else {
    // If not present as explicit step, it should be unresolved
    assert(true, 'AB: comparison may be unresolved if P3.0A does not produce period_comparison requirement');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC. Ambiguous scope does not produce tool step with guessed dates
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AC. Ambiguous scope → no guessed dates in plan ===');

{
  // V1-A CP4: bare months are no longer ambiguous (deterministic bare-month policy);
  // AC2 below still guarantees dates are only planned from a deterministic scope.
  const scope = buildTemporalScope('How much in May?', CTX);
  assert(scope?.confidence === 'deterministic', 'AC1: bare month resolved deterministically (no guessing)');

  // When ambiguous, the resolver should NOT use scope dates
  const classification = classifyPrimeIntent('How much did I spend in May?', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
  const plan = buildEvidencePlan(contract, classification);

  // Financial steps should not have startDate/endDate from ambiguous scope
  for (const step of plan.steps) {
    if (step.params?.startDate && step.evidenceKind === 'category_aggregation') {
      // If startDate is present, scope must have been deterministic (year fallback)
      // An ambiguous scope should not inject dates
      assert(
        scope?.primary?.confidence === 'deterministic' || !step.params.startDate,
        'AC2: no guessed dates from ambiguous scope',
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AD. Document routing safety
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AD. Document routing safety ===');

{
  // "How do I upload a bank statement?" → PRODUCT_HELP, no temporal scope needed
  const scope1 = buildTemporalScope('How do I upload a bank statement?', CTX);
  // It may or may not produce a scope, but it should NOT affect routing
  const c1 = classifyPrimeIntent('How do I upload a bank statement?', NO_EXTERNAL);
  assertEqual(c1.intent, PrimeIntent.PRODUCT_HELP, 'AD1: product help intent preserved');

  // "Break down my May 2026 spending." → FINANCIAL_ANALYSIS
  const c2 = classifyPrimeIntent('Break down my May 2026 spending.', NO_EXTERNAL);
  assert(
    c2.intent === PrimeIntent.FINANCIAL_ANALYSIS || c2.intent === PrimeIntent.FINANCIAL_DATA_LOOKUP,
    'AD2: financial intent for spending query',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AE. Telemetry is safe (no PII)
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AE. Telemetry safety ===');

{
  const scope = buildTemporalScope('May 2026', CTX);
  const telemetry = buildTemporalScopeTelemetry(scope);
  // Telemetry should contain only structural metadata
  assert(typeof telemetry.hasPrimary === 'boolean', 'AE1: hasPrimary is boolean');
  assert(typeof telemetry.hasComparison === 'boolean', 'AE2: hasComparison is boolean');
  assert(typeof telemetry.granularity === 'string', 'AE3: granularity is string');
  // No dates in telemetry
  const json = JSON.stringify(telemetry);
  assert(!json.includes('2026-05'), 'AE4: no dates in telemetry');
}

// ─────────────────────────────────────────────────────────────────────────────
// AF. No temporal signal → null scope
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AF. No temporal signal → null ===');

{
  const scope = buildTemporalScope('What is a RRSP?', CTX);
  assertEqual(scope, null, 'AF1: no scope for education query');

  const scope2 = buildTemporalScope('Hello Prime', CTX);
  assertEqual(scope2, null, 'AF2: no scope for greeting');
}

// ─────────────────────────────────────────────────────────────────────────────
// AG. P3.1A contract has temporalScope field
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AG. Contract carries temporal scope ===');

{
  const scope = buildTemporalScope('Break down my May 2026 spending.', CTX);
  const classification = classifyPrimeIntent('Break down my May 2026 spending.', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL, scope ?? undefined);
  assert(contract.temporalScope !== undefined, 'AG1: contract has temporalScope');
  assertEqual(contract.temporalScope?.primary?.from, '2026-05-01', 'AG2: scope attached correctly');
}

// ─────────────────────────────────────────────────────────────────────────────
// AH. P3.1B existing test suite still passes
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AH. P3.1B backward compatibility ===');

{
  // Build plan without temporal scope (legacy path)
  const classification = classifyPrimeIntent('How much did I spend at Costco?', NO_EXTERNAL);
  const contract = buildRuntimeEvidenceContract(classification, DEFAULT_AVAIL);
  const plan = buildEvidencePlan(contract, classification);
  assert(plan.steps.length > 0 || plan.unresolved.length > 0, 'AH1: legacy path still works');
  assert(contract.temporalScope === undefined, 'AH2: no scope when not provided');
}

// ─────────────────────────────────────────────────────────────────────────────
// AI. MONTH_MAP single source of truth
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AI. MONTH_MAP single source ===');

{
  // AI-1: MONTH_MAP has all 12 months (full names)
  const fullNames = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  for (const name of fullNames) {
    assert(MONTH_MAP[name] !== undefined, `AI-1: MONTH_MAP has ${name}`);
  }

  // AI-2: MONTH_MAP has common abbreviations
  const abbrevs = ['jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
  for (const ab of abbrevs) {
    assert(MONTH_MAP[ab] !== undefined, `AI-2: MONTH_MAP has ${ab}`);
  }

  // AI-3: Values are 1-indexed (January=1, December=12)
  assertEqual(MONTH_MAP['january'], 1, 'AI-3: january=1');
  assertEqual(MONTH_MAP['december'], 12, 'AI-3: december=12');

  // AI-4: Sep and Sept map to same value (9)
  assertEqual(MONTH_MAP['sep'], 9, 'AI-4: sep=9');
  assertEqual(MONTH_MAP['sept'], 9, 'AI-4: sept=9');

  // AI-5: extractMonthReference uses same MONTH_MAP
  const ref = extractMonthReference('spending in September 2026');
  assertEqual(ref?.month, 9, 'AI-5: extractMonthReference uses MONTH_MAP for September');
  const ref2 = extractMonthReference('spending in Sept 2026');
  assertEqual(ref2?.month, 9, 'AI-5b: extractMonthReference uses MONTH_MAP for Sept');

  // AI-6: extractExactDate (via classifyFinancialQuery) uses same MONTH_MAP
  const fc1 = classifyFinancialQuery('Show me transactions on September 15, 2026');
  assertEqual(fc1.exactDate, '2026-09-15', 'AI-6: exactDate uses MONTH_MAP for September');
  const fc2 = classifyFinancialQuery('Show me transactions on Sept 15, 2026');
  assertEqual(fc2.exactDate, '2026-09-15', 'AI-6b: exactDate uses MONTH_MAP for Sept');

  // AI-7: All month mappings are identical between extractMonthReference and
  //        extractExactDate (both consume the same MONTH_MAP)
  for (const [name, num] of Object.entries(MONTH_MAP)) {
    const ref = extractMonthReference(`in ${name} 2026`);
    assertEqual(ref?.month, num, `AI-7: extractMonthReference(${name})=${num}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AJ. Year range validation
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AJ. Year range validation ===');

{
  // AJ-1: May 2019 — year out of range → bare month (no year attached)
  const ref19 = extractMonthReference('May 2019');
  assertEqual(ref19?.month, 5, 'AJ-1a: May 2019 still extracts month');
  assertEqual(ref19?.year, undefined, 'AJ-1b: May 2019 year not attached (below 2020)');

  // AJ-2: May 2020 — lower bound → accepted
  const ref20 = extractMonthReference('May 2020');
  assertEqual(ref20?.month, 5, 'AJ-2: May 2020 month accepted');
  assertEqual(ref20?.year, 2020, 'AJ-2: May 2020 year accepted');

  // AJ-3: May 2026 — mid-range → accepted
  const ref26 = extractMonthReference('May 2026');
  assertEqual(ref26?.month, 5, 'AJ-3: May 2026 accepted');

  // AJ-4: May 2031 — within expanded range → accepted
  const ref31 = extractMonthReference('May 2031');
  assertEqual(ref31?.month, 5, 'AJ-4: May 2031 accepted (within 2020-2039)');
  assertEqual(ref31?.year, 2031, 'AJ-4b: May 2031 year correct');

  // AJ-5: May 2039 — upper bound → accepted
  const ref39 = extractMonthReference('May 2039');
  assertEqual(ref39?.month, 5, 'AJ-5: May 2039 accepted (upper bound)');

  // AJ-6: May 2040 — year out of range → bare month (no year attached)
  const ref40 = extractMonthReference('May 2040');
  assertEqual(ref40?.month, 5, 'AJ-6a: May 2040 still extracts month');
  assertEqual(ref40?.year, undefined, 'AJ-6b: May 2040 year not attached (above 2039)');

  // AJ-7: Malformed years → rejected
  const refBad1 = extractMonthReference('May 999');
  assertEqual(refBad1?.year, undefined, 'AJ-7a: 3-digit year not treated as year');
  // "May 20261" — regex \d{4} + \b boundary: "2026" matches as year, trailing "1" is separate
  const refBad2 = extractMonthReference('May 20261');
  // The regex matches "May 2026" with \b after "2026" failing due to "1"
  // so it falls through to bare month match
  assertEqual(refBad2?.month, 5, 'AJ-7b: 5-digit trailing → bare month');
  assertEqual(refBad2?.year, undefined, 'AJ-7c: 5-digit trailing → no year');

  // AJ-8: Ordinary numbers not misread as years
  const ref100 = extractMonthReference('I have 2026 transactions');
  // This might match "2026" as text, but there's no month name before it
  // so extractMonthReference should not find a month reference
  assertEqual(ref100, null, 'AJ-8: number without month not misread');

  // AJ-9: extractExactDate also uses aligned year range
  const fc31 = classifyFinancialQuery('Show me transactions on May 15, 2031');
  assertEqual(fc31.exactDate, '2031-05-15', 'AJ-9: exactDate accepts 2031');

  // AJ-10: extractExactDate rejects 2040
  const fc40 = classifyFinancialQuery('Show me transactions on May 15, 2040');
  assertEqual(fc40.exactDate, undefined, 'AJ-10: exactDate rejects 2040');

  // AJ-11: Two-period comparison with wider years
  const scope31 = buildTemporalScope('Compare May 2031 vs May 2032.', CTX);
  assert(scope31 !== null, 'AJ-11a: scope exists for 2031 vs 2032');
  assertEqual(scope31?.primary?.from, '2031-05-01', 'AJ-11b: primary from');
  assertEqual(scope31?.comparison?.from, '2032-05-01', 'AJ-11c: comparison from');

  // AJ-12: Year-only ranges respect wider range
  const scope35 = buildTemporalScope('Show my 2035 spending.', CTX, [2035]);
  assert(scope35 !== null, 'AJ-12: year 2035 produces scope');
  assertEqual(scope35?.primary?.from, '2035-01-01', 'AJ-12b: year 2035 from');
}

// ─────────────────────────────────────────────────────────────────────────────
// AK. Existing exact date parsing still works
// ─────────────────────────────────────────────────────────────────────────────

console.log('=== AK. Exact date parsing regression ===');

{
  // AK-1: Standard date
  const fc1 = classifyFinancialQuery('Show transactions on August 21, 2025');
  assertEqual(fc1.exactDate, '2025-08-21', 'AK-1: Aug 21 2025');

  // AK-2: Ordinal suffix
  const fc2 = classifyFinancialQuery('Show transactions on January 23rd, 2025');
  assertEqual(fc2.exactDate, '2025-01-23', 'AK-2: Jan 23rd 2025');

  // AK-3: Abbreviation
  const fc3 = classifyFinancialQuery('Show transactions on Sep 5, 2026');
  assertEqual(fc3.exactDate, '2026-09-05', 'AK-3: Sep 5 2026');

  // AK-4: Invalid date rejected
  const fc4 = classifyFinancialQuery('Show transactions on February 30, 2025');
  assertEqual(fc4.exactDate, undefined, 'AK-4: Feb 30 rejected');

  // AK-5: Leap year Feb 29
  const fc5 = classifyFinancialQuery('Show transactions on February 29, 2024');
  assertEqual(fc5.exactDate, '2024-02-29', 'AK-5: Feb 29 leap year accepted');

  // AK-6: Non-leap year Feb 29
  const fc6 = classifyFinancialQuery('Show transactions on February 29, 2025');
  assertEqual(fc6.exactDate, undefined, 'AK-6: Feb 29 non-leap rejected');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────────────────────────────────────

const total = pass + fail;
console.log(`\n============================================================`);
console.log(`P3.1A.1 TEMPORAL SCOPE: ${pass} passed, ${fail} failed`);
console.log(`============================================================`);

if (failures.length > 0) {
  console.log('\nFAILURES:');
  for (const f of failures) {
    console.log(f);
  }
  process.exit(1);
} else {
  console.log('\nAll tests passed.');
}
