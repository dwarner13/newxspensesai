/**
 * T-H1b — client rules for Tag ACTION turns (preview → confirmation → completed / failed / cancelled),
 * sent to tag-action. Tag HQ owns this file; presentation and session handling stay in the panel
 * (UI/UX Studio, T-H2b). Pure: no I/O.
 *
 * Request: tag-action { intent, matchValue?, targetCategory?, matchType?, conversation }
 *   conversation = { sessionId?, clientMessageId, customerText, newConversation? }
 * Response: legacy fields (ok, matchCount, updatedCount, …) + duplicate? + executed? +
 *   conversation = { sessionId, persisted, duplicate?, conflict?, reply, receipt|null }
 *
 * Rules:
 * - Tag's words come from the SERVER (`conversation.reply`); the panel never composes "Done".
 * - A proposal is pending only when the server recorded receipt.state === 'proposed'.
 * - Effects (toast, refresh) only for receipt.state === 'completed' on a fresh (non-duplicate) turn.
 * - duplicate / conflict replies are display-only.
 */
import { tagReplyOutcome, type TagReplyKind } from '@/lib/tagConversation';

export type ActionReceiptState = 'proposed' | 'confirmed' | 'completed' | 'failed' | 'cancelled';

export interface ActionConversationFields {
  sessionId?: string;
  clientMessageId: string;
  customerText: string;
  newConversation?: true;
}

export function buildActionConversation(params: {
  sessionId: string | null;
  clientMessageId: string;
  customerText: string;
  startNewConversation: boolean;
}): ActionConversationFields {
  return {
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
    clientMessageId: params.clientMessageId,
    customerText: params.customerText,
    ...(params.startNewConversation && !params.sessionId ? { newConversation: true as const } : {}),
  };
}

export interface ActionTurnResult {
  kind: TagReplyKind;
  /** Server-written reply to show (or the fallback when the server sent none). */
  reply: string;
  sessionId: string | null;
  receiptState: ActionReceiptState | null;
  /** Keep the proposal pending (only a fresh, server-recorded proposal). */
  proposalPending: boolean;
  /** Run client effects (toast, refresh) — only a fresh, server-verified completion. */
  completed: boolean;
  affectedCount: number;
}

const STATES: ActionReceiptState[] = ['proposed', 'confirmed', 'completed', 'failed', 'cancelled'];

export function interpretActionResponse(data: unknown, fallbackReply: string): ActionTurnResult {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const conv = (d.conversation && typeof d.conversation === 'object' ? d.conversation : {}) as Record<string, unknown>;
  const outcome = tagReplyOutcome({
    sessionId: conv.sessionId,
    persisted: conv.persisted,
    duplicate: d.duplicate === true || conv.duplicate === true,
    conflict: conv.conflict === true,
  });
  const receipt = (conv.receipt && typeof conv.receipt === 'object' ? conv.receipt : null) as Record<string, unknown> | null;
  const state = receipt && STATES.includes(receipt.state as ActionReceiptState) ? (receipt.state as ActionReceiptState) : null;
  const result = (receipt?.result && typeof receipt.result === 'object' ? receipt.result : {}) as Record<string, unknown>;
  const reply = typeof conv.reply === 'string' && conv.reply.trim() ? conv.reply : fallbackReply;
  return {
    kind: outcome.kind,
    reply,
    sessionId: outcome.sessionId,
    receiptState: state,
    proposalPending: outcome.mayApply && state === 'proposed',
    completed: outcome.mayApply && state === 'completed',
    affectedCount: typeof result.affectedCount === 'number' ? result.affectedCount : 0,
  };
}

/** Customer declines a pending proposal ("no", "cancel", "never mind", …). */
export function isRejection(text: string): boolean {
  return /^(no|nope|nah|cancel|stop|don'?t|do not|never ?mind|not now|no thanks?|leave it)\b[!.\s]*$/i.test(text.trim());
}

/** Shown (never stored) when the request itself failed: the outcome is unknown, so no retry. */
export const ACTION_UNKNOWN_OUTCOME =
  "I couldn't confirm whether that went through. Please check your transactions before trying again.";

// ─────────────────────────────────────────────────────────────────────────────
// T-LIVE-02 — intent routing for typed change requests (pure, Tag HQ).
// Owner case: a focused transaction plus "can we change this to food and beverage" was read as a
// merchant search for "THIS". References to the focused transaction must never become a merchant
// pattern, and a merchant-wide preview must never be built from "this" / "it" / "that".
// ─────────────────────────────────────────────────────────────────────────────

const REF_NOUN = '(?:transaction|expense|charge|purchase|payment|item|entry|bill|one)';
/** "this", "it", "that one", "this expense", "the transaction", … */
const FOCUSED_REFERENCE = new RegExp(String.raw`^(?:(?:this|that|it)(?:\s+${REF_NOUN})?|(?:the|this|that)\s+${REF_NOUN})(?:\s+(?:here|above|below))?$`, 'i');

/** True when a would-be merchant name is really a reference to "this" transaction. */
export function isFocusedReference(value: string): boolean {
  return FOCUSED_REFERENCE.test(String(value || '').trim().replace(/^["']|["']$/g, '').trim());
}

const REF = String.raw`(?:(?:this|that|it)(?:\s+${REF_NOUN})?|(?:the|this|that)\s+${REF_NOUN})`;
const VERB = '(?:change|move|set|mark|categori[sz]e|recategori[sz]e|re-categori[sz]e|put|tag|assign|update|switch|make|file|label|classify|reclassify)';
const LEAD = String.raw`(?:(?:hey|hi|ok|okay)\s+tag[,!.\s]+)?(?:(?:can|could|would|will)\s+(?:we|you|u)\s+(?:please\s+)?|please\s+|pls\s+|let'?s\s+|i\s+(?:want|need)\s+(?:you\s+)?to\s+|i'?d\s+like\s+(?:you\s+)?to\s+)?`;
const TRAIL = String.raw`(?:\s+(?:instead|please|pls|thanks|thank you))*[\s.!?]*$`;
const FOCUSED_CHANGE_PATTERNS: RegExp[] = [
  // "can we change this to food and beverage", "move it into Groceries", "categorize this expense as Travel"
  new RegExp(String.raw`^${LEAD}${VERB}\s+${REF}(?:\s+(?:to|as|into|under|in))?\s+(?:the\s+)?(?:category\s+)?(.+?)(?:\s+category)?${TRAIL}`, 'i'),
  // "this should be Groceries", "this one belongs in Travel", "it should go under Food & Dining"
  new RegExp(String.raw`^${LEAD}${REF}\s+(?:should\s+be|should\s+go|needs\s+to\s+be|needs\s+to\s+go|belongs|goes)(?:\s+(?:in|into|under|to|as))?\s+(?:the\s+)?(?:category\s+)?(.+?)(?:\s+category)?${TRAIL}`, 'i'),
];

/**
 * A change request about the FOCUSED transaction ("this", "it", "this expense", …). Returns the
 * customer's category words verbatim — the server resolves them against the available categories.
 */
export function detectFocusedChangeRequest(text: string): { targetPhrase: string } | null {
  const t = String(text || '').trim();
  if (!t || t.length > 200) return null;
  for (const re of FOCUSED_CHANGE_PATTERNS) {
    const m = t.match(re);
    if (m && m[1]) {
      const targetPhrase = m[1].trim().replace(/^["']|["']$/g, '').trim();
      // "change this to that other one" / nested references are not a category.
      if (targetPhrase && !isFocusedReference(targetPhrase) && targetPhrase.length <= 80) return { targetPhrase };
    }
  }
  return null;
}

/**
 * Merchant-wide request ("change all Uber to Transportation"). Never fires when the "merchant" is a
 * reference to a transaction ("this", "it", …): that is a focused request or a question for Tag.
 */
export function detectUserActionIntent(msg: string): { matchValue: string; targetCategory: string; matchType: 'contains' | 'exact' } | null {
  const re = /(?:can you\s+)?(?:change|move|set|mark|categorize|recategorize|put|tag|assign|update)\s+(?:all\s+)?["']?([^"']+?)["']?\s+(?:to|as|into)\s+(?:the\s+)?(?:category\s+)?["']?([^"'.,!?\n]+?)["']?\s*$/i;
  const m = String(msg || '').match(re);
  if (!m) return null;
  const matchValue = m[1].trim().replace(/^(all|every|my|the)\s+/i, '').trim();
  const targetCategory = m[2].trim().replace(/\b\w/g, c => c.toUpperCase());
  if (!matchValue || !targetCategory || matchValue.length <= 1) return null;
  if (isFocusedReference(matchValue) || isFocusedReference(m[1].trim())) return null;
  return { matchValue, targetCategory, matchType: 'contains' };
}
