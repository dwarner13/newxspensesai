/**
 * Ping Healthcheck Function
 * 
 * Simple healthcheck endpoint to verify Netlify functions are serving correctly.
 */

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      ok: true,
      message: 'Pong! Functions are serving correctly.',
      timestamp: new Date().toISOString(),
      path: event.path,
    }),
  };
};



