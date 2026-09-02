/**
 * FINANCIAL GROUNDING ENFORCER (Phase 1B.2)
 *
 * Server-enforced financial grounding for Prime.
 *
 * The model may decide HOW to explain data.
 * The model must NOT decide WHETHER grounding is optional.
 *
 * This module provides:
 * 1. Evidence tracking (did an authoritative read tool actually execute?)
 * 2. False-zero detection (does the response claim zero without verified_zero?)
 * 3. Pre-execution tool resolution (which tool + args should run for this query?)
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import { type QueryResultStatus } from './financial-taxonomy';
import {
  classifyFinancialQuery,
  type FinancialQueryClassification,
  type FinancialQueryType,
} from './financial-query-classifier';
import { type TaxSummaryContext } from './tool-gate';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface FinancialEvidence {
  /** Was this answer backed by authoritative financial data? */
  grounded: boolean;
  /** Which tool provided the evidence? */
  toolName?: 'tax_summary' | 'tx_search';
  /** The query result status from the tool */
  queryStatus?: QueryResultStatus;
  /** The classification that triggered grounding */
  classification?: FinancialQueryClassification;
  /** Was the evidence sourced from context rather than a tool call? */
  fromContext?: boolean;
}

export interface PreExecutionPlan {
  /** Should the server pre-execute an authoritative read before the LLM responds? */
  shouldPreExecute: boolean;
  /** Which tool to pre-execute */
  toolName?: 'tax_summary' | 'tx_search';
  /** Arguments for the pre-execution call */
  toolArgs?: Record<string, any>;
  /** The classification that produced this plan */
  classification: FinancialQueryClassification;
}

// ─────────────────────────────────────────────────────────────────────────────
// FALSE-ZERO DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/** Patterns that assert zero/none/no-data for the user's finances. */
const FALSE_ZERO_PATTERNS = [
  /no recorded (expense|transaction|spending|charge|purchase|payment)/i,
  /no .*(expense|transaction|spending|charge|purchase|payment)s? (found|recorded|in|for|during)/i,
  /\$0(\.00)?\b/,
  /zero (expense|transaction|spending|charge|purchase|payment)/i,
  /none found/i,
  /no transactions (found|matching|recorded|in|for)/i,
  /didn'?t (find|have|see|record|show) any/i,
  /there (were|are|is) no/i,
  /you (didn'?t|haven'?t|don'?t) (have|spend|pay|buy)/i,
  /no .* were (found|recorded)/i,
  /i (couldn'?t|can'?t|didn'?t) find any/i,
];

/**
 * Detect if a response asserts a zero/none claim about the user's financial data.
 */
export function detectsFalseZero(response: string): boolean {
  if (!response) return false;
  return FALSE_ZERO_PATTERNS.some(pattern => pattern.test(response));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT SUFFICIENCY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if authoritative context already contains the exact answer.
 * If so, no tool call is needed — the context IS the evidence.
 */
export function isAnswerInContext(
  classification: FinancialQueryClassification,
  taxSummary: TaxSummaryContext[],
  contextYear: number,
): FinancialEvidence | null {
  if (!classification.requiresGrounding) return null;
  if (!taxSummary || taxSummary.length === 0) return null;

  // Merchant queries can't be answered from tax summary
  if (classification.queryType === 'merchant') return null;

  // Detail queries can't be answered from tax summary
  if (classification.queryType === 'detail') return null;

  // Comparisons or multi-year queries can't be answered from single-year context
  if (classification.scope.isComparison) return null;
  if (classification.years.length > 0 && !classification.years.every(y => y === contextYear)) return null;

  // If we have a resolved category, check if its exact value is in context
  if (classification.resolvedCategory) {
    const resolved = classification.resolvedCategory;
    for (const section of taxSummary) {
      if (!section?.section) continue;

      // Check subcategory match (most precise)
      // Normalize separators: "Gas & Fuel" == "Gas / Fuel"
      if (resolved.subcategory && Array.isArray(section.topSubcategories)) {
        const normSub = resolved.subcategory.toLowerCase().replace(/[&\/]/g, '').replace(/\s+/g, ' ');
        for (const sub of section.topSubcategories) {
          const normCtx = (sub?.name || '').toLowerCase().replace(/[&\/]/g, '').replace(/\s+/g, ' ');
          if (normCtx === normSub) {
            return {
              grounded: true,
              toolName: 'tax_summary',
              queryStatus: 'verified',
              classification,
              fromContext: true,
            };
          }
        }
      }

      // Check section match (only if no subcategory was resolved — broader scope)
      if (!resolved.subcategory && section.section.toLowerCase() === resolved.category.toLowerCase()) {
        return {
          grounded: true,
          toolName: 'tax_summary',
          queryStatus: 'verified',
          classification,
          fromContext: true,
        };
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-EXECUTION PLANNING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine what tool should be pre-executed before the LLM responds.
 *
 * Called when:
 * - Query requires grounding
 * - Context doesn't already contain the answer
 *
 * Returns a plan with the exact tool + args to execute.
 */
export function buildPreExecutionPlan(
  classification: FinancialQueryClassification,
  contextYear: number,
): PreExecutionPlan {
  if (!classification.requiresGrounding) {
    return { shouldPreExecute: false, classification };
  }

  const year = classification.years.length > 0
    ? classification.years[0]
    : contextYear;

  // ── Aggregate queries → prefer tax_summary ──
  if (classification.queryType === 'aggregate' && classification.resolvedCategory) {
    return {
      shouldPreExecute: true,
      toolName: 'tax_summary',
      toolArgs: { year },
      classification,
    };
  }

  // ── Aggregate without resolved category → still try tax_summary ──
  if (classification.queryType === 'aggregate') {
    return {
      shouldPreExecute: true,
      toolName: 'tax_summary',
      toolArgs: { year },
      classification,
    };
  }

  // ── Merchant queries → tx_search with q ──
  if (classification.queryType === 'merchant' && classification.merchantHint) {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return {
      shouldPreExecute: true,
      toolName: 'tx_search',
      toolArgs: {
        q: classification.merchantHint,
        startDate,
        endDate,
        limit: 25,
      },
      classification,
    };
  }

  // ── Detail queries → tx_search with category ──
  if (classification.queryType === 'detail') {
    const args: Record<string, any> = { limit: 25 };
    if (classification.resolvedCategory) {
      args.category = classification.resolvedCategory.category;
      if (classification.resolvedCategory.subcategory) {
        args.subcategory = classification.resolvedCategory.subcategory;
      }
    }
    // Don't set date range for detail — the user may have mentioned a specific month
    return {
      shouldPreExecute: true,
      toolName: 'tx_search',
      toolArgs: args,
      classification,
    };
  }

  // Fallback: aggregate with tax_summary
  return {
    shouldPreExecute: true,
    toolName: 'tax_summary',
    toolArgs: { year },
    classification,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST-ANSWER VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate a final answer against financial grounding requirements.
 *
 * Returns:
 * - null if the answer is acceptable
 * - a reason string if the answer should be rejected
 */
export function validateGroundedAnswer(
  response: string,
  evidence: FinancialEvidence,
  classification: FinancialQueryClassification,
): string | null {
  // Non-financial queries don't need validation
  if (!classification.requiresGrounding) return null;

  // If we have evidence and it's grounded, check for false-zero
  if (evidence.grounded) {
    if (detectsFalseZero(response) && evidence.queryStatus !== 'verified_zero') {
      return 'false_zero_without_evidence';
    }
    return null; // Grounded answer, no false-zero → acceptable
  }

  // Ungrounded financial answer
  if (detectsFalseZero(response)) {
    return 'false_zero_ungrounded';
  }

  // Ungrounded but not claiming zero — still problematic but not a hard stop
  return 'ungrounded_financial_claim';
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE: FULL PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the system message that injects pre-executed evidence into the prompt.
 *
 * This replaces the "AUTHORITATIVE" directive with ACTUAL data from a real
 * tool execution, not frontend context that may be stale/loading.
 */
export function buildEvidenceSystemMessage(
  toolName: string,
  toolResult: any,
  classification: FinancialQueryClassification,
): string {
  const lines: string[] = [];
  lines.push(`FINANCIAL EVIDENCE (server-verified, from ${toolName}):`);

  if (toolName === 'tax_summary') {
    const sections = toolResult?.sections || toolResult?.data?.sections || [];
    if (Array.isArray(sections) && sections.length > 0) {
      for (const section of sections) {
        if (!section?.title) continue;
        lines.push(`- ${section.title}: $${(section.total || 0).toFixed(2)} (${section.count || 0} transactions)`);
        if (Array.isArray(section.buckets)) {
          for (const bucket of section.buckets) {
            if (!bucket?.label) continue;
            lines.push(`  - ${bucket.label}: $${(bucket.amount || 0).toFixed(2)} (${bucket.count || 0} txns)`);
          }
        }
      }
      lines.push('');
      lines.push('queryStatus: verified');
    } else {
      lines.push('No data returned from tax_summary.');
      lines.push('queryStatus: verified_zero');
    }
  } else if (toolName === 'tx_search') {
    const rows = toolResult?.rows || [];
    const totals = toolResult?.totals || {};
    const queryStatus = toolResult?.queryStatus || 'verified';
    lines.push(`queryStatus: ${queryStatus}`);
    lines.push(`Rows: ${rows.length}, Total spending: $${(totals.spending || 0).toFixed(2)}`);
    if (toolResult?.resolvedCategory) {
      lines.push(`Resolved: ${JSON.stringify(toolResult.resolvedCategory)}`);
    }
  }

  // ── Grounding directive ──
  if (classification.resolvedCategory) {
    const cat = classification.resolvedCategory;
    const label = cat.subcategory
      ? `${cat.subcategory} (${cat.category})`
      : cat.category;
    lines.push('');
    lines.push(`The user is asking about "${label}". Use the evidence above to answer.`);
    lines.push('If queryStatus=verified, report the real numbers confidently.');
    lines.push('If queryStatus=verified_zero, truthfully report zero.');
    lines.push('NEVER claim zero unless queryStatus is verified_zero.');
  }

  return lines.join('\n');
}
