/**
 * 🔄 Memory Compatibility Adapter
 * 
 * Bridges v2's memory API (fetchUserFacts, recallSimilarMemory) to v3's expected format.
 * 
 * MAPPING:
 * - v2: fetchUserFacts(userId) + recallSimilarMemory(userId, query) → separate calls
 * - v3: getMemoryCompat(userId) → {facts: any[]; embeddings?: any}
 * 
 * Uses v3's actual memory system:
 * - dbGetMemoryFacts() for facts (from user_memory_facts table)
 * - retrieveContext() for RAG similarity search
 * 
 * @module memory_adapter
 */

import { retrieveContext } from './context-retrieval';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Memory compatibility result
 */
export type MemoryCompatResult = {
  /** Array of user facts (key-value pairs as strings) */
  facts: Array<{ key: string; value: string; source?: string; created_at?: string }>;
  /** Optional embeddings metadata */
  embeddings?: {
    /** Similar memories from RAG search */
    similarMemories: Array<{ content: string; similarity: number }>;
  };
};

/**
 * Get user memory facts compatible with v2's fetchUserFacts() format
 * 
 * This adapter wraps v3's actual memory system:
 * - Fetches facts from user_memory_facts table
 * - Optionally includes RAG similarity search results
 * 
 * @param userId User ID
 * @param options Optional configuration
 * @returns Normalized memory result compatible with v2 expectations
 * 
 * @example
 * ```typescript
 * const memory = await getMemoryCompat(userId);
 * 
 * // Access facts
 * memory.facts.forEach(fact => {
 *   console.log(`${fact.key}: ${fact.value}`);
 * });
 * 
 * // Access similar memories (if RAG enabled)
 * if (memory.embeddings?.similarMemories) {
 *   memory.embeddings.similarMemories.forEach(m => {
 *     console.log(`Similar: ${m.content} (${m.similarity})`);
 *   });
 * }
 * ```
 */
export async function getMemoryCompat(
  userId: string,
  options?: {
    /** Include RAG similarity search (default: false) */
    includeSimilarMemories?: boolean;
    /** User query for similarity search (required if includeSimilarMemories=true) */
    userQuery?: string;
    /** Session ID for context retrieval (required if includeSimilarMemories=true) */
    sessionId?: string;
    /** Maximum facts to return (default: 20) */
    maxFacts?: number;
    /** Top-K similar memories (default: 6) */
    topK?: number;
  }
): Promise<MemoryCompatResult> {
  const {
    includeSimilarMemories = false,
    userQuery = '',
    sessionId = '',
    maxFacts = 20,
    topK = 6
  } = options || {};

  // Fetch facts from user_memory_facts table
  const { data: factsData, error: factsError } = await supabase
    .from('user_memory_facts')
    .select('fact, source, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(maxFacts);

  if (factsError) {
    console.error('[Memory Adapter] Error fetching facts:', factsError);
  }

  // Parse facts (format: "key:value" or "pref:key=value")
  const facts = (factsData || []).map((row: any) => {
    const factStr = row.fact || '';
    
    // Try to parse "key:value" or "pref:key=value" format
    let key = factStr;
    let value = '';
    
    if (factStr.includes(':')) {
      const parts = factStr.split(':');
      key = parts[0] || factStr;
      value = parts.slice(1).join(':');
    } else if (factStr.includes('=')) {
      const parts = factStr.split('=');
      key = parts[0] || factStr;
      value = parts.slice(1).join('=');
    }
    
    return {
      key: key.trim(),
      value: value.trim() || factStr, // Fallback to full string if no separator
      source: row.source || 'unknown',
      created_at: row.created_at
    };
  });

  // Optionally include RAG similarity search
  let embeddings: MemoryCompatResult['embeddings'] | undefined;
  
  if (includeSimilarMemories && userQuery && sessionId) {
    try {
      const context = await retrieveContext({
        userId,
        sessionId,
        userQuery,
        maxFacts: 0, // Don't fetch facts again
        topK
      });

      embeddings = {
        similarMemories: context.memories.map(m => ({
          content: m.content_redacted || '',
          similarity: m.similarity || 0
        }))
      };
    } catch (err) {
      console.warn('[Memory Adapter] RAG search failed (non-fatal):', err);
      // Continue without embeddings
    }
  }

  return {
    facts,
    embeddings
  };
}

