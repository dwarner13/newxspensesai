import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('[categorize-transactions] Stub invoked');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      skipped: true,
      reason: 'stub',
    }),
  };
};
