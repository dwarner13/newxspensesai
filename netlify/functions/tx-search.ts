import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { normalizeMerchantName, merchantKey } from './_shared/merchantNormalize.js';
import { resolveCategoryOrPassthrough } from '../../src/shared/financial-taxonomy';

// Categories that are internal money movement, NOT real spending. Excluded from
// totals.spending so Prime doesn't report "Transfers" as the #1 expense.
// Mirrors the list in _shared/financial-snapshot.ts and usePrimeBriefingData.ts.
const NON_SPEND_CATEGORIES = new Set([
  'transfers', 'transfer',
  'loan payments', 'loan payment',
  'credit card payments', 'credit card payment',
  'investments', 'investment',
  'debt payments', 'debt payment',
  'income', 'business income',
]);

function isNonSpend(category: string | null | undefined): boolean {
  if (!category) return false;
  return NON_SPEND_CATEGORIES.has(category.trim().toLowerCase());
}

type RequestBody = {
  importId?: string;
  documentId?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  category?: string;
  subcategory?: string;
  uncategorizedOnly?: boolean;
  includePending?: boolean;
  limit?: number;
};

type TxRow = Record<string, any>;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
  return false;
}

async function detectColumn(
  sb: any,
  table: 'transactions' | 'transactions_staging' | 'imports',
  userId: string,
  column: string,
  cache?: Map<string, boolean>
): Promise<boolean> {
  const cacheKey = `${table}:${column}`;
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey) as boolean;
  }

  const { error } = await sb.from(table).select(column).eq('user_id', userId).limit(1);
  if (!error) {
    cache?.set(cacheKey, true);
    return true;
  }
  const code = String((error as any)?.code || '').trim();
  const msg = String(error.message || '').toLowerCase();
  const missing = code === '42703' || msg.includes('does not exist');
  const exists = !missing;
  cache?.set(cacheKey, exists);
  return exists;
}

function pickDateValue(row: TxRow): string | null {
  const raw = row.posted_at || row.date || row.occurred_at || null;
  return raw ? String(raw) : null;
}

function buildSignedAmount(row: TxRow): number {
  let amount = toNumber(row.amount);
  const type = String(row.type || '').toLowerCase();
  const direction = String(row.direction || '').toLowerCase();
  const isDebit =
    row.is_debit === true ||
    direction === 'out' ||
    direction === 'debit' ||
    type === 'debit' ||
    type === 'expense';
  const isCredit =
    direction === 'in' ||
    direction === 'credit' ||
    type === 'credit' ||
    type === 'income';
  if (isDebit && amount > 0) amount = -Math.abs(amount);
  if (isCredit && amount < 0) amount = Math.abs(amount);
  return amount;
}

function normalizePendingRow(row: TxRow): TxRow {
  const data = row?.data_json && typeof row.data_json === 'object' ? row.data_json : {};
  const merchantRaw = data.merchant || null;
  return {
    id: row.id,
    import_id: row.import_id || null,
    parsed_at: row.parsed_at || null,
    date: data.date || data.posted_at || null,
    merchant: merchantRaw,
    merchant_normalized: normalizeMerchantName(merchantRaw),
    description: data.description || null,
    memo: data.memo || null,
    category: data.category || null,
    amount: toNumber(data.amount),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed. Use POST.' }) };
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}') as RequestBody;
    const userId = auth.userId;
    const sb = admin();

    const limit = Math.max(1, Math.min(200, Number(body.limit) || 25));
    const importId = String(body.importId || '').trim() || null;
    const documentId = String(body.documentId || '').trim() || null;
    const q = String(body.q || '').trim();
    const rawCategory = String(body.category || '').trim();
    const rawSubcategory = String(body.subcategory || '').trim();
    const uncategorizedOnly = parseBool(body.uncategorizedOnly);

    // ── Canonical resolver: map natural-language terms to DB taxonomy ──
    // If category is provided, resolve it. If subcategory is provided directly, use as-is.
    let resolvedCategory: { category: string; subcategory?: string; section?: string } | null = null;
    let category = rawCategory;
    let subcategory = rawSubcategory;
    let queryStatus: 'verified' | 'verified_zero' | 'unresolved_category' | 'insufficient_scope' | 'query_error' = 'verified';

    if (rawCategory && !uncategorizedOnly) {
      resolvedCategory = resolveCategoryOrPassthrough(rawCategory);
      if (resolvedCategory) {
        category = resolvedCategory.category;
        // If resolver provides a subcategory and none was explicitly provided, use it
        if (resolvedCategory.subcategory && !rawSubcategory) {
          subcategory = resolvedCategory.subcategory;
        }
      } else {
        // Category term could not be mapped — signal unresolved
        queryStatus = 'unresolved_category';
      }
    }
    const includePending = parseBool(body.includePending);
    const minAmount = Number.isFinite(Number(body.minAmount)) ? Number(body.minAmount) : null;
    const maxAmount = Number.isFinite(Number(body.maxAmount)) ? Number(body.maxAmount) : null;
    const columnCache = new Map<string, boolean>();

    const hasImportId = await detectColumn(sb, 'transactions', userId, 'import_id', columnCache);
    const hasDocumentId = await detectColumn(sb, 'transactions', userId, 'document_id', columnCache);

    const candidateDateCols = ['posted_at', 'date', 'occurred_at'] as const;
    let dateColumn: string | null = null;
    for (const col of candidateDateCols) {
      if (await detectColumn(sb, 'transactions', userId, col, columnCache)) {
        dateColumn = col;
        break;
      }
    }

    const candidateTextCols = ['merchant_name', 'merchant', 'description', 'memo'] as const;
    const textCols: string[] = [];
    for (const col of candidateTextCols) {
      if (await detectColumn(sb, 'transactions', userId, col, columnCache)) {
        textCols.push(col);
      }
    }

    const hasCategory = await detectColumn(sb, 'transactions', userId, 'category', columnCache);
    const hasSubcategory = await detectColumn(sb, 'transactions', userId, 'subcategory', columnCache);
    const hasType = await detectColumn(sb, 'transactions', userId, 'type', columnCache);

    const selectFields = [
      'id',
      'amount',
      hasType ? 'type' : null,
      hasImportId ? 'import_id' : null,
      hasDocumentId ? 'document_id' : null,
      dateColumn,
      ...textCols,
      hasCategory ? 'category' : null,
      hasSubcategory ? 'subcategory' : null,
    ]
      .filter(Boolean)
      .join(',');

    let query = sb.from('transactions').select(selectFields).eq('user_id', userId);
    const orClauses: string[] = [];

    if (importId && hasImportId) {
      query = query.eq('import_id', importId);
    } else if (documentId && hasDocumentId) {
      query = query.eq('document_id', documentId);
    }

    if (q && textCols.length > 0) {
      if (textCols.length === 1) {
        query = query.ilike(textCols[0], `%${q}%`);
      } else {
        orClauses.push(...textCols.map((col) => `${col}.ilike.%${q}%`));
      }
    }

    if (dateColumn) {
      if (body.startDate) query = query.gte(dateColumn, body.startDate);
      if (body.endDate) query = query.lte(dateColumn, body.endDate);
    }

    if (minAmount !== null) {
      const absMin = Math.abs(minAmount);
      orClauses.push(`amount.gte.${absMin}`, `amount.lte.${-absMin}`);
    }
    if (maxAmount !== null) {
      const absMax = Math.abs(maxAmount);
      query = query.gte('amount', -absMax).lte('amount', absMax);
    }

    if (hasCategory) {
      if (uncategorizedOnly) {
        orClauses.push('category.is.null', 'category.eq.Uncategorized');
      } else if (category) {
        query = query.eq('category', category);
      }
    }

    if (hasSubcategory && subcategory && !uncategorizedOnly) {
      query = query.eq('subcategory', subcategory);
    }

    if (orClauses.length > 0) {
      query = query.or(orClauses.join(','));
    }

    query = (dateColumn ? query.order(dateColumn, { ascending: false }) : query.order('id', { ascending: false })).limit(limit);

    const { data: rowsData, error: rowsError } = await query;
    if (rowsError) throw rowsError;

    const rows = (rowsData || []).map((row: TxRow) => {
      const merchantRaw = row.merchant_name || row.merchant || null;
      return {
      id: row.id,
      date: pickDateValue(row),
      merchant: merchantRaw,
      merchant_normalized: normalizeMerchantName(merchantRaw),
      description: row.description || null,
      memo: row.memo || null,
      amount: toNumber(row.amount),
      signed_amount: buildSignedAmount(row),
      category: row.category || null,
      subcategory: row.subcategory || null,
      type: row.type || null,
      import_id: row.import_id || null,
      document_id: row.document_id || null,
      };
    });

    const duplicateCountByKey = new Map<string, number>();
    for (const row of rows) {
      const date = String(row.date || '').trim();
      const vendor = merchantKey(row.merchant_normalized || row.merchant || row.description || '');
      const amount = Math.abs(toNumber(row.amount));
      if (!date || !vendor || !Number.isFinite(amount)) continue;
      const key = `${date}|${vendor}|${amount.toFixed(2)}`;
      duplicateCountByKey.set(key, (duplicateCountByKey.get(key) || 0) + 1);
    }
    const rowsWithDupes = rows.map((row) => {
      const date = String(row.date || '').trim();
      const vendor = merchantKey(row.merchant_normalized || row.merchant || row.description || '');
      const amount = Math.abs(toNumber(row.amount));
      const key = date && vendor && Number.isFinite(amount) ? `${date}|${vendor}|${amount.toFixed(2)}` : null;
      const dupeSize = key ? Number(duplicateCountByKey.get(key) || 0) : 0;
      return {
        ...row,
        possible_duplicate: dupeSize > 1,
        duplicate_group_size: dupeSize > 1 ? dupeSize : undefined,
      };
    });

    const signedAmounts = rowsWithDupes.map((r: TxRow) => toNumber(r.signed_amount));
    const totals = {
      count: rowsWithDupes.length,
      sum: signedAmounts.reduce((acc, n) => acc + n, 0),
      income: signedAmounts.filter((n) => n > 0).reduce((acc, n) => acc + n, 0),
      spending: Math.abs(
        rowsWithDupes
          .filter((r: TxRow) => toNumber(r.signed_amount) < 0 && !isNonSpend(r.category))
          .reduce((acc, r) => acc + toNumber(r.signed_amount), 0)
      ),
    };

    // NON_SPEND-filtered top spending category (backstop for biggest-expense ranking)
    const spendByCategory: Record<string, number> = {};
    for (const r of rowsWithDupes) {
      if (toNumber(r.signed_amount) >= 0) continue;        // only spend rows
      const cat = String(r.category || 'Uncategorized').trim();
      if (isNonSpend(cat)) continue;                        // same filter as totals.spending
      spendByCategory[cat] = (spendByCategory[cat] || 0) + Math.abs(toNumber(r.signed_amount));
    }
    let topSpendCategory: { category: string; amount: number } | null = null;
    for (const [cat, amt] of Object.entries(spendByCategory)) {
      if (!topSpendCategory || amt > topSpendCategory.amount) {
        topSpendCategory = { category: cat, amount: amt };
      }
    }

    let pendingRows: TxRow[] = [];
    if (includePending) {
      const hasPendingImportId = await detectColumn(sb, 'transactions_staging', userId, 'import_id', columnCache);
      const hasPendingDataJson = await detectColumn(sb, 'transactions_staging', userId, 'data_json', columnCache);
      if (hasPendingImportId && hasPendingDataJson) {
        let pendingQuery = sb
          .from('transactions_staging')
          .select('id,import_id,parsed_at,data_json')
          .eq('user_id', userId);

        if (importId) {
          pendingQuery = pendingQuery.eq('import_id', importId);
        } else if (documentId) {
          const { data: importsData } = await sb
            .from('imports')
            .select('id')
            .eq('user_id', userId)
            .eq('document_id', documentId);
          const importIds = (importsData || []).map((r: TxRow) => r.id).filter(Boolean);
          if (importIds.length > 0) {
            pendingQuery = pendingQuery.in('import_id', importIds);
          } else {
            pendingQuery = pendingQuery.eq('import_id', '__none__');
          }
        }

        const { data: pendingData, error: pendingError } = await pendingQuery.order('parsed_at', { ascending: false }).limit(limit * 2);
        if (!pendingError) {
          const normalizedPending = (pendingData || []).map(normalizePendingRow);
          pendingRows = normalizedPending.filter((row: TxRow) => {
            if (q) {
              const hay = `${row.merchant || ''} ${row.description || ''} ${row.memo || ''}`.toLowerCase();
              if (!hay.includes(q.toLowerCase())) return false;
            }
            if (body.startDate && row.date && String(row.date) < body.startDate) return false;
            if (body.endDate && row.date && String(row.date) > body.endDate) return false;
            if (minAmount !== null && Math.abs(toNumber(row.amount)) < Math.abs(minAmount)) return false;
            if (maxAmount !== null && Math.abs(toNumber(row.amount)) > Math.abs(maxAmount)) return false;
            if (uncategorizedOnly) {
              const cat = String(row.category || '');
              if (cat && cat !== 'Uncategorized') return false;
            } else if (category) {
              if (String(row.category || '') !== category) return false;
            }
            return true;
          }).slice(0, limit);
        }
      }
    }

    // Determine final queryStatus: if we got results, it's verified. If zero and no error, verified_zero.
    // unresolved_category was set earlier if the resolver couldn't map the category term.
    if (queryStatus !== 'unresolved_category') {
      queryStatus = rowsWithDupes.length > 0 ? 'verified' : 'verified_zero';
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rows: rowsWithDupes,
        totals,
        topSpendCategory,
        queryStatus,
        resolvedCategory,
        pendingRows,
        meta: {
          usedFilters: {
            importId,
            documentId,
            q: q || null,
            startDate: body.startDate || null,
            endDate: body.endDate || null,
            minAmount,
            maxAmount,
            category: category || null,
            subcategory: subcategory || null,
            uncategorizedOnly,
            includePending,
            limit,
          },
          capabilities: {
            hasImportId,
            hasDocumentId,
            dateColumn,
            textCols,
            hasSubcategory,
          },
        },
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error?.message || 'tx-search failed',
        queryStatus: 'query_error',
      }),
    };
  }
};

