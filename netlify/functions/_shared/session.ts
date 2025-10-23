/**
 * 📝 Session Management
 * 
 * Helpers for managing chat sessions in Supabase.
 * Sessions group messages into conversations.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Ensure a session exists, creating one if needed
 * @param sb - Supabase client (with service role)
 * @param userId - User ID
 * @param sessionId - Optional existing session ID
 * @param employeeSlug - Employee handling this session
 * @returns Session ID (existing or newly created)
 */
export async function ensureSession(
  sb: SupabaseClient,
  userId: string,
  sessionId?: string,
  employeeSlug: string = 'prime-boss'
): Promise<string> {
  // If session ID provided, verify it exists
  if (sessionId) {
    const { data, error } = await sb
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return sessionId;
    }

    // Session not found or error - fall through to create new one
    console.warn(`[Session] Session ${sessionId} not found, creating new one`);
  }

  // Create new session
  const { data, error } = await sb
    .from('chat_sessions')
    .insert({
      user_id: userId,
      employee_slug: employeeSlug,
      title: 'New Chat',
      context: {},
      message_count: 0,
      token_count: 0
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Session] Error creating session:', error);
    throw new Error('Failed to create chat session');
  }

  return data.id;
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
  maxTokens: number = 4000
) {
  const { data, error } = await sb
    .from('chat_messages')
    .select('role, content, tokens, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(50); // Get last 50 messages max

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
  const result = [];
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
      user_id: params.userId,
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








