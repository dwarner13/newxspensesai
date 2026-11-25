/**
 * PRIME REASONING V1 — R2b: shadow evidence-plan comparison + R1 defect fixes.
 *
 * Live side = the production P3/CP pipeline (classifyPrimeIntent → buildTemporalScope →
 * buildRuntimeEvidenceContract → buildEvidencePlan). Shadow side = a model reply (faked) →
 * interpretShadowSemantics (R1 validation) → R2a adapter → the SAME contract + resolver.
 * Fixed reference: 2026-10-01 12:00 America/Edmonton (as CP4 / R2a).
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { classifyPrimeIntent } from '../prime-intent-classifier';
import { buildTemporalScope } from '../prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../prime-evidence-contract';
import { buildEvidencePlan } from '../prime-evidence-resolver';
import { FINANCIAL_REQUEST_VERSION, parseFinancialRequest } from '../prime-financial-request';
import {
  interpretShadowSemantics,
  selectPriorUserMessages,
  buildShadowSemanticsMessages,
  containsModelTransactionId,
  SHADOW_RESPONSE_FORMAT,
  type ShadowModelCall,
  type ShadowOutcome,
} from '../prime-shadow-semantics';
import {
  buildShadowEvidencePlan,
  compareShadowPlan,
  runShadowPlanComparison,
  type LivePlanSnapshot,
  type ShadowPlanComparison,
} from '../prime-shadow-plan-comparison';
import * as executor from '../prime-evidence-executor';

const REF = new Date('2026-10-01T18:00:00Z');
const CTX = {
  temporal: { timezone: 'America/Edmonton', referenceDate: REF },
  availability: {
    memoryLoaded: false, memoryFactCount: 0, conversationHistoryLoaded: false,
    candidateIdentityAvailable: false, pipelineSnapshotLoaded: false,
  },
};
const TX_UUID = '9b2f6a4e-1c3d-4e5f-8a9b-0c1d2e3f4a5b';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- authoring shape for fixtures
type Req = Record<string, any>;
const R = (o: Req): Req => ({ version: FINANCIAL_REQUEST_VERSION, authority: 'semantic_claim', domain: 'transactions', ...o });
const cat = (value: string) => ({ kind: 'category', value, source: 'user_message' });
const merch = (value: string) => ({ kind: 'merchant', value, source: 'user_message' });
const reply = (obj: unknown): ShadowModelCall => async () => JSON.stringify(obj);

function live(message: string, merchantHintTrusted = false): LivePlanSnapshot {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
  const ts = buildTemporalScope(message, CTX.temporal, intent.financialClassification?.years);
  const contract = buildRuntimeEvidenceContract(intent, CTX.availability, ts ?? undefined);
  return { intent, plan: buildEvidencePlan(contract, intent), merchantHintTrusted };
}

/** The full shadow path from a (faked) model reply. */
async function shadowOutcome(modelReply: ShadowModelCall, message = 'q'): Promise<ShadowOutcome> {
  return interpretShadowSemantics({ callModel: modelReply, message, timeoutMs: 500 });
}

async function compare(message: string, req: unknown, merchantHintTrusted = false): Promise<ShadowPlanComparison> {
  const outcome = await shadowOutcome(reply(req), message);
  const r = runShadowPlanComparison(outcome, live(message, merchantHintTrusted), CTX);
  if ('error' in r) throw new Error('comparison failed');
  return r;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Valid model output reaches the adapter; agreement / disagreement
// ─────────────────────────────────────────────────────────────────────────────

describe('R2b agreement — real R1-validated V2 reaches the R2a adapter', () => {
  it.each([
    ['What did I spend last month?', R({ operation: 'total', measures: ['spending'], period: { kind: 'previous', unit: 'month' } }), ['cash_flow_summary']],
    ['How much did I spend on groceries in September?', R({ operation: 'total', measures: ['spending'], subjects: [cat('groceries')], period: { kind: 'calendar_month', month: 9 } }), ['transaction_category_totals']],
    ['Category breakdown for September.', R({ operation: 'total', grouping: 'category', period: { kind: 'calendar_month', month: 9 } }), ['transaction_category_totals']],
    ['List my transactions in September.', R({ operation: 'list', measures: ['transactions'], period: { kind: 'calendar_month', month: 9 } }), ['tx_search']],
    ['How much did I spend at Costco in August?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')], period: { kind: 'calendar_month', month: 8 } }), ['merchant_totals']],
    ['How much did I spend this month vs last month?', R({ operation: 'total', measures: ['spending'], period: { kind: 'current', unit: 'month' }, comparison: { kind: 'period', period: { kind: 'previous', unit: 'month' } } }), null],
  ] as Array<[string, Req, string[] | null]>)('%s → agree', async (message, req, tools) => {
    const c = await compare(message, req);
    expect(c.shadowStatus).toBe('mapped');
    expect(c.agreement).toBe('agree');
    expect(c.dimensions).toEqual([]);
    if (tools) expect(c.shadowTools).toEqual(tools);
    expect(c.shadowTools).toEqual(c.liveTools);
  });

  it('different plans produce a structured disagreement (dimensions, no values)', async () => {
    // Live: last month spending. Shadow (wrong reading): September groceries.
    const c = await compare('What did I spend last month?', R({ operation: 'total', subjects: [cat('groceries')], period: { kind: 'calendar_month', month: 8 } }));
    expect(c.agreement).toBe('disagree');
    expect(c.dimensions).toEqual(expect.arrayContaining(['tools', 'evidence_kinds']));
  });

  it('same tool, different period → date_range disagreement only', async () => {
    const c = await compare('What did I spend last month?', R({ operation: 'total', measures: ['spending'], period: { kind: 'calendar_month', month: 8 } }));
    expect(c).toMatchObject({ agreement: 'disagree', dimensions: ['date_range'] });
  });

  it('same tool, different category → category_filter disagreement', async () => {
    const c = await compare('My groceries in September.', R({ operation: 'total', subjects: [cat('fuel')], period: { kind: 'calendar_month', month: 9 } }));
    expect(c.agreement).toBe('disagree');
    expect(c.dimensions).toContain('category_filter');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Known live defect — regression
// ─────────────────────────────────────────────────────────────────────────────

// D1 (owner 2026-11-25): previously pinned as a surfaced disagreement (live: 3-row tx_search).
// Inverted per the acceptance criterion: live and shadow now AGREE on a 3-month cash-flow total.
describe('three-month spending: live and shadow agree (D1 fixed)', () => {
  it('live plans a 3-month cash_flow_summary; the shadow agrees; no tx_search row list', async () => {
    const message = 'How much did I spend in the last 3 months?';
    const lv = live(message);
    expect(lv.plan!.steps.find(s => s.mode === 'tool')).toMatchObject({ tool: 'cash_flow_summary', params: { startDate: '2026-07-02', endDate: '2026-10-01' } });
    const c = await compare(message, R({ operation: 'total', measures: ['spending'], period: { kind: 'rolling', count: 3, unit: 'month' } }));
    expect(c).toMatchObject({ agreement: 'agree', liveTools: ['cash_flow_summary'], shadowTools: ['cash_flow_summary'] });
    expect(c.dimensions).toEqual([]);
    // "Show my last 3 transactions" is still a 3-row list (the count path is unchanged)
    expect(live('Show my last 3 transactions').intent.financialClassification.requestedCount).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Unsupported / ambiguous / identity → no shadow plan and no execution
// ─────────────────────────────────────────────────────────────────────────────

describe('unsupported, ambiguous and identity requests never plan or execute', () => {
  it.each([
    ['refunds', R({ operation: 'total', capability: { status: 'unsupported', concept: 'refunds', reason: 'no_authoritative_semantics' }, period: { kind: 'previous', unit: 'month' } }), 'unsupported', 'capability_unsupported'],
    ['ask ambiguity', R({ operation: 'total', measures: ['spending'], period: { kind: 'previous', unit: 'month' }, ambiguities: [{ dimension: 'operation', resolution: 'ask', interpretations: [{ id: 'a', summary: 'A', operation: 'total' }, { id: 'b', summary: 'B', operation: 'list' }] }] }), 'clarify', 'ambiguity_ask'],
    ['candidate frame', R({ operation: 'total', reference: { kind: 'candidate_frame_all' } }), 'identity_required', 'candidate_frame_all'],
    ['mutation', R({ operation: 'none', action: { kind: 'mutation_proposal', mutation: 'change_category', target: { kind: 'candidate_frame', ordinal: 3 }, value: 'Groceries' } }), 'unsupported', 'mutation_requires_tag_lifecycle'],
    ['trend', R({ operation: 'trend', measures: ['spending'], period: { kind: 'rolling', count: 6, unit: 'month' } }), 'unsupported', 'trend_not_planned'],
  ] as Array<[string, Req, string, string]>)('%s → %s', async (_l, req, status, reason) => {
    const spy = vi.spyOn(executor, 'executeEvidencePlan');
    const c = await compare('What did I spend last month?', req);
    expect(c.shadowStatus).toBe(status);
    expect(c.shadowReason).toBe(reason);
    expect(c.shadowTools).toEqual([]);
    expect(c.agreement).toBe('live_only_plan');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('a non-financial request with no live plan → both_no_plan', async () => {
    const c = await compare('How secure is my data?', R({ domain: 'product', operation: 'explain' }));
    expect(c).toMatchObject({ agreement: 'both_no_plan', shadowStatus: 'not_applicable' });
  });

  it('the comparison module imports no executor, tool, database or model code', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../prime-shadow-plan-comparison.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"][^'"]*(executor|supabase|openai|anthropic|netlify|tool-gate|chat)[^'"]*['"]/i);
    expect(src).not.toMatch(/\bfetch\(|process\.env|await /);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Merchant hints stay untrusted
// ─────────────────────────────────────────────────────────────────────────────

describe('merchant trust', () => {
  it('a model-named merchant is never trusted, even when the live merchant hint is trusted', async () => {
    const c = await compare('How much did I spend at Costco in August?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')], period: { kind: 'calendar_month', month: 8 } }), true);
    expect(c.merchant).toEqual({ liveHasMerchant: true, liveMerchantTrusted: true, shadowHasMerchant: true, shadowMerchantTrusted: false });
    expect(c.shadowNotes).toContain('merchant_claim_untrusted');
  });

  it('the shadow plan carries the merchant as an untrusted noun_suffix hint (live trust gate must ground it)', async () => {
    const outcome = await shadowOutcome(reply(R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')] })));
    const p = buildShadowEvidencePlan(outcome, CTX);
    expect(p.status).toBe('planned');
    if (p.status === 'planned') expect(p.intent.classification.financialClassification?.merchantHintSource).toBe('noun_suffix');
  });

  it('a different merchant name is a merchant_filter disagreement (value not logged)', async () => {
    const c = await compare('How much did I spend at Costco in August?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Walmart')], period: { kind: 'calendar_month', month: 8 } }));
    expect(c.dimensions).toContain('merchant_filter');
    expect(JSON.stringify(c)).not.toMatch(/costco|walmart/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Shadow failure / timeout / invalid output → no effect
// ─────────────────────────────────────────────────────────────────────────────

describe('shadow failures are contained', () => {
  it.each([
    ['invalid JSON', async () => 'not json'],
    ['schema-invalid', reply({ version: 2, operation: 'total' })],
    ['model error', async () => { throw new Error('boom'); }],
    ['empty', async () => ''],
  ] as Array<[string, ShadowModelCall]>)('%s → shadow_invalid, live plan unchanged', async (_l, call) => {
    const lv = live('What did I spend last month?');
    const before = JSON.stringify(lv.plan);
    const c = runShadowPlanComparison(await shadowOutcome(call), lv, CTX);
    expect(c).toMatchObject({ agreement: 'shadow_invalid', shadowStatus: 'model_invalid', shadowTools: [] });
    expect(JSON.stringify(lv.plan)).toBe(before);
  });

  it('timeout → shadow_invalid with reason timeout', async () => {
    const hang: ShadowModelCall = () => new Promise(() => undefined);
    const outcome = await interpretShadowSemantics({ callModel: hang, message: 'q', timeoutMs: 5 });
    const c = runShadowPlanComparison(outcome, live('What did I spend last month?'), CTX);
    expect(c).toMatchObject({ agreement: 'shadow_invalid', shadowReason: 'timeout' });
  });

  it('an internal error never throws — it becomes a bounded error payload', () => {
    const broken = { intent: null, plan: { steps: null }, merchantHintTrusted: false } as unknown as LivePlanSnapshot;
    const valid: ShadowOutcome = { status: 'valid', request: parseFinancialRequest(R({ operation: 'total', measures: ['spending'], period: { kind: 'previous', unit: 'month' } })).ok ? (parseFinancialRequest(R({ operation: 'total', measures: ['spending'], period: { kind: 'previous', unit: 'month' } })) as { ok: true; value: never }).value : (null as never), durationMs: 1 };
    const badCtx = { ...CTX, temporal: null } as unknown as typeof CTX;
    expect(() => runShadowPlanComparison(valid, broken, badCtx)).not.toThrow();
    expect(runShadowPlanComparison(valid, broken, badCtx)).toEqual({ r2b: 1, error: 'comparison_failed' });
  });

  it('the live snapshot with no plan (e.g. shadow intent absent) is handled', async () => {
    const outcome = await shadowOutcome(reply(R({ operation: 'total', measures: ['spending'], period: { kind: 'previous', unit: 'month' } })));
    const c = compareShadowPlan(buildShadowEvidencePlan(outcome, CTX), { intent: null, plan: null, merchantHintTrusted: false });
    expect(c.agreement).toBe('shadow_only_plan');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Privacy — no transaction data or raw text in comparison logs
// ─────────────────────────────────────────────────────────────────────────────

describe('comparison payload is value-free', () => {
  it.each([
    ['How much did I spend on groceries in September?', R({ operation: 'total', measures: ['spending'], subjects: [cat('groceries')], period: { kind: 'calendar_month', month: 9 } })],
    ['How much did I spend at Costco in August?', R({ operation: 'total', measures: ['spending'], subjects: [merch('Costco')], period: { kind: 'calendar_month', month: 8 } })],
    ['List my transactions in September.', R({ operation: 'list', measures: ['transactions'], order: { by: 'date', direction: 'desc' }, limit: 7, period: { kind: 'calendar_month', month: 9 } })],
  ] as Array<[string, Req]>)('%s', async (message, req) => {
    const json = JSON.stringify(await compare(message, req));
    expect(json).not.toContain(message);
    expect(json).not.toMatch(/groceries|costco|september|august/i);
    expect(json).not.toMatch(/\d{4}-\d{2}-\d{2}/); // no dates
    expect(json).not.toMatch(/"(startDate|endDate|category|subcategory|q|limit|amount|total|rows|id|params)"\s*:/);
    const parsed = JSON.parse(json) as ShadowPlanComparison;
    expect(Object.values(parsed.merchant).every(v => typeof v === 'boolean')).toBe(true);
    expect(json).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. R1 defect fixes
// ─────────────────────────────────────────────────────────────────────────────

describe('R1 defect: transaction_id is not model-facing', () => {
  it('the model-facing JSON schema offers no transaction_id reference anywhere', () => {
    const json = JSON.stringify(SHADOW_RESPONSE_FORMAT.json_schema.schema);
    expect(json).not.toContain('transaction_id');
    // other reference kinds are still offered
    for (const k of ['candidate_frame', 'ui_selection', 'previous_request', 'conversation_entity']) expect(json).toContain(k);
  });

  it('a model reply carrying a transaction id is rejected (never reaches the adapter)', async () => {
    for (const req of [
      R({ operation: 'total', reference: { kind: 'transaction_id', id: TX_UUID, source: 'conversation' } }),
      R({ operation: 'none', action: { kind: 'mutation_proposal', mutation: 'change_category', target: { kind: 'transaction_id', id: TX_UUID, source: 'conversation' }, value: 'Groceries' } }),
    ]) {
      const outcome = await shadowOutcome(reply(req));
      expect(outcome).toMatchObject({ status: 'invalid', failureCode: 'model_transaction_id' });
      expect(JSON.stringify(runShadowPlanComparison(outcome, live('q'), CTX))).not.toContain(TX_UUID);
    }
  });

  it('V2 compatibility: trusted callers may still express a transaction_id reference', () => {
    const r = parseFinancialRequest(R({ operation: 'total', reference: { kind: 'transaction_id', id: TX_UUID, source: 'ui_context' } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(containsModelTransactionId(r.value)).toBe(true);
  });
});

describe('R1 defect: the current message is excluded from prior context', () => {
  it('a trailing copy of the current message is dropped (retry / pre-persisted history)', () => {
    const history = [
      { role: 'user', content: 'What did I spend in August?' },
      { role: 'assistant', content: 'You spent …' },
      { role: 'user', content: 'What about September?' },
    ];
    expect(selectPriorUserMessages(history, 'What about September?')).toEqual(['What did I spend in August?']);
    expect(selectPriorUserMessages(history, '  What about September?  ')).toEqual(['What did I spend in August?']);
  });

  it('earlier identical questions and assistant replies are handled correctly', () => {
    const history = [
      { role: 'user', content: 'Show my groceries' },
      { role: 'user', content: 'Thanks' },
    ];
    expect(selectPriorUserMessages(history, 'Show my groceries')).toEqual(['Show my groceries', 'Thanks']);
    expect(selectPriorUserMessages([{ role: 'assistant', content: 'x' }, { role: 'user', content: 5 }], 'x')).toEqual([]);
    expect(selectPriorUserMessages(null, 'x')).toEqual([]);
  });

  it('the model messages then contain the current message exactly once', () => {
    const current = 'What about September?';
    const msgs = buildShadowSemanticsMessages(current, selectPriorUserMessages([{ role: 'user', content: current }], current));
    expect(msgs.filter(m => m.content.includes(current)).length).toBe(1);
  });
});

describe('R1 defect: real calendar dates', () => {
  it.each(['2026-02-30', '2026-13-01', '2026-00-10', '2025-02-29', '2026-04-31'])('%s is rejected', (d) => {
    expect(parseFinancialRequest(R({ operation: 'total', period: { kind: 'range', start: d, end: '2026-12-31' } })).ok).toBe(false);
    expect(parseFinancialRequest(R({ operation: 'total', period: { kind: 'range', start: '2020-01-01', end: d } })).ok).toBe(false);
  });
  it.each(['2024-02-29', '2026-01-31', '2026-12-31'])('%s is accepted', (d) => {
    expect(parseFinancialRequest(R({ operation: 'total', period: { kind: 'range', start: '2020-01-01', end: d } })).ok).toBe(true);
  });
  it('an impossible date from the model is invalid_schema in the shadow path', async () => {
    const outcome = await shadowOutcome(reply(R({ operation: 'total', period: { kind: 'range', start: '2026-02-30', end: '2026-03-05' } })));
    expect(outcome).toMatchObject({ status: 'invalid', failureCode: 'invalid_schema' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. chat.ts wiring — observational only, behind the existing flag
// ─────────────────────────────────────────────────────────────────────────────

describe('chat.ts wiring (structural)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');
  const r1Start = chat.indexOf('if (isPrime && flagEnabled(process.env.PRIME_SHADOW_SEMANTICS)) {');
  const collectStart = chat.indexOf('if (r1ShadowRun || r1ShadowSkipReason) {');
  const collectEnd = chat.indexOf('// telemetry only — never affects the response', collectStart);

  it('flag disabled: no shadow work — R2b runs only on a settled R1 outcome, which needs the flag', () => {
    expect(r1Start).toBeGreaterThan(0);
    // r1ShadowRun is only assigned inside the flag block (declaration + one assignment + one reset)
    expect(chat.match(/r1ShadowRun = /g)?.length).toBe(2);
    expect(chat.indexOf('r1ShadowRun = {')).toBeGreaterThan(r1Start);
    // the only R2b call site sits inside the R1 collection block, after r1Settled is known
    const calls = [...chat.matchAll(/runShadowPlanComparison\(/g)].map(m => m.index ?? 0);
    expect(calls.length).toBe(1);
    expect(calls[0]).toBeGreaterThan(collectStart);
    expect(calls[0]).toBeLessThan(collectEnd);
    expect(chat.slice(collectStart, calls[0])).toContain('if (r1Settled) {');
  });

  it('R2b makes no model call and adds no extra AI work', () => {
    const block = chat.slice(collectStart, collectEnd);
    expect(block).not.toMatch(/openai|completions\.create|anthropic/);
    expect(chat.match(/response_format: SHADOW_RESPONSE_FORMAT/g)?.length).toBe(1);
  });

  it('the comparison result is only logged', () => {
    const uses = chat.match(/r2bComparison\b/g) ?? [];
    expect(uses.length).toBe(2); // declaration + log argument
    expect(chat).toContain('console.log(`[PrimeShadow][R2b] request=${requestId.slice(0,12)} ${JSON.stringify(r2bComparison)}`);');
  });

  it('the live plan, executor, identity and handoff code are not driven by R2b', () => {
    const block = chat.slice(collectStart, collectEnd);
    for (const forbidden of ['executeEvidencePlan', 'ownershipGate', 'persistTxResolution', 'select_transaction', 'handoff', 'finalSessionId', 'evidencePlanForExecution =']) {
      expect(block).not.toContain(forbidden);
    }
  });
});
