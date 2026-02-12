import OpenAI from 'openai';

export type OcrPageProvider = 'ocrspace' | 'openai_vision' | 'vision';
export type OcrFallbackProvider = 'openai_vision' | 'vision';

export type OcrPageResult = {
  pageIndex: number;
  rawText: string;
  provider: OcrPageProvider;
  confidence: number;
  fallbackUsed: boolean;
  tables?: any[];
  fields?: {
    merchant?: string;
    date?: string;
    total?: number;
    currency?: string;
  };
  debug?: Record<string, any>;
};

type OcrPageImageOptions = {
  pageIndex: number;
  imageBuffer: Buffer;
  statementMode?: boolean;
  timeoutMs?: number;
  confidenceThreshold?: number;
  disableFallback?: boolean;
  fallbackOrder?: OcrFallbackProvider[];
};

function detectCurrency(text: string): string | undefined {
  if (/\bCAD\b|C\$|CDN/i.test(text)) return 'CAD';
  if (/\bUSD\b|US\$/i.test(text)) return 'USD';
  if (/\bEUR\b|€/i.test(text)) return 'EUR';
  if (/\bGBP\b|£/i.test(text)) return 'GBP';
  if (/\$/i.test(text)) return 'CAD';
  return undefined;
}

function extractFields(text: string): OcrPageResult['fields'] {
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
    currency: detectCurrency(text),
  };
}

function scoreText(text: string, statementMode: boolean): number {
  const fields = extractFields(text);
  const lengthScore = Math.min(0.95, Math.max(0.2, text.trim().length / 1600));
  const tableSignal = /amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)|transaction details/i.test(text) ? 0.85 : 0.45;
  const score = (
    lengthScore * 0.35 +
    (fields?.date ? 0.85 : 0.35) * 0.2 +
    (typeof fields?.total === 'number' ? 0.9 : 0.35) * 0.2 +
    (fields?.merchant ? 0.8 : 0.35) * 0.15 +
    (statementMode ? tableSignal : 0.6) * 0.1
  );
  return Number(Math.max(0.1, Math.min(0.99, score)).toFixed(3));
}

function toDataUrl(buffer: Buffer): string {
  return `data:image/jpeg;base64,${buffer.toString('base64')}`;
}

async function callOcrSpace(args: {
  imageBuffer: Buffer;
  statementMode: boolean;
  timeoutMs: number;
}): Promise<{ text: string; provider: OcrPageProvider }> {
  const apikey = process.env.OCR_SPACE_API_KEY;
  if (!apikey) {
    throw new Error('OCR.space key missing');
  }
  const formData = new FormData();
  formData.append('base64Image', toDataUrl(args.imageBuffer));
  formData.append('apikey', apikey);
  formData.append('language', 'eng');
  formData.append('detectOrientation', 'true');
  formData.append('isOverlayRequired', 'false');
  formData.append('filetype', 'image');
  if (args.statementMode) {
    formData.append('scale', 'true');
    formData.append('isTable', 'true');
    formData.append('OCREngine', '2');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`OCR.space error ${res.status}`);
    }
    const payload = await res.json();
    const parsed = Array.isArray(payload?.ParsedResults) ? payload.ParsedResults : [];
    const text = parsed
      .map((row: any) => String(row?.ParsedText || ''))
      .filter((rowText: string) => rowText.trim().length > 0)
      .join('\n\n');
    return { text, provider: 'ocrspace' };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiVision(args: {
  imageBuffer: Buffer;
  timeoutMs: number;
}): Promise<{ text: string; provider: OcrPageProvider } | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 1800,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all visible text. Return text only, preserve line breaks.' },
          { type: 'image_url', image_url: { url: toDataUrl(args.imageBuffer) } },
        ],
      },
    ],
  });
  const text = (res.choices?.[0]?.message?.content || '').trim();
  if (!text) return null;
  return { text, provider: 'openai_vision' };
}

async function callGoogleVision(args: {
  imageBuffer: Buffer;
  timeoutMs: number;
}): Promise<{ text: string; provider: OcrPageProvider } | null> {
  const key = process.env.GOOGLE_VISION_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        requests: [
          {
            image: { content: args.imageBuffer.toString('base64') },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const text = payload?.responses?.[0]?.fullTextAnnotation?.text || '';
    if (!text.trim()) return null;
    return { text, provider: 'vision' };
  } finally {
    clearTimeout(timer);
  }
}

function parseFallbackOrder(order?: OcrFallbackProvider[]): OcrFallbackProvider[] {
  const defaultOrder: OcrFallbackProvider[] = ['openai_vision', 'vision'];
  if (!Array.isArray(order) || order.length === 0) return defaultOrder;
  const valid = order.filter((item): item is OcrFallbackProvider => item === 'openai_vision' || item === 'vision');
  return valid.length > 0 ? Array.from(new Set(valid)) : defaultOrder;
}

async function runProvider(
  provider: OcrFallbackProvider,
  imageBuffer: Buffer,
  timeoutMs: number
): Promise<{ text: string; provider: OcrPageProvider } | null> {
  if (provider === 'openai_vision') {
    return callOpenAiVision({ imageBuffer, timeoutMs });
  }
  return callGoogleVision({ imageBuffer, timeoutMs });
}

async function applyFallbackSequence(args: {
  imageBuffer: Buffer;
  timeoutMs: number;
  statementMode: boolean;
  threshold: number;
  currentText: string;
  currentProvider: OcrPageProvider;
  currentConfidence: number;
  currentFallbackUsed: boolean;
  fallbackOrder?: OcrFallbackProvider[];
  debug: Record<string, any>;
}): Promise<{
  text: string;
  provider: OcrPageProvider;
  confidence: number;
  fallbackUsed: boolean;
}> {
  const order = parseFallbackOrder(args.fallbackOrder);
  if (!Array.isArray(args.debug.fallbackProvidersCalled)) {
    args.debug.fallbackProvidersCalled = [];
  }
  let text = args.currentText;
  let provider = args.currentProvider;
  let confidence = args.currentConfidence;
  let fallbackUsed = args.currentFallbackUsed;
  for (const fallbackProvider of order) {
    if (confidence >= args.threshold) break;
    args.debug.fallbackProvidersCalled.push(fallbackProvider);
    const result = await runProvider(fallbackProvider, args.imageBuffer, args.timeoutMs);
    if (!result?.text?.trim()) continue;
    args.debug.providersTried.push(result.provider);
    const score = scoreText(result.text, args.statementMode);
    if (score > confidence) {
      text = result.text;
      provider = result.provider;
      confidence = score;
      fallbackUsed = true;
    }
  }
  return { text, provider, confidence, fallbackUsed };
}

export async function ocrPageImage(options: OcrPageImageOptions): Promise<OcrPageResult> {
  const timeoutMs = options.timeoutMs || 25_000;
  const threshold = options.confidenceThreshold ?? 0.75;
  const statementMode = Boolean(options.statementMode);
  const disableFallback = Boolean(options.disableFallback);
  const debug: Record<string, any> = {
    pageIndex: options.pageIndex,
    providersTried: [] as string[],
  };

  let text = '';
  let provider: OcrPageProvider = 'ocrspace';
  let confidence = 0.2;
  let fallbackUsed = false;
  try {
    const primary = await callOcrSpace({
      imageBuffer: options.imageBuffer,
      statementMode,
      timeoutMs,
    });
    debug.providersTried.push(primary.provider);
    text = primary.text || '';
    provider = primary.provider;
    confidence = scoreText(text, statementMode);
  } catch (primaryError: any) {
    debug.primaryError = primaryError?.message || String(primaryError);
  }

  if (!disableFallback && confidence < threshold) {
    const fallbackResult = await applyFallbackSequence({
      imageBuffer: options.imageBuffer,
      timeoutMs,
      statementMode,
      threshold,
      currentText: text,
      currentProvider: provider,
      currentConfidence: confidence,
      currentFallbackUsed: fallbackUsed,
      fallbackOrder: options.fallbackOrder,
      debug,
    });
    text = fallbackResult.text;
    provider = fallbackResult.provider;
    confidence = fallbackResult.confidence;
    fallbackUsed = fallbackResult.fallbackUsed;
  }

  const fields = extractFields(text);
  const hasTableSignal = /amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)|transaction details/i.test(text);
  return {
    pageIndex: options.pageIndex,
    rawText: text,
    provider,
    confidence,
    fallbackUsed,
    fields,
    tables: hasTableSignal ? [{ pageIndex: options.pageIndex, detected: true }] : [],
    debug,
  };
}

export async function retryOcrPageFallback(args: {
  pageResult: OcrPageResult;
  imageBuffer: Buffer;
  statementMode?: boolean;
  timeoutMs?: number;
  confidenceThreshold?: number;
  fallbackOrder?: OcrFallbackProvider[];
}): Promise<OcrPageResult> {
  const timeoutMs = args.timeoutMs || 25_000;
  const threshold = args.confidenceThreshold ?? 0.75;
  const statementMode = Boolean(args.statementMode);
  const debug: Record<string, any> = {
    ...(args.pageResult.debug || {}),
    retryFallback: true,
    retryStartedAt: new Date().toISOString(),
    providersTried: Array.isArray(args.pageResult.debug?.providersTried)
      ? [...args.pageResult.debug.providersTried]
      : [args.pageResult.provider],
  };
  const retried = await applyFallbackSequence({
    imageBuffer: args.imageBuffer,
    timeoutMs,
    statementMode,
    threshold,
    currentText: args.pageResult.rawText || '',
    currentProvider: args.pageResult.provider,
    currentConfidence: args.pageResult.confidence,
    currentFallbackUsed: args.pageResult.fallbackUsed,
    fallbackOrder: args.fallbackOrder,
    debug,
  });
  const fields = extractFields(retried.text);
  const hasTableSignal = /amounts?\s*deducted|amounts?\s*added|balance\s*\(\$?\)|transaction details/i.test(retried.text);
  return {
    ...args.pageResult,
    rawText: retried.text,
    provider: retried.provider,
    confidence: retried.confidence,
    fallbackUsed: retried.fallbackUsed,
    fields,
    tables: hasTableSignal ? [{ pageIndex: args.pageResult.pageIndex, detected: true }] : [],
    debug,
  };
}

