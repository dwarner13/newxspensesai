import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { logAiActivity } from './_shared/logAiActivity.js';
import { TAG_CATEGORIES } from './_shared/tagCategories.js';
import { searchTransactions } from './_shared/txSearchCore.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface LearnedRule {
  vendor_key: string;
  category: string;
  updated_at: string;
}

interface CategorySummary {
  category: string;
  count: number;
  total: number;
}

// ─── Tool definitions ──────────────────────────────────────────────────────
// The model emits structured tool_use blocks instead of free-form JSON in
// reply text. This eliminates the entire class of "Tag claimed Done but
// didn't fire" bugs because tool execution is triggered by the API contract,
// not by regex-extracting JSON from prose. Categories are constrained at the
// schema level — invalid values are rejected by the API before reaching us.

const TAG_TOOLS = [
  {
    name: 'update_single_transaction',
    description:
      "Change the category (and optionally subcategory) on ONE specific transaction. Use this when the user is focused on a particular transaction and wants to change just that one — not all transactions for the merchant, no rule for future imports. Always the FIRST step when a focused transaction is in context. After this fires, OFFER (don't auto-execute) to extend the change via set_category_rule. ALWAYS confirm with the user before calling.",
    input_schema: {
      type: 'object' as const,
      properties: {
        transaction_id: {
          type: 'string',
          description:
            'The exact ID of the transaction to update. Take this from the FOCUSED TRANSACTION block in the system prompt. Do not invent or guess IDs.',
        },
        category: {
          type: 'string',
          enum: [...TAG_CATEGORIES],
          description: 'New main category. MUST be one of the canonical categories.',
        },
        subcategory: {
          type: 'string',
          description: 'Optional subcategory. Include WHENEVER the user named one.',
        },
      },
      required: ['transaction_id', 'category'],
    },
  },
  {
    name: 'set_category_rule',
    description:
      "Save a permanent category rule for a merchant and apply it to all matching transactions. Use when the user wants to categorize a specific merchant (e.g. \"Smitty's is Food & Dining\", \"always categorize Shell as Transportation\", \"Yo Yo Massage should be Personal Care, subcategory Massage\"). The rule auto-applies to future transactions matching this merchant. ALWAYS confirm the change with the user in plain language BEFORE calling this tool — wait for an explicit \"yes\" / \"go ahead\" / \"do it\" before emitting the call.",
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor: {
          type: 'string',
          description:
            'Merchant name or keyword (case-insensitive substring match). Use the user\'s exact wording — do not "correct" or rephrase. Examples: "smittys", "yo yo massage", "shell", "GFS PAY".',
        },
        category: {
          type: 'string',
          enum: [...TAG_CATEGORIES],
          description:
            'Main category. MUST be one of the canonical categories. If the user names a category not in this list, ask them to pick one — do not silently substitute.',
        },
        subcategory: {
          type: 'string',
          description:
            'Subcategory. Include WHENEVER the user named one (e.g. "Gas & Fuel" under Transportation, "Coffee" under Food & Dining, "Massage" or "Wellness" under Personal Care). CRITICAL: when extending after a prior update_single_transaction call (the user is saying yes to "want me to update the others and save a rule?"), you MUST pass the SAME subcategory you used in that prior tool call. Dropping it here will overwrite the existing subcategory on the rule with NULL and degrade the user\'s data. If the prior turn used subcategory="Wellness", this call MUST also use subcategory="Wellness".',
        },
        applyToExisting: {
          type: 'boolean',
          description:
            'Whether to update all existing transactions matching this merchant. Defaults to true unless the user said otherwise.',
        },
      },
      required: ['vendor', 'category'],
    },
  },
  {
    name: 'bulk_recategorize',
    description:
      'Move ALL transactions in one category to another category. Use when the user wants to reclassify an entire bucket (e.g. "move all Other to Food & Dining", "everything in Transfers should be Income"). Does NOT create a rule — only updates existing transactions. ALWAYS confirm before calling.',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_category: {
          type: 'string',
          enum: [...TAG_CATEGORIES],
          description: 'The current category to move transactions out of.',
        },
        to_category: {
          type: 'string',
          enum: [...TAG_CATEGORIES],
          description: 'The destination category to move transactions into.',
        },
      },
      required: ['from_category', 'to_category'],
    },
  },
  {
    name: 'rename_merchant',
    description:
      'Fix a mangled or incorrect merchant name on all matching transactions. Use ONLY when the user explicitly wants to fix an OCR error or rename a merchant (e.g. "Unknown" → "Gordon Food Service", "GFS PAY" → "Gordon Food Service"). Updates merchant_name on every transaction whose current name matches from_name exactly (case-insensitive). ALWAYS confirm before calling. If from_name is ambiguous (user says "rename this one" without naming it), ASK which merchant before emitting.',
    input_schema: {
      type: 'object' as const,
      properties: {
        from_name: {
          type: 'string',
          description: 'Current (incorrect) merchant name. Exact case-insensitive match — no wildcards.',
        },
        to_name: {
          type: 'string',
          description: 'Corrected merchant name to write.',
        },
      },
      required: ['from_name', 'to_name'],
    },
  },
  {
    name: 'search_transactions',
    description:
      'Search and retrieve individual transactions with full details including IDs. READ-ONLY — does not modify data. Returns a subset of matching rows (default 25, max 200) plus totalMatches so you know if more exist. Use when the user asks about SPECIFIC transactions. After retrieving, you can use returned IDs with update_single_transaction.',
    input_schema: {
      type: 'object' as const,
      properties: {
        q: {
          type: 'string',
          description:
            'Text search query. Matches against merchant_name and description (case-insensitive). Example: "Costco", "Netflix", "gas".',
        },
        category: {
          type: 'string',
          description:
            'Filter by exact category name. Example: "Subscriptions", "Food & Dining", "Transportation".',
        },
        startDate: {
          type: 'string',
          description: 'Start date (inclusive) in ISO format. Example: "2026-01-01".',
        },
        endDate: {
          type: 'string',
          description: 'End date (inclusive) in ISO format. Example: "2026-01-31".',
        },
        minAmount: {
          type: 'number',
          description: 'Minimum transaction amount (absolute value). Example: 10.',
        },
        maxAmount: {
          type: 'number',
          description: 'Maximum transaction amount (absolute value). Example: 100.',
        },
        importId: {
          type: 'string',
          description: 'Filter by import/statement ID. Use this when scoped to a specific statement.',
        },
        documentId: {
          type: 'string',
          description: 'Filter by document ID.',
        },
        uncategorizedOnly: {
          type: 'boolean',
          description: 'If true, return only uncategorized transactions.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of rows to return. Default 25, max 200. Use 10-25 for chat display.',
        },
      },
      required: [],
    },
  },
];

function buildSystemPrompt(
  learnedRules: LearnedRule[],
  categorySummary: CategorySummary[],
  uncategorizedCount: number,
  flaggedMerchants: { merchant: string; amount: number; category: string }[],
  yearTotal: { spent: number; income: number }
): string {
  const rulesText = learnedRules.length > 0
    ? learnedRules.map(r => `  ${r.vendor_key} → ${r.category}`).join('\n')
    : '  No rules learned yet';

  const catText = categorySummary
    .slice(0, 8)
    .map(c => `  ${c.category}: ${c.count} txns, $${c.total.toLocaleString()}`)
    .join('\n');

  const flaggedText = flaggedMerchants.length > 0
    ? flaggedMerchants.slice(0, 5).map(f => `  ${f.merchant} $${f.amount.toFixed(2)} (currently: ${f.category})`).join('\n')
    : '  None';

  return `You are Tag — XspensesAI's sharp, friendly categorization expert. You are speaking with the user from the Categories dashboard. You have full visibility into their spending categories and the rules you have learned.

USER'S FINANCES (recent activity — up to 1500 most recent transactions):
- Total spent: $${yearTotal.spent.toLocaleString()}
- Total income: $${yearTotal.income.toLocaleString()}
- Uncategorized transactions: ${uncategorizedCount}

SPENDING CATEGORIES:
${catText}

RULES I HAVE LEARNED (vendor → category):
${rulesText}

TRANSACTIONS NEEDING REVIEW:
${flaggedText}

═══════════════════════════════════════════════════════════════════════
HOW YOU MAKE CHANGES — READ CAREFULLY
═══════════════════════════════════════════════════════════════════════

You have FIVE tools available:
  - search_transactions — LOOK UP individual transactions by merchant, category, date, amount (READ-ONLY)
  - update_single_transaction — change ONE specific transaction
  - set_category_rule — save a permanent rule + apply to all matching transactions
  - bulk_recategorize — move all transactions in one category to another
  - rename_merchant — fix a mangled merchant name across all matching transactions

═══════════════════════════════════════════════════════════════════════
WHEN AND HOW TO USE search_transactions
═══════════════════════════════════════════════════════════════════════

Use search_transactions when the user asks about SPECIFIC transactions and you
need details beyond the aggregate summaries above. Examples:
  - "What are my 3 Subscriptions totaling $22?"
  - "Show me my Costco purchases"
  - "What did I spend at restaurants last month?"
  - "Which transactions are uncategorized?"

Do NOT use search_transactions for questions you can already answer from the
CATEGORY SUMMARY or MERCHANT DATA above (e.g. "how much did I spend on Food?").

SEARCH RESULTS DISPLAY RULES — CRITICAL:
  - The search returns { totalMatches, returnedCount, transactions[] }.
  - NEVER dump raw transaction rows into chat. Users don't want a wall of text.
  - Default limit is 25. Use 10-25 for normal requests.
  - When results arrive, SUMMARIZE first: "I found **47** Subscriptions
    transactions totaling **$1,200**. Here are the **10 most recent**:"
  - Show a USEFUL SUBSET (10-25 rows), formatted cleanly.
  - When totalMatches > returnedCount, ALWAYS tell the user:
    "There are **37 more** — want me to narrow by date, merchant, or amount?"
  - Offer to filter further: by year/month, merchant name, amount range, or
    statement/import.
  - Each row includes a transaction ID. You can use these IDs with
    update_single_transaction if the user wants to change a category.

═══════════════════════════════════════════════════════════════════════
TWO-STEP FLOW WHEN A FOCUSED TRANSACTION IS PRESENT
═══════════════════════════════════════════════════════════════════════

If the system prompt contains a FOCUSED TRANSACTION block, the user is looking
at ONE specific transaction in the UI (drawer, detail view, etc). DEFAULT to
changing only that one transaction first. Then ASK whether to extend.

Step 1 — Confirm change to THIS transaction only:
  - Reply: "Got it — change this **<merchant>** on **<date>** to <category>/<subcategory>?"
  - Wait for "yes" / "go ahead" / etc. DO NOT call any tool yet.

Step 2 — On confirmation, call update_single_transaction with the focused
  transaction's ID. The system writes a "✓ Updated this transaction" line.

Step 3 — In your SAME reply (after the tool fires), ASK about extending:
  - "Want me to update the other <N> <merchant> transactions and save a rule for future imports?"
  - <N> is the count of OTHER matching transactions (excluding the one you just updated).
  - If there are no other matching transactions, just say "No other <merchant> transactions to update — done."

Step 4 — On second confirmation, call set_category_rule with applyToExisting=true.
  This applies to all matching transactions including future imports.

═══════════════════════════════════════════════════════════════════════
ONE-STEP FLOW WHEN NO FOCUSED TRANSACTION
═══════════════════════════════════════════════════════════════════════

If there's no FOCUSED TRANSACTION block, the user is in a general context.
Use set_category_rule directly with the standard two-turn confirm pattern:

Turn 1: "Want me to set <merchant> to <category>/<subcategory> and apply to
all <N> matching transactions plus future imports?"
Turn 2: User confirms → call set_category_rule.

═══════════════════════════════════════════════════════════════════════
GENERAL RULES
═══════════════════════════════════════════════════════════════════════

NEVER call a tool on the same turn the user makes the request. NEVER call a tool
without explicit confirmation ("yes" / "go ahead" / "do it" / "confirm").

If the user names a category not in the canonical list, ask them to pick one.
Do not silently substitute.

If the user says "Personal Care, subcategory Massage", obey EXACTLY: set
category="Personal Care", subcategory="Massage". Do not editorialize. Do not
pick a different subcategory you think fits better.

If the user's request is ambiguous (e.g. "fix this one" without naming a
merchant when no FOCUSED TRANSACTION is set), ASK rather than guessing. Never
invent a merchant name or category that wasn't in the conversation.

═══════════════════════════════════════════════════════════════════════
YOUR PERSONALITY AND VOICE
═══════════════════════════════════════════════════════════════════════

- You are Tag. Talk like a sharp friend, not a report generator.
- HARD LIMIT: Maximum 2 sentences, then ONE question. No bullet points, no lists, no headers.
- When proposing a change, the second sentence is your confirmation question.
- After a tool fires, the system writes the confirmation — you don't speak.
- Example: "Transfers are eating **44%** of your spend — that's unusually high. What are those payments going to?"

FORMATTING:
- Wrap key numbers in **double asterisks**: dollar amounts, counts, percentages, dates.
- Example: "You hit Costco for **$1,661.80** across **7 transactions** last month."
- Only bold the 1-3 numbers that are the actual news. If everything is bold, nothing is.

═══════════════════════════════════════════════════════════════════════
MERCHANT INTELLIGENCE — HIGH-INTEREST LENDERS
═══════════════════════════════════════════════════════════════════════

Some merchants are payday lenders or short-term installment lenders with APRs typically 20-60%+. When you recognize one, flag it briefly.
Canadian: Lend Direct, Cash Money, Money Mart, easyfinancial, Mogo, Fairstone, Spring Financial, iCash, Magical Credit, Loans Canada, 310-LOAN, GoDay, Cashco, Captain Cash, LoanConnect.
US: OppLoans, CashNetUSA, Check Into Cash, Ace Cash Express, Speedy Cash, Advance America, Rise Credit, NetCredit, OneMain Financial.

When flagging:
- State it's high-interest lending + rough APR range (e.g. "30-40%+")
- Confirm you're categorizing as Debt Payments
- Offer to loop in Goalie for a payoff plan
- Example: "Lend Direct is a Canadian alternative lender — APRs typically **30-45%**. I see **8** payments totaling **$331**. Want me to loop in Goalie?"

Do NOT flag: prime banks (RBC, TD, BMO, Scotia, CIBC), credit unions, mortgages, auto loans from major lenders, student loans, regular credit card payments.

═══════════════════════════════════════════════════════════════════════
AMOUNT ANOMALY RULE
═══════════════════════════════════════════════════════════════════════

If the user asks about a transaction where the amount is unusually high for that merchant (more than ~3x typical for the merchant type), flag it before categorizing. Be specific — name the merchant, state the amount, give a realistic comparison ("A **$147** charge at 7-Eleven is about 18x a typical visit"). End the flag with: "I'd verify this against your bank app or original statement before I lock in a category — this one looks off." Never skip this when the amount is suspicious; protecting the user from miscategorizing a fraud or duplicate charge is non-negotiable.

═══════════════════════════════════════════════════════════════════════
SOURCE ATTRIBUTION
═══════════════════════════════════════════════════════════════════════

Each RECENT TRANSACTION line includes "from {statement name}" when we know its source. When the user asks "where did this come from?" or "which card?" or "which statement?", quote that source directly. If a line has no "from {...}" suffix, the source is genuinely unknown — say so honestly, don't guess.`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  // Rate limiting removed — was referencing an undefined helper that crashed
  // the function. Add back with proper imports post-launch; pre-launch there's
  // nobody to rate-limit.

  const body = JSON.parse(event.body || '{}');
  const { message, history = [], systemPromptOverride, importId, focusedTransaction } = body;

  if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
      }
    );

    // 1. Load learned rules
    const { data: rulesData } = await supabase
      .from('vendor_category_memory')
      .select('vendor_key, category, updated_at')
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    const learnedRules: LearnedRule[] = rulesData || [];

    // 2. Load transactions (cap at 1500, ordered by recency).
    // Order-by-date + 1500 covers ~6-12 months for most users — wide enough
    // that mid-range merchants like Urban Kids or Sportsnet stay visible.
    let txQuery = supabase
      .from('transactions')
      .select('amount, category, merchant_name, posted_at, date, import_id, subcategory')
      .eq('user_id', auth.userId)
      .order('posted_at', { ascending: false, nullsFirst: false });
    if (importId) txQuery = txQuery.eq('import_id', importId);
    const { data: allTxs } = await txQuery.limit(1500);

    // 2b. Source attribution: resolve import_id → statement display label.
    const importIds = Array.from(new Set((allTxs || []).map(t => t.import_id).filter(Boolean))) as string[];
    const importMap: Record<string, { label: string; issuer: string | null }> = {};
    if (importIds.length > 0) {
      try {
        const { data: impData } = await supabase
          .from('imports')
          .select('id, filename, issuer')
          .in('id', importIds);
        for (const imp of impData || []) {
          const baseName = String(imp.filename || '').replace(/\.(pdf|csv|xlsx?|txt)$/i, '').trim();
          const issuer = imp.issuer ? String(imp.issuer) : null;
          const label = issuer && baseName
            ? `${issuer} · ${baseName}`
            : (issuer || baseName || '(unknown statement)');
          importMap[imp.id] = { label, issuer };
        }
      } catch (e: any) {
        console.error('[tag-copilot] imports lookup failed:', e?.message);
      }
    }

    // 3. Aggregate by category
    const catMap: Record<string, { count: number; total: number }> = {};
    let yearSpent = 0;
    let yearIncome = 0;
    for (const t of allTxs || []) {
      const amt = Math.abs(Number(t.amount || 0));
      const cat = t.category || 'Other';
      if (cat === 'Income') { yearIncome += amt; continue; }
      yearSpent += amt;
      if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
      catMap[cat].count++;
      catMap[cat].total += amt;
    }
    const categorySummary: CategorySummary[] = Object.entries(catMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([category, d]) => ({ category, count: d.count, total: Math.round(d.total) }));

    const flaggedMerchants = (allTxs || [])
      .filter(t => !t.category || t.category === 'Uncategorized' || t.category === 'Other')
      .slice(0, 5)
      .map(t => ({
        merchant: t.merchant_name || 'Unknown',
        amount: Math.abs(Number(t.amount || 0)),
        category: t.category || 'Uncategorized',
      }));
    const uncategorizedCount = (allTxs || []).filter(
      t => !t.category || t.category === 'Uncategorized'
    ).length;

    // 3b. Merchant-level data so Tag can answer "how much at Rogers?"
    const merchantMap: Record<string, { count: number; total: number; category: string; lastDate: string }> = {};
    for (const t of allTxs || []) {
      const m = String(t.merchant_name || 'Unknown').trim();
      if (!m || m === 'Unknown') continue;
      const amt = Math.abs(Number(t.amount || 0));
      const d = t.posted_at || t.date || '';
      if (!merchantMap[m]) {
        merchantMap[m] = { count: 0, total: 0, category: t.category || 'Uncategorized', lastDate: d };
      }
      merchantMap[m].count++;
      merchantMap[m].total += amt;
      if (d > merchantMap[m].lastDate) merchantMap[m].lastDate = d;
    }
    const topMerchants = Object.entries(merchantMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 30);

    const recentTxs = [...(allTxs || [])]
      .sort((a, b) => String(b.posted_at || b.date || '').localeCompare(String(a.posted_at || a.date || '')))
      .slice(0, 20);

    const totalCount = (allTxs || []).length;
    const needsReviewCount = (allTxs || []).filter(t => t.category === 'Needs Review').length;
    const categorizedCount = totalCount - uncategorizedCount - needsReviewCount;

    const merchantDataBlock = `\n\nMERCHANT DATA (real numbers from the user's actual transactions)${importId ? ' — SCOPED TO ONE STATEMENT' : ''}:

TOP MERCHANTS BY TOTAL:
${topMerchants.length > 0
  ? topMerchants.map(([m, d]) => `  ${m}: $${d.total.toFixed(2)} across ${d.count} txn${d.count !== 1 ? 's' : ''} (last: ${d.lastDate || 'unknown'}, cat: ${d.category})`).join('\n')
  : '  (none)'}

RECENT TRANSACTIONS (newest first):
${recentTxs.length > 0
  ? recentTxs.map(t => {
      const src = t.import_id && importMap[t.import_id] ? ` from ${importMap[t.import_id].label}` : '';
      return `  ${t.posted_at || t.date || '?'} ${t.merchant_name || 'Unknown'} $${Math.abs(Number(t.amount || 0)).toFixed(2)} [${t.category || 'Uncategorized'}]${src}`;
    }).join('\n')
  : '  (none)'}

TRANSACTION COUNTS${importId ? ' (this statement only)' : ''}:
  Total: ${totalCount}
  Categorized: ${categorizedCount}
  Uncategorized: ${uncategorizedCount}
  Needs Review: ${needsReviewCount}
${importId ? '\nSCOPE: You are looking at ONE specific statement (import_id: ' + importId + '). Answer questions about THIS statement unless the user explicitly asks about their overall picture.' : ''}

RULES FOR USING MERCHANT DATA:
- When the user asks about a specific merchant, search TOP MERCHANTS and RECENT TRANSACTIONS above. Quote the exact amounts and counts you find there.
- If a merchant isn't in the lists, say so honestly — don't guess.
- Never invent amounts. Every number in your reply must appear in the data above.`;

    // 3c. Focused transaction block. When the panel is opened from a drawer
    // or single-row context, the caller passes focusedTransaction with the
    // row's id, merchant, amount, date, and current categorization. We render
    // this into the prompt so Tag knows which transaction "this one" refers
    // to AND can suggest extending the change to other matching rows.
    let focusedTransactionBlock = '';
    if (focusedTransaction && focusedTransaction.id && focusedTransaction.merchant_name) {
      const ft = focusedTransaction;
      const ftMerchant = String(ft.merchant_name);
      const ftAmount = Number(ft.amount || 0);
      const ftDate = ft.posted_at || ft.date || 'unknown date';
      const ftCategory = ft.category || 'Uncategorized';
      const ftSubcategory = ft.subcategory || '(none)';

      // Count OTHER transactions matching this merchant (not including the
      // focused one). Drives the "Want me to update the other N" question.
      let otherCount = 0;
      try {
        const { count } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .ilike('merchant_name', `%${ftMerchant}%`)
          .neq('id', ft.id);
        otherCount = count || 0;
      } catch (e: any) {
        console.error('[tag-copilot] focused merchant count failed:', e?.message);
      }

      focusedTransactionBlock = `

═══════════════════════════════════════════════════════════════════════
FOCUSED TRANSACTION (the user is looking at this specific transaction)
═══════════════════════════════════════════════════════════════════════
  ID: ${ft.id}
  Merchant: ${ftMerchant}
  Amount: $${Math.abs(ftAmount).toFixed(2)}
  Date: ${ftDate}
  Current category: ${ftCategory}
  Current subcategory: ${ftSubcategory}
  Other transactions for this merchant: ${otherCount}

When the user wants to change a category, FOLLOW THE TWO-STEP FLOW:
  Step 1: confirm change to THIS transaction only ("change this MERCHANT on DATE to CAT/SUB?")
  Step 2: on user "yes", call update_single_transaction with transaction_id="${ft.id}"
  Step 3: SERVER appends a confirmation AND a follow-up question asking whether to extend to the other ${otherCount} ${ftMerchant} transactions. You do NOT write this follow-up yourself — emit ONLY the tool call (and optionally a brief acknowledgment text). The system appends the rest.
  Step 4: on the next user "yes", call set_category_rule with vendor="${ftMerchant}" and the SAME category/subcategory you used in step 2. CRITICAL: do not drop subcategory between calls — re-pass the exact value.

If there are zero other matching transactions (other count = 0), the server will say so — still don't write a follow-up yourself.`;
    }

    // 4. Call Claude with tools
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: (systemPromptOverride || buildSystemPrompt(learnedRules, categorySummary, uncategorizedCount, flaggedMerchants, { spent: yearSpent, income: yearIncome })) + merchantDataBlock + focusedTransactionBlock,
      tools: TAG_TOOLS,
      messages: [
        ...history.map((m: { role: string; content: string }) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    });

    // 5. Extract reply text + tool_use block.
    // Single-turn pattern: we execute the tool ourselves and return the
    // result directly. We do NOT round-trip a tool_result back to the model
    // — the deterministic confirmation line below is what the user sees.
    const textBlocks = response.content.filter((b: any) => b.type === 'text');
    const toolUseBlock = response.content.find((b: any) => b.type === 'tool_use') as
      | { type: 'tool_use'; id: string; name: string; input: Record<string, any> }
      | undefined;

    const replyText = textBlocks.map((b: any) => (b as any).text).join('\n').trim();

    let action: Record<string, any> | null = null;
    let confirmationLine = '';

    // Pre-action Needs Review count for completion check
    let preActionNRCount = Infinity;
    if (toolUseBlock) {
      try {
        const { count: nrc } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .eq('category', 'Needs Review');
        preActionNRCount = nrc || 0;
      } catch { /* non-blocking */ }
    }

    // 6. Execute the tool the model called.
    if (toolUseBlock) {
      action = { tool: toolUseBlock.name, ...toolUseBlock.input, applied: false };

      try {
        if (toolUseBlock.name === 'update_single_transaction') {
          const transactionId = String(toolUseBlock.input.transaction_id || '').trim();
          const category = String(toolUseBlock.input.category || '');
          const subcategory = toolUseBlock.input.subcategory
            ? String(toolUseBlock.input.subcategory).trim()
            : null;

          if (!transactionId || !category) {
            confirmationLine = `\n\n⚠ Could not update transaction — missing id or category.`;
          } else {
            // Ownership-scoped update. .eq('user_id') is the access control —
            // a malicious tool call with a foreign transaction_id will match
            // zero rows because the user_id won't align.
            const txUpdate: Record<string, unknown> = {
              category,
              category_source: 'tag_single',
              updated_at: new Date().toISOString(),
            };
            if (subcategory) {
              txUpdate.subcategory = subcategory;
              txUpdate.subcategory_source = 'tag_single';
            }
            const { error: updErr, data: updRows } = await supabase
              .from('transactions')
              .update(txUpdate)
              .eq('id', transactionId)
              .eq('user_id', auth.userId)
              .select('id, merchant_name, category, subcategory');

            if (updErr) {
              console.error('[tag-copilot] single-tx update failed', updErr.message);
              confirmationLine = `\n\n⚠ Could not update transaction: ${updErr.message}`;
            } else if (!updRows || updRows.length === 0) {
              // Either the id doesn't exist or doesn't belong to this user.
              confirmationLine = `\n\n⚠ Transaction not found or not accessible.`;
            } else {
              const row = updRows[0];
              const catLabel = row.subcategory
                ? `${row.category} / ${row.subcategory}`
                : row.category;
              action.applied = true;
              action.affectedCount = 1;
              action.verification = {
                transactionId: row.id,
                merchant: row.merchant_name,
                category: row.category,
                subcategory: row.subcategory ?? null,
              };
              confirmationLine = `\n\n✓ Updated this transaction: **${row.merchant_name}** → **${catLabel}**.`;

              // ─── Follow-up question: extend to merchant + save rule? ──────
              // Count other matching transactions for the merchant. If 0, no
              // follow-up needed — say so and stop. If >0, ask the user.
              //
              // Strategy A (multi-turn): second API call lets the model write
              // a natural follow-up in Tag's voice that includes the category
              // and subcategory params explicitly. Embedding the params in
              // the question text means they're in conversation history when
              // the user says "yes" — the next turn's set_category_rule call
              // sees them and carries them forward correctly.
              //
              // Strategy B (template): if A errors / times out / returns
              // empty, fall back to a deterministic templated question that
              // also explicitly contains the params. Either way, "yes" on
              // the next turn fires set_category_rule with full context.
              try {
                const merchantName = row.merchant_name;
                const { count: otherCount } = await supabase
                  .from('transactions')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', auth.userId)
                  .ilike('merchant_name', `%${merchantName}%`)
                  .neq('id', row.id);
                const others = otherCount || 0;

                if (others === 0) {
                  confirmationLine += ` No other ${merchantName} transactions to update — done.`;
                } else {
                  // Build the templated fallback first (ground truth).
                  const templateQuestion = `Want me to update the other **${others}** ${merchantName} transaction${others !== 1 ? 's' : ''} and save a rule for **${catLabel}**? Say yes to extend.`;

                  // Try multi-turn (Strategy A) — wrap in 3s timeout.
                  let naturalQuestion = '';
                  try {
                    const followupAbort = new AbortController();
                    const followupTimer = setTimeout(() => followupAbort.abort(), 3000);
                    const followup = await anthropic.messages.create({
                      model: 'claude-haiku-4-5-20251001',
                      max_tokens: 120,
                      system: `You are Tag. You just updated ONE transaction (${merchantName}) to ${catLabel}. The user has ${others} other matching ${merchantName} transactions. Ask if they want to update those too and save a rule.

REQUIREMENTS:
- ONE sentence, casual.
- MUST mention the count: ${others}.
- MUST mention the merchant: ${merchantName}.
- MUST mention the category and subcategory exactly: ${catLabel}.
- End with a yes-prompt.
- No greetings, no preamble. Just the question.`,
                      messages: [{ role: 'user', content: 'Write the follow-up question.' }],
                    }, { signal: followupAbort.signal as any });
                    clearTimeout(followupTimer);
                    const block = followup.content.find((b: any) => b.type === 'text') as { text: string } | undefined;
                    const text = (block?.text || '').trim();
                    // Sanity-check the model's answer contains the critical
                    // params. If it dropped the count or category, fall back.
                    if (text
                        && text.includes(String(others))
                        && text.toLowerCase().includes(merchantName.toLowerCase().slice(0, 8))
                        && (text.includes(category) || text.toLowerCase().includes(category.toLowerCase()))) {
                      naturalQuestion = text;
                    }
                  } catch (followupErr: any) {
                    console.error('[tag-copilot] followup multi-turn failed:', followupErr?.message);
                  }

                  confirmationLine += `\n\n${naturalQuestion || templateQuestion}`;
                }
              } catch (countErr: any) {
                console.error('[tag-copilot] follow-up count failed:', countErr?.message);
                // Don't block the success message on this — just skip the follow-up.
              }
            }
          }
        } else if (toolUseBlock.name === 'set_category_rule') {
          const vendor = String(toolUseBlock.input.vendor || '').trim();
          const category = String(toolUseBlock.input.category || '');
          let subcategory: string | null = toolUseBlock.input.subcategory
            ? String(toolUseBlock.input.subcategory).trim()
            : null;
          const applyToExisting = toolUseBlock.input.applyToExisting !== false;

          if (!vendor || !category) {
            confirmationLine = `\n\n⚠ Could not save rule — missing vendor or category.`;
          } else {
            const vendorKey = vendor.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
            const merchantPattern = vendor.toUpperCase();

            // ─── Subcategory preservation ───────────────────────────────────
            // If the model omitted subcategory but a row already exists with
            // one, KEEP the existing value. The model often drops subcategory
            // on the second tool call (after update_single_transaction), and
            // an upsert with subcategory absent overwrites it to NULL.
            // Read existing rule first; preserve any subcategory that's there.
            if (!subcategory) {
              try {
                const { data: existingRule } = await supabase
                  .from('category_rules')
                  .select('subcategory')
                  .eq('user_id', auth.userId)
                  .ilike('merchant_pattern', merchantPattern)
                  .limit(1)
                  .maybeSingle();
                if (existingRule?.subcategory) {
                  subcategory = existingRule.subcategory;
                  console.log(`[tag-copilot] preserving existing subcategory "${subcategory}" for ${merchantPattern} (model omitted it)`);
                }
              } catch (e: any) {
                console.error('[tag-copilot] existing-rule read failed:', e?.message);
              }
            }

            // ─── Write 1: vendor_category_memory ─────────────────────────────
            // Surfacing this error too — used to be a silent await with no
            // capture. The two-table dual-write needs both halves to land.
            const vcmRow: Record<string, unknown> = {
              user_id: auth.userId,
              vendor_key: vendorKey,
              category,
              updated_at: new Date().toISOString(),
            };
            if (subcategory) vcmRow.subcategory = subcategory;
            const { error: vcmErr } = await supabase
              .from('vendor_category_memory')
              .upsert(vcmRow, { onConflict: 'user_id,vendor_key' });
            if (vcmErr) console.error('[tag-copilot] vendor_category_memory upsert failed:', vcmErr.message);

            // ─── Write 2: category_rules ─────────────────────────────────────
            // Writes BOTH merchant_pattern (canonical) AND match_value (legacy).
            // Conflict on user_id+merchant_pattern matches the unique constraint.
            const ruleRow: Record<string, unknown> = {
              user_id: auth.userId,
              match_type: 'contains',
              merchant_pattern: merchantPattern,
              match_value: merchantPattern,
              category,
              is_active: true,
              updated_at: new Date().toISOString(),
            };
            if (subcategory) ruleRow.subcategory = subcategory;
            const { error: ruleErr } = await supabase
              .from('category_rules')
              .upsert(ruleRow, { onConflict: 'user_id,merchant_pattern' });

            // ─── Read-back verification ──────────────────────────────────────
            // Truth-mode: confirmation string is built from what's actually in
            // the DB after writes. Detects silent failures (RLS, constraint
            // violations, dual-write split where one table writes and the
            // other doesn't) and surfaces them to the user instead of lying.
            const { data: verifyRow } = await supabase
              .from('category_rules')
              .select('category, subcategory')
              .eq('user_id', auth.userId)
              .ilike('merchant_pattern', merchantPattern)
              .limit(1)
              .maybeSingle();

            // ─── Apply to existing transactions ──────────────────────────────
            // Count matched rows BEFORE the update — see top of this branch
            // for full reasoning on why we don't use chained .update().select().
            let updatedCount = 0;
            if (applyToExisting) {
              const { count: matchedCount } = await supabase
                .from('transactions')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', auth.userId)
                .ilike('merchant_name', `%${vendor}%`);
              updatedCount = matchedCount || 0;

              const txUpdate: Record<string, unknown> = {
                category,
                category_source: 'tag_rule',
                updated_at: new Date().toISOString(),
              };
              if (subcategory) {
                txUpdate.subcategory = subcategory;
                txUpdate.subcategory_source = 'tag_rule';
              }
              const { error: updErr } = await supabase
                .from('transactions')
                .update(txUpdate)
                .eq('user_id', auth.userId)
                .ilike('merchant_name', `%${vendor}%`);
              if (updErr) console.error('[tag-copilot] transactions update failed', updErr.message);
            }

            // ─── Build confirmation: truth-mode ──────────────────────────────
            // verifyRow null = rule write failed. Surface it. No lying.
            if (!verifyRow) {
              const reason = ruleErr?.message || 'no row found after upsert';
              action.applied = false;
              action.error = `rule_persist_failed: ${reason}`;
              confirmationLine = `\n\n⚠ Couldn't save the rule for **${vendor}**: ${reason}. ${updatedCount > 0 ? `(${updatedCount} transactions WERE updated, but future imports won't auto-categorize.)` : ''}`;
            } else {
              const catLabel = verifyRow.subcategory
                ? `${verifyRow.category} / ${verifyRow.subcategory}`
                : verifyRow.category;
              action.applied = true;
              action.affectedCount = updatedCount;
              action.verification = {
                rule: { category: verifyRow.category, subcategory: verifyRow.subcategory ?? null },
                transactionsUpdated: updatedCount,
              };
              confirmationLine = `\n\n✓ Saved rule: **${vendor}** → **${catLabel}**. Updated **${updatedCount}** transaction${updatedCount !== 1 ? 's' : ''}.`;
            }
          }
        } else if (toolUseBlock.name === 'bulk_recategorize') {
          const fromCat = String(toolUseBlock.input.from_category || '').trim();
          const toCat = String(toolUseBlock.input.to_category || '').trim();

          if (!fromCat || !toCat) {
            confirmationLine = `\n\n⚠ Could not bulk recategorize — missing source or destination category.`;
          } else if (fromCat === toCat) {
            confirmationLine = `\n\n⚠ Source and destination are the same (${fromCat}) — nothing to do.`;
          } else {
            // Count matched rows BEFORE the update — see set_category_rule
            // above for full reasoning. Bulk moves are guaranteed to change
            // values (we already filtered fromCat !== toCat above), so this
            // matters less here, but consistent semantics across all branches
            // is worth one extra query.
            const { count: matchedCount } = await supabase
              .from('transactions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', auth.userId)
              .eq('category', fromCat);
            const n = matchedCount || 0;

            const { error: updErr } = await supabase
              .from('transactions')
              .update({ category: toCat, category_source: 'tag_bulk', updated_at: new Date().toISOString() })
              .eq('user_id', auth.userId)
              .eq('category', fromCat);
            if (updErr) console.error('[tag-copilot] bulk update failed', updErr.message);

            action.applied = true;
            action.affectedCount = n;
            action.verification = { transactionsUpdated: n };
            confirmationLine = `\n\n✓ Moved **${n}** transaction${n !== 1 ? 's' : ''} from **${fromCat}** to **${toCat}**.`;
          }
        } else if (toolUseBlock.name === 'rename_merchant') {
          const fromName = String(toolUseBlock.input.from_name || '').trim();
          const toName = String(toolUseBlock.input.to_name || '').trim();

          if (!fromName || !toName) {
            confirmationLine = `\n\n⚠ Could not rename merchant — missing source or destination name.`;
          } else {
            // Case-insensitive EXACT match (ilike without wildcards).
            // Precision over recall — we don't want "Rogers" → "Rogers Wireless"
            // to also rename rows that happen to contain "Rogers".
            //
            // Count matched rows BEFORE the update for the same reason as
            // set_category_rule above. Edge case: if user renames "ROGERS"
            // → "ROGERS" (same casing post-normalization, no change), the
            // chained-count would return 0; matched count returns the real
            // number of transactions touched.
            const { count: matchedCount } = await supabase
              .from('transactions')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', auth.userId)
              .ilike('merchant_name', fromName);
            const n = matchedCount || 0;

            const { error: updErr } = await supabase
              .from('transactions')
              .update({ merchant_name: toName, updated_at: new Date().toISOString() })
              .eq('user_id', auth.userId)
              .ilike('merchant_name', fromName);
            if (updErr) console.error('[tag-copilot] rename update failed', updErr.message);

            action.applied = true;
            action.affectedCount = n;
            action.verification = { transactionsUpdated: n };
            confirmationLine = `\n\n✓ Renamed **${n}** transaction${n !== 1 ? 's' : ''} from **${fromName}** to **${toName}**.`;
          }
        } else if (toolUseBlock.name === 'search_transactions') {
          // READ-ONLY tool — userId injected server-side, never from model input.
          // The model provides search filters only; user_id is NOT in the schema.
          const modelLimit = Number.isFinite(Number(toolUseBlock.input.limit))
            ? Math.max(1, Math.min(200, Number(toolUseBlock.input.limit)))
            : 25;
          const searchParams = {
            q: toolUseBlock.input.q ? String(toolUseBlock.input.q).trim() : undefined,
            category: toolUseBlock.input.category ? String(toolUseBlock.input.category).trim() : undefined,
            startDate: toolUseBlock.input.startDate ? String(toolUseBlock.input.startDate).trim() : undefined,
            endDate: toolUseBlock.input.endDate ? String(toolUseBlock.input.endDate).trim() : undefined,
            minAmount: Number.isFinite(Number(toolUseBlock.input.minAmount)) ? Number(toolUseBlock.input.minAmount) : undefined,
            maxAmount: Number.isFinite(Number(toolUseBlock.input.maxAmount)) ? Number(toolUseBlock.input.maxAmount) : undefined,
            importId: toolUseBlock.input.importId ? String(toolUseBlock.input.importId).trim() : (importId || undefined),
            documentId: toolUseBlock.input.documentId ? String(toolUseBlock.input.documentId).trim() : undefined,
            uncategorizedOnly: toolUseBlock.input.uncategorizedOnly === true,
            limit: modelLimit,
          };

          const result = await searchTransactions(supabase, auth.userId, searchParams);
          // Mark as read-only — don't trigger Prime notifications or activity logs
          action.applied = false;
          action.readOnly = true;
          action.affectedCount = result.returnedCount;
          action.totalMatches = result.totalMatches;
          action.searchResults = result.transactions;

          // Format results for the model to read and relay to the user.
          if (result.returnedCount === 0) {
            confirmationLine = `\n\n[SEARCH: **0** matches found]`;
          } else {
            const lines = result.transactions.map((r, i) =>
              `${i + 1}. id:${r.id} | ${r.posted_at || r.date || '?'} | ${r.merchant_name || 'Unknown'} | $${Math.abs(r.amount).toFixed(2)} | ${r.category || 'Uncategorized'}${r.subcategory ? ' / ' + r.subcategory : ''}`
            );
            const moreNote = result.totalMatches > result.returnedCount
              ? `\n[Showing ${result.returnedCount} of ${result.totalMatches} total matches — tell the user more exist and offer to narrow]`
              : '';
            confirmationLine = `\n\n[SEARCH: **${result.totalMatches}** total matches, showing **${result.returnedCount}** newest]\n${lines.join('\n')}${moreNote}`;
          }
        } else {
          confirmationLine = `\n\n⚠ Unknown tool: ${toolUseBlock.name}`;
        }
      } catch (toolErr: any) {
        console.error('[tag-copilot] tool execution failed:', toolErr?.message);
        confirmationLine = `\n\n⚠ Tool execution failed: ${toolErr?.message || 'unknown error'}`;
        if (action) action.error = toolErr?.message;
      }
    }

    // 7. Notify Prime when Needs Review is almost clear.
    if (action?.applied) {
      try {
        const { count: postNRCount } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId)
          .eq('category', 'Needs Review');
        const nr = postNRCount || 0;
        if (nr < 5 && nr < preActionNRCount) {
          const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
          const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
          fetch(`${baseUrl}/.netlify/functions/prime-inbox-writer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
            body: JSON.stringify({
              title: 'Your books are clean \u265B',
              message: `Needs Review is down to ${nr} transaction${nr !== 1 ? 's' : ''}. Ready to generate your Tax Summary?`,
              ctaButtons: [
                { label: 'View Tax Summary', route: '/dashboard/tax-summary' },
                { label: 'Generate Report', route: '/dashboard/reports' },
              ],
            }),
          }).catch(() => {});
        }
      } catch { /* fire and forget */ }
    }

    // 8. Activity log
    if (action?.applied) {
      const authToken = (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      const tool = String(action.tool || 'unknown');
      const vendor = String(action.vendor || action.from_name || '');
      const category = String(action.category || action.to_category || '');
      const label = tool === 'bulk_recategorize'
        ? `Bulk recategorized ${action.affectedCount || 0} transactions from ${action.from_category} to ${action.to_category}`
        : tool === 'rename_merchant'
          ? `Renamed ${action.affectedCount || 0} transactions from ${action.from_name} to ${action.to_name}`
          : tool === 'update_single_transaction'
            ? `Updated single transaction → ${category}`
            : `Categorized ${vendor || 'transaction'} as ${category}`;
      logAiActivity(authToken, {
        employeeId: 'tag-ai',
        eventType: 'categorization_complete',
        status: 'success',
        label,
        details: { tool, vendor, category, ...(action.verification || {}) },
      }).catch(() => { /* fire and forget */ });
    }

    const finalReply = (replyText + confirmationLine).trim()
      || (toolUseBlock ? confirmationLine.trim() : "Sorry, I couldn't process that.");

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: finalReply, action }),
    };
  } catch (err) {
    console.error('[tag-copilot] handler error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: "I ran into a brief issue loading your data. Try again in a moment." }),
    };
  }
};

// tag-copilot v3 — tool-use refactor (Apr 25, 2026)
// Replaces JSON-extraction-from-text with structured tool_use blocks.
// Eliminates the "Tag claimed Done but didn't fire" bug class.
