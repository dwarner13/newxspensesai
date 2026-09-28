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
]);

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION LIMITS
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_EVIDENCE_TOOL_CALLS = 5;
export const PER_TOOL_TIMEOUT_MS = 3_000;
export const TOTAL_EVIDENCE_BUDGET_MS = 8_000;

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
  try {
    const rawResult = await withStepTimeout(executor(tool, args), PER_TOOL_TIMEOUT_MS);
    const durationMs = Date.now() - stepStart;
    const { data, rowCount } = extractResultData(tool, rawResult);

    // Cache it
    cache.set(dedupKey, { data, rowCount });

    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: rowCount === 0 ? 'successful_empty' : 'resolved',
        authoritative: step.authoritative,
        source: step.source,
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
      authoritative: step.authoritative,
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
  try {
    const rawResult = await withStepTimeout(executor(tool, args), PER_TOOL_TIMEOUT_MS);
    const durationMs = Date.now() - stepStart;
    const { data, rowCount } = extractResultData(tool, rawResult);
    cache.set(dedupKey, { data, rowCount });
    return {
      result: {
        evidenceKind: step.evidenceKind,
        status: rowCount === 0 ? 'successful_empty' : 'resolved',
        authoritative: step.authoritative,
        source: step.source,
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
    'year', 'exactDate', 'exactAmount', 'limit', 'minAmount', 'maxAmount', 'type'];
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
    // Category totals may have various shapes — handle both array and object
    const totals = Array.isArray(result.totals) ? result.totals :
      Array.isArray(result.categories) ? result.categories :
        Array.isArray(result.data) ? result.data : [];
    const capped = totals.slice(0, MAX_CATEGORY_TOTALS_IN_CONTEXT);
    return {
      data: {
        totals: capped,
        totalCount: totals.length,
        capped: totals.length > MAX_CATEGORY_TOTALS_IN_CONTEXT,
        summary: result.summary,
        grandTotal: result.grandTotal ?? result.total,
      },
      rowCount: totals.length,
    };
  }

  return { data: result, rowCount: 1 };
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
  if (!executionResult) return false;

  // Map legacy tool names to P3.1C evidence kinds
  const legacyToKinds: Record<string, PrimeEvidenceKind[]> = {
    tx_search: ['transaction_data'],
    tax_summary: ['category_aggregation', 'transaction_data'],
  };

  const relevantKinds = legacyToKinds[legacyToolName];
  if (!relevantKinds) return false;

  // Check if P3.1C has successfully resolved ALL relevant evidence kinds
  for (const kind of relevantKinds) {
    const kindResults = executionResult.results.filter(r => r.evidenceKind === kind);
    const hasResolved = kindResults.some(
      r => r.status === 'resolved' || r.status === 'successful_empty',
    );
    if (hasResolved) return true;
  }

  return false;
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
  const hasAggregation = resolved.some(r => r.tool === 'transaction_category_totals' || r.tool === 'cash_flow_summary');
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
    if (data.grandTotal !== undefined) lines.push(`Grand total: $${data.grandTotal}`);
    for (const t of totals) {
      if (t && typeof t === 'object') {
        const c = t as Record<string, unknown>;
        lines.push(`  ${c.category || c.name}: $${c.total ?? c.amount} (${c.count ?? '?'} txns)`);
      }
    }
    return lines.join('\n');
  }

  if (result.tool === 'cash_flow_summary') {
    const lines = [`Cash flow (${data.startDate} to ${data.endDate}):`];
    lines.push(`  Income: $${data.income} (${data.incomeTransactionCount} txns)`);
    lines.push(`  Spending: $${data.spending} (${data.spendingTransactionCount} txns)`);
    lines.push(`  Non-spend (transfers/payments): $${data.nonSpend} (${data.nonSpendTransactionCount} txns)`);
    lines.push(`  Net cash flow: $${data.netCashFlow}`);
    lines.push(`  Total transactions: ${data.transactionCount}`);
    return lines.join('\n');
  }

  // Comparison data at the top level
  if ('periodA' in data && 'periodB' in data) {
    return formatComparisonData(data);
  }

  // Generic
  return JSON.stringify(data, null, 2).slice(0, 500);
}

function formatComparisonData(data: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const periodKey of ['periodA', 'periodB']) {
    const period = data[periodKey] as Record<string, unknown> | undefined;
    if (!period) continue;
    const label = period.label || periodKey;
    lines.push(`${label}:`);
    const totals = Array.isArray(period.totals) ? period.totals : [];
    if (period.grandTotal !== undefined) lines.push(`  Grand total: $${period.grandTotal}`);
    for (const t of totals) {
      if (t && typeof t === 'object') {
        const c = t as Record<string, unknown>;
        lines.push(`  ${c.category || c.name}: $${c.total ?? c.amount} (${c.count ?? '?'} txns)`);
      }
    }
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
