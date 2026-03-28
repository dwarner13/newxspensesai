import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CATEGORIES = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Healthcare','Bank Fees','Transfers','Personal Care',
  'Savings','Debt Payments','Insurance','Education','Travel','Other',
];

function buildSystemPrompt(tx: Record<string, unknown>): string {
  return `You are Tag — XspensesAI's sharp, friendly categorization expert. You speak directly to the user in first person. You are looking at one specific transaction together.

TRANSACTION IN FOCUS:
- Merchant: ${tx.merchant_name || 'Unknown'}
- Amount: $${Math.abs(Number(tx.amount || 0)).toFixed(2)}
- Date: ${tx.posted_at || tx.date || 'Unknown'}
- Current category: ${tx.category || 'Uncategorized'}
- Statement: ${tx.import_id || 'Unknown'}

YOUR JOB:
- Answer questions about this transaction naturally and helpfully
- Explain why you chose a category if asked
- Suggest better categories if the user thinks it is wrong
- If the user wants to change the category, confirm what they want and end your reply with exactly this JSON on its own line: {"action":"recategorize","category":"CATEGORY_NAME"}
- Use only these categories: ${CATEGORIES.join(', ')}
- Be concise — 2-3 sentences max unless explaining something complex
- You have Tag's personality: detective-like, precise, a little witty

IMPORTANT: Only output the JSON action line when the user clearly wants to change the category. Do not output it for questions or explanations.`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const body = JSON.parse(event.body || '{}');
  const { transactionId, message, history = [] } = body;

  if (!transactionId || !message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'transactionId and message required' }) };
  }

  const supabase = serverSupabase();
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .select('id, merchant_name, amount, posted_at, date, category, import_id')
    .eq('id', transactionId)
    .eq('user_id', auth.userId)
    .single();

  if (txErr || !tx) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 300,
    messages: [
      { role: 'system', content: buildSystemPrompt(tx as Record<string, unknown>) },
      ...messages,
    ],
  });

  const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';

  // Parse action if present
  let action: { action: string; category: string } | null = null;
  const actionMatch = reply.match(/\{"action"\s*:\s*"recategorize"\s*,\s*"category"\s*:\s*"([^"]+)"\}/);
  if (actionMatch) {
    const category = actionMatch[1];
    action = { action: 'recategorize', category };
    // Execute the update
    await supabase.from('transactions').update({
      category,
      category_source: 'user_chat',
      updated_at: new Date().toISOString(),
    }).eq('id', transactionId).eq('user_id', auth.userId);
    // Update vendor memory
    await supabase.from('vendor_category_memory').upsert({
      user_id: auth.userId,
      vendor_key: String(tx.merchant_name || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
      category,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,vendor_key' });
  }

  // Clean reply (remove JSON action line from display text)
  const cleanReply = reply.replace(/\n?\{"action"[^}]+\}/g, '').trim();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply: cleanReply, action }),
  };
};
