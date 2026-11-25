/**
 * LD-1 (owner GO) — one XspensesAI startup experience. Pure helpers for AppSplash.
 * Honest only: a short status line, no percentages, no artificial delay. After a long wait
 * the splash says so and offers a reload, instead of spinning forever.
 */

export type AppSplashStage = 'signing-in' | 'preparing' | 'loading';

export const APP_SPLASH_STATUS: Readonly<Record<AppSplashStage, string>> = Object.freeze({
  'signing-in': 'Signing you in…',
  preparing: 'Preparing your workspace…',
  loading: 'Loading…',
});

/** After this long, show "taking longer than usual" with a Reload option. */
export const APP_SPLASH_SLOW_MS = 15000;

export function splashStatus(stage: AppSplashStage, slow: boolean): string {
  return slow ? 'This is taking longer than usual.' : APP_SPLASH_STATUS[stage];
}
