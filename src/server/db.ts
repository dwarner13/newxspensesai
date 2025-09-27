import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Result, Ok, Err, wrapAsync } from '../types/result';
import { getSupabaseUrl, getSupabaseServiceRole } from '../env';
import crypto from 'crypto';

let supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseAdmin) {
    const url = getSupabaseUrl();
    const serviceRole = getSupabaseServiceRole();
    
    if (!url || !serviceRole) {
      throw new Error('Supabase configuration missing');
    }
    
    supabaseAdmin = createClient(url, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  
  return supabaseAdmin;
}

export interface SaveMessageParams {
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  redactedContent?: string;
  toolCalls?: any;
  metadata?: Record<string, any>;
}

export async function saveMessage(params: SaveMessageParams): Promise<Result<string>> {
  const client = getSupabaseServerClient();
  
  const result = await wrapAsync(async () => {
    const { data, error } = await client
      .from('messages')
      .insert({
        user_id: params.userId,
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        redacted_content: params.redactedContent,
        tool_calls: params.toolCalls,
        metadata: params.metadata || {},
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  });
  
  return result;
}

export interface LogAuditParams {
  userId: string;
  agentName: string;
  toolId: string;
  inputsHash?: string;
  outcome: string;
  durationMs: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export async function logAudit(params: LogAuditParams): Promise<Result<void>> {
  const client = getSupabaseServerClient();
  
  const result = await wrapAsync(async () => {
    const { error } = await client
      .from('audit_logs')
      .insert({
        user_id: params.userId,
        agent_name: params.agentName,
        tool_id: params.toolId,
        inputs_hash: params.inputsHash || crypto.randomBytes(16).toString('hex'),
        outcome: params.outcome,
        duration_ms: params.durationMs,
        error_message: params.errorMessage,
        metadata: params.metadata || {},
      });
    
    if (error) throw error;
  });
  
  return result;
}

export async function ensureConversation(
  userId: string,
  conversationId?: string
): Promise<Result<string>> {
  const client = getSupabaseServerClient();
  
  if (conversationId) {
    // Verify conversation exists and belongs to user
    const result = await wrapAsync(async () => {
      const { data, error } = await client
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        throw new Error('Conversation not found or access denied');
      }
      
      return data.id;
    });
    
    return result;
  }
  
  // Create new conversation
  const result = await wrapAsync(async () => {
    const { data, error } = await client
      .from('conversations')
      .insert({
        user_id: userId,
        title: 'New Conversation',
        metadata: { created_via: 'prime_kernel' },
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  });
  
  return result;
}

export async function deleteUserData(userId: string): Promise<Result<void>> {
  const client = getSupabaseServerClient();
  
  return wrapAsync(async () => {
    // Start transaction-like operation
    const tables = [
      'messages',
      'conversations', 
      'transactions',
      'rules',
      'jobs',
      'notifications',
      'usage_logs',
      'audit_logs',
    ];
    
    // Delete from each table
    for (const table of tables) {
      const { error } = await client
        .from(table)
        .delete()
        .eq('user_id', userId);
      
      if (error && error.code !== 'PGRST116') { // Ignore if no rows
        console.error(`Failed to delete from ${table}:`, error);
      }
    }
    
    // Delete from storage
    const { data: files } = await client
      .storage
      .from('uploads')
      .list(`${userId}/`);
    
    if (files && files.length > 0) {
      const filePaths = files.map(f => `${userId}/${f.name}`);
      await client.storage.from('uploads').remove(filePaths);
    }
    
    // Finally delete profile
    const { error: profileError } = await client
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      throw new Error(`Failed to delete profile: ${profileError.message}`);
    }
    
    // Log deletion
    await logAudit({
      userId,
      agentName: 'system',
      toolId: 'delete_user_data',
      outcome: 'success',
      durationMs: 0,
      metadata: { 
        deleted_at: new Date().toISOString(),
        tables_cleared: tables.length,
      },
    });
  });
}

export async function exportUserData(userId: string): Promise<Result<string>> {
  const client = getSupabaseServerClient();
  
  return wrapAsync(async () => {
    // Gather all user data
    const [
      conversations,
      messages,
      transactions,
      rules,
      jobs,
      profile,
    ] = await Promise.all([
      client.from('conversations').select('*').eq('user_id', userId),
      client.from('messages').select('*').eq('user_id', userId),
      client.from('transactions').select('*').eq('user_id', userId),
      client.from('rules').select('*').eq('user_id', userId),
      client.from('jobs').select('*').eq('user_id', userId),
      client.from('profiles').select('*').eq('id', userId).single(),
    ]);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      data: {
        profile: profile.data,
        conversations: conversations.data || [],
        messages: messages.data || [],
        transactions: transactions.data || [],
        rules: rules.data || [],
        jobs: jobs.data || [],
      },
      counts: {
        conversations: conversations.data?.length || 0,
        messages: messages.data?.length || 0,
        transactions: transactions.data?.length || 0,
        rules: rules.data?.length || 0,
        jobs: jobs.data?.length || 0,
      },
    };
    
    // Save to storage
    const filename = `export_${Date.now()}.json`;
    const path = `exports/${userId}/${filename}`;
    
    const { error: uploadError } = await client
      .storage
      .from('exports')
      .upload(path, JSON.stringify(exportData, null, 2), {
        contentType: 'application/json',
        cacheControl: '3600',
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload export: ${uploadError.message}`);
    }
    
    // Generate signed URL (24 hour expiry)
    const { data: urlData, error: urlError } = await client
      .storage
      .from('exports')
      .createSignedUrl(path, 86400);
    
    if (urlError || !urlData) {
      throw new Error('Failed to generate download URL');
    }
    
    return urlData.signedUrl;
  });
}

export async function saveCheckpoint(
  conversationId: string,
  content: string
): Promise<void> {
  // Save to Redis or in-memory cache for recovery
  // This is a placeholder - implement based on your infrastructure
  checkpointCache.set(conversationId, {
    content,
    timestamp: Date.now(),
  });
}

export async function getCheckpoint(
  conversationId: string
): Promise<string | null> {
  const checkpoint = checkpointCache.get(conversationId);
  if (checkpoint && Date.now() - checkpoint.timestamp < 300000) { // 5 min TTL
    return checkpoint.content;
  }
  return null;
}

// Simple in-memory checkpoint cache
const checkpointCache = new Map<string, { content: string; timestamp: number }>();

// Clean up old checkpoints
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of checkpointCache.entries()) {
    if (now - value.timestamp > 300000) {
      checkpointCache.delete(key);
    }
  }
}, 60000);

export async function getRecentMessages({
  conversationId,
  limit = 25,
}: {
  conversationId: string;
  limit?: number;
}): Promise<Result<any[]>> {
  const client = getSupabaseServerClient();
  
  return wrapAsync(async () => {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  });
}

export async function saveToolCall({
  conversationId,
  toolId,
  input,
  output,
  durationMs,
}: {
  conversationId: string;
  toolId: string;
  input: any;
  output: any;
  durationMs: number;
}): Promise<Result<void>> {
  const client = getSupabaseServerClient();
  
  return wrapAsync(async () => {
    const { error } = await client
      .from('tool_calls')
      .insert({
        conversation_id: conversationId,
        tool_id: toolId,
        input,
        output,
        duration_ms: durationMs,
        created_at: new Date().toISOString(),
      });
    
    if (error) throw error;
  });
}

export async function getUserProfile(userId: string): Promise<Result<any>> {
  const client = getSupabaseServerClient();
  
  const result = await wrapAsync(async () => {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create default
      const { data: newProfile, error: createError } = await client
        .from('profiles')
        .insert({
          id: userId,
          plan_id: 'free',
          features: [],
          settings: {},
        })
        .select()
        .single();
      
      if (createError) throw createError;
      return newProfile;
    }
    
    if (error) throw error;
    return data;
  });
  
  return result;
}
