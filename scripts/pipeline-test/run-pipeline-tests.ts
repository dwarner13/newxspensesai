import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  buildByteWorkerFallbackOutput,
  normalizeByteWorkerOutput,
  runByteWorkerExtraction,
} from "../../netlify/functions/_shared/byteWorker.ts";
import {
  buildTagWorkerFallbackOutput,
  normalizeTagWorkerOutput,
  runTagWorkerCategorization,
} from "../../netlify/functions/_shared/tagWorker.ts";
import {
  buildCrystalWorkerFallbackOutput,
  normalizeCrystalWorkerOutput,
  runCrystalWorkerInsights,
} from "../../netlify/functions/_shared/crystalWorker.ts";
import {
  buildFinleyWorkerFallbackOutput,
  normalizeFinleyWorkerOutput,
  runFinleyWorkerPlan,
} from "../../netlify/functions/_shared/finleyWorker.ts";
import {
  buildPrimeSummaryFallback,
  normalizePrimeSummaryOutput,
  runPrimeSummary,
} from "../../netlify/functions/_shared/primeSummarizer.ts";
import { extractPdfTextWithLayout, extractPdfTextWithPdfParse } from "../../netlify/functions/_lib/pdfText.ts";
import { validatePipelineContract } from "./validate-pipeline.ts";

type Options = {
  dir: string;
  contract: boolean;
  failOnReview: boolean;
  requireGrounding: boolean;
  maxPrimeLength: number;
  mode: "professional" | "coach";
};

const DEFAULT_DIR = path.resolve("scripts/pipeline-test/fixtures");
const OUTPUT_DIR = path.resolve("scripts/pipeline-test/output");
const REPORT_PATH = path.join(OUTPUT_DIR, "contract-report.json");

function parseOptions(): Options {
  const args = process.argv.slice(2);
  const has = (flag: string): boolean => args.includes(flag);
  const getValue = (flag: string): string | undefined => {
    const idx = args.findIndex((a) => a === flag);
    if (idx < 0) return undefined;
    return args[idx + 1];
  };
  const modeRaw = String(getValue("--mode") || "professional").toLowerCase();
  return {
    dir: path.resolve(getValue("--dir") || DEFAULT_DIR),
    contract: has("--contract"),
    failOnReview: has("--fail-on-review"),
    requireGrounding: !has("--no-require-grounding"),
    maxPrimeLength: Number(getValue("--max-prime-length") || 1200),
    mode: modeRaw === "coach" ? "coach" : "professional",
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

function compact(value: string, width: number): string {
  return value.length >= width ? `${value.slice(0, width - 1)}…` : value.padEnd(width, " ");
}

function fileStem(filePath: string): string {
  return path.basename(filePath).replace(/\.[^.]+$/, "");
}

function detectByteOutput(obj: any): boolean {
  return Boolean(obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "doc_type") && Array.isArray(obj.transactions));
}

function detectBundle(obj: any): boolean {
  return Boolean(obj && typeof obj === "object" && (obj.byte_output || obj.document_text || obj.tag_output));
}

async function extractText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buffer = await fs.readFile(filePath);
    try {
      return await extractPdfTextWithLayout(buffer as Buffer);
    } catch {
      return await extractPdfTextWithPdfParse(buffer as Buffer);
    }
  }
  if (ext === ".txt" || ext === ".md") {
    return await fs.readFile(filePath, "utf8");
  }
  return "";
}

async function writeJson(filePath: string, value: any): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function sumSpend(tag: any): number {
  const tx = Array.isArray(tag?.transactions) ? tag.transactions : [];
  return tx
    .filter((t: any) => t?.is_spend === true && typeof t?.amount === "number")
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
}

async function main(): Promise<void> {
  const opts = parseOptions();
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let files: string[] = [];
  try {
    files = await walkFiles(opts.dir);
  } catch {
    console.error(`[PIPELINE] fixtures directory not found: ${opts.dir}`);
    process.exitCode = 1;
    return;
  }

  const candidates = files.filter((f) => /\.(pdf|txt|md|json)$/i.test(f) && !/[/\\]readme\.md$/i.test(f));
  if (candidates.length === 0) {
    console.log(`[PIPELINE] No supported files found in ${opts.dir}`);
    if (opts.contract) {
      await writeJson(REPORT_PATH, { total_files: 0, pass_count: 0, fail_count: 0, options: opts, results: [] });
      console.log(`[PIPELINE][CONTRACT] Report: ${REPORT_PATH}`);
    }
    return;
  }

  console.log(
    `${compact("FILE", 24)} | ${compact("DOC_TYPE", 15)} | ${compact("TX", 4)} | ${compact("SPEND", 9)} | ${compact("CRY_INS", 7)} | ${compact("FIN_STEPS", 9)} | ${compact("PRIME_OK", 8)} | ${compact("GROUNDED", 8)} | NEEDS_REVIEW`
  );
  console.log("-".repeat(116));

  const contractResults: any[] = [];

  for (const filePath of candidates) {
    const base = fileStem(filePath);
    const outDir = path.join(OUTPUT_DIR, base);
    await fs.mkdir(outDir, { recursive: true });

    const ext = path.extname(filePath).toLowerCase();
    let bundle: any = {};
    let byteOut: any = buildByteWorkerFallbackOutput(null, "init");
    let tagOut: any = buildTagWorkerFallbackOutput(null, "init");
    let crystalOut: any = buildCrystalWorkerFallbackOutput(null, "init");
    let finleyOut: any = buildFinleyWorkerFallbackOutput(null, "init");
    let primeText = buildPrimeSummaryFallback("init");

    try {
      if (ext === ".json") {
        const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
        if (detectBundle(parsed)) bundle = parsed;
        else if (detectByteOutput(parsed)) bundle = { byte_output: parsed };
        else bundle = { document_text: JSON.stringify(parsed).slice(0, 8000) };
      } else {
        const text = await extractText(filePath);
        bundle = { document_text: text };
      }

      if (bundle.byte_output) {
        byteOut = normalizeByteWorkerOutput(bundle.byte_output, null, 1);
      } else {
        const docText = String(bundle.document_text || "").slice(0, 20000);
        const rawByte = await runByteWorkerExtraction({ documentText: docText, filename: path.basename(filePath), docId: null, ctx: null });
        byteOut = normalizeByteWorkerOutput(rawByte, null, 1);
      }

      const tagInput = {
        statement_type: byteOut?.doc_type || "unknown",
        statement_period: byteOut?.statement_period || null,
        account_summary: byteOut?.account_summary || {},
        pages_detected: byteOut?.pages_detected || [],
        transactions: byteOut?.transactions || [],
      };
      const rawTag = await runTagWorkerCategorization(tagInput, null);
      tagOut = normalizeTagWorkerOutput(rawTag, null);

      const crystalInput = {
        tag_output_json: tagOut,
        byte_account_summary: byteOut?.account_summary || null,
        prior_period_snapshot: bundle.prior_snapshot || null,
      };
      const rawCrystal = await runCrystalWorkerInsights(crystalInput, null);
      crystalOut = normalizeCrystalWorkerOutput(rawCrystal, null);

      const finleyInput = {
        tag_output_json: tagOut,
        crystal_output_json: crystalOut,
        user_preferences: bundle.user_prefs || null,
      };
      const rawFinley = await runFinleyWorkerPlan(finleyInput, null);
      finleyOut = normalizeFinleyWorkerOutput(rawFinley, null);

      primeText = await runPrimeSummary({
        tag: tagOut,
        crystal: crystalOut,
        finley: finleyOut,
        byte: byteOut,
        userName: bundle.user_name || null,
        mode: bundle.mode || opts.mode,
      });
      primeText = normalizePrimeSummaryOutput(primeText);
    } catch (error: any) {
      byteOut = buildByteWorkerFallbackOutput(null, error?.message || "pipeline_error");
      tagOut = buildTagWorkerFallbackOutput(null, error?.message || "pipeline_error");
      crystalOut = buildCrystalWorkerFallbackOutput(null, error?.message || "pipeline_error");
      finleyOut = buildFinleyWorkerFallbackOutput(null, error?.message || "pipeline_error");
      primeText = buildPrimeSummaryFallback(error?.message || "pipeline_error");
    }

    await writeJson(path.join(outDir, "byte.json"), byteOut);
    await writeJson(path.join(outDir, "tag.json"), tagOut);
    await writeJson(path.join(outDir, "crystal.json"), crystalOut);
    await writeJson(path.join(outDir, "finley.json"), finleyOut);
    await fs.writeFile(path.join(outDir, "prime.txt"), primeText, "utf8");

    const contract = validatePipelineContract({
      fileName: base,
      byte: byteOut,
      tag: tagOut,
      crystal: crystalOut,
      finley: finleyOut,
      primeText,
      opts: {
        failOnReview: opts.failOnReview,
        requireGrounding: opts.requireGrounding,
        maxPrimeLength: opts.maxPrimeLength,
      },
    });
    await writeJson(path.join(outDir, "contract.json"), contract);
    contractResults.push(contract);

    const txCount = Array.isArray(tagOut?.transactions) ? tagOut.transactions.length : 0;
    const spendTotal = sumSpend(tagOut).toFixed(2);
    const cryInsights = Array.isArray(crystalOut?.insights) ? crystalOut.insights.length : 0;
    const finSteps = Array.isArray(finleyOut?.plan?.steps) ? finleyOut.plan.steps.length : 0;
    console.log(
      `${compact(base, 24)} | ${compact(String(byteOut?.doc_type || "unknown"), 15)} | ${compact(String(txCount), 4)} | ${compact(`$${spendTotal}`, 9)} | ${compact(String(cryInsights), 7)} | ${compact(String(finSteps), 9)} | ${compact(contract.primeOk ? "true" : "false", 8)} | ${compact(contract.grounded ? "true" : "false", 8)} | ${contract.needsReview ? "true" : "false"}`
    );
  }

  if (opts.contract) {
    const passCount = contractResults.filter((r) => r.pass).length;
    const failCount = contractResults.length - passCount;
    const report = {
      total_files: contractResults.length,
      pass_count: passCount,
      fail_count: failCount,
      options: opts,
      results: contractResults,
    };
    await writeJson(REPORT_PATH, report);
    console.log("-".repeat(116));
    console.log(`[PIPELINE][CONTRACT] TOTAL=${report.total_files} PASS=${report.pass_count} FAIL=${report.fail_count}`);
    if (failCount > 0) {
      console.log("[PIPELINE][CONTRACT] Failed files:");
      for (const r of contractResults.filter((x) => !x.pass)) {
        console.log(`  - ${r.file}: ${r.reasons.join(", ")}`);
      }
      process.exitCode = 1;
    }
    console.log(`[PIPELINE][CONTRACT] Report: ${REPORT_PATH}`);
  }
}

main().catch((err) => {
  console.error("[PIPELINE] fatal:", err);
  process.exitCode = 1;
});

