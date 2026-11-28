/**
 * POST /.netlify/functions/ocr-ingest-simple: RETIRED (410).
 *
 * Owner "STATEMENT SECURITY AND IMPLEMENTATION" (2026-11-27): "Authentication alone is insufficient.
 * Require customer ownership and safe server-side document retrieval. Disable obsolete endpoints."
 *
 * This took ANY `imageUrl` or `imageDataUrl` from the request body, unvalidated, and sent it to
 * OpenAI. It had no customer ownership, no type check and no document link. Joint audit with
 * Prime HQ (P5): it is obsolete.
 * - Its only client caller, src/utils/parseReceiptWithAI.ts (ReceiptScanner), sends no Authorization
 *   header, so it already received 401.
 * - ReceiptScanner is mounted only by src/pages/ReceiptScannerPage.tsx, which has no route.
 * It answers 410 for every request before reading the body or credentials, and never calls a provider.
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
