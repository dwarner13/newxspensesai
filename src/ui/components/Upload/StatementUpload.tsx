// src/ui/components/Upload/StatementUpload.tsx
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { emitBus } from "@/lib/bus";
import { useAuthContext } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { requestOcrProcessing } from "@/lib/ocr/requestOcrProcessing";

type Exposed = { open: (accept?: string[]) => void };

const StatementUpload = forwardRef<Exposed>((_, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { userId } = useAuthContext();

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
      if (!userId) throw new Error("Missing userId");

      emitBus("PARSE_REQUESTED", { fileName: file.name, bytes: file.size });

      const requestId = `statement_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ocrResult = await requestOcrProcessing({ file, userId, requestId });

      if (!ocrResult.ok || !ocrResult.documentId) {
        throw new Error(ocrResult.error || "OCR request failed");
      }

      const sb = getSupabase();
      if (!sb) throw new Error("Supabase client not available");

      const importId = await waitForImportId(sb, ocrResult.documentId, userId);
      if (!importId) {
        throw new Error("Import not ready yet");
      }

      emitBus("PARSE_COMPLETED", { 
        importId, 
        previewCount: 0,
        importRunId: ocrResult.importRunId,
        documentId: ocrResult.documentId,
      });
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
      {busy && <div className="fixed bottom-4 right-4 rounded-2xl bg-black/60 px-3 py-2 text-sm text-white">Uploading...</div>}
    </>
  );
});

StatementUpload.displayName = "StatementUpload";
export default StatementUpload;

async function waitForImportId(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  documentId: string,
  userId: string,
  maxAttempts: number = 20,
  intervalMs: number = 1500
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: importRecord } = await sb
      .from("imports")
      .select("id")
      .eq("document_id", documentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (importRecord?.id) {
      return importRecord.id;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}






