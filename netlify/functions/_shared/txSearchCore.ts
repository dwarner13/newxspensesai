/**
 * Shared transaction search logic.
 *
 * Used by:
 *   - tx-search.ts (Prime's HTTP endpoint)
 *   - tag-copilot.ts (Tag's search_transactions tool)
 *
 * Security: userId is ALWAYS injected server-side from verifyAuth().
 * Callers must never accept userId from model/client parameters.
 */

export interface TxSearchParams {
  q?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  importId?: string;
  documentId?: string;
  uncategorizedOnly?: boolean;
  limit?: number;
}

export interface TxSearchRow {
  id: string;
  merchant_name: string | null;
  amount: number;
  category: string | null;
  subcategory: string | null;
  posted_at: string | null;
  date: string | null;
  description: string | null;
  import_id: string | null;
}

const HARD_CAP = 200;

const ALLOWLISTED_FIELDS = [
  'id',
  'merchant_name',
  'amount',
  'category',
  'subcategory',
  'posted_at',
  'date',
  'description',
  'import_id',
] as const;

/**
 * Execute a user-scoped transaction search against Supabase.
 *
 * @param supabase  - Supabase admin client (service role)
 * @param userId    - Authenticated user ID (from verifyAuth, NEVER from model)
 * @param params    - Search filters
 * @returns         - Matching transaction rows (max 200)
 */
export async function searchTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  params: TxSearchParams
): Promise<TxSearchRow[]> {
  const limit = Math.max(1, Math.min(HARD_CAP, Number(params.limit) || 50));

  let query = supabase
    .from('transactions')
    .select(ALLOWLISTED_FIELDS.join(','))
    .eq('user_id', userId);

  // --- Scope filters ---
  if (params.importId) {
    query = query.eq('import_id', params.importId);
  } else if (params.documentId) {
    query = query.eq('document_id', params.documentId);
  }

  // --- Text search (merchant_name + description) ---
  const q = (params.q || '').trim();
  if (q) {
    query = query.or(
      `merchant_name.ilike.%${q}%,description.ilike.%${q}%`
    );
  }

  // --- Date range ---
  if (params.startDate) query = query.gte('posted_at', params.startDate);
  if (params.endDate) query = query.lte('posted_at', params.endDate);

  // --- Amount range (absolute value matching) ---
  if (params.minAmount !== undefined && params.minAmount !== null && Number.isFinite(params.minAmount)) {
    const absMin = Math.abs(params.minAmount);
    query = query.or(`amount.gte.${absMin},amount.lte.${-absMin}`);
  }
  if (params.maxAmount !== undefined && params.maxAmount !== null && Number.isFinite(params.maxAmount)) {
    const absMax = Math.abs(params.maxAmount);
    query = query.gte('amount', -absMax).lte('amount', absMax);
  }

  // --- Category filters ---
  if (params.uncategorizedOnly) {
    query = query.or('category.is.null,category.eq.Uncategorized');
  } else if (params.category) {
    query = query.eq('category', params.category);
  }

  // --- Order + limit ---
  query = query
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  // Project to allowlisted shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any): TxSearchRow => ({
    id: row.id,
    merchant_name: row.merchant_name || null,
    amount: Number(row.amount || 0),
    category: row.category || null,
    subcategory: row.subcategory || null,
    posted_at: row.posted_at || null,
    date: row.date || null,
    description: row.description || null,
    import_id: row.import_id || null,
  }));
}
