/**
 * COLLAB-1 — bounded client input for endpoints that accept a client-sent conversation
 * (custodian-chat.ts). The history used to be passed through unbounded, and the client's
 * `currentPath` went straight into the system prompt.
 */

export const MAX_HISTORY_MESSAGES = 20;
export const MAX_HISTORY_MESSAGE_CHARS = 2000;
export const MAX_USER_MESSAGE_CHARS = 4000;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** Last N valid turns, string content only, each truncated; roles other than user/assistant dropped. */
export function boundChatHistory(raw: unknown, maxMessages = MAX_HISTORY_MESSAGES, maxChars = MAX_HISTORY_MESSAGE_CHARS): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string' || !content.trim()) continue;
    turns.push({ role, content: content.slice(0, maxChars) });
  }
  return turns.slice(-maxMessages);
}

/** An app path like "/dashboard/settings" or null — never free text in the system prompt. */
export function safeAppPath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const p = raw.split('?')[0].split('#')[0];
  return /^\/[A-Za-z0-9/_-]{0,100}$/.test(p) ? p : null;
}
