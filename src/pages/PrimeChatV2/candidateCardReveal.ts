/**
 * Candidate card reveal + scroll anchor rules for PrimeChatV2.
 *
 * Presentation only — never touches candidate metadata, ordering or identity.
 *
 * The TransactionCandidateListCard must not appear until the assistant's
 * visible framing text has finished (TypingMessage onTyped), and when it does
 * appear in a response taller than the viewport, the viewport is anchored once
 * at the start of that response instead of the bottom of the card.
 */

export interface CandidateCardRevealInput {
  /** Message carries structured transaction candidates. */
  hasCandidates: boolean;
  /** This message is the one currently streaming. */
  isStreaming: boolean;
  /** Visible text is complete: typed via TypingMessage onTyped, or hydrated from history. */
  isTyped: boolean;
  content: string;
}

/**
 * Reveal the card only once the visible framing is complete.
 * Empty, non-streaming content never types (TypingMessage does not call onTyped
 * for empty text), so it reveals immediately rather than staying hidden forever.
 */
export function shouldRevealCandidateCard(input: CandidateCardRevealInput): boolean {
  if (!input.hasCandidates) return false;
  if (input.isStreaming) return false;
  if (input.isTyped) return true;
  return input.content.trim() === '';
}

/** Anchor only on a hidden → visible transition observed during this session. */
export function isCandidateCardRevealTransition(previous: boolean | undefined, next: boolean): boolean {
  return previous === false && next === true;
}

/**
 * Anchor at the message start only when the full response does not fit and
 * the user has not scrolled away on their own.
 */
export function shouldAnchorCandidateMessage(input: {
  messageHeight: number;
  viewportHeight: number;
  userScrolledUp: boolean;
}): boolean {
  return !input.userScrolledUp && input.messageHeight > input.viewportHeight;
}

/** scrollTop that places the message start at the top of the scroll container. */
export function messageStartScrollTop(input: {
  messageTop: number;
  containerTop: number;
  currentScrollTop: number;
  offset?: number;
}): number {
  return Math.max(0, input.currentScrollTop + (input.messageTop - input.containerTop) - (input.offset ?? 8));
}
