/**
 * Visual reveal timing for TransactionCandidateListCard (presentation only).
 *
 * Opacity + transform only — the card and every row mount at their final
 * layout size, so scroll height never changes during the reveal.
 * The total duration is capped and does not grow with the row count.
 */

import type { CSSProperties } from 'react';

export const CARD_REVEAL_MS = 180;
export const ROW_REVEAL_MS = 220;
export const ROW_INITIAL_DELAY_MS = 80;
export const ROW_MAX_STAGGER_MS = 40;
export const ROW_STAGGER_WINDOW_MS = 360;

/** Upper bound for the whole reveal, for any row count. */
export const MAX_REVEAL_MS = ROW_INITIAL_DELAY_MS + ROW_STAGGER_WINDOW_MS + ROW_REVEAL_MS;

/** Per-row stagger: min(40ms, 360ms / (rows - 1)); 0 for a single row. */
export function candidateRowStaggerMs(rowCount: number): number {
  if (rowCount <= 1) return 0;
  return Math.min(ROW_MAX_STAGGER_MS, ROW_STAGGER_WINDOW_MS / (rowCount - 1));
}

/** Start delay for row `index` (0-based). */
export function candidateRowDelayMs(index: number, rowCount: number): number {
  return Math.round(ROW_INITIAL_DELAY_MS + index * candidateRowStaggerMs(rowCount));
}

/** Time until the last row has finished revealing. */
export function candidateRevealTotalMs(rowCount: number): number {
  if (rowCount <= 0) return CARD_REVEAL_MS;
  return Math.max(CARD_REVEAL_MS, candidateRowDelayMs(rowCount - 1, rowCount) + ROW_REVEAL_MS);
}

/** Same matchMedia approach as TypingMessage. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const CARD_KEYFRAMES = 'txCandidateCardIn';
export const ROW_KEYFRAMES = 'txCandidateRowIn';

/** Keyframes + reduced-motion backstop. Only opacity and transform are animated. */
export const CANDIDATE_REVEAL_CSS =
  `@keyframes ${CARD_KEYFRAMES} { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`
  + ` @keyframes ${ROW_KEYFRAMES} { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }`
  + ' @media (prefers-reduced-motion: reduce) { [data-tx-reveal] { animation: none !important; } }';

export function candidateCardRevealStyle(animate: boolean): CSSProperties | undefined {
  return animate ? { animation: `${CARD_KEYFRAMES} ${CARD_REVEAL_MS}ms ease-out both` } : undefined;
}

export function candidateRowRevealStyle(animate: boolean, index: number, rowCount: number): CSSProperties | undefined {
  if (!animate) return undefined;
  return { animation: `${ROW_KEYFRAMES} ${ROW_REVEAL_MS}ms ease-out ${candidateRowDelayMs(index, rowCount)}ms both` };
}
