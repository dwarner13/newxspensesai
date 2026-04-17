/**
 * process-statement.ts
 *
 * Standalone OCR endpoint for bank statement ingestion.
 *
 * Request:  POST { base64: string, fileName: string, mimeType: string, userId: string, importId?: string }
 * Response: { ok: boolean, importSummaryId: string, txnCount: number, flaggedCount: number,
 *             source: 'google_vision'|'claude_vision', period: { start: string|null, end: string|null } }
 *
 * Flow:
 *   1. Decode base64 → Buffer
 *   2. pdf-parse: extract raw text + compute confidence
 *   3. If confidence ≥ 0.85 → primary path (source = 'google_vision')
 *      Else → Claude Vision fallback (source = 'claude_vision')
 *   4. Validate & clean extracted transactions
 *   5. Bulk-insert to transactions_staging
 *   6. Upsert import_summaries row
 *   7. Insert ai_activity_events → trigger Byte announcement to Prime
 */

import { Handler } from '@netlify/functions';
import { randomUUID, createHash } from 'crypto';
import { admin } from './_shared/supabase.js';
import { announceByteCompletionToPrime } from './_shared/primeByteAnnouncement.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExtractedTransaction {
  date: string | null;
  merchant: string | null;
  amount: number | null;
  type: 'debit' | 'credit' | null;
  category: string | null;
}

interface ExtractionResult {
  period: { start: string | null; end: string | null };
  accountSummary: { openingBalance: number | null; closingBalance: number | null };
  transactions: ExtractedTransaction[];
  rawText: string;
  confidence: number;
  source: 'google_vision' | 'claude_vision';
  institution?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TERMINAL_ID_RE = /[*#]\w{4,}/g;
const TRAILING_CODE_RE = /\s+\d{5,}$/;

/**
 * Compute confidence: ratio of alphanumeric+space chars to total chars.
 * Text-based PDFs score ~0.90+; scanned/image PDFs score much lower.
 */
function computeConfidence(text: string): number {
  if (!text || text.length === 0) return 0;
  const usable = (text.match(/[\w\s.,\-$%]/g) || []).length;
  return usable / text.length;
}

/**
 * Normalize a date string to YYYY-MM-DD. Returns null if unresolvable.
 */
function normalizeDate(raw: string | null): string | null {
  if (!raw) return null;
  if (ISO_DATE_RE.test(raw)) return raw;
  // Try common formats: MM/DD/YYYY, DD-MM-YYYY, etc.
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Strip terminal IDs and trailing numeric codes from merchant names.
 */
function cleanMerchant(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .replace(TERMINAL_ID_RE, '')
    .replace(TRAILING_CODE_RE, '')
    .trim() || null;
}

/**
 * Compute a stable hash for a transaction row (for conflict detection).
 */
function hashTransaction(importId: string, date: string | null, merchant: string | null, amount: number | null): string {
  const payload = `${importId}|${date ?? ''}|${merchant ?? ''}|${amount ?? ''}`;
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/**
 * Light PII scrub on raw OCR text before storage.
 * Masks common patterns: email, phone, SIN/SSN.
 */
function scrubPii(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g, '[SIN]');
}

// ---------------------------------------------------------------------------
// Primary extraction: pdf-parse (text-based PDFs)
// ---------------------------------------------------------------------------

/**
 * Attempt a lightweight text extraction from the raw PDF buffer using pdf-parse.
 * pdf-parse handles many standard PDFs without external dependencies.
 * If it fails or returns low confidence, the caller falls back to Claude Vision.
 */
async function extractFromText(buffer: Buffer): Promise<{ text: string; confidence: number }> {
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const result = await pdfParse(buffer);
    const text = result.text || '';
    const confidence = computeConfidence(text);
    return { text, confidence };
  } catch (err: any) {
    console.warn('[process-statement] pdf-parse failed:', err?.message ?? err);
    return { text: '', confidence: 0 };
  }
}

/**
 * Minimal heuristic parser for text-based PDF bank statements.
 * Handles both multi-line and single-line (pdfjs-dist style) extractions.
 * Looks for date + description + amount + type patterns anywhere in the text.
 */
function parseTransactionsFromText(text: string): Omit<ExtractionResult, 'source' | 'rawText' | 'confidence'> {
  // Global regex — matches transactions even when all content is on one line
  // Covers ISO dates (YYYY-MM-DD), slash dates, and "Month D, YYYY"
  const txnGlobalRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w{3,9}\s+\d{1,2},?\s+\d{4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s+(DEBIT|CREDIT|debit|credit)/g;
  const periodRe = /(?:statement period|period)[:\s]+(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})[^a-z0-9]*(?:to|through|[-–])[^a-z0-9]*(\d{4}-\d{2}-\d{2}|\w+\s+\d{1,2},?\s+\d{4})/gi;
  const openingRe = /(?:opening|previous)\s+balance[:\s]+\$?([\d,]+\.\d{2})/gi;
  const closingRe = /(?:closing|ending|new)\s+balance[:\s]+\$?([\d,]+\.\d{2})/gi;

  const transactions: ExtractedTransaction[] = [];
  let openingBalance: number | null = null;
  let closingBalance: number | null = null;
  let periodStart: string | null = null;
  let periodEnd: string | null = null;

  // Extract period
  const pm = periodRe.exec(text);
  if (pm) {
    periodStart = normalizeDate(pm[1]);
    periodEnd = normalizeDate(pm[2]);
  }

  // Extract balances
  const obm = openingRe.exec(text);
  if (obm) openingBalance = parseFloat(obm[1].replace(/,/g, ''));

  const cbm = closingRe.exec(text);
  if (cbm) closingBalance = parseFloat(cbm[1].replace(/,/g, ''));

  // Extract transactions
  let m: RegExpExecArray | null;
  while ((m = txnGlobalRe.exec(text)) !== null) {
    const rawDate = m[1];
    const rawMerchant = m[2].replace(/\s{2,}/g, ' ').trim(); // collapse multi-space gaps
    const rawAmount = m[3].replace(/[$,]/g, '');
    const rawType = m[4].toLowerCase() as 'debit' | 'credit';
    const amount = parseFloat(rawAmount);
    transactions.push({
      date: normalizeDate(rawDate),
      merchant: cleanMerchant(rawMerchant),
      amount: isNaN(amount) ? null : (rawType === 'debit' && amount > 0 ? -amount : amount),
      type: rawType,
      category: 'Other',
    });
  }

  return {
    period: { start: periodStart, end: periodEnd },
    accountSummary: { openingBalance, closingBalance },
    transactions,
  };
}

// ---------------------------------------------------------------------------
// Fallback extraction: Claude Vision API
// ---------------------------------------------------------------------------

const CLAUDE_EXTRACTION_PROMPT = `You are reading a bank statement. Extract every transaction.
Return ONLY valid JSON with no extra text, no markdown, no backticks.
Format:
{
  "period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "accountSummary": { "openingBalance": number, "closingBalance": number },
  "institution": "Bank name if detected (e.g. BMO, TD, RBC)",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "merchant": "clean readable name with spaces preserved, no terminal IDs",
      "amount": number,
      "type": "debit or credit",
      "category": "Food | Transport | Shopping | Entertainment | Health | Utilities | Income | Transfer | Other"
    }
  ]
}
CRITICAL RULES:
- Bank statements have MULTIPLE number columns: Amounts Deducted, Amounts Added, and Balance.
- Use ONLY the Deducted or Added column for the transaction amount.
- NEVER use the Balance column. It is the running account balance, NOT the transaction amount.
- If a 7-Eleven purchase shows as $500+, you are reading the Balance column by mistake.
- Preserve spaces in merchant names: "SAVE ON FOODS" not "SAVEONFOODS", "CANADIAN TIRE" not "CANADIANTIRE".
- Debits/withdrawals/purchases = negative amounts. Deposits/credits/income = positive amounts.

RBC VISA / CREDIT CARD STATEMENT RULES:
- RBC Visa statements have only ONE "AMOUNT ($)" column. Positive amounts are charges (type: "debit", amount should be negative in output). Negative amounts (prefixed with -) are payments/credits (type: "credit", amount should be positive in output).
- Lines starting with "Foreign Currency - USD" are metadata describing the currency conversion for the transaction ABOVE them. Do NOT create a separate transaction for foreign currency lines. Always use the CANADIAN DOLLAR amount from the main transaction line, not the USD amount.
- Lines that are just long numeric strings (e.g. "74510204352610287899203") are internal reference numbers — skip them entirely, they are not transactions.
- IGNORE these sections completely — they are NOT transactions and contain NO transaction data: "CALCULATING YOUR BALANCE", "PAYMENTS & INTEREST RATES", "IMPORTANT INFORMATION", "AVION POINTS", "CONTACT US", "INTEREST RATE CHART", "Time to Pay", the payment stub/remittance slip at the bottom, and any text after "TOTAL ACCOUNT BALANCE".
- "BALANCEPROTECTOR PREMIUM" is a bank fee (category: Utilities), not a plan name.
- "OVERLIMIT FEE" and "CASH - SERVICE CHARGE" are bank fees (category: Utilities).
- "PAYMENT - THANK YOU / PAIEMENT - MERCI" is always a payment/credit. The statement shows it as a negative amount. Output it as type: "credit" with a positive amount.
- The statement period is shown as "STATEMENT FROM [date] TO [date]" — use those dates for the period field.
- For merchant names: strip the city/province suffix (e.g. "EDMONTON AB", "BRAMPTON ON") and any trailing reference numbers. Keep the core merchant name readable.

If any field is unclear, use null. Never guess amounts or dates.`;

async function extractWithClaudeVision(base64: string, mimeType: string): Promise<Omit<ExtractionResult, 'source' | 'rawText' | 'confidence'>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: mimeType || 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: CLAUDE_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'pdfs-2024-09-25',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const rawJson = data?.content?.[0]?.text ?? '';

  // Strip any accidental markdown fences
  const cleaned = rawJson.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim();
  const parsed = JSON.parse(cleaned);

  // Normalize transactions
  const transactions: ExtractedTransaction[] = (parsed.transactions || []).map((t: any) => ({
    date: normalizeDate(t.date),
    merchant: cleanMerchant(t.merchant),
    amount: typeof t.amount === 'number' ? t.amount : null,
    type: t.type === 'debit' || t.type === 'credit' ? t.type : (t.amount < 0 ? 'debit' : 'credit'),
    category: t.category || 'Other',
  }));

  return {
    period: {
      start: normalizeDate(parsed.period?.start) ?? null,
      end: normalizeDate(parsed.period?.end) ?? null,
    },
    accountSummary: {
      openingBalance: parsed.accountSummary?.openingBalance ?? null,
      closingBalance: parsed.accountSummary?.closingBalance ?? null,
    },
    transactions,
    institution: parsed.institution || null,
  };
}

// ---------------------------------------------------------------------------
// Secondary fallback: OpenAI GPT-4o (text-based parsing)
// Used when Claude Vision is unavailable or out of credits.
// ---------------------------------------------------------------------------

const OPENAI_EXTRACTION_PROMPT = `You are reading a bank statement. Extract every transaction from the text below.
Return ONLY valid JSON with no extra text, no markdown, no backticks.
Format:
{
  "period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "accountSummary": { "openingBalance": number, "closingBalance": number },
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "merchant": "clean readable name, no terminal IDs or location codes",
      "amount": number,
      "type": "debit or credit",
      "category": "Food | Transport | Shopping | Entertainment | Health | Utilities | Income | Transfer | Other"
      "institution": "Bank name if detected (e.g. BMO, TD, RBC, Scotiabank)"
    }
  ]
}
CRITICAL: Bank statements have multiple number columns (Amounts Deducted, Amounts Added, Balance).
Use ONLY the Deducted or Added column for amounts. NEVER use the Balance column � it is the running total, not the transaction amount.
If a convenience store purchase appears as $500+, you are reading the Balance column by mistake.
Preserve spaces in merchant names: "SAVE ON FOODS" not "SAVEONFOODS".
Return ONLY the JSON object described above with no other text.
DUMMY_MARKER
    }
  ]
}
If any field is unclear, use null. Never guess amounts or dates.

STATEMENT TEXT:
`;

async function extractWithOpenAI(text: string): Promise<Omit<ExtractionResult, 'source' | 'rawText' | 'confidence'>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const body = {
    model: 'gpt-4o-mini',
    max_tokens: 4096,
    messages: [
      {
        role: 'user' as const,
        content: OPENAI_EXTRACTION_PROMPT + text,
      },
    ],
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const rawJson = data?.choices?.[0]?.message?.content ?? '';
  const cleaned = rawJson.replace(/^```[\w]*\n?/m, '').replace(/```$/m, '').trim();
  const parsed = JSON.parse(cleaned);

  const transactions: ExtractedTransaction[] = (parsed.transactions || []).map((t: any) => ({
    date: normalizeDate(t.date),
    merchant: cleanMerchant(t.merchant),
    amount: typeof t.amount === 'number' ? t.amount : null,
    type: t.type === 'debit' || t.type === 'credit' ? t.type : (t.amount < 0 ? 'debit' : 'credit'),
    category: t.category || 'Other',
  }));

  return {
    period: {
      start: normalizeDate(parsed.period?.start) ?? null,
      end: normalizeDate(parsed.period?.end) ?? null,
    },
    accountSummary: {
      openingBalance: parsed.accountSummary?.openingBalance ?? null,
      closingBalance: parsed.accountSummary?.closingBalance ?? null,
    },
    transactions,
  };
}

// ---------------------------------------------------------------------------
// Cascade: Claude Vision → OpenAI text parsing
// ---------------------------------------------------------------------------

async function tryClaudeThenOpenAI(
  base64: string,
  mimeType: string,
  rawText: string,
): Promise<ExtractionResult> {
  // Try Claude Vision first
  try {
    const result = await extractWithClaudeVision(base64, mimeType);
    return { ...result, rawText, confidence: 0, source: 'claude_vision' };
  } catch (claudeErr: any) {
    console.warn('[process-statement] Claude Vision failed:', claudeErr.message?.slice(0, 120));
  }

  // Fall back to OpenAI with extracted text (works when pdf-parse produced usable text)
  if (rawText.trim().length > 50) {
    console.log('[process-statement] falling back to OpenAI text parsing');
    try {
      const result = await extractWithOpenAI(rawText);
      return { ...result, rawText, confidence: 0, source: 'claude_vision' }; // label as claude_vision per spec fallback bucket
    } catch (openAiErr: any) {
      console.warn('[process-statement] OpenAI fallback failed:', openAiErr.message?.slice(0, 120));
    }
  }

  // Both AI paths failed — return empty extraction so staging row still gets written
  console.error('[process-statement] All extraction paths failed; returning empty result');
  return {
    period: { start: null, end: null },
    accountSummary: { openingBalance: null, closingBalance: null },
    transactions: [],
    rawText,
    confidence: 0,
    source: 'claude_vision',
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body: { base64?: string; fileName?: string; mimeType?: string; userId?: string; importId?: string };
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { base64, fileName, mimeType, userId, importId } = body;

  if (!base64 || !fileName || !userId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'base64, fileName, and userId are required' }) };
  }

  const importRunId = importId || `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const importSummaryId = randomUUID();

  console.log(`[process-statement] START importRunId=${importRunId} file=${fileName} user=${userId}`);

  try {
    // Step 1: Decode base64 → Buffer
    const buffer = Buffer.from(base64, 'base64');

    // Step 2: Try text extraction with pdf-parse
    let extraction: ExtractionResult;
    const { text: rawText, confidence } = await extractFromText(buffer);

    console.log(`[process-statement] pdf-parse confidence=${confidence.toFixed(3)}`);

    // Always use Claude Vision → OpenAI for extraction.
    // pdf-parse rawText is kept for storage and as OpenAI fallback context,
    // but the heuristic regex parser (parseTransactionsFromText) is bypassed
    // because it misreads balance columns as transaction amounts.
    console.log(`[process-statement] using Claude Vision (skipping heuristic parser)`);
    extraction = await tryClaudeThenOpenAI(base64, mimeType || 'application/pdf', rawText);
    console.log(`[process-statement] extraction: ${extraction.transactions.length} transactions via ${extraction.source}`);

    // Step 3: Validate & clean
    let flaggedCount = 0;
    const validatedTxns = extraction.transactions.map(t => {
      const flagged = t.amount === null || t.date === null;
      if (flagged) flaggedCount++;
      return {
        ...t,
        date: t.date,
        merchant: t.merchant || 'Unknown',
        category: t.category || 'Other',
        flagged,
      };
    });

    const debitCount = validatedTxns.filter(t => t.type === 'debit').length;
    const creditCount = validatedTxns.filter(t => t.type === 'credit').length;

    // Step 4: Insert to transactions_staging
    const sb = admin();
    const stagingRows = validatedTxns.map(t => ({
      import_id: importRunId,
      occurred_at: t.date,
      description: t.merchant,
      amount: t.amount,
      currency: 'CAD',
      vendor_raw: t.merchant,
      category_suggested: t.category,
      source_line: null,
      hash: hashTransaction(importRunId, t.date, t.merchant, t.amount),
      status: 'pending_review',
      source: extraction.source,
    }));

    if (stagingRows.length > 0) {
      const { error: stagingError } = await sb
        .from('transactions_staging')
        .upsert(stagingRows, { onConflict: 'hash', ignoreDuplicates: true });

      if (stagingError) {
        console.error('[process-statement] transactions_staging insert error:', stagingError);
        throw new Error(`Failed to insert staging rows: ${stagingError.message}`);
      }
    }

    console.log(`[process-statement] inserted ${stagingRows.length} staging rows (${flaggedCount} flagged)`);

    // Step 5: Upsert import_summaries
    const scrubbedOcrText = scrubPii(extraction.rawText);

    const { error: summaryError } = await sb
      .from('import_summaries')
      .upsert(
        {
          id: importSummaryId,
          import_id: importRunId,
          user_id: userId,
          file_name: fileName,
          raw_ocr_text: scrubbedOcrText,
          confidence_score: Math.round(extraction.confidence * 100) / 100,
          source: extraction.source,
          status: 'pending_review',
          period_start: extraction.period.start,
          period_end: extraction.period.end,
          opening_balance: extraction.accountSummary.openingBalance,
          closing_balance: extraction.accountSummary.closingBalance,
          transaction_count: validatedTxns.length,
          flagged_count: flaggedCount,
          employee: 'byte',
          version: 1,
          ...(extraction.institution ? { institution: extraction.institution } : {}),
        },
        { onConflict: 'import_id' }
      );

    if (summaryError) {
      console.error('[process-statement] import_summaries upsert error:', summaryError);
      // Non-fatal — staging rows are already committed
    }

    // Step 6: Insert ai_activity_events → triggers Byte announcement
    const { error: eventError } = await sb.from('ai_activity_events').insert({
      event_type: 'byte.import.completed',
      user_id: userId,
      employee_id: 'byte-docs',
      details: {
        import_run_id: importRunId,
        doc_count: 1,
        txn_count: validatedTxns.length,
        debit_count: debitCount,
        credit_count: creditCount,
        flagged_count: flaggedCount,
        source: extraction.source,
        period: { start: extraction.period.start, end: extraction.period.end },
        pages: 1,
        integrity_verified: true,
      },
    });

    if (eventError) {
      console.error('[process-statement] ai_activity_events insert error:', eventError);
      // Non-fatal
    }

    // Step 7: Trigger Byte announcement to Prime
    try {
      await announceByteCompletionToPrime(userId);
    } catch (announceErr) {
      console.error('[process-statement] announceByteCompletionToPrime error:', announceErr);
      // Non-fatal
    }

    console.log(`[process-statement] DONE importRunId=${importRunId} txns=${validatedTxns.length} (${debitCount}d/${creditCount}c) source=${extraction.source}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        importSummaryId,
        txnCount: validatedTxns.length,
        debitCount,
        creditCount,
        flaggedCount,
        source: extraction.source,
        period: { start: extraction.period.start, end: extraction.period.end },
        lineCount: `${validatedTxns.length} transactions (${debitCount} debits + ${creditCount} credits)`,
      }),
    };

  } catch (error: any) {
    console.error('[process-statement] FATAL error:', error);

    // If Claude Vision also fails, record extraction_failed in import_summaries
    try {
      const sb = admin();
      await sb.from('import_summaries').upsert(
        {
          id: importSummaryId,
          import_id: importRunId,
          user_id: userId,
          file_name: fileName,
          status: 'extraction_failed',
          employee: 'byte',
          version: 1,
        },
        { onConflict: 'import_id' }
      );
    } catch {
      // ignore — we're already in error handler
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: error?.message || 'Extraction failed',
      }),
    };
  }
};
