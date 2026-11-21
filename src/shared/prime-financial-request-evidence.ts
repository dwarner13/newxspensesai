/**
 * PRIME REASONING V1 — R2a: FinancialRequest V2 → existing evidence intent (PURE ADAPTER).
 *
 * WHAT THIS IS
 *   A pure, deterministic translation of a VALIDATED FinancialRequest V2 (R0/R0.1) into the
 *   exact inputs Prime's EXISTING evidence pipeline already consumes:
 *
 *     classifyPrimeIntent → buildTemporalScope → buildRuntimeEvidenceContract → buildEvidencePlan
 *         (P3.0A)              (P3.1A.1)              (P3.1A)                       (P3.1B)
 *
 *   It produces a `PrimeIntentClassification` (with an attached `FinancialQueryClassification`)
 *   and a `PrimeTemporalScope`, so the existing P3.1A contract and P3.1B resolver run unchanged.
 *   There is no second evidence engine, no second date resolver, no second category resolver.
 *
 * NOT WIRED (R2a)
 *   Nothing in production imports this module. It does not change Prime's behaviour. R2b will
 *   compare its plan with the live plan in shadow; authority moves only in a later, flagged step.
 *
 * AUTHORITY BOUNDARY (unchanged from R0)
 *   The output is still a proposal. It never contains transaction identity, amounts, totals or
 *   evidence, and it never authorizes a mutation:
 *     - candidate / UI / transaction-id references → `identity_required` (Layer 2 / select_transaction
 *       resolve identity; an unverified id is never copied into the output);
 *     - mutation proposals → `unsupported` (Tag's confirmation lifecycle owns mutations);
 *     - a merchant subject is a CLAIM: it is passed as an untrusted lexical hint
 *       (`merchantHintSource: 'noun_suffix'`) so the existing merchant-hint trust gate must ground it.
 *
 * SEMANTICS PRESERVED BY REUSE
 *   - Periods: each V2 period is turned into a canonical phrase built ONLY from validated enum
 *     values (never user text) and resolved by the live `buildTemporalScope` — same [from, to),
 *     as-of (period-to-date), bare-month policy, timezone and labels as a typed question.
 *   - Categories: the live `resolveCategory` taxonomy; subject categories via `subjectForCategory`.
 *   - Comparisons: explicit periods are resolved; derived comparisons (previous_equivalent,
 *     preceding, offset) are NOT computed here — like the live pipeline's implicit comparison, the
 *     contract then requires `period_comparison` and the resolver leaves it unresolved.
 *
 * Pure TypeScript. No React, no Supabase, no network, no model calls.
 */

import {
  parseFinancialRequest,
  hasBlockingAmbiguity,
  type FinancialRequestV2,
  type FinancialMeasure,
} from './prime-financial-request';
import {
  PrimeIntent,
  type EvidenceContract,
  type PrimeIntentClassification,
} from './prime-intent-classifier';
import {
  subjectForCategory,
  type FinancialQueryClassification,
  type FinancialSubject,
} from './financial-query-classifier';
import { resolveCategory, resolveCategoryOrPassthrough } from './financial-taxonomy';
import { buildTemporalScope, type PrimeTemporalScope, type TemporalScopeContext } from './prime-temporal-scope';
import type { UserQueryScope } from './tool-gate';

export const R2A_ADAPTER_VERSION = 1 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────

export type R2aUnsupportedReason =
  | 'capability_unsupported'
  | 'mutation_requires_tag_lifecycle'
  | 'multiple_readings'
  | 'requires_previous_request'
  | 'ui_context_not_wired'
  | 'requires_conversation_resolution'
  | 'unsupported_period'
  | 'period_requires_reference'
  | 'exclusion_filters'
  | 'account_scope'
  | 'unresolved_category'
  | 'multiple_subjects'
  | 'mixed_subjects'
  | 'multiple_measures'
  | 'count_distinct'
  | 'trend_not_planned'
  | 'grouping_not_planned'
  | 'order_not_planned';

export type R2aNote = 'assumption_disclosed' | 'comparison_period_unresolved' | 'merchant_claim_untrusted';

export type FinancialRequestEvidenceIntent =
  /** Inputs for the existing P3.1A contract / P3.1B resolver. */
  | {
      status: 'mapped';
      classification: PrimeIntentClassification;
      temporalScope: PrimeTemporalScope | null;
      notes: R2aNote[];
      /** id of the interpretation applied when an ambiguity was resolved as assume_disclosed. */
      assumedInterpretation?: string;
    }
  /** Not a question about the user's transaction data (goals, accounts, product, general, none). */
  | { status: 'not_applicable'; reason: 'not_transaction_data' }
  /** Prime must ask before planning (ambiguity with resolution "ask"). */
  | { status: 'clarify'; dimensions: string[] }
  /** Refers to specific transactions/selection: identity is resolved only by Layer 2 / select_transaction. */
  | { status: 'identity_required'; reference: 'candidate_frame' | 'candidate_frame_all' | 'ui_selection' | 'transaction_id' }
  /** Honest limit: this request cannot be planned safely by the existing evidence pipeline. */
  | { status: 'unsupported'; reason: R2aUnsupportedReason }
  /** The input is not a valid FinancialRequest V2. */
  | { status: 'invalid'; errors: string[] };

// ─────────────────────────────────────────────────────────────────────────────
// Evidence labels for the two intents this adapter emits.
// Kept byte-for-byte equal to P3.0A's EVIDENCE_CONTRACTS (not exported there); a parity test
// asserts equality with classifyPrimeIntent's output so they cannot drift silently.
// ─────────────────────────────────────────────────────────────────────────────

const DATA_LOOKUP_EVIDENCE: EvidenceContract = {
  required: ['authoritative_financial_data'],
  allowed: ['user_memory_facts', 'candidate_frame'],
  forbidden: ['hallucinated_numbers'],
};
const ANALYSIS_EVIDENCE: EvidenceContract = {
  required: ['authoritative_financial_data'],
  allowed: ['user_memory_facts', 'analytics_tools'],
  forbidden: ['unsourced_trend_claims'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Periods → canonical phrase → live buildTemporalScope
// ─────────────────────────────────────────────────────────────────────────────

type Period = NonNullable<FinancialRequestV2['period']>;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const CURRENT_PHRASE: Record<string, string> = {
  day: 'today', week: 'this week', month: 'this month', quarter: 'this quarter', year: 'this year',
};
const PREVIOUS_PHRASE: Record<string, string> = {
  day: 'yesterday', week: 'last week', month: 'last month', quarter: 'last quarter', year: 'last year',
};

/**
 * Phrase + explicit years for one period, built only from validated enum values.
 * `null` = the existing temporal resolver cannot express it (→ unsupported).
 */
function periodPhrase(p: Period, ctx: TemporalScopeContext): { phrase: string; years: number[] } | 'reference' | null {
  switch (p.kind) {
    case 'current':
      return { phrase: CURRENT_PHRASE[p.unit], years: [] };
    case 'previous':
      return { phrase: PREVIOUS_PHRASE[p.unit], years: [] };
    case 'rolling':
      // The live resolver supports rolling days / weeks / months only.
      if (p.unit !== 'day' && p.unit !== 'week' && p.unit !== 'month') return null;
      return { phrase: `last ${p.count} ${p.unit}s`, years: [] };
    case 'calendar_month':
      return p.year !== undefined
        ? { phrase: `${MONTH_NAMES[p.month - 1]} ${p.year}`, years: [p.year] }
        : { phrase: MONTH_NAMES[p.month - 1], years: [] }; // live bare-month policy
    case 'calendar_year':
      return { phrase: '', years: [p.year] };
    case 'year_to_date': {
      // Year-to-date of the CURRENT year = "this year" (as-of today). A past year's YTD has no
      // defined as-of date in the existing resolver → unsupported (never guessed).
      const currentYear = Number(localYear(ctx));
      if (p.year !== undefined && p.year !== currentYear) return null;
      return { phrase: 'this year', years: [] };
    }
    case 'range':
      return { phrase: `${p.start} to ${p.end}`, years: [] };
    case 'all_time':
      return { phrase: '', years: [] };
    case 'from_reference':
      return 'reference';
  }
}

function localYear(ctx: TemporalScopeContext): string {
  const scope = buildTemporalScope('this year', ctx);
  return (scope?.primary?.from ?? '').slice(0, 4);
}

/** Resolve one period through the live temporal builder (single-period scope). */
function resolvePeriod(p: Period, ctx: TemporalScopeContext): { scope: PrimeTemporalScope | null; years: number[] } | 'unsupported' | 'reference' {
  const ph = periodPhrase(p, ctx);
  if (ph === 'reference') return 'reference';
  if (ph === null) return 'unsupported';
  if (p.kind === 'all_time') return { scope: null, years: [] };
  const scope = buildTemporalScope(ph.phrase, ctx, ph.years);
  if (!scope?.primary || scope.comparison) return 'unsupported';
  return { scope, years: ph.years };
}

// ─────────────────────────────────────────────────────────────────────────────
// Measures → existing FinancialSubject
// ─────────────────────────────────────────────────────────────────────────────

const MEASURE_SUBJECT: Partial<Record<FinancialMeasure, FinancialSubject>> = {
  spending: 'spending',
  income: 'income',
  inflow: 'inflow',
  outflow: 'outflow',
  net: 'cash_flow',
  transfers: 'transfer',
  transfer_in: 'transfer',
  transfer_out: 'transfer',
  debt_payment: 'debt',
  savings_investment: 'savings',
  // 'transactions' = activity irrespective of purpose → no subject.
};
/** Measure sets that together mean cash flow (in + out). */
const CASH_FLOW_PARTS = new Set<FinancialMeasure>(['income', 'spending', 'inflow', 'outflow', 'net']);

function subjectFromMeasures(measures: FinancialMeasure[] | undefined): FinancialSubject | undefined | 'conflict' {
  if (!measures || measures.length === 0) return undefined;
  if (measures.length === 1) return MEASURE_SUBJECT[measures[0]];
  if (measures.every(m => CASH_FLOW_PARTS.has(m))) return 'cash_flow';
  return 'conflict';
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Translate a FinancialRequest V2 (validated here) into the existing evidence-pipeline inputs.
 * Pure: same input + same context → same output. Never throws.
 */
export function financialRequestToEvidenceIntent(
  input: unknown,
  ctx: TemporalScopeContext,
): FinancialRequestEvidenceIntent {
  const parsed = parseFinancialRequest(input);
  if (!parsed.ok) return { status: 'invalid', errors: parsed.errors };
  let req: FinancialRequestV2 = parsed.value;
  const notes: R2aNote[] = [];
  let assumedInterpretation: string | undefined;

  // ── Authority boundary first ──
  if (req.action) return { status: 'unsupported', reason: 'mutation_requires_tag_lifecycle' };
  if (req.capability.status !== 'supported') return { status: 'unsupported', reason: 'capability_unsupported' };

  // ── Ambiguity ──
  if (hasBlockingAmbiguity(req)) {
    return { status: 'clarify', dimensions: req.ambiguities.filter(a => a.resolution === 'ask').map(a => a.dimension) };
  }
  if (req.ambiguities.some(a => a.resolution === 'present_both')) return { status: 'unsupported', reason: 'multiple_readings' };
  for (const a of req.ambiguities) {
    // assume_disclosed: apply the named reading (schema guarantees it exists) and disclose it.
    const chosen = a.interpretations.find(i => i.id === a.assumed)!;
    const reparsed = parseFinancialRequest({
      ...req,
      ambiguities: [],
      ...(chosen.operation ? { operation: chosen.operation } : {}),
      ...(chosen.distinctBy ? { distinctBy: chosen.distinctBy } : {}),
      ...(chosen.measures ? { measures: chosen.measures } : {}),
      ...(chosen.order ? { order: chosen.order } : {}),
      ...(chosen.reference ? { reference: chosen.reference } : {}),
    });
    if (!reparsed.ok) return { status: 'invalid', errors: reparsed.errors };
    req = reparsed.value;
    assumedInterpretation = chosen.id;
    notes.push('assumption_disclosed');
  }

  // ── Scope of this adapter: the user's transaction data ──
  if (req.domain !== 'transactions' || req.operation === 'none' || req.operation === 'explain') {
    return { status: 'not_applicable', reason: 'not_transaction_data' };
  }

  // ── References: identity never comes from here ──
  switch (req.reference.kind) {
    case 'none':
      break;
    case 'candidate_frame':
    case 'candidate_frame_all':
    case 'ui_selection':
    case 'transaction_id':
      return { status: 'identity_required', reference: req.reference.kind };
    case 'previous_request':
      return { status: 'unsupported', reason: 'requires_previous_request' };
    case 'ui_view':
      return { status: 'unsupported', reason: 'ui_context_not_wired' };
    case 'conversation_entity':
      return { status: 'unsupported', reason: 'requires_conversation_resolution' };
  }

  // ── Operations / shapes the existing pipeline can plan honestly ──
  if (req.operation === 'count_distinct' || req.distinctBy) return { status: 'unsupported', reason: 'count_distinct' };
  if (req.operation === 'trend') return { status: 'unsupported', reason: 'trend_not_planned' };
  if (req.grouping && req.grouping !== 'none' && req.grouping !== 'category') {
    return { status: 'unsupported', reason: 'grouping_not_planned' };
  }
  // tx_search plans recency only: "biggest" / "oldest" with a limit would return the wrong rows.
  if (req.order && !(req.order.by === 'date' && req.order.direction === 'desc')) {
    return { status: 'unsupported', reason: 'order_not_planned' };
  }

  // ── Subjects ──
  const included = req.subjects;
  if (included.some(s => s.exclude)) return { status: 'unsupported', reason: 'exclusion_filters' };
  if (included.some(s => s.kind === 'account')) return { status: 'unsupported', reason: 'account_scope' };
  const merchants = included.filter(s => s.kind === 'merchant');
  const categoryLike = included.filter(s => s.kind === 'category' || s.kind === 'subcategory' || s.kind === 'concept');
  if (merchants.length > 1 || categoryLike.length > 1) return { status: 'unsupported', reason: 'multiple_subjects' };
  if (merchants.length === 1 && categoryLike.length === 1) return { status: 'unsupported', reason: 'mixed_subjects' };

  let resolvedCategory: FinancialQueryClassification['resolvedCategory'];
  if (categoryLike.length === 1) {
    const s = categoryLike[0];
    // Same alias taxonomy as the live classifier; a canonical categoryHint passes through.
    const r = resolveCategory(s.value) ?? (s.categoryHint ? resolveCategoryOrPassthrough(s.categoryHint) : null);
    if (!r) return { status: 'unsupported', reason: 'unresolved_category' };
    resolvedCategory = {
      category: r.category,
      ...(r.subcategory ? { subcategory: r.subcategory } : {}),
      ...(r.section ? { section: r.section } : {}),
    };
  }
  const merchantHint = merchants.length === 1 ? merchants[0].value : undefined;
  if (merchantHint) notes.push('merchant_claim_untrusted');

  // ── Subject (existing FinancialSubject grammar order) ──
  const fromMeasures = subjectFromMeasures(req.measures);
  if (fromMeasures === 'conflict') return { status: 'unsupported', reason: 'multiple_measures' };
  const directional = fromMeasures === 'cash_flow' || fromMeasures === 'inflow' || fromMeasures === 'outflow';
  const subject: FinancialSubject | undefined = directional
    ? fromMeasures
    : subjectForCategory(resolvedCategory?.category) ?? fromMeasures;

  // ── Periods (live resolver) ──
  let temporalScope: PrimeTemporalScope | null = null;
  const years: number[] = [];
  if (req.period) {
    const primary = resolvePeriod(req.period, ctx);
    if (primary === 'reference') return { status: 'unsupported', reason: 'period_requires_reference' };
    if (primary === 'unsupported') return { status: 'unsupported', reason: 'unsupported_period' };
    temporalScope = primary.scope;
    years.push(...primary.years);
  }
  let isComparison = false;
  if (req.comparison) {
    isComparison = true;
    if (req.comparison.kind === 'period') {
      if (!temporalScope?.primary) return { status: 'unsupported', reason: 'unsupported_period' };
      const comp = resolvePeriod(req.comparison.period, ctx);
      if (comp === 'reference') return { status: 'unsupported', reason: 'period_requires_reference' };
      if (comp === 'unsupported' || !comp.scope?.primary) return { status: 'unsupported', reason: 'unsupported_period' };
      temporalScope = { ...temporalScope, comparison: comp.scope.primary };
      for (const y of comp.years) if (!years.includes(y)) years.push(y);
    } else {
      // Derived comparison periods are computed by a future deterministic resolver, never here.
      notes.push('comparison_period_unresolved');
    }
  }

  // ── Shape / query type (CP4 vocabulary) ──
  const isList = req.operation === 'list';
  const requestShape: FinancialQueryClassification['requestShape'] = isList ? 'list' : 'aggregate';
  const queryType: FinancialQueryClassification['queryType'] = merchantHint ? 'merchant' : isList ? 'detail' : 'aggregate';
  const wantsBreakdown = req.grouping === 'category';

  const scope: UserQueryScope = {
    message: '', // no raw user text is carried
    hasMerchantQuery: !!merchantHint,
    isComparison,
    mentionedYears: years,
    needsDetail: isList,
    isMutation: false,
  };

  const financialClassification: FinancialQueryClassification = {
    requiresGrounding: true,
    queryType,
    ...(resolvedCategory ? { resolvedCategory } : {}),
    ...(merchantHint ? { merchantHint, merchantHintSource: 'noun_suffix' as const } : {}),
    years,
    scope,
    ...(isList && req.limit !== undefined ? { requestedCount: req.limit } : {}),
    ...(subject ? { subject } : {}),
    requestShape,
    wantsBreakdown,
  };

  // Analysis = comparison or category breakdown (the live analysis markers); otherwise lookup.
  const analysis = isComparison || wantsBreakdown;
  const classification: PrimeIntentClassification = {
    intent: analysis ? PrimeIntent.FINANCIAL_ANALYSIS : PrimeIntent.FINANCIAL_DATA_LOOKUP,
    confidence: 'high',
    source: 'rule',
    reason: `R2a FinancialRequest V2 adapter (operation=${req.operation})`,
    proposedEvidence: analysis ? ANALYSIS_EVIDENCE : DATA_LOOKUP_EVIDENCE,
    financialClassification,
  };

  return {
    status: 'mapped',
    classification,
    temporalScope,
    notes,
    ...(assumedInterpretation ? { assumedInterpretation } : {}),
  };
}
