import OpenAI from "openai";

export const FINLEY_WORKER_SYSTEM_PROMPT = `ROLE
You are FINLEY, the planning/coaching worker for Prime orchestration.
You are NOT user-facing. Output STRICT JSON only.

INPUTS
- tag_output_json (required)
- crystal_output_json (optional)
- user_preferences (optional)

GOAL
Create practical planning suggestions grounded in provided financial signals.

HARD RULES
- Suggestions only: do not act, schedule, or execute anything.
- No invented specific dates. Set date_hint only if a real due date/date exists in inputs.
- If no due date/date exists in inputs, date_hint must be null and ask Prime to confirm dates.
- No invented amounts. target_amount may be set only if derived from provided amounts; otherwise null.
- Supportive tone, no shame.
- JSON only, no markdown.

OUTPUT (STRICT JSON)
{
  "plan": {
    "title": "string",
    "steps": [
      { "step": "string", "reason": "string", "difficulty": "easy|medium|hard" }
    ]
  },
  "suggested_goals": [
    { "goal": "string", "target_amount": number|null, "cadence": "weekly|monthly|one_time|unknown", "notes": "string" }
  ],
  "suggested_reminders": [
    { "label": "string", "date_hint": "YYYY-MM-DD|null", "cadence": "monthly|weekly|one_time|unknown", "notes": "string" }
  ],
  "questions_for_prime": ["string"]
}`;

const CADENCE_SET = new Set(["weekly", "monthly", "one_time", "unknown"]);
const DIFFICULTY_SET = new Set(["easy", "medium", "hard"]);

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

function sanitizeText(value: any): string {
  return String(value || "")
    .replace(/\b([A-Za-z0-9._%+-]{1})[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, "$1***@$2")
    .replace(/\b(?:\d[ -]?){10,}\d\b/g, "[redacted-id]")
    .trim();
}

export function buildFinleyWorkerFallbackOutput(_ctx: any, reason: string): any {
  return {
    plan: {
      title: "Suggested plan draft (needs confirmation)",
      steps: [
        { step: "Review top spending categories", reason: "Find the safest first optimization.", difficulty: "easy" },
        { step: "Pick one realistic monthly target", reason: "Small wins improve consistency.", difficulty: "easy" },
        { step: "Confirm reminders with Prime before creating anything", reason: "Suggestions require explicit user confirmation.", difficulty: "easy" },
      ],
    },
    suggested_goals: [
      { goal: "Set a starter savings target", target_amount: null, cadence: "monthly", notes: "Amount should be confirmed from latest grounded totals." },
    ],
    suggested_reminders: [
      { label: "Consider a monthly plan check-in", date_hint: null, cadence: "monthly", notes: "If you want, Prime can ask which date works best." },
    ],
    questions_for_prime: [
      "What date should be used for monthly check-ins?",
      `Should we keep this as suggestions only? (${reason})`,
    ],
  };
}

export function normalizeFinleyWorkerOutput(raw: any, ctx?: any): any {
  const fallback = buildFinleyWorkerFallbackOutput(ctx || null, "normalize_fallback");
  const source = raw && typeof raw === "object" ? raw : fallback;

  const stepsRaw = Array.isArray(source?.plan?.steps) ? source.plan.steps : fallback.plan.steps;
  const steps = stepsRaw.map((s: any) => ({
    step: sanitizeText(s?.step || "Plan step"),
    reason: sanitizeText(s?.reason || "Reason unavailable"),
    difficulty: DIFFICULTY_SET.has(String(s?.difficulty || "")) ? String(s.difficulty) : "medium",
  }));

  const goalsRaw = Array.isArray(source?.suggested_goals) ? source.suggested_goals : [];
  const goals = goalsRaw.map((g: any) => ({
    goal: sanitizeText(g?.goal || "Suggested goal"),
    target_amount: coerceNumber(g?.target_amount),
    cadence: CADENCE_SET.has(String(g?.cadence || "")) ? String(g.cadence) : "unknown",
    notes: sanitizeText(g?.notes || ""),
  }));

  const remindersRaw = Array.isArray(source?.suggested_reminders) ? source.suggested_reminders : [];
  const reminders = remindersRaw.map((r: any) => {
    const dateHint = r?.date_hint === null || /^\d{4}-\d{2}-\d{2}$/.test(String(r?.date_hint || ""))
      ? r?.date_hint ?? null
      : null;
    return {
      label: sanitizeText(r?.label || "Suggested reminder"),
      date_hint: dateHint,
      cadence: CADENCE_SET.has(String(r?.cadence || "")) ? String(r.cadence) : "unknown",
      notes: sanitizeText(r?.notes || ""),
    };
  });

  let questions = Array.isArray(source?.questions_for_prime)
    ? source.questions_for_prime.map((q: any) => sanitizeText(q)).filter(Boolean)
    : [];
  if (questions.length === 0) {
    questions = ["Which date should Prime use for reminders?"];
  }

  return {
    plan: {
      title: sanitizeText(source?.plan?.title || fallback.plan.title),
      steps: steps.length > 0 ? steps : fallback.plan.steps,
    },
    suggested_goals: goals,
    suggested_reminders: reminders,
    questions_for_prime: questions,
  };
}

export function validateFinleyWorkerOutput(output: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = ["plan", "suggested_goals", "suggested_reminders", "questions_for_prime"];
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(output || {}, key)) errors.push(`missing_key:${key}`);
  }

  if (!String(output?.plan?.title || "").trim()) errors.push("plan_title_empty");
  if (!Array.isArray(output?.plan?.steps)) errors.push("plan_steps_not_array");
  if (!Array.isArray(output?.suggested_goals)) errors.push("suggested_goals_not_array");
  if (!Array.isArray(output?.suggested_reminders)) errors.push("suggested_reminders_not_array");
  if (!Array.isArray(output?.questions_for_prime)) errors.push("questions_for_prime_not_array");

  for (const step of output?.plan?.steps || []) {
    if (!String(step?.step || "").trim()) errors.push("step_text_empty");
    if (!String(step?.reason || "").trim()) errors.push("step_reason_empty");
    if (!DIFFICULTY_SET.has(String(step?.difficulty || ""))) errors.push("step_difficulty_invalid");
  }

  const blob = JSON.stringify(output || {});
  if (/\b(OrchCtx|routePrime|TAG_WORKER_SYSTEM_PROMPT|CRYSTAL_WORKER_SYSTEM_PROMPT|FINLEY_WORKER_SYSTEM_PROMPT)\b/.test(blob)) {
    errors.push("internal_name_leak");
  }
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(blob)) {
    errors.push("raw_email_detected");
  }
  if (/\b(?:\d[ -]?){10,}\d\b/.test(blob)) {
    errors.push("raw_identifier_detected");
  }

  return { ok: errors.length === 0, errors: Array.from(new Set(errors)) };
}

function collectAllowedDates(ctx: any): Set<string> {
  const set = new Set<string>();
  const tagSummary = ctx?.tag_output_json?.account_summary || {};
  for (const value of Object.values(tagSummary)) {
    const str = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) set.add(str);
  }

  const crystalInsights = Array.isArray(ctx?.crystal_output_json?.insights) ? ctx.crystal_output_json.insights : [];
  for (const insight of crystalInsights) {
    const text = `${String(insight?.title || "")} ${String(insight?.detail || "")}`;
    const matches = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
    for (const d of matches) set.add(d);
  }
  return set;
}

function collectAllowedAmounts(ctx: any): Set<number> {
  const out = new Set<number>();
  const add = (value: any) => {
    const n = coerceNumber(value);
    if (n !== null && Math.abs(n) >= 1) out.add(Number(Math.abs(n).toFixed(2)));
  };

  const tag = ctx?.tag_output_json || {};
  add(tag?.account_summary?.opening_balance);
  add(tag?.account_summary?.closing_balance);
  add(tag?.account_summary?.total_deposits);
  add(tag?.account_summary?.total_withdrawals);
  for (const ct of tag?.category_totals || []) add(ct?.total);

  const crystal = ctx?.crystal_output_json || {};
  add(crystal?.highlights?.largest_spend?.amount);
  add(crystal?.highlights?.largest_income?.amount);
  add(crystal?.highlights?.fees_total);
  add(crystal?.highlights?.transfers_total);
  return out;
}

export function validateFinleyGrounding(
  output: any,
  groundingCtx: {
    tag_output_json?: any;
    crystal_output_json?: any;
    requireNoInventedDates?: boolean;
    requireNoInventedAmounts?: boolean;
  }
): { ok: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allowedDates = collectAllowedDates(groundingCtx || {});
  const allowedAmounts = collectAllowedAmounts(groundingCtx || {});

  for (const reminder of output?.suggested_reminders || []) {
    const dateHint = reminder?.date_hint;
    if (dateHint && !allowedDates.has(String(dateHint))) {
      if (groundingCtx?.requireNoInventedDates !== false) errors.push(`invented_date_hint:${dateHint}`);
      else warnings.push(`invented_date_hint:${dateHint}`);
    }
  }

  for (const goal of output?.suggested_goals || []) {
    const amount = coerceNumber(goal?.target_amount);
    if (amount !== null) {
      const abs = Number(Math.abs(amount).toFixed(2));
      const matched = Array.from(allowedAmounts).some((a) => Math.abs(a - abs) <= 0.01);
      if (!matched) {
        if (groundingCtx?.requireNoInventedAmounts !== false) errors.push(`invented_target_amount:${amount}`);
        else warnings.push(`invented_target_amount:${amount}`);
      }
    }
  }

  if (allowedDates.size === 0) warnings.push("no_allowed_dates_in_inputs");
  if (allowedAmounts.size === 0) warnings.push("no_allowed_amounts_in_inputs");
  return { ok: errors.length === 0, errors, warnings };
}

export async function runFinleyWorkerPlan(input: any, ctx?: any): Promise<any> {
  const openai = getOpenAiClient();
  if (!openai) return buildFinleyWorkerFallbackOutput(ctx || null, "openai_unavailable");
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: FINLEY_WORKER_SYSTEM_PROMPT },
        { role: "user", content: typeof input === "string" ? input : JSON.stringify(input) },
      ],
      max_tokens: 2200,
    });
    const content = completion.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : {};
    const normalized = normalizeFinleyWorkerOutput(parsed, ctx);
    const validation = validateFinleyWorkerOutput(normalized);
    if (!validation.ok) {
      const fallback = buildFinleyWorkerFallbackOutput(ctx || null, "validation_failed");
      fallback.questions_for_prime = [...fallback.questions_for_prime, `Validation issues: ${validation.errors.join(", ")}`];
      return fallback;
    }
    return normalized;
  } catch (error: any) {
    return buildFinleyWorkerFallbackOutput(ctx || null, error?.message || "finley_worker_error");
  }
}

