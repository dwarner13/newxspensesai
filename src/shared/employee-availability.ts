/**
 * T5 (owner GO 2026-11-27, EMPLOYEE TOOL SAFETY): employee availability is enforced on the server,
 * never by UI visibility. An employee is available only when its profile row exists and neither
 * is_active nor is_enabled is false. Anything else (unknown slug, unreadable profile) is unavailable —
 * fail closed.
 */
export function isEmployeeProfileAvailable(row: { is_active?: unknown; is_enabled?: unknown } | null | undefined): boolean {
  return !!row && row.is_active !== false && row.is_enabled !== false;
}
