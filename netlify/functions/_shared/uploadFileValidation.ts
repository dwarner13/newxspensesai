/**
 * C2-A2 — shared validation for base64 file payloads sent in JSON bodies (SERVER-ONLY).
 *
 * Used by endpoints that receive a whole file inline (openai-vision, parse-pdf, receipt-upload).
 * The declared MIME type and file name are client-controlled, so the real type is decided from
 * the file's leading bytes ("magic bytes"), and the size is checked before decoding.
 *
 * Never logs or returns file contents.
 */

export type DetectedFileType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'image/heic'
  | 'application/pdf';

/**
 * Netlify synchronous functions reject request bodies above ~6 MB. Base64 inflates a file by 4/3,
 * so ~4.5 MiB of file is the most that can arrive inline anyway. Enforcing it here turns an
 * opaque platform failure into a clear 413 and protects local dev, which has no such cap.
 */
export const MAX_INLINE_UPLOAD_BYTES = 4.5 * 1024 * 1024;

export const IMAGE_TYPES_FOR_VISION: readonly DetectedFileType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1', 'heif']);

export function detectFileType(buf: Buffer): DetectedFileType | null {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 6) {
    const head6 = buf.subarray(0, 6).toString('latin1');
    if (head6 === 'GIF87a' || head6 === 'GIF89a') return 'image/gif';
  }
  if (buf.length >= 12) {
    if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
      return 'image/webp';
    }
    if (buf.subarray(4, 8).toString('latin1') === 'ftyp' && HEIC_BRANDS.has(buf.subarray(8, 12).toString('latin1'))) {
      return 'image/heic';
    }
  }
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

export type DecodedUpload = { ok: true; buffer: Buffer; mime: DetectedFileType };
export type UploadRejection = {
  ok: false;
  status: 400 | 413 | 415;
  code: 'MISSING_FILE' | 'INVALID_ENCODING' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_FILE_TYPE';
  message: string;
};

/** Type guard that narrows reliably whether or not strictNullChecks is enabled. */
export function isUploadRejection(result: DecodedUpload | UploadRejection): result is UploadRejection {
  return result.ok === false;
}

const BASE64_BODY = /^[A-Za-z0-9+/_-]*={0,2}$/;

/**
 * Decode a base64 payload (raw base64 or a `data:<mime>;base64,` URL), enforce the size cap
 * before allocating, and verify the real file type against an allowlist.
 */
export function decodeBase64Upload(
  input: unknown,
  opts: { allowed: readonly DetectedFileType[]; maxBytes?: number },
): DecodedUpload | UploadRejection {
  const maxBytes = opts.maxBytes ?? MAX_INLINE_UPLOAD_BYTES;
  if (typeof input !== 'string' || input.trim().length === 0) {
    return { ok: false, status: 400, code: 'MISSING_FILE', message: 'No file data provided.' };
  }

  let payload = input.trim();
  if (payload.startsWith('data:')) {
    const comma = payload.indexOf(',');
    const header = comma > 0 ? payload.slice(0, comma) : '';
    if (comma < 0 || !/;base64$/i.test(header)) {
      return { ok: false, status: 400, code: 'INVALID_ENCODING', message: 'File must be base64 encoded.' };
    }
    payload = payload.slice(comma + 1);
  }
  payload = payload.replace(/\s+/g, '');

  // Size check before decoding: every 4 base64 chars carry 3 bytes.
  const estimatedBytes = Math.floor((payload.length * 3) / 4);
  if (estimatedBytes > maxBytes + 2) {
    return {
      ok: false,
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: `File is too large. Maximum size is ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
    };
  }
  if (payload.length === 0 || !BASE64_BODY.test(payload)) {
    return { ok: false, status: 400, code: 'INVALID_ENCODING', message: 'File must be base64 encoded.' };
  }

  const buffer = Buffer.from(payload, 'base64');
  if (buffer.length === 0) {
    return { ok: false, status: 400, code: 'INVALID_ENCODING', message: 'File must be base64 encoded.' };
  }
  if (buffer.length > maxBytes) {
    return {
      ok: false,
      status: 413,
      code: 'FILE_TOO_LARGE',
      message: `File is too large. Maximum size is ${(maxBytes / (1024 * 1024)).toFixed(1)} MB.`,
    };
  }

  const mime = detectFileType(buffer);
  if (!mime || !opts.allowed.includes(mime)) {
    return { ok: false, status: 415, code: 'UNSUPPORTED_FILE_TYPE', message: 'This file type is not supported.' };
  }
  return { ok: true, buffer, mime };
}

/**
 * Make a client-supplied file name safe to use as the last segment of a storage path.
 * Strips directory parts and anything outside a conservative character set.
 */
export function sanitizeStorageFileName(name: unknown, fallbackExt = ''): string {
  const raw = typeof name === 'string' ? name : '';
  const base = raw.split(/[\\/]/).pop() || '';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[._]+/, '')
    .slice(-120);
  return cleaned || `file${fallbackExt}`;
}

export const EXTENSION_FOR_TYPE: Record<DetectedFileType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};
