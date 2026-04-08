import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { getLearnedCategoryForTransaction } from './_shared/tag-learning.js';

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

function parseMerchantSweep(text: string): boolean {
  return /<merchant_sweep\s*\/?>/.test(text);
}

function parseSessionClose(text: string): boolean {
  return /SESSION_CLOSE/i.test(text);
}

function extractSearchIntent(message: string): {
  isSearch: boolean;
  merchant?: string;
  category?: string;
  subcategory?: string;
  type?: 'expense' | 'income' | 'all';
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
} {
  const msg = message.toLowerCase().trim();
  const isSearch = (
    /^(show|find|search|filter|get|pull up|display|list|look up)[\s\w]/i.test(message) ||
    /\b(transactions|charges|purchases|expenses|spending|spend)\b/i.test(message) ||
    /^[a-z0-9 &'.-]{2,35}$/i.test(message.trim())
  ) && !/\b(change|move|update|fix|set|categorize|bulk|undo|revert|rule|save)\b/i.test(msg);

  if (!isSearch) return { isSearch: false };

  // "at <merchant>" pattern  - "how much did I spend at 7-Eleven?"
  const atMerchantMatch = message.match(/\bat\s+([a-z0-9][a-z0-9 &'.-]{1,30}?)(?:\?|\s*$)/i);
  const merchantMatch = message.match(
    /(?:show|find|search|filter|get|list)?\s*(?:me\s+)?(?:my\s+)?(?:all\s+)?([a-z0-9 &'.-]+?)(?:\s+transactions?|\s+charges?|\s+purchases?)?$/i
  );
  const rawMerchant = (atMerchantMatch?.[1] || merchantMatch?.[1] || '').trim();

  // Category + subcategory alias map. Values: [category, subcategory?]
  const CATEGORY_TERMS: Record<string, [string, string?]> = {
    // Top-level categories
    'groceries': ['Groceries'], 'grocery': ['Groceries'], 'supermarket': ['Groceries'],
    'food': ['Food & Dining'], 'dining': ['Food & Dining'], 'restaurant': ['Food & Dining', 'Restaurants'],
    'restaurants': ['Food & Dining', 'Restaurants'],
    'transportation': ['Transportation'], 'transport': ['Transportation'],
    'personal care': ['Personal Care'], 'healthcare': ['Healthcare'], 'shopping': ['Shopping'],
    'subscriptions': ['Subscriptions'], 'entertainment': ['Entertainment'], 'housing': ['Housing'],
    'utilities': ['Utilities'], 'insurance': ['Insurance'], 'travel': ['Travel'],
    'education': ['Education'], 'bank fees': ['Bank Fees'], 'income': ['Income'],
    'uncategorized': ['Uncategorized'], 'needs review': ['Needs Review'],
    // Transportation subcategories
    'gas & fuel': ['Transportation', 'Gas & Fuel'],
    'gas and fuel': ['Transportation', 'Gas & Fuel'],
    'fuel': ['Transportation', 'Gas & Fuel'],
    'gas': ['Transportation', 'Gas & Fuel'],
    'gas station': ['Transportation', 'Gas & Fuel'],
    'parking': ['Transportation', 'Parking'],
    'transit': ['Transportation', 'Transit'],
    'bus': ['Transportation', 'Transit'],
    'train': ['Transportation', 'Transit'],
    'rideshare': ['Transportation', 'Rideshare'],
    'uber': ['Transportation', 'Rideshare'],
    'lyft': ['Transportation', 'Rideshare'],
    'vehicle maintenance': ['Transportation', 'Vehicle Maintenance'],
    'oil change': ['Transportation', 'Vehicle Maintenance'],
    'car repair': ['Transportation', 'Vehicle Maintenance'],
    'repairs': ['Transportation', 'Vehicle Maintenance'],
    // Food & Dining subcategories
    'coffee & drinks': ['Food & Dining', 'Coffee & Drinks'],
    'coffee': ['Food & Dining', 'Coffee & Drinks'],
    'fast food': ['Food & Dining', 'Fast Food'],
    'takeout': ['Food & Dining', 'Fast Food'],
    // Personal Care subcategories
    'hair & beauty': ['Personal Care', 'Hair & Beauty'],
    'haircut': ['Personal Care', 'Hair & Beauty'],
    'salon': ['Personal Care', 'Hair & Beauty'],
    'barber': ['Personal Care', 'Hair & Beauty'],
    'gym & fitness': ['Personal Care', 'Gym & Fitness'],
    'gym': ['Personal Care', 'Gym & Fitness'],
    'fitness': ['Personal Care', 'Gym & Fitness'],
    'massage & wellness': ['Personal Care', 'Massage & Wellness'],
    'massage': ['Personal Care', 'Massage & Wellness'],
    'spa': ['Personal Care', 'Massage & Wellness'],
    // Healthcare subcategories
    'dental': ['Healthcare', 'Dental'],
    'dentist': ['Healthcare', 'Dental'],
    'pharmacy': ['Healthcare', 'Pharmacy'],
    'shoppers': ['Healthcare', 'Pharmacy'],
    // Entertainment subcategories
    'golf': ['Entertainment', 'Golf'],
    // Subscriptions subcategories
    'streaming': ['Subscriptions', 'Streaming'],
    'netflix': ['Subscriptions', 'Streaming'],
    'spotify': ['Subscriptions', 'Streaming'],
  };

  const categoryHit = CATEGORY_TERMS[rawMerchant.toLowerCase()];

  const type: 'expense' | 'income' | 'all' =
    /\bincome\b/i.test(message) ? 'income' :
    /\bexpense|spending|charges|purchases\b/i.test(message) ? 'expense' : 'all';

  const overMatch = message.match(/over\s+\$?(\d+(?:\.\d+)?)/i);
  const underMatch = message.match(/under\s+\$?(\d+(?:\.\d+)?)/i);

  const monthNames: Record<string, string> = {
    january:'01', february:'02', march:'03', april:'04', may:'05', june:'06',
    july:'07', august:'08', september:'09', october:'10', november:'11', december:'12'
  };
  let startDate: string | undefined;
  let endDate: string | undefined;
  const monthMatch = message.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (monthMatch) {
    const year = new Date().getFullYear();
    const mo = monthNames[monthMatch[1].toLowerCase()];
    const lastDay = new Date(year, Number(mo), 0).getDate();
    startDate = `${year}-${mo}-01`;
    endDate = `${year}-${mo}-${lastDay}`;
  }

  return {
    isSearch: true,
    merchant: categoryHit ? undefined : rawMerchant || undefined,
    category: categoryHit ? categoryHit[0] : undefined,
    subcategory: categoryHit ? categoryHit[1] : undefined,
    type,
    startDate,
    endDate,
    minAmount: overMatch ? Number(overMatch[1]) : undefined,
    maxAmount: underMatch ? Number(underMatch[1]) : undefined,
  };
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
  userName?: string | null,
  selectedTx?: any,
  learnedCategory?: string | null
): string {
  const userLine = (userName ? `The user's name is ${userName}. Use it occasionally but naturally.\n` : '') +
    `IMPORTANT: Never introduce yourself or say hello when the user has already started a conversation. If the conversation history exists, respond directly to what the user said. Never say "Hello! How can I assist you" or "Hi there" mid-conversation. Only greet on the very first message if history is empty.\n`;
  const merchantBlock = merchant ? `
MERCHANT IN FOCUS: ${merchant}
${merchantHistory.count > 0 ? `- Seen ${merchantHistory.count} times, total $${merchantHistory.totalSpent.toFixed(2)}` : '- First time seeing this merchant'}
${merchantHistory.categories.length > 0 ? `- Previously categorized as: ${[...new Set(merchantHistory.categories)].join(', ')}` : ''}
${category ? `- Currently categorized as: ${category}` : ''}
${amount != null ? `- Transaction amount: $${Math.abs(amount).toFixed(2)}` : ''}
${learnedCategory ? `- Tag has learned: usually "${learnedCategory}" for this merchant` : ''}
` : '';

  if (!merchant && pageContext) {
    // Page-level operator mode
    return `${userLine}You are Tag  - XspensesAI's categorization agent operating at the page level.
The user is on the Transactions page talking to you directly.

USER'S FINANCES:
- Total spent: $${yearTotal.spent.toFixed(2)}
- Total income: $${yearTotal.income.toFixed(2)}
- Transactions in view: ${pageContext.transactionCount || 0}

FILTER intent  - triggers on ANY of these patterns:
- A merchant name typed alone e.g. "borrowell" or "7-eleven" or "petro"
- "show me X" / "find X" / "search X" / "filter by X" / "look up X"
- "what are my X transactions" / "X purchases" / "X charges"
- A category name e.g. "transportation" / "personal care" / "groceries"
- A subcategory alias e.g. "massage" / "fuel" / "restaurants" / "golf"

FILTER JSON format: FILTER:{"search":"<merchant or empty>","category":"<category or empty>","subcategory":"<subcategory or empty>"}
- For merchant lookups: set "search" to the merchant, leave category/subcategory empty
  Example: "borrowell" -> FILTER:{"search":"borrowell","category":"","subcategory":""}
- For category/subcategory lookups: set "search" to empty, set category and/or subcategory
  Example: "show me massage" -> FILTER:{"search":"","category":"Personal Care","subcategory":"Massage & Wellness"}
  Example: "show me fuel" -> FILTER:{"search":"","category":"Transportation","subcategory":"Gas & Fuel"}
  Example: "show me groceries" -> FILTER:{"search":"","category":"Groceries","subcategory":""}
  Example: "transportation" -> FILTER:{"search":"","category":"Transportation","subcategory":""}

Category/subcategory mappings (use these EXACT strings):
- "massage"/"spa" -> Personal Care / Massage & Wellness
- "fuel"/"gas"/"petro"/"esso"/"gas station" -> Transportation / Gas & Fuel
- "parking" -> Transportation / Parking
- "oil change"/"repairs"/"maintenance" -> Transportation / Vehicle Maintenance
- "transit"/"bus"/"train" -> Transportation / Transit
- "uber"/"lyft"/"rideshare" -> Transportation / Rideshare
- "groceries"/"supermarket" -> Groceries
- "coffee"/"tim hortons"/"starbucks" -> Food & Dining / Coffee & Drinks
- "restaurant"/"dining"/"lunch"/"dinner" -> Food & Dining / Restaurants
- "fast food"/"takeout" -> Food & Dining / Fast Food
- "haircut"/"salon"/"barber" -> Personal Care / Hair & Beauty
- "gym"/"fitness" -> Personal Care / Gym & Fitness
- "dentist"/"dental" -> Healthcare / Dental
- "pharmacy"/"shoppers" -> Healthcare / Pharmacy
- "golf" -> Entertainment / Golf
- "casino"/"bingo" -> Entertainment / Gaming & Lottery
- "netflix"/"spotify"/"streaming" -> Subscriptions / Streaming
- "bank fee"/"service charge" -> Bank Fees / Banking
- "loan payment" -> Debt Payments / Loan Payment
- "income"/"paycheck" -> Income / Employment

Reply with ONE short sentence then the action on the same line.
CRITICAL: FILTER:{} must ALWAYS be on a single line, no line breaks inside the JSON.
ALWAYS include FILTER:{} for any merchant or category lookup, even a single word.
Never wrap FILTER JSON in markdown or backticks.
NEVER respond to a merchant/category request WITHOUT the FILTER action.

You can also help with:
2. BULK CHANGE  - detect "change all X to Y", "categorize X as Y". Confirm first:
   BULK_CHANGE:{"merchant":"<merchant>","category":"<cat>","confirm":true}
3. UNDO  - detect "undo", "revert": UNDO:{}
4. RECLASSIFY  - detect "categorize everything", "fix uncategorized", "use your judgment", "clean up", "auto categorize":
   RECLASSIFY_PREVIEW:{}
   Do NOT ask what category. Do NOT execute. Just signal the preview.
5. CATEGORIZE  - when user says "put X into Y" or "X is Y" or uses a natural language alias:
   CATEGORIZE:{"merchant":"<merchant>","category":"<category>","subcategory":"<subcategory or null>"}
   Example: "put shell into fuel" -> CATEGORIZE:{"merchant":"shell","category":"Transportation","subcategory":"Gas & Fuel"}
6. QUESTIONS  - answer naturally about spending, no action JSON

Rules:
- Always confirm before bulk changes
- Keep replies to 1-2 sentences max
- Be direct and action-oriented
- Use ONLY these exact category names: ${CATEGORIES.join(', ')}. NEVER invent category names not on this list. If unsure, use "Needs Review".
- When user types just a merchant name with no other context, treat it as a FILTER
- When user says "put X into Y" or "X is Y", use CATEGORIZE with the alias mapping
- For reclassify: never ask what category  - Tag figures it out

${selectedTx ? `
SELECTED TRANSACTION (user has this transaction open in the drawer):
- ID: ${selectedTx.id}
- Merchant: ${selectedTx.merchant || 'Unknown'}
- Amount: $${Math.abs(Number(selectedTx.amount || 0)).toFixed(2)}
- Date: ${selectedTx.date || 'unknown'}
- Current category: ${selectedTx.category || 'Uncategorized'}
- Description: ${selectedTx.description || '(none)'}

UPDATE_TRANSACTION intent  - triggers when user says:
"change this to X" / "this is wrong" / "recategorize as X" / "move this to X" / "this should be Y" / "wrong category"
Reply naturally then append on same line:
UPDATE_TRANSACTION:{"id":"${selectedTx.id}","category":"<new category>","subcategory":"<subcategory or null>","merchant":"<corrected merchant or null>"}
Rules:
- Map user words to canonical categories using the alias table above
- If user says "expense" without specifying category, ask: "What type of expense? Food, Transportation, Personal Care...?"
- If user says "income" -> category: Income
- Always confirm: "Got it  - moved [merchant] to [category]."
- If the merchant is known (not null), also append: SAVE_RULE:true
` : ''}
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

UNKNOWN MERCHANT SWEEP: When user says "fix unknown transactions", "fix unknowns", "unknown merchants", "missing merchants", "what has no merchant", or "clean up unknowns": output <merchant_sweep/> and the server will find and flag transactions with missing merchant names.

TRANSACTION SEARCH:
When the user asks to find, show, list, filter, or search transactions:

CRITICAL: When LIVE TRANSACTION DATA is provided in your context, respond in Tag's voice  - sharp, direct, human. Structure it like this:

1. ONE punchy opening line with the count and total.
   Example: "Found 19 grocery transactions  - $3,457 total."

2. A clean grouped list. Group by merchant if there are repeats. Show the most recent date and total per merchant, not every row.
   Format: \u2022 [Merchant]  - [X visits, $total]
   Example: \u2022 Save On Foods  - 8 visits, $1,204.38
            \u2022 Sobeys Hollick Kenyon  - 4 visits, $889.43
            \u2022 Colton's No Frills  - 2 visits, $22.19

3. ONE short observation if something stands out.
   Example: "Save On Foods is your main grocery spot by a wide margin."

4. ONE clear offer to act.
   Example: "Want me to set a rule for any of these, or dig into a specific merchant?"

Rules:
- Never list every individual row. Group by merchant.
- Never exceed 15 merchant groups. If more, show top 10 and say "+ [N] more merchants."
- Never hallucinate  - only use data from LIVE TRANSACTION DATA.
- Keep it under 300 words total.

If LIVE TRANSACTION DATA shows 0 results, say:
"No [type] transactions found in your records. Want to try a different search?"

If NO LIVE TRANSACTION DATA is in your context (no injected data), fall back to emitting a FILTER action:
FILTER:{"search":"<merchant or empty>","category":"<category or empty>","subcategory":"<subcategory or empty>"}
With ONE conversational line before the FILTER.

For amount or date filters without injected data, tell the user those filters aren't available in the quick view and offer a category search instead.

TRANSACTION UPDATES (in-conversation):
When the user refers to a transaction from earlier in the conversation ("change that one", "move the Jan 12 massage", "fix the second one")  - use the transaction ID from the search results already in context. Do NOT ask the user to repeat the ID or find it themselves.

Call tag_update_transaction_category with:
- transactionId: from context
- newCategory: the category the user specified
- subcategory: the subcategory if the user specified one (e.g. "Office Supplies under Business" -> category: "Business", subcategory: "Office Supplies")
- merchantName: from context if available
- oldCategory: from context if available

After the update, confirm what changed in one line, then ask if the same rule should apply to all transactions from that merchant.

ANSWER DIRECTLY  - YOUR DOMAIN:
You have access to the user's injected transaction context (up to 200 transactions  - merchant-prioritized when a merchant is mentioned) PLUS a CATEGORY TOTALS block computed from the full transaction table. Use CATEGORY TOTALS for aggregation questions ("top spending category", "total spent on X")  - never compute totals from only the injected subset. You MUST answer questions directly using this data for:
- Spending category questions ("how much did I spend on groceries?", "what's my biggest category?")
- Totals and counts ("how many transactions this month?", "total spent at Amazon?")
- Merchant/transaction lookups ("show me coffee purchases", "biggest expense?")
- Category breakdowns, top merchants, uncategorized counts
- Anything derivable from the injected transaction list

Do NOT hand off for these. Compute the answer from the context and respond in a single short sentence with the number.

PROACTIVE INTELLIGENCE:
When the user says "yes", "let's go", "start", "sure", "go", or "go ahead" after the opening greeting - immediately fetch the first Needs Review merchant from context and ask about it. Format exactly:
"Let's start - you have [N] x [MERCHANT] totalling $[X]. What are these usually? [suggest 2-3 likely categories]"

Use merchant name to suggest smart categories:
- contains gas/petro/shell/esso/husky/chevron/mobil -> Transportation / Gas & Fuel
- contains tim horton/starbucks/mcdonald/subway/pizza/burger/kfc/wendys -> Food & Dining
- contains costco/walmart/superstore/safeway/sobeys/loblaws/save on foods/no frills -> Groceries
- contains amazon/best buy/staples/the bay/canadian tire -> Shopping (or Business Expenses if the user is self-employed)
- contains shoppers/pharmacy/medical/dental/rexall/clinic -> Healthcare
- contains hotel/airbnb/expedia/booking/marriott/hilton -> Travel
- contains netflix/spotify/adobe/google/microsoft/apple/disney -> Subscriptions
- contains insurance/intact/td insurance/belair -> Insurance
- contains loan/mortgage/credit/borrowell/cash money -> Debt Payments
- large round amounts ($1000+) that repeat monthly -> likely Income or Transfers

After the user answers: confirm in one line ("Got it - saved [merchant] -> [category]."), save the rule, then IMMEDIATELY move to the next merchant in the queue without waiting. Keep the momentum - no filler, no "anything else?".

When the queue hits 0: "Queue cleared. Your books are in good shape - [X] merchants sorted in this session."

HANDOFF  - ONLY FOR OUT-OF-SCOPE QUESTIONS:
Only hand off when the user asks about something clearly outside categorization/transaction data:
- Budgeting advice, financial strategy, forecasts -> prime-boss
- Savings goals, milestones -> goalie-goals
- Debt payoff calculations, loan projections -> finley-forecasts
- Upload/OCR/statement processing issues -> byte-docs
- Trend analysis across long time ranges -> crystal-analytics
- Tax reports, year-end summaries -> ledger-tax

Never hand off a question you can answer from the injected transaction context. Never say "I can't help with that" without either answering from context or handing off.

Emit on its own line:
HANDOFF:{"to":"<slug>","reason":"<one sentence of what the user needs>"}

Employee slugs and when to use them:
- "prime-boss"  - spending strategy, financial analysis, summaries, forecasts, budgeting advice, big picture questions, anything complex
- "byte-docs"  - upload questions, import status, OCR issues, statement processing, document questions
- "goalie-goals"  - savings goals, targets, milestones, goal tracking
- "finley-forecasts"  - debt payoff, loan calculations, projections
- "crystal-analytics"  - trends, pattern analysis, spending insights
- "ledger-tax"  - accountant reports, year-end summaries

Always say one short sentence before the HANDOFF line acknowledging what the user asked. Keep it natural  - Tag is handing off to a colleague, not abandoning the user.

MERCHANT SPLIT RULES - INCOME vs EXPENSE:
When a merchant appears with both income and expense transactions (e.g. 'GORDON FOODS' as a $62 grocery purchase AND 'GORDON FOODS ER' as a $2900 payroll deposit), you MUST handle them as two separate rules. Never create one blanket rule that would match both.

When you detect mixed transaction types for a merchant:
1. Tell the user you see both income and expense transactions under similar names
2. Propose two separate rules and ask the user to confirm each one
3. For the expense variant: use match_type 'contains' with amount_max set to a threshold (e.g. 200)
4. For the income/payroll variant: use match_type 'exact' for the specific suffix variant (e.g. 'GORDON FOODS ER') with amount_min set above the threshold

Example flow:
User: "Gordon Foods is groceries"
Tag: "I see GORDON FOODS charges under $200 (groceries) AND GORDON FOODS ER deposits around $2,900 (looks like payroll). Want me to set two rules?
1. GORDON FOODS under $200 -> Groceries
2. GORDON FOODS ER over $200 -> Income"

If the user confirms, output two SAVE_RULE lines:
SAVE_RULE:{"merchant_pattern":"GORDON FOODS","category":"Groceries","match_type":"contains","amount_min":null,"amount_max":200}
SAVE_RULE:{"merchant_pattern":"GORDON FOODS ER","category":"Income","match_type":"exact","amount_min":200,"amount_max":null}

SESSION CLOSING:
When the needs-review queue is empty, or the user says "done", "that's all", "finished", "I'm done for now", "wrap it up"  - respond with a closing message then emit SESSION_CLOSE on its own line.

The closing message should:
- Lead with a one-line summary of what was accomplished if you have context (e.g. "Queue cleared  - your books are cleaner than when you sat down.")
- If no session context, keep it simple: "Good session. Your transactions are in better shape."
- Add one forward nudge toward Prime: "Prime has a cleaner picture to work with now if you want the full breakdown."
- End with SESSION_CLOSE on its own line (the server will strip it before sending to the user)

Always confirm actions taken.`;


  }

  if (isQuickChange) {
    return `${userLine}You are Tag, XspensesAI's categorization agent.

The user just changed merchant "${merchant}" (${amount != null ? '$' + Math.abs(amount).toFixed(2) : 'unknown amount'}) to category "${category}".
Do NOT just confirm the change. Ask ONE short question to understand what this purchase actually was, so you can help build a smart rule. Examples:
- "Got it  - was this a gas fill-up or something else?"
- "Makes sense  - coffee run or snacks?"
- "Quick one  - what was the $${amount != null ? Math.abs(amount).toFixed(2) : '?'} at ${merchant}?"
Be casual, 1 sentence max. Do not offer to save a rule yet.`;
  }

  return `${userLine}You are Tag, XspensesAI's categorization agent. You are having a conversation about merchant "${merchant}".
${merchantBlock}
USER'S OVERALL FINANCES (this year):
- Total spent: $${yearTotal.spent.toFixed(2)}
- Total income: $${yearTotal.income.toFixed(2)}

Conversation rules:
1. If the user tells you the category directly (e.g. "Food & Dining", "Transportation"), accept it immediately  - do NOT ask to confirm again. Just save it.
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

UNKNOWN MERCHANT SWEEP: When user says "fix unknown transactions", "fix unknowns", "unknown merchants", "missing merchants", "what has no merchant", or "clean up unknowns": output <merchant_sweep/> and the server will find and flag transactions with missing merchant names.

Always confirm actions taken.`;

}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {

  const body = JSON.parse(event.body || '{}');
  const { transactionId, message, history = [], pageContext, merchant: bodyMerchant, category: bodyCategory, amount: bodyAmount, context: bodyContext, selectedTransaction } = body;

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );
  const isPageContext = bodyContext === 'page';

  // Opening turn: empty message on page-level context with no history
  if (!message && isPageContext && (!history || history.length === 0)) {
    try {
      // Fetch firstName for personalized greeting
      let firstName = 'there';
      try {
        const { data: profile } = await supabase.from('profiles').select('first_name, full_name').eq('id', auth.userId).single();
        firstName = profile?.first_name || profile?.full_name?.split(' ')[0] || 'there';
      } catch { /* non-blocking */ }

      // Duplicate detection - find (amount, date) pairs with count > 1
      let dupeLine = '';
      try {
        const { data: dupeRows } = await supabase
          .from('transactions')
          .select('id, amount, date, posted_at, merchant_name, category')
          .eq('user_id', auth.userId)
          .limit(5000);
        const seen = new Map<string, { count: number; total: number }>();
        for (const r of dupeRows || []) {
          if (r.category === 'Duplicate') continue; // already flagged
          const d = String(r.date || (r.posted_at ? String(r.posted_at).slice(0, 10) : ''));
          if (!d) continue;
          const amt = Math.abs(Number(r.amount || 0));
          const key = `${amt.toFixed(2)}|${d}`;
          const e = seen.get(key) || { count: 0, total: 0 };
          e.count += 1;
          e.total = amt;
          seen.set(key, e);
        }
        const dupeGroups = Array.from(seen.values()).filter(e => e.count > 1);
        const dupeCount = dupeGroups.reduce((s, e) => s + (e.count - 1), 0);
        const dupeTotal = dupeGroups.reduce((s, e) => s + e.total * (e.count - 1), 0);
        if (dupeCount > 0) {
          dupeLine = `\n\nHeads up - I found ${dupeCount} possible duplicate transaction${dupeCount > 1 ? 's' : ''} totaling $${dupeTotal.toFixed(2)}. Open any transaction and tap "Mark Duplicate" to flag it.`;
        }
      } catch { /* non-blocking */ }

      // Fetch all Needs Review transactions, group in JS
      const { data: needsReview } = await supabase
        .from('transactions')
        .select('merchant_name, amount')
        .eq('user_id', auth.userId)
        .eq('category', 'Needs Review');

      const rows = needsReview || [];
      const uncatCount = rows.length;
      const totalAmt = rows.reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);
      const byMerchant = new Map<string, { cnt: number; total: number }>();
      for (const r of rows) {
        const m = String(r.merchant_name || 'Unknown');
        const e = byMerchant.get(m) || { cnt: 0, total: 0 };
        e.cnt += 1;
        e.total += Math.abs(Number(r.amount || 0));
        byMerchant.set(m, e);
      }
      const top = Array.from(byMerchant.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5);
      const merchantCount = byMerchant.size;

      let openingReply: string;
      if (uncatCount > 0) {
        const lines = top.map(([m, v]) => `- ${m} x${v.cnt} ($${v.total.toFixed(2)})`).join('\n');
        openingReply =
          `Hey ${firstName} - you've got ${uncatCount} transactions across ${merchantCount} merchants in Needs Review ($${totalAmt.toFixed(2)} total).\n\n` +
          `Biggest ones:\n${lines}\n\n` +
          `Want me to work through them now? I'll go one merchant at a time and ask you about each one.` +
          dupeLine;
      } else {
        const totalCat = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId);
        const totalN = totalCat.count ?? 0;
        openingReply = `Hey ${firstName} - your books are looking clean (done) All ${totalN} transactions categorized. Ask me anything about your spending.` + dupeLine;
      }

      return { statusCode: 200, headers, body: JSON.stringify({ reply: openingReply, action: null, sessionComplete: false }) };
    } catch {
      return { statusCode: 200, headers, body: JSON.stringify({ reply: "Hey - what can I help you categorize?", action: null, sessionComplete: false }) };
    }
  }

  if (!message) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };
  }

  const isQuickChange = message === '__system_category_changed__' && bodyContext === 'quick_change';

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
  //    Session cutoff: only keep messages from the last 6 hours, capped at
  //    the last 6 (3 turns). Older chats are still persisted for audit but
  //    do not pollute the LLM prompt. This lets the fresh greeting fire
  //    when the user returns after a break.
  const SESSION_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 hours
  const SESSION_TURN_LIMIT = 6; // last 3 user/assistant pairs
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

  const sessionCutoff = Date.now() - SESSION_WINDOW_MS;
  const recentPersisted = persistedHistory
    .filter((m) => typeof m.ts === 'number' && m.ts >= sessionCutoff)
    .slice(-SESSION_TURN_LIMIT);

  // Merge: prefer frontend history if provided, otherwise use recent persisted
  const effectiveHistory = history.length > 0
    ? history
    : recentPersisted.map((m: any) => ({ role: m.role, content: m.content }));

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

  // 3.5 Check learned category from user correction history
  let learnedCategory: string | null = null;
  if (merchantName) {
    try {
      const learned = await getLearnedCategoryForTransaction(
        supabase, auth.userId, merchantName
      );
      if (learned && learned.count >= 1) {
        learnedCategory = learned.category;
      }
    } catch { /* non-blocking */ }
  }

  // 4. Complete category + subcategory totals (ALL transactions, no date filter)
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('amount, category, subcategory, type')
    .eq('user_id', auth.userId)
    .limit(10000);
  let yearSpent = 0, yearIncome = 0;
  const categoryTotalsMap = new Map<string, { total: number; count: number }>();
  const subcatTotalsMap = new Map<string, { total: number; count: number }>();
  for (const t of allTxs || []) {
    const amt = Math.abs(Number(t.amount || 0));
    const cat = String(t.category || 'Uncategorized');
    const sub = String((t as any).subcategory || '');
    if (cat.toLowerCase() === 'income' || String((t as any).type || '').toLowerCase() === 'income') {
      yearIncome += amt;
    } else {
      yearSpent += amt;
      const entry = categoryTotalsMap.get(cat) || { total: 0, count: 0 };
      entry.total += amt;
      entry.count += 1;
      categoryTotalsMap.set(cat, entry);
      const subKey = `${cat}||${sub}`;
      const subEntry = subcatTotalsMap.get(subKey) || { total: 0, count: 0 };
      subEntry.total += amt;
      subEntry.count += 1;
      subcatTotalsMap.set(subKey, subEntry);
    }
  }
  const categoryTotalsSorted = Array.from(categoryTotalsMap.entries())
    .sort((a, b) => b[1].total - a[1].total);
  const subcatTotalsSorted = Array.from(subcatTotalsMap.entries())
    .filter(([k]) => k.split('||')[1]) // only rows with a subcategory
    .sort((a, b) => b[1].total - a[1].total);
  const categoryTotalsBlock = [
    `COMPLETE CATEGORY TOTALS (all ${allTxs?.length || 0} transactions, use these for any spending aggregation question):`,
    ...categoryTotalsSorted.map(([cat, v]) => `- ${cat}: $${v.total.toFixed(2)} (${v.count} tx)`),
    '',
    'SUBCATEGORY TOTALS:',
    ...subcatTotalsSorted.map(([k, v]) => {
      const [cat, sub] = k.split('||');
      return `- ${cat} / ${sub}: $${v.total.toFixed(2)} (${v.count} tx)`;
    }),
    '',
    `- TOTAL SPENT: $${yearSpent.toFixed(2)}`,
    `- TOTAL INCOME: $${yearIncome.toFixed(2)}`,
    '',
    'Use these totals verbatim for any aggregation, "top category", or subcategory question. Never recompute from the injected transaction list.',
  ].join('\n');

  // 4.5: Pre-fetch transaction data for search intents (page-level only)
  let injectedTxContext: string | null = null;
  if (isPageContext && message) {
    const searchIntent = extractSearchIntent(message);
    // Also extract a merchant token from the raw message even when searchIntent
    // doesn't flag it as a search  - so "how much at 7-eleven?" still prioritizes.
    const MERCHANT_STOPWORDS = new Set([
      'are you sure', 'how much', 'how many', 'what about', 'tell me', 'let me',
      'thank you', 'thanks', 'yes', 'no', 'okay', 'ok', 'sure', 'maybe',
      'i think', 'i dont', "i don't", 'can you', 'show me', 'please',
      'got it', 'never mind', 'nevermind',
    ]);
    const extractFromFallback = (): string | null => {
      const atHit = message.match(/\bat\s+([a-z0-9][a-z0-9 &'.-]{1,30}?)(?:\?|\s*$)/i)?.[1]?.toLowerCase();
      if (atHit) return atHit;
      const tokenHit = message.match(/\b([a-z0-9][a-z0-9 &'.-]{2,30})\b/i)?.[1]?.toLowerCase();
      if (!tokenHit) return null;
      if (MERCHANT_STOPWORDS.has(tokenHit.trim())) return null;
      // Reject pure pronoun/filler single tokens
      if (/^(the|you|me|my|this|that|it|is|was|were|and|or|but|so|do|does|did)$/i.test(tokenHit.trim())) return null;
      return tokenHit;
    };
    const msgMerchant = searchIntent.merchant || extractFromFallback();
    if (searchIntent.isSearch || msgMerchant) {
      try {
        // Step 1: merchant-prioritized rows (if merchant mentioned)
        let priorityRows: any[] = [];
        if (msgMerchant) {
          const { data: mRows } = await supabase
            .from('transactions')
            .select('id, merchant_name, description, amount, date, posted_at, category, subcategory, type')
            .eq('user_id', auth.userId)
            .ilike('merchant_name', `%${msgMerchant.replace(/\s+/g, '%')}%`)
            .order('date', { ascending: false })
            .limit(200);
          priorityRows = mRows || [];
          console.log('[tag-chat] merchant priority:', { merchant: msgMerchant, priorityCount: priorityRows.length, fillCount: Math.max(0, 200 - priorityRows.length) });
        }

        // Step 2: fill remaining slots with recent transactions matching other filters
        const remaining = Math.max(0, 200 - priorityRows.length);
        let fillRows: any[] = [];
        if (remaining > 0) {
          let q = supabase
            .from('transactions')
            .select('id, merchant_name, description, amount, date, posted_at, category, subcategory, type')
            .eq('user_id', auth.userId)
            .order('date', { ascending: false })
            .limit(remaining);
          if (searchIntent.category) {
            if (searchIntent.category === 'Uncategorized') {
              q = q.or('category.is.null,category.eq.Uncategorized,category.eq.Needs Review');
            } else {
              q = q.eq('category', searchIntent.category);
            }
          }
          if (searchIntent.subcategory) {
            const subRoot = searchIntent.subcategory.split(' & ')[0].split(' ')[0];
            q = q.ilike('subcategory', `%${subRoot}%`);
          }
          if (searchIntent.type === 'income') q = q.eq('type', 'income');
          else if (searchIntent.type === 'expense') q = q.neq('type', 'income');
          if (searchIntent.startDate) q = q.gte('date', searchIntent.startDate);
          if (searchIntent.endDate) q = q.lte('date', searchIntent.endDate);
          if (searchIntent.minAmount) q = q.gte('amount', searchIntent.minAmount);
          if (searchIntent.maxAmount) q = q.lte('amount', searchIntent.maxAmount);
          const { data: fRows } = await q;
          fillRows = fRows || [];
        }

        // Merge: merchant matches first, dedupe by id, then recent fill
        const seen = new Set<string>(priorityRows.map(r => String(r.id)));
        const txRows = [
          ...priorityRows,
          ...fillRows.filter(r => !seen.has(String(r.id))),
        ].slice(0, 200);

        if (txRows.length > 0) {
          const totalAmt = txRows.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
          const lines = txRows.slice(0, 60).map((t: any, i: number) =>
            `[${i + 1}] id:${t.id} | ${t.date || (t.posted_at || '').split('T')[0]} | ${t.merchant_name || t.description || 'Unknown'} | $${Math.abs(Number(t.amount)).toFixed(2)} | ${t.category || 'Uncategorized'}${t.subcategory ? ' / ' + t.subcategory : ''}`
          );
          injectedTxContext = [
            `LIVE TRANSACTION DATA (${txRows.length} results, total $${totalAmt.toFixed(2)}${msgMerchant ? `, merchant-prioritized: ${msgMerchant}` : ''}):`,
            ...lines,
            txRows.length > 60 ? `... and ${txRows.length - 60} more` : '',
            '',
            'Use these exact IDs when the user asks to change or update a transaction.',
          ].filter(Boolean).join('\n');
          console.log(`[tag-chat] Injected ${txRows.length} transactions into context (priority=${priorityRows.length}, fill=${fillRows.length})`);
        } else {
          injectedTxContext = 'LIVE TRANSACTION DATA: No transactions found matching this search.';
        }
      } catch (err: any) {
        console.warn('[tag-chat] Pre-fetch failed (non-blocking):', err?.message);
      }
    }
  }

  // 5. Build messages for LLM
  const userMessage = isQuickChange
    ? `I just changed ${merchantName} to ${bodyCategory}.`
    : message;

  const systemPrompt = buildSystemPrompt(
    merchantName, isQuickChange, bodyCategory || (tx as any)?.category || null,
    bodyAmount ?? (tx as any)?.amount ?? null,
    merchantHistory, { spent: yearSpent, income: yearIncome }, pageContext, userName, selectedTransaction || null, learnedCategory
  );

  // 6. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await callWithRetry(() => openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'system' as const, content: categoryTotalsBlock },
      ...(injectedTxContext ? [{ role: 'system' as const, content: injectedTxContext }] : []),
      ...effectiveHistory.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ],
  }));

  let reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';
  console.log('[tag-chat] RAW REPLY:', JSON.stringify(reply));

  // Server-side FILTER injection  - don't trust LLM to output it
  const isPageLevel = isPageContext || (!transactionId && !isQuickChange);
  const looksLikeSearch = isPageLevel && (
    /^[a-z0-9 &'-]{2,40}$/i.test(userMessage.trim()) ||
    /^(show|find|search|filter|get|pull up|display|look up)\s+/i.test(userMessage.trim()) ||
    /^can you show/i.test(userMessage.trim()) ||
    /\b(purchases|charges|transactions)\s*$/i.test(userMessage.trim())
  );
  // Category/subcategory alias map for server-side injection
  const FILTER_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
    'massage': { category: 'Personal Care', subcategory: 'Massage & Wellness' },
    'spa': { category: 'Personal Care', subcategory: 'Massage & Wellness' },
    'fuel': { category: 'Transportation', subcategory: 'Gas & Fuel' },
    'gas': { category: 'Transportation', subcategory: 'Gas & Fuel' },
    'parking': { category: 'Transportation', subcategory: 'Parking' },
    'oil change': { category: 'Transportation', subcategory: 'Vehicle Maintenance' },
    'transit': { category: 'Transportation', subcategory: 'Transit' },
    'groceries': { category: 'Groceries', subcategory: '' },
    'coffee': { category: 'Food & Dining', subcategory: 'Coffee & Drinks' },
    'restaurant': { category: 'Food & Dining', subcategory: 'Restaurants' },
    'restaurants': { category: 'Food & Dining', subcategory: 'Restaurants' },
    'dining': { category: 'Food & Dining', subcategory: 'Restaurants' },
    'haircut': { category: 'Personal Care', subcategory: 'Hair & Beauty' },
    'salon': { category: 'Personal Care', subcategory: 'Hair & Beauty' },
    'golf': { category: 'Entertainment', subcategory: 'Golf' },
    'streaming': { category: 'Subscriptions', subcategory: 'Streaming' },
    'transportation': { category: 'Transportation', subcategory: '' },
    'personal care': { category: 'Personal Care', subcategory: '' },
    'food & dining': { category: 'Food & Dining', subcategory: '' },
    'entertainment': { category: 'Entertainment', subcategory: '' },
    'healthcare': { category: 'Healthcare', subcategory: '' },
    'shopping': { category: 'Shopping', subcategory: '' },
    'subscriptions': { category: 'Subscriptions', subcategory: '' },
    'bank fees': { category: 'Bank Fees', subcategory: '' },
    'housing': { category: 'Housing', subcategory: '' },
    'insurance': { category: 'Insurance', subcategory: '' },
    'education': { category: 'Education', subcategory: '' },
    'travel': { category: 'Travel', subcategory: '' },
    'transfers': { category: 'Transfers', subcategory: '' },
    'income': { category: 'Income', subcategory: '' },
    'needs review': { category: 'Needs Review', subcategory: '' },
  };

  // When real transaction data was injected, strip any FILTER the LLM emitted  -
  // the model already responded with real data, no client-side filter needed.
  if (injectedTxContext && reply.includes('FILTER:')) {
    reply = reply.replace(/\s*FILTER:\s*(?:\{[^}]+\}|[^\n]+)/g, '').trim();
  }

  const searchWasAttempted = isPageContext && extractSearchIntent(message || '').isSearch;
  if (isPageLevel && looksLikeSearch && !reply.includes('FILTER:') && !injectedTxContext && !searchWasAttempted) {
    const searchTerm = userMessage.trim()
      .replace(/^(show me all of|show me|find|search for|filter by|get|pull up|display|look up|can you show me all of|can you show me)\s+/i, '')
      .replace(/\s+(purchases|charges|transactions)\s*$/i, '')
      .trim();
    if (searchTerm) {
      const catMatch = FILTER_CATEGORY_MAP[searchTerm.toLowerCase()];
      if (catMatch) {
        reply = reply + ` FILTER:{"search":"","category":"${catMatch.category}","subcategory":"${catMatch.subcategory}"}`;
        console.log('[tag-chat] Server injected category FILTER:', catMatch.category, catMatch.subcategory);
      } else {
        reply = reply + ` FILTER:{"search":"${searchTerm.replace(/"/g, '\\"')}","category":"","subcategory":""}`;
        console.log('[tag-chat] Server injected search FILTER:', searchTerm);
      }
    }
  }

  // Server-side UPDATE_TRANSACTION injection for selected transaction corrections
  if (selectedTransaction?.id && !reply.includes('UPDATE_TRANSACTION:')) {
    const correctionPatterns = /\b(change|move|recategorize|switch|set|make|put)\s+(this|it)\s+(to|as|into)\s+/i;
    const wrongPatterns = /\b(this is wrong|wrong category|miscategorized|should be|it'?s actually|it'?s an?\s)/i;
    const directCategory = /\b(this is|it'?s)\s+(income|food|transportation|groceries|personal care|entertainment|shopping|healthcare|housing|utilities|subscriptions|transfers|bank fees|business|education|travel|insurance)\b/i;
    const msgLower = userMessage.trim();
    if (correctionPatterns.test(msgLower) || wrongPatterns.test(msgLower) || directCategory.test(msgLower)) {
      // Try to extract the target category from the message
      const catExtract = msgLower.match(/(?:to|as|into|be|is|it'?s)\s+(.+?)\.?\s*$/i);
      if (catExtract) {
        const rawCat = catExtract[1].trim();
        const normalized = normalizeCategory(rawCat);
        if (normalized && normalized !== rawCat) {
          const subMatch = FILTER_CATEGORY_MAP[rawCat.toLowerCase()];
          const sub = subMatch?.subcategory || '';
          const merchantVal = selectedTransaction.merchant || null;
          reply = reply + ` UPDATE_TRANSACTION:{"id":"${selectedTransaction.id}","category":"${normalized}","subcategory":"${sub}","merchant":${merchantVal ? `"${String(merchantVal).replace(/"/g, '\\"')}"` : 'null'}}`;
          if (merchantVal) reply += ' SAVE_RULE:true';
          console.log('[tag-chat] Server injected UPDATE_TRANSACTION for', selectedTransaction.id, '->', normalized);
        }
      }
    }
  }

  // Parse HANDOFF signal
  const handoffMatch = reply.match(/HANDOFF:\s*(\{[^}]+\})/);
  let handoffPayload: { to: string; reason: string } | null = null;
  if (handoffMatch) {
    try {
      handoffPayload = JSON.parse(handoffMatch[1]);
    } catch { /* malformed JSON, ignore */ }
    reply = reply.replace(/\s*HANDOFF:\s*\{[^}]+\}/g, '').trim();
  }

  // Handle correction intent  - user told Tag a merchant is miscategorized
  const correction = parseCorrection(reply);
  if (correction) {
    const { merchant_pattern, min_amount, max_amount } = correction;
    const category = normalizeCategory(correction.category);
    const subcategory = correction.subcategory?.trim() || null;
    try {
      // Upsert into category_rules  - schema uses match_value, NOT merchant_pattern
      const rulePayload: Record<string, any> = {
        user_id: auth.userId,
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
        const { error: insErr } = await supabase.from('category_rules').insert(rulePayload);
        if (insErr) console.error('[tag-chat] correction insert failed', insErr.message);
      } else {
        const { error: upErr } = await supabase.from('category_rules').upsert(rulePayload, { onConflict: 'user_id,match_type,match_value' });
        if (upErr) console.error('[tag-chat] correction upsert failed', upErr.message);
      }
      const amountNote = min_amount != null || max_amount != null ? ` (${min_amount != null ? '>=$' + min_amount : ''}${min_amount != null && max_amount != null ? ', ' : ''}${max_amount != null ? '<$' + max_amount : ''})` : '';
      console.log(`[tag-chat] Correction rule saved: ${merchant_pattern} -> ${category}${subcategory ? ' / ' + subcategory : ''}${amountNote}`);

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
        .ilike('match_value', deletion.merchant_pattern);
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
        .select('match_value, category, subcategory, min_amount, max_amount')
        .eq('user_id', auth.userId)
        .eq('is_active', true)
        .order('match_value');
      if (rules && rules.length > 0) {
        const ruleList = rules.map((r: any) => {
          let line = `${r.match_value} -> ${r.category}${r.subcategory ? ' / ' + r.subcategory : ''}`;
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
      reply = `Next up: **${next.merchant_name}**  - $${amt} on ${date}. What category should this be?`;
    } else {
      reply = 'Good session. Your transactions are in better shape. Prime has a cleaner picture to work with now if you want the full breakdown.\nSESSION_CLOSE';
    }
  }

  // Handle merchant_sweep intent  - find and flag unknown-merchant transactions
  if (parseMerchantSweep(reply)) {
    reply = reply.replace(/<merchant_sweep\s*\/?>/g, '').trim();
    try {
      const { data: unknowns } = await supabase
        .from('transactions')
        .select('id, description, amount, date, posted_at, category')
        .eq('user_id', auth.userId)
        .not('category', 'in', '("Transfers","Income")')
        .or('merchant_name.is.null,merchant_name.eq.,merchant.is.null,merchant.eq.')
        .not('subcategory', 'eq', 'Unknown Merchant - Verify')
        .order('posted_at', { ascending: false })
        .limit(10);

      if (unknowns && unknowns.length > 0) {
        // Mark them for review
        for (const tx of unknowns) {
          await supabase.from('transactions').update({
            category: 'Needs Review',
            subcategory: 'Unknown Merchant - Verify',
            category_source: 'merchant_sweep',
            updated_at: new Date().toISOString(),
          }).eq('id', tx.id).eq('user_id', auth.userId);
        }

        // Get total remaining
        const { count: remaining } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .not('category', 'in', '("Transfers","Income")')
          .or('merchant_name.is.null,merchant_name.eq.,merchant.is.null,merchant.eq.')
          .not('subcategory', 'eq', 'Unknown Merchant - Verify');

        const lines = unknowns.slice(0, 5).map(tx => {
          const amt = Math.abs(Number(tx.amount || 0)).toFixed(2);
          const d = tx.date || tx.posted_at?.split('T')[0] || '?';
          const desc = tx.description || '(no description)';
          return `- **$${amt}** on ${d}  - "${desc}"`;
        }).join('\n');

        reply = `Found ${unknowns.length} transactions with no merchant name. I've flagged them for review.\n\n${lines}${unknowns.length > 5 ? `\n- ... and ${unknowns.length - 5} more` : ''}${(remaining || 0) > 0 ? `\n\n${remaining} more still unflagged  - say "fix unknowns" again for the next batch.` : ''}\n\nOpen any of these in the transaction drawer to add the merchant name and category. I'll learn from your corrections.`;
      } else {
        reply = 'All your transactions have merchant names  - nothing to fix here!';
      }
    } catch (err: any) {
      console.error('[tag-chat] merchant_sweep error:', err.message);
      reply = 'I had trouble scanning for unknown merchants. Try again in a moment.';
    }
  }

  /*
   * SQL RPC required for staging backfill  - run in Supabase SQL editor:
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

      // 7d. Backfill staging transactions (RPC  - may not exist yet)
      try {
        await supabase.rpc('backfill_staging_category', {
          p_user_id: auth.userId,
          p_match_value: pattern,
          p_category: ruleData.category,
        });
      } catch { /* RPC may not exist yet  - skip */ }

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

  // Handle SESSION_CLOSE signal
  let sessionComplete = false;
  if (parseSessionClose(reply)) {
    sessionComplete = true;
    reply = reply.replace(/\s*SESSION_CLOSE\s*/gi, '').trim();
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply, action, rule_saved: ruleSaved, backfill_count: backfillCount, history: persistedHistory, sessionComplete, handoff: handoffPayload }),
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
