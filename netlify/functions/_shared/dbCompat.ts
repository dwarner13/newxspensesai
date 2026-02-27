/**
 * Database compatibility helpers — single source of truth.
 *
 * Use these to detect Supabase/PostgREST schema-drift errors and degrade
 * gracefully instead of returning 500.  Import this instead of duplicating
 * the detection logic in individual function files.
 */

/**
 * Returns true when a Supabase/PostgREST error indicates a column does not
 * exist in the schema cache.  Callers should strip the offending field from
 * their update payload and retry, or fall back to a metadata-only write.
 */
export function isMissingColumnError(error: unknown): boolean {
  if (!error) return false;
  const code = String((error as any)?.code ?? '');
  const message = String((error as any)?.message ?? '').toLowerCase();
  return (
    code === 'PGRST204' ||
    message.includes('schema cache') ||
    (message.includes('column') && message.includes('does not exist')) ||
    (message.includes("could not find the '") && message.includes('column'))
  );
}

/**
 * Extract the missing column name from a PostgREST schema-cache error.
 *
 * @param error     - The Supabase error object (or raw message string).
 * @param tableName - Optional table name used to narrow the strict regex.
 * @returns The column name, or null if the error format is unrecognised.
 */
export function extractMissingColumnName(
  error: unknown,
  tableName?: string
): string | null {
  const msg = String((error as any)?.message ?? error ?? '');
  if (!msg.toLowerCase().includes("could not find")) return null;
  if (tableName) {
    const strict = msg.match(
      new RegExp(
        `Could not find the '([^']+)' column of '${tableName}' in the schema cache`,
        'i'
      )
    );
    if (strict?.[1]) return strict[1];
  }
  const loose = msg.match(/Could not find the '([^']+)'/i);
  return loose?.[1] ?? null;
}
