// src/ui/components/Upload/StatementUpload.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { emitBus } from "@/lib/bus";

type Exposed = { open: (accept?: string[]) => void };

const StatementUpload = forwardRef<Exposed>((_, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (accept) => {
      if (inputRef.current) {
        inputRef.current.accept = accept?.join(",") ?? ".pdf,.csv,image/*";
        inputRef.current.click();
      }
    },
  }));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      // 1) Get signed URL from Netlify (server)
      const r1 = await fetch("/.netlify/functions/get-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime: file.type, bytes: file.size }),
      });
      if (!r1.ok) throw new Error("get-upload-url failed");
      const { uploadUrl, fileKey } = await r1.json();

      // 2) Upload direct to storage
      const put = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!put.ok) throw new Error("PUT upload failed");
      emitBus("UPLOAD_COMPLETED", { fileKey, mime: file.type, bytes: file.size });

      // 3) Kick off ingest (creates import, returns importId)
      const r2 = await fetch("/.netlify/functions/ingest-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey, mime: file.type, bytes: file.size }),
      });
      if (!r2.ok) throw new Error("ingest-statement failed");
      const { importId } = await r2.json();

      // 4) Parse via Byte (OCR/CSV/PDF)
      emitBus("PARSE_REQUESTED", { fileKey });
      const r3 = await fetch("/.netlify/functions/byte-ocr-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId }),
      });
      if (!r3.ok) throw new Error("byte-ocr-parse failed");
      const { previewCount } = await r3.json();
      emitBus("PARSE_COMPLETED", { importId, previewCount });
    } catch (err: any) {
      emitBus("ERROR", { where: "StatementUpload", message: err?.message ?? "upload error", detail: err });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={onPick}
        aria-hidden
      />
      {/* Optional overlay spinner when busy */}
      {busy && <div className="fixed bottom-4 right-4 rounded-2xl bg-black/60 px-3 py-2 text-sm text-white">Uploading…</div>}
    </>
  );
});

StatementUpload.displayName = "StatementUpload";
export default StatementUpload;





