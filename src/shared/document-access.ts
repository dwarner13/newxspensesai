/**
 * Customer document access rules for AI tools (owner "FINAL A-2 APPROVAL" safeguard 2, 2026-11-27):
 * Byte's document tools must enforce customer ownership, temporary access and retention.
 *  - Ownership: the document row belongs to the customer AND its storage object lives under the
 *    customer's own prefix (`<userId>/…`, no path traversal).
 *  - Temporary access: originals are read only through a short-lived signed URL created server-side
 *    for that one object; the model never supplies a URL.
 *  - Retention: originals are temporary (owner U-A decision: 72 hours). After that the original is not
 *    read, even if the object still exists; structured evidence (extracted rows) is unaffected.
 * Shared so U-A (Attachments HQ) and the tools use one definition.
 */

export const ORIGINAL_RETENTION_HOURS = 72;
export const DOCUMENT_SIGNED_URL_TTL_SECONDS = 60;
export const DOCUMENTS_BUCKET = 'docs';

export function isOwnedStoragePath(storagePath: string | null | undefined, userId: string): boolean {
  const p = String(storagePath || '');
  if (!userId || !p) return false;
  return p.startsWith(`${userId}/`) && !p.split('/').some(seg => seg === '..' || seg === '.');
}

/** True while the original is inside the retention window (fails closed on a missing or bad date). */
export function isOriginalWithinRetention(createdAt: string | null | undefined, now: Date = new Date()): boolean {
  const t = createdAt ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(t)) return false;
  const ageMs = now.getTime() - t;
  return ageMs >= 0 && ageMs <= ORIGINAL_RETENTION_HOURS * 3600 * 1000;
}
