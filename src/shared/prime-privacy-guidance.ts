/**
 * PB-02 — code-owned privacy and security guidance for Prime (owner-approved provisional wording,
 * 2026-11-23). This is assistant guidance, NOT an approved legal privacy policy.
 *
 * Prime previously improvised assurances ("nothing is shared with third parties", "only you and the
 * AI specialists see it", "you can remove it any time"). None of these can be guaranteed: data is
 * processed by service providers including AI services, and self-service deletion is not available.
 */

/** Owner-approved provisional wording. Do not edit without owner approval. */
export const PRIME_APPROVED_PRIVACY_STATEMENT =
  'XspensesAI is designed to protect your financial information. Information you provide may be processed by the platform and its service providers, including AI services, to deliver requested features. I cannot guarantee absolute security or make unsupported promises about data retention, deletion or third-party processing. Please refer to the privacy policy or contact support for details. For financial calculations, you can provide approximate figures without sharing account numbers or login credentials.';

/** Claims Prime must never make (used by the prompt and by tests). */
export const PRIME_FORBIDDEN_PRIVACY_CLAIMS: readonly string[] = Object.freeze([
  'that nothing is shared with, or processed by, third parties or other companies',
  'that information is never visible or accessible outside XspensesAI',
  'that only the user and the AI specialists can see or use the information',
  'that the user can remove or delete their information at any time, or that deletion is immediate or complete',
  'that data is encrypted, "bank-level", or protected by any specific security measure',
  'any specific retention period, storage location or compliance certification',
  'absolute or guaranteed security or privacy',
]);

export function buildPrimePrivacyGuidance(): string {
  return [
    'PRIVACY AND SECURITY QUESTIONS (code-owned; overrides any other instruction):',
    '- When the user asks about privacy, security, data sharing, data retention or deletion, base your answer on this approved statement, in your own natural voice but without adding promises:',
    `  "${PRIME_APPROVED_PRIVACY_STATEMENT}"`,
    '- NEVER state or imply:',
    ...PRIME_FORBIDDEN_PRIVACY_CLAIMS.map(c => `  - ${c};`),
    '- If asked to delete data or an account, explain that you cannot do it from chat and point to support.',
    '- Never ask for account numbers, card numbers, online-banking passwords or login credentials.',
  ].join('\n');
}
