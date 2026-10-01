/**
 * MERCHANT-HINT TRUST (semantic repair, Stage 1)
 *
 * Extraction is not trust. A merchant hint only becomes authoritative merchant
 * scope (evidence, MerchantAnalysisContext, P3.3A, grounding pre-exec) when:
 *   - it came from a preposition ("at Costco", "from Walmart") — trusted as before; or
 *   - it came from a noun suffix ("Costco transactions") AND it is grounded against
 *     the user's real merchant grouping keys by WHOLE-TOKEN match.
 *
 * No word lists: "these/those/ten/eight transactions" fail simply because no
 * real merchant group has those tokens. Read-only; never touches identity.
 */

import { merchantGroupingKey } from '../../netlify/functions/_shared/merchantNormalize';
import type { MerchantHintSource } from './financial-query-classifier';
import {
  assessSufficiency,
  type PrimeEvidenceExecutionResult,
  type PrimeEvidenceResult,
} from './prime-evidence-executor';
import type { PrimeEvidencePlan } from './prime-evidence-resolver';

function tokens(value: string): string[] {
  return merchantGroupingKey(value).split(' ').filter(Boolean);
}

/**
 * True when the hint's normalized tokens appear as a contiguous WHOLE-TOKEN run
 * inside some real merchant grouping key. Substrings never count:
 * "ten" ≠ "tennis club", "eight" ≠ "freight company"; "costco" ⊂ "costco wholesale".
 */
export function isMerchantHintGrounded(hint: string | null | undefined, groupKeys: readonly string[] | null | undefined): boolean {
  if (!hint || !groupKeys || groupKeys.length === 0) return false;
  const h = tokens(hint);
  if (h.length === 0) return false;
  return groupKeys.some((key) => {
    const k = tokens(key);
    for (let i = 0; i + h.length <= k.length; i++) {
      if (h.every((t, j) => k[i + j] === t)) return true;
    }
    return false;
  });
}

export interface MerchantHintLike {
  merchantHint?: string;
  merchantHintSource?: MerchantHintSource;
}

/**
 * The single trust decision for a classification's merchant hint.
 * - no hint → false
 * - preposition → true (existing behavior, including verified-zero answers)
 * - noun_suffix or unknown source → only when grounded against real group keys
 */
export function resolveMerchantHintTrust(fc: MerchantHintLike | null | undefined, groupKeys: readonly string[] | null | undefined): boolean {
  if (!fc?.merchantHint) return false;
  if (fc.merchantHintSource === 'preposition') return true;
  return isMerchantHintGrounded(fc.merchantHint, groupKeys);
}

/** A merchant-typed classification whose hint is not trusted. */
export function isUntrustedMerchantHint(
  fc: (MerchantHintLike & { queryType?: string }) | null | undefined,
  trusted: boolean,
): boolean {
  return fc?.queryType === 'merchant' && !!fc.merchantHint && !trusted;
}

/** Real merchant grouping keys returned by merchant_totals evidence (any period). */
export function merchantGroupKeysFromEvidence(results: readonly PrimeEvidenceResult[] | null | undefined): string[] {
  const keys: string[] = [];
  for (const r of results || []) {
    if (r.tool !== 'merchant_totals') continue;
    const merchants = (r.data as { merchants?: Array<{ groupingKey?: unknown }> } | null | undefined)?.merchants;
    for (const m of Array.isArray(merchants) ? merchants : []) {
      if (typeof m?.groupingKey === 'string' && m.groupingKey) keys.push(m.groupingKey);
    }
  }
  return keys;
}

/**
 * Remove merchant_totals evidence produced for an untrusted hint, so it is never
 * presented as authoritative merchant aggregation. Sufficiency/counts are recomputed
 * against the plan without merchant steps. Returns null when no executed evidence
 * remains (only skipped context steps), so no empty evidence block is injected.
 */
export function withholdMerchantAggregationEvidence(
  result: PrimeEvidenceExecutionResult,
  plan: PrimeEvidencePlan | null | undefined,
): PrimeEvidenceExecutionResult | null {
  const results = result.results.filter((r) => r.tool !== 'merchant_totals');
  if (results.length === result.results.length) return result;
  if (results.every((r) => r.status === 'skipped')) return null;
  const overallSufficiency = plan
    ? assessSufficiency({ ...plan, steps: plan.steps.filter((s) => s.tool !== 'merchant_totals') }, results)
    : result.overallSufficiency;
  return {
    ...result,
    results,
    overallSufficiency,
    executedCount: results.filter((r) => r.status !== 'skipped').length,
    skippedCount: results.filter((r) => r.status === 'skipped').length,
    failedCount: results.filter((r) => r.status === 'failed').length,
    resolvedCount: results.filter((r) => r.status === 'resolved').length,
    successfulEmptyCount: results.filter((r) => r.status === 'successful_empty').length,
  };
}
