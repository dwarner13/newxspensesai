import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => {
  const okOpenAI = !!process.env.OPENAI_API_KEY;
  const okSupaUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const okSupaKey = !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: okOpenAI && okSupaUrl && okSupaKey,
      openai: okOpenAI,
      supabaseUrl: okSupaUrl,
      supabaseKey: okSupaKey
    })
  };
};
