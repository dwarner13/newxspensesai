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

export interface TxSearchResult {
  transactions: TxSearchRow[];
  totalMatches: number;
  returnedCount: number;
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
 * @returns         - { transactions, totalMatches, returnedCount }
 */
export async function searchTransactions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  params: TxSearchParams
): Promise<TxSearchResult> {
  const limit = Math.max(1, Math.min(HARD_CAP, Number(params.limit) || 25));

  // Build a base query builder so we can reuse filters for both count and data.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function applyFilters(q: any): any {
    q = q.eq('user_id', userId);

    if (params.importId) {
      q = q.eq('import_id', params.importId);
    } else if (params.documentId) {
      q = q.eq('document_id', params.documentId);
    }

    const text = (params.q || '').trim();
    if (text) {
      q = q.or(`merchant_name.ilike.%${text}%,description.ilike.%${text}%`);
    }

    if (params.startDate) q = q.gte('posted_at', params.startDate);
    if (params.endDate) q = q.lte('posted_at', params.endDate);

    if (params.minAmount !== undefined && params.minAmount !== null && Number.isFinite(params.minAmount)) {
      const absMin = Math.abs(params.minAmount);
      q = q.or(`amount.gte.${absMin},amount.lte.${-absMin}`);
    }
    if (params.maxAmount !== undefined && params.maxAmount !== null && Number.isFinite(params.maxAmount)) {
      const absMax = Math.abs(params.maxAmount);
      q = q.gte('amount', -absMax).lte('amount', absMax);
    }

    if (params.uncategorizedOnly) {
      q = q.or('category.is.null,category.eq.Uncategorized');
    } else if (params.category) {
      q = q.eq('category', params.category);
    }

    return q;
  }

  // --- Count query (head-only, no data transfer) ---
  const countQuery = applyFilters(
    supabase.from('transactions').select('id', { count: 'exact', head: true })
  );
  const { count: totalMatches, error: countError } = await countQuery;
  if (countError) throw countError;

  // --- Data query (limited, newest-first) ---
  const dataQuery = applyFilters(
    supabase.from('transactions').select(ALLOWLISTED_FIELDS.join(','))
  )
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  const { data, error } = await dataQuery;
  if (error) throw error;

  // Project to allowlisted shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions = (data || []).map((row: any): TxSearchRow => ({
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

  return {
    transactions,
    totalMatches: totalMatches || 0,
    returnedCount: transactions.length,
  };
}
