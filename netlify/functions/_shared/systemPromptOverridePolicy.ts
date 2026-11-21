/**
 * C1-S — server policy for a client-supplied `systemPromptOverride` (SERVER-ONLY).
 *
 * The chat request body may carry `systemPromptOverride`. Before C1-S, chat.ts pushed it as
 * a SYSTEM message for any employee, so any authenticated user could replace Prime's
 * authoritative instructions for their own session.
 *
 * Policy:
 *  - Prime ('prime-boss' / 'prime') NEVER accepts a client prompt. Prime's instructions are
 *    server-owned (brain pack, preamble, memory, persona); the Prime panel and
 *    EmployeeChatPage therefore get the same instructions.
 *  - Specialists keep their existing behaviour (ReviewStatementPage → custodian,
 *    ReportsV2 → Crystal / Tag, EmployeeChatPage → Crystal / Tag / Blitz context prompts).
 *    This is the documented compatibility surface; tightening it is a separate decision.
 *  - Non-string or blank values are ignored for everyone.
 *
 * The decision is taken at the USE site with the FINAL employee slug (after routing and
 * session resolution), so a request cannot name a specialist and end up as Prime with its
 * own prompt. The prompt text is never logged.
 */

export const PRIME_EMPLOYEE_SLUGS: ReadonlySet<string> = new Set(['prime-boss', 'prime']);

export type SystemPromptOverrideDecision =
  | { accepted: true; prompt: string }
  | { accepted: false; reason: 'absent' | 'not_string' | 'blank' | 'prime_server_owned' };

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
  return { accepted: true, prompt: raw };
}
