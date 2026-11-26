import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { gateReplyForCoverage } from '../../src/shared/comparison-claim-guard';
import { loadStatementCoverage, type CoverageDbClient } from '../../src/shared/statement-coverage';
import { logAiActivity } from './_shared/logAiActivity.js';
import { TAG_CATEGORIES } from './_shared/tagCategories.js';
import { searchTransactions } from './_shared/txSearchCore.js';
import { resolveFocusedTransaction } from './_shared/tagFocusedTransaction.js';
import { buildSingleProposal, TAG_SINGLE_ACTION } from './_shared/tagSingleTransaction.js';
import { buildActionProposal, TOOL_TO_ACTION } from './_shared/tagProposals.js';
import {
  loadTagSpendingSummary,
  loadCategorizationProgress,
  formatSpendingBlock,
  formatProgressBlock,
  summarizeSearchTotals,
  isSmallTalk,
  TAG_FINANCIAL_RULES,
} from './_shared/tagFinancialContext.js';
import {
  openEmployeeConversation,
  loadConversationHistory,
  claimConversationTurn,
  completeConversationTurn,
  findRecentEmployeeConversation,
  maskCustomerTextForModel,
} from './_shared/conversation-platform.js';

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
      "PROPOSE changing the category (and optionally subcategory) of ONE specific transaction — the focused one. This does NOT change anything: the server shows the customer a proposal and changes the transaction only after the customer explicitly confirms it. Call it as soon as the customer asks to change the focused transaction (\"change this to …\", \"this should be …\"). Never say the change is done.",
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
      "PROPOSE a category rule for a merchant (future imports). This does NOT change anything: the server shows the customer the exact rule and how many transactions are affected, and saves it only after the customer explicitly confirms. Call it as soon as the customer asks (e.g. \"always categorize Shell as Transportation\"). Set applyToExisting=true ONLY if the customer explicitly asked to change their existing transactions too. Never say it is done.",
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor: {
          type: 'string',
          description:
            'Merchant name or keyword (case-insensitive substring match). Use the user\'s exact wording — do not "correct" or rephrase. Examples: "smittys", "yo yo massage", "shell", "acme pay".',
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
            'true ONLY when the customer explicitly asked to also change their EXISTING transactions for this merchant. Default false: a rule applies to future imports only.',
        },
      },
      required: ['vendor', 'category'],
    },
  },
  {
    name: 'bulk_recategorize',
    description:
      'PROPOSE moving the existing transactions in one category to another (e.g. "move all Other to Food & Dining"). This does NOT change anything: the server shows the exact move and count (transactions the customer categorized themselves are kept) and moves them only after the customer explicitly confirms. No rule is created. Never say it is done.',
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
      'PROPOSE renaming a merchant on every transaction whose current name matches from_name exactly (case-insensitive), e.g. "SQ *COFFEE 123" → "Corner Coffee". This does NOT change anything: the server shows the exact rename and count and renames only after the customer explicitly confirms; the original imported description is always kept. Use ONLY when the customer explicitly asks to rename a merchant; if from_name is ambiguous, ASK first. Never say it is done.',
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

/**
 * T-LIVE-01: Tag's system prompt. It carries NO income, total-spent or cash-flow figure. Money figures
 * reach Tag only through the server-calculated VERIFIED SPENDING TOTALS block (with its scope), which
 * the caller appends — and never for a pure greeting (`smallTalk`).
 */
export function buildSystemPrompt(
  learnedRules: LearnedRule[],
  flaggedMerchants: { merchant: string; amount: number; category: string }[],
  progressBlock: string,
  smallTalk = false,
): string {
  const rulesText = learnedRules.length > 0
    ? learnedRules.map(r => `  ${r.vendor_key} → ${r.category}`).join('\n')
    : '  No rules learned yet';

  const flaggedText = flaggedMerchants.length > 0
    ? flaggedMerchants.slice(0, 5).map(f => `  ${f.merchant} $${f.amount.toFixed(2)} (currently: ${f.category})`).join('\n')
    : '  None';

  const contextBlock = smallTalk
    ? `THIS MESSAGE IS A GREETING OR PLEASANTRY. Reply warmly and briefly like a friend would (one or two short sentences), and at most offer to help with categorizing. Do NOT mention any amount, total, count, category breakdown or opinion about their finances.`
    : `${progressBlock}

RULES I HAVE LEARNED (vendor → category):
${rulesText}

TRANSACTIONS NEEDING A CATEGORY (newest):
${flaggedText}`;

  return `You are Tag — XspensesAI's sharp, friendly categorization expert. You are speaking with the user from the Categories dashboard. Your job is categorization: categories, subcategories, merchant names and the rules you have learned.

${contextBlock}

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
  - When results arrive, SUMMARIZE first using ONLY the server's figures in
    the result. If the result says COMPLETE you may quote its totals with
    their scope; if it says SAMPLE ONLY, give the count shown and the total
    count, never a dollar total ("Here are the **10 most recent** of **47**").
  - Never add up, average or re-total the rows yourself.
  - Show a USEFUL SUBSET (10-25 rows), formatted cleanly.
  - When totalMatches > returnedCount, ALWAYS tell the user:
    "There are **37 more** — want me to narrow by date, merchant, or amount?"
  - Offer to filter further: by year/month, merchant name, amount range, or
    statement/import.
  - Each row includes a transaction ID. You can use these IDs with
    update_single_transaction if the user wants to change a category.

═══════════════════════════════════════════════════════════════════════
FOCUSED TRANSACTION: ONE TRANSACTION, PROPOSED BY THE SERVER
═══════════════════════════════════════════════════════════════════════

If the system prompt contains a FOCUSED TRANSACTION block, the user is looking
at ONE specific transaction in the UI (drawer, detail view, etc). "this",
"it", "this one", "this expense", "this transaction" mean THAT transaction —
never a merchant name, never a search term.

When the customer asks to change it ("change this to food and beverage",
"this should be Groceries"), call update_single_transaction right away with the
focused transaction's ID and the category they named. That tool only PROPOSES:
the server writes the proposal ("Change this … to …? Say yes to confirm"), and
the change happens only after the customer explicitly says yes. Never say it is
done. Never extend it to other transactions or save a rule unless the customer
separately asks for that.

═══════════════════════════════════════════════════════════════════════
RULES, BULK MOVES AND RENAMES (NO FOCUSED TRANSACTION)
═══════════════════════════════════════════════════════════════════════

set_category_rule, bulk_recategorize and rename_merchant only PROPOSE. When the
customer asks for one, call the tool straight away: the server shows the exact
change and how many transactions it affects, and makes it only after the
customer explicitly says yes. A rule is for FUTURE imports; set
applyToExisting=true only if the customer explicitly asked to change their
existing transactions too. Never say a change is done.

═══════════════════════════════════════════════════════════════════════
GENERAL RULES
═══════════════════════════════════════════════════════════════════════

Every tool that changes data only PROPOSES; the server asks the customer to
confirm and makes the change only after an explicit yes. Never claim a change
is done, and never write your own confirmation question for it.

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
- Greetings get a natural, friendly reply — no numbers, no financial summary, no unsolicited assessment.
  Example: user "hi tag how are you" → "Doing great, thanks for asking! Want me to tidy up anything in your categories today?"
- Example (categorization): "Those **12** Uber charges are sitting in Shopping — want me to move them to Transportation?"

═══════════════════════════════════════════════════════════════════════
${TAG_FINANCIAL_RULES}

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
- Example: "Lend Direct is a Canadian alternative lender — APRs typically **30-45%**. Want me to loop in Goalie?" (Only quote a payment total if it appears in VERIFIED SPENDING TOTALS or a COMPLETE search result.)

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
  // T-H1: conversation history comes ONLY from the server (shared conversation platform).
  // A browser-supplied `history` array is ignored: it could contain fabricated Tag turns.
  const { message, importId, focusedTransaction } = body;
  const requestedSessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
  const clientMessageId = typeof body.clientMessageId === 'string' ? body.clientMessageId : null;
  // C2-G2: Tag's instructions are server-owned. A browser-supplied systemPromptOverride is
  // ignored (it used to REPLACE the server prompt, bypassing the two-step confirmation and
  // tool rules). Structural log only — never the override's content.
  if (body && Object.prototype.hasOwnProperty.call(body, 'systemPromptOverride')) {
    console.log('[tag-copilot] systemPromptOverride ignored (server-owned prompt)');
  }

  if (!message) return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };

  let conversationId: string | null = null;
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
      }
    );

    // T-H1: open (or resume) this customer's own Tag conversation. Ownership and employee identity
    // are enforced by the platform; a foreign or non-Tag session id yields a fresh Tag session.
    // With no session id (older cached clients) resume the customer's recent Tag conversation, unless
    // the customer explicitly started a new one (`newConversation: true`).
    try {
      let sessionToUse = requestedSessionId;
      if (!sessionToUse && body.newConversation !== true) {
        sessionToUse = await findRecentEmployeeConversation(supabase, { userId: auth.userId, employeeSlug: 'tag-ai' });
      }
      const opened = await openEmployeeConversation(supabase, {
        userId: auth.userId, employeeSlug: 'tag-ai', requestedSessionId: sessionToUse,
      });
      conversationId = opened.sessionId;
    } catch {
      conversationId = null;
      console.warn('[tag-copilot] conversation could not be opened; this turn will not be saved');
    }

    // Customer text sent to the model is PII-masked (the same critical detectors chat.ts uses).
    const modelMessage = maskCustomerTextForModel(message);

    // Stored conversation history is the model context (AI context limit applied by the platform).
    // Loaded BEFORE the claim below, so the current message is not in the history twice.
    let storedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationId) {
      try {
        storedHistory = await loadConversationHistory(supabase, { sessionId: conversationId, userId: auth.userId });
      } catch {
        storedHistory = [];
        console.warn('[tag-copilot] stored history could not be loaded');
      }
    }

    // CLAIM-FIRST (Prime HQ review): store the customer message BEFORE the model or any tool runs.
    // Only the request that owns the claim may act. A duplicate (retry, concurrent request, or a retry
    // after a partial failure) returns the stored reply — the model and tools never run again.
    let claimed = false;
    if (conversationId) {
      let claim: Awaited<ReturnType<typeof claimConversationTurn>> | null = null;
      try {
        claim = await claimConversationTurn(supabase, {
          sessionId: conversationId, userId: auth.userId, employeeSlug: 'tag-ai', userText: message, clientMessageId,
        });
      } catch {
        claim = null;
        console.warn('[tag-copilot] conversation claim failed; this turn will not be saved');
      }
      if (claim?.status === 'duplicate') {
        // Already stored: report the STORED reply and outcome. Never run the model or tools again,
        // and never say "done" when the outcome was not recorded.
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            reply: claim.reply ?? "I already received that message, but its outcome wasn't recorded. Nothing was run again — please check your transactions before trying again.",
            action: null,
            actionOutcome: claim.actionOutcome ?? null,
            sessionId: conversationId,
            persisted: claim.reply !== null,
            duplicate: true,
          }),
        };
      }
      if (claim?.status === 'conflict') {
        // A unique conflict with no matching stored message: assume nothing, act on nothing.
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            reply: "I couldn't safely record that message, so I didn't do anything. Please send it again.",
            action: null,
            sessionId: conversationId,
            persisted: false,
            conflict: true,
          }),
        };
      }
      claimed = claim?.status === 'claimed';
    }

    // 1. Load learned rules
    const { data: rulesData } = await supabase
      .from('vendor_category_memory')
      .select('vendor_key, category, updated_at')
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    const learnedRules: LearnedRule[] = rulesData || [];

    // 2. T-LIVE-01: verified financial context. A pure greeting gets none of it (no financial
    // figures can be volunteered). Otherwise money figures come only from the shared engine
    // (complete paged fetch, spending purpose, reconciled breakdowns, scope line) and
    // categorization progress from exact counts over the full scope.
    const smallTalk = isSmallTalk(message);
    let progressBlock = '';
    let merchantDataBlock = '';
    let flaggedMerchants: { merchant: string; amount: number; category: string }[] = [];
    let accountCurrency = 'CAD';
    if (!smallTalk) {
      const [spendingSummary, progress] = await Promise.all([
        loadTagSpendingSummary(supabase, auth.userId, { importId: importId || null }),
        loadCategorizationProgress(supabase, auth.userId, importId || null),
      ]);
      progressBlock = formatProgressBlock(progress);
      accountCurrency = spendingSummary.scope.currency;

      // Recent rows (row facts, not totals) with source attribution.
      let recentQuery = supabase
        .from('transactions')
        .select('amount, category, merchant_name, posted_at, date, import_id')
        .eq('user_id', auth.userId)
        .order('posted_at', { ascending: false, nullsFirst: false });
      if (importId) recentQuery = recentQuery.eq('import_id', importId);
      const { data: recentData } = await recentQuery.limit(20);
      const recentTxs = recentData || [];

      let flaggedQuery = supabase
        .from('transactions')
        .select('amount, category, merchant_name')
        .eq('user_id', auth.userId)
        .or('category.is.null,category.eq.,category.eq.Uncategorized,category.eq.Needs Review')
        .order('posted_at', { ascending: false, nullsFirst: false });
      if (importId) flaggedQuery = flaggedQuery.eq('import_id', importId);
      const { data: flaggedData } = await flaggedQuery.limit(5);
      flaggedMerchants = (flaggedData || []).map(t => ({
        merchant: t.merchant_name || 'Unknown',
        amount: Math.abs(Number(t.amount || 0)),
        category: t.category || 'Uncategorized',
      }));

      const importIds = Array.from(new Set(recentTxs.map(t => t.import_id).filter(Boolean))) as string[];
      const importMap: Record<string, { label: string }> = {};
      if (importIds.length > 0) {
        try {
          const { data: impData } = await supabase
            .from('imports')
            .select('id, filename, issuer')
            .in('id', importIds);
          for (const imp of impData || []) {
            const baseName = String(imp.filename || '').replace(/\.(pdf|csv|xlsx?|txt)$/i, '').trim();
            const issuer = imp.issuer ? String(imp.issuer) : null;
            importMap[imp.id] = { label: issuer && baseName ? `${issuer} · ${baseName}` : (issuer || baseName || '(unknown statement)') };
          }
        } catch (e: any) {
          console.error('[tag-copilot] imports lookup failed:', e?.message);
        }
      }

      merchantDataBlock = `\n\n${formatSpendingBlock(spendingSummary)}

RECENT TRANSACTIONS (newest first; individual rows, not totals):
${recentTxs.length > 0
  ? recentTxs.map(t => {
      const src = t.import_id && importMap[t.import_id] ? ` from ${importMap[t.import_id].label}` : '';
      return `  ${t.posted_at || t.date || '?'} ${t.merchant_name || 'Unknown'} $${Math.abs(Number(t.amount || 0)).toFixed(2)} [${t.category || 'Uncategorized'}]${src}`;
    }).join('\n')
  : '  (none)'}
${importId ? '\nSCOPE: You are looking at ONE specific statement (import_id: ' + importId + '). Answer questions about THIS statement unless the user explicitly asks about their overall picture.' : ''}

RULES FOR USING THIS DATA:
- For a merchant or category total, use VERIFIED SPENDING TOTALS only, with its scope line. If the merchant isn't listed there, say you don't have a verified total for it (offer to search).
- Never invent amounts, and never compute one: every amount in your reply must appear verbatim above or in a tool result.`;
    }

    // 3c. Focused transaction block. When the panel is opened from a drawer
    // or single-row context, the caller passes focusedTransaction with the
    // row's id, merchant, amount, date, and current categorization. We render
    // this into the prompt so Tag knows which transaction "this one" refers
    // to AND can suggest extending the change to other matching rows.
    let focusedTransactionBlock = '';
    // C2-E2A: only the ID comes from the browser; the row is re-read server-side,
    // scoped to this user. Missing, stale or foreign IDs simply mean "no focus".
    const focused = await resolveFocusedTransaction(supabase as unknown as Parameters<typeof resolveFocusedTransaction>[0], auth.userId, focusedTransaction);
    if (focused.status !== 'none') console.log(`[tag-copilot] focused transaction: ${focused.status}`);
    if (focused.row) {
      const ft = focused.row;
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

When the customer asks to change THIS transaction ("this", "it", "this expense" …), call
update_single_transaction with transaction_id="${ft.id}" and the category they named. It only proposes;
the server asks the customer to confirm. Do not write your own confirmation or say it is done, and do
not touch the other ${otherCount} ${ftMerchant} transactions unless the customer separately asks.`;
    }

    // 4. Call Claude with tools
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: buildSystemPrompt(learnedRules, flaggedMerchants, progressBlock, smallTalk) + merchantDataBlock + focusedTransactionBlock,
      tools: TAG_TOOLS,
      messages: [
        ...storedHistory,
        { role: 'user', content: modelMessage },
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

    // T-LIVE-02: set when Tag proposed a single-transaction change (no write happened).
    let singleProposalOutcome: Awaited<ReturnType<typeof buildSingleProposal>> | null = null;
    // T-ACT-SAFE: set when Tag proposed a rule / bulk move / rename (no write happened).
    let actionProposalOutcome: Awaited<ReturnType<typeof buildActionProposal>> | null = null;

    // 6. Execute the tool the model called.
    if (toolUseBlock) {
      action = { tool: toolUseBlock.name, ...toolUseBlock.input, applied: false };

      try {
        if (toolUseBlock.name === 'update_single_transaction') {
          // T-LIVE-02: Tag's tool never writes. The server re-reads the transaction scoped to this user,
          // resolves the category and records a signed 'proposed' receipt; the change happens only in
          // tag-action commit_single after the customer's explicit "yes" binds to this proposal.
          const transactionId = String(toolUseBlock.input.transaction_id || '').trim();
          const category = String(toolUseBlock.input.category || '').trim();
          const subcategory = toolUseBlock.input.subcategory ? String(toolUseBlock.input.subcategory).trim() : '';
          // Only the server-verified FOCUSED transaction can be proposed (never an arbitrary id the model
          // picked, even one the customer owns).
          const focusedId = focused.row ? String(focused.row.id) : null;
          const outcome: Awaited<ReturnType<typeof buildSingleProposal>> = focusedId && transactionId === focusedId
            ? await buildSingleProposal(
              supabase as unknown as Parameters<typeof buildSingleProposal>[0], auth.userId, transactionId,
              subcategory ? `${category} > ${subcategory}` : category,
            )
            : {
              state: 'failed', reason: 'not_focused',
              reply: "I can only change the transaction you have open. Open the one you'd like to change (or tap it in your list) and ask me again.",
            };
          singleProposalOutcome = outcome;
          action = { tool: toolUseBlock.name, applied: false, proposalOnly: true };
          if (outcome.state === 'proposed') {
            action.proposal = { ...outcome.subject, action: TAG_SINGLE_ACTION };
          } else {
            action.error = outcome.reason;
          }
          // Tag's words for this turn are the server's proposal (the model's own text could claim "done").
          confirmationLine = outcome.reply;
        } else if (TOOL_TO_ACTION[toolUseBlock.name]) {
          // T-ACT-SAFE: rules, bulk moves and renames only PROPOSE. The server computes the exact
          // action and verified count and stores a signed 'proposed' receipt; tag-action
          // commit_proposal executes it after the customer's explicit "yes".
          const outcome = await buildActionProposal(
            supabase as unknown as Parameters<typeof buildActionProposal>[0], auth.userId, toolUseBlock.name, toolUseBlock.input,
          );
          actionProposalOutcome = outcome;
          action = { tool: toolUseBlock.name, applied: false, proposalOnly: true };
          if (outcome.state === 'proposed') action.proposal = { action: outcome.action, ...outcome.subject };
          else action.error = outcome.reason;
          confirmationLine = outcome.reply;
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

          // ── Two-turn pattern: feed results back to Claude ──────────
          // T-LIVE-01 F-6: the money figures in the tool result are server-calculated. Totals are given
          // only when EVERY match was returned (split by the engine's classification of each row's
          // stored type); a partial result is labelled a sample and carries no dollar total.
          const classification = new Map<string, { type: string | null; category: string | null; subcategory: string | null }>();
          if (result.returnedCount > 0 && result.returnedCount >= result.totalMatches) {
            try {
              const { data: typeRows } = await supabase
                .from('transactions')
                .select('id, type, category, subcategory')
                .eq('user_id', auth.userId)
                .in('id', result.transactions.map(r => r.id));
              for (const t of typeRows || []) {
                classification.set(String(t.id), { type: t.type ?? null, category: t.category ?? null, subcategory: t.subcategory ?? null });
              }
            } catch (e) {
              console.error('[tag-copilot] search classification lookup failed:', e instanceof Error ? e.message : 'unknown');
            }
          }
          const filtersLabel = [
            searchParams.q ? `text "${searchParams.q}"` : '',
            searchParams.category ? `category ${searchParams.category}` : '',
            searchParams.uncategorizedOnly ? 'uncategorized only' : '',
            searchParams.startDate || searchParams.endDate ? `dates ${searchParams.startDate || 'start'} to ${searchParams.endDate || 'latest'}` : 'all dates',
            searchParams.importId ? 'one statement' : 'all accounts',
          ].filter(Boolean).join(', ');
          const searchTotals = summarizeSearchTotals({
            rows: result.transactions,
            totalMatches: result.totalMatches,
            classification,
            currency: accountCurrency,
            filtersLabel,
          });

          let toolResultContent: string;
          if (result.returnedCount === 0) {
            toolResultContent = 'No transactions found matching the search.';
          } else {
            const dataLines = result.transactions.map((r, i) =>
              `[${i + 1}] id:${r.id} | ${r.posted_at || r.date || '?'} | ${r.merchant_name || 'Unknown'} | $${Math.abs(r.amount).toFixed(2)} | ${r.category || 'Uncategorized'}${r.subcategory ? ' / ' + r.subcategory : ''}`
            );
            toolResultContent = [
              searchTotals.text,
              'Rows (individual transactions; do not add them up):',
              ...dataLines,
            ].filter(Boolean).join('\n');
          }

          // Build a deterministic fallback in case the second call fails/times out (same figures).
          let fallbackSummary: string;
          if (result.returnedCount === 0) {
            fallbackSummary = 'No matching transactions found.';
          } else if (!searchTotals.complete) {
            fallbackSummary = `Found **${result.totalMatches}** matching transaction${result.totalMatches !== 1 ? 's' : ''}; here are the **${result.returnedCount}** most recent. I don't have a verified total for all of them — want me to narrow by date, merchant, or amount?`;
          } else {
            fallbackSummary = searchTotals.text
              .replace(/^COMPLETE: /, '')
              .replace(/ — these add up exactly to the spending figure\./, '.')
              .replace(/\(not analysed by Tag; income questions go to Prime\)/, '(income questions are best asked to Prime)');
          }

          // Second Claude call — same pattern as the follow-up question
          // after update_single_transaction (lines 688–720). 5s timeout
          // since search summaries are slightly longer than follow-up questions.
          let naturalReply = '';
          try {
            const searchAbort = new AbortController();
            const searchTimer = setTimeout(() => searchAbort.abort(), 5000);
            const secondCall = await anthropic.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 600,
              system: buildSystemPrompt(learnedRules, flaggedMerchants, progressBlock, smallTalk) + merchantDataBlock + focusedTransactionBlock,
              messages: [
                ...storedHistory,
                { role: 'user', content: modelMessage },
                {
                  role: 'assistant',
                  content: [
                    ...(replyText ? [{ type: 'text' as const, text: replyText }] : []),
                    { type: 'tool_use' as const, id: toolUseBlock.id, name: toolUseBlock.name, input: toolUseBlock.input },
                  ],
                },
                {
                  role: 'user',
                  content: [
                    { type: 'tool_result' as const, tool_use_id: toolUseBlock.id, content: toolResultContent },
                  ],
                },
              ],
              tools: TAG_TOOLS,
            }, { signal: searchAbort.signal as any });
            clearTimeout(searchTimer);

            const secondText = searchAbort.signal.aborted ? '' :
              secondCall.content
                .filter((b: any) => b.type === 'text')
                .map((b: any) => (b as any).text)
                .join('\n')
                .trim();
            if (secondText) {
              naturalReply = secondText;
            }
          } catch (searchCallErr: any) {
            console.error('[tag-copilot] search second-call failed:', searchCallErr?.message);
          }

          // Use the model's conversational reply, or fall back to the
          // deterministic summary. Never show raw pipe-delimited rows.
          confirmationLine = `\n\n${naturalReply || fallbackSummary}`;
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

    let finalReply = singleProposalOutcome
      ? singleProposalOutcome.reply
      : actionProposalOutcome
      ? actionProposalOutcome.reply
      : ((replyText + confirmationLine).trim()
        || (toolUseBlock ? confirmationLine.trim() : "Sorry, I couldn't process that."));

    // G11b (owner GO 2026-11-26, unified financial engine: coverage-aware comparisons for every
    // employee). The model's free text never claims a comparison / trend / stability the customer's
    // statement coverage does not support — the same rule as the screens; a coverage read failure
    // fails closed. Server-built proposal replies are deterministic and are not passed through it.
    let comparisonGate: { applied: boolean; removedSentences: number; reason: string | null } | null = null;
    if (!singleProposalOutcome && !actionProposalOutcome) {
      const gated = await gateReplyForCoverage(finalReply, () => loadStatementCoverage(supabase as unknown as CoverageDbClient, auth.userId!));
      if (gated.applied) {
        finalReply = gated.text;
        comparisonGate = { applied: true, removedSentences: gated.removedSentences, reason: gated.reason };
        console.warn(`[tag-copilot] comparison claim gated: removed=${gated.removedSentences}`);
      }
    }

    // T-H1: save Tag's reply to the claimed turn. `persisted` is true ONLY when both the claim and
    // the reply were saved; a failed save still returns the reply and the client shows "not saved".
    let persisted = false;
    if (conversationId && claimed) {
      try {
        await completeConversationTurn(supabase, {
          sessionId: conversationId,
          userId: auth.userId,
          employeeSlug: 'tag-ai',
          assistantText: finalReply,
          clientMessageId,
          // Server-verified outcome of a tool Tag executed (shared v1 action receipt).
          assistantMetadata: singleProposalOutcome
            // T-LIVE-02: the signed proposal tag-action commit_single binds to (no tool/success/count:
            // nothing was executed).
            ? {
              actionReceipt: singleProposalOutcome.state === 'proposed'
                ? { v: 1, employee: 'tag-ai', action: TAG_SINGLE_ACTION, state: 'proposed', subject: singleProposalOutcome.subject, result: { matchCount: 1 } }
                : { v: 1, employee: 'tag-ai', action: TAG_SINGLE_ACTION, state: 'failed', reason: singleProposalOutcome.reason },
            }
            : actionProposalOutcome
            // T-ACT-SAFE: signed proposal (nothing executed: no tool / success / count).
            ? {
              actionReceipt: actionProposalOutcome.state === 'proposed'
                ? { v: 1, employee: 'tag-ai', action: actionProposalOutcome.action, state: 'proposed', subject: actionProposalOutcome.subject, result: { matchCount: Number(actionProposalOutcome.subject.affected ?? 0) } }
                : { v: 1, employee: 'tag-ai', action: actionProposalOutcome.action, state: 'failed', reason: actionProposalOutcome.reason },
            }
            : action
            ? {
              // Authoritative outcome from the database result (Prime contract: tool, success, count),
              // in the shared v1 receipt shape.
              actionReceipt: {
                v: 1,
                employee: 'tag-ai',
                action: String(action.tool || 'unknown'),
                tool: String(action.tool || 'unknown'),
                success: action.applied === true,
                count: typeof action.affectedCount === 'number' ? action.affectedCount : 0,
                state: action.applied === true ? 'completed' : 'failed',
                result: { affectedCount: typeof action.affectedCount === 'number' ? action.affectedCount : 0 },
                ...(action.applied === true ? {} : { reason: String(action.error || 'not_applied').slice(0, 40) }),
              },
            }
            : comparisonGate
            ? { comparisonGate }
            : undefined,
        });
        persisted = true;
      } catch {
        console.warn('[tag-copilot] conversation turn was not saved');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: finalReply,
        action,
        sessionId: conversationId,
        persisted,
        ...(singleProposalOutcome?.state === 'proposed' && persisted ? { proposal: { kind: 'single', ...singleProposalOutcome.subject } } : {}),
        ...(actionProposalOutcome?.state === 'proposed' && persisted
          ? { proposal: { kind: 'action', action: actionProposalOutcome.action, subject: actionProposalOutcome.subject } } : {}),
      }),
    };
  } catch (err) {
    console.error('[tag-copilot] handler error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply: "I ran into a brief issue loading your data. Try again in a moment.",
        sessionId: conversationId,
        persisted: false,
      }),
    };
  }
};

// tag-copilot v3 — tool-use refactor (Apr 25, 2026)
// Replaces JSON-extraction-from-text with structured tool_use blocks.
// Eliminates the "Tag claimed Done but didn't fire" bug class.
