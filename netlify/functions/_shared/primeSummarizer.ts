import OpenAI from "openai";

export const PRIME_SUMMARY_SYSTEM_PROMPT = `ROLE
You are Prime — XspensesAI's lead financial intelligence agent and the user's
personal financial advisor. You speak with authority, warmth, and specificity.
You never hedge unnecessarily. You sound like a CFP who also happens to know
the user's data cold.

RULES
- Never invent values. Ground every claim in the input data.
- If a value is missing, say so once and move on — do not dwell on gaps.
- Never mention internal systems, agents, or implementation details.
- Never use phrases like "based on available data" or "it appears that".
- Speak directly to the user as their advisor, not as a report generator.
- Use dollar amounts, percentages, and specific category names — never vague generalities.

VOICE
- Confident but not cold. Specific but not robotic.
- Lead with what matters most, not with what's easiest to say.
- One clear opinion or recommendation per summary — don't just list, advise.
`;

type PrimeSummaryInput = {
  tag: any;
  crystal: any;
  finley: any;
  byte?: any;
  userName?: string;
  mode?: "professional" | "coach" | string;
};

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function n(v: any): number | null {
  if (v === null || typeof v === "undefined") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const parsed = Number(String(v).replace(/[,$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(v: any): string {
  const num = n(v);
  if (num === null) return "n/a";
  return `$${Math.abs(num).toFixed(2)}`;
}

export function buildPrimeSummaryFallback(reason: string): string {
  return [
    `I reviewed this statement and prepared a cautious summary (${reason}).`,
    "",
    "Key totals:",
    "- Some totals are missing, so this summary is conservative.",
    "",
    "Highlights:",
    "- Core transaction categories were reviewed.",
    "- A manual pass is recommended for any transfer/payment edge cases.",
    "",
    "Flags:",
    "- Missing data requires confirmation before decisions.",
    "",
    "Next actions:",
    "- Confirm statement period and account totals.",
    "- Review transfer and fee rows for classification accuracy.",
    "- Approve any goals/reminders before creating them.",
  ].join("\n");
}

export function normalizePrimeSummaryOutput(raw: any): string {
  const text = String(raw || "").trim();
  if (!text) return buildPrimeSummaryFallback("empty_output");
  return text
    .replace(/\b(OrchCtx|worker_chain|deterministic_path|JSON mode|prompt)\b/gi, "internal-system")
    .trim();
}

function deterministicPrimeSummary(input: PrimeSummaryInput): string {
  const tag = input.tag || {};
  const crystal = input.crystal || {};
  const finley = input.finley || {};
  const byte = input.byte || {};
  const name = String(input.userName || "there");

  const statementPeriod = tag?.statement_period || byte?.statement_period || null;
  const statementType = tag?.statement_type || byte?.doc_type || "this statement";
  const account = tag?.account_summary || {};
  const categoryTotals = Array.isArray(tag?.category_totals) ? tag.category_totals : [];
  const topTwo = [...categoryTotals]
    .sort((a: any, b: any) => Math.abs(Number(b?.total || 0)) - Math.abs(Number(a?.total || 0)))
    .slice(0, 2);
  const crystalInsights = Array.isArray(crystal?.insights) ? crystal.insights.slice(0, 2) : [];
  const finleySteps = Array.isArray(finley?.plan?.steps) ? finley.plan.steps.slice(0, 3) : [];
  const finleyActions = Array.isArray(finley?.questions_for_prime) ? finley.questions_for_prime.slice(0, 2) : [];

  const header = statementPeriod
    ? `Hi ${name}, here is a grounded summary for ${statementType} (${statementPeriod}).`
    : `Hi ${name}, here is a grounded summary for this statement.`;

  const totalsLines: string[] = [];
  if (n(account?.opening_balance) !== null) totalsLines.push(`- Opening balance: ${money(account.opening_balance)}`);
  if (n(account?.closing_balance) !== null) totalsLines.push(`- Closing balance: ${money(account.closing_balance)}`);
  if (n(account?.total_deposits) !== null) totalsLines.push(`- Total deposits: ${money(account.total_deposits)}`);
  if (n(account?.total_withdrawals) !== null) totalsLines.push(`- Total withdrawals: ${money(account.total_withdrawals)}`);
  if (totalsLines.length === 0) totalsLines.push("- Key totals are limited; verify statement totals before decisions.");

  const highlights: string[] = [];
  for (const c of topTwo) highlights.push(`- ${String(c?.category || "Category")}: ${money(c?.total)}`);
  for (const i of crystalInsights) highlights.push(`- ${String(i?.title || "Insight")}: ${String(i?.detail || "").slice(0, 120)}`);
  const highlightLines = highlights.slice(0, 3);
  if (highlightLines.length === 0) highlightLines.push("- Spending patterns are available but need a review pass.");

  const flags: string[] = [];
  const tagFlags = Array.isArray(tag?.highlights?.flags) ? tag.highlights.flags : [];
  if (tagFlags.length > 0) flags.push(`- ${String(tagFlags[0])}`);
  if (Array.isArray(crystal?.flags) && crystal.flags.length > 0) flags.push(`- ${String(crystal.flags[0]?.type || "review")}: ${String(crystal.flags[0]?.notes || "")}`);
  if (flags.length === 0) flags.push("- No critical issues detected, but confirm totals before acting.");
  const flagLines = flags.slice(0, 2);

  const nextActions: string[] = [];
  for (const s of finleySteps) nextActions.push(`- ${String(s?.step || "Review plan step")}`);
  for (const q of finleyActions) nextActions.push(`- ${String(q)}`);
  nextActions.push("- Confirm any reminder or goal with Prime before creating it.");
  const actionLines = nextActions.slice(0, 6);
  while (actionLines.length < 3) actionLines.push("- Confirm next best step with Prime.");

  return [
    header,
    "",
    "Key totals:",
    ...totalsLines,
    "",
    "Highlights:",
    ...highlightLines,
    "",
    "Flags:",
    ...flagLines,
    "",
    "Next actions:",
    ...actionLines,
  ].join("\n");
}

export async function runPrimeSummary(input: PrimeSummaryInput): Promise<string> {
  const openai = getOpenAiClient();
  const deterministic = deterministicPrimeSummary(input);
  console.log('[prime-summary] LLM flag:', process.env.PRIME_SUMMARY_ALLOW_LLM);
  if (process.env.PRIME_SUMMARY_ALLOW_LLM !== '1') {
    return normalizePrimeSummaryOutput(deterministic);
  }
  if (!openai) return normalizePrimeSummaryOutput(deterministic);
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: PRIME_SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            mode: input.mode || "professional",
            user_name: input.userName || null,
            tag: input.tag || {},
            crystal: input.crystal || {},
            finley: input.finley || {},
            byte: input.byte || {},
          }),
        },
      ],
      max_tokens: 700,
    });
    const text = normalizePrimeSummaryOutput(completion.choices?.[0]?.message?.content || "");
    if (!text) return normalizePrimeSummaryOutput(deterministic);
    return text;
  } catch {
    return normalizePrimeSummaryOutput(deterministic);
  }
}

// ── Advisor-voice LLM summary using Anthropic (Claude) ───────────────────────

const PRIME_ADVISOR_SYSTEM_PROMPT = `You are Prime, the lead financial advisor at XspensesAI. You speak directly to the user with confidence, warmth, and precision.

RULES
- Never invent values. Every number must come from the input data.
- Use exact dollar amounts and percentages. No vague language.
- Reference the XspensesAI team by name: Byte (document processing), Tag (categorization), Crystal (analytics), Finley (planning).
- No emojis. Professional but warm tone.
- Every transaction MUST include its date.

OUTPUT FORMAT - follow this EXACT structure with these EXACT section headers:

---
PRIME SUMMARY - YOUR STATEMENT, SIMPLIFIED

Source: [Institution name or document name]
Period: [Start date] to [End date]

---
WHAT HAPPENED THIS PERIOD

Write 4-5 bullet points with the key numbers:
- Total transactions: [count]
- Total spent: $X.XX
- Payments/credits: $X.XX
- Ending balance: $X.XX (if available from account_summary)
- Simple takeaway: [One plain-English sentence summarizing the period]

---
YOUR TRANSACTIONS (WITH DATES)

Group transactions into a logical timeline. If there is a payment, split into "Before Payment" and "After Payment" sections.
Each transaction line MUST include: date, merchant name, amount.
Format each line as: [Date] - [Merchant] - $XX.XX
After each group, add a count line: "[N] transactions in this period"
If a merchant appears multiple times, list each occurrence separately with its own date and amount - never aggregate.

---
WHERE YOUR MONEY WENT

Group spending by category with subtotals. List individual transactions under each category with dates.
Categories to use: look at top_categories from the data.
Format:
[Category Name] ($X.XX total)
- [Date] - [Merchant] - $XX.XX
- [Date] - [Merchant] - $XX.XX

---
WHAT TO WATCH

2-4 findings based on the data. Each finding gets a bold label and explanation.
Prioritize: credit utilization (if account_summary available), recurring charges, largest single expenses, spending velocity.
Be specific with numbers.

---
THE BOTTOM LINE

One paragraph, 3-5 sentences. Summarize the most important pattern. Close with one specific, actionable recommendation.

---
YOUR AI TEAM CAN HELP

Based on what you found in the data, recommend 2-3 XspensesAI employees who can help:
- If spending patterns need investigation: "Crystal can break down your spending trends over time and flag anomalies."
- If categories need cleanup: "Tag can review and reclassify your transactions for better accuracy."
- If debt/loans are present: "Finley can build a payoff plan for your outstanding balances."
- If recurring charges found: "Crystal can track your subscription costs month-over-month."
- If credit utilization is high: "Finley can project when you will hit your limit and suggest payment timing."
Only recommend employees whose expertise matches an actual finding in the data. Never recommend all of them.

---

FORMATTING RULES
- Use --- as section dividers
- Bold section headers and key numbers using **markdown bold**
- Use bullet points with - for lists
- Keep total output under 600 words
- No emojis anywhere`;

export async function runLLMAdvisorSummary(params: {
  analytics: any;
  deterministicNarrative: string;
  docName: string;
  period: string | null;
  transactionCount: number | null;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return params.deterministicNarrative;

  const { analytics, deterministicNarrative, docName, period, transactionCount } = params;
  const totals = analytics?.totals || {};
  const categoryTotals = Array.isArray(analytics?.category_totals)
    ? analytics.category_totals.slice(0, 12)
    : [];
  const topMerchants = Array.isArray(analytics?.top_merchants)
    ? analytics.top_merchants.slice(0, 15)
    : [];
  const flags = analytics?.flags || {};
  const statementMeta = analytics?.statement_meta || {};

  const dataPayload = {
    document: docName,
    period: period || 'unknown',
    transaction_count: transactionCount,
    institution: statementMeta?.issuer || null,
    account_last4: statementMeta?.account_last4 || null,
    totals: {
      opening_balance: totals?.opening_balance ?? null,
      closing_balance: totals?.closing_balance ?? null,
      total_debits: totals?.total_debits ?? null,
      total_credits: totals?.total_credits ?? null,
      net: totals?.net ?? null,
    },
    top_categories: categoryTotals.map((c: any) => ({
      category: c?.category,
      total: c?.total,
      count: c?.count,
    })),
    top_merchants: topMerchants.map((m: any) => ({
      merchant: m?.merchant,
      total: m?.total,
      count: m?.count,
    })),
    needs_review_count: flags?.needs_review_count ?? 0,
    account_summary: analytics?.account_summary || null,
    tag_stats: {
      auto_tagged_count: (flags?.needs_review_count ?? 0) === 0 ? transactionCount : ((transactionCount || 0) - (flags?.needs_review_count || 0)),
      categories_used: categoryTotals.length,
    },
    deterministic_draft: deterministicNarrative,
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: PRIME_ADVISOR_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Write the Prime summary for this statement data:\n\n${JSON.stringify(dataPayload, null, 2)}`,
          },
        ],
      }),
    });

    if (!response.ok) return deterministicNarrative;

    const data = await response.json();
    const text = data?.content?.[0]?.text?.trim();
    if (!text || text.length < 40) return deterministicNarrative;

    return normalizePrimeSummaryOutput(text);
  } catch {
    return deterministicNarrative;
  }
}

