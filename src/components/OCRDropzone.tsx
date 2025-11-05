import React, { useRef, useState } from "react";

type OCRHeaders = {
  guardrails?: string;
  piiMask?: string;
  memoryHit?: string;
  memoryCount?: string;
  sessionSummary?: string;
  sessionSummarized?: string;
  employee?: string;
  routeConfidence?: string;
  ocrProvider?: string;
  ocrParse?: string;
  streamChunkCount?: string; // SSE only
  transactionsSaved?: string;
  categorizer?: string;
};

export default function OCRDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [headers, setHeaders] = useState<OCRHeaders>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const pickFile = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    setBusy(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setHeaders({});

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // Build form data
      const fd = new FormData();
      fd.append("file", file);

      // NOTE: we'll use fetch (no native progress) + a tiny fake progress
      // for UX. Backend still streams or returns JSON instantly.
      const fake = setInterval(() => {
        setProgress((p) => (p === null || p >= 95 ? 95 : p + 5));
      }, 200);

      const res = await fetch("/.netlify/functions/ocr", {
        method: "POST",
        body: fd,
        signal: ctrl.signal,
      });

      clearInterval(fake);
      setProgress(100);

      // Capture headers
      const h: OCRHeaders = {
        guardrails: res.headers.get("X-Guardrails") || undefined,
        piiMask: res.headers.get("X-PII-Mask") || undefined,
        memoryHit: res.headers.get("X-Memory-Hit") || undefined,
        memoryCount: res.headers.get("X-Memory-Count") || undefined,
        sessionSummary: res.headers.get("X-Session-Summary") || undefined,
        sessionSummarized: res.headers.get("X-Session-Summarized") || undefined,
        employee: res.headers.get("X-Employee") || undefined,
        routeConfidence: res.headers.get("X-Route-Confidence") || undefined,
        ocrProvider: res.headers.get("X-OCR-Provider") || undefined,
        ocrParse: res.headers.get("X-OCR-Parse") || undefined,
        streamChunkCount: res.headers.get("X-Stream-Chunk-Count") || undefined,
        transactionsSaved: res.headers.get("X-Transactions-Saved") || undefined,
        categorizer: res.headers.get("X-Categorizer") || undefined,
      };
      setHeaders(h);

      // Body
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      setProgress((p) => (p && p < 100 ? 100 : p));
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const onBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  const cancel = () => {
    abortRef.current?.abort();
    setBusy(false);
    setProgress(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition
          ${busy ? "opacity-70" : "hover:bg-gray-50"}
        `}
      >
        <p className="text-lg font-semibold mb-2">Drop a receipt/invoice PDF or image</p>
        <p className="text-sm text-gray-600 mb-4">or click to browse…</p>
        <button
          onClick={pickFile}
          disabled={busy}
          className="px-4 py-2 rounded-xl shadow-sm border hover:shadow transition"
        >
          {busy ? "Uploading…" : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          className="hidden"
          onChange={onBrowse}
        />

        {progress !== null && (
          <div className="mt-4">
            <div className="h-2 rounded bg-gray-200 overflow-hidden">
              <div
                className="h-2 bg-gray-800 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{progress}%</div>
            {busy && (
              <button onClick={cancel} className="text-xs mt-2 underline">
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {/* Headers */}
      {Object.keys(headers).length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Response headers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Object.entries(headers).map(([k, v]) =>
              v ? (
                <div key={k} className="p-2 rounded border bg-white">
                  <span className="font-mono text-gray-500">{k}</span>: {v}
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">OCR result</h3>
          <pre className="p-3 rounded-lg bg-gray-50 border overflow-auto text-sm">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

