import { validateTagWorkerOutput } from "../../netlify/functions/_shared/tagWorker.ts";
import { validateCrystalGrounding, validateCrystalWorkerOutput } from "../../netlify/functions/_shared/crystalWorker.ts";
import { validateFinleyGrounding, validateFinleyWorkerOutput } from "../../netlify/functions/_shared/finleyWorker.ts";

type PipelineContractOpts = {
  failOnReview: boolean;
  requireGrounding: boolean;
  maxPrimeLength: number;
};

type PipelineContractInput = {
  fileName: string;
  byte: any;
  tag: any;
  crystal: any;
  finley: any;
  primeText: string;
  opts: PipelineContractOpts;
};

export type PipelineContractResult = {
  file: string;
  pass: boolean;
  reasons: string[];
  warnings: string[];
  grounded: boolean;
  primeOk: boolean;
  needsReview: boolean;
};

function n(v: any): number | null {
  if (v === null || typeof v === "undefined") return null;
  const parsed = typeof v === "number" ? v : Number(String(v).replace(/[,$\s]/g, ""));
  return Number.isFinite(parsed) ? Number(parsed) : null;
}

function extractPrimeNumbers(text: string): number[] {
  const matches = String(text || "").match(/(?:\$?\s*)?[-+]?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|(?:\$?\s*)?[-+]?\d+\.\d{1,2}/g) || [];
  const nums = matches
    .map((m) => Number(m.replace(/[,$\s]/g, "")))
    .filter((v) => Number.isFinite(v) && Math.abs(v) >= 1)
    .map((v) => Number(Math.abs(v).toFixed(2)));
  return Array.from(new Set(nums));
}

function buildAllowedNumbers(input: PipelineContractInput): Set<number> {
  const out = new Set<number>();
  const add = (v: any) => {
    const num = n(v);
    if (num !== null && Math.abs(num) >= 1) out.add(Number(Math.abs(num).toFixed(2)));
  };
  const tag = input.tag || {};
  const crystal = input.crystal || {};
  add(tag?.account_summary?.opening_balance);
  add(tag?.account_summary?.closing_balance);
  add(tag?.account_summary?.total_deposits);
  add(tag?.account_summary?.total_withdrawals);
  for (const c of tag?.category_totals || []) add(c?.total);
  for (const t of tag?.transactions || []) add(t?.amount);
  add(crystal?.highlights?.largest_spend?.amount);
  add(crystal?.highlights?.largest_income?.amount);
  add(crystal?.highlights?.fees_total);
  add(crystal?.highlights?.transfers_total);
  return out;
}

function hasNextActionsBlock(text: string): boolean {
  const section = /next actions:/i.test(text);
  const bullets = (text.match(/^\s*[-*]\s+/gm) || []).length;
  return section && bullets >= 3;
}

function hasStatementReference(text: string, statementPeriod: string | null): boolean {
  if (statementPeriod) return text.toLowerCase().includes(String(statementPeriod).toLowerCase());
  return /\bthis statement\b/i.test(text);
}

function requiredTotalsMentioned(input: PipelineContractInput): boolean {
  const prime = String(input.primeText || "").toLowerCase();
  const tag = input.tag || {};
  const byte = input.byte || {};
  const statementType = String(tag?.statement_type || byte?.doc_type || "unknown");
  const hasAnyTotals = [
    tag?.account_summary?.opening_balance,
    tag?.account_summary?.closing_balance,
    tag?.account_summary?.total_deposits,
    tag?.account_summary?.total_withdrawals,
    byte?.account_summary?.previous_balance,
    byte?.account_summary?.new_balance,
  ].some((v) => n(v) !== null);
  if (!hasAnyTotals) return true;

  if (statementType === "credit_card_statement") {
    const wantedWords = ["previous balance", "new balance", "payments", "purchases"];
    const hits = wantedWords.filter((w) => prime.includes(w)).length;
    return hits >= 2;
  }

  const bankWords = ["opening balance", "closing balance", "deposits", "withdrawals", "net change"];
  const hits = bankWords.filter((w) => prime.includes(w)).length;
  return hits >= 2;
}

export function validatePipelineContract(input: PipelineContractInput): PipelineContractResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const byte = input.byte || {};
  const tag = input.tag || {};
  const crystal = input.crystal || {};
  const finley = input.finley || {};
  const primeText = String(input.primeText || "").trim();

  if (!String(byte?.doc_type || "").trim()) reasons.push("byte_doc_type_missing");
  if (String(byte?.doc_type || "").trim() === "unknown" && Number(byte?.extraction_quality?.confidence || 0) > 0.4) {
    reasons.push("byte_unknown_doc_type_high_confidence");
  }

  const tagValidation = validateTagWorkerOutput(tag);
  if (!tagValidation.ok) reasons.push(...tagValidation.errors.map((e) => `tag_${e}`));
  if ((Array.isArray(tag?.transactions) ? tag.transactions.length : 0) === 0) {
    const review = (tag?.highlights?.flags || []).some((f: any) => /missing|fallback|review/i.test(String(f)));
    if (!review) reasons.push("tag_zero_transactions_without_review");
  }

  const crystalValidation = validateCrystalWorkerOutput(crystal);
  if (!crystalValidation.ok) reasons.push(...crystalValidation.errors.map((e) => `crystal_${e}`));
  const crystalGrounding = validateCrystalGrounding(crystal, { tag_output_json: tag });
  if (!crystalGrounding.ok) {
    if (input.opts.requireGrounding) reasons.push(...crystalGrounding.errors.map((e) => `crystal_${e}`));
    else warnings.push(...crystalGrounding.errors.map((e) => `crystal_${e}`));
  }
  warnings.push(...crystalGrounding.warnings.map((w) => `crystal_${w}`));

  const finleyValidation = validateFinleyWorkerOutput(finley);
  if (!finleyValidation.ok) reasons.push(...finleyValidation.errors.map((e) => `finley_${e}`));
  const finleyGrounding = validateFinleyGrounding(finley, {
    tag_output_json: tag,
    crystal_output_json: crystal,
    requireNoInventedDates: true,
    requireNoInventedAmounts: true,
  });
  if (!finleyGrounding.ok) reasons.push(...finleyGrounding.errors.map((e) => `finley_${e}`));
  warnings.push(...finleyGrounding.warnings.map((w) => `finley_${w}`));

  if (!primeText) reasons.push("prime_empty");
  if (primeText.length > input.opts.maxPrimeLength) reasons.push("prime_too_long");

  if (/\b(BYTE|TAG|CRYSTAL|FINLEY|OrchCtx|worker_chain|deterministic_path|prompt|JSON mode)\b/i.test(primeText)) {
    reasons.push("prime_internal_secrecy_leak");
  }

  const allowedNumbers = buildAllowedNumbers(input);
  const primeNumbers = extractPrimeNumbers(primeText);
  const missing = primeNumbers.filter((pn) => !Array.from(allowedNumbers).some((a) => Math.abs(a - pn) <= 0.01));
  if (missing.length > 0) {
    if (input.opts.requireGrounding) reasons.push(`prime_ungrounded_number:${missing.slice(0, 8).join(",")}`);
    else warnings.push(`prime_ungrounded_number:${missing.slice(0, 8).join(",")}`);
  }

  if (!hasStatementReference(primeText, tag?.statement_period || byte?.statement_period || null)) {
    if (input.opts.failOnReview) reasons.push("prime_missing_statement_reference");
    else warnings.push("prime_missing_statement_reference");
  }

  if (!requiredTotalsMentioned(input)) {
    if (input.opts.failOnReview) reasons.push("prime_missing_key_totals");
    else warnings.push("prime_missing_key_totals");
  }

  if (!hasNextActionsBlock(primeText)) reasons.push("prime_missing_next_actions");

  const needsReview =
    Boolean(byte?.extraction_quality?.needs_review) ||
    (Array.isArray(tag?.transactions) && tag.transactions.some((t: any) => Boolean(t?.needs_review))) ||
    (Array.isArray(crystal?.flags) && crystal.flags.length > 0) ||
    finleyGrounding.warnings.length > 0 ||
    warnings.length > 0;

  const grounded = input.opts.requireGrounding ? missing.length === 0 && crystalGrounding.ok : true;
  const primeOk = !reasons.some((r) => r.startsWith("prime_"));

  return {
    file: input.fileName,
    pass: reasons.length === 0,
    reasons: Array.from(new Set(reasons)),
    warnings: Array.from(new Set(warnings)),
    grounded,
    primeOk,
    needsReview,
  };
}

