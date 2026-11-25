/**
 * test-email — RETIRED (security hotfix, 2026-11-25)
 *
 * This was an unauthenticated test endpoint that sent several Resend test emails to a hardcoded
 * address on every GET. It had no callers: customer email is sent by Supabase Auth
 * (sign-up, password reset, magic link), admin-forgot-password, send-report-email and the
 * send-achievement-email edge function, none of which use this endpoint.
 *
 * It now returns 410 Gone for every request, loads no dependencies and sends nothing.
 */

import type { Handler } from '@netlify/functions';

const HEADERS = { 'Content-Type': 'application/json' };

export const handler: Handler = async () => ({
  statusCode: 410,
  headers: HEADERS,
  body: JSON.stringify({ ok: false, error: 'Gone' }),
});
