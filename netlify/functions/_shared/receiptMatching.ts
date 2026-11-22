/**
 * C2-A2 — receipt ↔ transaction matching and linking (SERVER-ONLY).
 *
 * Shared by receipt-upload and receipt-match. Both run with the service-role client (no RLS),
 * so every read and write here is scoped by the VERIFIED user id:
 *  - a transaction id supplied by the client is only used after it is proven to belong to the user;
 *  - link updates filter by both id AND user_id, so a forged id updates nothing;
 *  - the merchant name (read by OCR from an untrusted receipt image) is passed as a plain filter
 *    VALUE with LIKE wildcards escaped, never spliced into a PostgREST `.or()` filter string.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js builder types are not exported in a usable form
type Sb = any;

export type ReceiptMatchCandidate = {
  id: string;
  merchant_name: string | null;
  amount: number | string | null;
  date: string | null;
};

const TX_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const MAX_MERCHANT_SEARCH_LEN = 80;

export function isPlausibleTransactionId(value: unknown): value is string {
  return typeof value === 'string' && TX_ID_PATTERN.test(value);
}

/** Escape LIKE/ILIKE wildcards so the value matches literally. PostgREST also treats `*` as `%`. */
export function escapeLikeValue(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`).replace(/\*/g, ' ');
}

/** Normalise an OCR'd merchant name into a safe, bounded search term (or null if unusable). */
export function toMerchantSearchTerm(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  // Drop control characters, then collapse whitespace.
  // eslint-disable-next-line no-control-regex -- intentionally stripping control characters
  const cleaned = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_MERCHANT_SEARCH_LEN);
  return cleaned.length >= 2 ? cleaned : null;
}

/** True only when the transaction exists AND belongs to userId. */
export async function verifyTransactionOwnership(sb: Sb, userId: string, transactionId: unknown): Promise<boolean> {
  if (!userId || !isPlausibleTransactionId(transactionId)) return false;
  const { data, error } = await sb
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .maybeSingle();
  return !error && Boolean(data?.id);
}

/**
 * Find the user's transactions that plausibly match a receipt. Two value-bound ILIKE queries
 * (merchant_name, description) replace the old string-built `.or()` filter.
 */
export async function findReceiptMatchCandidates(
  sb: Sb,
  userId: string,
  input: { merchantName: unknown; amount: unknown; receiptDate?: unknown },
  limit: number,
): Promise<ReceiptMatchCandidate[]> {
  const term = toMerchantSearchTerm(input.merchantName);
  const amount = Number(input.amount);
  if (!userId || !term || !Number.isFinite(amount)) return [];

  let dateFrom: string | null = null;
  let dateTo: string | null = null;
  if (input.receiptDate) {
    const d = new Date(String(input.receiptDate));
    if (Number.isNaN(d.getTime())) return []; // previous behaviour: an unparseable date matched nothing
    dateFrom = new Date(d.getTime() - 5 * 86400000).toISOString().split('T')[0];
    dateTo = new Date(d.getTime() + 5 * 86400000).toISOString().split('T')[0];
  }

  const pattern = `%${escapeLikeValue(term)}%`;
  const run = async (column: 'merchant_name' | 'description') => {
    let q = sb
      .from('transactions')
      .select('id, merchant_name, amount, date')
      .eq('user_id', userId)
      .ilike(column, pattern)
      .gte('amount', amount - 1.0)
      .lte('amount', amount + 1.0);
    if (dateFrom && dateTo) q = q.gte('date', dateFrom).lte('date', dateTo);
    const { data } = await q.order('date', { ascending: false }).limit(limit);
    return (Array.isArray(data) ? data : []) as ReceiptMatchCandidate[];
  };

  const [byMerchant, byDescription] = await Promise.all([run('merchant_name'), run('description')]);
  const seen = new Set<string>();
  const merged: ReceiptMatchCandidate[] = [];
  for (const row of [...byMerchant, ...byDescription]) {
    if (!row?.id || seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
  }
  merged.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return merged.slice(0, limit);
}

/**
 * Link a receipt to a transaction. Both updates are scoped by user_id; returns false (and links
 * nothing visible to another user) if the transaction is not the user's.
 */
export async function linkReceiptToTransaction(
  sb: Sb,
  userId: string,
  receiptId: string,
  transactionId: string,
  matchConfidence: number,
): Promise<boolean> {
  const { data: txRows, error: txError } = await sb
    .from('transactions')
    .update({ receipt_id: receiptId, has_receipt: true })
    .eq('id', transactionId)
    .eq('user_id', userId)
    .select('id');
  if (txError || !Array.isArray(txRows) || txRows.length === 0) return false;

  await sb
    .from('receipts')
    .update({ transaction_id: transactionId, match_status: 'matched', match_confidence: matchConfidence })
    .eq('id', receiptId)
    .eq('user_id', userId);
  return true;
}
