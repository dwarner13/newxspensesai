import { useState, useRef, type KeyboardEvent } from "react";
import { THEME } from "./agentConfig";
import { ChatAttachmentButton } from "@/components/chat/ChatAttachmentButton";

const ACCEPT = ".pdf,.csv,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,image/jpeg,image/png,image/webp";

interface PrimeChatInputProps {
  onSend: (message: string) => void;
  onFileSelected?: (file: File) => void;
  initialValue?: string;
}

export function PrimeChatInput({ onSend, onFileSelected, initialValue = "" }: PrimeChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      onFileSelected(file);
    }
    // Reset so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: THEME.surface,
          borderRadius: 16,
          border: `1px solid ${THEME.border}`,
          padding: "4px 6px 4px 6px",
        }}
      >
        {/* Attachment button with camera/gallery/file menu */}
        <ChatAttachmentButton onFileSelected={(file) => { if (onFileSelected) onFileSelected(file); }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach a statement (PDF, CSV, image)"
          style={{
            display: "none", /* Hidden — replaced by ChatAttachmentButton */
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "transparent",
            border: `1px solid ${THEME.border}`,
            color: THEME.textMuted,
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = THEME.accent; e.currentTarget.style.color = THEME.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.textMuted; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask Prime anything..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: THEME.text,
            fontSize: 13,
            padding: "10px 0",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 2px 12px ${THEME.accent}44`,
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#0b1220" />
          </svg>
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          marginTop: 8,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: THEME.green,
          }}
        />
        <span style={{ fontSize: 10, color: THEME.textDim }}>
          Secured &bull; Guardrails + PII protection active
        </span>
      </div>
    </div>
  );
}
