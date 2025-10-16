import { SupabaseClient } from "@supabase/supabase-js";

// Re-export memory functions from the main memory.ts file
export { saveMessage, saveFact, searchMemory } from '../memory'

// Additional functions needed by chat.ts
export async function fetchUserFacts(sb: SupabaseClient, userId: string) {
  const { data } = await sb.from("user_memory_facts").select("fact").eq("user_id", userId).limit(50);
  return data || [];
}

export async function recallSimilarMemory(sb: SupabaseClient, userId: string, query: string) {
  // Use the existing searchMemory function but adapt the interface
  const { searchMemory } = await import('../memory');
  const results = await searchMemory(userId, query, 5);
  return results.map(r => ({ fact: r.text, score: r.similarity }));
}

export async function saveChatMessage(sb: SupabaseClient, { userId, role, content, employee }:{
  userId: string; role: "user" | "assistant"; content: string; employee?: string;
}) {
  await sb.from("chat_messages").insert({
    user_id: userId,
    role,
    content,
    employee_key: employee || null
  });
}

export async function saveConvoSummary(sb: SupabaseClient, userId: string, summary: string) {
  if (!summary) return;
  await sb.from("chat_convo_summaries").insert({ 
    user_id: userId, 
    convo_id: 'default', // Use a default conversation ID for now
    summary,
    updated_at: new Date().toISOString()
  });
}

