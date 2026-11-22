/**
 * POST /.netlify/functions/openai-vision
 *
 * Extracts text from an image using OpenAI's multimodal chat completions.
 * No DB writes, no schema dependencies.
 *
 * C2-A2 hardening:
 *  - Requires a valid Supabase JWT (Authorization: Bearer <token>). Before C2-A2 the endpoint
 *    had no auth, so anyone could spend the OpenAI key.
 *  - Rate limited per VERIFIED user id (not a client header).
 *  - Accepts only inline images (raw base64 or data URL) of JPEG/PNG/GIF/WebP, checked by
 *    magic bytes, capped at MAX_INLINE_UPLOAD_BYTES. Remote URLs are rejected.
 *  - The prompt is server-owned; a client `prompt` field is ignored.
 *  - Errors never echo provider messages; image contents and extracted text are never logged.
 *
 * Input JSON:
 *   imageDataUrl  – data URL (data:image/jpeg;base64,...)  or
 *   image         – raw base64 or data URL (legacy key from ocrService.ts)
 *
 * Required env:
 *   OPENAI_API_KEY
 * Optional env:
 *   OPENAI_VISION_MODEL  (default: gpt-4o-mini)
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import OpenAI from 'openai';
import { corsHeaders, jsonResponse, parseJson } from './_shared/http.js';
import { withRateLimit, getPresetOptions } from './_shared/rate-limit-v2.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { decodeBase64Upload, IMAGE_TYPES_FOR_VISION, isUploadRejection } from './_shared/uploadFileValidation.js';

const SERVER_PROMPT = 'Extract all readable text from this image.';
const VERIFIED_USER_KEY = '__c2a2VerifiedUserId';

const extractHandler = async (event: HandlerEvent) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonResponse(500, {
      ok: false,
      error: { code: 'MISSING_API_KEY', message: 'Image text extraction is not configured.' },
    });
  }

  const body = parseJson(event);
  if (typeof body.imageUrl === 'string' && body.imageUrl.trim() && !body.imageDataUrl && !body.image) {
    return jsonResponse(400, {
      ok: false,
      error: { code: 'URL_NOT_ALLOWED', message: 'Send the image inline (base64), not as a URL.' },
    });
  }
  const imageInput = body.imageDataUrl ?? body.image;
  if (typeof imageInput === 'string' && /^https?:/i.test(imageInput.trim())) {
    return jsonResponse(400, {
      ok: false,
      error: { code: 'URL_NOT_ALLOWED', message: 'Send the image inline (base64), not as a URL.' },
    });
  }

  const decoded = decodeBase64Upload(imageInput, { allowed: IMAGE_TYPES_FOR_VISION });
  if (isUploadRejection(decoded)) {
    return jsonResponse(decoded.status, { ok: false, error: { code: decoded.code, message: decoded.message } });
  }
  // Rebuild the data URL from the verified type so a mislabelled payload cannot pass through.
  const resolvedUrl = `data:${decoded.mime};base64,${decoded.buffer.toString('base64')}`;

  try {
    const openai = new OpenAI({ apiKey });
    const model = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: SERVER_PROMPT },
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
  } catch (err: unknown) {
    const info = (err && typeof err === 'object' ? err : {}) as { status?: unknown; code?: unknown };
    console.error('[openai-vision] OpenAI call failed', { status: info.status ?? null, code: info.code ?? null });
    return jsonResponse(502, {
      ok: false,
      error: { code: 'OPENAI_ERROR', message: 'Image text extraction failed. Please try again.' },
    });
  }
};

const rateLimitedExtract = withRateLimit(extractHandler, {
  key: 'openai-vision',
  ...getPresetOptions('export'),
  // Only ever invoked after verifyAuth, so the verified id is always present.
  keyFn: (event: Record<string, unknown>) => `user:${String(event?.[VERIFIED_USER_KEY] || 'unverified')}`,
});

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST is accepted.' },
    });
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return jsonResponse(401, { ok: false, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } });
  }

  return rateLimitedExtract({ ...event, [VERIFIED_USER_KEY]: auth.userId }, context);
};
