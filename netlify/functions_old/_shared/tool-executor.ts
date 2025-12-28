// _shared/tool-executor.ts
import { logToolEvent } from './tool-metrics';

type Ctx = { userId: string; baseUrl?: string; authHeader?: string };

async function postJSON<T>(url: string, body: unknown, headers?: Record<string,string>): Promise<T> {
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

export const toolExecutor = {
  async searchEmail(args: { query: string; days?: number }, ctx: Ctx) {
    return postJSON(`${ctx.baseUrl}/tools/email-search`, { userId: ctx.userId, ...args });
  },

  async fetchAttachments(args: { messageId: string }, ctx: Ctx) {
    return postJSON(`${ctx.baseUrl}/tools/email-fetch-attachments`, { userId: ctx.userId, ...args });
  },

  async startSmartImport(args: { storagePath: string }, ctx: Ctx) {
    // Call finalize which routes to OCR/parse based on file type
    return postJSON(`${ctx.baseUrl}/smart-import-finalize`, { userId: ctx.userId, storagePath: args.storagePath });
  },

  async getRecentImportSummary(_: Record<string, never>, ctx: Ctx) {
    return postJSON(`${ctx.baseUrl}/tools/get-recent-import-summary`, { userId: ctx.userId });
  },

  async getTransactions(args: { from?: string; to?: string; vendor?: string; category?: string; limit?: number }, ctx: Ctx) {
    return postJSON(`${ctx.baseUrl}/tools/get-transactions`, { userId: ctx.userId, ...args });
  },

  async getNeedsReview(args: { limit?: number }, ctx: Ctx) {
    return postJSON(`${ctx.baseUrl}/tools/get-needs-review`, { userId: ctx.userId, ...args });
  },
} as const;

export type ToolName = keyof typeof toolExecutor;

export async function executeTool(name: ToolName, rawArgs: any, ctx: Ctx) {
  // Simple guard to avoid leakage of unexpected props
  const safeArgs = rawArgs && typeof rawArgs === "object" ? rawArgs : {};
  if (!(name in toolExecutor)) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const fn = toolExecutor[name as ToolName] as (args: any, ctx: Ctx) => Promise<unknown>;
  const started = Date.now();
  try {
    const result = await fn(safeArgs, ctx);
    const elapsed_ms = Date.now() - started;
    
    // Log metrics
    await logToolEvent({ userId: ctx.userId, tool: name, ok: true, elapsed_ms });
    
    return {
      ok: true,
      tool: name,
      elapsed_ms,
      result,
    };
  } catch (err: any) {
    const elapsed_ms = Date.now() - started;
    const error = err?.message || String(err);
    
    // Log metrics
    await logToolEvent({ userId: ctx.userId, tool: name, ok: false, elapsed_ms, error });
    
    return {
      ok: false,
      tool: name,
      elapsed_ms,
      error,
    };
  }
}
