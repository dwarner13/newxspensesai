/**
 * Memory - Save messages and summaries to Supabase
 */

import { supabaseAdmin } from '../supabase';

interface SaveMsgParams {
  role: 'user' | 'assistant' | 'system';
  agent?: string;
  convoId: string;
  content: string;
  userId?: string | null;
}

/**
 * Save message to Supabase
 * Table: chat_messages (id uuid, user_id text nullable, convo_id text, role text, content jsonb, created_at timestamptz)
 */
export async function saveMsg(params: SaveMsgParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: params.userId || null,
        convo_id: params.convoId,
        role: params.role,
        content: params.content, // Store as jsonb (PostgreSQL will handle conversion)
        created_at: new Date().toISOString()
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
  convoId: string;
  agent: string;
  summary: string;
  userId?: string | null;
}

/**
 * Save conversation summary to Supabase
 * Table: chat_convo_summaries (id uuid, user_id text, convo_id text, agent text, summary text, updated_at timestamptz)
 * Upsert on (convo_id, agent)
 */
export async function saveSummary(params: SaveSummaryParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_convo_summaries')
      .upsert({
        user_id: params.userId || null,
        convo_id: params.convoId,
        agent: params.agent,
        summary: params.summary,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'convo_id,agent' // Upsert on convo_id + agent combination
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

/**
 * Get vendor hint (category preference) for a merchant
 * Returns {category, weight} or null if not found
 */
export async function getVendorHint(merchant: string, userId?: string | null): Promise<{ category: string; weight: number } | null> {
  if (!merchant || !merchant.trim()) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('memory_facts')
      .select('value, weight')
      .eq('scope', 'vendor')
      .eq('key', merchant.trim())
      .eq('user_id', userId || null)
      .order('weight', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[memory] Failed to get vendor hint:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      category: data.value,
      weight: data.weight || 1
    };
  } catch (error) {
    console.error('[memory] Error getting vendor hint:', error);
    return null;
  }
}

/**
 * Save vendor hint (category preference) for a merchant
 */
export async function saveVendorHint(merchant: string, category: string, userId?: string | null): Promise<void> {
  if (!merchant || !merchant.trim() || !category || !category.trim()) {
    return;
  }

  try {
    const { error } = await supabaseAdmin
      .from('memory_facts')
      .upsert({
        user_id: userId || null,
        scope: 'vendor',
        key: merchant.trim(),
        value: category.trim(),
        weight: 1, // Default weight, can be incremented on reuse
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,scope,key'
      });

    if (error) {
      console.error('[memory] Failed to save vendor hint:', error);
      // Don't throw - memory saves are non-critical
    }
  } catch (error) {
    console.error('[memory] Error saving vendor hint:', error);
    // Don't throw - memory saves are non-critical
  }
}

