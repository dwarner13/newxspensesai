import type { Handler } from "@netlify/functions";

/**
 * Simple health check function for Netlify Dev
 * Test with: http://localhost:8888/.netlify/functions/selftest
 */
export const handler: Handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      ok: true,
      message: "Netlify functions are running",
      timestamp: new Date().toISOString()
    }),
  };
};

