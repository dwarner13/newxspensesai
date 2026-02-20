import OpenAI from "openai";

export const TAG_WORKER_SYSTEM_PROMPT = `ROLE
You are TAG, the financial categorization worker for the Prime orchestration system.
You DO NOT talk directly to the user.
You output structured data only for Prime/Crystal.

GOAL
Given statement-like transactions and summary context:
1) Categorize each transaction.
2) Mark spend vs non-spend accurately.
3) Produce category totals and practical highlights.
4) Return a Prime-ready summary block.
5) Never return empty output.

CRITICAL RULES
- Never hallucinate transactions; only categorize rows provided in input.
- Transfers and payments must NOT be counted as spending.
- Bank/credit card payments reduce liabilities, not expenses.
- ATM withdrawals are non-spend unless evidence clearly indicates direct spending.
- Always output JSON only. No conversational text.

CATEGORIES TO USE
Income
Transfer
Bank Fee
Credit Card Payment
Subscription
Software/AI
Fitness/Health
Retail
Groceries
Dining
Cash Withdrawal
Insurance
Utilities
Other

TAX HINT VALUES
business_possible
personal_likely
transfer
unknown

OUTPUT FORMAT (STRICT JSON ONLY)
{
  "statement_type": "bank_statement|credit_card_statement|receipt|invoice|unknown",
  "statement_period": "string|null",
  "pages_detected": [
    { "page_index": number, "page_kind": "summary|transactions|legal/info|unknown", "notes": "string" }
  ],
  "account_summary": {
    "opening_balance": number|null,
    "closing_balance": number|null,
    "total_deposits": number|null,
    "total_withdrawals": number|null
  },
  "transactions": [
    {
      "date": "YYYY-MM-DD"|null,
      "description_raw": "string",
      "merchant_normalized": "string|null",
      "amount": number|null,
      "direction": "debit"|"credit"|null,
      "category": "string",
      "subcategory": "string|null",
      "is_spend": true|false,
      "tax_hint": "business_possible|personal_likely|transfer|unknown",
      "confidence": number,
      "needs_review": true|false,
      "reason": "short explanation"
    }
  ],
  "category_totals": [
    { "category": "string", "total": number, "count": number }
  ],
  "highlights": {
    "flags": ["string"]
  },
  "prime_ready_summary": {
    "one_paragraph": "string",
    "next_actions": ["string"]
  }
}`;

const TAG_ALLOWED_CATEGORIES = new Set([
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

function getOpenAiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export function buildTagWorkerFallbackOutput(_ctx: any, reason: string): any {
  return {
    statement_type: "unknown",
    statement_period: null,
    pages_detected: [],
    account_summary: {
      opening_balance: null,
      closing_balance: null,
      total_deposits: null,
      total_withdrawals: null,
    },
    transactions: [],
    category_totals: [],
    highlights: {
      flags: ["missing_data", `fallback:${reason}`],
    },
    prime_ready_summary: {
      one_paragraph: "Categorization output is incomplete and needs review before financial decisions.",
      next_actions: [
        "Re-run categorization with cleaner extraction input.",
        "Review transfer/payment rows and mark non-spend accurately.",
        "Confirm statement period and totals before final summary.",
      ],
    },
  };
}

function coerceNumber(value: any): number | null {
  if (value === null || typeof value === "undefined") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[,$\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeConfidence(value: any): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0.5;
  return Math.max(0, Math.min(1, num));
}

function inferTransferOrPayment(description: string): boolean {
  return /\b(e-?transfer|transfer|payment|online banking|bill payment|cc payment|credit card payment)\b/i.test(description);
}

function inferCashWithdrawal(description: string): boolean {
  return /\b(atm|withdrawal)\b/i.test(description);
}

export function normalizeTagWorkerOutput(raw: any, ctx?: any): any {
  const fallback = buildTagWorkerFallbackOutput(ctx || null, "normalize_fallback");
  const source = raw && typeof raw === "object" ? raw : fallback;
  const txns = Array.isArray(source.transactions) ? source.transactions : [];

  const normalizedTransactions = txns.map((t: any) => {
    const descriptionRaw = String(t?.description_raw || t?.description || "").trim();
    const normalizedCategory = TAG_ALLOWED_CATEGORIES.has(String(t?.category || ""))
      ? String(t.category)
      : "Other";
    let isSpend = Boolean(t?.is_spend);
    const transferLike = inferTransferOrPayment(descriptionRaw);
    const cashLike = inferCashWithdrawal(descriptionRaw);

    if (transferLike && (normalizedCategory === "Transfer" || normalizedCategory === "Credit Card Payment")) {
      isSpend = false;
    }
    if (cashLike && normalizedCategory === "Cash Withdrawal") {
      isSpend = false;
    }

    const amount = coerceNumber(t?.amount);
    const direction = t?.direction === "debit" || t?.direction === "credit" ? t.direction : null;
    const needsReview = Boolean(t?.needs_review) || (amount === null && !Boolean(t?.needs_review));
    const reason = String(t?.reason || (needsReview ? "needs manual review" : "categorized"));

    return {
      date: t?.date ?? null,
      description_raw: descriptionRaw,
      merchant_normalized: t?.merchant_normalized ?? null,
      amount,
      direction,
      category: normalizedCategory,
      subcategory: t?.subcategory ?? null,
      is_spend: isSpend,
      tax_hint: ["business_possible", "personal_likely", "transfer", "unknown"].includes(String(t?.tax_hint))
        ? String(t.tax_hint)
        : "unknown",
      confidence: normalizeConfidence(t?.confidence),
      needs_review: needsReview,
      reason,
    };
  }).filter((t: any) => t.description_raw.length > 0 || t.amount !== null);

  const categoryTotalsInput = Array.isArray(source.category_totals) ? source.category_totals : [];
  const categoryTotals = categoryTotalsInput.map((c: any) => ({
    category: TAG_ALLOWED_CATEGORIES.has(String(c?.category || "")) ? String(c.category) : "Other",
    total: Number(coerceNumber(c?.total) || 0),
    count: Number(coerceNumber(c?.count) || 0),
  }));

  const fallbackActions = fallback.prime_ready_summary.next_actions;
  let nextActions = Array.isArray(source?.prime_ready_summary?.next_actions)
    ? source.prime_ready_summary.next_actions.map((v: any) => String(v)).filter(Boolean)
    : fallbackActions;
  if (nextActions.length < 3) {
    nextActions = [...nextActions, ...fallbackActions].slice(0, 3);
  } else if (nextActions.length > 6) {
    nextActions = nextActions.slice(0, 6);
  }

  return {
    statement_type: ["bank_statement", "credit_card_statement", "receipt", "invoice", "unknown"].includes(String(source.statement_type))
      ? String(source.statement_type)
      : "unknown",
    statement_period: source.statement_period ?? null,
    pages_detected: Array.isArray(source.pages_detected) ? source.pages_detected : [],
    account_summary: {
      opening_balance: coerceNumber(source?.account_summary?.opening_balance),
      closing_balance: coerceNumber(source?.account_summary?.closing_balance),
      total_deposits: coerceNumber(source?.account_summary?.total_deposits),
      total_withdrawals: coerceNumber(source?.account_summary?.total_withdrawals),
    },
    transactions: normalizedTransactions,
    category_totals: categoryTotals,
    highlights: {
      flags: Array.isArray(source?.highlights?.flags)
        ? source.highlights.flags.map((v: any) => String(v))
        : ["missing_data"],
    },
    prime_ready_summary: {
      one_paragraph: String(source?.prime_ready_summary?.one_paragraph || fallback.prime_ready_summary.one_paragraph),
      next_actions: nextActions,
    },
  };
}

export function validateTagWorkerOutput(output: any): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredTopLevel = [
    "statement_type",
    "statement_period",
    "transactions",
    "category_totals",
    "highlights",
    "prime_ready_summary",
  ];
  for (const key of requiredTopLevel) {
    if (!Object.prototype.hasOwnProperty.call(output || {}, key)) {
      errors.push(`missing_key:${key}`);
    }
  }
  if (!Array.isArray(output?.transactions)) {
    errors.push("transactions_not_array");
  }
  if (!Array.isArray(output?.category_totals)) {
    errors.push("category_totals_not_array");
  }
  if (!Array.isArray(output?.highlights?.flags)) {
    errors.push("highlights.flags_not_array");
  }
  if (!String(output?.prime_ready_summary?.one_paragraph || "").trim()) {
    errors.push("prime_ready_summary.one_paragraph_empty");
  }
  const actions = Array.isArray(output?.prime_ready_summary?.next_actions)
    ? output.prime_ready_summary.next_actions
    : [];
  if (actions.length < 3 || actions.length > 6) {
    errors.push("prime_ready_summary.next_actions_out_of_range");
  }
  return { ok: errors.length === 0, errors };
}

export async function runTagWorkerCategorization(input: any, ctx?: any): Promise<any> {
  const openai = getOpenAiClient();
  if (!openai) {
    return buildTagWorkerFallbackOutput(ctx || null, "openai_unavailable");
  }
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" } as any,
      messages: [
        { role: "system", content: TAG_WORKER_SYSTEM_PROMPT },
        { role: "user", content: typeof input === "string" ? input : JSON.stringify(input) },
      ],
      max_tokens: 2200,
    });
    const content = completion.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? JSON.parse(content) : {};
    const normalized = normalizeTagWorkerOutput(parsed, ctx);
    const validation = validateTagWorkerOutput(normalized);
    if (!validation.ok) {
      const fallback = buildTagWorkerFallbackOutput(ctx || null, "validation_failed");
      fallback.highlights.flags = [...fallback.highlights.flags, ...validation.errors];
      return fallback;
    }
    return normalized;
  } catch (error: any) {
    return buildTagWorkerFallbackOutput(ctx || null, error?.message || "tag_worker_error");
  }
}

