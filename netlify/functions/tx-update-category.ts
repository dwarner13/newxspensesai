import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

type RequestBody = {
  id?: string;
  table?: 'transactions' | 'transactions_staging';
  category?: string;
  subcategory?: string | null;
  applyToVendor?: boolean;
  vendor?: string | null;
  disableLearning?: boolean;
};

type LearnedResult = { applied: boolean; method?: string; vendor?: string | null };
type Row = Record<string, any>;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function pickVendor(bodyVendor: unknown, row: Row, table: 'transactions' | 'transactions_staging'): string | null {
  const fromBody = String(bodyVendor || '').trim();
  if (fromBody) return fromBody;
  if (table === 'transactions') {
    return String(row.merchant_name || row.merchant || row.description || '').trim() || null;
  }
  const data = row?.data_json && typeof row.data_json === 'object' ? row.data_json : {};
  return String(data.merchant || data.description || data.memo || '').trim() || null;
}

function buildVendorLearningPayload(vendor: string | null, category: string, subcategory?: string | null): {
  vendor: string | null;
  category: string;
  subcategory: string | null;
} {
  return {
    vendor: vendor ? String(vendor).trim() : null,
    category: String(category || '').trim(),
    subcategory: subcategory ?? null,
  };
}

async function tryVendorLearning(args: {
  userId: string;
  txId: string;
  vendor: string | null;
  oldCategory: string | null;
  category: string;
  subcategory?: string | null;
  authHeader: string;
}): Promise<LearnedResult> {
  const { userId, txId, vendor, oldCategory, category, subcategory, authHeader } = args;
  if (!vendor) return { applied: false, vendor: null };
  const learningPayload = buildVendorLearningPayload(vendor, category, subcategory);

  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';

  // Prefer tag-learn first.
  try {
    const tagLearnRes = await fetch(`${baseUrl}/.netlify/functions/tag-learn`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: authHeader,
        'x-user-id': userId,
      },
      body: JSON.stringify({
        userId,
        transactionId: txId,
        vendor: learningPayload.vendor,
        category: learningPayload.category,
        subcategory: learningPayload.subcategory,
        merchant: learningPayload.vendor,
        oldCategory: oldCategory || 'Uncategorized',
        newCategory: learningPayload.category,
      }),
    });
    if (tagLearnRes.ok) return { applied: true, method: 'tag-learn', vendor };
  } catch {
    // fall through to update-vendor-category
  }

  try {
    const updateVendorRes = await fetch(`${baseUrl}/.netlify/functions/update-vendor-category`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: authHeader,
      },
      body: JSON.stringify({
        userId,
        vendor: learningPayload.vendor,
        category: learningPayload.category,
        subcategory: learningPayload.subcategory,
      }),
    });
    if (updateVendorRes.ok) return { applied: true, method: 'update-vendor-category', vendor };
  } catch {
    // no-op
  }

  return { applied: false, vendor };
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
    const id = String(body.id || '').trim();
    const category = String(body.category || '').trim();
    const table: 'transactions' | 'transactions_staging' =
      body.table === 'transactions_staging' ? 'transactions_staging' : 'transactions';

    if (!id || !category) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields: id, category' }) };
    }

    const sb = admin();
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';

    if (table === 'transactions') {
      const { data: existing, error: existingError } = await sb
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', auth.userId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
      }

      let updatePayload: Record<string, any> = { category };
      if (Object.prototype.hasOwnProperty.call(body, 'subcategory')) {
        updatePayload.subcategory = body.subcategory ?? null;
      }

      let updateError: any = null;
      ({ error: updateError } = await sb
        .from('transactions')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', auth.userId));

      if (updateError) {
        const code = String(updateError.code || '').trim();
        const msgRaw = String(updateError.message || '');
        const msg = msgRaw.toLowerCase();
        const missingColumn = code === '42703' || msg.includes('does not exist');
        if (missingColumn) {
          const colMatch = msgRaw.match(/column\s+"?([a-zA-Z0-9_]+)"?/i);
          const col = colMatch?.[1] || 'unknown_column';
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ error: `Schema mismatch: ${col} missing` }),
          };
        }
      }
      if (updateError) throw updateError;

      const vendor = pickVendor(body.vendor, existing, table);
      const shouldLearnVendor =
        body.disableLearning === true ? false : body.applyToVendor !== false;
      const learned =
        shouldLearnVendor
          ? await tryVendorLearning({
              userId: auth.userId,
              txId: id,
              vendor,
              oldCategory: String(existing.category || '').trim() || null,
              category,
              subcategory: Object.prototype.hasOwnProperty.call(updatePayload, 'subcategory')
                ? (updatePayload.subcategory ?? null)
                : undefined,
              authHeader,
            })
        : { applied: false, vendor: null };
      if (shouldLearnVendor) {
        console.log('[tx-update-category] vendor learning', {
          applied: learned.applied,
          method: learned.method || null,
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          updated: {
            id,
            table,
            category,
            subcategory: Object.prototype.hasOwnProperty.call(updatePayload, 'subcategory')
              ? (updatePayload.subcategory ?? null)
              : null,
          },
          learned,
        }),
      };
    }

    const { data: existing, error: existingError } = await sb
      .from('transactions_staging')
      .select('id,user_id,import_id,parsed_at,data_json')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    const dataJson = existing?.data_json && typeof existing.data_json === 'object'
      ? { ...existing.data_json }
      : {};
    dataJson.category = category;
    if (Object.prototype.hasOwnProperty.call(body, 'subcategory')) {
      dataJson.subcategory = body.subcategory ?? null;
    }

    const { error: updateError } = await sb
      .from('transactions_staging')
      .update({ data_json: dataJson })
      .eq('id', id)
      .eq('user_id', auth.userId);
    if (updateError) throw updateError;

    const vendor = pickVendor(body.vendor, existing, table);
    const shouldLearnVendor =
      body.disableLearning === true ? false : body.applyToVendor !== false;
    const learned =
      shouldLearnVendor
        ? await tryVendorLearning({
            userId: auth.userId,
            txId: id,
            vendor,
            oldCategory: String((existing.data_json || {}).category || '').trim() || null,
            category,
            subcategory: Object.prototype.hasOwnProperty.call(body, 'subcategory') ? (body.subcategory ?? null) : undefined,
            authHeader,
          })
        : { applied: false, vendor: null };
    if (shouldLearnVendor) {
      console.log('[tx-update-category] vendor learning', {
        applied: learned.applied,
        method: learned.method || null,
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        updated: {
          id,
          table,
          category,
            subcategory: Object.prototype.hasOwnProperty.call(body, 'subcategory')
              ? (body.subcategory ?? null)
              : null,
        },
        learned,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || 'tx-update-category failed' }),
    };
  }
};

