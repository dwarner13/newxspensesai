import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { logAiActivity } from './_shared/logAiActivity.js';
import { TAG_CATEGORIES } from './_shared/tagCategories.js';

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
            'Optional subcategory. Include WHENEVER the user named one or implied one (e.g. "Gas & Fuel" under Transportation, "Coffee" under Food & Dining, "Massage" or "Wellness" under Personal Care). Dropping the subcategory loses it on the rule.',
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

You have THREE tools available: set_category_rule, bulk_recategorize, rename_merchant. Each tool's description and parameters explain when to use it.

CRITICAL CONFIRMATION RULE — TWO-TURN PATTERN:

Turn 1 (user makes a request):
  - DESCRIBE in plain language what you would do
  - ASK the user to confirm
  - DO NOT call any tool yet
  - Example reply: "Want me to set Yo Yo Massage to Personal Care, subcategory Massage? Say yes to confirm."

Turn 2 (user explicitly confirms with "yes" / "go ahead" / "do it" / "confirm"):
  - CALL the appropriate tool with the exact parameters you proposed
  - The system will run the database changes and append a verified confirmation line to your reply
  - You do not need to write "Done!" — the system reports the actual outcome

NEVER call a tool on the same turn the user makes the request. NEVER call a tool without explicit confirmation. If you're unsure whether the user has confirmed, ask again.

If the user names a category not in the canonical list, ask them to pick one from the list. Do not silently substitute.

If the user says "Personal Care, subcategory Massage", obey EXACTLY: set category="Personal Care", subcategory="Massage". Do not editorialize. Do not pick a different subcategory you think fits better.

If the user's request is ambiguous (e.g. "fix this one" without naming a merchant), ASK rather than guessing. Never invent a merchant name or category that wasn't in the conversation.

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
  const { message, history = [], systemPromptOverride, importId } = body;

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

    // 4. Call Claude with tools
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: (systemPromptOverride || buildSystemPrompt(learnedRules, categorySummary, uncategorizedCount, flaggedMerchants, { spent: yearSpent, income: yearIncome })) + merchantDataBlock,
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
        if (toolUseBlock.name === 'set_category_rule') {
          const vendor = String(toolUseBlock.input.vendor || '').trim();
          const category = String(toolUseBlock.input.category || '');
          const subcategory = toolUseBlock.input.subcategory
            ? String(toolUseBlock.input.subcategory).trim()
            : null;
          const applyToExisting = toolUseBlock.input.applyToExisting !== false;

          if (!vendor || !category) {
            confirmationLine = `\n\n⚠ Could not save rule — missing vendor or category.`;
          } else {
            const vendorKey = vendor.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
            const merchantPattern = vendor.toUpperCase();

            // Write vendor_category_memory
            const vcmRow: Record<string, unknown> = {
              user_id: auth.userId,
              vendor_key: vendorKey,
              category,
              updated_at: new Date().toISOString(),
            };
            if (subcategory) vcmRow.subcategory = subcategory;
            await supabase
              .from('vendor_category_memory')
              .upsert(vcmRow, { onConflict: 'user_id,vendor_key' });

            // Write category_rules — BOTH merchant_pattern (canonical) AND
            // match_value (legacy, still read by sweep code). Conflict on
            // user_id+merchant_pattern matches the actual unique constraint.
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
            if (ruleErr) console.error('[tag-copilot] category_rules upsert failed', ruleErr.message);

            // Apply to existing transactions
            let updatedCount = 0;
            if (applyToExisting) {
              const txUpdate: Record<string, unknown> = {
                category,
                category_source: 'tag_rule',
                updated_at: new Date().toISOString(),
              };
              if (subcategory) {
                txUpdate.subcategory = subcategory;
                txUpdate.subcategory_source = 'tag_rule';
              }
              const { count } = await supabase
                .from('transactions')
                .update(txUpdate)
                .eq('user_id', auth.userId)
                .ilike('merchant_name', `%${vendor}%`)
                .select('id', { count: 'exact', head: true });
              updatedCount = count || 0;
            }

            // Verify by reading the rule back from the DB. The confirmation
            // string uses what's actually in the database, not what we sent.
            const { data: verifyRow } = await supabase
              .from('category_rules')
              .select('category, subcategory')
              .eq('user_id', auth.userId)
              .ilike('merchant_pattern', merchantPattern)
              .limit(1)
              .maybeSingle();

            const catLabel = verifyRow?.subcategory
              ? `${verifyRow.category} / ${verifyRow.subcategory}`
              : (verifyRow?.category || category);

            action.applied = true;
            action.affectedCount = updatedCount;
            action.verification = {
              rule: { category: verifyRow?.category ?? null, subcategory: verifyRow?.subcategory ?? null },
              transactionsUpdated: updatedCount,
            };
            confirmationLine = `\n\n✓ Saved rule: **${vendor}** → **${catLabel}**. Updated **${updatedCount}** transaction${updatedCount !== 1 ? 's' : ''}.`;
          }
        } else if (toolUseBlock.name === 'bulk_recategorize') {
          const fromCat = String(toolUseBlock.input.from_category || '').trim();
          const toCat = String(toolUseBlock.input.to_category || '').trim();

          if (!fromCat || !toCat) {
            confirmationLine = `\n\n⚠ Could not bulk recategorize — missing source or destination category.`;
          } else if (fromCat === toCat) {
            confirmationLine = `\n\n⚠ Source and destination are the same (${fromCat}) — nothing to do.`;
          } else {
            const { count } = await supabase
              .from('transactions')
              .update({ category: toCat, category_source: 'tag_bulk', updated_at: new Date().toISOString() })
              .eq('user_id', auth.userId)
              .eq('category', fromCat)
              .select('id', { count: 'exact', head: true });
            const n = count || 0;
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
            const { count } = await supabase
              .from('transactions')
              .update({ merchant_name: toName, updated_at: new Date().toISOString() })
              .eq('user_id', auth.userId)
              .ilike('merchant_name', fromName)
              .select('id', { count: 'exact', head: true });
            const n = count || 0;
            action.applied = true;
            action.affectedCount = n;
            action.verification = { transactionsUpdated: n };
            confirmationLine = `\n\n✓ Renamed **${n}** transaction${n !== 1 ? 's' : ''} from **${fromName}** to **${toName}**.`;
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
