/**
 * H1-B — onboarding wizard progress and save-result helpers.
 */

export interface OnboardingProgress {
  current: number;
  total: number;
  percent: number;
}

/**
 * Progress for the step the customer is on, out of the steps actually presented
 * (6 normally, 7 when the self-employed business-name step is shown).
 */
export function getOnboardingProgress(stepIndex: number, totalSteps: number): OnboardingProgress {
  const total = Math.max(1, Math.floor(totalSteps));
  const current = Math.min(Math.max(1, Math.floor(stepIndex) + 1), total);
  return { current, total, percent: Math.round((current / total) * 100) };
}

/** Result shape of a Supabase write: `{ error }` is set on failure (it does not throw). */
export type SupabaseWriteResult = { error?: { message?: string } | null } | null | undefined;

/** Throws when a Supabase write reports an error, so callers can't treat it as saved. */
export function assertSupabaseWriteOk(result: SupabaseWriteResult, what: string): void {
  if (result && result.error) {
    throw new Error(`${what} failed`);
  }
}

export const ONBOARDING_SAVE_ERROR_MESSAGE =
  "We couldn't save that. Please check your connection and try again.";
