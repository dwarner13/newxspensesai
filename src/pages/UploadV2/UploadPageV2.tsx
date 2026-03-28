import { useState, useRef, useCallback } from "react";
import { StatementHistory } from '../../components/upload/StatementHistory';
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { runSmartImportPipeline } from "@/lib/smartImport/runSmartImportPipeline";

function detectIssuer(filename: string): string {
  const f = (filename || '').toLowerCase();
  if (f.includes('bmo')) return 'BMO';
  if (f.includes('rbc') || f.includes('avion')) return 'RBC Avion';
  if (f.includes('cibc')) return 'CIBC';
  if (f.includes('canadian tire') || f.includes('ctfs')) return 'Canadian Tire';
  if (f.includes('td ') || f.includes('td_') || f.startsWith('td')) return 'TD';
  if (f.includes('amex') || f.includes('american express')) return 'Amex';
  if (f.includes('scotiabank') || f.includes('scotia')) return 'Scotiabank';
  return 'Unknown';
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function checkDuplicateHash(hash: string, userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase
    .from("user_documents")
    .select("id")
    .eq("user_id", userId)
    .eq("file_hash", hash)
    .limit(1);
  return (data && data.length > 0) || false;
}

async function storeFileHash(userId: string, fileName: string, hash: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from("user_documents")
    .update({ file_hash: hash })
    .eq("user_id", userId)
    .eq("original_name", fileName)
    .is("file_hash", null)
    .order("created_at", { ascending: false })
    .limit(1);
}

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#a0aec4", dim: "#6b7a99", accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", red: "#f87171" };
const ACCEPT = ".pdf,.csv,.jpg,.jpeg,.png,.webp,.xlsx,.xls,image/*";

function isSpreadsheetFile(name: string): boolean {
  const ext = name.toLowerCase().split(".").pop() || "";
  return ["xlsx", "xls", "csv"].includes(ext);
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip "data:...;base64," prefix
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function handleSpreadsheetUpload(file: File, userId: string, authToken?: string, fileHash?: string): Promise<{ success: boolean; import_id?: string; byte_message?: string; transaction_count?: number; error?: string }> {
  const base64 = await fileToBase64(file);
  const response = await fetch("/.netlify/functions/process-spreadsheet", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ file_base64: base64, filename: file.name, file_hash: fileHash }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Spreadsheet import failed");

  // Auto-approve and auto-commit so transactions flow through the full pipeline
  // (approve sets approved_at, commit moves staging → transactions + runs Tag)
  if (data.import_id) {
    const authHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-id": userId,
    };
    if (authToken) authHeaders["Authorization"] = `Bearer ${authToken}`;

    // Approve
    await fetch("/.netlify/functions/approve-import", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ importId: data.import_id }),
    });

    // Commit (moves staging → transactions, triggers Tag categorization)
    const commitRes = await fetch("/.netlify/functions/commit-import", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ importId: data.import_id }),
    });
    const commitData = await commitRes.json();
    if (commitData.committed) {
      data.transaction_count = commitData.committed;
    }

    // Tag the import with detected issuer — non-blocking
    const issuer = detectIssuer(file.name);
    fetch('/.netlify/functions/set-import-issuer', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ importId: data.import_id, issuer }),
    }).catch(err => console.warn('set-import-issuer failed (non-blocking):', err));
  }

  return data;
}

type QueueStatus = "queued" | "processing" | "categorizing" | "complete" | "failed";
interface QueueItem { id: string; file: File; status: QueueStatus; txCount?: number; error?: string; progress?: number; }

export default function UploadPageV2() {
  const navigate = useNavigate();
  const { userId, session } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const dragCount = useRef(0);
  const processingRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  queueRef.current = queue;

  const introText = "Drop as many statements as you want. I'll work through them one at a time \u2014 extract transactions, hand each off to Tag for categorization, then Prime reviews.";
  const [typed, typeDone] = useTypewriter(introText, 14, 400);

  const addFiles = useCallback((files: FileList | File[]) => {
    const items: QueueItem[] = Array.from(files).map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      status: "queued" as const,
    }));
    setQueue(prev => [...prev, ...items]);
    setAllDone(false);
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }, []);

  const processNext = useCallback(async () => {
    if (processingRef.current || !userId) return;
    const current = queue.find(q => q.status === "queued");
    if (!current) {
      // Check if everything is done
      if (queue.length > 0 && queue.every(q => q.status === "complete" || q.status === "failed")) {
        setAllDone(true);
      }
      return;
    }

    processingRef.current = true;
    updateItem(current.id, { status: "processing" });

    try {
      // ── Duplicate file check ──
      const fileHash = await computeFileHash(current.file);
      const isDupe = await checkDuplicateHash(fileHash, userId);
      if (isDupe) {
        toast.error(`This file has already been uploaded: ${current.file.name}`);
        updateItem(current.id, { status: "failed", error: "Duplicate file" });
        processingRef.current = false;
        return;
      }

      let txCount = 0;

      if (isSpreadsheetFile(current.file.name)) {
        // ── XLSX/CSV path — use dedicated spreadsheet processor ──
        const xlResult = await handleSpreadsheetUpload(current.file, userId, session?.access_token, fileHash);
        txCount = xlResult.transaction_count || 0;
      } else {
        // ── PDF/image path — use existing OCR pipeline ──
        const result = await runSmartImportPipeline({
          userId, file: current.file, fileName: current.file.name,
          mimeType: current.file.type || "application/octet-stream",
          fileSize: current.file.size, source: "upload", authToken: session?.access_token,
        });
        txCount = result?.stats?.transactionCount || result?.transactionCount || 0;
      }

      // Store hash for future duplicate detection
      void storeFileHash(userId, current.file.name, fileHash);

      updateItem(current.id, { status: "categorizing" });
      await new Promise(r => setTimeout(r, 1500));
      updateItem(current.id, { status: "complete", txCount });
    } catch (err: unknown) {
      updateItem(current.id, { status: "failed", error: err instanceof Error ? err.message : "Processing failed" });
    } finally {
      processingRef.current = false;
    }
  }, [queue, userId, session, updateItem]);

  // Auto-process: after each item completes, start next
  const processAll = useCallback(async () => {
    if (!userId) { toast.error("Not authenticated"); return; }
    const processNextInQueue = async (): Promise<void> => {
      const currentQueue = queueRef.current;
      const next = currentQueue.find(q => q.status === "queued");
      if (!next) { setAllDone(true); return; }
      processingRef.current = true;
      updateItem(next.id, { status: "processing" });
      try {
        // ── Duplicate file check ──
        const fileHash = await computeFileHash(next.file);
        const isDupe = await checkDuplicateHash(fileHash, userId);
        if (isDupe) {
          toast.error(`This file has already been uploaded: ${next.file.name}`);
          updateItem(next.id, { status: "failed", error: "Duplicate file" });
          processingRef.current = false;
          await processNextInQueue();
          return;
        }

        let txCount = 0;

        if (isSpreadsheetFile(next.file.name)) {
          const xlResult = await handleSpreadsheetUpload(next.file, userId, session?.access_token, fileHash);
          txCount = xlResult.transaction_count || 0;
        } else {
          const result = await runSmartImportPipeline({ userId, file: next.file, fileName: next.file.name, mimeType: next.file.type || "application/octet-stream", fileSize: next.file.size, source: "upload", authToken: session?.access_token });
          txCount = result?.stats?.transactionCount || result?.transactionCount || 0;
        }

        // Store hash for future duplicate detection
        void storeFileHash(userId, next.file.name, fileHash);

        updateItem(next.id, { status: "categorizing" });
        await new Promise(r => setTimeout(r, 1200));
        updateItem(next.id, { status: "complete", txCount });
      } catch (err: unknown) {
        updateItem(next.id, { status: "failed", error: err instanceof Error ? err.message : "Failed" });
      }
      processingRef.current = false;
      await new Promise(r => setTimeout(r, 500));
      await processNextInQueue();
    };
    await processNextInQueue();
  }, [userId, session, updateItem]);

  const removeItem = (id: string) => setQueue(prev => prev.filter(q => q.id !== id));
  const retryItem = (id: string) => { updateItem(id, { status: "queued", error: undefined }); };
  const clearQueued = () => setQueue(prev => prev.filter(q => q.status !== "queued"));

  const stats = {
    total: queue.length,
    complete: queue.filter(q => q.status === "complete").length,
    processing: queue.filter(q => q.status === "processing" || q.status === "categorizing").length,
    queued: queue.filter(q => q.status === "queued").length,
    failed: queue.filter(q => q.status === "failed").length,
    totalTx: queue.reduce((s, q) => s + (q.txCount || 0), 0),
  };

  const byteStatus = stats.processing > 0 ? `Processing ${stats.complete + 1} of ${stats.total}...` : stats.total === 0 ? "Idle \u2014 waiting for files" : allDone ? "All done!" : "Ready";
  const tagStatus = queue.some(q => q.status === "categorizing") ? "Categorizing..." : stats.processing > 0 ? "Waiting for Byte..." : allDone ? "All categorized!" : "Standing by";
  const primeStatus = allDone ? "Ready for briefing" : stats.processing > 0 ? "Waiting..." : "Standing by";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans'", color: T.text, padding: "28px 36px", maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <Reveal delay={0}>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "white" }}>Bulk Upload</h1>
          <p style={{ fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 20 }}>Drop all your statements. Byte processes them one at a time.</p>
        </Reveal>

        {/* Byte intro */}
        <Reveal delay={100}>
          <div style={{ display: "flex", gap: 10, padding: "14px 18px", borderRadius: 14, background: `${T.green}06`, border: `1px solid ${T.green}15`, marginBottom: 24 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${T.green}20`, border: `1.5px solid ${T.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.green }}>B</div>
            <div style={{ flex: 1, fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>
              {typed}<span style={{ opacity: !typeDone ? 1 : 0, color: T.green }}>{"\u2588"}</span>
            </div>
          </div>
        </Reveal>

        {/* Drop zone */}
        <Reveal delay={200}>
          <div
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); dragCount.current++; setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); dragCount.current--; if (dragCount.current <= 0) { dragCount.current = 0; setDragOver(false); } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); dragCount.current = 0; setDragOver(false); addFiles(e.dataTransfer.files); }}
            style={{
              border: `2px dashed ${dragOver ? T.green : "rgba(52,211,153,0.3)"}`,
              borderRadius: 20, padding: "48px 24px", textAlign: "center", cursor: "pointer",
              background: dragOver ? "rgba(52,211,153,0.08)" : "rgba(52,211,153,0.04)",
              transition: "all 0.2s", marginBottom: 24,
              boxShadow: dragOver ? `0 8px 32px ${T.green}10` : "none",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>{"\uD83D\uDCC4"}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Drop statements here</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>or click to browse</div>
            <div style={{ fontSize: 11, color: T.dim }}>PDF, CSV, JPG, PNG \u2014 add as many as you want</div>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
          <button onClick={() => cameraRef.current?.click()} style={{
            padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 600,
            background: T.surface, border: `1px solid ${T.border}`, color: T.muted,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            margin: "12px auto 0",
          }}>{"\uD83D\uDCF7"} Take Photo of Receipt</button>
        </Reveal>

        {/* Queue controls */}
        {queue.length > 0 && (
          <Reveal delay={0}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: T.dim }}>
                {stats.total} file{stats.total !== 1 ? "s" : ""} {"\u2022"} {stats.complete} complete {"\u2022"} {stats.processing} processing {"\u2022"} {stats.queued} queued
                {stats.failed > 0 && <span style={{ color: T.red }}> {"\u2022"} {stats.failed} failed</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={clearQueued} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.dim, cursor: "pointer" }}>Clear Queue</button>
                <button onClick={() => fileRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>Add More</button>
                {stats.queued > 0 && (
                  <button onClick={processAll} style={{ padding: "7px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: "none", color: T.bg, cursor: "pointer", boxShadow: `0 4px 16px ${T.accent}35` }}>Process All {"\u2192"}</button>
                )}
              </div>
            </div>
          </Reveal>
        )}

        {/* Queue list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {queue.map((item, idx) => (
            <div key={item.id} style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
              transition: "all 0.2s",
              boxShadow: item.status === "processing" ? `0 0 20px ${T.green}10` : item.status === "categorizing" ? `0 0 20px ${T.cyan}10` : "none",
            }}>
              {/* Status icon */}
              <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0,
                background: item.status === "complete" ? `${T.green}15` : item.status === "failed" ? `${T.red}15` : item.status === "processing" ? `${T.green}20` : item.status === "categorizing" ? `${T.cyan}20` : `${T.dim}15`,
                color: item.status === "complete" ? T.green : item.status === "failed" ? T.red : item.status === "processing" ? T.green : item.status === "categorizing" ? T.cyan : T.dim,
                border: `1.5px solid ${item.status === "complete" ? T.green + "33" : item.status === "failed" ? T.red + "33" : item.status === "processing" ? T.green + "44" : item.status === "categorizing" ? T.cyan + "44" : T.dim + "22"}`,
                ...(item.status === "processing" || item.status === "categorizing" ? { animation: "uploadPulse 1.5s ease-in-out infinite" } : {}),
              }}>
                {item.status === "complete" ? "\u2713" : item.status === "failed" ? "\u2717" : item.status === "processing" ? "B" : item.status === "categorizing" ? "T" : `#${idx + 1}`}
              </div>

              {/* File info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file.name}</div>
                <div style={{ fontSize: 11, color: T.dim }}>
                  {(item.file.size / 1024).toFixed(0)} KB
                  {item.status === "queued" && ` \u2022 #${queue.filter(q => q.status === "queued").indexOf(item) + 1} in queue`}
                  {item.status === "processing" && ` \u2022 Processing with Byte... ${item.progress || 0}%`}
                  {item.status === "categorizing" && " \u2022 Categorizing with Tag..."}
                  {item.status === "complete" && ` \u2022 ${item.txCount || 0} transactions extracted`}
                  {item.status === "failed" && ` \u2022 ${item.error || "Failed"}`}
                </div>
              {(item.status === "processing" || item.status === "categorizing") && <div style={{ width: "100%", height: 3, borderRadius: 2, background: `${T.dim}22`, marginTop: 6, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 2, background: item.status === "categorizing" ? T.cyan : T.green, width: `${item.progress || 0}%`, transition: "width 0.5s ease" }} /></div>}
              </div>

              {/* Actions */}
              {item.status === "queued" && <button onClick={() => removeItem(item.id)} style={{ fontSize: 11, color: T.dim, background: "none", border: "none", cursor: "pointer" }}>Remove</button>}
              {item.status === "complete" && <button onClick={() => navigate("/dashboard/transactions?from=upload")} style={{ fontSize: 11, fontWeight: 600, color: T.green, background: "none", border: "none", cursor: "pointer" }}>View {"\u2192"}</button>}
              {item.status === "failed" && <button onClick={() => retryItem(item.id)} style={{ fontSize: 11, fontWeight: 600, color: T.accent, background: "none", border: "none", cursor: "pointer" }}>Retry</button>}
            </div>
          ))}
        </div>

        {/* Agent status strip */}
        {queue.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginTop: 24, padding: "14px 18px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}` }}>
            {[
              { letter: "B", name: "Byte", color: T.green, status: byteStatus },
              { letter: "T", name: "Tag", color: T.cyan, status: tagStatus },
              { letter: "\u2655", name: "Prime", color: T.accent, status: primeStatus },
            ].map(a => (
              <div key={a.name} style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${a.color}20`, border: `1.5px solid ${a.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: a.color }}>{a.letter}</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: a.color }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: T.dim }}>{a.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completion summary */}
        {allDone && stats.complete > 0 && (
          <Reveal delay={0}>
            <div style={{ marginTop: 24, padding: "24px", borderRadius: 18, background: `${T.green}06`, border: `1px solid ${T.green}18` }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.green, marginBottom: 8 }}>{"\u2705"} All Done!</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>
                {stats.complete} file{stats.complete !== 1 ? "s" : ""} processed {"\u2022"} {stats.totalTx} total transactions extracted
                {stats.failed > 0 && <span style={{ color: T.red }}> {"\u2022"} {stats.failed} failed</span>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => navigate("/dashboard/transactions?from=upload")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: "none", color: T.bg, cursor: "pointer", boxShadow: `0 4px 16px ${T.accent}35` }}>View Transactions</button>
                <button onClick={() => navigate("/dashboard/categories")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>Review Categories</button>
                <button onClick={() => { setQueue([]); setAllDone(false); }} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>Start New Batch</button>
              </div>
            </div>
          </Reveal>
        )}
      </div>

      {/* Statement History */}
      <StatementHistory />
      <style>{`@keyframes uploadPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
    </>
  );
}
