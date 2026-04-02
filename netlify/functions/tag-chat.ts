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
  'Savings','Debt Payments','Insurance','Education','Travel','Entertainment',
  'Business Expenses','Needs Review',
];

// Normalize LLM-generated category names to canonical names
const CATEGORY_ALIASES: Record<string, string> = {
  'health & wellness': 'Healthcare',
  'medical': 'Healthcare',
  'health': 'Healthcare',
  'food': 'Food & Dining',
  'dining': 'Food & Dining',
  'restaurants': 'Food & Dining',
  'auto': 'Transportation',
  'automotive': 'Transportation',
  'car': 'Transportation',
  'vehicle': 'Transportation',
  'transit': 'Transportation',
  'rent': 'Housing',
  'home': 'Housing',
  'accommodation': 'Housing',
  'banking': 'Bank Fees',
  'finance charges': 'Bank Fees',
  'loan': 'Debt Payments',
  'debt': 'Debt Payments',
  'liabilities': 'Debt Payments',
  'business': 'Business Expenses',
  'office': 'Business Expenses',
  'salary': 'Income',
  'employment income': 'Income',
  'revenue': 'Income',
  'earnings': 'Income',
  'freelance': 'Income',
  'self employment': 'Income',
  'business income': 'Income',
  'transfer': 'Transfers',
  'moving money': 'Transfers',
  'unknown': 'Needs Review',
  'uncategorized': 'Needs Review',
  'other': 'Needs Review',
  'fun': 'Entertainment',
  'leisure': 'Entertainment',
  'retail': 'Shopping',
  'purchases': 'Shopping',
  'bills': 'Utilities',
  'services': 'Utilities',
  'grocery': 'Groceries',
  'supermarket': 'Groceries',
};

function normalizeCategory(raw: string): string {
  const trimmed = (raw || '').trim();
  const lower = trimmed.toLowerCase();
  return CATEGORY_ALIASES[lower] || trimmed;
}

async function enforceType(sb: any, userId: string, category: string, transactionId?: string): Promise<void> {
  try {
    const { data: typeRule } = await sb.from('category_type_rules').select('forced_type').eq('category', category).single();
    if (!typeRule) return;
    if (transactionId) {
      await sb.from('transactions').update({ type: typeRule.forced_type }).eq('id', transactionId).eq('user_id', userId);
    }
  } catch { /* non-blocking */ }
}

async function enforceTypeBulk(sb: any, userId: string, category: string, merchantPattern: string): Promise<string | null> {
  try {
    const { data: typeRule } = await sb.from('category_type_rules').select('forced_type').eq('category', category).single();
    if (!typeRule) return null;
    await sb.from('transactions').update({ type: typeRule.forced_type }).eq('user_id', userId).ilike('merchant_name', `%${merchantPattern}%`);
    return typeRule.forced_type;
  } catch { return null; }
}

async function callWithRetry(fn: () => Promise<any>, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 25000)),
      ]);
    } catch (err: any) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function getNextNeedsReview(sb: any, userId: string) {
  const { data } = await sb.from('transactions')
    .select('id, merchant_name, amount, date, posted_at')
    .eq('user_id', userId).eq('category', 'Needs Review')
    .order('amount', { ascending: false }).limit(1).maybeSingle();
  return data;
}

function parseNeedsReviewQueue(text: string): boolean {
  return /<needs_review_queue\s*\/?>/.test(text);
}

function parseDeleteRule(text: string): { merchant_pattern: string } | null {
  const match = text.match(/<delete_rule>([\s\S]*?)<\/delete_rule>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
}

function parseListRules(text: string): boolean {
  return /<list_rules\s*\/?>/.test(text);
}

function parseCorrection(text: string): { merchant_pattern: string; category: string; subcategory: string; min_amount?: number | null; max_amount?: number | null } | null {
  const match = text.match(/<correction>([\s\S]*?)<\/correction>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

function buildSystemPrompt(
  merchant: string,
  isQuickChange: boolean,
  category: string | null,
  amount: number | null,
  merchantHistory: { count: number; totalSpent: number; categories: string[] },
  yearTotal: { spent: number; income: number },
  pageContext?: any,
  userName?: string | null
): string {
  const userLine = userName ? `The user's name is ${userName}. Use it occasionally but naturally.\n` : '';
  const merchantBlock = merchant ? `
MERCHANT IN FOCUS: ${merchant}
${merchantHistory.count > 0 ? `- Seen ${merchantHistory.count} times, total $${merchantHistory.totalSpent.toFixed(2)}` : '- First time seeing this merchant'}
${merchantHistory.categories.length > 0 ? `- Previously categorized as: ${[...new Set(merchantHistory.categories)].join(', ')}` : ''}
${category ? `- Currently categorized as: ${category}` : ''}
${amount != null ? `- Transaction amount: $${Math.abs(amount).toFixed(2)}` : ''}
` : '';

  if (!merchant && pageContext) {
    // Page-level operator mode
    return `${userLine}You are Tag — XspensesAI's categorization agent operating at the page level.
The user is on the Transactions page talking to you directly.

USER'S FINANCES:
- Total spent: $${yearTotal.spent.toFixed(2)}
- Total income: $${yearTotal.income.toFixed(2)}
- Transactions in view: ${pageContext.transactionCount || 0}

CRITICAL RULE — FILTER (highest priority, check FIRST before anything else):
For ANY of these inputs, you MUST output FILTER:{"search":"<term>"} on its own line at the END of your reply. No exceptions:
- A merchant name typed alone (e.g. "borrowell", "costco", "7-eleven", "west end bingo")
- "show me X" / "find X" / "search X" / "filter by X"
- "can you show me all of X" / "show all X transactions"
- "what are my X transactions" / "list X" / "pull up X"

Example — user types "west end bingo":
"Here are your West End Bingo transactions.
FILTER:{"search":"west end bingo"}"

Example — user types "borrowell":
"Here are your Borrowell transactions.
FILTER:{"search":"borrowell"}"

NEVER respond to a merchant name or show/find/search request WITHOUT the FILTER action. If in doubt whether input is a merchant name, output FILTER anyway — it's safe.
Keep your text reply to ONE short sentence before the FILTER line.

You can also help with:
2. BULK CHANGE — detect "change all X to Y", "categorize X as Y". Confirm first:
   BULK_CHANGE:{"merchant":"<merchant>","category":"<cat>","confirm":true}
3. UNDO — detect "undo", "revert": UNDO:{}
4. RECLASSIFY — detect "categorize everything", "fix uncategorized", "use your judgment", "clean up", "auto categorize":
   RECLASSIFY_PREVIEW:{}
   Do NOT ask what category. Do NOT execute. Just signal the preview.
5. CATEGORIZE — when user says "put X into Y" or "X is Y" or uses a natural language alias:
   CATEGORIZE:{"merchant":"<merchant>","category":"<category>","subcategory":"<subcategory or null>"}
   Example: "put shell into fuel" → CATEGORIZE:{"merchant":"shell","category":"Transportation","subcategory":"Gas & Fuel"}
6. QUESTIONS — answer naturally about spending, no action JSON

NATURAL LANGUAGE ALIASES — map these words to category/subcategory:
"fuel"/"gas"/"petro"/"esso"/"gas station" → Transportation / Gas & Fuel
"parking" → Transportation / Parking
"transit"/"bus"/"train" → Transportation / Transit
"uber"/"lyft"/"rideshare" → Transportation / Rideshare
"groceries"/"supermarket" → Groceries
"coffee"/"tim hortons"/"starbucks" → Food & Dining / Coffee & Drinks
"restaurant"/"dining"/"lunch"/"dinner" → Food & Dining / Restaurants
"fast food"/"takeout" → Food & Dining / Fast Food
"haircut"/"salon"/"barber" → Personal Care / Hair & Beauty
"massage"/"spa" → Personal Care / Massage & Wellness
"gym"/"fitness" → Personal Care / Gym & Fitness
"dentist"/"dental" → Healthcare / Dental
"chiro" → Healthcare / Chiropractic
"pharmacy"/"shoppers" → Healthcare / Pharmacy
"netflix"/"spotify"/"streaming" → Subscriptions / Streaming
"software"/"cursor"/"openai" → Subscriptions / Software & AI
"bank fee"/"service charge" → Bank Fees / Banking
"loan payment" → Debt Payments / Loan Payment
"golf" → Entertainment / Golf
"casino"/"bingo" → Entertainment / Gaming & Lottery
"income"/"paycheck"/"deposit" → Income / Employment
"government"/"cra"/"rebate" → Income / Government Rebate

Rules:
- Always confirm before bulk changes
- Keep replies to 1-2 sentences max
- Be direct and action-oriented
- Use ONLY these exact category names: ${CATEGORIES.join(', ')}. NEVER invent category names not on this list. If unsure, use "Needs Review".
- When user types just a merchant name with no other context, treat it as a FILTER
- When user says "put X into Y" or "X is Y", use CATEGORIZE with the alias mapping
- For reclassify: never ask what category — Tag figures it out

IMPORTANT: Only output action JSON for actionable commands, never for questions about amounts or spending patterns.

CORRECTION HANDLING: When the user tells you a merchant is wrong, miscategorized, or gives you a correction (e.g. "TD LOAN is a car payment", "that should be Vehicle", "change X to Y", "7-ELEVEN over $30 is fuel"), respond with a <correction> JSON block BEFORE your natural language reply:
<correction>
{"merchant_pattern":"EXACT MERCHANT NAME","category":"Corrected Category","subcategory":"Corrected Subcategory or null","min_amount":null,"max_amount":null}
</correction>
Then confirm the change naturally. For amount-based rules (e.g. "over $30", "under $20", "between $5 and $15"), set min_amount and/or max_amount. Use null for no threshold. Always confirm the amount threshold in your reply.

SUBCATEGORIES: If the user asks about subcategories, tell them: "Open any transaction drawer and you'll see a subcategory dropdown below the category. You can pick from built-in options or select '+ Add new...' to create your own."

RULE MANAGEMENT: You can manage category rules.
- When asked to list/show rules: output <list_rules/> then say "Let me pull up your rules."
- When asked to delete a rule: output <delete_rule>{"merchant_pattern":"X"}</delete_rule> then confirm deletion.
- When asked to update a rule: output a <correction> block as normal.

NEEDS REVIEW QUEUE: When user says "what needs review", "show uncategorized", "start queue", or "next": output <needs_review_queue/> and the server will fetch the next transaction for you to ask about.

Always confirm actions taken.`;


  }

  if (isQuickChange) {
    return `${userLine}You are Tag, XspensesAI's categorization agent.

The user just changed merchant "${merchant}" (${amount != null ? '$' + Math.abs(amount).toFixed(2) : 'unknown amount'}) to category "${category}".
Do NOT just confirm the change. Ask ONE short question to understand what this purchase actually was, so you can help build a smart rule. Examples:
- "Got it — was this a gas fill-up or something else?"
- "Makes sense — coffee run or snacks?"
- "Quick one — what was the $${amount != null ? Math.abs(amount).toFixed(2) : '?'} at ${merchant}?"
Be casual, 1 sentence max. Do not offer to save a rule yet.`;
  }

  return `${userLine}You are Tag, XspensesAI's categorization agent. You are having a conversation about merchant "${merchant}".
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
7. Use ONLY these exact category names: ${CATEGORIES.join(', ')}. NEVER invent names not on this list.
${pageContext ? `\nPAGE CONTEXT:\n- Total spent: $${pageContext.totalSpent?.toFixed(2) || '0'}\n- Total income: $${pageContext.totalIncome?.toFixed(2) || '0'}\n- Transactions in view: ${pageContext.transactionCount || 0}` : ''}

IMPORTANT: Only output SAVE_RULE when the user has explicitly confirmed they want a rule saved. Never output it for questions or explanations.

CORRECTION HANDLING: When the user tells you a merchant is wrong, miscategorized, or gives you a correction (e.g. "TD LOAN is a car payment", "that should be Vehicle", "change X to Y", "7-ELEVEN over $30 is fuel"), respond with a <correction> JSON block BEFORE your natural language reply:
<correction>
{"merchant_pattern":"EXACT MERCHANT NAME","category":"Corrected Category","subcategory":"Corrected Subcategory or null","min_amount":null,"max_amount":null}
</correction>
Then confirm the change naturally. For amount-based rules (e.g. "over $30", "under $20", "between $5 and $15"), set min_amount and/or max_amount. Use null for no threshold. Always confirm the amount threshold in your reply.

SUBCATEGORIES: If the user asks about subcategories, tell them: "Open any transaction drawer and you'll see a subcategory dropdown below the category. You can pick from built-in options or select '+ Add new...' to create your own."

RULE MANAGEMENT: You can manage category rules.
- When asked to list/show rules: output <list_rules/> then say "Let me pull up your rules."
- When asked to delete a rule: output <delete_rule>{"merchant_pattern":"X"}</delete_rule> then confirm deletion.
- When asked to update a rule: output a <correction> block as normal.

NEEDS REVIEW QUEUE: When user says "what needs review", "show uncategorized", "start queue", or "next": output <needs_review_queue/> and the server will fetch the next transaction for you to ask about.

Always confirm actions taken.`;

}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {

  const body = JSON.parse(event.body || '{}');
  const { transactionId, message, history = [], pageContext, merchant: bodyMerchant, category: bodyCategory, amount: bodyAmount, context: bodyContext } = body;

  if (!message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };
  }

  const supabase = serverSupabase();
  const isQuickChange = message === '__system_category_changed__' && bodyContext === 'quick_change';
  const isPageContext = bodyContext === 'page';

  // Fetch user name for personalized responses
  let userName: string | null = null;
  try {
    const { data: profile } = await supabase.from('profiles').select('full_name, first_name').eq('id', auth.userId).single();
    userName = profile?.first_name || profile?.full_name?.split(' ')[0] || null;
  } catch { /* non-blocking */ }

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
    merchantHistory, { spent: yearSpent, income: yearIncome }, pageContext, userName
  );

  // 6. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await callWithRetry(() => openai.chat.completions.create({
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
  }));

  let reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';

  // Handle correction intent — user told Tag a merchant is miscategorized
  const correction = parseCorrection(reply);
  if (correction) {
    const { merchant_pattern, min_amount, max_amount } = correction;
    const category = normalizeCategory(correction.category);
    const subcategory = correction.subcategory?.trim() || null;
    try {
      // Upsert into category_rules (amount-specific rules use INSERT to avoid conflict with no-amount rules)
      const rulePayload: Record<string, any> = {
        user_id: auth.userId,
        merchant_pattern: merchant_pattern.toUpperCase(),
        match_value: merchant_pattern.toUpperCase(),
        category,
        subcategory: subcategory || null,
        match_type: 'contains',
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (min_amount != null) rulePayload.min_amount = min_amount;
      if (max_amount != null) rulePayload.max_amount = max_amount;

      if (min_amount != null || max_amount != null) {
        // Amount-specific rule — insert (may create a second rule for same merchant)
        await supabase.from('category_rules').insert(rulePayload);
      } else {
        await supabase.from('category_rules').upsert(rulePayload, { onConflict: 'user_id,match_type,match_value' });
      }
      const amountNote = min_amount != null || max_amount != null ? ` (${min_amount != null ? '>=$' + min_amount : ''}${min_amount != null && max_amount != null ? ', ' : ''}${max_amount != null ? '<$' + max_amount : ''})` : '';
      console.log(`[tag-chat] Correction rule saved: ${merchant_pattern} → ${category}${subcategory ? ' / ' + subcategory : ''}${amountNote}`);

      // Backfill existing transactions
      const updatePayload: Record<string, any> = {
        category,
        category_source: 'user_correction',
        updated_at: new Date().toISOString(),
      };
      if (subcategory) {
        updatePayload.subcategory = subcategory;
        updatePayload.subcategory_source = 'user_correction';
      }
      let backfillQ = supabase
        .from('transactions')
        .update(updatePayload)
        .eq('user_id', auth.userId)
        .ilike('merchant_name', `%${merchant_pattern}%`);
      // Apply amount threshold if this is an amount-specific correction
      if (min_amount != null) backfillQ = backfillQ.gte('amount', min_amount);
      if (max_amount != null) backfillQ = backfillQ.lt('amount', max_amount);
      const { count } = await backfillQ.select('id', { count: 'exact', head: true });
      console.log(`[tag-chat] Backfilled ${count || 0} transactions for ${merchant_pattern}${min_amount != null || max_amount != null ? ` (amount filtered)` : ''}`);

      // Enforce type from category_type_rules
      await enforceTypeBulk(supabase, auth.userId, category, merchant_pattern);
    } catch (err: any) {
      console.error('[tag-chat] Correction handling error:', err.message);
    }

    // Strip the <correction> block from the response sent to the user
    reply = reply.replace(/<correction>[\s\S]*?<\/correction>/g, '').trim();

    // Mark any existing feedback as applied
    try {
      await supabase.from('tag_category_feedback')
        .update({ applied_at: new Date().toISOString() })
        .eq('user_id', auth.userId)
        .eq('merchant_pattern', correction.merchant_pattern)
        .is('applied_at', null);
    } catch { /* table/column may not exist */ }
  }

  // Handle delete_rule intent
  const deletion = parseDeleteRule(reply);
  if (deletion) {
    try {
      await supabase.from('category_rules').delete()
        .eq('user_id', auth.userId)
        .ilike('merchant_pattern', deletion.merchant_pattern);
      console.log(`[tag-chat] Deleted rules for: ${deletion.merchant_pattern}`);
    } catch (err: any) {
      console.error('[tag-chat] Delete rule error:', err.message);
    }
    reply = reply.replace(/<delete_rule>[\s\S]*?<\/delete_rule>/g, '').trim();
  }

  // Handle list_rules intent
  if (parseListRules(reply)) {
    try {
      const { data: rules } = await supabase.from('category_rules')
        .select('merchant_pattern, category, subcategory, min_amount, max_amount')
        .eq('user_id', auth.userId)
        .eq('is_active', true)
        .order('merchant_pattern');
      if (rules && rules.length > 0) {
        const ruleList = rules.map((r: any) => {
          let line = `${r.merchant_pattern} → ${r.category}${r.subcategory ? ' / ' + r.subcategory : ''}`;
          if (r.min_amount != null) line += ` (≥$${r.min_amount})`;
          if (r.max_amount != null) line += ` (<$${r.max_amount})`;
          return line;
        }).join('\n');
        reply = reply.replace(/<list_rules\s*\/?>/g, '').trim();
        reply = `Here are your ${rules.length} category rules:\n\n${ruleList}\n\n${reply}`;
      } else {
        reply = reply.replace(/<list_rules\s*\/?>/g, '').trim();
        reply = `You don't have any saved category rules yet. ${reply}`;
      }
    } catch {
      reply = reply.replace(/<list_rules\s*\/?>/g, '').trim();
    }
  }

  // Handle needs_review_queue intent
  if (parseNeedsReviewQueue(reply)) {
    const next = await getNextNeedsReview(supabase, auth.userId);
    reply = reply.replace(/<needs_review_queue\s*\/?>/g, '').trim();
    if (next) {
      const amt = Math.abs(Number(next.amount || 0)).toFixed(2);
      const date = next.date || next.posted_at?.split('T')[0] || 'unknown date';
      reply = `Next up: **${next.merchant_name}** — $${amt} on ${date}. What category should this be?`;
    } else {
      reply = 'All transactions are categorized! Nothing left in the queue.';
    }
  }

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
      ruleData.category = normalizeCategory(ruleData.category || '');
      const pattern = String(ruleData.merchant_pattern || merchantName).toUpperCase();

      // 7a. Save rule (INSERT for amount-specific, upsert for generic)
      const ruleRow: Record<string, any> = {
        user_id: auth.userId,
        match_value: pattern,
        merchant_pattern: pattern,
        category: ruleData.category,
        match_type: ruleData.match_type || 'exact',
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (ruleData.amount_min != null) ruleRow.min_amount = ruleData.amount_min;
      if (ruleData.amount_max != null) ruleRow.max_amount = ruleData.amount_max;
      if (ruleData.amount_min != null || ruleData.amount_max != null) {
        await supabase.from('category_rules').insert(ruleRow);
      } else {
        await supabase.from('category_rules').upsert(ruleRow, { onConflict: 'user_id,match_type,match_value' });
      }

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

      // 7c2. Enforce type from category_type_rules
      await enforceTypeBulk(supabase, auth.userId, ruleData.category, pattern);

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
    const category = normalizeCategory(actionMatch[1]);
    action = { action: 'recategorize', category };
    if (transactionId) {
      await supabase.from('transactions').update({
        category, category_source: 'user_chat', updated_at: new Date().toISOString(),
      }).eq('id', transactionId).eq('user_id', auth.userId);
      // Enforce type
      await enforceType(supabase, auth.userId, category, transactionId);
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

  } catch (handlerErr: any) {
    console.error('[tag-chat] Handler error:', handlerErr.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: "Sorry, I'm having trouble right now. Try again in a moment.", action: null, rule_saved: false, backfill_count: 0 }),
    };
  }
};
