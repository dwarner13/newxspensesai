/**
 * PRIME REASONING V1 — R1: SHADOW semantic interpretation (ZERO AUTHORITY).
 *
 * A model reads the user's message (plus a few previous USER messages for references)
 * and proposes a FinancialRequest V1 (R0 contract). The result is VALIDATED with the R0
 * schema, summarized WITHOUT any raw values, compared structurally with the legacy
 * classifier, and logged. Nothing here routes, plans or executes evidence, removes tools,
 * touches identity or mutations, or changes Prime's answer. Legacy stays authoritative.
 *
 * This module is pure apart from an injected `callModel` function (no SDK import), so
 * every behaviour is testable with fakes. Live model quality is evaluated separately
 * (scripts/eval-prime-shadow-semantics.ts), never in CI.
 *
 * Inputs deliberately exclude transaction data, totals, balances, memory and assistant
 * replies: the question is WHAT THE USER MEANS, not what the answer is.
 */

import {
  FINANCIAL_DOMAINS,
  FINANCIAL_OPERATIONS,
  FINANCIAL_MEASURES,
  SUBJECT_KINDS,
  GROUPINGS,
  DISTINCT_BY,
  PERIOD_UNITS,
  parseFinancialRequest,
  FinancialRequestV1Schema,
  type FinancialRequestV1,
} from './prime-financial-request';
import { CANONICAL_CATEGORIES } from './financial-taxonomy';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const SHADOW_SEMANTICS_VERSION = 1 as const;
/** Bounded conversation context: previous USER messages only. */
export const SHADOW_MAX_PRIOR_USER_MESSAGES = 4;
export const SHADOW_MAX_MESSAGE_CHARS = 500;

// ─────────────────────────────────────────────────────────────────────────────
// Prompt — explains the contract's dimensions and authority boundary.
// Generated from the R0 vocabularies so it can never drift from the schema.
// No question-pattern catalogue.
// ─────────────────────────────────────────────────────────────────────────────

const list = (xs: readonly string[]) => xs.join(' | ');

export const SHADOW_SEMANTICS_SYSTEM_PROMPT = [
  'You interpret what a user of a personal-finance app MEANS. You do not answer the question.',
  'Return ONE JSON object that is a FinancialRequest V1. Output JSON only.',
  '',
  'Authority: your output is a semantic claim only. Never include amounts, totals, balances, transaction IDs, dates from data, or anything about whether data exists. Deterministic systems verify everything later.',
  '',
  'Fields:',
  '- version: 1; authority: "semantic_claim"',
  `- domain: ${list(FINANCIAL_DOMAINS)} ("product" = questions about the app itself; "general" = not about the user's finances or the app)`,
  `- operation: ${list(FINANCIAL_OPERATIONS)} (comparison is NOT an operation — use "comparison")`,
  `- measure (optional): ${list(FINANCIAL_MEASURES)}`,
  `- subjects (optional array): { kind: ${list(SUBJECT_KINDS)}, value: the words that name it (≤80 chars), categoryHint?: one of [${CANONICAL_CATEGORIES.join(', ')}], exclude?: true, source: "user_message" | "previous_request" | "conversation" }. Use "merchant" only for a business name, "concept" for an idea like "eating out".`,
  `- period (optional, semantic — never compute dates): { kind: "current"|"previous", unit } | { kind: "rolling", count, unit } | { kind: "calendar_month", month: 1-12, year? } | { kind: "calendar_year", year } | { kind: "year_to_date", year? } | { kind: "range", start: "YYYY-MM-DD", end } | { kind: "all_time" } | { kind: "from_reference" }. unit: ${list(PERIOD_UNITS)}`,
  '- comparison (optional, needs period): { kind: "previous_equivalent" } | { kind: "preceding", count, unit } | { kind: "period", period }',
  `- grouping (optional): ${list(GROUPINGS)}; distinctBy (required for count_distinct): ${list(DISTINCT_BY)}`,
  '- rank (required for rank): { order: "largest"|"smallest", limit: 1-25 }',
  '- reference (default {kind:"none"}): previous_request | candidate_frame {ordinal 1-25} | candidate_frame_all | ui_selection | ui_view | conversation_entity {value}',
  '- mode: "standalone" | "refine_previous" (refine_previous = a follow-up changing only what the user said; requires reference previous_request)',
  '- presentation (optional): { detail: "brief"|"standard"|"detailed", format?: "prose"|"list"|"table" }',
  '- ambiguities (≤3): { dimension: operation|measure|subject|period|reference|distinct_by, interpretations: 2-4 × { id: snake_case, summary, operation?, distinctBy?, measure? }, resolution: "ask"|"assume_disclosed"|"present_both", assumed?: id }. Record genuine ambiguity instead of guessing.',
  '- action (optional, only for requested changes): { kind: "mutation_proposal", mutation: change_category|change_subcategory|rename_merchant|create_rule, target: a reference, value } with operation "none".',
  '- capability (default supported): { status: "unsupported", concept, reason: no_authoritative_semantics|no_data_source|not_implemented } | { status: "unknown", concept }. Refunds are unsupported (no_authoritative_semantics). Use these instead of inventing meaning.',
  '',
  'Omit optional keys that do not apply; add no other keys; never output placeholder values.',
  '',
  'Rules:',
  '- subjects is always an ARRAY and every subject has "source". reference, period, comparison, rank, action and action.target are OBJECTS.',
  '- operation is only one of the operation values. A comparison goes in "comparison" (operation stays what is being compared, e.g. total); net or in/out money goes in "measure".',
  '- "merchant" is a specific named business. A TYPE of business or spending is category / subcategory / concept, never merchant.',
  '- Relative time words use relative kinds (current, previous, rolling). Put a year number only when the user states one; never guess today\'s date.',
  '- An item the user picks by its position in a list they were shown is {"kind":"candidate_frame","ordinal":N}; for a change, that is action.target.',
].join('\n');

/**
 * Structured-output format whose JSON Schema is GENERATED from the R0 zod schema (the
 * repo's zod-to-json-schema convention, as for tool schemas) — not a parallel schema.
 * Non-strict: it guides the model's shape; the R0 zod validation remains the only gate
 * (refinements such as count_distinct → distinctBy are enforced there).
 */
export const SHADOW_RESPONSE_FORMAT = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'financial_request_v1',
    strict: false,
    // called through a plain function type: zodToJsonSchema's generics instantiate the
    // deeply refined R0 type and hit TS2589; the runtime conversion is unchanged.
    schema: (zodToJsonSchema as unknown as (schema: unknown, opts: Record<string, unknown>) => Record<string, unknown>)(
      FinancialRequestV1Schema, { $refStrategy: 'none', target: 'jsonSchema7' },
    ),
  },
};

export type ShadowChatMessage = { role: 'system' | 'user'; content: string };

/** System prompt + up to N previous USER messages (as quoted context) + the current message. */
export function buildShadowSemanticsMessages(message: string, priorUserMessages: readonly string[] = []): ShadowChatMessage[] {
  const clip = (s: string) => String(s ?? '').slice(0, SHADOW_MAX_MESSAGE_CHARS);
  const prior = priorUserMessages.slice(-SHADOW_MAX_PRIOR_USER_MESSAGES).map(clip).filter(Boolean);
  const msgs: ShadowChatMessage[] = [{ role: 'system', content: SHADOW_SEMANTICS_SYSTEM_PROMPT }];
  if (prior.length > 0) {
    msgs.push({
      role: 'user',
      content: `Earlier messages from the user (context for references only, oldest first):\n${prior.map((p, i) => `${i + 1}. ${JSON.stringify(p)}`).join('\n')}`,
    });
  }
  msgs.push({ role: 'user', content: `Interpret this message:\n${JSON.stringify(clip(message))}` });
  return msgs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Interpretation (fail-open, bounded)
// ─────────────────────────────────────────────────────────────────────────────

export type ShadowFailureCode =
  | 'timeout' | 'model_error' | 'empty_output' | 'invalid_json' | 'invalid_schema' | 'aborted';

export type ShadowOutcome =
  | { status: 'valid'; request: FinancialRequestV1; durationMs: number }
  | { status: 'invalid'; failureCode: ShadowFailureCode; durationMs: number; schemaIssueCount?: number };

/** Injected model call: returns the raw text content. Must honour the abort signal. */
export type ShadowModelCall = (messages: ShadowChatMessage[], signal: AbortSignal) => Promise<string>;

/**
 * Ask the model for a FinancialRequest and validate it with the R0 schema. Never throws.
 * Invalid output is recorded as invalid — it is never repaired with heuristics.
 */
export async function interpretShadowSemantics(input: {
  callModel: ShadowModelCall;
  message: string;
  priorUserMessages?: readonly string[];
  timeoutMs: number;
  abort?: AbortController;
  now?: () => number;
}): Promise<ShadowOutcome> {
  const now = input.now ?? Date.now;
  const started = now();
  const controller = input.abort ?? new AbortController();
  const elapsed = () => Math.max(0, now() - started);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      input.callModel(buildShadowSemanticsMessages(input.message, input.priorUserMessages), controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(Object.assign(new Error('shadow_timeout'), { shadowCode: 'timeout' as const }));
        }, Math.max(1, input.timeoutMs));
      }),
    ]);
    if (!raw || !String(raw).trim()) return { status: 'invalid', failureCode: 'empty_output', durationMs: elapsed() };
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(raw));
    } catch {
      return { status: 'invalid', failureCode: 'invalid_json', durationMs: elapsed() };
    }
    const result = parseFinancialRequest(parsed);
    return result.ok
      ? { status: 'valid', request: result.value, durationMs: elapsed() }
      : { status: 'invalid', failureCode: 'invalid_schema', durationMs: elapsed(), schemaIssueCount: result.errors.length };
  } catch (err: unknown) {
    const code = (err as { shadowCode?: ShadowFailureCode })?.shadowCode
      ?? (controller.signal.aborted ? 'aborted' : 'model_error');
    return { status: 'invalid', failureCode: code, durationMs: elapsed() };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Privacy-safe summary (structure only — NO subject values, concept text, ids,
// interpretation summaries, action values, or message text)
// ─────────────────────────────────────────────────────────────────────────────

export interface ShadowSummary {
  contractVersion: 1;
  valid: boolean;
  failureCode?: ShadowFailureCode;
  schemaIssueCount?: number;
  domain?: string;
  operation?: string;
  measure?: string;
  subjectKinds?: string[];
  subjectCount?: number;
  excludedSubjectCount?: number;
  hasCategoryHint?: boolean;
  periodKind?: string;
  periodUnit?: string;
  comparisonKind?: string;
  grouping?: string;
  distinctBy?: string;
  rankOrder?: string;
  referenceKind?: string;
  mode?: string;
  ambiguityCount?: number;
  ambiguityDimensions?: string[];
  ambiguityResolutions?: string[];
  actionKind?: string;
  mutationKind?: string;
  capabilityStatus?: string;
  capabilityReason?: string;
  durationMs: number;
}

export function summarizeShadowOutcome(outcome: ShadowOutcome): ShadowSummary {
  if (outcome.status !== 'valid') {
    return {
      contractVersion: 1, valid: false, failureCode: outcome.failureCode, durationMs: outcome.durationMs,
      ...(outcome.schemaIssueCount !== undefined ? { schemaIssueCount: outcome.schemaIssueCount } : {}),
    };
  }
  const r = outcome.request;
  const period = r.period as { kind: string; unit?: string } | undefined;
  const capability = r.capability as { status: string; reason?: string };
  return {
    contractVersion: 1,
    valid: true,
    domain: r.domain,
    operation: r.operation,
    ...(r.measure ? { measure: r.measure } : {}),
    subjectKinds: [...new Set(r.subjects.map(s => s.kind))].sort(),
    subjectCount: r.subjects.length,
    excludedSubjectCount: r.subjects.filter(s => s.exclude).length,
    hasCategoryHint: r.subjects.some(s => !!s.categoryHint),
    ...(period ? { periodKind: period.kind, ...(period.unit ? { periodUnit: period.unit } : {}) } : {}),
    ...(r.comparison ? { comparisonKind: r.comparison.kind } : {}),
    ...(r.grouping ? { grouping: r.grouping } : {}),
    ...(r.distinctBy ? { distinctBy: r.distinctBy } : {}),
    ...(r.rank ? { rankOrder: r.rank.order } : {}),
    referenceKind: r.reference.kind,
    mode: r.mode,
    ambiguityCount: r.ambiguities.length,
    ambiguityDimensions: r.ambiguities.map(a => a.dimension),
    ambiguityResolutions: r.ambiguities.map(a => a.resolution),
    ...(r.action ? { actionKind: r.action.kind, mutationKind: r.action.mutation } : {}),
    capabilityStatus: capability.status,
    ...(capability.reason ? { capabilityReason: capability.reason } : {}),
    durationMs: outcome.durationMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy vs shadow — small structural comparison (booleans/enums only)
// ─────────────────────────────────────────────────────────────────────────────

/** Structural facts about the legacy interpretation (no raw values). */
export interface LegacyStructure {
  queryType?: string;           // classifyFinancialQuery.queryType
  requestShape?: string;        // CP4 request shape
  hasMerchantScope: boolean;    // a merchant hint exists
  merchantHintTrusted?: boolean;
  hasCategoryScope: boolean;    // a resolved category exists
  hasPeriod: boolean;           // deterministic temporal scope present
  requiresGrounding?: boolean;
}

export interface ShadowComparison {
  legacy: LegacyStructure;
  shadowHasMerchantSubject: boolean;
  shadowHasCategoryOrConceptSubject: boolean;
  shadowHasPeriod: boolean;
  shadowIsList: boolean;
  disagreements: Array<'merchant_scope' | 'category_scope' | 'period' | 'list_vs_aggregate'>;
}

const LIST_OPERATIONS = new Set(['list']);

export function compareShadowWithLegacy(outcome: ShadowOutcome, legacy: LegacyStructure): ShadowComparison | null {
  if (outcome.status !== 'valid') return null;
  const r = outcome.request;
  const kinds = new Set(r.subjects.filter(s => !s.exclude).map(s => s.kind));
  const shadowHasMerchantSubject = kinds.has('merchant');
  const shadowHasCategoryOrConceptSubject = kinds.has('category') || kinds.has('subcategory') || kinds.has('concept');
  const shadowHasPeriod = !!r.period && r.period.kind !== 'all_time';
  const shadowIsList = LIST_OPERATIONS.has(r.operation);
  const disagreements: ShadowComparison['disagreements'] = [];
  if (legacy.hasMerchantScope !== shadowHasMerchantSubject) disagreements.push('merchant_scope');
  if (legacy.hasCategoryScope !== shadowHasCategoryOrConceptSubject) disagreements.push('category_scope');
  if (legacy.hasPeriod !== shadowHasPeriod) disagreements.push('period');
  const legacyIsList = legacy.requestShape === 'list' || legacy.queryType === 'detail';
  const shadowIsAggregate = ['total', 'count', 'count_distinct', 'average', 'trend'].includes(r.operation);
  if ((legacyIsList && shadowIsAggregate) || (!legacyIsList && legacy.requestShape === 'aggregate' && shadowIsList)) {
    disagreements.push('list_vs_aggregate');
  }
  return { legacy, shadowHasMerchantSubject, shadowHasCategoryOrConceptSubject, shadowHasPeriod, shadowIsList, disagreements };
}

/** One privacy-safe log payload (structure only). */
export function buildShadowLogPayload(outcome: ShadowOutcome, legacy: LegacyStructure | null, model?: string): Record<string, unknown> {
  return {
    r1: SHADOW_SEMANTICS_VERSION,
    ...(model ? { model } : {}),
    shadow: summarizeShadowOutcome(outcome),
    ...(legacy ? { comparison: compareShadowWithLegacy(outcome, legacy) } : {}),
  };
}
