/**
 * ⚠️ DEPRECATED: Legacy Memory Manager Class
 * 
 * Phase 2.1: Consolidated November 20, 2025
 * 
 * This file is deprecated. Use `netlify/functions/_shared/memory.ts` instead.
 * 
 * CANONICAL API: `netlify/functions/_shared/memory.ts`
 * 
 * Migration Guide:
 * - Replace `MemoryManager` class with unified API functions:
 *   - `getMemory()` - Unified retrieval
 *   - `queueMemoryExtraction()` - Async extraction
 *   - `recall()`, `upsertFact()` - Core functions
 * 
 * This file will be removed in a future cleanup.
 * 
 * ---
 * 
 * Centralized Chat Runtime - Memory Management
 * =============================================
 * Handles sessions, messages, facts, and embeddings
 * 
 * @module chat_runtime/memory
 * @deprecated Use netlify/functions/_shared/memory.ts instead
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ChatSession,
  ChatMessage,
  ChatSessionSummary,
  UserMemoryFact,
  MemoryEmbedding,
  RetrievedChunk,
  RetrievalOptions,
  MemoryScope,
} from './types';

// ============================================================================
// Memory Manager Class
// ============================================================================

export class MemoryManager {
  public supabase: SupabaseClient;  // Exposed for advanced queries
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  // ==========================================================================
  // SESSIONS
  // ==========================================================================
  
  /**
   * Get or create a chat session
   */
  async getOrCreateSession(
    userId: string,
    employeeSlug: string,
    title?: string
  ): Promise<ChatSession> {
    // Try to get the most recent session for this user+employee
    const { data: existing, error: fetchError } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('employee_slug', employeeSlug)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();
    
    if (existing && !fetchError) {
      return existing as ChatSession;
    }
    
    // Create new session
    const { data: newSession, error: createError } = await this.supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        employee_slug: employeeSlug,
        title: title || `Chat with ${employeeSlug}`,
        context: {},
      })
      .select()
      .single();
    
    if (createError) {
      throw new Error(`Failed to create session: ${createError.message}`);
    }
    
    return newSession as ChatSession;
  }
  
  /**
   * Get a specific session
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get session: ${error.message}`);
    }
    
    return data as ChatSession;
  }
  
  /**
   * List user's recent sessions
   */
  async listSessions(
    userId: string,
    limit: number = 20
  ): Promise<ChatSession[]> {
    const { data, error } = await this.supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }
    
    return (data as ChatSession[]) || [];
  }
  
  /**
   * Update session metadata
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'title' | 'context'>>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', sessionId);
    
    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }
  
  // ==========================================================================
  // MESSAGES
  // ==========================================================================
  
  /**
   * Save a message to the database
   */
  async saveMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<ChatMessage> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save message: ${error.message}`);
    }
    
    return data as ChatMessage;
  }
  
  /**
   * Get recent messages from a session
   */
  async getRecentMessages(
    sessionId: string,
    limit: number = 10
  ): Promise<ChatMessage[]> {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }
    
    // Return in chronological order (oldest first)
    return ((data as ChatMessage[]) || []).reverse();
  }
  
  /**
   * Get message count for a session
   */
  async getMessageCount(sessionId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    
    if (error) {
      throw new Error(`Failed to count messages: ${error.message}`);
    }
    
    return count || 0;
  }
  
  /**
   * Delete old messages (keep last N)
   */
  async trimMessages(sessionId: string, keepLast: number = 20): Promise<number> {
    // Get IDs of messages to keep
    const { data: toKeep, error: fetchError } = await this.supabase
      .from('chat_messages')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(keepLast);
    
    if (fetchError) {
      throw new Error(`Failed to fetch messages: ${fetchError.message}`);
    }
    
    const keepIds = (toKeep || []).map(m => m.id);
    
    if (keepIds.length === 0) return 0;
    
    // Delete messages not in the keep list
    const { error: deleteError, count } = await this.supabase
      .from('chat_messages')
      .delete({ count: 'exact' })
      .eq('session_id', sessionId)
      .not('id', 'in', `(${keepIds.join(',')})`);
    
    if (deleteError) {
      throw new Error(`Failed to trim messages: ${deleteError.message}`);
    }
    
    return count || 0;
  }
  
  // ==========================================================================
  // SUMMARIES
  // ==========================================================================
  
  /**
   * Get session summary
   */
  async getSummary(sessionId: string): Promise<ChatSessionSummary | null> {
    const { data, error } = await this.supabase
      .from('chat_session_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to get summary: ${error.message}`);
    }
    
    return data as ChatSessionSummary;
  }
  
  /**
   * Save or update session summary
   */
  async saveSummary(summary: Omit<ChatSessionSummary, 'created_at' | 'updated_at'>): Promise<void> {
    const { error } = await this.supabase
      .from('chat_session_summaries')
      .upsert(summary, { onConflict: 'session_id' });
    
    if (error) {
      throw new Error(`Failed to save summary: ${error.message}`);
    }
  }
  
  // ==========================================================================
  // FACTS
  // ==========================================================================
  
  /**
   * Get pinned facts for a user
   */
  async getPinnedFacts(
    userId: string,
    scope?: string
  ): Promise<UserMemoryFact[]> {
    let query = this.supabase
      .from('user_memory_facts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_pinned', true);
    
    if (scope) {
      query = query.eq('scope', scope);
    }
    
    const { data, error } = await query.order('confidence', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to get pinned facts: ${error.message}`);
    }
    
    return (data as UserMemoryFact[]) || [];
  }
  
  /**
   * Save a new fact
   */
  async saveFact(fact: Omit<UserMemoryFact, 'id' | 'created_at' | 'updated_at'>): Promise<UserMemoryFact> {
    const { data, error } = await this.supabase
      .from('user_memory_facts')
      .insert(fact)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to save fact: ${error.message}`);
    }
    
    return data as UserMemoryFact;
  }
  
  /**
   * Search facts by text
   */
  async searchFacts(
    userId: string,
    query: string,
    scope?: string,
    limit: number = 5
  ): Promise<UserMemoryFact[]> {
    let dbQuery = this.supabase
      .from('user_memory_facts')
      .select('*')
      .eq('user_id', userId)
      .textSearch('fact', query, { type: 'websearch' });
    
    if (scope) {
      dbQuery = dbQuery.eq('scope', scope);
    }
    
    const { data, error } = await dbQuery
      .order('confidence', { ascending: false })
      .limit(limit);
    
    if (error) {
      throw new Error(`Failed to search facts: ${error.message}`);
    }
    
    return (data as UserMemoryFact[]) || [];
  }
  
  // ==========================================================================
  // EMBEDDINGS & RAG
  // ==========================================================================
  
  /**
   * Save embeddings for chunks
   */
  async saveEmbeddings(
    embeddings: Omit<MemoryEmbedding, 'id' | 'created_at'>[]
  ): Promise<void> {
    if (embeddings.length === 0) return;
    
    // Convert embedding arrays to proper format
    const records = embeddings.map(e => ({
      ...e,
      embedding: JSON.stringify(e.embedding),
    }));
    
    const { error } = await this.supabase
      .from('memory_embeddings')
      .insert(records);
    
    if (error) {
      throw new Error(`Failed to save embeddings: ${error.message}`);
    }
  }
  
  /**
   * Vector similarity search
   */
  async searchEmbeddings(
    userId: string,
    queryEmbedding: number[],
    options: RetrievalOptions = {}
  ): Promise<RetrievedChunk[]> {
    const {
      topK = 5,
      minSimilarity = 0.7,
      ownerScope,
    } = options;
    
    // Build RPC call for vector search
    const { data, error } = await this.supabase.rpc('search_memory_embeddings', {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_owner_scope: Array.isArray(ownerScope) ? ownerScope[0] : ownerScope,
      p_top_k: topK,
      p_min_similarity: minSimilarity,
    });
    
    if (error) {
      throw new Error(`Failed to search embeddings: ${error.message}`);
    }
    
    return (data || []).map((row: any) => ({
      id: row.id,
      owner_scope: row.owner_scope,
      source_id: row.source_id,
      chunk: row.chunk,
      similarity: row.similarity,
      metadata: row.metadata,
    }));
  }
  
  /**
   * Delete embeddings by source
   */
  async deleteEmbeddings(
    userId: string,
    sourceId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('memory_embeddings')
      .delete()
      .eq('user_id', userId)
      .eq('source_id', sourceId);
    
    if (error) {
      throw new Error(`Failed to delete embeddings: ${error.message}`);
    }
  }
  
  // ==========================================================================
  // UTILITIES
  // ==========================================================================
  
  /**
   * Get user's total token usage
   */
  async getTotalTokenUsage(userId: string): Promise<{
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  }> {
    const { data, error } = await this.supabase
      .from('chat_usage_log')
      .select('prompt_tokens, completion_tokens, total_tokens')
      .eq('user_id', userId);
    
    if (error) {
      throw new Error(`Failed to get token usage: ${error.message}`);
    }
    
    const totals = (data || []).reduce(
      (acc, row) => ({
        prompt_tokens: acc.prompt_tokens + (row.prompt_tokens || 0),
        completion_tokens: acc.completion_tokens + (row.completion_tokens || 0),
        total_tokens: acc.total_tokens + (row.total_tokens || 0),
      }),
      { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    );
    
    return totals;
  }
  
  /**
   * Clean up expired conversation locks
   */
  async cleanupExpiredLocks(): Promise<number> {
    const { error, count } = await this.supabase.rpc('cleanup_expired_locks');
    
    if (error) {
      throw new Error(`Failed to cleanup locks: ${error.message}`);
    }
    
    return count || 0;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let memoryManagerInstance: MemoryManager | null = null;

export function getMemoryManager(
  supabaseUrl?: string,
  supabaseKey?: string
): MemoryManager {
  if (!memoryManagerInstance) {
    const url = supabaseUrl || process.env.SUPABASE_URL;
    const key = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }
    
    memoryManagerInstance = new MemoryManager(url, key);
  }
  
  return memoryManagerInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate token count (rough estimate)
 * For accurate counting, use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Format messages for display
 */
export function formatMessagesForContext(
  messages: ChatMessage[],
  includeSystem: boolean = false
): Array<{ role: string; content: string }> {
  return messages
    .filter(m => includeSystem || m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: m.content,
    }));
}

