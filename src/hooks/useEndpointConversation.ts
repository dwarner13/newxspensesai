/**
 * Universal employee conversation history — the shared hook for employees that talk to
 * their OWN endpoint instead of /chat (Custodian today; Tag follows the same contract).
 * Endpoint contract (Prime HQ / Tag HQ):
 *   request  { message, sessionId?, clientMessageId, newConversation?, ... }  (no history)
 *   response { reply, sessionId, persisted, duplicate?, conflict?, ... }
 * The panel keeps its own fetch; this hook owns everything else, shared with every employee:
 * restore (account cache → latest owned session for THIS employee), history, New
 * conversation, per-account cache and reply outcomes. Only ids that came from the server or
 * were verified for this user AND this employee are ever sent. Nothing is deleted.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { useChatSessions } from '@/hooks/useChatSessions';
import type { ConversationEmployeeSlug } from '@/shared/conversation-identity';
import {
  loadEmployeeSessions, verifyOwnedSession, restoreSessionMessages, readCachedConversation,
  writeCachedConversation, type RestoredMessage,
} from '@/lib/conversationStore';
import { newClientMessageId, tagReplyOutcome, type TagReplyOutcome } from '@/lib/tagConversation';

export function useEndpointConversation(employee: ConversationEmployeeSlug) {
  const { userId } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;
  const newConversationRef = useRef(false);
  /** Messages to show after a restore or a switch (null = nothing to replace). */
  const [restored, setRestored] = useState<{ key: number; messages: RestoredMessage[] } | null>(null);
  const keyRef = useRef(0);
  const show = useCallback((messages: RestoredMessage[]) => { keyRef.current += 1; setRestored({ key: keyRef.current, messages }); }, []);

  const history = useChatSessions({ employee, limit: 40, autoLoad: false });

  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || restoredFor.current === userId) return;
    restoredFor.current = userId;
    let cancelled = false;
    let cachedId: string | null = null;
    try {
      const cached = readCachedConversation(window.localStorage, userId, employee);
      if (cached) {
        cachedId = cached.sessionId;
        if (cached.sessionId) setSessionId(cached.sessionId);
        if (cached.messages.length > 0) show(cached.messages);
      }
    } catch { /* cache only */ }
    (async () => {
      const sb = getSupabase();
      if (!sb) return;
      let target: string | null = null;
      if (cachedId && (await verifyOwnedSession(sb, userId, cachedId, employee))) target = cachedId;
      if (!target) target = (await loadEmployeeSessions(sb, userId, employee, 1))[0]?.id ?? null;
      if (cancelled || newConversationRef.current) return;
      if (!target) { if (cachedId) setSessionId(null); return; }
      const rows = await restoreSessionMessages(sb, userId, target);
      if (cancelled || newConversationRef.current) return;
      setSessionId(target);
      if (rows && rows.length > 0) show(rows);
    })();
    return () => { cancelled = true; };
  }, [userId, employee, show]);

  /** Fields to add to each request. A retry passes the SAME clientMessageId. */
  const requestFields = useCallback((retryClientMessageId?: string) => ({
    sessionId: sessionIdRef.current || undefined,
    clientMessageId: retryClientMessageId || newClientMessageId(),
    ...(newConversationRef.current && !sessionIdRef.current ? { newConversation: true as const } : {}),
  }), []);

  /** Read a reply: store the server's sessionId; duplicate / conflict are display-only. */
  const onReply = useCallback((data: unknown): TagReplyOutcome => {
    const outcome = tagReplyOutcome(data);
    if (outcome.sessionId) { setSessionId(outcome.sessionId); newConversationRef.current = false; }
    return outcome;
  }, []);

  const startNewConversation = useCallback(() => {
    newConversationRef.current = true;
    setSessionId(null);
    show([]);
    try { writeCachedConversation(window.localStorage, userId, employee, { sessionId: null, messages: [] }); } catch { /* cache only */ }
  }, [userId, employee, show]);

  const openConversation = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb || !userId) return false;
    if (!(await verifyOwnedSession(sb, userId, id, employee))) return false;
    const rows = await restoreSessionMessages(sb, userId, id);
    if (!rows) return false;
    newConversationRef.current = false;
    setSessionId(id);
    show(rows);
    return true;
  }, [userId, employee, show]);

  /** The panel calls this whenever its visible messages change (cache only). */
  const cache = useCallback((messages: RestoredMessage[]) => {
    if (!userId) return;
    writeCachedConversation(window.localStorage, userId, employee, { sessionId: sessionIdRef.current, messages });
  }, [userId, employee]);

  const historyItems = useMemo(
    () => history.sessions.map(h => ({ id: h.id, title: h.title, lastActivity: h.last_message_at || h.created_at })),
    [history.sessions],
  );

  return {
    sessionId,
    restored,
    requestFields,
    onReply,
    startNewConversation,
    openConversation,
    cache,
    history: { items: historyItems, loading: history.isLoading, load: history.loadSessions },
  };
}
