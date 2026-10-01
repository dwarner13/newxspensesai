/**
 * P3.3D — Visible candidate frame + canonical transaction display.
 *
 * Invariant: the authoritative selectable candidate frame is EXACTLY the
 * transactions the user is shown as numbered structured cards (max 25).
 *
 * Exercises PRODUCTION code only (src/shared/tx-candidate-ownership.ts, the
 * select_transaction schema, and chat.ts wiring). The only test-local code is
 * in-memory storage standing in for Supabase (Layer 2) and Layer 1.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  VISIBLE_CANDIDATE_FRAME_MAX,
  TX_RESOLUTION_MAX_CANDIDATES,
  createCandidateOwnershipGate,
  buildTxResolutionFromSearchResult,
  buildVisibleCandidateFrame,
  selectCandidateFromFrame,
  presentTxSearchResultForModel,
  formatCandidateFrameNote,
  resolveCandidateOwnership,
  resolveTagHandoffIdentity,
  type TxResolutionContext,
  type TxSearchRow,
} from '../tx-candidate-ownership';
import { inputSchema as selectTransactionSchema } from '../../agent/tools/impl/select_transaction';

const CHAT_SRC = fs.readFileSync(path.resolve(__dirname, '../../../netlify/functions/chat.ts'), 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures + in-memory storage
// ─────────────────────────────────────────────────────────────────────────────

const uuid = (n: number) => `${String(n).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;
/** n verified rows in a fixed search order (date DESC as a search would return). */
function rows(n: number): TxSearchRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: uuid(i + 1),
    merchant: `MERCHANT ${i + 1}`,
    amount: -(i + 1),
    date: `2026-01-${String(28 - (i % 28)).padStart(2, '0')}`,
    category: 'Groceries',
  }));
}

function makeSession() {
  const state = { layer2: null as TxResolutionContext | null, layer1: null as string | null, persisted: [] as number[] };
  const deps = {
    persistLayer2: async (result: unknown) => {
      state.layer2 = buildTxResolutionFromSearchResult(result, Date.now());
      state.persisted.push(state.layer2.candidates.length);
      return true;
    },
    applyLayer1: (result: unknown) => {
      const r = (result as { rows?: TxSearchRow[] }).rows ?? [];
      state.layer1 = r.length === 1 ? String(r[0].id) : null;
    },
    clearLayer1: () => { state.layer1 = null; },
  };
  return {
    state,
    newRequest: () => createCandidateOwnershipGate(deps),
  };
}

async function establish(n: number) {
  const s = makeSession();
  const gate = s.newRequest();
  const result = { rows: rows(n), queryStatus: 'verified' };
  const outcome = await gate.submitSearchResult(result, 'streaming', resolveCandidateOwnership(undefined, false));
  return { s, gate, result, outcome };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1–6. persisted = rendered = selectable, bounded at 25
// ─────────────────────────────────────────────────────────────────────────────
describe('1–6. persisted frame equals rendered cards (bounded at 25)', () => {
  for (const [n, shown] of [[1, 1], [10, 10], [25, 25], [26, 25], [30, 25], [200, 25]] as const) {
    it(`${n} match(es): matched=${n}, shown=persisted=rendered=${shown}`, async () => {
      const { s, gate, outcome } = await establish(n);
      expect(outcome).toBe('established');
      const cards = gate.txCandidatesForResponse!;
      expect(cards).toHaveLength(shown);
      expect(s.state.layer2!.candidates).toHaveLength(shown);
      expect(s.state.persisted).toEqual([shown]);
      // identical rows, identical order
      expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(cards.map(c => c.id));
      expect(cards.map(c => c.ordinal)).toEqual(Array.from({ length: shown }, (_, i) => i + 1));
      // preserves the search's own order (first N rows)
      expect(cards.map(c => c.id)).toEqual(rows(n).slice(0, shown).map(r => String(r.id)));
      expect(gate.visibleFrame).toMatchObject({ shown, matched: n, partial: n > shown });
    });
  }

  it('the persistence cap equals the visible frame', () => {
    expect(VISIBLE_CANDIDATE_FRAME_MAX).toBe(25);
    expect(TX_RESOLUTION_MAX_CANDIDATES).toBe(VISIBLE_CANDIDATE_FRAME_MAX);
    expect(buildTxResolutionFromSearchResult({ rows: rows(200) }, 1).candidates).toHaveLength(25);
  });

  it('single visible row still auto-selects (Layer 1 + Layer 2 agree)', async () => {
    const { s } = await establish(1);
    expect(s.state.layer2!.selectedId).toBe(uuid(1));
    expect(s.state.layer1).toBe(uuid(1));
  });

  it('>25 matches clear Layer 1 (ambiguous) — never a hidden row', async () => {
    const { s } = await establish(30);
    expect(s.state.layer1).toBeNull();
    expect(s.state.layer2!.selectedId).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7–9. Ordinals + close/reopen
// ─────────────────────────────────────────────────────────────────────────────
describe('7–9. ordinal boundary and close/reopen', () => {
  it('7. ordinal 25 resolves to visible card #25', async () => {
    const { s, gate } = await establish(30);
    const sel = selectCandidateFromFrame(s.state.layer2, 25);
    expect(sel.ok && sel.candidate.id).toBe(gate.txCandidatesForResponse![24].id);
  });

  it('8. ordinal 26 fails (out of range) — never a hidden transaction', async () => {
    const { s } = await establish(30);
    const sel = selectCandidateFromFrame(s.state.layer2, 26);
    expect(sel.ok).toBe(false);
    expect(!sel.ok && sel.error).toContain('out of range');
    expect(!sel.ok && sel.error).toContain('25 candidate(s)');
  });

  it('9. close/reopen: persisted frame stays 25; #3 resolves; #26 fails', async () => {
    const { s } = await establish(30);
    const reopened = s.newRequest(); // new request, same persisted storage
    expect(reopened.isLocked()).toBe(false);
    expect(s.state.layer2!.candidates).toHaveLength(25);
    const third = selectCandidateFromFrame(s.state.layer2, 3);
    expect(third.ok && third.candidate.id).toBe(uuid(3));
    expect(selectCandidateFromFrame(s.state.layer2, 26).ok).toBe(false);
  });

  it('a frame persisted before P3.3D (30 rows) is still bounded to 25 selectable', () => {
    const legacy: TxResolutionContext = {
      candidates: rows(30).map(r => ({ id: String(r.id), merchant: r.merchant ?? null, amount: -1, date: r.date ?? null, category: null })),
      selectedId: null, selectedIndex: null, updatedAt: 1,
    };
    expect(selectCandidateFromFrame(legacy, 25).ok).toBe(true);
    expect(selectCandidateFromFrame(legacy, 26).ok).toBe(false);
  });

  it('select_transaction schema maximum equals the visible frame (25)', () => {
    expect(selectTransactionSchema.safeParse({ candidateNumber: 25 }).success).toBe(true);
    expect(selectTransactionSchema.safeParse({ candidateNumber: 26 }).success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Model visibility
// ─────────────────────────────────────────────────────────────────────────────
describe('model sees exactly the visible frame as selectable', () => {
  it('established 30-match result: model rows = 25 visible rows, partial note, totals untouched', async () => {
    const { gate, result, outcome } = await establish(30);
    const view = presentTxSearchResultForModel({ ...result, totals: { count: 30 } }, outcome, gate.visibleFrame) as {
      rows: TxSearchRow[]; totals: { count: number }; candidateFrame: { selectable: boolean; shown: number; matched: number; note: string };
    };
    expect(view.rows.map(r => r.id)).toEqual(gate.txCandidatesForResponse!.map(c => c.id));
    expect(view.totals.count).toBe(30);
    expect(view.candidateFrame).toMatchObject({ selectable: true, shown: 25, matched: 30 });
    expect(view.candidateFrame.note).toContain('PARTIAL: 30 transactions matched, but only the first 25 are shown and selectable');
    expect(view.candidateFrame.note).toContain('Do not describe, number or refer to transactions beyond #25');
  });

  it('analytical (not established) result: rows kept as evidence, explicitly not selectable', () => {
    const r = { rows: rows(30) };
    const view = presentTxSearchResultForModel(r, 'skipped_analytical', null) as { rows: TxSearchRow[]; candidateFrame: { selectable: boolean; note: string } };
    expect(view.rows).toHaveLength(30);
    expect(view.candidateFrame.selectable).toBe(false);
    expect(view.candidateFrame.note).toContain('NOT numbered selectable candidates');
  });

  it('the original result object is never mutated (evidence accounting reads it)', async () => {
    const { gate, result, outcome } = await establish(30);
    presentTxSearchResultForModel(result, outcome, gate.visibleFrame);
    expect(result.rows).toHaveLength(30);
  });

  it('chat.ts serializes the model view at every model tool-result site', () => {
    expect((CHAT_SRC.match(/rememberTxSearchModelView\((result|tResult), presentTxSearchResultForModel\(/g) || []).length).toBe(4);
    expect((CHAT_SRC.match(/content: JSON\.stringify\(txSearchModelView\((result|tResult)\)\)/g) || []).length).toBe(4);
    expect(CHAT_SRC).not.toMatch(/content: JSON\.stringify\(result\),/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Canonical display instruction (no duplicate prose list)
// ─────────────────────────────────────────────────────────────────────────────
describe('11. canonical display: cards own the rows, Prime frames', () => {
  it('complete frame note: cards are authoritative; do not reproduce the list', () => {
    const note = formatCandidateFrameNote({ shown: 10, matched: 10 });
    expect(note).toContain('numbered transaction cards');
    expect(note).toContain('Do NOT reproduce the list');
    expect(note).not.toContain('PARTIAL');
  });

  it('partial frame note: shown vs matched + narrow the request', () => {
    const note = formatCandidateFrameNote({ shown: 25, matched: 30 });
    expect(note).toContain('PARTIAL: 30 transactions matched, but only the first 25 are shown and selectable');
    expect(note).toContain('narrowing the request');
  });

  it('chat.ts: P3.3B injection, grounding and the selection protocol carry the display rule; no "Present these results"', () => {
    expect(CHAT_SRC).toContain('cLines.push(formatCandidateFrameNote({ shown: b2cCandidates.length, matched: b2cFrame?.matched ?? b2cCandidates.length }));');
    expect(CHAT_SRC).toContain("messages.push({ role: 'system', content: formatCandidateFrameNote(ownershipGate.visibleFrame) });");
    expect(CHAT_SRC).toContain('CANDIDATE DISPLAY: When a search establishes selectable candidates');
    expect(CHAT_SRC).not.toContain('Present these results to the user');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. B2C stale Phase 1D withdrawal (wiring)
// ─────────────────────────────────────────────────────────────────────────────
describe('10. B2C replaces the frame → stale Phase 1D listing is withdrawn on ANY establishment', () => {
  it('withdrawal depends only on B2C establishment (not on card count)', () => {
    expect(CHAT_SRC).toMatch(/if \(b2cOutcome === 'established' && phase1dCandidateMessage\) \{\s*const staleIdx = messages\.indexOf\(phase1dCandidateMessage as any\);\s*if \(staleIdx >= 0\) \{\s*messages\.splice\(staleIdx, 1\);/);
  });

  it('Phase 1D lists only the visible frame of a persisted context', () => {
    expect(CHAT_SRC).toContain('const visibleExisting = existingTxResolution.candidates.slice(0, VISIBLE_CANDIDATE_FRAME_MAX);');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14–15. Identity safety unchanged
// ─────────────────────────────────────────────────────────────────────────────
describe('14–15. identity safety', () => {
  it('14. only verified UUID rows enter the visible frame (invalid ids never consume a slot)', async () => {
    const s = makeSession();
    const gate = s.newRequest();
    const mixed = [{ id: 'not-a-uuid', merchant: 'X' }, ...rows(30)];
    await gate.submitSearchResult({ rows: mixed }, 'streaming', 'candidate_establishment');
    expect(gate.txCandidatesForResponse).toHaveLength(25);
    expect(gate.txCandidatesForResponse![0].id).toBe(uuid(1));
    expect(s.state.layer2!.candidates.map(c => c.id)).toEqual(gate.txCandidatesForResponse!.map(c => c.id));
    expect(buildVisibleCandidateFrame({ rows: mixed }).matched).toBe(30);
  });

  it('15. Prime→Tag: Layer 2 selection wins and is DB re-fetched by user_id', async () => {
    const { s } = await establish(30);
    const sel = selectCandidateFromFrame(s.state.layer2, 3);
    expect(sel.ok).toBe(true);
    const verified = sel.ok ? { id: sel.candidate.id, description: null, amount: null, date: null, current_category: null } : null;
    const decision = resolveTagHandoffIdentity({ layer2Selected: verified, layer2CandidateIds: s.state.layer2!.candidates.map(c => c.id), layer1: null });
    expect(decision.tx?.id).toBe(uuid(3));
    const promote = CHAT_SRC.slice(CHAT_SRC.indexOf('async function promoteLayer2SelectedTx'), CHAT_SRC.indexOf('async function promoteLayer2SelectedTx') + 2500);
    expect(promote).toContain(".eq('user_id', userId)");
    expect(promote).toContain('txr.candidates.some(c => c.id === selectedId)');
  });
});
