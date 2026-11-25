/**
 * Universal employee conversation history (owner GO 2026-11-25) — ONE hook for every
 * customer-facing employee panel that talks to /chat (Crystal, Goalie, Custodian, Byte,
 * Ledger, and future employees). Wraps the existing useUnifiedChatEngine; adds:
 *  - restore: this account's cached copy first, then the server copy of the employee's
 *    latest conversation (owner AND employee verified), so desktop and iPhone resume it;
 *  - history: the employee's own conversations (shared conversationStore);
 *  - New conversation: a fresh client-generated session id (the server creates it on the
 *    first message, as Prime's New chat does). Nothing is ever deleted;
 *  - an account-scoped cache (per user and employee).
 * Only ids that were just generated or verified as this user's conversation WITH THIS
 * EMPLOYEE are ever sent, so a panel can never continue another employee's conversation.
 * (The server also refuses to relabel one: Prime HQ 914468c.)
 * Personality, tools, document permissions and entitlements are untouched: the panel's
 * existing employeeSlug and options are passed through unchanged.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { useUnifiedChatEngine, type UnifiedChatEngineOptions } from '@/hooks/useUnifiedChatEngine';
import { useChatSessions } from '@/hooks/useChatSessions';
import type { ChatMessage } from '@/hooks/usePrimeChat';
import type { ConversationEmployeeSlug } from '@/shared/conversation-identity';
import {
  loadEmployeeSessions, verifyOwnedSession, restoreSessionMessages, readCachedConversation,
  writeCachedConversation, isConversationId, type RestoredMessage,
} from '@/lib/conversationStore';
import { cacheableMessages } from '@/lib/employeeChat';

function freshSessionId(): string {
  try { return globalThis.crypto.randomUUID(); } catch { /* fall through */ }
  // RFC4122-shaped fallback (v4 layout) for very old browsers.
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
}

const toChat = (rows: RestoredMessage[]): ChatMessage[] =>
  rows.map(r => ({ id: r.id, role: r.role, content: r.content, createdAt: r.createdAt, meta: r.meta } as ChatMessage));

export interface EmployeeChatOptions extends Omit<UnifiedChatEngineOptions, 'conversationId' | 'initialMessages'> {
  /** The slug the panel already sends (persona / routing unchanged). */
  employeeSlug: string;
}

export function useEmployeeChat(employee: ConversationEmployeeSlug, options: EmployeeChatOptions) {
  const { userId } = useAuth();
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const engine = useUnifiedChatEngine({ ...options, conversationId: sessionId, initialMessages });
  const { clearMessages, resetThread } = engine;

  const history = useChatSessions({ employee, limit: 40, autoLoad: false });

  // Switch the engine to another conversation: clear what is shown, then hand it the
  // restored messages (usePrimeChat applies initialMessages when it has none).
  const switchTo = useCallback((id: string, rows: ChatMessage[]) => {
    clearMessages();
    resetThread();
    setSessionId(id);
    setInitialMessages(rows);
  }, [clearMessages, resetThread]);
  // The restore below must not re-run (and cancel itself) if the engine's callbacks change.
  const switchToRef = useRef(switchTo);
  switchToRef.current = switchTo;

  // Restore once per signed-in user.
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || restoredFor.current === userId) return;
    restoredFor.current = userId;
    let cancelled = false;
    let cachedId: string | null = null;
    try {
      const cached = readCachedConversation(window.localStorage, userId, employee);
      if (cached?.sessionId) {
        cachedId = cached.sessionId;
        setSessionId(cached.sessionId);
        if (cached.messages.length > 0) setInitialMessages(toChat(cached.messages));
      }
    } catch { /* cache only */ }
    (async () => {
      const sb = getSupabase();
      let target: string | null = null;
      if (sb) {
        if (cachedId && (await verifyOwnedSession(sb, userId, cachedId, employee))) target = cachedId;
        if (!target) target = (await loadEmployeeSessions(sb, userId, employee, 1))[0]?.id ?? null;
      }
      if (cancelled) return;
      if (!target) {
        // Nothing to resume: start a fresh conversation (also replaces an unverifiable cached id).
        if (!cachedId || !isConversationId(cachedId) || sb) switchToRef.current(freshSessionId(), []);
        return;
      }
      const rows = await restoreSessionMessages(sb, userId, target);
      if (cancelled) return;
      if (rows) switchToRef.current(target, toChat(rows));
      else setSessionId(target); // keep what is on screen; continue the verified conversation
    })();
    return () => { cancelled = true; };
  }, [userId, employee]);

  // Account-scoped cache of what is on screen (fast first paint only).
  useEffect(() => {
    if (!userId || !sessionId) return;
    writeCachedConversation(window.localStorage, userId, employee, { sessionId, messages: cacheableMessages(engine.messages) });
  }, [engine.messages, sessionId, userId, employee]);

  const startNewConversation = useCallback(() => {
    switchTo(freshSessionId(), []);
  }, [switchTo]);

  const openConversation = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb || !userId) return false;
    if (!(await verifyOwnedSession(sb, userId, id, employee))) return false;
    const rows = await restoreSessionMessages(sb, userId, id);
    if (!rows) return false;
    switchTo(id, toChat(rows));
    return true;
  }, [userId, employee, switchTo]);

  const historyItems = useMemo(
    () => history.sessions.map(h => ({ id: h.id, title: h.title, lastActivity: h.last_message_at || h.created_at })),
    [history.sessions],
  );

  return {
    ...engine,
    sessionId,
    history: { items: historyItems, loading: history.isLoading, load: history.loadSessions },
    openConversation,
    startNewConversation,
  };
}
