import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { learnFromCorrection } from './_shared/tag-learning.js';

type RequestBody = {
  id?: string;
  table?: 'transactions' | 'transactions_staging';
  category?: string;
  subcategory?: string | null;
  applyToVendor?: boolean;
  vendor?: string | null;
  disableLearning?: boolean;
};

type LearnedResult = { applied: boolean; method?: string; vendor?: string | null; memory?: 'saved' | 'failed' | 'skipped' };

/**
 * Reliability round 2 (owner GO 2026-11-25), item 3: this endpoint is the CUSTOMER's manual category
 * edit (transaction drawer, category drawer). It records the genuine customer source 'user_edit'.
 * An AI tool must never use it to claim customer approval: server-side AI callers identify themselves
 * with this header and are refused (AI changes go through Tag's signed proposal → customer "yes").
 */
export const AI_ORIGIN_HEADER = 'x-xai-origin';
export const CUSTOMER_EDIT_SOURCE = 'user_edit';
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


async function tryVendorLearning(args: {
  sb: ReturnType<typeof admin>;
  userId: string;
  txId: string;
  vendor: string | null;
  oldCategory: string | null;
  category: string;
}): Promise<LearnedResult> {
  const { sb, userId, txId, vendor, oldCategory, category } = args;
  if (!vendor) return { applied: false, vendor: null, memory: 'skipped' };
  // One shared learning implementation (no HTTP hop to tag-learn, no legacy update-vendor-category
  // fallback). applied === true only when the merchant memory was actually saved.
  try {
    const outcome = await learnFromCorrection(sb as unknown as Parameters<typeof learnFromCorrection>[0], {
      userId, transactionId: txId, merchant: vendor, oldCategory: oldCategory || 'Uncategorized', newCategory: category,
    });
    return { applied: outcome.memory === 'saved', method: 'tag-learning', vendor, memory: outcome.memory };
  } catch {
    return { applied: false, method: 'tag-learning', vendor, memory: 'failed' };
  }
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
  const origin = String(event.headers?.[AI_ORIGIN_HEADER] || event.headers?.['X-Xai-Origin'] || '').trim().toLowerCase();
  if (origin && origin !== 'customer') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'ai_origin_refused', message: "AI changes can't be recorded as your own edit. Ask Tag; it will show you the change and wait for your yes." }) };
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

      const updatePayload: Record<string, any> = { category, category_source: CUSTOMER_EDIT_SOURCE, updated_at: new Date().toISOString() };
      if (Object.prototype.hasOwnProperty.call(body, 'subcategory')) {
        updatePayload.subcategory = body.subcategory ?? null;
        updatePayload.subcategory_source = CUSTOMER_EDIT_SOURCE;
      }

      let updateError: any = null;
      let updatedRows: unknown = null;
      ({ error: updateError, data: updatedRows } = await sb
        .from('transactions')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', auth.userId)
        .select('id'));

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
      if (!Array.isArray(updatedRows) || updatedRows.length !== 1) {
        // Never report a change the database did not make.
        return { statusCode: 409, headers, body: JSON.stringify({ error: 'not_updated' }) };
      }

      const vendor = pickVendor(body.vendor, existing, table);
      const shouldLearnVendor =
        body.disableLearning === true ? false : body.applyToVendor !== false;
      const learned =
        shouldLearnVendor
          ? await tryVendorLearning({
              sb,
              userId: auth.userId,
              txId: id,
              vendor,
              oldCategory: String(existing.category || '').trim() || null,
              category,
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
    dataJson.category_source = CUSTOMER_EDIT_SOURCE;
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
            sb,
            userId: auth.userId,
            txId: id,
            vendor,
            oldCategory: String((existing.data_json || {}).category || '').trim() || null,
            category,
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

