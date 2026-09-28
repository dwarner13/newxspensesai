/**
 * P3.1B — PRIME EVIDENCE RESOLVER
 *
 * Deterministic evidence resolution layer. For each pending evidence
 * requirement in a P3.1A contract, determines what authoritative
 * source/tool COULD satisfy it and what parameters are available.
 *
 * Produces a retrieval PLAN. Does NOT execute it.
 *
 * PLAN ONLY (P3.1B):
 * - Does NOT execute tools
 * - Does NOT query databases
 * - Does NOT call any model
 * - Does NOT alter Prime's behavior
 * - Produces telemetry only
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import {
  type PrimeIntent,
  type PrimeIntentClassification,
} from './prime-intent-classifier';
import type { FinancialQueryClassification } from './financial-query-classifier';
import {
  type PrimeEvidenceKind,
  type PrimeRuntimeEvidenceContract,
  type PrimeEvidenceRequirement,
  getEvidenceSource,
} from './prime-evidence-contract';
import type { PrimeTemporalScope } from './prime-temporal-scope';
import { toInclusiveEndDate } from './prime-temporal-scope';

// ─────────────────────────────────────────────────────────────────────────────
// MUTATION BLOCKLIST — these tools MUST NEVER appear in an evidence plan
// ─────────────────────────────────────────────────────────────────────────────

const MUTATION_TOOLS = new Set([
  'tx_update_category',
  'tag_update_transaction_category',
  'tx_update_amount',
  'tx_split',
  'approve_import',
  'delete_transaction',
  'create_rule',
  'tag_reclassify',
  'tag_bulk_fix',
  'select_transaction',
]);

// ─────────────────────────────────────────────────────────────────────────────
// PLAN TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EvidencePlanStepMode =
  | 'already_available'
  | 'tool'
  | 'context'
  | 'multi_source';

export interface PrimeEvidencePlanStep {
  evidenceKind: PrimeEvidenceKind;
  source: string;
  tool?: string;
  mode: EvidencePlanStepMode;
  /** Deterministic parameters from existing classifiers. May contain user
   *  values (merchant, amount, date) — MUST NOT appear in telemetry. */
  params?: Record<string, unknown>;
  authoritative: boolean;
}

export type EvidenceUnresolvedReason =
  | 'missing_capability'
  | 'missing_parameters'
  | 'ambiguous_request'
  | 'source_unavailable';

export interface PrimeEvidenceUnresolved {
  evidenceKind: PrimeEvidenceKind;
  reason: EvidenceUnresolvedReason;
}

export interface PrimeEvidencePlan {
  intent: PrimeIntent;
  steps: PrimeEvidencePlanStep[];
  unresolved: PrimeEvidenceUnresolved[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD EVIDENCE PLAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a deterministic evidence retrieval plan from a P3.1A contract.
 *
 * For each evidence requirement:
 * - Available  -> already_available step (no retrieval needed)
 * - Pending    -> resolves to tool/context/multi_source step or unresolved
 * - Unavailable -> unresolved with source_unavailable
 *
 * Does NOT execute tools, query databases, or change behavior.
 */
export function buildEvidencePlan(
  contract: PrimeRuntimeEvidenceContract,
  classification: PrimeIntentClassification,
): PrimeEvidencePlan {
  const steps: PrimeEvidencePlanStep[] = [];
  const unresolved: PrimeEvidenceUnresolved[] = [];
  const fc = classification.financialClassification;
  const ts = contract.temporalScope;

  for (const req of contract.requirements) {
    if (req.status === 'available') {
      steps.push(buildAvailableStep(req));
    } else if (req.status === 'unavailable') {
      unresolved.push({ evidenceKind: req.kind, reason: 'source_unavailable' });
    } else {
      // pending — attempt resolution
      const result = resolvePending(req, fc, ts);
      if (isStep(result)) {
        // Defense-in-depth: reject any mutation tool
        if (result.tool && MUTATION_TOOLS.has(result.tool)) {
          unresolved.push({ evidenceKind: req.kind, reason: 'source_unavailable' });
        } else {
          steps.push(result);
        }
      } else {
        unresolved.push(result);
      }
    }
  }

  return { intent: contract.intent, steps, unresolved };
}

function isStep(
  result: PrimeEvidencePlanStep | PrimeEvidenceUnresolved,
): result is PrimeEvidencePlanStep {
  return 'mode' in result;
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABLE STEP BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildAvailableStep(req: PrimeEvidenceRequirement): PrimeEvidencePlanStep {
  const source = getEvidenceSource(req.kind);
  return {
    evidenceKind: req.kind,
    source: source.description,
    mode: 'already_available',
    authoritative: source.authoritative,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING RESOLUTION — per evidence kind
// ─────────────────────────────────────────────────────────────────────────────

function resolvePending(
  req: PrimeEvidenceRequirement,
  fc?: FinancialQueryClassification,
  ts?: PrimeTemporalScope,
): PrimeEvidencePlanStep | PrimeEvidenceUnresolved {
  switch (req.kind) {
    case 'transaction_data':
      return resolveTransactionData(fc, ts);
    case 'category_aggregation':
      return resolveCategoryAggregation(fc, ts);
    case 'period_comparison':
      return resolvePeriodComparison(fc, ts);
    case 'cash_flow':
      return resolveCashFlow(fc, ts);
    case 'document_evidence':
      return {
        evidenceKind: 'document_evidence',
        source: 'Statement breakdown from imports.statement_breakdown_json',
        mode: 'context',
        authoritative: true,
      };
    case 'goal_state':
      // goalie_list_goals is not deployed as a callable Prime tool
      return { evidenceKind: 'goal_state', reason: 'source_unavailable' };
    case 'user_stated_fact':
      return {
        evidenceKind: 'user_stated_fact',
        source: 'Durable facts from user_memory_facts table',
        mode: 'context',
        authoritative: false,
      };
    case 'calculation_inputs':
      return resolveCalculationInputs(fc);
    case 'candidate_identity':
      return {
        evidenceKind: 'candidate_identity',
        source: 'Layer 1/2 transaction identity resolution',
        mode: 'context',
        authoritative: true,
      };
    case 'conversation_context':
      return {
        evidenceKind: 'conversation_context',
        source: 'Session-scoped chat history from chat_messages',
        mode: 'context',
        authoritative: true,
      };
    case 'product_knowledge':
      // Should always be available but handle defensively
      return {
        evidenceKind: 'product_knowledge',
        source: 'Prime product/app knowledge from system prompt',
        mode: 'already_available',
        authoritative: true,
      };
    case 'general_knowledge':
      return {
        evidenceKind: 'general_knowledge',
        source: 'Model general knowledge (education, definitions)',
        mode: 'already_available',
        authoritative: false,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL EVIDENCE RESOLVERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve transaction_data evidence.
 * Uses existing FinancialQueryClassification dimensions (merchantHint,
 * resolvedCategory, years, exactDate, exactAmount, requestedCount).
 * When temporal scope is available and deterministic, includes date range.
 * Does NOT duplicate any extraction logic.
 */
function resolveTransactionData(
  fc?: FinancialQueryClassification,
  ts?: PrimeTemporalScope,
): PrimeEvidencePlanStep | PrimeEvidenceUnresolved {
  if (!fc || !fc.requiresGrounding) {
    return { evidenceKind: 'transaction_data', reason: 'missing_parameters' };
  }

  const params: Record<string, unknown> = {};
  if (fc.merchantHint) params.q = fc.merchantHint;
  if (fc.resolvedCategory) {
    params.category = fc.resolvedCategory.category;
    if (fc.resolvedCategory.subcategory) {
      params.subcategory = fc.resolvedCategory.subcategory;
    }
  }
  // Prefer deterministic temporal scope over bare year
  if (ts?.primary && ts.primary.confidence === 'deterministic') {
    params.startDate = ts.primary.from;
    params.endDate = toInclusiveEndDate(ts.primary.to);
  } else if (fc.years.length > 0) {
    params.year = fc.years[0];
  }
  if (fc.exactDate) params.exactDate = fc.exactDate;
  if (fc.exactAmount !== undefined) params.exactAmount = fc.exactAmount;
  if (fc.requestedCount !== undefined) params.limit = fc.requestedCount;

  return {
    evidenceKind: 'transaction_data',
    source: 'Transaction rows from authoritative transactions table',
    tool: 'tx_search',
    mode: 'tool',
    params: Object.keys(params).length > 0 ? params : undefined,
    authoritative: true,
  };
}

/**
 * Resolve category_aggregation evidence.
 * Can always be planned — tool accepts optional category/year filters.
 * When temporal scope is available and deterministic, includes date range.
 */
function resolveCategoryAggregation(
  fc?: FinancialQueryClassification,
  ts?: PrimeTemporalScope,
): PrimeEvidencePlanStep {
  const params: Record<string, unknown> = {};
  if (fc?.resolvedCategory) {
    params.category = fc.resolvedCategory.category;
    if (fc.resolvedCategory.subcategory) {
      params.subcategory = fc.resolvedCategory.subcategory;
    }
  }
  // Prefer deterministic temporal scope over bare year
  if (ts?.primary && ts.primary.confidence === 'deterministic') {
    params.startDate = ts.primary.from;
    params.endDate = toInclusiveEndDate(ts.primary.to);
  } else if (fc && fc.years.length > 0) {
    params.year = fc.years[0];
  }

  return {
    evidenceKind: 'category_aggregation',
    source: 'Category spend totals aggregated from transactions',
    tool: 'transaction_category_totals',
    mode: 'tool',
    params: Object.keys(params).length > 0 ? params : undefined,
    authoritative: true,
  };
}

/**
 * P3.2A: Resolve cash_flow evidence to cash_flow_summary tool.
 * Requires deterministic temporal scope.
 */
function resolveCashFlow(
  fc?: FinancialQueryClassification,
  ts?: PrimeTemporalScope,
): PrimeEvidencePlanStep | PrimeEvidenceUnresolved {
  // Prefer deterministic temporal scope
  if (ts?.primary && ts.primary.confidence === 'deterministic') {
    return {
      evidenceKind: 'cash_flow',
      source: 'Income vs expense aggregation from transactions',
      tool: 'cash_flow_summary',
      mode: 'tool',
      params: {
        startDate: ts.primary.from,
        endDate: toInclusiveEndDate(ts.primary.to),
      },
      authoritative: true,
    };
  }

  // Bare year fallback
  if (fc && fc.years.length > 0) {
    const year = fc.years[0];
    return {
      evidenceKind: 'cash_flow',
      source: 'Income vs expense aggregation from transactions',
      tool: 'cash_flow_summary',
      mode: 'tool',
      params: {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      },
      authoritative: true,
    };
  }

  // Cannot determine date range
  return { evidenceKind: 'cash_flow', reason: 'ambiguous_request' };
}

/**
 * Resolve period_comparison evidence.
 * Requires two deterministic periods. Uses temporal scope when available.
 * If two explicit years or two temporal periods are present, produces a
 * multi_source plan. Otherwise: ambiguous.
 */
function resolvePeriodComparison(
  fc?: FinancialQueryClassification,
  ts?: PrimeTemporalScope,
): PrimeEvidencePlanStep | PrimeEvidenceUnresolved {
  // P3.1A.1: Two deterministic temporal periods → multi-source
  if (
    ts?.primary && ts?.comparison &&
    ts.primary.confidence === 'deterministic' &&
    ts.comparison.confidence === 'deterministic'
  ) {
    return {
      evidenceKind: 'period_comparison',
      source: 'Comparison of two time periods (requires multiple tool calls)',
      tool: 'transaction_category_totals',
      mode: 'multi_source',
      params: {
        periodA_startDate: ts.primary.from,
        periodA_endDate: toInclusiveEndDate(ts.primary.to),
        periodB_startDate: ts.comparison.from,
        periodB_endDate: toInclusiveEndDate(ts.comparison.to),
      },
      authoritative: true,
    };
  }

  // Legacy: Two explicit years + comparison signal → deterministic multi-source
  if (fc?.scope?.isComparison && fc.years.length >= 2) {
    return {
      evidenceKind: 'period_comparison',
      source: 'Comparison of two time periods (requires multiple tool calls)',
      tool: 'transaction_category_totals',
      mode: 'multi_source',
      params: {
        periodA_year: fc.years[0],
        periodB_year: fc.years[1],
      },
      authoritative: true,
    };
  }

  // Cannot deterministically establish comparison period
  return { evidenceKind: 'period_comparison', reason: 'ambiguous_request' };
}

/**
 * Resolve calculation_inputs evidence.
 * If the financial classifier found explicit numeric values in the message,
 * inputs are available from context. Otherwise: missing_parameters.
 */
function resolveCalculationInputs(
  fc?: FinancialQueryClassification,
): PrimeEvidencePlanStep | PrimeEvidenceUnresolved {
  if (fc?.exactAmount !== undefined) {
    return {
      evidenceKind: 'calculation_inputs',
      source: 'Verified numeric inputs from message or memory',
      mode: 'context',
      authoritative: false,
    };
  }

  return { evidenceKind: 'calculation_inputs', reason: 'missing_parameters' };
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY — safe log payload (no PII, no financial values, no params)
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidencePlanTelemetry {
  intent: string;
  stepCount: number;
  unresolvedCount: number;
  stepKinds: string[];
  stepModes: string[];
  stepTools: string[];
  stepAuthoritative: boolean[];
  unresolvedKinds: string[];
  unresolvedReasons: string[];
}

/**
 * Extract a safe telemetry payload from an evidence plan.
 * Contains only structural metadata — no params, no PII, no financial values.
 */
export function buildEvidencePlanTelemetry(
  plan: PrimeEvidencePlan,
): EvidencePlanTelemetry {
  return {
    intent: plan.intent,
    stepCount: plan.steps.length,
    unresolvedCount: plan.unresolved.length,
    stepKinds: plan.steps.map(s => s.evidenceKind),
    stepModes: plan.steps.map(s => s.mode),
    stepTools: plan.steps.filter(s => s.tool).map(s => s.tool!),
    stepAuthoritative: plan.steps.map(s => s.authoritative),
    unresolvedKinds: plan.unresolved.map(u => u.evidenceKind),
    unresolvedReasons: plan.unresolved.map(u => u.reason),
  };
}
