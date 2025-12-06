/**
 * 📝 Session Management
 * 
 * Helpers for managing chat sessions in Supabase.
 * Sessions group messages into conversations.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
 * Ensure a session exists, creating one if needed
 * @param sb - Supabase client (with service role)
 * @param userId - User ID (can be UUID or anonymous string)
 * @param sessionId - Optional existing session ID
 * @param employeeSlug - Employee handling this session (used only for new sessions)
 * @returns Object with sessionId and employee_slug (from session, or provided slug for new sessions)
 */
export async function ensureSession(
  sb: SupabaseClient,
  userId: string,
  sessionId?: string,
  employeeSlug: string = 'prime-boss'
): Promise<{ sessionId: string; employee_slug: string }> {
  // For anonymous users, use the original string to avoid foreign key constraints
  // For UUID users, use as-is (they should exist in users table)
  const dbUserId = shouldUseTextUserId(userId) ? userId : userId;
  
  // If session ID provided, verify it exists
  if (sessionId) {
    const { data, error } = await sb
      .from('chat_sessions')
      .select('id, employee_slug')
      .eq('id', sessionId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (!error && data) {
      // Session exists - return it WITH its employee_slug (this is the canonical value after handoff)
      // For shared sessions, we preserve the original employee_slug to avoid conflicts 
      // when multiple employees share the same sessionId
      const effectiveSlug = data.employee_slug || employeeSlug;
      console.log(`[Session] ✅ Found existing session ${sessionId} for user ${dbUserId} (employee: ${effectiveSlug})`);
      return { sessionId, employee_slug: effectiveSlug };
    }

    // Session not found - create new one WITH the provided sessionId
    if (error) {
      console.warn(`[Session] ⚠️ Session lookup error for ${sessionId}:`, error.message);
    } else {
      console.log(`[Session] 📝 Session ${sessionId} not found for user ${dbUserId}, creating new session with provided ID`);
    }
  }

  // Create new session (use provided sessionId if available, otherwise generate new)
  // Try with token_count first, fall back without it if column doesn't exist
  const newSessionId = sessionId || crypto.randomUUID();
  let insertData: any = {
    id: newSessionId, // Use provided sessionId or generated UUID
    user_id: dbUserId,
    employee_slug: employeeSlug,
    title: 'New Chat',
    context: {},
    message_count: 0,
  };

  let { data, error } = await sb
    .from('chat_sessions')
    .insert({
      ...insertData,
      token_count: 0,
    })
    .select('id')
    .single();

  // If token_count column doesn't exist, retry without it
  if (error && error.code === 'PGRST204' && error.message?.includes('token_count')) {
    console.warn('[Session] token_count column not found, creating session without it');
    const retryResult = await sb
      .from('chat_sessions')
      .insert(insertData)
      .select('id')
      .single();
    
    if (retryResult.error) {
      // If foreign key constraint error, try casting user_id to TEXT
      if (retryResult.error.code === '23503' && shouldUseTextUserId(userId)) {
        console.warn('[Session] Foreign key constraint error, user_id may need to be TEXT type');
        // If the column is UUID type but we're passing TEXT, we need to handle this differently
        // For now, return the sessionId we tried to use (don't generate new one)
        console.warn(`[Session] Using fallback session ID: ${newSessionId}`);
        return { sessionId: newSessionId, employee_slug: employeeSlug };
      }
      // If duplicate key error (session already exists), return the existing sessionId
      if (retryResult.error.code === '23505' && sessionId) {
        console.log(`[Session] Session ${sessionId} already exists (race condition), returning it`);
        // Try to fetch the existing session's employee_slug
        const { data: existingSession } = await sb
          .from('chat_sessions')
          .select('employee_slug')
          .eq('id', sessionId)
          .maybeSingle();
        return { sessionId, employee_slug: existingSession?.employee_slug || employeeSlug };
      }
      console.error('[Session] Error creating session:', retryResult.error);
      throw new Error('Failed to create chat session');
    }
    
    return retryResult.data!.id || newSessionId;
  }

  // Handle foreign key constraint error for anonymous users
  if (error && error.code === '23503' && shouldUseTextUserId(userId)) {
    console.warn('[Session] Foreign key constraint error for anonymous user, using fallback session');
    console.warn(`[Session] Using fallback session ID: ${newSessionId}`);
    return { sessionId: newSessionId, employee_slug: employeeSlug };
  }

  // Handle duplicate key error (session already exists - race condition)
  if (error && error.code === '23505' && sessionId) {
    console.log(`[Session] Session ${sessionId} already exists (race condition), returning it`);
    // Try to fetch the existing session's employee_slug
    const { data: existingSession } = await sb
      .from('chat_sessions')
      .select('employee_slug')
      .eq('id', sessionId)
      .maybeSingle();
    return { sessionId, employee_slug: existingSession?.employee_slug || employeeSlug };
  }

  if (error) {
    console.error('[Session] Error creating session:', error);
    throw new Error('Failed to create chat session');
  }

  if (!data) {
    // If no data returned but we have a sessionId, return it anyway
    if (sessionId) {
      console.warn(`[Session] ⚠️ No data returned from insert but sessionId provided, returning ${sessionId} (session may exist from race condition)`);
      // Try to fetch the existing session's employee_slug
      const { data: existingSession } = await sb
        .from('chat_sessions')
        .select('employee_slug')
        .eq('id', sessionId)
        .maybeSingle();
      return { sessionId, employee_slug: existingSession?.employee_slug || employeeSlug };
    }
    throw new Error('Failed to create chat session: no data returned');
  }

  const returnedSessionId = data.id || newSessionId;
  console.log(`[Session] ✅ Created/found session ${returnedSessionId} for user ${dbUserId}, employee ${employeeSlug}`);
  return { sessionId: returnedSessionId, employee_slug: employeeSlug };
}

/**
 * Get recent messages for a session with token budget management
 * @param sb - Supabase client
 * @param sessionId - Session ID
 * @param maxTokens - Maximum tokens to include (default: 4000)
 * @returns Array of recent messages that fit within token budget
 */
export async function getRecentMessages(
  sb: SupabaseClient,
  sessionId: string,
  maxTokens: number = 4000,
  maxMessages: number = 50  // Byte v2: Allow caller to specify max messages (Byte gets 100)
) {
  const { data, error } = await sb
    .from('chat_messages')
    .select('role, content, tokens, created_at')
    .eq('session_id', sessionId)
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













