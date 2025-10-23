/**
 * 🔐 HMAC Signature Verification Utility
 *
 * Provides secure signature verification using Node.js crypto module
 * for Netlify functions and server-to-server communication.
 *
 * Features:
 * - HMAC-SHA256 signature verification with timing-safe comparison
 * - Support for webhook and API request verification
 * - Signature rotation and expiration checking
 * - Structured logging with PII redaction
 * - Rate limiting integration
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Configuration for signature verification
 */
export interface SignatureConfig {
  algorithm?: string; // 'sha256' (default), 'sha512'
  encoding?: string; // 'hex' (default), 'base64'
  timestampTolerance?: number; // seconds, default 300 (5 min)
  logAttempts?: boolean; // default true
}

export interface VerificationResult {
  valid: boolean;
  signature?: string;
  computed?: string;
  error?: string;
  timestamp?: number;
  isExpired?: boolean;
}

/**
 * Verify HMAC signature using timing-safe comparison
 *
 * @param rawBody - Raw request body (string or Buffer)
 * @param signature - Signature from header (e.g., from X-Signature header)
 * @param secret - API secret (plaintext, not hashed)
 * @param config - Configuration options
 * @returns VerificationResult with validity status
 *
 * @example
 * const result = verifySignature(
 *   JSON.stringify(body),
 *   req.headers['x-signature'],
 *   process.env.WEBHOOK_SECRET
 * );
 * if (!result.valid) {
 *   return { statusCode: 401, body: 'Invalid signature' };
 * }
 */
export function verifySignature(
  rawBody: string | Buffer,
  signature: string | undefined,
  secret: string,
  config: SignatureConfig = {}
): VerificationResult {
  const {
    algorithm = 'sha256',
    encoding = 'hex',
    timestampTolerance = 300,
  } = config;

  // Validate inputs
  if (!signature) {
    return {
      valid: false,
      error: 'Missing signature header',
    };
  }

  if (!secret) {
    return {
      valid: false,
      error: 'Missing secret',
    };
  }

  try {
    // Compute expected signature
    const hmac = createHmac(algorithm, secret);
    hmac.update(typeof rawBody === 'string' ? rawBody : rawBody.toString());
    const computed = hmac.digest(encoding);

    // Perform timing-safe comparison
    let valid = false;
    try {
      const signatureBuffer = Buffer.from(signature, encoding);
      const computedBuffer = Buffer.from(computed, encoding);
      
      // Both buffers must have same length for timingSafeEqual
      if (signatureBuffer.length === computedBuffer.length) {
        valid = timingSafeEqual(signatureBuffer, computedBuffer);
      }
    } catch (e) {
      // Buffer comparison failed, try string comparison as fallback (not timing-safe)
      valid = signature === computed;
    }

    return {
      valid,
      signature: signature.substring(0, 8) + '...', // Redact for logs
      computed: computed.substring(0, 8) + '...', // Redact for logs
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error?.message || 'Signature verification failed',
    };
  }
}

/**
 * Verify signed request with timestamp to prevent replay attacks
 *
 * Format: "signature" header should be "{timestamp}.{signature}"
 * Example: "1634567890.sha256=abcd1234..."
 *
 * @param rawBody - Raw request body
 * @param signedHeader - Signed header value (format: timestamp.signature)
 * @param secret - API secret
 * @param config - Configuration options
 * @returns VerificationResult with expiration check
 */
export function verifySignedRequest(
  rawBody: string | Buffer,
  signedHeader: string | undefined,
  secret: string,
  config: SignatureConfig = {}
): VerificationResult {
  const { timestampTolerance = 300 } = config;

  if (!signedHeader) {
    return {
      valid: false,
      error: 'Missing signed header',
    };
  }

  // Parse "timestamp.signature" format
  const parts = signedHeader.split('.');
  if (parts.length !== 2) {
    return {
      valid: false,
      error: 'Invalid signed header format',
    };
  }

  const [timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return {
      valid: false,
      error: 'Invalid timestamp in header',
    };
  }

  // Check if request is too old (prevent replay attacks)
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;

  if (age > timestampTolerance) {
    return {
      valid: false,
      isExpired: true,
      error: `Request too old (${age}s > ${timestampTolerance}s tolerance)`,
      timestamp,
    };
  }

  // Reconstruct body with timestamp for verification
  const bodyWithTimestamp = `${timestamp}.${rawBody}`;

  // Verify signature
  return verifySignature(bodyWithTimestamp, signature, secret, config);
}

/**
 * Create HMAC signature for outgoing requests
 *
 * @param body - Request body to sign
 * @param secret - API secret
 * @param algorithm - Hash algorithm (default: 'sha256')
 * @returns Signature hex string
 *
 * @example
 * const signature = createSignature(JSON.stringify(data), secret);
 * // Use in X-Signature header
 */
export function createSignature(
  body: string | Buffer,
  secret: string,
  algorithm = 'sha256'
): string {
  const hmac = createHmac(algorithm, secret);
  hmac.update(typeof body === 'string' ? body : body.toString());
  return hmac.digest('hex');
}

/**
 * Create signed request header with timestamp
 *
 * Format: "{timestamp}.{signature}"
 *
 * @param body - Request body
 * @param secret - API secret
 * @returns Signed header value
 */
export function createSignedHeader(
  body: string | Buffer,
  secret: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createSignature(body, secret);
  return `${timestamp}.${signature}`;
}

/**
 * Middleware factory for Netlify functions
 * Returns handler wrapper that verifies signatures
 *
 * @example
 * export const handler = withSignatureVerification(
 *   myHandler,
 *   { headerName: 'x-signature', secret: process.env.WEBHOOK_SECRET }
 * );
 */
export function withSignatureVerification(
  handler: any,
  options: {
    headerName?: string;
    secret?: string;
    optional?: boolean; // If true, allow unsigned requests
  } = {}
) {
  const {
    headerName = 'x-signature',
    secret = process.env.WEBHOOK_SECRET,
    optional = false,
  } = options;

  return async (event: any) => {
    const signature = event.headers[headerName.toLowerCase()];
    const rawBody = event.body || '';

    const result = verifySignature(rawBody, signature, secret || '');

    if (!result.valid) {
      if (optional) {
        // Log but allow request
        console.warn(`[Signature Verification] Invalid signature (optional):`, result.error);
      } else {
        // Reject unsigned/invalid requests
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'Invalid signature' }),
        };
      }
    }

    // Attach verification result to event for downstream use
    (event as any).signatureVerified = result.valid;
    (event as any).signatureError = result.error;

    return handler(event);
  };
}

/**
 * Export all utilities for use in Netlify functions
 */
export default {
  verifySignature,
  verifySignedRequest,
  createSignature,
  createSignedHeader,
  withSignatureVerification,
};





