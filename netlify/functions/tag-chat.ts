import type { Handler } from '@netlify/functions';
import {
  loadTagSpendingSummary,
  loadCategorizationProgress,
  formatSpendingBlock,
  formatProgressBlock,
  isSmallTalk,
  TAG_FINANCIAL_RULES,
} from './_shared/tagFinancialContext.js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { gateReplyForCoverage } from '../../src/shared/comparison-claim-guard';
import { loadStatementCoverage, type CoverageDbClient } from '../../src/shared/statement-coverage';
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
    'other': ['Other'], 'uncategorized': ['Needs Review'], 'needs review': ['Needs Review'],
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


function parseListRules(text: string): boolean {
  return /<list_rules\s*\/?>/.test(text);
}


function buildSystemPrompt(
  merchant: string,
  isQuickChange: boolean,
  category: string | null,
  amount: number | null,
  merchantHistory: { count: number; countExact: boolean; categories: string[] },
  pageContext?: any,
  userName?: string | null,
  selectedTx?: any,
  learnedCategory?: string | null
): string {
  const userLine = (userName ? `The user's name is ${userName}. Use it occasionally but naturally.\n` : '') +
    `HIGHEST PRIORITY: You cannot change, save, delete, rename or flag anything from this chat — no categories, rules or transactions. Never say you changed or saved something, and do not output <correction>, <delete_rule>, <merchant_sweep/>, SAVE_RULE or action JSON (the server ignores them). If the customer wants a change, tell them to ask Tag in the Tag panel on the Transactions page, where they will see exactly what will change and confirm it.\n` +
    `IMPORTANT: Never introduce yourself or say hello when the user has already started a conversation. If the conversation history exists, respond directly to what the user said. Never say "Hello! How can I assist you" or "Hi there" mid-conversation. Only greet on the very first message if history is empty.\n`;
  const merchantBlock = merchant ? `
MERCHANT IN FOCUS: ${merchant}
${merchantHistory.count > 0 ? `- Seen ${merchantHistory.countExact ? '' : 'at least '}${merchantHistory.count} times (for a verified spending total use VERIFIED SPENDING TOTALS)` : '- First time seeing this merchant'}
${merchantHistory.categories.length > 0 ? `- Previously categorized as: ${[...new Set(merchantHistory.categories)].join(', ')}` : ''}
${category ? `- Currently categorized as: ${category}` : ''}
${amount != null ? `- Transaction amount: $${Math.abs(amount).toFixed(2)}` : ''}
${learnedCategory ? `- Tag has learned: usually "${learnedCategory}" for this merchant` : ''}
` : '';

  if (!merchant && pageContext) {
    // Page-level operator mode
    return `${userLine}You are Tag  - XspensesAI's categorization agent operating at the page level.
The user is on the Transactions page talking to you directly.

ON SCREEN: ${pageContext.transactionCount || 0} transactions in the current view (as reported by the page; not a verified total).

${TAG_FINANCIAL_RULES}

INTENT UNDERSTANDING - CRITICAL:
You must understand what the user MEANS, not just what they literally typed. Natural language in a finance app almost always maps to one of: (a) a count/total question answerable from VERIFIED SPENDING TOTALS / CATEGORIZATION PROGRESS (never from the injected rows), (b) a filter/search request for specific transactions, or (c) a categorization command. Only answer with numbers that are verified. Examples:
- "how many shadified" = "How many Shadified transactions do I have?" - answer with the verified count for that merchant if VERIFIED SPENDING TOTALS has it; otherwise emit a FILTER block so the page shows them.
- "how much coffee" = "What did I spend on coffee?" - answer only with a figure from VERIFIED SPENDING TOTALS, with its period; if it isn't there, say you don't have a verified number and offer to filter.
- "how often do I hit 7-eleven" = the verified 7-Eleven count from VERIFIED SPENDING TOTALS, with its period.
- "any duplicates" = "Do I have duplicate transactions?" - acknowledge and tell the user to check the Needs Review queue; Tag does not run dedupe on demand.
- "what about gas" = filter intent -> emit FILTER block for Transportation / Gas & Fuel.
- "tim hortons?" = filter intent -> emit FILTER block for Tim Hortons.
- "acme foods is income" = categorization command -> emit <correction> block (see IS-A PATTERN below).
Never treat question words ("how", "what", "any") as merchant names. Strip leading "how much/many/often", "what about", "show me", "tell me" before interpreting the remainder as a merchant or category.

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

IS-A PATTERN - HARD RULE: When the user says "[merchant] is [category]" or "[merchant] is [category], [subcategory]" - ALWAYS treat this as a categorization command and emit a <correction> block immediately, saving the rule. The merchant name is everything before the word "is". The category (and optional subcategory after a comma) is everything after "is". Never ignore it. Never ask for clarification. Never respond with a question. Examples:
- "7-ELEVEN is Food & Dining" -> <correction>{"merchant_pattern":"7-ELEVEN","category":"Food & Dining","subcategory":null,"min_amount":null,"max_amount":null}</correction>
- "Petro-Canada is Transportation, Gas & Fuel" -> <correction>{"merchant_pattern":"Petro-Canada","category":"Transportation","subcategory":"Gas & Fuel","min_amount":null,"max_amount":null}</correction>
- "Acme Foods is Income" -> <correction>{"merchant_pattern":"Acme Foods","category":"Income","subcategory":null,"min_amount":null,"max_amount":null}</correction>

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

1. ONE punchy opening line with what was found. LIVE TRANSACTION DATA is a SAMPLE of rows, never a total:
   give its row count, and quote a dollar total ONLY if VERIFIED SPENDING TOTALS has it (with its period).
   Example: "Here are your latest grocery transactions — your verified grocery spending for 2026-01-01 to 2026-10-31 is $3,457.00."

2. A clean list of the rows that matter (most recent first). Do not add up rows or build per-merchant totals yourself.
   Format: \u2022 [Merchant]  - [date], [amount]

3. ONE short observation if something stands out.
   Example: "Save On Foods is your main grocery spot by a wide margin."

4. ONE clear offer to act.
   Example: "Want me to set a rule for any of these, or dig into a specific merchant?"

Rules:
- Never list every individual row. Group by merchant.
- Never exceed 15 merchant groups. If more, show top 10 and say "+ [N] more merchants."
- Never hallucinate  - only use data from LIVE TRANSACTION DATA and VERIFIED SPENDING TOTALS. Never compute a total.
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
You have VERIFIED SPENDING TOTALS (server-calculated over the full scope, with a scope line) and CATEGORIZATION PROGRESS (exact counts), plus a SAMPLE of individual rows (LIVE TRANSACTION DATA, when injected). Answer these directly, using ONLY the verified figures and stating the period:
- Spending category questions ("how much did I spend on groceries?", "what's my biggest category?")
- Merchant spending ("total spent at Amazon?") when the merchant appears in VERIFIED SPENDING TOTALS
- Uncategorized / Needs Review counts
- Transaction lookups (from the rows)

Never compute a total, count or breakdown from the injected rows. If the verified figure isn't there, say so and offer a FILTER.

PROACTIVE INTELLIGENCE:
When the user says "yes", "let's go", "start", "sure", "go", or "go ahead" after the opening greeting - immediately fetch the first Needs Review merchant from context and ask about it. Format exactly:
"Let's start - you have [N] x [MERCHANT]. What are these usually? [suggest 2-3 likely categories]"

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
When a merchant appears with both income and expense transactions (e.g. 'ACME FOODS' as a $62 grocery purchase AND 'ACME FOODS ER' as a $1500 payroll deposit), you MUST handle them as two separate rules. Never create one blanket rule that would match both.

When you detect mixed transaction types for a merchant:
1. Tell the user you see both income and expense transactions under similar names
2. Propose two separate rules and ask the user to confirm each one
3. For the expense variant: use match_type 'contains' with amount_max set to a threshold (e.g. 200)
4. For the income/payroll variant: use match_type 'exact' for the specific suffix variant (e.g. 'ACME FOODS ER') with amount_min set above the threshold

Example flow:
User: "Acme Foods is groceries"
Tag: "I see ACME FOODS charges under $200 (groceries) AND ACME FOODS ER deposits around $1,500 (looks like payroll). Want me to set two rules?
1. ACME FOODS under $200 -> Groceries
2. ACME FOODS ER over $200 -> Income"

If the user confirms, output two SAVE_RULE lines:
SAVE_RULE:{"merchant_pattern":"ACME FOODS","category":"Groceries","match_type":"contains","amount_min":null,"amount_max":200}
SAVE_RULE:{"merchant_pattern":"ACME FOODS ER","category":"Income","match_type":"exact","amount_min":200,"amount_max":null}

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
${TAG_FINANCIAL_RULES}

Conversation rules:
1. If the user tells you the category directly (e.g. "Food & Dining", "Transportation"), accept it immediately  - do NOT ask to confirm again. Just save it.
2. If the user's intent is unclear, ask ONE clarifying question.
3. When the user has stated or confirmed a category, end your message with this exact text on its own line:
   SAVE_RULE:{"merchant_pattern":"${merchant}","category":"<category>","match_type":"exact","amount_min":null,"amount_max":null}
4. If the user says no or skip, just acknowledge and close naturally.
5. NEVER double-confirm. One question max. If they said "Food & Dining" that IS the confirmation.
6. Keep all replies to 1-2 sentences max.
7. Use ONLY these exact category names: ${CATEGORIES.join(', ')}. NEVER invent names not on this list.
${pageContext ? `\nON SCREEN: ${pageContext.transactionCount || 0} transactions in the current view (as reported by the page; not a verified total).` : ''}

IMPORTANT: Only output SAVE_RULE when the user has explicitly confirmed they want a rule saved. Never output it for questions or explanations.

CORRECTION HANDLING: When the user tells you a merchant is wrong, miscategorized, or gives you a correction (e.g. "TD LOAN is a car payment", "that should be Vehicle", "change X to Y", "7-ELEVEN over $30 is fuel"), respond with a <correction> JSON block BEFORE your natural language reply:
<correction>
{"merchant_pattern":"EXACT MERCHANT NAME","category":"Corrected Category","subcategory":"Corrected Subcategory or null","min_amount":null,"max_amount":null}
</correction>
Then confirm the change naturally. For amount-based rules (e.g. "over $30", "under $20", "between $5 and $15"), set min_amount and/or max_amount. Use null for no threshold. Always confirm the amount threshold in your reply.

IS-A PATTERN - HARD RULE: When the user says "[merchant] is [category]" or "[merchant] is [category], [subcategory]" - ALWAYS treat this as a categorization command and emit a <correction> block immediately, saving the rule. The merchant name is everything before the word "is". The category (and optional subcategory after a comma) is everything after "is". Never ignore it. Never ask for clarification. Never respond with a question. Examples:
- "7-ELEVEN is Food & Dining" -> <correction>{"merchant_pattern":"7-ELEVEN","category":"Food & Dining","subcategory":null,"min_amount":null,"max_amount":null}</correction>
- "Petro-Canada is Transportation, Gas & Fuel" -> <correction>{"merchant_pattern":"Petro-Canada","category":"Transportation","subcategory":"Gas & Fuel","min_amount":null,"max_amount":null}</correction>
- "Acme Foods is Income" -> <correction>{"merchant_pattern":"Acme Foods","category":"Income","subcategory":null,"min_amount":null,"max_amount":null}</correction>

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

      // T-LIVE-01 / P-G4: the opening line uses only verified figures. Possible duplicate imports come
      // from the shared integrity signals over the complete paged fetch; categorization status from
      // exact counts (customer-kept "Other" is never unfinished). No dollar totals are volunteered.
      const [openingSummary, openingProgress] = await Promise.all([
        loadTagSpendingSummary(supabase, auth.userId),
        loadCategorizationProgress(supabase, auth.userId),
      ]);
      const dup = openingSummary.integrity?.possibleDuplicates;
      const dupeLine = dup && dup.count > 0
        ? `\n\nHeads up - ${dup.count} transaction${dup.count > 1 ? 's look' : ' looks'} like ${dup.count > 1 ? 'they were' : 'it was'} imported twice (the same statement uploaded more than once). Open any of them and tap "Mark Duplicate" to flag it.`
        : '';

      // Needs Review merchants (counts only; the exact total count comes from the progress counts).
      const { data: needsReview } = await supabase
        .from('transactions')
        .select('merchant_name')
        .eq('user_id', auth.userId)
        .eq('category', 'Needs Review')
        .order('posted_at', { ascending: false, nullsFirst: false })
        .limit(500);
      const rows = needsReview || [];
      const byMerchant = new Map<string, number>();
      for (const r of rows) {
        const m = String(r.merchant_name || 'Unknown');
        byMerchant.set(m, (byMerchant.get(m) || 0) + 1);
      }
      const top = Array.from(byMerchant.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);

      let openingReply: string;
      if (!openingProgress.available) {
        openingReply = `Hey ${firstName} - what can I help you categorize today?` + dupeLine;
      } else if (openingProgress.needsReview > 0) {
        const lines = top.map(([m, n]) => `- ${m} x${n}`).join('\n');
        const sampleNote = rows.length < openingProgress.needsReview ? ' (among the most recent ones)' : '';
        openingReply =
          `Hey ${firstName} - you've got ${openingProgress.needsReview} transaction${openingProgress.needsReview !== 1 ? 's' : ''} in Needs Review.\n\n` +
          `Most common${sampleNote}:\n${lines}\n\n` +
          `Want me to work through them now? I'll go one merchant at a time and ask you about each one.` +
          dupeLine;
      } else if (openingProgress.allCategorized) {
        openingReply = `Hey ${firstName} - everything's categorized: all ${openingProgress.total} transaction${openingProgress.total !== 1 ? 's have' : ' has'} a category. Ask me anything about your categories or merchants.` + dupeLine;
      } else {
        openingReply = `Hey ${firstName} - ${openingProgress.unfinished} transaction${openingProgress.unfinished !== 1 ? 's' : ''} still need a category. Want me to help sort them out?` + dupeLine;
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
  let merchantHistory = { count: 0, countExact: false, categories: [] as string[] };
  if (merchantLower) {
    const { data: merchantTxs } = await supabase
      .from('transactions')
      .select('category, posted_at')
      .eq('user_id', auth.userId)
      .ilike('merchant_name', `%${merchantLower}%`)
      .order('posted_at', { ascending: false })
      .limit(50);
    let exactCount: number | null = null;
    try {
      const { count, error } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .ilike('merchant_name', `%${merchantLower}%`);
      exactCount = error || typeof count !== 'number' ? null : count;
    } catch { exactCount = null; }
    merchantHistory = {
      count: exactCount ?? (merchantTxs?.length || 0),
      countExact: exactCount !== null,
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

  // 4. T-LIVE-01 / P-G4: verified totals are built after the search pre-fetch below (they need the
  // merchant named in the message). The old block read at most the API row cap (~1000 rows) yet was
  // labelled as complete category totals; it has been replaced by the shared engine.
  let focusForTotals: string | null = merchantName || null;

  // 4.5: Pre-fetch transaction data for search intents (page-level only)
  let injectedTxContext: string | null = null;
  if (isPageContext && message) {
    const searchIntent = extractSearchIntent(message);
    // Also extract a merchant token from the raw message even when searchIntent
    // doesn't flag it as a search  - so "how much at 7-eleven?" still prioritizes.
    const MERCHANT_STOPWORDS = new Set([
      'are you sure', 'how much', 'how many', 'how often', 'how frequently',
      'what about', 'tell me', 'let me',
      'thank you', 'thanks', 'yes', 'no', 'okay', 'ok', 'sure', 'maybe',
      'i think', 'i dont', "i don't", 'can you', 'show me', 'please',
      'got it', 'never mind', 'nevermind',
    ]);
    // Strip common leading question phrases so the merchant regex picks
    // up the actual merchant, e.g. "how many shadified" -> "shadified"
    const STRIP_LEADING = /^(how\s+(?:much|many|often|frequently)|what\s+about|show\s+me|tell\s+me|can\s+you|let\s+me)\s+/i;
    const stripped = message.replace(STRIP_LEADING, '').trim();
    const extractFromFallback = (): string | null => {
      const atHit = message.match(/\bat\s+([a-z0-9][a-z0-9 &'.-]{1,30}?)(?:\?|\s*$)/i)?.[1]?.toLowerCase();
      if (atHit) return atHit;
      const tokenHit = stripped.match(/\b([a-z0-9][a-z0-9 &'.-]{2,30})\b/i)?.[1]?.toLowerCase();
      if (!tokenHit) return null;
      const trimmed = tokenHit.trim();
      // Digit-leading tokens like "7 eleven", "7-11", "99 cents" are always
      // real merchant names - never filter them as stopwords/pronouns.
      if (/^[0-9]/.test(trimmed)) return tokenHit;
      if (MERCHANT_STOPWORDS.has(trimmed)) return null;
      // Reject pure pronoun/filler single tokens
      if (/^(the|you|me|my|this|that|it|is|was|were|and|or|but|so|do|does|did)$/i.test(trimmed)) return null;
      return tokenHit;
    };
    const msgMerchant = searchIntent.merchant || extractFromFallback();
    if (msgMerchant) focusForTotals = msgMerchant;
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
          console.log('[tag-chat] merchant priority:', { priorityCount: priorityRows.length, fillCount: Math.max(0, 200 - priorityRows.length) });
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
          const lines = txRows.slice(0, 60).map((t: any, i: number) =>
            `[${i + 1}] id:${t.id} | ${t.date || (t.posted_at || '').split('T')[0]} | ${t.merchant_name || t.description || 'Unknown'} | $${Math.abs(Number(t.amount)).toFixed(2)} | ${t.category || 'Uncategorized'}${t.subcategory ? ' / ' + t.subcategory : ''}`
          );
          injectedTxContext = [
            `LIVE TRANSACTION DATA — SAMPLE of ${txRows.length} rows (newest first${msgMerchant ? `, merchant-prioritized: ${msgMerchant}` : ''}). Individual rows only: never add them up or present them as all transactions; dollar totals come only from VERIFIED SPENDING TOTALS.`,
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

  // 4.6 Verified financial context (skipped for a pure greeting).
  let categoryTotalsBlock = '';
  if (!isQuickChange && !isSmallTalk(message)) {
    const [summary, progress] = await Promise.all([
      loadTagSpendingSummary(supabase, auth.userId, { focusMerchant: focusForTotals }),
      loadCategorizationProgress(supabase, auth.userId),
    ]);
    categoryTotalsBlock = `${formatSpendingBlock(summary)}\n\n${formatProgressBlock(progress)}`;
  } else if (!isQuickChange) {
    categoryTotalsBlock = 'THIS MESSAGE IS A GREETING OR PLEASANTRY. Reply warmly and briefly; do not mention any amount, total, count or opinion about their finances.';
  }

  // 5. Build messages for LLM
  const userMessage = isQuickChange
    ? `I just changed ${merchantName} to ${bodyCategory}.`
    : message;

  const systemPrompt = buildSystemPrompt(
    merchantName, isQuickChange, bodyCategory || (tx as any)?.category || null,
    bodyAmount ?? (tx as any)?.amount ?? null,
    merchantHistory, pageContext, userName, selectedTransaction || null, learnedCategory
  );

  // 6. Call OpenAI
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await callWithRetry(() => openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o',
    temperature: 0.4,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      ...(categoryTotalsBlock ? [{ role: 'system' as const, content: categoryTotalsBlock }] : []),
      ...(injectedTxContext ? [{ role: 'system' as const, content: injectedTxContext }] : []),
      ...effectiveHistory.map((m: { role: string; content: string }) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ],
  }));

  let reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not process that.';
  console.log('[tag-chat] reply received', { chars: reply.length });

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
    'other': { category: 'Other', subcategory: '' },
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

  // T-ACT-FINAL (owner GO 2026-11-25): text the MODEL writes never changes data. <correction>,
  // <delete_rule>, <merchant_sweep/>, SAVE_RULE:{…} and the legacy {"action":"recategorize"} used to
  // write rules / recategorize history / delete rules / reset rows the moment they appeared in the
  // model's reply, with no server-enforced confirmation (and reachable through client-supplied
  // history). They are now stripped and nothing is written; changes go through Tag's signed
  // proposal → explicit confirmation flow (tag-copilot / tag-action).
  let blockedModelWrite = false;
  const stripModelWrite = (re: RegExp) => {
    if (re.test(reply)) { blockedModelWrite = true; reply = reply.replace(re, '').trim(); }
  };
  stripModelWrite(/<correction>[\s\S]*?<\/correction>/g);

  stripModelWrite(/<delete_rule>[\s\S]*?<\/delete_rule>/g);

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

  stripModelWrite(/<merchant_sweep\s*\/?>/g);

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

  // 7./8. SAVE_RULE:{…} and the legacy recategorize JSON: stripped, never executed.
  const ruleSaved = false;
  const backfillCount = 0;
  const action: { action: string; category: string } | null = null;
  stripModelWrite(/\n?SAVE_RULE:\s*\{[^}]+\}/g);
  stripModelWrite(/\n?\{"action"\s*:\s*"recategorize"[^}]*\}/g);
  if (blockedModelWrite) {
    reply = `${reply}${reply ? '\n\n' : ''}I haven't changed anything here. To change a category, save a rule or rename a merchant, ask me in the Tag panel on the Transactions page — I'll show you exactly what will change and wait for your yes.`;
    console.log('[tag-chat] model-emitted change tag ignored (no write)');
  }

  // G11b (owner GO 2026-11-26, unified financial engine: coverage-aware comparisons for every
  // employee): no comparison / trend / stability claim the statement coverage does not support (same
  // rule as the screens); a coverage read failure fails closed. Gated before it is saved or returned.
  let comparisonGate: { applied: boolean; removedSentences: number; reason: string | null } | null = null;
  {
    const gated = await gateReplyForCoverage(reply, () => loadStatementCoverage(supabase as unknown as CoverageDbClient, auth.userId!));
    if (gated.applied) {
      reply = gated.text;
      comparisonGate = { applied: true, removedSentences: gated.removedSentences, reason: gated.reason };
      console.warn(`[tag-chat] comparison claim gated: removed=${gated.removedSentences}`);
    }
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
    body: JSON.stringify({ reply, action, rule_saved: ruleSaved, backfill_count: backfillCount, history: persistedHistory, sessionComplete, handoff: handoffPayload, ...(comparisonGate ? { comparisonGate } : {}) }),
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
