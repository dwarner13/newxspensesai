/**
 * P2 — transaction-list cards match the requested period, exact match counts, New Chat welcome.
 *
 * Staging defect: "Show me my transactions from May 2026." answered from the authoritative May
 * evidence, but the cards were the 25 newest rows (June) from the model's own UNDATED search,
 * because P3.1C tx_search results could never establish the frame.
 *
 * End-to-end where it matters: real classifier → planner → evidence executor → real tx-search
 * handler (fake DB with Postgres ordering + exact counts) → real ownership gate.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  authUser: 'user-1' as string | null,
  calls: [] as Array<[string, string, unknown]>,
}));

vi.mock('../_shared/supabase.js', () => ({ admin: () => fakeClient() }));
vi.mock('../_shared/verifyAuth.js', () => ({
  verifyAuth: async () => (db.authUser ? { userId: db.authUser, error: null } : { userId: null, error: 'Unauthorized' }),
}));

const KNOWN = new Set(['id', 'user_id', 'posted_at', 'date', 'merchant_name', 'merchant', 'description',
  'amount', 'type', 'category', 'subcategory', 'import_id', 'document_id']);

/** PostgREST-like builder: Postgres ordering (DESC → NULLS FIRST by default) and exact counts. */
function fakeClient() {
  function builder(table: string, columns: string, opts?: { count?: string }) {
    const isTx = table === 'transactions';
    const cols = columns.split(',').map(c => c.trim()).filter(Boolean);
    const missing = isTx ? cols.filter(c => !KNOWN.has(c)) : [];
    const filters: Array<(r: Row) => boolean> = [];
    const orders: Array<{ col: string; asc: boolean; nullsFirst: boolean }> = [];
    let limit = Infinity;
    const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
    const rec = (m: string, c: string, v: unknown) => { if (isTx) db.calls.push([m, c, v]); };
    const like = (v: unknown, pat: string) => str(v) !== null && str(v)!.toLowerCase().includes(pat.replace(/%/g, '').toLowerCase());
    const b = {
      eq(c: string, v: unknown) { rec('eq', c, v); filters.push(r => r[c] === v); return b; },
      gte(c: string, v: unknown) { rec('gte', c, v); filters.push(r => str(r[c]) !== null && str(r[c])! >= String(v)); return b; },
      lte(c: string, v: unknown) { rec('lte', c, v); filters.push(r => str(r[c]) !== null && str(r[c])! <= String(v)); return b; },
      ilike(c: string, p: string) { rec('ilike', c, p); filters.push(r => like(r[c], p)); return b; },
      or(expr: string) {
        const parts = expr.split(',').map(p => p.match(/^(\w+)\.ilike\.(.*)$/));
        if (!parts.every(Boolean)) throw new Error(`fake db: unsupported or(): ${expr}`);
        filters.push(r => parts.some(m => like(r[m![1]], m![2])));
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
        if (missing.length > 0) {
          return Promise.resolve({ data: null, error: { code: '42703', message: `column ${missing[0]} does not exist` } }).then(resolve);
        }
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
        const count = opts?.count === 'exact' ? matched.length : null;
        if (isTx && opts?.count === 'exact') db.calls.push(['count', 'exact', matched.length]);
        return Promise.resolve({ data, error: null, count }).then(resolve);
      },
    };
    return b;
  }
  return { from: (t: string) => ({ select: (c: string, o?: { count?: string }) => builder(t, c, o) }) };
}

import { handler as txSearchHandler } from '../tx-search';
import { classifyPrimeIntent } from '../../../src/shared/prime-intent-classifier';
import { buildTemporalScope } from '../../../src/shared/prime-temporal-scope';
import { buildRuntimeEvidenceContract } from '../../../src/shared/prime-evidence-contract';
import { buildEvidencePlan } from '../../../src/shared/prime-evidence-resolver';
import { executeEvidencePlan, buildEvidenceContextMessage } from '../../../src/shared/prime-evidence-executor';
import {
  createCandidateOwnershipGate,
  submitEvidenceTxSearchResults,
  resolveModelSearchOwnership,
} from '../../../src/shared/tx-candidate-ownership';

const REF = new Date('2026-11-21T20:40:00Z');
const CTX = { timezone: 'America/Edmonton', referenceDate: REF };
const AV = { memoryLoaded: true, memoryFactCount: 0, conversationHistoryLoaded: true, candidateIdentityAvailable: false, pipelineSnapshotLoaded: false };

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tx = (n: number, date: string, category: string, user = 'user-1'): Row => ({
  id: uuid(n), user_id: user, date, posted_at: `${date}T12:00:00Z`, amount: -(10 + n), type: 'expense', category,
  merchant_name: `Shop ${n}`, merchant: `Shop ${n}`, description: `purchase ${n}`, subcategory: null, import_id: null, document_id: null,
});

async function txSearch(body: Record<string, unknown>) {
  const res = await txSearchHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) } as never, {} as never) as { statusCode: number; body: string };
  return { status: res.statusCode, json: JSON.parse(res.body || '{}') };
}

/** Run the real pipeline for a message: plan → executor (→ real tx-search) → evidence result. */
async function evidenceFor(message: string) {
  const intent = classifyPrimeIntent(message, { candidateFollowUpDetected: false, historicalReferenceDetected: false });
  const ts = buildTemporalScope(message, CTX, intent.financialClassification?.years);
  const plan = buildEvidencePlan(buildRuntimeEvidenceContract(intent, AV, ts ?? undefined), intent);
  const toolArgs: Array<Record<string, unknown>> = [];
  const result = await executeEvidencePlan(plan, async (tool, args) => {
    toolArgs.push({ tool, ...args });
    if (tool !== 'tx_search') throw new Error(`unexpected tool ${tool}`);
    return (await txSearch(args)).json;
  }, new Map());
  return { intent, plan, result, toolArgs };
}

function gate() {
  const persistLayer2 = vi.fn(async (frame: unknown) => frame !== undefined);
  const g = createCandidateOwnershipGate({ persistLayer2, applyLayer1: vi.fn(), clearLayer1: vi.fn() });
  return { g, persistLayer2 };
}

beforeEach(() => {
  db.authUser = 'user-1';
  db.calls = [];
  db.rows = [];
  // 30 May 2026 rows (alternating categories), 10 newer June rows, another user's May rows.
  for (let d = 1; d <= 30; d++) db.rows.push(tx(d, `2026-05-${String(d).padStart(2, '0')}`, d % 2 ? 'Groceries' : 'Restaurants'));
  for (let d = 1; d <= 10; d++) db.rows.push(tx(100 + d, `2026-06-${String(d + 6).padStart(2, '0')}`, 'Groceries'));
  for (let d = 1; d <= 5; d++) db.rows.push(tx(200 + d, `2026-05-${String(d).padStart(2, '0')}`, 'Groceries', 'user-2'));
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-B — cards come from the authoritative list
// ─────────────────────────────────────────────────────────────────────────────

describe('P2-B: explicit list cards match the requested period', () => {
  it('May 2026 list: the authoritative search establishes cards that are ALL in May, with the exact total', async () => {
    const { intent, result, toolArgs } = await evidenceFor('Show me my transactions from May 2026.');
    expect(intent.financialClassification?.requestShape).toBe('list');
    expect(toolArgs[0]).toMatchObject({ tool: 'tx_search', startDate: '2026-05-01', endDate: '2026-05-31', includeTotalCount: true });
    const { g, persistLayer2 } = gate();
    const outcomes = await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true });
    expect(outcomes).toEqual(['established']);
    expect(persistLayer2).toHaveBeenCalledTimes(1);
    const cards = g.txCandidatesForResponse!;
    expect(cards).toHaveLength(25);
    expect(cards.every(c => String(c.date) >= '2026-05-01' && String(c.date) <= '2026-05-31')).toBe(true);
    expect(g.visibleFrame).toMatchObject({ shown: 25, matched: 30, partial: true });
  });

  it('a later undated model search cannot replace the authoritative list', async () => {
    const { result } = await evidenceFor('Show me my transactions from May 2026.');
    const { g, persistLayer2 } = gate();
    await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true });
    const before = g.txCandidatesForResponse!.map(c => c.id);
    const intent = resolveModelSearchOwnership({ purpose: 'new_candidate_scope', hasExistingCandidates: true, aggregateEvidenceSatisfied: false, authoritativeListAnswered: true, args: { limit: 25 } });
    expect(intent).toBe('analytical_evidence');
    const undated = (await txSearch({ limit: 25 })).json; // would be the 25 newest (June) rows
    expect(await g.submitSearchResult(undated, 'non-streaming', intent)).toBe('skipped_locked');
    // even a forced establishment attempt is blocked by the lock
    expect(await g.submitSearchResult(undated, 'tool-loop', 'candidate_establishment')).toBe('skipped_locked');
    expect(g.txCandidatesForResponse!.map(c => c.id)).toEqual(before);
    expect(persistLayer2).toHaveBeenCalledTimes(1);
  });

  it('empty-period list produces no cards, and the model\'s own searches cannot add unrelated ones', async () => {
    const { result } = await evidenceFor('Show me my transactions from October 2026.');
    expect(result.results.find(r => r.tool === 'tx_search')?.status).toBe('successful_empty');
    const { g, persistLayer2 } = gate();
    const outcomes = await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true });
    // F1: the empty authoritative list establishes an EMPTY frame (clears any stale cards/reference)
    expect(outcomes).toEqual(['established']);
    expect(g.txCandidatesForResponse).toBeNull();
    for (const args of [{}, { startDate: '2026-06-01', endDate: '2026-06-30' }]) {
      const intent = resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: false, authoritativeListAnswered: true, args });
      expect(intent).toBe('analytical_evidence');
      await g.submitSearchResult((await txSearch(args)).json, 'non-streaming', intent);
    }
    expect(g.txCandidatesForResponse).toBeNull();
    // only the one clearing write of the empty frame — the model's searches never persist
    expect(persistLayer2).toHaveBeenCalledTimes(1);
    expect((persistLayer2.mock.calls[0][0] as { rows: unknown[] }).rows).toEqual([]);
  });

  it('category-scoped list keeps its filter (and period) in cards and count', async () => {
    const { result, toolArgs } = await evidenceFor('Show me my grocery transactions in May 2026.');
    expect(toolArgs[0]).toMatchObject({ category: 'Groceries', startDate: '2026-05-01', endDate: '2026-05-31' });
    const { g } = gate();
    await submitEvidenceTxSearchResults(result.results, g, { establishFrame: true });
    const cards = g.txCandidatesForResponse!;
    expect(cards.length).toBe(15);
    expect(cards.every(c => c.category === 'Groceries' && String(c.date).startsWith('2026-05'))).toBe(true);
    expect(g.visibleFrame).toMatchObject({ shown: 15, matched: 15, partial: false });
  });

  it('a new explicit list replaces the previous list (new request, new gate)', async () => {
    const first = gate();
    await submitEvidenceTxSearchResults((await evidenceFor('Show me my transactions from May 2026.')).result.results, first.g, { establishFrame: true });
    const second = gate();
    await submitEvidenceTxSearchResults((await evidenceFor('Show me my grocery transactions in May 2026.')).result.results, second.g, { establishFrame: true });
    expect(second.persistLayer2).toHaveBeenCalledTimes(1);
    const persisted = second.persistLayer2.mock.calls[0][0] as { rows: Array<{ category: string }> };
    expect(persisted.rows.every(r => r.category === 'Groceries')).toBe(true);
  });

  it('non-list requests keep P3.1C evidence analytical (no cards)', async () => {
    const { result } = await evidenceFor('Show me my transactions from May 2026.');
    const { g } = gate();
    expect(await submitEvidenceTxSearchResults(result.results, g, { establishFrame: false })).toEqual(['skipped_analytical']);
    expect(await submitEvidenceTxSearchResults(result.results, g)).toEqual(['skipped_analytical']);
    expect(g.txCandidatesForResponse).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-B2 — exact counts
// ─────────────────────────────────────────────────────────────────────────────

describe('P2-B2: exact match counts', () => {
  it('count is the exact DB count with the same filters, distinct from rows shown', async () => {
    const r = await txSearch({ startDate: '2026-05-01', endDate: '2026-05-31', limit: 5, includeTotalCount: true });
    expect(r.json.rows).toHaveLength(5);
    expect(r.json.totals.count).toBe(5); // existing contract: rows returned
    expect(r.json.meta).toMatchObject({ matchedCount: 30, returnedCount: 5 });
    const g = await txSearch({ startDate: '2026-05-01', endDate: '2026-05-31', category: 'Groceries', limit: 5, includeTotalCount: true });
    expect(g.json.meta.matchedCount).toBe(15);
  });

  it('other users\' rows are never counted; unauthenticated requests are rejected', async () => {
    const r = await txSearch({ startDate: '2026-05-01', endDate: '2026-05-05', includeTotalCount: true });
    expect(r.json.meta.matchedCount).toBe(5); // user-2 also has 5 rows in that window
    expect(db.calls).toContainEqual(['eq', 'user_id', 'user-1']);
    db.authUser = null;
    expect((await txSearch({ includeTotalCount: true })).status).toBe(401);
  });

  it('no extra count unless requested', async () => {
    const r = await txSearch({ startDate: '2026-05-01', endDate: '2026-05-31' });
    expect(r.json.meta.matchedCount).toBeUndefined();
    expect(db.calls.some(([m]) => m === 'count')).toBe(false);
  });

  it('Prime is told "Showing N of M", never a total inferred from the rows shown', async () => {
    const { result } = await evidenceFor('Show me my transactions from May 2026.');
    const msg = buildEvidenceContextMessage(result)!;
    expect(msg).toContain('Showing 25 of 30 matching transaction(s)');
    expect(msg).not.toMatch(/25 transaction\(s\) found/);
    // without an exact count the message refuses to present the row count as a total
    const noCount = { ...result, results: result.results.map(r => ({ ...r, data: { ...(r.data as object), matchedCount: undefined } })) };
    expect(buildEvidenceContextMessage(noCount as never)).toContain('total matching count not available');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wiring (structural) — chat.ts and PrimeChatV2
// ─────────────────────────────────────────────────────────────────────────────

describe('wiring', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  const v2 = fs.readFileSync(path.resolve(__dirname, '../../../src/pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');

  it('chat.ts: only explicit, non-merchant list requests let the authoritative result establish cards', () => {
    expect(chat).toMatch(/const p31cExplicitListRequest = isPrime\s+&& shadowIntentResult\?\.financialClassification\?\.requestShape === 'list'\s+&& shadowIntentResult\?\.financialClassification\?\.queryType !== 'merchant';/);
    expect(chat).toContain('submitEvidenceTxSearchResults(p31cResult.results, ownershipGate, { establishFrame: p31cExplicitListRequest })');
    expect(chat.match(/authoritativeListAnswered, explicitListRequest: primeExplicitListShape, unscopedReference: primeUnscopedReference, args/g)?.length).toBe(4); // C2-F explicitListRequest; F2 unscopedReference
    expect(chat).toContain('if (p31cListFrameEstablished && ownershipGate.visibleFrame && ownershipGate.visibleFrame.shown > 0) {');
  });

  it('P2-A: New Chat shows the welcome immediately and carries nothing over', () => {
    const start = v2.indexOf('const handleNewChat = useCallback(() => {');
    const block = v2.slice(start, v2.indexOf('}, [userId]);', start));
    expect(block).toContain('localStorage.setItem(primeSessionStorageKey(userId), newId);'); // new session
    expect(block).toContain('setLastSessionChecked(true);');
    // C2-F: New Chat now shows a short welcome; the full briefing is on demand (no replay)
    expect(block).toContain('setFreshWelcome(true);');
    expect(block).toContain('setShowBriefing(false);');
    expect(block).toContain('setRevealStep(0);');
    expect(block).toContain('clearMessages();'); // no previous messages/cards
    expect(block).toContain('setHistory([]);');
    expect(block).toContain('setUploadMessages([]);');
    expect(block).not.toMatch(/\.delete\(|from\(['"]chat_/); // previous session is not removed
  });

  it('P2-A: the welcome area no longer depends on a lookup that never re-runs', () => {
    expect(v2).toContain('{!lastSessionChecked ? null : lastSession && !showBriefing');
    expect(v2).not.toMatch(/setLastSessionChecked\(false\)/);
  });

  it('suggested questions still send through handleSend (briefing and no-data welcome)', () => {
    expect(v2).toMatch(/revealStep >= 8 && !promptsUsed[\s\S]{0,600}onClick=\{\(\) => handleSend\(q\)\}/);
    expect(v2).toMatch(/!data\.loading && data\.transactionCount === 0 \?[\s\S]{0,1800}onClick=\{\(\) => handleSend\(q\)\}/);
  });
});
