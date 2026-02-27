/**
 * Shared HTTP helpers for Netlify Functions.
 * Keeps CORS headers and response shaping out of individual handlers.
 */

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Return a JSON response with CORS headers attached.
 */
export function jsonResponse(status: number, body: unknown) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(body),
  };
}

/**
 * Safely parse the event body as JSON.
 *
 * Handles:
 *  - string body (normal Netlify prod/dev)
 *  - object body (some local dev adapters already parsed it)
 *  - base64-encoded body (event.isBase64Encoded === true)
 *  - fallback fields: rawBody, payload, data
 *  - BOM and surrounding whitespace
 *
 * Set DEBUG_HTTP_BODY=true to log shape info (never logs full body).
 * Returns {} on any failure rather than throwing.
 */
export function parseJson(event: any): any {
  try {
    const candidate =
      event?.body ??
      (event as any)?.rawBody ??
      (event as any)?.payload ??
      (event as any)?.data;

    if (!candidate) return {};

    // Some runtimes hand you an object already
    if (typeof candidate === "object") return candidate;

    let raw = String(candidate);

    if (event?.isBase64Encoded) {
      try {
        raw = Buffer.from(raw, "base64").toString("utf8");
      } catch {
        // fall through
      }
    }

    // remove BOM + trim
    raw = raw.replace(/^\uFEFF/, "").trim();
    if (!raw) return {};

    const parsed = JSON.parse(raw);

    if (process.env.DEBUG_HTTP_BODY === "true") {
      console.log("[http.parseJson]", {
        hasBody: true,
        bodyType: typeof candidate,
        bodyLen: raw.length,
        keys: parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
      });
    }

    return parsed ?? {};
  } catch (e) {
    if (process.env.DEBUG_HTTP_BODY === "true") {
      console.log("[http.parseJson] parse failed", { message: (e as any)?.message });
    }
    return {};
  }
}
