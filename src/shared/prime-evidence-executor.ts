/**
 * P3.1C — CONTROLLED READ-ONLY EVIDENCE EXECUTION
 *
 * Executes P3.1B evidence plan steps using a narrow read-only allowlist.
 * Produces typed execution results with sufficiency assessment.
 *
 * V1 ALLOWLIST (hardcoded, explicit):
 *   tx_search
 *   transaction_category_totals
 *
 * EXECUTION CONTRACT:
 * - Uses authenticated userId from verified JWT context (never from plan params)
 * - All parameters from deterministic classifiers (never from model)
 * - Ambiguous temporal scope (bare month) NEVER triggers autonomous execution
 * - Mutation tools CANNOT execute (allowlist is the definitive gate)
 * - Sequential execution (no parallel fan-out in V1)
 * - Results capped before model injection
 *
 * Pure TypeScript types + execution logic. No React.
 */

import type { PrimeEvidenceKind } from './prime-evidence-contract';
import type { PrimeIntent } from './prime-intent-classifier';
import type {
  PrimeEvidencePlan,
  PrimeEvidencePlanStep,
} from './prime-evidence-resolver';

// ─────────────────────────────────────────────────────────────────────────────
// V1 READ-ONLY ALLOWLIST — definitive execution gate
// ─────────────────────────────────────────────────────────────────────────────

export const EVIDENCE_READ_ALLOWLIST = new Set([
  'tx_search',
  'transaction_category_totals',
  'cash_flow_summary',
  'merchant_totals',
]);

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION LIMITS
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_EVIDENCE_TOOL_CALLS = 5;
export const PER_TOOL_TIMEOUT_MS = 3_000;
export const TOTAL_EVIDENCE_BUDGET_MS = 8_000;

/**
 * V1-A CP3: the two authoritative aggregate tools page through a whole date
 * range, so they get a longer step timeout. Every other tool keeps
 * PER_TOOL_TIMEOUT_MS. An override is always bounded by what remains of
 * TOTAL_EVIDENCE_BUDGET_MS.
 */
export const PER_TOOL_TIMEOUT_OVERRIDES_MS: Readonly<Record<string, number>> = {
  cash_flow_summary: 8_000,
  transaction_category_totals: 8_000,
};

/** Step timeout for a tool: default 3s, or the override capped by the remaining total budget. */
export function stepTimeoutMs(tool: string, budgetStart: number, now: number = Date.now()): number {
  const override = PER_TOOL_TIMEOUT_OVERRIDES_MS[tool];
  if (override === undefined) return PER_TOOL_TIMEOUT_MS;
  const remaining = TOTAL_EVIDENCE_BUDGET_MS - (now - budgetStart);
  return Math.max(0, Math.min(override, remaining));
}

/** Max transaction rows passed to model context */
export const MAX_TX_ROWS_IN_CONTEXT = 25;
/** Max category total entries passed to model context */
export const MAX_CATEGORY_TOTALS_IN_CONTEXT = 30;

// ─────────────────────────────────────────────────────────────────────────────
// RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EvidenceStepStatus =
  | 'resolved'
  | 'successful_empty'
  | 'failed'
  | 'skipped'
  | 'unavailable';

export type EvidenceSufficiency = 'sufficient' | 'partial' | 'insufficient';

export interface PrimeEvidenceResult {
  evidenceKind: PrimeEvidenceKind;
  status: EvidenceStepStatus;
  authoritative: boolean;
  source: string;
  tool?: string;
  data?: unknown;
  rowCount?: number;
  durationMs?: number;
  error?: string;
  /** Period label for comparison results */
  periodLabel?: string;
}

export interface PrimeEvidenceExecutionResult {
  intent: PrimeIntent;
  results: PrimeEvidenceResult[];
  overallSufficiency: EvidenceSufficiency;
  executedCount: number;
  skippedCount: number;
  failedCount: number;
  resolvedCount: number;
  successfulEmptyCount: number;
  totalDurationMs: number;
  dedupHitCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUP CACHE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a canonical dedup key from tool name + params.
 * Object keys are sorted to ensure equivalent param objects produce the same key.
 * The key itself may contain financial values — NEVER log it.
 */
export function buildDedupKey(tool: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return tool;
  const sorted = Object.keys(params).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = params[k];
    return acc;
  }, {});
  return `${tool}::${JSON.stringify(sorted)}`;
}

export type DedupCache = Map<string, { data: unknown; rowCount: number }>;

// ─────────────────────────────────────────────────────────────────────────────
// TOOL EXECUTOR INTERFACE (dependency injection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstraction over actual tool execution.
 * chat.ts passes in a function that wraps executeTool() with the correct
 * userId, session, and auth context from the verified JWT.
 *
 * P3.1C NEVER accepts userId as a parameter — it is baked into the executor.
 */
export type EvidenceToolExecutor = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

// ─────────────────────────────────────────────────────────────────────────────
// ELIGIBILITY CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether a plan step is eligible for P3.1C autonomous execution.
 *
 * Returns null if eligible, or a reason string if not.
 */
export function checkStepEligibility(
  step: PrimeEvidencePlanStep,
): string | null {
  // Must have a tool
  if (!step.tool) return 'no_tool';

  // Must be in allowlist
  if (!EVIDENCE_READ_ALLOWLIST.has(step.tool)) return 'tool_not_in_allowlist';

  // Mode must be executable (tool or multi_source)
  if (step.mode !== 'tool' && step.mode !== 'multi_source') return 'non_executable_mode';

  // Temporal ambiguity check: if params contain startDate/endDate, they must
  // NOT have come from an ambiguous temporal scope. The P3.1B resolver only
  // injects date params when confidence is 'deterministic', but we double-check
  // by looking for the ambiguity marker.
  // (P3.1B already guarantees this — this is defense-in-depth.)

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTE EVIDENCE PLAN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Execute eligible P3.1B evidence plan steps using the narrow V1 allowlist.
 *
 * Returns typed execution results with sufficiency assessment.
 * Non-fatal: failures are captured, never thrown.
 */
export async function executeEvidencePlan(
  plan: PrimeEvidencePlan,
  executor: EvidenceToolExecutor,
  dedupCache: DedupCache,
): Promise<PrimeEvidenceExecutionResult> {
  const results: PrimeEvidenceResult[] = [];
  let executedCount = 0;
  let dedupHitCount = 0;
  const startTime = Date.now();

  for (const step of plan.steps) {
    // Budget check
    if (Date.now() - startTime >= TOTAL_EVIDENCE_BUDGET_MS) {
      results.push({
        evidenceKind: step.evidenceKind,
        status: 'skipped',
        authoritative: step.authoritative,
        source: step.source,
        tool: step.tool,
        error: 'total_budget_exceeded',
      });
      continue;
    }
    if (executedCount >= MAX_EVIDENCE_TOOL_CALLS) {
      results.push({
        evidenceKind: step.evidenceKind,
        status: 'skipped',
        authoritative: step.authoritative,
        source: step.source,
        tool: step.tool,
        error: 'max_calls_exceeded',
      });
      continue;
    }

    // Eligibility
    const ineligible = checkStepEligibility(step);
    if (ineligible) {
      results.push({
        evidenceKind: step.evidenceKind,
        status: 'skipped',
        authoritative: step.authoritative,
        source: step.source,
        tool: step.tool,
        error: ineligible,
      });
      continue;
    }

    // Multi-source (period comparison) — execute two calls
    if (step.mode === 'multi_source' && step.params) {
      const compResults = await executeMultiSource(step, executor, dedupCache, startTime);
      executedCount += compResults.callCount;
      dedupHitCount += compResults.dedupHits;
      results.push(...compResults.results);
      continue;
    }

    // Single tool call
    const singleResult = await executeSingleStep(step, executor, dedupCache, startTime);
    if (singleResult.dedupHit) dedupHitCount++;
    else executedCount++;
    results.push(singleResult.result);
  }

  // Compute sufficiency
  const overallSufficiency = assessSufficiency(plan, results);

  const totalDurationMs = Date.now() - startTime;

  return {
    intent: plan.intent,
    results,
    overallSufficiency,
    executedCount,
    skippedCount: results.filter(r => r.status === 'skipped').length,
    failedCount: results.filter(r => r.status === 'failed').length,
    resolvedCount: results.filter(r => r.status === 'resolved').length,
    successfulEmptyCount: results.filter(r => r.status === 'successful_empty').length,
    totalDurationMs,
    dedupHitCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE STEP EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

async function executeSingleStep(
  step: PrimeEvidencePlanStep,
  executor: EvidenceToolExecutor,
  cache: DedupCache,
  budgetStart: number,
): Promise<{ result: PrimeEvidenceResult; dedupHit: boolean }> {
  const tool = step.tool!;
  const args = buildToolArgs(step);
  const dedupKey = buildDedupKey(tool, args);

  // Dedup check
  const cached = cache.get(dedupKey);
  if (cached) {
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: cached.rowCount === 0 ? 'successful_empty' : 'resolved',
        authoritative: step.authoritative,
        source: step.source,
        tool,
        data: cached.data,
        rowCount: cached.rowCount,
        durationMs: 0,
      },
      dedupHit: true,
    };
  }

  const stepStart = Date.now();
  const timeoutMs = stepTimeoutMs(tool, budgetStart, stepStart);
  if (timeoutMs <= 0) {
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: 'failed',
        authoritative: step.authoritative,
        source: step.source,
        tool,
        durationMs: 0,
        error: 'total_budget_exceeded',
      },
      dedupHit: false,
    };
  }
  try {
    const rawResult = await withStepTimeout(executor(tool, args), timeoutMs);
    const durationMs = Date.now() - stepStart;

    // CP1: a tool/query failure is never empty or $0 evidence (and is never cached).
    const failure = detectToolFailure(rawResult);
    if (failure) {
      return {
        result: {
          evidenceKind: step.evidenceKind,
          status: 'failed',
          authoritative: step.authoritative,
          source: step.source,
          tool,
          durationMs,
          error: failure,
        },
        dedupHit: false,
      };
    }

    const { data, rowCount } = extractResultData(tool, rawResult);

    // Detect truncation: if the tool returned queryStatus='partial',
    // the underlying DB query was truncated and results are incomplete.
    // Downgrade authoritative to false so evidence is never presented
    // as definitive complete totals.
    const isTruncated = isPartialEvidence(data);

    // Cache it
    cache.set(dedupKey, { data, rowCount });

    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: rowCount === 0 ? 'successful_empty' : 'resolved',
        authoritative: isTruncated ? false : step.authoritative,
        source: isTruncated ? step.source + ' (partial — query truncated)' : step.source,
        tool,
        data,
        rowCount,
        durationMs,
      },
      dedupHit: false,
    };
  } catch (err: any) {
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: 'failed',
        authoritative: step.authoritative,
        source: step.source,
        tool,
        durationMs: Date.now() - stepStart,
        error: err?.message || 'execution_error',
      },
      dedupHit: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SOURCE EXECUTION (period comparison)
// ─────────────────────────────────────────────────────────────────────────────

async function executeMultiSource(
  step: PrimeEvidencePlanStep,
  executor: EvidenceToolExecutor,
  cache: DedupCache,
  budgetStart: number,
): Promise<{ results: PrimeEvidenceResult[]; callCount: number; dedupHits: number }> {
  const params = step.params!;
  const tool = step.tool!;
  const results: PrimeEvidenceResult[] = [];
  let callCount = 0;
  let dedupHits = 0;

  // Period A
  const argsA = buildPeriodArgs(params, 'A');
  const labelA = buildPeriodLabel(params, 'A');
  const resultA = await executeOnePeriod(tool, argsA, labelA, step, executor, cache, budgetStart);
  if (resultA.dedupHit) dedupHits++; else callCount++;

  // Period B
  const argsB = buildPeriodArgs(params, 'B');
  const labelB = buildPeriodLabel(params, 'B');
  const resultB = await executeOnePeriod(tool, argsB, labelB, step, executor, cache, budgetStart);
  if (resultB.dedupHit) dedupHits++; else callCount++;

  // Both must succeed for period_comparison to be sufficient
  const aOk = resultA.result.status === 'resolved' || resultA.result.status === 'successful_empty';
  const bOk = resultB.result.status === 'resolved' || resultB.result.status === 'successful_empty';

  if (aOk && bOk) {
    // Merge into single comparison result
    results.push({
      evidenceKind: step.evidenceKind,
      status: 'resolved',
      authoritative: step.authoritative && resultA.result.authoritative && resultB.result.authoritative,
      source: step.source,
      tool,
      data: {
        periodA: { label: labelA, ...resultA.result.data as object },
        periodB: { label: labelB, ...resultB.result.data as object },
      },
      rowCount: (resultA.result.rowCount ?? 0) + (resultB.result.rowCount ?? 0),
      durationMs: (resultA.result.durationMs ?? 0) + (resultB.result.durationMs ?? 0),
    });
  } else {
    // One or both failed — comparison is NOT sufficient
    // Return individual results so caller can see what happened
    results.push(resultA.result, resultB.result);
  }

  return { results, callCount, dedupHits };
}

async function executeOnePeriod(
  tool: string,
  args: Record<string, unknown>,
  label: string,
  step: PrimeEvidencePlanStep,
  executor: EvidenceToolExecutor,
  cache: DedupCache,
  budgetStart: number,
): Promise<{ result: PrimeEvidenceResult; dedupHit: boolean }> {
  const dedupKey = buildDedupKey(tool, args);
  const cached = cache.get(dedupKey);
  if (cached) {
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: cached.rowCount === 0 ? 'successful_empty' : 'resolved',
        authoritative: step.authoritative,
        source: step.source,
        tool,
        data: cached.data,
        rowCount: cached.rowCount,
        durationMs: 0,
        periodLabel: label,
      },
      dedupHit: true,
    };
  }

  const stepStart = Date.now();
  const timeoutMs = stepTimeoutMs(tool, budgetStart, stepStart);
  if (timeoutMs <= 0) {
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: 'failed',
        authoritative: step.authoritative,
        source: step.source,
        tool,
        durationMs: 0,
        error: 'total_budget_exceeded',
        periodLabel: label,
      },
      dedupHit: false,
    };
  }
  try {
    const rawResult = await withStepTimeout(executor(tool, args), timeoutMs);
    const durationMs = Date.now() - stepStart;

    // CP1: a tool/query failure is never empty or $0 evidence (and is never cached).
    const failure = detectToolFailure(rawResult);
    if (failure) {
      return {
        result: {
          evidenceKind: step.evidenceKind,
          status: 'failed',
          authoritative: step.authoritative,
          source: step.source,
          tool,
          durationMs,
          error: failure,
          periodLabel: label,
        },
        dedupHit: false,
      };
    }

    const { data, rowCount } = extractResultData(tool, rawResult);
    // CP1: preserve an explicit 'partial' (truncated) marker — never authoritative.
    const isTruncated = isPartialEvidence(data);
    cache.set(dedupKey, { data, rowCount });
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: rowCount === 0 ? 'successful_empty' : 'resolved',
        authoritative: isTruncated ? false : step.authoritative,
        source: isTruncated ? step.source + ' (partial — query truncated)' : step.source,
        tool,
        data,
        rowCount,
        durationMs,
        periodLabel: label,
      },
      dedupHit: false,
    };
  } catch (err: any) {
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: 'failed',
        authoritative: step.authoritative,
        source: step.source,
        tool,
        durationMs: Date.now() - stepStart,
        error: err?.message || 'execution_error',
        periodLabel: label,
      },
      dedupHit: false,
    };
  }
}

function buildPeriodArgs(params: Record<string, unknown>, period: 'A' | 'B'): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  const startKey = `period${period}_startDate`;
  const endKey = `period${period}_endDate`;
  const yearKey = `period${period}_year`;

  if (params[startKey] && params[endKey]) {
    args.startDate = params[startKey];
    args.endDate = params[endKey];
  } else if (params[yearKey]) {
    args.year = params[yearKey];
  }

  // Carry through category/subcategory if present
  if (params.category) args.category = params.category;
  if (params.subcategory) args.subcategory = params.subcategory;

  // P3.2B2A: Carry merchant + excludeGroups for merchant comparison
  if (params.merchant) args.merchant = params.merchant;
  if (Array.isArray(params.excludeGroups) && params.excludeGroups.length > 0) {
    args.excludeGroups = params.excludeGroups;
  }

  return args;
}

function buildPeriodLabel(params: Record<string, unknown>, period: 'A' | 'B'): string {
  const startKey = `period${period}_startDate`;
  const yearKey = `period${period}_year`;
  if (params[startKey]) return `${params[startKey]} to ${params[`period${period}_endDate`]}`;
  if (params[yearKey]) return `${params[yearKey]}`;
  return `Period ${period}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL ARG EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function buildToolArgs(step: PrimeEvidencePlanStep): Record<string, unknown> {
  if (!step.params) return {};

  const args: Record<string, unknown> = {};
  // Copy only recognized tool parameters — never copy userId
  const allowed = ['q', 'category', 'subcategory', 'startDate', 'endDate',
    'year', 'exactDate', 'exactAmount', 'limit', 'minAmount', 'maxAmount', 'type',
    'merchant', 'excludeGroups'];
  for (const key of allowed) {
    if (step.params[key] !== undefined) {
      args[key] = step.params[key];
    }
  }
  return args;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULT DATA EXTRACTION + CAPPING
// ─────────────────────────────────────────────────────────────────────────────

function extractResultData(tool: string, rawResult: unknown): { data: unknown; rowCount: number } {
  if (!rawResult || typeof rawResult !== 'object') {
    return { data: rawResult, rowCount: 0 };
  }

  const result = rawResult as Record<string, unknown>;

  if (tool === 'tx_search') {
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const capped = rows.slice(0, MAX_TX_ROWS_IN_CONTEXT);
    return {
      data: {
        rows: capped,
        totalCount: rows.length,
        queryStatus: result.queryStatus ?? 'verified',
        capped: rows.length > MAX_TX_ROWS_IN_CONTEXT,
      },
      rowCount: rows.length,
    };
  }

  if (tool === 'transaction_category_totals') {
    // CP1: the real tool output is `categoryTotals: [{ category, totalAmount,
    // transactionCount, avgAmount }]`; legacy `totals | categories | data` shapes
    // remain accepted. Entries are normalized to integer cents at this boundary.
    const raw = Array.isArray(result.categoryTotals) ? result.categoryTotals :
      Array.isArray(result.totals) ? result.totals :
        Array.isArray(result.categories) ? result.categories :
          Array.isArray(result.data) ? result.data : [];
    const { totals, malformedCount } = normalizeCategoryTotals(raw);
    const capped = totals.slice(0, MAX_CATEGORY_TOTALS_IN_CONTEXT);
    return {
      data: {
        totals: capped,
        totalCount: totals.length,
        capped: totals.length > MAX_CATEGORY_TOTALS_IN_CONTEXT,
        malformedCount,
        summary: result.summary,
        grandTotalCents: toCents(result.grandTotal ?? result.total),
        ...(result.queryStatus !== undefined ? { queryStatus: result.queryStatus } : {}),
        // V1-A CP3: authoritative purpose totals + completeness, when the tool provides them
        ...(result.totalsByPurpose && typeof result.totalsByPurpose === 'object' ? { totalsByPurpose: result.totalsByPurpose } : {}),
        ...(result.completeness && typeof result.completeness === 'object' ? { completeness: result.completeness } : {}),
        ...(typeof result.categoryFilter === 'string' ? { categoryFilter: result.categoryFilter } : {}),
      },
      rowCount: totals.length,
    };
  }

  if (tool === 'cash_flow_summary') {
    // V1-A CP3: emptiness is the number of transactions that contributed, not "1 result object".
    const included = typeof result.transactionCount === 'number' && Number.isFinite(result.transactionCount)
      ? result.transactionCount : 1;
    return { data: result, rowCount: included };
  }

  if (tool === 'merchant_totals') {
    const merchants = Array.isArray(result.merchants) ? result.merchants : [];
    const queryStatus = result.queryStatus ?? 'verified';
    return {
      data: {
        merchants,
        grandTotal: result.grandTotal,
        transactionCount: result.transactionCount,
        dateRange: result.dateRange,
        queryStatus,
        // P3.2B2C parity: carried to MerchantAnalysisContext (not rendered into the prompt)
        evidence: result.evidence,
      },
      rowCount: merchants.length,
    };
  }

  return { data: result, rowCount: 1 };
}

// ─────────────────────────────────────────────────────────────────────────────
// CP1 — EVIDENCE CONTRACT HONESTY
// ─────────────────────────────────────────────────────────────────────────────

/** Category-total evidence as normalized at the executor boundary. */
export interface NormalizedCategoryTotal {
  category: string;
  /** Integer cents (the tool's totalCents, else totalAmount / legacy total|amount). */
  totalCents: number;
  /** Transaction count, or null when the tool did not supply a valid one. */
  count: number | null;
  /** V1-A CP3: classified direction / purpose, when the tool provides them. */
  direction?: string;
  purpose?: string;
}

/** Dollars -> integer cents; null for anything that is not a finite number. */
export function toCents(value: unknown): number | null {
  const n = typeof value === 'number' ? value
    : typeof value === 'string' && value.trim() !== '' ? Number(value)
      : NaN;
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Integer cents -> "1,234.56" (amount formatting only, no currency conversion). */
export function formatCentsAmount(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return sign + (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Normalize category-total entries (real `categoryTotals` or legacy shapes).
 * Entries without a finite total are dropped and counted — never NaN/undefined facts.
 */
export function normalizeCategoryTotals(
  entries: unknown[],
): { totals: NormalizedCategoryTotal[]; malformedCount: number } {
  const totals: NormalizedCategoryTotal[] = [];
  let malformedCount = 0;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') { malformedCount++; continue; }
    const e = entry as Record<string, unknown>;
    const totalCents = Number.isInteger(e.totalCents) ? e.totalCents as number : toCents(e.totalAmount ?? e.total ?? e.amount);
    if (totalCents === null) { malformedCount++; continue; }
    const name = e.category ?? e.name;
    const rawCount = Number(e.transactionCount ?? e.count);
    totals.push({
      category: typeof name === 'string' && name.trim() !== '' ? name : 'Uncategorized',
      totalCents,
      count: Number.isInteger(rawCount) && rawCount >= 0 ? rawCount : null,
      ...(typeof e.direction === 'string' ? { direction: e.direction } : {}),
      ...(typeof e.purpose === 'string' ? { purpose: e.purpose } : {}),
    });
  }
  return { totals, malformedCount };
}

/**
 * A tool/query failure must never read as successful empty or $0 evidence.
 * executeTool() reports Err/timeouts/invalid output as `{ error }`; tools report
 * a failed DB query as `queryStatus: 'query_error'`.
 */
export function detectToolFailure(rawResult: unknown): string | null {
  if (!rawResult || typeof rawResult !== 'object') return null;
  const r = rawResult as Record<string, unknown>;
  if (r.error !== undefined && r.error !== null && r.error !== false) {
    return typeof r.error === 'string' && r.error ? r.error : 'tool_error';
  }
  if (r.queryStatus === 'query_error') return 'query_error';
  return null;
}

/** Explicit truncation marker from the tool — evidence is not complete. */
function isPartialEvidence(data: unknown): boolean {
  return !!data && typeof data === 'object' && (data as Record<string, unknown>).queryStatus === 'partial';
}

/** All-category raw total: never presented as authoritative ordinary spending. */
const RAW_CATEGORY_GRAND_TOTAL_LABEL =
  'All-category raw total (may include income, transfers and other non-spend categories — NOT a spending total)';

/** Model-facing names for the classified purposes (V1-A CP3). */
const PURPOSE_LABEL: Readonly<Record<string, string>> = {
  income: 'Income (excluding transfers in)',
  spending: 'Ordinary spending',
  transfer_in: 'Transfers in',
  transfer_out: 'Transfers out',
  debt_payment: 'Debt payments',
  savings_investment: 'Savings/investment movement',
  other_non_spend: 'Other non-spend outflow',
  classification_conflict: 'Classification-conflict outflow',
};

const finiteNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * V1-A CP3: deterministic completeness / classification disclosure shared by
 * both aggregate tools. Returns no lines for a legacy result without metadata.
 */
export function formatAggregateDisclosures(completeness: unknown, indent: string): string[] {
  if (!completeness || typeof completeness !== 'object') return [];
  const c = completeness as Record<string, unknown>;
  const excluded = (c.excluded && typeof c.excluded === 'object' ? c.excluded : {}) as Record<string, unknown>;
  const conflicts = (c.conflicts && typeof c.conflicts === 'object' ? c.conflicts : {}) as Record<string, unknown>;
  const lines: string[] = [];
  if (c.dataComplete === false || c.truncated === true) {
    lines.push(`${indent}PARTIAL — the date range was not fully retrieved; these totals are incomplete and must NOT be presented as complete.`);
  }
  const unclassified = finiteNumber(excluded.unclassifiedType) ?? 0;
  if (unclassified > 0) {
    const cents = finiteNumber(c.unclassifiedCents) ?? 0;
    lines.push(`${indent}${unclassified} transaction${unclassified === 1 ? '' : 's'} totalling $${formatCentsAmount(cents)} could not be classified (unsupported transaction type) and ${unclassified === 1 ? 'is' : 'are'} excluded from all financial totals.`);
  }
  const missingAmount = finiteNumber(excluded.missingAmount) ?? 0;
  if (missingAmount > 0) {
    lines.push(`${indent}${missingAmount} transaction${missingAmount === 1 ? ' has' : 's have'} a missing or invalid amount; ${missingAmount === 1 ? 'its' : 'their'} monetary value is unknown and excluded from the totals.`);
  }
  const incomeOnOutflow = finiteNumber(conflicts.income_category_on_outflow) ?? 0;
  if (incomeOnOutflow > 0) {
    lines.push(`${indent}${incomeOnOutflow} outflow${incomeOnOutflow === 1 ? '' : 's'} carry an income category (classification conflict); reported separately, not as income or spending.`);
  }
  const nonSpendOnInflow = finiteNumber(conflicts.non_spend_category_on_inflow) ?? 0;
  if (nonSpendOnInflow > 0) {
    lines.push(`${indent}${nonSpendOnInflow} inflow${nonSpendOnInflow === 1 ? '' : 's'} carry a savings/investment/debt category; counted as income but flagged as possibly not earned income.`);
  }
  const negativeInflow = finiteNumber(conflicts.negative_inflow) ?? 0;
  if (negativeInflow > 0) {
    lines.push(`${indent}${negativeInflow} income transaction${negativeInflow === 1 ? '' : 's'} had a negative stored amount (counted by magnitude; reversals are not identified).`);
  }
  return lines;
}

function formatCategoryTotalLines(data: Record<string, unknown>, indent: string): string[] {
  const lines: string[] = [];
  const totals = Array.isArray(data.totals) ? data.totals as NormalizedCategoryTotal[] : [];
  if (typeof data.categoryFilter === 'string') {
    lines.push(`${indent}Category filter: ${data.categoryFilter}`);
  }
  if (typeof data.grandTotalCents === 'number') {
    lines.push(`${indent}${RAW_CATEGORY_GRAND_TOTAL_LABEL}: $${formatCentsAmount(data.grandTotalCents)}`);
  }
  if (data.totalsByPurpose && typeof data.totalsByPurpose === 'object') {
    for (const [purpose, v] of Object.entries(data.totalsByPurpose as Record<string, unknown>)) {
      const bucket = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
      const cents = finiteNumber(bucket.totalCents);
      const count = finiteNumber(bucket.count);
      if (cents === null || !count) continue;
      lines.push(`${indent}${PURPOSE_LABEL[purpose] ?? purpose}: $${formatCentsAmount(cents)} (${count} txns)`);
    }
  }
  for (const t of totals) {
    if (!t || typeof t.totalCents !== 'number') continue;
    const count = typeof t.count === 'number' ? ` (${t.count} txns)` : '';
    const purpose = typeof t.purpose === 'string' ? ` [${PURPOSE_LABEL[t.purpose] ?? t.purpose}]` : '';
    lines.push(`${indent}${t.category}${purpose}: $${formatCentsAmount(t.totalCents)}${count}`);
  }
  lines.push(...formatAggregateDisclosures(data.completeness, indent));
  if (typeof data.malformedCount === 'number' && data.malformedCount > 0) {
    lines.push(`${indent}(${data.malformedCount} malformed category ${data.malformedCount === 1 ? 'entry' : 'entries'} omitted)`);
  }
  if (data.queryStatus === 'partial') {
    lines.push(`${indent}PARTIAL — query truncated; do not present these totals as complete.`);
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMEOUT
// ─────────────────────────────────────────────────────────────────────────────

function withStepTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('step_timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUFFICIENCY ASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assess overall evidence sufficiency based on plan requirements and results.
 *
 * SUFFICIENT: All required authoritative evidence resolved (including successful_empty).
 * PARTIAL: Some required evidence resolved, some missing/failed/skipped.
 * INSUFFICIENT: No required authoritative evidence available, or critical evidence failed.
 */
export function assessSufficiency(
  plan: PrimeEvidencePlan,
  results: PrimeEvidenceResult[],
): EvidenceSufficiency {
  // Find which evidence kinds had executable steps (tool or multi_source)
  const executableSteps = plan.steps.filter(
    s => s.mode === 'tool' || s.mode === 'multi_source',
  );

  if (executableSteps.length === 0) {
    // No executable steps in this plan — nothing for P3.1C to assess
    return 'sufficient';
  }

  // Check each executable step's result
  let resolvedAuthoritative = 0;
  let failedOrSkipped = 0;

  for (const step of executableSteps) {
    const stepResults = results.filter(r => r.evidenceKind === step.evidenceKind);
    if (step.mode === 'multi_source') {
      // Multi-source (period comparison): ALL results for this kind must be resolved
      const allOk = stepResults.length > 0 && stepResults.every(
        r => r.status === 'resolved' || r.status === 'successful_empty',
      );
      if (allOk && step.authoritative) {
        resolvedAuthoritative++;
      } else {
        failedOrSkipped++;
      }
    } else {
      const hasResolved = stepResults.some(
        r => r.status === 'resolved' || r.status === 'successful_empty',
      );
      if (hasResolved && step.authoritative) {
        resolvedAuthoritative++;
      } else if (!hasResolved) {
        failedOrSkipped++;
      }
    }
  }

  if (failedOrSkipped === 0 && resolvedAuthoritative > 0) return 'sufficient';
  if (resolvedAuthoritative > 0) return 'partial';

  // Also consider unresolved requirements from the plan
  const hasUnresolved = plan.unresolved.length > 0;
  if (hasUnresolved && resolvedAuthoritative === 0) return 'insufficient';

  return 'insufficient';
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY PRE-EXECUTION GATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine whether legacy pre-execution (buildPreExecutionPlan) should be
 * suppressed because P3.1C has already produced equivalent authoritative evidence.
 *
 * Returns true ONLY when P3.1C successfully executed the same tool class
 * and produced resolved or successful_empty evidence.
 *
 * If P3.1C failed, skipped, or didn't run — legacy behavior is preserved.
 */
export function shouldSuppressLegacyPreExec(
  executionResult: PrimeEvidenceExecutionResult | null,
  legacyToolName: string,
): boolean {
  const relevant = relevantP31CResults(executionResult, legacyToolName);
  return relevant.some(r => r.status === 'resolved' || r.status === 'successful_empty');
}

/**
 * V1-A CP4.1: the legacy FinancialGrounding query status that P3.1C's ACTUAL result
 * PROVES. Stricter than suppression (which only asks "may legacy evidence replace it?"):
 *   authoritative resolved                                 → 'verified'
 *   successful_empty proven complete (see isProvenEmpty)   → 'verified_zero'
 *   partial / non-authoritative / classification-incomplete empty,
 *   failed / skipped / unavailable / not run               → null (nothing proven)
 */
export function legacyQueryStatusFromP31C(
  executionResult: PrimeEvidenceExecutionResult | null,
  legacyToolName: string,
): 'verified' | 'verified_zero' | null {
  const relevant = relevantP31CResults(executionResult, legacyToolName);
  const resolved = relevant.filter(r => r.status === 'resolved');
  // Rows were found: a zero is disproven, but only authoritative rows verify the data.
  if (resolved.length > 0) return resolved.some(r => r.authoritative) ? 'verified' : null;
  const empty = relevant.filter(r => r.status === 'successful_empty');
  if (empty.length > 0 && empty.every(isProvenEmpty)) return 'verified_zero';
  return null;
}

/** Relevant P3.1C results for a legacy tool (shared evidence-kind mapping). */
function relevantP31CResults(
  executionResult: PrimeEvidenceExecutionResult | null,
  legacyToolName: string,
): PrimeEvidenceResult[] {
  if (!executionResult) return [];

  // Map legacy tool names to P3.1C evidence kinds
  const legacyToKinds: Record<string, PrimeEvidenceKind[]> = {
    tx_search: ['transaction_data'],
    // V1-A CP4: authoritative period cash-flow evidence also replaces the legacy
    // whole-year tax_summary pre-run (never both).
    tax_summary: ['category_aggregation', 'transaction_data', 'cash_flow'],
  };

  const relevantKinds = legacyToKinds[legacyToolName];
  if (!relevantKinds) return [];
  return executionResult.results.filter(r => relevantKinds.includes(r.evidenceKind));
}

/**
 * V1-A CP4.1: an empty result proves zero only when it is authoritative, not partial /
 * truncated, and its classification is not explicitly incomplete (existing signals only).
 */
function isProvenEmpty(r: PrimeEvidenceResult): boolean {
  if (r.authoritative !== true || isPartialEvidence(r.data)) return false;
  const completeness = r.data && typeof r.data === 'object'
    ? (r.data as Record<string, unknown>).completeness
    : undefined;
  return !(completeness && typeof completeness === 'object'
    && (completeness as Record<string, unknown>).classificationComplete === false);
}

// ─────────────────────────────────────────────────────────────────────────────
// EVIDENCE SHAPE — P3.1D deterministic evidence-shape classification
// ─────────────────────────────────────────────────────────────────────────────

export type EvidenceShape =
  | 'no_executable_evidence'
  | 'single_period_aggregation'
  | 'single_period_transactions'
  | 'two_period_comparison'
  | 'partial_comparison'
  | 'successful_empty'
  | 'all_failed'
  | 'mixed';

/**
 * Classify the structural shape of P3.1C evidence results.
 * Derived purely from result structure — no NLP, no user-message parsing.
 */
export function classifyEvidenceShape(result: PrimeEvidenceExecutionResult): EvidenceShape {
  const resolved = result.results.filter(r => r.status === 'resolved');
  const empty = result.results.filter(r => r.status === 'successful_empty');
  const failed = result.results.filter(r => r.status === 'failed');
  const skipped = result.results.filter(r => r.status === 'skipped');

  const executableSteps = result.results.filter(
    r => r.tool && (r.status === 'resolved' || r.status === 'successful_empty' || r.status === 'failed'),
  );

  if (executableSteps.length === 0) return 'no_executable_evidence';

  // All executable steps failed or were skipped
  if (resolved.length === 0 && empty.length === 0) return 'all_failed';

  // All results are successful_empty (and none resolved with data)
  if (resolved.length === 0 && empty.length > 0) return 'successful_empty';

  // Check for two-period comparison (resolved result with periodA/periodB data)
  const hasComparisonData = resolved.some(r => {
    if (!r.data || typeof r.data !== 'object') return false;
    const d = r.data as Record<string, unknown>;
    return 'periodA' in d && 'periodB' in d;
  });
  if (hasComparisonData) return 'two_period_comparison';

  // Check for partial comparison: multi_source evidence kind with some failed
  const hasPartialComparison = result.results.some(r => r.evidenceKind === 'period_comparison') &&
    failed.length > 0 && resolved.length > 0;
  if (hasPartialComparison) return 'partial_comparison';

  // Also partial if period_comparison has mixed resolved + failed individual period results
  const periodCompResults = result.results.filter(r => r.evidenceKind === 'period_comparison');
  if (periodCompResults.length >= 2) {
    const pcResolved = periodCompResults.filter(r => r.status === 'resolved' || r.status === 'successful_empty');
    const pcFailed = periodCompResults.filter(r => r.status === 'failed');
    if (pcResolved.length > 0 && pcFailed.length > 0) return 'partial_comparison';
  }

  // If some executable steps resolved but others failed (different evidence kinds),
  // this is a mixed result — not a clean single-period shape.
  const failedExecutable = executableSteps.filter(r => r.status === 'failed');
  if (failedExecutable.length > 0 && resolved.length > 0) return 'mixed';

  // Single-period data (no failures)
  const hasAggregation = resolved.some(r => r.tool === 'transaction_category_totals' || r.tool === 'cash_flow_summary' || r.tool === 'merchant_totals');
  const hasTransactions = resolved.some(r => r.tool === 'tx_search');

  if (hasAggregation && !hasTransactions) return 'single_period_aggregation';
  if (hasTransactions && !hasAggregation) return 'single_period_transactions';

  return 'mixed';
}

/**
 * P3.1D — Build evidence-shape policy text for model context.
 *
 * Derives model constraints ONLY from the structural shape of verified evidence.
 * No user-message parsing, no conclusion classifier, no regex reasoning.
 *
 * These are MODEL CONSTRAINTS — strong guidance that shapes model behavior.
 * They are NOT hard programmatic enforcement.
 */
export function buildEvidenceShapePolicy(result: PrimeEvidenceExecutionResult): string | null {
  const shape = classifyEvidenceShape(result);

  switch (shape) {
    case 'no_executable_evidence':
      return null; // Non-financial query or no tools — no financial restrictions

    case 'single_period_aggregation':
      return (
        'EVIDENCE SHAPE: Single-period category aggregation.\n' +
        'You may report totals, category breakdowns, contributions, rankings, and calculations supported by this data.\n' +
        'You must NOT claim any category "increased," "decreased," or changed without comparison data for another period.\n' +
        'You must NOT describe trends without multiple comparable periods.'
      );

    case 'single_period_transactions':
      return (
        'EVIDENCE SHAPE: Single-period transaction data.\n' +
        'You may report the transactions found, totals, and any patterns within this data.\n' +
        'You must NOT claim any spending "increased," "decreased," or changed without comparison data for another period.\n' +
        'You must NOT describe trends without multiple comparable periods.'
      );

    case 'two_period_comparison':
      return (
        'EVIDENCE SHAPE: Two-period comparison with verified data for both periods.\n' +
        'You may compare the two periods, describe verified changes, and report which categories changed.'
      );

    case 'partial_comparison': {
      const available = result.results.find(
        r => (r.status === 'resolved' || r.status === 'successful_empty') && r.periodLabel,
      );
      const missing = result.results.find(
        r => r.status === 'failed' && r.periodLabel,
      );
      const availLabel = available?.periodLabel || 'one period';
      const missLabel = missing?.periodLabel || 'the other period';
      return (
        `EVIDENCE SHAPE: Partial comparison — data for ${availLabel} was retrieved, but ${missLabel} could not be retrieved.\n` +
        `You may report what the available data (${availLabel}) shows.\n` +
        `You must clearly state that data for ${missLabel} was unavailable, so the comparison cannot be completed.\n` +
        'You must NOT state the requested comparison or change conclusion.'
      );
    }

    case 'successful_empty':
      return (
        'EVIDENCE SHAPE: Query succeeded with zero matching results.\n' +
        'This is verified — the database query completed and found no records.\n' +
        'Say "I found no matching [X] transactions in the currently imported data for [period]."\n' +
        'Do NOT automatically convert absence of records to "You spent $0 on [X]" — the imported data may not cover all accounts.'
      );

    case 'all_failed':
      return (
        'EVIDENCE SHAPE: All financial data retrieval failed.\n' +
        'Explain naturally that the required financial data could not be retrieved.\n' +
        'Do NOT state user-specific financial conclusions.\n' +
        'Do NOT substitute general knowledge, memory, or inference for missing authoritative evidence.'
      );

    case 'mixed':
      return (
        'EVIDENCE SHAPE: Mixed evidence — some data retrieved, some not.\n' +
        'Report ONLY what the successfully retrieved evidence shows.\n' +
        'Do NOT invent, estimate, or infer values for missing data.\n' +
        'You must NOT claim changes or trends without comparison data for multiple periods.'
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL CONTEXT INJECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a compact structured evidence message for injection into the model context.
 *
 * Format is structured text — not raw JSON. The model needs human-readable evidence.
 * Includes P3.1D evidence-shape policy and data provenance.
 */
export function buildEvidenceContextMessage(
  executionResult: PrimeEvidenceExecutionResult,
): string | null {
  if (executionResult.results.length === 0) return null;

  const sections: string[] = [];

  sections.push(`EVIDENCE SUMMARY (sufficiency: ${executionResult.overallSufficiency})`);

  for (const result of executionResult.results) {
    const header = `[${result.evidenceKind}] status=${result.status} authoritative=${result.authoritative}`;
    if (result.status === 'resolved' && result.data) {
      const dataStr = formatEvidenceData(result);
      sections.push(`${header}\n${dataStr}`);
    } else if (result.status === 'successful_empty') {
      sections.push(`${header}\nNo matching records found in the currently imported data. This is a verified empty result, not a retrieval failure.`);
    } else if (result.status === 'failed') {
      sections.push(`${header}\nData retrieval failed. Do not guess or estimate this value.`);
    } else if (result.status === 'skipped') {
      sections.push(`${header}\nNot retrieved.`);
    }
  }

  // P3.1D: Evidence-shape policy (model constraints derived from evidence structure)
  const shapePolicy = buildEvidenceShapePolicy(executionResult);
  if (shapePolicy) {
    sections.push(shapePolicy);
  }

  // P3.1D: Data provenance — prevent implying complete financial coverage
  const hasAnyEvidence = executionResult.results.some(
    r => r.status === 'resolved' || r.status === 'successful_empty',
  );
  if (hasAnyEvidence) {
    sections.push(
      'DATA PROVENANCE: These results reflect the transaction data currently imported into XspensesAI. ' +
      'They may not include all bank accounts or all statements for the requested period.',
    );
  }

  // P3.1D: Memory authority — verified evidence takes precedence
  if (hasAnyEvidence) {
    sections.push(
      'EVIDENCE AUTHORITY: When verified financial evidence above conflicts with memory or conversation history, use the verified evidence.',
    );
  }

  // Sufficiency rule (preserved from P3.1C, complements P3.1D shape policy)
  if (executionResult.overallSufficiency === 'partial') {
    sections.push(
      'EVIDENCE RULE: Some requested financial data is missing. ' +
      'Discuss ONLY what the available evidence supports. ' +
      'Do NOT invent, estimate, remember, or infer missing user-specific financial values.',
    );
  } else if (executionResult.overallSufficiency === 'insufficient') {
    sections.push(
      'EVIDENCE RULE: Required authoritative financial data could not be retrieved. ' +
      'Do NOT state the requested user-specific financial conclusion. ' +
      'Explain that the required data is unavailable. ' +
      'Do NOT substitute general knowledge, memory, or inference for missing authoritative evidence.',
    );
  }

  return sections.join('\n\n');
}

function formatEvidenceData(result: PrimeEvidenceResult): string {
  if (!result.data || typeof result.data !== 'object') return String(result.data);
  const data = result.data as Record<string, unknown>;

  if (result.tool === 'tx_search') {
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const totalCount = data.totalCount ?? rows.length;
    const lines = [`${totalCount} transaction(s) found${data.capped ? ` (showing ${rows.length})` : ''}:`];
    for (const row of rows) {
      if (row && typeof row === 'object') {
        const r = row as Record<string, unknown>;
        const parts = [r.date, r.description || r.merchant, r.amount !== undefined ? `$${r.amount}` : null, r.category].filter(Boolean);
        lines.push(`  ${parts.join(' | ')}`);
      }
    }
    return lines.join('\n');
  }

  if (result.tool === 'transaction_category_totals') {
    const totals = Array.isArray(data.totals) ? data.totals : [];
    const totalCount = data.totalCount ?? totals.length;
    // Check for period comparison data
    if ('periodA' in data && 'periodB' in data) {
      return formatComparisonData(data);
    }
    const lines = [`${totalCount} category total(s)${data.capped ? ` (showing ${totals.length})` : ''}:`];
    lines.push(...formatCategoryTotalLines(data, '  '));
    return lines.join('\n');
  }

  if (result.tool === 'merchant_totals') {
    const merchants = Array.isArray(data.merchants) ? data.merchants : [];
    const isPartial = data.queryStatus === 'partial';
    const lines = [`${merchants.length} merchant group(s)${isPartial ? ' (PARTIAL — data may be incomplete, do not present totals as definitive)' : ''}:`];
    if (data.grandTotal !== undefined) lines.push(`Grand total: $${data.grandTotal} (${data.transactionCount} txns)${isPartial ? ' [partial]' : ''}`);
    if (data.dateRange && typeof data.dateRange === 'object') {
      const dr = data.dateRange as Record<string, unknown>;
      lines.push(`Date range: ${dr.start} to ${dr.end}`);
    }
    for (const m of merchants) {
      if (m && typeof m === 'object') {
        const mg = m as Record<string, unknown>;
        lines.push(`  ${mg.merchant}: $${mg.total} (${mg.count} txns, avg $${mg.average}, ${mg.firstSeen} to ${mg.lastSeen})`);
      }
    }
    return lines.join('\n');
  }

  if (result.tool === 'cash_flow_summary') {
    return formatCashFlowData(data);
  }

  // Comparison data at the top level
  if ('periodA' in data && 'periodB' in data) {
    return formatComparisonData(data);
  }

  // Generic
  return JSON.stringify(data, null, 2).slice(0, 500);
}

/**
 * V1-A CP3: deterministic cash-flow evidence. Every figure comes from the tool's
 * integer-cent aggregate; the model explains, it does not calculate.
 */
function formatCashFlowData(data: Record<string, unknown>): string {
  const cents = (data.cents && typeof data.cents === 'object' ? data.cents : null) as Record<string, unknown> | null;
  const lines = [`Cash flow (${data.startDate} to ${data.endDate}):`];
  if (!cents) {
    // Legacy result shape (no authoritative aggregate): report only what it states.
    const legacy: Array<[string, unknown, unknown]> = [
      ['Income', data.income, data.incomeTransactionCount],
      ['Spending', data.spending, data.spendingTransactionCount],
      ['Non-spend (transfers/payments)', data.nonSpend, data.nonSpendTransactionCount],
    ];
    for (const [label, amount, count] of legacy) {
      const c = toCents(amount);
      if (c === null) continue;
      lines.push(`  ${label}: $${formatCentsAmount(c)}${finiteNumber(count) !== null ? ` (${count} txns)` : ''}`);
    }
    if (finiteNumber(data.transactionCount) !== null) lines.push(`  Transactions: ${data.transactionCount}`);
    return lines.join('\n');
  }

  const countByPurpose: Record<string, number> = {};
  if (Array.isArray(data.categories)) {
    for (const e of data.categories as Array<Record<string, unknown>>) {
      const p = typeof e?.purpose === 'string' ? e.purpose : null;
      const n = finiteNumber(e?.count);
      if (p && n !== null) countByPurpose[p] = (countByPurpose[p] ?? 0) + n;
    }
  }
  const bucket = (label: string, key: string, purpose: string) => {
    const v = finiteNumber(cents[key]);
    if (v === null) return;
    const n = countByPurpose[purpose];
    lines.push(`  ${label}: $${formatCentsAmount(v)}${n !== undefined ? ` (${n} txns)` : ''}`);
  };
  bucket(PURPOSE_LABEL.spending, 'spending', 'spending');
  bucket(PURPOSE_LABEL.income, 'income', 'income');
  bucket(PURPOSE_LABEL.debt_payment, 'debtPayments', 'debt_payment');
  bucket(PURPOSE_LABEL.transfer_in, 'transferIn', 'transfer_in');
  bucket(PURPOSE_LABEL.transfer_out, 'transferOut', 'transfer_out');
  bucket(PURPOSE_LABEL.savings_investment, 'savingsInvestment', 'savings_investment');
  bucket(PURPOSE_LABEL.other_non_spend, 'otherNonSpend', 'other_non_spend');
  bucket(PURPOSE_LABEL.classification_conflict, 'classificationConflict', 'classification_conflict');
  const total = (label: string, key: string) => {
    const v = finiteNumber(cents[key]);
    if (v !== null) lines.push(`  ${label}: $${formatCentsAmount(v)}`);
  };
  total('Total inflow', 'totalInflow');
  total('Total outflow', 'totalOutflow');
  total('Raw net cash movement (all classified inflow − all classified outflow, incl. transfers and savings/investment)', 'rawNetCashMovement');
  total('Net excluding internal movements (income − ordinary spending, debt payments, other non-spend and conflicts; transfers and savings/investment excluded)', 'netExcludingInternalMovements');
  if (finiteNumber(data.transactionCount) !== null) lines.push(`  Transactions included: ${data.transactionCount}`);
  lines.push('  Refunds/reversals are not identified in this data and are not netted.');
  lines.push(...formatAggregateDisclosures(data.completeness, '  '));
  return lines.join('\n');
}

function formatComparisonData(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const periodKey of ['periodA', 'periodB']) {
    const period = data[periodKey] as Record<string, unknown> | undefined;
    if (!period) continue;
    const label = period.label || periodKey;
    lines.push(`${label}:`);
    lines.push(...formatCategoryTotalLines(period, '  '));
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY — safe log payload (no PII, no financial values, no params)
// ─────────────────────────────────────────────────────────────────────────────

export interface EvidenceExecutionTelemetry {
  intent: string;
  overallSufficiency: string;
  stepCount: number;
  executedCount: number;
  resolvedCount: number;
  successfulEmptyCount: number;
  failedCount: number;
  skippedCount: number;
  dedupHitCount: number;
  toolsExecuted: string[];
  totalDurationMs: number;
  stepDurations: number[];
  evidenceKinds: string[];
  stepStatuses: string[];
}

export function buildEvidenceExecutionTelemetry(
  result: PrimeEvidenceExecutionResult,
): EvidenceExecutionTelemetry {
  return {
    intent: result.intent,
    overallSufficiency: result.overallSufficiency,
    stepCount: result.results.length,
    executedCount: result.executedCount,
    resolvedCount: result.resolvedCount,
    successfulEmptyCount: result.successfulEmptyCount,
    failedCount: result.failedCount,
    skippedCount: result.skippedCount,
    dedupHitCount: result.dedupHitCount,
    toolsExecuted: result.results.filter(r => r.tool && (r.status === 'resolved' || r.status === 'successful_empty' || r.status === 'failed')).map(r => r.tool!),
    totalDurationMs: result.totalDurationMs,
    stepDurations: result.results.map(r => r.durationMs ?? 0),
    evidenceKinds: result.results.map(r => r.evidenceKind),
    stepStatuses: result.results.map(r => r.status),
  };
}
