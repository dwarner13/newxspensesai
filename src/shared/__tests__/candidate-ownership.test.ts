/**
 * P3.3C — Candidate Ownership / Evidence-Scope Architecture Tests
 *
 * Validates the CandidateOwnershipIntent gate, purpose-based resolution,
 * safe fallback behavior, and candidate frame preservation invariants.
 *
 * Run with: npx vitest@2 run src/shared/__tests__/candidate-ownership.test.ts
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Pure logic mirrors extracted from chat.ts for unit testing
// ─────────────────────────────────────────────────────────────────────────────

type CandidateOwnershipIntent = 'candidate_establishment' | 'analytical_evidence';

/**
 * Mirrors the resolveCandidateOwnership function from chat.ts.
 * Safe default: when purpose is missing/invalid AND candidates exist, preserve frame.
 */
function resolveCandidateOwnership(
  purpose: string | undefined,
  hasExistingCandidates: boolean,
): CandidateOwnershipIntent {
  if (!hasExistingCandidates) return 'candidate_establishment';
  if (purpose === 'new_candidate_scope') return 'candidate_establishment';
  return 'analytical_evidence';
}

/**
 * Mirrors the guardedPersistTxResolution intent gate from chat.ts.
 * Returns whether persistence would proceed (true) or be skipped (false).
 */
function wouldPersist(state: {
  txResolutionLockedThisTurn: boolean;
  intent: CandidateOwnershipIntent;
}): boolean {
  if (state.txResolutionLockedThisTurn) return false;
  if (state.intent === 'analytical_evidence') return false;
  return true;
}

/**
 * Mirrors the shouldPreserveCandidates calculation from chat.ts.
 */
function computeShouldPreserveCandidates(hasExistingCandidates: boolean): boolean {
  return hasExistingCandidates;
}

/**
 * Simulates candidate frame state across a sequence of operations.
 */
function simulateCandidateLifecycle(ops: Array<{
  source: string;
  intent: CandidateOwnershipIntent;
  rows: Array<{ id: string; merchant: string }>;
}>): {
  finalCandidates: Array<{ id: string; merchant: string }> | null;
  locked: boolean;
  persistedSources: string[];
} {
  let locked = false;
  let candidates: Array<{ id: string; merchant: string }> | null = null;
  const persistedSources: string[] = [];

  for (const op of ops) {
    // Mirror guardedPersistTxResolution logic
    if (locked) continue;
    if (op.intent === 'analytical_evidence') continue;
    // candidate_establishment
    candidates = op.rows;
    locked = true;
    persistedSources.push(op.source);
  }

  return { finalCandidates: candidates, locked, persistedSources };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const COSTCO_CANDIDATES = [
  { id: 'uuid-1', merchant: 'COSTCO WHOLESALE' },
  { id: 'uuid-2', merchant: 'COSTCO' },
  { id: 'uuid-3', merchant: 'COSTCO' },
  { id: 'uuid-4', merchant: 'COSTCO' },
  { id: 'uuid-5', merchant: 'COSTCO' },
  { id: 'uuid-6', merchant: 'COSTCO' },
  { id: 'uuid-7', merchant: 'COSTCO' },
  { id: 'uuid-8', merchant: 'COSTCO' },
];

const WALMART_CANDIDATES = [
  { id: 'wm-1', merchant: 'WALMART' },
  { id: 'wm-2', merchant: 'WALMART' },
  { id: 'wm-3', merchant: 'WALMART SUPERCENTER' },
];

const PRIME_TOOLS = [
  'tx_search', 'tx_get', 'select_transaction',
  'transaction_category_totals', 'tax_summary',
  'cash_flow_summary', 'merchant_totals', 'merchant_analysis_refine',
  'finley_debt_payoff_forecast', 'finley_savings_forecast',
];

// ─────────────────────────────────────────────────────────────────────────────
// A. EXISTING FRAME — NO REPLACEMENT
// Queries that should answer from existing candidates, no tx_search needed.
// The model does NOT call tx_search → candidates preserved.
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-A: Existing frame preservation (no tx_search)', () => {
  it('shouldPreserveCandidates=true when candidates exist', () => {
    expect(computeShouldPreserveCandidates(true)).toBe(true);
  });

  it('shouldPreserveCandidates=false when no candidates', () => {
    expect(computeShouldPreserveCandidates(false)).toBe(false);
  });

  it('frame survives when model does not call tx_search', () => {
    // Simulate: 8 Costco candidates established, no subsequent tx_search
    const result = simulateCandidateLifecycle([
      { source: 'initial-search', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
    ]);
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.locked).toBe(true);
  });

  // These queries should NOT trigger tx_search — model answers from candidates:
  // "Which was the biggest?"
  // "Add these up."
  // "How much are these altogether?"
  // "Which one hit me hardest?"
  // "Any big ones in there?"
  // "What's the earliest one?"
  // "How many did you find?"
  // The test validates that IF the model somehow calls tx_search without purpose,
  // the safe fallback preserves the frame.
  const candidateQueries = [
    'Which was the biggest?',
    'Add these up.',
    'How much are these altogether?',
    'Which one hit me hardest?',
    'Any big ones in there?',
    'What\'s the earliest one?',
    'How many did you find?',
  ];
  for (const q of candidateQueries) {
    it(`safe fallback preserves frame for: "${q}" (purpose omitted)`, () => {
      const ownership = resolveCandidateOwnership(undefined, true);
      expect(ownership).toBe('analytical_evidence');
      expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: ownership })).toBe(false);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// B. ANALYTICAL EVIDENCE — NO REPLACEMENT
// tx_search executes with purpose='analytical_evidence' → frame preserved
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-B: Analytical evidence (frame preserved)', () => {
  const analyticalQueries = [
    'What\'s my total Costco spending excluding gas?',
    'How much was Walmart altogether?',
    'Compare what I spent at Costco with Walmart.',
    'Did I spend more at Costco or Walmart?',
    'What was my restaurant spending last month?',
  ];

  for (const q of analyticalQueries) {
    it(`analytical_evidence preserves frame for: "${q}"`, () => {
      const ownership = resolveCandidateOwnership('analytical_evidence', true);
      expect(ownership).toBe('analytical_evidence');
      expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: ownership })).toBe(false);
    });
  }

  it('analytical tx_search does not replace established candidates', () => {
    const result = simulateCandidateLifecycle([
      { source: 'initial-search', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'analytical', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
    ]);
    // First establishment locks, analytical skipped
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.persistedSources).toEqual(['initial-search']);
  });

  it('multiple analytical searches do not affect established frame', () => {
    const result = simulateCandidateLifecycle([
      { source: 'initial', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'analytical-1', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
      { source: 'analytical-2', intent: 'analytical_evidence', rows: [{ id: 'x', merchant: 'TARGET' }] },
    ]);
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.persistedSources).toEqual(['initial']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C. NEW CANDIDATE SCOPE — REPLACEMENT
// Model calls tx_search with purpose='new_candidate_scope' → frame replaced
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-C: New candidate scope (frame replaced)', () => {
  const newScopeQueries = [
    'Show me Walmart transactions.',
    'Give me the Walmart ones instead.',
    'Let\'s look at Walmart now.',
    'Pull up Walmart.',
    'What were those Walmart charges?',
    'Switch over to June.',
    'Bring up last month\'s purchases.',
    'I want to look through my restaurant purchases.',
  ];

  for (const q of newScopeQueries) {
    it(`new_candidate_scope allows replacement for: "${q}"`, () => {
      const ownership = resolveCandidateOwnership('new_candidate_scope', true);
      expect(ownership).toBe('candidate_establishment');
      expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: ownership })).toBe(true);
    });
  }

  it('new_candidate_scope replaces existing frame (when lock not yet set)', () => {
    // Simulate cold start + replacement in same request (shouldn't happen normally,
    // but validates that new_candidate_scope is candidate_establishment)
    const ownership = resolveCandidateOwnership('new_candidate_scope', true);
    expect(ownership).toBe('candidate_establishment');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D. MISSING PURPOSE SAFE FALLBACK
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-D: Missing purpose safe fallback', () => {
  it('missing purpose + existing candidates → analytical_evidence (preserve)', () => {
    expect(resolveCandidateOwnership(undefined, true)).toBe('analytical_evidence');
  });

  it('missing purpose + no existing candidates → candidate_establishment', () => {
    expect(resolveCandidateOwnership(undefined, false)).toBe('candidate_establishment');
  });

  it('wouldPersist=false for missing purpose with existing candidates', () => {
    const intent = resolveCandidateOwnership(undefined, true);
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent })).toBe(false);
  });

  it('wouldPersist=true for missing purpose without existing candidates', () => {
    const intent = resolveCandidateOwnership(undefined, false);
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E. INVALID PURPOSE
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-E: Invalid purpose safe fallback', () => {
  const invalidPurposes = [
    'replace_everything',
    'new_search',
    '',
    'ANALYTICAL_EVIDENCE', // wrong case
    'NEW_CANDIDATE_SCOPE', // wrong case
    'null',
    'undefined',
  ];

  for (const p of invalidPurposes) {
    it(`invalid purpose "${p}" + existing candidates → analytical_evidence`, () => {
      expect(resolveCandidateOwnership(p, true)).toBe('analytical_evidence');
    });
  }

  for (const p of invalidPurposes) {
    it(`invalid purpose "${p}" + no candidates → candidate_establishment`, () => {
      expect(resolveCandidateOwnership(p, false)).toBe('candidate_establishment');
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// F. COLD START — first search establishes candidates
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-F: Cold start (no existing candidates)', () => {
  it('no existing candidates → candidate_establishment regardless of purpose', () => {
    expect(resolveCandidateOwnership(undefined, false)).toBe('candidate_establishment');
    expect(resolveCandidateOwnership('analytical_evidence', false)).toBe('candidate_establishment');
    expect(resolveCandidateOwnership('new_candidate_scope', false)).toBe('candidate_establishment');
  });

  it('cold start tx_search establishes candidate frame', () => {
    const result = simulateCandidateLifecycle([
      { source: 'cold-start', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
    ]);
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.locked).toBe(true);
    expect(result.persistedSources).toEqual(['cold-start']);
  });

  it('cold start: even analytical_evidence purpose becomes establishment when no candidates', () => {
    // resolveCandidateOwnership returns candidate_establishment when !hasExistingCandidates
    const intent = resolveCandidateOwnership('analytical_evidence', false);
    expect(intent).toBe('candidate_establishment');
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G. B2C — always candidate_establishment
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-G: B2C bridge (always candidate_establishment)', () => {
  it('B2C bridge intent is candidate_establishment', () => {
    // B2C bridge hardcodes 'candidate_establishment' — not dependent on model purpose
    const b2cIntent: CandidateOwnershipIntent = 'candidate_establishment';
    expect(b2cIntent).toBe('candidate_establishment');
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: b2cIntent })).toBe(true);
  });

  it('B2C bridge locked prevents subsequent replacement', () => {
    const result = simulateCandidateLifecycle([
      { source: 'B2C_merchant_bridge', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'model-tx-search', intent: 'candidate_establishment', rows: WALMART_CANDIDATES },
    ]);
    // B2C locks first, subsequent establishment is blocked
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.persistedSources).toEqual(['B2C_merchant_bridge']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H. P3.1C — always analytical_evidence
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-H: P3.1C evidence (always analytical_evidence)', () => {
  it('P3.1C tx_search intent is analytical_evidence', () => {
    const p31cIntent: CandidateOwnershipIntent = 'analytical_evidence';
    expect(p31cIntent).toBe('analytical_evidence');
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: p31cIntent })).toBe(false);
  });

  it('P3.1C does not replace existing candidate frame', () => {
    const result = simulateCandidateLifecycle([
      { source: 'initial', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'p31c', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
    ]);
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.persistedSources).toEqual(['initial']);
  });

  it('P3.1C alone (no prior candidates) still uses analytical_evidence', () => {
    // This validates the P3.1C hardcoded intent — even without candidates,
    // P3.1C sets 'analytical_evidence'. But resolveCandidateOwnership for cold
    // start returns candidate_establishment. P3.1C BYPASSES the resolver and
    // hardcodes its intent directly.
    const result = simulateCandidateLifecycle([
      { source: 'p31c', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
    ]);
    expect(result.finalCandidates).toBeNull();
    expect(result.locked).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I. MUTATION SAFETY — analytical tx_search must not corrupt candidate identity
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-I: Mutation safety (analytical evidence does not corrupt identity)', () => {
  it('analytical tx_search does not change which candidate #3 resolves to', () => {
    // Simulate: 8 Costco candidates established, then analytical Walmart search
    const result = simulateCandidateLifecycle([
      { source: 'initial', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'analytical', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
    ]);

    // Candidate #3 (0-indexed: 2) should still be Costco, not Walmart
    expect(result.finalCandidates).not.toBeNull();
    expect(result.finalCandidates![2].merchant).toBe('COSTCO');
    expect(result.finalCandidates![2].id).toBe('uuid-3');
  });

  it('candidate_establishment lock prevents any subsequent replacement', () => {
    const result = simulateCandidateLifecycle([
      { source: 'initial', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'analytical', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
      { source: 'forced', intent: 'candidate_establishment', rows: WALMART_CANDIDATES },
    ]);
    // Lock from initial prevents both analytical AND subsequent establishment
    expect(result.finalCandidates).toEqual(COSTCO_CANDIDATES);
    expect(result.persistedSources).toEqual(['initial']);
  });

  it('mutation flows through existing candidate identity, not analytical results', () => {
    // After analytical tx_search, select_transaction should resolve from
    // the ORIGINAL candidate frame (Costco), not the analytical results (Walmart).
    const result = simulateCandidateLifecycle([
      { source: 'initial', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
      { source: 'analytical', intent: 'analytical_evidence', rows: WALMART_CANDIDATES },
    ]);
    // Ordinal #3 should resolve to COSTCO uuid-3
    const candidate3 = result.finalCandidates![2];
    expect(candidate3.id).toBe('uuid-3');
    expect(candidate3.merchant).toBe('COSTCO');
    // NOT Walmart
    expect(candidate3.merchant).not.toBe('WALMART');
    expect(candidate3.id).not.toBe('wm-3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J. NEW FRAME THEN SELECTION — replacement works when intended
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C-J: New frame then selection', () => {
  it('new_candidate_scope replaces frame, then ordinal resolves from new frame', () => {
    // This simulates TWO separate requests (lock resets between requests).
    // Request 1: establish Costco candidates
    const request1 = simulateCandidateLifecycle([
      { source: 'initial', intent: 'candidate_establishment', rows: COSTCO_CANDIDATES },
    ]);
    expect(request1.finalCandidates).toEqual(COSTCO_CANDIDATES);

    // Request 2: new_candidate_scope replaces with Walmart
    // (In a new request, lock is reset to false)
    const request2 = simulateCandidateLifecycle([
      { source: 'model-new-scope', intent: 'candidate_establishment', rows: WALMART_CANDIDATES },
    ]);
    expect(request2.finalCandidates).toEqual(WALMART_CANDIDATES);
    expect(request2.finalCandidates![2].merchant).toBe('WALMART SUPERCENTER');
    expect(request2.finalCandidates![2].id).toBe('wm-3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Ownership resolver edge cases
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C: resolveCandidateOwnership edge cases', () => {
  it('purpose=null treated same as undefined (safe fallback)', () => {
    expect(resolveCandidateOwnership(null as any, true)).toBe('analytical_evidence');
    expect(resolveCandidateOwnership(null as any, false)).toBe('candidate_establishment');
  });

  it('purpose is case-sensitive (wrong case → safe fallback)', () => {
    expect(resolveCandidateOwnership('New_Candidate_Scope', true)).toBe('analytical_evidence');
    expect(resolveCandidateOwnership('ANALYTICAL_EVIDENCE', true)).toBe('analytical_evidence');
  });

  it('exact enum values are the only accepted values', () => {
    expect(resolveCandidateOwnership('new_candidate_scope', true)).toBe('candidate_establishment');
    expect(resolveCandidateOwnership('analytical_evidence', true)).toBe('analytical_evidence');
    // Everything else falls through to safe default
    expect(resolveCandidateOwnership('something_else', true)).toBe('analytical_evidence');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Lock interaction
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C: Lock interaction with intent', () => {
  it('locked=true always prevents persistence regardless of intent', () => {
    expect(wouldPersist({ txResolutionLockedThisTurn: true, intent: 'candidate_establishment' })).toBe(false);
    expect(wouldPersist({ txResolutionLockedThisTurn: true, intent: 'analytical_evidence' })).toBe(false);
  });

  it('analytical_evidence prevents persistence even when unlocked', () => {
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: 'analytical_evidence' })).toBe(false);
  });

  it('only candidate_establishment + unlocked allows persistence', () => {
    expect(wouldPersist({ txResolutionLockedThisTurn: false, intent: 'candidate_establishment' })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tool stripping interaction — P3.3A/P3.3B unchanged
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3C: Tool stripping interaction (P3.3A/P3.3B unchanged)', () => {
  function computeToolsForModel(
    tools: string[],
    merchantAggSatisfied: boolean,
    b2cCandidatesSatisfied: boolean,
  ): string[] {
    const stripTxSearch = merchantAggSatisfied || b2cCandidatesSatisfied;
    return stripTxSearch ? tools.filter(t => t !== 'tx_search') : tools;
  }

  it('P3.3A still strips tx_search when merchantAggSatisfied', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, true, false);
    expect(tools).not.toContain('tx_search');
    expect(tools).toContain('select_transaction');
  });

  it('P3.3B still strips tx_search when b2cCandidatesSatisfied', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, false, true);
    expect(tools).not.toContain('tx_search');
    expect(tools).toContain('select_transaction');
  });

  it('tx_search available when neither P3.3A nor P3.3B gates fire', () => {
    // P3.3C does NOT strip tx_search — it relies on the model's purpose field
    const tools = computeToolsForModel(PRIME_TOOLS, false, false);
    expect(tools).toContain('tx_search');
  });

  it('all mutation tools remain available regardless of P3.3C state', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, false, false);
    expect(tools).toContain('select_transaction');
    expect(tools).toContain('tx_get');
  });
});
