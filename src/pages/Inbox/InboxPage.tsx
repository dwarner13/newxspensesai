import { useState, useEffect, useCallback } from "react";
import { Star, Pencil, Reply, Archive, ExternalLink } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

// ─── Design tokens ──────────────────────────────────────────────────────
const T = {
  bg: "#0b1220", surface: "#111a2e", surfaceLight: "#131f35", surfaceHover: "#162338",
  border: "#1e2d4a", borderLight: "#253754",
  text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc",
  cyan: "#22d3ee", gold: "#c8a64e", goldLight: "#e0b96a", green: "#34d399",
  red: "#f87171", amber: "#fbbf24", purple: "#a78bfa", blue: "#3b82f6",
};

const AGENT_MAP: Record<string, { name: string; role: string; color: string; initial: string }> = {
  "prime-boss": { name: "Prime", role: "Your Financial Advisor", color: T.gold, initial: "\u265B" },
  "prime": { name: "Prime", role: "Your Financial Advisor", color: T.gold, initial: "\u265B" },
  "byte-docs":  { name: "Byte",  role: "Statement Processor", color: T.green, initial: "B" },
  "byte":       { name: "Byte",  role: "Statement Processor", color: T.green, initial: "B" },
  "tag-ai":     { name: "Tag",   role: "Categorization Agent", color: T.cyan, initial: "T" },
  "crystal-analytics": { name: "Crystal", role: "Pattern Intelligence", color: T.purple, initial: "C" },
  "crystal":    { name: "Crystal", role: "Pattern Intelligence", color: T.purple, initial: "C" },
  "ledger-tax": { name: "Ledger", role: "Tax Specialist", color: T.blue, initial: "L" },
  "goalie-agent": { name: "Goalie", role: "Goals Tracker", color: T.amber, initial: "G" },
  "chime-notifications": { name: "Chime", role: "Reminders", color: T.amber, initial: "\uD83D\uDD14" },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: T.red,   bg: T.red + "18",   label: "Urgent" },
  action:   { color: T.gold,  bg: T.gold + "18",  label: "Action" },
  info:     { color: T.blue,  bg: T.blue + "18",  label: "Info" },
  success:  { color: T.green, bg: T.green + "18", label: "Done" },
};

interface Notification {
  id: string;
  employee_slug: string;
  priority: string;
  title: string;
  description: string | null;
  href: string | null;
  read: boolean;
  created_at: string;
}

type Folder = "all" | "unread" | "starred" | "prime-boss" | "byte-docs" | "tag-ai" | "crystal-analytics";

const FOLDERS: { key: Folder; label: string; color?: string; icon?: string }[] = [
  { key: "all", label: "All Inbox" },
  { key: "unread", label: "Unread" },
  { key: "starred", label: "Starred" },
  { key: "prime-boss", label: "Prime", color: T.gold },
  { key: "byte-docs", label: "Byte", color: T.green },
  { key: "tag-ai", label: "Tag", color: T.cyan },
  { key: "crystal-analytics", label: "Crystal", color: T.purple },
];

const DEMO_MESSAGES: Notification[] = [
  {
    id: "demo-1", employee_slug: "byte", priority: "success", read: false, href: null,
    title: "Statement Processed \u2014 BMO March 2025",
    description: "I finished reading your BMO statement. 117 transactions extracted and passed to Tag for categorization. Everything looks clean.",
    created_at: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: "demo-2", employee_slug: "tag-ai", priority: "action", read: false, href: "/dashboard/categories",
    title: "Categorization Complete \u2014 691 transactions sorted",
    description: "Done. 607 transactions categorized across 15 categories. I flagged 140 in Other that need a second look \u2014 want me to go through them?",
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "demo-3", employee_slug: "crystal", priority: "action", read: false, href: "/dashboard/reports",
    title: "Pattern Detected \u2014 Transfers dominating at 33%",
    description: "Transfers represent $32,194 \u2014 33% of all spending. This is unusually high. Worth flagging for your accountant meeting on Monday.",
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "demo-4", employee_slug: "prime-boss", priority: "info", read: true, href: null,
    title: "Weekly Briefing \u2014 Your numbers are ready",
    description: "Net flow is -$11,086 this period. Income at $87,966, expenses at $99,052. Your biggest gap is unclassified spend in Other at $27K. I have prepared a summary for your accountant.",
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "demo-5", employee_slug: "byte", priority: "info", read: true, href: null,
    title: "Duplicate Protection Triggered \u2014 1 file blocked",
    description: "I detected a duplicate upload attempt for BMO February 2025. The file was already imported on March 26. No action needed.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function getAgent(slug: string) {
  return AGENT_MAP[slug] || { name: slug, role: "AI Agent", color: T.dim, initial: "?" };
}

export default function InboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<Folder>("all");
  const [selected, setSelected] = useState<Notification | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth < 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const sb = getSupabase();
      if (!sb) { setNotifications(DEMO_MESSAGES); setLoading(false); return; }
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setNotifications(DEMO_MESSAGES); setLoading(false); return; }
      // Fetch from both notification tables
      const [{ data: notifs }, { data: userNotifs }] = await Promise.all([
        sb.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
        sb.from("user_notifications").select("id, user_id, employee_slug, type, title, message as description, priority, payload, read_at, sent_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20).then(r => ({ data: (r.data ?? []).map((n: any) => ({ ...n, read: !!n.read_at, href: null })) })).catch(() => ({ data: [] })),
      ]);
      const combined = [...(notifs ?? []), ...(userNotifs ?? [])].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
      setNotifications(combined.length > 0 ? combined : DEMO_MESSAGES);
    } catch { setNotifications(DEMO_MESSAGES); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = useCallback(async (n: Notification) => {
    if (n.read) return;
    if (!n.id.startsWith("demo-")) {
      const sb = getSupabase();
      if (sb) {
        await sb.from("notifications").update({ read: true }).eq("id", n.id);
        await sb.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      }
    }
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
  }, []);

  const toggleStar = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const filtered = notifications.filter(n => {
    if (folder === "unread") return !n.read;
    if (folder === "starred") return starred.has(n.id);
    if (folder === "all") return true;
    return n.employee_slug === folder || n.employee_slug === folder.split("-")[0];
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const starredCount = starred.size;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", maxWidth: 1280, margin: "0 auto", padding: isMobile ? "16px 16px" : "28px 20px", minHeight: "80vh" }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontSize: isMobile ? 22 : 32, fontWeight: 800, color: T.text, letterSpacing: -0.5, margin: 0 }}>Inbox</h1>
          {unreadCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: T.cyan, background: T.cyan + "18", padding: "3px 10px", borderRadius: 20 }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <div style={{ height: 2, marginTop: 14, borderRadius: 1, background: `linear-gradient(90deg, ${T.gold}44, ${T.cyan}22, transparent 70%)` }} />
      </div>

      <div style={{ display: "flex", gap: 16, minHeight: 0, flexDirection: "row" }}>

        {/* ═══ LEFT SIDEBAR ═══ */}
        {!isMobile && <div style={{ width: 200, flexShrink: 0 }}>
          {/* Compose */}
          <button onClick={() => setComposeOpen(true)} style={{
            width: "100%", padding: "13px 18px", borderRadius: 14, marginBottom: 6, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, color: "#0b1220",
            fontSize: 14, fontWeight: 700, fontFamily: "inherit",
            boxShadow: `0 4px 20px ${T.gold}40, inset 0 1px 0 rgba(255,255,255,0.15)`,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "transform 0.12s, box-shadow 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 6px 24px ${T.gold}55, inset 0 1px 0 rgba(255,255,255,0.2)`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 20px ${T.gold}40, inset 0 1px 0 rgba(255,255,255,0.15)`; }}
          >
            <Pencil style={{ width: 15, height: 15 }} /> Compose
          </button>

          {/* Divider */}
          <div style={{ height: 1, background: T.border, margin: "10px 0" }} />

          {/* Folder list */}
          {FOLDERS.map(f => {
            const count = f.key === "all" ? notifications.length
              : f.key === "unread" ? unreadCount
              : f.key === "starred" ? starredCount
              : notifications.filter(n => n.employee_slug === f.key || n.employee_slug === f.key.split("-")[0]).length;
            const active = folder === f.key;
            return (
              <button key={f.key} onClick={() => setFolder(f.key)} style={{
                width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 14px", borderRadius: 10, marginBottom: 2, cursor: "pointer",
                background: active ? T.surfaceLight : "transparent",
                borderLeft: active ? `3px solid ${T.gold}` : "3px solid transparent",
                border: "none", borderLeftStyle: "solid", borderLeftWidth: 3,
                borderLeftColor: active ? T.gold : "transparent",
                color: active ? T.text : T.muted, fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: "inherit",
                transition: "all 0.12s",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {f.color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: f.color, flexShrink: 0 }} />}
                  {f.key === "starred" && <Star style={{ width: 13, height: 13, color: T.gold, fill: T.gold }} />}
                  {f.label}
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, minWidth: 20, textAlign: "center",
                    padding: "2px 7px", borderRadius: 10,
                    background: f.color ? f.color + "18" : (f.key === "unread" ? T.cyan + "18" : T.dim + "18"),
                    color: f.color || (f.key === "unread" ? T.cyan : T.dim),
                  }}>{count}</span>
                )}
              </button>
            );
          })}
        </div>}

        {/* Mobile folder tabs */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, scrollbarWidth: 'none' as any, flexShrink: 0, width: '100%' }}>
            {FOLDERS.map(f => {
              const active = folder === f.key;
              return (
                <button key={f.key} onClick={() => setFolder(f.key as any)} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', background: active ? (f.color || T.gold) + '18' : 'transparent', border: `1px solid ${active ? (f.color || T.gold) : T.border}`, color: active ? (f.color || T.gold) : T.dim, whiteSpace: 'nowrap' as const }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ CENTER: MESSAGE LIST ═══ */}
        <div style={{ flex: 1, background: T.surface, borderRadius: 14, border: `1px solid ${T.border}`, overflow: "hidden", minWidth: 0, display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.dim }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.cyan, animation: "spin 1s linear infinite", marginRight: 10 }} />
              Loading messages...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: T.dim, gap: 8 }}>
              <span style={{ fontSize: 32 }}>{folder === "unread" ? "\u2705" : folder === "starred" ? "\u2B50" : "\uD83D\uDCED"}</span>
              <span style={{ fontSize: 14 }}>{folder === "unread" ? "All caught up!" : folder === "starred" ? "No starred messages" : "No messages yet"}</span>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.map(n => {
                const agent = getAgent(n.employee_slug);
                const isSelected = selected?.id === n.id;
                const isStarred = starred.has(n.id);
                const isUnread = !n.read;
                const isHovered = hovered === n.id;
                const pri = PRIORITY_STYLE[n.priority];
                return (
                  <div key={n.id}
                    onClick={() => { setSelected(n); markRead(n); }}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "0 18px",
                      height: isMobile ? 64 : 56, cursor: "pointer", width: "100%", overflow: "hidden",
                      borderBottom: `1px solid ${T.border}`,
                      borderLeft: isUnread ? `3px solid ${T.gold}` : "3px solid transparent",
                      background: isSelected ? T.cyan + "0a" : isHovered ? T.surfaceHover : isUnread ? T.surfaceLight : "transparent",
                      transition: "background 0.12s",
                    }}
                  >
                    {/* Unread dot */}
                    <div style={{ width: 10, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                      {isUnread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.cyan, boxShadow: `0 0 6px ${T.cyan}66` }} />}
                    </div>
                    {/* Star */}
                    <button onClick={(e) => toggleStar(n.id, e)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", flexShrink: 0,
                      color: isStarred ? T.gold : T.dim + "66", transition: "color 0.15s, transform 0.12s",
                    }}
                    onMouseEnter={e => { if (!isStarred) e.currentTarget.style.color = T.gold + "88"; }}
                    onMouseLeave={e => { if (!isStarred) e.currentTarget.style.color = T.dim + "66"; }}
                    >
                      <Star style={{ width: 16, height: 16, fill: isStarred ? T.gold : "none", strokeWidth: isStarred ? 0 : 1.5 }} />
                    </button>
                    {/* Agent avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: agent.color + "18", border: `1.5px solid ${agent.color}33`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 800, color: agent.color,
                    }}>{agent.initial}</div>
                    {/* Agent name */}
                    <span style={{ width: isMobile ? 52 : 72, flexShrink: 0, fontSize: 12, fontWeight: 700, color: agent.color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {agent.name}
                    </span>
                    {/* Subject + priority + preview */}
                    <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, overflow: "hidden", minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: isUnread ? 700 : 400, color: isUnread ? T.text : T.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%", flexShrink: 1, minWidth: 0 }}>
                        {n.title}
                      </span>
                      {pri && n.priority !== "info" && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: pri.color, background: pri.bg, padding: "1px 7px", borderRadius: 8, flexShrink: 0, lineHeight: "18px" }}>
                          {pri.label}
                        </span>
                      )}
                    </div>
                    {/* Date */}
                    <span style={{ fontSize: 12, color: isUnread ? T.muted : T.dim, fontWeight: isUnread ? 600 : 400, flexShrink: 0, whiteSpace: "nowrap", width: 55, textAlign: "right" }}>
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ═══ RIGHT: MESSAGE DETAIL (fixed overlay) ═══ */}
      {selected && (() => {
        const agent = getAgent(selected.employee_slug);
        const pri = PRIORITY_STYLE[selected.priority];
        return (
          <>
            <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", zIndex: 39 }} />
            <div style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 420, zIndex: 40,
              background: T.surface, borderLeft: `1px solid ${T.border}`,
              display: "flex", flexDirection: "column",
              boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
              animation: "slideInRight 0.2s ease-out",
            }}>
              {/* Header */}
              <div style={{ padding: "18px 22px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${agent.color}28, ${agent.color}10)`,
                  border: `2px solid ${agent.color}44`, boxShadow: `0 0 20px ${agent.color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 800, color: agent.color,
                }}>{agent.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: agent.color }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: T.dim }}>{agent.role}</div>
                </div>
                <button onClick={() => setSelected(null)} style={{
                  width: 32, height: 32, borderRadius: 8, background: T.surfaceLight, border: `1px solid ${T.border}`,
                  color: T.dim, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                }}>{"\u00d7"}</button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: "20px 22px", overflowY: "auto" }}>
                {pri && (
                  <span style={{
                    display: "inline-block", fontSize: 10, fontWeight: 700, color: pri.color, background: pri.bg,
                    padding: "3px 10px", borderRadius: 8, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14,
                  }}>{pri.label}</span>
                )}
                <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 6px", lineHeight: 1.35 }}>{selected.title}</h2>
                <div style={{ fontSize: 12, color: T.dim, marginBottom: 18 }}>
                  {new Date(selected.created_at).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {" \u00b7 "}
                  {new Date(selected.created_at).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div style={{ height: 1, background: T.border, marginBottom: 18 }} />
                <div style={{ fontSize: 15, color: T.muted, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {selected.description || "No additional details."}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
                {selected.href ? (
                  <a href={selected.href} style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, textAlign: "center", textDecoration: "none",
                    background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, color: "#0b1220",
                    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}><ExternalLink style={{ width: 14, height: 14 }} /> View Details</a>
                ) : (
                  <button style={{
                    flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                    background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, color: "#0b1220",
                    fontSize: 13, fontWeight: 700, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}><Reply style={{ width: 14, height: 14 }} /> Reply</button>
                )}
                <button style={{
                  padding: "10px 16px", borderRadius: 10, border: `1px solid ${T.border}`, cursor: "pointer",
                  background: "transparent", color: T.dim, fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}><Archive style={{ width: 14, height: 14 }} /> Archive</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ═══ COMPOSE MODAL ═══ */}
      {composeOpen && (
        <>
          <div onClick={() => setComposeOpen(false)} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 998 }} />
          <div style={{
            position: "fixed", top: "45%", left: "50%", transform: "translate(-50%, -50%)", maxHeight: "85vh", overflowY: "auto", width: 440, background: T.surface,
            borderRadius: 16, border: `1px solid ${T.border}`, zIndex: 999,
            boxShadow: `0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px ${T.border}`, overflow: "hidden",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>New Message</span>
              <button onClick={() => setComposeOpen(false)} style={{
                width: 28, height: 28, borderRadius: 6, background: T.surfaceLight, border: `1px solid ${T.border}`,
                color: T.dim, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
              }}>{"\u00d7"}</button>
            </div>
            <div style={{ padding: 20 }}>
              {/* To */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>To</div>
                <select style={{
                  width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: "10px 14px", color: T.text, fontSize: 14, fontFamily: "inherit", appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%239ba8bc' viewBox='0 0 16 16'%3E%3Cpath d='M1.5 5.5l6.5 6.5 6.5-6.5'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
                }}>
                  <option value="prime-boss">{"\u265B"} Prime \u2014 Financial CEO</option>
                  <option value="tag-ai">T Tag \u2014 Categorization Expert</option>
                  <option value="byte-docs">B Byte \u2014 Document Specialist</option>
                  <option value="crystal-analytics">C Crystal \u2014 Analytics Engine</option>
                </select>
              </div>
              {/* Subject */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Subject</div>
                <input type="text" placeholder="What's this about?" style={{
                  width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: "10px 14px", color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none",
                  boxSizing: "border-box",
                }} />
              </div>
              {/* Message */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>Message</div>
                <textarea rows={6} placeholder="Ask anything..." style={{
                  width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10,
                  padding: "12px 14px", color: T.text, fontSize: 14, fontFamily: "inherit", resize: "vertical",
                  outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                }} />
              </div>
              {/* Send */}
              <button style={{
                width: "100%", padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer",
                background: `linear-gradient(135deg, ${T.gold}, ${T.goldLight})`, color: "#0b1220",
                fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                boxShadow: `0 4px 16px ${T.gold}33`,
                transition: "transform 0.12s",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseLeave={e => e.currentTarget.style.transform = ""}
              >Send Message</button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
