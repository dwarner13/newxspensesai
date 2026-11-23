/**
 * Xspense Score display hold (owner direction 2026-11-23).
 *
 * The score calculation (useXspenseScore) is unchanged, but its accuracy could not be
 * established from authoritative data:
 * - the Debt Management pillar is a fixed 65 at 15% weight;
 * - the cash-flow month buckets count transfers as expenses;
 * - the "flagged" count ignores Other and Needs Review;
 * - the input is a browser read capped at 5,000 transactions;
 * - the "+N pts" action impacts are fixed values.
 * Until the score is reviewed, every surface hides the numerical score instead of
 * showing it. Flip REVIEW_HOLD only after the owner approves a reviewed score.
 */
export const XSPENSE_SCORE_REVIEW_HOLD = true;

export function isXspenseScoreVisible(): boolean {
  return !XSPENSE_SCORE_REVIEW_HOLD;
}

export const XSPENSE_SCORE_REVIEW_MESSAGE =
  "Your Xspense Score is being reviewed for accuracy and is temporarily hidden. Your transactions, categories and reports are not affected.";
