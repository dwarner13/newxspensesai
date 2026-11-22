// netlify/functions/parse-pdf.ts
//
// Simple text extraction for PDFs that have a text layer.
//
// C2-A2 hardening:
//  - Requires a valid Supabase JWT. Before C2-A2 the endpoint had no auth and allowed any origin.
//  - Rate limited per VERIFIED user id.
//  - Accepts only real PDFs (magic bytes), capped at MAX_INLINE_UPLOAD_BYTES.
//  - Errors are generic: no exception messages or stack traces are returned, and PDF contents
//    are never logged.
import type { Handler, HandlerEvent } from '@netlify/functions';
import { corsHeaders, jsonResponse, parseJson } from './_shared/http.js';
import { withRateLimit, getPresetOptions } from './_shared/rate-limit-v2.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { decodeBase64Upload, isUploadRejection } from './_shared/uploadFileValidation.js';

const VERIFIED_USER_KEY = '__c2a2VerifiedUserId';

const extractTextFromPdfBuffer = (buffer: Buffer): string => {
  const text = buffer.toString('latin1');

  // Look for text content in PDF streams
  const textMatches = text.match(/\(([^)]+)\)/g);
  if (!textMatches) {
    return '';
  }

  // Extract text from matches and clean up
  const extractedText = textMatches
    .map(match => match.slice(1, -1)) // Remove parentheses
    .filter(str => str.length > 0 && !/^[\s\d\-.]+$/.test(str)) // Filter out numbers and whitespace
    .join(' ')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return extractedText;
};

const parseHandler = async (event: HandlerEvent) => {
  try {
    const body = parseJson(event);
    const decoded = decodeBase64Upload(body.file ?? body.base64, { allowed: ['application/pdf'] });
    if (isUploadRejection(decoded)) {
      return jsonResponse(decoded.status, { success: false, error: decoded.message, code: decoded.code });
    }

    const extractedText = extractTextFromPdfBuffer(decoded.buffer);
    return jsonResponse(200, {
      success: true,
      text: extractedText,
      length: extractedText.length,
    });
  } catch (error: unknown) {
    console.error('[parse-pdf] extraction failed', { name: error instanceof Error ? error.name : 'Error' });
    return jsonResponse(500, { success: false, error: 'Failed to process PDF' });
  }
};

const rateLimitedParse = withRateLimit(parseHandler, {
  key: 'parse-pdf',
  ...getPresetOptions('normal'),
  // Only ever invoked after verifyAuth, so the verified id is always present.
  keyFn: (event: Record<string, unknown>) => `user:${String(event?.[VERIFIED_USER_KEY] || 'unverified')}`,
});

export const handler: Handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  return rateLimitedParse({ ...event, [VERIFIED_USER_KEY]: auth.userId }, context);
};
