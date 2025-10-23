// netlify/functions/byte-ocr-parse.ts
import { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { safeLog } from "./_shared/safeLog";
import { downloadFileBytes } from "./_shared/storage";
import Papa from "papaparse";

// ESM/CJS compatible import for pdf-parse
import * as pdfParseNS from "pdf-parse";
const pdfParse: (buf: Buffer | ArrayBuffer) => Promise<any> =
  // use default if present, else call the namespace directly
  (pdfParseNS as any).default ?? (pdfParseNS as any);

// Optional OCR (heavy) — enable with env ENABLE_IMAGE_OCR=true
const ENABLE_OCR = String(process.env.ENABLE_IMAGE_OCR || "").toLowerCase() === "true";
let tesseract: typeof import("tesseract.js") | null = null;

const Body = z.object({ importId: z.string().uuid() });

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body ?? "{}"));
    const { supabase } = serverSupabase();

    // 1) Look up import record
    const { data: imp, error: e1 } = await supabase
      .from("imports")
      .select("id, user_id, file_key, mime, bytes, status")
      .eq("id", body.importId)
      .single();
    if (e1 || !imp) throw new Error(e1?.message ?? "Import not found");

    // 2) Download file bytes from storage
    const buf = await downloadFileBytes(imp.file_key);
    const mime = (imp.mime || "").toLowerCase();

    // 3) Route to parser
    let rows: ParsedRow[] = [];
    if (mime.includes("csv") || imp.file_key.toLowerCase().endsWith(".csv")) {
      rows = await parseCSV(buf);
    } else if (mime.includes("pdf") || imp.file_key.toLowerCase().endsWith(".pdf")) {
      rows = await parsePDF(buf);
    } else if (mime.startsWith("image/")) {
      if (!ENABLE_OCR) {
        // Provide a gentle row so preview UI still works
        rows = [{
          occurred_at: new Date().toISOString(),
          description: "Image uploaded (OCR disabled). Toggle ENABLE_IMAGE_OCR=true to extract.",
          amount: 0,
          currency: "CAD",
          memo: null,
          vendor_raw: "UNKNOWN",
          category_suggested: null,
          source_line: 1
        }];
      } else {
        rows = await parseImageOCR(buf);
      }
    } else {
      throw new Error(`Unsupported mime: ${mime}`);
    }

    // 4) Normalize → staging
    if (!rows.length) throw new Error("No rows parsed");
    const stagingRows = rows.map((r, i) => ({
      import_id: imp.id,
      occurred_at: r.occurred_at ?? null,
      description: r.description ?? null,
      amount: r.amount ?? null,
      currency: r.currency ?? "CAD",
      memo: r.memo ?? null,
      vendor_raw: r.vendor_raw ?? null,
      category_suggested: r.category_suggested ?? null,
      source_line: r.source_line ?? i + 1,
      hash: hashRow(imp.user_id, r, i),
    }));

    // Clear any previous staging for this import (idempotent re-run)
    await supabase.from("transactions_staging").delete().eq("import_id", imp.id);
    const { error: e2 } = await supabase.from("transactions_staging").insert(stagingRows);
    if (e2) throw new Error(e2.message);

    await supabase.from("imports").update({ status: "parsed_preview" }).eq("id", imp.id);
    safeLog("byte-ocr-parse.success", { importId: imp.id, rowsParsed: stagingRows.length, mime });
    return ok({ previewCount: stagingRows.length });
  } catch (err: any) {
    safeLog("byte-ocr-parse.error", { err: err?.message });
    return errResp(err);
  }
};

// ---------- Types ----------
type ParsedRow = {
  occurred_at?: string | null;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  memo?: string | null;
  vendor_raw?: string | null;
  category_suggested?: string | null;
  source_line?: number | null;
};

// ---------- Parsers ----------
async function parseCSV(buf: ArrayBuffer): Promise<ParsedRow[]> {
  const text = Buffer.from(buf).toString("utf8");
  const out = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (out.errors?.length) {
    // Non-fatal: include what we can
    console.warn("CSV parse warnings:", out.errors.slice(0, 3));
  }
  const rows = (out.data || []).map((r, idx) => normalizeRecord(r, idx + 1));
  return rows.filter(Boolean) as ParsedRow[];
}

async function parsePDF(buf: ArrayBuffer): Promise<ParsedRow[]> {
  const data = await pdfParse(Buffer.from(buf));
  const lines = (data.text || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Very light heuristic: look for lines like "2025-10-01 Costco -123.45"
  const rows: ParsedRow[] = [];
  const dateRe = /(\d{4}[-/]\d{2}[-/]\d{2})/;
  const amtRe = /([-+]?[\d,]*\.?\d{2})/;
  lines.forEach((line, idx) => {
    const d = line.match(dateRe)?.[1] ?? null;
    const am = line.match(amtRe)?.[1] ?? null;
    if (d && am) {
      rows.push({
        occurred_at: tryISO(d),
        description: line.replace(dateRe, "").replace(amtRe, "").trim() || "PDF line",
        amount: Number(am.replace(/,/g, "")),
        currency: "CAD",
        memo: null,
        vendor_raw: extractVendor(line),
        category_suggested: null,
        source_line: idx + 1,
      });
    }
  });
  // Fallback: if no heuristic rows, dump a single note row so preview renders
  if (!rows.length) {
    rows.push({
      occurred_at: null,
      description: "PDF parsed — no structured rows matched heuristic. Use CSV for best results.",
      amount: 0,
      currency: "CAD",
      memo: null,
      vendor_raw: "UNKNOWN",
      category_suggested: null,
      source_line: 1,
    });
  }
  return rows;
}

async function parseImageOCR(buf: ArrayBuffer): Promise<ParsedRow[]> {
  if (!tesseract) tesseract = await import("tesseract.js");
  const { createWorker } = tesseract;
  const worker = await createWorker();
  try {
    const { data } = await worker.recognize(Buffer.from(buf));
    const text = data.text || "";
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows: ParsedRow[] = lines.slice(0, 50).map((line, i) => ({
      occurred_at: null,
      description: line,
      amount: null,
      currency: "CAD",
      memo: null,
      vendor_raw: "UNKNOWN",
      category_suggested: null,
      source_line: i + 1,
    }));
    return rows.length ? rows : [{
      occurred_at: null, description: "OCR returned no text.", amount: 0, currency: "CAD", memo: null, vendor_raw: "UNKNOWN", source_line: 1, category_suggested: null
    }];
  } finally {
    await worker.terminate();
  }
}

// ---------- Normalization helpers ----------
function normalizeRecord(r: Record<string, string>, sourceLine: number): ParsedRow | null {
  // Try common headings
  const date = r.date || r.Date || r.occurred_at || r.posted_at || "";
  const desc = r.description || r.Description || r.merchant || r.Merchant || "";
  const amt = r.amount || r.Amount || r.debit || r.credit || "";
  const currency = r.currency || r.Currency || "CAD";
  const memo = r.memo || r.Memo || r.note || r.Note || "";
  const vendor = r.vendor || r.Vendor || r.payee || r.Payee || desc;

  const parsedAmount = parseAmount(amt);
  const occurred_at = tryISO(date);
  if (!desc && parsedAmount === null && !occurred_at) return null;

  return {
    occurred_at,
    description: desc || "CSV row",
    amount: parsedAmount,
    currency,
    memo: memo || null,
    vendor_raw: vendor || null,
    category_suggested: null,
    source_line: sourceLine,
  };
}

function parseAmount(x: string): number | null {
  if (!x) return null;
  const cleaned = x.replace(/[^0-9\-.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function tryISO(x: string): string | null {
  if (!x) return null;
  // Accept YYYY-MM-DD or YYYY/MM/DD
  const a = x.replace(/\//g, "-");
  const d = new Date(a);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function extractVendor(line: string): string {
  // Very light vendor guess: remove date/amount parts
  return line.replace(/\d{4}[-/]\d{2}[-/]\d{2}/, "").replace(/[-+]?[\d,]*\.?\d{2}/, "").trim() || "UNKNOWN";
}

function hashRow(userId: string, r: ParsedRow, idx: number): string {
  const payload = [
    userId,
    r.occurred_at ?? "",
    r.description ?? "",
    String(r.amount ?? ""),
    r.currency ?? "",
    r.vendor_raw ?? "",
    String(idx),
  ].join("|");
  const cryptoObj = require("crypto");
  return cryptoObj.createHash("sha256").update(payload).digest("hex");
}

function ok(body: unknown) {
  return { statusCode: 200, body: JSON.stringify(body) };
}
function errResp(err: any) {
  return { statusCode: 400, body: JSON.stringify({ error: err?.message ?? "error" }) };
}
