/**
 * Universal employee conversation platform — pure identity and presentation rules (no I/O).
 * Shared by the server (netlify/functions/_shared/conversation-platform.ts) and the client
 * (history drawer filtering, restore checks), so both sides agree on employee identity.
 *
 * Owner principle: one account, all devices, specialized employees, persistent conversations,
 * shared infrastructure, protected premium capabilities. Persistence is a platform capability;
 * it never grants an employee another employee's tools or paid actions.
 */

/**
 * Canonical conversation slugs. Prime and Tag are verified against live chat paths; the others follow
 * the slug most used by live code and are PROVISIONAL until a read-only check of the distinct
 * chat_sessions.employee_slug values (seed migration 004 uses byte-doc / goalie-coach variants).
 */
export const CONVERSATION_EMPLOYEES = Object.freeze({
  prime: 'prime-boss',
  tag: 'tag-ai',
  byte: 'byte-docs',
  crystal: 'crystal-analytics',
  goalie: 'goalie-goals',
  finley: 'finley-ai',
  liberty: 'liberty-freedom',
  ledger: 'ledger-tax',
  chime: 'chime-ai',
  blitz: 'blitz-debt',
  custodian: 'custodian',
} as const);

export type ConversationEmployeeSlug = typeof CONVERSATION_EMPLOYEES[keyof typeof CONVERSATION_EMPLOYEES];

/** Legacy / alternate slugs seen in stored rows and routes → canonical slug. */
const ALIASES: Readonly<Record<string, ConversationEmployeeSlug>> = Object.freeze({
  'prime': 'prime-boss', 'prime-boss': 'prime-boss',
  'tag': 'tag-ai', 'tag-ai': 'tag-ai', 'tag-categorizer': 'tag-ai',
  'byte': 'byte-docs', 'byte-docs': 'byte-docs', 'byte-doc': 'byte-docs',
  'crystal': 'crystal-analytics', 'crystal-analytics': 'crystal-analytics', 'crystal-ai': 'crystal-analytics', 'crystal-spending': 'crystal-analytics', 'crystal-insights': 'crystal-analytics',
  'goalie': 'goalie-goals', 'goalie-goals': 'goalie-goals', 'goalie-ai': 'goalie-goals', 'goalie-coach': 'goalie-goals', 'goalie-agent': 'goalie-goals',
  'finley': 'finley-ai', 'finley-ai': 'finley-ai', 'finley-forecasts': 'finley-ai',
  'liberty': 'liberty-freedom', 'liberty-freedom': 'liberty-freedom', 'liberty-ai': 'liberty-freedom', 'liberty-financial-freedom': 'liberty-freedom',
  'ledger': 'ledger-tax', 'ledger-tax': 'ledger-tax', 'ledger-ai': 'ledger-tax',
  'chime': 'chime-ai', 'chime-ai': 'chime-ai', 'bill-reminders': 'chime-ai',
  'blitz': 'blitz-debt', 'blitz-debt': 'blitz-debt', 'blitz-ai': 'blitz-debt', 'debt-payoff-planner': 'blitz-debt',
  'custodian': 'custodian', 'custodian-ai': 'custodian',
});

/** Canonical slug, or null for an unknown/unsupported value (never guessed). */
export function canonicalEmployeeSlug(slug: unknown): ConversationEmployeeSlug | null {
  if (typeof slug !== 'string') return null;
  return ALIASES[slug.trim().toLowerCase()] ?? null;
}

/** True when a stored session slug belongs to the given employee (alias-aware). */
export function isEmployeeConversation(storedSlug: unknown, employee: ConversationEmployeeSlug): boolean {
  return canonicalEmployeeSlug(storedSlug) === employee;
}

export const isTagSlug = (s: unknown) => isEmployeeConversation(s, 'tag-ai');
export const isPrimeConversationSlug = (s: unknown) => isEmployeeConversation(s, 'prime-boss');

export const DEFAULT_SESSION_TITLE = 'New Chat';

/** Conversation title from the first (already masked) customer message: one line, ≤ 60 chars. */
export function deriveConversationTitle(maskedFirstMessage: unknown): string | null {
  if (typeof maskedFirstMessage !== 'string') return null;
  const t = maskedFirstMessage.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length <= 60 ? t : `${t.slice(0, 57).trimEnd()}…`;
}

/** Client message ids (retry de-duplication): short opaque tokens only. */
export function isValidClientMessageId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(id);
}

/**
 * Model context comes ONLY from stored history: keep user/assistant turns with string content.
 * Never accept client-supplied history (it could contain fabricated assistant turns).
 */
export function toModelHistory(rows: Array<{ role?: unknown; content?: unknown }>): Array<{ role: 'user' | 'assistant'; content: string }> {
  return (Array.isArray(rows) ? rows : [])
    .filter(r => (r?.role === 'user' || r?.role === 'assistant') && typeof r?.content === 'string' && r.content.trim().length > 0)
    .map(r => ({ role: r.role as 'user' | 'assistant', content: r.content as string }));
}
