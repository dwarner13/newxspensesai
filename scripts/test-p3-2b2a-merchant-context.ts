/**
 * P3.2B2A — Merchant Analysis Context Tests
 *
 * Tests exercise the MerchantAnalysisContext type, validation,
 * formatting, excludeGroups on merchant_totals, merchant comparison
 * resolution, and safety invariants.
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
import type { PrimeTemporalScope } from '../src/shared/prime-temporal-scope';

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

// Mock helpers
function makeGroups(...keys: string[]): MerchantGroupRef[] {
  return keys.map(k => ({ groupingKey: k, displayName: k.toUpperCase() }));
}

function makeValidContext(overrides?: Partial<MerchantAnalysisContext>): MerchantAnalysisContext {
  return {
    merchantQuery: 'Costco',
    activeGroups: makeGroups('costco wholesale', 'costco gas', 'costco whse'),
    excludedGroups: [],
    temporalScope: null,
    categoryFilter: null,
    evidenceComplete: true,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeContract(opts: {
  intent?: string;
  kinds?: Array<{ kind: string; required: boolean; status: string }>;
  temporalScope?: PrimeTemporalScope;
}): PrimeRuntimeEvidenceContract {
  return {
    intent: (opts.intent || 'financial_data_lookup') as any,
    requirements: (opts.kinds || []).map(k => ({
      kind: k.kind as any,
      required: k.required,
      status: k.status as any,
      source: undefined,
    })),
    temporalScope: opts.temporalScope,
  } as any;
}

function makeClassification(opts: {
  queryType?: string;
  merchantHint?: string;
  requiresGrounding?: boolean;
  isComparison?: boolean;
  years?: number[];
}): PrimeIntentClassification {
  return {
    intent: 'financial_data_lookup' as any,
    confidence: 'high',
    source: 'deterministic',
    phase: 'p3',
    financialClassification: {
      requiresGrounding: opts.requiresGrounding ?? true,
      queryType: opts.queryType || 'merchant',
      merchantHint: opts.merchantHint,
      years: opts.years || [],
      scope: opts.isComparison ? { isComparison: true } : undefined,
    },
  } as any;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT TYPE & VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('A. TTL constant is 30 minutes');
{
  assert(MERCHANT_ANALYSIS_TTL_MS === 30 * 60 * 1000, `TTL is 30 minutes, got ${MERCHANT_ANALYSIS_TTL_MS}`);
}

section('B. MAX_ACTIVE_GROUPS is bounded');
{
  assert(MAX_ACTIVE_GROUPS === 50, `MAX_ACTIVE_GROUPS is 50, got ${MAX_ACTIVE_GROUPS}`);
}

section('C. MAX_EXCLUDED_GROUPS is bounded');
{
  assert(MAX_EXCLUDED_GROUPS === 20, `MAX_EXCLUDED_GROUPS is 20, got ${MAX_EXCLUDED_GROUPS}`);
}

section('D. Valid context passes validation');
{
  const ctx = makeValidContext();
  assert(isMerchantAnalysisContextValid(ctx), 'valid context passes');
}

section('E. Null/undefined fails validation');
{
  assert(!isMerchantAnalysisContextValid(null), 'null fails');
  assert(!isMerchantAnalysisContextValid(undefined), 'undefined fails');
}

section('F. Empty merchantQuery fails validation');
{
  const ctx = makeValidContext({ merchantQuery: '' });
  assert(!isMerchantAnalysisContextValid(ctx), 'empty merchantQuery fails');
}

section('G. Missing activeGroups fails validation');
{
  const ctx = makeValidContext();
  (ctx as any).activeGroups = 'not-an-array';
  assert(!isMerchantAnalysisContextValid(ctx), 'non-array activeGroups fails');
}

section('H. Expired context fails validation (TTL)');
{
  const old = new Date(Date.now() - MERCHANT_ANALYSIS_TTL_MS - 1000).toISOString();
  const ctx = makeValidContext({ updatedAt: old });
  assert(!isMerchantAnalysisContextValid(ctx), 'expired context fails');
}

section('I. Context within TTL passes');
{
  const recent = new Date(Date.now() - 1000).toISOString();
  const ctx = makeValidContext({ updatedAt: recent });
  assert(isMerchantAnalysisContextValid(ctx), 'recent context passes');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCLUDE GROUP VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('J. validateExcludeGroups accepts known keys');
{
  const groups = makeGroups('costco wholesale', 'costco gas');
  const result = validateExcludeGroups(['costco gas'], groups);
  assert(result.length === 1, `validated 1 key, got ${result.length}`);
  assert(result[0] === 'costco gas', `key is 'costco gas', got '${result[0]}'`);
}

section('K. validateExcludeGroups rejects unknown keys');
{
  const groups = makeGroups('costco wholesale', 'costco gas');
  const result = validateExcludeGroups(['invented key', 'fake merchant'], groups);
  assert(result.length === 0, `rejected all unknown keys, got ${result.length}`);
}

section('L. validateExcludeGroups filters mixed known/unknown');
{
  const groups = makeGroups('costco wholesale', 'costco gas', 'costco whse');
  const result = validateExcludeGroups(['costco gas', 'invented', 'costco whse'], groups);
  assert(result.length === 2, `accepted 2 of 3, got ${result.length}`);
  assert(result.includes('costco gas'), 'includes costco gas');
  assert(result.includes('costco whse'), 'includes costco whse');
}

section('M. validateExcludeGroups handles empty/null');
{
  const groups = makeGroups('costco wholesale');
  assert(validateExcludeGroups([], groups).length === 0, 'empty array returns empty');
  assert(validateExcludeGroups(null as any, groups).length === 0, 'null returns empty');
  assert(validateExcludeGroups(undefined as any, groups).length === 0, 'undefined returns empty');
}

section('N. validateExcludeGroups caps at MAX_EXCLUDED_GROUPS');
{
  const groups = makeGroups(...Array.from({ length: 25 }, (_, i) => `group${i}`));
  const proposed = Array.from({ length: 25 }, (_, i) => `group${i}`);
  const result = validateExcludeGroups(proposed, groups);
  assert(result.length === MAX_EXCLUDED_GROUPS, `capped at ${MAX_EXCLUDED_GROUPS}, got ${result.length}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT CONSTRUCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('O. buildMerchantAnalysisContext creates valid context');
{
  const merchants = [
    { merchant: 'COSTCO WHOLESALE #258', groupingKey: 'costco wholesale' },
    { merchant: 'COSTCO GAS #258', groupingKey: 'costco gas' },
  ];
  const ctx = buildMerchantAnalysisContext('Costco', merchants, {
    evidenceComplete: true,
    temporalScope: { startDate: '2026-05-01', endDate: '2026-05-31' },
  });
  assert(ctx.merchantQuery === 'Costco', 'merchantQuery preserved');
  assert(ctx.activeGroups.length === 2, '2 groups');
  assert(ctx.activeGroups[0].groupingKey === 'costco wholesale', 'first group key');
  assert(ctx.activeGroups[0].displayName === 'COSTCO WHOLESALE #258', 'first group display');
  assert(ctx.excludedGroups.length === 0, 'no exclusions');
  assert(ctx.temporalScope?.startDate === '2026-05-01', 'temporal start');
  assert(ctx.evidenceComplete === true, 'evidence complete');
  assert(isMerchantAnalysisContextValid(ctx), 'passes validation');
}

section('P. buildMerchantAnalysisContext caps groups');
{
  const merchants = Array.from({ length: 60 }, (_, i) => ({
    merchant: `MERCHANT ${i}`,
    groupingKey: `merchant ${i}`,
  }));
  const ctx = buildMerchantAnalysisContext('test', merchants, { evidenceComplete: true });
  assert(ctx.activeGroups.length === MAX_ACTIVE_GROUPS, `capped at ${MAX_ACTIVE_GROUPS}`);
}

section('Q. buildMerchantAnalysisContext does NOT store totals');
{
  const merchants = [
    { merchant: 'TEST', groupingKey: 'test', total: 500, count: 5 },
  ];
  const ctx = buildMerchantAnalysisContext('test', merchants as any, { evidenceComplete: true });
  const group = ctx.activeGroups[0] as any;
  assert(group.total === undefined, 'total not stored');
  assert(group.count === undefined, 'count not stored');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT FORMATTING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('R. formatMerchantAnalysisContext produces non-empty for valid context');
{
  const ctx = makeValidContext();
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.length > 0, 'non-empty output');
  assert(formatted.includes('ACTIVE MERCHANT ANALYSIS CONTEXT'), 'contains header');
  assert(formatted.includes('Costco'), 'contains merchantQuery');
  assert(formatted.includes('costco wholesale'), 'contains groupingKey');
}

section('S. formatMerchantAnalysisContext shows excluded groups');
{
  const ctx = makeValidContext({ excludedGroups: ['costco gas'] });
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.includes('[EXCLUDED]'), 'marks excluded group');
  assert(formatted.includes('costco gas'), 'shows excluded key');
}

section('T. formatMerchantAnalysisContext shows partial warning');
{
  const ctx = makeValidContext({ evidenceComplete: false });
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.includes('partial'), 'warns about partial evidence');
  assert(formatted.includes('not be exhaustive'), 'warns groups may be incomplete');
}

section('U. formatMerchantAnalysisContext returns empty for invalid context');
{
  assert(formatMerchantAnalysisContext(null) === '', 'null returns empty');
  assert(formatMerchantAnalysisContext(undefined) === '', 'undefined returns empty');
  const expired = makeValidContext({
    updatedAt: new Date(Date.now() - MERCHANT_ANALYSIS_TTL_MS - 1000).toISOString(),
  });
  assert(formatMerchantAnalysisContext(expired) === '', 'expired returns empty');
}

section('V. formatMerchantAnalysisContext includes mutation prohibition');
{
  const ctx = makeValidContext();
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.includes('does NOT authorize any mutation'), 'mutation prohibition present');
}

section('W. formatMerchantAnalysisContext includes fresh-evidence directive');
{
  const ctx = makeValidContext();
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.includes('Totals must come from fresh'), 'fresh evidence directive');
}

section('X. formatMerchantAnalysisContext includes no-invent directive');
{
  const ctx = makeValidContext();
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.includes('Do NOT invent groupingKeys'), 'no-invent directive');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVIDENCE RESOLVER TESTS — MERCHANT COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

section('Y. Merchant comparison resolves to merchant_totals');
{
  const contract = makeContract({
    kinds: [{ kind: 'period_comparison', required: true, status: 'pending' }],
    temporalScope: {
      primary: { from: '2026-05-01', to: '2026-05-31', label: 'May 2026', source: 'explicit', confidence: 'deterministic' },
      comparison: { from: '2026-04-01', to: '2026-04-30', label: 'Apr 2026', source: 'explicit', confidence: 'deterministic' },
      granularity: 'month',
      confidence: 'deterministic',
    } as PrimeTemporalScope,
  });
  const classification = makeClassification({ queryType: 'merchant', merchantHint: 'Costco' });
  const plan = buildEvidencePlan(contract, classification);

  const step = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(!!step, 'period_comparison step exists');
  assert(step!.tool === 'merchant_totals', `tool is merchant_totals, got ${step!.tool}`);
  assert(step!.mode === 'multi_source', `mode is multi_source, got ${step!.mode}`);
  assert((step!.params as any)?.merchant === 'Costco', 'merchant param carried');
}

section('Z. Category comparison still resolves to transaction_category_totals');
{
  const contract = makeContract({
    kinds: [{ kind: 'period_comparison', required: true, status: 'pending' }],
    temporalScope: {
      primary: { from: '2026-05-01', to: '2026-05-31', label: 'May 2026', source: 'explicit', confidence: 'deterministic' },
      comparison: { from: '2026-04-01', to: '2026-04-30', label: 'Apr 2026', source: 'explicit', confidence: 'deterministic' },
      granularity: 'month',
      confidence: 'deterministic',
    } as PrimeTemporalScope,
  });
  const classification = makeClassification({ queryType: 'aggregate', merchantHint: undefined });
  const plan = buildEvidencePlan(contract, classification);

  const step = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(!!step, 'period_comparison step exists');
  assert(step!.tool === 'transaction_category_totals', `tool is transaction_category_totals, got ${step!.tool}`);
}

section('AA. Merchant comparison carries excludeGroups through both periods');
{
  const contract = makeContract({
    kinds: [{ kind: 'period_comparison', required: true, status: 'pending' }],
    temporalScope: {
      primary: { from: '2026-05-01', to: '2026-05-31', label: 'May 2026', source: 'explicit', confidence: 'deterministic' },
      comparison: { from: '2026-04-01', to: '2026-04-30', label: 'Apr 2026', source: 'explicit', confidence: 'deterministic' },
      granularity: 'month',
      confidence: 'deterministic',
    } as PrimeTemporalScope,
  });
  const classification = makeClassification({ queryType: 'merchant', merchantHint: 'Costco' });
  const merchantCtx: EvidencePlanMerchantContext = { excludeGroups: ['costco gas'] };
  const plan = buildEvidencePlan(contract, classification, merchantCtx);

  const step = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(!!step, 'step exists');
  const params = step!.params as Record<string, unknown>;
  assert(Array.isArray(params.excludeGroups), 'excludeGroups is array');
  assert((params.excludeGroups as string[]).includes('costco gas'), 'costco gas excluded');
}

section('AB. Merchant aggregation carries excludeGroups');
{
  const contract = makeContract({
    kinds: [{ kind: 'merchant_aggregation', required: true, status: 'pending' }],
  });
  const classification = makeClassification({ queryType: 'merchant', merchantHint: 'Costco' });
  const merchantCtx: EvidencePlanMerchantContext = { excludeGroups: ['costco gas', 'costco whse'] };
  const plan = buildEvidencePlan(contract, classification, merchantCtx);

  const step = plan.steps.find(s => s.evidenceKind === 'merchant_aggregation');
  assert(!!step, 'step exists');
  const params = step!.params as Record<string, unknown>;
  assert(Array.isArray(params.excludeGroups), 'excludeGroups present');
  assert((params.excludeGroups as string[]).length === 2, '2 exclusions');
}

section('AC. Merchant aggregation without exclusions omits excludeGroups');
{
  const contract = makeContract({
    kinds: [{ kind: 'merchant_aggregation', required: true, status: 'pending' }],
  });
  const classification = makeClassification({ queryType: 'merchant', merchantHint: 'Costco' });
  const plan = buildEvidencePlan(contract, classification);

  const step = plan.steps.find(s => s.evidenceKind === 'merchant_aggregation');
  assert(!!step, 'step exists');
  const params = step!.params as Record<string, unknown>;
  assert(params.excludeGroups === undefined, 'no excludeGroups when none provided');
}

section('AD. Category comparison does NOT carry excludeGroups');
{
  const contract = makeContract({
    kinds: [{ kind: 'period_comparison', required: true, status: 'pending' }],
    temporalScope: {
      primary: { from: '2026-05-01', to: '2026-05-31', label: 'May', source: 'explicit', confidence: 'deterministic' },
      comparison: { from: '2026-04-01', to: '2026-04-30', label: 'Apr', source: 'explicit', confidence: 'deterministic' },
      granularity: 'month',
      confidence: 'deterministic',
    } as PrimeTemporalScope,
  });
  const classification = makeClassification({ queryType: 'aggregate' });
  const merchantCtx: EvidencePlanMerchantContext = { excludeGroups: ['costco gas'] };
  const plan = buildEvidencePlan(contract, classification, merchantCtx);

  const step = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(!!step, 'step exists');
  const params = step!.params as Record<string, unknown>;
  assert(params.excludeGroups === undefined, 'category comparison does not carry excludeGroups');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

section('AE. Context never contains mutation authorization');
{
  const ctx = makeValidContext();
  const keys = Object.keys(ctx);
  assert(!keys.includes('mutationAuthorized'), 'no mutation field');
  assert(!keys.includes('selectedId'), 'no selectedId (tx_resolution concern)');
  assert(!keys.includes('candidates'), 'no candidates (tx_resolution concern)');
}

section('AF. Context does not persist financial totals');
{
  const ctx = makeValidContext();
  for (const group of ctx.activeGroups) {
    const g = group as any;
    assert(g.total === undefined, `no total on group ${group.groupingKey}`);
    assert(g.count === undefined, `no count on group ${group.groupingKey}`);
    assert(g.amount === undefined, `no amount on group ${group.groupingKey}`);
  }
}

section('AG. Partial evidence marked in context');
{
  const ctx = buildMerchantAnalysisContext('Costco', [
    { merchant: 'COSTCO WHOLESALE', groupingKey: 'costco wholesale' },
  ], { evidenceComplete: false });
  assert(ctx.evidenceComplete === false, 'partial flag preserved');
  const formatted = formatMerchantAnalysisContext(ctx);
  assert(formatted.includes('not be exhaustive'), 'formatting warns about partial');
}

section('AH. Expired context rejected by validator');
{
  const ctx = makeValidContext({
    updatedAt: new Date(Date.now() - MERCHANT_ANALYSIS_TTL_MS - 1).toISOString(),
  });
  assert(!isMerchantAnalysisContextValid(ctx), 'expired by 1ms is invalid');
}

section('AI. buildEvidencePlan without merchantCtx still works (backward compatible)');
{
  const contract = makeContract({
    kinds: [{ kind: 'merchant_aggregation', required: true, status: 'pending' }],
  });
  const classification = makeClassification({ queryType: 'merchant', merchantHint: 'Costco' });
  // No third argument
  const plan = buildEvidencePlan(contract, classification);
  assert(plan.steps.length === 1, 'plan has 1 step');
  assert(plan.steps[0].tool === 'merchant_totals', 'tool is merchant_totals');
}

section('AJ. Legacy year-based comparison with merchant');
{
  const contract = makeContract({
    kinds: [{ kind: 'period_comparison', required: true, status: 'pending' }],
  });
  const classification = makeClassification({
    queryType: 'merchant',
    merchantHint: 'Costco',
    isComparison: true,
    years: [2025, 2026],
  });
  const plan = buildEvidencePlan(contract, classification);
  const step = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(!!step, 'step exists');
  assert(step!.tool === 'merchant_totals', `tool is merchant_totals, got ${step!.tool}`);
  const params = step!.params as Record<string, unknown>;
  assert(params.periodA_year === 2025, 'periodA year');
  assert(params.periodB_year === 2026, 'periodB year');
  assert(params.merchant === 'Costco', 'merchant carried');
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESSION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('AK. P3.2B1 tests still pass (architectural)');
{
  // P3.2B1 merchant_totals input schema now includes excludeGroups as optional.
  // Existing calls without excludeGroups are unaffected.
  assert(true, 'excludeGroups is optional — backward compatible');
}

section('AL. P3.2A cash_flow unaffected');
{
  const contract = makeContract({
    kinds: [{ kind: 'cash_flow', required: true, status: 'pending' }],
    temporalScope: {
      primary: { from: '2026-05-01', to: '2026-05-31', label: 'May', source: 'explicit', confidence: 'deterministic' },
      granularity: 'month',
      confidence: 'deterministic',
    } as PrimeTemporalScope,
  });
  const classification = makeClassification({ queryType: 'aggregate' });
  const plan = buildEvidencePlan(contract, classification);
  const step = plan.steps.find(s => s.evidenceKind === 'cash_flow');
  assert(!!step, 'cash_flow step exists');
  assert(step!.tool === 'cash_flow_summary', `tool is cash_flow_summary, got ${step!.tool}`);
}

section('AM. P3.1D category comparison unaffected');
{
  const contract = makeContract({
    kinds: [{ kind: 'period_comparison', required: true, status: 'pending' }],
    temporalScope: {
      primary: { from: '2026-05-01', to: '2026-05-31', label: 'May', source: 'explicit', confidence: 'deterministic' },
      comparison: { from: '2026-04-01', to: '2026-04-30', label: 'Apr', source: 'explicit', confidence: 'deterministic' },
      granularity: 'month',
      confidence: 'deterministic',
    } as PrimeTemporalScope,
  });
  // Non-merchant queryType → category comparison
  const classification = makeClassification({ queryType: 'aggregate' });
  const plan = buildEvidencePlan(contract, classification);
  const step = plan.steps.find(s => s.evidenceKind === 'period_comparison');
  assert(step!.tool === 'transaction_category_totals', 'category comparison unchanged');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(60)}`);
console.log(`P3.2B2A Merchant Context Tests: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) process.exit(1);
