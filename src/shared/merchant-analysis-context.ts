/**
 * P3.2B2A — MERCHANT ANALYSIS CONTEXT
 *
 * Session-scoped, read-only analytical context that preserves merchant
 * query state across conversational turns. Persisted in
 * chat_sessions.context.merchant_analysis (JSONB).
 *
 * SAFETY INVARIANTS:
 * - NEVER authorizes mutations. Merchant context is analytical only.
 * - Does NOT persist totals as reusable financial truth.
 *   Totals come from fresh merchant_totals evidence each turn.
 * - Does NOT establish canonical merchant families or aliases.
 * - Partial evidence is marked — groups are NOT treated as exhaustive.
 * - TTL-enforced: stale context is ignored.
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TTL
// ─────────────────────────────────────────────────────────────────────────────

/** Merchant analysis context expires after 30 minutes of inactivity. */
export const MERCHANT_ANALYSIS_TTL_MS = 30 * 60 * 1000;

/** Maximum number of groups tracked in context. */
export const MAX_ACTIVE_GROUPS = 50;

/** Maximum number of excluded groups. */
export const MAX_EXCLUDED_GROUPS = 20;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface MerchantGroupRef {
  /** Deterministic grouping key from merchantGroupingKey() */
  groupingKey: string;
  /** Most-frequent raw merchant name variant (display label) */
  displayName: string;
}

export interface MerchantAnalysisContext {
  /** The merchant ilike filter that produced the current groups (e.g., "Costco") */
  merchantQuery: string;

  /** Groups returned by the last merchant_totals execution.
   *  Does NOT contain totals — those must come from fresh evidence. */
  activeGroups: MerchantGroupRef[];

  /** Groups explicitly excluded by user refinement (groupingKeys).
   *  Validated against activeGroups before use. */
  excludedGroups: string[];

  /** Temporal scope active during the last merchant query, if any. */
  temporalScope: {
    startDate: string;
    endDate: string;
  } | null;

  /** Category filter active during the last merchant query, if any. */
  categoryFilter: string | null;

  /** Whether the last evidence execution returned complete data.
   *  When false, activeGroups should NOT be treated as exhaustive. */
  evidenceComplete: boolean;

  /** ISO timestamp of last update. Used for TTL enforcement. */
  updatedAt: string;

  /** P3.2B2C parity: fingerprint of the exact rows behind the last merchant
   *  total (count, |amount| total, id-set hash). Scope verification only —
   *  never a source of transaction identity. Absent on older contexts. */
  evidence?: { count: number; total: number; idsHash: string } | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the context is within TTL and structurally valid.
 */
export function isMerchantAnalysisContextValid(
  mac: MerchantAnalysisContext | undefined | null,
): mac is MerchantAnalysisContext {
  if (!mac || typeof mac !== 'object') return false;
  if (!mac.merchantQuery || typeof mac.merchantQuery !== 'string') return false;
  if (!Array.isArray(mac.activeGroups)) return false;
  if (!mac.updatedAt) return false;

  const age = Date.now() - new Date(mac.updatedAt).getTime();
  if (age > MERCHANT_ANALYSIS_TTL_MS || isNaN(age)) return false;

  return true;
}

/**
 * Validate that a set of proposed exclude groupingKeys all exist
 * in the known active groups. Returns only validated keys.
 * Prevents the model from inventing groupingKeys.
 */
export function validateExcludeGroups(
  proposed: string[],
  activeGroups: MerchantGroupRef[],
): string[] {
  if (!proposed || !Array.isArray(proposed) || proposed.length === 0) return [];
  const knownKeys = new Set(activeGroups.map(g => g.groupingKey));
  return proposed
    .filter(k => typeof k === 'string' && knownKeys.has(k))
    .slice(0, MAX_EXCLUDED_GROUPS);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a MerchantAnalysisContext from a merchant_totals execution result.
 * Extracts group references only — does NOT persist totals.
 */
export function buildMerchantAnalysisContext(
  merchantQuery: string,
  merchantResults: Array<{ merchant: string; groupingKey: string }>,
  opts: {
    excludedGroups?: string[];
    temporalScope?: { startDate: string; endDate: string } | null;
    categoryFilter?: string | null;
    evidenceComplete: boolean;
    evidence?: { count: number; total: number; idsHash: string } | null;
  },
): MerchantAnalysisContext {
  return {
    merchantQuery,
    activeGroups: merchantResults
      .slice(0, MAX_ACTIVE_GROUPS)
      .map(m => ({ groupingKey: m.groupingKey, displayName: m.merchant })),
    excludedGroups: (opts.excludedGroups || []).slice(0, MAX_EXCLUDED_GROUPS),
    temporalScope: opts.temporalScope || null,
    categoryFilter: opts.categoryFilter || null,
    evidenceComplete: opts.evidenceComplete,
    updatedAt: new Date().toISOString(),
    evidence: opts.evidence ?? null,
  };
}

/**
 * P3.2B2C parity: the temporal scope of a merchant analysis is the date range the
 * EXECUTED merchant_totals evidence-plan step actually ran with (the executor copies
 * step.params.startDate/endDate verbatim into the tool args). Returns null when no
 * single-call merchant_totals step carries a complete startDate/endDate pair.
 */
export function merchantTemporalScopeFromPlanSteps(
  steps: ReadonlyArray<{ tool?: string; mode?: string; params?: Record<string, unknown> }> | null | undefined,
): { startDate: string; endDate: string } | null {
  const step = (steps || []).find(s => s.tool === 'merchant_totals' && s.mode === 'tool');
  const startDate = step?.params?.startDate;
  const endDate = step?.params?.endDate;
  return typeof startDate === 'string' && startDate && typeof endDate === 'string' && endDate
    ? { startDate, endDate }
    : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT FORMATTING (for model injection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format the merchant analysis context for injection into Prime's
 * system message. Returns empty string if context is invalid/stale.
 */
export function formatMerchantAnalysisContext(
  mac: MerchantAnalysisContext | undefined | null,
): string {
  if (!isMerchantAnalysisContextValid(mac)) return '';

  const lines: string[] = ['ACTIVE MERCHANT ANALYSIS CONTEXT:'];
  lines.push(`Merchant query: "${mac.merchantQuery}"`);

  if (mac.temporalScope) {
    lines.push(`Period: ${mac.temporalScope.startDate} to ${mac.temporalScope.endDate}`);
  }
  if (mac.categoryFilter) {
    lines.push(`Category filter: ${mac.categoryFilter}`);
  }

  if (!mac.evidenceComplete) {
    lines.push('NOTE: Evidence was partial — groups below may not be exhaustive.');
  }

  lines.push(`Merchant groups (${mac.activeGroups.length}):`);
  for (const g of mac.activeGroups) {
    const excluded = mac.excludedGroups.includes(g.groupingKey);
    lines.push(`  ${excluded ? '[EXCLUDED] ' : ''}${g.displayName} (key: ${g.groupingKey})`);
  }

  if (mac.excludedGroups.length > 0) {
    lines.push(`Excluded groups: ${mac.excludedGroups.join(', ')}`);
  }

  lines.push('');
  lines.push('REFINEMENT: Use the merchant_analysis_refine tool for follow-up operations:');
  lines.push('- "take out gas" → merchant_analysis_refine({operation:"exclude", targets:["<groupingKey>"]})');
  lines.push('- "only gas" → merchant_analysis_refine({operation:"only", targets:["<groupingKey>"]})');
  lines.push('- "include gas again" → merchant_analysis_refine({operation:"include", targets:["<groupingKey>"]})');
  lines.push('- "now just May" → merchant_analysis_refine({operation:"refresh", startDate:"2026-05-01", endDate:"2026-05-31"})');
  lines.push('- "compare with April" → call merchant_analysis_refine for the current period,');
  lines.push('  then call merchant_totals for the comparison period with the same merchant and excludeGroups.');
  lines.push('Targets MUST be exact groupingKey values from the list above. Do NOT invent groupingKeys.');
  lines.push('Totals must come from fresh tool evidence, not from this context.');
  lines.push('This context does NOT authorize any mutation.');

  return lines.join('\n');
}
