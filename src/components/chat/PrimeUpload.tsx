import React, { useState, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { maskPII } from "../../../netlify/functions/_shared/pii";

/**
 * ✅ ACCEPT LIST: Vetted safe file types only
 * - Documents: PDF, Word, Excel, CSV, TXT, JSON
 * - Images: JPG, PNG, HEIC (for receipt scanning)
 * - Archives: ZIP (for bulk imports)
 */
const ACCEPT = [
  ".pdf", ".jpg", ".jpeg", ".png", ".heic",
  ".csv", ".xls", ".xlsx",
  ".doc", ".docx", ".txt", ".json", ".zip"
].join(",");

const MAX_MB = 25;
const MAX_FILES_PER_UPLOAD = 1; // Single file per submission for now

export function PrimeUpload({ afterUpload }: { afterUpload?: (msg: string) => void }) {
  const { user, supabase } = useAuth() as any;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 🛡️ Client-side file validation
   * - Type check (extension + MIME whitelist)
   * - Size check (25 MB limit)
   * - Name sanitization (remove path traversal attempts)
   */
  const validateFile = (file: File): string | null => {
    // Check MIME type
    const allowedMimes = [
      "application/pdf",
      "image/jpeg", "image/png", "image/heic",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/json",
      "application/zip"
    ];

    if (!allowedMimes.includes(file.type) && file.type !== "") {
      return `File type not supported: ${file.type}`;
    }

    // Check extension
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["pdf", "jpg", "jpeg", "png", "heic", "csv", "xls", "xlsx", "doc", "docx", "txt", "json", "zip"];
    if (!ext || !allowedExts.includes(ext)) {
      return `Invalid file extension: .${ext}`;
    }

    // Check size
    if (file.size > MAX_MB * 1024 * 1024) {
      return `File too large. Max ${MAX_MB} MB, got ${(file.size / 1024 / 1024).toFixed(1)} MB.`;
    }

    // Basic name sanitization (reject path traversal)
    if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
      return "Invalid filename (contains path characters)";
    }

    return null;
  };

  /**
   * 🔐 Main upload handler
   * 1. Client-side validation
   * 2. Upload to Supabase Storage (bucket: 'xspenses')
   * 3. Create AI task for Byte ingestion
   * 4. Audit log the event
   */
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setErr(null);

    // ✅ Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setErr(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setBusy(true);

    try {
      // 🔐 Generate secure path (user_id + UUID to prevent collisions/enumeration)
      const fileId = crypto.randomUUID();
      const path = `incoming/${user.id}/${fileId}/${file.name}`;

      // ✅ Upload to Supabase Storage
      const { error: upErr } = await supabase.storage
        .from("xspenses")
        .upload(path, file, { upsert: false });

      if (upErr) {
        throw new Error(`Storage upload failed: ${upErr.message}`);
      }

      // 🛡️ Prepare audit-safe metadata (redact filename if contains PII)
      const { masked: safeFileName } = maskPII(file.name, "last4");
      const auditMetadata = {
        bucket: "xspenses",
        path: path.substring(0, path.lastIndexOf("/")), // omit actual filename for audit
        fileName: safeFileName,
        fileId,
        size: file.size,
        mime: file.type || "application/octet-stream"
      };

      // 📤 Dispatch to Prime -> Byte ingestion
      const res = await fetch("/.netlify/functions/prime-upload-dispatch", {
        method: "POST",
        headers: {
          "x-user-id": user.id,
          "content-type": "application/json"
        },
        body: JSON.stringify(auditMetadata)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Upload dispatch failed (${res.status})`);
      }

      // ✅ Success callback
      afterUpload?.(
        "Got it. I'm sending this to Byte for ingestion now. " +
        "I'll notify you when it's ready for categorization."
      );
    } catch (e: any) {
      console.error("[PrimeUpload] Error:", {
        message: e.message,
        stack: e.stack
      });
      setErr(e.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="cursor-pointer rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50">
        {busy ? (
          <>
            <span className="inline-block animate-spin mr-2">⏳</span>
            Uploading...
          </>
        ) : (
          <>
            <span className="mr-1">📎</span>
            Upload Document
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onPick}
          disabled={busy}
        />
      </label>
      
      {/* Error state */}
      {err && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-500 font-medium">❌</span>
          <span className="text-xs text-red-500">{err}</span>
        </div>
      )}

      {/* Help text */}
      {!err && !busy && (
        <span className="text-xs text-gray-500">
          PDF, images, or spreadsheets (max {MAX_MB} MB)
        </span>
      )}
    </div>
  );
}





