import type { Handler } from '@netlify/functions';
import { verifyAuth } from './_shared/verifyAuth.js';

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
  const mode = String(body.mode || 'email');
  const to = String(body.to || '').trim();

  // TODO(email-provider): integrate RESEND_API_KEY or SENDGRID_API_KEY flow here.
  // For now, return actionable instructions while keeping endpoint contract stable.
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  const hasSendgrid = Boolean(process.env.SENDGRID_API_KEY);
  if (!hasResend && !hasSendgrid) {
    return ok({
      ok: true,
      mode,
      scope,
      queued: false,
      message: 'Email provider not configured. Add RESEND_API_KEY or SENDGRID_API_KEY to environment variables.',
      to,
    });
  }

  return ok({
    ok: true,
    mode,
    scope,
    queued: true,
    message: 'Email send queued (provider integration stub).',
    to,
  });
};

