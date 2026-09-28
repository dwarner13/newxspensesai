/**
 * P3.1D — PRIME EVIDENCE VALIDATOR
 *
 * Post-stream DETECTION / TELEMETRY ONLY.
 *
 * This module checks whether the model's response appears consistent with
 * the evidence that was available. It does NOT modify, suppress, retry,
 * or replace any content — the user has already seen the streamed response.
 *
 * Detection is intentionally narrow:
 * - Dollar amounts when evidence was insufficient
 * - "$0" claims when evidence was successful_empty
 * - Obvious comparison markers when comparison evidence was incomplete
 *
 * False positives are acceptable because detection has NO customer-facing effect.
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import type { EvidenceSufficiency } from './prime-evidence-executor';
import { classifyEvidenceShape, type EvidenceShape } from './prime-evidence-executor';

// ─────────────────────────────────────────────────────────────────────────────
// ACCUMULATED EVIDENCE (request-scoped)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tools whose successful results may be tracked as accumulated evidence.
 * Only read tools — mutations MUST NEVER become financial evidence.
 */
export const EVIDENCE_ACCUMULATOR_ELIGIBLE_TOOLS = new Set([
  'tx_search',
  'transaction_category_totals',
  'cash_flow_summary',
]);

export interface AccumulatedEvidenceEntry {
  tool: string;
  status: 'resolved' | 'successful_empty';
  rowCount: number;
}

/** Request-scoped accumulated evidence map. Keyed by evidence kind. */
export type AccumulatedEvidenceMap = Map<string, AccumulatedEvidenceEntry>;

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION RESULT
// ─────────────────────────────────────────────────────────────────────────────

export type EvidenceViolationType =
  | 'dollar_amount_when_insufficient'
  | 'zero_dollar_from_empty'
  | 'comparison_without_both_periods';

export interface EvidenceViolationResult {
  violated: boolean;
  type?: EvidenceViolationType;
  evidenceShape: EvidenceShape;
  sufficiency: EvidenceSufficiency;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION PATTERNS (intentionally narrow)
// ─────────────────────────────────────────────────────────────────────────────

/** Matches dollar amounts like $1,234.56 or $0.00 or $50 */
const DOLLAR_AMOUNT_PATTERN = /\$\d[\d,]*(?:\.\d{1,2})?/;

/** Matches explicit zero-dollar claims */
const ZERO_DOLLAR_PATTERN = /\$0(?:\.00)?\b/;

// ─────────────────────────────────────────────────────────────────────────────
// DETECTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect potential evidence violations in a model response.
 *
 * DETECTION / TELEMETRY ONLY — does NOT modify or suppress the response.
 * The user has already seen the streamed content.
 *
 * @param response - The model's complete response text
 * @param sufficiency - The overall evidence sufficiency (initial or final)
 * @param shape - The evidence shape classification
 */
export function detectEvidenceViolation(
  response: string,
  sufficiency: EvidenceSufficiency,
  shape: EvidenceShape,
): EvidenceViolationResult {
  const base: EvidenceViolationResult = { violated: false, evidenceShape: shape, sufficiency };

  if (!response || shape === 'no_executable_evidence') return base;

  // Insufficient evidence but response contains specific dollar amounts
  if (sufficiency === 'insufficient' || shape === 'all_failed') {
    if (DOLLAR_AMOUNT_PATTERN.test(response)) {
      return { ...base, violated: true, type: 'dollar_amount_when_insufficient' };
    }
  }

  // Successful empty but response claims $0
  if (shape === 'successful_empty') {
    if (ZERO_DOLLAR_PATTERN.test(response)) {
      return { ...base, violated: true, type: 'zero_dollar_from_empty' };
    }
  }

  // Partial comparison but response uses comparison language
  // Intentionally narrow: only flag when "more than" or "less than" appears
  // near a financial term, suggesting a cross-period comparison claim
  if (shape === 'partial_comparison') {
    const comparisonNearFinancial = /(?:spent|spending|expenses?)\s+(?:more|less)\s+(?:than|in|compared)/i;
    if (comparisonNearFinancial.test(response)) {
      return { ...base, violated: true, type: 'comparison_without_both_periods' };
    }
  }

  return base;
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidenceViolationTelemetry {
  violated: boolean;
  type: string | null;
  evidenceShape: string;
  sufficiency: string;
}

export function buildEvidenceViolationTelemetry(
  result: EvidenceViolationResult,
): EvidenceViolationTelemetry {
  return {
    violated: result.violated,
    type: result.type ?? null,
    evidenceShape: result.evidenceShape,
    sufficiency: result.sufficiency,
  };
}
