import fs from "node:fs/promises";
import path from "node:path";

import { detectRecurringTransactions } from "../../netlify/functions/_shared/recurringDetector.ts";

const FIXTURES_DIR = path.resolve("scripts/recurring-test/fixtures");
const OUTPUT_DIR = path.resolve("scripts/recurring-test/output");

type TestCase = {
  name: string;
  tag_output: any;
};

function sampleCases(): TestCase[] {
  return [
    {
      name: "clean-monthly-subscriptions",
      tag_output: {
        transactions: [
          { date: "2026-01-05", merchant_normalized: "NETFLIX", description_raw: "NETFLIX", amount: 19.99, is_spend: true, direction: "debit", category: "Subscription" },
          { date: "2026-02-05", merchant_normalized: "NETFLIX", description_raw: "NETFLIX", amount: 19.99, is_spend: true, direction: "debit", category: "Subscription" },
          { date: "2026-03-05", merchant_normalized: "NETFLIX", description_raw: "NETFLIX", amount: 19.99, is_spend: true, direction: "debit", category: "Subscription" },
          { date: "2026-01-12", merchant_normalized: "SPOTIFY", description_raw: "SPOTIFY", amount: 11.99, is_spend: true, direction: "debit", category: "Subscription" },
          { date: "2026-02-12", merchant_normalized: "SPOTIFY", description_raw: "SPOTIFY", amount: 11.99, is_spend: true, direction: "debit", category: "Subscription" },
        ],
      },
    },
    {
      name: "noisy-merchants",
      tag_output: {
        transactions: [
          { date: "2026-01-03", merchant_normalized: "AMAZON MKT", description_raw: "AMAZON MKT 123", amount: 23.11, is_spend: true, direction: "debit", category: "Retail" },
          { date: "2026-02-02", merchant_normalized: "AMAZON MKT", description_raw: "AMAZON MKT 888", amount: 31.42, is_spend: true, direction: "debit", category: "Retail" },
          { date: "2026-03-06", merchant_normalized: "AMAZON MKT", description_raw: "AMAZON MKT 999", amount: 17.22, is_spend: true, direction: "debit", category: "Retail" },
        ],
      },
    },
    {
      name: "mixed-spending-with-transfers",
      tag_output: {
        transactions: [
          { date: "2026-01-01", merchant_normalized: "GYM PRO", description_raw: "GYM PRO", amount: 45, is_spend: true, direction: "debit", category: "Fitness/Health" },
          { date: "2026-02-01", merchant_normalized: "GYM PRO", description_raw: "GYM PRO", amount: 45, is_spend: true, direction: "debit", category: "Fitness/Health" },
          { date: "2026-01-15", merchant_normalized: "ONLINE TRANSFER", description_raw: "ONLINE TRANSFER", amount: 300, is_spend: false, direction: "debit", category: "Transfer" },
          { date: "2026-02-15", merchant_normalized: "ONLINE TRANSFER", description_raw: "ONLINE TRANSFER", amount: 300, is_spend: false, direction: "debit", category: "Transfer" },
        ],
      },
    },
    {
      name: "scanned-ocr-edge",
      tag_output: {
        transactions: [
          { date: "2026-01-07", merchant_normalized: "TELUS", description_raw: "TELUS*INV 4422", amount: 84.5, is_spend: true, direction: "debit", category: "Utilities" },
          { date: "2026-02-06", merchant_normalized: "TELUS", description_raw: "TELUS*INV 7711", amount: 82.9, is_spend: true, direction: "debit", category: "Utilities" },
        ],
      },
    },
  ];
}

async function loadFixtureCases(): Promise<TestCase[]> {
  const files = await fs.readdir(FIXTURES_DIR, { withFileTypes: true }).catch(() => []);
  const jsons = files.filter((f) => f.isFile() && f.name.toLowerCase().endsWith(".json")).map((f) => f.name);
  const out: TestCase[] = [];
  for (const fileName of jsons) {
    try {
      const raw = await fs.readFile(path.join(FIXTURES_DIR, fileName), "utf8");
      const parsed = JSON.parse(raw);
      const name = fileName.replace(/\.json$/i, "");
      const tag_output = parsed?.tag_output || parsed;
      out.push({ name, tag_output });
    } catch {
      // ignore bad fixture
    }
  }
  return out;
}

async function main(): Promise<void> {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const fixtureCases = await loadFixtureCases();
  const cases = fixtureCases.length > 0 ? fixtureCases : sampleCases();

  const results = cases.map((c) => {
    try {
      const result = detectRecurringTransactions(c.tag_output || {});
      return { name: c.name, ok: true, result };
    } catch (error: any) {
      return {
        name: c.name,
        ok: false,
        result: {
          recurring_candidates: [],
          summary: { total_monthly_estimate: 0, total_detected: 0 },
          error: String(error?.message || error),
        },
      };
    }
  });

  await fs.writeFile(path.join(OUTPUT_DIR, "recurring-results.json"), JSON.stringify({ ts: new Date().toISOString(), results }, null, 2), "utf8");

  console.log("CASE | DETECTED | MONTHLY_EST");
  console.log("--------------------------------");
  for (const r of results) {
    const summary = r.result?.summary || { total_detected: 0, total_monthly_estimate: 0 };
    console.log(`${r.name} | ${summary.total_detected} | ${summary.total_monthly_estimate}`);
  }
  console.log(`[RECURRING TEST] Output: ${path.join(OUTPUT_DIR, "recurring-results.json")}`);
}

main().catch((err) => {
  console.error("[RECURRING TEST] fatal:", err);
  process.exitCode = 1;
});

