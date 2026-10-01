/**
 * P3.3C REPAIR — Behavioral tests for transaction candidate ownership.
 *
 * Every decision under test is the PRODUCTION implementation imported from
 * src/shared/tx-candidate-ownership.ts (the same module chat.ts imports).
 * The only test-local code is in-memory storage standing in for Supabase
 * (Layer 2) and the module-level Map (Layer 1).
 *
 * Run with: npx vitest run src/shared/__tests__/tx-candidate-ownership.behavior.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import ts from 'typescript';
import {
  resolveCandidateOwnership,
  createCandidateOwnershipGate,
  submitEvidenceTxSearchResults,
  buildTxResolutionFromSearchResult,
  computeLayer1Update,
  selectCandidateFromFrame,
  resolveTagHandoffIdentity,
  computeB2CBridgeActive,
  computeB2CCandidatesSatisfied,
  type CandidateOwnershipGate,
  type TxResolutionContext,
  type TxSearchRow,
} from '../tx-candidate-ownership';
import { inputSchema as txSearchInputSchema } from '../../agent/tools/impl/tx_search';
import { detectCandidateFollowUp } from '../candidate-follow-up-detector';
import { classifyFinancialQuery } from '../financial-query-classifier';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const COSTCO_3 = '5838a84e-517c-4ad3-a423-9fcd97b788d6';
const uuid = (n: number, prefix = '0000') => `${prefix}${String(n).padStart(4, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;

const COSTCO_ROWS = Array.from({ length: 8 }, (_, i) => ({
  id: i === 2 ? COSTCO_3 : uuid(i + 1, 'c0c0'),
  merchant: 'COSTCO WHOLESALE',
  amount: -(100 + i * 10),
  date: `2026-0${(i % 9) + 1}-15`,
  category: 'Groceries',
}));

const UNRELATED_X = { id: uuid(99, 'dead'), merchant: 'DENTIST OFFICE', amount: -240, date: '2026-04-02', category: 'Health' };
const UNRELATED_25 = Array.from({ length: 25 }, (_, i) => ({ id: uuid(i + 1, 'aaaa'), merchant: `MISC ${i}`, amount: -(i + 1), date: '2026-05-01', category: 'Misc' }));
const WALMART_ROWS = Array.from({ length: 4 }, (_, i) => ({ id: uuid(i + 1, 'baba'), merchant: 'WALMART', amount: -(50 + i), date: '2026-06-01', category: 'Groceries' }));

// ─────────────────────────────────────────────────────────────────────────────
// In-memory storage (stand-in for Supabase Layer 2 + module Map Layer 1)
// ─────────────────────────────────────────────────────────────────────────────

type L1 = { id: string; description: string | null; amount: number | null; date: string | null; current_category: string | null };

function makeSession(opts: { frameRows?: TxSearchRow[]; layer1?: L1 | null } = {}) {
  const state = {
    layer2: (opts.frameRows ? buildTxResolutionFromSearchResult({ rows: opts.frameRows }, 1) : null) as TxResolutionContext | null,
    layer1: (opts.layer1 ?? null) as L1 | null,
    persistCalls: 0,
    failNextPersist: false,
  };
  const deps = {
    persistLayer2: async (result: unknown) => {
      state.persistCalls++;
      await new Promise(r => setTimeout(r, 5)); // simulate DB latency
      if (state.failNextPersist) { state.failNextPersist = false; return false; }
      state.layer2 = buildTxResolutionFromSearchResult(result, Date.now());
      return true;
    },
    applyLayer1: (result: unknown) => {
      const u = computeLayer1Update(result);
      state.layer1 = u.kind === 'set'
        ? { id: u.id, description: u.row.merchant ?? null, amount: typeof u.row.amount === 'number' ? u.row.amount : null, date: u.row.date ?? null, current_category: u.row.category ?? null }
        : null;
    },
    clearLayer1: () => { state.layer1 = null; },
  };
  return {
    state,
    /** New request: fresh gate + hasExistingCandidates as chat.ts derives it. */
    newRequest(): { gate: CandidateOwnershipGate; hasExistingCandidates: boolean } {
      return { gate: createCandidateOwnershipGate(deps), hasExistingCandidates: !!state.layer2?.candidates?.length };
    },
    /** select_transaction: production frame resolution + selection write. */
    select(candidateNumber: number) {
      const sel = selectCandidateFromFrame(state.layer2, candidateNumber);
      if (sel.ok && state.layer2) {
        state.layer2 = { ...state.layer2, selectedId: sel.candidate.id, selectedIndex: sel.index };
      }
      return sel;
    },
    /** Prime → Tag handoff identity, production precedence. Layer 2 verification = frame membership. */
    handoff() {
      const txr = state.layer2;
      const selected = txr?.selectedId ? txr.candidates.find(c => c.id === txr.selectedId) ?? null : null;
      const layer2Selected = selected
        ? { id: selected.id, description: selected.merchant, amount: selected.amount, date: selected.date, current_category: selected.category }
        : null;
      return resolveTagHandoffIdentity({
        layer2Selected,
        layer2CandidateIds: txr?.candidates?.map(c => c.id) ?? null,
        layer1: state.layer1,
      });
    },
  };
}

/** Model tx_search submission exactly as chat.ts call sites do it. */
async function modelTxSearch(gate: CandidateOwnershipGate, hasExisting: boolean, purpose: unknown, rows: TxSearchRow[]) {
  return gate.submitSearchResult({ rows, queryStatus: 'verified' }, 'streaming', resolveCandidateOwnership(purpose, hasExisting));
}

const snapshot = (s: ReturnType<typeof makeSession>['state']) => JSON.parse(JSON.stringify({ layer1: s.layer1, layer2: s.layer2 }));

/** Establish frame A in a prior request. */
async function sessionWithCostcoFrame(layer1: L1 | null = null) {
  const s = makeSession();
  const r1 = s.newRequest();
  expect(await modelTxSearch(r1.gate, r1.hasExistingCandidates, undefined, COSTCO_ROWS)).toBe('established');
  if (layer1) s.state.layer1 = layer1;
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
// A. Analytical single-row search + existing frame
// ─────────────────────────────────────────────────────────────────────────────
describe('A. analytical_evidence single-row search preserves all identity', () => {
  it('Layer 1, Layer 2, selectedId unchanged; no cards; not locked', async () => {
    const knownL1: L1 = { id: COSTCO_3, description: 'COSTCO', amount: -120, date: '2026-03-15', current_category: 'Groceries' };
    const s = await sessionWithCostcoFrame(knownL1);
    s.select(3);
    const before = snapshot(s.state);

    const { gate, hasExistingCandidates } = s.newRequest();
    expect(hasExistingCandidates).toBe(true);
    const outcome = await modelTxSearch(gate, hasExistingCandidates, 'analytical_evidence', [UNRELATED_X]);

    expect(outcome).toBe('skipped_analytical');
    expect(snapshot(s.state)).toEqual(before);
    expect(s.state.layer1?.id).toBe(COSTCO_3);
    expect(s.state.layer2?.selectedId).toBe(COSTCO_3);
    expect(gate.txCandidatesForResponse).toBeNull();
    expect(gate.isLocked()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Analytical multi-row search
// ─────────────────────────────────────────────────────────────────────────────
describe('B. analytical_evidence multi-row search preserves all identity', () => {
  it('25 unrelated rows: Layer 1 NOT cleared, frame order intact, no cards', async () => {
    const knownL1: L1 = { id: COSTCO_3, description: 'COSTCO', amount: -120, date: null, current_category: null };
    const s = await sessionWithCostcoFrame(knownL1);
    const before = snapshot(s.state);
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(await modelTxSearch(gate, hasExistingCandidates, 'analytical_evidence', UNRELATED_25)).toBe('skipped_analytical');
    expect(snapshot(s.state)).toEqual(before);
    expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(COSTCO_ROWS.map(r => r.id));
    expect(gate.txCandidatesForResponse).toBeNull();
    expect(s.state.persistCalls).toBe(1); // only the original establishment
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. Missing purpose
// ─────────────────────────────────────────────────────────────────────────────
describe('C. missing purpose with existing frame behaves analytically', () => {
  it('single row and multi row both preserve Layer 1 + Layer 2', async () => {
    const knownL1: L1 = { id: COSTCO_3, description: null, amount: null, date: null, current_category: null };
    const s = await sessionWithCostcoFrame(knownL1);
    const before = snapshot(s.state);
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(await modelTxSearch(gate, hasExistingCandidates, undefined, [UNRELATED_X])).toBe('skipped_analytical');
    expect(await modelTxSearch(gate, hasExistingCandidates, undefined, UNRELATED_25)).toBe('skipped_analytical');
    expect(snapshot(s.state)).toEqual(before);
    expect(gate.txCandidatesForResponse).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. new_candidate_scope
// ─────────────────────────────────────────────────────────────────────────────
describe('D. new_candidate_scope establishes verified frame B', () => {
  it('multi-row B replaces A; Layer 1 cleared (ambiguous); cards = B; locked', async () => {
    const s = await sessionWithCostcoFrame({ id: COSTCO_3, description: null, amount: null, date: null, current_category: null });
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', WALMART_ROWS)).toBe('established');
    expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(WALMART_ROWS.map(r => r.id));
    expect(s.state.layer2!.selectedId).toBeNull();
    expect(s.state.layer1).toBeNull();
    expect(gate.txCandidatesForResponse!.map(c => c.id)).toEqual(WALMART_ROWS.map(r => r.id));
    expect(gate.isLocked()).toBe(true);
  });

  it('single-row B: Layer 1 and Layer 2 agree on the same verified UUID', async () => {
    const s = await sessionWithCostcoFrame();
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', [UNRELATED_X])).toBe('established');
    expect(s.state.layer2!.selectedId).toBe(UNRELATED_X.id);
    expect(s.state.layer1!.id).toBe(UNRELATED_X.id);
    expect(s.handoff().tx!.id).toBe(UNRELATED_X.id);
  });

  it('non-UUID rows never become candidates (purpose is not identity)', async () => {
    const s = await sessionWithCostcoFrame();
    const { gate, hasExistingCandidates } = s.newRequest();
    await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', [{ id: 'model-made-up-id', merchant: 'X' }]);
    expect(s.state.layer2!.candidates).toEqual([]);
    expect(s.state.layer1).toBeNull();
    expect(gate.txCandidatesForResponse).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. Cold start
// ─────────────────────────────────────────────────────────────────────────────
describe('E. cold start establishes candidates', () => {
  it('no frame: any model search (even analytical-labelled) establishes', async () => {
    const s = makeSession();
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(hasExistingCandidates).toBe(false);
    expect(await modelTxSearch(gate, hasExistingCandidates, 'analytical_evidence', COSTCO_ROWS)).toBe('established');
    expect(s.state.layer2!.candidates).toHaveLength(8);
    expect(gate.txCandidatesForResponse).toHaveLength(8);
  });

  it('grounding pre-exec on cold start establishes; with frame it is analytical', async () => {
    const s = makeSession();
    const r = s.newRequest();
    const groundingIntent = r.hasExistingCandidates ? 'analytical_evidence' : 'candidate_establishment';
    expect(await r.gate.submitSearchResult({ rows: COSTCO_ROWS }, 'grounding', groundingIntent)).toBe('established');
    const r2 = s.newRequest();
    const intent2 = r2.hasExistingCandidates ? 'analytical_evidence' : 'candidate_establishment';
    expect(await r2.gate.submitSearchResult({ rows: [UNRELATED_X] }, 'grounding', intent2)).toBe('skipped_analytical');
    expect(s.state.layer2!.candidates).toHaveLength(8);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F / G / H. B2C bridge
// ─────────────────────────────────────────────────────────────────────────────
const SHOW_THOSE = 'Show me those transactions.';

/** isNewGroundedSearch derivation inputs, from the real production classifiers. */
function realClassifierSignals(message: string, hasExisting: boolean) {
  const followUp = detectCandidateFollowUp(message, hasExisting).isFollowUp;
  return { followUp, requiresGrounding: classifyFinancialQuery(message).requiresGrounding === true };
}

describe('F. B2C with no old frame', () => {
  it('bridge active, establishes, P3.3B satisfied', async () => {
    const s = makeSession();
    const { gate, hasExistingCandidates } = s.newRequest();
    const active = computeB2CBridgeActive({ macReady: true, phraseMatch: true, merchantAggSatisfied: false, hasExistingCandidates, isNewGroundedSearch: false });
    expect(active).toBe(true);
    const outcome = await gate.submitSearchResult({ rows: COSTCO_ROWS }, 'B2C_merchant_bridge', 'candidate_establishment');
    expect(computeB2CCandidatesSatisfied({ bridgeActive: active, outcome, txCandidatesForResponse: gate.txCandidatesForResponse })).toBe(true);
  });

  it('bridge never active without a ready MAC or phrase, or when P3.3A satisfied', () => {
    const base = { macReady: true, phraseMatch: true, merchantAggSatisfied: false, hasExistingCandidates: false, isNewGroundedSearch: false };
    expect(computeB2CBridgeActive({ ...base, macReady: false })).toBe(false);
    expect(computeB2CBridgeActive({ ...base, phraseMatch: false })).toBe(false);
    expect(computeB2CBridgeActive({ ...base, merchantAggSatisfied: true })).toBe(false);
  });
});

describe('G. B2C with OLD frame (critical)', () => {
  it('real classifiers mark "Show me those transactions." as a new grounded request', () => {
    const sig = realClassifierSignals(SHOW_THOSE, true);
    expect(sig.followUp).toBe(false);
    expect(sig.requiresGrounding).toBe(true);
  });

  it('frame A exists → bridge active → frame B replaces A → P3.3B fast path active', async () => {
    const s = await sessionWithCostcoFrame({ id: COSTCO_3, description: null, amount: null, date: null, current_category: null });
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(hasExistingCandidates).toBe(true);
    const sig = realClassifierSignals(SHOW_THOSE, hasExistingCandidates);
    const isNewGroundedSearch = !sig.followUp && sig.requiresGrounding;
    const active = computeB2CBridgeActive({ macReady: true, phraseMatch: true, merchantAggSatisfied: false, hasExistingCandidates, isNewGroundedSearch });
    expect(active).toBe(true);

    const outcome = await gate.submitSearchResult({ rows: WALMART_ROWS }, 'B2C_merchant_bridge', 'candidate_establishment');
    expect(outcome).toBe('established');
    expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(WALMART_ROWS.map(r => r.id));
    expect(s.state.layer1).toBeNull(); // stale A identity cannot survive replacement
    expect(computeB2CCandidatesSatisfied({ bridgeActive: active, outcome, txCandidatesForResponse: gate.txCandidatesForResponse })).toBe(true);

    // A later model tx_search in the same request cannot replace B
    expect(await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', UNRELATED_25)).toBe('skipped_locked');
    expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(WALMART_ROWS.map(r => r.id));
  });

  it('old frame + candidate follow-up ("the third one") does NOT fire the bridge', () => {
    const sig = realClassifierSignals('Show me the third one', true);
    const isNewGroundedSearch = !sig.followUp && sig.requiresGrounding;
    expect(computeB2CBridgeActive({ macReady: true, phraseMatch: true, merchantAggSatisfied: false, hasExistingCandidates: true, isNewGroundedSearch })).toBe(false);
  });

  it('P3.3B not satisfied when B2C persist fails (fail closed)', async () => {
    const s = await sessionWithCostcoFrame();
    const { gate } = s.newRequest();
    s.state.failNextPersist = true;
    const outcome = await gate.submitSearchResult({ rows: WALMART_ROWS }, 'B2C_merchant_bridge', 'candidate_establishment');
    expect(outcome).toBe('persist_failed');
    expect(gate.txCandidatesForResponse).toBeNull();
    expect(computeB2CCandidatesSatisfied({ bridgeActive: true, outcome, txCandidatesForResponse: gate.txCandidatesForResponse })).toBe(false);
  });

  it('P3.3B not satisfied by a lock from select_transaction alone', () => {
    expect(computeB2CCandidatesSatisfied({ bridgeActive: true, outcome: 'skipped_locked', txCandidatesForResponse: null })).toBe(false);
  });
});

describe('H. ordinal after B2C replacement resolves against B', () => {
  it('"the third one" → WALMART #3, handed to Tag', async () => {
    const s = await sessionWithCostcoFrame();
    const r = s.newRequest();
    await r.gate.submitSearchResult({ rows: WALMART_ROWS }, 'B2C_merchant_bridge', 'candidate_establishment');
    const next = s.newRequest();
    expect(next.hasExistingCandidates).toBe(true);
    const sel = s.select(3);
    expect(sel.ok && sel.candidate.id).toBe(WALMART_ROWS[2].id);
    expect(s.handoff().tx!.id).toBe(WALMART_ROWS[2].id);
    expect(s.handoff().tx!.id).not.toBe(COSTCO_3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I. Mutation identity safety (critical)
// ─────────────────────────────────────────────────────────────────────────────
describe('I. analytical retrieval cannot change what "the third one" means', () => {
  it('analytical single-row X, then select #3 → Tag receives 5838a84e…, never X', async () => {
    const s = await sessionWithCostcoFrame();
    const { gate, hasExistingCandidates } = s.newRequest();
    await modelTxSearch(gate, hasExistingCandidates, 'analytical_evidence', [UNRELATED_X]);
    expect(s.state.layer1).toBeNull(); // X never reached Layer 1

    const sel = s.select(3);
    expect(sel.ok && sel.candidate.id).toBe(COSTCO_3);
    gate.lockForSelection();

    const decision = s.handoff();
    expect(decision.source).toBe('layer2_selected_tx');
    expect(decision.tx!.id).toBe(COSTCO_3);
    expect(decision.tx!.id).not.toBe(UNRELATED_X.id);
  });

  it('same with missing purpose', async () => {
    const s = await sessionWithCostcoFrame();
    const { gate, hasExistingCandidates } = s.newRequest();
    await modelTxSearch(gate, hasExistingCandidates, undefined, [UNRELATED_X]);
    s.select(3);
    expect(s.handoff().tx!.id).toBe(COSTCO_3);
  });

  it('defense in depth: even a stale Layer 1 X cannot override verified Layer 2 #3', async () => {
    const s = await sessionWithCostcoFrame();
    s.state.layer1 = { id: UNRELATED_X.id, description: 'DENTIST', amount: -240, date: null, current_category: null };
    s.select(3);
    const decision = s.handoff();
    expect(decision.source).toBe('layer2_selected_tx');
    expect(decision.tx!.id).toBe(COSTCO_3);
  });

  it('stale Layer 1 not in the current frame is rejected when nothing is selected', async () => {
    const s = await sessionWithCostcoFrame();
    s.state.layer1 = { id: UNRELATED_X.id, description: null, amount: null, date: null, current_category: null };
    const decision = s.handoff();
    expect(decision.tx).toBeNull();
    expect('rejectedLayer1Id' in decision ? decision.rejectedLayer1Id : undefined).toBe(UNRELATED_X.id);
  });

  it('select_transaction rejects out-of-range and non-integer ordinals', async () => {
    const s = await sessionWithCostcoFrame();
    expect(s.select(9).ok).toBe(false);
    expect(selectCandidateFromFrame(s.state.layer2, '3').ok).toBe(false);
    expect(selectCandidateFromFrame(s.state.layer2, COSTCO_3).ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. Response card safety
// ─────────────────────────────────────────────────────────────────────────────
describe('J. analytical rows never become txCandidatesForResponse', () => {
  it('analytical → cards stay null; later establishment in the same request is the only source', async () => {
    const s = makeSession({ frameRows: COSTCO_ROWS });
    const { gate, hasExistingCandidates } = s.newRequest();
    await modelTxSearch(gate, hasExistingCandidates, 'analytical_evidence', UNRELATED_25);
    await modelTxSearch(gate, hasExistingCandidates, undefined, [UNRELATED_X]);
    expect(gate.txCandidatesForResponse).toBeNull();
    await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', WALMART_ROWS);
    expect(gate.txCandidatesForResponse!.map(c => c.id)).toEqual(WALMART_ROWS.map(r => r.id));
    expect(gate.txCandidatesForResponse!.some(c => UNRELATED_25.some(u => u.id === c.id))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K. P3.1C real execution
// ─────────────────────────────────────────────────────────────────────────────
const CHAT_PATH = path.resolve(__dirname, '../../../netlify/functions/chat.ts');
const CHAT_SRC = fs.readFileSync(CHAT_PATH, 'utf8');

describe('K. P3.1C evidence path', () => {
  it('submitEvidenceTxSearchResults is analytical: no Layer 1/Layer 2/cards/lock', async () => {
    const s = await sessionWithCostcoFrame({ id: COSTCO_3, description: null, amount: null, date: null, current_category: null });
    const before = snapshot(s.state);
    const { gate } = s.newRequest();
    const outcomes = await submitEvidenceTxSearchResults([
      { tool: 'tx_search', status: 'resolved', data: { rows: [UNRELATED_X], queryStatus: 'verified' } },
      { tool: 'tx_search', status: 'successful_empty', data: { rows: [], queryStatus: 'verified_zero' } },
      { tool: 'transaction_category_totals', status: 'resolved', data: { rows: UNRELATED_25 } },
      { tool: 'tx_search', status: 'failed', data: { rows: UNRELATED_25 } },
    ], gate);
    expect(outcomes).toEqual(['skipped_analytical', 'skipped_analytical']);
    expect(snapshot(s.state)).toEqual(before);
    expect(gate.txCandidatesForResponse).toBeNull();
    expect(gate.isLocked()).toBe(false);
  });

  it('P3.1C is analytical even on cold start', async () => {
    const s = makeSession();
    const { gate } = s.newRequest();
    await submitEvidenceTxSearchResults([{ tool: 'tx_search', status: 'resolved', data: { rows: COSTCO_ROWS } }], gate);
    expect(s.state.layer2).toBeNull();
    expect(s.state.persistCalls).toBe(0);
  });

  it('chat.ts: ownershipGate declared before every use in an enclosing block (no TDZ)', () => {
    const src = ts.createSourceFile(CHAT_PATH, CHAT_SRC, ts.ScriptTarget.Latest, true);
    let decl: ts.VariableDeclaration | null = null;
    const uses: ts.Identifier[] = [];
    const visit = (n: ts.Node) => {
      if (ts.isVariableDeclaration(n) && n.name.getText() === 'ownershipGate') decl = n;
      else if (ts.isIdentifier(n) && n.text === 'ownershipGate' && !ts.isVariableDeclaration(n.parent)) uses.push(n);
      ts.forEachChild(n, visit);
    };
    visit(src);
    expect(decl).not.toBeNull();
    let block: ts.Node = decl!.parent;
    while (!ts.isBlock(block)) block = block.parent;
    expect(uses.length).toBeGreaterThan(10);
    for (const u of uses) {
      expect(u.getStart()).toBeGreaterThan(decl!.getStart());
      let p: ts.Node | undefined = u;
      while (p && p !== block) p = p.parent;
      expect(p).toBe(block);
    }
    // P3.1C submits through the gate with the shared analytical helper
    expect(CHAT_SRC).toContain('await submitEvidenceTxSearchResults(p31cResult.results, ownershipGate)');
    expect(CHAT_SRC).not.toContain('let txResolutionLockedThisTurn');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L. Invalid purpose
// ─────────────────────────────────────────────────────────────────────────────
describe('L. invalid purpose', () => {
  it('tx_search schema rejects unknown purpose (executeTool returns error → no submission)', () => {
    expect(txSearchInputSchema.safeParse({ q: 'costco', purpose: 'replace_everything' }).success).toBe(false);
    expect(txSearchInputSchema.safeParse({ q: 'costco', purpose: 'NEW_CANDIDATE_SCOPE' }).success).toBe(false);
    expect(txSearchInputSchema.safeParse({ q: 'costco' }).success).toBe(true);
    expect(txSearchInputSchema.safeParse({ q: 'costco', purpose: 'new_candidate_scope' }).success).toBe(true);
  });

  it('purpose has no default and does not alter query args', () => {
    const parsed = txSearchInputSchema.parse({ q: 'costco' });
    expect('purpose' in parsed).toBe(false);
  });

  it('if an invalid purpose ever reached the resolver, identity is preserved', async () => {
    const s = await sessionWithCostcoFrame({ id: COSTCO_3, description: null, amount: null, date: null, current_category: null });
    const before = snapshot(s.state);
    const { gate, hasExistingCandidates } = s.newRequest();
    for (const p of ['replace_everything', '', 'NEW_CANDIDATE_SCOPE', null, 42, { purpose: 'new_candidate_scope' }]) {
      expect(await modelTxSearch(gate, hasExistingCandidates, p, [UNRELATED_X])).toBe('skipped_analytical');
    }
    expect(snapshot(s.state)).toEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M. Two establishment attempts in the same request
// ─────────────────────────────────────────────────────────────────────────────
describe('M. concurrent establishment cannot race past the lock', () => {
  it('two un-awaited establishment submissions: only the first persists', async () => {
    const s = makeSession();
    const { gate, hasExistingCandidates } = s.newRequest();
    const [a, b] = await Promise.all([
      modelTxSearch(gate, hasExistingCandidates, undefined, COSTCO_ROWS),
      modelTxSearch(gate, hasExistingCandidates, undefined, WALMART_ROWS),
    ]);
    expect(a).toBe('established');
    expect(b).toBe('skipped_locked');
    expect(s.state.persistCalls).toBe(1);
    expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(COSTCO_ROWS.map(r => r.id));
    expect(gate.txCandidatesForResponse!.map(c => c.id)).toEqual(COSTCO_ROWS.map(r => r.id));
  });

  it('lock is request-scoped: a new request can establish again', async () => {
    const s = await sessionWithCostcoFrame();
    const { gate, hasExistingCandidates } = s.newRequest();
    expect(gate.isLocked()).toBe(false);
    expect(await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', WALMART_ROWS)).toBe('established');
  });

  it('persist failure: Layer 1 cleared, no cards, lock stays claimed', async () => {
    const s = await sessionWithCostcoFrame({ id: COSTCO_3, description: null, amount: null, date: null, current_category: null });
    const { gate, hasExistingCandidates } = s.newRequest();
    s.state.failNextPersist = true;
    expect(await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', WALMART_ROWS)).toBe('persist_failed');
    expect(s.state.layer1).toBeNull();
    expect(gate.txCandidatesForResponse).toBeNull();
    expect(await modelTxSearch(gate, hasExistingCandidates, 'new_candidate_scope', UNRELATED_25)).toBe('skipped_locked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wiring: chat.ts routes every identity side effect through the gate
// ─────────────────────────────────────────────────────────────────────────────
describe('Wiring: no identity writer outside the ownership gate', () => {
  const calls = (name: string) => (CHAT_SRC.match(new RegExp(`(?<!function )\\b${name}\\(`, 'g')) || []).length;

  it('Layer 1 writer is invoked only from the gate deps', () => {
    expect(calls('updateAuthoritativeSelectedTxFromSearchResult')).toBe(1);
    expect(CHAT_SRC).toMatch(/applyLayer1: \(result: any\) => \{[\s\S]{0,400}updateAuthoritativeSelectedTxFromSearchResult\(/);
  });

  it('Layer 2 search persistence is invoked only from the gate deps', () => {
    expect(calls('persistTxResolutionFromSearchResult')).toBe(1);
    expect(CHAT_SRC).toContain('persistLayer2: (result: any) => persistTxResolutionFromSearchResult(');
  });

  it('no legacy guarded persist and no un-awaited submissions remain', () => {
    expect(CHAT_SRC).not.toContain('guardedPersistTxResolution');
    const lines = CHAT_SRC.split('\n').filter(l => l.includes('ownershipGate.submitSearchResult('));
    expect(lines.length).toBe(6); // B2C, streaming, specialist, grounding, non-streaming, tool-loop
    for (const l of lines) expect(l).toMatch(/await ownershipGate\.submitSearchResult\(/);
  });

  it('handoff identity uses the shared precedence helper', () => {
    expect(CHAT_SRC).toContain('resolveTagHandoffIdentity({');
  });
});
