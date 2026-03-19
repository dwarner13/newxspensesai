import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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

function inferMimeTypeFromFileName(fileName: string | null | undefined): string | null {
  const lower = String(fileName || "").trim().toLowerCase();
  if (!lower) return null;
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".csv")) return "text/csv";
  return null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToAscii(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
    .join("");
}

function probePdfBytes(buffer: Buffer) {
  const first16 = buffer.subarray(0, Math.min(16, buffer.length));
  const first8 = buffer.subarray(0, Math.min(8, buffer.length));
  const last32 = buffer.subarray(Math.max(0, buffer.length - 32));
  const tailWindow = buffer.subarray(Math.max(0, buffer.length - 256));
  const tailAscii = tailWindow.toString("latin1").replace(/[^\x20-\x7E]/g, ".");
  return {
    bytes: buffer.length,
    first16Hex: bytesToHex(first16),
    first8Ascii: bytesToAscii(first8),
    last32Hex: bytesToHex(last32),
    tailHasEof: tailAscii.includes("%%EOF"),
  };
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

async function getImportTerminalOcrState(importId: string): Promise<{
  terminal: boolean;
  errorCode?: string;
  shortReason?: string;
  userMessage?: string;
}> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: imp } = await supabase
      .from('imports')
      .select('document_id,status')
      .eq('id', importId)
      .maybeSingle();
    const importStatus = String(imp?.status || '').toLowerCase();
    const documentId = String(imp?.document_id || '').trim();
    if (!documentId) {
      return { terminal: importStatus === 'rejected', errorCode: importStatus === 'rejected' ? 'malformed_pdf' : undefined };
    }
    const { data: doc } = await supabase
      .from('user_documents')
      .select('status,ocr_status,error,metadata')
      .eq('id', documentId)
      .maybeSingle();
    const docStatus = String(doc?.status || '').toLowerCase();
    const docOcrStatus = String(doc?.ocr_status || '').toLowerCase();
    const docError = String(doc?.error || '').toLowerCase();
    const meta = doc?.metadata && typeof doc.metadata === 'object' ? doc.metadata : {};
    const metaErrorCode = String(
      (meta as any)?.error_code ||
      (meta as any)?.ocr_error_code ||
      (meta as any)?.ocr?.error_code ||
      ''
    ).toLowerCase();
    const malformed =
      metaErrorCode === 'malformed_pdf' ||
      metaErrorCode === 'unusable_ocr_text' ||
      docError.includes('malformed_pdf') ||
      docError.includes('unusable_ocr_text') ||
      docError.includes('unable to extract any text') ||
      docError.includes('appears to be blank or empty') ||
      docError.includes('invalid pdf structure') ||
      docError.includes('bad fcheck') ||
      docError.includes('flate stream') ||
      docError.includes('error e301') ||
      docError.includes('input file corrupted') ||
      docError.includes('unreadable pdf structure');
    const unusable =
      metaErrorCode === 'unusable_ocr_text' ||
      docError.includes('unusable_ocr_text') ||
      docError.includes('unable to extract any text') ||
      docError.includes('appears to be blank or empty') ||
      docError.includes('no readable text found');
    const terminal =
      docStatus === 'rejected' ||
      docOcrStatus === 'failed' ||
      docOcrStatus === 'rejected' ||
      importStatus === 'rejected' ||
      malformed ||
      unusable;
    if (!terminal) return { terminal: false };
    const errorCode = malformed
      ? 'malformed_pdf'
      : (unusable ? 'unusable_ocr_text' : (metaErrorCode || 'ocr_rejected'));
    const shortReason = malformed
      ? 'Unreadable PDF structure'
      : (unusable ? 'Scanned PDF text could not be recognized' : 'OCR processing rejected');
    const userMessage = malformed
      ? 'Unreadable PDF structure. We could not safely read this PDF. Please open it, print/save as a new PDF, and upload the new copy.'
      : (unusable
          ? 'Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.'
          : 'This document could not be processed. Please re-save the PDF and upload the new copy.');
    return { terminal: true, errorCode, shortReason, userMessage };
  } catch {
    return { terminal: false };
  }
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

type ImportProcessingLock = {
  token: string;
  purpose: string;
  expires_at: string;
  acquired_at: string;
};

function readImportLock(metadata: any): ImportProcessingLock | null {
  const lock = metadata?.processing_lock;
  if (!lock || typeof lock !== 'object') return null;
  const token = String(lock.token || '').trim();
  const purpose = String(lock.purpose || '').trim() || 'prime_router_summary';
  const expiresAt = String(lock.expires_at || '').trim();
  const acquiredAt = String(lock.acquired_at || '').trim();
  if (!token || !expiresAt) return null;
  return { token, purpose, expires_at: expiresAt, acquired_at: acquiredAt || '' };
}

async function acquireImportProcessingLock(
  importId: string,
  purpose: string,
  ttlMs: number = 90_000
): Promise<{ ok: boolean; token?: string; reason?: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('imports')
    .select('metadata')
    .eq('id', importId)
    .maybeSingle();
  if (error) return { ok: false, reason: `metadata_read_failed:${error.message}` };
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  const existingLock = readImportLock(metadata);
  const nowMs = Date.now();
  if (existingLock) {
    const expiresMs = Date.parse(existingLock.expires_at);
    if (Number.isFinite(expiresMs) && expiresMs > nowMs) {
      console.log('[prime-router] stage=import_lock_blocked', {
        importId,
        purpose,
        existingPurpose: existingLock.purpose,
        expiresAt: existingLock.expires_at,
      });
      return { ok: false, reason: 'already_processing' };
    }
  }

  const token = `${importId}-${nowMs}-${Math.random().toString(36).slice(2, 8)}`;
  const nextMetadata = {
    ...metadata,
    processing_lock: {
      token,
      purpose,
      acquired_at: new Date(nowMs).toISOString(),
      expires_at: new Date(nowMs + ttlMs).toISOString(),
    },
  };
  const { error: updateError } = await supabase
    .from('imports')
    .update({ metadata: nextMetadata })
    .eq('id', importId);
  const ok = !updateError;
  console.log('[prime-router] stage=import_lock_acquire', {
    importId,
    purpose,
    ok,
  });
  if (!ok) return { ok: false, reason: `lock_update_failed:${updateError?.message || 'unknown'}` };
  return { ok: true, token };
}

async function releaseImportProcessingLock(importId: string, token: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  try {
    const { data } = await supabase
      .from('imports')
      .select('metadata')
      .eq('id', importId)
      .maybeSingle();
    const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {};
    const existingLock = readImportLock(metadata);
    if (!existingLock) return;
    if (existingLock.token !== token) return;
    const nextMetadata = { ...metadata };
    delete (nextMetadata as any).processing_lock;
    await supabase
      .from('imports')
      .update({ metadata: nextMetadata })
      .eq('id', importId);
  } catch {
    // best-effort unlock
  }
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
      const rawBody = event.isBase64Encoded
        ? Buffer.from(event.body || "", "base64")
        : Buffer.from(event.body || "", "latin1");
      const rawBodyText = rawBody.toString("utf8");
      const userId = extractMultipartField(rawBodyText, "userId");
      const fileName = extractMultipartFilename(rawBodyText);
      const source = extractMultipartField(rawBodyText, "source") || "upload";
      const requestId = extractMultipartField(rawBodyText, "requestId");
      const extractedFilePart = extractMultipartFilePart(rawBody, contentType);
      const inferredMimeFromName = inferMimeTypeFromFileName(fileName);
      const uploadMimeType =
        inferredMimeFromName === 'application/pdf'
          ? 'application/pdf'
          : (extractedFilePart?.mimeType || inferredMimeFromName || "application/octet-stream");
      const contentLengthHeader = event.headers?.["content-length"] || event.headers?.["Content-Length"];
      const fileSize = Number(contentLengthHeader || 0);
      // Generate a stable trace_id for this upload run so all pipeline stages share it.
      const traceId = requestId || randomUUID();

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
          mimeType: uploadMimeType,
          mime: uploadMimeType,
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
        const filePart = extractedFilePart || extractMultipartFilePart(rawBody, contentType);
        if (!filePart?.fileBuffer || filePart.fileBuffer.length === 0) {
          return json(400, {
            ok: false,
            step: "multipart-parse",
            importId,
            documentId,
            error: "Could not extract file bytes from multipart payload",
          });
        }
        if ((filePart.mimeType || "").toLowerCase() === "application/pdf" || String(fileName).toLowerCase().endsWith(".pdf")) {
          console.log("[upload-pdf-debug] router_received_pdf", {
            userId,
            fileName,
            mimeType: filePart.mimeType || "application/octet-stream",
            ...probePdfBytes(filePart.fileBuffer),
          });
        }

        const signedUploadRes = await fetch(String(uploadUrl), {
          method: "PUT",
          headers: {
            "content-type": uploadMimeType,
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
            importRunId: requestId || `upload-${documentId}-${Date.now()}`,
            importId: importId || undefined,
            traceId,
            source: 'prime-router',
            caller: 'prime-router:upload',
            isRetry: false,
            explicitRecovery: false,
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
      const statusImportRunId = String(body?.importRunId || body?.requestId || `status-${importId || Date.now()}`);
      const waitForOcrMs = Number.isFinite(Number(body?.waitForOcrMs)) ? Math.max(5000, Math.min(90000, Number(body?.waitForOcrMs))) : 60000;
      const pollForOcrMs = Number.isFinite(Number(body?.pollForOcrMs)) ? Math.max(200, Math.min(2000, Number(body?.pollForOcrMs))) : 500;
      const autoCommit = body?.autoCommit !== false;
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
      const hasTerminalMalformedOcrSignal = Array.isArray(statusRes.data?.items)
        ? statusRes.data.items.some((item: any) => {
            const msg = String(item?.error || "").toLowerCase();
            return (
              String(item?.error_code || '').toLowerCase() === 'unusable_ocr_text' ||
              msg.includes('malformed_pdf') ||
              msg.includes('unusable_ocr_text') ||
              msg.includes('invalid pdf structure') ||
              msg.includes('bad fcheck') ||
              msg.includes('flate stream') ||
              msg.includes('error e301') ||
              msg.includes('input file corrupted') ||
              msg.includes('no provider returned text') ||
              msg.includes('unable to extract any text') ||
              msg.includes('appears to be blank or empty') ||
              msg.includes('no readable text found')
            );
          })
        : false;
      const hasItemError = itemStatuses.includes("error") || itemStatuses.includes("failed");
      const hasTopLevelError =
        String(status).toLowerCase() === "error" ||
        String(status).toLowerCase() === "failed" ||
        statusRes.data?.ok === false;
      const isError = hasItemError || hasTopLevelError || hasTerminalMalformedOcrSignal;
      const terminalOcrErrorCode = Array.isArray(statusRes.data?.items)
        ? String(
            statusRes.data.items.find((item: any) => {
              const code = String(item?.error_code || '').toLowerCase();
              const msg = String(item?.error || '').toLowerCase();
              return (
                code === 'unusable_ocr_text' ||
                code === 'malformed_pdf' ||
                msg.includes('unusable_ocr_text') ||
                msg.includes('malformed_pdf') ||
                msg.includes('invalid pdf structure') ||
                msg.includes('bad fcheck') ||
                msg.includes('flate stream') ||
                msg.includes('error e301') ||
                msg.includes('input file corrupted')
              );
            })?.error_code || ''
          ).toLowerCase()
        : '';
      const isTerminalOcrError =
        hasTerminalMalformedOcrSignal ||
        terminalOcrErrorCode === 'unusable_ocr_text' ||
        terminalOcrErrorCode === 'malformed_pdf';
      const isComplete =
        status === "complete" ||
        status === "completed" ||
        status === "done" ||
        statusRes.data?.isComplete === true ||
        statusRes.data?.done === true;
      const staleLockDetected = Array.isArray(statusRes.data?.items)
        ? statusRes.data.items.some((item: any) =>
            String(item?.status || '').toLowerCase() === 'recovering_stale_lock' ||
            String(item?.stateReason || '').toLowerCase().includes('stale_lock')
          )
        : false;

      if (isTerminalOcrError) {
        console.warn('[prime-router] Terminal OCR result — halting pipeline', {
          importId,
          documentId: ctx.documentId,
          traceId,
          errorCode: terminalOcrErrorCode || (hasTerminalMalformedOcrSignal ? 'malformed_pdf' : 'provider_error'),
        });
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "error",
          terminal: true,
          retryable: false,
          error_code: terminalOcrErrorCode || 'malformed_pdf',
          details: statusRes.data,
          error:
            statusRes.data?.error ||
            (terminalOcrErrorCode === 'unusable_ocr_text'
              ? 'Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.'
              : 'Unreadable PDF structure. Please re-save this PDF and upload the new copy.'),
        });
      }

      if (staleLockDetected) {
        // Idempotency guard: only re-kick OCR if the document hasn't already finished.
        // If ocr_status is 'ready' the original job completed while the stale-lock was detected.
        const supabaseForLockCheck = getSupabaseAdmin();
        const { data: docForLockCheck } = await supabaseForLockCheck
          .from('user_documents')
          .select('ocr_status, status')
          .eq('id', ctx.documentId!)
          .maybeSingle();
        const docOcrStatus = String(docForLockCheck?.ocr_status || docForLockCheck?.status || '').toLowerCase();
        const ocrAlreadyDone = docOcrStatus === 'ready' || docOcrStatus === 'ready_cached';
        if (ocrAlreadyDone) {
          console.log('[prime-router] stage=stale_lock_skipped_already_ready', {
            importId,
            documentId: ctx.documentId,
            docOcrStatus,
          });
          // Fall through to normal sync + finalize path below.
        } else {
        console.warn('[prime-router] stale OCR lock detected, re-kicking smart-import-ocr', {
          importId,
          documentId: ctx.documentId,
          userId: ctx.userId,
        });
        const retryRes = await callFn(event, "smart-import-ocr", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            userId: ctx.userId,
            docId: ctx.documentId,
            importRunId: `stale-retry-${importId}-${Date.now()}`,
            source: 'prime-router',
            caller: 'prime-router:stale-lock-retry',
            isRetry: true,
            explicitRecovery: true,
          }),
        });
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "running",
          details: {
            ...statusRes.data,
            recoveryKickoff: retryRes.ok ? "triggered" : "failed",
            recoveryError: retryRes.ok ? null : retryRes.data,
          },
        });
        } // end else (ocrAlreadyDone)
      }

      if (isError) {
        if (ctx.documentId && importId) {
          console.log('[prime-router] status_error_context', {
            importId,
            documentId: ctx.documentId,
            traceId,
            state: status,
            hasTerminalMalformedOcrSignal,
          });
        }
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "error",
          details: statusRes.data,
          error:
            statusRes.data?.error ||
            (hasTerminalMalformedOcrSignal ? "parser_incompatible_pdf" : "ocr_status_error"),
        });
      }

      if (!isComplete) {
        return json(200, { ok: true, mode: "status", importId, status: "running", details: statusRes.data });
      }

      const syncRes = await callFn(event, "smart-import-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: ctx.userId,
          docIds: [ctx.documentId],
          autoCommit,
          importRunId: statusImportRunId,
          waitForOcrMs,
          pollForOcrMs,
        }),
      });
      const syncState = String(syncRes.data?.state || '');
      if (syncState === 'ocr_unusable' || String(syncRes.data?.error_code || '').toLowerCase() === 'unusable_ocr_text') {
        console.warn('[prime-router] Terminal OCR result — halting pipeline', {
          importId,
          documentId: ctx.documentId,
          traceId,
          errorCode: 'unusable_ocr_text',
        });
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "error",
          terminal: true,
          state: 'ocr_unusable',
          retryable: false,
          error_code: 'unusable_ocr_text',
          details: syncRes.data,
          primeMessage: "Scanned PDF text could not be recognized. Please re-save or upload a clearer PDF.",
        });
      }
      if (syncState === 'ocr_rejected' || String(syncRes.data?.error_code || '').toLowerCase() === 'malformed_pdf') {
        console.warn('[prime-router] Terminal OCR result — halting pipeline', {
          importId,
          documentId: ctx.documentId,
          traceId,
          errorCode: 'malformed_pdf',
        });
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "error",
          terminal: true,
          state: 'ocr_rejected',
          retryable: false,
          error_code: 'malformed_pdf',
          details: syncRes.data,
          primeMessage: "Unreadable PDF structure. Please re-save this PDF and upload the new copy.",
        });
      }
      if (syncState === 'ocr_failed_retry' || syncState === 'ocr_timed_out_retry') {
        return json(200, {
          ok: true,
          mode: "status",
          importId,
          status: "error",
          state: syncState,
          retryable: true,
          error_code: syncRes.data?.error_code || (syncState === 'ocr_timed_out_retry' ? 'timeout' : 'provider_error'),
          details: syncRes.data,
          primeMessage: "Byte couldn’t read the statement (timeout/provider failure). Please retry. No transactions were saved.",
        });
      }

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
      const lockTokensByImport = new Map<string, string>();
      try {
        for (const id of importIds) {
          const lock = await acquireImportProcessingLock(String(id), 'prime_router_summary', 90_000);
          if (!lock.ok || !lock.token) {
            return json(200, {
              ok: true,
              mode: "summary",
              importId: id,
              importIds,
              ready: false,
              state: "already_processing",
              summary: null,
              meta: { reason: "already_processing" },
            });
          }
          lockTokensByImport.set(String(id), lock.token);
        }

        const hasRowsFlags = await Promise.all(importIds.map((id) => stagingHasRows(String(id))));
        const hasRows = hasRowsFlags.some(Boolean);
        if (!hasRows) {
          const terminalState = importIds.length === 1
            ? await getImportTerminalOcrState(importId)
            : { terminal: false };
          if (terminalState.terminal) {
            return json(200, {
              ok: true,
              mode: "summary",
              importId,
              importIds,
              ready: false,
              state: "terminal_ocr_rejected",
              summary: {
                summary: terminalState.userMessage,
                error_code: terminalState.errorCode || 'ocr_rejected',
              },
              meta: {
                tagRan: false,
                reason: terminalState.errorCode || 'ocr_rejected',
                shortReason: terminalState.shortReason || 'OCR processing rejected',
              },
            });
          }
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
            body: JSON.stringify({ importId, summaryLockToken: lockTokensByImport.get(String(importId)) || null }),
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
                body: JSON.stringify({ importId: id, summaryLockToken: lockTokensByImport.get(String(id)) || null }),
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
      } finally {
        await Promise.all(
          Array.from(lockTokensByImport.entries()).map(([id, token]) =>
            releaseImportProcessingLock(id, token)
          )
        );
      }
    }

    return json(400, { ok: false, error: "Unknown mode" });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message || "prime-router failed" });
  }
};
