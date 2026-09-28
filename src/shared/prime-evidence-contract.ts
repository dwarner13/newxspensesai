/**
 * P3.1A — PRIME RUNTIME EVIDENCE CONTRACT
 *
 * Adapts P3.0A shadow intent classifications into structured runtime
 * evidence contracts with typed evidence kinds and passive status tracking.
 *
 * OBSERVATIONAL ONLY (P3.1A):
 * - Does NOT execute tools
 * - Does NOT query databases
 * - Does NOT alter Prime's behavior
 * - Does NOT inject prompts or change model context
 * - Produces telemetry only
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

import {
  PrimeIntent,
  type IntentConfidence,
  type PrimeIntentClassification,
} from './prime-intent-classifier';
import type { PrimeTemporalScope } from './prime-temporal-scope';

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE KIND — small stable vocabulary
// ─────────────────────────────────────────────────────────────────────────────

export type PrimeEvidenceKind =
  | 'transaction_data'
  | 'category_aggregation'
  | 'period_comparison'
  | 'cash_flow'
  | 'document_evidence'
  | 'goal_state'
  | 'user_stated_fact'
  | 'calculation_inputs'
  | 'candidate_identity'
  | 'conversation_context'
  | 'product_knowledge'
  | 'general_knowledge';

export type PrimeEvidenceStatus = 'pending' | 'available' | 'unavailable';

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME EVIDENCE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

export interface PrimeEvidenceRequirement {
  kind: PrimeEvidenceKind;
  required: boolean;
  status: PrimeEvidenceStatus;
  /** Which tool or data source could satisfy this (descriptive only). */
  source?: string;
}

export interface PrimeRuntimeEvidenceContract {
  intent: PrimeIntent;
  confidence: IntentConfidence;
  requirements: PrimeEvidenceRequirement[];
  forbidden: string[];
  /** Canonical temporal scope extracted from the user message (P3.1A.1). */
  temporalScope?: PrimeTemporalScope;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE SOURCE REGISTRY — describes current capabilities (no execution)
// ─────────────────────────────────────────────────────────────────────────────

interface EvidenceSourceDescriptor {
  tool: string | null;
  description: string;
  authoritative: boolean;
}

const EVIDENCE_SOURCE_REGISTRY: Record<PrimeEvidenceKind, EvidenceSourceDescriptor> = {
  transaction_data: {
    tool: 'tx_search',
    description: 'Transaction rows from authoritative transactions table',
    authoritative: true,
  },
  category_aggregation: {
    tool: 'transaction_category_totals',
    description: 'Category spend totals aggregated from transactions',
    authoritative: true,
  },
  period_comparison: {
    tool: null,
    description: 'Comparison of two time periods (requires multiple tool calls)',
    authoritative: true,
  },
  cash_flow: {
    tool: null,
    description: 'Income vs expense aggregation (no single tool yet)',
    authoritative: true,
  },
  document_evidence: {
    tool: null,
    description: 'Statement breakdown from imports.statement_breakdown_json',
    authoritative: true,
  },
  goal_state: {
    tool: 'goalie_list_goals',
    description: 'Current goal progress from goals table',
    authoritative: true,
  },
  user_stated_fact: {
    tool: null,
    description: 'Durable facts from user_memory_facts table',
    authoritative: false,
  },
  calculation_inputs: {
    tool: null,
    description: 'Verified numeric inputs from memory or user for deterministic math',
    authoritative: false,
  },
  candidate_identity: {
    tool: 'select_transaction',
    description: 'Layer 1/2 transaction identity resolution',
    authoritative: true,
  },
  conversation_context: {
    tool: null,
    description: 'Session-scoped chat history from chat_messages',
    authoritative: true,
  },
  product_knowledge: {
    tool: null,
    description: 'Prime product/app knowledge from system prompt',
    authoritative: true,
  },
  general_knowledge: {
    tool: null,
    description: 'Model general knowledge (education, definitions)',
    authoritative: false,
  },
};

/** Look up the source descriptor for an evidence kind. */
export function getEvidenceSource(kind: PrimeEvidenceKind): EvidenceSourceDescriptor {
  return EVIDENCE_SOURCE_REGISTRY[kind];
}

// ─────────────────────────────────────────────────────────────────────────────
// P3.0A LABEL → P3.1A KIND MAPPING
// ─────────────────────────────────────────────────────────────────────────────

// Maps P3.0A semantic labels (strings in required/allowed/forbidden) to typed
// evidence kinds. Labels that represent architectural guarantees (not evidence)
// or routing actions (not data) map to null and are excluded from requirements.

const LABEL_TO_KINDS: Record<string, PrimeEvidenceKind[]> = {
  // Required labels
  'authoritative_financial_data': ['transaction_data', 'category_aggregation'],
  'verified_calculation_inputs': ['calculation_inputs'],
  'deterministic_calculator': ['calculation_inputs'],
  'document_import_evidence': ['document_evidence'],
  'goal_data': ['goal_state'],
  'authoritative_target': ['candidate_identity'],
  'current_candidate_state': ['candidate_identity'],
  'conversation_history': ['conversation_context'],
  'product_knowledge': ['product_knowledge'],

  // Allowed labels
  'user_memory_facts': ['user_stated_fact'],
  'candidate_frame': ['candidate_identity'],
  'general_knowledge': ['general_knowledge'],
  'analytics_tools': ['category_aggregation'],
  'loan_snapshots': ['user_stated_fact'],
  'select_transaction': ['candidate_identity'],
};

// Labels that are not evidence (architectural guarantees or routing actions).
// These are intentionally excluded from requirements — they are not data to retrieve.
const NON_EVIDENCE_LABELS = new Set([
  'confirmation_architecture',
  'request_employee_handoff',
]);

function resolveLabel(label: string): PrimeEvidenceKind[] {
  if (NON_EVIDENCE_LABELS.has(label)) return [];
  return LABEL_TO_KINDS[label] || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT FOR PASSIVE AVAILABILITY DETECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidenceAvailabilityContext {
  /** Whether memory was loaded for this request. */
  memoryLoaded: boolean;
  /** Number of memory facts retrieved (0 if memory not loaded or empty). */
  memoryFactCount: number;
  /** Whether session conversation history was loaded. */
  conversationHistoryLoaded: boolean;
  /** Whether Layer 1/2 candidate identity exists from a prior search. */
  candidateIdentityAvailable: boolean;
  /** Whether a pipeline snapshot was loaded for this session/thread. */
  pipelineSnapshotLoaded: boolean;
}

/**
 * Determine status for an evidence kind using only already-available
 * request lifecycle state. Does NOT execute tools or query databases.
 */
function resolvePassiveStatus(
  kind: PrimeEvidenceKind,
  ctx: EvidenceAvailabilityContext,
): PrimeEvidenceStatus {
  switch (kind) {
    case 'conversation_context':
      return ctx.conversationHistoryLoaded ? 'available' : 'pending';

    case 'user_stated_fact':
      if (!ctx.memoryLoaded) return 'pending';
      return ctx.memoryFactCount > 0 ? 'available' : 'pending';

    case 'candidate_identity':
      return ctx.candidateIdentityAvailable ? 'available' : 'pending';

    case 'document_evidence':
      return ctx.pipelineSnapshotLoaded ? 'available' : 'pending';

    case 'product_knowledge':
      return 'available'; // Always present in Prime's system prompt

    case 'general_knowledge':
      return 'available'; // Always present in model training

    // Evidence kinds that require tool execution — always pending in P3.1A
    case 'transaction_data':
    case 'category_aggregation':
    case 'period_comparison':
    case 'cash_flow':
    case 'goal_state':
    case 'calculation_inputs':
      return 'pending';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL QUERY TYPE REFINEMENT
// ─────────────────────────────────────────────────────────────────────────────

// When P3.0A classifies as FINANCIAL_DATA_LOOKUP or FINANCIAL_ANALYSIS with
// an attached financialClassification, the queryType can narrow the ambiguous
// 'authoritative_financial_data' label into a more specific evidence kind.

function refineFinancialEvidenceKinds(
  kinds: PrimeEvidenceKind[],
  queryType: string | undefined,
): PrimeEvidenceKind[] {
  // Only refine when the ambiguous pair is present
  const hasTransaction = kinds.includes('transaction_data');
  const hasAggregation = kinds.includes('category_aggregation');
  if (!hasTransaction || !hasAggregation || !queryType) return kinds;

  switch (queryType) {
    case 'aggregate':
      // Aggregate queries are best served by category_aggregation
      return kinds.filter(k => k !== 'transaction_data');
    case 'detail':
    case 'merchant':
      // Detail/merchant queries need transaction rows
      return kinds.filter(k => k !== 'category_aggregation');
    default:
      // Cannot disambiguate — keep both as pending
      return kinds;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD RUNTIME EVIDENCE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a P3.1A runtime evidence contract from a P3.0A classification.
 *
 * This is the primary entry point. It:
 * 1. Maps P3.0A semantic labels → typed PrimeEvidenceKind values
 * 2. Uses financialClassification.queryType to refine ambiguous kinds
 * 3. Passively determines evidence status from already-loaded context
 * 4. Preserves forbidden labels unchanged
 * 5. Attaches canonical temporal scope when provided (P3.1A.1)
 * 6. Composes analysis evidence (period_comparison) for FINANCIAL_ANALYSIS
 *
 * Does NOT execute tools, query databases, or change behavior.
 */
export function buildRuntimeEvidenceContract(
  classification: PrimeIntentClassification,
  ctx: EvidenceAvailabilityContext,
  temporalScope?: PrimeTemporalScope,
): PrimeRuntimeEvidenceContract {
  const { intent, confidence, proposedEvidence, financialClassification } = classification;

  // Collect required evidence kinds (deduplicated)
  const requiredKindSet = new Set<PrimeEvidenceKind>();
  for (const label of proposedEvidence.required) {
    const kinds = resolveLabel(label);
    for (const k of kinds) requiredKindSet.add(k);
  }

  // Refine using financial query type when available
  let requiredKinds = Array.from(requiredKindSet);
  if (financialClassification?.queryType) {
    requiredKinds = refineFinancialEvidenceKinds(
      requiredKinds,
      financialClassification.queryType,
    );
  }

  // Collect optional evidence kinds (deduplicated, excluding already-required)
  const optionalKindSet = new Set<PrimeEvidenceKind>();
  for (const label of proposedEvidence.allowed) {
    const kinds = resolveLabel(label);
    for (const k of kinds) {
      if (!requiredKinds.includes(k)) optionalKindSet.add(k);
    }
  }

  // Build requirements array with passive status
  const requirements: PrimeEvidenceRequirement[] = [];

  for (const kind of requiredKinds) {
    const source = EVIDENCE_SOURCE_REGISTRY[kind];
    requirements.push({
      kind,
      required: true,
      status: resolvePassiveStatus(kind, ctx),
      source: source?.tool || undefined,
    });
  }

  for (const kind of optionalKindSet) {
    const source = EVIDENCE_SOURCE_REGISTRY[kind];
    requirements.push({
      kind,
      required: false,
      status: resolvePassiveStatus(kind, ctx),
      source: source?.tool || undefined,
    });
  }

  // ── P3.1A.1: Analysis evidence composition ──
  // For FINANCIAL_ANALYSIS with a comparison signal (explicit or implicit),
  // ensure period_comparison is required even if P3.0A labels didn't produce it.
  if (
    intent === PrimeIntent.FINANCIAL_ANALYSIS &&
    temporalScope?.comparison !== undefined
  ) {
    const alreadyHasComparison = requirements.some(r => r.kind === 'period_comparison');
    if (!alreadyHasComparison) {
      requirements.push({
        kind: 'period_comparison',
        required: true,
        status: resolvePassiveStatus('period_comparison', ctx),
      });
    }
  }

  // For FINANCIAL_ANALYSIS with an implicit comparison signal but no explicit
  // comparison period — still require period_comparison so downstream knows
  // comparison evidence is needed (it will remain unresolved/ambiguous).
  if (
    intent === PrimeIntent.FINANCIAL_ANALYSIS &&
    temporalScope?.primary !== undefined &&
    temporalScope?.comparison === undefined &&
    financialClassification?.scope?.isComparison
  ) {
    const alreadyHasComparison = requirements.some(r => r.kind === 'period_comparison');
    if (!alreadyHasComparison) {
      requirements.push({
        kind: 'period_comparison',
        required: true,
        status: 'pending',
      });
    }
  }

  return {
    intent,
    confidence,
    requirements,
    forbidden: proposedEvidence.forbidden,
    temporalScope: temporalScope ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY HELPER — safe log payload (no PII, no financial values)
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidenceContractTelemetry {
  intent: string;
  confidence: string;
  required: string[];
  optional: string[];
  available: string[];
  pending: string[];
  unavailable: string[];
  forbidden: string[];
}

/**
 * Extract a safe telemetry payload from a runtime evidence contract.
 * Contains only evidence kind names and status — no PII, no amounts, no text.
 */
export function buildEvidenceContractTelemetry(
  contract: PrimeRuntimeEvidenceContract,
): EvidenceContractTelemetry {
  return {
    intent: contract.intent,
    confidence: contract.confidence,
    required: contract.requirements.filter(r => r.required).map(r => r.kind),
    optional: contract.requirements.filter(r => !r.required).map(r => r.kind),
    available: contract.requirements.filter(r => r.status === 'available').map(r => r.kind),
    pending: contract.requirements.filter(r => r.status === 'pending').map(r => r.kind),
    unavailable: contract.requirements.filter(r => r.status === 'unavailable').map(r => r.kind),
    forbidden: contract.forbidden,
  };
}
