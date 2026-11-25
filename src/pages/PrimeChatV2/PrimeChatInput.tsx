import { useState, useRef, useEffect, useLayoutEffect, type KeyboardEvent } from "react";
import { useAtom } from "jotai";
import { primeDraftsAtom } from "@/lib/uiStore";
import { draftKey, readDraft, writeDraft, keepOnlyUser } from "@/lib/primeDraft";
import { THEME } from "./agentConfig";
import { PANEL } from "./panelConfig";
import { ChatAttachmentButton } from "@/components/chat/ChatAttachmentButton";
import { computeComposerHeight, COMPOSER_MAX_HEIGHT_PX } from "@/lib/chatComposer";
import { CHAT_VISUALS, chatTextSize } from "@/lib/chatVisualStandards";
import { useIsMobile } from "@/hooks/useIsMobile";

const ACCEPT = ".pdf,.csv,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,image/jpeg,image/png,image/webp";

interface PrimeChatInputProps {
  onSend: (message: string) => void;
  onFileSelected?: (file: File) => void;
  initialValue?: string;
  /** P2-c: the signed-in user and the open conversation, used only to key the in-memory draft. */
  userId?: string | null;
  sessionId?: string | null;
}

export function PrimeChatInput({ onSend, onFileSelected, initialValue = "", userId, sessionId }: PrimeChatInputProps) {
  // P2-c: unsent text survives closing/reopening Prime and switching modes or conversations
  // within this tab. In memory only; never stored, logged or sent until Send.
  const [drafts, setDrafts] = useAtom(primeDraftsAtom);
  const key = draftKey(userId, sessionId);
  const [value, setValueState] = useState(() => readDraft(drafts, key) || initialValue);
  const setValue = (text: string) => {
    setValueState(text);
    setDrafts(d => writeDraft(d, key, text));
  };
  // Switching conversations shows that conversation's own draft.
  const loadedKeyRef = useRef(key);
  useEffect(() => {
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;
    setValueState(readDraft(drafts, key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Drafts of any other user are dropped when the signed-in user changes (logout / switch).
  useEffect(() => { setDrafts(d => keepOnlyUser(d, userId)); }, [userId, setDrafts]);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  // P1-c: multi-line composer that grows from one line up to COMPOSER_MAX_HEIGHT_PX, then scrolls.
  const textRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const { height, scrollable } = computeComposerHeight(el.scrollHeight);
    el.style.height = `${height}px`;
    el.style.overflowY = scrollable ? "auto" : "hidden";
  }, [value]);
  const canSend = value.trim().length > 0;

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter adds a line; Enter that commits an IME composition
    // (foreign-language keyboards) never sends.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelected) {
      setPendingFile(file.name);
      onFileSelected(file);
      // Clear pill after 8s (upload should be done by then)
      setTimeout(() => setPendingFile(null), 8000);
    }
    // Reset so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div>
      {pendingFile && (
        <div style={{
          background: '#111a2e', border: '1px solid #1e2d4a', borderRadius: 8,
          padding: '6px 12px', color: '#e8ecf4', fontSize: 13, marginBottom: 8,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{'\ud83d\udcce'} {pendingFile}</span>
          <span style={{ color: '#9ba8bc', fontSize: 11 }}>Processing...</span>
          <button onClick={() => setPendingFile(null)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: '#9ba8bc', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
          }}>{'\u00d7'}</button>
        </div>
      )}
      <div
        className="chat-composer"
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          background: THEME.surface,
          borderRadius: 18,
          border: `1px solid ${THEME.borderLight}`,
          padding: "6px",
        }}
      >
        {/* Attachment button with camera/gallery/file menu */}
        <ChatAttachmentButton onFileSelected={(file) => { if (onFileSelected) onFileSelected(file); }} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          title="Attach a statement (PDF, CSV, image)"
          style={{
            display: "none", /* Hidden - replaced by ChatAttachmentButton */
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

        <textarea
          ref={textRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask Prime anything..."
          aria-label="Message Prime"
          data-composer=""
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            resize: "none",
            color: THEME.text,
            // 16px+ on mobile prevents iOS focus zoom; 17px desktop per the visual standard.
            fontSize: Math.max(PANEL.inputFontSize, chatTextSize(isMobile)),
            lineHeight: 1.5,
            // CHAT-POLISH: text sits clear of the frame and the attach button.
            padding: "11px 10px 11px 10px",
            maxHeight: COMPOSER_MAX_HEIGHT_PX,
            overflowY: "hidden",
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: CHAT_VISUALS.touchTarget,
            height: CHAT_VISUALS.touchTarget,
            flexShrink: 0,
            borderRadius: 12,
            background: canSend ? `linear-gradient(135deg, ${THEME.accent}, #a08030)` : THEME.surfaceLight,
            border: canSend ? "none" : `1px solid ${THEME.border}`,
            cursor: canSend ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: canSend ? `0 2px 12px ${THEME.accent}44` : "none",
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill={canSend ? "#0b1220" : THEME.textDim} />
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
        <span style={{ fontSize: 12, color: THEME.textDim }}>
          Secured &bull; Guardrails + PII protection active
        </span>
      </div>
    </div>
  );
}
