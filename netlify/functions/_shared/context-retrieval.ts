/**
 * 🔍 Context Retrieval System
 * 
 * Retrieves relevant context for chat responses using:
 * 1. Long-term facts (key-value storage)
 * 2. Vector similarity search (RAG)
 * 3. Recent conversation history
 * 
 * Integrates with memory extraction for full memory pipeline.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

type RetrievedContext = {
  context: string;  // Formatted context block for system prompt
  facts: Array<{ source: string; fact: string; created_at: string }>;
  memories: Array<{ content_redacted: string; similarity: number }>;
  tasks: Array<{ description: string; due_date: string | null }>;
};

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for text using OpenAI
 * @param text - Text to embed
 * @returns Embedding vector (1536 dimensions)
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536
      })
    });

    if (!res.ok) {
      console.error('[Context Retrieval] Embedding API error:', res.status);
      return null;
    }

    const json = await res.json();
    const embedding = json?.data?.[0]?.embedding;

    if (embedding && Array.isArray(embedding) && embedding.length === 1536) {
      return embedding;
    }

    return null;
  } catch (err) {
    console.error('[Context Retrieval] Embedding generation failed:', err);
    return null;
  }
}

// ============================================================================
// MAIN CONTEXT RETRIEVAL
// ============================================================================

/**
 * Retrieve all relevant context for a user query
 * 
 * @param params - Retrieval parameters
 * @returns Formatted context with facts, memories, and tasks
 */
export async function retrieveContext(params: {
  userId: string;
  sessionId: string;
  userQuery: string;       // Redacted, current turn
  maxFacts?: number;       // Max facts to retrieve
  topK?: number;           // Top-K similar memories
  similarityThreshold?: number;  // Minimum similarity score
}): Promise<RetrievedContext> {
  const {
    userId,
    sessionId,
    userQuery,
    maxFacts = 12,
    topK = 6,
    similarityThreshold = 0.70
  } = params;

  console.log(`[Context Retrieval] Fetching context for user ${userId}`);

  // ========================================================================
  // 1. PULL LONG-TERM FACTS (Recent First)
  // ========================================================================
  const { data: facts, error: factsError } = await supabase
    .from('user_memory_facts')
    .select('source, fact, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(maxFacts);

  if (factsError) {
    console.error('[Context Retrieval] Facts retrieval error:', factsError);
  }

  // ========================================================================
  // 2. VECTOR SIMILARITY SEARCH (RAG)
  // ========================================================================
  let topMemory: Array<{ content_redacted: string; similarity: number; created_at: string }> = [];

  try {
    // Generate embedding for current query
    const embedding = await generateEmbedding(userQuery);

    if (embedding) {
      // Search for similar memories using RPC function
      const { data: sims, error: simsError } = await supabase.rpc('match_memory_embeddings', {
        p_user_id: userId,
        p_query_embedding: JSON.stringify(embedding),  // pgvector format
        p_match_count: topK,
        p_similarity_threshold: similarityThreshold
      });

      if (simsError) {
        console.error('[Context Retrieval] Similarity search error:', simsError);
      } else {
        topMemory = (sims ?? []).map((r: any) => ({
          content_redacted: r.chunk || r.content_redacted || '',
          similarity: r.similarity || 0,
          created_at: r.created_at
        }));

        console.log(`[Context Retrieval] Found ${topMemory.length} similar memories`);
      }
    }
  } catch (embedErr) {
    console.warn('[Context Retrieval] Embedding/similarity search failed (non-fatal):', embedErr);
    // Non-fatal - continue without memory search
  }

  // ========================================================================
  // 3. GET PENDING TASKS
  // ========================================================================
  // Part C: Gracefully handle missing user_tasks table/columns in dev
  let tasks: any[] = [];
  try {
    const { data: tasksData, error: tasksError } = await supabase
      .from('user_tasks')
      .select('description, due_date, priority')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5);

    if (tasksError) {
      const message = tasksError?.message ?? '';
      // Part C: Silence optional dev features when tables/columns are missing
      if (
        process.env.NODE_ENV !== 'production' &&
        (message.includes('does not exist') || 
         message.includes('schema cache') ||
         message.includes('column') ||
         tasksError.code === 'PGRST205' ||
         tasksError.code === '42703') // Column does not exist
      ) {
        console.warn('[Context Retrieval] Optional feature skipped due to missing table/column (dev mode)', { message: message.substring(0, 100) });
        tasks = [];
      } else {
        console.error('[Context Retrieval] Tasks retrieval error:', tasksError);
        tasks = [];
      }
    } else {
      tasks = tasksData || [];
    }
  } catch (err: any) {
    const message = err?.message ?? '';
    // Part C: Silence optional dev features when tables/columns are missing
    if (
      process.env.NODE_ENV !== 'production' &&
      (message.includes('does not exist') || 
       message.includes('schema cache') ||
       message.includes('column') ||
       err.code === 'PGRST205' ||
       err.code === '42703')
    ) {
      console.warn('[Context Retrieval] Optional feature skipped due to missing table/column (dev mode)', { message: message.substring(0, 100) });
    } else {
      console.error('[Context Retrieval] Unexpected error fetching tasks:', err);
    }
    tasks = [];
  }

  // ========================================================================
  // 4. BUILD COMPACT CONTEXT BLOCK
  // ========================================================================
  
  // Format facts (simple strings like "pref:key=value")
  const factLines = (facts ?? [])
    .map(f => `- ${f.fact}`)
    .join('\n');

  // Format memories with similarity scores
  const memorySnippets = topMemory
    .map(m => `• ${m.content_redacted} (${(m.similarity * 100).toFixed(0)}% match)`)
    .join('\n');

  // Format tasks
  const taskLines = (tasks ?? [])
    .map(t => {
      const dueStr = t.due_date ? ` (due ${new Date(t.due_date).toLocaleDateString()})` : '';
      return `- ${t.description}${dueStr}`;
    })
    .join('\n');

  // Combine into formatted context
  const contextParts: string[] = [];

  if (factLines) {
    contextParts.push(`## Known User Facts & Preferences\n${factLines}`);
  }

  if (taskLines) {
    contextParts.push(`## Pending Tasks\n${taskLines}`);
  }

  if (memorySnippets) {
    contextParts.push(`## Relevant Past Conversations\n${memorySnippets}`);
  }

  const context = contextParts.join('\n\n');

  // ========================================================================
  // 5. RETURN STRUCTURED CONTEXT
  // ========================================================================
  return {
    context,
    facts: facts ?? [],
    memories: topMemory,
    tasks: tasks ?? []
  };
}

/**
 * Build enhanced system prompt with context
 * 
 * @param basePrompt - Base system prompt from employee routing
 * @param context - Retrieved context from retrieveContext()
 * @returns Enhanced system prompt with context
 */
export function buildSystemPromptWithContext(
  basePrompt: string,
  context: string
): string {
  if (!context || context.trim().length === 0) {
    return basePrompt;
  }

  return `${basePrompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 USER CONTEXT (Reference this to personalize your response)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${context}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use the above context to provide personalized, relevant responses. Reference specific facts, preferences, or past conversations when helpful.`;
}

/**
 * Append context to user message (alternative to system prompt)
 * 
 * @param userMessage - User's message
 * @param context - Retrieved context
 * @returns User message with appended context
 */
export function appendContextToUserMessage(
  userMessage: string,
  context: string
): string {
  if (!context || context.trim().length === 0) {
    return userMessage;
  }

  return `${userMessage}

───────────────────────────────────────────────────
CONTEXT (for assistant reference):

${context}`;
}

/**
 * Quick fact lookup (searches fact string)
 * 
 * @param userId - User ID
 * @param searchTerm - Term to search for in facts
 * @returns Matching facts
 */
export async function searchFacts(
  userId: string,
  searchTerm: string
): Promise<Array<{ fact: string; created_at: string }>> {
  const { data, error } = await supabase
    .from('user_memory_facts')
    .select('fact, created_at')
    .eq('user_id', userId)
    .ilike('fact', `%${searchTerm}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Add a manual fact
 * 
 * @param userId - User ID
 * @param factString - Fact string (e.g., "pref:theme=dark")
 */
export async function addManualFact(
  userId: string,
  factString: string
) {
  const crypto = await import('crypto');
  const fact_hash = crypto.createHash('md5')
    .update(factString.toLowerCase())
    .digest('hex');

  await supabase
    .from('user_memory_facts')
    .upsert({
      user_id: userId,
      fact: factString,
      fact_hash,
      source: 'manual',
      confidence: 100,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,fact_hash'
    });
}

