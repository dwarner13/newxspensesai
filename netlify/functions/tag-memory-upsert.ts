import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeVendorKey(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const auth = await verifyAuth(event);
    if (auth.error || !auth.userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: auth.error || 'Unauthorized' }) };
    }
    const userId = auth.userId;
    if (body.userId && String(body.userId).trim() !== userId) {
      return { statusCode: 403, headers, body: JSON.stringify({ ok: false, error: 'body.userId does not match token user' }) };
    }
    const vendor = body.vendor ? String(body.vendor).trim() : '';
    const vendorKeyInput = body.vendor_key ? String(body.vendor_key).trim() : '';
    const category = body.category ? String(body.category).trim() : '';
    const subcategory = body.subcategory ? String(body.subcategory).trim() : null;

    if (!userId || !category || (!vendor && !vendorKeyInput)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Missing required fields',
          required: ['userId', 'category', 'vendor or vendor_key'],
        }),
      };
    }

    const vendorKey = normalizeVendorKey(vendorKeyInput || vendor);
    if (!vendorKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Computed vendor_key is empty' }),
      };
    }

    const supabase = serverSupabase();
    const upsertPayload = {
      user_id: userId,
      vendor_key: vendorKey,
      category,
      subcategory,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('vendor_category_memory')
      .upsert(upsertPayload, { onConflict: 'user_id,vendor_key' })
      .select('*')
      .single();

    if (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Failed to upsert vendor memory', message: error.message }),
      };
    }

    safeLog('tag-memory-upsert.done', {
      userId: `${userId.slice(0, 8)}...`,
      vendorKey,
      category,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, row: data }),
    };
  } catch (error: any) {
    safeLog('tag-memory-upsert.error', { message: error?.message || String(error) });
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};
