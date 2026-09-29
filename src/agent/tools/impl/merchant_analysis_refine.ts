import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';
import {
  type MerchantAnalysisContext,
  isMerchantAnalysisContextValid,
  validateExcludeGroups,
  buildMerchantAnalysisContext,
  MAX_EXCLUDED_GROUPS,
} from '../../../shared/merchant-analysis-context';
import { execute as executeMerchantTotals } from './merchant_totals';

export const id = 'merchant_analysis_refine';

export const inputSchema = z.object({
  /** The refinement operation to perform. */
  operation: z.enum(['exclude', 'include', 'only', 'refresh']),
  /** Exact groupingKey values from the active merchant analysis context.
   *  Required for exclude/include/only. Ignored for refresh. */
  targets: z.array(z.string()).max(20).optional().default([]),
  /** Override start date (e.g. temporal refinement "now just May"). */
  startDate: z.string().optional(),
  /** Override end date. */
  endDate: z.string().optional(),
});

export const outputSchema = z.object({
  /** Operation result status. */
  status: z.enum([
    'success',
    'no_context',
    'expired_context',
    'partial_evidence_blocked',
    'invalid_targets',
    'error',
  ]),
  /** Which operation was applied. */
  operationApplied: z.string(),
  /** Targets that were rejected (not in activeGroups). */
  rejectedTargets: z.array(z.string()),
  /** The merchant query from context. */
  merchantQuery: z.string(),
  /** Current excluded groups after the operation. */
  excludedGroups: z.array(z.string()),
  /** Fresh merchant_totals result (present when status=success). */
  merchants: z.array(z.object({
    merchant: z.string(),
    groupingKey: z.string(),
    total: z.number(),
    count: z.number(),
    average: z.number(),
    firstSeen: z.string(),
    lastSeen: z.string(),
  })).optional(),
  grandTotal: z.number().optional(),
  transactionCount: z.number().optional(),
  dateRange: z.object({ start: z.string(), end: z.string() }).optional(),
  queryStatus: z.enum(['verified', 'verified_zero', 'partial', 'query_error']).optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * P3.2B2B — Merchant Analysis Refine
 *
 * Structured read-only refinement of the active merchant analysis context.
 * The model proposes an operation (exclude/include/only/refresh) with
 * exact groupingKey targets. Deterministic code validates every target,
 * computes the new excludedGroups, executes fresh merchant_totals, and
 * persists the updated context.
 *
 * SAFETY INVARIANTS:
 * - Read-only. No mutations, no candidates, no tx_resolution, no UUIDs.
 * - ONLY requires evidenceComplete=true (exhaustive group universe).
 * - INCLUDE is safe under partial evidence (removes verified exclusion).
 * - Invented groupingKeys are rejected.
 * - Fresh merchant_totals evidence on every successful operation.
 */
export async function execute(
  input: Input,
  ctx: { userId: string; sessionId?: string },
): Promise<Result<Output>> {
  const { userId, sessionId } = ctx;
  if (!sessionId) {
    return Ok(errResult('no_context', input.operation, 'No session ID'));
  }

  try {
    const sb = getSupabaseServerClient();

    // 1. Load MerchantAnalysisContext from session
    const mac = await readMerchantAnalysisFromSession(sb, sessionId, userId);
    if (!mac) {
      return Ok(errResult('no_context', input.operation, 'No active merchant analysis context'));
    }
    if (!isMerchantAnalysisContextValid(mac)) {
      return Ok(errResult('expired_context', input.operation, 'Merchant analysis context expired'));
    }

    const { operation, targets } = input;

    // 2. Compute new excludedGroups
    let newExcluded: string[];

    if (operation === 'refresh') {
      // Refresh: keep current exclusions, just re-execute with new dates if provided
      newExcluded = mac.excludedGroups;
    } else if (operation === 'exclude') {
      // Validate targets against activeGroups
      const validated = validateExcludeGroups(targets, mac.activeGroups);
      const rejected = targets.filter(t => !validated.includes(t));
      if (validated.length === 0) {
        return Ok({
          status: 'invalid_targets',
          operationApplied: 'exclude',
          rejectedTargets: rejected,
          merchantQuery: mac.merchantQuery,
          excludedGroups: mac.excludedGroups,
        });
      }
      // Merge: add validated targets to existing exclusions (deduplicated)
      const excludeSet = new Set([...mac.excludedGroups, ...validated]);
      newExcluded = Array.from(excludeSet).slice(0, MAX_EXCLUDED_GROUPS);
    } else if (operation === 'include') {
      // Include: remove targets from excludedGroups
      // Validate targets exist in activeGroups (they must have been valid groups)
      const validated = validateExcludeGroups(targets, mac.activeGroups);
      const rejected = targets.filter(t => !validated.includes(t));
      if (validated.length === 0 && targets.length > 0) {
        return Ok({
          status: 'invalid_targets',
          operationApplied: 'include',
          rejectedTargets: rejected,
          merchantQuery: mac.merchantQuery,
          excludedGroups: mac.excludedGroups,
        });
      }
      // Remove validated targets from exclusions
      const includeSet = new Set(validated);
      newExcluded = mac.excludedGroups.filter(k => !includeSet.has(k));
    } else if (operation === 'only') {
      // ONLY requires evidenceComplete — fail closed if partial
      if (!mac.evidenceComplete) {
        return Ok({
          status: 'partial_evidence_blocked',
          operationApplied: 'only',
          rejectedTargets: [],
          merchantQuery: mac.merchantQuery,
          excludedGroups: mac.excludedGroups,
        });
      }
      // Validate targets against activeGroups
      const validated = validateExcludeGroups(targets, mac.activeGroups);
      const rejected = targets.filter(t => !validated.includes(t));
      if (validated.length === 0) {
        return Ok({
          status: 'invalid_targets',
          operationApplied: 'only',
          rejectedTargets: rejected,
          merchantQuery: mac.merchantQuery,
          excludedGroups: mac.excludedGroups,
        });
      }
      // ONLY: exclude everything EXCEPT the targets
      const keepSet = new Set(validated);
      newExcluded = mac.activeGroups
        .map(g => g.groupingKey)
        .filter(k => !keepSet.has(k));
    } else {
      return Ok(errResult('error', operation, `Unknown operation: ${operation}`));
    }

    // 3. Determine temporal scope
    const startDate = input.startDate || mac.temporalScope?.startDate;
    const endDate = input.endDate || mac.temporalScope?.endDate;

    // 4. Execute fresh merchant_totals
    const mtResult = await executeMerchantTotals(
      {
        merchant: mac.merchantQuery,
        startDate,
        endDate,
        excludeGroups: newExcluded.length > 0 ? newExcluded : undefined,
      },
      { userId },
    );

    if (!mtResult.ok) {
      console.error('[merchant_analysis_refine] merchant_totals execution failed:', mtResult.error);
      return Ok(errResult('error', operation, 'Fresh evidence execution failed'));
    }

    const mtData = mtResult.value;

    // 5. Build and persist updated MerchantAnalysisContext
    const newMac = buildMerchantAnalysisContext(
      mac.merchantQuery,
      mtData.merchants,
      {
        excludedGroups: newExcluded,
        temporalScope: startDate && endDate
          ? { startDate, endDate }
          : mac.temporalScope,
        categoryFilter: mac.categoryFilter,
        evidenceComplete: mtData.queryStatus !== 'partial',
      },
    );

    // Persist (awaited — next turn depends on this)
    await writeMerchantAnalysisToSession(sb, sessionId, userId, newMac);
    console.log(`[merchant_analysis_refine] persisted — op=${operation}, excluded=${newExcluded.length}, merchants=${mtData.merchants.length}`);

    // 6. Return fresh results
    return Ok({
      status: 'success',
      operationApplied: operation,
      rejectedTargets: [],
      merchantQuery: mac.merchantQuery,
      excludedGroups: newExcluded,
      merchants: mtData.merchants,
      grandTotal: mtData.grandTotal,
      transactionCount: mtData.transactionCount,
      dateRange: mtData.dateRange,
      queryStatus: mtData.queryStatus,
    });
  } catch (error) {
    console.error('[merchant_analysis_refine] Error:', error);
    return Err(error as Error);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function errResult(
  status: Output['status'],
  operation: string,
  _reason: string,
): Output {
  return {
    status,
    operationApplied: operation,
    rejectedTargets: [],
    merchantQuery: '',
    excludedGroups: [],
  };
}

async function readMerchantAnalysisFromSession(
  sb: any, sessionId: string, userId: string,
): Promise<MerchantAnalysisContext | null> {
  try {
    const { data, error } = await sb
      .from('chat_sessions')
      .select('context')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.context) return null;
    return data.context.merchant_analysis ?? null;
  } catch {
    return null;
  }
}

async function writeMerchantAnalysisToSession(
  sb: any, sessionId: string, userId: string, mac: MerchantAnalysisContext,
): Promise<void> {
  try {
    const { data: existing } = await sb
      .from('chat_sessions')
      .select('context')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    const ctx = (existing?.context && typeof existing.context === 'object')
      ? { ...existing.context }
      : {};
    ctx.merchant_analysis = mac;
    await sb
      .from('chat_sessions')
      .update({ context: ctx })
      .eq('id', sessionId)
      .eq('user_id', userId);
  } catch (err: any) {
    console.warn('[merchant_analysis_refine] writeMerchantAnalysis error:', err?.message);
  }
}
