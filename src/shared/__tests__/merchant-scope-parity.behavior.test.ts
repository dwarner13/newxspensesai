/**
 * P3.2B2C PARITY REPAIR — merchant analysis vs B2C "show me those transactions".
 *
 * Exercises PRODUCTION code end to end:
 *   - merchant_totals.execute            (merchant analysis evidence)
 *   - netlify/functions/tx-search handler (B2C merchantScope retrieval)
 *   - shared merchant-scope-rows helpers  (bridge args, parity, completeness)
 *   - P3.3C ownership gate + frame selection
 *
 * The only test-local code is an in-memory transactions table that applies
 * Postgres semantics (NULL never matches ILIKE / range filters) — the same
 * semantics that made the live B2C path drop the two NULL-merchant rows.
 *
 * Fixture rows are the 12 audited Costco rows (read-only audit, 2026-09-30).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  sessions: [] as Record<string, unknown>[],
  userId: 'user-1',
  /** Recorded transactions filters: [method, column, value] */
  calls: [] as Array<[string, string, unknown]>,
}));

vi.mock('../../server/db', () => ({ getSupabaseServerClient: () => fakeClient() }));
vi.mock('../../../netlify/functions/_shared/supabase.js', () => ({ admin: () => fakeClient() }));
vi.mock('../../../netlify/functions/_shared/verifyAuth.js', () => ({
  verifyAuth: async () => ({ userId: db.userId, error: null }),
}));

// Columns present on the live transactions table (memo / occurred_at are absent).
const KNOWN_COLUMNS = new Set([
  'id', 'user_id', 'posted_at', 'date', 'merchant_name', 'merchant', 'description',
  'amount', 'type', 'category', 'subcategory', 'import_id', 'document_id',
]);

/**
 * Minimal PostgREST-like builder with Postgres NULL semantics.
 * `transactions` reads db.rows; `chat_sessions` reads/updates db.sessions.
 * Any or() expression it cannot interpret throws, so a change in production
 * filter syntax can never silently widen a result set.
 */
function fakeClient() {
  function builder(table: string, columns: string) {
    const isTx = table === 'transactions';
    const source = () => (isTx ? db.rows : db.sessions);
    const cols = columns.split(',').map(c => c.trim()).filter(Boolean);
    const missing = isTx ? cols.filter(c => !KNOWN_COLUMNS.has(c)) : [];
    const filters: Array<(r: Row) => boolean> = [];
    let limit = Infinity;
    let single = false;
    const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
    const record = (m: string, c: string, v: unknown) => { if (isTx) db.calls.push([m, c, v]); };
    const b = {
      eq(c: string, v: unknown) { record('eq', c, v); filters.push(r => r[c] === v); return b; },
      gte(c: string, v: unknown) { record('gte', c, v); filters.push(r => str(r[c]) !== null && str(r[c])! >= String(v)); return b; },
      lte(c: string, v: unknown) { record('lte', c, v); filters.push(r => str(r[c]) !== null && str(r[c])! <= String(v)); return b; },
      or(expr: string) {
        const parts = expr.split(',').map(p => p.match(/^(\w+)\.ilike\.%(.*)%$/));
        if (!parts.every(Boolean)) throw new Error(`fake db: unsupported or() expression: ${expr}`);
        record('or', '', expr);
        filters.push(r => parts.some(m => {
          const v = str(r[m![1]]);
          return v !== null && v.toLowerCase().includes(m![2].toLowerCase());
        }));
        return b;
      },
      not() { return b; }, ilike() { return b; }, order() { return b; }, in() { return b; }, is() { return b; },
      limit(n: number) { limit = n; return b; },
      maybeSingle() { single = true; return b; },
      then<T>(resolve: (v: { data: unknown; error: { code: string; message: string } | null }) => T) {
        if (missing.length > 0) {
          return Promise.resolve({ data: null, error: { code: '42703', message: `column ${missing[0]} does not exist` } }).then(resolve);
        }
        const matched = source().filter(r => filters.every(f => f(r))).slice(0, limit);
        const data = matched.map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
        return Promise.resolve({ data: single ? (data[0] ?? null) : data, error: null }).then(resolve);
      },
    };
    return b;
  }
  function updater(table: string, patch: Row) {
    const filters: Array<(r: Row) => boolean> = [];
    const u = {
      eq(c: string, v: unknown) { filters.push(r => r[c] === v); return u; },
      then<T>(resolve: (v: { data: null; error: null }) => T) {
        if (table === 'chat_sessions') {
          for (const r of db.sessions) if (filters.every(f => f(r))) Object.assign(r, patch);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return u;
  }
  return {
    from: (table: string) => ({
      select: (columns: string) => builder(table, columns),
      update: (patch: Row) => updater(table, patch),
    }),
  };
}

import { execute as merchantTotals } from '../../agent/tools/impl/merchant_totals';
import { handler as txSearchHandler } from '../../../netlify/functions/tx-search';
import {
  applyMerchantScope,
  buildMerchantBridgeArgs,
  compareMerchantEvidence,
  merchantEvidenceFingerprint,
  assessB2CCompleteness,
  formatB2CCompletenessInstruction,
  type MerchantScope,
} from '../merchant-scope-rows';
import { buildMerchantAnalysisContext, merchantTemporalScopeFromPlanSteps } from '../merchant-analysis-context';
import { assessB2CBridgeResult, merchantCategoryScope } from '../merchant-scope-rows';
import { resolveMerchantHintTrust } from '../merchant-hint-trust';
import { classifyFinancialQuery } from '../financial-query-classifier';
import { summarizeCandidateFrame } from '../candidate-frame-facts';
import { execute as refineExecute } from '../../agent/tools/impl/merchant_analysis_refine';
import { classifyPrimeIntent } from '../prime-intent-classifier';
import { buildTemporalScope } from '../prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../prime-evidence-contract';
import { buildEvidencePlan } from '../prime-evidence-resolver';
import { executeEvidencePlan, type DedupCache } from '../prime-evidence-executor';
import * as fs from 'fs';
import * as path from 'path';
import {
  createCandidateOwnershipGate,
  buildTxResolutionFromSearchResult,
  selectCandidateFromFrame,
  resolveCandidateOwnership,
  computeB2CCandidatesSatisfied,
  type TxResolutionContext,
} from '../tx-candidate-ownership';

// ─────────────────────────────────────────────────────────────────────────────
// Fixture: the 12 audited Costco rows
// ─────────────────────────────────────────────────────────────────────────────

const U = 'user-1';
const COSTCO_ROWS: Row[] = [
  { id: 'd5404074-ae44-4e6b-a748-554f222acf8e', posted_at: '2026-05-04T00:00:00+00:00', date: '2026-05-04', merchant_name: 'COSTCO GAS', merchant: 'COSTCO GAS', description: 'COSTCO GAS', amount: -92.51, type: 'expense', category: 'Groceries', subcategory: null },
  { id: '85f64784-7cf8-461a-943e-5c02260de191', posted_at: '2026-05-04T00:00:00+00:00', date: '2026-05-04', merchant_name: 'COSTCO WHOLESALE', merchant: 'COSTCO WHOLESALE', description: 'COSTCO WHOLESALE', amount: -190.27, type: 'expense', category: 'Restaurants / Dining', subcategory: null },
  { id: '95a2d713-ca36-4fe9-8ad1-cf94eb8227ac', posted_at: '2025-12-18T00:00:00+00:00', date: '2025-12-18', merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE W1270', description: null, amount: 415.23, type: 'expense', category: 'Groceries', subcategory: 'Groceries' },
  { id: '5838a84e-517c-4ad3-a423-9fcd97b788d6', posted_at: '2025-10-10T00:00:00+00:00', date: '2025-10-10', merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE W 1112', description: null, amount: 249.15, type: 'Purchase', category: 'Groceries', subcategory: 'Groceries' },
  { id: '8b95bba5-5f21-4f75-a13d-663da76d7cec', posted_at: '2025-10-07T00:00:00+00:00', date: '2025-10-07', merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE W154', description: null, amount: 255.09, type: 'Purchase', category: 'Groceries', subcategory: 'Groceries' },
  { id: 'e975cb0c-0f35-43aa-9f85-7e7cb80d3491', posted_at: '2025-06-17T00:00:00+00:00', date: '2025-06-17', merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE W153', description: null, amount: 307.2, type: 'Purchase', category: 'Groceries', subcategory: 'Groceries' },
  { id: '88f50b79-f91a-47ab-99ea-cb24356051ca', posted_at: '2025-06-14T00:00:00+00:00', date: '2025-06-14', merchant_name: 'COSTCO', merchant: 'COSTCO CANADA LIQUOR', description: null, amount: 27.48, type: 'expense', category: 'Groceries', subcategory: 'Groceries' },
  { id: '9f169ea5-696f-40e3-81a2-92c9cad99c31', posted_at: '2025-06-14T00:00:00+00:00', date: '2025-06-14', merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE', description: null, amount: 294.78, type: 'expense', category: 'Groceries', subcategory: 'Groceries' },
  { id: '0a3afed7-d881-47f7-a5f8-7e8bc669c7cd', posted_at: '2025-06-05T00:00:00+00:00', date: '2025-06-05', merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE', description: null, amount: 112.87, type: 'expense', category: 'Groceries', subcategory: 'Groceries' },
  { id: '0f8a11ff-bcbe-4cc0-9470-b0a5687ecc19', posted_at: '2025-06-05T00:00:00+00:00', date: '2025-06-05', merchant_name: 'COSTCO GAS', merchant: 'COSTCO GAS', description: null, amount: 52.36, type: 'expense', category: 'Groceries', subcategory: 'Gas & Fuel' },
  { id: 'd7fe4e2f-4c77-4ecd-9bc9-c6d46b104987', posted_at: null, date: '2025-04-16', merchant_name: 'COSTCO', merchant: null, description: null, amount: 18.34, type: 'Purchase', category: 'Groceries', subcategory: 'Groceries' },
  { id: '2fe63464-557a-4a3e-894a-2be58d3e91b4', posted_at: null, date: '2025-04-16', merchant_name: 'COSTCO', merchant: null, description: null, amount: 744.33, type: 'Purchase', category: 'Groceries', subcategory: 'Groceries' },
].map(r => ({ ...r, user_id: U, import_id: null, document_id: null }));

const MISSING_A = '2fe63464-557a-4a3e-894a-2be58d3e91b4';
const MISSING_B = 'd7fe4e2f-4c77-4ecd-9bc9-c6d46b104987';
const GAS_IDS = ['d5404074-ae44-4e6b-a748-554f222acf8e', '0f8a11ff-bcbe-4cc0-9470-b0a5687ecc19'];
const COSTCO_3 = '5838a84e-517c-4ad3-a423-9fcd97b788d6';

/** Expected deterministic B2C order: date DESC, id DESC. */
const EXPECTED_ORDER = [
  '85f64784-7cf8-461a-943e-5c02260de191',
  '95a2d713-ca36-4fe9-8ad1-cf94eb8227ac',
  COSTCO_3,
  '8b95bba5-5f21-4f75-a13d-663da76d7cec',
  'e975cb0c-0f35-43aa-9f85-7e7cb80d3491',
  '9f169ea5-696f-40e3-81a2-92c9cad99c31',
  '88f50b79-f91a-47ab-99ea-cb24356051ca',
  '0a3afed7-d881-47f7-a5f8-7e8bc669c7cd',
  MISSING_B, // 2025-04-16, id d7fe… > 2fe6… under id DESC
  MISSING_A,
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers driving production entry points
// ─────────────────────────────────────────────────────────────────────────────

async function runMerchantTotals(input: Parameters<typeof merchantTotals>[0]) {
  const r = await merchantTotals(input, { userId: U });
  if (!r.ok) throw r.error;
  return r.value;
}

type TxSearchPayload = {
  rows: Array<{ id: string; date: string | null; amount: number; merchant: string | null; category: string | null }>;
  meta: { merchantScope?: { matchedCount: number; returnedCount: number; truncated: boolean; fingerprint: { count: number; total: number; idsHash: string } } };
};

async function runTxSearch(body: Record<string, unknown>): Promise<TxSearchPayload> {
  const res = await txSearchHandler({ httpMethod: 'POST', body: JSON.stringify(body), headers: {} } as never, {} as never);
  const out = res as { statusCode: number; body: string };
  expect(out.statusCode).toBe(200);
  return JSON.parse(out.body);
}

/** Live MerchantAnalysisContext after "What did I spend at Costco?" → "Take out gas." */
function liveContext(evidence: { count: number; total: number; idsHash: string } | null) {
  return buildMerchantAnalysisContext(
    'Costco',
    [{ merchant: 'COSTCO', groupingKey: 'costco' }, { merchant: 'COSTCO WHOLESALE', groupingKey: 'costco wholesale' }],
    { excludedGroups: ['costco gas'], temporalScope: null, categoryFilter: null, evidenceComplete: true, evidence },
  );
}

const sumAbs = (rows: Array<{ amount: number }>) => Math.round(rows.reduce((s, r) => s + Math.abs(r.amount), 0) * 100) / 100;

beforeEach(() => { db.rows = COSTCO_ROWS.map(r => ({ ...r })); db.sessions = []; db.calls = []; });

// ─────────────────────────────────────────────────────────────────────────────
// A–C. Costco reproduction
// ─────────────────────────────────────────────────────────────────────────────
describe('A–C. Costco reproduction through the production B2C path', () => {
  it('turn 1 merchant_totals: 12 rows / 2,759.61 with the audited group breakdown', async () => {
    const mt = await runMerchantTotals({ merchant: 'Costco' });
    expect(mt.transactionCount).toBe(12);
    expect(mt.grandTotal).toBe(2759.61);
    const byKey = Object.fromEntries(mt.merchants.map(m => [m.groupingKey, [m.count, m.total]]));
    expect(byKey).toEqual({ costco: [9, 2424.47], 'costco wholesale': [1, 190.27], 'costco gas': [2, 144.87] });
  });

  it('"take out gas" + bridge: 10 rows, 2,614.74, both formerly missing rows present', async () => {
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    expect(mt.transactionCount).toBe(10);
    expect(mt.grandTotal).toBe(2614.74);

    const args = buildMerchantBridgeArgs(liveContext(mt.evidence ?? null));
    const res = await runTxSearch(args);
    const ids = res.rows.map(r => r.id);
    expect(ids).toHaveLength(10);
    expect(sumAbs(res.rows)).toBe(2614.74);
    expect(ids).toContain(MISSING_A);
    expect(ids).toContain(MISSING_B);
  });

  it('the two formerly missing rows total exactly 762.67', () => {
    const missing = COSTCO_ROWS.filter(r => r.id === MISSING_A || r.id === MISSING_B);
    expect(sumAbs(missing as Array<{ amount: number }>)).toBe(762.67);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D–I. Semantics
// ─────────────────────────────────────────────────────────────────────────────
describe('D–I. shared merchant-scope semantics', () => {
  it('D. merchant_name valid + merchant NULL survives an unrelated excluded group', async () => {
    const res = await runTxSearch({ merchantScope: { merchantQuery: 'Costco', excludeGroups: ['costco gas'] }, limit: 200 });
    expect(res.rows.map(r => r.id)).toEqual(expect.arrayContaining([MISSING_A, MISSING_B]));
  });

  it('E. actual Costco Gas rows remain excluded', async () => {
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(null)));
    for (const gas of GAS_IDS) expect(res.rows.map(r => r.id)).not.toContain(gas);
  });

  it('F. excluding group "costco" does not exclude "costco wholesale" (exact key, not substring)', async () => {
    const res = await runTxSearch({ merchantScope: { merchantQuery: 'Costco', excludeGroups: ['costco'] }, limit: 200 });
    const ids = res.rows.map(r => r.id).sort();
    expect(ids).toEqual(['85f64784-7cf8-461a-943e-5c02260de191', ...GAS_IDS].sort());
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco'] });
    expect(mt.transactionCount).toBe(3);
  });

  it('G. group key (merchant_name first) controls membership, not a raw merchant substring', async () => {
    // merchant_name says COSTCO (group "costco"); raw merchant mentions COSTCO GAS.
    db.rows.push({ id: 'aaaaaaaa-0000-4000-8000-000000000001', user_id: U, posted_at: '2025-03-01T00:00:00+00:00', date: '2025-03-01', merchant_name: 'COSTCO', merchant: 'COSTCO GAS W12', description: null, amount: 10, type: 'expense', category: 'Groceries', subcategory: null });
    const res = await runTxSearch({ merchantScope: { merchantQuery: 'Costco', excludeGroups: ['costco gas'] }, limit: 200 });
    expect(res.rows.map(r => r.id)).toContain('aaaaaaaa-0000-4000-8000-000000000001');
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    expect(mt.transactionCount).toBe(11);
  });

  it('H. date-scoped retrieval keeps rows with a valid date and NULL posted_at', async () => {
    const scope: MerchantScope = { merchantQuery: 'Costco', startDate: '2025-04-01', endDate: '2025-04-30', excludeGroups: ['costco gas'] };
    const res = await runTxSearch({ merchantScope: scope, limit: 200 });
    expect(res.rows.map(r => r.id).sort()).toEqual([MISSING_A, MISSING_B].sort());
    expect(res.rows.every(r => r.date === '2025-04-16')).toBe(true);
    const mt = await runMerchantTotals({ merchant: 'Costco', startDate: '2025-04-01', endDate: '2025-04-30', excludeGroups: ['costco gas'] });
    expect(mt.transactionCount).toBe(2);
    // Contrast: the generic posted_at path cannot see them for the same window.
    const generic = await runTxSearch({ q: 'Costco', startDate: '2025-04-01', endDate: '2025-04-30', limit: 200 });
    expect(generic.rows).toHaveLength(0);
  });

  it('I. merchant_totals and B2C agree on non-spend categories', async () => {
    db.rows.push({ id: 'bbbbbbbb-0000-4000-8000-000000000002', user_id: U, posted_at: '2025-02-01T00:00:00+00:00', date: '2025-02-01', merchant_name: 'COSTCO', merchant: 'COSTCO', description: null, amount: 500, type: 'expense', category: 'Transfers', subcategory: null });
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    expect(mt.transactionCount).toBe(10);
    expect(res.rows.map(r => r.id)).not.toContain('bbbbbbbb-0000-4000-8000-000000000002');
    expect(res.rows).toHaveLength(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. Candidate parity
// ─────────────────────────────────────────────────────────────────────────────
describe('J. merchant analysis and B2C produce the same verified transaction IDs', () => {
  it('evidence fingerprint, ID set and total are identical', async () => {
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    expect(res.meta.merchantScope!.fingerprint).toEqual(mt.evidence);
    expect(merchantEvidenceFingerprint(res.rows)).toEqual(mt.evidence);
    expect(compareMerchantEvidence(mt.evidence, res.meta.merchantScope!.fingerprint).status).toBe('match');
  });

  it('same parity with a temporal scope and with no exclusions', async () => {
    for (const input of [
      { merchant: 'Costco' },
      { merchant: 'Costco', startDate: '2025-06-01', endDate: '2025-12-31', excludeGroups: ['costco gas'] },
    ]) {
      const mt = await runMerchantTotals(input);
      const mac = buildMerchantAnalysisContext('Costco', mt.merchants, {
        excludedGroups: input.excludeGroups ?? [],
        temporalScope: input.startDate ? { startDate: input.startDate, endDate: input.endDate! } : null,
        categoryFilter: null,
        evidenceComplete: true,
        evidence: mt.evidence ?? null,
      });
      const res = await runTxSearch(buildMerchantBridgeArgs(mac));
      expect(merchantEvidenceFingerprint(res.rows)).toEqual(mt.evidence);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K–N. Ownership, ordinals, mutation identity, P3.3B
// ─────────────────────────────────────────────────────────────────────────────
async function establishB2CFrame() {
  const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
  const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
  let frame: TxResolutionContext | null = null;
  const gate = createCandidateOwnershipGate({
    persistLayer2: async (result: unknown) => { frame = buildTxResolutionFromSearchResult(result, 1); return true; },
    applyLayer1: () => {},
    clearLayer1: () => {},
  });
  const outcome = await gate.submitSearchResult(res, 'B2C_merchant_bridge', 'candidate_establishment');
  return { mt, res, gate, outcome, frame: () => frame };
}

describe('K. deterministic ordinals after the repair', () => {
  it('frame order is date DESC, id DESC; #3 is still 5838a84e…; #9/#10 are the formerly missing rows', async () => {
    const { frame, outcome } = await establishB2CFrame();
    expect(outcome).toBe('established');
    expect(frame()!.candidates.map(c => c.id)).toEqual(EXPECTED_ORDER);
    const third = selectCandidateFromFrame(frame(), 3);
    expect(third.ok && third.candidate.id).toBe(COSTCO_3);
    const ninth = selectCandidateFromFrame(frame(), 9);
    const tenth = selectCandidateFromFrame(frame(), 10);
    expect(ninth.ok && ninth.candidate.id).toBe(MISSING_B);
    expect(tenth.ok && tenth.candidate.id).toBe(MISSING_A);
  });

  it('ordering is stable regardless of storage order', async () => {
    db.rows.reverse();
    const { frame } = await establishB2CFrame();
    expect(frame()!.candidates.map(c => c.id)).toEqual(EXPECTED_ORDER);
  });
});

describe('L. P3.3C: analytical evidence cannot replace the B2C frame', () => {
  it('analytical / missing-purpose searches after establishment are skipped', async () => {
    const { gate, frame } = await establishB2CFrame();
    const before = JSON.stringify(frame());
    for (const purpose of ['analytical_evidence', undefined, 'new_candidate_scope']) {
      const intent = resolveCandidateOwnership(purpose, true);
      const outcome = await gate.submitSearchResult({ rows: [{ id: GAS_IDS[0], amount: -92.51 }] }, 'streaming', intent);
      expect(['skipped_analytical', 'skipped_locked']).toContain(outcome);
    }
    expect(JSON.stringify(frame())).toBe(before);
  });
});

describe('M. ordinal selection resolves only against the verified persisted frame', () => {
  it('UUID-shaped or out-of-range candidateNumbers are rejected', async () => {
    const { frame } = await establishB2CFrame();
    expect(selectCandidateFromFrame(frame(), MISSING_A).ok).toBe(false);
    expect(selectCandidateFromFrame(frame(), 11).ok).toBe(false);
    expect(selectCandidateFromFrame(frame(), 0).ok).toBe(false);
  });
});

describe('N. P3.3B fast path after successful B2C establishment', () => {
  it('satisfied (tx_search stripped) with 10 cards and a complete parity instruction', async () => {
    const { mt, res, gate, outcome } = await establishB2CFrame();
    expect(computeB2CCandidatesSatisfied({ bridgeActive: true, outcome, txCandidatesForResponse: gate.txCandidatesForResponse })).toBe(true);
    expect(gate.txCandidatesForResponse!.map(c => c.id)).toEqual(EXPECTED_ORDER);
    const c = assessB2CCompleteness({
      parity: compareMerchantEvidence(mt.evidence, res.meta.merchantScope!.fingerprint),
      shown: gate.txCandidatesForResponse!.length,
      truncated: res.meta.merchantScope!.truncated,
    });
    expect(c.complete).toBe(true);
    const text = formatB2CCompletenessInstruction(c);
    expect(text).toContain('10 transactions found');
    expect(text).toContain('Do NOT call tx_search');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// O. Parity mismatch fails safe
// ─────────────────────────────────────────────────────────────────────────────
describe('O. evidence mismatch / truncation / unverified fail safe', () => {
  it('analysis said 10 but retrieval yields 8 → PARTIAL, never presented as complete', async () => {
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    db.rows = db.rows.filter(r => r.id !== MISSING_A && r.id !== MISSING_B); // data drift between turns
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    expect(res.rows).toHaveLength(8);
    const c = assessB2CCompleteness({
      parity: compareMerchantEvidence(mt.evidence, res.meta.merchantScope!.fingerprint),
      shown: res.rows.length,
      truncated: res.meta.merchantScope!.truncated,
    });
    expect(c.complete).toBe(false);
    expect(c.parity).toBe('mismatch');
    const text = formatB2CCompletenessInstruction(c);
    expect(text).toContain('PARTIAL RESULT');
    expect(text).toContain('counted 10 transactions totaling $2614.74');
    expect(text).toContain('returned 8 transactions');
    expect(text).not.toContain('exactly the transactions');
  });

  it('same count/total but different IDs is still a mismatch', () => {
    const a = merchantEvidenceFingerprint([{ id: 'x', amount: 5 }, { id: 'y', amount: 5 }]);
    const b = merchantEvidenceFingerprint([{ id: 'x', amount: 5 }, { id: 'z', amount: 5 }]);
    expect(compareMerchantEvidence(a, b).status).toBe('mismatch');
  });

  it('result cap truncation → PARTIAL with shown/matched counts', async () => {
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    const args = buildMerchantBridgeArgs(liveContext(mt.evidence ?? null));
    const res = await runTxSearch({ ...args, limit: 4 });
    expect(res.rows.map(r => r.id)).toEqual(EXPECTED_ORDER.slice(0, 4));
    expect(res.meta.merchantScope).toMatchObject({ matchedCount: 10, returnedCount: 4, truncated: true });
    const c = assessB2CCompleteness({
      parity: compareMerchantEvidence(mt.evidence, res.meta.merchantScope!.fingerprint),
      shown: res.rows.length,
      truncated: res.meta.merchantScope!.truncated,
    });
    expect(c.complete).toBe(false);
    expect(formatB2CCompletenessInstruction(c)).toContain('showing 4');
  });

  it('context without an evidence fingerprint → UNVERIFIED, no completeness claim', async () => {
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(null)));
    const c = assessB2CCompleteness({
      parity: compareMerchantEvidence(null, res.meta.merchantScope!.fingerprint),
      shown: res.rows.length,
      truncated: false,
    });
    expect(c.complete).toBe(false);
    expect(formatB2CCompletenessInstruction(c)).toContain('UNVERIFIED RESULT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Contract preservation for generic tx_search callers
// ─────────────────────────────────────────────────────────────────────────────
describe('Generic tx_search contract unchanged', () => {
  it('without merchantScope: q search uses posted_at ordering and no merchantScope meta', async () => {
    const res = await runTxSearch({ q: 'Costco', limit: 200 });
    expect(res.rows).toHaveLength(12);
    expect(res.meta.merchantScope).toBeUndefined();
  });

  it('applyMerchantScope is pure and leaves input rows untouched', () => {
    const input = COSTCO_ROWS.map(r => ({ ...r })) as Array<{ id: string } & Row>;
    const snapshot = JSON.stringify(input);
    applyMerchantScope(input, { excludeGroups: ['costco gas'] });
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PRE-COMMIT BLOCKER REGRESSIONS
// ═════════════════════════════════════════════════════════════════════════════

const CHAT_SRC = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');

/** Production P3.0A → P3.1A.1 → P3.1A → P3.1B pipeline, as chat.ts composes it. */
function planFor(message: string) {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
  const ts = buildTemporalScope(message, { timezone: 'America/Edmonton', referenceDate: new Date('2026-09-30T12:00:00Z') }, intent.financialClassification?.years);
  const contract = buildRuntimeEvidenceContract(intent, {
    memoryLoaded: false, memoryFactCount: 0, conversationHistoryLoaded: false,
    candidateIdentityAvailable: false, pipelineSnapshotLoaded: false,
  }, ts ?? undefined);
  return { intent, ts, plan: buildEvidencePlan(contract, intent, undefined) };
}

describe('Blocker 1 — date-scoped P3.1C merchant context', () => {
  const MSG = 'What did I spend at Costco in 2025?';

  it('the stored context takes dates from the EXECUTED merchant_totals step', async () => {
    const { ts, plan } = planFor(MSG);
    // Executed through the production P3.1C executor with the real merchant_totals
    const executed: Array<{ tool: string; args: Record<string, unknown> }> = [];
    const result = await executeEvidencePlan(plan, async (tool, args) => {
      executed.push({ tool, args });
      const r = await merchantTotals(args as Parameters<typeof merchantTotals>[0], { userId: U });
      if (!r.ok) throw r.error;
      return r.value;
    }, new Map() as DedupCache);
    const mtCall = executed.find(e => e.tool === 'merchant_totals');
    expect(mtCall?.args).toMatchObject({ merchant: 'Costco', startDate: '2025-01-01', endDate: '2025-12-31' });

    // The bug: the temporal-scope object has no startDate/endDate fields
    expect((ts as unknown as Record<string, unknown>).startDate).toBeUndefined();

    const scope = merchantTemporalScopeFromPlanSteps(plan.steps);
    expect(scope).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });

    const mtData = result.results.find(r => r.tool === 'merchant_totals')?.data as {
      merchants: Array<{ merchant: string; groupingKey: string }>;
      evidence: { count: number; total: number; idsHash: string };
    };
    const mac = buildMerchantAnalysisContext('Costco', mtData.merchants, {
      excludedGroups: [], temporalScope: scope, categoryFilter: null, evidenceComplete: true, evidence: mtData.evidence,
    });
    expect(mac.temporalScope).toEqual({ startDate: '2025-01-01', endDate: '2025-12-31' });

    // The bridge sends exactly those dates, and parity holds for the 2025 scope
    const args = buildMerchantBridgeArgs(mac);
    expect(args.merchantScope.startDate).toBe('2025-01-01');
    expect(args.merchantScope.endDate).toBe('2025-12-31');
    const res = await runTxSearch(args);
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every(r => (r.date || '') >= '2025-01-01' && (r.date || '') <= '2025-12-31')).toBe(true);
    expect(res.meta.merchantScope?.fingerprint).toEqual(mtData.evidence);
    expect(assessB2CBridgeResult({ expected: mac.evidence, payload: res, cardCount: res.rows.length }).complete).toBe(true);
  });

  it('chat.ts persists the executed-step dates (not temporalScope.startDate)', () => {
    expect(CHAT_SRC).toContain('temporalScope: merchantTemporalScopeFromPlanSteps(evidencePlanForExecution?.steps),');
    expect(CHAT_SRC).not.toMatch(/startDate: temporalScope\.startDate/);
  });

  it('an unscoped analysis stores no dates; multi-source / incomplete ranges are not a single scope', () => {
    expect(merchantTemporalScopeFromPlanSteps(planFor('What did I spend at Costco?').plan.steps)).toBeNull();
    expect(merchantTemporalScopeFromPlanSteps([{ tool: 'merchant_totals', mode: 'multi_source', params: { periodA_startDate: '2025-01-01' } }])).toBeNull();
    expect(merchantTemporalScopeFromPlanSteps([{ tool: 'merchant_totals', mode: 'tool', params: { startDate: '2025-01-01' } }])).toBeNull();
    expect(merchantTemporalScopeFromPlanSteps(null)).toBeNull();
  });
});

describe('Blocker 2 — refine with old (object) vs new (string) categoryFilter', () => {
  function seedSession(categoryFilter: unknown) {
    db.sessions = [{
      id: 'sess-1', user_id: U,
      context: { merchant_analysis: {
        merchantQuery: 'Costco',
        activeGroups: [
          { groupingKey: 'costco', displayName: 'COSTCO' },
          { groupingKey: 'costco wholesale', displayName: 'COSTCO WHOLESALE' },
          { groupingKey: 'costco gas', displayName: 'COSTCO GAS' },
        ],
        excludedGroups: [], temporalScope: null, categoryFilter, evidenceComplete: true, updatedAt: new Date().toISOString(),
      } },
    }];
  }
  const categoryCalls = () => db.calls.filter(([m, c]) => m === 'eq' && c === 'category');

  it('old object categoryFilter is NOT passed to merchant_totals (undefined)', async () => {
    seedSession({ category: 'Groceries', subcategory: 'Groceries' });
    const r = await refineExecute({ operation: 'exclude', targets: ['costco gas'] }, { userId: U, sessionId: 'sess-1' });
    expect(r.ok && r.value.status).toBe('success');
    expect(categoryCalls()).toEqual([]);
    expect(r.ok && r.value.transactionCount).toBe(10);
    expect(r.ok && r.value.grandTotal).toBe(2614.74);
  });

  it('new string categoryFilter is passed unchanged', async () => {
    seedSession('Groceries');
    const r = await refineExecute({ operation: 'exclude', targets: ['costco gas'] }, { userId: U, sessionId: 'sess-1' });
    expect(r.ok && r.value.status).toBe('success');
    expect(categoryCalls()).toEqual([['eq', 'category', 'Groceries']]);
    // Groceries only: the Restaurants / Dining wholesale row drops out
    expect(r.ok && r.value.transactionCount).toBe(9);
  });

  it('refine persists the fresh evidence fingerprint into the context', async () => {
    seedSession(null);
    await refineExecute({ operation: 'exclude', targets: ['costco gas'] }, { userId: U, sessionId: 'sess-1' });
    const mac = (db.sessions[0].context as { merchant_analysis: { evidence: { count: number; total: number } } }).merchant_analysis;
    expect(mac.evidence).toMatchObject({ count: 10, total: 2614.74 });
  });

  it('shared guard: only exact strings are category scope', () => {
    expect(merchantCategoryScope('Groceries')).toBe('Groceries');
    expect(merchantCategoryScope({ category: 'Groceries' })).toBeUndefined();
    expect(merchantCategoryScope('')).toBeUndefined();
    expect(merchantCategoryScope(null)).toBeUndefined();
  });
});

describe('Merchant matching and user ownership', () => {
  const WALMART: Row = {
    id: 'cccccccc-0000-4000-8000-000000000003', user_id: U, posted_at: '2025-07-01T00:00:00+00:00', date: '2025-07-01',
    merchant_name: 'WALMART', merchant: 'WALMART SUPERCENTER', description: 'COSTCO RETURN DESK',
    amount: 75, type: 'expense', category: 'Groceries', subcategory: null, import_id: null, document_id: null,
  };
  const OTHER_USER_COSTCO: Row = {
    id: 'dddddddd-0000-4000-8000-000000000004', user_id: 'user-2', posted_at: '2025-07-02T00:00:00+00:00', date: '2025-07-02',
    merchant_name: 'COSTCO', merchant: 'COSTCO WHOLESALE', description: null,
    amount: 999, type: 'expense', category: 'Groceries', subcategory: null, import_id: null, document_id: null,
  };

  it('a non-matching merchant is excluded from merchant_totals and B2C (description does not count)', async () => {
    db.rows.push({ ...WALMART });
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    expect(mt.transactionCount).toBe(10);
    expect(mt.merchants.map(m => m.groupingKey)).not.toContain('walmart');
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    expect(res.rows.map(r => r.id)).not.toContain(WALMART.id);
    expect(res.rows).toHaveLength(10);
  });

  it("another user's matching Costco row never enters merchant_totals or B2C", async () => {
    db.rows.push({ ...OTHER_USER_COSTCO });
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    expect(mt.transactionCount).toBe(10);
    expect(mt.grandTotal).toBe(2614.74);
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    expect(res.rows.map(r => r.id)).not.toContain(OTHER_USER_COSTCO.id);
    expect(res.meta.merchantScope?.fingerprint).toEqual(mt.evidence);
    const userFilters = db.calls.filter(([m, c]) => m === 'eq' && c === 'user_id');
    expect(userFilters.length).toBeGreaterThan(0);
    expect(userFilters.every(([, , v]) => v === U)).toBe(true);
  });
});

describe('Chat parity wiring (assessB2CBridgeResult)', () => {
  async function bridgePayload() {
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    if (!mt.evidence) throw new Error('missing evidence');
    return { expected: mt.evidence, res };
  }

  it('matching fingerprint + card count == matched + no truncation → complete', async () => {
    const { expected, res } = await bridgePayload();
    expect(assessB2CBridgeResult({ expected, payload: res, cardCount: 10 }).complete).toBe(true);
  });

  it('any missing condition → not complete', async () => {
    const { expected, res } = await bridgePayload();
    expect(assessB2CBridgeResult({ expected, payload: res, cardCount: 9 }).complete).toBe(false);
    expect(assessB2CBridgeResult({ expected: { ...expected, idsHash: '00000000' }, payload: res, cardCount: 10 }).complete).toBe(false);
    expect(assessB2CBridgeResult({ expected: { ...expected, count: 11 }, payload: res, cardCount: 10 }).complete).toBe(false);
    const truncated = { ...res, meta: { ...res.meta, merchantScope: { ...res.meta.merchantScope, truncated: true } } };
    expect(assessB2CBridgeResult({ expected, payload: truncated, cardCount: 10 }).complete).toBe(false);
    const noExpected = assessB2CBridgeResult({ expected: null, payload: res, cardCount: 10 });
    expect(noExpected.complete).toBe(false);
    expect(noExpected.parity).toBe('unverified');
  });

  it('chat.ts derives completeness from this helper with the gate-rendered card count', () => {
    expect(CHAT_SRC).toMatch(/b2cCompleteness = assessB2CBridgeResult\(\{\s*expected: existingMerchantAnalysis\?\.evidence \?\? null,\s*payload: b2cData,\s*cardCount: ownershipGate\.txCandidatesForResponse\?\.length \?\? 0,\s*\}\);/);
    expect(CHAT_SRC).toContain('formatB2CCompletenessInstruction(b2cCompleteness)');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// P3.3D — B2C visible frame (>25) and canonical display
// ═════════════════════════════════════════════════════════════════════════════

describe('P3.3D — B2C visible frame', () => {
  /** 20 extra non-gas Costco rows → 30 non-gas matches in total. */
  function seedThirtyNonGas() {
    for (let i = 1; i <= 20; i++) {
      db.rows.push({
        id: `eeeeeeee-0000-4000-8000-${String(i).padStart(12, '0')}`, user_id: U,
        posted_at: null, date: `2024-0${(i % 9) + 1}-1${i % 10}`,
        merchant_name: 'COSTCO', merchant: null, description: null,
        amount: 10 + i, type: 'expense', category: 'Groceries', subcategory: null, import_id: null, document_id: null,
      });
    }
  }

  async function establishB2C() {
    const mt = await runMerchantTotals({ merchant: 'Costco', excludeGroups: ['costco gas'] });
    const res = await runTxSearch(buildMerchantBridgeArgs(liveContext(mt.evidence ?? null)));
    let frame: TxResolutionContext | null = null;
    const gate = createCandidateOwnershipGate({
      persistLayer2: async (result: unknown) => { frame = buildTxResolutionFromSearchResult(result, 1); return true; },
      applyLayer1: () => {},
      clearLayer1: () => {},
    });
    const outcome = await gate.submitSearchResult(res, 'B2C_merchant_bridge', 'candidate_establishment');
    return { mt, res, gate, outcome, frame: () => frame };
  }

  it('>25 matches: Layer 2 = cards = first 25 in validated order; P3.3B satisfied; PARTIAL 25 of 30', async () => {
    seedThirtyNonGas();
    const { mt, res, gate, outcome, frame } = await establishB2C();
    expect(mt.transactionCount).toBe(30);
    expect(res.meta.merchantScope?.matchedCount).toBe(30);
    expect(outcome).toBe('established');
    const cards = gate.txCandidatesForResponse!;
    expect(cards).toHaveLength(25);
    expect(frame()!.candidates.map(c => c.id)).toEqual(cards.map(c => c.id));
    // the validated Costco rows keep their positions at the top of the frame
    expect(cards.slice(0, 10).map(c => c.id)).toEqual(EXPECTED_ORDER);
    expect(gate.visibleFrame).toMatchObject({ shown: 25, matched: 30, partial: true });
    // P3.3B now injects (cards exist) → stale Phase 1D withdrawn + current frame injected
    expect(computeB2CCandidatesSatisfied({ bridgeActive: true, outcome, txCandidatesForResponse: cards })).toBe(true);
    const c = assessB2CBridgeResult({ expected: mt.evidence, payload: res, cardCount: cards.length });
    expect(c.complete).toBe(false);
    expect(formatB2CCompletenessInstruction(c)).toContain('PARTIAL RESULT: showing 25 of 30 matching transactions.');
    // ordinal 26 cannot reach a hidden row
    expect(selectCandidateFromFrame(frame(), 25).ok).toBe(true);
    expect(selectCandidateFromFrame(frame(), 26).ok).toBe(false);
  });

  it('<=25 (validated Costco 10): complete wording, no "Present these results", cards own the rows', async () => {
    const { mt, res, gate, frame } = await establishB2C();
    const cards = gate.txCandidatesForResponse!;
    expect(cards.map(c => c.id)).toEqual(EXPECTED_ORDER);
    expect(frame()!.candidates.map(c => c.id)).toEqual(EXPECTED_ORDER);
    expect(gate.visibleFrame).toMatchObject({ shown: 10, matched: 10, partial: false });
    const text = formatB2CCompletenessInstruction(assessB2CBridgeResult({ expected: mt.evidence, payload: res, cardCount: cards.length }));
    expect(text).toContain('10 transactions found');
    expect(text).not.toContain('Present these results');
    const third = selectCandidateFromFrame(frame(), 3);
    expect(third.ok && third.candidate.id).toBe(COSTCO_3);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Semantic Stage 1 — merchant-hint trust grounded by the REAL merchant_totals
// ═════════════════════════════════════════════════════════════════════════════
describe('merchant-hint trust against real merchant_totals groups', () => {
  it('"Show me Costco purchases." grounds against the real Costco groups', async () => {
    const fc = classifyFinancialQuery('Show me Costco purchases.');
    expect(fc.merchantHintSource).toBe('noun_suffix');
    const mt = await runMerchantTotals({ merchant: fc.merchantHint });
    expect(resolveMerchantHintTrust(fc, mt.merchants.map(m => m.groupingKey))).toBe(true);
  });

  it('"these ten transactions": ILIKE finds TENNIS CLUB, but "ten" is not grounded', async () => {
    db.rows.push({ id: 'ffffffff-0000-4000-8000-000000000001', user_id: U, posted_at: null, date: '2025-03-03', merchant_name: 'TENNIS CLUB', merchant: 'TENNIS CLUB', description: null, amount: 80, type: 'expense', category: 'Recreation', subcategory: null, import_id: null, document_id: null });
    const fc = classifyFinancialQuery("What's the total of these ten transactions?");
    const mt = await runMerchantTotals({ merchant: fc.merchantHint });
    expect(mt.merchants.map(m => m.groupingKey)).toEqual(['tennis club']);
    expect(resolveMerchantHintTrust(fc, mt.merchants.map(m => m.groupingKey))).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Semantic Stage 2 — deterministic facts from the REAL B2C-established frame
// ═════════════════════════════════════════════════════════════════════════════
describe('candidate-frame facts over the production B2C frame', () => {
  it('10 shown Costco rows: $2,614.74 total, $261.47 average, #10 largest, #9 smallest — same in Layer 2 and cards', async () => {
    const { gate, frame } = await establishB2CFrame();
    const fromLayer2 = summarizeCandidateFrame(frame()!.candidates)!;
    expect(fromLayer2.spending).toEqual({ count: 10, totalCents: 261474, averageCents: 26147 });
    expect(fromLayer2.largest).toMatchObject({ ordinal: 10, id: MISSING_A, amountCents: 74433 });
    expect(fromLayer2.smallest).toMatchObject({ ordinal: 9, id: MISSING_B, amountCents: 1834 });
    expect(summarizeCandidateFrame(gate.txCandidatesForResponse)).toEqual(fromLayer2);
    expect(frame()!.selectedId).toBeNull();
  });
});
