import { supabaseAdmin } from './supabase'
import { openai, EMBED_MODEL } from './openai'
import crypto from 'crypto'

export async function saveMessage(user_id: string, role: 'user'|'assistant', content: string, employee_key: string|null) {
  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .insert([{ user_id, role, content, employee_key }])
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

export async function embedText(text: string): Promise<number[]> {
  const truncated = text.length > 2000 ? text.slice(0, 2000) : text
  const emb = await openai.embeddings.create({ model: EMBED_MODEL, input: truncated })
  return emb.data[0].embedding as unknown as number[]
}

function sha256(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex')
}

export async function saveFact(user_id: string, fact: string, source_message_id: string) {
  const fact_hash = sha256(fact.trim())

  // Insert fact (ignore duplicates via unique index on fact_hash)
  const { data: factRow, error: factErr } = await supabaseAdmin
    .from('user_memory_facts')
    .insert([{ user_id, fact, source_message_id, fact_hash }])
    .select('id')
    .maybeSingle()
  
  // If duplicate key error, skip embedding to avoid extra cost; otherwise throw
  if (factErr) {
    const isDuplicate = String(factErr.message).includes('duplicate key value')
    if (isDuplicate) return
    throw factErr
  }

  // Embed and upsert (by message_id to avoid duplicate embeddings for same message)
  const vector = await embedText(fact)
  const { error: embErr } = await supabaseAdmin
    .from('memory_embeddings')
    .upsert(
      { user_id, message_id: source_message_id, embedding: vector, text: fact },
      { onConflict: 'message_id' }
    )
  if (embErr) throw embErr
}

export async function searchMemory(user_id: string, query: string, topK = 6) {
  const qvec = await embedText(query)
  const { data, error } = await supabaseAdmin.rpc('match_memory', {
    p_user_id: user_id,
    p_query_embedding: qvec,
    p_match_count: topK,
  })
  if (error) throw error
  return (data || []) as Array<{ message_id: string; similarity: number; text: string }>
}
