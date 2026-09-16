/**
 * CURRENT-TIME / CURRENT-DATE INTENT DETECTOR
 *
 * Deterministic classifier that identifies when a user is asking for the
 * current clock time or calendar date.
 *
 * This is SEPARATE from `classifyTemporalIntent` (which distinguishes
 * future_spending vs withdrawal_capacity for financial reasoning).
 *
 * Design principle: POSITIVE detection of current-time/date intent.
 * Only explicit phrases like "what time is it" or "what is today's date"
 * should trigger — never loose keyword presence of "time" or "date".
 *
 * Pure TypeScript. No React, no Supabase, no Node-only APIs.
 */

export type CurrentTimeIntent = 'date' | 'time' | 'datetime' | null;

/**
 * Detect whether a user message is asking for the current time, date, or both.
 *
 * Uses only explicit phrase patterns — never loose keyword matching.
 * Financial questions containing "time" or "date" as incidental words
 * (e.g., "by the time I retire", "what time did I pay") will NOT match.
 */
export function detectCurrentTimeIntent(message: string): CurrentTimeIntent {
  const text = String(message || '').trim().toLowerCase();
  if (!text) return null;

  // Early exit: messages containing financial keywords are very unlikely
  // to be asking about the current clock/calendar.
  const likelyFinanceQuestion =
    /\b(statement|statements|transaction|transactions|merchant|merchants|spend|spent|charge|charges|category|categories|import|upload)\b/i.test(text) ||
    /\bmost\s+recent\s+date\s+for\b/i.test(text);
  if (likelyFinanceQuestion) return null;

  // Explicit phrase patterns — each clearly asks for current time or date.
  const datePattern =
    /\b(what(?:'s| is)\s+(?:the\s+)?date|today(?:'s)?\s+date|date\s+today|what\s+da(?:y|te)\s+is\s+it|which\s+day\s+is\s+it|what\s+is\s+today)\b/i;
  const timePattern =
    /\b(what(?:'s| is)\s+(?:the\s+)?time|current\s+time|time\s+now|what\s+time\s+is\s+it)\b/i;

  const asksDate = datePattern.test(text);
  const asksTime = timePattern.test(text);

  if (asksDate && asksTime) return 'datetime';
  if (asksDate) return 'date';
  if (asksTime) return 'time';
  return null;
}
