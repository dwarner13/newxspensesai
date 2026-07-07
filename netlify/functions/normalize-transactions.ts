/**
 * Normalize Transactions Netlify Function
 * 
 * Converts OCR text from user_documents into normalized transactions
 * and saves them to transactions_staging table
 * 
 * Byte Speed Mode v2: Non-blocking background processing
 */

import type { Handler } from '@netlify/functions';
import { createHash } from 'crypto';
import { admin } from './_shared/supabase.js';
import { normalizeOcrResult } from './_shared/ocr_normalize.js';
import { parseInvoiceLike, parseReceiptLike } from './_shared/ocr_parsers.js';
import { safeTextMetrics } from './_shared/textHash.js';
import { runGuardrailsForText } from './_shared/guardrails-unified.js';
import { maskPII as maskPiiFallback } from './_shared/pii.js';

type ExtractedSummary = Record<string, any> | null;
type UserDocumentRow = {
  id: string;
  user_id?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  original_name?: string | null;
  status?: string | null;
  ocr_text?: string | null;
  ocr_text_hash?: string | null;
  ocr_text_length?: number | null;
  extracted_text_hash?: string | null;
  extracted_text_length?: number | null;
  extracted_data?: any;
  normalized_json?: any;
  metadata?: any;
  extraction_quality?: any;
  pages_detected?: number | null;
  ocr_completed_at?: string | null;
  ocr_engine?: string | null;
};
type NormalizationResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  documentId?: string;
  error?: { code: string; message: string };
  stagedCount?: number;
  importId?: string;
};

const AUTO_PURGE_SOURCE = process.env.OCR_AUTO_PURGE_SOURCE === '1';
const AUTO_PURGE_TEXT = process.env.OCR_AUTO_PURGE_TEXT === '1';
const NORMALIZE_DEBUG_ENABLED =
  String(process.env.VITE_LOG_LEVEL || '').toLowerCase() === 'debug' ||
  String(process.env.PRIME_DEBUG || '').toLowerCase() === 'true';
const NETLIFY_DEV_SOFT_TIMEOUT_MS = Number(process.env.NORMALIZE_DEV_SOFT_TIMEOUT_MS || 22000);
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISSUER_PATTERNS = [
  { match: /triangle/i, name: 'Canadian Tire - Triangle Mastercard' },
  { match: /canadian tire/i, name: 'Canadian Tire - Triangle Mastercard' },
  { match: /ctfs/i, name: 'Canadian Tire - Triangle Mastercard' },
  { match: /ct financial/i, name: 'Canadian Tire - Triangle Mastercard' },
  { match: /canadian tire bank/i, name: 'Canadian Tire - Triangle Mastercard' },
  { match: /world elite mastercard/i, name: 'Canadian Tire - Triangle Mastercard' },
  { match: /capital one/i, name: 'Capital One' },
  { match: /td bank|td canada trust/i, name: 'TD Bank' },
  { match: /rbc|royal bank of canada/i, name: 'RBC' },
  { match: /scotiabank|bank of nova scotia/i, name: 'Scotiabank' },
  { match: /cibc/i, name: 'CIBC' },
  { match: /bmo|bank of montreal/i, name: 'BMO' },
  { match: /desjardins/i, name: 'Desjardins' },
  { match: /national bank/i, name: 'National Bank' },
  { match: /tangerine/i, name: 'Tangerine' },
  { match: /simplii/i, name: 'Simplii Financial' },
  { match: /amex|american express/i, name: 'American Express' },
  { match: /hsbc/i, name: 'HSBC' },
];

function detectIssuerFromRawText(text: string): string | null {
  const raw = String(text || '');
  if (!raw) return null;
  for (const pattern of ISSUER_PATTERNS) {
    if (pattern.match.test(raw)) return pattern.name;
  }
  return null;
}

function isMissingColumnError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('column') && message.includes('does not exist');
}

async function fetchDocumentWithCompatibility(sb: any, documentId: string): Promise<{ doc: UserDocumentRow | null; error: any }> {
  const selectAttempts = [
    'id, user_id, storage_path, mime_type, original_name, status, ocr_text, ocr_text_hash, ocr_text_length, extracted_text_hash, extracted_text_length, extracted_data, normalized_json, metadata, extraction_quality, pages_detected, ocr_completed_at, ocr_engine',
    'id, user_id, storage_path, mime_type, original_name, status, ocr_text, ocr_text_hash, ocr_text_length, extracted_text_hash, extracted_text_length, extracted_data, normalized_json, metadata',
    'id, user_id, storage_path, mime_type, original_name, status, ocr_text, ocr_text_hash, ocr_text_length, extracted_text_hash, extracted_text_length, metadata',
    'id, storage_path, mime_type, original_name, status',
  ];

  let lastError: any = null;
  for (const selectClause of selectAttempts) {
    const { data, error } = await sb
      .from('user_documents')
      .select(selectClause)
      .eq('id', documentId)
      .single();
    if (!error) {
      return { doc: data as UserDocumentRow, error: null };
    }
    lastError = error;
    if (!isMissingColumnError(error)) {
      return { doc: null, error };
    }
  }
  return { doc: null, error: lastError };
}

function parseStatementSummary(text: string): ExtractedSummary {
  const normalized = text || '';
  const bmoEndMatch = normalized.match(/For\s*the\s*period\s*ending\s+([A-Za-z]+ \d{1,2},?\s*\d{4})/i);
  const periodMatch = bmoEndMatch ? [null, bmoEndMatch[1], bmoEndMatch[1]] :
    normalized.match(/Statement Period:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})\s*(?:to|-)\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i) ||
    normalized.match(/(?:statement|billing|account)\s+period:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})\s*(?:to|-)\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i) ||
    normalized.match(/(?:from|period:?)\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4})\s+to\s+([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i) ||
    normalized.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})\s*(?:to|-)\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i) ||
    normalized.match(/([A-Za-z]+\s+\d{1,2},?\s*\d{4})\s*-\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i);
  const newBalanceMatch = normalized.match(/New Balance\s*\$?([0-9,]+\.\d{2})/i);
  const minPaymentMatch = normalized.match(/Minimum Payment Due\s*\$?([0-9,]+\.\d{2})/i);
  const dueDateMatch = normalized.match(/Payment Due Date\s*([A-Za-z]{3,9}\s+\d{1,2},\s*\d{4})/i);
  const prevBalanceMatch = normalized.match(/Previous Balance\s*\$?([0-9,]+\.\d{2})/i);
  const paymentsMatch = normalized.match(/Payments\s*-?\s*\$?([0-9,]+\.\d{2})/i);
  const transactionsMatch = normalized.match(/Transactions\s*\+?\s*\$?([0-9,]+\.\d{2})/i);
  const interestMatch = normalized.match(/Interest Charged\s*\+?\s*\$?([0-9,]+\.\d{2})/i);
  const creditLimitMatch = normalized.match(/Credit Limit\s*\$?([0-9,]+\.\d{2})/i);
  const availableCreditMatch = normalized.match(/Available Credit\s*\$?([0-9,]+\.\d{2})/i);
  const issuerLineMatch =
    normalized.match(/(?:issuer|bank|financial institution|card issuer)\s*[:\-]\s*([^\n]{2,80})/i) ||
    normalized.match(/([A-Z][A-Za-z& ]{2,40})\s+(?:Visa|Mastercard|American Express|Amex)/i);
  const endingMatch =
    normalized.match(/ending(?:\s+with|\s+in)?\s+(\d{4})/i) ||
    normalized.match(/card\s*#\s*[0-9Xx*\- ]*(\d{4})/i) ||
    normalized.match(/account(?: number)?\s*(?:ending|ending in|#)?\s*[Xx*\- ]*(\d{4})/i);

  const inferIssuerFromText = (): string | undefined => detectIssuerFromRawText(normalized) || undefined;

  if (!periodMatch && !newBalanceMatch && !minPaymentMatch) {
    return null;
  }

  return {
    docType: 'statement',
    institution: (issuerLineMatch?.[1] || inferIssuerFromText() || '').trim() || undefined,
    account_last4: endingMatch?.[1] || undefined,
    statement_period: periodMatch ? (periodMatch[2] ? `${periodMatch[1]} - ${periodMatch[2]}` : periodMatch[1]) : undefined,
    new_balance: newBalanceMatch ? newBalanceMatch[1] : undefined,
    minimum_payment_due: minPaymentMatch ? minPaymentMatch[1] : undefined,
    due_date: dueDateMatch ? dueDateMatch[1] : undefined,
    previous_balance: prevBalanceMatch ? prevBalanceMatch[1] : undefined,
    payments: paymentsMatch ? paymentsMatch[1] : undefined,
    transactions: transactionsMatch ? transactionsMatch[1] : undefined,
    interest_charged: interestMatch ? interestMatch[1] : undefined,
    credit_limit: creditLimitMatch ? creditLimitMatch[1] : undefined,
    available_credit: availableCreditMatch ? availableCreditMatch[1] : undefined,
  };
}

function isLikelyCorruptedText(value: string): boolean {
  const text = String(value || '');
  if (!text || text.trim().length < 40) return false;
  const suspiciousChars = (text.match(/[ï¿½\u2500-\u257F\u2580-\u259F]/g) || []).length;
  const controlChars = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) || []).length;
  const alphaChars = (text.match(/[A-Za-z]/g) || []).length;
  const ratioNoise = (suspiciousChars + controlChars) / text.length;
  const ratioAlpha = alphaChars / text.length;
  return ratioNoise > 0.08 || ratioAlpha < 0.18;
}

/**
 * Extract BMO bank statement-level closing totals from raw OCR text.
 * Returns authoritative totalDeducted/totalAdded values that bypass
 * individual transaction parsing errors and dedup collisions.
 *
 * Handles two BMO layouts:
 *   - "Closing totals 11,525.46 11,627.36"  (deducted first, added second)
 *   - Separate "Total amounts deducted X" and "Total amounts added Y" lines
 */
function parseBmoStatementTotals(text: string): { totalDeducted: number; totalAdded: number; source: string } | null {
  const parse = (s: string) => parseFloat(s.replace(/,/g, ''));
  const isPositiveFinite = (n: number) => Number.isFinite(n) && n > 0;
  const totalsPlausible = (d: number, a: number): boolean => {
    if (!isPositiveFinite(d) || !isPositiveFinite(a)) return false;
    const ratio = Math.max(d, a) / Math.min(d, a);
    return ratio <= 50;
  };

  // Strategy 1: original inline "Closing totals D A" layout (gated — positional, can grab stray numbers)
  const closingMatch = text.match(/closing\s+totals\s+\$?([\d,]+\.\d{2})\s+\$?([\d,]+\.\d{2})/i);
  if (closingMatch) {
    const totalDeducted = parse(closingMatch[1]);
    const totalAdded = parse(closingMatch[2]);
    if (totalsPlausible(totalDeducted, totalAdded)) {
      return { totalDeducted, totalAdded, source: 'closing_totals_inline' };
    }
  }

  // Strategy 3 (promoted): separate labeled totals lines — highest confidence,
  // labels disambiguate semantically. NOT gated — labels are trusted.
  const deductedMatch = text.match(/total\s+amounts?\s+deducted[:\s]+\$?([\d,]+\.\d{2})/i);
  const addedMatch = text.match(/total\s+amounts?\s+added[:\s]+\$?([\d,]+\.\d{2})/i);
  if (deductedMatch && addedMatch) {
    const totalDeducted = parse(deductedMatch[1]);
    const totalAdded = parse(addedMatch[1]);
    if (isPositiveFinite(totalDeducted) && isPositiveFinite(totalAdded)) {
      return { totalDeducted, totalAdded, source: 'separate_totals_lines' };
    }
  }

  // Strategy 2: walk-forward from "Closing totals" anchor (gated — positional,
  // vulnerable to stray txn amounts bleeding into the footer area)
  const lines = text.split(/\r?\n/);
  const closingLineIdx = lines.findIndex((line) => /closing\s+totals/i.test(line));
  if (closingLineIdx >= 0) {
    const amountOnlyLine = /^\s*\$?(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/;
    const collected: number[] = [];
    const stopAt = Math.min(closingLineIdx + 9, lines.length);
    for (let i = closingLineIdx + 1; i < stopAt; i++) {
      const m = lines[i].match(amountOnlyLine);
      if (m) {
        const n = parse(m[1]);
        if (isPositiveFinite(n)) {
          collected.push(n);
          if (collected.length === 2) break;
        }
      }
    }
    if (collected.length === 2 && totalsPlausible(collected[0], collected[1])) {
      return { totalDeducted: collected[0], totalAdded: collected[1], source: 'closing_totals_walk_forward' };
    }

    // Diagnostic: anchor found but extraction failed. Fires once per failed call.
    const charIdx = text.search(/closing\s+totals/i);
    console.warn('[parseBmoStatementTotals] Anchor present but amounts not extracted', {
      textLength: text.length,
      anchorCharIndex: charIdx,
      before: charIdx > 0 ? text.slice(Math.max(0, charIdx - 80), charIdx) : '',
      anchorAndAfter: text.slice(charIdx, Math.min(text.length, charIdx + 400)),
      collectedSoFar: collected,
    });
  }

  return null;
}

async function sanitizePreCategorizationText(
  text: string,
  userId: string,
  documentId: string
): Promise<{ text: string; piiTypes: string[]; blockedReasons: string[] }> {
  const original = String(text || '');
  if (!original.trim()) {
    return { text: original, piiTypes: [], blockedReasons: [] };
  }

  try {
    const result = await runGuardrailsForText(original, userId, 'ingestion_ocr');
    let sanitized = String(result.text || '');
    const piiTypes = Array.isArray(result.signals?.piiTypes) ? result.signals.piiTypes : [];
    const blockedReasons = Array.isArray(result.reasons) ? result.reasons : [];

    // Keep categorization resilient: never pass empty text forward.
    if (!sanitized.trim()) {
      const fallback = maskPiiFallback(original, 'last4');
      sanitized = String(fallback.masked || '');
      console.warn('[normalize-transactions] Guardrails returned empty text; applied fallback redaction', {
        documentId,
        fallbackTypes: fallback.found.map((f) => f.type),
      });
    }

    if (!result.ok) {
      console.warn('[normalize-transactions] Pre-categorization guardrail signaled block; continuing with sanitized text', {
        documentId,
        reasons: blockedReasons,
      });
    }

    return {
      text: sanitized.trim() ? sanitized : original,
      piiTypes,
      blockedReasons,
    };
  } catch (error: any) {
    console.warn('[normalize-transactions] Pre-categorization guardrails failed; continuing with source text', {
      documentId,
      error: error?.message || String(error),
    });
    return { text: original, piiTypes: [], blockedReasons: [] };
  }
}

function parseIsoDate(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function parsePeriodRange(value: unknown): { periodStart: string | null; periodEnd: string | null } {
  const raw = String(value || '').trim();
  if (!raw) return { periodStart: null, periodEnd: null };
  const matches = raw.match(/\d{4}-\d{2}-\d{2}/g);
  if (matches && matches.length >= 2) {
    return { periodStart: matches[0], periodEnd: matches[1] };
  }
  return { periodStart: null, periodEnd: null };
}

function extractStatementMetaFromDoc(doc: UserDocumentRow, ocrInputText: string): {
  periodStart: string | null;
  periodEnd: string | null;
  accountLast4: string | null;
  issuer: string | null;
} {
  const extracted = doc?.extracted_data && typeof doc.extracted_data === 'object' ? doc.extracted_data : {};
  const statementSummary = parseStatementSummary(ocrInputText) || {};
  const parsedPeriod = parsePeriodRange(extracted?.statement_period || statementSummary?.statement_period || null);
  const periodStart =
    parseIsoDate(extracted?.statement_period_start || extracted?.period_start || parsedPeriod.periodStart) || null;
  const periodEnd =
    parseIsoDate(extracted?.statement_period_end || extracted?.period_end || parsedPeriod.periodEnd) || null;
  const accountRaw = String(
    extracted?.account_last4 ||
      extracted?.account_last_4 ||
      extracted?.last4 ||
      extracted?.last_4 ||
      ''
  ).trim();
  const accountDigits = accountRaw.replace(/\D/g, '');
  const accountLast4 = accountDigits ? accountDigits.slice(-4) : null;
  const issuerFromText = detectIssuerFromRawText(ocrInputText);
  const issuerCandidate = String(
    issuerFromText ||
      extracted?.issuer ||
      extracted?.institution ||
      extracted?.bank ||
      extracted?.card ||
      extracted?.card_name ||
      ''
  ).trim();
  return {
    periodStart,
    periodEnd,
    accountLast4,
    issuer: issuerCandidate || null,
  };
}

async function loadCommittedImportsForOverlap(sb: any, userId: string): Promise<any[]> {
  const selectAttempts = [
    'id, statement_breakdown_json, statement_breakdown, metadata, created_at',
    'id, statement_breakdown_json, metadata, created_at',
    'id, statement_breakdown, metadata, created_at',
    'id, metadata, created_at',
  ];
  for (const clause of selectAttempts) {
    const { data, error } = await sb
      .from('imports')
      .select(clause)
      .eq('user_id', userId)
      .eq('status', 'committed');
    if (!error) return Array.isArray(data) ? data : [];
  }
  return [];
}

async function checkForOverlappingImport(
  sb: any,
  userId: string,
  currentImportId: string,
  periodStart: string | null,
  periodEnd: string | null,
  accountLast4: string | null,
  issuer: string | null
): Promise<{ overlap: boolean; overlapping_import_id: string | null; message: string | null }> {
  if (!periodStart || !periodEnd) {
    return { overlap: false, overlapping_import_id: null, message: null };
  }

  try {
    const existingImports = await loadCommittedImportsForOverlap(sb, userId);
    if (!existingImports.length) {
      return { overlap: false, overlapping_import_id: null, message: null };
    }

    for (const imp of existingImports) {
      if (String(imp?.id || '') === String(currentImportId)) continue;
      const bd = imp?.statement_breakdown_json || imp?.statement_breakdown || imp?.metadata?.statement_breakdown || null;
      if (!bd?.statement_meta?.period_start || !bd?.statement_meta?.period_end) continue;

      const existStart = String(bd.statement_meta.period_start || '');
      const existEnd = String(bd.statement_meta.period_end || '');
      if (!existStart || !existEnd) continue;
      const existIssuer = String(bd?.statement_meta?.issuer || '').trim() || null;
      const existAccount = String(bd?.statement_meta?.account_last4 || '').trim() || null;

      const sameAccount = (!accountLast4 && !existAccount) || Boolean(accountLast4 && existAccount && accountLast4 === existAccount);
      const sameIssuer =
        (!issuer && !existIssuer) ||
        Boolean(issuer && existIssuer && issuer.toLowerCase() === existIssuer.toLowerCase());
      const datesOverlap = periodStart <= existEnd && existStart <= periodEnd;

      if (datesOverlap && (sameAccount || sameIssuer)) {
        console.log(
          `[OVERLAP] Import ${currentImportId} overlaps with ${imp.id}: ${existIssuer || 'unknown issuer'} ${existStart}-${existEnd}`
        );
        return {
          overlap: true,
          overlapping_import_id: String(imp.id),
          message: `This statement (${periodStart} to ${periodEnd}) overlaps with an existing ${existIssuer || 'statement'} import from ${existStart} to ${existEnd}. This may be a duplicate.`,
        };
      }
    }

    return { overlap: false, overlapping_import_id: null, message: null };
  } catch (err: any) {
    console.error('[OVERLAP] Check error:', err);
    return { overlap: false, overlapping_import_id: null, message: null };
  }
}

async function stampImportOverlapWarning(
  sb: any,
  userId: string,
  importId: string,
  overlapResult: { overlap: boolean; overlapping_import_id: string | null; message: string | null }
): Promise<void> {
  if (!overlapResult.overlap || !overlapResult.message) return;
  try {
    const { data: importRow } = await sb
      .from('imports')
      .select('metadata')
      .eq('id', importId)
      .eq('user_id', userId)
      .maybeSingle();
    const metadata =
      importRow?.metadata && typeof importRow.metadata === 'object'
        ? importRow.metadata
        : {};
    await sb
      .from('imports')
      .update({
        metadata: {
          ...metadata,
          overlap_warning: overlapResult.message,
          overlapping_import_id: overlapResult.overlapping_import_id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId)
      .eq('user_id', userId);
    console.log(`[OVERLAP WARNING] ${overlapResult.message}`);
  } catch (err: any) {
    console.error('[OVERLAP] Metadata stamp failed:', err);
  }
}
import OpenAI from 'openai';
import { visionStatementParser } from './_shared/visionStatementParser.js';

/**
 * Byte Speed Mode v2: Background normalization processing
 * Processes transactions asynchronously without blocking the response
 */
async function processNormalizationInBackground(
  userId: string,
  documentId: string,
  importRunId?: string,
  options?: { includeAllAccounts?: boolean; transientOcrText?: string; transientOcrTextHash?: string | null; transientOcrTextLength?: number }
): Promise<NormalizationResult> {
  const sb = admin();
  const userIdText = String(userId);

  if (!userId || !documentId) {
    console.error('[normalize-transactions] Missing userId or documentId');
    return { ok: false, error: { code: 'missing_required_fields', message: 'Missing userId or documentId' } };
  }

  let lockAcquired = false;
  const releaseNormalizationLock = async (): Promise<void> => {
    if (!lockAcquired) return;
    await sb
      .from('imports')
      .update({ status: 'ready', updated_at: new Date().toISOString() })
      .eq('document_id', documentId)
      .eq('status', 'normalizing');
  };

  try {
    // 1. Get document and OCR text
    const { doc, error: docError } = await fetchDocumentWithCompatibility(sb, documentId);

    if (docError || !doc) {
      console.error('[normalize-transactions] Error fetching document:', docError);
      return { ok: false, error: { code: 'doc_fetch_failed', message: docError?.message || 'Failed to fetch document' } };
    }

    // ---- Idempotency guard (NO migration safe) ----
    const metadata =
      doc?.metadata && typeof doc.metadata === 'object'
        ? (doc.metadata as Record<string, any>)
        : {};
    if ((metadata.normalized_cached === true && (doc?.transaction_count ?? 0) > 0) || doc?.normalized_json) {
      console.log('[normalize-transactions] Skip normalize - already normalized');
      return {
        ok: true,
        skipped: true,
        reason: 'already_normalized',
        documentId,
      };
    }

    // Check if this is an image that might need Vision parsing
    const isImage = doc.mime_type?.startsWith('image/') || false;
    const transientText = String(options?.transientOcrText || '');
    const transientTextPathActive = transientText.trim().length > 0;
    const ocrInputText = transientText || doc?.ocr_text || "";
    const guardrailedInput = await sanitizePreCategorizationText(ocrInputText, userIdText, documentId);
    let guardedOcrInputText = guardrailedInput.text;
    let hasOcrText = guardedOcrInputText.trim().length > 0;
    const docTextLengthValue =
      doc?.ocr_text_length ??
      doc?.extracted_text_length ??
      doc?.extracted_data?.text_length ??
      null;
    const docTextLength = Number.isFinite(Number(docTextLengthValue)) ? Number(docTextLengthValue) : 0;
    const docTextHash =
      doc?.ocr_text_hash ||
      doc?.extracted_text_hash ||
      doc?.extracted_data?.text_hash ||
      null;
    const hasExtractedData = Boolean(doc?.extracted_data) || Boolean(doc?.normalized_json);
    const docMetadata = metadata;
    const hasMetadataMarkers = Boolean(
      docMetadata?.extraction ||
      docMetadata?.ocr ||
      docMetadata?.pipeline ||
      doc?.extraction_quality ||
      Number(doc?.pages_detected || 0) > 0 ||
      doc?.ocr_completed_at ||
      doc?.ocr_engine
    );
    console.log('[normalize-transactions] document fields', {
      documentId,
      hasTextHash: Boolean(docTextHash),
      ocrTextLength: docTextLength,
      hasExtractedData,
      hasMetadataMarkers,
      transientTextPathActive,
    });
    console.log('[normalize-transactions] stage=normalize_input_source', {
      documentId,
      source: transientTextPathActive ? 'transient_ocrText' : (hasExtractedData ? 'structured_artifacts' : 'none'),
      transientLength: transientText.length,
      persistedLength: docTextLength,
      hasPersistedHash: Boolean(docTextHash),
    });
    if (NORMALIZE_DEBUG_ENABLED) {
      console.log('[normalize-transactions][debug] input source', {
        documentId,
        source: transientText ? 'transient_ocrText' : 'structured_only',
        textLength: guardedOcrInputText.length,
        textHash: options?.transientOcrTextHash || docTextHash,
        structuredTextLength: docTextLength,
      });
    }
    if (transientTextPathActive && isLikelyCorruptedText(guardedOcrInputText)) {
      console.warn('[Byte OCR WARNING] transient_text_is_corrupted', {
        documentId,
        source: 'transient_ocrText',
        textLength: guardedOcrInputText.length,
        preview: guardedOcrInputText.slice(0, 300),
      });
    }

    // Persist transient OCR text to user_documents BEFORE the lock attempt.
    // This prevents a race condition where the caller with text loses the lock
    // and the caller that wins has no text (producing 0 transactions).
    if (transientTextPathActive && guardedOcrInputText.length > 0) {
      try {
        await sb
          .from('user_documents')
          .update({
            ocr_text: guardedOcrInputText,
            ocr_text_length: guardedOcrInputText.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
        console.log('[normalize-transactions] Persisted transient OCR text to user_documents', {
          documentId,
          textLength: guardedOcrInputText.length,
        });
      } catch (e: any) {
        console.warn('[normalize-transactions] Failed to persist transient OCR text', {
          documentId,
          error: e?.message || String(e),
        });
      }
    }

    // 2) Find existing import (if any) BEFORE creating one.
    let { data: importRecord, error: importFetchError } = await sb
      .from('imports')
      .select('id, status, updated_at')
      .eq('document_id', documentId)
      .maybeSingle();

    if (importFetchError) {
      console.error('[normalize-transactions] Error fetching import:', importFetchError);
    }

    // ---- Early "no input" guard (prevents creating empty imports) ----
    // We only proceed if we have:
    // - OCR text metrics (hash or length), OR
    // - structured payloads already saved (extracted_data / normalized_json), OR
    // - explicit metadata markers that indicate structured extraction exists.
    const ocrTextLength = Number((doc as any)?.ocr_text_length || 0);
    const textHash = ((doc as any)?.text_hash as string | null) || docTextHash || null;
    const transientTextLength = Number.isFinite(Number(options?.transientOcrTextLength))
      ? Number(options?.transientOcrTextLength)
      : guardedOcrInputText.length;
    const transientTextHash =
      typeof options?.transientOcrTextHash === 'string' && options.transientOcrTextHash.length > 0
        ? options.transientOcrTextHash
        : null;
    const hasNormalizedJson = Boolean((doc as any)?.normalized_json);
    const hasMetadataReadyMarkers =
      Boolean(docMetadata?.ocr_cached) ||
      Boolean(docMetadata?.extraction_ready_marker) ||
      Boolean(docMetadata?.structured_ready) ||
      Boolean(docMetadata?.normalized_ready);

    const hasOcrSignals =
      Boolean(textHash) ||
      ocrTextLength > 0 ||
      Boolean(transientTextHash) ||
      transientTextLength > 0 ||
      hasOcrText;
    const hasStructuredSignals = hasExtractedData || hasNormalizedJson || hasMetadataMarkers || hasMetadataReadyMarkers;

    if (!hasOcrSignals && !hasStructuredSignals && !transientTextPathActive) {
      console.warn('[normalize-transactions] no input; skipping normalization', {
        documentId,
        importId: importRecord?.id || null,
        ocrTextLength,
        transientTextLength,
        hasTransientTextHash: Boolean(transientTextHash),
        hasExtractedData,
        hasNormalizedJson,
      });
      return {
        ok: false,
        skipped: true,
        reason: 'no_input',
        documentId,
        importId: importRecord?.id,
      };
    }

    if (!importRecord) {
      const { data: newImport, error: importError } = await sb
        .from('imports')
        .insert({
          user_id: userIdText,
          document_id: documentId,
          file_url: doc.storage_path || '',
          file_type: doc.mime_type || 'application/pdf',
          status: 'parsing',
        })
        .select('id, status, updated_at')
        .single();

      if (importError) {
        // Idempotency: a concurrent normalize call may have won the INSERT race.
        // Recover gracefully so this call can still acquire the normalizing lock.
        if (importError.code === '23505' || String(importError.message || '').toLowerCase().includes('duplicate')) {
          const { data: racedImport } = await sb
            .from('imports')
            .select('id, status, updated_at')
            .eq('document_id', documentId)
            .maybeSingle();
          if (racedImport?.id) {
            console.log('[normalize-transactions] stage=normalize_race_recovery', {
              documentId,
              importId: racedImport.id,
              status: racedImport.status,
            });
            importRecord = racedImport;
          } else {
            console.error('[normalize-transactions] Error creating import (no winner found):', importError);
            return { ok: false, error: { code: 'import_create_failed', message: importError.message } };
          }
        } else {
          console.error('[normalize-transactions] Error creating import:', importError);
          return { ok: false, error: { code: 'import_create_failed', message: importError.message } };
        }
      } else {
        importRecord = newImport;
      }
    }

    const lockTimestamp = new Date().toISOString();
    const { data: lockRows, error: lockError } = await sb
      .from('imports')
      .update({ status: 'normalizing', updated_at: lockTimestamp })
      .eq('id', importRecord.id)
      .in('status', ['ready', 'parsing', 'ocr_processing', 'uploaded'])
      .select('id, status');

    if (lockError) {
      console.error('[normalize-transactions] Normalization lock update failed', {
        importId: importRecord.id,
        error: lockError.message,
      });
      return { ok: false, error: { code: 'normalization_lock_failed', message: lockError.message }, importId: importRecord.id };
    }

    if (!lockRows || lockRows.length === 0) {
      const { data: latestImport } = await sb
        .from('imports')
        .select('id, status, updated_at')
        .eq('id', importRecord.id)
        .maybeSingle();
      const latestStatus = String(latestImport?.status || importRecord.status || '').toLowerCase();
      const updatedAtMs = latestImport?.updated_at ? Date.parse(String(latestImport.updated_at)) : NaN;
      const staleMs = Number.isFinite(updatedAtMs) ? Date.now() - updatedAtMs : Number.POSITIVE_INFINITY;
      const STALE_NORMALIZING_MS = 10000;

      if (latestStatus === 'parsed' || latestStatus === 'committed') {
        const { count: parsedCount } = await sb
          .from('transactions_staging')
          .select('id', { count: 'exact', head: true })
          .eq('import_id', importRecord.id);
        const parsedCountValue = Number(parsedCount || 0);
        if (latestStatus === 'parsed' && parsedCountValue === 0) {
          console.warn('[normalize-transactions] Parsed import has zero staging rows; attempting normalize recovery', {
            importId: importRecord.id,
          });
          const { error: reopenError } = await sb
            .from('imports')
            .update({ status: 'parsing', updated_at: new Date().toISOString() })
            .eq('id', importRecord.id)
            .eq('status', 'parsed');
          if (!reopenError) {
            const { data: recoveryLockRows, error: recoveryLockError } = await sb
              .from('imports')
              .update({ status: 'normalizing', updated_at: new Date().toISOString() })
              .eq('id', importRecord.id)
              .eq('status', 'parsing')
              .select('id, status');
            if (!recoveryLockError && Array.isArray(recoveryLockRows) && recoveryLockRows.length > 0) {
              lockAcquired = true;
            }
          }
        }
        if (lockAcquired) {
          // Continue normalization flow below.
        } else {
        console.log('[normalize-transactions] Import already parsed/committed; skip normalize', {
          importId: importRecord.id,
          status: latestStatus,
          stagedCount: parsedCountValue,
        });
        return {
          ok: true,
          skipped: true,
          reason: 'already_parsed',
          stagedCount: parsedCountValue,
          importId: importRecord.id,
        };
        }
      }

      if (latestStatus === 'normalizing' && staleMs >= STALE_NORMALIZING_MS) {
        const takeoverTimestamp = new Date().toISOString();
        const { data: takeoverRows, error: takeoverError } = await sb
          .from('imports')
          .update({ status: 'normalizing', updated_at: takeoverTimestamp })
          .eq('id', importRecord.id)
          .eq('status', 'normalizing')
          .select('id, status');
        if (!takeoverError && Array.isArray(takeoverRows) && takeoverRows.length > 0) {
          console.warn('[normalize-transactions] Recovered stale normalization lock', {
            importId: importRecord.id,
            staleMs,
          });
          lockAcquired = true;
        }
      }

      if (!lockAcquired) {
        console.log('[normalize-transactions] Normalization lock not acquired, skipping', {
          importId: importRecord.id,
          status: latestStatus || null,
          staleMs: Number.isFinite(staleMs) ? staleMs : null,
        });
        return {
          ok: true,
          skipped: true,
          reason: latestStatus === 'normalizing' ? 'normalization_in_progress' : 'lock_not_acquired',
          stagedCount: 0,
          importId: importRecord.id,
        };
      }
    }
    if (!lockAcquired) {
      lockAcquired = true;
    }

    // If we acquired the lock but have no OCR text, re-fetch from user_documents.
    // The other caller may have persisted transient text before losing the lock race.
    if (!hasOcrText && !transientTextPathActive) {
      try {
        const { data: freshDoc } = await sb
          .from('user_documents')
          .select('ocr_text, ocr_text_length')
          .eq('id', documentId)
          .maybeSingle();
        const persistedOcrText = String(freshDoc?.ocr_text || '').trim();
        if (persistedOcrText.length > 0) {
          console.log('[normalize-transactions] Recovered persisted OCR text after lock acquisition', {
            documentId,
            importId: importRecord.id,
            textLength: persistedOcrText.length,
          });
          const reGuardrailed = await sanitizePreCategorizationText(persistedOcrText, userIdText, documentId);
          guardedOcrInputText = reGuardrailed.text;
          hasOcrText = guardedOcrInputText.trim().length > 0;
        }
      } catch (e: any) {
        console.warn('[normalize-transactions] Failed to re-fetch persisted OCR text', {
          documentId,
          error: e?.message || String(e),
        });
      }
    }

    // Capture bank-printed statement totals from raw OCR text BEFORE any extraction
    // Phase 3 reconciliation gate in commit-import.ts reads these to verify row sums.
    // Runs unconditionally here so totals land even when extraction produces zero rows
    // (the BMO column-bleed failure mode). Was previously buried after the
    // "no transactions found" early-return at line ~1031 and got skipped on that path.
    // parseBmoStatementTotals returns null for non-BMO statements â†’ field stays unset.
    try {
      const bmoTotalsEarly = parseBmoStatementTotals(guardedOcrInputText);
      if (bmoTotalsEarly) {
        const { data: importSbdRowEarly } = await sb
          .from('imports')
          .select('statement_breakdown_json')
          .eq('id', importRecord.id)
          .maybeSingle();
        const existingSbdEarly =
          importSbdRowEarly?.statement_breakdown_json && typeof importSbdRowEarly.statement_breakdown_json === 'object'
            ? (importSbdRowEarly.statement_breakdown_json as Record<string, unknown>)
            : {};
        await sb
          .from('imports')
          .update({
            statement_breakdown_json: { ...existingSbdEarly, statementTotals: bmoTotalsEarly },
            updated_at: new Date().toISOString(),
          })
          .eq('id', importRecord.id);
        console.log('[normalize-transactions] Captured BMO statement totals (early)', {
          importId: importRecord.id,
          totalDeducted: bmoTotalsEarly.totalDeducted,
          totalAdded: bmoTotalsEarly.totalAdded,
          source: bmoTotalsEarly.source,
        });
      }
    } catch (totalsErrEarly: any) {
      console.warn('[normalize-transactions] Early BMO totals capture failed (non-fatal)', {
        importId: importRecord.id,
        error: totalsErrEarly?.message,
      });
    }

    const { count: existingStagingCount } = await sb
      .from('transactions_staging')
      .select('id', { count: 'exact', head: true })
      .eq('import_id', importRecord.id);

    if ((existingStagingCount || 0) > 0) {
      console.log('[normalize-transactions] Staging already populated, skipping', {
        importId: importRecord.id,
        stagedCount: existingStagingCount,
      });
      return { ok: true, stagedCount: existingStagingCount || 0, importId: importRecord.id };
    }

    // 3. Parse OCR text to transactions using shared normalizer
    const openaiClient = process.env.OPENAI_API_KEY
      ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      : null;

    let normalizedTransactions: any[] = [];
    let viaMethod: 'ocr' | 'vision-parse' = 'ocr';
    let usedStructuredArtifacts = false;

    // Structured fallback: if no OCR text is available, try OCR job normalized_json.
    if (!hasOcrText) {
      const docStructuredTx = Array.isArray((doc as any)?.normalized_json?.transactions)
        ? (doc as any).normalized_json.transactions
        : [];
      if (docStructuredTx.length > 0) {
        normalizedTransactions = docStructuredTx.map((tx: any) => ({
          userId: userIdText,
          kind: 'bank' as const,
          date: tx?.date || tx?.posting_date || undefined,
          merchant: tx?.merchant_normalized || tx?.merchant || undefined,
          amount: Number(tx?.amount || 0),
          currency: 'CAD',
          docId: documentId,
          description: tx?.description_raw || tx?.description || undefined,
        }));
        usedStructuredArtifacts = true;
      }
    }

    if (!hasOcrText && normalizedTransactions.length === 0) {
      try {
        const { data: ocrJob } = await sb
          .from('ocr_jobs')
          .select('normalized_json, status')
          .eq('document_id', documentId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const txRows = Array.isArray((ocrJob as any)?.normalized_json?.transactions)
          ? (ocrJob as any).normalized_json.transactions
          : [];
        if (txRows.length > 0) {
          normalizedTransactions = txRows.map((tx: any) => ({
            userId: userIdText,
            kind: 'bank' as const,
            date: tx?.date || tx?.posting_date || undefined,
            merchant: tx?.merchant_normalized || tx?.merchant || undefined,
            amount: Number(tx?.amount || 0),
            currency: 'CAD',
            docId: documentId,
            description: tx?.description_raw || tx?.description || undefined,
          }));
          viaMethod = 'ocr';
          usedStructuredArtifacts = true;
        }
      } catch {
        // Non-fatal: continue with existing flow.
      }
    }

    // Try OCR text parsing first (if OCR text exists)

    // Download PDF for Claude Vision (significantly better column parsing)
    let pdfBase64ForVision: string | null = null;
    if (doc.storage_path && (doc.mime_type === "application/pdf" || doc.original_name?.toLowerCase().endsWith(".pdf"))) {
      try {
        const sb = admin();
        const { data: pdfBlob, error: dlErr } = await sb.storage.from("docs").download(doc.storage_path);
        if (!dlErr && pdfBlob) {
          const arrBuf = await pdfBlob.arrayBuffer();
          pdfBase64ForVision = Buffer.from(arrBuf).toString("base64");
          console.log("[normalize-transactions] Downloaded PDF for Vision mode", { documentId, bytes: arrBuf.byteLength });
        } else {
          console.warn("[normalize-transactions] PDF download failed, Vision mode disabled", { documentId, error: dlErr?.message });
        }
      } catch (pdfErr: any) {
        console.warn("[normalize-transactions] PDF download error", { documentId, error: pdfErr?.message });
      }
    }

    if (hasOcrText) {
      const sourceTextPath = transientTextPathActive
        ? 'transient_ocrText'
        : (docTextLength > 0 ? 'persisted_ocr_text' : (hasExtractedData ? 'extracted_data' : 'unknown'));

      // CREDIT CARD AI BYPASS: bypasses stale _shared/ocr_normalize.ts BMO-vs-AI comparison
      const preferAiCreditCards = process.env.OCR_PREFER_AI_CREDIT_CARDS === '1';
      const looksLikeCreditCard = /credit.?limit|minimum.?payment|statement.?from|avion|rewards|cashback/i.test(guardedOcrInputText.slice(0, 2000));
      if (preferAiCreditCards && looksLikeCreditCard && pdfBase64ForVision) {
        console.log('[normalize-transactions] Credit card AI bypass active');
        const { aiFallbackParseTransactions } = await import('./_shared/ai_fallback_parser.js');
        const aiDirect = await aiFallbackParseTransactions({
          ocrText: guardedOcrInputText,
          statementType: 'credit_card',
          openaiClient,
          pdfBase64: pdfBase64ForVision,
        });
        if (aiDirect.length > 0) {
          console.log('[normalize-transactions] Credit card AI bypass produced ' + aiDirect.length + ' transactions');
          normalizedTransactions = aiDirect.map(function(tx) { return {
            userId: userIdText,
            kind: 'credit_card', // was 'bank' â€” caused positive amounts to be labeled 'Credit' not 'Purchase'
            date: tx.date,
            merchant: tx.merchant,
            amount: tx.amount,
            currency: 'CAD',
            statementType: 'credit_card',
            docId: documentId,
          }; });
        }
      }

      if (normalizedTransactions.length === 0) {
        normalizedTransactions = await normalizeOcrResult(guardedOcrInputText, userIdText, openaiClient, {
          filename: doc.original_name || '',
          includeAllAccounts: options?.includeAllAccounts,
          sourceTextPath,
          sourceValueType: typeof options?.transientOcrText,
          pdfBase64: (guardedOcrInputText.length < 500) ? pdfBase64ForVision : null,
        });
      }
    }

    // If normalization found 0 transactions, try Vision parser as fallback (images or PDFs)
    const isPdf = doc.mime_type === 'application/pdf' || doc.original_name?.toLowerCase().endsWith('.pdf');
    const hasNoTransactions = !normalizedTransactions || normalizedTransactions.length === 0;
    const shouldTryVision = openaiClient && hasNoTransactions && (isImage || (isPdf && pdfBase64ForVision));

    if (shouldTryVision) {
      try {
        console.log(`[normalize-transactions] 0 transactions after normalization for ${documentId}, trying Vision fallback (isPdf=${isPdf})`);

        let visionResult: any = null;

        if (isPdf && pdfBase64ForVision) {
          // PDF path: send raw base64 to Claude Vision directly
          const { visionStatementParserBase64 } = await import('./_shared/visionStatementParser.js');
          visionResult = await visionStatementParserBase64(userIdText, pdfBase64ForVision, {
            filename: doc.original_name || 'statement.pdf',
            mimeType: 'application/pdf',
          });
        } else if (isImage) {
          // Existing image path: use signed URL
          const { data: publicUrlData, error: urlError } = admin()
            .storage.from('docs')
            .createSignedUrl(doc.storage_path!, 600);
          if (!urlError && publicUrlData) {
            visionResult = await visionStatementParser(
              userIdText,
              documentId,
              publicUrlData.signedUrl,
              doc.mime_type || 'image/png'
            );
          }
        }

        if (visionResult?.parsed?.transactions?.length > 0) {
          normalizedTransactions = visionResult.parsed.transactions.map((tx: any) => ({
            ...tx,
            import_id: importId,
            user_id: userIdText,
          }));
          viaMethod = 'vision-parse';
          console.log(`[normalize-transactions] Vision fallback extracted ${normalizedTransactions.length} transactions`);
        } else {
          console.warn(`[normalize-transactions] Vision fallback also returned 0 transactions for ${documentId}`);
        }
      } catch (visionError: any) {
        console.error('[normalize-transactions] Vision fallback failed:', visionError?.message);
      }
    }

    const resolvedImportRunId = importRunId || importRecord.id;

    console.log('[normalize-transactions] Parse summary', {
      importId: importRecord.id,
      documentId,
      userId: userIdText,
      extractedTextLength: Number(options?.transientOcrTextLength || guardedOcrInputText.length || docTextLength || 0),
      extractedTextHash: options?.transientOcrTextHash || safeTextMetrics(guardedOcrInputText).hash || docTextHash,
      normalizedTransactionsLength: normalizedTransactions.length,
      viaMethod,
      source: transientText ? 'transient_ocrText' : (usedStructuredArtifacts ? 'structured_artifacts' : 'none'),
      preCategorizationPiiTypes: guardrailedInput.piiTypes,
      preCategorizationBlockedReasons: guardrailedInput.blockedReasons,
    });

    if (!normalizedTransactions || normalizedTransactions.length === 0) {
      const hasStructuredSignals = Boolean(
        parseInvoiceLike(guardedOcrInputText)?.total ||
        parseReceiptLike(guardedOcrInputText)?.total ||
        parseStatementSummary(guardedOcrInputText)
      );
      await sb
        .from('imports')
        .update({ 
          status: 'parsed', 
          updated_at: new Date().toISOString(),
          error: 'No transactions found'
        })
        .eq('id', importRecord.id);
      await sb
        .from('user_documents')
        .update({
          status: 'needs_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);
      if (NORMALIZE_DEBUG_ENABLED) {
        console.log('[normalize-transactions][debug] no transactions path', {
          documentId,
          hadInputText: hasOcrText,
          ocrTextHash: options?.transientOcrTextHash || docTextHash,
          ocrTextLength: Number(options?.transientOcrTextLength || docTextLength || 0),
          hasStructuredSignals,
        });
      }
      return { ok: true, stagedCount: 0, importId: importRecord.id };
    }

    // 4. Convert normalized transactions to staging format
    //
    // Disambiguate legitimate same-day duplicates: two 7-ELEVEN $1.58
    // charges on Feb 17 are real transactions, not a parse error. Without
    // the occurrence counter, both rows hash identically and the pre-batch
    // dedup below silently drops the second one. The counter scopes to
    // this batch only - the first occurrence keeps the original hash, so
    // single-instance rows hash exactly as before (backward compatible).
    const seenHashInputs = new Map<string, number>();
    const stagingRows = normalizedTransactions.map(tx => {
      const isInvoice = tx.kind === 'invoice';
      const baseHashInput = isInvoice
        ? `${documentId || ''}-${tx.amount || 0}-${tx.date || ''}-${tx.merchant || ''}`
        : `${tx.date || ''}-${tx.amount || 0}-${tx.merchant || ''}`;
      const seen = seenHashInputs.get(baseHashInput) || 0;
      seenHashInputs.set(baseHashInput, seen + 1);
      const hashInput = seen === 0 ? baseHashInput : `${baseHashInput}-${seen}`;
      const hash = createHash('sha256').update(hashInput).digest('hex').substring(0, 64);
      const fileName = doc.original_name || 'Invoice';
      const invoiceDescription = `Invoice${tx.invoiceNo ? ` ${tx.invoiceNo}` : ''} - ${fileName}`;
      const description = isInvoice ? invoiceDescription : ((tx as any).description || tx.merchant || 'Transaction');

      if (isInvoice) {
        console.log('[Byte OCR] Staged invoice transaction', { hash, docId: documentId });
      }

      const rawAmount = Number(tx.amount || 0);
      const isCreditCardStatement = (tx as any).statementType === 'credit_card';
      const isCreditCardCredit = Boolean((tx as any).statementCredit);
      const typeLabel = isCreditCardCredit
        ? 'Payment'
        : (tx.kind === 'bank'
            ? (rawAmount < 0 ? 'Purchase' : 'Credit')
            : 'Purchase');
      // PATCH3: Sign amount based on direction.
      // Convention (per commit-import.ts line 1311): negative = expense, positive = income.
      // Bank Purchase and credit-card Payment are expenses; Bank Credit is income.
      const isExpenseType = typeLabel === 'Purchase' || typeLabel === 'Payment';
      const normalizedAmount = isExpenseType ? -Math.abs(rawAmount) : Math.abs(rawAmount);
      return {
        import_id: importRecord.id,
        user_id: userIdText,
        data_json: {
          date: tx.date,
          posted_at: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
          merchant: tx.merchant,
          description: description,
          amount: normalizedAmount,
          type: typeLabel,
          currency: tx.currency || 'CAD',
          category: null,
          fx_note: (tx as any).fxNote || null,
          confidence: (tx as any).confidence ?? null,
          confidence_flags: (tx as any).confidenceFlags ?? null,
          account_name: (tx as any).accountName ?? null,
          category_source: null,
          importRunId: resolvedImportRunId,
          documentId,
        },
        hash,
      };
    });

    // Prevent ON CONFLICT 21000 by ensuring one row per upsert key in this batch.
    const dedupedByConflictKey = new Map<string, (typeof stagingRows)[number]>();
    for (const row of stagingRows) {
      const key = `${row.import_id}:${row.hash}`;
      if (!dedupedByConflictKey.has(key)) {
        dedupedByConflictKey.set(key, row);
      }
    }
    const dedupedStagingRows = Array.from(dedupedByConflictKey.values());

    console.log('[normalize-transactions] Staging rows built', {
      count: stagingRows.length,
      dedupedCount: dedupedStagingRows.length,
      sample: stagingRows[0] ? {
        import_id: stagingRows[0].import_id,
        user_id: stagingRows[0].user_id,
        doc_id: stagingRows[0].data_json?.documentId || null,
      } : null,
    });

    // 5. Save to transactions_staging
    if (dedupedStagingRows.length > 0) {
      const { error: stagingError } = await sb
        .from('transactions_staging')
        .upsert(dedupedStagingRows, {
          onConflict: 'import_id,hash',
          ignoreDuplicates: false 
        });

      if (stagingError) {
        console.error('[normalize-transactions] Error inserting staging rows:', stagingError);
        await releaseNormalizationLock();
        return { ok: false, error: { code: 'staging_upsert_failed', message: stagingError.message } };
      }
      console.log('[normalize-transactions] staging upsert OK', {
        importId: importRecord.id,
        rowCount: dedupedStagingRows.length,
      });
    }

    // --- Overlapping statement detection (non-blocking) ---
    const statementMeta = extractStatementMetaFromDoc(doc, guardedOcrInputText);
    const overlapResult = await checkForOverlappingImport(
      sb,
      userIdText,
      importRecord.id,
      statementMeta.periodStart,
      statementMeta.periodEnd,
      statementMeta.accountLast4,
      statementMeta.issuer
    );
    if (overlapResult.overlap) {
      await stampImportOverlapWarning(sb, userIdText, importRecord.id, overlapResult);
    }

    // Parse balance/payment fields from OCR text and store in user_documents.metadata.statement_summary
    // so commit-import.ts and the chat live fallback can include them in the breakdown.
    // NOTE: imports.metadata column does not exist - user_documents.metadata is used instead.
    const toMoney = (val: string | undefined): number | null => {
      if (!val) return null;
      const n = parseFloat(String(val).replace(/,/g, ''));
      return Number.isFinite(n) ? n : null;
    };
    const rawSummary = parseStatementSummary(guardedOcrInputText) || {};
    const parsedAccountSummary = {
      institution: String(rawSummary.institution || '').trim() || null,
      account_last4: String(rawSummary.account_last4 || '').trim() || null,
      statement_period: String(rawSummary.statement_period || '').trim() || null,
      previous_balance: toMoney(rawSummary.previous_balance),
      new_balance: toMoney(rawSummary.new_balance),
      minimum_payment_due: toMoney(rawSummary.minimum_payment_due),
      due_date: rawSummary.due_date || null,
      credit_limit: toMoney(rawSummary.credit_limit),
      available_credit: toMoney(rawSummary.available_credit),
    };
    const hasParsedAccountData = Object.values(parsedAccountSummary).some((v) => v !== null);

    // 6. Update import status
    const importStatusPayload: Record<string, unknown> = {
      status: 'parsed',
      updated_at: new Date().toISOString(),
    };
    await sb
      .from('imports')
      .update(importStatusPayload)
      .eq('id', importRecord.id);

    // Store account_summary in user_documents.metadata so commit-import can read it.
    if (hasParsedAccountData) {
      try {
        const { data: docMetaRow } = await sb
          .from('user_documents')
          .select('metadata')
          .eq('id', documentId)
          .maybeSingle();
        const existingDocMeta =
          docMetaRow?.metadata && typeof docMetaRow.metadata === 'object'
            ? (docMetaRow.metadata as Record<string, unknown>)
            : {};
        await sb
          .from('user_documents')
          .update({ metadata: { ...existingDocMeta, statement_summary: parsedAccountSummary } })
          .eq('id', documentId);
        console.log('[normalize-transactions] Stored account_summary in user_documents.metadata', {
          importId: importRecord.id,
          documentId,
          fields: Object.entries(parsedAccountSummary).filter(([, v]) => v !== null).map(([k]) => k),
        });
      } catch (docMetaErr: any) {
        console.warn('[normalize-transactions] Failed to store account_summary in user_documents.metadata', {
          documentId,
          error: docMetaErr?.message,
        });
      }
    }

    // 7. Optional: purge source document + OCR text after normalization
    if (documentId && (AUTO_PURGE_SOURCE || AUTO_PURGE_TEXT)) {
      try {
        const { data: docRow } = await sb
          .from('user_documents')
          .select('id, storage_path')
          .eq('id', documentId)
          .maybeSingle();
        const storagePath = docRow?.storage_path || null;

        if (AUTO_PURGE_SOURCE && storagePath) {
          await sb.storage.from('docs').remove([storagePath]).catch(() => {
            // ignore storage errors
          });
          await sb.storage.from('docs').remove([`${storagePath}.ocr.json`]).catch(() => {
            // ignore missing OCR json
          });
          await sb.storage.from('docs').remove([`${storagePath}.txt`]).catch(() => {
            // ignore missing OCR txt
          });
        }

        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (AUTO_PURGE_SOURCE) {
          updatePayload.storage_path = null;
          updatePayload.status = 'purged';
        }
        if (AUTO_PURGE_TEXT) {
          updatePayload.ocr_text = null;
          updatePayload.redacted_text = null;
          updatePayload.redaction_summary = null;
          updatePayload.ocr_engine = null;
          updatePayload.ocr_completed_at = null;
        }

        await sb
          .from('user_documents')
          .update(updatePayload)
          .eq('id', documentId);
      } catch (err: any) {
        console.warn('[normalize-transactions] Auto purge skipped', {
          documentId,
          error: err?.message || String(err),
        });
      }
    }

    // Stamp normalization metadata (no migration safe)
    // Only mark normalized_cached: true when transactions were actually staged.
    // When 0 transactions were staged, record the attempt but leave the cache
    // flag unset so the normalizer can re-run on the next trigger.
    try {
      const { data: latestDoc } = await sb
        .from('user_documents')
        .select('metadata')
        .eq('id', documentId)
        .maybeSingle();
      const latestMetadata =
        latestDoc?.metadata && typeof latestDoc.metadata === 'object'
          ? (latestDoc.metadata as Record<string, any>)
          : (metadata || {});
      if (stagingRows.length > 0) {
        await sb
          .from('user_documents')
          .update({
            metadata: {
              ...latestMetadata,
              normalized_cached: true,
              normalized_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
      } else {
        console.warn(`[normalize-transactions] 0 transactions staged for doc ${documentId} â€” NOT setting normalized_cached`);
        await sb
          .from('user_documents')
          .update({
            metadata: {
              ...latestMetadata,
              normalized_cached: false,
              normalized_attempted_at: new Date().toISOString(),
              normalized_count: 0,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', documentId);
      }
    } catch (e) {
      console.warn('[normalize-transactions] metadata stamp failed', e);
    }

    console.log(`[normalize-transactions] Successfully normalized ${stagingRows.length} transactions for import ${importRecord.id}`);
    return { ok: true, stagedCount: stagingRows.length, importId: importRecord.id };
  } catch (error: any) {
    try {
      await releaseNormalizationLock();
    } catch (unlockError: any) {
      console.warn('[normalize-transactions] Failed to release normalization lock', {
        documentId,
        error: unlockError?.message || String(unlockError),
      });
    }
    console.error('[normalize-transactions] Background processing error:', error);
    return { ok: false, error: { code: 'unexpected_error', message: error?.message || 'Unknown error' } };
  }
}

export const handler: Handler = async (event, context) => {
  // Byte Speed Mode v2: Non-blocking background processing
  if (context && typeof context.callbackWaitsForEmptyEventLoop === 'boolean') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  const t0 = Date.now();
  const headersIn = event?.headers || {};
  const traceId =
    headersIn['x-trace-id'] ||
    headersIn['x-request-id'] ||
    headersIn['X-Trace-Id'] ||
    headersIn['X-Request-Id'] ||
    `trace_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  const respond = (statusCode: number, payload: Record<string, any>) => {
    const duration_ms = Date.now() - t0;
    return {
      // Contract pinning: keep legacy behavior (HTTP 200) and encode errors in JSON.
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...payload,
        http_status: statusCode,
        traceId,
        duration_ms,
      }),
    };
  };
  const respondError = (
    statusCode: number,
    code: string,
    message: string,
    extra: Record<string, any> = {}
  ) =>
    respond(statusCode, {
      ok: false,
      error: { code, message },
      ...extra,
    });
  const mergeMetadata = (existing: unknown, patch: Record<string, any>) => {
    const base = existing && typeof existing === 'object' ? (existing as Record<string, any>) : {};
    return { ...base, ...patch };
  };
  const stampNormalizeError = async (docId: string, code: string, message: string): Promise<void> => {
    if (!docId) return;
    try {
      const sb = admin();
      const { data: row } = await sb
        .from('user_documents')
        .select('metadata')
        .eq('id', docId)
        .maybeSingle();
      const metadata = mergeMetadata(row?.metadata, {
        normalize_error: {
          code,
          message: String(message || ''),
          at: new Date().toISOString(),
          traceId,
        },
      });
      await sb
        .from('user_documents')
        .update({ metadata, updated_at: new Date().toISOString() })
        .eq('id', docId);
    } catch {
      // Best effort only; never block API response.
    }
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return respondError(405, 'method_not_allowed', 'Method not allowed. Use POST.');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, documentId, importRunId, includeAllAccounts, ocrText, ocrTextHash, ocrTextLength } = body;
    const isNetlifyDev = process.env.NETLIFY_DEV === 'true';

    if (!userId || !documentId) {
      if (documentId) {
        await stampNormalizeError(documentId, 'missing_required_fields', 'Missing userId or documentId');
      }
      return respondError(400, 'missing_required_fields', 'Missing userId or documentId');
    }
    if (!UUID_V4_RE.test(String(documentId))) {
      return respondError(400, 'invalid_document_id', 'documentId must be a valid UUID');
    }

    console.log('[normalize-transactions] stage=normalize_start', {
      traceId,
      documentId,
      importRunId: importRunId || null,
    });
    const normalizePromise = processNormalizationInBackground(userId, documentId, importRunId, {
      includeAllAccounts: Boolean(includeAllAccounts),
      transientOcrText: typeof ocrText === 'string' ? ocrText : '',
      transientOcrTextHash: typeof ocrTextHash === 'string' ? ocrTextHash : null,
      transientOcrTextLength: Number.isFinite(Number(ocrTextLength)) ? Number(ocrTextLength) : undefined,
    });
    const result = isNetlifyDev
      ? await Promise.race<NormalizationResult>([
          normalizePromise,
          new Promise<NormalizationResult>((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                skipped: true,
                reason: 'normalize_in_progress',
                documentId,
              });
            }, Math.max(1000, NETLIFY_DEV_SOFT_TIMEOUT_MS));
          }),
        ])
      : await normalizePromise;
    if (isNetlifyDev && result.reason === 'normalize_in_progress') {
      console.warn('[normalize-transactions] stage=normalize_soft_timeout', {
        traceId,
        documentId,
        timeoutMs: Math.max(1000, NETLIFY_DEV_SOFT_TIMEOUT_MS),
      });
      return respond(200, {
        ok: true,
        skipped: true,
        started: true,
        processing: true,
        completed: false,
        retryable: true,
        reason: 'normalize_in_progress',
        documentId,
      });
    }
    if (result.skipped) {
      const duration_ms = Date.now() - t0;
      console.log('[normalize-transactions] stage=normalize_done', {
        traceId,
        documentId,
        importId: result.importId || null,
        stagedCount: result.stagedCount ?? 0,
        duration_ms,
        skipped: true,
        reason: result.reason || null,
        ok: Boolean(result.ok),
      });
      return respond(200, {
        ok: Boolean(result.ok),
        skipped: true,
        started: false,
        processing: false,
        completed: Boolean(result.ok),
        reason: result.reason || null,
        importId: result.importId,
        stagedCount: result.stagedCount,
        documentId: result.documentId || documentId,
      });
    }
    if (!result.ok && result.error) {
      const statusCode = result.error.code === 'doc_fetch_failed'
        ? 404
        : result.error.code === 'empty_input_text'
          ? 422
          : result.error.code === 'missing_required_fields'
            ? 400
            : 500;
      await stampNormalizeError(
        documentId,
        result.error.code,
        result.error.message || 'Normalization failed'
      );
      return respondError(
        statusCode,
        result.error.code,
        result.error.message || 'Normalization failed',
        { documentId }
      );
    }
    if (!result.ok) {
      await stampNormalizeError(documentId, 'normalization_failed', 'Normalization failed');
      return respondError(500, 'normalization_failed', 'Normalization failed', { documentId });
    }
    const duration_ms = Date.now() - t0;
    console.log('[normalize-transactions] stage=normalize_done', {
      traceId,
      documentId,
      importId: result.importId || null,
      stagedCount: result.stagedCount ?? 0,
      duration_ms,
      skipped: Boolean(result.skipped),
      reason: result.reason || null,
      ok: result.ok,
    });
    return respond(200, {
      ok: result.ok,
      skipped: Boolean(result.skipped),
      // "started" means we actually performed normalization work in this request
      started: Boolean(result.ok && !result.skipped),
      // This handler is synchronous: if we're responding, we are not still processing
      processing: false,
      // "completed" means the handler reached a terminal outcome (success or skip)
      completed: Boolean(result.ok),
      reason: result.reason || null,
      importId: result.importId,
      stagedCount: result.stagedCount,
      documentId: result.documentId || documentId,
    });
  } catch (error: any) {
    console.error('[normalize-transactions] Unexpected error:', error);
    try {
      const parsed = JSON.parse(event?.body || '{}');
      const failedDocumentId = parsed?.documentId;
      if (failedDocumentId) {
        await stampNormalizeError(
          failedDocumentId,
          'internal_server_error',
          error?.message || 'Unknown error'
        );
      }
    } catch {
      // ignore parse failures
    }
    return respondError(500, 'internal_server_error', error?.message || 'Unknown error');
  }
};


// cache-bust-20260413-1746