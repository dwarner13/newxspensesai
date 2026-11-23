/**
 * H1-A — explicit Custodian launch.
 *
 * Selecting Custodian (the /dashboard/custodian route) hands off to Settings with a
 * one-time navigation state flag. Settings opens the existing Custodian chat only when
 * that flag is present, then clears it, so ordinary Settings navigation, refresh and
 * Back never auto-open Custodian.
 */

export const CUSTODIAN_SETTINGS_PATH = '/dashboard/settings';
export const OPEN_CUSTODIAN_STATE_KEY = 'openCustodian';

export type CustodianLaunchState = { [OPEN_CUSTODIAN_STATE_KEY]: true };

export function buildCustodianLaunchState(): CustodianLaunchState {
  return { [OPEN_CUSTODIAN_STATE_KEY]: true };
}

/** True only for the explicit launch flag set by buildCustodianLaunchState(). */
export function shouldOpenCustodianFromState(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false;
  return (state as Record<string, unknown>)[OPEN_CUSTODIAN_STATE_KEY] === true;
}
