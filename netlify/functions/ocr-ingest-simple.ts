/**
 * POST /.netlify/functions/ocr-ingest-simple
 *
 * Parses a receipt / financial document into structured fields using OpenAI.
 * Accepts either pre-extracted text or an image (which is first run through
 * the vision model to extract text, then parsed).
 *
 * No DB writes, no schema dependencies.
 *
 * Input JSON (at least one field required):
 *   ocrText      – pre-extracted OCR text (used by parseReceiptWithAI.ts)
 *   text         – alias for ocrText
 *   imageDataUrl – full data URL  (data:image/jpeg;base64,...)
 *   imageUrl     – public https:// URL
 *   docType      – optional hint ("receipt" | anything); default "receipt"
 *
 * Success response:
 *   { ok: true, extractedText, receipt: { merchant, date, total, currency, tax, items } }
 *
 * Error response:
 *   { ok: false, error: { code, message } }
 *
 * Required env:
 *   OPENAI_API_KEY
 * Optional env:
 *   OPENAI_VISION_MODEL   (default: gpt-4o-mini)
 *   OPENAI_CHAT_MODEL     (default: gpt-4o-mini)
 */

import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { corsHeaders, jsonResponse } from './_shared/http.js';

// ── Vision helper ────────────────────────────────────────────────────────────

async function extractTextFromImage(
  openai: OpenAI,
  imageInput: string,
  model: string,
): Promise<string> {
  const resolvedUrl =
    imageInput.startsWith('data:') || imageInput.startsWith('http')
      ? imageInput
      : `data:image/jpeg;base64,${imageInput}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all readable text from this image, preserving line structure.',
          },
          { type: 'image_url', image_url: { url: resolvedUrl, detail: 'high' } },
        ],
      },
    ],
    max_tokens: 2000,
  });

  return completion.choices[0]?.message?.content ?? '';
}

// ── Receipt parser ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a receipt parser. Extract structured data from the provided text.
Return ONLY valid JSON that matches this exact shape (use null for any field you cannot find):
{
  "merchant": "string or null",
  "date": "YYYY-MM-DD or null",
  "total": 0.00,
  "currency": "3-letter code or null",
  "tax": 0.00,
  "items": [
    { "description": "string", "qty": 1, "unitPrice": 0.00, "lineTotal": 0.00 }
  ]
}
Rules:
- total is the final amount charged (including tax).
- tax is the tax amount if shown, else null.
- items may be an empty array if individual line items are not identifiable.
- All numeric fields must be numbers (not strings). Null is allowed.`;

interface ReceiptData {
  merchant: string | null;
  date: string | null;
  total: number | null;
  currency: string | null;
  tax: number | null;
  items: Array<{
    description: string;
    qty: number | null;
    unitPrice: number | null;
    lineTotal: number | null;
  }>;
}

async function parseReceipt(openai: OpenAI, text: string, model: string): Promise<ReceiptData> {
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw) as ReceiptData;
    return {
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      total: typeof parsed.total === 'number' ? parsed.total : null,
      currency: parsed.currency ?? null,
      tax: typeof parsed.tax === 'number' ? parsed.tax : null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { merchant: null, date: null, total: null, currency: null, tax: null, items: [] };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const handler: Handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is accepted.' },
    });
  }

  // API key guard
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      ok: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'OPENAI_API_KEY environment variable is not set.',
      },
    });
  }

  // Parse input - inline to avoid any shared-helper caching issues.
  // Handles: plain string body, base64-encoded body, pre-parsed object body.
  let body: Record<string, unknown> = {};
  try {
    const candidate = event.body ?? (event as any).rawBody ?? '';
    if (typeof candidate === 'object' && candidate !== null) {
      body = candidate as Record<string, unknown>;
    } else {
      let raw = String(candidate);
      if (event.isBase64Encoded) {
        raw = Buffer.from(raw, 'base64').toString('utf8');
      }
      raw = raw.replace(/^\uFEFF/, '').trim();
      if (raw) body = JSON.parse(raw);
    }
  } catch (parseErr: any) {
    // body stays {} - log so we can see what failed
    console.error('[ocr-ingest-simple] body parse failed:',
      parseErr?.message,
      '| first 80 chars of raw body:',
      String(event.body ?? '').slice(0, 80));
  }

  // Debug - helps diagnose body-parsing failures without logging full content
  console.log('[ocr-ingest-simple] content-type:',
    event.headers?.['content-type'] ??
    event.headers?.['Content-Type']);
  console.log('[ocr-ingest-simple] bodyType:',
    typeof event.body,
    'bodyLen:',
    typeof event.body === 'string' ? event.body.length : -1,
    'parsedKeys:',
    Object.keys(body ?? {}));

  // Type-safe normalization - String(undefined) produces "undefined", so guard first
  const textInputRaw =
    (typeof body.ocrText === 'string' ? body.ocrText : '') ||
    (typeof body.text === 'string' ? body.text : '');

  const imageInputRaw =
    (typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '') ||
    (typeof body.imageUrl === 'string' ? body.imageUrl : '');

  const textInput = textInputRaw.trim();
  const imageInput = imageInputRaw.trim();

  if (!textInput && !imageInput) {
    return jsonResponse(400, {
      ok: false,
      error: {
        code: 'MISSING_INPUT',
        message: 'Provide ocrText, text, imageDataUrl, or imageUrl in the request body.',
      },
    });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const visionModel = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';
    const chatModel = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';

    // Step 1: get text (extract from image if needed)
    let extractedText = textInput;
    if (!extractedText && imageInput) {
      extractedText = await extractTextFromImage(openai, imageInput, visionModel);
    }

    // Step 2: parse receipt fields from text
    const receipt = await parseReceipt(openai, extractedText, chatModel);

    return jsonResponse(200, {
      ok: true,
      extractedText,
      receipt,
    });
  } catch (err: any) {
    console.error('[ocr-ingest-simple] OpenAI error:', err?.message ?? err);
    return jsonResponse(500, {
      ok: false,
      error: {
        code: 'OPENAI_ERROR',
        message: err?.message ?? 'OpenAI API call failed.',
      },
    });
  }
};
