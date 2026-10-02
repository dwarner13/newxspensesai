/**
 * Ensure Thread Helper
 * 
 * Gets or creates a chat_threads row for a user + employee combination.
 * Returns thread_id for use in chat_messages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { admin } from './supabase.js';

/**
 * Ensure a thread exists for user + employee
 * 
 * @param sb - Supabase client (admin for backend)
 * @param userId - User ID (must be verified from auth)
 * @param employeeKey - Employee key (e.g., 'prime', 'tag', 'byte')
 * @param threadId - Optional thread ID to upsert (if provided, ensures that exact thread exists)
 * @param title - Optional thread title
 * @returns Thread ID
 */
export async function ensureThread(
  sb: SupabaseClient,
  userId: string,
  employeeKey: string,
  threadId?: string,
  title?: string,
  opts?: { resumeLatest?: boolean }
): Promise<string> {
  if (!userId || !employeeKey) {
    throw new Error('userId and employeeKey are required');
  }
  
  // If threadId is provided, use it ONLY when it belongs to this user.
  // A client-supplied threadId is a hint, not authorization: a thread owned by
  // another user is never upserted, re-owned, or returned. Otherwise fall
  // through to this user's own thread (find or create) below.
  if (threadId) {
    const { data: owned, error: ownedError } = await sb
      .from('chat_threads')
      .select('id')
      .eq('id', threadId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!ownedError && owned?.id) {
      if (title) {
        await sb.from('chat_threads').update({ title }).eq('id', threadId).eq('user_id', userId);
      }
      return owned.id as string;
    }
  }
  
  {  // chat_threads has UNIQUE(user_id, assistant_key): exactly ONE thread per user+assistant, so always resume it. Conversation freshness is handled at the session/message-load layer, NOT by creating threads.
    const { data: existing, error: fetchError } = await sb
      .from('chat_threads')
      .select('id')
      .eq('user_id', userId)
      .eq('employee_key', employeeKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id && !fetchError) {
      return existing.id as string;
    }
  }
  
  // Create new thread
  const { data: newThread, error: createError } = await sb
    .from('chat_threads')
    .insert({
      user_id: userId,
      employee_key: employeeKey,
      assistant_key: employeeKey, // CRITICAL: assistant_key must never be null
      ...(title ? { title } : {}),
    })
    .select('id')
    .single();
  
  if (createError || !newThread?.id) {
    throw new Error(`Failed to create thread: ${createError?.message || 'Unknown error'}`);
  }
  
  return newThread.id as string;
}

/**
 * Backfill thread_id for existing messages
 * 
 * Updates chat_messages that have thread_id IS NULL to use the provided threadId.
 * This is a one-time migration helper.
 * 
 * @param sb - Supabase client
 * @param userId - User ID
 * @param employeeKey - Employee key
 * @param threadId - Thread ID to assign
 */
export async function backfillThreadId(
  sb: SupabaseClient,
  userId: string,
  employeeKey: string,
  threadId: string
): Promise<number> {
  const { data, error } = await sb
    .from('chat_messages')
    .update({ thread_id: threadId })
    .eq('user_id', userId)
    .is('thread_id', null)
    .select('id');
  
  if (error) {
    console.warn('[backfillThreadId] Failed to backfill thread_id:', error);
    return 0;
  }
  
  return data?.length || 0;
}



