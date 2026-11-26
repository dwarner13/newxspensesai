/**
 * S-1 staged-row lifecycle (owner GO 2026-11-26) — SERVER-ONLY.
 *
 * After commit-import copies an import's staging rows into `transactions`, those staging rows stay
 * in `transactions_staging` as read-only history (no deletion, no migration). Nothing may treat them
 * as pending again: no edit, no approve, no Tag write, no "pending" total. The single source of
 * truth for "this import is finished" is `imports.status = 'committed'`.
 *
 * Fail closed: when the status cannot be read, callers must refuse the write (or exclude the rows),
 * never assume "not committed".
 */

export const COMMITTED_IMPORT_STATUS = 'committed';

/** Response body for a refused write on a committed import's staging copy. */
export const IMPORT_COMMITTED_ERROR = {
  error: 'import_committed',
  message: 'This statement is already imported. Edit the transaction itself instead.',
} as const;

// Supabase builders differ per call site; this module only chains select/eq/in.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from(t: string): any };

const CHUNK = 200;

/**
 * Which of `importIds` (owned by `userId`) are committed. `ok: false` when any lookup fails.
 * Ids that are not found for this user are simply absent from `committed` (callers already
 * scope their own rows by user_id).
 */
export async function committedImportIds(
  sb: Db,
  userId: string,
  importIds: Array<string | null | undefined>
): Promise<{ ok: true; committed: Set<string> } | { ok: false }> {
  const ids = [...new Set(importIds.filter((v): v is string => typeof v === 'string' && v.length > 0))];
  const committed = new Set<string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    try {
      const { data, error } = await sb.from('imports').select('id, status').eq('user_id', userId).in('id', chunk);
      if (error) return { ok: false };
      for (const row of (data ?? []) as Array<{ id?: unknown; status?: unknown }>) {
        if (row?.status === COMMITTED_IMPORT_STATUS && typeof row.id === 'string') committed.add(row.id);
      }
    } catch {
      return { ok: false };
    }
  }
  return { ok: true, committed };
}

/** true / false, or null when the status cannot be determined (caller refuses). */
export async function isImportCommitted(sb: Db, userId: string, importId: string | null | undefined): Promise<boolean | null> {
  if (!importId) return false;
  const r = await committedImportIds(sb, userId, [importId]);
  return r.ok ? r.committed.has(importId) : null;
}
