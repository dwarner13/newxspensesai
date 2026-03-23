import { useState, useRef } from "react";

interface ChatAttachmentButtonProps {
  onFileSelected: (file: File, source: "camera" | "gallery" | "file") => void;
}

export function ChatAttachmentButton({ onFileSelected }: ChatAttachmentButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, source: "camera" | "gallery" | "file") => {
    const file = e.target.files?.[0];
    if (file) { onFileSelected(file, source); setShowMenu(false); }
    e.target.value = "";
  };

  const menuItem = (emoji: string, label: string, onClick: () => void) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "10px 14px", background: "none", border: "none", borderRadius: 8,
      color: "#e8ecf4", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
      transition: "background 0.15s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = "#1e2d4a"; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
    ><span style={{ fontSize: 18 }}>{emoji}</span>{label}</button>
  );

  return (
    <div style={{ position: "relative" }}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e, "camera")} />
      <input ref={galleryRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e, "gallery")} />
      <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.heic,.webp" style={{ display: "none" }} onChange={e => handleFile(e, "file")} />

      <button onClick={() => setShowMenu(!showMenu)} style={{
        background: "none", border: "none", cursor: "pointer", padding: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#a0aec4", transition: "color 0.2s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "#c8a64e"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "#a0aec4"; }}
      title="Attach file"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
          <div style={{
            position: "absolute", bottom: "100%", left: 0, marginBottom: 8,
            background: "#111a2e", border: "1px solid #1e2d4a", borderRadius: 12,
            padding: 6, minWidth: 200, zIndex: 100,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}>
            {menuItem("\uD83D\uDCF7", "Take Photo", () => cameraRef.current?.click())}
            {menuItem("\uD83D\uDDBC\uFE0F", "Choose from Gallery", () => galleryRef.current?.click())}
            {menuItem("\uD83D\uDCC4", "Upload Statement", () => fileRef.current?.click())}
          </div>
        </>
      )}
    </div>
  );
}
