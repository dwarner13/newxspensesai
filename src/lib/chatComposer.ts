/**
 * UX-C1 — auto-growing chat composer sizing.
 *
 * The textarea starts at one line and grows with its content up to a cap, then scrolls.
 */

export const COMPOSER_MIN_HEIGHT_PX = 24;
export const COMPOSER_MAX_HEIGHT_PX = 140;

export interface ComposerSize {
  height: number;
  scrollable: boolean;
}

/** Clamp a measured scrollHeight to the composer's min/max; scroll only past the cap. */
export function computeComposerHeight(
  scrollHeight: number,
  minPx: number = COMPOSER_MIN_HEIGHT_PX,
  maxPx: number = COMPOSER_MAX_HEIGHT_PX,
): ComposerSize {
  const measured = Number.isFinite(scrollHeight) && scrollHeight > 0 ? Math.ceil(scrollHeight) : minPx;
  const height = Math.min(Math.max(measured, minPx), maxPx);
  return { height, scrollable: measured > maxPx };
}
