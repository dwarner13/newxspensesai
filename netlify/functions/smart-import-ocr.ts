/**
 * Smart Import OCR - Extract text from images/PDFs
 * 
 * SECURITY: OCR output runs through STRICT guardrails before storage
 *
 * Manual test:
 * - Upload PDF and confirm logs show stage=ocr_proof_write_result (ok=true OR ok=false with warning) while HTTP response is 200.
 * - Confirm smart-import-sync no longer returns ocr_failed:ocr_empty when metadata proof markers exist.
 */

import { Handler } from '@netlify/functions';
import { createHash } from 'crypto';
import { admin, markDocStatus } from './_shared/upload.js';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { runGuardrailsForText } from './_shared/guardrails-unified.js';
import { maskPII as maskPiiFallback } from './_shared/pii.js';
import { safeTextMetrics } from './_shared/textHash.js';
import { callGoogleVisionOnImage, callGoogleVisionOnPdf } from './_shared/vision/googleVisionClient.js';
// AI Fluency: Event logging
import { logUserEvent, recalcFluency } from '../../src/lib/ai/userActivity.js';
import { extractPdfTextWithPdfParse, extractPdfTextWithLayout } from './_lib/pdfText.js';
import { pdfToImages } from './lib/pdf/pdfToImages.js';
import {
  ocrPageImage,
  retryOcrPageFallback,
  type OcrPageResult,
  type OcrFallbackProvider,
} from './lib/ocr/ocrPageImage.js';
import { mergeOcrPages } from './lib/ocr/mergeOcrPages.js';
import { selectWorstPagesForFallback, shouldEarlyStopScanning } from './lib/ocr/optimizationPolicy.js';
import { cleanupOcrText } from './lib/ocr/cleanupOcrText.js';
// OpenAI imported dynamically in runOpenAIVisionOcr to avoid init crash

const BUCKET = 'docs';

const bufferCache = new Map<string, Buffer>();

const DEFAULT_OCR_TIMEOUT_MS = 30000;
const MAX_OCR_TIMEOUT_MS = 60000;
const OCR_RETRY_ATTEMPTS = 3;
const OCR_RETRY_BASE_DELAY_MS = 500;
const PDF_MIN_TEXT_LEN = Number(process.env.PDF_MIN_TEXT_LEN || 200);
const OCR_EMPTY_MIN_LEN = Number(process.env.OCR_EMPTY_MIN_LEN || 20);
const SCANNED_PDF_TEXT_THRESHOLD = Number(process.env.OCR_SCANNED_PDF_TEXT_THRESHOLD || 220);
const SCANNED_PDF_MAX_PAGES = Number(process.env.OCR_SCANNED_PDF_MAX_PAGES || 10);
const SCANNED_PDF_MAX_IMAGE_BYTES = Number(process.env.OCR_SCANNED_PDF_MAX_IMAGE_BYTES || 950 * 1024);
const SCANNED_PDF_RENDER_DPI = Number(process.env.OCR_SCANNED_PDF_RENDER_DPI || 300);
const SCANNED_PDF_RENDER_SCALE = Math.max(1, SCANNED_PDF_RENDER_DPI / 72);
const OCR_ENABLE_SCANNED_PAGE_RETRY = process.env.OCR_ENABLE_SCANNED_PAGE_RETRY === '1';
const OCR_CONFIDENCE_THRESHOLD = Number(process.env.OCR_CONFIDENCE_THRESHOLD || 0.75);
const OCR_EARLY_STOP_CONFIDENCE = Number(process.env.OCR_EARLY_STOP_CONFIDENCE || 0.85);
const OCR_MIN_PAGES_FOR_EARLY_STOP = Number(process.env.MIN_PAGES_FOR_EARLY_STOP || 2);
const OCR_STATEMENT_EARLY_STOP_MAX_PAGES = Number(process.env.OCR_STATEMENT_EARLY_STOP_MAX_PAGES || 4);
const OCR_FALLBACK_MAX_PAGES = Number(process.env.OCR_FALLBACK_MAX_PAGES || 2);
const OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD = Number(process.env.OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD || 0.7);
const OCR_FALLBACK_ORDER_STATEMENT = process.env.OCR_FALLBACK_ORDER_STATEMENT || 'google,openai';
const OCR_FALLBACK_ORDER_RECEIPT = process.env.OCR_FALLBACK_ORDER_RECEIPT || 'openai,google';
const OCR_FALLBACK_MONTHLY_CAP_FREE = Number(process.env.OCR_FALLBACK_MONTHLY_CAP_FREE || 10);
const OCR_LOCK_STALE_MS = Number(process.env.OCR_LOCK_STALE_MS || 10 * 60 * 1000);
const OCR_HEARTBEAT_MS = Number(process.env.OCR_HEARTBEAT_MS || 5000);
const SCANNED_FALLBACK_TIMEOUT_MS = Number(process.env.OCR_SCANNED_FALLBACK_TIMEOUT_MS || 15000);
const OCR_RETRY_PAGE_TIMEOUT_MS = Number(process.env.OCR_RETRY_PAGE_TIMEOUT_MS || 8000);
const OCR_STAGE_TIMEOUT_MS = (() => {
  const configured = Number(process.env.OCR_STAGE_TIMEOUT_MS || 180000);
  if (process.env.NETLIFY_DEV === 'true') {
    // Local dev can need longer for strict-structure PDFs + Ghostscript fallback.
    return Math.min(configured, 120000);
  }
  return configured;
})();
let warnedMissingOcrJobsMonthlyUsage = false;
let warnedMissingDocOcrStatusColumn = false;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RetryableError = Error & { status?: number };

type OcrFinalStatus = 'succeeded' | 'failed' | 'timed_out';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && typeof err.message === 'string') return err.message;
  return String(err || 'unknown_error');
}

function trimErrorMessage(message: string, maxLen = 280): string {
  const normalized = String(message || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1)}...`;
}

function isKnownMalformedPdfError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes('invalid pdf structure') ||
    msg.includes('bad fcheck') ||
    msg.includes('flate stream') ||
    msg.includes('ocr failed. input file corrupted?') ||
    msg.includes('error e301')
  );
}

function isStrictPdfStructureError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return (
    msg.includes('invalid pdf structure') ||
    msg.includes('bad fcheck') ||
    msg.includes('structural_pdf_error')
  );
}

function isNoTextProviderError(err: unknown): boolean {
  const msg = getErrorMessage(err).toLowerCase();
  return msg.includes('no provider returned text');
}

function extractPdfTextFromRawStreams(buffer: Buffer): string {
  // Secondary parser fallback for non-standard PDFs: best-effort extraction of
  // visible text tokens directly from stream bytes when structured parsers fail.
  const latin = buffer.toString('latin1');
  const parts: string[] = [];
  const looksReadable = (value: string): boolean => {
    const text = String(value || '').trim();
    if (text.length < 3) return false;
    const alpha = (text.match(/[A-Za-z]/g) || []).length;
    const suspicious = (text.match(/[�\u2500-\u257F\u2580-\u259F]/g) || []).length;
    const ratio = alpha / text.length;
    const noise = suspicious / text.length;
    return ratio >= 0.2 && noise <= 0.02;
  };

  // Text in PDF literals: (...) with escaped chars handled minimally.
  const literalMatches = latin.match(/\((?:\\.|[^\\)]){3,}\)/g) || [];
  for (const token of literalMatches) {
    const inner = token.slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\n')
      .replace(/\\t/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
    if (/[A-Za-z]{3,}/.test(inner) && looksReadable(inner)) parts.push(inner);
  }

  // Hex strings: <...> often used in text operators.
  const hexMatches = latin.match(/<([0-9A-Fa-f]{8,})>/g) || [];
  for (const token of hexMatches.slice(0, 2000)) {
    const hex = token.slice(1, -1);
    if (hex.length % 2 !== 0) continue;
    try {
      const raw = Buffer.from(hex, 'hex');
      const decodedUtf8 = raw.toString('utf8');
      const decodedLatin = raw.toString('latin1');
      const best = looksReadable(decodedUtf8) ? decodedUtf8 : decodedLatin;
      if (/[A-Za-z]{3,}/.test(best) && looksReadable(best)) parts.push(best);
    } catch {
      // ignore bad hex
    }
  }

  return cleanupOcrText(parts.join('\n'));
}

function isLikelyCorruptedText(value: string): boolean {
  const text = String(value || '');
  if (!text || text.trim().length < 40) return false;
  const suspiciousChars = (text.match(/[�\u2500-\u257F\u2580-\u259F]/g) || []).length;
  const controlChars = (text.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) || []).length;
  const alphaChars = (text.match(/[A-Za-z]/g) || []).length;
  const ratioNoise = (suspiciousChars + controlChars) / text.length;
  const ratioAlpha = alphaChars / text.length;
  return ratioNoise > 0.08 || ratioAlpha < 0.18;
}

function assessRescueTextReadability(value: string): { score: number; accepted: boolean; reason: string } {
  const text = String(value || '');
  const trimmed = text.trim();
  if (!trimmed) return { score: 0, accepted: false, reason: 'empty' };
  const len = Math.max(trimmed.length, 1);
  const suspiciousChars = (trimmed.match(/[�\u2500-\u257F\u2580-\u259F]/g) || []).length;
  const controlChars = (trimmed.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g) || []).length;
  const spaces = (trimmed.match(/\s/g) || []).length;
  const words = (trimmed.match(/\b[A-Za-z]{3,}\b/g) || []).length;
  const printableChars = (trimmed.match(/[\x20-\x7E\n\r\t]/g) || []).length;
  const noiseRatio = (suspiciousChars + controlChars) / len;
  const spaceRatio = spaces / len;
  const printableRatio = printableChars / len;
  const wordDensity = words / Math.max(len / 20, 1);
  const scoreRaw =
    (printableRatio * 0.45) +
    (Math.min(1, wordDensity) * 0.30) +
    (Math.min(1, spaceRatio / 0.16) * 0.15) +
    (Math.max(0, 1 - (noiseRatio / 0.05)) * 0.10);
  const score = Math.max(0, Math.min(1, Number(scoreRaw.toFixed(3))));
  if (trimmed.length < PDF_MIN_TEXT_LEN) {
    return { score, accepted: false, reason: 'too_short' };
  }
  if (printableRatio < 0.80) {
    return { score, accepted: false, reason: 'low_printable_ratio' };
  }
  if (noiseRatio > 0.04) {
    return { score, accepted: false, reason: 'high_noise_ratio' };
  }
  if (spaceRatio < 0.08) {
    return { score, accepted: false, reason: 'low_space_ratio' };
  }
  if (words < 12) {
    return { score, accepted: false, reason: 'too_few_words' };
  }
  if (score < 0.62) {
    return { score, accepted: false, reason: 'low_readability_score' };
  }
  return { score, accepted: true, reason: 'readable' };
}

function extractReadableIslands(value: string): string {
  const raw = String(value || '');
  if (!raw) return '';
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const line of lines) {
    if (line.length < 3) continue;
    const printable = (line.match(/[\x20-\x7E]/g) || []).length;
    const printableRatio = printable / Math.max(1, line.length);
    const alphaNum = (line.match(/[A-Za-z0-9]/g) || []).length;
    const weird = (line.match(/[�\u2500-\u257F\u2580-\u259F]/g) || []).length;
    if (printableRatio < 0.82) continue;
    if (alphaNum < 3) continue;
    if (weird > 0) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    kept.push(line);
  }
  return cleanupOcrText(kept.join('\n'));
}

function hasTransactionLikeSignal(value: string): boolean {
  const text = String(value || '');
  const dateMatches = (text.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\b/g) || []).length;
  const amountMatches = (text.match(/(?:^|[^\d])(?:-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2}))(?:$|[^\d])/g) || []).length;
  return dateMatches >= 2 && amountMatches >= 2;
}

function isLikelyReadableText(value: string): boolean {
  return assessRescueTextReadability(value).accepted;
}

function isUselessOcrResponseText(value: string): boolean {
  const text = String(value || '').toLowerCase().trim();
  if (!text) return true;
  return (
    text.includes('there is no visible text in the image') ||
    text.includes('no visible text in the image') ||
    text.includes("i'm unable to extract any text") ||
    text.includes('i am unable to extract any text') ||
    text.includes('unable to extract any text') ||
    text.includes('unable to extract text') ||
    text.includes('appears to be blank or empty') ||
    text.includes('image appears to be blank') ||
    text.includes('image is blank') ||
    text.includes('no readable text found') ||
    text.includes('if you have another image') ||
    text.includes("if you have another image or text you'd like me to assist with") ||
    text.includes('please share another image') ||
    text.includes('no text could be recognized')
  );
}

function normalizeVisionExtractionText(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '';
  const withoutFences = text
    .replace(/^```(?:text)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (isUselessOcrResponseText(withoutFences)) return '';
  return withoutFences;
}

function isRetryableError(error: unknown): boolean {
  const err = error as RetryableError;
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  const status = err.status;
  if (typeof status === 'number') {
    return status === 408 || status === 429 || status >= 500;
  }
  const message = err.message?.toLowerCase?.() || '';
  return message.includes('timeout') || message.includes('rate limit');
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let onAbort: (() => void) | null = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      onAbort = () => controller.abort();
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }
  }
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    if (externalSignal && onAbort) {
      externalSignal.removeEventListener('abort', onAbort);
    }
  }
}

async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { signal?: AbortSignal }
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= OCR_RETRY_ATTEMPTS; attempt++) {
    if (options?.signal?.aborted) {
      throw new Error(`${label}_aborted`);
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (options?.signal?.aborted) {
        throw error;
      }
      if (!isRetryableError(error) || attempt === OCR_RETRY_ATTEMPTS) {
        throw error;
      }
      const delay = OCR_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[OCR] ${label} failed (attempt ${attempt}/${OCR_RETRY_ATTEMPTS}), retrying in ${delay}ms`);
      if (options?.signal?.aborted) {
        throw error;
      }
      await sleep(delay);
    }
  }
  throw lastError;
}

type OCRProvider = 'vision' | 'ocrspace' | 'embedded_pdf_parse' | 'openai_vision';

type OCRRunResult = {
  text: string;
  provider: OCRProvider;
  durationMs: number;
  pages?: number;
  pageLimitReached?: boolean;
};

type OcrResult = {
  docType: "receipt" | "statement" | "invoice" | "unknown";
  pages: number;
  rawText: string;
  tables?: any[];
  fields?: {
    merchant?: string;
    date?: string;
    total?: number;
    currency?: string;
  };
  confidence: {
    overall: number;
    total?: number;
    date?: number;
    merchant?: number;
    tables?: number;
  };
  engineUsed: string;
  fallbackUsed?: boolean;
  needsUserConfirmation?: boolean;
  debug?: any;
};

type OcrJobRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  file_hash: string;
  status: 'queued' | 'running' | 'done' | 'error';
  engine_used: string | null;
  pages: number | null;
  confidence: number | null;
  normalized_json: OcrResult | null;
  error: string | null;
};

type OcrRunMetrics = {
  pagesTotal: number;
  pagesProcessed: number;
  primaryEngineCalls: number;
  fallbackEngineCalls: {
    openai: number;
    google: number;
    total: number;
  };
  fallbackAttempted: {
    pages: number;
    openai: number;
    google: number;
    total: number;
  };
  fallbackAdopted: {
    pages: number;
    openai: number;
    google: number;
    total: number;
  };
  earlyStopTriggered: {
    triggered: boolean;
    reason: string | null;
  };
  worstPagesRetried: number[];
  totalTimeMs: number;
  fallbackSkippedByBudget?: boolean;
};

function detectDocTypeFromNameAndText(name: string, text: string): OcrResult['docType'] {
  const lowerName = name.toLowerCase();
  // Income report PDFs (FreshBooks "Payments Collected", Wave, etc.) contain "Invoice"
  // on every row as a payment reference — classify as 'statement' so they get row parsing,
  // not the single-total invoice extractor.
  if (/payments?\s+collected/i.test(text) || /freshbooks.*payment/i.test(lowerName)) return 'statement';
  if (/invoice/.test(lowerName) || /\binvoice\b/i.test(text)) return 'invoice';
  if (/statement|bank|credit.?card|account/.test(lowerName) || /\bstatement\b|\bopening balance\b|\bclosing balance\b|\btransaction\b/i.test(text)) return 'statement';
  if (/receipt/.test(lowerName) || /\bsubtotal\b|\btip\b|\btotal\b/i.test(text)) return 'receipt';
  return 'unknown';
}

function extractCurrency(text: string): string | undefined {
  if (/\bCAD\b|C\$|CDN/i.test(text)) return 'CAD';
  if (/\bUSD\b|US\$/i.test(text)) return 'USD';
  if (/\bEUR\b|€/i.test(text)) return 'EUR';
  if (/\bGBP\b|£/i.test(text)) return 'GBP';
  if (/\$/i.test(text)) return 'CAD';
  return undefined;
}

function extractFields(text: string): OcrResult['fields'] {
  const dateMatch = text.match(/\b(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/);
  const totalMatch =
    text.match(/\b(?:total|amount due|new balance)\b[^\d]{0,20}([0-9,]+\.\d{2})/i) ||
    text.match(/\$([0-9,]+\.\d{2})/);
  const merchantLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => !!line && !/\d{1,2}[\/\-]\d{1,2}|invoice|statement|account/i.test(line));

  return {
    merchant: merchantLine?.slice(0, 120),
    date: dateMatch?.[1],
    total: totalMatch?.[1] ? Number(totalMatch[1].replace(/,/g, '')) : undefined,
    currency: extractCurrency(text),
  };
}

function computeConfidence(fields: OcrResult['fields'], text: string, docType: OcrResult['docType']): OcrResult['confidence'] {
  const total = typeof fields?.total === 'number' && fields.total > 0 ? 0.9 : 0.35;
  const date = fields?.date ? 0.85 : 0.4;
  const merchant = fields?.merchant ? 0.8 : 0.35;
  const tables = docType === 'statement'
    ? (/amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)|transaction details/i.test(text) ? 0.8 : 0.45)
    : undefined;
  const lengthScore = Math.min(0.95, Math.max(0.25, text.trim().length / 2500));
  const weighted = [
    total * 0.25,
    date * 0.2,
    merchant * 0.2,
    (tables ?? 0.6) * 0.15,
    lengthScore * 0.2,
  ].reduce((sum, part) => sum + part, 0);
  return {
    overall: Number(Math.max(0, Math.min(0.99, weighted)).toFixed(3)),
    total,
    date,
    merchant,
    ...(tables !== undefined ? { tables } : {}),
  };
}

function buildNormalizedResult(args: {
  text: string;
  provider: OCRProvider;
  pages?: number;
  originalName?: string;
  fallbackUsed?: boolean;
}): OcrResult {
  const rawText = args.text || '';
  const docType = detectDocTypeFromNameAndText(args.originalName || '', rawText);
  const fields = extractFields(rawText);
  const confidence = computeConfidence(fields, rawText, docType);
  const needsUserConfirmation = confidence.overall < 0.75;
  return {
    docType,
    pages: args.pages || 1,
    rawText,
    fields,
    confidence,
    engineUsed: args.provider,
    fallbackUsed: Boolean(args.fallbackUsed),
    needsUserConfirmation,
  };
}

function isStaleUpdatedAt(updatedAt: unknown, staleMs: number = OCR_LOCK_STALE_MS): boolean {
  const raw = String(updatedAt || '').trim();
  if (!raw) return false;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts > staleMs;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  onTimeout?: () => void
): Promise<T> {
  let timeoutHandle: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      try {
        onTimeout?.();
      } catch {
        // noop
      }
      reject(new Error(`${label}_timeout_${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function startOcrHeartbeat(args: {
  sb: any;
  docId: string;
  ocrJobId: string | null;
  traceId: string;
}): () => void {
  const { sb, docId, ocrJobId, traceId } = args;
  const timer = setInterval(async () => {
    const now = new Date().toISOString();
    try {
      await sb
        .from('user_documents')
        .update({ updated_at: now })
        .eq('id', docId)
        .eq('status', 'ocr_processing');
      if (ocrJobId) {
        await sb
          .from('ocr_jobs')
          .update({ status: 'running', updated_at: now })
          .eq('id', ocrJobId);
      }
    } catch (error: any) {
      console.warn('[OCR] heartbeat update failed', {
        docId,
        ocrJobId,
        traceId,
        error: error?.message || String(error),
      });
    }
  }, Math.max(1000, OCR_HEARTBEAT_MS));
  return () => clearInterval(timer);
}

function computeFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function shouldUseScannedPdfFallback(params: {
  mimeType: string;
  provider: OCRProvider | null;
  text: string;
  pageLimitReached: boolean;
}): boolean {
  if (params.mimeType !== 'application/pdf') return false;
  if (params.pageLimitReached) return true;
  const text = (params.text || '').trim();
  if (!text) return true;
  if (params.provider === 'embedded_pdf_parse' && text.length < SCANNED_PDF_TEXT_THRESHOLD) {
    return true;
  }
  const denseNoSpaces = spaceRatio(text) < 0.04 && text.length < 800;
  return text.length < SCANNED_PDF_TEXT_THRESHOLD || denseNoSpaces;
}

async function runScannedPdfFallback(params: {
  pdfBuffer: Buffer;
  originalName?: string;
  docMode: 'statement' | 'receipt';
  ocrJobId?: string | null;
  allowPaidFallback: boolean;
  sb: any;
  userId?: string;
}): Promise<{
  merged: OcrResult;
  warning?: string;
  truncated?: boolean;
  metrics: OcrRunMetrics;
  fallbackSkippedByBudget: boolean;
}> {
  const includeDebug = process.env.OCR_DEBUG === '1' || process.env.OCR_DEBUG === 'true';
  const startedAt = Date.now();
  const updateProgress = async (processedPages: number, totalPages: number) => {
    if (params.userId) {
      try {
        const percent = Math.round((processedPages / totalPages) * 100);
        await params.sb.channel(`chat-progress-${params.userId}`).send({
          type: 'broadcast',
          event: 'progress',
          payload: { message: `Byte is scanning... [${percent}% Complete]` }
        });
      } catch (e) {
        console.warn('[OCR] Failed to broadcast progress', e);
      }
    }

    if (!params.ocrJobId) return;
    const progressJson = {
      debug: {
        progress: {
          processedPages,
          totalPages: Math.min(totalPages, SCANNED_PDF_MAX_PAGES),
        },
      },
    };
    await params.sb
      .from('ocr_jobs')
      .update({
        status: 'running',
        normalized_json: progressJson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.ocrJobId);
  };

  const rendered = await pdfToImages(params.pdfBuffer, {
    maxPages: SCANNED_PDF_MAX_PAGES,
    scale: SCANNED_PDF_RENDER_SCALE,
    maxImageBytes: SCANNED_PDF_MAX_IMAGE_BYTES,
    onPageRendered: updateProgress,
  });
  console.log('[OCR] scanned-pdf render strategy', {
    renderer: 'pdfjs-legacy',
    canvas: process.env.OCR_CANVAS_PACKAGE || '@napi-rs/canvas',
    dpi: SCANNED_PDF_RENDER_DPI,
    maxPages: SCANNED_PDF_MAX_PAGES,
    truncated: rendered.truncated,
  });
  console.log('[OCR] scanned-pdf render summary', {
    totalPages: rendered.totalPages,
    processedPages: rendered.processedPages,
    renderedImageCount: rendered.pages.length,
    truncated: rendered.truncated,
  });
  if (includeDebug) {
    console.log('[OCR] scanned-pdf render bytes', {
      imageBytes: rendered.pages.map((p) => p.imageBuffer.length),
    });
  }
  const fallbackOrder = getFallbackOrderForDocMode(params.docMode);
  const pageResults: OcrPageResult[] = [];
  const metrics: OcrRunMetrics = {
    pagesTotal: rendered.totalPages,
    pagesProcessed: 0,
    primaryEngineCalls: 0,
    fallbackEngineCalls: { openai: 0, google: 0, total: 0 },
    fallbackAttempted: { pages: 0, openai: 0, google: 0, total: 0 },
    fallbackAdopted: { pages: 0, openai: 0, google: 0, total: 0 },
    earlyStopTriggered: { triggered: false, reason: null },
    worstPagesRetried: [],
    totalTimeMs: 0,
    fallbackSkippedByBudget: false,
  };
  let earlyStopReason: string | null = null;
  const BATCH_SIZE = 3;
  const extractionStartTime = performance.now();

  for (let batchStart = 0; batchStart < rendered.pages.length; batchStart += BATCH_SIZE) {
    const batchPages = rendered.pages.slice(batchStart, batchStart + BATCH_SIZE);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batchPages.map(async (page) => {
        try {
          const result = await ocrPageImage({
            pageIndex: page.pageIndex,
            imageBuffer: page.imageBuffer,
            statementMode: params.docMode === 'statement',
            confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
            disableFallback: true,
          });
          return { success: true, pageIndex: page.pageIndex, result, imageBuffer: page.imageBuffer };
        } catch (error) {
          console.error(`[OCR] Failed to extract page ${page.pageIndex}`, error);
          // Return a structured error to allow other pages in batch to succeed
          return { success: false, pageIndex: page.pageIndex, error, imageBuffer: page.imageBuffer };
        }
      })
    );

    // Collect successful results
    for (const item of batchResults) {
      if (item.success && item.result) {
        pageResults.push(item.result);
        if (includeDebug) {
          console.log('[OCR] scanned-pdf page OCR provider', {
            pageIndex: item.pageIndex,
            provider: item.result.provider,
            confidence: item.result.confidence,
            imageBytes: item.imageBuffer.length,
          });
        }
        metrics.primaryEngineCalls += 1;
      }
    }

    // Sort pageResults by pageIndex in case they arrived out of order (though map array should be ordered)
    pageResults.sort((a, b) => a.pageIndex - b.pageIndex);
    
    metrics.pagesProcessed = pageResults.length;
    await updateProgress(Math.min(batchStart + batchPages.length, rendered.totalPages), rendered.totalPages);

    // Check early stopping criteria after this batch
    const mergedSoFar = mergeOcrPages(pageResults, {
      originalName: params.originalName || '',
      confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
      includeDebug: false,
      pagesProcessed: pageResults.length,
      pagesTotal: rendered.totalPages,
    });
    const processedPages = pageResults.length;
    const tableSignalPages = pageResults.filter((p) => hasStrongTableSignal(p.rawText)).length;
    const decision = shouldEarlyStopScanning({
      docMode: params.docMode,
      processedPages,
      mergedConfidence: mergedSoFar.confidence.overall,
      minPagesForEarlyStop: OCR_MIN_PAGES_FOR_EARLY_STOP,
      earlyStopConfidence: OCR_EARLY_STOP_CONFIDENCE,
      hasDate: Boolean(mergedSoFar.fields?.date),
      hasTotal: typeof mergedSoFar.fields?.total === 'number',
      tableSignalPages,
      statementMaxPages: OCR_STATEMENT_EARLY_STOP_MAX_PAGES,
      lowConfidenceFloor: OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD,
    });
    
    if (decision.stop) {
      earlyStopReason = decision.reason;
      metrics.earlyStopTriggered = { triggered: true, reason: earlyStopReason };
      break;
    }
  }
  
  const extractionEndTime = performance.now();
  console.log('[OCR] Parallel extraction time (ms):', extractionEndTime - extractionStartTime);

  let fallbackSkippedByBudget = false;
  const eligibleWorstPages = selectWorstPagesForFallback({
    pages: pageResults,
    maxPages: OCR_FALLBACK_MAX_PAGES,
    pageConfidenceThreshold: OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD,
  });
  console.log('[OCR] scanned-pdf post-extraction', {
    eligibleWorstPages: eligibleWorstPages.length,
    allowPaidFallback: params.allowPaidFallback,
    pageRetryEnabled: OCR_ENABLE_SCANNED_PAGE_RETRY,
  });
  metrics.worstPagesRetried = eligibleWorstPages.map((page) => page.pageIndex);

  if (eligibleWorstPages.length > 0 && !params.allowPaidFallback) {
    fallbackSkippedByBudget = true;
    metrics.fallbackSkippedByBudget = true;
  }

  if (params.allowPaidFallback && OCR_ENABLE_SCANNED_PAGE_RETRY) {
    for (const page of eligibleWorstPages) {
      metrics.fallbackAttempted.pages += 1;
      const target = rendered.pages.find((item) => item.pageIndex === page.pageIndex);
      if (!target) continue;
      let retried: OcrPageResult;
      try {
        retried = await withTimeout(
          retryOcrPageFallback({
            pageResult: page,
            imageBuffer: target.imageBuffer,
            statementMode: params.docMode === 'statement',
            confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
            fallbackOrder,
          }),
          OCR_RETRY_PAGE_TIMEOUT_MS,
          `retry_page_${page.pageIndex}`
        );
      } catch (retryError: any) {
        console.warn('[OCR] fallback page retry timed out/failed; keeping primary result', {
          pageIndex: page.pageIndex,
          error: trimErrorMessage(getErrorMessage(retryError)),
        });
        continue;
      }
      const calledProviders: string[] = Array.isArray(retried.debug?.fallbackProvidersCalled)
        ? retried.debug.fallbackProvidersCalled
        : [];
      for (const calledProvider of calledProviders) {
        if (calledProvider === 'openai_vision') {
          metrics.fallbackEngineCalls.openai += 1;
          metrics.fallbackAttempted.openai += 1;
        }
        if (calledProvider === 'vision') {
          metrics.fallbackEngineCalls.google += 1;
          metrics.fallbackAttempted.google += 1;
        }
        metrics.fallbackAttempted.total += 1;
      }
      const adopted = retried.confidence > page.confidence;
      if (adopted) {
        metrics.fallbackAdopted.pages += 1;
        if (retried.provider === 'openai_vision') {
          metrics.fallbackAdopted.openai += 1;
        } else if (retried.provider === 'vision') {
          metrics.fallbackAdopted.google += 1;
        }
        metrics.fallbackAdopted.total += 1;
      }
      const pageIdx = pageResults.findIndex((item) => item.pageIndex === page.pageIndex);
      if (pageIdx >= 0) {
        pageResults[pageIdx] = retried;
      }
    }
  } else if (eligibleWorstPages.length > 0) {
    console.log('[OCR] scanned-pdf page retry skipped', {
      reason: params.allowPaidFallback ? 'retry_disabled' : 'budget_guard',
      count: eligibleWorstPages.length,
    });
  }
  metrics.fallbackEngineCalls.total =
    metrics.fallbackEngineCalls.openai + metrics.fallbackEngineCalls.google;
  metrics.totalTimeMs = Date.now() - startedAt;

  const merged = mergeOcrPages(pageResults, {
    originalName: params.originalName || '',
    confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
    truncated: rendered.truncated,
    warning: rendered.warning,
    includeDebug,
    pagesTotal: rendered.totalPages,
    pagesProcessed: pageResults.length,
    earlyStopTriggered: metrics.earlyStopTriggered.triggered,
    earlyStopReason,
    metrics,
  });
  if (fallbackSkippedByBudget) {
    merged.needsUserConfirmation = true;
  }
  return {
    merged,
    warning: rendered.warning,
    truncated: rendered.truncated,
    metrics,
    fallbackSkippedByBudget,
  };
}

async function runEmergencyScannedProviderPass(params: {
  pdfBuffer: Buffer;
  originalName?: string;
  docMode: 'statement' | 'receipt';
}): Promise<OcrResult | null> {
  const rendered = await pdfToImages(params.pdfBuffer, {
    maxPages: 1,
    scale: SCANNED_PDF_RENDER_SCALE,
    maxImageBytes: SCANNED_PDF_MAX_IMAGE_BYTES,
  });
  const firstPage = rendered.pages[0];
  if (!firstPage) return null;
  const rescuePage = await ocrPageImage({
    pageIndex: firstPage.pageIndex,
    imageBuffer: firstPage.imageBuffer,
    statementMode: params.docMode === 'statement',
    confidenceThreshold: 0.55,
    disableFallback: false,
    fallbackOrder: ['vision', 'openai_vision'],
  });
  const rescueText = cleanupOcrText(String(rescuePage.rawText || ''));
  if (!rescueText || isUselessOcrResponseText(rescueText)) return null;
  return mergeOcrPages(
    [{ ...rescuePage, rawText: rescueText }],
    {
      originalName: params.originalName || '',
      confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
      includeDebug: false,
      pagesTotal: rendered.totalPages || 1,
      pagesProcessed: 1,
      truncated: rendered.truncated,
      warning: rendered.warning,
    }
  );
}

async function callGoogleVisionOnImageBuffer(
  imageBuffer: Buffer,
  timeoutMs: number
): Promise<string> {
  const key = String(process.env.GOOGLE_VISION_API_KEY || '').trim();
  if (!key) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBuffer.toString('base64') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    });
    if (!res.ok) {
      return '';
    }
    const payload = await res.json();
    const text = String(
      payload?.responses?.[0]?.fullTextAnnotation?.text ||
      payload?.responses?.[0]?.textAnnotations?.[0]?.description ||
      ''
    ).trim();
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function performImageOnlyOcr(params: {
  pdfBuffer: Buffer;
  originalName?: string;
}): Promise<OcrResult | null> {
  const imageOnlyVisionTimeoutMs = Math.max(30000, Number(process.env.OCR_IMAGE_ONLY_VISION_TIMEOUT_MS || 45000));
  const rendered = await pdfToImages(params.pdfBuffer, {
    maxPages: SCANNED_PDF_MAX_PAGES,
    scale: SCANNED_PDF_RENDER_SCALE,
    maxImageBytes: SCANNED_PDF_MAX_IMAGE_BYTES,
    continueOnPageError: true,
  });
  if (!rendered.pages.length) return null;

  const perPageTexts: string[] = [];
  for (const page of rendered.pages) {
    try {
      const text = await callGoogleVisionOnImageBuffer(page.imageBuffer, imageOnlyVisionTimeoutMs);
      const cleaned = cleanupOcrText(text);
      if (cleaned && cleaned.length >= OCR_EMPTY_MIN_LEN && !isUselessOcrResponseText(cleaned)) {
        perPageTexts.push(cleaned);
      }
    } catch {
      // keep scanning other pages
    }
  }
  const mergedText = cleanupOcrText(perPageTexts.join('\n\n'));
  if (!mergedText || mergedText.length < OCR_EMPTY_MIN_LEN || isUselessOcrResponseText(mergedText)) {
    return null;
  }
  console.log('[OCR] pdfjs rendering bypassed stream errors -> images generated -> Google Vision Image OCR successful', {
    pagesRendered: rendered.pages.length,
    textLength: mergedText.length,
  });
  return buildNormalizedResult({
    text: mergedText,
    provider: 'vision',
    pages: rendered.pages.length,
    originalName: params.originalName || '',
    fallbackUsed: true,
  });
}

function inferMimeTypeFromName(name?: string | null): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return null;
}

function sanitizeOcrText(input: string): string {
  return cleanupOcrText(input);
}

/**
 * Run OCR on image/PDF using Google Vision (for images) or OCR.space (fallback)
 * @param signedUrl Signed URL to file
 * @param mimeType MIME type of the file (e.g., 'image/png', 'application/pdf')
 * @returns Extracted text + provider metadata
 */
function computeOcrTimeoutMs(expectedSize?: number, mimeType?: string): number {
  const normalizedMime = mimeType || 'application/pdf';
  const isPdf = normalizedMime === 'application/pdf';
  const sizeMb = expectedSize ? Math.max(1, expectedSize / (1024 * 1024)) : 1;
  const base = isPdf ? 25000 : 20000;
  const perMb = isPdf ? 4000 : 2500;
  const computed = base + sizeMb * perMb;
  return Math.min(MAX_OCR_TIMEOUT_MS, Math.max(15000, Math.round(computed)));
}

async function extractEmbeddedPdfText(
  docId: string,
  signedUrl: string,
  timeoutMs: number
): Promise<{ text: string; strictPdfStructureDetected: boolean }> {
  const buf = await getPdfBuffer(docId, signedUrl, timeoutMs);
  try {
    const text = await extractPdfTextWithPdfParse(buf);
    console.log("[OCR] pdf-parse embedded text extracted", { textLength: text.trim().length });
    return { text, strictPdfStructureDetected: false };
  } catch (parseError: any) {
    const message = getErrorMessage(parseError);
    const lower = message.toLowerCase();
    const parserStructureError =
      lower.includes('invalid pdf structure') ||
      lower.includes('bad fcheck') ||
      lower.includes('formaterror') ||
      lower.includes('flate stream');
    if (!parserStructureError) {
      throw parseError;
    }
    console.warn('[OCR] Structural error detected -> forcing image-based extraction', {
      error: message,
    });
    return { text: '', strictPdfStructureDetected: true };
  }
}

function shouldUseLayoutText(text: string): boolean {
  if (!text) return false;
  const hasStatementHints = /statement|opening balance|closing balance|account|period ending|statement period|transaction details|balance/i.test(text);
  if (!hasStatementHints) return false;
  const crowdedMarkers = /Amountsdeducted|Amountsadded|DebitCardPurchase|Pre-AuthorizedPayment|DateDescriptionWithdrawals|Withdrawals\s*\(\$?\)|Deposits\s*\(\$?\)|Balance\s*\(\$?\)/i.test(text);
  const spaceRatio = text.split('').filter(ch => ch === ' ').length / Math.max(1, text.length);
  const isCibc = /CIBC\s+Account\s+Statement/i.test(text);
  return crowdedMarkers || spaceRatio < 0.06 || (isCibc && spaceRatio < 0.12);
}

function spaceRatio(text: string): number {
  if (!text) return 0;
  return text.split('').filter(ch => ch === ' ').length / Math.max(1, text.length);
}

function hasStrongTableSignal(text: string): boolean {
  return /amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)|transaction details|date\s+description\s+amount/i.test(text);
}

function parseFallbackOrder(orderEnvValue: string): OcrFallbackProvider[] {
  const parsed = String(orderEnvValue || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item): OcrFallbackProvider | null => {
      if (item === 'openai' || item === 'openai_vision') return 'openai_vision';
      if (item === 'google' || item === 'vision') return 'vision';
      return null;
    })
    .filter((item): item is OcrFallbackProvider => Boolean(item));
  return parsed.length > 0 ? Array.from(new Set(parsed)) : ['openai_vision', 'vision'];
}

function getFallbackOrderForDocMode(docMode: 'statement' | 'receipt'): OcrFallbackProvider[] {
  return docMode === 'statement'
    ? parseFallbackOrder(OCR_FALLBACK_ORDER_STATEMENT)
    : parseFallbackOrder(OCR_FALLBACK_ORDER_RECEIPT);
}

function getMonthStartIso(date = new Date()): string {
  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  return monthStart.toISOString();
}

async function getMonthlyFallbackUsageCount(sb: any, userId: string): Promise<number> {
  if (!userId) return 0;
  const { data, error } = await sb
    .from('ocr_jobs')
    .select('normalized_json, updated_at')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('updated_at', getMonthStartIso());
  if (error || !Array.isArray(data)) {
    const errMsg = String(error?.message || '');
    const missingOcrJobs =
      errMsg.toLowerCase().includes('schema cache') ||
      errMsg.toLowerCase().includes('relation') ||
      errMsg.toLowerCase().includes('ocr_jobs');
    if (missingOcrJobs) {
      const debugEnabled = String(process.env.VITE_LOG_LEVEL || '').toLowerCase() === 'debug';
      if ((debugEnabled || !warnedMissingOcrJobsMonthlyUsage) && !warnedMissingOcrJobsMonthlyUsage) {
        console.warn('[OCR] monthly usage fallback: ocr_jobs unavailable, defaulting to 0');
      }
      warnedMissingOcrJobsMonthlyUsage = true;
    } else {
      console.warn('[OCR] Unable to load monthly fallback usage count', {
        userId,
        error: errMsg || String(error),
      });
    }
    return 0;
  }
  return data.reduce((count: number, row: any) => {
    const normalized = row?.normalized_json || {};
    const fallbackUsed = Boolean(normalized?.fallbackUsed);
    const fallbackCalls = Number(normalized?.debug?.metrics?.fallbackEngineCalls?.total || 0);
    return fallbackUsed || fallbackCalls > 0 ? count + 1 : count;
  }, 0);
}

async function fetchPdfBuffer(signedUrl: string, timeoutMs: number): Promise<Buffer> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1_000, timeoutMs));
  try {
    const res = await fetch(signedUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`PDF download failed: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}

async function fetchBinaryBuffer(signedUrl: string, timeoutMs: number): Promise<Buffer> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1_000, timeoutMs));
  try {
    const res = await fetch(signedUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`File download failed: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } finally {
    clearTimeout(t);
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function bytesToAscii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
    .join('');
}

function validatePdfEnvelope(buffer: Buffer): {
  ok: boolean;
  headerFound: boolean;
  eofFound: boolean;
  first16Hex: string;
  first8Ascii: string;
  last32Hex: string;
  tailAscii: string;
} {
  const first16 = buffer.subarray(0, Math.min(16, buffer.length));
  const first8 = buffer.subarray(0, Math.min(8, buffer.length));
  const last32 = buffer.subarray(Math.max(0, buffer.length - 32));
  const headWindow = buffer.subarray(0, Math.min(1024, buffer.length)).toString('latin1');
  const tailWindow = buffer.subarray(Math.max(0, buffer.length - 2048)).toString('latin1');
  const tailAscii = tailWindow.replace(/[^\x20-\x7E]/g, '.');
  const headerFound = headWindow.includes('%PDF-');
  const eofFound = tailWindow.includes('%%EOF');
  return {
    ok: headerFound && eofFound,
    headerFound,
    eofFound,
    first16Hex: bytesToHex(first16),
    first8Ascii: bytesToAscii(first8),
    last32Hex: bytesToHex(last32),
    tailAscii,
  };
}

async function getPdfBuffer(docId: string, url: string, timeoutMs: number): Promise<Buffer> {
  if (!bufferCache.has(docId)) {
    bufferCache.set(docId, await fetchPdfBuffer(url, timeoutMs));
  }
  return bufferCache.get(docId)!;
}

async function prepareOcrSpaceImagePayload(
  signedUrl: string,
  timeoutMs: number
): Promise<{ base64Image: string; finalSize: number }> {
  const buffer = await fetchBinaryBuffer(signedUrl, timeoutMs);

  return {
    base64Image: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    finalSize: buffer.length,
  };
}

async function runOpenAIVisionOcr(
  base64Image: string,
  timeoutMs: number
): Promise<OCRRunResult> {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const start = Date.now();
  console.log('[OCR] OpenAI Vision model', { model });
  const openAiTimeoutMs = Math.max(4000, Math.min(45000, Number(timeoutMs || 25000)));
  const response = await withRetries('OpenAI Vision', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), openAiTimeoutMs);
    try {
      return await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: [
                  'OCR task: return only text that is visually present in this image.',
                  'Rules:',
                  '- Do not explain, apologize, or add assistant commentary.',
                  '- Preserve line breaks when possible.',
                  '- If no readable text exists, return an empty string.',
                ].join('\n'),
              },
              { type: 'image_url', image_url: { url: base64Image } },
            ],
          },
        ],
        temperature: 0,
        max_tokens: 2000,
      }, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  });
  const text = normalizeVisionExtractionText(response.choices?.[0]?.message?.content || '');
  return {
    text,
    provider: 'openai_vision',
    durationMs: Date.now() - start,
    pages: 1,
  };
}

async function runGoogleVisionOcr(
  signedUrl: string,
  timeoutMs: number
): Promise<OCRRunResult | null> {
  if (!process.env.GOOGLE_VISION_API_KEY) return null;
  try {
    const visionStart = Date.now();
    const result = await withRetries('Google Vision', () =>
      callGoogleVisionOnImage({
        imageUrl: signedUrl,
        apiKey: process.env.GOOGLE_VISION_API_KEY as string,
        feature: 'DOCUMENT_TEXT_DETECTION',
        timeoutMs,
      })
    );
    if (!result.fullText?.trim()) return null;
    return {
      text: result.fullText,
      provider: 'vision',
      durationMs: Date.now() - visionStart,
      pages: 1,
    };
  } catch {
    return null;
  }
}

async function runOCR(
  signedUrl: string,
  mimeType: string,
  expectedSize?: number,
  docId?: string,
  docMode: 'statement' | 'receipt' = 'receipt',
  abortSignal?: AbortSignal
): Promise<OCRRunResult> {
  const hasVision = !!process.env.GOOGLE_VISION_API_KEY;
  const hasOcrSpace = !!process.env.OCR_SPACE_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const normalizedMime = mimeType || 'application/pdf';
  const isImage = normalizedMime.startsWith('image/') && !normalizedMime.includes('pdf');
  const isPdf = normalizedMime === 'application/pdf';
  let structuralPdfErrorDetected = false;
  const timeoutMs = computeOcrTimeoutMs(expectedSize, normalizedMime);
  const embeddedDisabled =
    process.env.PDF_EMBEDDED_TEXT_DISABLED === '1' ||
    process.env.PDF_EMBEDDED_TEXT_DISABLED === 'true';
  const enableEmbeddedPdfText =
    !embeddedDisabled &&
    (
      process.env.ENABLE_PDF_EMBEDDED_TEXT === '1' ||
      process.env.ENABLE_PDF_EMBEDDED_TEXT === 'true' ||
      process.env.NETLIFY_DEV === 'true'
    );
  if (enableEmbeddedPdfText && isPdf) {
    console.log('[OCR] Embedded PDF text extraction ENABLED (pdf-parse only)');
  }
  if (!hasVision && !hasOcrSpace) {
    throw new Error('No OCR provider configured. Set GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY.');
  }

  function buildOcrSpaceError(result: any): RetryableError {
    const errorMessage = Array.isArray(result?.ErrorMessage)
      ? result.ErrorMessage.join('; ')
      : result?.ErrorMessage || `OCR processing error (exit code: ${result?.OCRExitCode ?? 'unknown'})`;
    const err: RetryableError = new Error(`OCR.space processing failed: ${errorMessage}`);
    const lower = String(errorMessage).toLowerCase();
    if (lower.includes('limit') || lower.includes('rate')) {
      err.status = 429;
    } else if (lower.includes('timeout')) {
      err.status = 408;
    } else {
      err.status = 422;
    }
    return err;
  }

  function isOcrSpacePageLimitError(error: unknown): boolean {
    const message = (error as Error)?.message?.toLowerCase?.() || '';
    return message.includes('maximum page limit') || message.includes('page limit of 3');
  }

  let imagePayload: { base64Image: string; finalSize: number } | null = null;
  if (isImage && (hasOcrSpace || hasOpenAI)) {
    imagePayload = await prepareOcrSpaceImagePayload(signedUrl, timeoutMs);
  }

  async function runOcrSpace(enhanced: boolean): Promise<OCRRunResult> {
    const formData = new FormData();
    if (isImage && imagePayload?.base64Image) {
      formData.append('base64Image', imagePayload.base64Image);
    } else {
      formData.append('url', signedUrl);
    }
    const ocrSpaceKey = process.env.OCR_SPACE_API_KEY;
    if (ocrSpaceKey) {
      formData.append('apikey', ocrSpaceKey);
    }
    formData.append('language', 'eng');
    formData.append('detectOrientation', 'true');
    formData.append('isOverlayRequired', 'false');
    formData.append('filetype', isPdf ? 'pdf' : 'image');
    if (enhanced) {
      formData.append('scale', 'true');
      formData.append('isTable', 'true');
      formData.append('OCREngine', '2');
    }
    const ocrSpaceStart = Date.now();
    const response = await withRetries(
      enhanced ? 'OCR.space enhanced' : 'OCR.space',
      async () => {
        const res = await fetchWithTimeout('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData,
        }, timeoutMs, abortSignal);
        if (!res.ok) {
          const error: RetryableError = new Error(`OCR.space API returned ${res.status}`);
          error.status = res.status;
          throw error;
        }
        return res;
      },
      { signal: abortSignal }
    );
    const result = await response.json();
    if (result?.IsErroredOnProcessing || (result?.OCRExitCode && result?.OCRExitCode !== 1)) {
      throw buildOcrSpaceError(result);
    }
    const parsedResults = Array.isArray(result.ParsedResults) ? result.ParsedResults : [];
    const text = parsedResults
      .map((page: any) => (page?.ParsedText ? String(page.ParsedText) : ''))
      .filter((pageText) => pageText.trim().length > 0)
      .join('\n\n');
    return {
      text,
      provider: 'ocrspace',
      durationMs: Date.now() - ocrSpaceStart,
      pages: parsedResults.length || undefined,
    };
  }

  // 1) For PDFs, attempt embedded text extraction first
  if (isPdf && enableEmbeddedPdfText && docId) {
    try {
      const embeddedStart = Date.now();
      const embedded = await withRetries('PDF embedded text', () =>
        extractEmbeddedPdfText(docId, signedUrl, timeoutMs)
      );
      structuralPdfErrorDetected = structuralPdfErrorDetected || embedded.strictPdfStructureDetected;
      const embeddedText = embedded.text;
      const embeddedLen = embeddedText ? embeddedText.trim().length : 0;
      if (embeddedLen > 0) {
        let finalText = embeddedText;
        if (shouldUseLayoutText(embeddedText)) {
          try {
            const buf = await getPdfBuffer(docId, signedUrl, timeoutMs);
            const layoutText = await extractPdfTextWithLayout(buf);
            if (layoutText && layoutText.trim().length > 50) {
              const embeddedRatio = spaceRatio(embeddedText);
              const layoutRatio = spaceRatio(layoutText);
              if (layoutRatio >= embeddedRatio || layoutText.length > embeddedText.length) {
                finalText = layoutText;
                console.log('[OCR] Using layout-aware PDF text extraction', {
                  embeddedRatio,
                  layoutRatio,
                  chars: layoutText.trim().length,
                });
              }
            }
          } catch (layoutError: any) {
            console.warn('[OCR] Layout PDF extraction failed, using embedded text', {
              error: layoutError?.message || String(layoutError),
            });
          }
        }
        const finalLen = finalText.trim().length;
        const accepted = finalLen >= PDF_MIN_TEXT_LEN;
        console.log('[OCR] embedded_pdf len=%d accepted=%s reason=%s', finalLen, accepted, accepted ? 'ok' : 'too_short');
        if (accepted) {
          console.log('[OCR] Embedded PDF extraction success (pdf-parse)', { chars: finalLen });
          return {
            text: finalText,
            provider: 'embedded_pdf_parse',
            durationMs: Date.now() - embeddedStart,
            pages: undefined,
          };
        }
      }
      console.log('[OCR] No embedded text via pdf-parse (likely scanned PDF)');
    } catch (error: any) {
      if (isStrictPdfStructureError(error)) {
        structuralPdfErrorDetected = true;
      }
      if (isKnownMalformedPdfError(error) || isNoTextProviderError(error)) {
        console.warn('[OCR] embedded_pdf_parse_failed_fallback_attempt', {
          error: getErrorMessage(error),
        });
      } else {
        console.warn('[OCR] PDF embedded text extraction failed, falling back to OCR:', getErrorMessage(error));
      }
    }
  } else if (isPdf) {
    console.log('[OCR] PDF embedded text extraction disabled; using OCR.space');
  }

  // 2) Prefer OCR.space first for images and PDFs when available
  if (hasOcrSpace) {
    console.log('[OCR] Using OCR.space backend');
    try {
      const baseResult = await runOcrSpace(docMode === 'statement');
      const baseLen = baseResult.text?.trim().length || 0;
      console.log('[OCR] ocrspace len=%d accepted=%s reason=%s', baseLen, baseLen >= OCR_EMPTY_MIN_LEN, baseLen >= OCR_EMPTY_MIN_LEN ? 'ok' : 'empty');
      if (baseResult.text?.trim()) {
        if (baseResult.text.trim().length < 200) {
          console.warn('[OCR] OCR.space returned short text, retrying with enhanced settings');
          const enhancedResult = await runOcrSpace(true);
          const enhancedLen = enhancedResult.text?.trim().length || 0;
          console.log('[OCR] ocrspace len=%d accepted=%s reason=%s', enhancedLen, enhancedLen >= OCR_EMPTY_MIN_LEN, enhancedLen >= OCR_EMPTY_MIN_LEN ? 'ok' : 'empty');
          if (enhancedResult.text?.trim().length > baseResult.text.trim().length) {
            return enhancedResult;
          }
        }
        return baseResult;
      }
      const enhancedResult = await runOcrSpace(true);
      const enhancedLen = enhancedResult.text?.trim().length || 0;
      console.log('[OCR] ocrspace len=%d accepted=%s reason=%s', enhancedLen, enhancedLen >= OCR_EMPTY_MIN_LEN, enhancedLen >= OCR_EMPTY_MIN_LEN ? 'ok' : 'empty');
      if (enhancedResult.text?.trim()) {
        return enhancedResult;
      }
    } catch (error: any) {
      if (isStrictPdfStructureError(error)) {
        structuralPdfErrorDetected = true;
      }
      if (isPdf && isOcrSpacePageLimitError(error)) {
        return {
          text: '',
          provider: 'ocrspace',
          durationMs: 0,
          pageLimitReached: true,
        };
      }
      if (isPdf && (isKnownMalformedPdfError(error) || isNoTextProviderError(error))) {
        console.warn('[OCR] ocrspace_failed_fallback_attempt', {
          error: getErrorMessage(error),
        });
      } else {
        console.error('[OCR] OCR.space error:', getErrorMessage(error));
      }
    }
  }

  // 3) Fallback to OpenAI Vision for images when configured
  if (isImage && hasOpenAI && imagePayload?.base64Image) {
    try {
      console.log('[OCR] Using OpenAI Vision for image file');
      const result = await runOpenAIVisionOcr(imagePayload.base64Image, timeoutMs);
      if (result.text?.trim()) {
        return result;
      }
      console.warn('[OCR] OpenAI Vision returned empty text');
    } catch (error: any) {
      console.error('[OCR] OpenAI Vision error:', error.message || error);
    }
  }

  // 4) Fallback to Google Vision for images when configured
  if (isImage && hasVision) {
    try {
      console.log('[OCR] Using Google Vision for image file');
      const visionStart = Date.now();
      const result = await withRetries('Google Vision', () =>
        callGoogleVisionOnImage({
          imageUrl: signedUrl,
          apiKey: process.env.GOOGLE_VISION_API_KEY as string,
          feature: 'DOCUMENT_TEXT_DETECTION',
          timeoutMs,
        })
      );

      if (result.fullText?.trim()) {
        return {
          text: result.fullText,
          provider: 'vision',
          durationMs: Date.now() - visionStart,
        };
      }

      console.warn('[OCR] Google Vision returned empty text');
    } catch (error: any) {
      console.error('[OCR] Google Vision error:', error.message || error);
    }
  }

  // 5) Final fallback
  if (structuralPdfErrorDetected) {
    throw new Error('OCR failed: no provider returned text (structural_pdf_error)');
  }
  throw new Error('OCR failed: no provider returned text');
}

async function runLowConfidenceFallbackOCR(args: {
  signedUrl: string;
  mimeType: string;
  expectedSize?: number;
  primaryProvider: OCRProvider;
  docMode: 'statement' | 'receipt';
  allowPaidFallback: boolean;
}): Promise<OCRRunResult | null> {
  const normalizedMime = args.mimeType || 'application/pdf';
  const isImage = normalizedMime.startsWith('image/') && !normalizedMime.includes('pdf');
  if (!isImage) return null;
  if (!args.allowPaidFallback) return null;

  const timeoutMs = computeOcrTimeoutMs(args.expectedSize, normalizedMime);
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const fallbackOrder = getFallbackOrderForDocMode(args.docMode);
  let preparedPayload: { base64Image: string; finalSize: number } | null = null;
  const ensurePayload = async () => {
    if (!preparedPayload) {
      preparedPayload = await prepareOcrSpaceImagePayload(args.signedUrl, timeoutMs);
    }
    return preparedPayload;
  };

  for (const provider of fallbackOrder) {
    if (provider === 'openai_vision') {
      if (!hasOpenAI || args.primaryProvider === 'openai_vision') continue;
      try {
        const imagePayload = await ensurePayload();
        const openAi = await runOpenAIVisionOcr(imagePayload.base64Image, timeoutMs);
        if (openAi.text?.trim()) return openAi;
      } catch {
        // continue
      }
      continue;
    }
    if (provider === 'vision' && args.primaryProvider !== 'vision') {
      const google = await runGoogleVisionOcr(args.signedUrl, timeoutMs);
      if (google?.text?.trim()) return google;
    }
  }

  return null;
}

async function applyCachedOcrToDocument(sb: any, docId: string, cached: OcrResult): Promise<void> {
  const cachedMetrics = safeTextMetrics(cached?.rawText || '');
  const cachedSafe = {
    ...(cached || {}),
    rawText: undefined,
    text_hash: cachedMetrics.hash || (cached as any)?.text_hash || null,
    text_length: cachedMetrics.length ?? (cached as any)?.text_length ?? 0,
  } as any;
  const baseUpdatePayload: Record<string, any> = {
    ocr_text: null,
    ocr_status: 'ready',
    ocr_completed_at: new Date().toISOString(),
    status: cachedSafe.needsUserConfirmation ? 'needs_review' : 'ready',
    extracted_data: cachedSafe,
    updated_at: new Date().toISOString(),
  };
  const fullUpdatePayload = {
    ...baseUpdatePayload,
  };
  let { error } = await sb
    .from('user_documents')
    .update(fullUpdatePayload)
    .eq('id', docId);
  if (error && String(error.message || '').includes('ocr_status')) {
    const { ocr_status, ...withoutOcrStatus } = fullUpdatePayload as any;
    ({ error } = await sb.from('user_documents').update(withoutOcrStatus).eq('id', docId));
  }
  if (error && String(error.message || '').includes('extracted_data')) {
    const { extracted_data, ...withoutExtracted } = baseUpdatePayload;
    const fallbackPayload = {
      ...withoutExtracted,
    };
    ({ error } = await sb.from('user_documents').update(fallbackPayload).eq('id', docId));
  }
  if (error) {
    throw error;
  }
}

async function setDocumentOcrStatus(
  sb: any,
  docId: string,
  ocrStatus: 'processing' | 'ready' | 'ready_cached' | 'failed'
): Promise<void> {
  try {
    const { error } = await sb
      .from('user_documents')
      .update({
        ocr_status: ocrStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);
    if (error) {
      const msg = String(error?.message || '').toLowerCase();
      if (msg.includes('column') && msg.includes('ocr_status') && msg.includes('does not exist')) {
        if (!warnedMissingDocOcrStatusColumn) {
          warnedMissingDocOcrStatusColumn = true;
          console.warn('[OCR] user_documents.ocr_status column missing; skipping ocr_status writes');
        }
        return;
      }
      console.warn('[OCR] Failed to update ocr_status', { docId, ocrStatus });
    }
  } catch {
    console.warn('[OCR] Failed to update ocr_status', { docId, ocrStatus });
  }
}

function classifyOcrErrorCode(error: unknown): { status: OcrFinalStatus; errorCode: string } {
  const raw = getErrorMessage(error).toLowerCase();
  if (raw.includes('timeout') || raw.includes('aborted')) {
    return { status: 'timed_out', errorCode: 'timeout' };
  }
  if (raw.includes('no provider returned text')) {
    return { status: 'failed', errorCode: 'no_provider_text' };
  }
  if (raw.includes('provider') || raw.includes('ocr.space') || raw.includes('vision')) {
    return { status: 'failed', errorCode: 'provider_error' };
  }
  return { status: 'failed', errorCode: 'ocr_failed' };
}

async function finalizeTerminalOcrFailure(
  sb: any,
  params: {
    ocrJobId: string | null;
    docId: string;
    error: unknown;
    finalStatus?: OcrFinalStatus;
    errorCode: string;
    rejectionReason: string;
  }
): Promise<void> {
  const trimmedError = trimErrorMessage(getErrorMessage(params.error));
  await finalizeOcrJobOutcome(sb, {
    ocrJobId: params.ocrJobId,
    docId: params.docId,
    status: params.finalStatus || 'failed',
    errorCode: params.errorCode,
    errorMessage: trimmedError || params.errorCode,
  });
  await setDocumentOcrStatus(sb, params.docId, 'failed');
  await markDocStatus(params.docId, 'rejected', trimErrorMessage(params.rejectionReason, 220));
  console.warn('[OCR] stage=ocr_status_finalized', {
    docId: params.docId,
    ocrStatus: 'failed',
    status: 'rejected',
    errorCode: params.errorCode,
  });
}

function getMissingUserDocumentsColumn(error: unknown): string | null {
  const msg = String((error as any)?.message || error || '');
  if (!msg.includes("Could not find the '")) return null;
  const strictMatch = msg.match(/Could not find the '([^']+)' column of 'user_documents' in the schema cache/i);
  if (strictMatch?.[1]) return strictMatch[1];
  const looseMatch = msg.match(/Could not find the '([^']+)'/i);
  return looseMatch?.[1] || null;
}

async function finalizeOcrJobOutcome(
  sb: any,
  params: {
    ocrJobId: string | null;
    docId: string;
    status: OcrFinalStatus;
    errorCode?: string | null;
    errorMessage?: string | null;
    normalizedJson?: any;
    engineUsed?: string | null;
    pages?: number | null;
    confidence?: number | null;
  }
): Promise<void> {
  if (!params.ocrJobId) return;
  const nowIso = new Date().toISOString();
  const desiredStatus = params.status;
  const errorCode = params.errorCode || null;
  console.log('[OCR] finalize status=%s error_code=%s', desiredStatus, errorCode || 'null');
  const basePayload: Record<string, any> = {
    status: desiredStatus,
    document_id: params.docId,
    error: params.errorMessage || null,
    updated_at: nowIso,
    error_code: errorCode,
    completed_at: nowIso,
  };
  if (params.engineUsed) basePayload.engine_used = params.engineUsed;
  if (Number.isFinite(Number(params.pages))) basePayload.pages = Number(params.pages);
  if (Number.isFinite(Number(params.confidence))) basePayload.confidence = Number(params.confidence);
  if (params.normalizedJson) basePayload.normalized_json = params.normalizedJson;
  if (desiredStatus === 'succeeded') basePayload.error = null;

  try {
    const { error } = await sb
      .from('ocr_jobs')
      .update(basePayload)
      .eq('id', params.ocrJobId);
    if (!error) {
      console.log('[OCR] stage=ocr_job_finalize', {
        status: desiredStatus,
        docId: params.docId,
        ocrJobId: params.ocrJobId,
        errorCode: errorCode || null,
      });
      return;
    }

    const fallbackPayload: Record<string, any> = {
      status: desiredStatus === 'succeeded' ? 'done' : 'error',
      document_id: params.docId,
      error: params.errorMessage || (errorCode ? `ocr_${errorCode}` : null),
      updated_at: nowIso,
    };
    if (params.normalizedJson) fallbackPayload.normalized_json = params.normalizedJson;
    if (params.engineUsed) fallbackPayload.engine_used = params.engineUsed;
    if (Number.isFinite(Number(params.pages))) fallbackPayload.pages = Number(params.pages);
    if (Number.isFinite(Number(params.confidence))) fallbackPayload.confidence = Number(params.confidence);

    await sb
      .from('ocr_jobs')
      .update(fallbackPayload)
      .eq('id', params.ocrJobId);
    console.log('[OCR] stage=ocr_job_finalize', {
      status: desiredStatus,
      docId: params.docId,
      ocrJobId: params.ocrJobId,
      errorCode: errorCode || null,
      fallback: true,
    });
  } catch (finalizeError: any) {
    console.error('[OCR] stage=ocr_job_finalize error', {
      docId: params.docId,
      ocrJobId: params.ocrJobId,
      status: desiredStatus,
      message: finalizeError?.message || String(finalizeError),
    });
  }
}

function mergeMetadata(existing: unknown, patch: Record<string, any>): Record<string, any> {
  const base = existing && typeof existing === 'object' ? (existing as Record<string, any>) : {};
  return { ...base, ...patch };
}

function buildOcrProofMetadata(existing: unknown, proof: {
  textLength: number;
  textHash: string | null;
  provider: string | null;
  status: 'ready' | 'ready_cached';
  completedAt: string;
}): Record<string, any> {
  const base = existing && typeof existing === 'object' ? (existing as Record<string, any>) : {};
  return {
    ...base,
    ocr_text_length: proof.textLength,
    text_hash: proof.textHash,
    ocr_provider: proof.provider,
    ocr_status: proof.status,
    ocr_completed_at: proof.completedAt,
    ocr: {
      ...(base.ocr && typeof base.ocr === 'object' ? base.ocr : {}),
      text_length: proof.textLength,
      text_hash: proof.textHash,
      provider: proof.provider,
      status: proof.status,
      completed_at: proof.completedAt,
    },
  };
}

async function markCachedDocReady(sb: any, docId: string, metadata: unknown): Promise<void> {
  try {
    await sb
      .from('user_documents')
      .update({
        ocr_status: 'ready_cached',
        metadata: mergeMetadata(metadata, {
          ocr_cached: true,
          ocr_cached_at: new Date().toISOString(),
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);
  } catch {
    // Best effort only; never block already_processed fast path.
  }
}

export const handler: Handler = async (event, context) => {
  console.log("[FUNC=smart-import-ocr] handler start");
  // Byte Speed Mode v2: Non-blocking background processing
  if (context && typeof context.callbackWaitsForEmptyEventLoop === 'boolean') {
    context.callbackWaitsForEmptyEventLoop = false;
  }
  
  let lockAcquired = false;
  let lockedDocId: string | null = null;
  let ocrJobId: string | null = null;
  let stopHeartbeat: (() => void) | null = null;
  let ocrSucceeded = false;

  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    let body: any = {};
    if (contentType.includes('multipart/form-data')) {
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64')
        : event.body || '';
      const formData = await new Response(rawBody, { headers: { 'content-type': contentType } }).formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = JSON.parse(event.body || '{}');
    }

    const traceIdHeader = event.headers['x-trace-id'] || event.headers['X-Trace-Id'];
    const traceId = body.traceId || traceIdHeader || 'no-trace';
    const includeCleanedTextDebug =
      process.env.NODE_ENV !== 'production' &&
      (process.env.OCR_DEBUG_INCLUDE_CLEANED_TEXT === '1' || body?.debugIncludeCleanedText === true);
    const { userId, docId, threadId } = body;
    const expectedSize = body.expectedSize ? Number(body.expectedSize) : undefined;
    const importRunId = body.importRunId || body.requestId;
    const caller = String(body?.caller || body?.source || 'unknown');
    const isRetry = body?.isRetry === true || body?.retry === true;
    const isExplicitRecovery =
      body?.explicitRecovery === true ||
      isRetry ||
      String(importRunId || '').startsWith('stale-retry-');
    const logPrefix = `[OCR][${traceId}]`;
    const isOrphanInvocation = !importRunId;

    console.log(`${logPrefix} START`, { docId, importRunId });
    console.log('[smart-import-ocr] entry', {
      caller,
      source: String(body?.source || ''),
      docId,
      importRunId: importRunId || null,
      orphan: isOrphanInvocation,
      matchUploadContext: !isOrphanInvocation,
      isRetry,
      isExplicitRecovery,
      traceId,
    });
    if (!userId || !docId) {
      console.error(`${logPrefix} ERROR`, { error: 'Missing userId/docId' });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId/docId', traceId, importRunId }) };
    }
    if (isOrphanInvocation) {
      console.warn('[smart-import-ocr] Skipping orphan OCR invocation', {
        caller,
        docId,
        importRunId: null,
        traceId,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          skipped: true,
          reason: 'orphan_invocation',
          docId,
          traceId,
        }),
      };
    }

    const sb = admin();

    // Load document record
    const { data: doc, error } = await sb
      .from('user_documents')
      .select('*')
      .eq('id', docId)
      .single();
    
    if (error || !doc) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Document not found' }) };
    }
    console.log('[smart-import-ocr] doc_row_state', {
      docId,
      caller,
      createdAt: doc?.created_at || null,
      status: doc?.status || null,
      ocrStatus: doc?.ocr_status || null,
      reused: Boolean(doc?.ocr_completed_at || doc?.extracted_data),
      importRunId: importRunId || null,
    });
    const terminalErrorCode = String(
      doc?.metadata?.ocr?.error_code ||
      doc?.metadata?.ocr_error_code ||
      doc?.metadata?.error_code ||
      ''
    ).toLowerCase();
    const terminalRejected =
      (String(doc?.status || '').toLowerCase() === 'rejected' || String(doc?.ocr_status || '').toLowerCase() === 'failed') &&
      (terminalErrorCode === 'unusable_ocr_text' || terminalErrorCode === 'malformed_pdf');
    if (terminalRejected && !isExplicitRecovery) {
      console.warn('[smart-import-ocr] Skipping orphan OCR invocation', {
        caller,
        docId,
        importRunId: importRunId || null,
        traceId,
        reason: `terminal_already_finalized:${terminalErrorCode}`,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          skipped: true,
          reason: `terminal_already_finalized:${terminalErrorCode}`,
          docId,
          traceId,
          importRunId: importRunId || null,
        }),
      };
    }
    const docUserId = doc.user_id;
    const effectiveUserId = docUserId || userId;
    if (docUserId && userId && docUserId !== userId) {
      console.warn('[OCR] user_id mismatch; using doc.user_id', { docId, docUserId, requestUserId: userId });
    }

    const existingTextLength =
      Number(doc?.ocr_text_length) ||
      Number(doc?.extracted_data?.text_length) ||
      0;
    const existingTextHash = doc?.ocr_text_hash || doc?.extracted_data?.text_hash || null;
    const hasUsableCachedEvidence =
      existingTextLength > 0 ||
      Boolean(existingTextHash) ||
      Boolean(doc?.extracted_data?.rawText);
    const alreadyProcessed = Boolean(doc.ocr_completed_at || doc.extracted_data);
    if (alreadyProcessed && hasUsableCachedEvidence) {
      const existingMetrics = existingTextLength;
      await markCachedDocReady(sb, docId, doc?.metadata);
      
      try {
        await sb.channel(`chat-progress-${effectiveUserId}`).send({
          type: 'broadcast',
          event: 'progress',
          payload: { message: "Byte: I've seen this one before! Pulling your existing records from the vault now..." }
        });
      } catch (broadcastErr) {
        console.warn(`${logPrefix} Failed to broadcast already seen message`, broadcastErr);
      }
      
      console.log(`${logPrefix} SKIP`, { docId, reason: 'already_processed' });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          skipped: true,
          cached: true,
          docId,
          importRunId,
          textLength: existingMetrics,
          traceId,
          alreadyProcessed: true,
        }),
      };
    }
    if (alreadyProcessed && !hasUsableCachedEvidence) {
      console.warn('[OCR] Reprocessing cached document with missing OCR evidence', {
        docId,
        hasOcrCompletedAt: Boolean(doc?.ocr_completed_at),
        existingTextLength,
        hasTextHash: Boolean(existingTextHash),
      });
    }

    if (doc.status === 'ocr_processing') {
      if (isStaleUpdatedAt(doc?.updated_at)) {
        console.warn('[OCR] stale lock detected, reclaiming', {
          docId,
          traceId,
          updatedAt: doc?.updated_at || null,
          staleMs: OCR_LOCK_STALE_MS,
        });
        await sb
          .from('user_documents')
          .update({
            status: 'ready',
            metadata: mergeMetadata(doc?.metadata, {
              ocr_recovered_from_stale_lock: true,
              ocr_recovered_at: new Date().toISOString(),
              ocr_recovered_reason: 'stale_ocr_processing_lock',
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', docId)
          .eq('status', 'ocr_processing');
      } else {
        console.log('[OCR] IN_PROGRESS (lock held)', { docId, traceId });
        return {
          statusCode: 202,
          body: JSON.stringify({
            inProgress: true,
            docId,
            traceId,
            importRunId,
          }),
        };
      }
    }

    // ⚡ UPLOAD COMPLETENESS CONTRACT: Verify file exists and size matches before OCR
    
    // Step 1: Verify file exists in bucket (HEAD request via list)
    const storageDir = doc.storage_path.split('/').slice(0, -1).join('/');
    const fileName = doc.storage_path.split('/').pop();
    const { data: fileList, error: listError } = await sb.storage
      .from(BUCKET)
      .list(storageDir, {
        limit: 1000,
        search: fileName,
      });
    
    if (listError || !fileList || fileList.length === 0) {
      console.warn(`${logPrefix} ERROR`, { error: 'File not found in bucket', storagePath: doc.storage_path });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          pending: true, 
          status: 'PENDING_UPLOAD',
          traceId,
          importRunId,
        }) 
      };
    }
    
    const storedFile = fileList.find(f => f.name === fileName);
    if (!storedFile) {
      console.warn(`${logPrefix} ERROR`, { error: 'File not found in bucket listing', storagePath: doc.storage_path });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          pending: true, 
          status: 'PENDING_UPLOAD',
          traceId,
          importRunId,
        }) 
      };
    }
    
    // Step 2: Verify file size matches expected (if provided)
    if (expectedSize !== undefined && storedFile.metadata?.size) {
      const storedSize = parseInt(storedFile.metadata.size, 10);
      const sizeDiff = Math.abs(storedSize - expectedSize);
      const tolerance = 1024; // 1KB tolerance for metadata differences
      
      if (sizeDiff > tolerance) {
        console.warn(`${logPrefix} ERROR`, { error: 'File size mismatch', expectedSize, storedSize });
        return { 
          statusCode: 200, 
          body: JSON.stringify({ 
            pending: true, 
            status: 'PENDING_UPLOAD',
            traceId,
            importRunId,
          }) 
        };
      }
    }

    // Step 3: Create signed URL for OCR service (only after completeness verified)
    const { data: signed, error: signedErr } = await sb.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 600); // 10 min expiry
    
    if (signedErr || !signed) {
      console.warn(`${logPrefix} ERROR`, { error: 'Failed to create signed URL', storagePath: doc.storage_path });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          pending: true, 
          status: 'PENDING_UPLOAD',
          traceId,
          importRunId,
        }) 
      };
    }

    const inferredMimeType =
      inferMimeTypeFromName(fileName) || inferMimeTypeFromName(doc.original_name);
    const effectiveMimeType = inferredMimeType || doc.mime_type || 'application/pdf';
    if (doc.mime_type && inferredMimeType && doc.mime_type !== inferredMimeType) {
      console.warn('[OCR] MIME type mismatch; using inferred type', {
        docId,
        docMimeType: doc.mime_type,
        inferredMimeType,
      });
    }
    console.log(`${logPrefix} FILE`, {
      docId,
      mimeType: effectiveMimeType,
      expectedSize,
      storedSize: storedFile.metadata?.size ? Number(storedFile.metadata.size) : undefined,
    });

    // Step 4: Resolve file hash + OCR job idempotency
    const ocrTimeoutMs = computeOcrTimeoutMs(expectedSize, effectiveMimeType);
    let downloadedStorageBuffer: Buffer | null = null;
    try {
      const { data: downloadBlob, error: downloadErr } = await sb.storage
        .from(BUCKET)
        .download(doc.storage_path);
      if (!downloadErr && downloadBlob) {
        const ab = await downloadBlob.arrayBuffer();
        downloadedStorageBuffer = Buffer.from(ab);
        if (effectiveMimeType === 'application/pdf') {
          const probe = validatePdfEnvelope(downloadedStorageBuffer);
          console.log('[upload-pdf-debug] ocr_storage_download_probe', {
            docId,
            bytes: downloadedStorageBuffer.length,
            first16Hex: probe.first16Hex,
            first8Ascii: probe.first8Ascii,
            last32Hex: probe.last32Hex,
            tailHasEof: probe.eofFound,
            headerFound: probe.headerFound,
            envelopeValid: probe.ok,
          });
        } else {
          console.log('[upload-pdf-debug] ocr_storage_download_probe', {
            docId,
            bytes: downloadedStorageBuffer.length,
            mimeType: effectiveMimeType,
          });
        }
      } else {
        console.warn('[upload-pdf-debug] ocr_storage_download_failed', {
          docId,
          error: downloadErr?.message || null,
        });
      }
    } catch (downloadEx: any) {
      console.warn('[upload-pdf-debug] ocr_storage_download_threw', {
        docId,
        error: downloadEx?.message || String(downloadEx),
      });
    }

    const binaryBuffer = await fetchBinaryBuffer(signed.signedUrl, ocrTimeoutMs);
    if (effectiveMimeType === 'application/pdf') {
      const probe = validatePdfEnvelope(binaryBuffer);
      console.log('[upload-pdf-debug] ocr_signed_url_probe', {
        docId,
        bytes: binaryBuffer.length,
        first16Hex: probe.first16Hex,
        first8Ascii: probe.first8Ascii,
        last32Hex: probe.last32Hex,
        tailHasEof: probe.eofFound,
        headerFound: probe.headerFound,
        envelopeValid: probe.ok,
      });
      if (downloadedStorageBuffer) {
        const sameLength = downloadedStorageBuffer.length === binaryBuffer.length;
        const samePrefix = downloadedStorageBuffer.subarray(0, Math.min(32, downloadedStorageBuffer.length))
          .equals(binaryBuffer.subarray(0, Math.min(32, binaryBuffer.length)));
        const sameSuffix = downloadedStorageBuffer
          .subarray(Math.max(0, downloadedStorageBuffer.length - 32))
          .equals(binaryBuffer.subarray(Math.max(0, binaryBuffer.length - 32)));
        console.log('[upload-pdf-debug] ocr_download_vs_signed_comparison', {
          docId,
          sameLength,
          samePrefix,
          sameSuffix,
        });
      }
      if (!probe.ok) {
        console.warn('[upload-pdf-debug] pre_ocr_pdf_validation_failed', {
          docId,
          headerFound: probe.headerFound,
          eofFound: probe.eofFound,
          tailAscii: probe.tailAscii.slice(-128),
        });
      }
    }
    const fileHash = computeFileHash(binaryBuffer);
    await sb
      .from('user_documents')
      .update({ content_hash: fileHash, updated_at: new Date().toISOString() })
      .eq('id', docId)
      .is('content_hash', null);

    const jobInsertPayload = {
      user_id: effectiveUserId,
      document_id: docId,
      file_hash: fileHash,
      status: 'running',
      updated_at: new Date().toISOString(),
    };
    let existingJob: OcrJobRow | null = null;
    const { data: insertedJob, error: insertJobError } = await sb
      .from('ocr_jobs')
      .insert(jobInsertPayload)
      .select('*')
      .maybeSingle();
    const jobWasInserted = !insertJobError && !!insertedJob;
    if (insertJobError) {
      const { data: foundJob } = await sb
        .from('ocr_jobs')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('file_hash', fileHash)
        .maybeSingle();
      existingJob = foundJob as OcrJobRow | null;
    } else {
      existingJob = insertedJob as OcrJobRow | null;
    }

    if (existingJob?.status === 'done' && existingJob.normalized_json) {
      await applyCachedOcrToDocument(sb, docId, existingJob.normalized_json);
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          cached: true,
          docId,
          importRunId,
          traceId,
          result: existingJob.normalized_json,
        }),
      };
    }
    if (existingJob?.status === 'running' && !jobWasInserted) {
      if (isStaleUpdatedAt(existingJob?.updated_at)) {
        console.warn('[OCR] stale running ocr_job detected, resuming', {
          docId,
          ocrJobId: existingJob?.id || null,
          updatedAt: existingJob?.updated_at || null,
          staleMs: OCR_LOCK_STALE_MS,
        });
      } else {
        return {
          statusCode: 202,
          body: JSON.stringify({
            inProgress: true,
            docId,
            traceId,
            importRunId,
          }),
        };
      }
    }
    if (existingJob?.id) {
      ocrJobId = existingJob.id;
    }

    // Step 5: Acquire in-flight OCR lock (atomic)
    const lockPayload = {
      status: 'ocr_processing',
      ocr_status: 'processing',
      updated_at: new Date().toISOString(),
    };
    let lockStatus: string | null = doc.status ?? null;
    let lockResult: any[] | null = null;
    let lockError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      let lockQuery = sb
        .from('user_documents')
        .update(lockPayload)
        .eq('id', docId);

      if (lockStatus) {
        lockQuery = lockQuery.eq('status', lockStatus);
      } else {
        lockQuery = lockQuery.is('status', null);
      }

      const { data, error: attemptError } = await lockQuery.select('id');
      if (attemptError) {
        lockError = attemptError;
        break;
      }
      lockResult = data || [];
      if (lockResult.length > 0) {
        break;
      }

      const { data: latestDoc, error: latestError } = await sb
        .from('user_documents')
        .select('status')
        .eq('id', docId)
        .single();
      if (latestError) {
        console.warn('[OCR] Failed to re-check lock status', { docId, error: latestError.message || latestError });
        break;
      }
      lockStatus = latestDoc?.status ?? null;
      if (lockStatus === 'ocr_processing') {
        break;
      }
    }

    if (lockError) {
      console.error(`${logPrefix} ERROR`, { error: 'Failed to acquire OCR lock', details: lockError.message });
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to acquire OCR lock', traceId, importRunId }) };
    }
    if (!lockResult || lockResult.length === 0) {
      console.log('[OCR] IN_PROGRESS (lock held)', { docId, traceId, status: lockStatus });
      return {
        statusCode: 202,
        body: JSON.stringify({
          inProgress: true,
          docId,
          traceId,
          importRunId,
        }),
      };
    }
    lockAcquired = true;
    lockedDocId = docId;
    await setDocumentOcrStatus(sb, docId, 'processing');
    stopHeartbeat = startOcrHeartbeat({
      sb,
      docId,
      ocrJobId,
      traceId,
    });

    // Run OCR
    let ocrText: string;
    let ocrProvider: OCRProvider | null = null;
    let ocrDurationMs: number | null = null;
    let ocrPages: number | undefined;
    let ocrPageLimitReached = false;
    let fallbackUsed = false;
    let fallbackSkippedByBudget = false;
    let scannedFallbackAttempted = false;
    let parserIncompatibilityLikely = false;
    let handoffSource = 'primary_ocr';
    let rescuedTextForHandoff = '';
    let scannedMetrics: OcrRunMetrics | null = null;
    let scannedPdfMerged: OcrResult | null = null;
    const docMode: 'statement' | 'receipt' =
      effectiveMimeType === 'application/pdf' || /statement|bank|account|invoice/i.test(doc.original_name || '')
        ? 'statement'
        : 'receipt';
    const monthlyFallbackUsageCount = await getMonthlyFallbackUsageCount(sb, effectiveUserId);
    const allowPaidFallback = monthlyFallbackUsageCount < OCR_FALLBACK_MONTHLY_CAP_FREE;
    if (!allowPaidFallback) {
      console.warn('[OCR] Monthly fallback cap reached; skipping paid fallback engines', {
        docId,
        effectiveUserId,
        monthlyFallbackUsageCount,
        cap: OCR_FALLBACK_MONTHLY_CAP_FREE,
      });
    }
    try {
      const ocrRunController = new AbortController();
      const ocrResult = await withTimeout(
        runOCR(signed.signedUrl, effectiveMimeType, expectedSize, docId, docMode, ocrRunController.signal),
        OCR_STAGE_TIMEOUT_MS,
        'ocr_stage',
        () => ocrRunController.abort()
      );
      ocrText = ocrResult.text;
      ocrProvider = ocrResult.provider;
      ocrDurationMs = ocrResult.durationMs;
      ocrPages = ocrResult.pages;
      ocrPageLimitReached = !!ocrResult.pageLimitReached;
      handoffSource = String(ocrProvider || 'primary_ocr');
    } catch (ocrError: any) {
      console.error(`${logPrefix} ERROR`, { error: ocrError?.message || ocrError });
      const ocrErrorMessage = getErrorMessage(ocrError);
      const strictPdfStructureFailure = isStrictPdfStructureError(ocrError);
      const malformedPdfLikely =
        effectiveMimeType === 'application/pdf' &&
        (isKnownMalformedPdfError(ocrError) || isNoTextProviderError(ocrError));
      parserIncompatibilityLikely = parserIncompatibilityLikely || malformedPdfLikely;
      if (strictPdfStructureFailure) {
        console.warn('[OCR] Structural error detected -> forcing image-based extraction', {
          docId,
          dpi: SCANNED_PDF_RENDER_DPI,
          error: trimErrorMessage(ocrErrorMessage),
        });
      }
      if (effectiveMimeType === 'application/pdf') {
        try {
          scannedFallbackAttempted = true;
          const scannedFallback = await withTimeout(
            runScannedPdfFallback({
              pdfBuffer: binaryBuffer,
              originalName: doc.original_name || '',
              docMode,
              allowPaidFallback,
              sb,
              ocrJobId,
              userId: effectiveUserId,
            }),
            SCANNED_FALLBACK_TIMEOUT_MS,
            'scanned_fallback'
          );
          scannedPdfMerged = scannedFallback.merged;
          scannedMetrics = scannedFallback.metrics;
          fallbackSkippedByBudget = scannedFallback.fallbackSkippedByBudget;
          ocrText = scannedPdfMerged.rawText;
          ocrProvider = scannedPdfMerged.engineUsed.includes('openai_vision')
            ? 'openai_vision'
            : scannedPdfMerged.engineUsed.includes('vision')
              ? 'vision'
              : 'ocrspace';
          ocrPages = scannedPdfMerged.pages;
          fallbackUsed = true;
          handoffSource = 'scanned_pdf_fallback';
          const recoveredTextLength = String(ocrText || '').trim().length;
          if (recoveredTextLength < OCR_EMPTY_MIN_LEN) {
            throw new Error('scanned_fallback_empty');
          }
          if (strictPdfStructureFailure) {
            console.log('[OCR] Structural error detected -> Forced Image-Based Extraction successful', {
              docId,
              recoveredTextLength,
              provider: ocrProvider,
            });
          }
          console.log('[OCR] recovered via scanned fallback after primary OCR failure', {
            docId,
            recoveredTextLength,
            provider: ocrProvider,
          });
        } catch (scannedRecoveryError: any) {
          const scannedRecoveryMessage = getErrorMessage(scannedRecoveryError);
          const classified = classifyOcrErrorCode(ocrError);
          const terminalMalformedPdf =
            malformedPdfLikely ||
            isKnownMalformedPdfError(scannedRecoveryError) ||
            isNoTextProviderError(scannedRecoveryError);
          const strictPdfStructureFailure =
            isStrictPdfStructureError(ocrError) ||
            isStrictPdfStructureError(scannedRecoveryError);
          parserIncompatibilityLikely = parserIncompatibilityLikely || terminalMalformedPdf;

          // Google Vision raw-PDF fallback is disabled by default because many
          // parser-incompatible PDFs fail on raw document OCR in provider-side
          // parsing too. We prefer page-image OCR fallbacks for these files.
          let recoveredViaGoogleVisionPdf = false;
          const allowGoogleVisionPdfDirect =
            process.env.OCR_ENABLE_DIRECT_PDF_VISION === '1' && !strictPdfStructureFailure;
          if (allowGoogleVisionPdfDirect) {
            try {
              const gvResult = await withTimeout(
                callGoogleVisionOnPdf({
                  pdfBuffer: binaryBuffer,
                  apiKey: process.env.GOOGLE_VISION_API_KEY,
                  timeoutMs: SCANNED_FALLBACK_TIMEOUT_MS,
                }),
                SCANNED_FALLBACK_TIMEOUT_MS + 2000,
                'google_vision_pdf_fallback'
              );
              const gvText = String(gvResult?.fullText || '').trim();
              if (gvText.length >= OCR_EMPTY_MIN_LEN && !isUselessOcrResponseText(gvText)) {
                ocrText = gvText;
                ocrProvider = 'vision';
                ocrPages = undefined;
                fallbackUsed = true;
                handoffSource = 'google_vision_pdf_direct';
                recoveredViaGoogleVisionPdf = true;
                scannedPdfMerged = buildNormalizedResult({
                  text: gvText,
                  provider: 'vision',
                  originalName: doc.original_name || '',
                  fallbackUsed: true,
                });
                console.log('[OCR] google_vision_pdf_direct_success', {
                  docId,
                  textLength: gvText.length,
                });
              }
            } catch (googlePdfError: any) {
              console.warn('[OCR] google_vision_pdf_direct_failed', {
                docId,
                error: trimErrorMessage(getErrorMessage(googlePdfError)),
              });
            }
          } else if (strictPdfStructureFailure) {
            console.warn('[OCR] google_vision_pdf_direct_skipped_strict_structure_error', {
              docId,
              error: trimErrorMessage(
                getErrorMessage(scannedRecoveryError || ocrError || 'strict_pdf_structure_error')
              ),
            });
          }

          // Claude Vision raw-PDF fallback: send the raw PDF bytes directly to
          // Claude's API using the document content type. Claude acts as backup
          // if Google Vision direct PDF did not recover usable text.
          let recoveredViaClaudeVisionPdf = false;
          if (!recoveredViaGoogleVisionPdf && !strictPdfStructureFailure && process.env.ANTHROPIC_API_KEY) {
            try {
              const configuredModels = [
                String(process.env.ANTHROPIC_VISION_MODEL || '').trim(),
                String(process.env.ANTHROPIC_MODEL || '').trim(),
              ].filter(Boolean);
              const anthropicVisionModels = Array.from(new Set([
                ...configuredModels,
                'claude-sonnet-4-20250514',
                'claude-haiku-4-5-20251001',
              ]));
              let selectedAnthropicVisionModel = anthropicVisionModels[0] || 'claude-sonnet-4-20250514';
              const claudeResult = await withTimeout(
                (async () => {
                  const base64Pdf = binaryBuffer.toString('base64');
                  let lastModelError = '';
                  for (const modelName of anthropicVisionModels) {
                    selectedAnthropicVisionModel = modelName;
                    const res = await fetch('https://api.anthropic.com/v1/messages', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': process.env.ANTHROPIC_API_KEY!,
                        'anthropic-version': '2023-06-01',
                        'anthropic-beta': 'pdfs-2024-09-25',
                      },
                      body: JSON.stringify({
                        model: modelName,
                        max_tokens: 4096,
                        messages: [{
                          role: 'user',
                          content: [
                            {
                              type: 'document',
                              source: {
                                type: 'base64',
                                media_type: 'application/pdf',
                                data: base64Pdf,
                              },
                            },
                            {
                              type: 'text',
                              text: 'OCR task: return only the text content visible in this PDF. Preserve line breaks and table structure. Do not explain, summarize, or add commentary. If no readable text exists, return an empty string.',
                            },
                          ],
                        }],
                      }),
                    });
                    if (!res.ok) {
                      const errText = await res.text();
                      lastModelError = `Claude PDF OCR error ${res.status}: ${errText.slice(0, 200)}`;
                      const lowerErr = errText.toLowerCase();
                      const isMissingModel =
                        res.status === 404 &&
                        (lowerErr.includes('not_found_error') || lowerErr.includes('model:'));
                      if (isMissingModel) continue;
                      throw new Error(lastModelError);
                    }
                    const data = await res.json() as any;
                    return String(data?.content?.[0]?.text || '')
                      .replace(/^```[\w]*\n?/m, '')
                      .replace(/```$/m, '')
                      .trim();
                  }
                  throw new Error(lastModelError || 'Claude PDF OCR failed: no supported Anthropic model available');
                })(),
                SCANNED_FALLBACK_TIMEOUT_MS + 5000,
                'claude_vision_pdf_fallback'
              );
              if (claudeResult.length >= OCR_EMPTY_MIN_LEN && !isUselessOcrResponseText(claudeResult)) {
                ocrText = claudeResult;
                ocrProvider = 'openai_vision'; // closest existing provider type
                ocrPages = undefined;
                fallbackUsed = true;
                handoffSource = 'claude_vision_pdf_direct';
                recoveredViaClaudeVisionPdf = true;
                scannedPdfMerged = buildNormalizedResult({
                  text: claudeResult,
                  provider: 'openai_vision',
                  originalName: doc.original_name || '',
                  fallbackUsed: true,
                });
                console.log('[OCR] claude_vision_pdf_direct_success', {
                  docId,
                  model: selectedAnthropicVisionModel,
                  textLength: claudeResult.length,
                });
              } else {
                console.warn('[OCR] claude_vision_pdf_direct_empty', {
                  docId,
                  model: selectedAnthropicVisionModel,
                  textLength: claudeResult.length,
                });
              }
            } catch (claudePdfError: any) {
              console.warn('[OCR] claude_vision_pdf_direct_failed', {
                docId,
                error: trimErrorMessage(getErrorMessage(claudePdfError)),
              });
            }
          } else if (strictPdfStructureFailure) {
            console.warn('[OCR] claude_vision_pdf_direct_skipped_strict_structure_error', {
              docId,
              error: trimErrorMessage(
                getErrorMessage(scannedRecoveryError || ocrError || 'strict_pdf_structure_error')
              ),
            });
          }

          // Last scanned-provider pass before terminal rejection: run one-page
          // fallback with explicit provider order (vision -> openai_vision).
          let recoveredViaEmergencyProvider = false;
          if (!recoveredViaGoogleVisionPdf && !recoveredViaClaudeVisionPdf) {
          try {
            const emergencyPass = await withTimeout(
              runEmergencyScannedProviderPass({
                pdfBuffer: binaryBuffer,
                originalName: doc.original_name || '',
                docMode,
              }),
              SCANNED_FALLBACK_TIMEOUT_MS,
              'emergency_scanned_pass'
            );
            const emergencyText = String(emergencyPass?.rawText || '').trim();
            if (emergencyPass && emergencyText.length >= OCR_EMPTY_MIN_LEN && !isUselessOcrResponseText(emergencyText)) {
              ocrText = emergencyText;
              scannedPdfMerged = emergencyPass;
              ocrProvider = emergencyPass.engineUsed.includes('vision')
                ? 'vision'
                : emergencyPass.engineUsed.includes('openai_vision')
                  ? 'openai_vision'
                  : 'ocrspace';
              ocrPages = emergencyPass.pages;
              fallbackUsed = true;
              handoffSource = 'emergency_scanned_provider_pass';
              recoveredViaEmergencyProvider = true;
              console.warn('[OCR] emergency_scanned_provider_pass_success', {
                docId,
                textLength: emergencyText.length,
                provider: ocrProvider,
              });
            }
          } catch (emergencyError: any) {
            console.warn('[OCR] emergency_scanned_provider_pass_failed', {
              docId,
              error: trimErrorMessage(getErrorMessage(emergencyError)),
            });
          }
          if (!recoveredViaEmergencyProvider) {
          if (strictPdfStructureFailure) {
          try {
            const imageOnly = await withTimeout(
              performImageOnlyOcr({
                pdfBuffer: binaryBuffer,
                originalName: doc.original_name || '',
              }),
              Math.max(60000, SCANNED_FALLBACK_TIMEOUT_MS + 45000),
              'strict_structure_image_only_ocr'
            );
            const imageOnlyText = String(imageOnly?.rawText || '').trim();
            if (imageOnly && imageOnlyText.length >= OCR_EMPTY_MIN_LEN && !isUselessOcrResponseText(imageOnlyText)) {
              scannedPdfMerged = imageOnly;
              ocrText = imageOnlyText;
              ocrProvider = 'vision';
              ocrPages = imageOnly.pages;
              fallbackUsed = true;
              handoffSource = 'strict_structure_image_only_ocr';
              recoveredViaEmergencyProvider = true;
            }
          } catch (imageOnlyError: any) {
            console.warn('[OCR] strict_structure_image_only_ocr_failed', {
              docId,
              error: trimErrorMessage(getErrorMessage(imageOnlyError)),
            });
          }
          if (!recoveredViaEmergencyProvider) {
          const errorCode = terminalMalformedPdf ? 'malformed_pdf' : classified.errorCode;
          const userMessage = terminalMalformedPdf
            ? 'Unreadable PDF structure. We could not safely read this PDF. Please open it, print/save as a new PDF, and upload the new copy.'
            : `OCR failed: ${ocrErrorMessage}`;
          console.warn('[OCR] strict_pdf_structure_error_terminalized', {
            docId,
            ocrError: trimErrorMessage(ocrErrorMessage),
            fallbackError: trimErrorMessage(scannedRecoveryMessage),
          });
          await finalizeTerminalOcrFailure(sb, {
            ocrJobId,
            docId,
            error: scannedRecoveryMessage || ocrErrorMessage || 'ocr_failed',
            finalStatus: classified.status,
            errorCode,
            rejectionReason: userMessage,
          });
          return {
            statusCode: 200,
            body: JSON.stringify({
              ok: false,
              rejected: true,
              reason: terminalMalformedPdf ? 'parser_incompatible_pdf' : 'ocr_failed',
              status: classified.status,
              error_code: errorCode,
              terminal: true,
              traceId,
              importRunId,
              primeMessage: userMessage,
            }),
          };
          }
          }

          // Secondary parser fallback before terminal rejection.
          const rawStreamText = extractPdfTextFromRawStreams(binaryBuffer);
          const rawStreamLen = rawStreamText.trim().length;
          const rescueReadability = assessRescueTextReadability(rawStreamText);
          const rawStreamReadable = rescueReadability.accepted;
          const rawStreamAccepted = rawStreamLen >= PDF_MIN_TEXT_LEN && rawStreamReadable;
          const readableIslands = extractReadableIslands(rawStreamText);
          const readableIslandsLen = readableIslands.trim().length;
          const compatRescueAccepted =
            !rawStreamAccepted &&
            readableIslandsLen >= 320 &&
            hasTransactionLikeSignal(readableIslands);
          console.log('[OCR RESCUE DEBUG] raw_rescue_preview', rawStreamText.slice(0, 300));
          console.log('[OCR RESCUE DEBUG] readability_score', rescueReadability.score);
          console.log('[OCR RESCUE DEBUG] accepted_rescue_text', rawStreamAccepted);
          if (compatRescueAccepted) {
            console.warn('[OCR] parser_incompatibility_compat_rescue_success', {
              docId,
              textLength: readableIslandsLen,
              sourceLength: rawStreamLen,
            });
            ocrText = readableIslands;
            rescuedTextForHandoff = readableIslands;
            ocrProvider = 'embedded_pdf_parse';
            ocrPages = undefined;
            fallbackUsed = true;
            handoffSource = 'raw_stream_compat_rescue';
            scannedPdfMerged = buildNormalizedResult({
              text: readableIslands,
              provider: 'embedded_pdf_parse',
              originalName: doc.original_name || '',
              fallbackUsed: true,
            });
            scannedPdfMerged.needsUserConfirmation = true;
            scannedPdfMerged.debug = {
              ...(scannedPdfMerged.debug || {}),
              parserIncompatiblePdf: true,
              parserFallback: 'raw_stream_compat_rescue',
              sourceReadabilityScore: rescueReadability.score,
            };
          }
          if (!rawStreamAccepted && !compatRescueAccepted && rawStreamLen > 0) {
            console.warn('[OCR RESCUE WARNING] rejected_gibberish_rescue', {
              docId,
              textLength: rawStreamLen,
              readabilityScore: rescueReadability.score,
              reason: rescueReadability.reason,
            });
          }
          if (rawStreamLen > 0) {
            console.warn('[OCR] parser_incompatibility_visible_text_probe', {
              docId,
              textLength: rawStreamLen,
              accepted: rawStreamAccepted,
            });
          }
          if (rawStreamAccepted) {
            console.warn('[OCR] parser_incompatibility_raw_stream_fallback_success', {
              docId,
              textLength: rawStreamLen,
            });
            ocrText = rawStreamText;
            rescuedTextForHandoff = rawStreamText;
            ocrProvider = 'embedded_pdf_parse';
            ocrPages = undefined;
            fallbackUsed = true;
            handoffSource = 'raw_stream_fallback';
            scannedPdfMerged = buildNormalizedResult({
              text: rawStreamText,
              provider: 'embedded_pdf_parse',
              originalName: doc.original_name || '',
              fallbackUsed: true,
            });
            scannedPdfMerged.needsUserConfirmation = true;
            scannedPdfMerged.debug = {
              ...(scannedPdfMerged.debug || {}),
              parserIncompatiblePdf: true,
              parserFallback: 'raw_stream_text_scan',
            };
            // Skip terminal rejection path and continue with normal guardrails/write flow.
            // eslint-disable-next-line no-useless-catch
          } else if (!compatRescueAccepted) {
          const errorCode = terminalMalformedPdf ? 'malformed_pdf' : classified.errorCode;
          const userMessage = terminalMalformedPdf
            ? 'Unreadable PDF structure. We could not safely read this PDF. Please open it, print/save as a new PDF, and upload the new copy.'
            : `OCR failed: ${ocrErrorMessage}`;
          if (terminalMalformedPdf) {
            console.warn('[OCR] terminal_malformed_pdf_failure', {
              docId,
              ocrError: trimErrorMessage(ocrErrorMessage),
              fallbackError: trimErrorMessage(scannedRecoveryMessage),
            });
          }
          await finalizeTerminalOcrFailure(sb, {
            ocrJobId,
            docId,
            error: scannedRecoveryMessage || ocrErrorMessage || 'ocr_failed',
            finalStatus: classified.status,
            errorCode,
            rejectionReason: userMessage,
          });
          return {
            statusCode: 200,
            body: JSON.stringify({
              ok: false,
              rejected: true,
              reason: terminalMalformedPdf ? 'parser_incompatible_pdf' : 'ocr_failed',
              status: classified.status,
              error_code: errorCode,
              terminal: true,
              traceId,
              importRunId,
              primeMessage: userMessage,
            }),
          };
          }
          }
          } // end if (!recoveredViaClaudeVisionPdf)
        }
      } else {
      const classified = classifyOcrErrorCode(ocrError);
      await finalizeTerminalOcrFailure(sb, {
        ocrJobId,
        docId,
        error: ocrError?.message || 'ocr_failed',
        finalStatus: classified.status,
        errorCode: classified.errorCode,
        rejectionReason: `OCR failed: ${ocrError.message}`,
      });
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          ok: false,
          rejected: true,
          reason: 'ocr_failed',
          status: classified.status,
          error_code: classified.errorCode,
          traceId,
          importRunId,
        }) 
      };
      }
    }

    if (!scannedFallbackAttempted && shouldUseScannedPdfFallback({
      mimeType: effectiveMimeType,
      provider: ocrProvider,
      text: ocrText,
      pageLimitReached: ocrPageLimitReached,
    })) {
      try {
        const scannedFallback = await withTimeout(
          runScannedPdfFallback({
            pdfBuffer: binaryBuffer,
            originalName: doc.original_name || '',
            docMode,
            allowPaidFallback,
            sb,
            ocrJobId,
            userId: effectiveUserId,
          }),
          SCANNED_FALLBACK_TIMEOUT_MS,
          'scanned_fallback'
        );
        scannedPdfMerged = scannedFallback.merged;
        scannedMetrics = scannedFallback.metrics;
        fallbackSkippedByBudget = scannedFallback.fallbackSkippedByBudget;
        ocrText = scannedPdfMerged.rawText;
        ocrProvider = scannedPdfMerged.engineUsed.includes('openai_vision')
          ? 'openai_vision'
          : scannedPdfMerged.engineUsed.includes('vision')
            ? 'vision'
            : 'ocrspace';
        ocrPages = scannedPdfMerged.pages;
        fallbackUsed = Boolean(scannedPdfMerged.fallbackUsed);
        handoffSource = 'scanned_pdf_fallback';
      } catch (scannedError: any) {
        console.warn('[OCR] scanned PDF fallback failed; using best available text', {
          docId,
          error: scannedError?.message || String(scannedError),
        });
        const scannedErrorMessage = String(scannedError?.message || scannedError || '');
        const missingPdfWorkerInDev =
          process.env.NETLIFY_DEV === 'true' &&
          scannedErrorMessage.toLowerCase().includes('pdf.worker.mjs');
        const bestLen = String(ocrText || '').trim().length;
        if (missingPdfWorkerInDev && bestLen < OCR_EMPTY_MIN_LEN) {
          await finalizeOcrJobOutcome(sb, {
            ocrJobId,
            docId,
            status: 'failed',
            errorCode: 'pdf_worker_missing',
            errorMessage: scannedErrorMessage || 'pdf_worker_missing',
          });
          await setDocumentOcrStatus(sb, docId, 'failed');
          await markDocStatus(docId, 'rejected', 'OCR failed: pdf_worker_missing');
          return {
            statusCode: 200,
            body: JSON.stringify({
              ok: false,
              rejected: true,
              reason: 'ocr_failed',
              retryable: true,
              status: 'failed',
              error_code: 'pdf_worker_missing',
              traceId,
              importRunId,
            }),
          };
        }
        if (ocrProvider) {
          const bestEffort = buildNormalizedResult({
            text: ocrText,
            provider: ocrProvider,
            pages: ocrPages,
            originalName: doc.original_name || '',
            fallbackUsed: fallbackUsed || ocrPageLimitReached,
          });
          bestEffort.needsUserConfirmation = true;
          bestEffort.debug = {
            scannedPdfFallbackError: scannedError?.message || String(scannedError),
          };
          scannedPdfMerged = bestEffort;
        }
      }
    }

    let normalizedPreGuard = scannedPdfMerged || buildNormalizedResult({
      text: ocrText,
      provider: (ocrProvider || 'ocrspace') as OCRProvider,
      pages: ocrPages,
      originalName: doc.original_name || '',
      fallbackUsed: fallbackUsed || Boolean(scannedPdfMerged),
    });
    if (!scannedPdfMerged && normalizedPreGuard.confidence.overall < OCR_CONFIDENCE_THRESHOLD && ocrProvider) {
      const fallbackResult = await runLowConfidenceFallbackOCR({
        signedUrl: signed.signedUrl,
        mimeType: effectiveMimeType,
        expectedSize,
        primaryProvider: ocrProvider,
        docMode,
        allowPaidFallback,
      });
      if (fallbackResult?.text?.trim()) {
        const fallbackNormalized = buildNormalizedResult({
          text: fallbackResult.text,
          provider: fallbackResult.provider,
          pages: fallbackResult.pages,
          originalName: doc.original_name || '',
          fallbackUsed: true,
        });
        if (fallbackNormalized.confidence.overall > normalizedPreGuard.confidence.overall) {
          ocrText = fallbackResult.text;
          ocrProvider = fallbackResult.provider;
          ocrDurationMs = (ocrDurationMs || 0) + fallbackResult.durationMs;
          ocrPages = fallbackResult.pages || ocrPages;
          fallbackUsed = true;
          normalizedPreGuard = fallbackNormalized;
        }
      } else if (!allowPaidFallback) {
        fallbackSkippedByBudget = true;
      }
    }

    const finalOcrLen = String(ocrText || '').trim().length;
    if (finalOcrLen < OCR_EMPTY_MIN_LEN) {
      const providerLabel = String(ocrProvider || '').toLowerCase();
      const emptyErrorCode = parserIncompatibilityLikely
        ? 'malformed_pdf'
        : (
          providerLabel === 'ocrspace'
            ? 'ocr_empty'
            : providerLabel.startsWith('embedded')
              ? 'embedded_empty'
              : 'ocr_empty_unknown'
        );
      await finalizeOcrJobOutcome(sb, {
        ocrJobId,
        docId,
        status: 'failed',
        errorCode: emptyErrorCode,
        errorMessage: `OCR text too short (${finalOcrLen})`,
      });
      await setDocumentOcrStatus(sb, docId, 'failed');
      await markDocStatus(docId, 'rejected', `OCR failed: ${emptyErrorCode}`);
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          rejected: true,
          reason: 'ocr_failed',
          retryable: true,
          status: 'failed',
          error_code: emptyErrorCode,
          traceId,
          importRunId,
        }),
      };
    }

    // Early hard-stop: reject boilerplate/non-document OCR text before any success
    // logging, proof writes, or normalize handoff.
    if (isUselessOcrResponseText(ocrText)) {
      const unusableMessage = 'Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.';
      console.warn('[OCR] unusable_ocr_text_detected', {
        docId,
        provider: ocrProvider || null,
        preview: String(ocrText || '').slice(0, 220),
        phase: 'pre_extracted_gate',
      });
      await finalizeTerminalOcrFailure(sb, {
        ocrJobId,
        docId,
        error: 'unusable_ocr_text',
        finalStatus: 'failed',
        errorCode: 'unusable_ocr_text',
        rejectionReason: unusableMessage,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          rejected: true,
          terminal: true,
          reason: 'failed_or_unusable',
          status: 'failed',
          error_code: 'unusable_ocr_text',
          short_reason: 'Scanned PDF text could not be recognized',
          primeMessage: unusableMessage,
          traceId,
          importRunId,
        }),
      };
    }

    console.log(`${logPrefix} EXTRACTED`, { docId, textLength: ocrText.length, provider: ocrProvider, durationMs: ocrDurationMs });

    // ⚡ GUARDRAILS: Apply STRICT rules to OCR output
    // ✅ Phase 2.2: Use unified guardrails API (includes config loading)
    const guardrailResult = await runGuardrailsForText(
      ocrText, 
      effectiveUserId, 
      'ingestion_ocr'  // OCR stage
    );

    // Fallback: guardrails can sometimes return empty text after masking
    if (!guardrailResult.text || guardrailResult.text.trim().length === 0) {
      const fallback = maskPiiFallback(ocrText, 'last4');
      if (fallback.masked && fallback.masked.trim().length > 0) {
        guardrailResult.text = fallback.masked;
        guardrailResult.signals = {
          ...(guardrailResult.signals || {}),
          pii: true,
          piiTypes: Array.from(new Set([...(guardrailResult.signals?.piiTypes || []), ...fallback.found.map(f => f.type)])),
        };
        console.warn(`${logPrefix} Guardrails returned empty text; applied fallback redaction`, {
          docId,
          fallbackTypes: fallback.found.map(f => f.type),
        });
      }
    }
    
    const guardrailReasons = Array.isArray(guardrailResult.reasons) ? guardrailResult.reasons : [];
    const isPiiOnlyBlock =
      !guardrailResult.ok &&
      guardrailReasons.length > 0 &&
      guardrailReasons.every(reason => reason.includes('pii_blocked'));
    const importModeAllowPiiRedaction = true;

    console.log('[OCR] Guardrails policy: import_mode_allow_pii_with_redaction=true');

    if (!guardrailResult.ok && isPiiOnlyBlock && importModeAllowPiiRedaction) {
      console.warn('[OCR] Guardrails PII detected; redacted and continuing', {
        docId,
        reasons: guardrailReasons,
      });
    } else if (!guardrailResult.ok) {
      console.warn(`${logPrefix} ERROR`, { error: 'Content blocked by guardrails', docId, reasons: guardrailResult.reasons });
      await finalizeOcrJobOutcome(sb, {
        ocrJobId,
        docId,
        status: 'failed',
        errorCode: 'guardrails_blocked',
        errorMessage: `Blocked: ${(guardrailResult.reasons || []).join(', ')}`,
      });
      await setDocumentOcrStatus(sb, docId, 'failed');
      await markDocStatus(docId, 'rejected', `Blocked: ${guardrailResult.reasons.join(', ')}`);
      
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          ok: false,
          rejected: true, 
          status: 'failed',
          error_code: 'guardrails_blocked',
          reasons: guardrailResult.reasons,
          traceId,
          importRunId,
        }) 
      };
    }

    let sanitizedText = sanitizeOcrText(guardrailResult.text);
    if (isLikelyCorruptedText(sanitizedText) && rescuedTextForHandoff && isLikelyReadableText(rescuedTextForHandoff)) {
      sanitizedText = sanitizeOcrText(rescuedTextForHandoff);
      handoffSource = `${handoffSource}:rescued_text_override`;
    }
    if (isUselessOcrResponseText(sanitizedText)) {
      const unusableMessage = 'Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.';
      console.warn('[OCR] unusable_ocr_text_detected', {
        docId,
        provider: ocrProvider || null,
        preview: sanitizedText.slice(0, 220),
      });
      await finalizeTerminalOcrFailure(sb, {
        ocrJobId,
        docId,
        error: 'unusable_ocr_text',
        finalStatus: 'failed',
        errorCode: 'unusable_ocr_text',
        rejectionReason: unusableMessage,
      });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: false,
          rejected: true,
          terminal: true,
          reason: 'failed_or_unusable',
          status: 'failed',
          error_code: 'unusable_ocr_text',
          short_reason: 'Scanned PDF text could not be recognized',
          primeMessage: unusableMessage,
          traceId,
          importRunId,
        }),
      };
    }
    const redactedTextLength = sanitizedText.length;
    const redactedTextHash = redactedTextLength > 0
      ? createHash('sha256').update(sanitizedText).digest('hex')
      : null;
    const textMetrics = safeTextMetrics(sanitizedText);
    const normalized = scannedPdfMerged
      ? {
          ...scannedPdfMerged,
          rawText: sanitizedText,
          needsUserConfirmation:
            Boolean(scannedPdfMerged.needsUserConfirmation) ||
            scannedPdfMerged.confidence.overall < OCR_CONFIDENCE_THRESHOLD,
        }
      : buildNormalizedResult({
          text: sanitizedText,
          provider: (ocrProvider || 'ocrspace') as OCRProvider,
          pages: ocrPages,
          originalName: doc.original_name || '',
          fallbackUsed,
        });
    if (fallbackSkippedByBudget) {
      normalized.needsUserConfirmation = true;
    }
    if (process.env.OCR_DEBUG === '1' || process.env.OCR_DEBUG === 'true') {
      normalized.debug = {
        ...(normalized.debug || {}),
        metrics: scannedMetrics || {
          pagesTotal: normalized.pages,
          pagesProcessed: normalized.pages,
          primaryEngineCalls: normalized.pages,
          fallbackEngineCalls: {
            openai: normalized.engineUsed.includes('openai_vision') ? 1 : 0,
            google: normalized.engineUsed.includes('vision') ? 1 : 0,
            total: normalized.fallbackUsed ? 1 : 0,
          },
          fallbackAttempted: {
            pages: normalized.fallbackUsed ? 1 : 0,
            openai: normalized.engineUsed.includes('openai_vision') ? 1 : 0,
            google: normalized.engineUsed.includes('vision') ? 1 : 0,
            total: normalized.fallbackUsed ? 1 : 0,
          },
          fallbackAdopted: {
            pages: normalized.fallbackUsed ? 1 : 0,
            openai: normalized.engineUsed.includes('openai_vision') ? 1 : 0,
            google: normalized.engineUsed.includes('vision') ? 1 : 0,
            total: normalized.fallbackUsed ? 1 : 0,
          },
          earlyStopTriggered: {
            triggered: false,
            reason: null,
          },
          worstPagesRetried: [],
          totalTimeMs: ocrDurationMs || 0,
          fallbackSkippedByBudget,
        },
        budget: {
          monthlyFallbackUsageCount,
          monthlyFallbackCap: OCR_FALLBACK_MONTHLY_CAP_FREE,
          capExceeded: !allowPaidFallback,
        },
      };
    }
    if (sanitizedText.length !== guardrailResult.text.length) {
      console.warn('[OCR] Sanitized OCR text (removed invalid unicode)', {
        docId,
        originalLength: guardrailResult.text.length,
        sanitizedLength: sanitizedText.length,
      });
    }

    // Store REDACTED OCR output as JSON (never store raw)
    const ocrKey = `${doc.storage_path}.ocr.json`;
    const normalizedForStorage: any = {
      ...normalized,
      rawText: undefined,
      text_hash: textMetrics.hash || null,
      text_length: textMetrics.length ?? 0,
    };
    const ocrData = {
      normalized: normalizedForStorage,
      text_hash: textMetrics.hash || null,
      text_length: textMetrics.length ?? 0,
      pii_found: guardrailResult.signals?.pii || false,
      pii_types: guardrailResult.signals?.piiTypes || [],
      processed_at: new Date().toISOString(),
      provider: ocrProvider,
      duration_ms: ocrDurationMs,
    };
    
    await sb.storage
      .from(BUCKET)
      .upload(
        ocrKey, 
        new Blob([JSON.stringify(ocrData)], { type: 'application/json' }), 
        { upsert: true }
      );

    // Update document with OCR metadata
    const proofCompletedAt = new Date().toISOString();
    const proofMetadata = buildOcrProofMetadata(doc?.metadata, {
      textLength: redactedTextLength,
      textHash: redactedTextHash,
      provider: ocrProvider || null,
      status: 'ready',
      completedAt: proofCompletedAt,
    });
    console.log('[OCR] stage=ocr_proof_write_prepare', {
      docId,
      textLength: redactedTextLength,
      hasTextHash: Boolean(redactedTextHash),
      provider: ocrProvider || null,
      status: 'ready',
    });
    const baseUpdatePayload: Record<string, any> = {
      ocr_text: null,
      ocr_status: 'ready',
      ocr_completed_at: proofCompletedAt,
      ocr_text_length: redactedTextLength,
      ocr_text_hash: redactedTextHash,
      text_hash: redactedTextHash,
      ocr_provider: ocrProvider || null,
      pii_types: guardrailResult.signals?.piiTypes || [],
      extracted_data: normalizedForStorage,
      metadata: proofMetadata,
      status: normalized.needsUserConfirmation ? 'needs_review' : (guardrailResult.ok ? 'ready' : 'needs_review'),
      updated_at: new Date().toISOString()
    };
    const fullUpdatePayload = {
      ...baseUpdatePayload,
    };
    const proofWriteWarnings: string[] = [];
    let usedMetadataFallback = false;
    let currentUpdatePayload: Record<string, any> = { ...fullUpdatePayload };
    let ocrUpdateRows: any = null;
    let ocrUpdateError: any = null;
    for (let attempt = 0; attempt <= 6; attempt++) {
      try {
        ({ data: ocrUpdateRows, error: ocrUpdateError } = await sb
          .from('user_documents')
          .update(currentUpdatePayload)
          .eq('id', docId)
          .select('id,user_id,status,ocr_completed_at'));
      } catch (writeEx: any) {
        // Supabase client threw (e.g. network error, AbortError from stage timeout).
        // Treat as a non-fatal write failure — fall through to metadata-only fallback.
        ocrUpdateError = writeEx instanceof Error ? writeEx : new Error(String(writeEx?.message ?? writeEx));
        proofWriteWarnings.push(`ocr_proof_write_throw:${String(writeEx?.message ?? writeEx)}`);
        console.warn(`${logPrefix} DB_WRITE_THROW`, { docId, attempt, error: writeEx?.message ?? writeEx });
        break;
      }
      if (!ocrUpdateError) break;
      const missingColumn = getMissingUserDocumentsColumn(ocrUpdateError);
      if (!missingColumn) break;
      if (!Object.prototype.hasOwnProperty.call(currentUpdatePayload, missingColumn)) break;
      const { [missingColumn]: _dropped, ...nextPayload } = currentUpdatePayload as any;
      currentUpdatePayload = nextPayload;
      usedMetadataFallback = true;
      console.log('[OCR] stage=ocr_proof_write_retry', {
        docId,
        removedKey: missingColumn,
        remainingKeys: Object.keys(currentUpdatePayload),
      });
      if (String(missingColumn) === 'extracted_data') {
        console.warn(`${logPrefix} DB_WRITE_RETRY`, { docId, reason: 'missing_extracted_data_column' });
      }
      if (Object.keys(currentUpdatePayload).length === 0) break;
    }
    if (ocrUpdateError) {
      const metadataOnlyPayload = {
        metadata: proofMetadata,
        updated_at: new Date().toISOString(),
      };
      let metadataOnlyResult: { data: any; error: any } = { data: null, error: null };
      try {
        metadataOnlyResult = await sb
          .from('user_documents')
          .update(metadataOnlyPayload)
          .eq('id', docId)
          .select('id,user_id,status,ocr_completed_at');
      } catch (metaEx: any) {
        metadataOnlyResult = {
          data: null,
          error: metaEx instanceof Error ? metaEx : new Error(String(metaEx?.message ?? metaEx)),
        };
        proofWriteWarnings.push(`ocr_proof_write_meta_throw:${String(metaEx?.message ?? metaEx)}`);
        console.warn(`${logPrefix} DB_WRITE_META_THROW`, { docId, error: metaEx?.message ?? metaEx });
      }
      if (!metadataOnlyResult.error) {
        ocrUpdateRows = metadataOnlyResult.data;
        ocrUpdateError = null;
        usedMetadataFallback = true;
      } else {
        proofWriteWarnings.push(`ocr_proof_write_partial:${String(metadataOnlyResult.error.message || metadataOnlyResult.error)}`);
      }
    }
    if (!ocrUpdateRows || ocrUpdateRows.length === 0) {
      proofWriteWarnings.push('ocr_proof_write_empty');
    }
    console.log('[OCR] stage=ocr_proof_write_result', {
      docId,
      ok: !ocrUpdateError,
      textLength: redactedTextLength,
      hasTextHash: Boolean(redactedTextHash),
      provider: ocrProvider || null,
      usedMetadataFallback,
      error: ocrUpdateError ? String(ocrUpdateError.message || ocrUpdateError) : null,
    });
    if (ocrUpdateError) {
      proofWriteWarnings.push(`ocr_proof_write_error:${String(ocrUpdateError.message || ocrUpdateError)}`);
      console.warn(`${logPrefix} DB_WRITE_ERROR_NON_FATAL`, { docId, error: ocrUpdateError.message });
    } else if (!ocrUpdateRows || ocrUpdateRows.length === 0) {
      console.warn(`${logPrefix} DB_WRITE_EMPTY_NON_FATAL`, { docId, userId: effectiveUserId, docUserId: doc.user_id });
    } else {
      console.log(`${logPrefix} DB_WRITE_OK`, { docId, usedMetadataFallback, len: guardrailResult.text.length });
    }

    await finalizeOcrJobOutcome(sb, {
      ocrJobId,
      docId,
      status: 'succeeded',
      errorCode: null,
      errorMessage: null,
      normalizedJson: normalizedForStorage,
      engineUsed: normalized.engineUsed,
      pages: normalized.pages,
      confidence: normalized.confidence.overall,
    });

    // Byte Speed Mode v2: Return immediately, queue normalization in background
    // Fire normalization asynchronously - don't wait
    const netlifyUrl = process.env.NETLIFY_URL || 'http://localhost:8888';
    const OCR_DEBUG_ENABLED = process.env.OCR_DEBUG === '1' || process.env.OCR_DEBUG === 'true';
    if (OCR_DEBUG_ENABLED) {
      console.log('[smart-import-ocr] Queuing normalize-transactions', {
        docId,
        importRunId,
        userId: effectiveUserId,
      });
    }
    if (!docId || !UUID_V4_RE.test(String(docId))) {
      console.warn('[smart-import-ocr] Skipping normalize-transactions due to invalid documentId', { docId });
    } else {
      let skipNormalizeQueue = false;
      try {
        const { data: existingImport } = await sb
          .from('imports')
          .select('id,status')
          .eq('document_id', docId)
          .eq('user_id', effectiveUserId)
          .maybeSingle();
        if (existingImport?.status === 'committed') {
          skipNormalizeQueue = true;
        } else if (existingImport?.status === 'parsed' && existingImport?.id) {
          const { count } = await sb
            .from('transactions_staging')
            .select('id', { count: 'exact', head: true })
            .eq('import_id', existingImport.id)
            .eq('user_id', effectiveUserId);
          skipNormalizeQueue = Number(count || 0) > 0;
        }
      } catch (checkErr: any) {
        console.warn('[smart-import-ocr] normalize dedupe check failed; proceeding', {
          docId,
          error: checkErr?.message || String(checkErr),
        });
      }

      if (skipNormalizeQueue) {
        if (OCR_DEBUG_ENABLED) {
          console.log('[smart-import-ocr] Skipping normalize queue; import already normalized', { docId });
        }
      } else {
        console.log('[smart-import-ocr] stage=ocr_done', {
          traceId,
          docId,
          importRunId: importRunId || null,
          textLength: textMetrics.length ?? 0,
        });
        const rescuedPreview = String(rescuedTextForHandoff || '').slice(0, 300);
        const transientPreview = String(sanitizedText || '').slice(0, 300);
        console.log('[OCR HANDOFF DEBUG] rescued_text_preview', rescuedPreview);
        console.log('[OCR HANDOFF DEBUG] transient_text_preview', transientPreview);
        console.log('[OCR HANDOFF DEBUG] same_text:', rescuedTextForHandoff ? rescuedTextForHandoff === sanitizedText : false);
        console.log('[OCR HANDOFF DEBUG] handoff_source', handoffSource);
        await fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-trace-id': traceId,
          },
          body: JSON.stringify({
            userId: effectiveUserId,
            documentId: docId,
            ocrText: sanitizedText,
            ocrTextHash: textMetrics.hash || null,
            ocrTextLength: textMetrics.length ?? 0,
          }),
        }).then(async () => {
          console.log("[smart-import-ocr] normalize done, approving and committing");
          await new Promise(r => setTimeout(r, 3000));
          const sb = admin();
          const { data: imp } = await sb.from("imports").select("id").eq("document_id", docId).eq("user_id", effectiveUserId).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (!imp?.id) { console.warn("[smart-import-ocr] no import found for docId:", docId); return; }
          console.log("[smart-import-ocr] found import:", imp.id, "committing...");
          // Commit via internal call with service role
          const commitRes = await fetch(`${netlifyUrl}/.netlify/functions/commit-import`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": effectiveUserId, "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ importId: imp.id, userId: effectiveUserId }),
          });
          const commitData = await commitRes.json();
          console.log("[smart-import-ocr] commit status:", commitRes.status, "transactions:", commitData.committed || 0);
        }).catch((err) => {
          console.error("[smart-import-ocr] approve/commit failed", err);
        });
      }
    }
    const cleanedTextForDebug = includeCleanedTextDebug ? sanitizedText : undefined;
    // Best-effort drop reference after handoff to normalization stage.
    sanitizedText = '';
    
    // Update status in background (don't wait)
    markDocStatus(docId, 'ready', null).catch((err) => {
      console.error('[smart-import-ocr] Error updating doc status:', err);
    });
    setDocumentOcrStatus(sb, docId, 'ready').catch(() => {
      // best effort only
    });

    // AI Fluency: Log document processed event (non-blocking)
    const isReceipt = doc.mime_type?.startsWith('image/') || false;
    const isStatement = ['csv', 'ofx', 'qif'].includes((doc.original_name || '').split('.').pop()?.toLowerCase() || '');
    
    Promise.all([
      logUserEvent({
        userId: effectiveUserId,
        eventType: 'doc_processed',
        eventValue: 1,
        meta: { docId, docType: doc.mime_type, isReceipt, isStatement }
      }),
      // Log receipt/statement upload separately for granularity
      isReceipt && logUserEvent({
        userId: effectiveUserId,
        eventType: 'receipt_uploaded',
        eventValue: 1,
        meta: { docId }
      }),
      isStatement && logUserEvent({
        userId: effectiveUserId,
        eventType: 'statement_uploaded',
        eventValue: 1,
        meta: { docId }
      })
    ]).then(() => {
      // Recalculate fluency after logging events (non-blocking)
      recalcFluency(effectiveUserId).catch(err => {
        console.error('[smart-import-ocr] Error recalculating fluency:', err);
      });
    }).catch(err => {
      console.error('[smart-import-ocr] Error logging events:', err);
      // Don't block response - logging failures are non-fatal
    });

    // 🚫 Do NOT auto-send chat messages for upload status.
    const AUTO_CHAT_ON_UPLOAD_COMPLETE = false;
    if (AUTO_CHAT_ON_UPLOAD_COMPLETE) {
      fetch(`${netlifyUrl}/.netlify/functions/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          message: `✅ OCR complete for "${doc.original_name}"!\n\nExtracted ${guardrailResult.text.length.toLocaleString()} characters. ${guardrailResult.signals?.pii ? '🔒 PII detected and redacted. ' : ''}Ready to review?`,
          employeeSlug: 'byte-docs',
          userId: userId,
          threadId: threadId || null  // Use Prime's thread if available
        })
      }).catch(err => console.error('[OCR] Failed to announce to Byte:', err));
    }

    // Return immediately - Byte can chat while OCR processes
    ocrSucceeded = true;
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true,
        status: 'succeeded',
        docId,
        importRunId,
        textLength: guardrailResult.text.length,
        warnings: proofWriteWarnings,
        piiDetected: guardrailResult.signals?.pii || false,
        provider: ocrProvider,
        durationMs: ocrDurationMs,
        result: normalized,
        ...(includeCleanedTextDebug ? { cleanedText: cleanedTextForDebug } : {}),
        traceId,
      }) 
    };
    
  } catch (e: any) {
    const traceIdHeader = event.headers['x-trace-id'] || event.headers['X-Trace-Id'];
    const traceId = traceIdHeader || 'no-trace';
    console.error(`[OCR][${traceId}] ERROR`, e);
    if (lockAcquired && lockedDocId) {
      try {
        const sb = admin();
        await setDocumentOcrStatus(sb, lockedDocId, 'failed');
        await markDocStatus(lockedDocId, 'rejected', `OCR failed: ${e?.message || 'unknown error'}`);
      } catch (markError: any) {
        console.error(`[OCR][${traceId}] ERROR`, { error: 'Failed to release OCR lock', details: markError?.message || markError });
      }
    }
    if (ocrJobId) {
      try {
        const sb = admin();
        const classified = classifyOcrErrorCode(e);
        await finalizeOcrJobOutcome(sb, {
          ocrJobId,
          docId: lockedDocId || 'unknown-doc',
          status: classified.status,
          errorCode: classified.errorCode,
          errorMessage: e?.message || 'unknown_error',
        });
      } catch (jobErr: any) {
        console.error(`[OCR][${traceId}] ERROR`, { error: 'Failed to set ocr_jobs error', details: jobErr?.message || jobErr });
      }
    }
    return { 
      statusCode: 500, 
      body: JSON.stringify({ ok: false, status: 'failed', error: e.message, error_code: classifyOcrErrorCode(e).errorCode, traceId }) 
    };
  } finally {
    if (stopHeartbeat) stopHeartbeat();
    if (lockAcquired && lockedDocId && !ocrSucceeded) {
      try {
        const sb = admin();
        const { data: docRow } = await sb
          .from('user_documents')
          .select('status')
          .eq('id', lockedDocId)
          .maybeSingle();
        if (String(docRow?.status || '').toLowerCase() === 'ocr_processing') {
          await setDocumentOcrStatus(sb, lockedDocId, 'failed');
          await markDocStatus(lockedDocId, 'rejected', 'Unreadable PDF structure. Please re-save this PDF and upload the new copy.');
        }
      } catch (cleanupErr: any) {
        console.warn('[OCR] lock cleanup fallback failed', {
          docId: lockedDocId,
          error: cleanupErr?.message || String(cleanupErr),
        });
      }
    }
  }
};



