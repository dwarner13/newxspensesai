/**
 * PRIME C2-C / M1a — financial conversational memory (SHADOW ONLY).
 *
 * Stores the VERIFIED scope of the last authoritatively-answered financial request in
 * chat_sessions.context.last_financial_request, detects follow-up questions, and proposes a
 * deterministic interpretation. Nothing here routes, plans, executes or changes an answer:
 * chat.ts only logs the structural outcome (status codes and flags).
 *
 * What is stored (and only this): subject / request shape, a taxonomy-resolved category, a
 * TRUSTED merchant, the resolved period + granularity, the spending scope and merchant
 * exclusions, evidence kinds/tools + verification status, a value-free fingerprint, an owner
 * tag, and timestamps. Never amounts, rows, transaction ids, model text or briefing figures —
 * the only input is the authoritative P3.1C execution result.
 *
 * Pure TypeScript: no Supabase, no network, no model calls.
 */

import type { FinancialQueryClassification, FinancialSubject } from './financial-query-classifier';
import type { PrimeTemporalScope } from './prime-temporal-scope';
import type { PrimeEvidenceExecutionResult } from './prime-evidence-executor';

export const LAST_FINANCIAL_REQUEST_VERSION = 1 as const;
/** Same lifetime as the other conversational contexts (merchant_analysis, tx_resolution). */
export const LAST_FINANCIAL_REQUEST_TTL_MS = 30 * 60 * 1000;

const AUTHORITATIVE_TOOLS = new Set(['cash_flow_summary', 'transaction_category_totals', 'merchant_totals', 'tx_search']);

export type SpendingScopeKind =
  | 'ordinary_spending'   // cash_flow spending bucket: transfers, debt payments, savings/investment excluded
  | 'cash_flow'           // income / inflow / outflow / net / other cash-flow subjects
  | 'category'            // one taxonomy category
  | 'category_breakdown'  // all categories
  | 'merchant'            // trusted merchant groups
  | 'transactions';       // explicit transaction list

export interface LastFinancialRequest {
  v: typeof LAST_FINANCIAL_REQUEST_VERSION;
  ownerTag: string;
  subject: FinancialSubject | null;
  requestShape: 'aggregate' | 'list';
  category: { category: string; subcategory?: string } | null;
  merchant: string | null;
  period: { from: string; to: string; label: string; granularity: PrimeTemporalScope['granularity'] } | null;
  scope: { kind: SpendingScopeKind; excludesNonSpend: boolean; excludedGroups: string[] };
  evidence: { kinds: string[]; tools: string[]; status: 'verified' | 'verified_zero'; fingerprint: string };
  savedAt: string;
  expiresAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashing (value-free fingerprints; not a security primitive)
// ─────────────────────────────────────────────────────────────────────────────

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function ownerTagFor(userId: string): string {
  return fnv1a(`prime-m1a:${userId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Build (write side) — only from successful authoritative evidence
// ─────────────────────────────────────────────────────────────────────────────

export function buildLastFinancialRequest(input: {
  userId: string;
  financialClassification: FinancialQueryClassification | null | undefined;
  temporalScope: PrimeTemporalScope | null | undefined;
  evidence: PrimeEvidenceExecutionResult | null | undefined;
  merchantHintTrusted: boolean;
  excludedGroups?: readonly string[];
  now: number;
}): LastFinancialRequest | null {
  const { financialClassification: fc, temporalScope: ts, evidence } = input;
  if (!input.userId || !fc?.requiresGrounding || !evidence) return null;
  if (fc.requestShape !== 'aggregate' && fc.requestShape !== 'list') return null;
  // Only after successful authoritative execution: every executed authoritative result succeeded.
  const executed = evidence.results.filter(r => r.tool && AUTHORITATIVE_TOOLS.has(r.tool) && r.status !== 'skipped');
  if (executed.length === 0) return null;
  if (executed.some(r => !r.authoritative || (r.status !== 'resolved' && r.status !== 'successful_empty'))) return null;
  if (evidence.results.some(r => r.status === 'failed')) return null;
  // A comparison is stored as its primary period only when the comparison itself is explicit.
  const merchant = fc.merchantHint && input.merchantHintTrusted ? fc.merchantHint : null;
  if (fc.queryType === 'merchant' && !merchant) return null; // untrusted merchant scope is never remembered

  const tools = [...new Set(executed.map(r => r.tool!))].sort();
  const kinds = [...new Set(executed.map(r => String(r.evidenceKind)))].sort();
  const category = fc.resolvedCategory
    ? { category: fc.resolvedCategory.category, ...(fc.resolvedCategory.subcategory ? { subcategory: fc.resolvedCategory.subcategory } : {}) }
    : null;
  const period = ts?.primary && ts.primary.confidence === 'deterministic'
    ? { from: ts.primary.from, to: ts.primary.to, label: ts.primary.label, granularity: ts.granularity }
    : null;

  let kind: SpendingScopeKind;
  if (fc.requestShape === 'list') kind = 'transactions';
  else if (merchant) kind = 'merchant';
  else if (fc.wantsBreakdown) kind = 'category_breakdown';
  else if (category && tools.includes('transaction_category_totals')) kind = 'category';
  else if (fc.subject === 'spending') kind = 'ordinary_spending';
  else kind = 'cash_flow';

  const status = executed.every(r => r.status === 'successful_empty') ? 'verified_zero' : 'verified';
  const scopeSig = executed
    .map(r => `${r.tool}|${r.status}|${r.scope?.startDate ?? ''}|${r.scope?.endDate ?? ''}|${r.scope?.year ?? ''}|${r.rowCount ?? 0}`)
    .sort().join(';');
  const now = input.now;
  return {
    v: LAST_FINANCIAL_REQUEST_VERSION,
    ownerTag: ownerTagFor(input.userId),
    subject: fc.subject ?? null,
    requestShape: fc.requestShape,
    category,
    merchant,
    period,
    scope: {
      kind,
      excludesNonSpend: kind === 'ordinary_spending' || ((kind === 'category' || kind === 'category_breakdown') && fc.subject === 'spending'),
      excludedGroups: kind === 'merchant' ? [...(input.excludedGroups ?? [])].slice(0, 50) : [],
    },
    evidence: { kinds, tools, status, fingerprint: fnv1a(`${kind}#${category?.category ?? ''}#${merchant ?? ''}#${scopeSig}`) },
    savedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + LAST_FINANCIAL_REQUEST_TTL_MS).toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read side — fail closed
// ─────────────────────────────────────────────────────────────────────────────

export type ContextStatus = 'none' | 'valid' | 'expired' | 'invalid' | 'cross_user';

export function validateLastFinancialRequest(raw: unknown, userId: string, now: number):
  { status: 'valid'; value: LastFinancialRequest } | { status: Exclude<ContextStatus, 'valid'> } {
  if (raw === undefined || raw === null) return { status: 'none' };
  if (typeof raw !== 'object') return { status: 'invalid' };
  const r = raw as Partial<LastFinancialRequest>;
  if (r.v !== LAST_FINANCIAL_REQUEST_VERSION || typeof r.ownerTag !== 'string' || !r.scope || !r.evidence
    || (r.requestShape !== 'aggregate' && r.requestShape !== 'list') || typeof r.expiresAt !== 'string') {
    return { status: 'invalid' };
  }
  if (!userId || r.ownerTag !== ownerTagFor(userId)) return { status: 'cross_user' };
  const exp = Date.parse(r.expiresAt);
  if (!Number.isFinite(exp) || exp <= now) return { status: 'expired' };
  return { status: 'valid', value: r as LastFinancialRequest };
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up detection (deterministic grammar; no question catalogue)
// ─────────────────────────────────────────────────────────────────────────────

export type FollowUpKind =
  | 'previous_period'      // "the month before", "the year before that"
  | 'category_superlative' // "which category was biggest"
  | 'reference_list'       // "show me those transactions"
  | 'reference_total'      // "how much did those total"
  | 'scope_swap'           // "what about groceries"
  | 'comparison'           // "was that higher than April?"
  | 'independent'          // a complete new question → reset
  | 'none';

const ANAPHOR_RE = /\b(that|those|these|them|it)\b/i;
const PREVIOUS_PERIOD_RE = /\bthe\s+(day|week|month|quarter|year)\s+before\b|\b(day|week|month|quarter|year)\s+before\s+that\b/i;
const SUPERLATIVE_CATEGORY_RE = /\b(which|what)\s+(category|categories)\b[^?]*\b(biggest|largest|most|highest|top)\b|\b(biggest|largest|top|highest)\s+(spending\s+)?categor(y|ies)\b/i;
const REFERENCE_LIST_RE = /\b(show|list|see|display|pull\s+up)\b[^?]*\b(those|these|them)\b/i;
const REFERENCE_TOTAL_RE = /\b(how\s+much|total|sum|add\s+up)\b[^?]*\b(those|these|them)\b|\b(those|these|them)\b[^?]*\b(total|add\s+up|cost)\b/i;
const SWAP_LEAD_RE = /^\s*(and\s+)?(what|how)\s+about\b|^\s*and\s+/i;
const COMPARISON_RE = /\b(higher|lower|more|less|bigger|smaller|up|down)\s+than\b|\bcompared?\s+(to|with)\b|\bvs\.?\b|\bversus\b/i;

export function detectFinancialFollowUp(input: {
  message: string;
  financialClassification: FinancialQueryClassification | null | undefined;
  temporalScope: PrimeTemporalScope | null | undefined;
}): FollowUpKind {
  const m = String(input.message || '');
  const fc = input.financialClassification;
  const hasOwnPeriod = !!input.temporalScope?.primary;
  const anaphoric = ANAPHOR_RE.test(m);
  if (PREVIOUS_PERIOD_RE.test(m)) return 'previous_period';
  if (anaphoric && COMPARISON_RE.test(m) && hasOwnPeriod) return 'comparison';
  if (SUPERLATIVE_CATEGORY_RE.test(m) && !hasOwnPeriod) return 'category_superlative';
  if (REFERENCE_TOTAL_RE.test(m)) return 'reference_total';
  if (REFERENCE_LIST_RE.test(m)) return 'reference_list';
  if (SWAP_LEAD_RE.test(m) && (fc?.resolvedCategory || hasOwnPeriod)) return 'scope_swap';
  // A grounded question with its own period and no reference back is a new, independent request.
  if (fc?.requiresGrounding && hasOwnPeriod && !anaphoric) return 'independent';
  return 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposal (shadow) — deterministic, value-free
// ─────────────────────────────────────────────────────────────────────────────

export type ProposalStatus = 'proposed' | 'no_followup' | 'independent' | 'no_context' | 'unsupported';
export type PeriodSource = 'inherited' | 'shifted' | 'explicit' | 'none';

export interface FollowUpProposal {
  status: ProposalStatus;
  kind: FollowUpKind;
  contextStatus: ContextStatus;
  periodSource: PeriodSource;
  period: { from: string; to: string; label: string } | null;
  comparisonPeriod: { from: string; to: string; label: string } | null;
  category: { category: string; subcategory?: string } | null;
  merchant: string | null;
  scopeKind: SpendingScopeKind | null;
  /** The existing tool the deterministic plan would use. */
  tool: 'cash_flow_summary' | 'transaction_category_totals' | 'merchant_totals' | 'tx_search' | 'candidate_frame' | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
function addMonths(ymd: string, months: number): string {
  const [y, m] = ymd.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01`;
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The equal-length calendar period immediately before (month / quarter / year only). */
export function shiftPeriodBack(p: LastFinancialRequest['period']): { from: string; to: string; label: string } | null {
  if (!p) return null;
  const firstOfMonth = /^\d{4}-\d{2}-01$/;
  if (!firstOfMonth.test(p.from) || !firstOfMonth.test(p.to)) return null;
  const span = (Number(p.to.slice(0, 4)) - Number(p.from.slice(0, 4))) * 12 + (Number(p.to.slice(5, 7)) - Number(p.from.slice(5, 7)));
  if (![1, 3, 12].includes(span)) return null;
  const from = addMonths(p.from, -span);
  const label = span === 1 ? `${MONTHS[Number(from.slice(5, 7)) - 1]} ${from.slice(0, 4)}`
    : span === 12 ? from.slice(0, 4) : `${from} to ${addMonths(p.from, -1)}`;
  return { from, to: p.from, label };
}

function toolFor(scope: SpendingScopeKind, kind: FollowUpKind): FollowUpProposal['tool'] {
  if (kind === 'reference_list') return 'tx_search';
  if (kind === 'category_superlative') return 'transaction_category_totals';
  if (scope === 'merchant') return 'merchant_totals';
  if (scope === 'transactions') return 'tx_search';
  if (scope === 'category' || scope === 'category_breakdown') return 'transaction_category_totals';
  return 'cash_flow_summary';
}

export function proposeFollowUp(input: {
  kind: FollowUpKind;
  context: ReturnType<typeof validateLastFinancialRequest>;
  financialClassification: FinancialQueryClassification | null | undefined;
  temporalScope: PrimeTemporalScope | null | undefined;
  hasCandidateFrame: boolean;
}): FollowUpProposal {
  const base: FollowUpProposal = {
    status: 'no_followup', kind: input.kind, contextStatus: input.context.status, periodSource: 'none',
    period: null, comparisonPeriod: null, category: null, merchant: null, scopeKind: null, tool: null,
  };
  if (input.kind === 'none') return base;
  if (input.kind === 'independent') return { ...base, status: 'independent' };
  if (input.context.status !== 'valid') return { ...base, status: 'no_context' };
  const prev = input.context.value;
  const fc = input.financialClassification;
  const own = input.temporalScope?.primary ?? null;
  const ownPeriod = own ? { from: own.from, to: own.to, label: own.label } : null;
  const inherited = prev.period ? { from: prev.period.from, to: prev.period.to, label: prev.period.label } : null;

  let period = inherited;
  let periodSource: PeriodSource = inherited ? 'inherited' : 'none';
  let comparisonPeriod: FollowUpProposal['comparisonPeriod'] = null;
  let category = prev.category;
  let merchant = prev.merchant;
  let scopeKind = prev.scope.kind;

  switch (input.kind) {
    case 'previous_period': {
      const shifted = shiftPeriodBack(prev.period);
      if (!shifted) return { ...base, status: 'unsupported' };
      period = shifted; periodSource = 'shifted';
      break;
    }
    case 'comparison':
      if (!inherited || !ownPeriod) return { ...base, status: 'unsupported' };
      comparisonPeriod = ownPeriod;
      break;
    case 'category_superlative':
      if (ownPeriod) { period = ownPeriod; periodSource = 'explicit'; }
      category = null; merchant = null; scopeKind = 'category_breakdown';
      break;
    case 'reference_list':
      if (ownPeriod) { period = ownPeriod; periodSource = 'explicit'; }
      break;
    case 'reference_total':
      if (input.hasCandidateFrame) {
        return { ...base, status: 'proposed', periodSource: 'inherited', period: inherited, category, merchant, scopeKind, tool: 'candidate_frame' };
      }
      break;
    case 'scope_swap':
      if (ownPeriod) { period = ownPeriod; periodSource = 'explicit'; }
      if (fc?.resolvedCategory) {
        category = { category: fc.resolvedCategory.category, ...(fc.resolvedCategory.subcategory ? { subcategory: fc.resolvedCategory.subcategory } : {}) };
        merchant = null;
        scopeKind = 'category';
      }
      break;
  }
  return { ...base, status: 'proposed', periodSource, period, comparisonPeriod, category, merchant, scopeKind, tool: toolFor(scopeKind, input.kind) };
}

/** Structural log payload — status codes and flags only (no dates, names, amounts or ids). */
export function buildFollowUpLog(p: FollowUpProposal, wroteContext: boolean): Record<string, unknown> {
  return {
    m1a: 1,
    contextStatus: p.contextStatus,
    followUp: p.kind,
    status: p.status,
    periodSource: p.periodSource,
    hasComparison: !!p.comparisonPeriod,
    inheritsCategory: !!p.category,
    inheritsMerchant: !!p.merchant,
    scopeKind: p.scopeKind,
    tool: p.tool,
    wroteContext,
  };
}
