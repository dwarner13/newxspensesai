import { useEffect, useRef, useState, type ReactNode } from "react";
import { SquarePen, History, PanelRight, Columns2, Maximize2, MoreHorizontal, X } from "lucide-react";
import {
  artworkSize, controlSize, logoSize, visibleDisplayModes, DISPLAY_MODE_LABELS, type ChatDisplayMode,
} from "@/lib/chatToolbar";

/**
 * TB-1 — the universal chat header (owner GO): one component for every employee panel.
 *
 *   [ logo ] Name                [ ✎  🕘 │ ▭ ▥ ⤢ │ ⋯  ✕ ]
 *            Subtitle             ^ compact rounded toolbar
 *
 * Identity (logo, name, subtitle) stays separate from the controls. The toolbar shows only
 * what the employee supports; display-mode buttons never show on phones. Presentation only:
 * every action is a callback the panel already has (no new engine or storage).
 */

const C = { text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc", border: "#1e2d4a", pill: "rgba(255,255,255,0.04)", pillBorder: "rgba(255,255,255,0.08)", menu: "#0f182b" };

export function ChatIdentity({
  isMobile, name, subtitle, renderLogo, logoBackground,
}: {
  isMobile: boolean;
  name: ReactNode;
  subtitle?: string;
  /** Renders the employee's own artwork at the given pixel size (~85% of the container). */
  renderLogo: (artworkPx: number) => ReactNode;
  /** Optional container fill (keeps each employee's existing brand look). */
  logoBackground?: string;
}) {
  const box = logoSize(isMobile);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12, minWidth: 0, flex: 1 }}>
      <span aria-hidden="true" style={{
        width: box, height: box, minWidth: box, flexShrink: 0, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center", background: logoBackground,
      }}>
        {renderLogo(artworkSize(isMobile))}
      </span>
      <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: isMobile ? 17 : 19, fontWeight: 800, color: C.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
        {subtitle && (
          <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</span>
        )}
      </span>
    </div>
  );
}

export interface ChatToolbarMoreItem { label: string; onSelect: () => void }

export function ChatToolbar({
  employeeName, accent, isMobile,
  onNew, history, modes, more, onClose,
}: {
  employeeName: string;
  accent: string;
  isMobile: boolean;
  onNew?: () => void;
  history?: { open: boolean; onToggle: () => void };
  modes?: { current: ChatDisplayMode; supported: ChatDisplayMode[]; onSelect: (m: ChatDisplayMode) => void };
  more?: ChatToolbarMoreItem[];
  onClose?: () => void;
}) {
  const size = controlSize(isMobile);
  const shownModes = visibleDisplayModes(modes?.supported, isMobile);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onDown); };
  }, [menuOpen]);

  const btn = (active = false) => ({
    width: size, height: size, flexShrink: 0, borderRadius: 999, border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit",
    background: active ? `${accent}26` : "transparent", color: active ? accent : C.muted,
  } as const);
  const icon = isMobile ? 20 : 18;
  const divider = <span aria-hidden="true" style={{ width: 1, height: Math.round(size * 0.5), background: C.pillBorder, margin: "0 2px", flexShrink: 0 }} />;
  const modeIcon = { quick: PanelRight, expanded: Columns2, workspace: Maximize2 } as const;

  return (
    <div role="toolbar" aria-label={`${employeeName} conversation controls`}
      style={{ display: "flex", alignItems: "center", gap: 2, padding: 3, borderRadius: 999, background: C.pill, border: `1px solid ${C.pillBorder}`, flexShrink: 0, position: "relative" }}>
      {onNew && (
        <button type="button" onClick={onNew} aria-label="New conversation" title="New conversation" style={btn()}>
          <SquarePen size={icon} aria-hidden="true" />
        </button>
      )}
      {history && (
        <button type="button" onClick={history.onToggle} aria-label="Conversation history" title="Conversation history" aria-expanded={history.open} style={btn(history.open)}>
          <History size={icon} aria-hidden="true" />
        </button>
      )}
      {shownModes.length > 0 && (
        <>
          {divider}
          <span role="group" aria-label="Display mode" style={{ display: "flex", gap: 2 }}>
            {shownModes.map(m => {
              const Icon = modeIcon[m];
              return (
                <button key={m} type="button" onClick={() => modes!.onSelect(m)} aria-pressed={modes!.current === m}
                  aria-label={DISPLAY_MODE_LABELS[m]} title={DISPLAY_MODE_LABELS[m]} style={btn(modes!.current === m)}>
                  <Icon size={icon} aria-hidden="true" />
                </button>
              );
            })}
          </span>
        </>
      )}
      {((more && more.length > 0) || onClose) && divider}
      {more && more.length > 0 && (
        <div ref={menuRef} style={{ position: "relative" }}>
          <button type="button" onClick={() => setMenuOpen(v => !v)} aria-label="More options" title="More options" aria-haspopup="menu" aria-expanded={menuOpen} style={btn(menuOpen)}>
            <MoreHorizontal size={icon} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div role="menu" aria-label="More options" style={{ position: "absolute", right: 0, top: size + 8, zIndex: 40, minWidth: 220, padding: 6, borderRadius: 12, background: C.menu, border: `1px solid ${C.border}`, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
              {more.map(item => (
                <button key={item.label} type="button" role="menuitem"
                  onClick={() => { setMenuOpen(false); item.onSelect(); }}
                  style={{ display: "block", width: "100%", minHeight: 44, padding: "0 12px", textAlign: "left", borderRadius: 8, border: "none", background: "transparent", color: C.text, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {onClose && (
        <button type="button" onClick={onClose} aria-label={`Close ${employeeName}`} title="Close" style={btn()}>
          <X size={icon} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
