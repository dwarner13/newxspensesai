/**
 * P1 — transaction evidence and card consistency (staging defect, 2026-11-21).
 *
 * Observed: "How much did I spend last month?" → correct authoritative zero for October 2026,
 * but 25 unrelated cards (April–December 2025, incl. income/transfers/debt) rendered beneath it.
 * Cause 1: tx-search preferred `posted_at` and sorted DESC with Postgres' default NULLS FIRST,
 *          so an undated search returned legacy rows with empty posted_at first.
 * Cause 2: the model's undated tx_search (made after P3.1C had already answered the total)
 *          established the candidate frame → cards.
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

// Columns on the live transactions table (memo / occurred_at absent).
const KNOWN = new Set(['id', 'user_id', 'posted_at', 'date', 'merchant_name', 'merchant', 'description',
  'amount', 'type', 'category', 'subcategory', 'import_id', 'document_id']);

/** PostgREST-like builder with POSTGRES ORDER SEMANTICS: DESC defaults to NULLS FIRST. */
function fakeClient() {
  function builder(table: string, columns: string) {
    const isTx = table === 'transactions';
    const cols = columns.split(',').map(c => c.trim()).filter(Boolean);
    const missing = isTx ? cols.filter(c => !KNOWN.has(c)) : [];
    const filters: Array<(r: Row) => boolean> = [];
    const orders: Array<{ col: string; asc: boolean; nullsFirst: boolean }> = [];
    let limit = Infinity;
    const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
    const rec = (m: string, c: string, v: unknown) => { if (isTx) db.calls.push([m, c, v]); };
    const b = {
      eq(c: string, v: unknown) { rec('eq', c, v); filters.push(r => r[c] === v); return b; },
      gte(c: string, v: unknown) { rec('gte', c, v); filters.push(r => str(r[c]) !== null && str(r[c])! >= String(v)); return b; },
      lte(c: string, v: unknown) { rec('lte', c, v); filters.push(r => str(r[c]) !== null && str(r[c])! <= String(v)); return b; },
      order(c: string, o?: { ascending?: boolean; nullsFirst?: boolean }) {
        const asc = o?.ascending !== false;
        rec('order', c, o ?? {});
        orders.push({ col: c, asc, nullsFirst: o?.nullsFirst ?? !asc }); // Postgres default
        return b;
      },
      or() { return b; }, not() { return b; }, ilike() { return b; }, in() { return b; }, is() { return b; },
      limit(n: number) { limit = n; return b; },
      maybeSingle() { return b; },
      then<T>(resolve: (v: { data: unknown; error: { code: string; message: string } | null }) => T) {
        if (missing.length > 0) {
          return Promise.resolve({ data: null, error: { code: '42703', message: `column ${missing[0]} does not exist` } }).then(resolve);
        }
        const src = isTx ? db.rows : [];
        const matched = src.filter(r => filters.every(f => f(r)));
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
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return b;
  }
  return { from: (t: string) => ({ select: (c: string) => builder(t, c) }) };
}

import { handler as txSearch } from '../tx-search';
import {
  resolveModelSearchOwnership,
  resolveCandidateOwnership,
  isUndatedTxSearch,
  createCandidateOwnershipGate,
} from '../../../src/shared/tx-candidate-ownership';
import { satisfiedAggregateEvidenceKinds } from '../../../src/shared/prime-evidence-executor';
import { classifyFinancialQuery } from '../../../src/shared/financial-query-classifier';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const tx = (n: number, date: string | null, posted_at: string | null, user = 'user-1', type = 'expense'): Row => ({
  id: uuid(n), user_id: user, date, posted_at, amount: -10 - n, type, category: 'Groceries',
  merchant_name: `M${n}`, merchant: `M${n}`, description: `d${n}`, subcategory: null, import_id: null, document_id: null,
});

async function search(body: Record<string, unknown>) {
  const res = await txSearch({ httpMethod: 'POST', headers: { authorization: 'Bearer t' }, body: JSON.stringify(body) } as never, {} as never);
  const r = res as { statusCode: number; body: string };
  return { status: r.statusCode, json: JSON.parse(r.body || '{}') as { rows?: Array<{ id: string; date: string | null }> } };
}

beforeEach(() => {
  db.authUser = 'user-1';
  db.calls = [];
  db.rows = [
    // Recent canonical rows (June 2026), posted_at set.
    tx(1, '2026-06-16', '2026-06-16T10:00:00Z'),
    tx(2, '2026-06-15', '2026-06-15T10:00:00Z'),
    tx(3, '2026-06-14', '2026-06-14T10:00:00Z'),
    // Legacy rows with EMPTY posted_at (the staging defect), canonical dates in 2025.
    tx(4, '2025-04-03', null, 'user-1', 'income'),
    tx(5, '2025-12-31', null),
    // A row whose posted_at falls in Oct 2026 but whose canonical date is Dec 2025.
    tx(6, '2025-12-01', '2026-10-05T00:00:00Z'),
    // A row with no canonical date.
    tx(7, null, '2026-06-20T00:00:00Z'),
    // Another user's newer row — must never be returned.
    tx(8, '2026-07-01', '2026-07-01T00:00:00Z', 'user-2'),
  ];
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 1 — tx-search date semantics
// ─────────────────────────────────────────────────────────────────────────────

describe('Fix 1: tx-search uses the canonical date', () => {
  it('(2,4) undated search: newest canonical dates first, missing dates last — legacy empty-posted_at rows do not lead', async () => {
    const r = await search({ limit: 10 });
    expect(r.status).toBe(200);
    const dates = r.json.rows!.map(x => x.date);
    expect(dates.slice(0, 3)).toEqual(['2026-06-16', '2026-06-15', '2026-06-14']);
    expect(dates[dates.length - 1]).toBeNull(); // the date-less row is last
    expect(dates.slice(0, -1)).toEqual([...dates.slice(0, -1)].sort().reverse());
    expect(db.calls).toContainEqual(['order', 'date', { ascending: false, nullsFirst: false }]);
  });

  it('regression: the old posted_at DESC (NULLS FIRST) ordering would have put the legacy rows first', () => {
    const legacyFirst = [...db.rows].filter(r => r.user_id === 'user-1')
      .sort((a, z) => (a.posted_at === null ? -1 : z.posted_at === null ? 1 : String(z.posted_at).localeCompare(String(a.posted_at))));
    expect(legacyFirst[0].posted_at).toBeNull();
  });

  it('(3) date filters use the canonical date: October 2026 returns nothing despite an October posted_at', async () => {
    const r = await search({ startDate: '2026-10-01', endDate: '2026-10-31' });
    expect(r.json.rows).toEqual([]);
    expect(db.calls).toContainEqual(['gte', 'date', '2026-10-01']);
    expect(db.calls).toContainEqual(['lte', 'date', '2026-10-31']);
    expect(db.calls.some(([m, c]) => (m === 'gte' || m === 'lte') && c === 'posted_at')).toBe(false);
  });

  it('a December 2025 range returns rows by canonical date (incl. the one posted in Oct 2026)', async () => {
    const r = await search({ startDate: '2025-12-01', endDate: '2025-12-31' });
    expect(r.json.rows!.map(x => x.id).sort()).toEqual([uuid(5), uuid(6)].sort());
  });

  it('displayed row date is the canonical date', async () => {
    const r = await search({ startDate: '2025-12-01', endDate: '2025-12-01' });
    expect(r.json.rows![0].date).toBe('2025-12-01');
  });

  it('(6) ownership: verified user only; another user\'s rows never appear; unauthenticated → 401', async () => {
    const r = await search({ limit: 50 });
    expect(db.calls).toContainEqual(['eq', 'user_id', 'user-1']);
    expect(r.json.rows!.some(x => x.id === uuid(8))).toBe(false);
    db.authUser = null;
    expect((await search({})).status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fix 2 — model-initiated undated search after an answered total
// ─────────────────────────────────────────────────────────────────────────────

const undatedResult = { rows: [tx(4, '2025-04-03', null), tx(5, '2025-12-31', null)], totals: { count: 2, sum: 0, income: 0, spending: 0 } };

function gateWithSpies() {
  const persistLayer2 = vi.fn(async () => true);
  const applyLayer1 = vi.fn();
  const clearLayer1 = vi.fn();
  return { gate: createCandidateOwnershipGate({ persistLayer2, applyLayer1, clearLayer1 }), persistLayer2, applyLayer1, clearLayer1 };
}

describe('Fix 2: background search after an answered total creates no cards', () => {
  it('(1) October zero + undated model search → analytical: no cards, no frame write', async () => {
    const intent = resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: true, args: { limit: 25 } });
    expect(intent).toBe('analytical_evidence');
    const g = gateWithSpies();
    expect(await g.gate.submitSearchResult(undatedResult, 'non-streaming', intent)).toBe('skipped_analytical');
    expect(g.persistLayer2).not.toHaveBeenCalled();
    expect(g.applyLayer1).not.toHaveBeenCalled();
    expect(g.gate.txCandidatesForResponse).toBeNull();
    expect(g.gate.visibleFrame).toBeNull();
  });

  it('(7) an existing frame is left unchanged even when the model asks for a new scope', async () => {
    const intent = resolveModelSearchOwnership({ purpose: 'new_candidate_scope', hasExistingCandidates: true, aggregateEvidenceSatisfied: true, args: {} });
    expect(intent).toBe('analytical_evidence');
    const g = gateWithSpies();
    await g.gate.submitSearchResult(undatedResult, 'tool-loop', intent);
    expect(g.persistLayer2).not.toHaveBeenCalled();
    expect(g.clearLayer1).not.toHaveBeenCalled();
    expect(g.gate.isLocked()).toBe(false); // a later legitimate establishment is still possible
  });

  it('a DATED model search after an answered total still establishes (unchanged behaviour)', () => {
    expect(resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: true, args: { startDate: '2026-10-01', endDate: '2026-10-31' } }))
      .toBe('candidate_establishment');
    expect(resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: true, args: { startDate: '2026-10-01' } }))
      .toBe('candidate_establishment');
  });

  it('(5) explicit transaction-list request: CP4.2 never marks a list as an answered total, so cards are established', async () => {
    const fc = classifyFinancialQuery('Show me my September transactions.');
    expect(fc.requestShape).toBe('list');
    const satisfied = satisfiedAggregateEvidenceKinds({
      plan: { intent: 'financial_data_lookup', steps: [], unresolved: [] } as never,
      result: { overallSufficiency: 'sufficient', results: [] } as never,
      financialClassification: fc,
    });
    expect(satisfied).toEqual([]);
    const intent = resolveModelSearchOwnership({ purpose: undefined, hasExistingCandidates: false, aggregateEvidenceSatisfied: satisfied.length > 0, args: {} });
    expect(intent).toBe('candidate_establishment');
    const g = gateWithSpies();
    expect(await g.gate.submitSearchResult(undatedResult, 'non-streaming', intent)).toBe('established');
    expect(g.persistLayer2).toHaveBeenCalledTimes(1);
    expect(g.gate.txCandidatesForResponse?.length).toBe(2);
  });

  it('without an answered total, the helper is exactly resolveCandidateOwnership', () => {
    for (const purpose of [undefined, 'new_candidate_scope', 'analytical_evidence', 'junk']) {
      for (const hasExistingCandidates of [false, true]) {
        for (const args of [{}, { startDate: '2026-01-01' }]) {
          expect(resolveModelSearchOwnership({ purpose, hasExistingCandidates, aggregateEvidenceSatisfied: false, args }))
            .toBe(resolveCandidateOwnership(purpose, hasExistingCandidates));
        }
      }
    }
  });

  it('isUndatedTxSearch treats blank/absent/non-string bounds as undated', () => {
    expect(isUndatedTxSearch(undefined)).toBe(true);
    expect(isUndatedTxSearch({ startDate: '', endDate: '  ' })).toBe(true);
    expect(isUndatedTxSearch({ startDate: 20261001 })).toBe(true);
    expect(isUndatedTxSearch({ endDate: '2026-10-31' })).toBe(false);
  });
});

describe('chat.ts wiring (structural)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');

  it('every MODEL-initiated tx_search ownership decision uses the answered-total signal', () => {
    for (const v of ['streamingOwnership', 'specOwnership', 'nsOwnership', 'loopOwnership']) {
      expect(chat).toMatch(new RegExp(`const ${v} = resolveModelSearchOwnership\\(\\{[^}]*aggregateEvidenceSatisfied: satisfiedAggregateTools\\.size > 0`));
    }
    expect(chat).not.toMatch(/const (streamingOwnership|specOwnership|nsOwnership|loopOwnership) = resolveCandidateOwnership\(/);
  });

  it('code-initiated establishment (merchant bridge) is unchanged', () => {
    expect(chat).toContain("ownershipGate.submitSearchResult(b2cData, 'B2C_merchant_bridge', 'candidate_establishment')");
  });

  it('the CP4.2 signal is declared before any tool loop uses it', () => {
    const decl = chat.indexOf('const satisfiedAggregateTools = new Set<string>(');
    const firstUse = chat.indexOf('aggregateEvidenceSatisfied: satisfiedAggregateTools.size > 0');
    expect(decl).toBeGreaterThan(0);
    expect(firstUse).toBeGreaterThan(decl);
  });
});
