/**
 * Upload "Apply all" — the client side of Tag's signed proposal flow (owner GO 2026-11-25;
 * contract: Tag HQ handoff TAG_upload_apply_all_handoff_UIUX.md).
 *
 *   1. propose_import_suggestions  → Tag recomputes the suggestions on the server and saves a
 *      signed proposal. Nothing changes.
 *   2. commit_proposal             → only after the customer clicks Confirm; echoes the
 *      proposal's action and subject exactly as received.
 *
 * The browser never sends groups, categories, counts or row ids, and never claims a result
 * the server did not confirm. Pure functions: no React, no network.
 */
import { newClientMessageId, tagReplyOutcome } from '@/lib/tagConversation';

export const APPLY_SUGGESTIONS_TEXT = "Apply Tag's suggestions for this statement";
export const UNKNOWN_OUTCOME_TEXT = "Couldn't confirm whether that went through — check your transactions before trying again.";
export const NOT_CHECKED_TEXT = "Tag couldn't check those suggestions, so nothing has changed.";
/** 401: the request was refused before anything ran (Attachments HQ review note). */
export const SIGNED_OUT_TEXT = "Your sign-in has expired, so nothing was changed. Please sign in again and retry.";
export class SignedOutError extends Error {}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const clean = (s: unknown) => String(s ?? '').replace(/\*\*/g, '').trim();

/** Step 1 body: the import reference and the conversation fields only. */
export function buildProposeBody(importId: string, clientMessageId: string = newClientMessageId()) {
  return {
    intent: 'propose_import_suggestions',
    importId,
    conversation: { customerText: APPLY_SUGGESTIONS_TEXT, clientMessageId },
  };
}

export interface ImportProposal {
  /** Server text, shown as-is (markdown bold stripped). */
  reply: string;
  /** Exact number of transactions that will change (proposal.subject.affected). */
  affected: number;
  /** Number of merchant groups (proposal.subject.groups). */
  groups: number;
  /** Echoed back unchanged on confirm. */
  action: unknown;
  subject: unknown;
  sessionId: string | null;
}

export type ProposeResult =
  | { kind: 'proposed'; proposal: ImportProposal }
  | { kind: 'nothing'; reply: string };

/** Step 1 response: a proposal only when the server saved one (state 'proposed'). */
export function readProposeResponse(data: unknown): ProposeResult {
  const d = obj(data);
  const conv = obj(d.conversation);
  const receipt = obj(conv.receipt);
  const proposal = obj(d.proposal);
  const reply = clean(conv.reply) || NOT_CHECKED_TEXT;
  if (!d.proposal || receipt.state !== 'proposed' || proposal.subject === undefined) {
    return { kind: 'nothing', reply };
  }
  const subject = obj(proposal.subject);
  const affected = Number(subject.affected);
  return {
    kind: 'proposed',
    proposal: {
      reply,
      affected: Number.isFinite(affected) ? affected : 0,
      groups: Number.isFinite(Number(subject.groups)) ? Number(subject.groups) : 0,
      action: proposal.action,
      subject: proposal.subject,
      sessionId: typeof conv.sessionId === 'string' && conv.sessionId ? conv.sessionId : null,
    },
  };
}

/** Step 2 body: the proposal echoed exactly; a fresh message id; the propose session. */
export function buildCommitBody(p: ImportProposal, clientMessageId: string = newClientMessageId()) {
  return {
    intent: 'commit_proposal',
    action: p.action,
    subject: p.subject,
    conversation: { customerText: 'yes', clientMessageId, ...(p.sessionId ? { sessionId: p.sessionId } : {}) },
  };
}

export type CommitResult =
  /** The server saved the changes (also a repeated confirm whose earlier attempt completed);
   *  count is what it saved. */
  | { kind: 'completed'; count: number; reply: string }
  /** Conflict: nothing was changed; the customer may confirm again (new message id). */
  | { kind: 'retry'; reply: string }
  /** Anything else (including a duplicate whose earlier attempt did not complete): nothing
   *  was changed by this request. Show the server's reply; never claim it was applied. */
  | { kind: 'not_changed'; reply: string };

export function readCommitResponse(data: unknown): CommitResult {
  const d = obj(data);
  const conv = obj(d.conversation);
  const receipt = obj(conv.receipt);
  const reply = clean(conv.reply);
  if (receipt.state === 'completed') {
    const count = Number(receipt.count);
    return { kind: 'completed', count: Number.isFinite(count) ? count : 0, reply };
  }
  // Tag HQ (review of 0e7bfee3): duplicate is flagged at the top level of the response;
  // conflict as error:'conflict' at the top and conflict:true inside conversation.
  const conflict = d.error === 'conflict' || conv.conflict === true || tagReplyOutcome(d).kind === 'conflict';
  if (conflict) return { kind: 'retry', reply: reply || 'Nothing was changed. Please confirm again.' };
  return { kind: 'not_changed', reply: reply || 'Nothing was changed.' };
}

/** "and N more" beyond the three examples in Tag's reply, from the server's group count. */
export function moreGroupsBeyondReply(groups: number, shownInReply = 3): number {
  return Math.max(0, groups - shownInReply);
}
