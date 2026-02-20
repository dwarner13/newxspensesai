import OpenAI from 'openai';
import type { PayoffInput } from './financePayoff.js';

export type FinleyPayoffPlannerInput = {
  loanType: 'mortgage' | 'auto_loan' | 'credit_card' | 'personal_loan' | 'unknown';
  baseline: PayoffInput;
  scenario?: PayoffInput;
  computed: {
    baseline: any;
    scenario: any;
    delta: {
      interestSaved: number;
      periodsSaved: number;
      timeSavedDays: number;
      totalSaved: number;
    };
  };
  userPrefs?: { targetPayoffDate?: string; comfortExtraPerPay?: number };
  notes?: string[];
};

export type FinleyPayoffOutput = {
  one_paragraph_summary: string;
  key_numbers: {
    baseline_payoff_date?: string;
    scenario_payoff_date?: string;
    baseline_total_interest: number;
    scenario_total_interest?: number;
    interest_saved?: number;
    time_saved?: string;
  };
  next_actions: string[];
  assumptions: string[];
  cautions: string[];
  confidence: number;
};

const PAYOFF_PLANNER_PROMPT = `ROLE
You are Prime's payoff planning writer.

RULES
- You must output STRICT JSON only.
- Never mention internal worker names, internals, or orchestration details.
- Stay grounded to provided computed numbers only.
- Grade-4 clarity: short words, simple phrasing.
- If scenario is missing, suggest 2-3 scenario ideas without inventing user-specific payment facts.

OUTPUT SCHEMA
{
  "one_paragraph_summary": "string",
  "key_numbers": {
    "baseline_payoff_date": "string (optional)",
    "scenario_payoff_date": "string (optional)",
    "baseline_total_interest": number,
    "scenario_total_interest": number (optional),
    "interest_saved": number (optional),
    "time_saved": "string (optional)"
  },
  "next_actions": ["string"],
  "assumptions": ["string"],
  "cautions": ["string"],
  "confidence": number
}`;

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function text(v: any): string {
  return String(v || '').replace(/\b(?:\d[ -]?){8,}\d\b/g, '[redacted-id]').trim();
}

function n(v: any): number {
  const parsed = Number(v);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function clampConfidence(v: any): number {
  const parsed = Number(v);
  if (!Number.isFinite(parsed)) return 0.65;
  return Math.max(0, Math.min(1, parsed));
}

export function buildFinleyPayoffFallbackOutput(
  reason: string,
  input?: FinleyPayoffPlannerInput
): FinleyPayoffOutput {
  const baselineDate = input?.computed?.baseline?.payoffDateISO || undefined;
  const scenarioDate = input?.computed?.scenario?.payoffDateISO || undefined;
  const hasScenario = Boolean(input?.scenario);
  const interestBase = n(input?.computed?.baseline?.totalInterest);
  const interestScenario = hasScenario ? n(input?.computed?.scenario?.totalInterest) : undefined;
  const interestSaved = hasScenario ? n(input?.computed?.delta?.interestSaved) : undefined;
  const monthsSaved = hasScenario ? Math.max(0, Math.round(n(input?.computed?.delta?.periodsSaved) / 12)) : 0;

  return {
    one_paragraph_summary: hasScenario
      ? 'Based on your numbers, this scenario could help you pay off sooner and pay less interest.'
      : 'Based on your numbers, I can estimate your payoff timeline now and compare scenarios next.',
    key_numbers: {
      baseline_payoff_date: baselineDate,
      scenario_payoff_date: scenarioDate,
      baseline_total_interest: interestBase,
      ...(typeof interestScenario === 'number' ? { scenario_total_interest: interestScenario } : {}),
      ...(typeof interestSaved === 'number' ? { interest_saved: interestSaved } : {}),
      ...(hasScenario ? { time_saved: `${monthsSaved} months` } : {}),
    },
    next_actions: hasScenario
      ? [
          'Confirm your lender allows extra payments without penalty.',
          'Set the extra amount as an automatic add-on payment.',
          'Re-check the projection after 1 month and update if needed.',
        ]
      : [
          'Try a what-if with extra $25 each payment.',
          'Try a what-if with extra $50 each payment.',
          'If helpful, test a one-time lump sum.',
        ],
    assumptions: [
      'Rate is treated as fixed for this estimate.',
      'Payments are made on schedule with no misses.',
    ],
    cautions: [
      'Some loans have prepayment rules or fees.',
    ],
    confidence: reason === 'openai_unavailable' ? 0.6 : 0.68,
  };
}

export function validateFinleyPayoffOutput(output: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!output || typeof output !== 'object') errors.push('output_not_object');
  if (!String(output?.one_paragraph_summary || '').trim()) errors.push('missing_summary');
  if (!output?.key_numbers || typeof output.key_numbers !== 'object') errors.push('missing_key_numbers');
  if (!Array.isArray(output?.next_actions)) errors.push('next_actions_not_array');
  if (!Array.isArray(output?.assumptions)) errors.push('assumptions_not_array');
  if (!Array.isArray(output?.cautions)) errors.push('cautions_not_array');
  const conf = Number(output?.confidence);
  if (!Number.isFinite(conf) || conf < 0 || conf > 1) errors.push('confidence_out_of_range');

  const blob = JSON.stringify(output || {});
  if (/\b(byte|tag|crystal|finley|worker|orchestration)\b/i.test(blob)) errors.push('internal_name_leak');
  return { ok: errors.length === 0, errors: Array.from(new Set(errors)) };
}

export function normalizeFinleyPayoffOutput(raw: any, fallbackInput?: FinleyPayoffPlannerInput): FinleyPayoffOutput {
  const fallback = buildFinleyPayoffFallbackOutput('normalize_fallback', fallbackInput);
  const src = raw && typeof raw === 'object' ? raw : fallback;
  const key = src?.key_numbers && typeof src.key_numbers === 'object' ? src.key_numbers : {};
  const nextActionsRaw = Array.isArray(src?.next_actions) ? src.next_actions : fallback.next_actions;
  const assumptionsRaw = Array.isArray(src?.assumptions) ? src.assumptions : fallback.assumptions;
  const cautionsRaw = Array.isArray(src?.cautions) ? src.cautions : fallback.cautions;

  return {
    one_paragraph_summary: text(src?.one_paragraph_summary || fallback.one_paragraph_summary),
    key_numbers: {
      baseline_payoff_date: key?.baseline_payoff_date ? text(key.baseline_payoff_date) : fallback.key_numbers.baseline_payoff_date,
      scenario_payoff_date: key?.scenario_payoff_date ? text(key.scenario_payoff_date) : fallback.key_numbers.scenario_payoff_date,
      baseline_total_interest: n(key?.baseline_total_interest ?? fallback.key_numbers.baseline_total_interest),
      ...(typeof key?.scenario_total_interest !== 'undefined'
        ? { scenario_total_interest: n(key.scenario_total_interest) }
        : (typeof fallback.key_numbers.scenario_total_interest !== 'undefined'
            ? { scenario_total_interest: n(fallback.key_numbers.scenario_total_interest) }
            : {})),
      ...(typeof key?.interest_saved !== 'undefined'
        ? { interest_saved: n(key.interest_saved) }
        : (typeof fallback.key_numbers.interest_saved !== 'undefined'
            ? { interest_saved: n(fallback.key_numbers.interest_saved) }
            : {})),
      ...(key?.time_saved
        ? { time_saved: text(key.time_saved) }
        : (fallback.key_numbers.time_saved ? { time_saved: fallback.key_numbers.time_saved } : {})),
    },
    next_actions: nextActionsRaw.map((v: any) => text(v)).filter(Boolean).slice(0, 6),
    assumptions: assumptionsRaw.map((v: any) => text(v)).filter(Boolean).slice(0, 6),
    cautions: cautionsRaw.map((v: any) => text(v)).filter(Boolean).slice(0, 3),
    confidence: clampConfidence(src?.confidence),
  };
}

export async function runFinleyPayoffPlanner(
  input: FinleyPayoffPlannerInput,
  _ctx?: any
): Promise<FinleyPayoffOutput> {
  const openai = getOpenAiClient();
  if (!openai) return buildFinleyPayoffFallbackOutput('openai_unavailable', input);
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' } as any,
      messages: [
        { role: 'system', content: PAYOFF_PLANNER_PROMPT },
        { role: 'user', content: JSON.stringify(input) },
      ],
      max_tokens: 1100,
    });
    const textOut = completion.choices?.[0]?.message?.content;
    let parsed: any = {};
    try {
      parsed = typeof textOut === 'string' ? JSON.parse(textOut) : {};
    } catch {
      parsed = {};
    }
    const normalized = normalizeFinleyPayoffOutput(parsed, input);
    const valid = validateFinleyPayoffOutput(normalized);
    if (!valid.ok) {
      return buildFinleyPayoffFallbackOutput(`validation_failed:${valid.errors.join(',')}`, input);
    }
    return normalized;
  } catch (error: any) {
    return buildFinleyPayoffFallbackOutput(error?.message || 'planner_error', input);
  }
}
