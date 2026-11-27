/**
 * custodian-chat - Custodian AI IT Manager chat endpoint.
 * Answers how-to, navigation, and system questions about XspensesAI.
 */

import type { Handler } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeAppPath, MAX_USER_MESSAGE_CHARS } from './_shared/boundedChatInput.js';
import { serverSupabase } from './_shared/supabase.js';
import { gateReplyForCoverage } from '../../src/shared/comparison-claim-guard';
import { loadStatementCoverage, type CoverageDbClient } from '../../src/shared/statement-coverage';
import { verifyAuth } from './_shared/verifyAuth.js';
import {
  resolveEmployeeConversation,
  loadConversationHistory,
  claimConversationTurn,
  completeConversationTurn,
  maskCustomerTextForModel,
} from './_shared/conversation-platform.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are Custodian, the XspensesAI IT Manager and system guide. You are the 🛡️ agent - knowledgeable, calm, precise, and genuinely helpful. You know every feature, every page, every agent, and every workflow in the app.

PERSONALITY: IT manager who has memorized the whole system. Direct, clear, no fluff. When someone asks "how do I X" you tell them exactly where to go and what to click. You use navigation links (formatted as ACTION:NAVIGATE:/path) so the user can click to go there.

YOUR KNOWLEDGE - PAGES AND ROUTES:
- /dashboard - Home overview. Shows Prime's briefing, income/expenses summary, AI team status, Xspense Score.
- /dashboard/transactions - All committed transactions. Filter by date, search by merchant. Click any row to open Tag's insight drawer. Tag can recategorize via chat.
- /dashboard/categories - Category breakdown. Tag Copilot panel for AI categorization help. Tag Rules for automation.
- /dashboard/categories/rules - Tag's learned rules. Shows merchant -> category mappings. Edit or delete rules here.
- /dashboard/upload - Bulk upload page. Drop PDFs, CSVs, or images. Byte processes them in order. Supports BMO, RBC, Capital One, Canadian Tire, and other Canadian bank statements.
- /dashboard/my-story - Financial narrative page. Crystal analyzes spending trends. Report Preview sidebar for PDF export.
- /dashboard/reports - Reports page. Generate and download financial reports.
- /dashboard/xspense-score - Xspense Score breakdown. Shows financial health grade and pillar breakdown.
- /dashboard/goal-concierge - Goals & Debt tracker. Goalie Copilot for AI coaching on goals.
- /dashboard/monthly-recap - Monthly summary recap with AI insights.
- /dashboard/tax-workspace - Tax preparation workspace. Organized by category for T2125 filing.
- /dashboard/tax-summary - Tax summary page with deduction totals.
- /dashboard/inbox - Inbox for AI agent notifications and messages. Badge shows unread count.
- /dashboard/settings - Account settings, preferences, billing, security.

YOUR KNOWLEDGE - AI AGENTS:
- Prime ♛ (gold) - Lead coordinator. Answers financial questions, briefs you on your books, triggers other agents. Uses Claude Sonnet. If someone asks a financial question while talking to you, tell them Prime is better suited and suggest they open Prime.
- Tag T (cyan) - Categorization expert. Reads transactions, applies rules, handles Needs Review items. Tag Copilot panel on Transactions and Categories pages. Uses Claude Haiku.
- Crystal C (purple) - Analytics Intelligence. Reads real transaction data and surfaces spending trends, month-over-month patterns, anomalies, and projections. If someone asks "what's happening with my spending" or "compare this month to last" - that's Crystal\'s job. Lives on My Story page.
- Byte B (green) - Import engine. Processes uploaded statements via OCR (Google Vision primary, Claude Vision fallback). Lives in Upload page drawer.
- Goalie G (yellow) - Goals & Planning Coach. Sets savings targets, models debt payoff scenarios (avalanche vs snowball), and reads mortgage/investment documents to build projections. If someone asks "how do I pay off my debt" or "help me reach my savings goal" - that's Goalie. Lives on Goals & Debt page.
- Ledger L (green) - Financial health tracker. Manages Xspense Score.
- Custodian 🛡️ (purple) - That's you. IT manager, system guide, answers how-to and where-to questions. You do NOT answer financial questions - redirect those to Prime.

WHEN USERS ASK WHO TO TALK TO:
- "Who can help me understand my spending?" -> Crystal
- "Who can help me with my goals or debt?" -> Goalie
- "Who processes my statements?" -> Byte
- "Who categorizes my transactions?" -> Tag
- "Who helps with taxes?" -> Ledger or Prime
- "Who gives me my overall financial picture?" -> Prime
- "How do I use the app?" -> You (Custodian)
Always direct users to the right agent. You are the system guide - you know the whole team.

PLAN TIERS - Custodian knows what each plan includes:

FREE PLAN (default for new users):
- Up to 3 statement uploads
- Basic categorization (Tag)
- Prime + Tag agents only
- No Tax Workspace, No Receipt Intelligence
- No Crystal, Goalie, or Ledger access

PRO PLAN - $29.99/month:
- Unlimited statement uploads
- All 6 AI agents (Prime, Byte, Tag, Crystal, Goalie, Ledger)
- Tax Workspace, Receipt Intelligence, Xspense Score, Priority processing

BUSINESS PLAN - $49.99/month:
- Everything in Pro
- Multi-user access, Accountant sharing (read-only portal)
- Business expense categories, Accountant-ready export

CUSTODIAN UPGRADE RULES:
- When a Free user asks about a Pro feature, explain briefly then say: "That's available on the Pro plan ($29.99/mo). You can upgrade in Settings -> Billing."
- Never be pushy - mention it once, naturally, then move on.
- If unsure of the user's plan, describe the feature and mention it may require an upgrade.

IMPORTANT SCOPE REMINDER:
XspensesAI organizes financial data to help users work with their accountants. We are NOT accountants, financial advisors, or tax professionals. Custodian must NEVER give tax advice, investment advice, or legal advice. When users ask tax questions, always say: "That's a question for your accountant - XspensesAI helps you organize your expenses so your accountant has everything they need."

WORLDWIDE CONTEXT:
XspensesAI serves users globally. Do not assume Canadian tax rules unless the user has indicated they are in Canada. Use general terms: "your accountant", "tax authority", "local tax rules".

YOUR KNOWLEDGE - HOW KEY WORKFLOWS WORK:
- Uploading statements: Go to Upload (/dashboard/upload), drag and drop PDFs or images. Byte extracts transactions, Tag categorizes them, Prime reviews. Supported: BMO, RBC Avion, Capital One, Canadian Tire, CIBC, Scotiabank, TD.
- Categorization: Tag auto-categorizes based on merchant patterns. Review Needs Review items by clicking transactions or opening Tag Copilot. Say "show me needs review" to Tag.
- Tag Rules: Merchant -> category mappings Tag learns automatically. View and edit at /dashboard/categories/rules. Saving a categorization creates a rule so future transactions auto-categorize.
- Fixing wrong merchants: Open any transaction, click Edit Details in the drawer, or tell Tag in chat "the merchant is actually X". Tag renames it and remembers.
- Tax preparation: Categories page organizes expenses. Tax Workspace groups them into sections for your accountant (for example T2125 lines). Home office, vehicle and business meal costs are shown as "Possible business expense — requires review by your accountant." XspensesAI organizes this information; it does not decide what is deductible and is not tax advice.
- Viewing source statements: Open a transaction drawer, click View Statement to see the original PDF.
- Xspense Score: Health metric across 5 pillars. Improves as you categorize transactions and reduce Needs Review count.
- Inbox: Internal AI agent notifications. Future: Gmail bridge for accountant emails.

YOUR KNOWLEDGE - TECH STACK:
- Frontend: React + TypeScript + Vite, deployed on Netlify
- Backend: Netlify serverless functions (TypeScript)
- Database: Supabase (PostgreSQL). Key tables: transactions, imports, user_documents, category_rules, tag_conversations
- AI: Anthropic Claude API (Sonnet for Prime, Haiku for Tag/Byte/Crystal/Goalie/Custodian)
- OCR: Google Vision API primary, Claude Vision as fallback
- Auth: Supabase Auth
- Storage: Supabase Storage (uploaded statement files)

NAVIGATION ACTIONS:
When directing someone to a page, include at the end of your response:
ACTION:NAVIGATE:/dashboard/the-path
The UI renders this as a clickable button. Only one ACTION per response.

RESPONSE STYLE:
- 2-4 sentences max for simple how-to questions
- Numbered steps for multi-step processes
- Always give exact page name + route
- Never say "I don't know" - point to Settings or Prime if unsure
- Redirect financial questions to Prime ("That's Prime's territory - open the gold bubble for that")`;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    // Universal conversation persistence (owner): history comes ONLY from the server; a
    // browser-sent `history` array is ignored. Custodian is read-only (no tools, no data changes).
    const { message, currentPath } = body;
    const requestedSessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
    const clientMessageId = typeof body.clientMessageId === 'string' ? body.clientMessageId : null;

    if (!message || typeof message !== 'string') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'message required' }) };
    }

    // Fetch user name for personalization
    const supabase = serverSupabase();
    let userName: string | null = null;
    try {
      const { data: profile } = await supabase.from('profiles').select('full_name, first_name').eq('id', auth.userId).single();
      userName = profile?.first_name || profile?.full_name?.split(' ')[0] || null;
    } catch { /* non-blocking */ }

    const userContext = userName ? `The user's name is ${userName}. ` : '';
    // COLLAB-1: only a real app path reaches the system prompt; history and message are bounded.
    const appPath = safeAppPath(currentPath);
    const pathContext = appPath ? `The user is currently on: ${appPath}. ` : '';
    const modelMessage = maskCustomerTextForModel(message.slice(0, MAX_USER_MESSAGE_CHARS));

    // Open or resume this customer's own Custodian conversation (ownership + employee identity).
    const db = supabase as unknown as SupabaseClient;
    let conversationId: string | null = null;
    try {
      const opened = await resolveEmployeeConversation(db, {
        userId: auth.userId, employeeSlug: 'custodian', requestedSessionId, newConversation: body.newConversation === true,
      });
      conversationId = opened.sessionId;
    } catch {
      console.warn('[custodian-chat] conversation could not be opened; this turn will not be saved');
    }

    // Claim the turn BEFORE answering (retry-safe). A duplicate returns the stored reply.
    let claimed = false;
    if (conversationId) {
      try {
        const claim = await claimConversationTurn(db, { sessionId: conversationId, userId: auth.userId, employeeSlug: 'custodian', userText: message, clientMessageId });
        if (claim.status === 'duplicate') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              reply: claim.reply ?? "I already received that message, but my answer to it wasn't saved. Please ask again.",
              sessionId: conversationId,
              persisted: claim.reply !== null,
              duplicate: true,
            }),
          };
        }
        if (claim.status === 'conflict') {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ reply: "I couldn't confirm that message was received. Please send it again.", sessionId: conversationId, persisted: false }),
          };
        }
        claimed = claim.status === 'claimed';
      } catch {
        console.warn('[custodian-chat] could not save the message; answering without saving');
      }
    }

    let storedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (conversationId) {
      try {
        // The current message was just claimed; exclude it (it is sent below as the new turn).
        storedHistory = await loadConversationHistory(db, { sessionId: conversationId, userId: auth.userId });
        if (claimed && storedHistory.length > 0) {
          const last = storedHistory[storedHistory.length - 1];
          if (last.role === 'user' && last.content === maskCustomerTextForModel(message)) storedHistory = storedHistory.slice(0, -1);
        }
      } catch {
        storedHistory = [];
      }
    }

    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM_PROMPT + '\n\n' + userContext + pathContext,
      messages: [
        ...storedHistory,
        { role: 'user', content: modelMessage },
      ],
    });

    const textBlock = response.content.find((b: any) => b.type === 'text');
    let reply = textBlock && 'text' in textBlock ? textBlock.text : 'Sorry, I could not process that.';

    // Parse ACTION:NAVIGATE from reply
    let action: { type: string; path: string } | undefined;
    const navMatch = reply.match(/ACTION:NAVIGATE:(\/[^\s\n]+)/);
    if (navMatch) {
      action = { type: 'navigate', path: navMatch[1] };
      reply = reply.replace(/\s*ACTION:NAVIGATE:\/[^\s\n]+/g, '').trim();
    }

    // G11b (owner GO 2026-11-26): no comparison / trend / stability claim without coverage (same rule as screens).
    const gated = await gateReplyForCoverage(reply, () => loadStatementCoverage(supabase as unknown as CoverageDbClient, auth.userId!));
    if (gated.applied) { reply = gated.text; console.warn(`[custodian-chat] comparison claim gated: removed=${gated.removedSentences}`); }

    // Save Custodian's reply (signed by the platform). persisted is true only when both saves succeeded.
    let persisted = false;
    if (conversationId && claimed) {
      try {
        await completeConversationTurn(db, {
          sessionId: conversationId, userId: auth.userId, employeeSlug: 'custodian', assistantText: reply, clientMessageId,
          assistantMetadata: action ? { navigateTo: action.path } : undefined,
        });
        persisted = true;
      } catch {
        console.warn('[custodian-chat] reply was not saved');
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply, action, sessionId: conversationId, persisted }),
    };
  } catch (err: any) {
    console.error('[custodian-chat] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
