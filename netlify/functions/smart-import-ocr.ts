/**
 * Smart Import OCR - Extract text from images/PDFs
 * 
 * SECURITY: OCR output runs through STRICT guardrails before storage
 */

import { Handler } from '@netlify/functions';
import { createHash } from 'crypto';
import { admin, markDocStatus } from './_shared/upload.js';
// Phase 2.2: Use unified guardrails API (single source of truth)
import { runGuardrailsForText } from './_shared/guardrails-unified.js';
import { maskPII as maskPiiFallback } from './_shared/pii.js';
import { callGoogleVisionOnImage } from './_shared/vision/googleVisionClient.js';
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
import sharp from 'sharp';
import OpenAI from 'openai';

const BUCKET = 'docs';

const bufferCache = new Map<string, Buffer>();

const DEFAULT_OCR_TIMEOUT_MS = 30000;
const MAX_OCR_TIMEOUT_MS = 60000;
const OCR_RETRY_ATTEMPTS = 3;
const OCR_RETRY_BASE_DELAY_MS = 500;
const SCANNED_PDF_TEXT_THRESHOLD = Number(process.env.OCR_SCANNED_PDF_TEXT_THRESHOLD || 220);
const SCANNED_PDF_MAX_PAGES = Number(process.env.OCR_SCANNED_PDF_MAX_PAGES || 10);
const SCANNED_PDF_MAX_IMAGE_BYTES = Number(process.env.OCR_SCANNED_PDF_MAX_IMAGE_BYTES || 950 * 1024);
const OCR_CONFIDENCE_THRESHOLD = Number(process.env.OCR_CONFIDENCE_THRESHOLD || 0.75);
const OCR_EARLY_STOP_CONFIDENCE = Number(process.env.OCR_EARLY_STOP_CONFIDENCE || 0.85);
const OCR_MIN_PAGES_FOR_EARLY_STOP = Number(process.env.MIN_PAGES_FOR_EARLY_STOP || 2);
const OCR_STATEMENT_EARLY_STOP_MAX_PAGES = Number(process.env.OCR_STATEMENT_EARLY_STOP_MAX_PAGES || 4);
const OCR_FALLBACK_MAX_PAGES = Number(process.env.OCR_FALLBACK_MAX_PAGES || 2);
const OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD = Number(process.env.OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD || 0.7);
const OCR_FALLBACK_ORDER_STATEMENT = process.env.OCR_FALLBACK_ORDER_STATEMENT || 'google,openai';
const OCR_FALLBACK_ORDER_RECEIPT = process.env.OCR_FALLBACK_ORDER_RECEIPT || 'openai,google';
const OCR_FALLBACK_MONTHLY_CAP_FREE = Number(process.env.OCR_FALLBACK_MONTHLY_CAP_FREE || 10);

type RetryableError = Error & { status?: number };

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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function withRetries<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= OCR_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === OCR_RETRY_ATTEMPTS) {
        throw error;
      }
      const delay = OCR_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`[OCR] ${label} failed (attempt ${attempt}/${OCR_RETRY_ATTEMPTS}), retrying in ${delay}ms`);
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
  raw_text: string | null;
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
    scale: 2,
    maxImageBytes: SCANNED_PDF_MAX_IMAGE_BYTES,
    onPageRendered: updateProgress,
  });
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

  for (let idx = 0; idx < rendered.pages.length; idx += 1) {
    const page = rendered.pages[idx];
    const pageResult = await ocrPageImage({
      pageIndex: page.pageIndex,
      imageBuffer: page.imageBuffer,
      statementMode: params.docMode === 'statement',
      confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
      disableFallback: true,
    });
    pageResults.push(pageResult);
    metrics.primaryEngineCalls += 1;
    metrics.pagesProcessed = pageResults.length;
    await updateProgress(idx + 1, rendered.totalPages);

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

  let fallbackSkippedByBudget = false;
  const eligibleWorstPages = selectWorstPagesForFallback({
    pages: pageResults,
    maxPages: OCR_FALLBACK_MAX_PAGES,
    pageConfidenceThreshold: OCR_FALLBACK_PAGE_CONFIDENCE_THRESHOLD,
  });
  metrics.worstPagesRetried = eligibleWorstPages.map((page) => page.pageIndex);

  if (eligibleWorstPages.length > 0 && !params.allowPaidFallback) {
    fallbackSkippedByBudget = true;
    metrics.fallbackSkippedByBudget = true;
  }

  if (params.allowPaidFallback) {
    for (const page of eligibleWorstPages) {
      metrics.fallbackAttempted.pages += 1;
      const target = rendered.pages.find((item) => item.pageIndex === page.pageIndex);
      if (!target) continue;
      const retried = await retryOcrPageFallback({
        pageResult: page,
        imageBuffer: target.imageBuffer,
        statementMode: params.docMode === 'statement',
        confidenceThreshold: OCR_CONFIDENCE_THRESHOLD,
        fallbackOrder,
      });
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
  // Remove unpaired surrogate code units and control chars that break JSON/DB writes.
  return input
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
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
): Promise<string> {
  const buf = await getPdfBuffer(docId, signedUrl, timeoutMs);
  const text = await extractPdfTextWithPdfParse(buf);
  console.log("[OCR] pdf-parse embedded text extracted", { textLength: text.trim().length });
  return text;
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
    console.warn('[OCR] Unable to load monthly fallback usage count', {
      userId,
      error: error?.message || String(error),
    });
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
  const originalBuffer = await fetchBinaryBuffer(signedUrl, timeoutMs);
  const originalSize = originalBuffer.length;
  let quality = 80;
  let width = 1600;
  let buffer = originalBuffer;

  try {
    const metadata = await sharp(originalBuffer).metadata();
    if (metadata.width) {
      width = Math.min(width, metadata.width);
    }
  } catch {
    // ignore metadata errors, keep defaults
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    buffer = await sharp(originalBuffer)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
    if (buffer.length <= 950 * 1024) {
      break;
    }
    if (quality > 50) {
      quality -= 10;
    } else {
      width = Math.max(800, Math.round(width * 0.8));
    }
  }

  console.log('[OCR] Prepared OCR.space image payload', {
    originalSize,
    finalSize: buffer.length,
    quality,
    width,
  });

  return {
    base64Image: `data:image/jpeg;base64,${buffer.toString('base64')}`,
    finalSize: buffer.length,
  };
}

async function runOpenAIVisionOcr(
  base64Image: string,
  timeoutMs: number
): Promise<OCRRunResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const start = Date.now();
  console.log('[OCR] OpenAI Vision model', { model });
  const response = await withRetries('OpenAI Vision', () =>
    client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all visible text from this image. Return only the text, preserving line breaks where possible.' },
            { type: 'image_url', image_url: { url: base64Image } },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2000,
    })
  );
  const text = (response.choices?.[0]?.message?.content || '').trim();
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
  docMode: 'statement' | 'receipt' = 'receipt'
): Promise<OCRRunResult> {
  const hasVision = !!process.env.GOOGLE_VISION_API_KEY;
  const hasOcrSpace = !!process.env.OCR_SPACE_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const normalizedMime = mimeType || 'application/pdf';
  const isImage = normalizedMime.startsWith('image/') && !normalizedMime.includes('pdf');
  const isPdf = normalizedMime === 'application/pdf';
  const timeoutMs = computeOcrTimeoutMs(expectedSize, normalizedMime);
  const enableEmbeddedPdfText =
    process.env.ENABLE_PDF_EMBEDDED_TEXT === '1' ||
    process.env.ENABLE_PDF_EMBEDDED_TEXT === 'true';
  if (enableEmbeddedPdfText) {
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
    const response = await withRetries(enhanced ? 'OCR.space enhanced' : 'OCR.space', async () => {
      const res = await fetchWithTimeout('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      }, timeoutMs);
      if (!res.ok) {
        const error: RetryableError = new Error(`OCR.space API returned ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return res;
    });
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
      const embeddedText = await withRetries('PDF embedded text', () =>
        extractEmbeddedPdfText(docId, signedUrl, timeoutMs)
      );
      if (embeddedText && embeddedText.trim().length > 50) {
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
        console.log('[OCR] Embedded PDF extraction success (pdf-parse)', { chars: finalText.trim().length });
        return {
          text: finalText,
          provider: 'embedded_pdf_parse',
          durationMs: Date.now() - embeddedStart,
          pages: undefined,
        };
      }
      console.log('[OCR] No embedded text via pdf-parse (likely scanned PDF)');
    } catch (error: any) {
      console.warn('[OCR] PDF embedded text extraction failed, falling back to OCR:', error.message || error);
    }
  } else if (isPdf) {
    console.log('[OCR] PDF embedded text extraction disabled; using OCR.space');
  }

  // 2) Prefer OCR.space first for images and PDFs when available
  if (hasOcrSpace) {
    console.log('[OCR] Using OCR.space backend');
    try {
      const baseResult = await runOcrSpace(docMode === 'statement');
      if (baseResult.text?.trim()) {
        if (baseResult.text.trim().length < 200) {
          console.warn('[OCR] OCR.space returned short text, retrying with enhanced settings');
          const enhancedResult = await runOcrSpace(true);
          if (enhancedResult.text?.trim().length > baseResult.text.trim().length) {
            return enhancedResult;
          }
        }
        return baseResult;
      }
      const enhancedResult = await runOcrSpace(true);
      if (enhancedResult.text?.trim()) {
        return enhancedResult;
      }
    } catch (error: any) {
      if (isPdf && isOcrSpacePageLimitError(error)) {
        return {
          text: '',
          provider: 'ocrspace',
          durationMs: 0,
          pageLimitReached: true,
        };
      }
      console.error('[OCR] OCR.space error:', error.message || error);
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
  const baseUpdatePayload: Record<string, any> = {
    ocr_text: cached.rawText,
    ocr_completed_at: new Date().toISOString(),
    status: cached.needsUserConfirmation ? 'needs_review' : 'ready',
    extracted_data: cached,
    updated_at: new Date().toISOString(),
  };
  const fullUpdatePayload = {
    ...baseUpdatePayload,
    ocr_engine: cached.engineUsed,
  };
  let { error } = await sb
    .from('user_documents')
    .update(fullUpdatePayload)
    .eq('id', docId);
  if (error && String(error.message || '').includes('ocr_engine')) {
    ({ error } = await sb.from('user_documents').update(baseUpdatePayload).eq('id', docId));
  }
  if (error && String(error.message || '').includes('extracted_data')) {
    const { extracted_data, ...withoutExtracted } = baseUpdatePayload;
    const fallbackPayload = {
      ...withoutExtracted,
      ocr_engine: cached.engineUsed,
    };
    ({ error } = await sb.from('user_documents').update(fallbackPayload).eq('id', docId));
  }
  if (error) {
    throw error;
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
    const { userId, docId, threadId } = body;
    const expectedSize = body.expectedSize ? Number(body.expectedSize) : undefined;
    const importRunId = body.importRunId || body.requestId;
    const logPrefix = `[OCR][${traceId}]`;

    console.log(`${logPrefix} START`, { docId, importRunId });
    if (!userId || !docId) {
      console.error(`${logPrefix} ERROR`, { error: 'Missing userId/docId' });
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId/docId', traceId, importRunId }) };
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
    const docUserId = doc.user_id;
    const effectiveUserId = docUserId || userId;
    if (docUserId && userId && docUserId !== userId) {
      console.warn('[OCR] user_id mismatch; using doc.user_id', { docId, docUserId, requestUserId: userId });
    }

    if (doc.ocr_text && doc.ocr_text.trim().length > 0) {
      console.log(`${logPrefix} SKIP`, { docId, reason: 'already_processed' });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          docId,
          importRunId,
          textLength: doc.ocr_text.length,
          traceId,
          alreadyProcessed: true,
        }),
      };
    }

    if (doc.status === 'ocr_processing') {
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
    const binaryBuffer = await fetchBinaryBuffer(signed.signedUrl, computeOcrTimeoutMs(expectedSize, effectiveMimeType));
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
    if (existingJob?.id) {
      ocrJobId = existingJob.id;
    }

    // Step 5: Acquire in-flight OCR lock (atomic)
    const lockPayload = {
      status: 'ocr_processing',
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

    // Run OCR
    let ocrText: string;
    let ocrProvider: OCRProvider | null = null;
    let ocrDurationMs: number | null = null;
    let ocrPages: number | undefined;
    let ocrPageLimitReached = false;
    let fallbackUsed = false;
    let fallbackSkippedByBudget = false;
    let scannedMetrics: OcrRunMetrics | null = null;
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
      const ocrResult = await runOCR(signed.signedUrl, effectiveMimeType, expectedSize, docId, docMode);
      ocrText = ocrResult.text;
      ocrProvider = ocrResult.provider;
      ocrDurationMs = ocrResult.durationMs;
      ocrPages = ocrResult.pages;
      ocrPageLimitReached = !!ocrResult.pageLimitReached;
    } catch (ocrError: any) {
      console.error(`${logPrefix} ERROR`, { error: ocrError?.message || ocrError });
      if (ocrJobId) {
        await sb
          .from('ocr_jobs')
          .update({
            status: 'error',
            error: ocrError?.message || 'ocr_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ocrJobId);
      }
      await markDocStatus(docId, 'rejected', `OCR failed: ${ocrError.message}`);
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reason: 'ocr_failed',
          traceId,
          importRunId,
        }) 
      };
    }

    let scannedPdfMerged: OcrResult | null = null;
    if (shouldUseScannedPdfFallback({
      mimeType: effectiveMimeType,
      provider: ocrProvider,
      text: ocrText,
      pageLimitReached: ocrPageLimitReached,
    })) {
      try {
        const scannedFallback = await runScannedPdfFallback({
          pdfBuffer: binaryBuffer,
          originalName: doc.original_name || '',
          docMode,
          allowPaidFallback,
          sb,
          ocrJobId,
        });
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
      } catch (scannedError: any) {
        console.warn('[OCR] scanned PDF fallback failed; using best available text', {
          docId,
          error: scannedError?.message || String(scannedError),
        });
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
      if (ocrJobId) {
        await sb
          .from('ocr_jobs')
          .update({
            status: 'error',
            error: `Blocked: ${(guardrailResult.reasons || []).join(', ')}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ocrJobId);
      }
      await markDocStatus(docId, 'rejected', `Blocked: ${guardrailResult.reasons.join(', ')}`);
      
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          rejected: true, 
          reasons: guardrailResult.reasons,
          traceId,
          importRunId,
        }) 
      };
    }

    const sanitizedText = sanitizeOcrText(guardrailResult.text);
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
    const ocrData = {
      text: sanitizedText,  // Redacted text (sanitized)
      normalized,
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
    const baseUpdatePayload: Record<string, any> = {
      ocr_text: sanitizedText,  // Redacted (sanitized)
      ocr_completed_at: new Date().toISOString(),
      pii_types: guardrailResult.signals?.piiTypes || [],
      extracted_data: normalized,
      status: normalized.needsUserConfirmation ? 'needs_review' : (guardrailResult.ok ? 'ready' : 'needs_review'),
      updated_at: new Date().toISOString()
    };
    const fullUpdatePayload = {
      ...baseUpdatePayload,
      ocr_engine: ocrProvider,
    };
    let { data: ocrUpdateRows, error: ocrUpdateError } = await sb
      .from('user_documents')
      .update(fullUpdatePayload)
      .eq('id', docId)
      .select('id,user_id,status,ocr_completed_at');
    if (ocrUpdateError && String(ocrUpdateError.message || '').includes('ocr_engine')) {
      console.warn(`${logPrefix} DB_WRITE_RETRY`, { docId, reason: 'missing_ocr_engine_column' });
      ({ data: ocrUpdateRows, error: ocrUpdateError } = await sb
        .from('user_documents')
        .update(baseUpdatePayload)
        .eq('id', docId)
        .select('id,user_id,status,ocr_completed_at'));
    }
    if (ocrUpdateError && String(ocrUpdateError.message || '').includes('extracted_data')) {
      console.warn(`${logPrefix} DB_WRITE_RETRY`, { docId, reason: 'missing_extracted_data_column' });
      const { extracted_data, ...withoutExtractedData } = baseUpdatePayload;
      ({ data: ocrUpdateRows, error: ocrUpdateError } = await sb
        .from('user_documents')
        .update(withoutExtractedData)
        .eq('id', docId)
        .select('id,user_id,status,ocr_completed_at'));
    }
    if (ocrUpdateError) {
      console.error(`${logPrefix} DB_WRITE_ERROR`, { docId, error: ocrUpdateError.message });
      if (ocrJobId) {
        await sb
          .from('ocr_jobs')
          .update({
            status: 'error',
            error: 'ocr_write_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ocrJobId);
      }
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'ocr_write_failed',
          traceId,
          docId,
          importRunId,
        }),
      };
    }
    if (!ocrUpdateRows || ocrUpdateRows.length === 0) {
      console.error(`${logPrefix} DB_WRITE_EMPTY`, { docId, userId: effectiveUserId, docUserId: doc.user_id });
      if (ocrJobId) {
        await sb
          .from('ocr_jobs')
          .update({
            status: 'error',
            error: 'ocr_write_empty',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ocrJobId);
      }
      return {
        statusCode: 500,
        body: JSON.stringify({
          ok: false,
          error: 'ocr_write_empty',
          traceId,
          docId,
          importRunId,
        }),
      };
    }
    console.log(`${logPrefix} DB_WRITE_OK`, { docId, len: guardrailResult.text.length });

    if (ocrJobId) {
      await sb
        .from('ocr_jobs')
        .update({
          status: 'done',
          document_id: docId,
          engine_used: normalized.engineUsed,
          pages: normalized.pages,
          confidence: normalized.confidence.overall,
          raw_text: normalized.rawText,
          normalized_json: normalized,
          error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ocrJobId);
    }

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
    fetch(`${netlifyUrl}/.netlify/functions/normalize-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: effectiveUserId, documentId: docId }),
    }).catch((err) => {
      console.error('[smart-import-ocr] Error calling normalize-transactions:', err);
    });
    
    // Update status in background (don't wait)
    markDocStatus(docId, 'ready', null).catch((err) => {
      console.error('[smart-import-ocr] Error updating doc status:', err);
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
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true,
        docId,
        importRunId,
        textLength: guardrailResult.text.length,
        piiDetected: guardrailResult.signals?.pii || false,
        provider: ocrProvider,
        durationMs: ocrDurationMs,
        result: normalized,
        traceId,
      }) 
    };
    
  } catch (e: any) {
    const traceIdHeader = event.headers['x-trace-id'] || event.headers['X-Trace-Id'];
    const traceId = traceIdHeader || 'no-trace';
    console.error(`[OCR][${traceId}] ERROR`, e);
    if (lockAcquired && lockedDocId) {
      try {
        await markDocStatus(lockedDocId, 'rejected', `OCR failed: ${e?.message || 'unknown error'}`);
      } catch (markError: any) {
        console.error(`[OCR][${traceId}] ERROR`, { error: 'Failed to release OCR lock', details: markError?.message || markError });
      }
    }
    if (ocrJobId) {
      try {
        const sb = admin();
        await sb
          .from('ocr_jobs')
          .update({
            status: 'error',
            error: e?.message || 'unknown_error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ocrJobId);
      } catch (jobErr: any) {
        console.error(`[OCR][${traceId}] ERROR`, { error: 'Failed to set ocr_jobs error', details: jobErr?.message || jobErr });
      }
    }
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: e.message, traceId }) 
    };
  }
};

