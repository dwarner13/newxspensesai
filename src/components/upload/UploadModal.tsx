import { useState, useRef, useCallback, useEffect } from "react";
import { useAtom } from "jotai";
import { createPortal } from "react-dom";
import { isUploadModalOpenAtom } from "@/lib/uiStore";
import { useAuth } from "@/contexts/AuthContext";
import { useSmartImport } from "@/hooks/useSmartImport";

const ACCEPT = ".pdf,.csv,.jpg,.jpeg,.png,.webp";
const T = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#7b8ba5", dim: "#4a5a75",
  accent: "#c8a64e", green: "#34d399",
};

export function UploadModal() {
  const [isOpen, setIsOpen] = useAtom(isUploadModalOpenAtom);
  const { userId } = useAuth();
  const smartImport = useSmartImport(userId || undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const dragCount = useRef(0);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedFile(null);
    setDragOver(false);
  }, [setIsOpen]);

  // Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleClose]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile || !userId) return;
    await smartImport.uploadFiles([selectedFile]);
    // Keep modal open to show progress — close on completion
  }, [selectedFile, userId, smartImport]);

  const step = smartImport.uploadStatus.step;
  const isProcessing = step === "uploading" || step === "processing";
  const isDone = step === "completed";

  // Auto-close after completion
  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => { handleClose(); smartImport.resetUploadState(); }, 3000);
      return () => clearTimeout(t);
    }
  }, [isDone, handleClose, smartImport]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 900,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        }}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 901, width: 520, maxHeight: "80vh",
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 20,
          boxShadow: "0 16px 48px rgba(0,0,0,0.5), 0 0 40px rgba(200,166,78,0.05)",
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
          display: "flex", flexDirection: "column",
        }}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `linear-gradient(135deg, ${T.green}30, ${T.green}10)`,
            border: `1.5px solid ${T.green}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: T.green,
            boxShadow: `0 0 16px ${T.green}33`,
          }}>B</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Upload Statement</div>
            <div style={{ fontSize: 11, color: T.dim }}>Byte will extract and categorize instantly</div>
          </div>
          <button onClick={handleClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: T.surface, border: `1px solid ${T.border}`,
            color: T.muted, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2715"}</button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", overflowY: "auto" }}>
          {/* Drop zone */}
          {!selectedFile && !isProcessing && !isDone && (
            <div
              onClick={() => fileRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); dragCount.current++; setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); dragCount.current--; if (dragCount.current <= 0) { dragCount.current = 0; setDragOver(false); } }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); dragCount.current = 0; setDragOver(false); handleFiles(e.dataTransfer.files); }}
              style={{
                border: `2px dashed ${dragOver ? T.accent : 'rgba(200,166,78,0.3)'}`,
                borderRadius: 20, padding: "48px 24px", textAlign: "center",
                background: dragOver ? "rgba(200,166,78,0.08)" : "rgba(200,166,78,0.04)",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: dragOver ? "0 8px 32px rgba(200,166,78,0.1)" : "none",
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 6 }}>Drop your statement here</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 8 }}>or click to browse</div>
              <div style={{ fontSize: 11, color: T.dim }}>PDF, CSV, JPG, PNG</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept={ACCEPT} style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) handleFiles(e.target.files); e.target.value = ""; }} />

          {/* File preview */}
          {selectedFile && !isProcessing && !isDone && (
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
              padding: "16px 20px", marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 24 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>{(selectedFile.size / 1024).toFixed(0)} KB</div>
                </div>
                <button onClick={() => setSelectedFile(null)} style={{
                  fontSize: 11, color: T.dim, background: "transparent", border: "none", cursor: "pointer",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.dim; }}
                >Remove</button>
              </div>
            </div>
          )}

          {/* Process button */}
          {selectedFile && !isProcessing && !isDone && (
            <button onClick={handleProcess} style={{
              width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 14, fontWeight: 700,
              background: `linear-gradient(135deg, ${T.accent}, #a08030)`,
              border: "none", color: "#0b1220", cursor: "pointer",
              boxShadow: `0 4px 16px rgba(200,166,78,0.4)`,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(200,166,78,0.55)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(200,166,78,0.4)"; }}
            >Process with Byte {"\u2192"}</button>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px",
                background: `linear-gradient(135deg, ${T.green}30, ${T.green}10)`,
                border: `1.5px solid ${T.green}44`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 700, color: T.green,
                animation: "uploadPulse 1.5s ease-in-out infinite",
                boxShadow: `0 0 24px ${T.green}33`,
              }}>B</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>
                {step === "uploading" ? "Uploading..." : "Byte is extracting transactions..."}
              </div>
              <div style={{ fontSize: 12, color: T.muted }}>{smartImport.uploadStatus.fileName}</div>
              {/* Progress bar */}
              <div style={{ margin: "16px auto 0", width: "80%", height: 4, borderRadius: 2, background: T.surface }}>
                <div style={{
                  height: "100%", borderRadius: 2, transition: "width 0.5s ease",
                  background: `linear-gradient(90deg, ${T.accent}, ${T.green})`,
                  width: `${smartImport.uploadStatus.progress}%`,
                }} />
              </div>
              <style>{`@keyframes uploadPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }`}</style>
            </div>
          )}

          {/* Done state */}
          {isDone && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{"\u2705"}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.green, marginBottom: 4 }}>Upload Complete!</div>
              <div style={{ fontSize: 13, color: T.muted }}>
                Byte extracted transactions from {smartImport.uploadStatus.fileName || "your file"}
              </div>
            </div>
          )}

          {/* Byte status strip */}
          {!isProcessing && !isDone && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginTop: 20,
              padding: "10px 14px", borderRadius: 12,
              background: `${T.green}06`, borderLeft: `3px solid ${T.green}33`,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: `${T.green}20`, border: `1px solid ${T.green}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: T.green,
              }}>B</div>
              <span style={{ fontSize: 12, color: T.muted }}>Byte is ready to process your statement</span>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
