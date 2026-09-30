/**
 * P3.3B — B2C Authoritative Candidate Fast Path Tests
 *
 * Validates the b2cCandidatesSatisfied gate, tx_search stripping, and
 * candidate context injection for the B2C merchant bridge fast path.
 *
 * Run with: npx vitest@2 run src/shared/__tests__/b2c-candidate-fast-path.test.ts
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// P3.3B satisfaction gate — pure logic extracted for testing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mirrors the b2cCandidatesSatisfied calculation from chat.ts.
 * True ONLY when all four conditions hold after B2C bridge execution.
 */
function computeB2cCandidatesSatisfied(state: {
  merchantAnalysisBridgeActive: boolean;
  txResolutionLockedThisTurn: boolean;
  txCandidatesForResponse: any[] | null;
}): boolean {
  return !!(
    state.merchantAnalysisBridgeActive
    && state.txResolutionLockedThisTurn
    && state.txCandidatesForResponse
    && state.txCandidatesForResponse.length > 0
  );
}

/**
 * Mirrors the P3.3A/B tool stripping logic from chat.ts.
 */
function computeToolsForModel(
  employeeTools: string[],
  merchantAggSatisfied: boolean,
  b2cCandidatesSatisfied: boolean,
): string[] {
  const stripTxSearch = merchantAggSatisfied || b2cCandidatesSatisfied;
  return stripTxSearch
    ? employeeTools.filter(t => t !== 'tx_search')
    : employeeTools;
}

/**
 * Mirrors the P3.3B candidate context injection from chat.ts.
 */
function buildB2cCandidateContext(
  b2cCandidatesSatisfied: boolean,
  txCandidatesForResponse: { ordinal: number; merchant: string; amount: number; date: string; category: string }[] | null,
): string | null {
  if (!b2cCandidatesSatisfied || !txCandidatesForResponse) return null;
  const cLines: string[] = ['ACTIVE TRANSACTION CANDIDATES (established by merchant bridge for this request):'];
  for (const c of txCandidatesForResponse) {
    const parts: string[] = [];
    if (c.merchant) parts.push(c.merchant);
    if (c.amount !== null && c.amount !== undefined) parts.push(`$${Math.abs(c.amount).toFixed(2)}`);
    if (c.date) parts.push(c.date);
    if (c.category) parts.push(c.category);
    cLines.push(`[${c.ordinal}] ${parts.join(' | ')}`);
  }
  cLines.push('');
  cLines.push(`${txCandidatesForResponse.length} transactions found. Present these results to the user. Do NOT call tx_search — these candidates are already established and authoritative for this request.`);
  return cLines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

const COSTCO_CANDIDATES = [
  { ordinal: 1, id: 'uuid-1', merchant: 'COSTCO WHOLESALE', amount: -190.27, date: '2026-05-04', category: 'Restaurants / Dining', subcategory: null },
  { ordinal: 2, id: 'uuid-2', merchant: 'COSTCO', amount: 415.23, date: '2025-12-18', category: 'Groceries', subcategory: null },
  { ordinal: 3, id: 'uuid-3', merchant: 'COSTCO', amount: 249.15, date: '2025-10-10', category: 'Groceries', subcategory: null },
  { ordinal: 4, id: 'uuid-4', merchant: 'COSTCO', amount: 255.09, date: '2025-10-07', category: 'Groceries', subcategory: null },
  { ordinal: 5, id: 'uuid-5', merchant: 'COSTCO', amount: 307.20, date: '2025-06-17', category: 'Groceries', subcategory: null },
  { ordinal: 6, id: 'uuid-6', merchant: 'COSTCO', amount: 27.48, date: '2025-06-14', category: 'Groceries', subcategory: null },
  { ordinal: 7, id: 'uuid-7', merchant: 'COSTCO', amount: 294.78, date: '2025-06-14', category: 'Groceries', subcategory: null },
  { ordinal: 8, id: 'uuid-8', merchant: 'COSTCO', amount: 112.87, date: '2025-06-05', category: 'Groceries', subcategory: null },
];

const PRIME_TOOLS = [
  'tx_search', 'tx_get', 'select_transaction',
  'transaction_category_totals', 'tax_summary',
  'cash_flow_summary', 'merchant_totals', 'merchant_analysis_refine',
  'finley_debt_payoff_forecast', 'finley_savings_forecast',
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Successful B2C bridge + candidates + lock → satisfied=true
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3B: b2cCandidatesSatisfied gate', () => {
  it('1. returns true when bridge active + lock + candidates present', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: true,
      txResolutionLockedThisTurn: true,
      txCandidatesForResponse: COSTCO_CANDIDATES,
    })).toBe(true);
  });

  // ─── 7. B2C tx_search throws → satisfied=false ──────────────────────
  it('7. returns false when bridge active but lock not set (tx_search threw)', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: true,
      txResolutionLockedThisTurn: false,
      txCandidatesForResponse: null,
    })).toBe(false);
  });

  // ─── 8. B2C zero rows → satisfied=false ─────────────────────────────
  it('8. returns false when bridge active but zero candidates', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: true,
      txResolutionLockedThisTurn: false,
      txCandidatesForResponse: [],
    })).toBe(false);
  });

  // ─── 9. B2C error result → satisfied=false ──────────────────────────
  it('9. returns false when bridge active but candidates null (error result)', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: true,
      txResolutionLockedThisTurn: false,
      txCandidatesForResponse: null,
    })).toBe(false);
  });

  // ─── 10. Candidate persistence failure → satisfied=false ────────────
  it('10. returns false when bridge active, candidates exist, but lock not set (persist failed)', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: true,
      txResolutionLockedThisTurn: false,
      txCandidatesForResponse: COSTCO_CANDIDATES,
    })).toBe(false);
  });

  // ─── 11. Empty txCandidatesForResponse → satisfied=false ────────────
  it('11. returns false when bridge active + lock but empty candidates array', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: true,
      txResolutionLockedThisTurn: true,
      txCandidatesForResponse: [],
    })).toBe(false);
  });

  it('returns false when bridge not active (no MAC context)', () => {
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: false,
      txResolutionLockedThisTurn: true,
      txCandidatesForResponse: COSTCO_CANDIDATES,
    })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. tx_search removal after B2C satisfaction
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3B: tx_search tool stripping', () => {
  it('2. removes tx_search when b2cCandidatesSatisfied=true', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, false, true);
    expect(tools).not.toContain('tx_search');
    expect(tools).toContain('select_transaction');
    expect(tools).toContain('tx_get');
    expect(tools).toContain('merchant_analysis_refine');
  });

  // ─── 5. B2C tx_search executes exactly once (tx_search stripped) ────
  it('5/6. tx_search is absent from tools — model cannot call it again', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, false, true);
    expect(tools.filter(t => t === 'tx_search')).toHaveLength(0);
  });

  // ─── 12. Ordinary tx_search query unaffected ────────────────────────
  it('12. ordinary query: tx_search remains when neither gate is satisfied', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, false, false);
    expect(tools).toContain('tx_search');
    expect(tools).toEqual(PRIME_TOOLS);
  });

  // ─── 13. P3.3A merchant aggregation behavior unaffected ─────────────
  it('13. P3.3A: tx_search stripped when merchantAggSatisfied=true (independent of B2C)', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, true, false);
    expect(tools).not.toContain('tx_search');
    expect(tools).toContain('select_transaction');
  });

  it('both P3.3A and P3.3B satisfied — tx_search still stripped', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, true, true);
    expect(tools).not.toContain('tx_search');
  });

  // ─── B2C failure cases: tx_search remains ───────────────────────────
  it('tx_search remains when B2C fails (satisfied=false)', () => {
    const tools = computeToolsForModel(PRIME_TOOLS, false, false);
    expect(tools).toContain('tx_search');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3-4. Candidate context injection
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3B: candidate context injection', () => {
  it('3. injects candidate context when b2cCandidatesSatisfied=true', () => {
    const ctx = buildB2cCandidateContext(true, COSTCO_CANDIDATES);
    expect(ctx).not.toBeNull();
    expect(ctx).toContain('ACTIVE TRANSACTION CANDIDATES');
    expect(ctx).toContain('established by merchant bridge');
  });

  // ─── 4. Injected context includes required fields ───────────────────
  it('4. injected context includes ordinal, merchant, amount, date, category', () => {
    const ctx = buildB2cCandidateContext(true, COSTCO_CANDIDATES)!;

    // Check each candidate has its fields
    expect(ctx).toContain('[1]');
    expect(ctx).toContain('[8]');
    expect(ctx).toContain('COSTCO WHOLESALE');
    expect(ctx).toContain('COSTCO');
    expect(ctx).toContain('$190.27');
    expect(ctx).toContain('$415.23');
    expect(ctx).toContain('$249.15');
    expect(ctx).toContain('2026-05-04');
    expect(ctx).toContain('2025-12-18');
    expect(ctx).toContain('Groceries');
    expect(ctx).toContain('Restaurants / Dining');
  });

  it('injected context includes count and no-refetch instruction', () => {
    const ctx = buildB2cCandidateContext(true, COSTCO_CANDIDATES)!;
    expect(ctx).toContain('8 transactions found');
    expect(ctx).toContain('Do NOT call tx_search');
    expect(ctx).toContain('authoritative');
  });

  it('does not inject context when satisfied=false', () => {
    const ctx = buildB2cCandidateContext(false, COSTCO_CANDIDATES);
    expect(ctx).toBeNull();
  });

  it('does not inject context when candidates are null', () => {
    const ctx = buildB2cCandidateContext(true, null);
    expect(ctx).toBeNull();
  });

  it('handles single candidate correctly', () => {
    const single = [COSTCO_CANDIDATES[0]];
    const ctx = buildB2cCandidateContext(true, single)!;
    expect(ctx).toContain('[1]');
    expect(ctx).toContain('1 transactions found');
    expect(ctx).toContain('COSTCO WHOLESALE');
    expect(ctx).not.toContain('[2]');
  });

  it('does not expose internal UUIDs to model context', () => {
    const ctx = buildB2cCandidateContext(true, COSTCO_CANDIDATES)!;
    expect(ctx).not.toContain('uuid-1');
    expect(ctx).not.toContain('uuid-2');
    expect(ctx).not.toContain('uuid-8');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14-16. Preservation of other paths
// ─────────────────────────────────────────────────────────────────────────────
describe('P3.3B: path isolation', () => {
  // ─── 14. Historical candidate follow-up unaffected ──────────────────
  it('14. b2cCandidatesSatisfied is false when bridge not active (follow-up path)', () => {
    // Follow-up turns have shouldPreserveCandidates=true, which blocks
    // merchantAnalysisBridgeActive from being set (line 10078).
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: false,
      txResolutionLockedThisTurn: true,
      txCandidatesForResponse: COSTCO_CANDIDATES,
    })).toBe(false);
  });

  // ─── 15. Ordinal selection unaffected ───────────────────────────────
  it('15. ordinal selection: B2C gate is false (bridge inactive on preserved turns)', () => {
    // Ordinal turns have shouldPreserveCandidates=true → bridge inactive.
    // They use Phase 1D injection, not P3.3B.
    expect(computeB2cCandidatesSatisfied({
      merchantAnalysisBridgeActive: false,
      txResolutionLockedThisTurn: false,
      txCandidatesForResponse: null,
    })).toBe(false);
  });

  it('15b. ordinal turn tools: tx_search NOT stripped when only b2c=false', () => {
    // Ordinal turns retain tx_search (model has agency to re-search if needed).
    const tools = computeToolsForModel(PRIME_TOOLS, false, false);
    expect(tools).toContain('tx_search');
  });

  // ─── 16. Mutation/Tag paths unaffected ──────────────────────────────
  it('16. mutation paths: b2cCandidatesSatisfied does not affect select_transaction', () => {
    // Even when B2C strips tx_search, select_transaction remains available.
    const tools = computeToolsForModel(PRIME_TOOLS, false, true);
    expect(tools).toContain('select_transaction');
    expect(tools).toContain('tx_get');
  });

  it('16b. mutation tools always present regardless of B2C state', () => {
    const toolsSatisfied = computeToolsForModel(PRIME_TOOLS, false, true);
    const toolsUnsatisfied = computeToolsForModel(PRIME_TOOLS, false, false);
    // All tools except tx_search should be identical
    expect(toolsSatisfied.filter(t => t !== 'tx_search'))
      .toEqual(toolsUnsatisfied.filter(t => t !== 'tx_search'));
  });
});
