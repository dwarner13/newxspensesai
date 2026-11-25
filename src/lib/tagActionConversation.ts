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
