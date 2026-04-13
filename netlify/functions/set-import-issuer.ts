import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import Anthropic from '@anthropic-ai/sdk';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function detectIssuerFromData(fileUrl: string, descriptions: string[]): Promise<string> {
  const client = new Anthropic();
  const sample = descriptions.slice(0, 15).join('\n');
  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 64,
    messages: [{
      role: 'user',
      content: `You are identifying a financial institution from credit card or bank statement data.

File path: ${fileUrl}

Sample transaction descriptions:
${sample}

Reply with ONLY the institution name, nothing else. Examples: "BMO", "CIBC", "TD", "RBC", "Canadian Tire", "Capital One", "Amex", "Scotiabank", "National Bank". If unsure, reply "Unknown".`
    }]
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : 'Unknown';
  return text;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Unauthorized' }) };

  let body: { importId?: string; issuer?: string };
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { importId, issuer: explicitIssuer } = body;
  if (!importId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing importId' }) };

  const sb = serverSupabase();
  let issuer = explicitIssuer;

  // Auto-detect if no issuer provided
  if (!issuer) {
    try {
      // Get file_url from imports
      const { data: imp } = await sb
        .from('imports')
        .select('file_url')
        .eq('id', importId)
        .single();

      // Get sample descriptions from transactions_staging
      const { data: rows } = await sb
        .from('transactions_staging')
        .select('data_json')
        .eq('import_id', importId)
        .limit(20);

      const descriptions = (rows || [])
        .map((r: any) => r.data_json?.description || r.data_json?.merchant || '')
        .filter(Boolean);

      issuer = await detectIssuerFromData(imp?.file_url || '', descriptions);
      console.log('[set-import-issuer] auto-detected:', issuer);
    } catch (err) {
      console.error('[set-import-issuer] auto-detect failed:', err);
      issuer = 'Unknown';
    }
  }

  const { error } = await sb
    .from('imports')
    .update({ issuer, updated_at: new Date().toISOString() })
    .eq('id', importId)
    .eq('user_id', auth.userId);

  if (error) {
    console.error('[set-import-issuer] update failed:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true, issuer }) };
};
