/**
 * Seed Activity Events — RETIRED (S0 security batch, 2026-11-23)
 *
 * This was an unauthenticated development helper that inserted sample activity events
 * for any caller-supplied userId with the service-role client. It had no callers.
 *
 * It now returns 410 Gone for every request and performs no database access.
 * Do not re-enable it; seed test data through a reviewed, local-only script instead.
 */

import type { Handler } from '@netlify/functions';

const HEADERS = { 'Content-Type': 'application/json' };

export const handler: Handler = async () => ({
  statusCode: 410,
  headers: HEADERS,
  body: JSON.stringify({ ok: false, error: 'Gone' }),
});
