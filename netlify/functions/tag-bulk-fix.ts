/**
 * tag-bulk-fix — RETIRED (Tag HQ, T-ACT-FINAL / FST-2 S7, owner GO 2026-11-25).
 *
 * This endpoint applied ten hardcoded merchant → category overrides (built for ONE customer's own
 * accounts: an employer's payroll, personal loans, a salon, …) to the transactions of ANY signed-in
 * customer who called it, without a proposal, a confirmation, the customer-confirmed-category
 * protection, or a verified count. Nothing in the app called it.
 *
 * Under the one action safety contract every category change is a server proposal the customer
 * explicitly confirms (tag-copilot / typed preview → tag-action commit_single / commit_proposal).
 * Personal rules belong in that customer's own category_rules. The endpoint now changes nothing.
 * No data was deleted or modified by this retirement.
 */

import type { Handler } from '@netlify/functions';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  return {
    statusCode: 410,
    headers,
    body: JSON.stringify({ ok: false, error: 'retired', message: 'Bulk fixes are no longer applied automatically. Ask Tag; every change is shown to you and needs your confirmation.' }),
  };
};
