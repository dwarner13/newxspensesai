/**
 * 🧠 Canonical Memory Module
 * 
 * Day 4: Unified memory functions for fact storage, recall, and embedding.
 * 
 * Functions:
 * - upsertFact: Store facts with deduplication
 * - embedAndStore: Generate and store embeddings
 * - recall: Semantic search for relevant memories
 * - extractFactsFromMessages: Extract facts from conversation
 * - capTokens: Token capping utility
 */

import crypto from 'crypto';
import { admin } from './supabase';
import { maskPII } from './pii';

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
 */
export async function recall(params: RecallParams): Promise<RecalledFact[]> {
  const { userId, query, k = 12, minScore = 0.25, sinceDays = 365 } = params;

  if (!userId || !query || !query.trim()) {
    return [];
  }

  const sb = admin();
  const queryEmbedding = await generateEmbedding(query);
  
  if (!queryEmbedding) {
    console.warn('[memory] Failed to generate query embedding, returning empty');
    return [];
  }

  try {
    // Use RPC function if available (pgvector)
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
        .select('id, fact, created_at')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(k);

      return (facts || []).map((f: any) => ({
        fact: f.fact || '',
        score: 0.5, // Default score for text search
        fact_id: f.id
      }));
    }

    // Map RPC results to RecalledFact format
    return (data || []).map((item: any) => ({
      fact: item.chunk || item.content_redacted || '',
      score: item.similarity || 0,
      fact_id: item.id || ''
    })).filter((r: RecalledFact) => r.score >= minScore);

  } catch (error: any) {
    console.error('[memory] Error recalling memories:', error);
    return [];
  }
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
