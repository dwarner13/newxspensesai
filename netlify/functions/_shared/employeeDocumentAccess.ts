/**
 * Attachments E1 — employee document-access permissions (SERVER-ONLY, code-owned).
 *
 * One contract for which AI employees may read CHAT DOCUMENTS (attach-and-discuss) and which
 * read-only document tools they may use. Enforced server-side in chat.ts regardless of what any
 * frontend shows. Deny by default: unknown or unlisted employees get nothing.
 *
 * This governs chat documents only. Import-document metadata (statement totals via documentIds,
 * e.g. Byte's existing flow) is unaffected. Ownership and conversation scope are still verified
 * per request by the C1/C3 code; this map only narrows WHICH employees may receive them.
 *
 * To authorize a future employee: add its canonical key to EMPLOYEE_DOCUMENT_ACCESS (with an
 * owner-approved scope) — nothing else in the architecture changes.
 */

export type DocumentTool = 'tag_document_findings';

export type EmployeeDocumentAccess = {
  /** May receive server-loaded, masked chat-document excerpts in its own conversations. */
  chatDocumentContext: boolean;
  /** Read-only document tools this employee may call. */
  tools: readonly DocumentTool[];
};

export const NO_DOCUMENT_ACCESS: EmployeeDocumentAccess = Object.freeze({ chatDocumentContext: false, tools: Object.freeze([]) as readonly DocumentTool[] });

/** Canonical employee → access. Only owner-approved entries. Everything else: NO_DOCUMENT_ACCESS. */
export const EMPLOYEE_DOCUMENT_ACCESS: Readonly<Record<string, EmployeeDocumentAccess>> = Object.freeze({
  // Prime: central coordinator (C1–C3) + read-only Tag consultation (D1).
  prime: Object.freeze({ chatDocumentContext: true, tools: Object.freeze(['tag_document_findings'] as const) }),
  // Tag (E2), Byte, Crystal, Goalie, Finley (E3): not yet authorized for direct document access.
  // Custodian: account/security assistant — no financial document access planned.
});

/** Known slug spellings → canonical key. Unknown spellings are NOT guessed (deny). */
const SLUG_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  prime: 'prime',
  'prime-boss': 'prime',
  tag: 'tag',
  'tag-ai': 'tag',
  byte: 'byte',
  'byte-docs': 'byte',
  crystal: 'crystal',
  'crystal-analytics': 'crystal',
  'crystal-ai': 'crystal',
  goalie: 'goalie',
  'goalie-goals': 'goalie',
  finley: 'finley',
  'finley-ai': 'finley',
  custodian: 'custodian',
  'custodian-settings': 'custodian',
});

export function canonicalEmployeeKey(slug: unknown): string | null {
  const s = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  return SLUG_ALIASES[s] ?? null;
}

export function resolveEmployeeDocumentAccess(slug: unknown): EmployeeDocumentAccess {
  const key = canonicalEmployeeKey(slug);
  if (!key) return NO_DOCUMENT_ACCESS;
  return EMPLOYEE_DOCUMENT_ACCESS[key] ?? NO_DOCUMENT_ACCESS;
}
