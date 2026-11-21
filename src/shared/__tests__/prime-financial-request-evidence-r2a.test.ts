/**
 * PRIME REASONING V1 — R2a: FinancialRequest V2 → existing evidence intent (pure adapter).
 *
 * Parity harness: for each CP4 / P3 routing fixture, the LIVE pipeline
 *   classifyPrimeIntent(message) → buildTemporalScope → buildRuntimeEvidenceContract → buildEvidencePlan
 * is compared with the R2a path
 *   FinancialRequest V2 → financialRequestToEvidenceIntent → buildRuntimeEvidenceContract → buildEvidencePlan
 * using the SAME contract and resolver. Fixed reference: 2026-10-01 12:00 America/Edmonton (as CP4).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyPrimeIntent, PrimeIntent } from '../prime-intent-classifier';
import { buildTemporalScope } from '../prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../prime-evidence-contract';
import { buildEvidencePlan, type PrimeEvidencePlan } from '../prime-evidence-resolver';
import {
  financialRequestToEvidenceIntent,
  type FinancialRequestEvidenceIntent,
} from '../prime-financial-request-evidence';

const REF = new Date('2026-10-01T18:00:00Z');
const CTX = { timezone: 'America/Edmonton', referenceDate: REF };
const AVAIL = {
  memoryLoaded: false, memoryFactCount: 0, conversationHistoryLoaded: false,
  candidateIdentityAvailable: false, pipelineSnapshotLoaded: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- authoring shape for fixtures
type Req = Record<string, any>;
const R = (o: Req): Req => ({ version: 2, authority: 'semantic_claim', domain: 'transactions', ...o });
const cat = (value: string) => ({ kind: 'category', value, source: 'user_message' });
const merch = (value: string) => ({ kind: 'merchant', value, source: 'user_message' });
const month = (m: number, year?: number) => ({ kind: 'calendar_month', month: m, ...(year ? { year } : {}) });
const prev = (unit: string) => ({ kind: 'previous', unit });
const cur = (unit: string) => ({ kind: 'current', unit });

function livePlan(message: string, ext: { candidateFollowUpDetected?: boolean } = {}) {
  const intent = classifyPrimeIntent(message, {
    candidateFollowUpDetected: !!ext.candidateFollowUpDetected,
    historicalReferenceDetected: false,
  });
  const ts = buildTemporalScope(message, CTX, intent.financialClassification?.years);
  const contract = buildRuntimeEvidenceContract(intent, AVAIL, ts ?? undefined);
  return { intent, ts, contract, plan: buildEvidencePlan(contract, intent) };
}

function adapted(req: unknown): FinancialRequestEvidenceIntent {
  return financialRequestToEvidenceIntent(req, CTX);
}

function adapterPlan(req: unknown) {
  const r = adapted(req);
  if (r.status !== 'mapped') throw new Error(`expected mapped, got ${JSON.stringify(r)}`);
  const contract = buildRuntimeEvidenceContract(r.classification, AVAIL, r.temporalScope ?? undefined);
  return { r, ts: r.temporalScope, contract, plan: buildEvidencePlan(contract, r.classification) };
}

const toolSteps = (p: PrimeEvidencePlan) =>
  p.steps.filter(s => s.mode === 'tool' || s.mode === 'multi_source').map(s => ({ kind: s.evidenceKind, tool: s.tool, params: s.params }));
const requiredKinds = (c: { requirements: Array<{ kind: string; required: boolean }> }) =>
  c.requirements.filter(x => x.required).map(x => x.kind).sort();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Strict parity: identical contract requirements, temporal scope and plan
// ─────────────────────────────────────────────────────────────────────────────

const STRICT: Array<[string, Req]> = [
  // cash flow — period spending / income / inflow / outflow / net (CP4 families 1–4)
  ['How much did I spend this month?', R({ operation: 'total', measures: ['spending'], period: cur('month') })],
  ['What did I spend last month?', R({ operation: 'total', measures: ['spending'], period: prev('month') })],
  ['My total spending in September.', R({ operation: 'total', measures: ['spending'], period: month(9) })],
  ['Spending so far this year.', R({ operation: 'total', measures: ['spending'], period: { kind: 'year_to_date' } })],
  ['What were my expenses in September 2026?', R({ operation: 'total', measures: ['spending'], period: month(9, 2026) })],
  ['Income last month.', R({ operation: 'total', measures: ['income'], period: prev('month') })],
  ['How much did I make in September?', R({ operation: 'total', measures: ['income'], period: month(9) })],
  ['What came in last month?', R({ operation: 'total', measures: ['inflow'], period: prev('month') })],
  ['What went out last month?', R({ operation: 'total', measures: ['outflow'], period: prev('month') })],
  ['Cash flow last month.', R({ operation: 'total', measures: ['net'], period: prev('month') })],
  ['How much came in and went out last month?', R({ operation: 'total', measures: ['inflow', 'outflow'], period: prev('month') })],
  // rolling / explicit range / calendar year
  ['How much did I spend in the past 30 days?', R({ operation: 'total', measures: ['spending'], period: { kind: 'rolling', count: 30, unit: 'day' } })],
  ['How much did I spend from 2026-09-01 to 2026-09-15?', R({ operation: 'total', measures: ['spending'], period: { kind: 'range', start: '2026-09-01', end: '2026-09-15' } })],
  ['How much did I spend in 2025?', R({ operation: 'total', measures: ['spending'], period: { kind: 'calendar_year', year: 2025 } })],
  // category totals (CP4 family 5)
  ['My groceries in September.', R({ operation: 'total', subjects: [cat('groceries')], period: month(9) })],
  ['How much did I spend on groceries in September?', R({ operation: 'total', measures: ['spending'], subjects: [cat('groceries')], period: month(9) })],
  // category breakdown (CP4 family 6)
  ['Category breakdown for September.', R({ operation: 'total', grouping: 'category', period: month(9) })],
  ['Give me my category breakdown for September.', R({ operation: 'total', grouping: 'category', period: month(9) })],
  // category / explicit transaction lists (CP4 families 7–8)
  ['Show my grocery transactions.', R({ operation: 'list', measures: ['transactions'], subjects: [cat('grocery')] })],
  ['List grocery purchases in September.', R({ operation: 'list', measures: ['transactions'], subjects: [cat('grocery')], period: month(9) })],
  ['Show me my September transactions.', R({ operation: 'list', measures: ['transactions'], period: month(9) })],
  ['List my transactions in September.', R({ operation: 'list', measures: ['transactions'], period: month(9) })],
  // merchant totals / lists (CP4 family 9 — merchant architecture owns them)
  ['How much did I spend at Costco in August?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')], period: month(8) })],
  ['How much did I spend at Costco this month?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')], period: cur('month') })],
  ['What did I spend at Costco?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')] })],
  ['Show me Costco purchases.', R({ operation: 'list', measures: ['transactions'], subjects: [merch('Costco')] })],
  // period comparisons (CP4 family 17)
  ['How much did I spend this month vs last month?', R({ operation: 'total', measures: ['spending'], period: cur('month'), comparison: { kind: 'period', period: prev('month') } })],
  ['Compare my spending in September vs August.', R({ operation: 'total', measures: ['spending'], period: month(9), comparison: { kind: 'period', period: month(8) } })],
  // no period (CP4 family 18): no silent all-history cash-flow plan
  ['How much did I spend?', R({ operation: 'total', measures: ['spending'] })],
  ['How much income did I have?', R({ operation: 'total', measures: ['income'] })],
];

describe('R2a strict parity with the live CP4 / P3 pipeline', () => {
  it.each(STRICT)('%s', (message, req) => {
    const live = livePlan(message);
    const a = adapterPlan(req);
    expect(a.r.classification.intent).toBe(live.intent.intent);
    expect(requiredKinds(a.contract)).toEqual(requiredKinds(live.contract));
    expect(a.ts ?? null).toEqual(live.ts ?? null);
    expect(a.plan).toEqual(live.plan);
  });

  it('parity fixtures really exercise every evidence family', () => {
    const tools = new Set(STRICT.flatMap(([m]) => toolSteps(livePlan(m).plan).map(s => s.tool)));
    for (const t of ['cash_flow_summary', 'transaction_category_totals', 'tx_search', 'merchant_totals']) {
      expect(tools, t).toContain(t);
    }
    expect(STRICT.some(([m]) => livePlan(m).plan.steps.some(s => s.mode === 'multi_source'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tool parity where only the live intent LABEL depends on wording
// ─────────────────────────────────────────────────────────────────────────────
// The live classifier labels "breakdown" (one word) as analysis but "break down" / "biggest
// categories" as lookup. R2a labels every category grouping as analysis. The retrieval plan
// (tools + parameters + unresolved) is identical; only optional, non-retrieval hints differ.

describe('R2a tool parity (intent label is wording-dependent in the live classifier)', () => {
  it.each([
    ['Break down my September spending by category.', R({ operation: 'total', measures: ['spending'], grouping: 'category', period: month(9) })],
    ['Biggest spending categories last month.', R({ operation: 'total', measures: ['spending'], grouping: 'category', period: prev('month') })],
    ['What are my biggest spending categories?', R({ operation: 'total', measures: ['spending'], grouping: 'category' })],
  ] as Array<[string, Req]>)('%s', (message, req) => {
    const live = livePlan(message);
    const a = adapterPlan(req);
    expect(toolSteps(a.plan)).toEqual(toolSteps(live.plan));
    expect(a.plan.unresolved).toEqual(live.plan.unresolved);
    expect(a.ts ?? null).toEqual(live.ts ?? null);
    expect(toolSteps(a.plan)[0].tool).toBe('transaction_category_totals');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2b. Known LIVE divergence (documented, not copied into the adapter)
// ─────────────────────────────────────────────────────────────────────────────
// Live defect: the classifier reads "last 3 months" as a requested count of 3 rows, so the live
// plan is tx_search{limit: 3} over an undated range instead of a 3-month spending total. The
// adapter represents the rolling period explicitly and plans the cash-flow total. Reported for R2b.

describe('known live divergence: rolling months read as a row count', () => {
  it('live plans a 3-row list; R2a plans a 3-month cash-flow total', () => {
    const live = livePlan('How much did I spend in the last 3 months?');
    expect(live.intent.financialClassification).toMatchObject({ requestShape: 'list', requestedCount: 3 });
    expect(toolSteps(live.plan)[0]).toMatchObject({ tool: 'tx_search', params: { limit: 3 } });
    const a = adapterPlan(R({ operation: 'total', measures: ['spending'], period: { kind: 'rolling', count: 3, unit: 'month' } }));
    expect(a.ts?.primary).toMatchObject({ from: '2026-07-02', to: '2026-10-02', label: 'last 3 months' });
    expect(toolSteps(a.plan)).toEqual([{ kind: 'cash_flow', tool: 'cash_flow_summary', params: { startDate: '2026-07-02', endDate: '2026-10-01' } }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Semantics the adapter must preserve
// ─────────────────────────────────────────────────────────────────────────────

describe('temporal semantics come from the live resolver', () => {
  it('current periods carry as-of (period-to-date); merchant dates stay unclamped', () => {
    const spend = adapterPlan(R({ operation: 'total', measures: ['spending'], period: cur('month') }));
    expect(spend.ts?.primary).toMatchObject({ from: '2026-10-01', to: '2026-11-01', asOf: '2026-10-01' });
    expect(toolSteps(spend.plan)[0].params).toEqual({ startDate: '2026-10-01', endDate: '2026-10-01' });
    const costco = adapterPlan(R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')], period: cur('month') }));
    expect(toolSteps(costco.plan)[0].params).toMatchObject({ startDate: '2026-10-01', endDate: '2026-10-31' });
  });

  it('bare months use the live most-recent-non-future policy', () => {
    expect(adapterPlan(R({ operation: 'total', measures: ['spending'], period: month(11) })).ts?.primary?.label).toBe('November 2025');
    expect(adapterPlan(R({ operation: 'total', measures: ['spending'], period: month(9) })).ts?.primary?.label).toBe('September 2026');
  });

  it.each([['day', 'today'], ['week', 'this week'], ['quarter', 'this quarter'], ['year', 'this year']])(
    'current %s → "%s"', (unit, label) => {
      expect(adapterPlan(R({ operation: 'total', measures: ['spending'], period: cur(unit) })).ts?.primary?.label).toBe(label);
    });

  it.each([['day', 'yesterday'], ['week', 'last week'], ['quarter', 'last quarter'], ['year', 'last year']])(
    'previous %s → "%s"', (unit, label) => {
      expect(adapterPlan(R({ operation: 'total', measures: ['spending'], period: prev(unit) })).ts?.primary?.label).toBe(label);
    });

  it('a derived comparison is required but never fabricated (left unresolved, like the live implicit comparison)', () => {
    const a = adapterPlan(R({ operation: 'total', measures: ['spending'], period: prev('month'), comparison: { kind: 'previous_equivalent' } }));
    expect(a.r.notes).toContain('comparison_period_unresolved');
    expect(a.ts?.comparison).toBeUndefined();
    expect(requiredKinds(a.contract)).toContain('period_comparison');
    expect(a.plan.steps.some(s => s.evidenceKind === 'period_comparison')).toBe(false);
  });

  it('all_time has no temporal scope (same as an unscoped question)', () => {
    const a = adapterPlan(R({ operation: 'total', measures: ['spending'], period: { kind: 'all_time' } }));
    expect(a.ts).toBeNull();
    expect(a.plan.unresolved).toContainEqual({ evidenceKind: 'cash_flow', reason: 'ambiguous_request' });
  });
});

describe('category and merchant semantics', () => {
  it('categories resolve through the live taxonomy; a canonical categoryHint passes through', () => {
    const a = adapted(R({ operation: 'total', subjects: [{ kind: 'category', value: 'food shopping', categoryHint: 'Groceries', source: 'user_message' }], period: month(9) }));
    expect(a.status).toBe('mapped');
    if (a.status === 'mapped') expect(a.classification.financialClassification?.resolvedCategory?.category).toBe('Groceries');
  });

  it('spending on an ordinary category asks for outflow only (live CP4 rule)', () => {
    const a = adapterPlan(R({ operation: 'total', measures: ['spending'], subjects: [cat('groceries')], period: month(9) }));
    expect(toolSteps(a.plan)[0].params).toMatchObject({ category: 'Groceries', type: 'expense' });
  });

  it('a subject category (income) becomes the subject, never a category filter', () => {
    const a = adapterPlan(R({ operation: 'total', subjects: [cat('income')], period: month(9) }));
    expect(toolSteps(a.plan)[0].tool).toBe('cash_flow_summary');
  });

  it('a merchant subject is an UNTRUSTED claim (merchant-hint trust must ground it)', () => {
    const a = adapted(R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')] }));
    expect(a.status).toBe('mapped');
    if (a.status === 'mapped') {
      expect(a.classification.financialClassification?.merchantHintSource).toBe('noun_suffix');
      expect(a.notes).toContain('merchant_claim_untrusted');
    }
  });

  it('a list limit becomes the requested count (recency order only)', () => {
    const a = adapterPlan(R({ operation: 'list', measures: ['transactions'], order: { by: 'date', direction: 'desc' }, limit: 5, period: month(9) }));
    expect(toolSteps(a.plan)[0]).toMatchObject({ tool: 'tx_search', params: { limit: 5 } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Ambiguity, identity, refunds, mutations — explicit non-plans
// ─────────────────────────────────────────────────────────────────────────────

const AMBIG_OPERATION = {
  dimension: 'operation',
  interpretations: [
    { id: 'total_spend', summary: 'Total spent', operation: 'total' },
    { id: 'list_rows', summary: 'The transactions', operation: 'list' },
  ],
};

describe('ambiguous requests', () => {
  it('resolution "ask" → clarify, no plan', () => {
    expect(adapted(R({ operation: 'total', measures: ['spending'], period: prev('month'), ambiguities: [{ ...AMBIG_OPERATION, resolution: 'ask' }] })))
      .toEqual({ status: 'clarify', dimensions: ['operation'] });
  });

  it('resolution "present_both" → unsupported (multiple plans are not built here)', () => {
    expect(adapted(R({ operation: 'total', measures: ['spending'], period: prev('month'), ambiguities: [{ ...AMBIG_OPERATION, resolution: 'present_both' }] })))
      .toEqual({ status: 'unsupported', reason: 'multiple_readings' });
  });

  it('resolution "assume_disclosed" applies the named reading and marks it for disclosure', () => {
    const a = adapterPlan(R({
      operation: 'total', measures: ['transactions'], period: prev('month'),
      ambiguities: [{ ...AMBIG_OPERATION, resolution: 'assume_disclosed', assumed: 'list_rows' }],
    }));
    expect(a.r.assumedInterpretation).toBe('list_rows');
    expect(a.r.notes).toContain('assumption_disclosed');
    expect(toolSteps(a.plan)[0].tool).toBe('tx_search');
  });
});

const TX_UUID = '9b2f6a4e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

describe('identity-sensitive requests never produce identity or aggregates', () => {
  it.each([
    [{ kind: 'candidate_frame_all' }, 'candidate_frame_all'],
    [{ kind: 'candidate_frame', ordinal: 2 }, 'candidate_frame'],
    [{ kind: 'ui_selection' }, 'ui_selection'],
    [{ kind: 'transaction_id', id: TX_UUID, source: 'ui_context' }, 'transaction_id'],
  ])('reference %j → identity_required (Layer 2 / select_transaction)', (reference, kind) => {
    const r = adapted(R({ operation: 'total', reference }));
    expect(r).toEqual({ status: 'identity_required', reference: kind });
    expect(JSON.stringify(r)).not.toContain(TX_UUID);
  });

  it('live parity: a candidate follow-up is not an aggregate in either path', () => {
    expect(toolSteps(livePlan('How much did those ten cost?', { candidateFollowUpDetected: true }).plan)).toEqual([]);
    expect(adapted(R({ operation: 'total', reference: { kind: 'candidate_frame_all' } })).status).toBe('identity_required');
  });

  it('a mutation proposal is never authorized here (Tag lifecycle owns it)', () => {
    const r = adapted(R({ operation: 'none', action: { kind: 'mutation_proposal', mutation: 'change_category', target: { kind: 'candidate_frame', ordinal: 3 }, value: 'Groceries' } }));
    expect(r).toEqual({ status: 'unsupported', reason: 'mutation_requires_tag_lifecycle' });
    expect(toolSteps(livePlan('Change the third one to Groceries.').plan).some(s => s.tool === 'transaction_category_totals' || s.tool === 'cash_flow_summary')).toBe(false);
  });
});

describe('refunds: no authoritative refund semantics in either path', () => {
  it('V2 represents refunds as an unsupported capability → unsupported', () => {
    expect(adapted(R({ operation: 'total', capability: { status: 'unsupported', concept: 'refunds', reason: 'no_authoritative_semantics' }, period: prev('month') })))
      .toEqual({ status: 'unsupported', reason: 'capability_unsupported' });
  });
  it('the live pipeline likewise plans no aggregate evidence for refunds', () => {
    const tools = toolSteps(livePlan('What refunds did I receive last month?').plan).map(s => s.tool);
    expect(tools).not.toContain('cash_flow_summary');
    expect(tools).not.toContain('transaction_category_totals');
  });
});

describe('explicit unsupported results', () => {
  it.each([
    ['trend', R({ operation: 'trend', measures: ['spending'], period: { kind: 'rolling', count: 6, unit: 'month' } }), 'trend_not_planned'],
    ['count_distinct', R({ operation: 'count_distinct', distinctBy: 'merchant', period: prev('month') }), 'count_distinct'],
    ['merchant grouping', R({ operation: 'total', grouping: 'merchant', period: prev('month') }), 'grouping_not_planned'],
    ['monthly grouping', R({ operation: 'total', grouping: 'month', period: { kind: 'calendar_year', year: 2025 } }), 'grouping_not_planned'],
    ['biggest (order by amount)', R({ operation: 'list', order: { by: 'amount', direction: 'desc' }, limit: 3 }), 'order_not_planned'],
    ['oldest (date asc)', R({ operation: 'list', order: { by: 'date', direction: 'asc' }, limit: 3 }), 'order_not_planned'],
    ['exclusion', R({ operation: 'total', subjects: [{ ...cat('groceries'), exclude: true }], period: prev('month') }), 'exclusion_filters'],
    ['account scope', R({ operation: 'total', subjects: [{ kind: 'account', value: 'visa', source: 'user_message' }] }), 'account_scope'],
    ['two categories', R({ operation: 'total', subjects: [cat('groceries'), cat('fuel')] }), 'multiple_subjects'],
    ['merchant + category', R({ operation: 'total', subjects: [merch('Costco'), cat('groceries')] }), 'mixed_subjects'],
    ['unknown category', R({ operation: 'total', subjects: [cat('zzzz widgets')] }), 'unresolved_category'],
    ['conflicting measures', R({ operation: 'total', measures: ['debt_payment', 'income'] }), 'multiple_measures'],
    ['rolling quarters', R({ operation: 'total', measures: ['spending'], period: { kind: 'rolling', count: 2, unit: 'quarter' } }), 'unsupported_period'],
    ['past-year YTD', R({ operation: 'total', measures: ['spending'], period: { kind: 'year_to_date', year: 2024 } }), 'unsupported_period'],
    ['previous request', R({ operation: 'total', mode: 'refine_previous', reference: { kind: 'previous_request' } }), 'requires_previous_request'],
    ['UI view', R({ operation: 'total', reference: { kind: 'ui_view' } }), 'ui_context_not_wired'],
    ['conversation entity', R({ operation: 'total', reference: { kind: 'conversation_entity', value: 'that store' } }), 'requires_conversation_resolution'],
    ['unknown capability', R({ operation: 'total', capability: { status: 'unknown', concept: 'net worth' } }), 'capability_unsupported'],
  ] as Array<[string, Req, string]>)('%s → %s', (_l, req, reason) => {
    expect(adapted(req)).toEqual({ status: 'unsupported', reason });
  });

  it.each([
    ['goals', R({ domain: 'goals', operation: 'list' })],
    ['product', R({ domain: 'product', operation: 'explain' })],
    ['explain', R({ operation: 'explain', measures: ['spending'], period: prev('month') })],
  ] as Array<[string, Req]>)('%s → not_applicable', (_l, req) => {
    expect(adapted(req)).toEqual({ status: 'not_applicable', reason: 'not_transaction_data' });
  });

  it.each([
    ['retired V1 version', { ...R({ operation: 'total' }), version: 1 }],
    ['smuggled amount', { ...R({ operation: 'total' }), amount: 42.5 }],
    ['smuggled verified flag', { ...R({ operation: 'total' }), verified: true }],
    ['not an object', 'how much did I spend'],
  ] as Array<[string, unknown]>)('invalid input (%s) → invalid, never planned', (_l, input) => {
    expect(adapted(input).status).toBe('invalid');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. No fabrication, purity, not wired
// ─────────────────────────────────────────────────────────────────────────────

describe('no fabricated amounts, identities or evidence', () => {
  it.each(STRICT)('%s: output carries no amounts, exact dates, ids or evidence', (_m, req) => {
    const r = adapted(req);
    expect(r.status).toBe('mapped');
    if (r.status !== 'mapped') return;
    const fc = r.classification.financialClassification!;
    expect(fc.exactAmount).toBeUndefined();
    expect(fc.exactDate).toBeUndefined();
    expect(fc.scope.message).toBe('');
    expect(fc.scope.isMutation).toBe(false);
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(json).not.toMatch(/"(amount|total|balance|transactionId|transaction_id|rows|evidence)"\s*:/);
  });

  it('evidence labels match the live P3.0A contracts exactly (drift guard)', () => {
    const lookup = classifyPrimeIntent('How much did I spend last month?', { candidateFollowUpDetected: false, historicalReferenceDetected: false });
    const analysis = classifyPrimeIntent('Compare my spending in September vs August.', { candidateFollowUpDetected: false, historicalReferenceDetected: false });
    expect(lookup.intent).toBe(PrimeIntent.FINANCIAL_DATA_LOOKUP);
    expect(analysis.intent).toBe(PrimeIntent.FINANCIAL_ANALYSIS);
    const a1 = adapted(R({ operation: 'total', measures: ['spending'], period: prev('month') }));
    const a2 = adapted(R({ operation: 'total', measures: ['spending'], period: month(9), comparison: { kind: 'period', period: month(8) } }));
    expect(a1.status === 'mapped' && a1.classification.proposedEvidence).toEqual(lookup.proposedEvidence);
    expect(a2.status === 'mapped' && a2.classification.proposedEvidence).toEqual(analysis.proposedEvidence);
  });

  it('is deterministic and does not mutate its input', () => {
    const req = R({ operation: 'total', measures: ['spending'], subjects: [cat('groceries')], period: month(9) });
    const snapshot = JSON.stringify(req);
    expect(adapted(req)).toEqual(adapted(req));
    expect(JSON.stringify(req)).toBe(snapshot);
  });

  it('is pure and not wired into production (R2a)', () => {
    const root = path.resolve(__dirname, '../../..');
    const src = fs.readFileSync(path.join(root, 'src/shared/prime-financial-request-evidence.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"][^'"]*(supabase|openai|anthropic|netlify|chat)[^'"]*['"]/i);
    expect(src).not.toMatch(/\bfetch\(|process\.env|Date\.now\(/);
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '__tests__' || e.name.startsWith('.') || e.name === 'functions_old') continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('prime-financial-request-evidence')) importers.push(p);
      }
    };
    walk(path.join(root, 'src'));
    walk(path.join(root, 'netlify/functions'));
    expect(importers.map(p => path.relative(root, p).replace(/\\/g, '/'))).toEqual([]);
  });
});
