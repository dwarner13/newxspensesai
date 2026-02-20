import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildCrystalWorkerFallbackOutput,
  normalizeCrystalWorkerOutput,
  runCrystalWorkerInsights,
  validateCrystalGrounding,
  validateCrystalWorkerOutput,
} from "../../netlify/functions/_shared/crystalWorker.ts";

type Options = {
  dir: string;
  contract: boolean;
  failOnReview: boolean;
  minConfidence?: number;
  maxInsights: number;
  requireGrounding: boolean;
};

type ContractResult = {
  file: string;
  pass: boolean;
  reasons: string[];
  warnings: string[];
};

const DEFAULT_DIR = path.resolve("scripts/crystal-test/fixtures");
const OUTPUT_DIR = path.resolve("scripts/crystal-test/output");
const CONTRACT_REPORT_PATH = path.join(OUTPUT_DIR, "contract-report.json");

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

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const has = (flag: string): boolean => args.includes(flag);
  const getValue = (flag: string): string | undefined => {
    const idx = args.findIndex((v) => v === flag);
    if (idx < 0) return undefined;
    return args[idx + 1];
  };

  const dir = path.resolve(getValue("--dir") || DEFAULT_DIR);
  const minRaw = getValue("--min-confidence");
  const minParsed = typeof minRaw === "string" ? Number(minRaw) : undefined;
  const maxInsightsRaw = Number(getValue("--max-insights") || 10);

  let requireGrounding = true;
  if (has("--no-require-grounding")) requireGrounding = false;
  if (has("--require-grounding")) requireGrounding = true;

  return {
    dir,
    contract: has("--contract"),
    failOnReview: has("--fail-on-review"),
    minConfidence: Number.isFinite(minParsed) ? minParsed : undefined,
    maxInsights: Number.isFinite(maxInsightsRaw) && maxInsightsRaw > 0 ? Math.floor(maxInsightsRaw) : 10,
    requireGrounding,
  };
}

function inferMinConfidence(filePath: string, opts: Options): number {
  if (typeof opts.minConfidence === "number") return opts.minConfidence;
  return /[/\\]scanned[/\\]/i.test(filePath) ? 0.5 : 0.7;
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
  return value.length >= width ? value.slice(0, width - 1) + "…" : value.padEnd(width, " ");
}

function avgInsightConfidence(output: any): number {
  const vals = (Array.isArray(output?.insights) ? output.insights : [])
    .map((i: any) => Number(i?.confidence))
    .filter((v: number) => Number.isFinite(v));
  if (vals.length === 0) return 0;
  return vals.reduce((s: number, v: number) => s + v, 0) / vals.length;
}

function detectTagOutput(obj: any): boolean {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      Array.isArray(obj.insights) === false &&
      Array.isArray(obj.transactions) &&
      Array.isArray(obj.category_totals) &&
      Object.prototype.hasOwnProperty.call(obj, "statement_type")
  );
}

function detectByteOutput(obj: any): boolean {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      Object.prototype.hasOwnProperty.call(obj, "doc_type") &&
      Array.isArray(obj.transactions)
  );
}

function buildCrystalInput(parsed: any): { payload: any; tagOutput: any | null; warnings: string[] } {
  const warnings: string[] = [];

  if (detectTagOutput(parsed)) {
    return { payload: { tag_output_json: parsed }, tagOutput: parsed, warnings };
  }

  if (parsed && typeof parsed === "object") {
    const maybeBundle = parsed as any;
    if (maybeBundle.tag_output || maybeBundle.tag_output_json) {
      const tag = maybeBundle.tag_output || maybeBundle.tag_output_json;
      return {
        payload: {
          tag_output_json: tag,
          byte_account_summary: maybeBundle.byte_output?.account_summary || maybeBundle.byte_account_summary || null,
          prior_period_snapshot: maybeBundle.prior_snapshot || maybeBundle.prior_period_snapshot || null,
        },
        tagOutput: tag,
        warnings,
      };
    }
    if (detectByteOutput(parsed)) {
      warnings.push("byte_input_without_tag_not_supported");
      return {
        payload: {
          tag_output_json: {
            statement_type: "unknown",
            statement_period: null,
            account_summary: {},
            transactions: [],
            category_totals: [],
            highlights: { flags: ["missing_data"] },
          },
        },
        tagOutput: null,
        warnings,
      };
    }
  }

  warnings.push("unsupported_input_shape");
  return {
    payload: {
      tag_output_json: {
        statement_type: "unknown",
        statement_period: null,
        account_summary: {},
        transactions: [],
        category_totals: [],
        highlights: { flags: ["missing_data"] },
      },
    },
    tagOutput: null,
    warnings,
  };
}

function runContractChecks(fileName: string, output: any, tagOutput: any | null, opts: Options, minConfidence: number): ContractResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const validation = validateCrystalWorkerOutput(output);
  if (!validation.ok) reasons.push(...validation.errors);

  const insights = Array.isArray(output?.insights) ? output.insights : [];
  const flags = Array.isArray(output?.flags) ? output.flags : [];
  const hasMissingDataFlag = flags.some((f: any) => String(f?.type || "").toLowerCase().includes("missing_data"));

  if (insights.length < 3) reasons.push("too_few_insights");
  if (insights.length > opts.maxInsights) reasons.push("too_many_insights");
  if (insights.length === 0) reasons.push("no_insights");

  for (const insight of insights) {
    if (!INSIGHT_TYPES.has(String(insight?.type || ""))) reasons.push("invalid_insight_type");
    if (!String(insight?.title || "").trim()) reasons.push("missing_insight_title");
    if (!String(insight?.detail || "").trim()) reasons.push("missing_insight_detail");
    const c = Number(insight?.confidence);
    if (!(Number.isFinite(c) && c >= 0 && c <= 1)) reasons.push("invalid_insight_confidence");
  }

  const actions = Array.isArray(output?.recommended_next_actions) ? output.recommended_next_actions : [];
  if (actions.length < 3 || actions.length > 6) reasons.push("missing_actions");
  for (const a of actions) {
    if (!String(a?.action || "").trim() || !String(a?.why || "").trim()) {
      reasons.push("malformed_action");
    }
  }

  const grounding = validateCrystalGrounding(output, { tag_output_json: tagOutput || {} });
  if (!grounding.ok) {
    if (opts.requireGrounding) reasons.push(...grounding.errors);
    else warnings.push(...grounding.errors);
  }
  warnings.push(...grounding.warnings);

  const txAmounts = new Set(
    (Array.isArray(tagOutput?.transactions) ? tagOutput.transactions : [])
      .map((t: any) => Number(Math.abs(Number(t?.amount || NaN)).toFixed(2)))
      .filter((n: number) => Number.isFinite(n))
  );
  const largestSpendAmount = Number(Math.abs(Number(output?.highlights?.largest_spend?.amount || NaN)).toFixed(2));
  const largestIncomeAmount = Number(Math.abs(Number(output?.highlights?.largest_income?.amount || NaN)).toFixed(2));
  if (Number.isFinite(largestSpendAmount) && !txAmounts.has(largestSpendAmount)) {
    reasons.push("largest_spend_not_grounded");
  }
  if (Number.isFinite(largestIncomeAmount) && !txAmounts.has(largestIncomeAmount)) {
    reasons.push("largest_income_not_grounded");
  }

  const avgConf = avgInsightConfidence(output);
  if (!(avgConf >= minConfidence || hasMissingDataFlag)) {
    reasons.push("confidence_below_threshold");
  }
  if (opts.failOnReview && avgConf < minConfidence) {
    reasons.push("low_confidence_review_fail");
  }

  const outputBlob = JSON.stringify(output || {});
  if (/\b(TAG_WORKER_SYSTEM_PROMPT|OrchCtx|routePrime|buildSafeFallbackResponse)\b/.test(outputBlob)) {
    reasons.push("internal_name_leak");
  }
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(outputBlob)) {
    reasons.push("raw_email_detected");
  }
  if (/\b(?:\d[ -]?){10,}\d\b/.test(outputBlob)) {
    reasons.push("raw_pii_identifier_detected");
  }

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
    console.error(`[CRYSTAL HARNESS] fixtures directory not found: ${opts.dir}`);
    process.exitCode = 1;
    return;
  }

  const candidates = files.filter((f) => /\.json$/i.test(f) && !/[/\\]readme\.md$/i.test(f));
  if (candidates.length === 0) {
    console.log(`[CRYSTAL HARNESS] No supported files found in ${opts.dir}`);
    if (opts.contract) {
      await fs.writeFile(
        CONTRACT_REPORT_PATH,
        JSON.stringify({ total_files: 0, pass_count: 0, fail_count: 0, options: opts, results: [] }, null, 2),
        "utf8"
      );
      console.log(`[CRYSTAL HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
    }
    return;
  }

  console.log(
    `${compactPad("FILE", 30)} | ${compactPad("INSIGHTS", 9)} | ${compactPad("FLAGS", 6)} | ${compactPad("CONF(avg)", 10)} | ${compactPad("GROUNDED", 8)} | NEEDS_REVIEW`
  );
  console.log("-".repeat(92));

  const results: ContractResult[] = [];

  for (const filePath of candidates) {
    const fileName = path.basename(filePath);
    let output: any;
    let tagOutput: any | null = null;
    let localWarnings: string[] = [];

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw);
      const built = buildCrystalInput(parsed);
      tagOutput = built.tagOutput;
      localWarnings = built.warnings;
      const rawOut = await runCrystalWorkerInsights(built.payload, null);
      output = normalizeCrystalWorkerOutput(rawOut, null);
      if (localWarnings.length > 0) {
        output.flags = Array.isArray(output.flags) ? output.flags : [];
        for (const w of localWarnings) output.flags.push({ type: "missing_data", notes: w });
      }
    } catch (error: any) {
      output = buildCrystalWorkerFallbackOutput(null, error?.message || "harness_failed");
    }

    const insightsCount = Array.isArray(output?.insights) ? output.insights.length : 0;
    const flagsCount = Array.isArray(output?.flags) ? output.flags.length : 0;
    const confAvg = avgInsightConfidence(output);
    const grounding = validateCrystalGrounding(output, { tag_output_json: tagOutput || {} });
    const grounded = grounding.ok;
    const needsReview =
      flagsCount > 0 &&
      (output.flags || []).some((f: any) =>
        /\b(missing_data|needs_review|low_confidence|fallback|unsupported_input)\b/i.test(
          `${String(f?.type || "")} ${String(f?.notes || "")}`
        )
      );

    console.log(
      `${compactPad(fileName, 30)} | ${compactPad(String(insightsCount), 9)} | ${compactPad(String(flagsCount), 6)} | ${compactPad(confAvg.toFixed(2), 10)} | ${compactPad(grounded ? "true" : "false", 8)} | ${needsReview ? "true" : "false"}`
    );

    const outPath = path.join(OUTPUT_DIR, `${fileName.replace(/\.[^.]+$/, "")}.crystal.json`);
    await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");

    if (opts.contract) {
      const contract = runContractChecks(fileName, output, tagOutput, opts, inferMinConfidence(filePath, opts));
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
    console.log("-".repeat(92));
    console.log(`[CRYSTAL HARNESS][CONTRACT] TOTAL=${results.length} PASS=${passCount} FAIL=${failCount}`);
    if (failCount > 0) {
      console.log("[CRYSTAL HARNESS][CONTRACT] Failed files:");
      for (const fail of results.filter((r) => !r.pass)) {
        console.log(`  - ${fail.file}: ${fail.reasons.join(", ")}`);
      }
      process.exitCode = 1;
    }
    console.log(`[CRYSTAL HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
  }
}

main().catch((error) => {
  console.error("[CRYSTAL HARNESS] fatal:", error);
  process.exitCode = 1;
});

