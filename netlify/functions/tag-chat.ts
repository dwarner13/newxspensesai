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

function buildSystemPrompt(
  tx: Record<string, unknown>,
  merchantHistory: { count: number; totalSpent: number; categories: string[]; lastSeen: string },
  topCategories: { category: string; total: number }[],
  yearTotal: { spent: number; income: number }
): string {
  const merchantCatList = [...new Set(merchantHistory.categories)].join(', ') || 'none yet';
  const topCatList = topCategories.slice(0, 5).map(c => `${c.category} $${c.total.toFixed(0)}`).join(', ');

  const hasTransaction = Boolean(tx && (tx as any).merchant_name);
  const transactionBlock = hasTransaction ? `
TRANSACTION IN FOCUS:
- Merchant: ${(tx as any).merchant_name || 'Unknown'}
- Amount: $${Math.abs(Number((tx as any).amount || 0)).toFixed(2)}
- Date: ${String((tx as any).posted_at || (tx as any).date || 'Unknown').slice(0, 10)}
- Current category: ${(tx as any).category || 'Uncategorized'}

MERCHANT HISTORY (this user + this merchant):
- Times seen: ${merchantHistory.count}
- Total spent: $${merchantHistory.totalSpent.toFixed(2)}
- Previously categorized as: ${merchantCatList}
- Last seen: ${merchantHistory.lastSeen || 'first time'}
` : `
MODE: General financial question (no specific transaction selected).
Answer using the user's overall financial data below. Be helpful and specific.
`;

  return `You are Tag -- XspensesAI's categorization and spending expert. You speak directly to the user in first person. You have full context about their finances.
${transactionBlock}
USER'S OVERALL FINANCES (this year):
- Total spent: $${yearTotal.spent.toFixed(2)}
- Total income: $${yearTotal.income.toFixed(2)}
- Top spending categories: ${topCatList}

YOUR JOB:
- Answer questions about transactions and spending naturally and helpfully
- If a transaction is in focus, use merchant history to explain your confidence
- For general questions, use the overall finance data to give specific answers
- Suggest better categories if the user thinks one is wrong
- If asked about tax deductibility, give a practical Canadian self-employed perspective
- If the user wants to change the category, confirm what they want and end your reply with exactly this JSON on its own line: {"action":"recategorize","category":"CATEGORY_NAME"}
- Use only these categories: ${CATEGORIES.join(', ')}
- Be concise -- 2-4 sentences unless explaining something complex
- You have Tag's personality: detective-like, precise, a little witty, always helpful

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

  // 1. Fetch the transaction (optional - general mode if no transactionId)
  let tx: Record<string, unknown> | null = null;
  if (transactionId) {
    const { data: txData, error: txErr } = await supabase
      .from("transactions")
      .select("id, merchant_name, amount, posted_at, date, category, import_id")
      .eq("id", transactionId)
      .eq("user_id", auth.userId)
      .single();
    if (!txErr && txData) tx = txData as Record<string, unknown>;
  }

  // 2. Fetch merchant history for this user
  const merchantName = String((tx as any)?.merchant_name || '').toLowerCase().trim();
  let merchantHistory = { count: 0, totalSpent: 0, categories: [] as string[], lastSeen: '' };
  if (merchantName) {
    const { data: merchantTxs } = await supabase
      .from('transactions')
      .select('amount, category, posted_at')
      .eq('user_id', auth.userId)
      .ilike('merchant_name', `%${merchantName}%`)
      .order('posted_at', { ascending: false })
      .limit(50);
    merchantHistory = {
      count: merchantTxs?.length || 0,
      totalSpent: merchantTxs?.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) || 0,
      categories: merchantTxs?.map(t => t.category).filter(Boolean) as string[] || [],
      lastSeen: merchantTxs?.[1]?.posted_at?.slice(0, 10) || '',
    };
  }

  // 3. Fetch top spending categories this year
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', auth.userId)
    .gte('posted_at', yearStart);

  const catMap: Record<string, number> = {};
  let yearSpent = 0;
  let yearIncome = 0;
  for (const t of allTxs || []) {
    const amt = Math.abs(Number(t.amount || 0));
    const cat = t.category || 'Other';
    if (cat === 'Income') { yearIncome += amt; continue; }
    yearSpent += amt;
    catMap[cat] = (catMap[cat] || 0) + amt;
  }
  const topCategories = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, total]) => ({ category, total }));

  // 4. Call OpenAI with full context
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 350,
    messages: [
      { role: 'system', content: buildSystemPrompt(
        tx ?? {},
        merchantHistory,
        topCategories,
        { spent: yearSpent, income: yearIncome }
      )},
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ],
  });

  const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';

  // 5. Parse and execute recategorize action
  let action: { action: string; category: string } | null = null;
  const actionMatch = reply.match(/\{"action"\s*:\s*"recategorize"\s*,\s*"category"\s*:\s*"([^"]+)"\}/);
  if (actionMatch) {
    const category = actionMatch[1];
    action = { action: 'recategorize', category };
    await supabase.from('transactions').update({
      category,
      category_source: 'user_chat',
      updated_at: new Date().toISOString(),
    }).eq('id', transactionId).eq('user_id', auth.userId);

    await supabase.from('vendor_category_memory').upsert({
      user_id: auth.userId,
      vendor_key: merchantName.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
      category,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,vendor_key' });
  }

  const cleanReply = reply.replace(/\n?\{"action"[^}]+\}/g, '').trim();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply: cleanReply, action }),
  };
};


