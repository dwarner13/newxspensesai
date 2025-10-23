/**
 * 🧠 Advanced Memory Extraction
 * 
 * Automatically extracts durable facts, preferences, tasks, and corrections
 * from user messages using LLM-based JSON extraction.
 * 
 * Features:
 * - Structured extraction (facts, preferences, tasks, corrections)
 * - Confidence scoring (drops items < 0.6)
 * - Key-value storage with upserts
 * - Embedding generation for RAG
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

type ExtractedMemory = {
  facts: Array<{ key: string; value: string; confidence: number }>;
  preferences: Array<{ key: string; value: string; confidence: number }>;
  tasks: Array<{ description: string; due?: string; confidence: number }>;
  corrections: Array<{ key: string; value: string; confidence: number }>;
};

// ============================================================================
// LLM JSON EXTRACTION
// ============================================================================

/**
 * Call OpenAI with JSON mode to extract structured memories
 * @param prompt - Extraction prompt with user message
 * @returns Structured memory extraction
 */
async function callLLMJson(prompt: string): Promise<ExtractedMemory> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SMALL_MODEL ?? 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Extract persistent user memories as strict JSON only. Be conservative - only extract truly durable information.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!res.ok) {
      console.error('[Memory Extraction] OpenAI API error:', res.status);
      return { facts: [], preferences: [], tasks: [], corrections: [] };
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? '{}';

    try {
      const parsed = JSON.parse(text);
      
      // Validate structure
      return {
        facts: Array.isArray(parsed.facts) ? parsed.facts : [],
        preferences: Array.isArray(parsed.preferences) ? parsed.preferences : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        corrections: Array.isArray(parsed.corrections) ? parsed.corrections : []
      };
    } catch (parseErr) {
      console.error('[Memory Extraction] JSON parse error:', parseErr);
      return { facts: [], preferences: [], tasks: [], corrections: [] };
    }
  } catch (err) {
    console.error('[Memory Extraction] Request error:', err);
    return { facts: [], preferences: [], tasks: [], corrections: [] };
  }
}

// ============================================================================
// MEMORY EXTRACTION & STORAGE
// ============================================================================

/**
 * Extract and save durable memories from user message
 * 
 * Flow:
 * 1. Extract structured memories using LLM (JSON mode)
 * 2. Filter by confidence threshold (>= 0.6)
 * 3. Upsert to user_memory_facts (key-value store)
 * 4. Generate and store embedding for RAG
 * 
 * @param params - Extraction parameters
 */
export async function extractAndSaveMemories(params: {
  userId: string;
  sessionId: string;
  redactedUserText: string;  // Already PII-masked
  assistantResponse?: string; // Optional: include assistant context
}) {
  const { userId, sessionId, redactedUserText, assistantResponse } = params;

  console.log(`[Memory Extraction] Processing for user ${userId}`);

  // ========================================================================
  // 1. EXTRACT CANDIDATE MEMORIES
  // ========================================================================
  const extractionPrompt = `
You are a memory extraction helper for a financial assistant.
From the user's latest message (already PII-redacted), extract ONLY durable, actionable information.

Return STRICT JSON with this exact structure:
{
  "facts": [{"key": "string", "value": "string", "confidence": 0.0-1.0}],
  "preferences": [{"key": "string", "value": "string", "confidence": 0.0-1.0}],
  "tasks": [{"description": "string", "due": "ISO8601 or empty", "confidence": 0.0-1.0}],
  "corrections": [{"key": "string", "value": "string", "confidence": 0.0-1.0}]
}

RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FACTS (stable personal/business info):
✓ "age" → "32"
✓ "business_type" → "freelance consulting"
✓ "home_city" → "Toronto"
✓ "savings_goal" → "$50k by Dec 2026"
✗ Don't extract: temporary statements, questions, current transactions

PREFERENCES (stable settings/ways of working):
✓ "export_format" → "CSV"
✓ "notification_frequency" → "weekly"
✓ "budget_tracking" → "envelope method"
✗ Don't extract: one-time choices, vague likes

TASKS (explicit commitments with clear action):
✓ "Review Q4 expenses before tax filing"
✓ "Set up recurring transfer to savings"
✗ Don't extract: vague ideas ("I should probably..."), questions

CORRECTIONS (explicit updates/fixes):
✓ "business_name" → "Acme Corp" (was "ABC Inc")
✓ "budget_limit" → "$3000" (was "$2500")
✗ Don't extract: casual clarifications

CONFIDENCE SCORING:
1.0 = Explicit statement ("My export format is CSV")
0.8 = Strongly implied ("I always use CSV files")
0.6 = Moderate implication (context suggests)
<0.6 = Too vague (DROP IT)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User message:
"""
${redactedUserText}
"""
${assistantResponse ? `\nAssistant response (for context):\n"""\n${assistantResponse}\n"""` : ''}

Return ONLY the JSON object, no commentary.
  `.trim();

  const raw = await callLLMJson(extractionPrompt);

  // ========================================================================
  // 2. FILTER BY CONFIDENCE THRESHOLD
  // ========================================================================
  const CONFIDENCE_THRESHOLD = 0.6;

  const facts = (raw.facts ?? []).filter((f: any) => {
    const conf = typeof f.confidence === 'number' ? f.confidence : 0;
    return conf >= CONFIDENCE_THRESHOLD && f.key && f.value;
  });

  const prefs = (raw.preferences ?? []).filter((p: any) => {
    const conf = typeof p.confidence === 'number' ? p.confidence : 0;
    return conf >= CONFIDENCE_THRESHOLD && p.key && p.value;
  });

  const tasks = (raw.tasks ?? []).filter((t: any) => {
    const conf = typeof t.confidence === 'number' ? t.confidence : 0;
    return conf >= CONFIDENCE_THRESHOLD && t.description;
  });

  const corrections = (raw.corrections ?? []).filter((c: any) => {
    const conf = typeof c.confidence === 'number' ? c.confidence : 0;
    return conf >= CONFIDENCE_THRESHOLD && c.key && c.value;
  });

  console.log(`[Memory Extraction] Extracted: ${facts.length} facts, ${prefs.length} prefs, ${tasks.length} tasks, ${corrections.length} corrections`);

  // ========================================================================
  // 3. NORMALIZE & UPSERT FACTS (Hash-Based Deduplication)
  // ========================================================================
  
  // Helper: Create MD5 hash of lowercase string
  function md5Lower(s: string): string {
    return crypto.createHash('md5').update(s.toLowerCase()).digest('hex');
  }

  // Convert extracted items to normalized fact strings
  function toNormalizedFacts(): string[] {
    const out: string[] = [];

    for (const f of facts) {
      if (!f?.key || !f?.value) continue;
      out.push(`fact:${String(f.key).trim()}=${String(f.value).trim()}`);
    }
    
    for (const p of prefs) {
      if (!p?.key || !p?.value) continue;
      out.push(`pref:${String(p.key).trim()}=${String(p.value).trim()}`);
    }
    
    for (const c of corrections) {
      if (!c?.key || !c?.value) continue;
      // Corrections overwrite; storing latest wins naturally by created_at
      out.push(`correct:${String(c.key).trim()}=${String(c.value).trim()}`);
    }
    
    return out;
  }

  const normalizedFacts = toNormalizedFacts();

  // Upsert with hash-based deduplication
  for (const factStr of normalizedFacts) {
    const fact_hash = md5Lower(factStr);

    try {
      await supabase
        .from('user_memory_facts')
        .upsert({
          user_id: userId,
          source: 'extractor:v1',
          fact: factStr,
          fact_hash: fact_hash,
          confidence: 80, // Default confidence for extracted facts
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,fact_hash'
        });
    } catch (err) {
      console.error(`[Memory Extraction] Failed to upsert fact ${factStr}:`, err);
    }
  }

  // ========================================================================
  // 4. SAVE TASKS (if any)
  // ========================================================================
  for (const task of tasks) {
    try {
      await supabase
        .from('user_tasks')
        .insert({
          user_id: userId,
          description: task.description,
          due_date: task.due || null,
          status: 'pending',
          created_from_session: sessionId,
          created_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('[Memory Extraction] Failed to save task:', err);
    }
  }

  // ========================================================================
  // 5. GENERATE & STORE EMBEDDING FOR RAG
  // ========================================================================
  try {
    // Use OpenAI embeddings API
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: redactedUserText,
        dimensions: 1536
      })
    });

    if (embedRes.ok) {
      const embedJson = await embedRes.json();
      const embedding = embedJson?.data?.[0]?.embedding;

      if (embedding && Array.isArray(embedding) && embedding.length === 1536) {
        await supabase.from('memory_embeddings').insert({
          user_id: userId,
          owner_scope: 'conversation',
          source_id: sessionId,
          chunk: redactedUserText,
          embedding: JSON.stringify(embedding), // pgvector format
          token_count: Math.ceil(redactedUserText.length / 4),
          created_at: new Date().toISOString()
        });

        console.log(`[Memory Extraction] Embedding saved for user ${userId}`);
      }
    }
  } catch (embedErr) {
    console.warn('[Memory Extraction] Embedding generation failed (non-fatal):', embedErr);
    // Non-fatal - continue even if embeddings fail
  }

  // ========================================================================
  // 6. RETURN EXTRACTION SUMMARY
  // ========================================================================
  return {
    extracted: {
      facts: facts.length,
      preferences: prefs.length,
      tasks: tasks.length,
      corrections: corrections.length
    },
    details: {
      facts: facts.map((f: any) => ({ key: f.key, confidence: f.confidence })),
      preferences: prefs.map((p: any) => ({ key: p.key, confidence: p.confidence })),
      tasks: tasks.map((t: any) => ({ description: t.description.slice(0, 50) + '...', confidence: t.confidence })),
      corrections: corrections.map((c: any) => ({ key: c.key, confidence: c.confidence }))
    }
  };
}

/**
 * Retrieve all facts for a user (for context building)
 * @param userId - User ID
 * @param maxFacts - Maximum number of facts to retrieve
 * @returns Array of fact strings
 */
export async function getUserFacts(
  userId: string, 
  maxFacts: number = 50
): Promise<Array<{ source: string; fact: string; created_at: string }>> {
  const { data, error } = await supabase
    .from('user_memory_facts')
    .select('source, fact, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(maxFacts);

  if (error) {
    console.error('[Memory Extraction] Error fetching facts:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user tasks (pending or upcoming)
 * @param userId - User ID
 * @returns Array of tasks
 */
export async function getUserTasks(userId: string): Promise<Array<{ description: string; due_date: string | null; status: string }>> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('description, due_date, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(10);

  if (error) {
    console.error('[Memory Extraction] Error fetching tasks:', error);
    return [];
  }

  return data || [];
}

