/**
 * Memory - Save messages and summaries to Supabase
 */

import { supabaseAdmin } from '../supabase';

interface SaveMsgParams {
  userId: string;
  convoId: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

/**
 * Save message to Supabase
 */
export async function saveMsg(params: SaveMsgParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: params.userId,
        session_id: params.convoId, // Using convoId as session_id
        role: params.role,
        content: params.content,
        employee_key: params.agent || (params.role === 'user' ? 'user' : 'prime')
      });
    
    if (error) {
      console.error('[memory] Failed to save message:', error);
      throw error;
    }
  } catch (error) {
    console.error('[memory] Error saving message:', error);
    throw error;
  }
}

interface SaveSummaryParams {
  userId: string;
  convoId: string;
  summary: string;
}

/**
 * Save conversation summary to Supabase
 */
export async function saveSummary(params: SaveSummaryParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_convo_summaries')
      .upsert({
        user_id: params.userId,
        convo_id: params.convoId,
        summary: params.summary,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('[memory] Failed to save summary:', error);
      throw error;
    }
  } catch (error) {
    console.error('[memory] Error saving summary:', error);
    throw error;
  }
}

