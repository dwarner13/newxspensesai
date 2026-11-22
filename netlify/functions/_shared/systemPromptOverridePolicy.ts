/**
 * C1-S / COLLAB-1 — server policy for a client-supplied `systemPromptOverride` (SERVER-ONLY).
 *
 * The chat request body may carry `systemPromptOverride`. It used to be pushed as a SYSTEM
 * message that REPLACED the employee's server prompt, so any authenticated user could
 * rewrite an employee's instructions for their own session.
 *
 * Policy:
 *  - C1-S: Prime ('prime-boss' / 'prime') never accepts a client prompt.
 *  - COLLAB-1: no employee accepts free-text client instructions any more. Pages that need
 *    context send a structured `pageContext` instead, rendered from server-owned templates
 *    (see pageContextTemplates.ts) and added alongside — never instead of — the employee's
 *    server prompt.
 *  - The prompt text is never logged.
 *
 * The decision is still taken at the USE site with the FINAL employee slug.
 */

export const PRIME_EMPLOYEE_SLUGS: ReadonlySet<string> = new Set(['prime-boss', 'prime']);

export type SystemPromptOverrideDecision =
  | { accepted: true; prompt: string }
  | { accepted: false; reason: 'absent' | 'not_string' | 'blank' | 'prime_server_owned' | 'client_prompts_not_accepted' };

export function isPrimeEmployeeSlug(slug: string | null | undefined): boolean {
  return PRIME_EMPLOYEE_SLUGS.has(String(slug ?? '').trim().toLowerCase());
}

export function resolveSystemPromptOverride(
  finalEmployeeSlug: string | null | undefined,
  raw: unknown,
): SystemPromptOverrideDecision {
  if (raw === undefined || raw === null) return { accepted: false, reason: 'absent' };
  if (typeof raw !== 'string') return { accepted: false, reason: 'not_string' };
  if (!raw.trim()) return { accepted: false, reason: 'blank' };
  // Unknown / missing slug resolves to Prime downstream, so it is treated as Prime here.
  if (!finalEmployeeSlug || isPrimeEmployeeSlug(finalEmployeeSlug)) {
    return { accepted: false, reason: 'prime_server_owned' };
  }
  // COLLAB-1: specialists no longer accept free-text client prompts either.
  return { accepted: false, reason: 'client_prompts_not_accepted' };
}
