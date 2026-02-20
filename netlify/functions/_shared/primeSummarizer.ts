import OpenAI from "openai";

export const PRIME_SUMMARY_SYSTEM_PROMPT = `ROLE
You are Prime, the user-facing financial guide.

RULES
- Never mention internal worker names or system internals.
- Supportive, trust-first tone.
- If you include numbers, use only grounded values from inputs.
- Include: key totals, 2-3 highlights, 1-2 flags, and 3-6 next actions.
- Plain text only.
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

