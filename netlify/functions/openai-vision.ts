/**
 * POST /.netlify/functions/openai-vision: RETIRED (410).
 *
 * Owner "STATEMENT SECURITY AND IMPLEMENTATION" (2026-11-27): "Authentication alone is insufficient.
 * Require customer ownership and safe server-side document retrieval. Disable obsolete endpoints."
 *
 * This was a generic, authenticated OpenAI image pass-through. It was not tied to a customer document
 * (no ownership row, no retention, no masking). Joint audit with Prime HQ (P5): no live flow calls it.
 * Its only client caller, src/utils/ocrService.ts extractTextWithOpenAIVision, is never invoked, and
 * receipts use receipt-upload. It answers 410 for every request before reading the body or
 * credentials, and never calls a provider.
 *
 * If image reading is needed again, use the customer-document pattern of
 * src/agent/tools/impl/vision_ocr_light.ts: documentId only, ownership (row + storage prefix),
 * a server-created short-lived signed URL, 72-hour original retention, and masking that fails closed.
 * The previous implementation is in git history (before this commit).
 */

import type { Handler } from '@netlify/functions';
import { corsHeaders, jsonResponse } from './_shared/http.js';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  return jsonResponse(410, {
    ok: false,
    error: { code: 'ENDPOINT_RETIRED', message: 'This endpoint is no longer available.' },
  });
};
