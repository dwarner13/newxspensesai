/**
 * COLLAB-1 — per-request budgets for chat.ts.
 *
 * Tool loops were bounded by rounds (3) but not by the number of calls per round, so one
 * request could run many model-requested tool calls. This caps model-requested tool calls
 * per request; when exhausted, the call is not executed and the model receives a
 * structured error telling it to answer with the evidence it already has. User-confirmed
 * actions and server-planned evidence steps are not counted (they are bounded elsewhere).
 */

export const MAX_MODEL_TOOL_CALLS_PER_REQUEST = 12;
export const MAX_DOCUMENT_IDS_PER_REQUEST = 10;

export const TOOL_BUDGET_EXCEEDED_RESULT = Object.freeze({
  error: 'tool_call_budget_exceeded',
  message: 'The tool-call limit for this request was reached, so this call was not run. Answer with the evidence already gathered, or ask the user to narrow the question.',
});

export function createToolCallBudget(max = MAX_MODEL_TOOL_CALLS_PER_REQUEST) {
  let used = 0;
  return {
    max,
    get used() { return used; },
    /** Reserve one call; false when the budget is exhausted. */
    take(): boolean {
      if (used >= max) return false;
      used += 1;
      return true;
    },
  };
}

/** Bounded, de-duplicated document references (ownership is still checked per id downstream). */
export function boundDocumentIds(raw: unknown, max = MAX_DOCUMENT_IDS_PER_REQUEST): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: string[] = [];
  for (const d of raw) {
    if (typeof d !== 'string' || d.length === 0 || d.length > 64 || out.includes(d)) continue;
    out.push(d);
    if (out.length >= max) break;
  }
  return out;
}
