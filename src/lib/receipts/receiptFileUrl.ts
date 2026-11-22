/**
 * C2-A2 — resolve receipt file references to short-lived signed URLs.
 *
 * The `receipts` storage bucket is private. Since C2-A2, receipt-upload stores the storage PATH
 * (`<userId>/<timestamp>-<name>`) in `receipts.file_url` / `image_url` instead of a public URL.
 * Older rows hold a `.../storage/v1/object/public/receipts/<path>` URL, which does not load from a
 * private bucket; those are converted back to a path and signed too.
 *
 * Signing uses the signed-in user's own session, so storage policies decide access.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts the app's Supabase client
type SupabaseLike = any;

const PUBLIC_MARKER = '/storage/v1/object/public/receipts/';
const SIGNED_MARKER = '/storage/v1/object/sign/';
export const RECEIPT_SIGNED_URL_TTL_SECONDS = 600;

/** The storage path for a receipt reference, or null if it is not one of ours. */
export function receiptStoragePath(ref: string | null | undefined): string | null {
  const value = String(ref || '').trim();
  if (!value) return null;
  if (/^(data|blob):/i.test(value)) return null;
  if (/^https?:/i.test(value)) {
    try {
      const url = new URL(value);
      const at = url.pathname.indexOf(PUBLIC_MARKER);
      if (at >= 0) return decodeURIComponent(url.pathname.slice(at + PUBLIC_MARKER.length)) || null;
    } catch {
      /* not a URL we understand */
    }
    return null;
  }
  return value.replace(/^\/+/, '');
}

/** True when a reference can be shown as-is (already signed, or a non-storage URL). */
function isDirectlyUsable(ref: string): boolean {
  return /^https?:/i.test(ref) && (ref.includes(SIGNED_MARKER) || !ref.includes(PUBLIC_MARKER));
}

/**
 * Map each reference to a URL the browser can open. References that cannot be signed are omitted.
 */
export async function resolveReceiptFileUrls(
  sb: SupabaseLike,
  refs: Array<string | null | undefined>,
  ttlSeconds = RECEIPT_SIGNED_URL_TTL_SECONDS,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const pathByRef = new Map<string, string>();
  for (const raw of refs) {
    const ref = String(raw || '').trim();
    if (!ref || out.has(ref) || pathByRef.has(ref)) continue;
    if (isDirectlyUsable(ref)) {
      out.set(ref, ref);
      continue;
    }
    const path = receiptStoragePath(ref);
    if (path) pathByRef.set(ref, path);
  }
  if (pathByRef.size === 0 || !sb?.storage) return out;

  const paths = Array.from(new Set(pathByRef.values()));
  try {
    const { data } = await sb.storage.from('receipts').createSignedUrls(paths, ttlSeconds);
    const signedByPath = new Map<string, string>();
    for (const item of Array.isArray(data) ? data : []) {
      if (item?.path && item?.signedUrl && !item?.error) signedByPath.set(item.path, item.signedUrl);
    }
    for (const [ref, path] of pathByRef) {
      const signed = signedByPath.get(path);
      if (signed) out.set(ref, signed);
    }
  } catch {
    /* leave unresolved; callers hide the preview/link */
  }
  return out;
}
