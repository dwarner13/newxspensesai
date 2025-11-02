/**
 * Prime Chat Wrapper (SSE)
 * - Enforces employeeSlug = 'prime-boss'
 * - Proxies to chat handler to leverage DB history + guardrails
 * - Supports attachments pass-through
 */

import type { Handler } from "@netlify/functions";
import chat from "./chat";

const BASE_HEADERS: Record<string,string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: BASE_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...BASE_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { userId, message, sessionId, attachments, mode } = body || {};
    if (!userId || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing userId or message" }), {
        status: 400,
        headers: { ...BASE_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Enforce Prime routing
    const forwardBody = {
      userId,
      message,
      sessionId,
      attachments,
      mode,
      employeeSlug: "prime-boss",
    };

    // Create a new Request to the production chat handler
    const forwardReq = new Request((req as any).url || "https://local/.netlify/functions/prime-chat", {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(forwardBody),
    });

    // Delegate to chat which streams SSE and persists to Supabase
    const response = await chat(forwardReq as any);
    // Propagate CORS headers for client consumption
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Headers", "content-type, authorization");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Server error" }), {
      status: 500,
      headers: { ...BASE_HEADERS, "Content-Type": "application/json" },
    });
  }
};






