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

function getInboundAuthorization(event: any): string | null {
  const auth = event?.headers?.authorization || event?.headers?.Authorization;
  if (typeof auth !== "string") return null;
  const trimmed = auth.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractMultipartField(bodyText: string, fieldName: string): string | null {
  if (!bodyText || !fieldName) return null;
  const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(`name="${escaped}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n`, "i");
  const m = bodyText.match(rx);
  if (!m?.[1]) return null;
  const value = String(m[1]).trim();
  return value.length > 0 ? value : null;
}

function extractMultipartFilename(bodyText: string): string | null {
  if (!bodyText) return null;
  const m = bodyText.match(/name="file";\s*filename="([^"]+)"/i);
  if (!m?.[1]) return null;
  const value = String(m[1]).trim();
  return value.length > 0 ? value : null;
}

function getMultipartBoundary(contentType: string | undefined): string | null {
  if (!contentType) return null;
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const raw = (match?.[1] || match?.[2] || "").trim();
  return raw || null;
}

function extractMultipartFilePart(rawBody: Buffer, contentType: string | undefined): {
  fileBuffer: Buffer;
  mimeType: string | null;
} | null {
  const boundary = getMultipartBoundary(contentType);
  if (!boundary) return null;
  const bodyText = rawBody.toString("latin1");
  const boundaryToken = `--${boundary}`;
  const fileMarker = 'name="file"';
  const filePartStart = bodyText.indexOf(fileMarker);
  if (filePartStart === -1) return null;

  const headerStart = bodyText.lastIndexOf(boundaryToken, filePartStart);
  if (headerStart === -1) return null;

  const headerEnd = bodyText.indexOf("\r\n\r\n", filePartStart);
  if (headerEnd === -1) return null;
  const dataStart = headerEnd + 4;

  const nextBoundaryNeedle = `\r\n${boundaryToken}`;
  const dataEnd = bodyText.indexOf(nextBoundaryNeedle, dataStart);
  if (dataEnd === -1) return null;

  const headerBlob = bodyText.slice(headerStart, headerEnd);
  const mimeMatch = headerBlob.match(/content-type:\s*([^\r\n;]+)/i);
  const mimeType = mimeMatch?.[1]?.trim() || null;

  return {
    fileBuffer: rawBody.subarray(dataStart, dataEnd),
    mimeType,
  };
}

async function callFn(event: any, fnName: string, init: any) {
  const base = getBaseUrl(event);
  const url = `${base}/.netlify/functions/${fnName}`;

  // Forward inbound Authorization header if present
  const inboundAuth =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    undefined;

  const headers = {
    ...(init.headers || {}),
    ...(inboundAuth ? { authorization: inboundAuth } : {}),
  };

  const timeoutMs = Number(init?.timeoutMs || 0);
  const timeoutController = timeoutMs > 0 ? new AbortController() : null;
  const timeoutRef = timeoutController
    ? setTimeout(() => timeoutController.abort(), timeoutMs)
    : null;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      headers,
      body: init.body,
      ...(timeoutController ? { signal: timeoutController.signal } : {}),
    });
  } finally {
    if (timeoutRef) clearTimeout(timeoutRef);
  }

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

async function getImportDisplayName(importId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("imports")
    .select("document_id")
    .eq("id", importId)
    .maybeSingle();
  if (error || !data?.document_id) return null;
  const { data: doc } = await supabase
    .from("user_documents")
    .select("original_name")
    .eq("id", data.document_id)
    .maybeSingle();
  return doc?.original_name || null;
}

function parseCountFromSummary(content: string, pattern: RegExp): number | null {
  const m = String(content || "").match(pattern);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
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
      const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "");
      const rawBodyText = rawBody.toString("utf8");
      const userId = extractMultipartField(rawBodyText, "userId");
      const fileName = extractMultipartFilename(rawBodyText);
      const source = extractMultipartField(rawBodyText, "source") || "upload";
      const requestId = extractMultipartField(rawBodyText, "requestId");
      const contentLengthHeader = event.headers?.["content-length"] || event.headers?.["Content-Length"];
      const fileSize = Number(contentLengthHeader || 0);

      if (!userId || !fileName) {
        return json(400, {
          ok: false,
          step: "multipart-parse",
          error: "Missing userId or filename in multipart payload",
          details: { hasUserId: Boolean(userId), hasFileName: Boolean(fileName) },
        });
      }

      // 1) init (keep minimal to avoid breaking existing contract)
      const initRes = await callFn(event, "smart-import-init", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          fileName,
          fileSize: Number.isFinite(fileSize) ? fileSize : 0,
          source,
          requestId: requestId || undefined,
        }),
      });
      if (!initRes.ok) return json(initRes.status, { ok: false, step: "smart-import-init", error: initRes.data });

      const importId = initRes.data?.importId || initRes.data?.import_id;
      const documentId =
        initRes.data?.documentId ||
        initRes.data?.document_id ||
        initRes.data?.docId ||
        initRes.data?.doc_id;
      const uploadUrl = initRes.data?.uploadUrl || initRes.data?.upload_url;
      if (!documentId) {
        return json(500, {
          ok: false,
          step: "smart-import-init",
          importId,
          error: "smart-import-init missing documentId",
        });
      }

      let uploadMeta: any = { ok: true, via: "reused-doc-no-upload" };
      if (uploadUrl) {
        // 2) upload directly to signed URL (prevents router->/upload 404 loop)
        const filePart = extractMultipartFilePart(rawBody, contentType);
        if (!filePart?.fileBuffer || filePart.fileBuffer.length === 0) {
          return json(400, {
            ok: false,
            step: "multipart-parse",
            importId,
            documentId,
            error: "Could not extract file bytes from multipart payload",
          });
        }

        const signedUploadRes = await fetch(String(uploadUrl), {
          method: "PUT",
          headers: {
            "content-type": filePart.mimeType || "application/octet-stream",
          },
          body: filePart.fileBuffer,
        });
        if (!signedUploadRes.ok) {
          const signedUploadText = await signedUploadRes.text().catch(() => "");
          return json(signedUploadRes.status, {
            ok: false,
            step: "signed-upload",
            importId,
            documentId,
            error: signedUploadText || signedUploadRes.statusText || "signed upload failed",
          });
        }
        uploadMeta = { ok: true, via: "signed-url-put" };
      }

      // 3) OCR kickoff (idempotent inside pipeline)
      let ocrRes: { ok: boolean; status: number; data: any };
      try {
        ocrRes = await callFn(event, "smart-import-ocr", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId,
            docId: documentId,
            importRunId: requestId || undefined,
            importId: importId || undefined,
          }),
          // Keep upload path responsive; OCR continues through status polling.
          timeoutMs: 6000,
        });
      } catch (e: any) {
        const timedOut = String(e?.name || "").toLowerCase() === "aborterror";
        ocrRes = {
          ok: true,
          status: 202,
          data: {
            ok: true,
            queued: true,
            pending: true,
            reason: timedOut ? "ocr_kickoff_timeout" : "ocr_kickoff_deferred",
          },
        };
      }

      // Even if kickoff fails, return IDs so frontend can retry status
      return json(200, {
        ok: true,
        mode: "upload",
        importId,
        documentId,
        docId: documentId,
        upload: uploadMeta,
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
      const itemStatuses = Array.isArray(statusRes.data?.items)
        ? statusRes.data.items.map((item: any) => String(item?.status || "").toLowerCase())
        : [];
      const hasItemError = itemStatuses.includes("error") || itemStatuses.includes("failed");
      const hasTopLevelError =
        String(status).toLowerCase() === "error" ||
        String(status).toLowerCase() === "failed" ||
        statusRes.data?.ok === false;
      const isError = hasItemError || hasTopLevelError;
      const isComplete =
        status === "complete" ||
        status === "completed" ||
        status === "done" ||
        statusRes.data?.isComplete === true ||
        statusRes.data?.done === true;

      if (isError) {
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "error",
          details: statusRes.data,
          error: statusRes.data?.error || "ocr_status_error",
        });
      }

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
      const importIdsRaw = Array.isArray(body.importIds)
        ? body.importIds
        : typeof body.importIds === "string"
          ? body.importIds.split(",")
          : [];
      const importIdSingle = body.importId || event.queryStringParameters?.importId;
      const importIds = Array.from(
        new Set(
          [...importIdsRaw, importIdSingle]
            .map((x: any) => String(x || "").trim())
            .filter((x) => x.length > 0)
        )
      );
      if (!importIds.length) return json(400, { ok: false, error: "summary mode requires importId or importIds[]" });
      const importId = importIds[0];

      const hasRowsFlags = await Promise.all(importIds.map((id) => stagingHasRows(String(id))));
      const hasRows = hasRowsFlags.some(Boolean);
      if (!hasRows) {
        return json(200, {
          ok: true,
          mode: "summary",
          importId,
          importIds,
          ready: false,
          summary: null,
          meta: { tagRan: false, reason: "no_staging_rows_yet" },
        });
      }

      let tagRan = false;
      let tagError: any = null;

      for (const id of importIds) {
        const missingTag = await stagingHasMissingTag(String(id));
        if (!missingTag) continue;
        const tagRes = await callFn(event, "tag-categorize-batch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            importId: id,
            limit: body.limit ?? 300,
            maxAiCallsPerRun: body.maxAiCallsPerRun ?? 15,
            dryRun: false,
          }),
        });
        if (tagRes.ok) {
          tagRan = true;
        } else if (!tagError) {
          tagError = tagRes.data;
        }
      }

      let summaryPayload: any = null;
      if (importIds.length === 1) {
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
        summaryPayload = sumRes.data;
      } else {
        const perImport = await Promise.all(importIds.map(async (id) => {
          const [sumRes, name] = await Promise.all([
            callFn(event, "prime-summary", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ importId: id }),
            }),
            getImportDisplayName(id),
          ]);
          return {
            id,
            name: name || `Document (${id.slice(0, 8)})`,
            ok: sumRes.ok,
            data: sumRes.data,
          };
        }));

        const summaries = perImport
          .filter((item) => item.ok && typeof item.data?.summary === "string" && item.data.summary.trim().length > 0)
          .map((item) => ({ ...item, summary: String(item.data.summary).trim() }));
        const failedImports = perImport.filter((item) => !item.ok);

        if (!summaries.length) {
          return json(200, {
            ok: true,
            mode: "summary",
            importId,
            importIds,
            ready: false,
            summary: null,
            meta: { tagRan, tagError, reason: "no_summary_payloads" },
          });
        }

        let totalProcessed = 0;
        let totalNeedsReview = 0;
        const docBlocks = summaries.map((item, idx) => {
          const processed =
            parseCountFromSummary(item.summary, /Parsed transactions:\s*(\d+)/i) ??
            parseCountFromSummary(item.summary, /(\d+)\s+transactions?\s+processed/i) ??
            0;
          const needsReview =
            parseCountFromSummary(item.summary, /Flagged for review:\s*(\d+)/i) ??
            parseCountFromSummary(item.summary, /(\d+)\s+transactions?\s+need review/i) ??
            0;
          totalProcessed += processed;
          totalNeedsReview += needsReview;
          return `${idx + 1}) ${item.name}\n${item.summary}`;
        });

        const combinedSummary = [
          "What I see in your documents",
          `I read ${summaries.length} of ${perImport.length} file${perImport.length === 1 ? "" : "s"}:`,
          ...summaries.map((item) => `- ${item.name}`),
          ...(failedImports.length > 0
            ? [
                "",
                "Files with processing issues",
                ...failedImports.map((item) => `- ${item.name}: summary unavailable`),
              ]
            : []),
          "",
          ...docBlocks,
          "",
          "Combined interpretation",
          `- Total transactions processed across documents: ${totalProcessed}.`,
          `- Total transactions needing review: ${totalNeedsReview}.`,
          "- I can now compare categories, cash flow patterns, and recurring subscriptions across all uploaded files.",
        ].join("\n");

        summaryPayload = {
          ok: true,
          summary: combinedSummary,
          transactions_processed: totalProcessed,
          needs_review_count: totalNeedsReview,
        };
      }

      return json(200, {
        ok: true,
        mode: "summary",
        importId,
        importIds,
        ready: true,
        summary: summaryPayload,
        meta: {
          tagRan,
          tagError,
          needsReviewCount: summaryPayload?.needs_review_count ?? summaryPayload?.needsReviewCount ?? null,
          autoCount: summaryPayload?.auto_count ?? summaryPayload?.autoCount ?? null,
          aiCount: summaryPayload?.ai_count ?? summaryPayload?.aiCount ?? null,
        },
      });
    }

    return json(400, { ok: false, error: "Unknown mode" });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || "prime-router failed" });
  }
};
