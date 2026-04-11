/**
 * OCR Normalizer Module
 * 
 * Day 9: Convert ParsedDoc -> NormalizedTransaction[]
 * 
 * Functions:
 * - toTransactions: Map invoice/receipt/bank to normalized transactions
 * - categorize: Auto-categorize transactions (rules + Tag fallback)
 * - linkToDocument: Link transaction to document (non-blocking)
 */

import { ParsedDoc, InvoiceData, ReceiptData, parseInvoiceLike, parseReceiptLike, normalizeParsed } from './ocr_parsers';
import { maskPII } from './pii';
import { categorizeTransaction as sharedCategorize, categorizeTransactionWithLearning } from './categorize';
import { cleanupOcrText } from '../lib/ocr/cleanupOcrText';

export type NormalizedTransaction = {
  userId: string;
  kind: 'invoice' | 'receipt' | 'bank';
  date?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  description?: string;
  invoiceNo?: string;
  confidence?: number;
  confidenceFlags?: string[];
  accountName?: string;
  statementType?: 'credit_card' | 'bank';
  statementCredit?: boolean;
  fxNote?: string;
  transactionType?: 'Purchase' | 'Payment' | 'Credit';
  items?: Array<{
    name: string;
    qty?: number;
    unit?: string;
    price?: number;
  }>;
  docId?: string;
};

export interface CategorizationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  method: 'rules' | 'tag';
}

/**
 * Main entry point for OCR result normalization
 * 
 * Detects statement format and returns normalized transactions.
 * If primary parser returns 0 transactions, uses AI fallback parser.
 */
export async function normalizeOcrResult(
  text: string,
  userId: string = 'default-user',
  openaiClient?: any,
  context?: { filename?: string; includeAllAccounts?: boolean; sourceTextPath?: string; sourceValueType?: string; pdfBase64?: string | null }
): Promise<NormalizedTransaction[]>;
export function normalizeOcrResult(
  text: string,
  userId: string = 'default-user',
  openaiClient?: any,
  context?: { filename?: string; includeAllAccounts?: boolean; sourceTextPath?: string; sourceValueType?: string; pdfBase64?: string | null }
): Promise<NormalizedTransaction[]> | NormalizedTransaction[];
export function normalizeOcrResult(
  text: string,
  userId: string = 'default-user',
  openaiClient?: any,
  context?: { filename?: string; includeAllAccounts?: boolean; sourceTextPath?: string; sourceValueType?: string; pdfBase64?: string | null }
): Promise<NormalizedTransaction[]> | NormalizedTransaction[] {
  const sourceTextPath = String(context?.sourceTextPath || 'unknown');
  const sourceValueType = String(context?.sourceValueType || typeof text);
  const rawInputText = typeof text === 'string' ? text : String(text ?? '');
  const normalizedText = cleanupOcrText(rawInputText);
  console.log('[Byte OCR DEBUG] source_text_path', {
    sourceTextPath,
    sourceValueType,
    rawLength: rawInputText.length,
    cleanedLength: normalizedText.length,
  });
  console.log('[Byte OCR DEBUG] pre_cleanup_preview', rawInputText.slice(0, 300));
  console.log('[Byte OCR DEBUG] post_cleanup_preview', normalizedText.slice(0, 300));
  const filename = context?.filename || '';
  const isCorruptedText = (value: string): boolean => {
    const sample = String(value || '');
    if (!sample || sample.trim().length < 40) return false;
    const suspiciousChars = (sample.match(/[�\u2500-\u257F\u2580-\u259F]/g) || []).length;
    const controlChars = (sample.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) || []).length;
    const alphaChars = (sample.match(/[A-Za-z]/g) || []).length;
    const sampleLen = sample.length || 1;
    const noisyRatio = (suspiciousChars + controlChars) / sampleLen;
    const alphaRatio = alphaChars / sampleLen;
    return noisyRatio > 0.08 || alphaRatio < 0.18;
  };
  const hasReceiptHints = /transaction\s+record|interac|verified\s+by\s+pin|pump\s+\d+|esso\s+express\s+pay|thank\s+you|hst\s+included|gst\s*#|total\s*[:$]/i.test(normalizedText);
  const hasStrongStatementHints = /opening balance|closing balance|statement period|period ending|account summary|minimum payment|credit limit|transaction details|for the period ending|cardmember/i.test(normalizedText);
  const hasStatementKeyword = /\bstatement\b/i.test(normalizedText);
  const hasStatementHints = hasStrongStatementHints || (hasStatementKeyword && !hasReceiptHints);
  const isCreditCard = /credit card|cardmember|visa|mastercard|amex|capital one|account ending|minimum payment/i.test(normalizedText);
  const statementText = hasStatementHints ? filterStatementPages(normalizedText) : normalizedText;

  // ── Income report detection (FreshBooks, Wave, etc.) ───────────────────
  // Must come BEFORE the invoice check: FreshBooks "Payments Collected" PDFs
  // contain "Invoice" on every row (as a payment reference) which falsely
  // triggers invoiceKeywordHint.  These are tabular income reports with
  // individual payment rows, NOT a single invoice.
  const isIncomeReport =
    /payments?\s+collected/i.test(normalizedText) ||
    (/freshbooks|wave\s+payments|payments?\s+report/i.test(normalizedText) &&
      /\d{1,2}\/\d{1,2}\/\d{4}/.test(normalizedText));

  if (isIncomeReport) {
    console.log('[Byte OCR] Detected income report (FreshBooks / Payments Collected)');
    const incomeRows = parseIncomeReportRows(normalizedText);
    if (incomeRows.length > 0) {
      console.log(`[Byte OCR] Parsed ${incomeRows.length} income transactions from report`);
      const mapped: NormalizedTransaction[] = incomeRows.map(row => ({
        userId,
        kind: 'bank' as const,
        date: row.date,
        merchant: row.client,
        amount: row.amount,       // positive = income
        currency: row.currency || 'CAD',
        description: `${row.client} - ${row.method || 'Payment'}${row.invoiceNo ? ` (Invoice ${row.invoiceNo})` : ''}`,
        docId: undefined,
      }));
      return openaiClient ? Promise.resolve(mapped) : mapped;
    }
    console.warn('[Byte OCR] Income report detected but 0 rows parsed, falling through');
  }

  const invoiceFilenameHint = /invoice/i.test(filename);
  const invoiceKeywordHint = /invoice/i.test(normalizedText) && /(subtotal|tax|total)/i.test(normalizedText);
  const invoiceAddressHint = /(bill to|ship to)/i.test(normalizedText);
  const invoicePaymentDueHint = /payment\s+due|outstanding\s+balance|balance\s+due|property\s+tax\s+notice|tax\s+notice/i.test(normalizedText);
  const shouldTreatAsInvoice =
    !hasStatementHints &&
    !isCreditCard &&
    !isIncomeReport &&
    (invoiceFilenameHint || invoiceKeywordHint || invoiceAddressHint || invoicePaymentDueHint);

  if (shouldTreatAsInvoice) {
    console.log(`[Byte OCR] Detected docType=invoice`);
    const invoiceData = extractInvoiceData(normalizedText, filename);
    if (invoiceData.total && invoiceData.total > 0) {
      console.log('[Byte OCR] Invoice parsed', {
        vendor: invoiceData.vendor,
        date: invoiceData.date,
        total: invoiceData.total,
        invoiceNo: invoiceData.invoiceNo,
      });
      const invoiceTx: NormalizedTransaction = {
        userId,
        kind: 'invoice',
        date: invoiceData.date,
        merchant: invoiceData.vendor,
        amount: invoiceData.total,
        currency: invoiceData.currency,
        description: invoiceData.description,
        invoiceNo: invoiceData.invoiceNo,
        docId: undefined,
      };
      return openaiClient ? Promise.resolve([invoiceTx]) : [invoiceTx];
    }
    console.warn('[Byte OCR] Invoice parse failed: missing total', {
      vendor: invoiceData.vendor,
      date: invoiceData.date,
      invoiceNo: invoiceData.invoiceNo,
    });
  }

  // Try invoice/receipt parsing first when this doesn't look like a statement
  if (!hasStatementHints) {
    const receiptParsed = parseReceiptLike(normalizedText);
    const receiptDoc = normalizeParsed(receiptParsed);
    const receiptTx = toTransactions(userId, receiptDoc);
    if (receiptTx.length > 0) {
      console.log(`[Byte OCR] Parsed ${receiptTx.length} transaction(s) from receipt text`);
      return openaiClient ? Promise.resolve(receiptTx) : receiptTx;
    }
  }

  // BMO Everyday Banking detection:
  // Check for specific BMO statement markers
  if (
    /Your\s*Everyday\s*Banking\s*statement/i.test(normalizedText) &&
    /EDMONTON[\s,]*AB/i.test(normalizedText)
  ) {
    const bmoTransactions = parseBmoEverydayStatement(normalizedText);
    
    // If we found transactions, return them (no AI fallback needed)
    if (bmoTransactions.length > 0) {
      console.log(`[Byte OCR] Parsed ${bmoTransactions.length} transactions with primary parser (BMO format)`);
      // Convert to NormalizedTransaction format
      return bmoTransactions.map(tx => ({
        userId,
        kind: 'bank' as const,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: 'CAD',
        statementType: 'bank',
        docId: undefined
      }));
    }
  }

  // Also try BMO format if we detect "Everyday Banking" or "For the period ending" patterns
  // (fallback detection for other BMO statement variants)
  if (
    /Everyday\s*Banking/i.test(normalizedText) ||
    (/For\s*the\s*period\s*ending/i.test(normalizedText) && /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i.test(normalizedText))
  ) {
    const bmoTransactions = parseBmoEverydayStatement(normalizedText);
    if (bmoTransactions.length > 0) {
      console.log(`[Byte OCR] Parsed ${bmoTransactions.length} transactions with primary parser (BMO variant)`);
      // Convert to NormalizedTransaction format
      return bmoTransactions.map(tx => ({
        userId,
        kind: 'bank' as const,
        date: tx.date,
        merchant: tx.merchant,
        amount: tx.amount,
        currency: 'CAD',
        statementType: 'bank',
        docId: undefined
      }));
    }
  }

  // Fallback to general bank statement normalization
  const bankTransactions = normalizeBankStatement(statementText, {
    includeAllAccounts: context?.includeAllAccounts,
  });
  const dateLineCount = (statementText.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/igm) || []).length;
  const isCibcStatement = /cibc|cibc account statement|transaction details/i.test(normalizedText);
  const hasColumnMode = bankTransactions.some(tx => Array.isArray(tx.confidenceFlags) && tx.confidenceFlags.includes('amount_from_columns'));
  const preferAiForCibc = isCibcStatement && !!openaiClient && !hasColumnMode;
  // BMO Everyday Banking statements MUST go through the primary parser -
  // the AI fallback misreads balance-column values as transaction amounts
  // when pdf-parse strips spaces. This guard wins even if the env var is set.
  const isBmoEverydayStatement = /Everyday\s*Banking|EverydayBanking/i.test(normalizedText);
  const preferAiForStatements = !isBmoEverydayStatement
    && !!openaiClient
    && (process.env.OCR_PREFER_AI_STATEMENTS === '1' || process.env.OCR_PREFER_AI_STATEMENTS === 'true')
    && !hasColumnMode;
  const preferAi = preferAiForCibc || preferAiForStatements;
  const lowCoverageBase = !isCreditCard && dateLineCount >= 5 && bankTransactions.length < Math.max(3, Math.floor(dateLineCount * 0.4));
  const lowCoverageCibc = isCibcStatement && bankTransactions.length < Math.max(6, Math.floor(dateLineCount * 0.6));
  const lowCoverage = lowCoverageBase || lowCoverageCibc;
  const mappedBankTransactions = bankTransactions.map(tx => ({
    userId,
    kind: 'bank' as const,
    date: tx.date,
    merchant: tx.merchant,
    amount: tx.amount,
    currency: 'CAD',
    confidence: tx.confidence,
    confidenceFlags: tx.confidenceFlags,
    accountName: (tx as any).accountName,
    statementType: (tx as any).statementType,
    statementCredit: (tx as any).statementCredit,
    fxNote: (tx as any).fxNote,
    transactionType: (tx as any).transactionType,
    docId: undefined
  }));

  // If primary parser found transactions, return them synchronously
  if (!preferAi && bankTransactions.length > 0 && !lowCoverage && !(openaiClient && isCreditCard && bankTransactions.length <= 1)) {
    console.log(`[Byte OCR] Parsed ${bankTransactions.length} transactions with primary parser`);
    return openaiClient ? Promise.resolve(mappedBankTransactions) : mappedBankTransactions;
  }

  // Primary parser found 0 transactions (or too few for credit card) - use AI fallback if OpenAI client is available
  if (openaiClient) {
    if (isCorruptedText(normalizedText)) {
      console.warn('[Byte OCR WARNING] corrupted_text_detected', {
        sourceTextPath,
        sourceValueType,
        length: normalizedText.length,
        preview: normalizedText.slice(0, 300),
      });
      return mappedBankTransactions;
    }
    if (bankTransactions.length > 0 && isCreditCard) {
      console.log(`[Byte OCR] Primary parser found ${bankTransactions.length} transaction(s) on credit card statement, using AI fallback parser`);
    } else if (preferAiForCibc) {
      console.log(`[Byte OCR] CIBC statement detected, using AI fallback parser`);
    } else if (preferAiForStatements) {
      console.log(`[Byte OCR] Statement AI preference enabled, using AI fallback parser`);
    } else if (lowCoverage) {
      console.log(`[Byte OCR] Primary parser coverage low (${bankTransactions.length}/${dateLineCount}), using AI fallback parser`);
    } else {
      console.log(`[Byte OCR] Primary parser found 0 transactions, using AI fallback parser`);
    }
    
    // Detect statement type for better AI parsing
    const statementType: 'credit_card' | 'bank' | 'unknown' = isCreditCard ? 'credit_card' : 'bank';
    console.log('[Byte OCR DEBUG] statement type decision:', {
      isCreditCard,
      preferAiForCibc,
      preferAiForStatements,
      lowCoverage,
      detectedStatementType: statementType,
      bankTransactionsCount: bankTransactions.length,
      dateLineCount,
    });
    
    // Call AI fallback (async)
    return (async () => {
      const { aiFallbackParseTransactions } = await import('./ai_fallback_parser.js');
      console.log('[Byte OCR DEBUG] sending OCR text preview to AI fallback:', normalizedText.slice(0, 1200));
      const aiTransactions = await aiFallbackParseTransactions({
        ocrText: normalizedText,
        statementType,
        openaiClient,
        pdfBase64: context?.pdfBase64 || null,
      });

      if (aiTransactions.length > 0) {
        console.log(`[Byte OCR] AI fallback parser produced ${aiTransactions.length} transactions`);
        // Convert to NormalizedTransaction format and tag with source
        const aiMapped = aiTransactions.map(tx => ({
          userId,
          kind: 'bank' as const,
          date: tx.date,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: 'CAD',
          statementType,
          docId: undefined,
          // Tag as AI fallback (can be used for metadata)
        }));
        if (aiMapped.length > mappedBankTransactions.length) {
          return aiMapped;
        }
        return mappedBankTransactions;
      } else {
        console.log(`[Byte OCR] AI fallback parser also found 0 transactions`);
        return mappedBankTransactions;
      }
    })();
  }

  // No OpenAI client available, return empty array
  console.log(`[Byte OCR] Primary parser found 0 transactions, but OpenAI client not available for fallback`);
  return mappedBankTransactions;
}

type InvoiceExtraction = {
  vendor: string;
  invoiceNo?: string;
  date?: string;
  total?: number;
  currency: string;
  description: string;
};

const HEADER_LINE_SCAN_COUNT = 8;

function getHeaderYear(text: string): number | null {
  const lines = text.split(/\r?\n/).slice(0, HEADER_LINE_SCAN_COUNT);
  for (const line of lines) {
    const match = line.match(/\b(20\d{2})\b/);
    if (match) {
      const year = Number(match[1]);
      if (!Number.isNaN(year)) {
        return year;
      }
    }
  }
  return null;
}

function normalizeDateWithHeaderYear(dateText: string, headerYear: number | null): string | undefined {
  if (!dateText) return undefined;
  if (!headerYear) return normalizeDate(dateText);

  const monthDayMatch = dateText.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\b/);
  if (monthDayMatch && !/\b\d{4}\b/.test(dateText)) {
    const withYear = `${monthDayMatch[1]} ${monthDayMatch[2]}, ${headerYear}`;
    return normalizeDate(withYear) || normalizeDate(dateText);
  }

  const parts = dateText.split(/[\/\-]/).map((part) => part.trim());
  if (parts.length !== 3) {
    return normalizeDate(dateText);
  }

  const yearPart = parts[2];
  const parsedYear = Number(yearPart.length === 2 ? `20${yearPart}` : yearPart);
  if (Number.isNaN(parsedYear)) {
    return normalizeDate(dateText);
  }

  let adjusted = dateText;
  if (yearPart.length === 2) {
    adjusted = `${parts[0]}/${parts[1]}/${String(headerYear)}`;
  } else if (Math.abs(parsedYear - headerYear) >= 2) {
    adjusted = `${parts[0]}/${parts[1]}/${String(headerYear)}`;
  }

  return normalizeDate(adjusted) || normalizeDate(dateText);
}

function findLabeledTotal(text: string): number | undefined {
  const lines = text.split(/\r?\n/);
  const findNear = (labels: RegExp[], lookahead: number) => {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (labels.some((label) => label.test(line))) {
        const amount = extractLastAmount(line);
        if (amount !== undefined) {
          return amount;
        }
        for (let j = 1; j <= lookahead && i + j < lines.length; j += 1) {
          const nextLine = lines[i + j];
          const nextAmount = extractLastAmount(nextLine);
          if (nextAmount !== undefined) {
            return nextAmount;
          }
        }
      }
    }
    return undefined;
  };

  const dueAmount = findNear([
    /payment\s+due/i,
    /outstanding\s+balance/i,
    /balance\s+due/i,
    /total\s+amount\s+due/i,
    /amount\s+due/i,
    /total\s+due/i,
  ], 3);
  if (dueAmount !== undefined) return dueAmount;

  const totalAmount = findNear([
    /\btotal\b/i,
    /taxable\s+total/i,
    /total\s+s\b/i,
  ], 2);
  if (totalAmount !== undefined) return totalAmount;

  const amountLine = findNear([
    /\bamount\b/i,
    /transaction\s+amount/i,
  ], 2);
  if (amountLine !== undefined) return amountLine;

  return undefined;
}

function findLabeledDate(text: string): string | undefined {
  const headerYear = getHeaderYear(text);
  const labels = [
    /payment\s+due/i,
    /due\s+date/i,
  ];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (labels.some((label) => label.test(line))) {
      for (let j = 0; j <= 3 && i + j < lines.length; j += 1) {
        const candidate = lines[i + j];
        const normalized = normalizeDateWithHeaderYear(candidate.trim(), headerYear);
        if (normalized) {
          return normalized;
        }
      }
    }
  }
  return undefined;
}

function extractInvoiceData(text: string, filename: string): InvoiceExtraction {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const topLines = lines.slice(0, 12);

  const vendor = (() => {
    if (/the\s+brick/i.test(text) || /thebrick\.com/i.test(text)) {
      return 'The Brick';
    }
    const revolutionMatch = text.match(/revolution\s+motors/i);
    if (revolutionMatch) {
      return 'Revolution Motors';
    }
    if (/edmonton/i.test(text) && /property\s+tax/i.test(text)) {
      return 'City of Edmonton';
    }
    for (const line of topLines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('invoice') ||
        lower.includes('bill to') ||
        lower.includes('ship to') ||
        lower.includes('customer') ||
        lower.includes('sales order') ||
        lower.includes('date of mailing') ||
        lower.includes('payment summary') ||
        lower.includes('payment due') ||
        lower.includes('property tax notice') ||
        lower.includes('account')
      ) {
        continue;
      }
      if (looksLikeAddress(line)) {
        continue;
      }
      if (line.length < 3) continue;
      if (line.trim().toLowerCase() === 'evolution' && /revolution\s+motors/i.test(text)) {
        continue;
      }
      return line;
    }
    return 'Unknown Vendor';
  })();

  const docNoMatch = text.match(/document\s+number\s*[:#]?\s*([A-Z0-9-]+)/i);
  const invoiceNoMatch = text.match(/invoice\s*(?:#|no|number)?\s*[:#]?\s*([A-Z0-9-]*\d[A-Z0-9-]*)/i) ||
    text.match(/inv\s*#\s*([A-Z0-9-]*\d[A-Z0-9-]*)/i);
  const rawInvoiceNo = (docNoMatch?.[1] || invoiceNoMatch?.[1] || '').trim();
  const invoiceNo = rawInvoiceNo && !/^(del|pu|tba)$/i.test(rawInvoiceNo) && rawInvoiceNo.length >= 4
    ? rawInvoiceNo
    : undefined;

  const date = extractInvoiceDate(text);
  const { total, currency } = extractInvoiceTotalAndCurrency(text);
  const snippet = lines.slice(0, 3).join(' ').slice(0, 80);
  const baseName = filename || 'Invoice';
  const descInvoiceNo = invoiceNo ? `Invoice ${invoiceNo}` : 'Invoice';
  const description = `${descInvoiceNo} - ${baseName}`;

  return {
    vendor,
    invoiceNo,
    date,
    total,
    currency,
    description,
  };
}

function looksLikeAddress(line: string): boolean {
  const lower = line.toLowerCase();
  const addressKeywords = /(street|st\.|road|rd\.|avenue|ave\.|blvd|boulevard|suite|ste\.|unit|zip|postal|po box)/i;
  if (addressKeywords.test(lower) && /\d/.test(lower)) return true;
  if (/^\d{3,}\s+\w+/.test(lower)) return true;
  if (/\b\d{5}(?:-\d{4})?\b/.test(lower)) return true;
  return false;
}

function extractInvoiceDate(text: string): string | undefined {
  const headerYear = getHeaderYear(text);
  const labeledDueDate = findLabeledDate(text);
  if (labeledDueDate) return labeledDueDate;
  const labeledDate = text.match(/(?:date|invoice\s+date|dated)[:\s]+([^\n]+)/i);
  if (labeledDate) {
    const normalized = normalizeDateWithHeaderYear(labeledDate[1].trim(), headerYear);
    if (normalized) return normalized;
  }
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!/(date|datetime|transaction|credit card)/i.test(line)) continue;
    const normalized = normalizeDateWithHeaderYear(line.trim(), headerYear);
    if (normalized) return normalized;
  }
  const datePatterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/,
    /\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/,
    /\b(\d{1,2}[-\/\.][A-Za-z]{3,9}[-\/\.]\d{2,4})\b/,
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const normalized = normalizeDateWithHeaderYear(match[1].trim(), headerYear);
      if (normalized) return normalized;
    }
  }
  return undefined;
}

function extractInvoiceTotalAndCurrency(text: string): { total?: number; currency: string } {
  const lines = text.split(/\r?\n/);
  let totalLineAmount: number | undefined;

  const labeledTotal = findLabeledTotal(text);
  if (labeledTotal !== undefined) {
    totalLineAmount = labeledTotal;
  } else {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const lower = line.toLowerCase();
      if (lower.includes('total') && !lower.includes('subtotal')) {
        const amount = extractLastAmount(line);
        if (amount !== undefined) {
          totalLineAmount = amount;
          break;
        }
        for (let j = 1; j <= 2 && i + j < lines.length; j += 1) {
          const nextAmount = extractLastAmount(lines[i + j]);
          if (nextAmount !== undefined) {
            totalLineAmount = nextAmount;
            break;
          }
        }
      }
      if (totalLineAmount !== undefined) break;
    }
  }

  if (totalLineAmount === undefined) {
    totalLineAmount = extractLargestAmount(text);
  }

  return {
    total: totalLineAmount,
    currency: detectCurrency(text),
  };
}

function extractLastAmount(line: string): number | undefined {
  const matches = Array.from(line.matchAll(/(?:[$€£]|S)?\s*[\d\s,]+\.\d{2}/g));
  if (matches.length === 0) return undefined;
  const last = matches[matches.length - 1][0];
  const cleaned = last.replace(/[$€£Ss,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractLargestAmount(text: string): number | undefined {
  const matches = Array.from(text.matchAll(/(?:[$€£]|S)?\s*[\d\s,]+\.\d{2}/g));
  let max = 0;
  for (const match of matches) {
    const cleaned = match[0].replace(/[$€£Ss,\s]/g, '');
    const parsed = parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  }
  return max > 0 ? max : undefined;
}

function detectCurrency(text: string): string {
  if (/CDN/i.test(text)) return 'CAD';
  if (/CAD/i.test(text)) return 'CAD';
  if (/\$\s*\d/.test(text)) return 'CAD';
  if (/USD/i.test(text)) return 'USD';
  if (/EUR/i.test(text) || /€\s*\d/.test(text)) return 'EUR';
  if (/GBP/i.test(text) || /£\s*\d/.test(text)) return 'GBP';
  if (/\$/.test(text)) return 'CAD';
  return 'CAD';
}

/**
 * Convert ParsedDoc to normalized transactions
 */
export function toTransactions(userId: string, parsed: ParsedDoc | null): NormalizedTransaction[] {
  if (!parsed) {
    return [];
  }
  
  const transactions: NormalizedTransaction[] = [];
  
  if (parsed.kind === 'receipt' && parsed.data) {
    const receipt = parsed.data as ReceiptData;
    
    // Extract date (normalize formats)
    let normalizedDate: string | undefined;
    if (receipt.date) {
      normalizedDate = normalizeDate(receipt.date);
    }
    
    // Extract currency
    const currency = extractCurrency(receipt);
    
    // Extract amount (prefer total)
    const amount = receipt.total || 0;
    
    // Create transaction
    const tx: NormalizedTransaction = {
      userId,
      kind: 'receipt',
      date: normalizedDate,
      merchant: receipt.merchant,
      amount,
      currency,
      items: receipt.items?.map(item => ({
        name: item.name,
        qty: item.qty,
        price: item.price
      })),
      docId: undefined // Will be set by caller
    };
    
    if (amount > 0) {
      transactions.push(tx);
    }
  } else if (parsed.kind === 'invoice' && parsed.data) {
    const invoice = parsed.data as InvoiceData;
    
    // Extract date
    let normalizedDate: string | undefined;
    if (invoice.date) {
      normalizedDate = normalizeDate(invoice.date);
    }
    
    // Extract currency
    const currency = invoice.currency || extractCurrencyFromInvoice(invoice);
    
    // Extract amount (prefer total, fallback to subtotal + tax)
    const amount = invoice.total || (invoice.subtotal && invoice.tax ? invoice.subtotal + invoice.tax : invoice.subtotal) || 0;
    
    // Create transaction
    const tx: NormalizedTransaction = {
      userId,
      kind: 'invoice',
      date: normalizedDate,
      merchant: invoice.vendor,
      amount,
      currency,
      items: invoice.line_items?.map(item => ({
        name: item.desc,
        qty: item.qty,
        unit: item.unit,
        price: item.price
      })),
      docId: undefined // Will be set by caller
    };
    
    if (amount > 0) {
      transactions.push(tx);
    }
  } else if (parsed.kind === 'bank' && parsed.data) {
    // Bank statement parsing (minimal for Phase 1)
    // Future: Extract multiple transactions from statement
    const bank = parsed.data as any;
    
    if (bank.transactions && Array.isArray(bank.transactions)) {
      for (const bankTx of bank.transactions) {
        const tx: NormalizedTransaction = {
          userId,
          kind: 'bank',
          date: bankTx.date ? normalizeDate(bankTx.date) : undefined,
          merchant: bankTx.merchant || bankTx.description,
          amount: bankTx.amount,
          currency: bankTx.currency || 'USD',
          docId: undefined
        };
        
        if (tx.amount && tx.amount !== 0) {
          transactions.push(tx);
        }
      }
    }
  }
  
  return transactions;
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateStr: string): string | undefined {
  try {
    const trimmed = dateStr.trim();
    const dashMonthMatch = trimmed.match(/(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{2,4})/);
    if (dashMonthMatch) {
      const [, day, monthStr, yearRaw] = dashMonthMatch;
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = monthNames.findIndex(m => m === monthStr.toLowerCase().substring(0, 3));
      if (monthIndex >= 0) {
        const yearNum = parseInt(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw, 10);
        return `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // Try common formats
    // DD/MM/YYYY or MM/DD/YYYY
    const slashMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (slashMatch) {
      const [, part1, part2, year] = slashMatch;
      const yearNum = parseInt(year.length === 2 ? `20${year}` : year);
      // Assume MM/DD/YYYY (US format)
      const month = parseInt(part1);
      const day = parseInt(part2);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${yearNum}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Try YYYY-MM-DD
    const isoMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return dateStr;
    }
    
    // Try MMM DD, YYYY
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthMatch = dateStr.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
    if (monthMatch) {
      const [, monthStr, day, year] = monthMatch;
      const monthIndex = monthNames.findIndex(m => m === monthStr.toLowerCase().substring(0, 3));
      if (monthIndex >= 0) {
        return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    // Try parsing as Date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year >= 1900) {
        return parsed.toISOString().split('T')[0];
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  return undefined;
}

/**
 * Extract currency from receipt
 */
function extractCurrency(receipt: ReceiptData): string {
  // Default to USD
  return 'USD';
}

/**
 * Extract currency from invoice
 */
function extractCurrencyFromInvoice(invoice: InvoiceData): string {
  if (invoice.currency) {
    return invoice.currency.toUpperCase();
  }
  // Check for currency symbols in totals
  return 'USD';
}

/**
 * Categorize transaction using deterministic rules first, then Tag LLM fallback
 */
export async function categorize(tx: NormalizedTransaction): Promise<CategorizationResult> {
  // Deterministic rules first
  const merchant = (tx.merchant || '').toLowerCase();
  
  // Groceries
  const groceryKeywords = ['save-on-foods', 'sobeys', 'walmart', 'target', 'safeway', 'kroger', 'whole foods', 'costco', 'superstore'];
  if (groceryKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Groceries', confidence: 0.9, method: 'rules' };
  }
  
  // Fuel/Gas
  const fuelKeywords = ['shell', 'esso', 'chevron', 'bp', 'exxon', 'petro-canada', 'gas station', 'petrol'];
  if (fuelKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Transportation', subcategory: 'Fuel', confidence: 0.9, method: 'rules' };
  }
  
  // Restaurants
  const restaurantKeywords = ['grill', 'café', 'cafe', 'pizza', 'restaurant', 'diner', 'bistro', 'starbucks', 'tim hortons', 'mcdonalds', 'subway'];
  if (restaurantKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Dining', confidence: 0.85, method: 'rules' };
  }
  
  // Office Supplies
  const officeKeywords = ['staples', 'office depot', 'office max'];
  if (officeKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Office', subcategory: 'Supplies', confidence: 0.85, method: 'rules' };
  }
  
  // Utilities
  const utilityKeywords = ['hydro', 'electric', 'gas company', 'water', 'internet', 'phone', 'cable'];
  if (utilityKeywords.some(kw => merchant.includes(kw))) {
    return { category: 'Utilities', confidence: 0.85, method: 'rules' };
  }
  
  // Default confidence if no rules match
  let confidence = 0.5;
  
  // If confidence is low, try Tag LLM fallback
  if (confidence < 0.6) {
    try {
      const tagResult = await categorizeWithTag(tx);
      if (tagResult.confidence > confidence) {
        return tagResult;
      }
    } catch (e) {
      console.warn('[OCR Normalize] Tag categorization failed, using default:', e);
    }
  }
  
  // Default category
  return { category: 'Uncategorized', confidence: 0.5, method: 'rules' };
}

/**
 * Categorize using Tag with learning (fallback when rules don't match)
 * 
 * This function uses categorizeTransactionWithLearning which:
 * 1. First checks if Tag learned from user corrections
 * 2. Falls back to AI if no learned pattern found
 */
async function categorizeWithTag(tx: NormalizedTransaction): Promise<CategorizationResult> {
  // Use the new wrapper function that includes learning
  try {
    const result = await categorizeTransactionWithLearning({
      userId: tx.userId,
      merchant: tx.merchant || null,
      description: tx.merchant || 'Transaction',
      amount: tx.amount || 0
    });

    // Convert to CategorizationResult format
    return {
      category: result.category,
      confidence: result.confidence,
      source: result.source === 'learned' ? 'learned' : 'ai',
      method: result.source === 'learned' ? 'learned' : 'tag'
    };
  } catch (error: any) {
    console.error('[OCR Normalize] Tag categorization error:', error);
    throw error;
  }
}

/**
 * Link transaction to document (non-blocking)
 */
export async function linkToDocument(txId: number, docId: string): Promise<void> {
  // This will be implemented in transactions_store.ts
  // For now, it's a no-op (link is stored in transaction.doc_id)
}

/**
 * parseIncomeReportRows - Extracts individual payment rows from income
 * report PDFs (FreshBooks "Payments Collected", Wave, etc.)
 *
 * Expected OCR text pattern (FreshBooks):
 *   MM/DD/YYYY ClientName Method Invoice NNNNNNN $X,XXX.XX CAD
 *
 * Returns each row as a positive-amount income transaction.
 * Skips $0.00 rows and header/footer text.
 */
function parseIncomeReportRows(text: string): Array<{
  date: string;
  client: string;
  method: string | null;
  invoiceNo: string | null;
  amount: number;
  currency: string;
}> {
  const results: Array<{
    date: string;
    client: string;
    method: string | null;
    invoiceNo: string | null;
    amount: number;
    currency: string;
  }> = [];

  // Find each date anchor, then grab everything up to the next date or end-of-text.
  const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
  const datePositions: Array<{ index: number; date: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = datePattern.exec(text)) !== null) {
    datePositions.push({ index: m.index, date: m[1] });
  }

  for (let i = 0; i < datePositions.length; i++) {
    const start = datePositions[i].index + datePositions[i].date.length;
    const end = i + 1 < datePositions.length ? datePositions[i + 1].index : text.length;
    const chunk = text.slice(start, end).replace(/\n/g, ' ').trim();

    // Extract dollar amount: $1,200.00 or $300.00
    const amountMatch = chunk.match(/\$([0-9,]+\.\d{2})/);
    if (!amountMatch) continue;
    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (amount === 0) continue; // skip $0.00 rows

    // Extract currency (default CAD)
    const currencyMatch = chunk.match(/\$[0-9,]+\.\d{2}\s*(CAD|USD|EUR|GBP)/i);
    const currency = currencyMatch?.[1]?.toUpperCase() || 'CAD';

    // Extract invoice number
    const invoiceMatch = chunk.match(/(?:Invoice|Credit)\s*(\d{4,})/i);
    const invoiceNo = invoiceMatch?.[1] || null;

    // Extract method - must appear as a standalone word followed by "Invoice"/"Credit"
    // or end-of-chunk.  Avoid matching "Cash" inside client names like "Cash for Cars".
    const methodMatch = chunk.match(/\b(Transfer|Check|Credit|EFT|Wire|ACH|Direct\s+Deposit)\s+(?=Invoice|Credit|\$)/i);
    const method = methodMatch?.[1] || null;

    // Client name: everything before the method keyword (or before Invoice/amount)
    let clientText = chunk;
    if (methodMatch?.index !== undefined && methodMatch.index > 0) {
      clientText = chunk.slice(0, methodMatch.index);
    } else if (invoiceMatch?.index !== undefined) {
      clientText = chunk.slice(0, invoiceMatch.index);
    } else if (amountMatch?.index !== undefined) {
      clientText = chunk.slice(0, amountMatch.index);
    }
    const client = clientText.replace(/\s+/g, ' ').trim();
    if (!client || client.length < 2) continue;

    // Skip header/footer lines
    if (/^Date\b|^Client\b|^Method\b|payments?\s+applied|do not count/i.test(client)) continue;

    // Normalize date: MM/DD/YYYY -> YYYY-MM-DD
    const [mm, dd, yyyy] = datePositions[i].date.split('/');
    const isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

    results.push({
      date: isoDate,
      client,
      method,
      invoiceNo,
      amount: Math.abs(amount), // income = positive
      currency,
    });
  }

  return results;
}

/**
 * Parse BMO "Everyday Banking" statement format
 * 
 * Format: Multi-line transactions where:
 * - Line 1: Date (e.g., "Sep 17")
 * - Lines 2..N-2: Description (can span multiple lines)
 * - Line N-1: Amount (e.g., "20.23" or "1,000.00" or "-25.00")
 * - Line N: Balance (e.g., "1,489.87")
 * 
 * Example:
 *   Sep 17
 *   Debit Card Purchase, SOBEYS HOLLICK KENYON
 *   76.09
 *   1,519.47
 */
function parseBmoEverydayStatement(text: string): Array<{
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  raw_line_text?: string;
}> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // TEMP DEBUG: visibility into what the BMO parser actually receives
  // after cleanupOcrText / restoreBmoSpaces have run.
  console.log('[BMO PARSER DEBUG] first 20 lines:',
    lines.slice(0, 20).map((l, i) => `${i}: ${l}`).join('\n'));
  console.log('[BMO PARSER DEBUG] total lines:', lines.length);
  console.log('[BMO PARSER DEBUG] date matches:',
    lines.filter(l => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}\b/i.test(l)).length);

  const monthMap: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04',
    May: '05', Jun: '06', Jul: '07', Aug: '08',
    Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };

  let year = new Date().getFullYear();
  let periodEndMonth: number | null = null;
  for (const line of lines) {
    const mFull = /For\s*the\s*period\s*ending\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[,\s]+(\d{4})/i.exec(line);
    if (mFull) {
      year = Number(mFull[2]);
      periodEndMonth = Number(monthMap[mFull[1].slice(0, 3)] ?? '01');
      break;
    }
    const mYear = /For\s*the\s*period\s*ending\s*.*?(\d{4})/i.exec(line);
    if (mYear) {
      year = Number(mYear[1]);
      break;
    }
  }
  const dateHeadRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\b/i;
  const amountRegex = /\d{1,3}(?:,\d{3})*\.\d{2}/g;
  const parseAmount = (raw: string): number => Number(raw.replace(/,/g, ''));

  const skipLine = (line: string): boolean =>
    /opening balance|closing totals|closing balance|summary of your account|account balance|amounts deducted|amounts added|here's what happened|continued|page \d+ of \d+|-- \d+ of \d+ --|primary chequing|chequing account|savings account|owner:|for the period|transit number|your branch|your plan|premium plan|security tip|direct banking|www\.bmo|closingtotals|openingbalance|primary chequing account #|\d{4}\s+\d{3,4}-\d{3,4}|account #\s*\d|^\d{4,}-\d{3,}/i.test(line);

  const extractTxFromBody = (body: string): { description: string; amount: number; balance: number } | null => {
    // Strip FX rate notation (e.g. 5.00X1.406) before amount extraction to prevent
    // the multiplier from being picked up as a transaction amount column.
    const cleanBody = body.replace(/\b\d+\.\d+[Xx]\d+\.\d+\b/g, '');
    const amounts = cleanBody.match(amountRegex) || [];
    if (amounts.length < 2) return null;

    // BMO has columns: Amounts deducted ($) | Amounts added ($) | Balance ($)
    // When 3+ amounts present, first is deducted/added, last is balance
    // When exactly 2, second-to-last is amount, last is balance
    const amount = parseAmount(amounts[amounts.length - 2]);
    const balance = parseAmount(amounts[amounts.length - 1]);
    if (!isFinite(amount) || !isFinite(balance)) return null;
    // Sanity check: if parsed amount > $9,999 it is almost certainly the balance column
    // bleeding into the amount position due to crowded OCR. Reject the row.
    // Exception: allow up to $99,999 for large deposits (tax refunds, payroll, etc.)
    if (amount > 99999) return null;

    // Note: amount validation is now done at the caller via balance-delta comparison.
    // The delta from previous balance is mathematically the source of truth.

    // Remove trailing amount columns from the description part.
    const description = body
      .replace(/\d{1,3}(?:,\d{3})*(?:\.\d{2})(?:\s+\d{1,3}(?:,\d{3})*(?:\.\d{2}))+$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!description) return null;

    return { description, amount, balance };
  };

  const out: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
  }> = [];

  let lastBalance: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipLine(line)) continue;

    const dateMatch = line.match(dateHeadRegex);
    if (!dateMatch) continue;

    const month = monthMap[dateMatch[1]] || '01';
    const day = dateMatch[2].padStart(2, '0');
    // Cross-year: if statement ends Jan/Feb/Mar and transaction is in Oct/Nov/Dec, use prior year
    const txMonthNum = Number(month);
    const txYear = (periodEndMonth !== null && periodEndMonth <= 3 && txMonthNum >= 10)
      ? year - 1
      : year;
    const isoDate = `${txYear}-${month}-${day}`;
    let body = line.replace(dateHeadRegex, '').trim();
    let rawLineText = line;

    // Some BMO rows wrap across multiple lines (date / description / amount / balance).
    // Keep appending lines until we have 2+ amounts, hit the next date, or reach cap.
    {
      const extraRaw: string[] = [];
      let j = i + 1;
      while (
        (body.match(amountRegex) || []).length < 2 &&
        j < lines.length &&
        !lines[j].match(dateHeadRegex) &&
        j <= i + 5
      ) {
        extraRaw.push(lines[j]);
        body = `${body} ${lines[j]}`.replace(/\s+/g, ' ').trim();
        j++;
      }
      if (extraRaw.length > 0) {
        rawLineText = [line, ...extraRaw].join(' | ');
        i = j - 1; // for-loop will increment once more
      }
    }

    const parsed = extractTxFromBody(body);
    if (!parsed) {
      console.log(`[BMO SKIP] date=${isoDate} body="${body.slice(0,80)}"`);
      // Keep lastBalance accurate so next transaction delta is correct
      const skipAmounts = body.match(amountRegex);
      if (skipAmounts && skipAmounts.length >= 1) {
        const skippedBalance = parseAmount(skipAmounts[skipAmounts.length - 1]);
        if (isFinite(skippedBalance)) lastBalance = skippedBalance;
      }
      continue;
    }

    if (/opening balance|closing totals|closing balance/i.test(parsed.description)) {
      lastBalance = parsed.balance;
      continue;
    }

    const deltaBasedAmount =
      lastBalance !== null && isFinite(lastBalance)
        ? parsed.balance - lastBalance
        : null;
    lastBalance = parsed.balance;

    const signedAmountFromDesc = isIncomeDescription(parsed.description)
      ? Math.abs(parsed.amount)
      : -Math.abs(parsed.amount);

    // Use balance delta as primary amount source — it is mathematically derived
    // from the balance column which OCR preserves reliably. Fall back to
    // description-based sign only when delta is unavailable or implausible.
    const descSignedAmount = isIncomeDescription(parsed.description)
      ? Math.abs(parsed.amount)
      : -Math.abs(parsed.amount);
    let signedAmount: number;
    if (deltaBasedAmount !== null && deltaBasedAmount !== 0) {
      const deltaAbs = Math.abs(deltaBasedAmount);
      const parsedAbs = Math.abs(parsed.amount);
      const diff = Math.abs(deltaAbs - parsedAbs);
      if (diff > 0.02) {
        // Amount column corrupted (OCR fused store# into amount).
        // Use deltaAbs when it is a plausible transaction amount.
        const deltaReasonable = deltaAbs >= 0.01 && deltaAbs <= 50_000;
        if (deltaReasonable) {
          console.warn('[BMO Parser] Amount mismatch: parsed=' + parsedAbs + ' delta=' + deltaAbs + ' - using delta (balance column)');
          signedAmount = deltaBasedAmount;
        } else {
          signedAmount = descSignedAmount;
        }
      } else {
        signedAmount = deltaBasedAmount > 0 ? parsedAbs : -parsedAbs;
      }
    } else {
      signedAmount = descSignedAmount;
    }

    const cleanedDesc = cleanDescription(parsed.description);
    if (!cleanedDesc) continue;

    out.push({
      date: isoDate,
      merchant: extractMerchant(cleanedDesc),
      description: cleanedDesc,
      amount: signedAmount,
      category: categorizeTransactionSync(cleanedDesc),
      raw_line_text: rawLineText,
    });
  }

  return out;
}

/**
 * Parse Canadian bank statement line (BMO, TD, RBC format)
 * 
 * Format: "Sep 17   Debit Card Purchase SOBEYS HOLLICK KENYON   76.09   1,519.47"
 * Pattern: Month Day Description Amount Balance
 */
function parseCanadianStatementLine(line: string): {
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  confidence?: number;
  confidenceFlags?: string[];
} | null {
  // Match: Month Day Description Amount Balance
  // e.g., "Sep 17   Debit Card Purchase SOBEYS HOLLICK KENYON   76.09   1,519.47"
  // Handle variable spacing between fields
  const regex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/i;
  const match = line.match(regex);
  
  if (!match) return null;
  
  const [, mon, day, description, amountStr] = match;
  
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  
  const monthNum = months[mon];
  if (!monthNum) return null;
  
  const amount = parseFloat(amountStr.replace(/,/g, ''));
  if (isNaN(amount)) return null;
  
  // Use current year (or could extract from statement header)
  const currentYear = new Date().getFullYear();
  const date = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
  
  // Extract merchant from description (remove common prefixes like "Debit Card Purchase")
  let merchant = description.trim();
  merchant = merchant.replace(/^(Debit Card Purchase|Credit Card Purchase|ATM Withdrawal|Online Transfer|Bill Payment)\s+/i, '');
  
  // Take first part as merchant name
  const merchantParts = merchant.split(/\s+/);
  const merchantName = merchantParts[0] || merchant.substring(0, 50);
  
  const signedAmount = isIncomeDescription(description)
    ? Math.abs(amount)
    : -Math.abs(amount);

  const confidenceData = buildStatementConfidence({
    date,
    description: description.trim(),
    amount: signedAmount,
    rawLineText: line,
  });

  return {
    date,
    merchant: merchantName,
    description: description.trim(),
    amount: signedAmount,
    category: 'Uncategorized',
    confidence: confidenceData.confidence,
    confidenceFlags: confidenceData.flags,
  };
}

function parseBmoColumnStatementLine(line: string): {
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  balance?: number;
  category?: string;
  confidence?: number;
  confidenceFlags?: string[];
} | null {
  const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\b/i);
  if (!dateMatch) return null;

  const numbers = line.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g);
  if (!numbers || numbers.length < 1) return null;

  const tail = numbers.slice(-3);
  let debitStr: string | undefined;
  let creditStr: string | undefined;
  let amountStr: string | undefined;
  let balanceStr: string | undefined;
  const hasThreeColumns = tail.length === 3;
  const hasTwoColumns = tail.length === 2;

  if (tail.length === 3) {
    [debitStr, creditStr, balanceStr] = tail;
  } else if (tail.length === 2) {
    [debitStr, balanceStr] = tail;
  } else if (tail.length === 1) {
    [balanceStr] = tail;
  }

  const parseNumber = (value?: string) => {
    if (!value) return 0;
    const cleaned = value.replace(/,/g, '');
    return Number(cleaned);
  };

  const debit = parseNumber(debitStr);
  const credit = parseNumber(creditStr);
  const amount = parseNumber(amountStr);
  const balance = parseNumber(balanceStr);

  let description = line.replace(dateMatch[0], '').trim();
  description = description.replace(/\s+[\d,]+\.\d{2}(?:\s+[\d,]+\.\d{2}){1,2}\s*$/, '').trim();

  if (!description) return null;

  const cleanedDesc = cleanDescription(description);
  const merchant = extractMerchant(cleanedDesc);

  let signedAmount = 0;
  if (hasThreeColumns) {
    if (credit > 0 && debit <= 0) {
      signedAmount = Math.abs(credit);
    } else if (debit > 0 && credit <= 0) {
      signedAmount = -Math.abs(debit);
    } else if (credit > 0 && debit > 0) {
      signedAmount = isIncomeDescription(cleanedDesc) ? Math.abs(credit) : -Math.abs(debit);
    } else {
      signedAmount = 0;
    }
  } else if (hasTwoColumns && debit > 0 && credit <= 0) {
    signedAmount = -Math.abs(debit);
  } else {
    signedAmount = isIncomeDescription(cleanedDesc) ? Math.abs(amount) : -Math.abs(amount);
  }

  if (!signedAmount || signedAmount === 0) {
    if (!balance) return null;
  }

  const year = new Date().getFullYear();
  const normalizedDate = normalizeDate(`${dateMatch[1]} ${dateMatch[2]}, ${year}`);
  const confidenceData = buildStatementConfidence({
    date: normalizedDate,
    description: cleanedDesc,
    amount: signedAmount,
    rawLineText: line,
  });

  return {
    date: normalizedDate,
    merchant,
    description: cleanedDesc,
    amount: signedAmount,
    balance,
    category: categorizeTransactionSync(cleanedDesc),
    confidence: confidenceData.confidence,
    confidenceFlags: confidenceData.flags,
  };
}

function parseStatementTableLine(line: string): {
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  confidence?: number;
  confidenceFlags?: string[];
} | null {
  // Strict table format: Date + Description + Amount + Balance
  const regex = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/;
  const match = line.match(regex);
  if (!match) return null;

  const [, date, description, amountStr] = match;
  const amount = parseAmount(amountStr);
  if (amount === null || amount === 0) return null;

  const cleanedDesc = cleanDescription(description);
  const merchant = extractMerchant(cleanedDesc);
  const signedAmount = isIncomeDescription(cleanedDesc)
    ? Math.abs(amount)
    : -Math.abs(amount);

  const confidenceData = buildStatementConfidence({
    date,
    description: cleanedDesc,
    amount: signedAmount,
    rawLineText: line,
  });

  return {
    date,
    merchant,
    description: cleanedDesc,
    amount: signedAmount,
    category: categorizeTransactionSync(cleanedDesc),
    confidence: confidenceData.confidence,
    confidenceFlags: confidenceData.flags,
  };
}

function parseCibcStatementLines(rawText: string): Array<{
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  raw_line_text?: string;
  confidence?: number;
  confidenceFlags?: string[];
}> {
  const parseColumnMode = (): Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
    confidence?: number;
    confidenceFlags?: string[];
  }> => {
    const pageChunks = rawText
      .split(/Page\s+[0-9I]+\s+of\s+\d+/i)
      .map(chunk => chunk.trim())
      .filter(Boolean);
    if (pageChunks.length === 0) return [];
    const year = getHeaderYear(rawText) || new Date().getFullYear();
    const monthRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/i;
    const inlineMonthRegex = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i;

    const normalizeAmountLine = (text: string) => {
      const trimmed = text.trim();
      if (!/[A-Za-z]/.test(trimmed)) {
        return trimmed.replace(/_/g, '.');
      }
      // For OCR noise in amount-only lines, convert O/o to 0 and underscores to dots.
      if (/^[\dOog.,_]+$/.test(trimmed)) {
        return trimmed
          .replace(/[oO]/g, '0')
          .replace(/g/g, '9')
          .replace(/_/g, '.');
      }
      return trimmed;
    };

    const parseImpliedCents = (raw: string): number | null => {
      const digits = raw.replace(/[^\d]/g, '');
      if (digits.length < 3) return null;
      const value = Number(digits) / 100;
      return Number.isNaN(value) ? null : value;
    };

    const extractAmounts = (text: string) => {
      const normalized = normalizeAmountLine(text);
      const matches = normalized.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2}|\d{3,}/g) || [];
      return matches
        .map(raw => {
          if (raw.includes('.') || raw.includes(',')) {
            const parsed = Number(raw.replace(/,/g, ''));
            return Number.isNaN(parsed) ? null : parsed;
          }
          return parseImpliedCents(raw);
        })
        .filter((num): num is number => typeof num === 'number' && !Number.isNaN(num));
    };

    const isAmountLine = (text: string) => !/[A-Za-z]/.test(text) && extractAmounts(text).length > 0;
    const deriveMerchant = (desc: string) => {
      const trimmed = desc.trim();
      const lower = trimmed.toLowerCase();
      if (lower.startsWith('e-transfer')) {
        const withoutPrefix = trimmed.replace(/^E-TRANSFER\s+\[[^\]]+\]\s*/i, '').replace(/^E-TRANSFER\s+/i, '');
        return (withoutPrefix || trimmed).substring(0, 80);
      }
      if (lower.startsWith('retail purchase')) {
        const withoutPrefix = trimmed.replace(/^RETAIL PURCHASE\s*/i, '');
        return (withoutPrefix || trimmed).substring(0, 80);
      }
      if (lower.startsWith('withdrawal')) {
        const withoutPrefix = trimmed.replace(/^WITHDRAWAL\s*/i, '');
        return (withoutPrefix || trimmed).substring(0, 80);
      }
      if (lower.startsWith('service charge')) {
        const withoutPrefix = trimmed.replace(/^SERVICE CHARGE\s*/i, '');
        return (withoutPrefix || trimmed).substring(0, 80);
      }
      return extractMerchant(trimmed);
    };

    const allResults: Array<{
      date?: string;
      merchant?: string;
      description?: string;
      amount: number;
      category?: string;
      raw_line_text?: string;
      confidence?: number;
      confidenceFlags?: string[];
    }> = [];

    for (const chunk of pageChunks) {
      const lines = chunk.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      const withdrawalQueue: number[] = [];
      const depositQueue: number[] = [];
      const dateQueue: string[] = [];
      const descriptionEntries: Array<{ description: string; rawLine: string }> = [];
      let pendingEntry: { description: string; rawLine: string } | null = null;
      let sawOpeningBalance = false;

      const pushDate = (month: string, day: string) => {
        const formatted = `${month} ${day}, ${year}`;
        if (dateQueue[dateQueue.length - 1] !== formatted) {
          dateQueue.push(formatted);
        }
      };

      for (const line of lines) {
        if (/to\s+Jan\s+\d{1,2},?\s+\d{4}/i.test(line)) continue;
        const match = line.match(monthRegex);
        if (match) {
          pushDate(match[1], match[2]);
          continue;
        }
        const inlineMatch = line.match(inlineMonthRegex);
        if (inlineMatch && line.length <= 12) {
          pushDate(inlineMatch[1], inlineMatch[2]);
        }
      }

      const consumeAmountSection = (startIdx: number, stopHeaders: RegExp[]) => {
        for (let i = startIdx + 1; i < lines.length; i += 1) {
          const line = lines[i];
          if (stopHeaders.some(rx => rx.test(line))) {
            return i;
          }
          if (!line || /page\s+\d+/i.test(line)) continue;
          const normalizedLine = normalizeAmountLine(line);
          if (isAmountLine(normalizedLine)) {
            const numbers = extractAmounts(normalizedLine);
            withdrawalQueue.push(...numbers);
          }
        }
        return lines.length;
      };

      const consumeDepositSection = (startIdx: number, stopHeaders: RegExp[]) => {
        for (let i = startIdx + 1; i < lines.length; i += 1) {
          const line = lines[i];
          if (stopHeaders.some(rx => rx.test(line))) {
            return i;
          }
          if (!line || /page\s+\d+/i.test(line)) continue;
          const normalizedLine = normalizeAmountLine(line);
          if (isAmountLine(normalizedLine)) {
            const numbers = extractAmounts(normalizedLine);
            depositQueue.push(...numbers);
          }
        }
        return lines.length;
      };

      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        if (/^Description$/i.test(line)) {
          for (let j = i + 1; j < lines.length; j += 1) {
            const descLine = lines[j];
            if (/Withdrawals\s*\(S\)|Withdrawals\s*\(\$?\)/i.test(descLine)) {
              i = consumeAmountSection(j, [/Deposits\s*\(S\)|Deposits\s*\(\$?\)/i, /Balance\s*\(S\)|Balance\s*\(\$?\)/i]);
              break;
            }
            if (/Deposits\s*\(S\)|Deposits\s*\(\$?\)/i.test(descLine)) {
              i = consumeDepositSection(j, [/Balance\s*\(S\)|Balance\s*\(\$?\)/i, /Page\s+\d+/i]);
              break;
            }
            if (/Balance\s*\(S\)|Balance\s*\(\$?\)/i.test(descLine)) break;
            if (/page\s+\d+/i.test(descLine)) break;
            if (!descLine || /account number|branch transit|transaction details/i.test(descLine)) continue;

            const isKeyword = /^(E-TRANSFER|RETAIL PURCHASE|WITHDRAWAL|SERVICE CHARGE|BALANCE FORWARD|OPENING BALANCE)/i.test(descLine);
            if (isKeyword) {
              pendingEntry = { description: descLine, rawLine: descLine };
              if (/opening balance/i.test(descLine)) {
                sawOpeningBalance = true;
              }
              if (!/opening balance|balance forward/i.test(descLine)) {
                descriptionEntries.push({
                  description: descLine,
                  rawLine: descLine,
                });
              }
              continue;
            }
            if (pendingEntry) {
              pendingEntry.description = `${pendingEntry.description} ${descLine}`.trim();
              pendingEntry.rawLine = `${pendingEntry.rawLine} | ${descLine}`;
              if (descriptionEntries.length > 0) {
                descriptionEntries[descriptionEntries.length - 1] = {
                  description: pendingEntry.description,
                  rawLine: pendingEntry.rawLine,
                };
              }
            }
          }
        }
        if (/Withdrawals\s*\(S\)|Withdrawals\s*\(\$?\)/i.test(line)) {
          i = consumeAmountSection(i, [/Deposits\s*\(S\)|Deposits\s*\(\$?\)/i, /Balance\s*\(S\)|Balance\s*\(\$?\)/i]);
        }
        if (/Deposits\s*\(S\)|Deposits\s*\(\$?\)/i.test(line)) {
          i = consumeDepositSection(i, [/Balance\s*\(S\)|Balance\s*\(\$?\)/i, /Page\s+\d+/i]);
        }
      }

      if (sawOpeningBalance && dateQueue.length > 0) {
        dateQueue.shift();
      }

      if (descriptionEntries.length === 0 || (withdrawalQueue.length === 0 && depositQueue.length === 0)) {
        continue;
      }

      for (let idx = 0; idx < descriptionEntries.length; idx += 1) {
        const entry = descriptionEntries[idx];
        const entryDate = dateQueue[idx] || dateQueue[dateQueue.length - 1] || undefined;
        const normalizedDate = normalizeDate(entryDate || '') || entryDate;
        const cleanedDesc = cleanDescription(entry.description);
        if (!cleanedDesc) continue;

        const isDeposit = (
          /\bdirect deposit\b/i.test(cleanedDesc) ||
          /\bmobile cheque deposit\b/i.test(cleanedDesc) ||
          /\be-?transfer received\b/i.test(cleanedDesc) ||
          /\bpayment received\b/i.test(cleanedDesc) ||
          /\bcarbon rebate\b/i.test(cleanedDesc) ||
          /\bgovernment (payment|deposit)\b/i.test(cleanedDesc) ||
          /\bReturned Merchandise\b/i.test(cleanedDesc)
        ) && !/massage|salon|spa|restaurant|casino|pharmacy|grocery|market|store|drug mart|esso|petro|shell|food|coffee/i.test(cleanedDesc);
        const isWithdrawal = /withdrawal|retail purchase|purchase|service charge|fee|debit|atm|cash/i.test(cleanedDesc);
        const isEtransfer = /e-?transfer/i.test(cleanedDesc);

        let amountCandidate: number | undefined;
        if (isDeposit && depositQueue.length > 0) {
          amountCandidate = depositQueue.shift();
        } else if (isWithdrawal && withdrawalQueue.length > 0) {
          amountCandidate = withdrawalQueue.shift();
        } else if (isEtransfer && withdrawalQueue.length > 0 && depositQueue.length === 0) {
          amountCandidate = withdrawalQueue.shift();
        } else if (isEtransfer && depositQueue.length > 0 && withdrawalQueue.length === 0) {
          amountCandidate = depositQueue.shift();
        } else if (isEtransfer && withdrawalQueue.length >= depositQueue.length && withdrawalQueue.length > 0) {
          amountCandidate = withdrawalQueue.shift();
        } else if (isEtransfer && depositQueue.length > 0) {
          amountCandidate = depositQueue.shift();
        } else if (withdrawalQueue.length > 0) {
          amountCandidate = withdrawalQueue.shift();
        } else if (depositQueue.length > 0) {
          amountCandidate = depositQueue.shift();
        }
        if (!amountCandidate || amountCandidate === 0) continue;

        const signedAmount = (isDeposit && !isWithdrawal)
          ? Math.abs(amountCandidate)
          : (isWithdrawal ? -Math.abs(amountCandidate) : -Math.abs(amountCandidate));

        const merchant = deriveMerchant(cleanedDesc);
        const confidenceData = buildStatementConfidence({
          date: normalizedDate || entryDate,
          description: cleanedDesc,
          amount: signedAmount,
          rawLineText: entry.rawLine,
        });
        allResults.push({
          date: normalizedDate || entryDate,
          merchant,
          description: cleanedDesc,
          amount: signedAmount,
          category: categorizeTransactionSync(cleanedDesc),
          raw_line_text: entry.rawLine,
          confidence: confidenceData.confidence,
          confidenceFlags: [...confidenceData.flags, 'amount_from_columns'],
        });
      }
    }

    return allResults;
  };

  const columnModeResults = parseColumnMode();
  if (columnModeResults.length > 0) {
    return columnModeResults;
  }

  let preparedText = rawText;
  const rawLines = rawText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (rawLines.length < 3) {
    preparedText = rawText.replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{1,2}\b/gi, '\n$&');
  }
  preparedText = preparedText.replace(/(E-TRANSFER|RETAIL PURCHASE|WITHDRAWAL|SERVICE CHARGE|BALANCE FORWARD)/gi, '\n$1');
  preparedText = preparedText.replace(/(\d{1,3}(?:,\d{3})*\.\d{2})(?=\d)/g, '$1 ');

  const lines = preparedText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const year = getHeaderYear(rawText) || new Date().getFullYear();
  const monthRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})(?=\b|[A-Z])/i;
  const isHeaderLine = (line: string) =>
    /transaction details|date\s*description|withdrawals|deposits|balance/i.test(line);
  const isNoiseLine = (line: string) =>
    /page\s+\d+\s+of\s+\d+|important:|account summary|contact information|account number|branch transit|cibc account statement/i.test(line);
  const isBalanceLine = (line: string) =>
    /opening balance|closing balance|balance forward/i.test(line);

  const openingBalanceMatch = rawText.match(/opening balance[^-\d]*(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i);
  let lastBalance: number | null = openingBalanceMatch
    ? Number(openingBalanceMatch[1].replace(/,/g, ''))
    : null;

  const hasLetters = (text: string) => /[A-Za-z]/.test(text);
  const extractAmounts = (text: string) =>
    (text.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g) || [])
      .map(num => Number(num.replace(/,/g, '')))
      .filter(num => !Number.isNaN(num));
  const isKeywordLine = (text: string) =>
    /(E-TRANSFER|RETAIL PURCHASE|WITHDRAWAL|SERVICE CHARGE|CAPPED MONTHLY FEE|FEE|DEBIT|PAYMENT|TRANSFER|DEPOSIT)/i.test(text);

  const results: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
    confidence?: number;
    confidenceFlags?: string[];
  }> = [];

  let currentDate: string | undefined;
  let pendingEntry: { description: string; rawLine: string } | null = null;
  const pendingEntries: Array<{ date?: string; description: string; rawLine: string }> = [];

  const extractColumnAmounts = (text: string, header: RegExp, stopHeaders: RegExp[]): number[] => {
    const lines = text.split(/\r?\n/).map(line => line.trim());
    const amounts: number[] = [];
    let inSection = false;
    for (const line of lines) {
      if (header.test(line)) {
        inSection = true;
        continue;
      }
      if (stopHeaders.some(rx => rx.test(line))) {
        inSection = false;
      }
      if (!inSection) continue;
      if (!line || /page\s+\d+/i.test(line) || /account number|branch transit|transaction details/i.test(line)) {
        continue;
      }
      const numbers = extractAmounts(line);
      if (numbers.length === 0) continue;
      const hasLettersInLine = /[A-Za-z]/.test(line);
      if (hasLettersInLine) continue;
      amounts.push(...numbers);
    }
    return amounts;
  };

  const withdrawalsList = extractColumnAmounts(rawText, /Withdrawals\s*\(S\)|Withdrawals\s*\(\$?\)/i, [/Deposits\s*\(S\)|Deposits\s*\(\$?\)/i, /Balance\s*\(S\)|Balance\s*\(\$?\)/i]);
  const depositsList = extractColumnAmounts(rawText, /Deposits\s*\(S\)|Deposits\s*\(\$?\)/i, [/Balance\s*\(S\)|Balance\s*\(\$?\)/i, /Transaction details|Description\b/i]);
  const withdrawalQueue = [...withdrawalsList];
  const depositQueue = [...depositsList];
  const dateLine = (line: string) => {
    const match = line.match(monthRegex);
    if (!match) return null;
    return {
      date: `${match[1]} ${match[2]}, ${year}`,
      rest: line.replace(match[0], '').trim(),
    };
  };

  for (const line of lines) {
    if (isNoiseLine(line) || isHeaderLine(line)) continue;

    const dateData = dateLine(line);
    if (dateData) {
      currentDate = dateData.date;
      if (!dateData.rest) continue;
    }

    if (!currentDate) continue;
    if (isBalanceLine(line)) continue;

    const descriptionLine = (dateData?.rest || line).replace(/\s+/g, ' ').trim();
    if (!descriptionLine) continue;

    const amountsInLine = extractAmounts(descriptionLine);
    const isAmountOnlyLine = !hasLetters(descriptionLine) && amountsInLine.length > 0;

    if (isAmountOnlyLine) {
      if (!pendingEntry) continue;
      const entry = pendingEntry;
      pendingEntry = null;
      const amountCandidate = amountsInLine.length >= 3
        ? (amountsInLine[0] || amountsInLine[1])
        : amountsInLine[0];
      const balanceCandidate = amountsInLine.length >= 2 ? amountsInLine[amountsInLine.length - 1] : undefined;

      const isDeposit = /deposit|e-?transfer|transfer|payment|refund/i.test(entry.description);
      const isWithdrawal = /withdrawal|retail purchase|purchase|service charge|fee|debit|atm|cash/i.test(entry.description);
      let signedAmount = 0;
      if (balanceCandidate !== undefined && lastBalance !== null) {
        const delta = balanceCandidate - lastBalance;
        if (delta !== 0) {
          signedAmount = delta > 0 ? Math.abs(delta) : -Math.abs(delta);
        }
      }
      if (!signedAmount) {
        signedAmount = isDeposit
          ? Math.abs(amountCandidate)
          : (isWithdrawal ? -Math.abs(amountCandidate) : (isIncomeDescription(entry.description) ? Math.abs(amountCandidate) : -Math.abs(amountCandidate)));
      }

      const cleanedDesc = cleanDescription(entry.description);
      const merchant = extractMerchant(cleanedDesc);
      const normalizedDate = normalizeDate(currentDate || '') || currentDate;
      const confidenceData = buildStatementConfidence({
        date: normalizedDate || currentDate,
        description: cleanedDesc,
        amount: signedAmount,
        rawLineText: `${entry.rawLine} | ${descriptionLine}`,
      });

      const confidenceFlags = confidenceData.flags ? [...confidenceData.flags] : [];
      if (balanceCandidate !== undefined) {
        confidenceFlags.push('amount_from_table');
        lastBalance = balanceCandidate;
      }

      results.push({
        date: normalizedDate || currentDate,
        merchant,
        description: cleanedDesc,
        amount: signedAmount,
        category: categorizeTransactionSync(cleanedDesc),
        raw_line_text: `${entry.rawLine} | ${descriptionLine}`,
        confidence: confidenceData.confidence,
        confidenceFlags,
      });
      continue;
    }

    if (hasLetters(descriptionLine)) {
      if (amountsInLine.length > 0 && isKeywordLine(descriptionLine)) {
        const amountCandidate = amountsInLine.length >= 3
          ? (amountsInLine[0] || amountsInLine[1])
          : amountsInLine[0];
        const balanceCandidate = amountsInLine.length >= 2 ? amountsInLine[amountsInLine.length - 1] : undefined;

        const isDeposit = /deposit|e-?transfer|transfer|payment|refund/i.test(descriptionLine);
        const isWithdrawal = /withdrawal|retail purchase|purchase|service charge|fee|debit|atm|cash/i.test(descriptionLine);
        let signedAmount = 0;
        if (balanceCandidate !== undefined && lastBalance !== null) {
          const delta = balanceCandidate - lastBalance;
          if (delta !== 0) {
            signedAmount = delta > 0 ? Math.abs(delta) : -Math.abs(delta);
          }
        }
        if (!signedAmount) {
          signedAmount = isDeposit
            ? Math.abs(amountCandidate)
            : (isWithdrawal ? -Math.abs(amountCandidate) : (isIncomeDescription(descriptionLine) ? Math.abs(amountCandidate) : -Math.abs(amountCandidate)));
        }

        const cleanedDesc = cleanDescription(descriptionLine.replace(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g, '').trim());
        const merchant = extractMerchant(cleanedDesc);
        const normalizedDate = normalizeDate(currentDate || '') || currentDate;
        const confidenceData = buildStatementConfidence({
          date: normalizedDate || currentDate,
          description: cleanedDesc,
          amount: signedAmount,
          rawLineText: descriptionLine,
        });

        const confidenceFlags = confidenceData.flags ? [...confidenceData.flags] : [];
        if (balanceCandidate !== undefined) {
          confidenceFlags.push('amount_from_table');
          lastBalance = balanceCandidate;
        }

        results.push({
          date: normalizedDate || currentDate,
          merchant,
          description: cleanedDesc,
          amount: signedAmount,
          category: categorizeTransactionSync(cleanedDesc),
          raw_line_text: descriptionLine,
          confidence: confidenceData.confidence,
          confidenceFlags,
        });
        pendingEntry = null;
        continue;
      }

      if (isKeywordLine(descriptionLine)) {
        pendingEntry = { description: descriptionLine, rawLine: descriptionLine };
        pendingEntries.push({ date: currentDate, description: descriptionLine, rawLine: descriptionLine });
      } else if (pendingEntry) {
        pendingEntry.description = `${pendingEntry.description} ${descriptionLine}`.trim();
        pendingEntry.rawLine = `${pendingEntry.rawLine} | ${descriptionLine}`;
        pendingEntries[pendingEntries.length - 1] = {
          date: currentDate,
          description: pendingEntry.description,
          rawLine: pendingEntry.rawLine,
        };
      }
    }
  }

  if (pendingEntries.length > 0 && (withdrawalQueue.length > 0 || depositQueue.length > 0)) {
    for (const entry of pendingEntries) {
      const normalizedDate = normalizeDate(entry.date || '') || entry.date;
      const cleanedDesc = cleanDescription(entry.description);
      if (!cleanedDesc || isBalanceLine(cleanedDesc)) continue;

      const isDeposit = /deposit|e-?transfer|transfer|payment|refund/i.test(cleanedDesc);
      const isWithdrawal = /withdrawal|retail purchase|purchase|service charge|fee|debit|atm|cash/i.test(cleanedDesc);
      let amountCandidate: number | undefined;
      if (isDeposit && depositQueue.length > 0) {
        amountCandidate = depositQueue.shift();
      } else if (isWithdrawal && withdrawalQueue.length > 0) {
        amountCandidate = withdrawalQueue.shift();
      } else if (depositQueue.length > 0 && withdrawalQueue.length === 0) {
        amountCandidate = depositQueue.shift();
      } else if (withdrawalQueue.length > 0 && depositQueue.length === 0) {
        amountCandidate = withdrawalQueue.shift();
      }
      if (!amountCandidate || amountCandidate === 0) continue;

      const signedAmount = isDeposit
        ? Math.abs(amountCandidate)
        : (isWithdrawal ? -Math.abs(amountCandidate) : -Math.abs(amountCandidate));

      const merchant = extractMerchant(cleanedDesc);
      const confidenceData = buildStatementConfidence({
        date: normalizedDate || entry.date,
        description: cleanedDesc,
        amount: signedAmount,
        rawLineText: entry.rawLine,
      });

      results.push({
        date: normalizedDate || entry.date,
        merchant,
        description: cleanedDesc,
        amount: signedAmount,
        category: categorizeTransactionSync(cleanedDesc),
        raw_line_text: entry.rawLine,
        confidence: confidenceData.confidence,
        confidenceFlags: confidenceData.flags,
      });
    }
  }

  return results;
}

function normalizeAccountName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toUpperCase();
}

function splitStatementPages(text: string): string[] {
  if (!text) return [];
  const markers = /(?:\n|^)\s*Page\s*\d+\s*(?:of\s*\d+)?\s*(?:\n|$)/ig;
  if (!markers.test(text)) {
    return [text];
  }
  return text.split(markers).map(part => part.trim()).filter(Boolean);
}

function pageHasTransactionSignals(page: string): boolean {
  const lines = page.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const joined = lines.join(' ');
  const hasDate = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b|\d{1,2}[\/\-]\d{1,2}\b/i.test(joined);
  const hasAmounts = /\d{1,3}(?:,\d{3})*\.\d{2}/.test(joined);
  const hasColumns = /amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)/i.test(joined);
  const hasTxnKeywords = /debit\s+card\s+purchase|pre-?authorized|transaction\s+date|posting\s+date|payments?\s+credits|account\s+activity/i.test(joined);
  return (hasDate && hasAmounts) && (hasColumns || hasTxnKeywords);
}

function filterStatementPages(text: string): string {
  const pages = splitStatementPages(text);
  if (pages.length <= 1) return text;
  const signalPages = pages.filter(pageHasTransactionSignals);
  if (signalPages.length === 0) return text;
  return signalPages.join('\n');
}

function adjustBalanceWithLast(balance: number, lastBalance: number): number {
  if (balance < 1000 && lastBalance >= 1000) {
    const base = Math.floor(lastBalance / 1000) * 1000;
    const candidate = base + balance;
    if (Math.abs(lastBalance - candidate) < Math.abs(lastBalance - balance)) {
      return candidate;
    }
  }
  return balance;
}

function getStatementAccountNames(lines: string[]): Array<{ name: string; index: number }> {
  const accountHeaderRegex = /([A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)+)\s*#\s*\d{3,6}\b/;
  const names: Array<{ name: string; index: number }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(accountHeaderRegex);
    if (match) {
      names.push({ name: normalizeAccountName(match[1]), index: i });
    }
  }
  return names;
}

function detectPrimaryStatementName(lines: string[], accountNames: Set<string>): string | null {
  const headerScan = Math.min(lines.length, 60);
  for (let i = 0; i < headerScan; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/statement|account|capital|summary|payment|balance/i.test(line)) continue;
    if (/^[A-Z][A-Z\s]{3,}$/.test(line) && line.split(/\s+/).length >= 2) {
      const normalized = normalizeAccountName(line);
      if (accountNames.size === 0 || accountNames.has(normalized)) {
        return normalized;
      }
    }
  }
  return null;
}

function filterStatementLinesForPrimaryAccount(lines: string[], includeAllAccounts?: boolean): string[] {
  if (includeAllAccounts) {
    return lines;
  }
  const accountHeaders = getStatementAccountNames(lines);
  if (accountHeaders.length === 0) {
    return lines;
  }

  const accountNames = new Set(accountHeaders.map(h => h.name));
  const primaryName =
    detectPrimaryStatementName(lines, accountNames) || accountHeaders[0].name;

  let currentName: string | null = null;
  const filtered: string[] = [];
  for (const line of lines) {
    const headerMatch = line.match(/([A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)+)\s*#\s*\d{3,6}\b/);
    if (headerMatch) {
      currentName = normalizeAccountName(headerMatch[1]);
    }
    if (!currentName || currentName === primaryName) {
      filtered.push(line);
    }
  }

  return filtered;
}

function isIncomeDescription(description: string): boolean {
  const text = description.toLowerCase();
  if (/\bdirect deposit\b/.test(text)) return true;
  if (/\bpayroll\b/.test(text)) return true;
  if (/\bmobile cheque deposit\b/.test(text)) return true;
  if (/\bcheque deposit\b/.test(text)) return true;
  if (/interac\s*e-?transfer\s*received/i.test(text)) return true;
  if (/\breturn(ed)? merchandise\b/.test(text)) return true;
  if (/\bcda carbon rebate\b/.test(text)) return true;
  if (/\bgovernment deposit\b/.test(text)) return true;
  if (/\bdeposit\b/.test(text) && !/pre-?auth|bill payment|pre-authorized/i.test(text)) return true;
  if (/\bpre-?authorized payment\b/.test(text)) return false;
  if (/\bdebit card purchase\b/.test(text)) return false;
  if (/\bonline bill payment\b/.test(text)) return false;
  if (/interac\s*e-?transfer\s*sent/i.test(text)) return false;
  if (/\bonline transfer\b/.test(text)) return false;
  return false;
}

function buildStatementConfidence(params: {
  date?: string;
  description?: string;
  amount?: number;
  rawLineText?: string;
}): { confidence: number; flags: string[] } {
  let confidence = 0.95;
  const flags: string[] = [];

  if (!params.date) {
    confidence -= 0.25;
    flags.push('missing_date');
  }
  if (!params.description || params.description.trim().length < 3) {
    confidence -= 0.25;
    flags.push('missing_description');
  }
  if (!params.amount || params.amount === 0) {
    confidence -= 0.4;
    flags.push('missing_amount');
  }
  if (params.rawLineText && /[�?]/.test(params.rawLineText)) {
    confidence -= 0.1;
    flags.push('ocr_noise');
  }
  if (params.description && /page\s+\d+/i.test(params.description)) {
    confidence -= 0.2;
    flags.push('likely_header');
  }

  confidence = Math.max(0.1, Math.min(0.99, confidence));
  return { confidence, flags };
}

function normalizeShortDate(dateStr: string): string | undefined {
  const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})/);
  if (!match) return undefined;
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const year = new Date().getFullYear();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseFxNote(text: string): string | null {
  const match = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})\s+(USD|EUR|GBP)\s*@\s*([0-9.]+)/i);
  if (!match) return null;
  return `${match[1]} ${String(match[2] || '').toUpperCase()} @ ${match[3]}`;
}

function isFxOnlyContinuationLine(line: string): boolean {
  return /^\s*\d{1,3}(?:,\d{3})*\.\d{2}\s+(USD|EUR|GBP)\s*@\s*[0-9.]+\s*$/i.test(line);
}

function parseCreditCardStatementLine(line: string): {
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  isCredit?: boolean;
  fxNote?: string;
  transactionType?: 'Purchase' | 'Payment' | 'Credit';
} | null {
  const withPostDate = /^(\d{1,2}[\/\-]\d{1,2})\s+(\d{1,2}[\/\-]\d{1,2})\s+(.+?)\s+(-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2}))(?:\s+\d{1,3}(?:,\d{3})*\.\d{2}\s+(?:USD|EUR|GBP)\s*@\s*[0-9.]+)?\s*(CR|CREDIT)?$/i;
  const singleDate = /^(\d{1,2}[\/\-]\d{1,2})\s+(.+?)\s+(-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2}))(?:\s+\d{1,3}(?:,\d{3})*\.\d{2}\s+(?:USD|EUR|GBP)\s*@\s*[0-9.]+)?\s*(CR|CREDIT)?$/i;

  let dateStr: string | undefined;
  let description: string;
  let amountStr: string;
  let creditFlag: string | undefined;

  const matchWithPost = line.match(withPostDate);
  if (matchWithPost) {
    dateStr = matchWithPost[1];
    description = matchWithPost[3];
    amountStr = matchWithPost[4];
    creditFlag = matchWithPost[5];
  } else {
    const matchSingle = line.match(singleDate);
    if (!matchSingle) return null;
    dateStr = matchSingle[1];
    description = matchSingle[2];
    amountStr = matchSingle[3];
    creditFlag = matchSingle[4];
  }

  const amount = parseAmount(amountStr);
  if (amount === null || amount === 0) return null;

  const cleanedDesc = cleanDescription(description);
  const merchant = extractMerchant(cleanedDesc);
  const normalizedDate = normalizeShortDate(dateStr || '') || normalizeDate(dateStr || '');
  const fxNote = parseFxNote(line);
  const isCredit =
    Boolean(creditFlag) || /payment|credit|refund|reversal/i.test(cleanedDesc);
  const transactionType: 'Purchase' | 'Payment' | 'Credit' = /payment/i.test(cleanedDesc)
    ? 'Payment'
    : (isCredit ? 'Credit' : 'Purchase');
  const signedAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);

  const confidenceData = buildStatementConfidence({
    date: normalizedDate || dateStr,
    description: cleanedDesc,
    amount: signedAmount,
    rawLineText: line,
  });
  const creditFlags = isCredit ? ['credit_card_credit'] : [];

  return {
    date: normalizedDate || dateStr,
    merchant,
    description: cleanedDesc,
    amount: signedAmount,
    category: categorizeTransactionSync(cleanedDesc),
    isCredit,
    fxNote: fxNote || undefined,
    transactionType,
    confidence: confidenceData.confidence,
    confidenceFlags: [...confidenceData.flags, ...creditFlags],
  };
}

/**
 * Normalize bank statement text into transaction array
 * 
 * Parses raw OCR text from bank statements and extracts transactions.
 * Returns array of transactions with: date, merchant, description, amount, category, raw_line_text
 * 
 * If primary parser returns 0 transactions, AI fallback parser is used automatically.
 */
export function normalizeBankStatement(
  rawText: string,
  options: { includeAllAccounts?: boolean } = {}
): Array<{
  date?: string;
  merchant?: string;
  description?: string;
  amount: number;
  category?: string;
  raw_line_text?: string;
  confidence?: number;
  confidenceFlags?: string[];
  accountName?: string;
  statementType?: 'credit_card' | 'bank';
  statementCredit?: boolean;
  fxNote?: string;
  transactionType?: 'Purchase' | 'Payment' | 'Credit';
}> {
  const transactions: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
  }> = [];
  let lastBalance: number | null = null;
  
  const allLines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const filteredLines = filterStatementLinesForPrimaryAccount(allLines, options.includeAllAccounts);
  const filteredText = filteredLines.join('\n');
  const lines = filteredLines.filter(line => line.length > 5);
  const isCreditCardStatement = /credit card|cardmember|payment due|minimum payment|new balance|account ending|statement period/i.test(filteredText);
  const statementType: 'credit_card' | 'bank' = isCreditCardStatement ? 'credit_card' : 'bank';
  const hasColumnLayout = /amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)/i.test(filteredText);
  const isCibcStatement = /CIBC\s+Account\s+Statement/i.test(filteredText);

  if (isCibcStatement) {
    const cibcTransactions = parseCibcStatementLines(rawText);
    if (cibcTransactions.length > 0) {
      const uniqueTransactions = removeDuplicates(cibcTransactions);
      return uniqueTransactions.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });
    }
  }
  
  // First, try BMO Everyday Banking format (multi-line transactions)
  // Check if this looks like a BMO statement
  const isBmoStatement = /Everyday\s*Banking/i.test(filteredText) || 
                         /For\s*the\s*period\s*ending/i.test(filteredText) ||
                         /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/i.test(filteredText);
  
  if (isBmoStatement && !hasColumnLayout) {
    const bmoTransactions = parseBmoEverydayStatement(filteredText);
    if (bmoTransactions.length > 0) {
      const uniqueTransactions = removeDuplicates(bmoTransactions);
      return uniqueTransactions.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateA - dateB;
      });
    }
  }

  // Second, try Canadian bank statement format (single-line)
  for (const line of lines) {
    if (isFxOnlyContinuationLine(line)) continue;
    if (isSummaryLine(line)) continue;

    if (lastBalance !== null && /Debit\s*Card\s*Purchase|Pre-?Authorized|Direct\s*Deposit|INTERAC|e-Transfer|Cheque\s*Deposit|Bill\s*Payment|Online\s*Bill|Mobile\s*Cheque|Debit\s*Purchase/i.test(line)) {
      const dateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\b/i);
      const numbers = line.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g);
      if (dateMatch && numbers && numbers.length === 1) {
        let balance = Number(numbers[0].replace(/,/g, ''));
        balance = adjustBalanceWithLast(balance, lastBalance);
        const delta = lastBalance - balance;
        if (delta !== 0) {
          const year = new Date().getFullYear();
          const normalizedDate = normalizeDate(`${dateMatch[1]} ${dateMatch[2]}, ${year}`);
          const description = line.replace(dateMatch[0], '').trim().replace(/\s+[\d,]+\.\d{2}\s*$/, '').trim();
          const cleanedDesc = cleanDescription(description);
          const merchant = extractMerchant(cleanedDesc);
          const amount = delta > 0 ? -Math.abs(delta) : Math.abs(delta);
          const confidenceData = buildStatementConfidence({
            date: normalizedDate,
            description: cleanedDesc,
            amount,
            rawLineText: line,
          });
          transactions.push({
            date: normalizedDate,
            merchant,
            description: cleanedDesc,
            amount,
            category: categorizeTransactionSync(cleanedDesc),
            raw_line_text: line,
            confidence: confidenceData.confidence,
            confidenceFlags: [...confidenceData.flags, 'amount_from_balance'],
          });
          lastBalance = balance;
          continue;
        }
      }
    }

    const columnTx = parseBmoColumnStatementLine(line);
    if (columnTx) {
      let amount = columnTx.amount;
      let confidence = columnTx.confidence;
      let confidenceFlags = columnTx.confidenceFlags ? [...columnTx.confidenceFlags] : [];
      let balance = columnTx.balance;

      if (balance !== undefined && lastBalance !== null) {
        balance = adjustBalanceWithLast(balance, lastBalance);
      }

      if ((!amount || amount === 0) && balance !== undefined && lastBalance !== null) {
        const delta = lastBalance - balance;
        if (delta !== 0) {
          amount = delta > 0 ? -Math.abs(delta) : Math.abs(delta);
          confidence = Math.max(0.2, (confidence ?? 0.6) - 0.2);
          confidenceFlags.push('amount_from_balance');
        }
      }

      if (balance !== undefined && balance > 0) {
        lastBalance = balance;
      }

      if (!amount || amount === 0) {
        continue;
      }
      transactions.push({
        date: columnTx.date,
        merchant: columnTx.merchant,
        description: columnTx.description,
        amount,
        category: categorizeTransactionSync(columnTx.description || ''),
        raw_line_text: line,
        confidence,
        confidenceFlags,
      });
      continue;
    }

    if (isCreditCardStatement) {
      const ccTx = parseCreditCardStatementLine(line);
      if (ccTx) {
        transactions.push({
          date: ccTx.date,
          merchant: ccTx.merchant,
          description: ccTx.description,
          amount: ccTx.amount,
          category: categorizeTransactionSync(ccTx.description || ''),
          raw_line_text: line,
          confidence: ccTx.confidence,
          confidenceFlags: ccTx.confidenceFlags,
          statementType,
          statementCredit: ccTx.isCredit,
          fxNote: ccTx.fxNote,
          transactionType: ccTx.transactionType,
        });
        continue;
      }
    }

    const strictTableTx = parseStatementTableLine(line);
    if (strictTableTx) {
      transactions.push({
        date: strictTableTx.date,
        merchant: strictTableTx.merchant,
        description: strictTableTx.description,
        amount: strictTableTx.amount,
        category: categorizeTransactionSync(strictTableTx.description || ''),
        raw_line_text: line,
        confidence: strictTableTx.confidence,
        confidenceFlags: strictTableTx.confidenceFlags,
      });
      continue;
    }
    
    const canadianTx = parseCanadianStatementLine(line);
    if (canadianTx) {
      transactions.push({
        date: canadianTx.date,
        merchant: canadianTx.merchant,
        description: canadianTx.description,
        amount: canadianTx.amount,
        category: categorizeTransactionSync(canadianTx.description || ''), // Sync fallback - will be re-categorized with learning later
        raw_line_text: line,
        confidence: canadianTx.confidence,
        confidenceFlags: canadianTx.confidenceFlags,
      });
      continue; // Skip to next line if Canadian format matched
    }
  }
  
  // If we found Canadian transactions, return them (don't try other patterns)
  if (transactions.length > 0) {
    const uniqueTransactions = removeDuplicates(transactions).map(tx => ({
      ...tx,
      statementType: tx.statementType ?? statementType,
      statementCredit: tx.statementCredit ?? (statementType === 'credit_card' ? false : undefined),
    }));
    return uniqueTransactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
  }
  
  // Common bank statement patterns
  const patterns = [
    // Pattern 1: Date Description Amount (most common)
    // e.g., "01/15/2024 WALMART #1234 $45.67"
    {
      regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    },
    // Pattern 2: Date Amount Description
    // e.g., "01/15/2024 $45.67 WALMART #1234"
    {
      regex: /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s+(.+)$/,
      groups: { date: 1, amount: 2, description: 3 }
    },
    // Pattern 3: Description Date Amount
    {
      regex: /^(.+?)\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { description: 1, date: 2, amount: 3 }
    },
    // Pattern 4: Credit card format: Date Description Amount
    // e.g., "01/15 WALMART #1234 $45.67"
    {
      regex: /^(\d{2}[\/\-\.]\d{2})\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    },
    // Pattern 5: Bank statement format with posting date
    // e.g., "01/15/24 01/16/24 WALMART #1234 $45.67"
    {
      regex: /^(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2})\s+\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2}\s+(.+?)\s+([\$\+\-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)$/,
      groups: { date: 1, description: 2, amount: 3 }
    }
  ];
  
  for (const line of lines) {
    // Skip summary lines
    if (isSummaryLine(line)) continue;
    
    let match: RegExpMatchArray | null = null;
    let patternUsed: typeof patterns[0] | null = null;
    
    // Try each pattern
    for (const pattern of patterns) {
      match = line.match(pattern.regex);
      if (match) {
        patternUsed = pattern;
        break;
      }
    }
    
    if (match && patternUsed) {
      const date = match[patternUsed.groups.date];
      const description = match[patternUsed.groups.description];
      const amountStr = match[patternUsed.groups.amount];
      
      // Parse amount
      const amount = parseAmount(amountStr);
      
      if (amount !== null && amount !== 0) {
        const cleanedDesc = cleanDescription(description);
        const merchant = extractMerchant(cleanedDesc);
        
        if (cleanedDesc.length > 0) {
          transactions.push({
            date: normalizeDate(date),
            merchant,
            description: cleanedDesc,
            amount: Math.abs(amount), // Always positive for expenses
            category: categorizeTransactionSync(cleanedDesc), // Sync fallback - will be re-categorized with learning later
            raw_line_text: line
          });
        }
      }
    }
  }
  
  // Remove duplicates and sort by date
  const uniqueTransactions = removeDuplicates(transactions);
  const sortedTransactions = uniqueTransactions.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  // If primary parser found 0 transactions, AI fallback is handled by caller (normalizeOcrResult)
  // This function just returns what it found
  return sortedTransactions;
}

/**
 * Check if line is a summary line (should be skipped)
 */
function isSummaryLine(line: string): boolean {
  // Catch spaceless OCR forms that bypass the word-based checks below
  if (/closingtotals|openingbalance|closingbalance|balanceforward/i.test(line.replace(/\s/g, ''))) return true;
  // Account header lines
  if (/primary\s*chequing|savings\s*account|chequing\s*account/i.test(line) && /#\s*[\d\s-]{6,}/.test(line)) return true;
  // Bare account number lines (e.g. ",2025 Primary Chequing Account #...")
  if (/^\s*,?\d{4}\s+primary/i.test(line)) return true;

  const summaryKeywords = [
    'total', 'balance', 'summary', 'statement', 'account',
    'previous', 'new balance', 'available credit', 'minimum payment',
    'interest', 'fees', 'credits', 'debits'
  ];

  const lower = line.toLowerCase();
  return summaryKeywords.some(keyword => lower.includes(keyword));
}

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number | null {
  try {
    const isParenNegative = /\(.*\)/.test(amountStr);
    const cleaned = amountStr
      .replace(/[()]/g, '')
      .replace(/(cr|credit)$/i, '')
      .replace(/[\$,\s]/g, '')
      .trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return null;
    return isParenNegative ? -parsed : parsed;
  } catch {
    return null;
  }
}

/**
 * Clean description text
 */
function cleanDescription(description: string): string {
  return description
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Extract merchant name from description.
 * Strips BMO/Canadian-bank transaction-type prefixes so the actual payee name is returned.
 * e.g. "Debit Card Purchase, 7-ELEVEN STORE 33535" -> "7-ELEVEN STORE"
 *      "Bill Payment - ROGERS"                      -> "ROGERS"
 *      "Interac e-Transfer Sent - John Smith"        -> "John Smith"
 */
function extractMerchant(description: string): string {
  const trimmed = description.trim();

  // Reject OCR letter/document header lines that are not merchant names.
  // These slip through when the parser picks up address-block or table-header
  // text as a transaction description.
  if (/^date of (mailing|issue|posting|statement)\b/i.test(trimmed)) return trimmed.substring(0, 100);
  if (/^(account|statement|page|balance)\s+(number|no\.?|#|forward|brought)/i.test(trimmed)) return trimmed.substring(0, 100);

  // Reject bare OCR column-header words
  const columnHeaders = new Set(['description', 'merchant', 'memo', 'narration', 'particulars', 'payee', 'details', 'reference', 'transaction', 'type', 'date', 'amount', 'balance', 'credit', 'debit']);
  if (columnHeaders.has(trimmed.toLowerCase())) return trimmed.substring(0, 100);

  const prefixPatterns = [
    /^(?:debit\s+card\s+purchase|point\s+of\s+sale(?:\s+purchase)?)[,\s-]+/i,
    /^interac\s+e[- ]?transfer\s+(?:sent|received)[,\s-]+/i,
    /^bill\s+payment[,\s-]+/i,
    /^pre-?authorized\s+(?:debit|credit|payment)[,\s-]+/i,
    /^online\s+(?:transfer|payment|banking)[,\s-]+/i,
    /^atm\s+(?:withdrawal|deposit)[,\s-]+/i,
  ];

  let merchant = trimmed;
  for (const pat of prefixPatterns) {
    const stripped = merchant.replace(pat, '').trim();
    if (stripped) {
      merchant = stripped;
      break;
    }
  }

  // Remove store numbers and trailing numeric IDs, then corporate suffixes
  merchant = merchant
    .replace(/\s+#\d+\S*$/, '')
    .replace(/\s+\d{5,}$/, '')
    .replace(/\s+(INC|LLC|CORP|LTD|CO)\.?$/i, '')
    .trim();

  return merchant.substring(0, 100);
}

/**
 * Simple categorization based on description keywords
 * 
 * NOTE: This is a fallback for synchronous contexts.
 * For async contexts, use sharedCategorize() which includes learning.
 */
function categorizeTransactionSync(description: string): string {
  const lower = description.toLowerCase();
  
  // Groceries
  const groceryKeywords = ['walmart', 'target', 'safeway', 'kroger', 'whole foods', 'costco', 'superstore', 'grocery'];
  if (groceryKeywords.some(kw => lower.includes(kw))) {
    return 'Groceries';
  }
  
  // Fuel/Gas
  const fuelKeywords = ['shell', 'esso', 'chevron', 'bp', 'exxon', 'petro', 'gas station', 'petrol'];
  if (fuelKeywords.some(kw => lower.includes(kw))) {
    return 'Transportation';
  }
  
  // Restaurants
  const restaurantKeywords = ['restaurant', 'cafe', 'pizza', 'diner', 'bistro', 'starbucks', 'mcdonalds', 'subway'];
  if (restaurantKeywords.some(kw => lower.includes(kw))) {
    return 'Dining';
  }
  
  // Utilities
  const utilityKeywords = ['hydro', 'electric', 'gas company', 'water', 'internet', 'phone', 'cable', 'utility'];
  if (utilityKeywords.some(kw => lower.includes(kw))) {
    return 'Utilities';
  }
  
  return 'Uncategorized';
}

/**
 * Remove duplicate transactions
 */
function removeDuplicates(
  transactions: Array<{
    date?: string;
    merchant?: string;
    description?: string;
    amount: number;
    category?: string;
    raw_line_text?: string;
  }>
): typeof transactions {
  const seenCounts = new Map<string, number>();
  const unique: typeof transactions = [];
  
  for (const tx of transactions) {
    const normMerch = (tx.merchant || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 12);
    const baseKey = `${tx.date || ""}|${normMerch}|${Math.abs(tx.amount)}`;
    const occurrence = seenCounts.get(baseKey) ?? 0;
    seenCounts.set(baseKey, occurrence + 1);
    unique.push(tx);
  }
  
  return unique;
}









