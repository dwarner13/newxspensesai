import OpenAI from "openai";

export const BYTE_WORKER_SYSTEM_PROMPT = `ROLE
You are BYTE, the document ingestion + extraction worker for XspensesAI.
You DO NOT respond to the user. Output STRICT JSON ONLY for Prime/TAG/Crystal.

GOAL
Given raw extracted text from a financial document (bank statement, credit card statement, receipt, invoice):
1) Detect document type and key metadata (institution, period, currency).
2) Detect and label pages/sections (summary | transactions | legal/info | unknown).
3) Extract a normalized transaction list.
4) Extract account-level totals/balances when present.
5) Provide extraction quality signals.

HARD RULES
- Do NOT hallucinate. If you cannot find a field, set it to null and flag needs_review=true.
- Do NOT invent transactions. Only extract what exists in the text.
- If legal pages exist, label them "legal/info" and do not treat them as transactions.
- Preserve traceability: keep the original line/description in description_raw.
- Use CAD unless text explicitly indicates another currency.
- Output JSON only. No markdown. No extra text.
- Be bank-format-agnostic: support column and wording variants across institutions.
- Never include full unmasked account/card numbers in output (mask when present).

FORMAT VARIANTS TO HANDLE
- Opening balance synonyms: "opening balance", "balance forward", "previous balance", "beginning balance".
- Deposits synonyms: "deposits", "credits", "payments received".
- Withdrawals synonyms: "withdrawals", "debits", "purchases", "charges".
- Transaction table variants:
  - Separate debit/credit columns.
  - Single amount column with sign or CR/DR markers.
  - Rows with running balance column.
- If multiple account numbers appear, extract primary account first and set needs_review=true with warning.

OUTPUT FORMAT (STRICT JSON ONLY)
{
  "doc_type": "bank_statement"|"credit_card_statement"|"receipt"|"invoice"|"unknown",
  "institution": "string|null",
  "statement_period": "string|null",
  "currency": "CAD"|"USD"|"other"|null,
  "pages_detected": [
    { "page_index": number, "page_kind": "summary"|"transactions"|"legal/info"|"unknown", "notes": "string" }
  ],
  "account_summary": {
    "opening_balance": number|null,
    "closing_balance": number|null,
    "total_deposits": number|null,
    "total_withdrawals": number|null,
    "previous_balance": number|null,
    "new_balance": number|null,
    "minimum_payment": number|null,
    "payment_due_date": "YYYY-MM-DD"|null,
    "credit_limit": number|null,
    "available_credit": number|null
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD"|null,
      "posting_date": "YYYY-MM-DD"|null,
      "description_raw": "string",
      "merchant_normalized": "string|null",
      "amount": number|null,
      "direction": "debit"|"credit"|null,
      "balance_after": number|null,
      "source_hint": "string|null"
    }
  ],
  "extraction_quality": {
    "confidence": number,
    "missing_fields": ["string"],
    "warnings": ["string"],
    "needs_review": boolean
  }
}

VALIDATION WARNINGS (use these exact codes)
- "doc_type_uncertain"
- "missing_year_in_dates"
- "transaction_date_missing"
- "suspiciously_low_transaction_count"
- "totals_mismatch"
- "multiple_accounts_detected"

Now process the given input task and return STRICT JSON ONLY.`;

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function buildByteWorkerFallbackOutput(_ctx: any, reason: string, pagesDetectedHint = 1): any {
  return {
    doc_type: "unknown",
    institution: null,
    statement_period: null,
    currency: "CAD",
    pages_detected: Array.from({ length: Math.max(1, pagesDetectedHint) }).map((_, idx) => ({
      page_index: idx + 1,
      page_kind: "unknown",
      notes: `fallback:${reason}`,
    })),
    account_summary: {
      opening_balance: null,
      closing_balance: null,
      total_deposits: null,
      total_withdrawals: null,
      previous_balance: null,
      new_balance: null,
      minimum_payment: null,
      payment_due_date: null,
      credit_limit: null,
      available_credit: null,
    },
    transactions: [],
    extraction_quality: {
      confidence: 0,
      missing_fields: ["doc_type", "transactions"],
      warnings: [`BYTE fallback used: ${reason}`],
      needs_review: true,
    },
  };
}

function coerceAmount(value: any): number | null {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[,$\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function maskSensitiveIdentifierText(value: string | null | undefined): string {
  const text = String(value || "");
  return text
    .replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4,7})\b/g, "****-****-****-$4")
    .replace(/\b\d{8,19}\b/g, "[redacted-id]")
    .trim();
}

export function normalizeByteWorkerOutput(raw: any, _ctx: any, pagesDetectedHint = 1): any {
  const fallback = buildByteWorkerFallbackOutput(null, "normalize_fallback", pagesDetectedHint);
  const source = raw && typeof raw === "object" ? raw : fallback;
  const pagesDetected = Array.isArray(source.pages_detected) ? source.pages_detected : [];
  const txns = Array.isArray(source.transactions) ? source.transactions : [];
  const docType = ["bank_statement", "credit_card_statement", "receipt", "invoice", "unknown"].includes(String(source.doc_type))
    ? String(source.doc_type)
    : "unknown";
  const currency = ["CAD", "USD", "other"].includes(String(source.currency)) ? source.currency : "CAD";
  let needsReview = Boolean(source?.extraction_quality?.needs_review ?? true);
  const warnings = Array.isArray(source?.extraction_quality?.warnings)
    ? source.extraction_quality.warnings.map((v: any) => String(v))
    : [...fallback.extraction_quality.warnings];
  const addWarning = (code: string) => {
    if (!warnings.includes(code)) warnings.push(code);
  };

  const sourceTextForAccounts = JSON.stringify({
    institution: source?.institution || null,
    statement_period: source?.statement_period || null,
    pages_detected: source?.pages_detected || [],
  });
  const accountMatches = sourceTextForAccounts.match(/\b\d{8,19}\b/g) || [];
  const uniqueAccounts = Array.from(new Set(accountMatches));
  if (uniqueAccounts.length > 1) {
    needsReview = true;
    addWarning("multiple_accounts_detected");
  }

  const normalizedTransactions = txns
    .map((t: any) => {
      const amount = coerceAmount(t?.amount);
      let direction: "debit" | "credit" | null = null;
      if (t?.direction === "credit" || t?.direction === "debit") {
        direction = t.direction;
      } else if (typeof amount === "number") {
        if (amount < 0) direction = "debit";
        if (amount > 0) direction = "credit";
      } else {
        const descriptionLower = String(t?.description_raw || "").toLowerCase();
        if (/\b(payment|credit|refund|deposit|e-?transfer in|money in)\b/.test(descriptionLower)) direction = "credit";
        else if (/\b(purchase|debit|withdraw|fee|charge|e-?transfer out|money out)\b/.test(descriptionLower)) direction = "debit";
      }
      let normalizedDate = t?.date ?? null;
      const postingDate = t?.posting_date ?? null;
      if (!normalizedDate && postingDate) {
        normalizedDate = postingDate;
        addWarning("transaction_date_missing");
      }
      if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(normalizedDate)) && /^\d{1,2}[/-]\d{1,2}$/.test(String(normalizedDate))) {
        normalizedDate = null;
        addWarning("missing_year_in_dates");
      }
      const normalized = {
        date: normalizedDate,
        posting_date: postingDate,
        description_raw: maskSensitiveIdentifierText(String(t?.description_raw || "").trim()),
        merchant_normalized: t?.merchant_normalized ? maskSensitiveIdentifierText(String(t.merchant_normalized)) : null,
        amount: amount === null ? null : Math.abs(amount),
        direction,
        balance_after: coerceAmount(t?.balance_after),
        source_hint: t?.source_hint ?? null,
      };
      if (!normalized.direction) needsReview = true;
      return normalized;
    })
    .filter((t: any) => String(t.description_raw || "").length > 0 || typeof t.amount === "number");

  if (normalizedTransactions.some((tx: any) => tx.direction === null)) addWarning("transaction_direction_uncertain");

  const totalDeposits = coerceAmount(source?.account_summary?.total_deposits);
  const totalWithdrawals = coerceAmount(source?.account_summary?.total_withdrawals);
  const rowCredits = normalizedTransactions.filter((tx: any) => tx.direction === "credit" && typeof tx.amount === "number").reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const rowDebits = normalizedTransactions.filter((tx: any) => tx.direction === "debit" && typeof tx.amount === "number").reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0);
  const materiallyDiffers = (declared: number | null, computed: number): boolean => {
    if (declared === null) return false;
    const diff = Math.abs(declared - computed);
    const threshold = Math.max(5, Math.abs(declared) * 0.01);
    return diff > threshold;
  };
  if (materiallyDiffers(totalDeposits, rowCredits) || materiallyDiffers(totalWithdrawals, rowDebits)) {
    addWarning("totals_mismatch");
    needsReview = true;
  }

  const statementPeriodText = String(source?.statement_period || "").toLowerCase();
  const periodLooksMonthly = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month|statement period)\b/.test(statementPeriodText);
  if (periodLooksMonthly && normalizedTransactions.length > 0 && normalizedTransactions.length < 3) {
    addWarning("suspiciously_low_transaction_count");
    needsReview = true;
  }
  if (docType === "unknown") addWarning("doc_type_uncertain");

  let confidence = Number(source?.extraction_quality?.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  confidence = Math.max(0, Math.min(1, confidence));
  if (needsReview && confidence > 0.8) confidence = 0.8;
  if (normalizedTransactions.length === 0 && (docType === "bank_statement" || docType === "credit_card_statement")) confidence = Math.min(confidence, 0.3);

  return {
    doc_type: docType,
    institution: source.institution ? maskSensitiveIdentifierText(String(source.institution)) : null,
    statement_period: source.statement_period ?? null,
    currency,
    pages_detected: pagesDetected.length > 0
      ? pagesDetected.map((p: any, idx: number) => ({
          page_index: Number.isFinite(Number(p?.page_index)) ? Number(p.page_index) : idx + 1,
          page_kind: ["summary", "transactions", "legal/info", "unknown"].includes(String(p?.page_kind)) ? String(p.page_kind) : "unknown",
          notes: String(p?.notes || ""),
        }))
      : fallback.pages_detected,
    account_summary: {
      opening_balance: coerceAmount(source?.account_summary?.opening_balance),
      closing_balance: coerceAmount(source?.account_summary?.closing_balance),
      total_deposits: coerceAmount(source?.account_summary?.total_deposits),
      total_withdrawals: coerceAmount(source?.account_summary?.total_withdrawals),
      previous_balance: coerceAmount(source?.account_summary?.previous_balance),
      new_balance: coerceAmount(source?.account_summary?.new_balance),
      minimum_payment: coerceAmount(source?.account_summary?.minimum_payment),
      payment_due_date: source?.account_summary?.payment_due_date ?? null,
      credit_limit: coerceAmount(source?.account_summary?.credit_limit),
      available_credit: coerceAmount(source?.account_summary?.available_credit),
    },
    transactions: normalizedTransactions,
    extraction_quality: {
      confidence,
      missing_fields: Array.isArray(source?.extraction_quality?.missing_fields)
        ? source.extraction_quality.missing_fields.map((v: any) => String(v))
        : fallback.extraction_quality.missing_fields,
      warnings,
      needs_review: needsReview,
    },
  };
}

export async function runByteWorkerExtraction(input: {
  documentText: string;
  filename?: string | null;
  docId?: string | null;
  ctx?: any;
}): Promise<any> {
  const openai = getOpenAiClient();
  if (!openai) {
    return buildByteWorkerFallbackOutput(input.ctx || null, "openai_unavailable", 1);
  }

  const model = "gpt-4o-mini";
  const baseDocumentPayload = {
    document_text: String(input.documentText || "No document_text provided."),
    filename: input.filename || null,
    doc_id: input.docId || null,
  };

  try {
    const structureCompletion = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: BYTE_WORKER_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ task: "structure_pass", output_focus: ["doc_type", "institution", "statement_period", "currency", "pages_detected", "account_summary", "extraction_quality"], ...baseDocumentPayload }) },
      ],
      max_tokens: 1600,
    });
    const structureText = structureCompletion.choices?.[0]?.message?.content;
    const structureParsed = typeof structureText === "string" ? JSON.parse(structureText) : {};

    const rowCompletion = await openai.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: BYTE_WORKER_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            task: "row_pass",
            output_focus: ["transactions", "extraction_quality"],
            structure_context: {
              doc_type: structureParsed?.doc_type ?? null,
              institution: structureParsed?.institution ?? null,
              statement_period: structureParsed?.statement_period ?? null,
              currency: structureParsed?.currency ?? null,
              pages_detected: structureParsed?.pages_detected ?? [],
              account_summary: structureParsed?.account_summary ?? {},
            },
            ...baseDocumentPayload,
          }),
        },
      ],
      max_tokens: 2200,
    });
    const rowText = rowCompletion.choices?.[0]?.message?.content;
    const rowParsed = typeof rowText === "string" ? JSON.parse(rowText) : {};

    const merged = {
      doc_type: structureParsed?.doc_type ?? "unknown",
      institution: structureParsed?.institution ?? null,
      statement_period: structureParsed?.statement_period ?? null,
      currency: structureParsed?.currency ?? "CAD",
      pages_detected: structureParsed?.pages_detected ?? [],
      account_summary: structureParsed?.account_summary ?? {},
      transactions: rowParsed?.transactions ?? [],
      extraction_quality: { ...(structureParsed?.extraction_quality || {}), ...(rowParsed?.extraction_quality || {}) },
    };
    return normalizeByteWorkerOutput(merged, input.ctx || null, 1);
  } catch (error: any) {
    return buildByteWorkerFallbackOutput(input.ctx || null, error?.message || "byte_two_pass_failed", 1);
  }
}

