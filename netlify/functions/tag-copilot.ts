import type { Handler } from '@netlify/functions';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { logAiActivity } from './_shared/logAiActivity.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CATEGORIES = [
  'Income','Groceries','Food & Dining','Transportation','Housing','Utilities',
  'Shopping','Subscriptions','Healthcare','Bank Fees','Transfers','Personal Care',
  'Savings','Debt Payments','Insurance','Education','Travel','Recreation',
  'Entertainment','Business','Debt Payments','Savings','Other',
];

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

function buildSystemPrompt(
  learnedRules: LearnedRule[],
  categorySummary: CategorySummary[],
  uncategorizedCount: number,
  flaggedMerchants: { merchant: string; amount: number; category: string }[],
  yearTotal: { spent: number; income: number }
): string {
  const rulesText = learnedRules.length > 0
    ? learnedRules.map(r => `  ${r.vendor_key} ? ${r.category}`).join('\n')
    : '  No rules learned yet';

  const catText = categorySummary
    .slice(0, 8)
    .map(c => `  ${c.category}: ${c.count} txns, $${c.total.toLocaleString()}`)
    .join('\n');

  const flaggedText = flaggedMerchants.length > 0
    ? flaggedMerchants.slice(0, 5).map(f => `  ${f.merchant} $${f.amount.toFixed(2)} (currently: ${f.category})`).join('\n')
    : '  None';

  return `You are Tag ï¿½ XspensesAI's sharp, friendly categorization expert. You are speaking with the user from the Categories dashboard. You have full visibility into their spending categories and the rules you have learned.

USER'S FINANCES (this year):
- Total spent: $${yearTotal.spent.toLocaleString()}
- Total income: $${yearTotal.income.toLocaleString()}
- Uncategorized transactions: ${uncategorizedCount}

SPENDING CATEGORIES:
${catText}

RULES I HAVE LEARNED (vendor ? category):
${rulesText}

TRANSACTIONS NEEDING REVIEW:
${flaggedText}

YOUR CAPABILITIES ï¿½ you can take these actions when the user asks:

1. SET A RULE for a merchant (e.g. "always categorize Shell as Transportation"):
   End your reply with: {"action":"set_rule","vendor":"shell","category":"Transportation","applyToExisting":true}
   This writes the rule AND updates all existing transactions for that merchant.
   IMPORTANT: Always ask the user to confirm before emitting the set_rule action JSON. Say what you plan to do, then wait for the user to say yes or confirm before outputting the JSON.

2. BULK RECATEGORIZE a whole category (e.g. "move all Other transactions to Food & Dining"):
   End your reply with: {"action":"bulk_recategorize","from":"Other","to":"Food & Dining"}
   This updates every transaction in that category.

3. SET SUBCATEGORY for specific merchants (e.g. mark all Shell as Gas & Fuel under Transportation):
   End your reply with: {"action":"set_subcategory","vendor":"shell","subcategory":"Gas & Fuel","category":"Transportation"}
   This stores the subcategory on all matching transactions.

4. APPLY RULE TO SPECIFIC MERCHANT across all transactions:
   End your reply with: {"action":"apply_to_merchant","vendor":"leduc diner","category":"Food & Dining"}

RULES FOR ACTIONS:
- Only emit an action JSON when the user clearly wants a change made ï¿½ not for questions
- Use only these categories: ${CATEGORIES.join(', ')}
- When setting a rule, confirm what you are doing in plain language first, then emit the JSON on its own line
- After a bulk action, tell the user how many transactions will be affected if you know
- applyToExisting defaults to true unless user says otherwise

YOUR PERSONALITY:
- You are Tag. Talk like a sharp friend, not a report generator.
- HARD LIMIT: Maximum 2 sentences, then ONE question. No exceptions. No bullet points. No lists. No paragraphs.
- One observation. One question. Done.
- EXAMPLE: “Transfers are eating 44% of your spend - that's unusually high. What are those payments going to?”
- Canadian tax angle only when directly relevant - don't force it.

IMPORTANT:
- Keep every reply to 2-3 sentences maximum. Be direct and personable. Always end with one question. Never use bullet points or headers in replies.
- Only emit the JSON action line when making a real change. Never emit it for explanations or questions.
- If the user asks about statement dates, import dates, or when statements were uploaded, tell them clearly: 'I don't have statement date info directly â€” check the Reports page for your full statement history by date.' Never guess or make up dates.`;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const body = JSON.parse(event.body || '{}');
  const { message, history = [], systemPromptOverride } = body;

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

    // 2. Load category summary (all transactions, capped at 600)
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const { data: allTxs } = await supabase
      .from('transactions')
      .select('amount, category, merchant_name, posted_at, date')
      .eq('user_id', auth.userId)
      .limit(600);

    const catMap: Record<string, { count: number; total: number }> = {};
    let yearSpent = 0;
    let yearIncome = 0;

    for (const t of allTxs || []) {
      const d = t.posted_at || t.date || '';
      if (d && d < yearStart) continue;
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

    // 3. Flagged / uncategorized
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

    // 4. Call Claude Haiku
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPromptOverride || buildSystemPrompt(learnedRules, categorySummary, uncategorizedCount, flaggedMerchants, { spent: yearSpent, income: yearIncome }),
      messages: [
        ...history.map((m: { role: string; content: string }) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ],
    });

    const reply = response.content?.[0]?.type === 'text' ? response.content[0].text : 'Sorry, I could not process that.';

    // 5. Parse and execute action
    let action: Record<string, unknown> | null = null;
    const actionMatch = reply.match(/\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\}/);

    if (actionMatch) {
      // Capture pre-action Needs Review count for completion check
      let preActionNRCount = Infinity;
      try {
        const { count: nrc } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId).eq('category', 'Needs Review');
        preActionNRCount = nrc || 0;
      } catch { /* non-blocking */ }

      try {
        action = JSON.parse(actionMatch[0]);

        if (action?.action === 'set_subcategory') {
          const vendor = String(action.vendor || '').toLowerCase().trim();
          const subcategory = String(action.subcategory || '');
          const category = String(action.category || '');
          await supabase
            .from('transactions')
            .update({ subcategory, subcategory_source: 'user_chat', updated_at: new Date().toISOString() })
            .eq('user_id', auth.userId)
            .ilike('merchant_name', '%' + vendor + '%');
          if (category) {
            await supabase.from('vendor_category_memory').upsert({
              user_id: auth.userId,
              vendor_key: vendor.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
              category,
              subcategory,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,vendor_key' });
          }
          // Write category_rules with subcategory - schema uses match_value (not merchant_pattern)
          try {
            const ruleRow: Record<string, unknown> = {
              user_id: auth.userId,
              match_type: 'contains',
              match_value: vendor.toUpperCase(),
              category: category || undefined,
              is_active: true,
              updated_at: new Date().toISOString(),
            };
            if (subcategory) ruleRow.subcategory = subcategory;
            const { error: ruleErr } = await supabase
              .from('category_rules')
              .upsert(ruleRow, { onConflict: 'user_id,match_type,match_value', ignoreDuplicates: false });
            if (ruleErr) console.error('[tag-copilot] category_rules upsert (with subcat) failed', ruleErr.message);
          } catch (e: any) {
            console.error('[tag-copilot] category_rules upsert threw', e?.message);
          }
          action.applied = true;
        }

        if (action?.action === 'set_rule' || action?.action === 'apply_to_merchant') {
          const vendor = String(action.vendor || '').toLowerCase().trim();
          const category = String(action.category || '');
          const applyToExisting = action.applyToExisting !== false;

          // Check for existing rule (duplicate detection) - uses match_value
          try {
            const { data: existingRule } = await supabase
              .from('category_rules')
              .select('category')
              .eq('user_id', auth.userId)
              .ilike('match_value', vendor.toUpperCase())
              .limit(1)
              .maybeSingle();
            if (existingRule) {
              action.duplicateWarning = true;
              action.existingCategory = existingRule.category;
            }
          } catch { /* non-blocking */ }

          // Write vendor memory
          await supabase.from('vendor_category_memory').upsert({
            user_id: auth.userId,
            vendor_key: vendor.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
            category,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,vendor_key' });

          // Write category_rules - schema uses match_value (not merchant_pattern)
          try {
            const { error: ruleErr } = await supabase
              .from('category_rules')
              .upsert({
                user_id: auth.userId,
                match_type: 'contains',
                match_value: vendor.toUpperCase(),
                category,
                is_active: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'user_id,match_type,match_value' });
            if (ruleErr) console.error('[tag-copilot] category_rules upsert failed', ruleErr.message);
          } catch (e: any) {
            console.error('[tag-copilot] category_rules upsert threw', e?.message);
          }

          // Apply to existing transactions
          if (applyToExisting) {
            await supabase
              .from('transactions')
              .update({ category, category_source: 'tag_rule', updated_at: new Date().toISOString() })
              .eq('user_id', auth.userId)
              .ilike('merchant_name', `%${vendor}%`);
          }
          action.applied = true;
        }

        if (action?.action === 'bulk_recategorize') {
          const from = String(action.from || '');
          const to = String(action.to || '');
          if (from && to) {
            const { count } = await supabase
              .from('transactions')
              .update({ category: to, category_source: 'tag_bulk', updated_at: new Date().toISOString() })
              .eq('user_id', auth.userId)
              .eq('category', from)
              .select('id', { count: 'exact', head: true });
            action.affectedCount = count || 0;
            action.applied = true;
          }
        }
      } catch {
        action = null;
      }
    }

    // Completion check - notify Prime when Needs Review is almost clear
    if (action?.applied) {
      try {
        const { count: postNRCount } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId).eq('category', 'Needs Review');
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

    // Log successful actions to activity feed
    if (action?.applied) {
      const authToken = (event.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
      const actionType = String(action.action || 'unknown');
      const vendor = String(action.vendor || action.from || '');
      const category = String(action.category || action.to || '');
      logAiActivity(authToken, {
        employeeId: 'tag-ai',
        eventType: 'categorization_complete',
        status: 'success',
        label: actionType === 'bulk_recategorize'
          ? `Bulk recategorized ${action.affectedCount || 0} transactions from ${action.from} to ${action.to}`
          : `Categorized ${vendor || 'transaction'} as ${category}`,
        details: { action: actionType, vendor, category },
      }).catch(() => { /* fire and forget */ });
    }

    const cleanReply = reply.replace(/\n?\{[^{}]*"action"\s*:[^{}]*\}/g, '').trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: cleanReply, action }),
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

// tag-copilot v2 - personality + timeout fix


