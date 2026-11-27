/**
 * C-3 (owner GO 2026-11-27): one vocabulary for remembered context, so the model can tell
 * remembered conversation from verified financial facts. Memory and history are kept (owner:
 * preserve Prime's memory and personality); only their labels change. Wording confirmed by the
 * owner and AI Architecture HQ (PRIME_GROUNDING_C1_C5_SCOPE.md).
 */

/** Label 1 — header for recalled memory facts (replaces "Relevant user context:"). */
export const REMEMBERED_CONTEXT_HEADER =
  "REMEMBERED CONTEXT (from earlier conversations — use it to stay personal and consistent; these are NOT verified financial facts: never quote an amount, total or balance from here as current; get figures from this turn's financial tools):";

/** Label 2 — memory-summary line (replaces "recentFacts (customer-provided earlier, date unknown — not verified balances):"). */
export const REMEMBERED_FACTS_SUMMARY_LABEL =
  '- remembered facts (customer-provided earlier; not verified financial facts):';

/** Label 3 — before the replayed conversation turns. */
export const EARLIER_CONVERSATION_LABEL =
  'EARLIER IN THIS CONVERSATION (context only, not evidence): amounts in earlier replies may be out of date or wrong. Every amount you state now must come from this turn\'s financial tools.';

/** Per-fact provenance: who/when when stored, otherwise "date unknown" (existing facts). */
export function rememberedFactLine(f: { fact: string; employee?: string | null; date?: string | null }): string {
  const when = typeof f.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(f.date) ? f.date.slice(0, 10) : null;
  const who = typeof f.employee === 'string' && f.employee.trim() ? f.employee.trim() : null;
  const provenance = who && when ? `(remembered from ${who}, ${when})` : when ? `(remembered, ${when})` : '(remembered; date unknown)';
  return `- ${f.fact} ${provenance}`;
}

export function rememberedContextBlock(facts: ReadonlyArray<{ fact: string; employee?: string | null; date?: string | null }>): string {
  return facts.length > 0 ? `\n\n${REMEMBERED_CONTEXT_HEADER}\n${facts.map(rememberedFactLine).join('\n')}` : '';
}
