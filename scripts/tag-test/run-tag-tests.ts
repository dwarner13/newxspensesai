import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  runTagWorkerCategorization,
  normalizeTagWorkerOutput,
  buildTagWorkerFallbackOutput,
  validateTagWorkerOutput,
} from "../../netlify/functions/_shared/tagWorker.ts";
import {
  extractPdfTextWithLayout,
  extractPdfTextWithPdfParse,
} from "../../netlify/functions/_lib/pdfText.ts";

type TagOutput = any;
type ContractResult = { file: string; pass: boolean; reasons: string[] };
type Options = {
  dir: string;
  contract: boolean;
  failOnReview: boolean;
  minConfidence?: number;
  requireTransferSeparation: boolean;
};

const DEFAULT_DIR = path.resolve("scripts/tag-test/fixtures");
const OUTPUT_DIR = path.resolve("scripts/tag-test/output");
const CONTRACT_REPORT_PATH = path.join(OUTPUT_DIR, "contract-report.json");
const ALLOWED_CATEGORIES = new Set([
  "Income",
  "Transfer",
  "Bank Fee",
  "Credit Card Payment",
  "Subscription",
  "Software/AI",
  "Fitness/Health",
  "Retail",
  "Groceries",
  "Dining",
  "Cash Withdrawal",
  "Insurance",
  "Utilities",
  "Other",
]);

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const getValue = (flag: string): string | undefined => {
    const idx = args.findIndex((a) => a === flag);
    if (idx < 0) return undefined;
    return args[idx + 1];
  };
  const has = (flag: string): boolean => args.includes(flag);

  const dir = path.resolve(getValue("--dir") || DEFAULT_DIR);
  const minConfidenceRaw = getValue("--min-confidence");
  const parsedMin = typeof minConfidenceRaw === "string" ? Number(minConfidenceRaw) : undefined;

  let requireTransferSeparation = true;
  if (has("--no-require-transfer-separation")) requireTransferSeparation = false;
  const explicitRequire = getValue("--require-transfer-separation");
  if (explicitRequire === "false") requireTransferSeparation = false;
  if (explicitRequire === "true") requireTransferSeparation = true;

  return {
    dir,
    contract: has("--contract"),
    failOnReview: has("--fail-on-review"),
    minConfidence: Number.isFinite(parsedMin) ? parsedMin : undefined,
    requireTransferSeparation,
  };
}

function inferMinConfidence(filePath: string, opts: Options): number {
  if (typeof opts.minConfidence === "number") return opts.minConfidence;
  return /[/\\]scanned[/\\]/i.test(filePath) ? 0.5 : 0.7;
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    try {
      return await extractPdfTextWithLayout(buf as Buffer);
    } catch {
      return await extractPdfTextWithPdfParse(buf as Buffer);
    }
  }
  if (ext === ".txt" || ext === ".md" || ext === ".json") {
    return await fs.readFile(filePath, "utf8");
  }
  return "";
}

function buildTagInputFromByteOutput(byteOutput: any): any {
  const statementTypeMap: Record<string, string> = {
    bank_statement: "bank_statement",
    credit_card_statement: "credit_card_statement",
    receipt: "receipt",
    invoice: "invoice",
    unknown: "unknown",
  };
  const statementType = statementTypeMap[String(byteOutput?.doc_type || "unknown")] || "unknown";
  const txns = Array.isArray(byteOutput?.transactions) ? byteOutput.transactions : [];
  return {
    statement_type: statementType,
    statement_period: byteOutput?.statement_period ?? null,
    account_summary: byteOutput?.account_summary || {},
    transactions: txns.map((t: any) => ({
      date: t?.date ?? t?.posting_date ?? null,
      description_raw: String(t?.description_raw || t?.description || ""),
      merchant_normalized: t?.merchant_normalized ?? null,
      amount: typeof t?.amount === "number" ? t.amount : Number(t?.amount ?? NaN),
      direction: t?.direction === "debit" || t?.direction === "credit" ? t.direction : null,
    })),
    pages_detected: Array.isArray(byteOutput?.pages_detected) ? byteOutput.pages_detected : [],
  };
}

function detectByteOutput(obj: any): boolean {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      Object.prototype.hasOwnProperty.call(obj, "doc_type") &&
      Object.prototype.hasOwnProperty.call(obj, "transactions")
  );
}

function compactPad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width - 1) + "…" : value.padEnd(width, " ");
}

function confidenceAvg(output: TagOutput): number {
  const txns = Array.isArray(output?.transactions) ? output.transactions : [];
  const vals = txns.map((t: any) => Number(t?.confidence)).filter((v: number) => Number.isFinite(v));
  if (vals.length === 0) return 0;
  return vals.reduce((s: number, v: number) => s + v, 0) / vals.length;
}

function applyTransferAndCashContractChecks(output: TagOutput, opts: Options): string[] {
  const reasons: string[] = [];
  const txns = Array.isArray(output?.transactions) ? output.transactions : [];
  for (const t of txns) {
    const desc = String(t?.description_raw || "");
    const category = String(t?.category || "");
    const isSpend = Boolean(t?.is_spend);
    const needsReview = Boolean(t?.needs_review);
    const reason = String(t?.reason || "");

    if (opts.requireTransferSeparation && /\b(e-?transfer|transfer|payment|online banking|bill payment|cc payment)\b/i.test(desc)) {
      const allowed = category === "Transfer" || category === "Credit Card Payment";
      if (!allowed || isSpend !== false) {
        reasons.push(`transfer_separation_violation:${desc.slice(0, 32)}`);
      }
    }
    if (/\b(atm|withdrawal)\b/i.test(desc)) {
      const validCash = category === "Cash Withdrawal" && isSpend === false;
      const allowedAmbiguous = needsReview && /ambiguous/i.test(reason);
      if (!validCash && !allowedAmbiguous) {
        reasons.push(`cash_withdrawal_rule_violation:${desc.slice(0, 32)}`);
      }
    }
  }
  return reasons;
}

function runContractChecks(fileName: string, output: TagOutput, inputTxCount: number, opts: Options, minConfidence: number): ContractResult {
  const reasons: string[] = [];
  const requiredTop = ["statement_type", "statement_period", "transactions", "category_totals", "highlights", "prime_ready_summary"];
  for (const key of requiredTop) {
    if (!Object.prototype.hasOwnProperty.call(output || {}, key)) reasons.push(`missing_key:${key}`);
  }

  const validation = validateTagWorkerOutput(output);
  if (!validation.ok) reasons.push(...validation.errors);

  const txns = Array.isArray(output?.transactions) ? output.transactions : [];
  const flags = Array.isArray(output?.highlights?.flags) ? output.highlights.flags.map((v: any) => String(v)) : [];
  const needsReview = txns.some((t: any) => Boolean(t?.needs_review)) || flags.includes("needs_review");

  if (txns.length === 0 && inputTxCount > 0) {
    if (!(needsReview && flags.includes("missing_data"))) {
      reasons.push("empty_output_with_nonempty_input");
    }
  }

  for (const tx of txns) {
    const amount = tx?.amount;
    const amountOk = typeof amount === "number" || (amount === null && Boolean(tx?.needs_review));
    if (!amountOk) reasons.push("invalid_amount_field");
    if (!ALLOWED_CATEGORIES.has(String(tx?.category || ""))) reasons.push("invalid_category");
    if (typeof tx?.is_spend !== "boolean") reasons.push("is_spend_not_boolean");
    const conf = Number(tx?.confidence);
    if (!(Number.isFinite(conf) && conf >= 0 && conf <= 1)) reasons.push("confidence_out_of_range");
  }

  reasons.push(...applyTransferAndCashContractChecks(output, opts));

  const avgConfidence = confidenceAvg(output);
  if (!(avgConfidence >= minConfidence || needsReview)) {
    reasons.push("confidence_below_threshold");
  }

  const withdrawals = Number(output?.account_summary?.total_withdrawals);
  if (Number.isFinite(withdrawals) && withdrawals >= 0) {
    const spendDebits = txns
      .filter((t: any) => t?.is_spend === true && t?.direction === "debit" && typeof t?.amount === "number")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const margin = Math.max(20, Math.abs(withdrawals) * 0.15);
    if (spendDebits > withdrawals + margin && opts.failOnReview && !needsReview) {
      reasons.push("totals_sanity_margin_exceeded");
    }
  }

  const oneParagraph = String(output?.prime_ready_summary?.one_paragraph || "").trim();
  const actions = Array.isArray(output?.prime_ready_summary?.next_actions) ? output.prime_ready_summary.next_actions : [];
  if (!oneParagraph) reasons.push("missing_prime_paragraph");
  if (actions.length < 3 || actions.length > 6) reasons.push("next_actions_range_invalid");

  if (opts.failOnReview && needsReview) reasons.push("needs_review");

  return {
    file: fileName,
    pass: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
  };
}

function toTagInputFromJson(parsed: any): { input: any; inputTxCount: number } {
  if (detectByteOutput(parsed)) {
    const fromByte = buildTagInputFromByteOutput(parsed);
    return { input: fromByte, inputTxCount: Array.isArray(fromByte.transactions) ? fromByte.transactions.length : 0 };
  }
  if (parsed && typeof parsed === "object") {
    const txCount = Array.isArray(parsed.transactions) ? parsed.transactions.length : 0;
    return { input: parsed, inputTxCount: txCount };
  }
  return { input: { statement_type: "unknown", transactions: [] }, inputTxCount: 0 };
}

async function main(): Promise<void> {
  const opts = parseOptions();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let files: string[] = [];
  try {
    files = await walkFiles(opts.dir);
  } catch {
    console.error(`[TAG HARNESS] fixtures directory not found: ${opts.dir}`);
    process.exitCode = 1;
    return;
  }

  const candidates = files.filter((f) => /\.(json|txt|md|pdf)$/i.test(f) && !/[/\\]readme\.md$/i.test(f));
  if (candidates.length === 0) {
    console.log(`[TAG HARNESS] No supported files found in ${opts.dir}`);
    if (opts.contract) {
      await fs.writeFile(CONTRACT_REPORT_PATH, JSON.stringify({ total_files: 0, pass_count: 0, fail_count: 0, options: opts, results: [] }, null, 2), "utf8");
      console.log(`[TAG HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
    }
    return;
  }

  console.log(
    `${compactPad("FILE", 28)} | ${compactPad("STMT_TYPE", 18)} | ${compactPad("TX_COUNT", 8)} | ${compactPad("SPEND", 8)} | ${compactPad("CONF(avg)", 10)} | ${compactPad("FLAGS", 28)} | NEEDS_REVIEW`
  );
  console.log("-".repeat(132));

  const results: ContractResult[] = [];

  for (const filePath of candidates) {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let tagInput: any = { statement_type: "unknown", transactions: [] };
    let inputTxCount = 0;
    let output: TagOutput;

    try {
      if (ext === ".json") {
        const rawText = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(rawText);
        const built = toTagInputFromJson(parsed);
        tagInput = built.input;
        inputTxCount = built.inputTxCount;
      } else if (ext === ".txt" || ext === ".md") {
        const rawText = await fs.readFile(filePath, "utf8");
        tagInput = rawText;
        inputTxCount = 0;
      } else if (ext === ".pdf") {
        const txt = await extractText(filePath);
        tagInput = txt;
        inputTxCount = 0;
      }

      const rawOutput = await runTagWorkerCategorization(tagInput, null);
      output = normalizeTagWorkerOutput(rawOutput, null);
    } catch (error: any) {
      output = buildTagWorkerFallbackOutput(null, error?.message || "harness_failed");
    }

    const txns = Array.isArray(output?.transactions) ? output.transactions : [];
    const txCount = txns.length;
    const spendCount = txns.filter((t: any) => t?.is_spend === true).length;
    const confAvg = confidenceAvg(output);
    const flags = Array.isArray(output?.highlights?.flags) ? output.highlights.flags.map((f: any) => String(f)).join(",") : "";
    const needsReview = txns.some((t: any) => Boolean(t?.needs_review)) || String(flags).includes("needs_review");

    console.log(
      `${compactPad(fileName, 28)} | ${compactPad(String(output?.statement_type || "unknown"), 18)} | ${compactPad(String(txCount), 8)} | ${compactPad(String(spendCount), 8)} | ${compactPad(confAvg.toFixed(2), 10)} | ${compactPad(flags || "-", 28)} | ${needsReview ? "true" : "false"}`
    );

    const outPath = path.join(OUTPUT_DIR, `${fileName.replace(/\.[^.]+$/, "")}.tag.json`);
    await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");

    if (opts.contract) {
      const minConf = inferMinConfidence(filePath, opts);
      const contract = runContractChecks(fileName, output, inputTxCount, opts, minConf);
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
    console.log("-".repeat(132));
    console.log(`[TAG HARNESS][CONTRACT] TOTAL=${results.length} PASS=${passCount} FAIL=${failCount}`);
    if (failCount > 0) {
      console.log("[TAG HARNESS][CONTRACT] Failed files:");
      for (const fail of results.filter((r) => !r.pass)) {
        console.log(`  - ${fail.file}: ${fail.reasons.join(", ")}`);
      }
      process.exitCode = 1;
    }
    console.log(`[TAG HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
  }
}

main().catch((error) => {
  console.error("[TAG HARNESS] fatal:", error);
  process.exitCode = 1;
});

