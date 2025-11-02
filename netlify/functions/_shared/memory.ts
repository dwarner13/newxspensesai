import { admin } from './supabase';

export async function getOrCreateThread({ userId, agent }: { userId: string; agent: string; }): Promise<string> {
  const sb = admin();
  // try last open thread for agent
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




