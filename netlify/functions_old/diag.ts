import { getOpenAIClient } from "./_shared/openai_client";

/**
 * Health check endpoint for OpenAI configuration
 * GET or POST /.netlify/functions/diag
 */
export default async () => {
  try {
    const client = getOpenAIClient();
    // Don't call the API—just verify the key exists and client is instantiated.
    return new Response(
      JSON.stringify({ ok: true, openai: "configured" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: e?.message || "unknown",
        openai: "missing"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};






