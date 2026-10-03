/**
 * PRIME REASONING V1 — R1 deterministic tests (no live model).
 *
 * Proves the shadow pipeline is contained: prompt built from the R0 vocabularies,
 * bounded inputs, R0 validation, fail-open outcomes, privacy-safe summaries, a small
 * structural legacy comparison, and chat.ts wiring that has zero authority.
 * Live model QUALITY is evaluated separately by scripts/eval-prime-shadow-semantics.ts.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  SHADOW_SEMANTICS_SYSTEM_PROMPT,
  SHADOW_MAX_PRIOR_USER_MESSAGES,
  SHADOW_MAX_MESSAGE_CHARS,
  buildShadowSemanticsMessages,
  interpretShadowSemantics,
  summarizeShadowOutcome,
  compareShadowWithLegacy,
  buildShadowLogPayload,
  type ShadowModelCall,
  type LegacyStructure,
} from '../prime-shadow-semantics';
import { FINANCIAL_OPERATIONS, FINANCIAL_MEASURES, FINANCIAL_DOMAINS } from '../prime-financial-request';

const reply = (obj: unknown): ShadowModelCall => async () => JSON.stringify(obj);
const base = { version: 1, authority: 'semantic_claim' } as const;
const run = (callModel: ShadowModelCall, message = 'q', timeoutMs = 2000) =>
  interpretShadowSemantics({ callModel, message, timeoutMs });

/**
 * What a CORRECT interpretation of each acceptance specimen looks like (hand-written).
 * These prove representability + containment, not model understanding.
 */
const SPECIMENS: Record<string, unknown> = {
  restaurants_3m: { ...base, domain: 'transactions', operation: 'count_distinct', distinctBy: 'merchant', measure: 'spending',
    subjects: [{ kind: 'subcategory', value: 'restaurants', categoryHint: 'Food & Dining', source: 'user_message' }],
    period: { kind: 'rolling', count: 3, unit: 'month' },
    ambiguities: [{ dimension: 'operation', resolution: 'present_both', interpretations: [
      { id: 'visits', summary: 'restaurant transactions (visits)', operation: 'count' },
      { id: 'distinct', summary: 'different restaurants', operation: 'count_distinct', distinctBy: 'merchant' }] }] },
  costco_last_year: { ...base, domain: 'transactions', operation: 'total', measure: 'spending',
    subjects: [{ kind: 'merchant', value: 'Costco', source: 'user_message' }], period: { kind: 'previous', unit: 'year' } },
  last_five_costco: { ...base, domain: 'transactions', operation: 'list', measure: 'transactions',
    subjects: [{ kind: 'merchant', value: 'Costco', source: 'user_message' }], presentation: { detail: 'standard', format: 'list' } },
  gas_3m: { ...base, domain: 'transactions', operation: 'total', measure: 'spending',
    subjects: [{ kind: 'subcategory', value: 'gas', categoryHint: 'Transportation', source: 'user_message' }], period: { kind: 'rolling', count: 3, unit: 'month' } },
  fuel_sales_rep: { ...base, domain: 'transactions', operation: 'average', measure: 'spending',
    subjects: [{ kind: 'subcategory', value: 'fuel', categoryHint: 'Transportation', source: 'user_message' }],
    capability: { status: 'unsupported', concept: 'occupation benchmark', reason: 'no_data_source' } },
  september: { ...base, domain: 'transactions', operation: 'total', measure: 'spending', period: { kind: 'calendar_month', month: 9 } },
  in_and_out: { ...base, domain: 'transactions', operation: 'total', measure: 'net_movement', period: { kind: 'previous', unit: 'month' } },
  month_vs_month: { ...base, domain: 'transactions', operation: 'total', measure: 'spending', period: { kind: 'current', unit: 'month' }, comparison: { kind: 'previous_equivalent' } },
  why_restaurants_higher: { ...base, domain: 'transactions', operation: 'explain', measure: 'spending',
    subjects: [{ kind: 'subcategory', value: 'restaurants', source: 'user_message' }], period: { kind: 'current', unit: 'month' }, comparison: { kind: 'previous_equivalent' } },
  what_about_last_year: { ...base, domain: 'transactions', operation: 'total', mode: 'refine_previous', reference: { kind: 'previous_request' }, period: { kind: 'previous', unit: 'year' } },
  change_third: { ...base, domain: 'transactions', operation: 'none',
    action: { kind: 'mutation_proposal', mutation: 'change_category', target: { kind: 'candidate_frame', ordinal: 3 }, value: 'Groceries' } },
  where_do_i_live: { ...base, domain: 'general', operation: 'none' },
  how_secure: { ...base, domain: 'product', operation: 'explain' },
};

describe('R1 prompt — contract dimensions, not question patterns', () => {
  it('is generated from the R0 vocabularies (cannot drift from the schema)', () => {
    for (const v of [...FINANCIAL_OPERATIONS, ...FINANCIAL_MEASURES, ...FINANCIAL_DOMAINS]) {
      expect(SHADOW_SEMANTICS_SYSTEM_PROMPT).toContain(v);
    }
  });
  it('is compact and states the authority boundary', () => {
    expect(SHADOW_SEMANTICS_SYSTEM_PROMPT.length).toBeLessThan(5000);
    expect(SHADOW_SEMANTICS_SYSTEM_PROMPT).toMatch(/semantic claim only/);
    expect(SHADOW_SEMANTICS_SYSTEM_PROMPT).toMatch(/Never include amounts, totals, balances, transaction IDs/);
  });
  it('contains no question-pattern forest (no specimen sentences, merchants or "in")', () => {
    for (const s of ['How many restaurants', 'Costco', 'three months', 'last year?', '"in"', 'eaten']) {
      expect(SHADOW_SEMANTICS_SYSTEM_PROMPT).not.toContain(s);
    }
  });
  it('never offers the model a transaction_id reference (ids come only from trusted context later)', () => {
    expect(SHADOW_SEMANTICS_SYSTEM_PROMPT).not.toContain('transaction_id');
  });
});

describe('R1 inputs are bounded and data-free', () => {
  it('only previous USER messages (≤4, clipped) plus the current message — no assistant replies', () => {
    const prior = ['a', 'b', 'c', 'd', 'e', 'x'.repeat(SHADOW_MAX_MESSAGE_CHARS + 50)];
    const msgs = buildShadowSemanticsMessages('What about this year?', prior);
    expect(msgs.map(m => m.role)).toEqual(['system', 'user', 'user']);
    const ctx = msgs[1].content;
    expect(ctx).not.toContain('"a"');
    expect(ctx).not.toContain('"b"');
    expect(ctx.match(/^\d+\. /gm)?.length).toBe(SHADOW_MAX_PRIOR_USER_MESSAGES);
    expect(ctx).not.toContain('x'.repeat(SHADOW_MAX_MESSAGE_CHARS + 1));
    expect(msgs[2].content).toContain('"What about this year?"');
  });
  it('with no history there is no context message', () => {
    expect(buildShadowSemanticsMessages('hi').map(m => m.role)).toEqual(['system', 'user']);
  });
});

describe('R1 interpretation — R0 validation, fail-open', () => {
  it('every acceptance specimen interpretation validates against FinancialRequest V1', async () => {
    for (const [id, obj] of Object.entries(SPECIMENS)) {
      const o = await run(reply(obj));
      if (o.status !== 'valid') throw new Error(`${id}: ${o.failureCode}`);
    }
  });
  it('invalid JSON → invalid_json (never repaired)', async () => {
    expect(await run(async () => '{not json')).toMatchObject({ status: 'invalid', failureCode: 'invalid_json' });
  });
  it('schema-invalid output → invalid_schema with an issue count, no partial salvage', async () => {
    const o = await run(reply({ ...base, domain: 'transactions', operation: 'how_much_restaurants', amount: 5 }));
    expect(o).toMatchObject({ status: 'invalid', failureCode: 'invalid_schema' });
    if (o.status === 'invalid') expect(o.schemaIssueCount).toBeGreaterThan(0);
  });
  it('empty output → empty_output', async () => {
    expect(await run(async () => '   ')).toMatchObject({ status: 'invalid', failureCode: 'empty_output' });
  });
  it('model error → model_error (no throw)', async () => {
    expect(await run(async () => { throw new Error('503'); })).toMatchObject({ status: 'invalid', failureCode: 'model_error' });
  });
  it('timeout → timeout, and the request is aborted', async () => {
    let aborted = false;
    const o = await interpretShadowSemantics({
      message: 'q', timeoutMs: 20,
      callModel: (_m, signal) => new Promise<string>(() => { signal.addEventListener('abort', () => { aborted = true; }); }),
    });
    expect(o).toMatchObject({ status: 'invalid', failureCode: 'timeout' });
    expect(aborted).toBe(true);
  });
  it('a model claiming verified data is rejected by the strict R0 schema', async () => {
    const o = await run(reply({ ...(SPECIMENS.costco_last_year as object), verified: true, total: 1234.5 }));
    expect(o).toMatchObject({ status: 'invalid', failureCode: 'invalid_schema' });
  });
});

describe('R1 privacy-safe summary', () => {
  it('contains structure only — no subject values, concept text, ids, summaries or action values', async () => {
    for (const obj of Object.values(SPECIMENS)) {
      const summary = summarizeShadowOutcome(await run(reply(obj)));
      const json = JSON.stringify(summary);
      for (const leak of ['Costco', 'restaurants', 'gas', 'fuel', 'Groceries', 'occupation benchmark', 'visits', 'different restaurants', 'semantic_claim']) {
        expect(json).not.toContain(leak);
      }
    }
  });
  it('restaurant specimen summary: count_distinct, subcategory subject, rolling month, operation ambiguity', async () => {
    const s = summarizeShadowOutcome(await run(reply(SPECIMENS.restaurants_3m)));
    expect(s).toMatchObject({ valid: true, domain: 'transactions', operation: 'count_distinct', distinctBy: 'merchant',
      subjectKinds: ['subcategory'], subjectCount: 1, hasCategoryHint: true, periodKind: 'rolling', periodUnit: 'month',
      ambiguityCount: 1, ambiguityDimensions: ['operation'], ambiguityResolutions: ['present_both'], referenceKind: 'none',
      capabilityStatus: 'supported' });
    expect(s.subjectKinds).not.toContain('merchant');
  });
  it('invalid outcomes summarize to a bounded failure code only', async () => {
    const s = summarizeShadowOutcome(await run(async () => 'nope'));
    expect(Object.keys(s).sort()).toEqual(['contractVersion', 'durationMs', 'failureCode', 'valid']);
  });
});

describe('R1 legacy comparison (structural only)', () => {
  // the reproduced live legacy interpretation: merchant "in" (trusted), category resolved, no period
  const restaurantLegacy: LegacyStructure = {
    queryType: 'merchant', requestShape: 'unknown', hasMerchantScope: true, merchantHintTrusted: true,
    hasCategoryScope: true, hasPeriod: false, requiresGrounding: true,
  };
  it('flags the restaurant specimen: legacy merchant scope + missing period vs shadow', async () => {
    const c = compareShadowWithLegacy(await run(reply(SPECIMENS.restaurants_3m)), restaurantLegacy);
    expect(c?.disagreements).toEqual(['merchant_scope', 'period']);
    expect(c?.shadowHasMerchantSubject).toBe(false);
  });
  it('agreement produces no disagreement flags', async () => {
    const legacy: LegacyStructure = { queryType: 'merchant', requestShape: 'aggregate', hasMerchantScope: true, hasCategoryScope: false, hasPeriod: true };
    expect(compareShadowWithLegacy(await run(reply(SPECIMENS.costco_last_year)), legacy)?.disagreements).toEqual([]);
  });
  it('list vs aggregate disagreement is detected structurally', async () => {
    const legacy: LegacyStructure = { queryType: 'detail', requestShape: 'list', hasMerchantScope: false, hasCategoryScope: false, hasPeriod: true };
    expect(compareShadowWithLegacy(await run(reply(SPECIMENS.september)), legacy)?.disagreements).toContain('list_vs_aggregate');
  });
  it('invalid shadow outcomes produce no comparison', async () => {
    expect(compareShadowWithLegacy(await run(async () => 'x'), restaurantLegacy)).toBeNull();
  });
  it('the log payload carries no raw values from either side', async () => {
    const json = JSON.stringify(buildShadowLogPayload(await run(reply(SPECIMENS.costco_last_year)), restaurantLegacy, 'gpt-4o-mini'));
    expect(json).not.toContain('Costco');
    expect(json).toContain('"r1":1');
  });
});

describe('R1 chat.ts wiring — zero authority (structural)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');

  it('kill switch: nothing runs unless PRIME_SHADOW_SEMANTICS is truthy', () => {
    expect(chat).toContain('if (isPrime && flagEnabled(process.env.PRIME_SHADOW_SEMANTICS)) {');
  });
  it('the shadow result is used ONLY for logging', () => {
    const uses = chat.match(/r1Settled\b/g) ?? [];
    expect(uses.length).toBe(3); // declaration, the readiness check, the log argument — nothing else
    expect(chat).not.toMatch(/r1Settled\.(request|status)/);
    expect(chat.match(/r1ShadowRun\.promise/g)?.length).toBe(1);
  });
  it('collection is bounded (≤1s), aborts when not ready, and cannot throw', () => {
    expect(chat).toContain('setTimeout(() => resolve(null), 1000)');
    expect(chat).toContain('r1ShadowRun.abort.abort();');
    expect(chat).toMatch(/\} catch \{\s+\/\/ telemetry only — never affects the response/);
  });
  it('the shadow call is time-bounded and skipped when the request budget is short', () => {
    expect(chat).toContain("r1ShadowSkipReason = 'insufficient_budget';");
    expect(chat).toContain('timeoutMs: Math.min(8000, r1RemainingMs - 15000),');
  });
  it('the shadow input is the masked message plus previous user messages only', () => {
    expect(chat).toContain('message: masked,');
    expect(chat).toContain(".filter((m: { role?: unknown; content?: unknown }) => m?.role === 'user' && typeof m?.content === 'string')");
  });
});
