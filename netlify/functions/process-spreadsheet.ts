import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import * as XLSX from "xlsx";

// ─── Clients ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClassificationResult {
  document_type: "income_report" | "expense_report" | "bank_statement" | "unknown";
  issuer: string;
  currency: string;
  column_map: {
    date?: string;
    amount?: string;
    description?: string;
    client?: string;
    method?: string;
    category?: string;
    subcategory?: string;
  };
  confidence: number;
  notes: string;
}

interface NormalizedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  subcategory: string | null;
  merchant: string | null;
  payer: string | null;
  payment_method: string | null;
  original_row: Record<string, unknown>;
}

// ─── Spreadsheet Parsing ─────────────────────────────────────────────────────

function parseFileBuffer(base64: string, filename: string): XLSX.WorkBook {
  const buffer = Buffer.from(base64, "base64");
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "csv") {
    return XLSX.read(buffer, { type: "buffer", raw: true });
  }
  return XLSX.read(buffer, { type: "buffer" });
}

function sheetToRows(wb: XLSX.WorkBook): { headers: string[]; rows: Record<string, string>[]; sheetName: string } {
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  if (json.length === 0) return { headers: [], rows: [], sheetName };
  const headers = Object.keys(json[0]);
  return { headers, rows: json, sheetName };
}

// ─── AI Classification ──────────────────────────────────────────────────────

async function classifySpreadsheet(
  headers: string[],
  sampleRows: Record<string, string>[],
  filename: string
): Promise<ClassificationResult> {
  const prompt = `You are Byte, the document intake AI for XspensesAI (a Canadian personal finance app for self-employed people).

Given a spreadsheet's filename, column headers, and first 10 rows, determine:

1. document_type - one of:
   - "income_report" (e.g. FreshBooks Payments Collected, invoice summaries, revenue reports)
   - "expense_report" (e.g. business expense spreadsheets, ROWNMI-style category breakdowns, receipt logs)
   - "bank_statement" (e.g. exported bank/credit card transactions)
   - "unknown"

2. column_map - map each relevant column header to its role:
   - date: which column has the transaction date
   - amount: which column has the dollar amount
   - description: which column has a description or memo
   - client: which column has client/payer name (income reports)
   - method: which column has payment method
   - category: which column has the primary/parent expense category (e.g. "Parent Category", "Category")
   - subcategory: which column has the subcategory or detailed category (e.g. "Subcategory", "Sub-Category")

3. issuer - detected source app or institution (e.g. "FreshBooks", "QuickBooks", "Wave", "Custom", "Unknown")
4. currency - detected or assumed currency (default "CAD")
5. confidence - 0-100 how confident you are in the classification
6. notes - any observations

Respond with ONLY valid JSON. No markdown, no backticks, no preamble.

---

Filename: ${filename}
Headers: ${JSON.stringify(headers)}
Sample rows (first 10):
${JSON.stringify(sampleRows.slice(0, 10), null, 2)}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as ClassificationResult;
}

// ─── Normalization ───────────────────────────────────────────────────────────

function normalizeRows(
  rows: Record<string, string>[],
  classification: ClassificationResult
): NormalizedTransaction[] {
  const { column_map, document_type } = classification;
  const transactions: NormalizedTransaction[] = [];

  for (const row of rows) {
    const rawAmount = column_map.amount ? String(row[column_map.amount] ?? "").trim() : "";
    if (!rawAmount) continue;

    let amount = parseFloat(rawAmount.replace(/[$,]/g, "").replace(/[()]/g, ""));
    if (rawAmount.includes("(") && rawAmount.includes(")")) amount = -Math.abs(amount);
    if (isNaN(amount) || amount === 0) continue;

    let date = "";
    if (column_map.date) {
      const rawDate = String(row[column_map.date] ?? "").trim();
      if (rawDate) {
        // Excel serial number detection: a pure number between 30000-60000
        // is days since 1900-01-01 (e.g. 45339 = 2024-02-15)
        const numVal = Number(rawDate);
        if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
          const converted = new Date((numVal - 25569) * 86400000);
          date = converted.toISOString().split("T")[0];
        } else {
          const parsed = new Date(rawDate);
          date = !isNaN(parsed.getTime()) ? parsed.toISOString().split("T")[0] : rawDate;
        }
        // Validate: must be between 2000 and 2030, otherwise null out
        if (date) {
          const year = parseInt(date.slice(0, 4), 10);
          if (isNaN(year) || year < 2000 || year > 2030) {
            date = "";
          }
        }
      }
    }

    const isIncome = document_type === "income_report";
    const type = isIncome ? "income" : "expense";
    const normalizedAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);

    const description = column_map.description
      ? String(row[column_map.description] ?? "").trim()
      : Object.values(row).filter((v) => typeof v === "string" && v.trim() && isNaN(parseFloat(v))).join(" \u2014 ");

    const client = column_map.client ? String(row[column_map.client] ?? "").trim() : null;
    const merchant = isIncome ? null : (description || null);
    const payer = isIncome ? (client || description || null) : null;
    const paymentMethod = column_map.method ? String(row[column_map.method] ?? "").trim() : null;

    let category = column_map.category ? String(row[column_map.category] ?? "").trim() : "";
    const subcategory = column_map.subcategory ? String(row[column_map.subcategory] ?? "").trim() || null : null;
    if (!category) category = isIncome ? "Business Income" : "Other";

    transactions.push({
      date, description: description || "Unknown", amount: normalizedAmount,
      type, category, subcategory, merchant, payer, payment_method: paymentMethod, original_row: row,
    });
  }

  return transactions;
}

// ─── Hash Helper ─────────────────────────────────────────────────────────────

function hashTransaction(importId: string, date: string, description: string, amount: number, index: number): string {
  return createHash("sha256")
    .update(`${importId}:${date}:${description}:${amount}:${index}`)
    .digest("hex");
}

// ─── Staging Insert ──────────────────────────────────────────────────────────

async function insertToStaging(
  transactions: NormalizedTransaction[],
  userId: string,
  classification: ClassificationResult,
  filename: string,
  documentId: string | null
) {
  const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const incomeTotal = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expenseTotal = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const statementBreakdown = {
    issuer: classification.issuer,
    document_type: classification.document_type,
    currency: classification.currency,
    total_transactions: transactions.length,
    total_amount: totalAmount,
    income_total: incomeTotal,
    expense_total: expenseTotal,
    date_range: {
      earliest: transactions.map((t) => t.date).filter(Boolean).sort()[0] || null,
      latest: transactions.map((t) => t.date).filter(Boolean).sort().pop() || null,
    },
    categories: Object.entries(
      transactions.reduce<Record<string, number>>((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {})
    ).map(([name, total]) => ({ name, total })),
    classification_confidence: classification.confidence,
    via: "xlsx-parse",
  };

  // Create import record with status='parsed' so approve/commit pipeline works
  const { data: importRecord, error: importError } = await supabase
    .from("imports")
    .insert({
      user_id: userId, status: "parsed", filename, document_id: documentId,
      file_url: `xlsx://${filename}`, file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      source: classification.issuer || "spreadsheet",
      statement_breakdown_json: statementBreakdown, via: "xlsx-parse",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (importError) throw new Error(`Failed to create import record: ${importError.message}`);
  const importId = importRecord.id;

  // Build staging rows matching the data_json pattern used by normalize-transactions.ts
  // commit-import.ts reads data_json to build final transaction rows
  const stagingRows = transactions.map((t, index) => {
    const hash = hashTransaction(importId, t.date, t.description, t.amount, index);
    return {
      import_id: importId,
      user_id: userId,
      data_json: {
        date: t.date || null,
        posted_at: t.date ? new Date(t.date + "T00:00:00.000Z").toISOString() : new Date().toISOString(),
        merchant: t.merchant,
        vendor: t.merchant,
        description: t.description,
        amount: t.amount,
        type: t.type,
        currency: classification.currency || "CAD",
        category: t.category || null,
        subcategory: t.subcategory || null,
        category_source: t.category ? "xlsx-spreadsheet" : null,
        payer: t.payer,
        payment_method: t.payment_method,
        is_business: classification.document_type !== "bank_statement" ? true : null,
        documentId: documentId,
        importRunId: importId,
        original_row: t.original_row,
      },
      hash,
    };
  });

  // Dedup by hash to prevent ON CONFLICT errors
  const dedupedByHash = new Map<string, (typeof stagingRows)[number]>();
  for (const row of stagingRows) {
    if (!dedupedByHash.has(row.hash)) {
      dedupedByHash.set(row.hash, row);
    }
  }
  const dedupedRows = Array.from(dedupedByHash.values());

  const BATCH_SIZE = 50;
  for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
    const batch = dedupedRows.slice(i, i + BATCH_SIZE);
    const { error: stagingError } = await supabase
      .from("transactions_staging")
      .insert(batch);
    if (stagingError) throw new Error(`Failed to insert staging batch ${i}: ${stagingError.message}`);
  }

  return { importId, statementBreakdown };
}

// ─── Main Handler ────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    const userId = event.headers["x-user-id"];
    if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ error: "Missing x-user-id header" }) };

    const body = JSON.parse(event.body || "{}");
    const { file_base64, filename, document_id } = body;
    if (!file_base64 || !filename) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing file_base64 or filename" }) };

    // 1. Parse
    const workbook = parseFileBuffer(file_base64, filename);
    const { headers: columnHeaders, rows, sheetName } = sheetToRows(workbook);
    if (rows.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: "Spreadsheet is empty" }) };

    // 2. AI classify
    const classification = await classifySpreadsheet(columnHeaders, rows, filename);
    if (classification.document_type === "unknown") {
      return { statusCode: 422, headers, body: JSON.stringify({ error: "Could not determine document type", classification }) };
    }

    // 3. Normalize
    const transactions = normalizeRows(rows, classification);
    if (transactions.length === 0) {
      return { statusCode: 422, headers, body: JSON.stringify({ error: "No valid transactions found", classification, row_count: rows.length }) };
    }

    // 4. Stage
    const { importId, statementBreakdown } = await insertToStaging(transactions, userId, classification, filename, document_id || null);

    // 5. Response
    const typeLabel = classification.document_type === "income_report" ? "income report"
      : classification.document_type === "expense_report" ? "expense report" : "bank statement";
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        success: true,
        import_id: importId,
        classification,
        transaction_count: transactions.length,
        statement_breakdown: statementBreakdown,
        sheet_name: sheetName,
        byte_message: `Imported ${transactions.length} transactions from ${classification.issuer || "spreadsheet"} ${typeLabel} "${filename}" totaling $${totalAmount.toLocaleString("en-CA", { minimumFractionDigits: 2 })} ${classification.currency}. Sheet: "${sheetName}". Ready for review.`,
      }),
    };
  } catch (err: unknown) {
    console.error("[process-spreadsheet] Error:", err);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
    };
  }
};
