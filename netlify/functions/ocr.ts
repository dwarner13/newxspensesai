// OCR Netlify function - ES Module style

import type { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
    },
    body: JSON.stringify({
      ok: true,
      message: 'OCR stub is working (ESM)',
      event: {
        path: event.path,
        httpMethod: event.httpMethod,
      },
    }),
  };
};
