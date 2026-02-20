import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

import {
  runByteWorkerExtraction,
  normalizeByteWorkerOutput,
  buildByteWorkerFallbackOutput,
} from "../../netlify/functions/_shared/byteWorker.ts";
import {
  extractPdfTextWithLayout,
  extractPdfTextWithPdfParse,
} from "../../netlify/functions/_lib/pdfText.ts";

type ByteOutput = any;
type HarnessOptions = {
  docsDir: string;
  contract: boolean;
  failOnReview: boolean;
  minConfidence?: number;
  maxTotalsMismatchAbs: number;
};

type ContractResult = {
  file: string;
  pass: boolean;
  reasons: string[];
};

const DEFAULT_DOCS_DIR = path.resolve("scripts/byte-test/docs");
const OUTPUT_DIR = path.resolve("scripts/byte-test/output");
const CONTRACT_REPORT_PATH = path.resolve("scripts/byte-test/output/contract-report.json");

function parseOptionsFromArgs(): HarnessOptions {
  const args = process.argv.slice(2);
  const getFlagValue = (flag: string): string | undefined => {
    const idx = args.findIndex((arg) => arg === flag);
    if (idx < 0) return undefined;
    return args[idx + 1];
  };
  const hasFlag = (flag: string): boolean => args.includes(flag);

  const explicitDir = getFlagValue("--dir");
  const firstPositional = args.find((arg) => !arg.startsWith("--"));
  const docsDir = path.resolve(explicitDir || firstPositional || DEFAULT_DOCS_DIR);
  const minConfidenceRaw = getFlagValue("--min-confidence");
  const maxMismatchRaw = getFlagValue("--max-totals-mismatch");

  const parsedMin = typeof minConfidenceRaw === "string" ? Number(minConfidenceRaw) : undefined;
  const parsedMaxMismatch = typeof maxMismatchRaw === "string" ? Number(maxMismatchRaw) : NaN;

  return {
    docsDir,
    contract: hasFlag("--contract"),
    failOnReview: hasFlag("--fail-on-review"),
    minConfidence: Number.isFinite(parsedMin) ? parsedMin : undefined,
    maxTotalsMismatchAbs: Number.isFinite(parsedMaxMismatch) ? parsedMaxMismatch : 5,
  };
}

function inferMinConfidenceForFile(filePath: string, opts: HarnessOptions): number {
  if (typeof opts.minConfidence === "number") return opts.minConfidence;
  return /[/\\]scanned[/\\]/i.test(filePath) ? 0.3 : 0.6;
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        out.push(full);
      }
    }
  }
  await walk(rootDir);
  return out;
}

async function extractDocumentText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buf = await fs.readFile(filePath);
    try {
      return await extractPdfTextWithLayout(buf as Buffer);
    } catch {
      return await extractPdfTextWithPdfParse(buf as Buffer);
    }
  }
  if (ext === ".txt" || ext === ".md" || ext === ".json" || ext === ".csv") {
    return await fs.readFile(filePath, "utf8");
  }
  return "";
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function addWarningOnce(output: ByteOutput, code: string): void {
  if (!output?.extraction_quality) return;
  if (!Array.isArray(output.extraction_quality.warnings)) {
    output.extraction_quality.warnings = [];
  }
  if (!output.extraction_quality.warnings.includes(code)) {
    output.extraction_quality.warnings.push(code);
  }
}

function applyTotalsValidation(output: ByteOutput, maxTotalsMismatchAbs: number): { totalsMismatch: boolean } {
  const txns = Array.isArray(output?.transactions) ? output.transactions : [];
  const credits = txns
    .filter((t: any) => t?.direction === "credit" && typeof t?.amount === "number")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
  const debits = txns
    .filter((t: any) => t?.direction === "debit" && typeof t?.amount === "number")
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

  const totalDeposits = typeof output?.account_summary?.total_deposits === "number"
    ? output.account_summary.total_deposits
    : null;
  const totalWithdrawals = typeof output?.account_summary?.total_withdrawals === "number"
    ? output.account_summary.total_withdrawals
    : null;

  const mismatch = (declared: number | null, computed: number): boolean => {
    if (declared === null) return false;
    const diff = Math.abs(declared - computed);
    const threshold = Math.max(maxTotalsMismatchAbs, Math.abs(declared) * 0.01);
    return diff > threshold;
  };

  const totalsMismatch = mismatch(totalDeposits, credits) || mismatch(totalWithdrawals, debits);
  if (totalsMismatch) {
    addWarningOnce(output, "totals_mismatch");
    output.extraction_quality.needs_review = true;
  }
  return { totalsMismatch };
}

function maskSensitiveStrings(value: any): any {
  if (value === null || typeof value === "undefined") return value;
  if (Array.isArray(value)) return value.map(maskSensitiveStrings);
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = maskSensitiveStrings(v);
    return out;
  }
  if (typeof value === "string") {
    return value
      .replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4,7})\b/g, "****-****-****-$4")
      .replace(/\b\d{8,19}\b/g, "[redacted-id]");
  }
  return value;
}

function summarizePageKinds(output: ByteOutput): string {
  const kinds = Array.isArray(output?.pages_detected)
    ? output.pages_detected.map((p: any) => p?.page_kind).filter(Boolean)
    : [];
  return Array.from(new Set(kinds)).join(",") || "unknown";
}

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width - 1) + "…" : value.padEnd(width, " ");
}

function hasSchemaKeys(output: ByteOutput): boolean {
  if (!output || typeof output !== "object") return false;
  const required = ["doc_type", "pages_detected", "account_summary", "transactions", "extraction_quality"];
  return required.every((key) => Object.prototype.hasOwnProperty.call(output, key));
}

function runContractChecks(params: {
  fileName: string;
  output: ByteOutput;
  minConfidence: number;
  totalsMismatch: boolean;
  failOnReview: boolean;
}): ContractResult {
  const { fileName, output, minConfidence, totalsMismatch, failOnReview } = params;
  const reasons: string[] = [];
  const warnings = Array.isArray(output?.extraction_quality?.warnings) ? output.extraction_quality.warnings : [];
  const needsReview = Boolean(output?.extraction_quality?.needs_review);
  const confidence = Number(output?.extraction_quality?.confidence ?? 0);
  const txCount = Array.isArray(output?.transactions) ? output.transactions.length : 0;
  const hasStatementPeriod = Boolean(output?.statement_period);

  if (!hasSchemaKeys(output)) reasons.push("missing_required_schema_keys");
  if (String(output?.doc_type || "unknown") === "unknown" && confidence >= 0.4) {
    reasons.push("doc_type_unknown_with_high_confidence");
  }
  if (!Array.isArray(output?.pages_detected) || output.pages_detected.length < 1) {
    reasons.push("pages_detected_missing");
  }
  if (txCount === 0 && hasStatementPeriod) {
    const hasNoTxnWarning = warnings.includes("no_transactions_extracted");
    if (!(needsReview && hasNoTxnWarning)) {
      reasons.push("statement_with_zero_transactions_without_review_warning");
    }
  }
  const confidenceAccepted = confidence >= minConfidence;
  const explainableReview = needsReview && warnings.length > 0;
  if (!confidenceAccepted && !explainableReview) {
    reasons.push("confidence_below_threshold_without_review_context");
  }
  if (warnings.includes("multiple_accounts_detected") && !needsReview) {
    reasons.push("multiple_accounts_detected_without_needs_review");
  }
  if (totalsMismatch && failOnReview) {
    reasons.push("totals_mismatch");
  }

  return {
    file: fileName,
    pass: reasons.length === 0,
    reasons,
  };
}

async function main(): Promise<void> {
  const options = parseOptionsFromArgs();
  const docsDir = options.docsDir;
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let files: string[] = [];
  try {
    files = await walkFiles(docsDir);
  } catch {
    console.error(`[BYTE HARNESS] docs directory not found: ${docsDir}`);
    console.error("[BYTE HARNESS] Create it and add PDFs/txt files.");
    process.exitCode = 1;
    return;
  }

  const candidates = files.filter((f) => /\.(pdf|txt|md|json|csv)$/i.test(f) && !/[/\\]readme\.md$/i.test(f));
  if (candidates.length === 0) {
    console.log(`[BYTE HARNESS] No supported files found in ${docsDir}`);
    if (options.contract) {
      const emptyReport = {
        total_files: 0,
        pass_count: 0,
        fail_count: 0,
        options,
        results: [],
      };
      await fs.writeFile(CONTRACT_REPORT_PATH, JSON.stringify(emptyReport, null, 2), "utf8");
      console.log("[BYTE HARNESS][CONTRACT] TOTAL=0 PASS=0 FAIL=0");
      console.log(`[BYTE HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
    }
    return;
  }

  console.log(
    `${pad("FILE", 30)} | ${pad("DOC_TYPE", 22)} | ${pad("TX_COUNT", 8)} | ${pad("CONF", 6)} | ${pad("WARNINGS", 30)} | NEEDS_REVIEW`
  );
  console.log("-".repeat(122));

  const timings: number[] = [];
  const contractResults: ContractResult[] = [];

  for (const filePath of candidates) {
    const fileName = path.basename(filePath);
    const startedAt = performance.now();
    let output: ByteOutput;
    let totalsMismatch = false;
    try {
      const documentText = await extractDocumentText(filePath);
      const raw = await runByteWorkerExtraction({
        documentText,
        filename: fileName,
        docId: null,
        ctx: null,
      });
      output = normalizeByteWorkerOutput(raw, null, 1);
    } catch (error: any) {
      output = buildByteWorkerFallbackOutput(null, error?.message || "harness_failed", 1);
    }

    output = maskSensitiveStrings(output);
    if (!output.extraction_quality) {
      output.extraction_quality = {
        confidence: 0,
        missing_fields: ["extraction_quality"],
        warnings: ["missing_extraction_quality"],
        needs_review: true,
      };
    }
    output.extraction_quality.confidence = clamp01(Number(output.extraction_quality.confidence || 0));

    if (Boolean(output?.statement_period) && (!Array.isArray(output.transactions) || output.transactions.length === 0)) {
      addWarningOnce(output, "no_transactions_extracted");
      output.extraction_quality.needs_review = true;
    }

    const totalsValidation = applyTotalsValidation(output, options.maxTotalsMismatchAbs);
    totalsMismatch = totalsValidation.totalsMismatch;

    const elapsed = performance.now() - startedAt;
    timings.push(elapsed);

    const txCount = Array.isArray(output.transactions) ? output.transactions.length : 0;
    const warnings = Array.isArray(output.extraction_quality.warnings)
      ? output.extraction_quality.warnings.join(",")
      : "";
    console.log(
      `${pad(fileName, 30)} | ${pad(String(output.doc_type || "unknown"), 22)} | ${pad(String(txCount), 8)} | ${pad(output.extraction_quality.confidence.toFixed(2), 6)} | ${pad(warnings || "-", 30)} | ${output.extraction_quality.needs_review ? "true" : "false"}`
    );

    const openBal = output?.account_summary?.opening_balance;
    const closeBal = output?.account_summary?.closing_balance;
    const dep = output?.account_summary?.total_deposits;
    const wit = output?.account_summary?.total_withdrawals;
    console.log(`  balances: open=${openBal ?? "null"} close=${closeBal ?? "null"} deposits=${dep ?? "null"} withdrawals=${wit ?? "null"}`);
    console.log(`  totals_mismatch=${totalsMismatch ? "true" : "false"} page_kinds=${summarizePageKinds(output)} time_ms=${elapsed.toFixed(1)}`);

    const outputPath = path.join(OUTPUT_DIR, `${fileName.replace(/\.[^.]+$/, "")}.json`);
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

    if (options.contract) {
      const minConfidence = inferMinConfidenceForFile(filePath, options);
      const result = runContractChecks({
        fileName,
        output,
        minConfidence,
        totalsMismatch,
        failOnReview: options.failOnReview,
      });
      contractResults.push(result);
    }
  }

  const avgMs = timings.length > 0
    ? timings.reduce((sum, t) => sum + t, 0) / timings.length
    : 0;
  console.log("-".repeat(122));
  console.log(`[BYTE HARNESS] Processed ${timings.length} file(s). Average extraction time: ${avgMs.toFixed(1)} ms`);
  console.log(`[BYTE HARNESS] Full outputs saved to: ${OUTPUT_DIR}`);

  if (options.contract) {
    const passCount = contractResults.filter((r) => r.pass).length;
    const failCount = contractResults.length - passCount;
    const report = {
      total_files: contractResults.length,
      pass_count: passCount,
      fail_count: failCount,
      options,
      results: contractResults,
    };
    await fs.writeFile(CONTRACT_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
    console.log(`[BYTE HARNESS][CONTRACT] TOTAL=${contractResults.length} PASS=${passCount} FAIL=${failCount}`);
    if (failCount > 0) {
      console.log("[BYTE HARNESS][CONTRACT] Failed files:");
      for (const failure of contractResults.filter((r) => !r.pass)) {
        console.log(`  - ${failure.file}: ${failure.reasons.join(", ")}`);
      }
    }
    console.log(`[BYTE HARNESS][CONTRACT] Report: ${CONTRACT_REPORT_PATH}`);
    if (failCount > 0) {
      process.exitCode = 1;
    }
  }
}

main().catch((error) => {
  console.error("[BYTE HARNESS] fatal:", error);
  process.exitCode = 1;
});

