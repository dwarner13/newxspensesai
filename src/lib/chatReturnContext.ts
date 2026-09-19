/**
 * Chat Return Context
 *
 * Deterministic mechanism for "Back to Prime" navigation after viewing
 * a transaction from an Action Receipt in chat.
 *
 * Primary: React Router navigation state (`location.state.chatReturn`).
 * Fallback: sessionStorage for refresh survival (TTL 5 minutes).
 *
 * Contains NO sensitive data — no userId, sessionId, threadId, or
 * transaction financial content.
 */

const STORAGE_KEY = 'chatReturnContext';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface ChatReturnContext {
  source: 'chat';
  timestamp: number;
}

/** Create a return context object. */
export function createChatReturnContext(): ChatReturnContext {
  return { source: 'chat', timestamp: Date.now() };
}

/** Write return context to sessionStorage (refresh fallback). */
export function saveChatReturnContext(ctx: ChatReturnContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch { /* quota or private browsing — non-fatal */ }
}

/** Read and validate return context from sessionStorage. Returns null if invalid/expired. */
export function loadChatReturnContext(): ChatReturnContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.source === 'chat' &&
      typeof parsed.timestamp === 'number' &&
      Number.isFinite(parsed.timestamp) &&
      Date.now() - parsed.timestamp < TTL_MS
    ) {
      return parsed as ChatReturnContext;
    }
    // Invalid or expired — clean up
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    // Malformed JSON or sessionStorage error — clean up
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    return null;
  }
}

/** Remove return context from sessionStorage (consume on use or on X close). */
export function clearChatReturnContext(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
}
