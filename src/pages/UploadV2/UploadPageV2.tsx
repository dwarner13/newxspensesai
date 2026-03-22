import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { useAuth } from "@/contexts/AuthContext";
import { runSmartImportPipeline } from "@/lib/smartImport/runSmartImportPipeline";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#e8ecf4", muted: "#a0aec4", dim: "#6b7a99", accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", red: "#f87171" };
const ACCEPT = ".pdf,.csv,.jpg,.jpeg,.png,.webp,image/*";

type QueueStatus = "queued" | "processing" | "categorizing" | "complete" | "failed";
interface QueueItem { id: string; file: File; status: QueueStatus; txCount?: number; error?: string; }

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
      const result = await runSmartImportPipeline({
        userId,
        file: current.file,
        source: "upload",
        accessToken: session?.access_token,
      });

      updateItem(current.id, { status: "categorizing" });
      // Brief pause to show Tag status
      await new Promise(r => setTimeout(r, 1500));

      const txCount = result?.stats?.transactionCount || result?.transactionCount || 0;
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
    let hasMore = true;
    while (hasMore) {
      const next = queue.find(q => q.status === "queued");
      if (!next) { hasMore = false; break; }
      processingRef.current = true;
      updateItem(next.id, { status: "processing" });
      try {
        const result = await runSmartImportPipeline({ userId, file: next.file, source: "upload", accessToken: session?.access_token });
        updateItem(next.id, { status: "categorizing" });
        await new Promise(r => setTimeout(r, 1200));
        updateItem(next.id, { status: "complete", txCount: result?.stats?.transactionCount || result?.transactionCount || 0 });
      } catch (err: unknown) {
        updateItem(next.id, { status: "failed", error: err instanceof Error ? err.message : "Failed" });
      }
      processingRef.current = false;
      // Re-read queue for next iteration
      await new Promise(r => setTimeout(r, 300));
    }
    setAllDone(true);
  }, [queue, userId, session, updateItem]);

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
                  {item.status === "processing" && " \u2022 Processing with Byte..."}
                  {item.status === "categorizing" && " \u2022 Categorizing with Tag..."}
                  {item.status === "complete" && ` \u2022 ${item.txCount || 0} transactions extracted`}
                  {item.status === "failed" && ` \u2022 ${item.error || "Failed"}`}
                </div>
              </div>

              {/* Actions */}
              {item.status === "queued" && <button onClick={() => removeItem(item.id)} style={{ fontSize: 11, color: T.dim, background: "none", border: "none", cursor: "pointer" }}>Remove</button>}
              {item.status === "complete" && <button onClick={() => navigate("/dashboard/transactions")} style={{ fontSize: 11, fontWeight: 600, color: T.green, background: "none", border: "none", cursor: "pointer" }}>View {"\u2192"}</button>}
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
                <button onClick={() => navigate("/dashboard/transactions")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: "none", color: T.bg, cursor: "pointer", boxShadow: `0 4px 16px ${T.accent}35` }}>View Transactions</button>
                <button onClick={() => navigate("/dashboard/categories")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>Review Categories</button>
                <button onClick={() => { setQueue([]); setAllDone(false); }} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer" }}>Start New Batch</button>
              </div>
            </div>
          </Reveal>
        )}
      </div>
      <style>{`@keyframes uploadPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
    </>
  );
}
