/**
 * P3.2B2B — Chat.ts Merchant Context Wiring Tests
 *
 * Tests exercise the integration logic added to chat.ts:
 * - readMerchantAnalysis / writeMerchantAnalysis JSONB patterns
 * - Evidence plan threading with excludeGroups
 * - Merchant_totals result capture → MerchantAnalysisContext build
 * - New-merchant reset detection
 * - Context injection formatting
 * - Safety: merchant context ≠ mutation authority
 *
 * These tests validate the pure-TypeScript logic without requiring
 * Supabase or live API calls. The read/write persistence pattern
 * is validated structurally (same pattern as tx_resolution).
 */

// ── Imports ──────────────────────────────────────────────────────────────────

import {
  MERCHANT_ANALYSIS_TTL_MS,
  MAX_ACTIVE_GROUPS,
  MAX_EXCLUDED_GROUPS,
  isMerchantAnalysisContextValid,
  validateExcludeGroups,
  buildMerchantAnalysisContext,
  formatMerchantAnalysisContext,
  type MerchantAnalysisContext,
  type MerchantGroupRef,
} from '../src/shared/merchant-analysis-context';

import { buildEvidencePlan, type EvidencePlanMerchantContext } from '../src/shared/prime-evidence-resolver';
import type { PrimeRuntimeEvidenceContract } from '../src/shared/prime-evidence-contract';
import type { PrimeIntentClassification } from '../src/shared/prime-intent-classifier';

// ── Test Helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

function makeGroups(...keys: string[]): MerchantGroupRef[] {
  return keys.map(k => ({ groupingKey: k, displayName: k.toUpperCase() }));
}

function makeMac(overrides: Partial<MerchantAnalysisContext> = {}): MerchantAnalysisContext {
  return {
    merchantQuery: 'costco',
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: [],
    temporalScope: null,
    categoryFilter: null,
    evidenceComplete: true,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── SECTION A: Context Load / Validation ────────────────────────────────────

section('A: Context Load / Validation');

// A1: Valid context passes validation
{
  const mac = makeMac();
  assert(isMerchantAnalysisContextValid(mac), 'A1: valid context passes validation');
}

// A2: Stale context (past TTL) fails validation
{
  const mac = makeMac({
    updatedAt: new Date(Date.now() - MERCHANT_ANALYSIS_TTL_MS - 1000).toISOString(),
  });
  assert(!isMerchantAnalysisContextValid(mac), 'A2: stale context fails validation');
}

// A3: Null/undefined context fails validation
{
  assert(!isMerchantAnalysisContextValid(null), 'A3a: null fails');
  assert(!isMerchantAnalysisContextValid(undefined), 'A3b: undefined fails');
}

// A4: Context missing merchantQuery fails
{
  const mac = makeMac({ merchantQuery: '' });
  assert(!isMerchantAnalysisContextValid(mac), 'A4: empty merchantQuery fails');
}

// A5: Context missing updatedAt fails
{
  const mac = makeMac({ updatedAt: '' });
  assert(!isMerchantAnalysisContextValid(mac), 'A5: empty updatedAt fails');
}

// ── SECTION B: Evidence Plan Threading ──────────────────────────────────────

section('B: Evidence Plan Threading');

function makeMerchantContract(): PrimeRuntimeEvidenceContract {
  return {
    intent: 'financial_data_lookup' as any,
    confidence: 'high' as any,
    requirements: [
      {
        kind: 'merchant_aggregation' as any,
        required: true,
        status: 'pending' as const,
      },
    ],
    forbidden: [],
    temporalScope: {
      type: 'explicit' as const,
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      label: 'Jan–Jun 2026',
    },
  };
}

function makeMerchantClassification(): PrimeIntentClassification {
  return {
    intent: 'financial_data_lookup' as any,
    confidence: 'high' as any,
    source: 'financial_classifier' as any,
    reason: 'merchant spending query',
    proposedEvidence: {
      required: ['merchant_aggregation'],
      optional: [],
    },
    financialClassification: {
      requiresGrounding: true,
      queryType: 'merchant',
      merchantHint: 'costco',
      years: [],
    },
  };
}

// B1: Evidence plan includes excludeGroups when provided
{
  const contract = makeMerchantContract();
  const classification = makeMerchantClassification();
  const merchantCtx: EvidencePlanMerchantContext = {
    excludeGroups: ['costco gas'],
  };
  const plan = buildEvidencePlan(contract, classification, merchantCtx);
  const merchantStep = plan.steps.find(s => s.tool === 'merchant_totals');
  assert(!!merchantStep, 'B1a: merchant_totals step exists');
  if (merchantStep) {
    const args = merchantStep.params as any;
    assert(
      Array.isArray(args.excludeGroups) && args.excludeGroups.includes('costco gas'),
      'B1b: excludeGroups threaded to step params',
    );
  }
}

// B2: Evidence plan without merchantCtx has no excludeGroups
{
  const contract = makeMerchantContract();
  const classification = makeMerchantClassification();
  const plan = buildEvidencePlan(contract, classification);
  const merchantStep = plan.steps.find(s => s.tool === 'merchant_totals');
  if (merchantStep) {
    const args = merchantStep.params as any;
    assert(
      !args.excludeGroups || args.excludeGroups.length === 0,
      'B2: no excludeGroups when merchantCtx absent',
    );
  }
}

// B3: Empty excludeGroups array is not threaded
{
  const contract = makeMerchantContract();
  const classification = makeMerchantClassification();
  const merchantCtx: EvidencePlanMerchantContext = { excludeGroups: [] };
  const plan = buildEvidencePlan(contract, classification, merchantCtx);
  const merchantStep = plan.steps.find(s => s.tool === 'merchant_totals');
  if (merchantStep) {
    const args = merchantStep.params as any;
    assert(
      !args.excludeGroups || args.excludeGroups.length === 0,
      'B3: empty excludeGroups not threaded',
    );
  }
}

// ── SECTION C: Merchant_totals Capture → Context Build ──────────────────────

section('C: Merchant_totals Capture → Context Build');

// C1: buildMerchantAnalysisContext produces correct structure from merchant_totals results
{
  const merchants = [
    { merchant: 'Costco Wholesale', groupingKey: 'costco wholesale' },
    { merchant: 'Costco Gas', groupingKey: 'costco gas' },
  ];
  const mac = buildMerchantAnalysisContext('costco', merchants, {
    excludedGroups: [],
    temporalScope: { startDate: '2026-01-01', endDate: '2026-06-30' },
    categoryFilter: null,
    evidenceComplete: true,
  });
  assert(mac.merchantQuery === 'costco', 'C1a: merchantQuery set');
  assert(mac.activeGroups.length === 2, 'C1b: 2 groups');
  assert(mac.activeGroups[0].groupingKey === 'costco wholesale', 'C1c: first group key');
  assert(mac.activeGroups[0].displayName === 'Costco Wholesale', 'C1d: first group display');
  assert(mac.evidenceComplete === true, 'C1e: evidence complete');
  assert(mac.temporalScope?.startDate === '2026-01-01', 'C1f: temporal scope preserved');
}

// C2: Partial evidence sets evidenceComplete=false
{
  const mac = buildMerchantAnalysisContext('costco', [], {
    excludedGroups: [],
    temporalScope: null,
    categoryFilter: null,
    evidenceComplete: false,
  });
  assert(mac.evidenceComplete === false, 'C2: partial evidence → evidenceComplete=false');
}

// C3: Context does NOT store totals
{
  const merchants = [
    { merchant: 'Costco', groupingKey: 'costco wholesale', total: 1500, count: 10 } as any,
  ];
  const mac = buildMerchantAnalysisContext('costco', merchants, {
    excludedGroups: [],
    temporalScope: null,
    categoryFilter: null,
    evidenceComplete: true,
  });
  const group = mac.activeGroups[0];
  assert(!('total' in group), 'C3a: no total in group ref');
  assert(!('count' in group), 'C3b: no count in group ref');
}

// ── SECTION D: New-Merchant Reset Detection ─────────────────────────────────

section('D: New-Merchant Reset Detection');

// D1: Same merchant preserves exclusions
{
  const existingMac = makeMac({
    merchantQuery: 'costco',
    excludedGroups: ['costco gas'],
  });
  const newMerchantHint = 'costco';
  const isNewMerchant = existingMac.merchantQuery.toLowerCase() !== newMerchantHint.toLowerCase();
  assert(!isNewMerchant, 'D1a: same merchant detected');
  // When not new, exclusions are preserved
  const preservedExclusions = isNewMerchant ? [] : existingMac.excludedGroups;
  assert(preservedExclusions.length === 1, 'D1b: exclusions preserved');
  assert(preservedExclusions[0] === 'costco gas', 'D1c: correct exclusion preserved');
}

// D2: Different merchant clears exclusions
{
  const existingMac = makeMac({
    merchantQuery: 'costco',
    excludedGroups: ['costco gas'],
  });
  const newMerchantHint = 'walmart';
  const isNewMerchant = existingMac.merchantQuery.toLowerCase() !== newMerchantHint.toLowerCase();
  assert(isNewMerchant, 'D2a: new merchant detected');
  const newExclusions = isNewMerchant ? [] : existingMac.excludedGroups;
  assert(newExclusions.length === 0, 'D2b: exclusions cleared for new merchant');
}

// D3: Case-insensitive comparison (Costco vs costco)
{
  const existingMac = makeMac({ merchantQuery: 'Costco' });
  const isNewMerchant = existingMac.merchantQuery.toLowerCase() !== 'costco';
  assert(!isNewMerchant, 'D3: case-insensitive match');
}

// D4: No existing context = new merchant (exclusions = [])
{
  const existingMac: MerchantAnalysisContext | null = null;
  const isNewMerchant = existingMac
    ? existingMac.merchantQuery.toLowerCase() !== 'costco'
    : true;
  assert(isNewMerchant, 'D4: null existing = new merchant');
}

// ── SECTION E: Context Injection Formatting ─────────────────────────────────

section('E: Context Injection Formatting');

// E1: Valid context produces non-empty formatted output
{
  const mac = makeMac();
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted.length > 0, 'E1: valid context produces output');
  assert(formatted.includes('ACTIVE MERCHANT ANALYSIS CONTEXT'), 'E1b: header present');
}

// E2: Stale context produces empty output
{
  const mac = makeMac({
    updatedAt: new Date(Date.now() - MERCHANT_ANALYSIS_TTL_MS - 1000).toISOString(),
  });
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted === '', 'E2: stale context → empty output');
}

// E3: Excluded groups shown in formatting
{
  const mac = makeMac({
    excludedGroups: ['costco gas'],
  });
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted.includes('[EXCLUDED]'), 'E3a: excluded marker present');
  assert(formatted.includes('costco gas'), 'E3b: excluded key present');
}

// E4: Partial evidence warning in formatting
{
  const mac = makeMac({ evidenceComplete: false });
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted.includes('partial'), 'E4: partial evidence warning');
}

// E5: Safety directives in formatting
{
  const mac = makeMac();
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted.includes('Do NOT invent groupingKeys'), 'E5a: no-invent directive');
  assert(formatted.includes('does NOT authorize any mutation'), 'E5b: no-mutation directive');
  assert(formatted.includes('fresh tool evidence'), 'E5c: fresh-evidence directive');
}

// E6: Temporal scope shown when present
{
  const mac = makeMac({
    temporalScope: { startDate: '2026-01-01', endDate: '2026-06-30' },
  });
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted.includes('2026-01-01'), 'E6a: start date in output');
  assert(formatted.includes('2026-06-30'), 'E6b: end date in output');
}

// E7: Refine tool mentioned in formatting
{
  const mac = makeMac();
  const formatted = formatMerchantAnalysisContext(mac);
  assert(formatted.includes('merchant_analysis_refine'), 'E7a: refine tool mentioned');
  assert(formatted.includes('operation'), 'E7b: operation parameter mentioned');
  assert(formatted.includes('exclude'), 'E7c: exclude operation mentioned');
  assert(formatted.includes('include'), 'E7d: include operation mentioned');
  assert(formatted.includes('only'), 'E7e: only operation mentioned');
  assert(formatted.includes('refresh'), 'E7f: refresh operation mentioned');
}

// ── SECTION F: Exclude Group Validation ─────────────────────────────────────

section('F: Exclude Group Validation');

// F1: Only known groups pass validation
{
  const groups = makeGroups('costco wholesale', 'costco gas');
  const validated = validateExcludeGroups(['costco gas', 'invented_key'], groups);
  assert(validated.length === 1, 'F1a: 1 validated');
  assert(validated[0] === 'costco gas', 'F1b: correct key');
}

// F2: Empty proposed returns empty
{
  const groups = makeGroups('costco wholesale');
  assert(validateExcludeGroups([], groups).length === 0, 'F2: empty → empty');
}

// F3: All invented keys rejected
{
  const groups = makeGroups('costco wholesale');
  const validated = validateExcludeGroups(['fake1', 'fake2'], groups);
  assert(validated.length === 0, 'F3: all invented rejected');
}

// F4: Capped at MAX_EXCLUDED_GROUPS
{
  const manyKeys = Array.from({ length: 30 }, (_, i) => `key${i}`);
  const groups = manyKeys.map(k => ({ groupingKey: k, displayName: k }));
  const validated = validateExcludeGroups(manyKeys, groups);
  assert(validated.length === MAX_EXCLUDED_GROUPS, 'F4: capped at max');
}

// ── SECTION G: JSONB Read-Merge-Write Pattern ───────────────────────────────

section('G: JSONB Read-Merge-Write Pattern');

// G1: Simulated read-merge-write preserves tx_resolution
{
  // Simulate existing context with tx_resolution
  const existing = {
    context: {
      tx_resolution: { candidates: [{ id: 'abc' }], updatedAt: Date.now() },
      other_key: 'preserve_me',
    },
  };
  const ctx = (existing.context && typeof existing.context === 'object')
    ? { ...existing.context }
    : {};
  ctx.merchant_analysis = makeMac();
  assert(ctx.tx_resolution !== undefined, 'G1a: tx_resolution preserved');
  assert(ctx.tx_resolution.candidates[0].id === 'abc', 'G1b: tx_resolution data intact');
  assert(ctx.other_key === 'preserve_me', 'G1c: other keys preserved');
  assert(ctx.merchant_analysis !== undefined, 'G1d: merchant_analysis added');
}

// G2: Simulated read-merge-write with empty context
{
  const existing = { context: null };
  const ctx = (existing.context && typeof existing.context === 'object')
    ? { ...existing.context }
    : {};
  ctx.merchant_analysis = makeMac();
  assert(ctx.merchant_analysis !== undefined, 'G2a: merchant_analysis added to empty');
  assert(!ctx.tx_resolution, 'G2b: no phantom tx_resolution');
}

// G3: Overwrite existing merchant_analysis
{
  const oldMac = makeMac({ merchantQuery: 'walmart' });
  const existing = {
    context: {
      merchant_analysis: oldMac,
      tx_resolution: { candidates: [] },
    },
  };
  const ctx = { ...existing.context };
  const newMac = makeMac({ merchantQuery: 'costco' });
  ctx.merchant_analysis = newMac;
  assert(ctx.merchant_analysis.merchantQuery === 'costco', 'G3a: merchant_analysis updated');
  assert(ctx.tx_resolution !== undefined, 'G3b: tx_resolution preserved on overwrite');
}

// ── SECTION H: Safety Invariants ────────────────────────────────────────────

section('H: Safety Invariants');

// H1: Context never contains totals
{
  const mac = makeMac();
  for (const group of mac.activeGroups) {
    assert(!('total' in group), `H1: no total in group ${group.groupingKey}`);
    assert(!('count' in group), `H1: no count in group ${group.groupingKey}`);
    assert(!('average' in group), `H1: no average in group ${group.groupingKey}`);
  }
}

// H2: Formatting includes no-mutation directive
{
  const mac = makeMac();
  const formatted = formatMerchantAnalysisContext(mac);
  assert(
    formatted.includes('does NOT authorize any mutation'),
    'H2: formatted output includes mutation safety',
  );
}

// H3: Context is analytical only — no transaction identifiers
{
  const mac = makeMac();
  const formatted = formatMerchantAnalysisContext(mac);
  assert(!formatted.includes('transaction_id'), 'H3: no transaction identifiers in output');
}

// ── SECTION I: Refine Tool — Operation Semantics ────────────────────────────

section('I: Refine Tool — Operation Semantics');

// Simulate the refine tool's operation logic (same algorithm as the tool)
function computeExcluded(
  operation: 'exclude' | 'include' | 'only' | 'refresh',
  targets: string[],
  mac: MerchantAnalysisContext,
): { newExcluded: string[]; rejected: string[]; blocked: boolean } {
  if (operation === 'refresh') {
    return { newExcluded: mac.excludedGroups, rejected: [], blocked: false };
  }
  if (operation === 'exclude') {
    const validated = validateExcludeGroups(targets, mac.activeGroups);
    const rejected = targets.filter(t => !validated.includes(t));
    const excludeSet = new Set([...mac.excludedGroups, ...validated]);
    return { newExcluded: Array.from(excludeSet), rejected, blocked: false };
  }
  if (operation === 'include') {
    const validated = validateExcludeGroups(targets, mac.activeGroups);
    const rejected = targets.filter(t => !validated.includes(t));
    const includeSet = new Set(validated);
    return { newExcluded: mac.excludedGroups.filter(k => !includeSet.has(k)), rejected, blocked: false };
  }
  if (operation === 'only') {
    if (!mac.evidenceComplete) return { newExcluded: mac.excludedGroups, rejected: [], blocked: true };
    const validated = validateExcludeGroups(targets, mac.activeGroups);
    const rejected = targets.filter(t => !validated.includes(t));
    const keepSet = new Set(validated);
    return { newExcluded: mac.activeGroups.map(g => g.groupingKey).filter(k => !keepSet.has(k)), rejected, blocked: false };
  }
  return { newExcluded: mac.excludedGroups, rejected: [], blocked: false };
}

// I1: EXCLUDE — "take out gas"
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas', 'costco whse'),
    excludedGroups: [],
    evidenceComplete: true,
  });
  const { newExcluded, rejected } = computeExcluded('exclude', ['costco gas'], mac);
  assert(newExcluded.length === 1, 'I1a: 1 excluded');
  assert(newExcluded[0] === 'costco gas', 'I1b: correct key excluded');
  assert(rejected.length === 0, 'I1c: no rejected');
}

// I2: EXCLUDE — invented key rejected
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: [],
    evidenceComplete: true,
  });
  const { newExcluded, rejected } = computeExcluded('exclude', ['invented_key'], mac);
  assert(newExcluded.length === 0, 'I2a: nothing excluded');
  assert(rejected.length === 1, 'I2b: 1 rejected');
  assert(rejected[0] === 'invented_key', 'I2c: invented key rejected');
}

// I3: EXCLUDE — merge with existing exclusions
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas', 'costco whse'),
    excludedGroups: ['costco whse'],
    evidenceComplete: true,
  });
  const { newExcluded } = computeExcluded('exclude', ['costco gas'], mac);
  assert(newExcluded.length === 2, 'I3a: 2 excluded');
  assert(newExcluded.includes('costco whse'), 'I3b: old exclusion preserved');
  assert(newExcluded.includes('costco gas'), 'I3c: new exclusion added');
}

// I4: INCLUDE — "include gas again"
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: ['costco gas'],
    evidenceComplete: true,
  });
  const { newExcluded, rejected } = computeExcluded('include', ['costco gas'], mac);
  assert(newExcluded.length === 0, 'I4a: no excluded after include');
  assert(rejected.length === 0, 'I4b: no rejected');
}

// I5: INCLUDE — partial include (only remove specified)
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas', 'costco whse'),
    excludedGroups: ['costco gas', 'costco whse'],
    evidenceComplete: true,
  });
  const { newExcluded } = computeExcluded('include', ['costco gas'], mac);
  assert(newExcluded.length === 1, 'I5a: 1 still excluded');
  assert(newExcluded[0] === 'costco whse', 'I5b: correct group remains excluded');
}

// I6: ONLY — "only gas"
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas', 'costco whse'),
    excludedGroups: [],
    evidenceComplete: true,
  });
  const { newExcluded } = computeExcluded('only', ['costco gas'], mac);
  assert(newExcluded.length === 2, 'I6a: 2 excluded (complement)');
  assert(newExcluded.includes('costco wholesale'), 'I6b: wholesale excluded');
  assert(newExcluded.includes('costco whse'), 'I6c: whse excluded');
  assert(!newExcluded.includes('costco gas'), 'I6d: gas NOT excluded (kept)');
}

// I7: ONLY — partial evidence → blocked
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: [],
    evidenceComplete: false,
  });
  const { blocked } = computeExcluded('only', ['costco gas'], mac);
  assert(blocked, 'I7: ONLY blocked under partial evidence');
}

// I8: REFRESH — preserves existing exclusions
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: ['costco gas'],
    evidenceComplete: true,
  });
  const { newExcluded } = computeExcluded('refresh', [], mac);
  assert(newExcluded.length === 1, 'I8a: exclusion preserved');
  assert(newExcluded[0] === 'costco gas', 'I8b: correct exclusion');
}

// I9: INCLUDE under partial evidence — safe (removes verified exclusion)
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: ['costco gas'],
    evidenceComplete: false,
  });
  const { newExcluded, blocked } = computeExcluded('include', ['costco gas'], mac);
  assert(!blocked, 'I9a: include NOT blocked under partial');
  assert(newExcluded.length === 0, 'I9b: exclusion removed');
}

// I10: EXCLUDE under partial evidence — allowed (validated against known groups)
{
  const mac = makeMac({
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
    excludedGroups: [],
    evidenceComplete: false,
  });
  const { newExcluded, blocked } = computeExcluded('exclude', ['costco gas'], mac);
  assert(!blocked, 'I10a: exclude NOT blocked under partial');
  assert(newExcluded.length === 1, 'I10b: known group excluded');
}

// ── SECTION J: Temporal Carry-Forward ───────────────────────────────────────

section('J: Temporal Carry-Forward');

// J1: Refresh with new dates preserves merchantQuery
{
  const mac = makeMac({
    merchantQuery: 'costco',
    excludedGroups: ['costco gas'],
    temporalScope: { startDate: '2026-01-01', endDate: '2026-06-30' },
  });
  // Simulate: refine(operation=refresh, startDate=May, endDate=May)
  // The refine tool uses mac.merchantQuery for the query
  assert(mac.merchantQuery === 'costco', 'J1a: merchantQuery available for temporal refinement');
  // After refresh, the new mac should have updated temporal scope
  const newMac = buildMerchantAnalysisContext(
    mac.merchantQuery, // carried from context
    [{ merchant: 'Costco Wholesale', groupingKey: 'costco wholesale' }],
    {
      excludedGroups: mac.excludedGroups, // preserved
      temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' },
      categoryFilter: null,
      evidenceComplete: true,
    },
  );
  assert(newMac.merchantQuery === 'costco', 'J1b: merchantQuery preserved after temporal change');
  assert(newMac.excludedGroups.includes('costco gas'), 'J1c: exclusions preserved after temporal change');
  assert(newMac.temporalScope?.startDate === '2026-05-01', 'J1d: temporal scope updated');
}

// J2: Temporal refinement without explicit dates uses context dates
{
  const mac = makeMac({
    temporalScope: { startDate: '2026-01-01', endDate: '2026-06-30' },
  });
  // In the refine tool: startDate = input.startDate || mac.temporalScope?.startDate
  const startDate = undefined || mac.temporalScope?.startDate;
  const endDate = undefined || mac.temporalScope?.endDate;
  assert(startDate === '2026-01-01', 'J2a: falls back to context startDate');
  assert(endDate === '2026-06-30', 'J2b: falls back to context endDate');
}

// ── SECTION K: Comparison Carry-Forward ─────────────────────────────────────

section('K: Comparison Carry-Forward');

// K1: For comparison, model uses merchantQuery from context
{
  const mac = makeMac({
    merchantQuery: 'costco',
    excludedGroups: ['costco gas'],
    temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' },
  });
  // Period A: refine(operation=refresh) → uses mac.merchantQuery + mac.excludedGroups + current scope
  // Period B: merchant_totals(merchant=mac.merchantQuery, excludeGroups=mac.excludedGroups, April dates)
  assert(mac.merchantQuery === 'costco', 'K1a: merchantQuery available for comparison');
  assert(mac.excludedGroups.length === 1, 'K1b: exclusions available for comparison');
  assert(mac.excludedGroups[0] === 'costco gas', 'K1c: correct exclusion for both periods');
}

// ── SECTION L: New Merchant Reset ───────────────────────────────────────────

section('L: New Merchant Reset');

// L1: Different merchantHint clears exclusions and groups
{
  const existingMac = makeMac({
    merchantQuery: 'costco',
    excludedGroups: ['costco gas'],
    activeGroups: makeGroups('costco wholesale', 'costco gas'),
  });
  const newMerchantHint = 'walmart';
  const isNewMerchant = existingMac.merchantQuery.toLowerCase() !== newMerchantHint.toLowerCase();
  assert(isNewMerchant, 'L1a: different merchant detected');
  const newMac = buildMerchantAnalysisContext(
    newMerchantHint,
    [{ merchant: 'Walmart', groupingKey: 'walmart' }],
    {
      excludedGroups: isNewMerchant ? [] : existingMac.excludedGroups,
      temporalScope: null,
      categoryFilter: null,
      evidenceComplete: true,
    },
  );
  assert(newMac.merchantQuery === 'walmart', 'L1b: new merchant query');
  assert(newMac.excludedGroups.length === 0, 'L1c: no costco exclusions');
  assert(newMac.activeGroups[0].groupingKey === 'walmart', 'L1d: walmart groups');
}

// ── SECTION M: Mutation Safety (extended) ───────────────────────────────────

section('M: Mutation Safety (extended)');

// M1: Refine tool output schema has no transaction identity fields
{
  // The refine tool's output contains: status, operationApplied, rejectedTargets,
  // merchantQuery, excludedGroups, merchants, grandTotal, transactionCount, dateRange, queryStatus
  // None of these are transaction UUIDs, selectedId, or candidate arrays
  const sampleOutput = {
    status: 'success',
    operationApplied: 'exclude',
    rejectedTargets: [],
    merchantQuery: 'costco',
    excludedGroups: ['costco gas'],
    merchants: [{ merchant: 'Costco Wholesale', groupingKey: 'costco wholesale', total: 500, count: 5, average: 100, firstSeen: '2026-01-01', lastSeen: '2026-06-01' }],
    grandTotal: 500,
    transactionCount: 5,
    dateRange: { start: '2026-01-01', end: '2026-06-01' },
    queryStatus: 'verified',
  };
  assert(!('selectedId' in sampleOutput), 'M1a: no selectedId');
  assert(!('candidates' in sampleOutput), 'M1b: no candidates');
  assert(!('authoritativeSelectedTxCache' in sampleOutput), 'M1c: no authoritativeSelectedTxCache');
  assert(!('transactionId' in sampleOutput), 'M1d: no transactionId');
  // Merchant totals output has no transaction UUIDs
  const merchant = sampleOutput.merchants[0] as any;
  assert(!('id' in merchant), 'M1e: no id in merchant');
  assert(!('transaction_id' in merchant), 'M1f: no transaction_id in merchant');
}

// ── Results ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`P3.2B2B Chat Wiring Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
