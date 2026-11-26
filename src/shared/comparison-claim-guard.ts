/**
 * Coverage gate for comparison / trend / stability claims in ANY employee's reply (owner GO 2026-11-26,
 * UNIFIED FINANCIAL ENGINE: "coverage-aware comparisons for every employee"; Architecture G11).
 * Uses the SAME comparability rule as financial-summary (coverage-insights.comparisonAllowed), so chat
 * and screens can never disagree. When comparisons are not allowed, sentences that make such a claim
 * are removed and one honest sentence is added. Deterministic; no model call.
 */
import { comparisonAllowed } from './coverage-insights';
import type { StatementCoverage } from './statement-coverage';
const CLAIM_PATTERNS: ReadonlyArray<RegExp> = [
  // "up 50%", "increased by 12%", "down 8 percent"
  /\b(up|down|increased?|decreased?|rose|fell|grew|dropped|higher|lower|jumped|climbed)\b[^.!?\n]{0,40}\b\d+(?:\.\d+)?\s?(?:%|percent)/i,
  // "from last month", "than the previous statement", "compared with last period", "vs. last month"
  /\b(?:from|than|vs\.?|versus|compared (?:with|to))\s+(?:your\s+)?(?:last|previous|prior|the previous|the prior)\s+(?:month|statement|period|week|quarter|year)\b/i,
  // "month-over-month", "month over month"
  /\bmonth[- ]over[- ]month\b/i,
  // "stable spending", "spending has been steady", "consistent pattern", "trending up"
  /\b(?:stable|steady|consistent|trending(?:\s+(?:up|down))?)\b[^.!?\n]{0,40}\b(?:spending|expenses|pattern|patterns|habits)\b/i,
  /\b(?:spending|expenses|pattern|patterns|habits)\b[^.!?\n]{0,40}\b(?:stable|steady|consistent|trending)\b/i,
];

export function hasComparisonClaim(text: string): boolean {
  return CLAIM_PATTERNS.some(rx => rx.test(text || ''));
}

export interface ComparisonGateResult { text: string; removedSentences: number; applied: boolean }

export const NOT_ENOUGH_HISTORY_SENTENCE =
  "I can't compare periods or describe a trend yet: there isn't enough complete statement history ({reason}).";

/** Remove claim sentences when comparisons are not allowed; otherwise return the text unchanged. */
export function applyComparisonGate(text: string, permission: { allowed: boolean; reason: string }): ComparisonGateResult {
  if (permission.allowed || !hasComparisonClaim(text)) return { text, removedSentences: 0, applied: false };
  let removed = 0;
  // Sentence-level removal, preserving line structure (bullets / headings stay intact).
  const kept = text.split('\n').map(line => {
    const parts = line.match(/[^.!?]+[.!?]*\s*/g) ?? [line];
    const ok = parts.filter(p => {
      const bad = CLAIM_PATTERNS.some(rx => rx.test(p));
      if (bad) removed++;
      return !bad;
    });
    return ok.join('').trimEnd();
  });
  const body = kept.filter((l, i, a) => !(l.trim() === '' && (i === 0 || a[i - 1].trim() === ''))).join('\n').trim();
  const note = NOT_ENOUGH_HISTORY_SENTENCE.replace('{reason}', permission.reason);
  return { text: body ? `${body}\n\n${note}` : note, removedSentences: removed, applied: true };
}

/**
 * G11b (Architecture review): one async entry point for every LLM-reply endpoint (chat.ts,
 * custodian-chat, prime-briefing, Tag endpoints). Coverage is loaded only when the text makes a
 * comparison / trend / stability claim; the decision uses the same rule as financial-summary
 * (coverage-insights.comparisonAllowed); a coverage read failure fails CLOSED.
 */
export async function gateReplyForCoverage(
  text: string,
  loadCoverage: () => Promise<StatementCoverage>,
): Promise<ComparisonGateResult & { reason: string | null }> {
  if (!text || !hasComparisonClaim(text)) return { text, removedSentences: 0, applied: false, reason: null };
  try {
    const permission = comparisonAllowed(await loadCoverage());
    return { ...applyComparisonGate(text, permission), reason: permission.reason };
  } catch {
    const reason = 'statement coverage could not be read';
    return { ...applyComparisonGate(text, { allowed: false, reason }), reason };
  }
}
