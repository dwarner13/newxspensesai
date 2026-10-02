/**
 * 📝 Session Management
 * 
 * Helpers for managing chat sessions in Supabase.
 * Sessions group messages into conversations.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Check if a string is a valid UUID format
 */
function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  // UUID format: 8-4-4-4-12 hex digits with hyphens
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

/**
 * Check if user_id column expects UUID or TEXT
 * For anonymous users, we'll use TEXT to avoid foreign key constraints
 */
function shouldUseTextUserId(userId: string): boolean {
  // If it's an anonymous user ID, use TEXT (no foreign key constraint)
  // If it's a UUID format, assume it needs to match users table
  return userId.startsWith('anon-');
}

/**
 * Get a safe database user ID for UUID columns
 * Returns the userId if it's a valid UUID, otherwise returns a demo user UUID
 */
function getDbUserIdForUuidColumn(userId: string): string {
  if (isValidUuid(userId)) {
    return userId;
  }
  // Return a demo user UUID for anonymous users to avoid UUID type errors
  return '00000000-0000-4000-8000-000000000001';
}

/**
 * Ensure a session exists, creating one if needed
 *
 * SECURITY INVARIANT: the returned sessionId is ALWAYS a chat_sessions row owned
 * by this user (id = sessionId AND user_id = user), or a freshly created one.
 * A caller-supplied sessionId is a hint, not authorization: if it belongs to
 * another user it is never returned, read, or updated — a fresh session is
 * minted instead. A duplicate-key insert error is NOT treated as "our race"
 * unless ownership is re-proven by id + user_id.
 *
 * @param sb - Supabase client (with service role)
 * @param userId - User ID (can be UUID or anonymous string)
 * @param sessionId - Optional existing session ID (untrusted client hint)
 * @param employeeSlug - Employee handling this session (used only for new sessions)
 * @returns Object with sessionId and employee_slug (from session, or provided slug for new sessions)
 */
export async function ensureSession(
  sb: SupabaseClient,
  userId: string,
  sessionId?: string,
  employeeSlug: string = 'prime-boss'
): Promise<{ sessionId: string; employee_slug: string }> {
  // For anonymous users, check if user_id column is UUID type
  // If it's UUID type, use a demo UUID to avoid type errors
  // If it's TEXT type, use the original string
  const dbUserId = shouldUseTextUserId(userId)
    ? (isValidUuid(userId) ? userId : getDbUserIdForUuidColumn(userId))
    : userId;

  // Only a well-formed UUID can name a session; anything else is ignored.
  const requestedId = isValidUuid(sessionId) ? sessionId! : undefined;
  const allowAnonFallback = shouldUseTextUserId(userId);

  if (requestedId) {
    const owned = await findOwnedSession(sb, requestedId, dbUserId);
    if (owned) {
      // Session exists - return it WITH its employee_slug (this is the canonical value after handoff)
      const effectiveSlug = owned.employee_slug || employeeSlug;
      console.log(`[Session] ✅ Found existing session ${requestedId} for user ${dbUserId} (employee: ${effectiveSlug})`);
      return { sessionId: requestedId, employee_slug: effectiveSlug };
    }

    // Not owned by this user. Try to create it with the requested ID (supports
    // client-generated New Chat IDs). If the ID already exists, ownership decides.
    const created = await insertSession(sb, requestedId, dbUserId, employeeSlug, allowAnonFallback);
    if (created === 'created') {
      console.log(`[Session] 📝 Created session ${requestedId} for user ${dbUserId}`);
      return { sessionId: requestedId, employee_slug: employeeSlug };
    }
    if (created === 'duplicate') {
      const raced = await findOwnedSession(sb, requestedId, dbUserId);
      if (raced) {
        console.log(`[Session] Session ${requestedId} already exists for this user (race condition), returning it`);
        return { sessionId: requestedId, employee_slug: raced.employee_slug || employeeSlug };
      }
      console.warn(`[Session] ⚠️ Requested session ID is not owned by user ${dbUserId} — minting a fresh session`);
    }
    // 'failed', anonymous fallback, or foreign duplicate: fall through to a fresh server-generated ID
  }

  const freshId = crypto.randomUUID();
  const created = await insertSession(sb, freshId, dbUserId, employeeSlug, allowAnonFallback);
  if (created === 'created' || created === 'anon_fallback') {
    console.log(`[Session] ✅ Created session ${freshId} for user ${dbUserId}, employee ${employeeSlug}`);
    return { sessionId: freshId, employee_slug: employeeSlug };
  }
  throw new Error('Failed to create chat session');
}

/**
 * Look up a session by id AND owner. Never returns another user's session.
 */
async function findOwnedSession(
  sb: SupabaseClient,
  sessionId: string,
  dbUserId: string
): Promise<{ employee_slug: string | null } | null> {
  const { data, error } = await sb
    .from('chat_sessions')
    .select('id, employee_slug')
    .eq('id', sessionId)
    .eq('user_id', dbUserId)
    .maybeSingle();
  if (error) {
    console.warn(`[Session] ⚠️ Session lookup error for ${sessionId}:`, error.message);
    return null;
  }
  return data ? { employee_slug: data.employee_slug ?? null } : null;
}

/**
 * Insert a session row owned by dbUserId.
 * 'duplicate' means the ID exists — the caller must re-prove ownership.
 */
async function insertSession(
  sb: SupabaseClient,
  id: string,
  dbUserId: string,
  employeeSlug: string,
  allowAnonFallback: boolean
): Promise<'created' | 'duplicate' | 'anon_fallback' | 'failed'> {
  const insertData: Record<string, unknown> = {
    id,
    user_id: dbUserId,
    employee_slug: employeeSlug,
    title: 'New Chat',
    context: {},
    message_count: 0,
  };

  // Try with token_count first, fall back without it if column doesn't exist
  let { error } = await sb
    .from('chat_sessions')
    .insert({ ...insertData, token_count: 0 })
    .select('id')
    .single();

  if (error && error.code === 'PGRST204' && error.message?.includes('token_count')) {
    console.warn('[Session] token_count column not found, creating session without it');
    ({ error } = await sb
      .from('chat_sessions')
      .insert(insertData)
      .select('id')
      .single());
  }

  if (!error) return 'created';
  if (error.code === '23505') return 'duplicate';
  // Handle foreign key constraint error for anonymous users
  if (error.code === '23503' && allowAnonFallback) {
    console.warn(`[Session] Foreign key constraint error for anonymous user, using fallback session ID: ${id}`);
    return 'anon_fallback';
  }
  console.error('[Session] Error creating session:', error);
  return 'failed';
}

/**
 * Get recent messages for a session with token budget management
 * @param sb - Supabase client
 * @param sessionId - Session ID
 * @param userId - Owner of the session; messages are read only for this user
 * @param maxTokens - Maximum tokens to include (default: 4000)
 * @returns Array of recent messages that fit within token budget
 */
export async function getRecentMessages(
  sb: SupabaseClient,
  sessionId: string,
  userId: string,
  maxTokens: number = 4000,
  maxMessages: number = 50  // Byte v2: Allow caller to specify max messages (Byte gets 100)
) {
  const { data, error } = await sb
    .from('chat_messages')
    .select('role, content, tokens, created_at')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(maxMessages); // Byte v2: Configurable message limit (Byte gets 100, others get 50)

  if (error) {
    console.error('[Session] Error fetching messages:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Reverse to get chronological order
  const messages = data.reverse();

  // Apply token budget (simple estimation if no token count)
  const result: Array<{ role: string; content: string }> = [];
  let tokenSum = 0;

  for (const msg of messages) {
    const msgTokens = msg.tokens || estimateTokens(msg.content);
    
    if (tokenSum + msgTokens > maxTokens) {
      break; // Stop adding messages
    }

    result.push({
      role: msg.role,
      content: msg.content
    });

    tokenSum += msgTokens;
  }

  return result;
}

/**
 * Simple token estimation (4 chars ≈ 1 token for English)
 * @param text - Text to estimate
 * @returns Estimated token count
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Save a chat message to the database
 * @param sb - Supabase client
 * @param params - Message parameters
 * @returns Message ID
 */
export async function saveChatMessage(
  sb: SupabaseClient,
  params: {
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    redactedContent?: string;
    tokens?: number;
    metadata?: Record<string, any>;
  }
): Promise<string> {
  const messageId = crypto.randomUUID();
  
  const { error } = await sb
    .from('chat_messages')
    .insert({
      id: messageId,
      session_id: params.sessionId,
      user_id: shouldUseTextUserId(params.userId) ? params.userId : params.userId,
      role: params.role,
      content: params.content,
      redacted_content: params.redactedContent || params.content,
      tokens: params.tokens || estimateTokens(params.content),
      metadata: params.metadata || {}
    });

  if (error) {
    console.error('[Session] Error saving message:', error);
    throw new Error('Failed to save chat message');
  }

  return messageId;
}

/**
 * Update session summary
 * @param sb - Supabase client
 * @param sessionId - Session ID
 * @param summary - Summary text
 * @param keyFacts - Optional key facts array
 */
export async function updateSessionSummary(
  sb: SupabaseClient,
  sessionId: string,
  summary: string,
  keyFacts: string[] = []
) {
  const { error } = await sb
    .from('chat_session_summaries')
    .upsert({
      session_id: sessionId,
      summary,
      key_facts: keyFacts,
      token_count: estimateTokens(summary),
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('[Session] Error updating summary:', error);
    // Don't throw - summary update is non-critical
  }
}

/**
 * Get session summary if it exists
 * @param sb - Supabase client
 * @param sessionId - Session ID
 * @returns Summary text or null
 */
export async function getSessionSummary(
  sb: SupabaseClient,
  sessionId: string
): Promise<string | null> {
  const { data, error } = await sb
    .from('chat_session_summaries')
    .select('summary')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.summary;
}













