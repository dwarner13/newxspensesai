import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildFinleyWorkerFallbackOutput,
  normalizeFinleyWorkerOutput,
  runFinleyWorkerPlan,
  validateFinleyGrounding,
  validateFinleyWorkerOutput,
} from "../../netlify/functions/_shared/finleyWorker.ts";

type Options = {
  dir: string;
  contract: boolean;
  failOnReview: boolean;
  maxSteps: number;
  minConfidence: number;
  requireNoInventedDates: boolean;
  requireNoInventedAmounts: boolean;
};

type ContractResult = { file: string; pass: boolean; reasons: string[]; warnings: string[] };

const DEFAULT_DIR = path.resolve("scripts/finley-test/fixtures");
const OUTPUT_DIR = path.resolve("scripts/finley-test/output");
const CONTRACT_REPORT_PATH = path.join(OUTPUT_DIR, "contract-report.json");
const DIFFICULTY_VALUES = new Set(["easy", "medium", "hard"]);
const CADENCE_VALUES = new Set(["weekly", "monthly", "one_time", "unknown"]);

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const has = (flag: string): boolean => args.includes(flag);
  const getValue = (flag: string): string | undefined => {
    const idx = args.findIndex((a) => a === flag);
    if (idx < 0) return undefined;
    return args[idx + 1];
  };
  const maxStepsRaw = Number(getValue("--max-steps") || 7);
  const minConfidenceRaw = Number(getValue("--min-confidence") || 0.7);
  return {
    dir: path.resolve(getValue("--dir") || DEFAULT_DIR),
    contract: has("--contract"),
    failOnReview: has("--fail-on-review"),
    maxSteps: Number.isFinite(maxStepsRaw) && maxStepsRaw > 0 ? Math.floor(maxStepsRaw) : 7,
    minConfidence: Number.isFinite(minConfidenceRaw) ? minConfidenceRaw : 0.7,
    requireNoInventedDates: !has("--require-no-invented-dates=false"),
    requireNoInventedAmounts: !has("--require-no-invented-amounts=false"),
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(curr: string): Promise<void> {
    const entries = await fs.readdir(curr, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(curr, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

function compactPad(value: string, width: number): string {
  return value.length >= width ? `${value.slice(0, width - 1)}…` : value.padEnd(width, " ");
}

function detectTagOutput(obj: any): boolean {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      Object.prototype.hasOwnProperty.call(obj, "statement_type") &&
      Array.isArray(obj.transactions) &&
      Array.isArray(obj.category_totals)
  );
}

function buildInputPayload(parsed: any): {
  payload: any;
  tag: any;
  crystal: any | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (parsed && typeof parsed === "object" && (parsed.tag_output || parsed.tag_output_json)) {
    return {
      payload: {
        tag_output_json: parsed.tag_output || parsed.tag_output_json,
        crystal_output_json: parsed.crystal_output || parsed.crystal_output_json || null,
        user_preferences: parsed.user_preferences || null,
      },
      tag: parsed.tag_output || parsed.tag_output_json,
      crystal: parsed.crystal_output || parsed.crystal_output_json || null,
      warnings,
    };
  }
  if (detectTagOutput(parsed)) {
    warnings.push("missing_crystal_output");
    return {
      payload: { tag_output_json: parsed, crystal_output_json: null, user_preferences: null },
      tag: parsed,
      crystal: null,
      warnings,
    };
  }
  warnings.push("unsupported_input_shape");
  const fallbackTag = {
    statement_type: "unknown",
    statement_period: null,
    account_summary: {},
    transactions: [],
    category_totals: [],
    highlights: { flags: ["missing_data"] },
  };
  return {
    payload: { tag_output_json: fallbackTag, crystal_output_json: null, user_preferences: null },
    tag: fallbackTag,
    crystal: null,
    warnings,
  };
}

function averageConfidence(output: any): number {
  const byDifficulty = (Array.isArray(output?.plan?.steps) ? output.plan.steps : []).map((s: any) => {
    switch (s?.difficulty) {
      case "easy":
        return 0.85;
      case "medium":
        return 0.7;
      case "hard":
        return 0.55;
      default:
        return 0.6;
    }
  });
  if (byDifficulty.length === 0) return 0;
  return byDifficulty.reduce((sum: number, v: number) => sum + v, 0) / byDifficulty.length;
}

function hasDateConfirmationQuestion(output: any): boolean {
  const questions = Array.isArray(output?.questions_for_prime) ? output.questions_for_prime : [];
  return questions.some((q: any) => /\b(date|when|confirm|schedule)\b/i.test(String(q || "")));
}

function containsCommandingReminderLanguage(output: any): boolean {
  const reminders = Array.isArray(output?.suggested_reminders) ? output.suggested_reminders : [];
  return reminders.some((r: any) => {
    const text = `${String(r?.label || "")} ${String(r?.notes || "")}`.toLowerCase();
    return /\b(i set|i scheduled|scheduled|created reminder|set your reminder)\b/.test(text);
  });
}

function containsSuggestionReminderLanguage(output: any): boolean {
  const reminders = Array.isArray(output?.suggested_reminders) ? output.suggested_reminders : [];
  if (reminders.length === 0) return true;
  return reminders.every((r: any) => {
    const text = `${String(r?.label || "")} ${String(r?.notes || "")}`.toLowerCase();
    return /\b(suggest|consider|if you want|you may|optional)\b/.test(text);
  });
}

function runContractChecks(fileName: string, output: any, inputCtx: any, opts: Options): ContractResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const validation = validateFinleyWorkerOutput(output);
  if (!validation.ok) reasons.push(...validation.errors);

  const steps = Array.isArray(output?.plan?.steps) ? output.plan.steps : [];
  const goals = Array.isArray(output?.suggested_goals) ? output.suggested_goals : [];
  const reminders = Array.isArray(output?.suggested_reminders) ? output.suggested_reminders : [];
  const questions = Array.isArray(output?.questions_for_prime) ? output.questions_for_prime : [];

  if (!String(output?.plan?.title || "").trim()) reasons.push("missing_plan_title");
  if (steps.length < 3) reasons.push("too_few_steps");
  if (steps.length > opts.maxSteps) reasons.push("too_many_steps");
  if (steps.length === 0) reasons.push("no_steps");
  for (const step of steps) {
    if (!String(step?.step || "").trim()) reasons.push("step_empty");
    if (!String(step?.reason || "").trim()) reasons.push("step_reason_empty");
    if (!DIFFICULTY_VALUES.has(String(step?.difficulty || ""))) reasons.push("step_difficulty_invalid");
  }

  for (const goal of goals) {
    if (!String(goal?.goal || "").trim()) reasons.push("goal_empty");
    if (!CADENCE_VALUES.has(String(goal?.cadence || ""))) reasons.push("goal_cadence_invalid");
  }
  for (const rem of reminders) {
    if (!String(rem?.label || "").trim()) reasons.push("reminder_label_empty");
    if (!CADENCE_VALUES.has(String(rem?.cadence || ""))) reasons.push("reminder_cadence_invalid");
    if (!(rem?.date_hint === null || /^\d{4}-\d{2}-\d{2}$/.test(String(rem?.date_hint || "")))) {
      reasons.push("reminder_date_hint_invalid");
    }
  }

  const hasNullDateReminder = reminders.some((r: any) => r?.date_hint === null);
  if (hasNullDateReminder && !hasDateConfirmationQuestion(output)) {
    reasons.push("missing_date_confirmation_question");
  }

  const grounding = validateFinleyGrounding(output, {
    tag_output_json: inputCtx?.tag_output_json || {},
    crystal_output_json: inputCtx?.crystal_output_json || {},
    requireNoInventedDates: opts.requireNoInventedDates,
    requireNoInventedAmounts: opts.requireNoInventedAmounts,
  });
  if (!grounding.ok) reasons.push(...grounding.errors);
  warnings.push(...grounding.warnings);

  const dueDatesExist = grounding.warnings.includes("no_allowed_dates_in_inputs") === false;
  if (!dueDatesExist) {
    const anyConcreteDate = reminders.some((r: any) => r?.date_hint && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date_hint)));
    if (anyConcreteDate && opts.requireNoInventedDates) reasons.push("invented_concrete_date_without_input");
  }

  if (containsCommandingReminderLanguage(output)) reasons.push("reminder_commanding_language");
  if (!containsSuggestionReminderLanguage(output)) reasons.push("reminder_not_suggestive");

  const conf = averageConfidence(output);
  const missingDataFlag = grounding.warnings.includes("no_allowed_amounts_in_inputs");
  if (!(conf >= opts.minConfidence || (missingDataFlag && !opts.failOnReview))) {
    reasons.push("confidence_below_threshold");
  }
  if (opts.failOnReview && conf < opts.minConfidence) reasons.push("low_confidence_review_fail");

  const blob = JSON.stringify(output || {});
  if (/\b(OrchCtx|TAG_WORKER_SYSTEM_PROMPT|CRYSTAL_WORKER_SYSTEM_PROMPT|FINLEY_WORKER_SYSTEM_PROMPT|runFinleyWorkerPlan)\b/.test(blob)) {
    reasons.push("internal_system_term_leak");
  }
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(blob)) reasons.push("raw_email_detected");
  if (/\b(?:\d[ -]?){10,}\d\b/.test(blob)) reasons.push("raw_pii_detected");

  if (questions.length === 0) reasons.push("missing_questions_for_prime");

  return {
    file: fileName,
    pass: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
    warnings: Array.from(new Set(warnings)),
  };
}

async function main(): Promise<void> {
  const opts = parseOptions();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let files: string[] = [];
  try {
    files = await walkFiles(opts.dir);
  } catch {
    console.error(`[FINLEY HARNESS] fixtures directory not found: ${opts.dir}`);
    process.exitCode = 1;
    return;
  }

  const candidates = files.filter((f) => /\.json$/i.test(f) && !/[/\\]readme\.md$/i.test(f));
  if (candidates.length === 0) {
    console.log(`[FINLEY HARNESS] No supported files found in ${opts.dir}`);
    if (opts.contract) {
      await fs.writeFile(
        CONTRACT_REPORT_PATH,
        JSON.stringify({ total_files: 0, pass_count: 0, fail_count: 0, options: opts, results: [] }, null, 2),
        "utf8"
      );
      console.log(`[FINLEY HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
    }
    return;
  }

  console.log(
    `${compactPad("FILE", 30)} | ${compactPad("STEPS", 6)} | ${compactPad("GOALS", 6)} | ${compactPad("REMINDERS", 10)} | ${compactPad("QUESTIONS", 9)} | ${compactPad("GROUNDED", 8)} | NEEDS_REVIEW`
  );
  console.log("-".repeat(114));

  const results: ContractResult[] = [];

  for (const filePath of candidates) {
    const fileName = path.basename(filePath);
    let output: any;
    let inputCtx: any;
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const built = buildInputPayload(parsed);
      inputCtx = {
        tag_output_json: built.tag,
        crystal_output_json: built.crystal,
      };
      const rawOut = await runFinleyWorkerPlan(built.payload, null);
      output = normalizeFinleyWorkerOutput(rawOut, null);
      if (built.warnings.length > 0) {
        output.questions_for_prime = Array.isArray(output.questions_for_prime) ? output.questions_for_prime : [];
        output.questions_for_prime.push("Can Prime confirm missing context before applying suggestions?");
      }
    } catch (error: any) {
      output = buildFinleyWorkerFallbackOutput(null, error?.message || "harness_failed");
      inputCtx = { tag_output_json: {}, crystal_output_json: null };
    }

    const steps = Array.isArray(output?.plan?.steps) ? output.plan.steps.length : 0;
    const goals = Array.isArray(output?.suggested_goals) ? output.suggested_goals.length : 0;
    const reminders = Array.isArray(output?.suggested_reminders) ? output.suggested_reminders.length : 0;
    const questions = Array.isArray(output?.questions_for_prime) ? output.questions_for_prime.length : 0;
    const grounding = validateFinleyGrounding(output, {
      tag_output_json: inputCtx?.tag_output_json || {},
      crystal_output_json: inputCtx?.crystal_output_json || {},
      requireNoInventedDates: opts.requireNoInventedDates,
      requireNoInventedAmounts: opts.requireNoInventedAmounts,
    });
    const grounded = grounding.ok;
    const needsReview = grounding.warnings.length > 0 || averageConfidence(output) < opts.minConfidence;

    console.log(
      `${compactPad(fileName, 30)} | ${compactPad(String(steps), 6)} | ${compactPad(String(goals), 6)} | ${compactPad(String(reminders), 10)} | ${compactPad(String(questions), 9)} | ${compactPad(grounded ? "true" : "false", 8)} | ${needsReview ? "true" : "false"}`
    );

    const outPath = path.join(OUTPUT_DIR, `${fileName.replace(/\.[^.]+$/, "")}.finley.json`);
    await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");

    if (opts.contract) {
      const contract = runContractChecks(fileName, output, inputCtx, opts);
      results.push(contract);
    }
  }

  if (opts.contract) {
    const passCount = results.filter((r) => r.pass).length;
    const failCount = results.length - passCount;
    await fs.writeFile(
      CONTRACT_REPORT_PATH,
      JSON.stringify(
        {
          total_files: results.length,
          pass_count: passCount,
          fail_count: failCount,
          options: opts,
          results,
        },
        null,
        2
      ),
      "utf8"
    );
    console.log("-".repeat(114));
    console.log(`[FINLEY HARNESS][CONTRACT] TOTAL=${results.length} PASS=${passCount} FAIL=${failCount}`);
    if (failCount > 0) {
      console.log("[FINLEY HARNESS][CONTRACT] Failed files:");
      for (const fail of results.filter((r) => !r.pass)) {
        console.log(`  - ${fail.file}: ${fail.reasons.join(", ")}`);
      }
      process.exitCode = 1;
    }
    console.log(`[FINLEY HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
  }
}

main().catch((err) => {
  console.error("[FINLEY HARNESS] fatal:", err);
  process.exitCode = 1;
});

