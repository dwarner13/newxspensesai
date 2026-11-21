/**
 * PRIME REASONING V1 — R2b: SHADOW evidence-plan comparison (OBSERVATIONAL ONLY).
 *
 *   R1 shadow model → validated FinancialRequest V2 → R2a adapter
 *     → buildRuntimeEvidenceContract (P3.1A) → buildEvidencePlan (P3.1B)   [shadow plan, NEVER executed]
 *   compared with the authoritative live P3/CP plan the request actually used.
 *
 * WHAT THIS NEVER DOES
 *   - executes a tool, queries a database or calls a model (pure; no I/O);
 *   - changes the live plan, the evidence, the answer, identity or session state;
 *   - trusts a shadow merchant: a model-named merchant stays an untrusted claim
 *     (it is not grounded here; the live merchant-hint trust gate is untouched).
 *
 * PRIVACY
 *   The comparison payload carries only enums, booleans and counts: tool names, evidence
 *   kinds, unresolved reasons, status codes and match flags. Never merchant or category
 *   values, dates, amounts, ids, row data, or user/model text.
 */

import type { PrimeIntentClassification } from './prime-intent-classifier';
import { buildRuntimeEvidenceContract, type EvidenceAvailabilityContext } from './prime-evidence-contract';
import {
  buildEvidencePlan,
  type EvidencePlanMerchantContext,
  type PrimeEvidencePlan,
} from './prime-evidence-resolver';
import type { TemporalScopeContext } from './prime-temporal-scope';
import { financialRequestToEvidenceIntent, type FinancialRequestEvidenceIntent } from './prime-financial-request-evidence';
import type { ShadowOutcome } from './prime-shadow-semantics';

export const R2B_COMPARISON_VERSION = 1 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type PlanAgreement =
  /** Both plans retrieve the same evidence with the same parameters. */
  | 'agree'
  /** Both plans retrieve evidence, but differently (see `dimensions`). */
  | 'disagree'
  /** Only the live pipeline plans retrieval (shadow declined, could not map, or planned nothing). */
  | 'live_only_plan'
  /** Only the shadow plan would retrieve (live planned nothing). */
  | 'shadow_only_plan'
  /** Neither plans any retrieval. */
  | 'both_no_plan'
  /** Shadow model output was invalid / timed out — nothing to compare. */
  | 'shadow_invalid';

export type PlanDisagreementDimension =
  | 'tools'
  | 'evidence_kinds'
  | 'date_range'
  | 'year'
  | 'category_filter'
  | 'merchant_filter'
  | 'type_filter'
  | 'limit'
  | 'comparison_periods'
  | 'unresolved';

export interface ShadowPlanComparison {
  r2b: typeof R2B_COMPARISON_VERSION;
  agreement: PlanAgreement;
  /** R2a status of the shadow request (or the shadow failure code). */
  shadowStatus: FinancialRequestEvidenceIntent['status'] | 'model_invalid';
  /** Bounded enum: R2a unsupported reason, identity reference kind, or model failure code. */
  shadowReason?: string;
  shadowNotes?: string[];
  dimensions: PlanDisagreementDimension[];
  liveIntent?: string;
  shadowIntent?: string;
  liveTools: string[];
  shadowTools: string[];
  liveUnresolved: string[];
  shadowUnresolved: string[];
  merchant: {
    liveHasMerchant: boolean;
    liveMerchantTrusted: boolean;
    shadowHasMerchant: boolean;
    /** Always false: a model-named merchant is a claim, never trusted by R2b. */
    shadowMerchantTrusted: false;
  };
}

export interface LivePlanSnapshot {
  intent: PrimeIntentClassification | null;
  plan: PrimeEvidencePlan | null;
  merchantHintTrusted: boolean;
}

export interface ShadowPlanContext {
  temporal: TemporalScopeContext;
  availability: EvidenceAvailabilityContext;
  merchantCtx?: EvidencePlanMerchantContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shadow plan (built, never executed)
// ─────────────────────────────────────────────────────────────────────────────

export type ShadowPlanResult =
  | { status: 'model_invalid'; failureCode: string }
  | { status: 'planned'; intent: Extract<FinancialRequestEvidenceIntent, { status: 'mapped' }>; plan: PrimeEvidencePlan }
  | { status: 'not_planned'; intent: Exclude<FinancialRequestEvidenceIntent, { status: 'mapped' }> };

/** Build the shadow plan with the EXISTING contract + resolver. Pure; never executes it. */
export function buildShadowEvidencePlan(outcome: ShadowOutcome, ctx: ShadowPlanContext): ShadowPlanResult {
  if (outcome.status !== 'valid') return { status: 'model_invalid', failureCode: outcome.failureCode };
  const intent = financialRequestToEvidenceIntent(outcome.request, ctx.temporal);
  if (intent.status !== 'mapped') return { status: 'not_planned', intent };
  const contract = buildRuntimeEvidenceContract(intent.classification, ctx.availability, intent.temporalScope ?? undefined);
  const plan = buildEvidencePlan(contract, intent.classification, ctx.merchantCtx);
  return { status: 'planned', intent, plan };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison (structural, value-free)
// ─────────────────────────────────────────────────────────────────────────────

type Params = Record<string, unknown>;
interface RetrievalStep { kind: string; tool: string; params: Params }

const retrievalSteps = (plan: PrimeEvidencePlan | null | undefined): RetrievalStep[] =>
  (plan?.steps ?? [])
    .filter(s => (s.mode === 'tool' || s.mode === 'multi_source') && !!s.tool)
    .map(s => ({ kind: s.evidenceKind, tool: s.tool as string, params: (s.params ?? {}) as Params }));

const unresolvedCodes = (plan: PrimeEvidencePlan | null | undefined): string[] =>
  (plan?.unresolved ?? []).map(u => `${u.evidenceKind}:${u.reason}`).sort();

const sameSet = (a: readonly string[], b: readonly string[]) => {
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.length === sb.length && sa.every((x, i) => x === sb[i]);
};

const norm = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : v);
const sameValue = (a: unknown, b: unknown) => norm(a) === norm(b);

const PARAM_DIMENSIONS: Array<[PlanDisagreementDimension, string[]]> = [
  ['date_range', ['startDate', 'endDate']],
  ['year', ['year']],
  ['category_filter', ['category', 'subcategory']],
  ['merchant_filter', ['merchant', 'q']],
  ['type_filter', ['type']],
  ['limit', ['limit']],
  ['comparison_periods', ['periodA_startDate', 'periodA_endDate', 'periodB_startDate', 'periodB_endDate', 'periodA_year', 'periodB_year']],
];

function paramDimensions(live: RetrievalStep[], shadow: RetrievalStep[]): PlanDisagreementDimension[] {
  const dims = new Set<PlanDisagreementDimension>();
  for (const l of live) {
    const s = shadow.find(x => x.tool === l.tool && x.kind === l.kind);
    if (!s) continue;
    for (const [dim, keys] of PARAM_DIMENSIONS) {
      if (keys.some(k => !sameValue(l.params[k], s.params[k]))) dims.add(dim);
    }
  }
  return [...dims];
}

/**
 * Compare the shadow plan with the live plan. Pure, total (never throws on well-typed input),
 * value-free output.
 */
export function compareShadowPlan(shadow: ShadowPlanResult, live: LivePlanSnapshot): ShadowPlanComparison {
  const liveSteps = retrievalSteps(live.plan);
  const shadowSteps = shadow.status === 'planned' ? retrievalSteps(shadow.plan) : [];
  const liveFc = live.intent?.financialClassification;
  const shadowFc = shadow.status === 'planned' ? shadow.intent.classification.financialClassification : undefined;

  const base: Omit<ShadowPlanComparison, 'agreement' | 'dimensions'> = {
    r2b: R2B_COMPARISON_VERSION,
    shadowStatus: shadow.status === 'model_invalid' ? 'model_invalid' : shadow.status === 'planned' ? 'mapped' : shadow.intent.status,
    ...(shadowReasonOf(shadow) ? { shadowReason: shadowReasonOf(shadow) } : {}),
    ...(shadow.status === 'planned' && shadow.intent.notes.length > 0 ? { shadowNotes: [...shadow.intent.notes] } : {}),
    ...(live.intent ? { liveIntent: live.intent.intent } : {}),
    ...(shadow.status === 'planned' ? { shadowIntent: shadow.intent.classification.intent } : {}),
    liveTools: liveSteps.map(s => s.tool),
    shadowTools: shadowSteps.map(s => s.tool),
    liveUnresolved: unresolvedCodes(live.plan),
    shadowUnresolved: shadow.status === 'planned' ? unresolvedCodes(shadow.plan) : [],
    merchant: {
      liveHasMerchant: !!liveFc?.merchantHint,
      liveMerchantTrusted: !!liveFc?.merchantHint && live.merchantHintTrusted,
      shadowHasMerchant: !!shadowFc?.merchantHint,
      shadowMerchantTrusted: false,
    },
  };

  if (shadow.status === 'model_invalid') return { ...base, agreement: 'shadow_invalid', dimensions: [] };
  if (liveSteps.length === 0 && shadowSteps.length === 0) return { ...base, agreement: 'both_no_plan', dimensions: [] };
  if (shadowSteps.length === 0) return { ...base, agreement: 'live_only_plan', dimensions: [] };
  if (liveSteps.length === 0) return { ...base, agreement: 'shadow_only_plan', dimensions: [] };

  const dims: PlanDisagreementDimension[] = [];
  if (!sameSet(liveSteps.map(s => s.tool), shadowSteps.map(s => s.tool))) dims.push('tools');
  if (!sameSet(liveSteps.map(s => s.kind), shadowSteps.map(s => s.kind))) dims.push('evidence_kinds');
  dims.push(...paramDimensions(liveSteps, shadowSteps));
  if (!sameSet(base.liveUnresolved, base.shadowUnresolved)) dims.push('unresolved');
  return { ...base, agreement: dims.length === 0 ? 'agree' : 'disagree', dimensions: dims };
}

function shadowReasonOf(shadow: ShadowPlanResult): string | undefined {
  if (shadow.status === 'model_invalid') return shadow.failureCode;
  if (shadow.status === 'planned') return undefined;
  const i = shadow.intent;
  switch (i.status) {
    case 'unsupported': return i.reason;
    case 'identity_required': return i.reference;
    case 'not_applicable': return i.reason;
    case 'clarify': return 'ambiguity_ask';
    case 'invalid': return 'invalid_request';
  }
}

/**
 * One call for chat.ts: build the shadow plan and compare. NEVER throws — any internal
 * error becomes a bounded `{ r2b, error }` payload so the live answer can never be affected.
 */
export function runShadowPlanComparison(
  outcome: ShadowOutcome,
  live: LivePlanSnapshot,
  ctx: ShadowPlanContext,
): ShadowPlanComparison | { r2b: typeof R2B_COMPARISON_VERSION; error: 'comparison_failed' } {
  try {
    return compareShadowPlan(buildShadowEvidencePlan(outcome, ctx), live);
  } catch {
    return { r2b: R2B_COMPARISON_VERSION, error: 'comparison_failed' };
  }
}
