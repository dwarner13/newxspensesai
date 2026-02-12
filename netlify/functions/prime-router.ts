import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

/**
 * PRIME ROUTER (MVP) — orchestration endpoint
 * URL: /.netlify/functions/prime-router
 *
 * Supports:
 *  - upload  : calls smart-import-init, proxies upload, calls smart-import-ocr
 *  - status  : calls ocr-job-status; if complete -> smart-import-sync + smart-import-finalize
 *  - summary : ensures TAG exists (only if needed) then calls prime-summary (always)
 *
 * HARD RULES:
 * - Do NOT modify OCR pipeline logic (we only call existing functions)
 * - No duplicate OCR jobs (rely on existing idempotency)
 * - TAG writes staging-only
 * - Summary must return even if TAG fails
 */

type Mode = "upload" | "status" | "summary";

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function getBaseUrl(event: any) {
  // Prefer Netlify env in deploy
  const prod = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.DEPLOY_URL;
  if (prod) return prod.replace(/\/$/, "");

  // Local dev fallback (npx netlify dev)
  const port = process.env.NETLIFY_LOCAL_PORT || process.env.PORT || "8888";
  return `http://localhost:${port}`;
}

async function callFn(event: any, fnName: string, init: { method: string; headers?: Record<string, string>; body?: any }) {
  const base = getBaseUrl(event);
  const url = `${base}/.netlify/functions/${fnName}`;

  const res = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

function isMultipart(event: any) {
  const ct = event.headers?.["content-type"] || event.headers?.["Content-Type"] || "";
  return ct.toLowerCase().includes("multipart/form-data");
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function stagingHasRows(importId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("transactions_staging")
    .select("id")
    .eq("import_id", importId)
    .limit(1);
  if (error) throw error;
  return (data?.length || 0) > 0;
}

async function stagingHasMissingTag(importId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("transactions_staging")
    .select("id")
    .eq("import_id", importId)
    .is("tag_status", null)
    .limit(1);
  if (error) throw error;
  return (data?.length || 0) > 0;
}

async function getImportContext(importId: string): Promise<{ userId: string | null; documentId: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("imports")
    .select("user_id, document_id")
    .eq("id", importId)
    .maybeSingle();
  if (error) throw error;
  return {
    userId: data?.user_id ?? null,
    documentId: data?.document_id ?? null,
  };
}

export const handler: Handler = async (event) => {
  try {
    const method = event.httpMethod || "GET";

    // mode can come from:
    // - multipart => upload
    // - querystring ?mode=
    // - JSON body { mode: ... }
    let mode: Mode | null = null;

    if (isMultipart(event)) {
      mode = "upload";
    } else {
      const qsMode = (event.queryStringParameters?.mode || "").toLowerCase();
      if (qsMode === "upload" || qsMode === "status" || qsMode === "summary") mode = qsMode as Mode;

      if (!mode && event.body) {
        try {
          const parsed = JSON.parse(event.body);
          const m = (parsed?.mode || "").toLowerCase();
          if (m === "upload" || m === "status" || m === "summary") mode = m as Mode;
        } catch {}
      }
    }

    if (!mode) return json(400, { ok: false, error: "Missing mode. Use multipart, ?mode=, or JSON body { mode }" });

    // MODE A: upload (multipart)
    if (mode === "upload") {
      if (method !== "POST") return json(405, { ok: false, error: "upload mode requires POST" });
      if (!isMultipart(event)) return json(400, { ok: false, error: "upload mode requires multipart/form-data" });

      const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"];

      // 1) init (keep minimal to avoid breaking existing contract)
      const initRes = await callFn(event, "smart-import-init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!initRes.ok) return json(initRes.status, { ok: false, step: "smart-import-init", error: initRes.data });

      const importId = initRes.data?.importId || initRes.data?.import_id;
      const documentId = initRes.data?.documentId || initRes.data?.document_id;

      // 2) upload (proxy raw multipart body)
      const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : (event.body || "");
      const uploadRes = await callFn(event, "upload", {
        method: "POST",
        headers: {
          "content-type": contentType || "multipart/form-data",
          ...(importId ? { "x-import-id": String(importId) } : {}),
          ...(documentId ? { "x-document-id": String(documentId) } : {}),
        },
        body: rawBody as any,
      });
      if (!uploadRes.ok) {
        return json(uploadRes.status, { ok: false, step: "upload", importId, documentId, error: uploadRes.data });
      }

      // 3) OCR kickoff (idempotent inside pipeline)
      const ocrRes = await callFn(event, "smart-import-ocr", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importId, documentId }),
      });

      // Even if kickoff fails, return IDs so frontend can retry status
      return json(200, {
        ok: true,
        mode: "upload",
        importId,
        documentId,
        upload: uploadRes.data,
        ocr: ocrRes.ok ? ocrRes.data : { ok: false, error: ocrRes.data },
      });
    }

    // parse JSON for status/summary
    let body: any = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch { body = {}; }
    }

    // MODE B: status
    if (mode === "status") {
      const importId = body.importId || event.queryStringParameters?.importId;
      if (!importId) return json(400, { ok: false, error: "status mode requires importId" });
      const ctx = await getImportContext(String(importId));
      if (!ctx.userId || !ctx.documentId) {
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "running",
          details: { ok: false, reason: "missing_import_context", userId: ctx.userId, documentId: ctx.documentId },
        });
      }

      const statusRes = await callFn(event, "ocr-job-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: ctx.userId, docIds: [ctx.documentId] }),
      });
      if (!statusRes.ok) return json(statusRes.status, { ok: false, step: "ocr-job-status", importId, error: statusRes.data });

      const status = statusRes.data?.status || statusRes.data?.state || (statusRes.data?.done ? "done" : "running");
      const isComplete =
        status === "complete" ||
        status === "completed" ||
        status === "done" ||
        statusRes.data?.isComplete === true ||
        statusRes.data?.done === true;

      if (!isComplete) {
        return json(200, { ok: true, mode: "status", importId, status: "running", details: statusRes.data });
      }

      const syncRes = await callFn(event, "smart-import-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: ctx.userId, docIds: [ctx.documentId] }),
      });

      const finRes = await callFn(event, "smart-import-finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: ctx.userId, docId: ctx.documentId }),
      });

      return json(200, {
        ok: true,
        mode: "status",
        importId,
        status: "complete",
        ocrStatus: statusRes.data,
        sync: syncRes.ok ? syncRes.data : { ok: false, error: syncRes.data },
        finalize: finRes.ok ? finRes.data : { ok: false, error: finRes.data },
      });
    }

    // MODE C: summary
    if (mode === "summary") {
      const importId = body.importId || event.queryStringParameters?.importId;
      if (!importId) return json(400, { ok: false, error: "summary mode requires importId" });

      const hasRows = await stagingHasRows(String(importId));
      if (!hasRows) {
        return json(200, {
          ok: true,
          mode: "summary",
          importId,
          ready: false,
          summary: null,
          meta: { tagRan: false, reason: "no_staging_rows_yet" },
        });
      }

      let tagRan = false;
      let tagError: any = null;

      const missingTag = await stagingHasMissingTag(String(importId));
      if (missingTag) {
        const tagRes = await callFn(event, "tag-categorize-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            importId,
            limit: body.limit ?? 300,
            maxAiCallsPerRun: body.maxAiCallsPerRun ?? 15,
            dryRun: false,
          }),
        });

        if (tagRes.ok) tagRan = true;
        else tagError = tagRes.data;
      }

      const sumRes = await callFn(event, "prime-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ importId }),
      });

      if (!sumRes.ok) {
        return json(sumRes.status, {
          ok: false,
          step: "prime-summary",
          importId,
          error: sumRes.data,
          meta: { tagRan, tagError },
        });
      }

      return json(200, {
        ok: true,
        mode: "summary",
        importId,
        ready: true,
        summary: sumRes.data,
        meta: {
          tagRan,
          tagError,
          needsReviewCount: sumRes.data?.needs_review_count ?? sumRes.data?.needsReviewCount ?? null,
          autoCount: sumRes.data?.auto_count ?? sumRes.data?.autoCount ?? null,
          aiCount: sumRes.data?.ai_count ?? sumRes.data?.aiCount ?? null,
        },
      });
    }

    return json(400, { ok: false, error: "Unknown mode" });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || "prime-router failed" });
  }
};
