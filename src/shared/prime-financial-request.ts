/**
 * PRIME REASONING V1 — R0 / R0.1: FinancialRequest V2 contract (NOT wired into production).
 *
 * WHAT THIS IS
 *   A SEMANTIC CLAIM: what Prime believes the user means, expressed in composable,
 *   bounded dimensions (domain × operation × measures × filters × period × comparison ×
 *   grouping × order/limit × reference × presentation × ambiguity × action × capability).
 *   There is no per-question intent ("restaurant_question", "costco_last_month") and no
 *   English grammar here — a restaurant, fuel, grocery or Costco question differs only
 *   in a filter value.
 *
 * WHAT THIS IS NOT — AUTHORITY BOUNDARY
 *   A FinancialRequest establishes NOTHING about the user's data. It never proves:
 *     - that a merchant / category / account exists in the user's data;
 *     - transaction existence or transaction UUID authority;
 *     - account or session ownership;
 *     - totals, counts, dates in the database, evidence completeness;
 *     - mutation authority;
 *     - product facts.
 *   Deterministic backend systems prove those: the financial engine (CP1–CP4.x),
 *   taxonomy resolution, period resolution, session ownership, Layer 2 candidate frame
 *   + select_transaction, Tag's confirmation lifecycle, and (future) Product Truth.
 *   Every field below is a proposal to be VALIDATED, never a fact to be trusted.
 *
 * Deliberately excluded: free-form intents, amounts/totals, resolved dates, transaction
 * UUIDs as identity, confidence scores, prompt text — and (R0.1) occupation / household /
 * benchmark / external-evidence / judgement fields, which belong to a future higher-level
 * turn contract, not to a request about the user's own data. The schema is strict:
 * unknown keys (e.g. `verified`, `amount`, `total`, legacy `rank` / `measure`) are rejected,
 * so authority cannot be smuggled in and no duplicate representation can survive.
 *
 * VERSION 2 (R0.1): `rank` → `list` + `order` + `limit`; `measure` → `measures[]`;
 * `net_movement` → conceptual `net`; comparison `offset`; ambiguity dimension `order`.
 * There is one schema (no parallel V1): no production consumer existed before V2.
 */

import { z } from 'zod';
import { CANONICAL_CATEGORIES, type CashFlowPurpose } from './financial-taxonomy';
import { VISIBLE_CANDIDATE_FRAME_MAX } from './tx-candidate-ownership';

export const FINANCIAL_REQUEST_VERSION = 2 as const;

// ─────────────────────────────────────────────────────────────────────────────
// Bounded vocabularies (stable operations / domains — NOT human phrases)
// ─────────────────────────────────────────────────────────────────────────────

/** What part of the product the request is about. */
export const FINANCIAL_DOMAINS = ['transactions', 'accounts', 'goals', 'product', 'general'] as const;

/**
 * What to do with the selected data. Comparison is a separate dimension, not an operation.
 * Superlatives ("biggest", "most recent", "oldest three") are `list` + `order` + `limit`.
 */
export const FINANCIAL_OPERATIONS = [
  'total', 'count', 'count_distinct', 'average', 'list', 'trend', 'explain', 'none',
] as const;

/**
 * What money to measure. Purpose-level members REUSE the taxonomy's CashFlowPurpose
 * names (financial-taxonomy.ts) so there is one definition of spending / income /
 * transfers / debt / savings; direction-level members cover cash-flow questions.
 * Refunds are deliberately absent: the engine has no authoritative refund semantics
 * (see `capability`).
 */
const TAXONOMY_ALIGNED_MEASURES = [
  'spending', 'income', 'transfer_in', 'transfer_out', 'debt_payment', 'savings_investment',
] as const satisfies readonly CashFlowPurpose[];
export const FINANCIAL_MEASURES = [
  ...TAXONOMY_ALIGNED_MEASURES,
  /** transfer_in + transfer_out, when direction is not specified */
  'transfers',
  'inflow',
  'outflow',
  /**
   * CONCEPTUAL net only. This contract never defines its formula: CP3 has several named
   * nets (rawNetCashMovement, netExcludingInternalMovements); a future deterministic
   * resolver chooses the definition, asks, or presents both.
   */
  'net',
  /** activity irrespective of purpose (e.g. "my Costco transactions") */
  'transactions',
] as const;
export type FinancialMeasure = typeof FINANCIAL_MEASURES[number];
/** Most measures one request may ask for (order is preserved for presentation). */
export const MAX_MEASURES = 4;

/** Where an interpreted element came from. Provenance never creates authority. */
export const SEMANTIC_SOURCES = [
  'user_message', 'previous_request', 'ui_context', 'conversation', 'personal_context',
] as const;

export const SUBJECT_KINDS = ['category', 'subcategory', 'merchant', 'concept', 'account'] as const;
export const GROUPINGS = ['none', 'category', 'merchant', 'month', 'week', 'account'] as const;
export const DISTINCT_BY = ['merchant', 'category', 'account'] as const;
export const PERIOD_UNITS = ['day', 'week', 'month', 'quarter', 'year'] as const;
/** Semantic list ordering keys. Recency and size are orderings, not intents. */
export const ORDER_BY = ['date', 'amount'] as const;
export const ORDER_DIRECTIONS = ['desc', 'asc'] as const;
/** Proposed maximum list size (deterministic execution enforces the real bound later). */
export const MAX_LIST_LIMIT = VISIBLE_CANDIDATE_FRAME_MAX;

/** Bounded text for semantic values (a claim, e.g. "restaurants" — not a validated entity). */
const SemanticText = z.string().trim().min(1).max(80);
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const Year = z.number().int().min(1990).max(2100);
const Source = z.enum(SEMANTIC_SOURCES);

/** 1..4 unique measures, order preserved. */
const MeasuresSchema = z.array(z.enum(FINANCIAL_MEASURES)).min(1).max(MAX_MEASURES)
  .refine(ms => new Set(ms).size === ms.length, { message: 'measures must be unique' });

/** Semantic ordering of a list ("most recent", "biggest", "oldest"). */
export const OrderSchema = z.object({
  by: z.enum(ORDER_BY),
  direction: z.enum(ORDER_DIRECTIONS),
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Subjects / filters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A thing the request is about, as the user expressed it. `value` is the semantic
 * claim ("restaurants", "Costco", "eating out"). `categoryHint` may name a canonical
 * category (reused from CANONICAL_CATEGORIES) but is still only a hint: the
 * deterministic validator decides the real category/subcategory/merchant mapping.
 */
export const SubjectSchema = z.object({
  kind: z.enum(SUBJECT_KINDS),
  value: SemanticText,
  categoryHint: z.enum(CANONICAL_CATEGORIES).optional(),
  exclude: z.boolean().optional(),
  source: Source,
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// Period (SEMANTIC — exact dates are resolved later by deterministic code)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic period. This is NOT a date parser and holds no resolved boundaries (except
 * an explicit range the user stated). The future resolver turns it into exact dates
 * with the existing temporal helpers (prime-temporal-scope.ts conventions).
 */
export const PeriodSchema = z.discriminatedUnion('kind', [
  /** this month / this quarter / this year (to date) */
  z.object({ kind: z.literal('current'), unit: z.enum(PERIOD_UNITS) }).strict(),
  /** last month / last quarter / last year (complete previous unit) */
  z.object({ kind: z.literal('previous'), unit: z.enum(PERIOD_UNITS) }).strict(),
  /** last N days / weeks / months — "last three months" = { count: 3, unit: 'month' } */
  z.object({ kind: z.literal('rolling'), count: z.number().int().min(1).max(120), unit: z.enum(PERIOD_UNITS) }).strict(),
  /** a named month, optionally with year ("September", "May 2025") */
  z.object({ kind: z.literal('calendar_month'), month: z.number().int().min(1).max(12), year: Year.optional() }).strict(),
  z.object({ kind: z.literal('calendar_year'), year: Year }).strict(),
  z.object({ kind: z.literal('year_to_date'), year: Year.optional() }).strict(),
  /** explicit inclusive range the user stated */
  z.object({ kind: z.literal('range'), start: IsoDate, end: IsoDate }).strict(),
  z.object({ kind: z.literal('all_time') }).strict(),
  /** the period of the REFERENCED thing (previous validated request, or the UI view/selection) */
  z.object({ kind: z.literal('from_reference') }).strict(),
]).superRefine((p, ctx) => {
  if (p.kind === 'range' && p.start > p.end) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'range start must not be after end' });
  }
});

/** What the primary period is compared against. */
export const ComparisonSchema = z.discriminatedUnion('kind', [
  /** the period of equal length immediately before the primary period */
  z.object({ kind: z.literal('previous_equivalent') }).strict(),
  /** the N units immediately before the primary period ("the previous three months") */
  z.object({ kind: z.literal('preceding'), count: z.number().int().min(1).max(120), unit: z.enum(PERIOD_UNITS) }).strict(),
  /**
   * the SAME-SHAPED primary period shifted back by count × unit (calendar shift):
   * same month last year = { count: 1, unit: 'year' }; two years ago = { count: 2, unit: 'year' }.
   * Exact dates and partial-period alignment stay deterministic.
   */
  z.object({ kind: z.literal('offset'), count: z.number().int().min(1).max(120), unit: z.enum(PERIOD_UNITS) }).strict(),
  z.object({ kind: z.literal('period'), period: PeriodSchema }).strict(),
]);

// ─────────────────────────────────────────────────────────────────────────────
// References (continuity — REFERENCE IS NOT AUTHORITY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * What the request refers back to. None of these is identity:
 *  - candidate_frame ordinals are mapped to stored IDs ONLY by the existing Layer 2 /
 *    select_transaction path (never trusted from here);
 *  - ui_selection / transaction_id values come from untrusted context and require
 *    backend ownership validation before any use;
 *  - previous_request means "refine the last VALIDATED request", it carries no data.
 */
export const ReferenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('previous_request') }).strict(),
  z.object({ kind: z.literal('candidate_frame'), ordinal: z.number().int().min(1).max(VISIBLE_CANDIDATE_FRAME_MAX) }).strict(),
  z.object({ kind: z.literal('candidate_frame_all') }).strict(),
  z.object({ kind: z.literal('ui_selection') }).strict(),
  z.object({ kind: z.literal('ui_view') }).strict(),
  /** an ID supplied by context (e.g. UI). Unverified until the backend proves ownership. */
  z.object({ kind: z.literal('transaction_id'), id: z.string().uuid(), source: z.enum(['ui_context', 'conversation']) }).strict(),
  z.object({ kind: z.literal('conversation_entity'), value: SemanticText }).strict(),
]);

// ─────────────────────────────────────────────────────────────────────────────
// Ambiguity, action, capability, presentation
// ─────────────────────────────────────────────────────────────────────────────

/** One alternative reading, expressed as an override of core dimensions (no prose logic). */
export const InterpretationSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/),
  summary: z.string().trim().min(1).max(120),
  operation: z.enum(FINANCIAL_OPERATIONS).optional(),
  distinctBy: z.enum(DISTINCT_BY).optional(),
  measures: MeasuresSchema.optional(),
  order: OrderSchema.optional(),
  reference: ReferenceSchema.optional(),
}).strict();

export const AmbiguitySchema = z.object({
  dimension: z.enum(['operation', 'measure', 'subject', 'period', 'reference', 'distinct_by', 'order']),
  interpretations: z.array(InterpretationSchema).min(2).max(4),
  /** ask = one clarification; assume_disclosed = proceed and say so; present_both = answer each */
  resolution: z.enum(['ask', 'assume_disclosed', 'present_both']),
  /** required when resolution is assume_disclosed */
  assumed: z.string().optional(),
}).strict()
  .refine(a => a.resolution !== 'assume_disclosed' || (!!a.assumed && a.interpretations.some(i => i.id === a.assumed)),
    { message: 'assume_disclosed requires `assumed` to name one of the interpretations' })
  .refine(a => new Set(a.interpretations.map(i => i.id)).size === a.interpretations.length,
    { message: 'interpretation ids must be unique' });

/**
 * A PROPOSED change. Never authority: the existing Tag lifecycle still requires an
 * authoritative transaction identity and explicit user confirmation.
 * NO AUTHORITATIVE TRANSACTION IDENTITY → NO MUTATION.
 */
export const ActionSchema = z.object({
  kind: z.literal('mutation_proposal'),
  mutation: z.enum(['change_category', 'change_subcategory', 'rename_merchant', 'create_rule']),
  target: ReferenceSchema,
  value: SemanticText,
}).strict()
  .refine(a => a.target.kind !== 'none', { message: 'a mutation proposal needs a target reference' });

/** Honest capability state. Unsupported/unknown concepts are named, never given an invented definition. */
export const CapabilitySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('supported') }).strict(),
  z.object({
    status: z.literal('unsupported'),
    concept: SemanticText,
    reason: z.enum(['no_authoritative_semantics', 'no_data_source', 'not_implemented']),
  }).strict(),
  z.object({ status: z.literal('unknown'), concept: SemanticText }).strict(),
]);

export const PresentationSchema = z.object({
  detail: z.enum(['brief', 'standard', 'detailed']),
  format: z.enum(['prose', 'list', 'table']).optional(),
}).strict();

// ─────────────────────────────────────────────────────────────────────────────
// FinancialRequest V2
// ─────────────────────────────────────────────────────────────────────────────

export const FinancialRequestV2Schema = z.object({
  version: z.literal(FINANCIAL_REQUEST_VERSION),
  /** Marks this object as a semantic claim. There is no "verified" variant. */
  authority: z.literal('semantic_claim'),
  domain: z.enum(FINANCIAL_DOMAINS),
  operation: z.enum(FINANCIAL_OPERATIONS),
  measures: MeasuresSchema.optional(),
  subjects: z.array(SubjectSchema).max(8).default([]),
  period: PeriodSchema.optional(),
  comparison: ComparisonSchema.optional(),
  grouping: z.enum(GROUPINGS).optional(),
  distinctBy: z.enum(DISTINCT_BY).optional(),
  /** list ordering (semantic) — only with operation 'list' */
  order: OrderSchema.optional(),
  /** proposed list size 1..25 — requires order; execution enforces the real bound */
  limit: z.number().int().min(1).max(MAX_LIST_LIMIT).optional(),
  reference: ReferenceSchema.default({ kind: 'none' }),
  /** standalone = complete request; refine_previous = only the stated dimensions change */
  mode: z.enum(['standalone', 'refine_previous']).default('standalone'),
  presentation: PresentationSchema.optional(),
  ambiguities: z.array(AmbiguitySchema).max(3).default([]),
  action: ActionSchema.optional(),
  capability: CapabilitySchema.default({ status: 'supported' }),
}).strict()
  .refine(r => r.operation !== 'count_distinct' || !!r.distinctBy, { message: 'count_distinct requires distinctBy', path: ['distinctBy'] })
  .refine(r => r.limit === undefined || !!r.order, { message: 'limit requires order', path: ['limit'] })
  .refine(r => (!r.order && r.limit === undefined) || r.operation === 'list',
    { message: 'order/limit are only valid for operation list', path: ['order'] })
  .refine(r => r.mode !== 'refine_previous' || r.reference.kind === 'previous_request', { message: 'refine_previous requires reference previous_request', path: ['reference'] })
  .refine(r => r.period?.kind !== 'from_reference' || ['previous_request', 'ui_view', 'ui_selection'].includes(r.reference.kind),
    { message: 'from_reference period needs a previous_request or UI reference', path: ['period'] })
  .refine(r => !r.comparison || !!r.period, { message: 'a comparison needs a primary period', path: ['comparison'] })
  .refine(r => !r.action || r.operation === 'none', { message: 'a mutation proposal carries operation none', path: ['operation'] });

export type FinancialRequestV2 = z.infer<typeof FinancialRequestV2Schema>;
/** The authoring shape (defaults not yet applied). */
export type FinancialRequestV2Input = z.input<typeof FinancialRequestV2Schema>;

export type ContractParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const formatIssues = (e: z.ZodError) => e.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`);

/**
 * Validate an untrusted FinancialRequest (e.g. future model output). Success means
 * "well-formed semantic claim" — NOT "true", "owned" or "authorized".
 */
export function parseFinancialRequest(input: unknown): ContractParseResult<FinancialRequestV2> {
  const r = FinancialRequestV2Schema.safeParse(input);
  return r.success ? { ok: true, value: r.data } : { ok: false, errors: formatIssues(r.error) };
}

/**
 * True when the request carries anything that a deterministic system must verify
 * before use (references to identity, UI context, or a mutation proposal). Helper for
 * future validators; it grants nothing.
 */
export function requiresIdentityVerification(req: FinancialRequestV2): boolean {
  const refs = [req.reference, req.action?.target].filter(Boolean) as Array<z.infer<typeof ReferenceSchema>>;
  return !!req.action || refs.some(r => r.kind === 'candidate_frame' || r.kind === 'candidate_frame_all'
    || r.kind === 'ui_selection' || r.kind === 'transaction_id');
}

/** True when Prime should not execute a single reading without first disclosing or asking. */
export function hasBlockingAmbiguity(req: FinancialRequestV2): boolean {
  return req.ambiguities.some(a => a.resolution === 'ask');
}
