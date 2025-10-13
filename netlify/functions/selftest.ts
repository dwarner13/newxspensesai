import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => {
  // Note: VITE_ prefixed vars are NOT available in Netlify Functions
  // They are only for client-side Vite builds
  const okOpenAI = !!process.env.OPENAI_API_KEY;
  const okSupaUrl = !!process.env.SUPABASE_URL;
  const okSupaKey = !!process.env.SUPABASE_ANON_KEY;
  const okSupaServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
    },
    body: JSON.stringify({
      ok: okOpenAI && okSupaUrl && okSupaKey && okSupaServiceKey,
      checks: {
        openai: okOpenAI,
        supabaseUrl: okSupaUrl,
        supabaseAnonKey: okSupaKey,
        supabaseServiceKey: okSupaServiceKey,
      },
      timestamp: new Date().toISOString()
    })
  };
};

