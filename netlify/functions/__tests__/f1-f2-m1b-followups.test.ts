/**
 * F1 / F2 / M1b — financial follow-ups resolve to the right verified records and cards.
 *
 * Staging conversation (owner):
 *   "Tell me May groceries" → "I want to know about my groceries" (switched to all-time)
 *   "In May 2026 I had a transaction at Peace Hills" → "I'd like to review it" →
 *   "Show me the transaction" (5 unrelated May 29 cards) →
 *   "Show me all the transactions May 15" (11 listed in text, no cards)
 *
 * End-to-end where it matters: real classifier → temporal scope → planner → evidence executor →
 * real tx-search handler (fake DB, Postgres ordering, exact counts, user scoping) → real gate.
 * Synthetic data only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], authUser: 'user-1' as string | null }));

vi.mock('../_shared/supabase.js', () => ({ admin: () => fakeClient() }));
vi.mock('../_shared/verifyAuth.js', () => ({
  verifyAuth: async () => (db.authUser ? { userId: db.authUser, error: null } : { userId: null, error: 'Unauthorized' }),
}));

const KNOWN = new Set(['id', 'user_id', 'posted_at', 'date', 'merchant_name', 'merchant', 'description',
  'amount', 'type', 'category', 'subcategory', 'import_id', 'document_id']);

function fakeClient() {
  function builder(table: string, columns: string, opts?: { count?: string }) {
    const isTx = table === 'transactions';
    const cols = columns.split(',').map(c => c.trim()).filter(Boolean);
    const filters: Array<(r: Row) => boolean> = [];
    const orders: Array<{ col: string; asc: boolean; nullsFirst: boolean }> = [];
    let limit = Infinity;
    const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
    const like = (v: unknown, pat: string) => str(v) !== null && str(v)!.toLowerCase().includes(pat.replace(/%/g, '').toLowerCase());
    const b = {
      eq(c: string, v: unknown) { filters.push(r => r[c] === v); return b; },
      gte(c: string, v: unknown) { filters.push(r => str(r[c]) !== null && str(r[c])! >= String(v)); return b; },
      lte(c: string, v: unknown) { filters.push(r => str(r[c]) !== null && str(r[c])! <= String(v)); return b; },
      ilike(c: string, p: string) { filters.push(r => like(r[c], p)); return b; },
      or(expr: string) {
        const parts = expr.split(',').map(p => p.match(/^(\w+)\.ilike\.(.*)$/));
        filters.push(r => parts.some(m => !!m && like(r[m[1]], m[2])));
        return b;
      },
      order(c: string, o?: { ascending?: boolean; nullsFirst?: boolean }) {
        const asc = o?.ascending !== false;
        orders.push({ col: c, asc, nullsFirst: o?.nullsFirst ?? !asc });
        return b;
      },
      not() { return b; }, in() { return b; }, is() { return b; },
      limit(n: number) { limit = n; return b; },
      maybeSingle() { return b; },
      then<T>(resolve: (v: { data: unknown; error: unknown; count?: number | null }) => T) {
        if (isTx && cols.some(c => !KNOWN.has(c))) return Promise.resolve({ data: null, error: { code: '42703', message: 'bad column' } }).then(resolve);
        const matched = (isTx ? db.rows : []).filter(r => filters.every(f => f(r)));
        matched.sort((a, z) => {
          for (const o of orders) {
            const x = str(a[o.col]), y = str(z[o.col]);
            if (x === y) continue;
            if (x === null) return o.nullsFirst ? -1 : 1;
            if (y === null) return o.nullsFirst ? 1 : -1;
            return (x < y ? -1 : 1) * (o.asc ? 1 : -1);
          }
          return 0;
        });
        const data = matched.slice(0, limit).map(r => Object.fromEntries(cols.map(c => [c, r[c] ?? null])));
        return Promise.resolve({ data, error: null, count: opts?.count === 'exact' ? matched.length : null }).then(resolve);
      },
    };
    return b;
  }
  return { from: (t: string) => ({ select: (c: string, o?: { count?: string }) => builder(t, c, o) }) };
}

import { handler as txSearchHandler } from '../tx-search';
import { classifyFinancialQuery } from '../../../src/shared/financial-query-classifier';
import { classifyPrimeIntent } from '../../../src/shared/prime-intent-classifier';
import { buildTemporalScope, inheritedTemporalScope, extractSingleDay } from '../../../src/shared/prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../../../src/shared/prime-evidence-contract';
import { buildEvidencePlan } from '../../../src/shared/prime-evidence-resolver';
import { executeEvidencePlan } from '../../../src/shared/prime-evidence-executor';
import {
  createCandidateOwnershipGate, submitEvidenceTxSearchResults, resolveModelSearchOwnership,
  computeB2CBridgeActive, buildTxResolutionFromSearchResult,
} from '../../../src/shared/tx-candidate-ownership';
import {
  resolveInheritedPeriod, buildInheritLog, validateLastFinancialRequest, ownerTagFor, type LastFinancialRequest,
} from '../../../src/shared/prime-financial-followup';
import { buildTagReviewPath } from '../../../src/lib/tagReview';

const REF = new Date('2026-11-22T14:00:00Z');
const CTX = { timezone: 'America/Edmonton', referenceDate: REF };
const AV = { memoryLoaded: true, memoryFactCount: 0, conversationHistoryLoaded: true, candidateIdentityAvailable: false, pipelineSnapshotLoaded: false };
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tx = (n: number, date: string, merchant: string, category: string, user = 'user-1'): Row => ({
  id: uuid(n), user_id: user, date, posted_at: `${date}T12:00:00Z`, amount: -(10 + n), type: 'expense', category,
  merchant_name: merchant, merchant, description: `${merchant} purchase`, subcategory: null, import_id: null, document_id: null,
});

async function txSearch(body: Record<string, unknown>) {
  const res = await txSearchHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) } as never, {} as never) as { body: string };
  return JSON.parse(res.body || '{}');
}

async function evidenceFor(message: string, temporalOverride?: ReturnType<typeof buildTemporalScope>) {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
  const ts = temporalOverride ?? buildTemporalScope(message, CTX, intent.financialClassification?.years);
  const plan = buildEvidencePlan(buildRuntimeEvidenceContract(intent, AV, ts ?? undefined), intent);
  const toolArgs: Array<Record<string, unknown>> = [];
  const result = await executeEvidencePlan(plan, async (tool, args) => {
    toolArgs.push({ tool, ...args });
    if (tool === 'tx_search') return txSearch(args);
    return { queryStatus: 'verified', rows: [], categories: [], totals: {} };
  }, new Map());
  return { intent, ts, plan, result, toolArgs };
}

function gate() {
  const persistLayer2 = vi.fn(async (frame: unknown) => frame !== undefined);
  const g = createCandidateOwnershipGate({ persistLayer2, applyLayer1: vi.fn(), clearLayer1: vi.fn() });
  return { g, persistLayer2 };
}

beforeEach(() => {
  db.authUser = 'user-1';
  db.rows = [];
  for (let i = 1; i <= 11; i++) db.rows.push(tx(i, '2026-05-15', `Store ${i}`, i % 2 ? 'Groceries' : 'Shopping'));
  for (let i = 1; i <= 5; i++) db.rows.push(tx(100 + i, '2026-05-29', `Late Shop ${i}`, 'Shopping'));
  db.rows.push(tx(200, '2026-05-14', 'Peace Hills', 'Insurance'));
  for (let m = 3; m <= 7; m++) db.rows.push(tx(300 + m, `2026-0${m}-10`, 'Grocer', 'Groceries'));
  for (let i = 1; i <= 4; i++) db.rows.push(tx(900 + i, '2026-05-15', 'Other User Shop', 'Groceries', 'user-2'));
});

// ─────────────────────────────────────────────────────────────────────────────
describe('F1 — financial lists and cards', () => {
  it('"Show me all the transactions May 15" is a grounded list for exactly that day', () => {
    const fc = classifyFinancialQuery('Show me all the transactions May 15');
    expect(fc).toMatchObject({ requiresGrounding: true, queryType: 'detail', requestShape: 'list' });
    expect(fc.merchantHint).toBeUndefined();
    const ts = buildTemporalScope('Show me all the transactions May 15', CTX);
    expect(ts?.primary).toMatchObject({ from: '2026-05-15', to: '2026-05-16' });
    expect(ts?.granularity).toBe('day');
  });

  it('the verified search returns exactly the 11 May 15 rows as cards (never another user\'s)', async () => {
    const { toolArgs, result } = await evidenceFor('Show me all the transactions May 15');
    expect(toolArgs[0]).toMatchObject({ tool: 'tx_search', startDate: '2026-05-15', endDate: '2026-05-15' });
    const { g } = gate();
    expect(await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true })).toEqual(['established']);
    const cards = g.txCandidatesForResponse!;
    expect(cards).toHaveLength(11);
    expect(cards.every(c => String(c.date).startsWith('2026-05-15'))).toBe(true);
    expect(cards.map(c => c.id)).not.toEqual(expect.arrayContaining([uuid(901)]));
    expect(g.visibleFrame).toMatchObject({ shown: 11, matched: 11 });
  });

  it('a new list replaces stale cards; the model\'s own searches cannot add unrelated ones', async () => {
    const { result } = await evidenceFor('Show me all the transactions May 15');
    const { g, persistLayer2 } = gate();
    await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true });
    expect(persistLayer2).toHaveBeenCalledTimes(1); // new frame written (replaces the stored May 29 frame)
    const intent = resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: true, aggregateEvidenceSatisfied: false, authoritativeListAnswered: true, explicitListRequest: true, args: { startDate: '2026-05-29', endDate: '2026-05-29' } });
    expect(intent).toBe('analytical_evidence');
    expect(await g.submitSearchResult(await txSearch({ startDate: '2026-05-29', endDate: '2026-05-29' }), 'model', intent)).toMatch(/^skipped_(analytical|locked)$/);
    expect(g.txCandidatesForResponse!.every(c => String(c.date).startsWith('2026-05-15'))).toBe(true);
  });

  it('an empty day clears stale cards (empty frame persisted, no cards shown)', async () => {
    const { result } = await evidenceFor('Show me all the transactions May 16');
    const { g, persistLayer2 } = gate();
    expect(await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true })).toEqual(['established']);
    expect((persistLayer2.mock.calls[0][0] as { rows: unknown[] }).rows).toEqual([]);
    expect(g.txCandidatesForResponse).toBeNull();
  });

  it('list verbs are not merchants; "May 15 2026" keeps its year', () => {
    expect(classifyFinancialQuery('list transactions on May 15 2026').merchantHint).toBeUndefined();
    expect(extractSingleDay('list transactions on May 15 2026', CTX)).toMatchObject({ from: '2026-05-15', to: '2026-05-16' });
    expect(extractSingleDay('May 2026', CTX)).toBeNull();
    expect(extractSingleDay('Feb 30', CTX)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('F2 — exact transaction memory', () => {
  it('multi-word merchants are extracted whole', () => {
    expect(classifyFinancialQuery('Show me the Peace Hills transaction')).toMatchObject({ merchantHint: 'Peace Hills', queryType: 'merchant', requestShape: 'list' });
    expect(classifyFinancialQuery('In May 2026 I had a transaction at Peace Hills').merchantHint).toBe('Peace Hills');
    expect(classifyFinancialQuery('How much did I spend at Costco in May?').merchantHint).toBe('Costco');
    expect(classifyFinancialQuery('Show me my Costco transactions').merchantHint).toBe('Costco');
  });

  it('a direct merchant list (or a single merchant match) shows verified cards in the same request', () => {
    const base = { macReady: true, phraseMatch: false, merchantAggSatisfied: true, hasExistingCandidates: false, isNewGroundedSearch: true };
    expect(computeB2CBridgeActive({ ...base, directMerchantList: true })).toBe(true);
    expect(computeB2CBridgeActive({ ...base, directMerchantList: false })).toBe(false); // unchanged legacy rule
    expect(computeB2CBridgeActive({ ...base, macReady: false, directMerchantList: true })).toBe(false); // needs verified merchant context
    expect(computeB2CBridgeActive({ ...base, hasExistingCandidates: true, isNewGroundedSearch: false, directMerchantList: true })).toBe(false);
  });

  it('exactly one verified row becomes the selected reference ("it"); several rows are not auto-selected', async () => {
    const one = buildTxResolutionFromSearchResult({ rows: [{ id: uuid(200), date: '2026-05-14', merchant_name: 'Peace Hills', amount: -210 }] }, Date.now());
    expect(one.selectedId).toBe(uuid(200));
    const many = buildTxResolutionFromSearchResult({ rows: db.rows.slice(0, 3) }, Date.now());
    expect(many.candidates).toHaveLength(3);
    expect(many.selectedId).toBeFalsy();
  });

  it('"Show me the transaction" / "review it" with no scope never creates cards from a model search', () => {
    for (const args of [{}, { startDate: '2026-05-01', endDate: '2026-05-31' }]) {
      for (const purpose of [undefined, 'new_candidate_scope']) {
        expect(resolveModelSearchOwnership({ purpose, hasExistingCandidates: false, aggregateEvidenceSatisfied: false, explicitListRequest: true, unscopedReference: true, args })).toBe('analytical_evidence');
      }
    }
    // scoped requests are unchanged
    expect(resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: false, explicitListRequest: true, args: { startDate: '2026-05-15', endDate: '2026-05-15' } })).toBe('candidate_establishment');
  });

  it('Prime → Tag opens the exact verified transaction id only', () => {
    expect(buildTagReviewPath(uuid(200))).toBe(`/dashboard/transactions?tagTx=${uuid(200)}`);
    expect(buildTagReviewPath('Peace Hills')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('F3 / M1b — follow-ups inherit the verified period', () => {
  const ctxFor = (over: Partial<LastFinancialRequest> = {}, user = 'user-1', expiresInMs = 10 * 60 * 1000): unknown => ({
    v: 1, ownerTag: ownerTagFor(user), subject: 'spending', requestShape: 'aggregate',
    category: { category: 'Groceries' }, merchant: null,
    period: { from: '2026-05-01', to: '2026-06-01', label: 'May 2026', granularity: 'month' },
    scope: { kind: 'category', excludesNonSpend: true, excludedGroups: [] },
    evidence: { kinds: ['category_aggregation'], tools: ['transaction_category_totals'], status: 'verified', fingerprint: 'f' },
    savedAt: new Date(REF.getTime() - 60000).toISOString(), expiresAt: new Date(REF.getTime() + expiresInMs).toISOString(),
    ...over,
  });
  const decide = (message: string, raw: unknown = ctxFor(), user = 'user-1') => resolveInheritedPeriod({
    message,
    financialClassification: classifyFinancialQuery(message),
    temporalScope: buildTemporalScope(message, CTX),
    context: validateLastFinancialRequest(raw, user, REF.getTime()),
  });

  it('same subject without a period keeps May', () => {
    for (const m of ['Tell me more about my groceries', 'I want to know about my groceries']) {
      expect(decide(m)).toMatchObject({ apply: true, reason: 'same_subject', period: { from: '2026-05-01', to: '2026-06-01' } });
    }
  });

  it('top-category and "what about X" follow-ups keep May; "the month before" shifts to April', () => {
    expect(decide('Which category did I spend the most on?')).toMatchObject({ apply: true, reason: 'category_superlative' });
    expect(decide('What about restaurants?')).toMatchObject({ apply: true, reason: 'scope_swap' });
    expect(decide('How about the month before?')).toMatchObject({ apply: true, reason: 'previous_period', period: { from: '2026-04-01', to: '2026-05-01' } });
  });

  it('an explicit new date always wins; a different subject never inherits', () => {
    expect(decide('How much did I spend on groceries in April?')).toMatchObject({ apply: false, reason: 'own_period' });
    expect(decide('Tell me about my restaurants')).toMatchObject({ apply: false, reason: 'different_subject' });
    expect(decide('How much have I spent on groceries ever?')).toMatchObject({ apply: false, reason: 'own_period' });
    expect(decide('What are my all-time grocery totals?')).toMatchObject({ apply: false, reason: 'own_period' });
    expect(decide('What is the weather like?')).toMatchObject({ apply: false });
  });

  it('never across users, never after expiry, never from malformed context', () => {
    expect(decide('Tell me more about my groceries', ctxFor({}, 'user-2'))).toMatchObject({ apply: false, reason: 'no_context', contextStatus: 'cross_user' });
    expect(decide('Tell me more about my groceries', ctxFor({}, 'user-1', -1000))).toMatchObject({ apply: false, contextStatus: 'expired' });
    expect(decide('Tell me more about my groceries', { v: 1, ownerTag: 'x' })).toMatchObject({ apply: false, contextStatus: 'invalid' });
  });

  it('the inherited period is re-queried through the verified evidence path', async () => {
    const d = decide('Tell me more about my groceries');
    if (!d.apply) throw new Error('expected inheritance');
    const ts = inheritedTemporalScope(d.period, d.granularity, CTX);
    expect(ts.primary).toMatchObject({ from: '2026-05-01', to: '2026-06-01', source: 'inferred_previous' });
    const { toolArgs } = await evidenceFor('Tell me more about my groceries', ts);
    expect(toolArgs[0]).toMatchObject({ tool: 'transaction_category_totals', startDate: '2026-05-01', endDate: '2026-05-31' });
  });

  it('logs are structural only', () => {
    const log = JSON.stringify(buildInheritLog(decide('Tell me more about my groceries')));
    expect(log).not.toMatch(/2026|May|Groceries|\$/);
    expect(log).toContain('"reason":"same_subject"');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('chat.ts wiring', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');

  it('M1b runs after the message period is parsed and before evidence planning, behind a kill switch', () => {
    const m1b = chat.indexOf('m1bDecision = resolveInheritedPeriod({');
    expect(m1b).toBeGreaterThan(chat.indexOf("console.warn('[P3.1A.1 Temporal] scope build failed (non-fatal):'"));
    expect(m1b).toBeLessThan(chat.indexOf('runtimeEvidenceContract = buildRuntimeEvidenceContract(shadowIntentResult'));
    expect(chat).toContain("const m1bEnabled = isPrime && process.env.PRIME_M1B_INHERIT !== '0';");
    expect(chat).toContain('temporalScope = inheritedTemporalScope(m1bDecision.period, m1bDecision.granularity');
    expect(chat).toContain('Say which period you used');
  });

  it('F2 wiring: unscoped references are passed at all four model-search sites, with a clarification note', () => {
    expect(chat.match(/unscopedReference: primeUnscopedReference, args/g)?.length).toBe(4);
    expect(chat).toContain('Ask which one they mean (merchant and date) in one short question');
    expect(chat).toContain('directMerchantList,');
  });

  it('existing protections stay in place', () => {
    expect(chat).toContain('sanitizePrimeContext(requestBody?.prime_context)');
    expect(chat).toContain("console.log('[FinancialGrounding] snapshot-only match ignored — continuing to the verified evidence path');");
    expect(chat).toContain('const periodUnresolvedTaxSummary');
  });
});
