/**
 * TX CANDIDATE OWNERSHIP (P3.3C repair)
 *
 * Single source of truth for how tx_search results are allowed to touch
 * transaction identity. Both chat.ts and the behavioral tests import this
 * module — there is no mirrored copy.
 *
 * Two identity layers exist:
 *  - Layer 1: ephemeral in-memory "authoritative selected transaction"
 *             (set when an establishing search resolves to exactly 1 row)
 *  - Layer 2: DB-persisted TxResolutionContext (candidate frame + selectedId)
 *
 * Invariant: ONLY a candidate_establishment submission may write either layer
 * or populate txCandidatesForResponse. analytical_evidence submissions leave
 * all identity state untouched — they are evidence for the model, nothing more.
 *
 * Pure TypeScript. No Supabase, no Node-only APIs. Storage is injected.
 */

import {
  summarizeCandidateFrame,
  formatCandidateFrameFacts,
  RAW_TX_SEARCH_TOTALS_NOTE,
} from './candidate-frame-facts';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CandidateOwnershipIntent = 'candidate_establishment' | 'analytical_evidence';

export type TxResolutionCandidate = {
  id: string;
  merchant: string | null;
  amount: number | null;
  date: string | null;
  category: string | null;
};

export type TxResolutionContext = {
  candidates: TxResolutionCandidate[];
  selectedId: string | null;
  selectedIndex: number | null;
  updatedAt: number;
};

export type TxCandidateForResponse = {
  ordinal: number;
  id: string;
  merchant: string | null;
  date: string | null;
  amount: number | null;
  category: string | null;
  subcategory: string | null;
};

/** A tx_search result row as returned by the tool (fields used for identity). */
export type TxSearchRow = {
  id?: unknown;
  merchant?: string | null;
  merchant_normalized?: string | null;
  amount?: unknown;
  signed_amount?: unknown;
  date?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

export type Layer1Update =
  | { kind: 'set'; id: string; row: TxSearchRow }
  | { kind: 'clear'; reason: 'invalid_uuid' | 'ambiguous' | 'empty' };

export type OwnershipOutcome =
  | 'established'
  | 'skipped_locked'
  | 'skipped_analytical'
  | 'persist_failed';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * P3.3D visible-frame invariant: the authoritative selectable candidate frame is
 * EXACTLY the transactions the user is shown as numbered structured cards.
 * Searches may match more; only the first VISIBLE_CANDIDATE_FRAME_MAX rows (in the
 * search's own deterministic order) are persisted, rendered and ordinal-selectable.
 */
export const VISIBLE_CANDIDATE_FRAME_MAX = 25;

/** Layer 2 candidate cap — equal to the visible frame (never more than the user sees). */
export const TX_RESOLUTION_MAX_CANDIDATES = VISIBLE_CANDIDATE_FRAME_MAX;

/** Structured candidate cards — the same visible frame. */
export const TX_CANDIDATES_FOR_RESPONSE_MAX = VISIBLE_CANDIDATE_FRAME_MAX;

// ─────────────────────────────────────────────────────────────────────────────
// OWNERSHIP RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve candidate ownership from the model-declared tx_search purpose.
 * Safe default: when purpose is missing/invalid AND a frame exists, preserve it.
 * `purpose` is semantic authorization to ATTEMPT establishment — never identity.
 */
export function resolveCandidateOwnership(
  purpose: unknown,
  hasExistingCandidates: boolean,
): CandidateOwnershipIntent {
  if (!hasExistingCandidates) return 'candidate_establishment';
  if (purpose === 'new_candidate_scope') return 'candidate_establishment';
  // Missing, invalid, or 'analytical_evidence' → preserve existing frame
  return 'analytical_evidence';
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE BUILDERS (used by chat.ts persistence and Layer 1 writers)
// ─────────────────────────────────────────────────────────────────────────────

function rowsOf(result: unknown): TxSearchRow[] {
  const rows = (result as { rows?: unknown } | null | undefined)?.rows;
  return Array.isArray(rows) ? (rows as TxSearchRow[]) : [];
}

function hasValidId(r: TxSearchRow | null | undefined): r is TxSearchRow {
  return !!r?.id && UUID_RE.test(String(r.id).trim());
}

function amountOf(r: TxSearchRow): number | null {
  return typeof r.amount === 'number' ? r.amount : (typeof r.signed_amount === 'number' ? r.signed_amount : null);
}

/**
 * Build a TxResolutionContext from verified tx_search rows.
 * - Replaces previous candidates
 * - Clears previous selectedId
 * - Auto-selects if exactly 1 valid candidate
 */
export function buildTxResolutionFromSearchResult(result: unknown, now: number): TxResolutionContext {
  const candidates: TxResolutionCandidate[] = rowsOf(result)
    .filter(hasValidId)
    .slice(0, TX_RESOLUTION_MAX_CANDIDATES)
    .map((r) => ({
      id: String(r.id).trim(),
      merchant: r.merchant ?? r.merchant_normalized ?? null,
      amount: amountOf(r),
      date: r.date ?? null,
      category: r.category ?? null,
    }));
  const single = candidates.length === 1;
  return {
    candidates,
    selectedId: single ? candidates[0].id : null,
    selectedIndex: single ? 0 : null,
    updatedAt: now,
  };
}

/**
 * Decide the Layer 1 write for an ESTABLISHING search result:
 *  - Exactly 1 row with valid UUID → set
 *  - Otherwise → clear (ambiguous / invalid / empty)
 * Callers must only apply this for candidate_establishment.
 */
export function computeLayer1Update(result: unknown): Layer1Update {
  const rows = rowsOf(result);
  if (rows.length === 1 && rows[0]?.id) {
    const id = String(rows[0].id).trim();
    return UUID_RE.test(id) ? { kind: 'set', id, row: rows[0] } : { kind: 'clear', reason: 'invalid_uuid' };
  }
  return { kind: 'clear', reason: rows.length > 1 ? 'ambiguous' : 'empty' };
}

export interface VisibleCandidateFrame {
  /** The visible, selectable rows — first N valid rows in the search's own order. */
  rows: TxSearchRow[];
  shown: number;
  /** Total matches known for the search (>= shown). */
  matched: number;
  partial: boolean;
}

/**
 * Build the visible candidate frame from a verified tx_search result.
 * Keeps the search's deterministic order; never reorders.
 * `matched` uses merchant-scope matchedCount when the search reports it.
 */
export function buildVisibleCandidateFrame(result: unknown): VisibleCandidateFrame {
  const valid = rowsOf(result).filter(hasValidId);
  const reported = Number((result as { meta?: { merchantScope?: { matchedCount?: unknown } } } | null | undefined)
    ?.meta?.merchantScope?.matchedCount);
  const rows = valid.slice(0, VISIBLE_CANDIDATE_FRAME_MAX);
  const matched = Math.max(valid.length, Number.isFinite(reported) ? reported : 0);
  return { rows, shown: rows.length, matched, partial: matched > rows.length };
}

/**
 * Build the deterministic candidate cards for the response from the visible frame.
 * Returns null when there are no valid rows.
 */
export function buildTxCandidatesForResponse(result: unknown): TxCandidateForResponse[] | null {
  const { rows } = buildVisibleCandidateFrame(result);
  if (rows.length === 0) return null;
  return rows
    .map((r, i: number) => ({
      ordinal: i + 1,
      id: String(r.id).trim(),
      merchant: r.merchant_normalized ?? r.merchant ?? null,
      date: r.date ?? null,
      amount: amountOf(r),
      category: r.category ?? null,
      subcategory: r.subcategory ?? null,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST-SCOPED OWNERSHIP GATE
// ─────────────────────────────────────────────────────────────────────────────

export interface CandidateOwnershipDeps {
  /** Persist Layer 2 from the result. Returns false when the write failed. */
  persistLayer2: (result: unknown) => Promise<boolean>;
  /** Apply the Layer 1 update for an established frame. */
  applyLayer1: (result: unknown) => void;
  /** Clear Layer 1 (used when Layer 2 persistence failed — fail closed). */
  clearLayer1: () => void;
  log?: (msg: string) => void;
}

export interface CandidateOwnershipGate {
  /** Submit a tx_search result. Only candidate_establishment can touch identity. */
  submitSearchResult(result: unknown, source: string, intent: CandidateOwnershipIntent): Promise<OwnershipOutcome>;
  /** Mark ownership locked after a successful select_transaction. */
  lockForSelection(): void;
  isLocked(): boolean;
  readonly txCandidatesForResponse: TxCandidateForResponse[] | null;
  /** The visible frame established this request (shown/matched), or null. */
  readonly visibleFrame: VisibleCandidateFrame | null;
}

/**
 * Create the request-scoped ownership gate. One gate per request; the lock
 * resets automatically on the next request.
 *
 * The lock is CLAIMED synchronously before persistence is awaited, so two
 * establishment attempts in the same request cannot both pass the check —
 * the second always sees the lock, even if the first is still persisting.
 */
export function createCandidateOwnershipGate(deps: CandidateOwnershipDeps): CandidateOwnershipGate {
  let locked = false;
  let txCandidates: TxCandidateForResponse[] | null = null;
  let frame: VisibleCandidateFrame | null = null;
  const log = deps.log ?? (() => {});

  return {
    async submitSearchResult(result, source, intent) {
      if (locked) {
        log(`[Chat] TxResolution: skipping candidate replacement (source=${source}, intent=${intent}) — candidates locked this turn`);
        return 'skipped_locked';
      }
      if (intent !== 'candidate_establishment') {
        log(`[Chat] TxResolution: skipping candidate replacement (source=${source}) — analytical_evidence intent preserves Layer 1 + Layer 2`);
        return 'skipped_analytical';
      }
      locked = true; // claim before any await
      // P3.3D: persist / Layer 1 / cards all use the SAME visible frame (first N rows).
      const visible = buildVisibleCandidateFrame(result);
      const frameResult = { ...((result && typeof result === 'object') ? result : {}), rows: visible.rows };
      let persisted = false;
      try {
        persisted = await deps.persistLayer2(frameResult);
      } catch (e) {
        log(`[Chat] TxResolution: persist threw (source=${source}): ${(e as Error)?.message}`);
        persisted = false;
      }
      if (!persisted) {
        // Fail closed: frame state is uncertain, so no Layer 1 identity and no cards.
        // The lock stays claimed so no other search can establish this request.
        deps.clearLayer1();
        log(`[Chat] TxResolution: persist FAILED (source=${source}) — Layer 1 cleared, no candidates emitted, ownership remains locked`);
        return 'persist_failed';
      }
      deps.applyLayer1(frameResult);
      frame = visible;
      const cards = buildTxCandidatesForResponse(frameResult);
      if (cards) {
        txCandidates = cards;
        log(`[Chat] P0: captured ${cards.length} candidates for deterministic rendering (matched=${visible.matched})`);
      }
      log(`[Chat] TxResolution: candidates established (source=${source}, intent=${intent}), ownership locked for this request`);
      return 'established';
    },
    lockForSelection() {
      locked = true;
    },
    isLocked() {
      return locked;
    },
    get txCandidatesForResponse() {
      return txCandidates;
    },
    get visibleFrame() {
      return frame;
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL DISPLAY (P3.3D)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instruction for Prime whenever a visible frame is rendered as structured cards.
 * The cards own the transaction rows and ordinals; Prime only frames them.
 */
export function formatCandidateFrameNote(frame: Pick<VisibleCandidateFrame, 'shown' | 'matched'>): string {
  const lines = [
    `DISPLAY: The app shows these ${frame.shown} transactions to the user as numbered transaction cards directly below your reply. The cards are the authoritative list and ordinals.`,
    'Do NOT reproduce the list in your reply (no per-transaction merchant/date/amount lines or numbered rows). Give one or two sentences of framing — what they are, how many, and the total when known — then answer any question the user asked.',
  ];
  if (frame.matched > frame.shown) {
    lines.push(`PARTIAL: ${frame.matched} transactions matched, but only the first ${frame.shown} are shown and selectable. Say so plainly and suggest narrowing the request to find the others. Do not describe, number or refer to transactions beyond #${frame.shown}.`);
  }
  return lines.join('\n');
}

/**
 * The tx_search result as the MODEL should see it.
 * - Established frame: rows = exactly the visible frame, plus the display note and
 *   the canonical VERIFIED VISIBLE FRAME FACTS (Stage 2). Raw totals are kept but
 *   labelled non-authoritative for the visible frame.
 * - Not established (analytical / locked / failed): rows are evidence only and
 *   explicitly not selectable candidates.
 * Totals and other aggregate fields are left untouched (model view only).
 */
export function presentTxSearchResultForModel(
  result: unknown,
  outcome: OwnershipOutcome | null | undefined,
  frame: VisibleCandidateFrame | null,
): unknown {
  if (!result || typeof result !== 'object') return result;
  if (outcome === 'established' && frame) {
    // Same rows and amounts as the rendered cards — one arithmetic path.
    const facts = summarizeCandidateFrame(buildTxCandidatesForResponse({ rows: frame.rows }));
    return {
      ...result,
      rows: frame.rows,
      totalsNote: RAW_TX_SEARCH_TOTALS_NOTE,
      candidateFrame: {
        selectable: true,
        shown: frame.shown,
        matched: frame.matched,
        partial: frame.partial,
        note: formatCandidateFrameNote(frame),
        ...(facts ? { facts: formatCandidateFrameFacts(facts) } : {}),
      },
    };
  }
  return {
    ...result,
    candidateFrame: {
      selectable: false,
      note: 'Evidence only: these rows are NOT numbered selectable candidates and are not shown to the user as cards. Do not number them as candidates or invite the user to pick one by position.',
    },
  };
}

/**
 * P3.1C evidence execution results are ALWAYS analytical evidence.
 * Submits each eligible tx_search result through the gate as analytical_evidence.
 */
export async function submitEvidenceTxSearchResults(
  results: Array<{ tool: string; status: string; data?: unknown }>,
  gate: CandidateOwnershipGate,
): Promise<OwnershipOutcome[]> {
  const outcomes: OwnershipOutcome[] = [];
  for (const r of results) {
    if (r.tool !== 'tx_search') continue;
    if (r.status !== 'resolved' && r.status !== 'successful_empty') continue;
    const data = r.data as { rows?: unknown; queryStatus?: unknown } | null | undefined;
    if (!data?.rows) continue;
    outcomes.push(await gate.submitSearchResult({ rows: data.rows, queryStatus: data.queryStatus }, 'p31c', 'analytical_evidence'));
  }
  return outcomes;
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION + HANDOFF PRECEDENCE
// ─────────────────────────────────────────────────────────────────────────────

export type FrameSelection =
  | { ok: true; index: number; candidate: TxResolutionCandidate }
  | { ok: false; error: string };

/** Resolve a 1-based candidateNumber against the authoritative frame. Never accepts a UUID. */
export function selectCandidateFromFrame(txr: TxResolutionContext | null, candidateNumber: unknown): FrameSelection {
  if (typeof candidateNumber !== 'number' || !Number.isInteger(candidateNumber) || candidateNumber < 1) {
    return { ok: false, error: 'candidateNumber must be a positive integer (1, 2, 3...)' };
  }
  if (!txr || !txr.candidates || txr.candidates.length === 0) {
    return { ok: false, error: 'No transaction search results available. Run a transaction search first.' };
  }
  const index = candidateNumber - 1;
  // P3.3D: only the visible frame is selectable (also bounds frames persisted before P3.3D)
  const selectable = Math.min(txr.candidates.length, VISIBLE_CANDIDATE_FRAME_MAX);
  if (index >= selectable) {
    return {
      ok: false,
      error: `candidateNumber ${candidateNumber} is out of range. There are ${selectable} candidate(s) available.`,
    };
  }
  const candidate = txr.candidates[index];
  if (!candidate?.id || !UUID_RE.test(candidate.id)) {
    return { ok: false, error: 'Selected candidate has invalid identity. Please search again.' };
  }
  return { ok: true, index, candidate };
}

export type HandoffIdentityDecision<T> =
  | { source: 'layer2_selected_tx'; tx: T }
  | { source: 'authoritative_selected_tx'; tx: T }
  | { source: null; tx: null; rejectedLayer1Id?: string };

/**
 * Prime → Tag handoff identity precedence.
 *
 *  1. A verified Layer 2 selectedId (DB-validated, member of the frame) ALWAYS wins.
 *  2. Layer 1 is a fallback only, and only when it does not contradict the
 *     current Layer 2 frame (no frame, or Layer 1 id is a member of it).
 *  3. Otherwise no identity — the caller fails closed.
 */
export function resolveTagHandoffIdentity<T extends { id: string }>(input: {
  layer2Selected: T | null;
  layer2CandidateIds: string[] | null;
  layer1: T | null;
}): HandoffIdentityDecision<T> {
  if (input.layer2Selected) return { source: 'layer2_selected_tx', tx: input.layer2Selected };
  const l1 = input.layer1;
  if (l1) {
    const frame = input.layer2CandidateIds;
    if (!frame || frame.length === 0 || frame.includes(l1.id)) {
      return { source: 'authoritative_selected_tx', tx: l1 };
    }
    return { source: null, tx: null, rejectedLayer1Id: l1.id };
  }
  return { source: null, tx: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// B2C BRIDGE ESTABLISHMENT AUTHORITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The P3.2B2C merchant bridge is an explicit deterministic candidate_establishment
 * path. It has its own frame-replacement authority — it is NOT governed by the
 * global shouldPreserveCandidates (which preserves frames against arbitrary
 * analytical searches).
 *
 * With an existing frame, the bridge may replace it only when the turn is a new
 * grounded request (not a candidate follow-up / historical reference, which the
 * Phase1D classifier already folds into isNewGroundedSearch).
 */
export function computeB2CBridgeActive(input: {
  macReady: boolean;
  phraseMatch: boolean;
  merchantAggSatisfied: boolean;
  hasExistingCandidates: boolean;
  isNewGroundedSearch: boolean;
}): boolean {
  if (!input.macReady || !input.phraseMatch) return false;
  if (input.merchantAggSatisfied) return false;
  return !input.hasExistingCandidates || input.isNewGroundedSearch;
}

/**
 * P3.3B fast-path gate: true only when the B2C submission ITSELF established and
 * persisted the frame this request, and cards were captured. A lock held for any
 * other reason never satisfies it.
 */
export function computeB2CCandidatesSatisfied(input: {
  bridgeActive: boolean;
  outcome: OwnershipOutcome | null;
  txCandidatesForResponse: TxCandidateForResponse[] | null;
}): boolean {
  return !!(
    input.bridgeActive
    && input.outcome === 'established'
    && input.txCandidatesForResponse
    && input.txCandidatesForResponse.length > 0
  );
}
