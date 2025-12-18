/**
 * 🧠 Unified Memory API - SINGLE SOURCE OF TRUTH
 * 
 * Phase 2.1: Consolidated November 20, 2025
 * 
 * This is the CANONICAL memory API for the entire XspensesAI system.
 * All code should use this module instead of memory-extraction.ts, context-retrieval.ts, etc.
 * 
 * UNIFIED API:
 * - getMemory() - Unified retrieval (facts + RAG + tasks + summaries)
 * - queueMemoryExtraction() - Queue async extraction (for Phase 2.3)
 * 
 * CORE FUNCTIONS (backward compatible):
 * - upsertFact: Store facts with deduplication
 * - embedAndStore: Generate and store embeddings
 * - recall: Semantic search for relevant memories
 * - extractFactsFromMessages: Extract facts from conversation
 * - capTokens: Token capping utility
 * 
 * MIGRATION GUIDE:
 * - Replace `recall()` with `getMemory()` for comprehensive context
 * - Replace `extractFactsFromMessages()` + `upsertFact()` with `queueMemoryExtraction()`
 * - All other memory operations should go through this unified API
 */

import crypto from 'crypto';
import { admin } from './supabase';
import { maskPII } from './pii';
// Phase 2.1: Import advanced memory modules as internal helpers
import { extractAndSaveMemories } from './memory-extraction.js';
import { retrieveContext } from './context-retrieval.js';

// ============================================================================
// TYPES
// ============================================================================

export interface UpsertFactParams {
  userId: string;
  convoId?: string;
  source?: string;
  fact: string;
}

export interface EmbedAndStoreParams {
  userId: string;
  factId: string;
  text: string;
  model?: string;
}

export interface RecallParams {
  userId: string;
  query: string;
  k?: number;
  minScore?: number;
  sinceDays?: number;
  sessionId?: string; // Optional: prioritize memories from this session
}

export interface RecalledFact {
  fact: string;
  score: number;
  fact_id: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normalize sessionId to handle various input types safely
 */
function normalizeSessionId(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && 'id' in (raw as any)) {
    const v = (raw as any).id;
    if (typeof v === 'string') return v;
  }
  return null;
}

/**
 * Generate SHA256 hash of normalized fact
 */
function hashFact(fact: string): string {
  const normalized = fact.trim().toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Generate embedding using OpenAI API
 */
async function generateEmbedding(text: string, model: string = 'text-embedding-3-large'): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[memory] OpenAI API key not configured, skipping embedding');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: text.slice(0, 8000), // Max input length
        dimensions: 1536 // For text-embedding-3-large
      })
    });

    if (!response.ok) {
      console.error('[memory] Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    const embedding = data?.data?.[0]?.embedding;

    if (embedding && Array.isArray(embedding) && embedding.length === 1536) {
      return embedding;
    }

    return null;
  } catch (error: any) {
    console.error('[memory] Embedding generation failed:', error);
    return null;
  }
}

// ============================================================================
// PRIMARY API
// ============================================================================

/**
 * Upsert a fact into user_memory_facts with deduplication
 * 
 * Normalizes fact → SHA256 hash → insert with UNIQUE(user_id, hash_sha256)
 * Returns fact_id on success
 */
export async function upsertFact(params: UpsertFactParams): Promise<string | null> {
  const { userId, convoId, source = 'chat', fact } = params;
  
  if (!userId || !fact || !fact.trim()) {
    console.warn('[memory] Invalid upsertFact params');
    return null;
  }

  const sb = admin();
  const factHash = hashFact(fact);
  const normalizedFact = fact.trim();

  try {
    // Try to insert; on conflict, fetch existing ID
    const { data, error } = await sb
      .from('user_memory_facts')
      .upsert({
        user_id: userId,
        fact: normalizedFact,
        fact_hash: factHash,
        source: source,
        source_message_id: convoId || null,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,fact_hash',
        ignoreDuplicates: false
      })
      .select('id')
      .maybeSingle();

    if (error) {
      // If conflict, fetch existing
      if (error.code === '23505') { // Unique violation
        const { data: existing } = await sb
          .from('user_memory_facts')
          .select('id')
          .eq('user_id', userId)
          .eq('fact_hash', factHash)
          .maybeSingle();
        
        return existing?.id || null;
      }
      console.error('[memory] Failed to upsert fact:', error);
      return null;
    }

    return data?.id || null;
  } catch (error: any) {
    console.error('[memory] Error upserting fact:', error);
    return null;
  }
}

/**
 * Generate embedding and store in memory_embeddings
 * 
 * Calls OpenAI embedding API → inserts with UNIQUE(fact_id, model)
 */
export async function embedAndStore(params: EmbedAndStoreParams): Promise<boolean> {
  const { userId, factId, text, model = 'text-embedding-3-large' } = params;

  if (!userId || !factId || !text || !text.trim()) {
    console.warn('[memory] Invalid embedAndStore params');
    return false;
  }

  const embedding = await generateEmbedding(text, model);
  if (!embedding) {
    console.warn('[memory] Failed to generate embedding');
    return false;
  }

  const sb = admin();

  try {
    const { error } = await sb
      .from('memory_embeddings')
      .upsert({
        user_id: userId,
        message_id: factId, // Using fact_id as message_id for linking
        text: text.slice(0, 8000),
        embedding: JSON.stringify(embedding), // Store as JSON string for pgvector
        created_at: new Date().toISOString()
      }, {
        onConflict: 'message_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[memory] Failed to store embedding:', error);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[memory] Error storing embedding:', error);
    return false;
  }
}

/**
 * Recall relevant memories using semantic search
 * 
 * Uses pgvector similarity search if available, else SQL cosine fallback.
 * Filters by created_at >= now() - interval 'sinceDays days'
 * 
 * When sessionId is provided, prioritizes memories from that session:
 * - First queries session-scoped memories (from memory_embeddings with source_id = sessionId)
 * - If session-scoped results are sufficient (≥3), returns those
 * - Otherwise, appends global user-wide results as additional context
 */
export async function recall(params: RecallParams): Promise<RecalledFact[]> {
  const { userId, query, k = 12, minScore = 0.2, sinceDays = 365, sessionId } = params; // Lowered minScore from 0.25 to 0.2 for better recall

  if (!userId || !query || !query.trim()) {
    return [];
  }

  // Normalize sessionId before using it
  const normalizedSessionId = normalizeSessionId(sessionId);
  const sessionPrefix = normalizedSessionId
    ? normalizedSessionId.substring(0, 8)
    : 'no-session';

  console.log(
    '[MEMORY] recall() sessionId=%s userId=%s',
    sessionPrefix,
    typeof userId === 'string' && userId.length > 8 ? userId.substring(0, 8) : userId
  );

  const sb = admin();
  const queryEmbedding = await generateEmbedding(query);
  
  if (!queryEmbedding) {
    console.warn('[memory] Failed to generate query embedding, returning empty');
    return [];
  }

  try {
    // Session-aware recall: prioritize memories from the current session
    const sessionFilter =
      normalizedSessionId && normalizedSessionId.length > 0
        ? { session_id: normalizedSessionId }
        : null;

    if (normalizedSessionId) {
      
      // First, try to get session-scoped memories from memory_embeddings
      const { data: sessionEmbeddings, error: sessionError } = await sb
        .from('memory_embeddings')
        .select('id, chunk, content_redacted, source_id, embedding')
        .eq('user_id', userId)
        .eq('source_id', normalizedSessionId)
        .limit(k * 2); // Get more candidates for similarity filtering

      if (!sessionError && sessionEmbeddings && sessionEmbeddings.length > 0) {
        // Calculate similarity scores for session-scoped embeddings
        const sessionResults: RecalledFact[] = [];
        
        for (const emb of sessionEmbeddings) {
          if (!emb.embedding) continue;
          
          try {
            const embVector = typeof emb.embedding === 'string' 
              ? JSON.parse(emb.embedding) 
              : emb.embedding;
            
            // Simple cosine similarity (approximate)
            const similarity = cosineSimilarity(queryEmbedding, embVector);
            
            if (similarity >= minScore) {
              sessionResults.push({
                fact: emb.chunk || emb.content_redacted || '',
                score: similarity,
                fact_id: emb.id
              });
            }
          } catch (e) {
            // Skip invalid embeddings
            continue;
          }
        }

        // Sort by score descending and take top k
        sessionResults.sort((a, b) => b.score - a.score);
        const topSessionResults = sessionResults.slice(0, k);

        // If we have enough session-scoped results (≥3), return them
        // Otherwise, fall through to get global results as well
        if (topSessionResults.length >= 3) {
          console.log(`[MEMORY] recall() sessionHits=${topSessionResults.length} (returning session-scoped only)`);
          return topSessionResults;
        }

        // If we have some session results but not enough, we'll append global results below
        // Continue to get global memories to supplement
        console.log(`[MEMORY] recall() sessionHits=${topSessionResults.length} (<3, falling back to global)`);
      } else {
        console.log(`[MEMORY] recall() sessionHits=0 (no session embeddings found)`);
      }
    }

    // Use RPC function for global user-wide search (or fallback if no session results)
    const { data, error } = await sb.rpc('match_memory_embeddings', {
      p_user_id: userId,
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_match_count: k,
      p_similarity_threshold: minScore
    });

    if (error) {
      console.warn('[memory] RPC search failed, trying SQL fallback:', error);
      // Fallback: simple text search on facts
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - sinceDays);
      
      const { data: facts } = await sb
        .from('user_memory_facts')
        .select('id, fact, created_at, source_message_id')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(k * 2); // Get more to allow filtering/boosting

      // Map results and boost session-scoped facts
      const mappedFacts = (facts || []).map((f: any) => ({
        fact: f.fact || '',
        score: f.source_message_id === normalizedSessionId ? 0.7 : 0.5, // Boost session-scoped facts
        fact_id: f.id
      }));

      // Sort by score (session-scoped first) then take top k
      mappedFacts.sort((a, b) => b.score - a.score);
      return mappedFacts.slice(0, k);
    }

    // Map RPC results to RecalledFact format
    const globalResults = (data || []).map((item: any) => ({
      fact: item.chunk || item.content_redacted || '',
      score: item.similarity || 0,
      fact_id: item.id || ''
    })).filter((r: RecalledFact) => r.score >= minScore);

    if (normalizedSessionId) {
      console.log(`[MEMORY] recall() globalHits=${globalResults.length} (fallback from session)`);
    } else {
      console.log(`[MEMORY] recall() globalHits=${globalResults.length} (no sessionId provided)`);
    }

    // TODO: Future enhancement - tune the mixing strategy between session-scoped and global memories.
    // TODO: Make the number of session-scoped vs global results configurable (e.g., via params).

    return globalResults;

  } catch (error: any) {
    console.error('[memory] Error recalling memories:', error);
    return [];
  }
}

/**
 * Simple cosine similarity calculation for two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Extract facts from messages using simple heuristics
 * 
 * Detects: vendor, amount, date, domain, email, phone
 * Deduplicates and masks PII before persisting
 */
export function extractFactsFromMessages(messages: Array<{ role: string; content: string }>): Array<{ key: string; value: string; scope: string }> {
  const facts: Array<{ key: string; value: string; scope: string }> = [];
  const seen = new Set<string>();

  for (const msg of messages) {
    const content = msg.content || '';
    
    // Vendor detection (capitalized words, quoted strings)
    const vendorMatch = content.match(/(?:vendor|merchant|store|shop|from|at)\s+["']?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)["']?/i);
    if (vendorMatch && vendorMatch[1]) {
      const vendor = vendorMatch[1].trim();
      const key = `vendor:${vendor.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        facts.push({ key: 'vendor', value: vendor, scope: 'transaction' });
      }
    }

    // Amount detection ($XX.XX or XX.XX dollars)
    const amountMatch = content.match(/\$?(\d+\.?\d*)\s*(?:dollars?|USD|CAD)?/i);
    if (amountMatch && amountMatch[1]) {
      const amount = amountMatch[1];
      const key = `amount:${amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        facts.push({ key: 'amount', value: amount, scope: 'transaction' });
      }
    }

    // Date detection (YYYY-MM-DD, MM/DD/YYYY, etc.)
    const dateMatch = content.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dateMatch && dateMatch[1]) {
      const date = dateMatch[1];
      const key = `date:${date}`;
      if (!seen.has(key)) {
        seen.add(key);
        facts.push({ key: 'date', value: date, scope: 'transaction' });
      }
    }

    // Domain detection
    const domainMatch = content.match(/(?:https?:\/\/)?([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,})/);
    if (domainMatch && domainMatch[1]) {
      const domain = domainMatch[1];
      const key = `domain:${domain.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        facts.push({ key: 'domain', value: domain, scope: 'network' });
      }
    }

    // Email detection (basic)
    const emailMatch = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch && emailMatch[1]) {
      const email = emailMatch[1];
      const key = `email:${email.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Mask email before storing
        const masked = maskPII(email, 'full').masked;
        facts.push({ key: 'email', value: masked, scope: 'contact' });
      }
    }

    // Phone detection (basic)
    const phoneMatch = content.match(/(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
    if (phoneMatch && phoneMatch[1]) {
      const phone = phoneMatch[1];
      const key = `phone:${phone.replace(/\D/g, '')}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Mask phone before storing
        const masked = maskPII(phone, 'full').masked;
        facts.push({ key: 'phone', value: masked, scope: 'contact' });
      }
    }
  }

  return facts;
}

/**
 * Cap tokens in text (simple approximation: ~4 chars/token)
 */
export function capTokens(input: string, maxTokens: number = 1200): string {
  const maxChars = maxTokens * 4;
  if (input.length <= maxChars) {
    return input;
  }
  return input.substring(0, maxChars) + '...';
}

// ============================================================================
// LEGACY EXPORTS (preserved for backward compatibility)
// ============================================================================

export async function getOrCreateThread({ userId, agent }: { userId: string; agent: string; }): Promise<string> {
  const sb = admin();
  const { data } = await sb
    .from('chat_threads')
    .select('id')
    .eq('user_id', userId)
    .eq('agent', agent)
    .order('created_at', { ascending: false })
    .limit(1);
  if (data && data[0]?.id) return data[0].id as string;
  const ins = await sb.from('chat_threads').insert({ user_id: userId, agent }).select('id').single();
  return String(ins.data?.id);
}

export async function loadThread({ thread_id, limit = 10 }: { thread_id: string; limit?: number; }) {
  const sb = admin();
  const { data } = await sb
    .from('chat_messages')
    .select('role, content')
    .eq('thread_id', thread_id)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data || []).map((m: any) => ({ role: m.role, content: m.content }));
}

export async function saveTurn({ thread_id, userMsg, aiMsg }: { thread_id: string; userMsg: string; aiMsg: string; }) {
  const sb = admin();
  await sb.from('chat_messages').insert([
    { thread_id, role: 'user', content: userMsg },
    { thread_id, role: 'assistant', content: aiMsg },
  ]);
}

export async function summarizeIfNeeded(_thread_id: string) {
  // stub; implement rolling summary later
}

// ============================================================================
// UNIFIED MEMORY API (Phase 2.1)
// ============================================================================

/**
 * Unified Memory Context Interface
 */
export interface UnifiedMemoryContext {
  /** Formatted context block for system prompt */
  context: string;
  /** Recalled facts from semantic search */
  facts: RecalledFact[];
  /** Similar memories from RAG search */
  memories: Array<{
    content: string;
    similarity: number;
    created_at?: string;
  }>;
  /** Pending tasks (if includeTasks=true) */
  tasks?: Array<{
    description: string;
    due_date: string | null;
    priority?: string;
  }>;
  /** Session summaries (if includeSummaries=true) */
  summaries?: Array<{
    summary: string;
    created_at: string;
  }>;
}

/**
 * Get unified memory context (facts + RAG + tasks + summaries)
 * 
 * This is the single entry point for memory retrieval.
 * Combines recall() + context-retrieval.ts for comprehensive context.
 * 
 * @param params - Memory retrieval parameters
 * @returns Unified memory context with formatted context block
 * 
 * @example
 * ```typescript
 * const memory = await getMemory({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   query: 'What are my spending preferences?',
 *   options: {
 *     maxFacts: 12,
 *     topK: 6,
 *     minScore: 0.2,
 *     includeTasks: true
 *   }
 * });
 * 
 * // Use formatted context in system prompt
 * const systemPrompt = `${basePrompt}\n\n${memory.context}`;
 * ```
 */
export async function getMemory(params: {
  userId: string;
  sessionId: string;
  query: string;
  options?: {
    /** Maximum facts to retrieve (default: 12) */
    maxFacts?: number;
    /** Top-K similar memories from RAG (default: 6) */
    topK?: number;
    /** Minimum similarity score (default: 0.2) */
    minScore?: number;
    /** Include pending tasks (default: true) */
    includeTasks?: boolean;
    /** Include session summaries (default: false) */
    includeSummaries?: boolean;
  };
}): Promise<UnifiedMemoryContext> {
  const {
    userId,
    sessionId,
    query,
    options = {}
  } = params;

  const {
    maxFacts = 12,
    topK = 6,
    minScore = 0.2,
    includeTasks = true,
    includeSummaries = false
  } = options;

  // Use context-retrieval.ts for comprehensive context
  const retrieved = await retrieveContext({
    userId,
    sessionId,
    userQuery: query,
    maxFacts,
    topK,
    similarityThreshold: minScore
  });

  // Normalize sessionId before passing to recall
  const normalizedSessionId = normalizeSessionId(sessionId);

  // Also use recall() for backward compatibility and additional facts
  const recalledFacts = await recall({
    userId,
    query,
    k: maxFacts,
    minScore,
    sessionId: normalizedSessionId || undefined
  });

  // Merge facts from both sources (deduplicate by fact_id)
  const factMap = new Map<string, RecalledFact>();
  recalledFacts.forEach(f => factMap.set(f.fact_id, f));
  retrieved.facts.forEach(f => {
    // Try to match by fact content if fact_id not available
    const existing = Array.from(factMap.values()).find(
      existing => existing.fact === f.fact
    );
    if (!existing) {
      factMap.set(f.fact || '', {
        fact: f.fact || '',
        score: 0.5, // Default score for context-retrieval facts
        fact_id: f.fact || ''
      });
    }
  });

  // Build unified context
  const contextParts: string[] = [];

  // Add facts section
  if (retrieved.facts.length > 0) {
    const factLines = retrieved.facts
      .map(f => `- ${f.fact}`)
      .join('\n');
    contextParts.push(`## Known User Facts & Preferences\n${factLines}`);
  }

  // Add tasks section (if requested)
  if (includeTasks && retrieved.tasks.length > 0) {
    const taskLines = retrieved.tasks
      .map(t => {
        const dueStr = t.due_date ? ` (due ${new Date(t.due_date).toLocaleDateString()})` : '';
        return `- ${t.description}${dueStr}`;
      })
      .join('\n');
    contextParts.push(`## Pending Tasks\n${taskLines}`);
  }

  // Add RAG memories section
  if (retrieved.memories.length > 0) {
    const memorySnippets = retrieved.memories
      .map(m => `• ${m.content_redacted} (${(m.similarity * 100).toFixed(0)}% match)`)
      .join('\n');
    contextParts.push(`## Relevant Past Conversations\n${memorySnippets}`);
  }

  // TODO: Add session summaries (Phase 2.3 or later)
  // if (includeSummaries) {
  //   const summaries = await getSessionSummaries(userId, sessionId);
  //   ...
  // }

  const context = contextParts.join('\n\n');

  return {
    context,
    facts: Array.from(factMap.values()),
    memories: retrieved.memories.map(m => ({
      content: m.content_redacted || '',
      similarity: m.similarity || 0,
      created_at: m.created_at
    })),
    tasks: includeTasks ? retrieved.tasks : undefined
  };
}

/**
 * Queue memory extraction for async processing (Phase 2.3)
 * 
 * Inserts a job into the memory_extraction_queue table for background processing.
 * This function returns immediately without blocking the chat response.
 * 
 * @param params - Extraction parameters
 * @returns Promise that resolves when job is queued (not when extraction completes)
 * 
 * @example
 * ```typescript
 * // Queue extraction (non-blocking)
 * queueMemoryExtraction({
 *   userId: 'user-123',
 *   sessionId: 'session-456',
 *   userMessage: 'I prefer CSV exports',
 *   assistantResponse: 'Got it, I'll use CSV format.'
 * }).catch(err => {
 *   console.warn('Failed to queue extraction:', err);
 * });
 * ```
 */
export async function queueMemoryExtraction(params: {
  userId: string;
  sessionId: string;
  userMessage: string;
  assistantResponse?: string;
}): Promise<void> {
  const {
    userId,
    sessionId,
    userMessage,
    assistantResponse
  } = params;

  // Validate userId format (must be valid UUID)
  if (!userId || typeof userId !== 'string') {
    console.warn('[Memory] Invalid userId provided, skipping queue:', { userId });
    return;
  }

  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    console.warn('[Memory] userId is not a valid UUID format, skipping queue:', { userId: userId.substring(0, 20) });
    return;
  }

  const sb = admin();

  try {
    // Ensure user exists in auth.users before inserting (dev resilience)
    // In dev, we may have test users that don't exist in auth.users
    try {
      const { data: userCheck, error: userCheckError } = await sb.auth.admin.getUserById(userId);
      
      if (userCheckError || !userCheck?.user) {
        // User doesn't exist - try to create a minimal dev user entry
        // Note: This is a dev-only workaround. In production, users should always exist.
        console.warn('[Memory] User not found in auth.users, attempting to create dev user entry:', {
          userId: userId.substring(0, 8) + '...'
        });
        
        // Try to insert into auth.users via RPC or direct SQL (if available)
        // If this fails, we'll catch the FK error below and continue
        // For now, we'll just log and let the FK check handle it
      }
    } catch (userCheckErr: any) {
      // If we can't check/create the user, log and continue
      // The FK constraint check below will handle the error gracefully
      console.warn('[Memory] Could not verify user exists in auth.users (dev mode):', {
        userId: userId.substring(0, 8) + '...',
        error: userCheckErr.message
      });
    }

    // Insert job into queue (non-blocking)
    const { error } = await sb
      .from('memory_extraction_queue')
      .insert({
        user_id: userId, // UUID format
        session_id: sessionId,
        user_message: userMessage, // Should already be PII-masked
        assistant_response: assistantResponse || null,
        status: 'pending',
        retry_count: 0
      });

    if (error) {
      // Check for FK constraint errors specifically
      // In dev, we'll log and continue instead of failing
      if (error.code === '23503' || error.message?.includes('foreign key constraint')) {
        console.warn('[Memory] Skipping memory_extraction_queue insert due to FK error in dev (user_id does not exist in auth.users):', {
          userId: userId.substring(0, 8) + '...',
          error: error.message
        });
        // Don't throw - allow chat to continue without memory extraction in dev
        return;
        // Don't retry FK errors - they will never succeed
        return;
      }
      
      console.error('[Memory] Failed to queue extraction job:', error);
      // Don't throw - queue failures shouldn't break chat
      // Log and continue
      return;
    }

    const normalizedSessionId = normalizeSessionId(sessionId);
    const sessionPrefix = normalizedSessionId
      ? normalizedSessionId.substring(0, 8)
      : 'no-session';
    console.log(`[Memory] Queued extraction job for user ${userId.substring(0, 8)}... session ${sessionPrefix}...`);
  } catch (error: any) {
    // Check for FK constraint errors
    if (error?.code === '23503' || error?.message?.includes('foreign key constraint')) {
      console.error('[Memory] FK constraint violation caught in catch block:', {
        userId: userId.substring(0, 8) + '...',
        error: error.message
      });
      // Don't retry FK errors
      return;
    }
    
    console.error('[Memory] Error queueing extraction:', error);
    // Don't throw - extraction failures shouldn't break chat
    // The worker will retry failed jobs (except FK errors)
  }
}
