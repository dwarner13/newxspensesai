import OpenAI from 'openai';

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error('[env] Missing OPENAI_API_KEY');
}

const client = API_KEY ? new OpenAI({ apiKey: API_KEY }) : null;

export async function simpleChat({ system, messages }: { system: string; messages: Array<{ role: 'user'|'assistant'|'system'; content: string }>; }): Promise<string> {
  if (!client) throw new Error('OPENAI_API_KEY not configured');
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      ...messages,
    ],
  });
  return resp.choices?.[0]?.message?.content ?? '';
}






