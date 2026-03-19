import type { Handler } from '@netlify/functions';
import { verifyAuth } from './_shared/verifyAuth.js';
import { serverSupabase } from './_shared/supabase.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

function ok(body: unknown, status = 200) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}
function err(message: string, status = 400) {
  return { statusCode: status, headers: CORS, body: JSON.stringify({ ok: false, error: message, message }) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (!auth.userId) return err('Unauthorized', 401);

  const body = JSON.parse(event.body || '{}');
  const scope = String(body.scope || 'all');
  const include = body.include || {};
  const primeNote = String(body.primeNote || '').trim();

  const supabase = serverSupabase();
  let query = supabase
    .from('transactions')
    .select('id, posted_at, amount, category, merchant_name, type')
    .eq('user_id', auth.userId)
    .order('posted_at', { ascending: true });

  if (scope !== 'all') {
    const start = new Date(`${scope}-01T00:00:00.000Z`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    query = query.gte('posted_at', start.toISOString()).lte('posted_at', end.toISOString());
  }

  const { data, error } = await query;
  if (error) return err(error.message, 500);
  const txCount = (data || []).length;

  // TODO(server-pdf): use puppeteer-core/@sparticuz/chromium to render branded PDF server-side.
  // Current fallback: return printable HTML payload and rely on client print flow.
  const html = `
    <html>
      <head><title>XspensesAI Report</title></head>
      <body style="font-family:Arial,sans-serif;padding:24px;">
        <h1>XspensesAI Statement Report</h1>
        <p>Scope: ${scope}</p>
        <p>Transactions: ${txCount}</p>
        <p>Included sections: ${Object.keys(include).filter((k) => include[k]).join(', ') || 'none'}</p>
        <p>Prime note: ${primeNote || 'n/a'}</p>
      </body>
    </html>
  `;

  return ok({
    ok: true,
    message: 'Report generated with HTML fallback. Use client print flow for PDF.',
    html,
    pdfUrl: null,
    queued: false,
  });
};

