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
  merchant: string,
  isQuickChange: boolean,
  category: string | null,
  amount: number | null,
  merchantHistory: { count: number; totalSpent: number; categories: string[] },
  yearTotal: { spent: number; income: number },
  pageContext?: any
): string {
  const merchantBlock = merchant ? `
MERCHANT IN FOCUS: ${merchant}
${merchantHistory.count > 0 ? `- Seen ${merchantHistory.count} times, total $${merchantHistory.totalSpent.toFixed(2)}` : '- First time seeing this merchant'}
${merchantHistory.categories.length > 0 ? `- Previously categorized as: ${[...new Set(merchantHistory.categories)].join(', ')}` : ''}
${category ? `- Currently categorized as: ${category}` : ''}
${amount != null ? `- Transaction amount: $${Math.abs(amount).toFixed(2)}` : ''}
` : '';

  if (!merchant && pageContext) {
    // Page-level operator mode
    return `You are Tag — XspensesAI's categorization agent operating at the page level.
The user is on the Transactions page talking to you directly.

USER'S FINANCES:
- Total spent: $${yearTotal.spent.toFixed(2)}
- Total income: $${yearTotal.income.toFixed(2)}
- Transactions in view: ${pageContext.transactionCount || 0}

You can help with:
1. FILTER — detect ANY filter/search/find intent. Triggers include:
   - "show me X", "find X", "search for X", "filter by X"
   - Just a merchant name alone like "borrowell", "costco", "shell"
   - "what are my X transactions", "list X", "pull up X"
   Always return: FILTER:{"search":"<the merchant or search term>"}
   Keep your text reply to ONE short sentence before the action.
   Example: "Here are your Borrowell transactions. FILTER:{"search":"borrowell"}"
2. BULK CHANGE — detect "change all X to Y", "categorize X as Y". Confirm first:
   BULK_CHANGE:{"merchant":"<merchant>","category":"<cat>","confirm":true}
3. UNDO — detect "undo", "revert": UNDO:{}
4. RECLASSIFY — detect "categorize everything", "fix uncategorized", "use your judgment", "clean up", "auto categorize":
   RECLASSIFY_PREVIEW:{}
   Do NOT ask what category. Do NOT execute. Just signal the preview.
5. QUESTIONS — answer naturally about spending, no action JSON

Rules:
- Always confirm before bulk changes
- Keep replies to 1-2 sentences max
- Be direct and action-oriented
- Use only these categories: ${CATEGORIES.join(', ')}
- When user types just a merchant name with no other context, treat it as a FILTER
- For reclassify: never ask what category — Tag figures it out

IMPORTANT: Only output action JSON for actionable commands, never for questions about amounts or spending patterns.

SUBCATEGORIES: If the user asks about subcategories, tell them: "Open any transaction drawer and you'll see a subcategory dropdown below the category. You can pick from built-in options or select '+ Add new...' to create your own."`;

  }

  if (isQuickChange) {
    return `You are Tag, XspensesAI's categorization agent.

The user just changed merchant "${merchant}" (${amount != null ? '$' + Math.abs(amount).toFixed(2) : 'unknown amount'}) to category "${category}".
Do NOT just confirm the change. Ask ONE short question to understand what this purchase actually was, so you can help build a smart rule. Examples:
- "Got it — was this a gas fill-up or something else?"
- "Makes sense — coffee run or snacks?"
- "Quick one — what was the $${amount != null ? Math.abs(amount).toFixed(2) : '?'} at ${merchant}?"
Be casual, 1 sentence max. Do not offer to save a rule yet.`;
  }

  return `You are Tag, XspensesAI's categorization agent. You are having a conversation about merchant "${merchant}".
${merchantBlock}
USER'S OVERALL FINANCES (this year):
- Total spent: $${yearTotal.spent.toFixed(2)}
- Total income: $${yearTotal.income.toFixed(2)}

Conversation rules:
1. If the user tells you the category directly (e.g. "Food & Dining", "Transportation"), accept it immediately — do NOT ask to confirm again. Just save it.
2. If the user's intent is unclear, ask ONE clarifying question.
3. When the user has stated or confirmed a category, end your message with this exact text on its own line:
   SAVE_RULE:{"merchant_pattern":"${merchant}","category":"<category>","match_type":"exact","amount_min":null,"amount_max":null}
4. If the user says no or skip, just acknowledge and close naturally.
5. NEVER double-confirm. One question max. If they said "Food & Dining" that IS the confirmation.
6. Keep all replies to 1-2 sentences max.
7. Use only these categories: ${CATEGORIES.join(', ')}
${pageContext ? `\nPAGE CONTEXT:\n- Total spent: $${pageContext.totalSpent?.toFixed(2) || '0'}\n- Total income: $${pageContext.totalIncome?.toFixed(2) || '0'}\n- Transactions in view: ${pageContext.transactionCount || 0}` : ''}

IMPORTANT: Only output SAVE_RULE when the user has explicitly confirmed they want a rule saved. Never output it for questions or explanations.

SUBCATEGORIES: If the user asks about subcategories, tell them: "Open any transaction drawer and you'll see a subcategory dropdown below the category. You can pick from built-in options or select '+ Add new...' to create your own."`;

}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const body = JSON.parse(event.body || '{}');
  const { transactionId, message, history = [], pageContext, merchant: bodyMerchant, category: bodyCategory, amount: bodyAmount, context: bodyContext } = body;

  if (!message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };
  }

  const supabase = serverSupabase();
  const isQuickChange = message === '__system_category_changed__' && bodyContext === 'quick_change';
  const isPageContext = bodyContext === 'page';

  // 1. Resolve merchant name
  let merchantName = bodyMerchant || '';
  let tx: Record<string, unknown> | null = null;
  if (transactionId) {
    const { data: txData } = await supabase
      .from('transactions')
      .select('id, merchant_name, amount, posted_at, date, category, import_id')
      .eq('id', transactionId)
      .eq('user_id', auth.userId)
      .single();
    if (txData) { tx = txData as Record<string, unknown>; merchantName = merchantName || String(txData.merchant_name || ''); }
  }

  // 2. Load conversation history from tag_conversations
  const conversationKey = merchantName || (isPageContext ? '__page__' : '');
  let persistedHistory: Array<{ role: string; content: string; ts: number }> = [];
  if (conversationKey) {
    try {
      const { data: conv } = await supabase
        .from('tag_conversations')
        .select('messages')
        .eq('user_id', auth.userId)
        .eq('merchant_name', conversationKey)
        .maybeSingle();
      persistedHistory = conv?.messages ?? [];
    } catch { /* table may not exist */ }
  }

  // Merge: use persisted history if no frontend history provided
  const effectiveHistory = history.length > 0 ? history : persistedHistory.map((m: any) => ({ role: m.role, content: m.content }));

  // 3. Fetch merchant history
  const merchantLower = merchantName.toLowerCase().trim();
  let merchantHistory = { count: 0, totalSpent: 0, categories: [] as string[] };
  if (merchantLower) {
    const { data: merchantTxs } = await supabase
      .from('transactions')
      .select('amount, category, posted_at')
      .eq('user_id', auth.userId)
      .ilike('merchant_name', `%${merchantLower}%`)
      .order('posted_at', { ascending: false })
      .limit(50);
    merchantHistory = {
      count: merchantTxs?.length || 0,
      totalSpent: merchantTxs?.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0) || 0,
      categories: (merchantTxs?.map(t => t.category).filter(Boolean) as string[]) || [],
    };
  }

  // 4. Year totals
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', auth.userId)
    .gte('posted_at', yearStart)
    .limit(600);
  let yearSpent = 0, yearIncome = 0;
  for (const t of allTxs || []) {
    const amt = Math.abs(Number(t.amount || 0));
    if ((t.category || '').toLowerCase() === 'income') yearIncome += amt; else yearSpent += amt;
  }

  // 5. Build messages for LLM
  const userMessage = isQuickChange
    ? `I just changed ${merchantName} to ${bodyCategory}.`
    : message;

  const systemPrompt = buildSystemPrompt(
    merchantName, isQuickChange, bodyCategory || (tx as any)?.category || null,
    bodyAmount ?? (tx as any)?.amount ?? null,
    merchantHistory, { spent: yearSpent, income: yearIncome }, pageContext
  );

  // 6. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 350,
    messages: [
      { role: 'system', content: systemPrompt },
      ...effectiveHistory.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ],
  });

  let reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';

  /*
   * SQL RPC required for staging backfill — run in Supabase SQL editor:
   *
   * create or replace function backfill_staging_category(
   *   p_user_id uuid,
   *   p_merchant_pattern text,
   *   p_category text
   * ) returns int language plpgsql security definer as $$
   * declare
   *   updated_count int;
   * begin
   *   update transactions_staging
   *   set data_json = jsonb_set(
   *     jsonb_set(data_json, '{category}', to_jsonb(p_category)),
   *     '{category_source}', '"tag_rule"'
   *   )
   *   where user_id = p_user_id::text
   *     and (data_json->>'merchant' ilike '%' || p_merchant_pattern || '%'
   *       or data_json->>'description' ilike '%' || p_merchant_pattern || '%')
   *     and data_json->>'category_source' is distinct from 'user_override';
   *   get diagnostics updated_count = row_count;
   *   return updated_count;
   * end;
   * $$;
   */

  // 7. Detect SAVE_RULE: in response
  let ruleSaved = false;
  let backfillCount = 0;
  const ruleMatch = reply.match(/SAVE_RULE:\s*(\{[^}]+\})/);
  if (ruleMatch) {
    try {
      const ruleData = JSON.parse(ruleMatch[1]);
      const pattern = String(ruleData.merchant_pattern || merchantName).toUpperCase();

      // 7a. Upsert rule
      await supabase.from('category_rules').upsert({
        user_id: auth.userId,
        match_value: pattern,
        category: ruleData.category,
        match_type: ruleData.match_type || 'exact',
        amount_min: ruleData.amount_min ?? null,
        amount_max: ruleData.amount_max ?? null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,match_type,match_value' });

      // 7b. Write vendor memory
      await supabase.from('vendor_category_memory').upsert({
        user_id: auth.userId,
        vendor_key: pattern.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
        category: ruleData.category,
        source: 'tag_conversation',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,vendor_key' });

      // 7c. Backfill committed transactions
      let backfillQuery = supabase
        .from('transactions')
        .update({
          category: ruleData.category,
          category_source: 'tag_rule',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', auth.userId)
        .ilike('merchant_name', `%${pattern}%`)
        .not('category_source', 'eq', 'user_override');

      if (ruleData.amount_min != null) {
        backfillQuery = backfillQuery.gte('amount', ruleData.amount_min);
      }
      if (ruleData.amount_max != null) {
        backfillQuery = backfillQuery.lte('amount', ruleData.amount_max);
      }

      const { data: backfilled } = await backfillQuery.select('id');
      backfillCount = backfilled?.length ?? 0;

      // 7d. Backfill staging transactions (RPC — may not exist yet)
      try {
        await supabase.rpc('backfill_staging_category', {
          p_user_id: auth.userId,
          p_match_value: pattern,
          p_category: ruleData.category,
        });
      } catch { /* RPC may not exist yet — skip */ }

      ruleSaved = true;
    } catch { /* ignore parse errors */ }
    // Strip SAVE_RULE from reply
    reply = reply.replace(/\n?SAVE_RULE:\s*\{[^}]+\}/g, '').trim();
  }

  // 8. Legacy recategorize action support
  let action: { action: string; category: string } | null = null;
  const actionMatch = reply.match(/\{"action"\s*:\s*"recategorize"\s*,\s*"category"\s*:\s*"([^"]+)"\}/);
  if (actionMatch) {
    const category = actionMatch[1];
    action = { action: 'recategorize', category };
    if (transactionId) {
      await supabase.from('transactions').update({
        category, category_source: 'user_chat', updated_at: new Date().toISOString(),
      }).eq('id', transactionId).eq('user_id', auth.userId);
    }
    reply = reply.replace(/\n?\{"action"[^}]+\}/g, '').trim();
  }

  // 9. Save conversation to tag_conversations
  if (conversationKey) {
    try {
      const newMessages = [
        ...persistedHistory,
        { role: 'user', content: userMessage, ts: Date.now() },
        { role: 'assistant', content: reply, ts: Date.now() },
      ].slice(-30); // cap at 30 messages

      await supabase.from('tag_conversations').upsert({
        user_id: auth.userId,
        merchant_name: conversationKey,
        messages: newMessages,
        last_active: new Date().toISOString(),
      }, { onConflict: 'user_id,merchant_name' });
    } catch { /* table may not exist */ }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply, action, rule_saved: ruleSaved, backfill_count: backfillCount, history: persistedHistory }),
  };
};
