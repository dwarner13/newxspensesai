import type { OcrPageResult } from './ocrPageImage.js';

export type MergedOcrResult = {
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

type MergeOptions = {
  originalName?: string;
  confidenceThreshold?: number;
  truncated?: boolean;
  warning?: string;
  includeDebug?: boolean;
  pagesTotal?: number;
  pagesProcessed?: number;
  earlyStopTriggered?: boolean;
  earlyStopReason?: string | null;
  metrics?: Record<string, any>;
};

function detectDocType(name: string, text: string): MergedOcrResult['docType'] {
  const lowerName = name.toLowerCase();
  if (/invoice/.test(lowerName) || /\binvoice\b/i.test(text)) return 'invoice';
  if (/statement|bank|credit.?card|account/.test(lowerName) || /\bstatement\b|\bopening balance\b|\bclosing balance\b|\btransaction\b/i.test(text)) return 'statement';
  if (/receipt/.test(lowerName) || /\bsubtotal\b|\btip\b|\btotal\b/i.test(text)) return 'receipt';
  return 'unknown';
}

function pickField(pages: OcrPageResult[], key: 'merchant' | 'date' | 'total' | 'currency') {
  const sorted = [...pages].sort((a, b) => b.confidence - a.confidence);
  for (const page of sorted) {
    const value = page.fields?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

export function mergeOcrPages(pages: OcrPageResult[], options: MergeOptions = {}): MergedOcrResult {
  const threshold = options.confidenceThreshold ?? 0.75;
  const validPages = pages.filter((p) => (p.rawText || '').trim().length > 0);
  const rawText = validPages
    .map((p, idx) => `--- PAGE ${idx + 1} ---\n${p.rawText}`)
    .join('\n\n');
  const tables = validPages.flatMap((p) => p.tables || []);
  const merchant = pickField(validPages, 'merchant');
  const date = pickField(validPages, 'date');
  const total = pickField(validPages, 'total');
  const currency = pickField(validPages, 'currency');
  const pagesCount = pages.length;
  const weightedConfidence = (() => {
    if (validPages.length === 0) return 0.2;
    const scored = validPages.map((page) => {
      const hasTotal = typeof page.fields?.total === 'number' ? 1 : 0;
      const hasTables = (page.tables || []).length > 0 ? 1 : 0;
      const weight = 1 + hasTotal * 0.6 + hasTables * 0.35;
      return { weight, score: page.confidence };
    });
    const totalWeight = scored.reduce((sum, item) => sum + item.weight, 0);
    const totalScore = scored.reduce((sum, item) => sum + item.score * item.weight, 0);
    return Number((totalScore / Math.max(0.01, totalWeight)).toFixed(3));
  })();
  const hasFallback = validPages.some((p) => p.fallbackUsed);
  const engineSet = Array.from(new Set(validPages.map((p) => p.provider)));
  const engineUsed = engineSet.join('+') || 'ocrspace';
  const docType = detectDocType(options.originalName || '', rawText);
  const confidence = {
    overall: weightedConfidence,
    total: typeof total === 'number' ? Math.max(0.5, weightedConfidence) : 0.35,
    date: date ? Math.max(0.55, weightedConfidence * 0.95) : 0.4,
    merchant: merchant ? Math.max(0.5, weightedConfidence * 0.92) : 0.35,
    tables: tables.length > 0 ? Math.max(0.6, weightedConfidence) : 0.45,
  };
  const needsUserConfirmation = weightedConfidence < threshold || Boolean(options.truncated);

  const merged: MergedOcrResult = {
    docType,
    pages: pagesCount,
    rawText,
    ...(tables.length > 0 ? { tables } : {}),
    fields: {
      ...(merchant ? { merchant: String(merchant) } : {}),
      ...(date ? { date: String(date) } : {}),
      ...(typeof total === 'number' ? { total: Number(total) } : {}),
      ...(currency ? { currency: String(currency) } : {}),
    },
    confidence,
    engineUsed,
    fallbackUsed: hasFallback,
    needsUserConfirmation,
  };

  if (options.includeDebug) {
    merged.debug = {
      truncated: Boolean(options.truncated),
      warning: options.warning || null,
      pages: validPages.map((page) => ({
        pageIndex: page.pageIndex,
        confidence: page.confidence,
        provider: page.provider,
        fallbackUsed: page.fallbackUsed,
        debug: page.debug || null,
      })),
      progress: {
        processedPages: options.pagesProcessed ?? pagesCount,
        totalPages: options.pagesTotal ?? pagesCount,
      },
      earlyStop: {
        triggered: Boolean(options.earlyStopTriggered),
        reason: options.earlyStopReason || null,
      },
      metrics: options.metrics || null,
    };
  }
  return merged;
}

