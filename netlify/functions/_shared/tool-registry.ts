export const AGENT_TOOLS: Record<string, string[]> = {
  prime: ['ocr-receipt'],
  byte: ['ocr-receipt'],
  tag: ['ocr-receipt'],
  goalie: [],
  crystal: [],
};

// _shared/tool-registry.ts
// Tool registry exposing per-agent tools. Tag tools call existing Netlify Functions.

type Ctx = { userId: string; baseUrl: string; authHeader?: string };

async function postJSON<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers || {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tool call failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function getJSON<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, { method: "GET", headers: { ...(headers || {}) } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tool call failed ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(ctx: Ctx): Record<string, string> {
  return ctx.authHeader ? { Authorization: ctx.authHeader } : {};
}

// ----------------------
// Tag Tools (wrappers)
// ----------------------

async function categorizeTx(args: { transactions: any[] }, ctx: Ctx) {
  // POST /.netlify/functions/tag-categorize
  const url = `${ctx.baseUrl}/.netlify/functions/tag-categorize`;
  return postJSON(url, { transactions: args.transactions }, authHeaders(ctx));
}

async function applyRule(args: { merchant_pattern: string; category_id: string; priority?: number; match_type?: "ilike" | "regex" }, ctx: Ctx) {
  // POST /.netlify/functions/tag-rules
  const url = `${ctx.baseUrl}/.netlify/functions/tag-rules`;
  return postJSON(url, args, authHeaders(ctx));
}

async function recordCorrection(args: { transaction_id: string; user_id: string; to_category_id: string; note?: string }, ctx: Ctx) {
  // POST /.netlify/functions/tag-correction
  const url = `${ctx.baseUrl}/.netlify/functions/tag-correction`;
  return postJSON(url, args, authHeaders(ctx));
}

async function listHistory(args: { transaction_id?: string; user_stats?: boolean; recent?: number; include_details?: boolean }, ctx: Ctx) {
  // GET /.netlify/functions/tag-tx-categ-history?...
  const params = new URLSearchParams();
  if (args.transaction_id) params.set("transaction_id", args.transaction_id);
  if (args.user_stats) params.set("user_stats", "true");
  if (typeof args.recent === "number") params.set("recent", String(args.recent));
  if (args.include_details) params.set("include_details", "true");
  const qs = params.toString();
  const url = `${ctx.baseUrl}/.netlify/functions/tag-tx-categ-history${qs ? `?${qs}` : ""}`;
  return getJSON(url, authHeaders(ctx));
}

// ----------------------
// Agent tool registries
// ----------------------

const primeTools: { name: string; fn: Function }[] = [];
const tagTools = [
  { name: "categorizeTx", fn: categorizeTx },
  { name: "applyRule", fn: applyRule },
  { name: "recordCorrection", fn: recordCorrection },
  { name: "listHistory", fn: listHistory },
];
const byteTools: { name: string; fn: Function }[] = [];
const goalieTools: { name: string; fn: Function }[] = [];
const crystalTools: { name: string; fn: Function }[] = [];

export const tools = {
  forAgent(agent: "prime" | "byte" | "tag" | "goalie" | "crystal") {
    switch (agent) {
      case "tag": return tagTools;
      case "byte": return byteTools;
      case "goalie": return goalieTools;
      case "crystal": return crystalTools;
      default: return primeTools;
    }
  },
};


