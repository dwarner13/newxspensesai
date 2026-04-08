/**
 * POST /.netlify/functions/openai-vision
 *
 * Extracts text from an image using OpenAI's multimodal chat completions.
 * No DB writes, no schema dependencies.
 *
 * Input JSON (one of the image fields is required):
 *   imageDataUrl  – full data URL  (data:image/jpeg;base64,...)
 *   imageUrl      – public https:// URL
 *   image         – same as imageDataUrl (legacy key from ocrService.ts)
 *   prompt        – optional; defaults to "Extract all readable text from this image."
 *
 * Required env:
 *   OPENAI_API_KEY
 * Optional env:
 *   OPENAI_VISION_MODEL  (default: gpt-4o-mini)
 */

import type { Handler } from '@netlify/functions';
import OpenAI from 'openai';
import { corsHeaders, jsonResponse, parseJson } from './_shared/http.js';

const DEFAULT_PROMPT = 'Extract all readable text from this image.';

export const handler: Handler = async (event) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is accepted.' },
    });
  }

  // ── API key guard ───────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      ok: false,
      error: { code: 'MISSING_API_KEY', message: 'OPENAI_API_KEY environment variable is not set.' },
    });
  }

  // ── Parse input ─────────────────────────────────────────────────────────────
  const body = parseJson(event);
  // Accept imageDataUrl, imageUrl, or legacy `image` key (ocrService.ts uses `image`)
  const imageInput =
    (body.imageDataUrl as string) ||
    (body.imageUrl as string) ||
    (body.image as string) ||
    '';
  const prompt = (body.prompt as string) || DEFAULT_PROMPT;

  if (!imageInput) {
    return jsonResponse(400, {
      ok: false,
      error: {
        code: 'MISSING_IMAGE',
        message: 'Provide imageDataUrl, imageUrl, or image in the request body.',
      },
    });
  }

  // ── Resolve image URL for OpenAI ────────────────────────────────────────────
  // OpenAI accepts: full data URLs (data:...), public https URLs, or raw base64
  // wrapped as a data URL.
  let resolvedUrl: string;
  if (imageInput.startsWith('data:') || imageInput.startsWith('http')) {
    resolvedUrl = imageInput;
  } else {
    // Raw base64 - wrap as a generic JPEG data URL so OpenAI can decode it.
    resolvedUrl = `data:image/jpeg;base64,${imageInput}`;
  }

  // ── Call OpenAI ─────────────────────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: resolvedUrl, detail: 'high' } },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const text = completion.choices[0]?.message?.content ?? '';
    return jsonResponse(200, {
      ok: true,
      text,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error('[openai-vision] OpenAI error:', err?.message ?? err);
    return jsonResponse(500, {
      ok: false,
      error: {
        code: 'OPENAI_ERROR',
        message: err?.message ?? 'OpenAI API call failed.',
      },
    });
  }
};
