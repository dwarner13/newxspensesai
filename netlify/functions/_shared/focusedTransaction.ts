/**
 * C2-E2A — server-verified focused transaction (NEUTRAL shared module, owner GO 2026-11-25).
 *
 * Shared by Tag (tag-copilot, via the tagFocusedTransaction re-export) and, once Prime HQ adopts it,
 * Prime's server side, so every employee resolves "the transaction the customer is looking at" the
 * same way. Owned jointly: Tag HQ (Tag usage) / Prime HQ (server-side adoption); UI/UX Studio owns
 * how the panel sends the focused id.
 *
 * Tag may be opened "focused" on one transaction (from the Transactions drawer, or from
 * Prime's "Review with Tag"). The browser only supplies the transaction ID; every detail
 * Tag sees (merchant, amount, date, category) is re-read here from the database, scoped to
 * the authenticated user. Browser-supplied financial fields are never trusted.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FocusedTransactionRow = {
  id: string;
  merchant_name: string;
  amount: number;
  posted_at: string | null;
  date: string | null;
  category: string | null;
  subcategory: string | null;
};

export type FocusedTransactionStatus = 'none' | 'invalid_id' | 'not_found' | 'lookup_failed' | 'verified';

type QueryBuilder = {
  select(cols: string): QueryBuilder;
  eq(col: string, val: string): QueryBuilder;
  maybeSingle(): PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;
};
type SupabaseLike = { from(table: string): QueryBuilder };

export async function resolveFocusedTransaction(
  supabase: SupabaseLike,
  userId: string,
  requested: unknown,
): Promise<{ status: FocusedTransactionStatus; row: FocusedTransactionRow | null }> {
  const requestedId = requested && typeof requested === 'object' ? (requested as { id?: unknown }).id : undefined;
  if (requestedId === undefined || requestedId === null || requestedId === '') return { status: 'none', row: null };
  if (typeof requestedId !== 'string' || !UUID_RE.test(requestedId)) return { status: 'invalid_id', row: null };
  if (!userId) return { status: 'not_found', row: null };

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, merchant_name, merchant, description, amount, posted_at, date, category, subcategory')
      .eq('user_id', userId)
      .eq('id', requestedId)
      .maybeSingle();
    if (error) return { status: 'lookup_failed', row: null };
    if (!data) return { status: 'not_found', row: null };
    const merchant = String(data.merchant_name || data.merchant || data.description || '').trim();
    return {
      status: 'verified',
      row: {
        id: String(data.id),
        merchant_name: merchant || 'Transaction',
        amount: Number(data.amount ?? 0),
        posted_at: (data.posted_at as string | null) ?? null,
        date: (data.date as string | null) ?? null,
        category: (data.category as string | null) ?? null,
        subcategory: (data.subcategory as string | null) ?? null,
      },
    };
  } catch {
    return { status: 'lookup_failed', row: null };
  }
}
