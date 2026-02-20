import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("scripts/tag-test/output");
const SANITIZED_DIR = path.join(OUTPUT_DIR, "sanitized");

function maskLongDigitsKeepLast4(input: string): string {
  return input.replace(/\b\d{6,}\b/g, (match) => {
    const keep = match.slice(-4);
    const stars = "*".repeat(Math.max(2, match.length - 4));
    return `${stars}${keep}`;
  });
}

function maskDigitSequencesWithSeparators(input: string): string {
  return input.replace(/\b(?:\d[ -]?){6,}\d\b/g, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 6) return match;
    const maskedDigits = `${"*".repeat(Math.max(2, digits.length - 4))}${digits.slice(-4)}`;
    let idx = 0;
    return match.replace(/\d/g, () => maskedDigits[idx++] || "*");
  });
}

function maskEmails(input: string): string {
  return input.replace(/\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, (_m, user, domain) => {
    const userText = String(user || "");
    if (!userText) return `***@${domain}`;
    return `${userText[0]}***@${domain}`;
  });
}

function shouldPreserveStringByKey(key: string): boolean {
  return [
    "date",
    "statement_period",
    "category",
    "subcategory",
    "tax_hint",
    "direction",
  ].includes(key);
}

function maskStringByKey(key: string, value: string): string {
  if (shouldPreserveStringByKey(key)) return value;
  let masked = value;
  masked = maskDigitSequencesWithSeparators(masked);
  masked = maskLongDigitsKeepLast4(masked);
  masked = maskEmails(masked);
  return masked;
}

function sanitizeValue(value: any, key = ""): any {
  if (value === null || typeof value === "undefined") return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, key));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeValue(v, k);
    }
    return out;
  }
  if (typeof value === "string") return maskStringByKey(key, value);
  return value;
}

async function sanitizeJsonFile(inputPath: string, outputPath: string): Promise<void> {
  const raw = await fs.readFile(inputPath, "utf8");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { _raw: raw };
  }
  const sanitized = sanitizeValue(parsed);
  await fs.writeFile(outputPath, JSON.stringify(sanitized, null, 2), "utf8");
}

async function main(): Promise<void> {
  await fs.mkdir(SANITIZED_DIR, { recursive: true });
  const entries = await fs.readdir(OUTPUT_DIR, { withFileTypes: true }).catch(() => []);

  const tagJsonFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".tag.json"))
    .map((e) => e.name);
  const hasContractReport = entries.some(
    (e) => e.isFile() && e.name.toLowerCase() === "contract-report.json"
  );

  const targets: string[] = [...tagJsonFiles];
  if (hasContractReport) targets.push("contract-report.json");

  if (targets.length === 0) {
    console.log("[TAG SANITIZE] No TAG outputs found to sanitize.");
    return;
  }

  for (const fileName of targets) {
    const inputPath = path.join(OUTPUT_DIR, fileName);
    const outputPath = path.join(SANITIZED_DIR, fileName);
    await sanitizeJsonFile(inputPath, outputPath);
  }

  console.log(`[TAG SANITIZE] Sanitized ${targets.length} file(s).`);
  console.log(`[TAG SANITIZE] Output: ${SANITIZED_DIR}`);
}

main().catch((err) => {
  console.error("[TAG SANITIZE] fatal:", err);
  process.exitCode = 1;
});

