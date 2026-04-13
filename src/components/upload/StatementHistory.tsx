import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#f0f4ff", muted: "#dde4f0", dim: "#b8c4d8", accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", red: "#f87171", amber: "#fbbf24", purple: "#a78bfa" };

interface ImportRow { id: string; issuer: string | null; filename: string | null; status: string | null; created_at: string; committed_count: number | null; }
interface FolderGroup { key: string; label: string; issuer: string; year: number; imports: ImportRow[]; totalTx: number; earliest: string; latest: string; }

function issuerColor(issuer: string): string {
  const s = issuer.toLowerCase();
  if (s.includes("bmo")) return T.green;
  if (s.includes("cibc")) return T.cyan;
  if (s.includes("capital one")) return "#f97316";
  if (s.includes("rbc")) return T.red;
  if (s.includes("td")) return "#10b981";
  if (s.includes("amex") || s.includes("american express")) return T.purple;
  if (s.includes("scotiabank") || s.includes("scotia")) return T.amber;
  if (s.includes("canadian tire")) return T.accent;
  return T.muted;
}

function issuerEmoji(issuer: string): string {
  const s = issuer.toLowerCase();
  if (s.includes("bmo")) return "🏦";
  if (s.includes("cibc")) return "🏦";
  if (s.includes("capital one")) return "💳";
  if (s.includes("rbc")) return "🏦";
  if (s.includes("td")) return "🏦";
  if (s.includes("amex") || s.includes("american express")) return "💳";
  if (s.includes("scotiabank") || s.includes("scotia")) return "🏦";
  if (s.includes("canadian tire")) return "🏪";
  return "📁";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function statusBadge(status: string | null) {
  if (status === "committed") return { label: "Committed", color: T.green };
  if (status === "approved") return { label: "Approved", color: T.cyan };
  if (status === "pending") return { label: "Pending", color: T.amber };
  if (status === "failed") return { label: "Failed", color: T.red };
  return { label: status || "\u2014", color: T.dim };
}

export function StatementHistory() {
  const { userId } = useAuth();
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const sb = getSupabase();
      if (!sb) { setLoading(false); return; }
      const { data, error } = await sb
        .from("imports")
        .select("id, issuer, filename, status, created_at, committed_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      console.log("[StatementHistory] query result:", { count: data?.length, error });
      if (!error && data) setImports(data as ImportRow[]);
      setLoading(false);
    })();
  }, [userId]);

  const folders: FolderGroup[] = (() => {
    const map = new Map<string, FolderGroup>();
    for (const imp of imports) {
      const issuer = imp.issuer || "Unknown";
      const year = new Date(imp.created_at).getFullYear();
      const key = `${issuer}-${year}`;
      if (!map.has(key)) {
        map.set(key, { key, label: `${issuer} ${year}`, issuer, year, imports: [], totalTx: 0, earliest: imp.created_at, latest: imp.created_at });
      }
      const g = map.get(key)!;
      g.imports.push(imp);
      g.totalTx += imp.committed_count || 0;
      if (imp.created_at < g.earliest) g.earliest = imp.created_at;
      if (imp.created_at > g.latest) g.latest = imp.created_at;
    }
    return Array.from(map.values()).sort((a, b) => b.year !== a.year ? b.year - a.year : a.issuer.localeCompare(b.issuer));
  })();

  useEffect(() => {
    if (folders.length > 0 && openFolders.size === 0) {
      setOpenFolders(new Set([folders[0].key]));
    }
  }, [folders.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFolder = (key: string) => {
    setOpenFolders(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  if (loading) return (
    <div style={{ marginTop: 32, padding: "20px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: T.dim }}>Loading statement history\u2026</div>
    </div>
  );

  if (imports.length === 0) return (
    <div style={{ marginTop: 32, padding: "20px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: T.dim }}>No statements uploaded yet.</div>
    </div>
  );

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Statement History</div>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <div style={{ fontSize: 11, color: T.dim }}>{imports.length} import{imports.length !== 1 ? "s" : ""}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {folders.map(folder => {
          const isOpen = openFolders.has(folder.key);
          const color = issuerColor(folder.issuer);
          const emoji = issuerEmoji(folder.issuer);
          return (
            <div key={folder.key} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? color + "33" : T.border}`, background: T.surface, transition: "border-color 0.2s" }}>
              <button onClick={() => toggleFolder(folder.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${color}14`, border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{folder.label}</div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                    {folder.imports.length} statement{folder.imports.length !== 1 ? "s" : ""}
                    {folder.totalTx > 0 && ` \u00B7 ${folder.totalTx.toLocaleString()} transactions`}
                    {` \u00B7 ${formatDate(folder.earliest)} \u2013 ${formatDate(folder.latest)}`}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: T.dim, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>▾</div>
              </button>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  {folder.imports.map((imp, idx) => {
                    const badge = statusBadge(imp.status);
                    const raw = imp.file_url ? imp.file_url.split("/").pop() || imp.id : imp.id; const name = raw.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
                    return (
                      <div key={imp.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px 11px 66px", borderBottom: idx < folder.imports.length - 1 ? `1px solid ${T.border}` : "none" }}>
                        <div style={{ fontSize: 14, flexShrink: 0 }}>📄</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                          <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>
                            {new Date(imp.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                            {imp.committed_count != null && imp.committed_count > 0 && ` \u00B7 ${imp.committed_count} tx`}
                          </div>
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${badge.color}15`, border: `1px solid ${badge.color}30`, color: badge.color, letterSpacing: "0.05em", flexShrink: 0 }}>{badge.label.toUpperCase()}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

