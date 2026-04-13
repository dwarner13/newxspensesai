import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#f0f4ff", muted: "#dde4f0", dim: "#b8c4d8", accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", red: "#f87171", amber: "#fbbf24", purple: "#a78bfa" };

interface ImportRow { id: string; issuer: string | null; filename: string | null; file_url: string | null; status: string | null; created_at: string; committed_count: number | null; }
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
  if (status === "parsed") return { label: "Parsed", color: T.cyan };
  if (status === "pending") return { label: "Pending", color: T.amber };
  if (status === "failed") return { label: "Failed", color: T.red };
  return { label: status || "—", color: T.dim };
}

export function StatementHistory() {
  const { userId } = useAuth();
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const fetchImports = async () => {
    if (!userId) return;
    setLoading(true);
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    const { data, error } = await sb
      .from("imports")
      .select("id, issuer, filename, file_url, status, created_at, committed_count")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    console.log("[StatementHistory] query result:", { count: data?.length, error });
    if (!error && data) setImports(data as ImportRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchImports(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(imports.map(i => i.id)));
  const selectAllEmpty = () => setSelected(new Set(
    imports.filter(i => (!i.committed_count || i.committed_count === 0) && i.status !== "committed").map(i => i.id)
  ));
  const clearSelection = () => { setSelected(new Set()); setSelectMode(false); setConfirmBulk(false); };

  const deleteSelected = async () => {
    const sb = getSupabase();
    if (!sb || !userId || selected.size === 0) return;
    setDeleting(true);
    try {
      for (const id of Array.from(selected)) {
        await sb.from("transactions").delete().eq("import_id", id).eq("user_id", userId);
        await sb.from("imports").delete().eq("id", id).eq("user_id", userId);
      }
      setImports(prev => prev.filter(i => !selected.has(i.id)));
      clearSelection();
    } catch (e) {
      console.error("[StatementHistory] delete failed", e);
    } finally {
      setDeleting(false);
    }
  };

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
    if (selectMode) return; // don't collapse folders while selecting
    setOpenFolders(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const emptyCount = imports.filter(i => (!i.committed_count || i.committed_count === 0) && i.status !== "committed").length;

  if (loading) return (
    <div style={{ marginTop: 32, padding: "20px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: T.dim }}>Loading statement history…</div>
    </div>
  );

  if (imports.length === 0) return (
    <div style={{ marginTop: 32, padding: "20px", borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, textAlign: "center" }}>
      <div style={{ fontSize: 12, color: T.dim }}>No statements uploaded yet.</div>
    </div>
  );

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Statement History</div>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        {!selectMode ? (
          <button
            onClick={() => { setSelectMode(true); setOpenFolders(new Set(folders.map(f => f.key))); }}
            style={{ fontSize: 11, fontWeight: 700, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
          >
            Select
          </button>
        ) : (
          <button
            onClick={clearSelection}
            style={{ fontSize: 11, fontWeight: 700, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}
          >
            Cancel
          </button>
        )}
        <div style={{ fontSize: 11, color: T.dim }}>{imports.length} import{imports.length !== 1 ? "s" : ""}</div>
      </div>

      {/* Select mode toolbar */}
      {selectMode && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.dim, flex: 1 }}>
            {selected.size === 0 ? "Tap rows to select" : `${selected.size} selected`}
          </span>
          <button onClick={selectAllEmpty} style={{ fontSize: 11, fontWeight: 600, color: T.amber, background: `${T.amber}12`, border: `1px solid ${T.amber}30`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
            Select empty ({emptyCount})
          </button>
          <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
            Select all
          </button>
          {selected.size > 0 && !confirmBulk && (
            <button
              onClick={() => setConfirmBulk(true)}
              style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: T.red, border: "none", borderRadius: 6, padding: "4px 14px", cursor: "pointer" }}
            >
              🗑 Delete {selected.size}
            </button>
          )}
          {confirmBulk && (
            <>
              <span style={{ fontSize: 11, color: T.red, fontWeight: 700 }}>Sure? This can't be undone.</span>
              <button
                onClick={deleteSelected}
                disabled={deleting}
                style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: T.red, border: "none", borderRadius: 6, padding: "4px 14px", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmBulk(false)}
                style={{ fontSize: 11, fontWeight: 600, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {folders.map(folder => {
          const isOpen = openFolders.has(folder.key);
          const color = issuerColor(folder.issuer);
          const emoji = issuerEmoji(folder.issuer);
          const folderAllSelected = folder.imports.every(i => selected.has(i.id));
          return (
            <div key={folder.key} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? color + "33" : T.border}`, background: T.surface, transition: "border-color 0.2s" }}>
              <button onClick={() => toggleFolder(folder.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                {selectMode && (
                  <div
                    onClick={e => { e.stopPropagation(); folderAllSelected ? folder.imports.forEach(i => setSelected(prev => { const n = new Set(prev); n.delete(i.id); return n; })) : folder.imports.forEach(i => setSelected(prev => new Set(prev).add(i.id))); }}
                    style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${folderAllSelected ? T.red : T.border}`, background: folderAllSelected ? T.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                  >
                    {folderAllSelected && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                  </div>
                )}
                <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: `${color}14`, border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{folder.label}</div>
                  <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                    {folder.imports.length} statement{folder.imports.length !== 1 ? "s" : ""}
                    {folder.totalTx > 0 && ` · ${folder.totalTx.toLocaleString()} transactions`}
                    {` · ${formatDate(folder.earliest)} – ${formatDate(folder.latest)}`}
                  </div>
                </div>
                {!selectMode && <div style={{ fontSize: 12, color: T.dim, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>▾</div>}
              </button>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  {folder.imports.map((imp, idx) => {
                    const badge = statusBadge(imp.status);
                    const raw = imp.file_url ? imp.file_url.split("/").pop() || imp.id : imp.id;
                    const name = raw.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
                    const isEmpty = !imp.committed_count || imp.committed_count === 0;
                    const isChecked = selected.has(imp.id);

                    return (
                      <div
                        key={imp.id}
                        onClick={() => selectMode && toggleSelect(imp.id)}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px 11px 66px", borderBottom: idx < folder.imports.length - 1 ? `1px solid ${T.border}` : "none", background: isChecked ? `${T.red}10` : "transparent", transition: "background 0.15s", cursor: selectMode ? "pointer" : "default" }}
                      >
                        {selectMode && (
                          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isChecked ? T.red : T.border}`, background: isChecked ? T.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isChecked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                          </div>
                        )}
                        <div style={{ fontSize: 14, flexShrink: 0 }}>📄</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                          <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>
                            {new Date(imp.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                            {imp.committed_count != null && imp.committed_count > 0
                              ? ` · ${imp.committed_count} tx`
                              : <span style={{ color: T.red }}> · 0 transactions</span>
                            }
                          </div>
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${badge.color}15`, border: `1px solid ${badge.color}30`, color: badge.color, letterSpacing: "0.05em", flexShrink: 0 }}>
                          {badge.label.toUpperCase()}
                        </span>
                        {isEmpty && !selectMode && (
                          <span style={{ fontSize: 10, color: T.red, fontWeight: 700, flexShrink: 0 }}>⚠</span>
                        )}
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
