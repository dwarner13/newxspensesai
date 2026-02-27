import type { Handler } from '@netlify/functions';

export const handler: Handler = async (_event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      timestamp: new Date().toISOString(),
      node: process.version,
    }),
  };
};
