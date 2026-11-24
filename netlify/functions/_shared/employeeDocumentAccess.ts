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
 *
 * Entitlements (owner directive 2026-11-24): document access must ALSO pass the single capability
 * hook (src/shared/capabilities.ts authorizeCapability, capability 'byte.chat_document_context',
 * via 'document_access'). authorizeEmployeeDocumentAccess combines both; either one denying means
 * no access. The acting employee is always the canonical, server-resolved key.
 */
import { authorizeCapability } from '../../../src/shared/capabilities.js';

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

/**
 * Static E1 permission AND the capability/entitlement hook. Used for every chat-document context
 * decision. The hook allows everything until an entitlement resolver is installed, so Prime's
 * behaviour is unchanged today.
 */
export async function authorizeEmployeeDocumentAccess(args: { userId: string; employeeSlug: unknown }): Promise<EmployeeDocumentAccess> {
  const key = canonicalEmployeeKey(args.employeeSlug);
  const permission = key ? EMPLOYEE_DOCUMENT_ACCESS[key] ?? NO_DOCUMENT_ACCESS : NO_DOCUMENT_ACCESS;
  if (!key || !permission.chatDocumentContext) return NO_DOCUMENT_ACCESS;
  try {
    const decision = await authorizeCapability({
      userId: args.userId,
      actingEmployee: key, // canonical server-resolved key, never a client-supplied value
      toolId: 'chat_document_context',
      via: 'document_access',
    });
    return decision.allowed ? permission : NO_DOCUMENT_ACCESS;
  } catch {
    return NO_DOCUMENT_ACCESS;
  }
}

export function resolveEmployeeDocumentAccess(slug: unknown): EmployeeDocumentAccess {
  const key = canonicalEmployeeKey(slug);
  if (!key) return NO_DOCUMENT_ACCESS;
  return EMPLOYEE_DOCUMENT_ACCESS[key] ?? NO_DOCUMENT_ACCESS;
}
