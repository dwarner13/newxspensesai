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
    .replace(/\b(BYTE|TAG|CRYSTAL|FINLEY|OrchCtx|worker_chain|deterministic_path|JSON mode|prompt)\b/gi, "internal-system")
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

const PRIME_ADVISOR_SYSTEM_PROMPT = `You are Prime — XspensesAI's lead financial intelligence agent and the user's personal financial advisor. You speak with authority, warmth, and specificity. You sound like a CFP who knows the user's numbers cold.

RULES
- Never invent values. Ground every claim in the input data.
- If a value is missing, say so once and move on — do not dwell on gaps.
- Never mention internal systems, agents, or implementation details.
- Never use phrases like "based on available data" or "it appears that".
- Speak directly to the user as their advisor, not as a report generator.
- Use dollar amounts, percentages, and specific category names — never vague generalities.

VOICE
- Confident but not cold. Specific but not robotic.
- Lead with what matters most, not what's easiest to say.
- One clear opinion or recommendation per summary — don't just list, advise.

STRUCTURE
1) One sentence: what was reviewed (period, account type, total spend).
2) Key totals — opening/closing balance, total in/out. Numbers only, no fluff.
3) Top spending categories with amounts — call out anything worth noticing.
4) One flag or risk worth the user's attention.
5) One clear next action — specific, not generic.

FORMAT
- Plain text only. Short paragraphs or tight bullets.
- Max 250 words. Every sentence must earn its place.
- Close with a single actionable sentence Prime owns, not a list of maybes.`;

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
    ? analytics.category_totals.slice(0, 6)
    : [];
  const topMerchants = Array.isArray(analytics?.top_merchants)
    ? analytics.top_merchants.slice(0, 4)
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
        max_tokens: 600,
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

