import OpenAI from "openai";

export const CRYSTAL_WORKER_SYSTEM_PROMPT = `ROLE
You are CRYSTAL, the insights worker for Prime orchestration.
You are NOT user-facing and must output STRICT JSON only.

GOAL
Use provided inputs only:
- tag_output_json (required)
- byte_account_summary (optional)
- prior_period_snapshot (optional)

Produce grounded insights, highlights, recurring candidates, risk flags, and next actions.

CRITICAL RULES
- Do not invent totals, balances, spend amounts, or transactions.
- Numeric claims must be grounded in provided TAG inputs.
- If data is missing, set conservative output and add flags.
- No markdown, no conversational prose outside JSON fields.

OUTPUT FORMAT (STRICT JSON ONLY)
{
  "insights":[
    {
      "type":"spending_pattern|cash_flow|fees|subscriptions|debt|risk|tax_hint|other",
      "title":"string",
      "detail":"string",
      "confidence":0.0,
      "cites":["optional citations"]
    }
  ],
  "highlights":{
    "largest_spend":{"amount":number|null,"description":"string|null","date":"YYYY-MM-DD|null"},
    "largest_income":{"amount":number|null,"description":"string|null","date":"YYYY-MM-DD|null"},
    "fees_total":number|null,
    "transfers_total":number|null
  },
  "recurring_candidates":[
    {
      "merchant":"string",
      "count":number,
      "avg_amount":number|null,
      "suggested_category":"string|null",
      "notes":"string"
    }
  ],
  "flags":[
    { "type":"string", "notes":"string" }
  ],
  "recommended_next_actions":[
    { "action":"string", "why":"string" }
  ]
}`;

const INSIGHT_TYPES = new Set([
  "spending_pattern",
  "cash_flow",
  "fees",
  "subscriptions",
  "debt",
  "risk",
  "tax_hint",
  "other",
]);

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function coerceNumber(value: any): number | null {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[,$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeConfidence(value: any): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

function redactPIIText(input: string): string {
  return String(input || "")
    .replace(/\b([A-Za-z0-9._%+-]{1})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, "$1***@$2")
    .replace(/\b(?:\d[ -]?){10,}\d\b/g, (m) => {
      const digits = m.replace(/\D/g, "");
      const masked = `${"*".repeat(Math.max(2, digits.length - 4))}${digits.slice(-4)}`;
      let idx = 0;
      return m.replace(/\d/g, () => masked[idx++] || "*");
    })
    .replace(/\b\d{10,}\b/g, "[redacted-id]")
    .trim();
}

export function buildCrystalWorkerFallbackOutput(_ctx: any, reason: string): any {
  return {
    insights: [
      {
        type: "other",
        title: "Data quality review required",
        detail: "The current analysis input is incomplete, so insights are conservative.",
        confidence: 0.2,
        cites: [`fallback:${reason}`],
      },
      {
        type: "risk",
        title: "Grounding could not be fully verified",
        detail: "Numeric claims were limited to avoid unsupported conclusions.",
        confidence: 0.2,
        cites: ["missing_data"],
      },
      {
        type: "cash_flow",
        title: "Re-run with complete TAG output",
        detail: "Provide complete categorized transactions to improve confidence.",
        confidence: 0.2,
        cites: ["needs_review"],
      },
    ],
    highlights: {
      largest_spend: { amount: null, description: null, date: null },
      largest_income: { amount: null, description: null, date: null },
      fees_total: null,
      transfers_total: null,
    },
    recurring_candidates: [],
    flags: [{ type: "missing_data", notes: `fallback:${reason}` }],
    recommended_next_actions: [
      { action: "Re-run TAG categorization with complete input", why: "Crystal requires grounded structured inputs." },
      { action: "Review transfer and fee labeling", why: "Prevents spend inflation and improves insight quality." },
      { action: "Confirm statement coverage", why: "Missing periods reduce confidence for trends." },
    ],
  };
}

export function normalizeCrystalWorkerOutput(raw: any, ctx?: any): any {
  const fallback = buildCrystalWorkerFallbackOutput(ctx || null, "normalize_fallback");
  const source = raw && typeof raw === "object" ? raw : fallback;

  const insightsRaw = Array.isArray(source.insights) ? source.insights : fallback.insights;
  const insights = insightsRaw.map((item: any) => ({
    type: INSIGHT_TYPES.has(String(item?.type || "")) ? String(item.type) : "other",
    title: redactPIIText(String(item?.title || "Untitled insight")),
    detail: redactPIIText(String(item?.detail || "No detail provided")),
    confidence: normalizeConfidence(item?.confidence),
    cites: Array.isArray(item?.cites) ? item.cites.map((v: any) => redactPIIText(String(v))) : [],
  }));

  const recurringRaw = Array.isArray(source.recurring_candidates) ? source.recurring_candidates : [];
  const recurringCandidates = recurringRaw.map((r: any) => ({
    merchant: redactPIIText(String(r?.merchant || "Unknown")),
    count: Math.max(1, Number(coerceNumber(r?.count) || 1)),
    avg_amount: coerceNumber(r?.avg_amount),
    suggested_category: r?.suggested_category ? String(r.suggested_category) : null,
    notes: redactPIIText(String(r?.notes || "")),
  }));

  const flagsRaw = Array.isArray(source.flags) ? source.flags : [];
  const flags = flagsRaw.map((f: any) => ({
    type: String(f?.type || "other"),
    notes: redactPIIText(String(f?.notes || "")),
  }));

  let actions = Array.isArray(source.recommended_next_actions)
    ? source.recommended_next_actions.map((a: any) => ({
        action: redactPIIText(String(a?.action || "")),
        why: redactPIIText(String(a?.why || "")),
      }))
    : fallback.recommended_next_actions;
  if (actions.length < 3) {
    actions = [...actions, ...fallback.recommended_next_actions].slice(0, 3);
  } else if (actions.length > 6) {
    actions = actions.slice(0, 6);
  }

  return {
    insights,
    highlights: {
      largest_spend: {
        amount: coerceNumber(source?.highlights?.largest_spend?.amount),
        description: source?.highlights?.largest_spend?.description
          ? redactPIIText(String(source.highlights.largest_spend.description))
          : null,
        date: source?.highlights?.largest_spend?.date ?? null,
      },
      largest_income: {
        amount: coerceNumber(source?.highlights?.largest_income?.amount),
        description: source?.highlights?.largest_income?.description
          ? redactPIIText(String(source.highlights.largest_income.description))
          : null,
        date: source?.highlights?.largest_income?.date ?? null,
      },
      fees_total: coerceNumber(source?.highlights?.fees_total),
      transfers_total: coerceNumber(source?.highlights?.transfers_total),
    },
    recurring_candidates: recurringCandidates,
    flags,
    recommended_next_actions: actions,
  };
}

export function validateCrystalWorkerOutput(output: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = ["insights", "highlights", "recurring_candidates", "flags", "recommended_next_actions"];
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(output || {}, key)) errors.push(`missing_key:${key}`);
  }
  if (!Array.isArray(output?.insights)) errors.push("insights_not_array");
  if (!output?.highlights || typeof output.highlights !== "object") errors.push("highlights_not_object");
  if (!Array.isArray(output?.recurring_candidates)) errors.push("recurring_candidates_not_array");
  if (!Array.isArray(output?.flags)) errors.push("flags_not_array");
  if (!Array.isArray(output?.recommended_next_actions)) errors.push("recommended_next_actions_not_array");

  for (const insight of output?.insights || []) {
    if (!INSIGHT_TYPES.has(String(insight?.type || ""))) errors.push("invalid_insight_type");
    if (!String(insight?.title || "").trim()) errors.push("insight_title_empty");
    if (!String(insight?.detail || "").trim()) errors.push("insight_detail_empty");
    const conf = Number(insight?.confidence);
    if (!(Number.isFinite(conf) && conf >= 0 && conf <= 1)) errors.push("insight_confidence_out_of_range");
  }

  for (const action of output?.recommended_next_actions || []) {
    if (!String(action?.action || "").trim()) errors.push("recommended_action_empty");
    if (!String(action?.why || "").trim()) errors.push("recommended_action_why_empty");
  }
  const actionCount = Array.isArray(output?.recommended_next_actions) ? output.recommended_next_actions.length : 0;
  if (actionCount < 3 || actionCount > 6) errors.push("recommended_actions_out_of_range");

  const textBlob = JSON.stringify(output || {});
  if (/\b(TAG_WORKER_SYSTEM_PROMPT|OrchCtx|routePrime|buildSafeFallbackResponse)\b/.test(textBlob)) {
    errors.push("internal_name_leak");
  }
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(textBlob)) {
    errors.push("raw_email_detected");
  }
  if (/\b(?:\d[ -]?){10,}\d\b/.test(textBlob)) {
    errors.push("raw_long_identifier_detected");
  }

  return { ok: errors.length === 0, errors: Array.from(new Set(errors)) };
}

function extractMoneyLikeNumbers(text: string): number[] {
  const matches = String(text || "").match(/(?:\$?\s*)?[-+]?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|(?:\$?\s*)?[-+]?\d+\.\d{1,2}|(?:\$?\s*)?[-+]?\d+/g) || [];
  const out: number[] = [];
  for (const m of matches) {
    const n = Number(m.replace(/[,$\s]/g, ""));
    if (Number.isFinite(n) && Math.abs(n) >= 1) out.push(Number(Math.abs(n).toFixed(2)));
  }
  return out;
}

function buildAllowedGroundingNumbers(tag: any): number[] {
  const out: number[] = [];
  const add = (v: any) => {
    const n = coerceNumber(v);
    if (n !== null && Math.abs(n) >= 1) out.push(Number(Math.abs(n).toFixed(2)));
  };
  add(tag?.account_summary?.opening_balance);
  add(tag?.account_summary?.closing_balance);
  add(tag?.account_summary?.total_deposits);
  add(tag?.account_summary?.total_withdrawals);
  for (const ct of tag?.category_totals || []) add(ct?.total);
  add(tag?.highlights?.largest_spend?.amount);
  add(tag?.highlights?.largest_income?.amount);
  for (const tx of tag?.transactions || []) add(tx?.amount);
  return Array.from(new Set(out));
}

export function validateCrystalGrounding(
  output: any,
  groundingCtx: { tag_output_json?: any }
): { ok: boolean; errors: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];
  const tag = groundingCtx?.tag_output_json || {};
  const allowed = buildAllowedGroundingNumbers(tag);
  if (allowed.length === 0) {
    warnings.push("no_grounding_numbers_available");
    return { ok: false, errors: ["no_grounding_numbers_available"], warnings };
  }

  const claims: number[] = [];
  for (const i of output?.insights || []) {
    claims.push(...extractMoneyLikeNumbers(i?.title || ""));
    claims.push(...extractMoneyLikeNumbers(i?.detail || ""));
  }
  claims.push(...extractMoneyLikeNumbers(output?.highlights?.largest_spend?.description || ""));
  claims.push(...extractMoneyLikeNumbers(output?.highlights?.largest_income?.description || ""));
  if (coerceNumber(output?.highlights?.largest_spend?.amount) !== null) {
    claims.push(Number(Math.abs(Number(output.highlights.largest_spend.amount)).toFixed(2)));
  }
  if (coerceNumber(output?.highlights?.largest_income?.amount) !== null) {
    claims.push(Number(Math.abs(Number(output.highlights.largest_income.amount)).toFixed(2)));
  }
  if (coerceNumber(output?.highlights?.fees_total) !== null) {
    claims.push(Number(Math.abs(Number(output.highlights.fees_total)).toFixed(2)));
  }
  if (coerceNumber(output?.highlights?.transfers_total) !== null) {
    claims.push(Number(Math.abs(Number(output.highlights.transfers_total)).toFixed(2)));
  }

  const missingGrounding = claims.filter((claim) => !allowed.some((a) => Math.abs(a - claim) <= 0.01));
  if (missingGrounding.length > 0) {
    errors.push(`ungrounded_number:${missingGrounding.slice(0, 8).join(",")}`);
  }

  const txAmounts = new Set(
    (tag?.transactions || [])
      .map((t: any) => coerceNumber(t?.amount))
      .filter((n: any) => n !== null)
      .map((n: any) => Number(Math.abs(n).toFixed(2)))
  );
  const largestSpend = coerceNumber(output?.highlights?.largest_spend?.amount);
  if (largestSpend !== null && !txAmounts.has(Number(Math.abs(largestSpend).toFixed(2)))) {
    errors.push("largest_spend_not_in_tag_transactions");
  }
  const largestIncome = coerceNumber(output?.highlights?.largest_income?.amount);
  if (largestIncome !== null && !txAmounts.has(Number(Math.abs(largestIncome).toFixed(2)))) {
    errors.push("largest_income_not_in_tag_transactions");
  }

  return { ok: errors.length === 0, errors, warnings };
}

export async function runCrystalWorkerInsights(input: any, ctx?: any): Promise<any> {
  const openai = getOpenAiClient();
  if (!openai) {
    return buildCrystalWorkerFallbackOutput(ctx || null, "openai_unavailable");
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: CRYSTAL_WORKER_SYSTEM_PROMPT },
        { role: "user", content: typeof input === "string" ? input : JSON.stringify(input) },
      ],
      max_tokens: 2400,
    });
    const content = completion.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : {};
    const normalized = normalizeCrystalWorkerOutput(parsed, ctx);
    const validation = validateCrystalWorkerOutput(normalized);
    if (!validation.ok) {
      const fallback = buildCrystalWorkerFallbackOutput(ctx || null, "validation_failed");
      fallback.flags = [
        ...fallback.flags,
        { type: "validation_error", notes: validation.errors.join(", ") },
      ];
      return fallback;
    }
    return normalized;
  } catch (error: any) {
    return buildCrystalWorkerFallbackOutput(ctx || null, error?.message || "crystal_worker_error");
  }
}

