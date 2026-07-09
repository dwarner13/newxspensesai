import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabase } from "@/lib/supabase";

const T = { bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a", text: "#f0f4ff", muted: "#dde4f0", dim: "#b8c4d8", accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", red: "#f87171", amber: "#fbbf24", purple: "#a78bfa" };

interface ImportRow { id: string; document_id: string | null; issuer: string | null; filename: string | null; file_url: string | null; status: string | null; created_at: string; committed_count: number | null; error: string | null; }
interface DocMeta { institution?: string; account_last4?: string; statement_period?: string; ocr_error_code?: string; }
interface ImportDateRange { min: Date; max: Date; }
interface FolderGroup { key: string; label: string; issuer: string; year: number; imports: ImportRow[]; totalTx: number; earliest: string; latest: string; txEarliest: Date | null; txLatest: Date | null; }

// Delete flow types
interface PendingDelete { imports: ImportRow[]; scope: "row" | "folder" | "bulk"; title: string; }
interface UndoSnapshot { imports: ImportRow[]; transactions: any[]; count: number; txCount: number; expiresAt: number; }

const UNDO_WINDOW_MS = 10_000;

// Derive a "Jan 2026" or "Jan – Feb 2026" label from a transaction date range.
// This is the primary way to identify a statement when parser metadata is blank.
function formatPeriod(range: ImportDateRange | undefined): string | null {
  if (!range) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", { month: "short", year: "numeric" });
  const minLabel = fmt.format(range.min);
  const maxLabel = fmt.format(range.max);
  return minLabel === maxLabel ? minLabel : `${minLabel} – ${maxLabel}`;
}

// Pull a readable filename from file_url (or filename column). Strips extension
// and punctuation for display as a subtitle.
function cleanFilename(imp: ImportRow): string | null {
  const raw = imp.file_url ? imp.file_url.split("/").pop() : imp.filename;
  if (!raw) return null;
  return raw.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim() || null;
}

// Single source of truth for institution normalization
function normalizeIssuer(raw: string): string {
  const l = raw.toLowerCase();
  if (/bmo|bank of montreal/i.test(l)) return "BMO";
  if (/rbc|royal bank|visa.*7223|7223.*visa/i.test(l)) return "RBC";
  if (/td bank|td canada|toronto.?dominion/i.test(l)) return "TD Bank";
  if (/cibc/i.test(l)) return "CIBC";
  if (/scotiabank|scotia/i.test(l)) return "Scotiabank";
  if (/triangle world elite|world elite/i.test(l)) return "Triangle World Elite";
  if (/triangle mastercard|triangle.*card|canadian tire|ctfs/i.test(l)) return "Triangle Mastercard";
  if (/capital one/i.test(l)) return "Capital One";
  if (/amex|american express/i.test(l)) return "Amex";
  if (/simplii/i.test(l)) return "Simplii";
  if (/tangerine/i.test(l)) return "Tangerine";
  if (/national bank|bnc/i.test(l)) return "National Bank";
  if (/hsbc/i.test(l)) return "HSBC";
  if (/desjardins/i.test(l)) return "Desjardins";
  if (/pc financial/i.test(l)) return "PC Financial";
  if (/visa.?statement/i.test(l)) return "RBC";
  return "";
}

function detectIssuer(imp: ImportRow, meta: DocMeta | undefined): string {
  if (meta?.institution && meta.institution.length < 60) {
    const n = normalizeIssuer(meta.institution); if (n) return n;
  }
  if (imp.issuer) { const n = normalizeIssuer(imp.issuer); if (n) return n; }
  const path = (imp.file_url || imp.filename || "").toLowerCase();
  if (path) {
    const n = normalizeIssuer(path); if (n) return n;
    if (/world.?elite/i.test(path)) return "Triangle World Elite";
    if (/triangle|canadian.?tire/i.test(path)) return "Triangle Mastercard";
    if (/rbc|royal.?bank|7223/i.test(path)) return "RBC";
    if (/capital.?one|6075|1863/i.test(path)) return "Capital One";
    if (/bmo/i.test(path)) return "BMO";
  }
  return "Unknown";
}

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
  if (s.includes("triangle world elite")) return "#f97316";
  if (s.includes("triangle mastercard")) return T.accent;
  return T.muted;
}

function issuerEmoji(issuer: string): string {
  const s = issuer.toLowerCase();
  if (s.includes("bmo")) return "\uD83C\uDFE6";
  if (s.includes("cibc")) return "\uD83C\uDFE6";
  if (s.includes("capital one")) return "\uD83D\uDCB3";
  if (s.includes("rbc")) return "\uD83C\uDFE6";
  if (s.includes("td")) return "\uD83C\uDFE6";
  if (s.includes("amex") || s.includes("american express")) return "\uD83D\uDCB3";
  if (s.includes("scotiabank") || s.includes("scotia")) return "\uD83C\uDFE6";
  if (s.includes("canadian tire")) return "\uD83C\uDFEA";
  if (s.includes("triangle world elite")) return "\uD83D\uDCB3";
  if (s.includes("triangle mastercard")) return "\uD83C\uDFEA";
  return "\uD83D\uDCC1";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function statusBadge(status: string | null) {
  if (status === "parsed_unreconciled") return { label: "Needs review", color: T.amber };
  if (status === "committed") return { label: "Committed", color: T.green };
  if (status === "approved") return { label: "Approved", color: T.cyan };
  if (status === "parsed") return { label: "Parsed", color: T.cyan };
  if (status === "pending") return { label: "Pending", color: T.amber };
  if (status === "failed") return { label: "Failed", color: T.red };
  return { label: status || "—", color: T.dim };
}

/**
 * A statement held by the reconciliation gate: parsed OK, but row totals don't
 * match the bank's printed totals. Must be reviewed, never bulk-deleted as "empty".
 */
function isHeldForReview(imp: ImportRow): boolean {
  return imp.status === "parsed_unreconciled";
}

// Threshold for "upload stuck" detection. Large PDFs can take a couple minutes
// to OCR + parse, so we don't flag until it's been sitting idle for 5 minutes.
const STUCK_AFTER_MS = 5 * 60 * 1000;
const MONTH_NAMES = ["january","february","march","april","may","june","july","august","september","october","november","december"];

/**
 * An import is "stuck" when it didn't complete the upload→parse→commit pipeline.
 * Distinct from a genuinely empty (committed, 0 tx) statement.
 */
function isStuck(imp: ImportRow): boolean {
  // Held for review is a distinct state, not stuck
  if (isHeldForReview(imp)) return false;
  // Has transactions → finished successfully
  if (imp.committed_count && imp.committed_count > 0) return false;
  // Committed with 0 tx is a legit empty statement (rare but real), not stuck
  if (imp.status === "committed") return false;
  // Explicit failure
  if (imp.status === "failed") return true;
  // An error was written but status didn't flip to failed (e.g. normalize wrote
  // error: "No transactions found" while keeping status: "parsed")
  if (imp.error) return true;
  // Stuck in an intermediate state (parsed/approved/pending) for too long
  const ageMs = Date.now() - new Date(imp.created_at).getTime();
  if (ageMs < STUCK_AFTER_MS) return false;
  return imp.status === "parsed" || imp.status === "approved" || imp.status === "pending";
}

/**
 * Plain-English reason for why a stuck import failed, with an actionable next step.
 * Reads imports.error (set by normalize-transactions) and user_documents.metadata.ocr.error_code
 * (set by the OCR pipeline). Known error codes are mapped to specific messages;
 * unknown codes and fallbacks give a safe generic prompt.
 */
function getStuckReason(imp: ImportRow, meta: DocMeta | undefined): string {
  // imports.error column — direct reason from the pipeline
  if (imp.error === "No transactions found") {
    return "No transactions detected — this may be a summary page, not a statement";
  }
  if (imp.error && imp.error.trim()) {
    const truncated = imp.error.length > 80 ? imp.error.slice(0, 77) + "…" : imp.error;
    return `${truncated} — delete and re-upload`;
  }

  // OCR error codes from user_documents.metadata
  const code = meta?.ocr_error_code;
  switch (code) {
    case "unusable_ocr_text":
      return "Couldn't read the text — try downloading a fresh copy from your bank";
    case "malformed_pdf":
      return "PDF file is damaged — re-download from your bank and re-upload";
    case "pdf_worker_missing":
      return "Server issue during processing — delete and try again";
    case "guardrails_blocked":
      return "Content flagged by safety filters — re-download from your bank";
    case "no_provider_text":
    case "provider_error":
      return "Text extraction service failed — delete and try again";
    case "timeout":
    case "ocr_timed_out_retry":
      return "Processing timed out — delete and try again (split large PDFs if needed)";
    case "ocr_rejected":
    case "ocr_failed":
      return "File couldn't be processed — check it's a valid bank statement";
  }

  // Status-based fallbacks when no explicit error info
  if (imp.status === "failed") return "Upload failed — delete and try again";
  if (imp.status === "parsing" || imp.status === "normalizing") return "Processing stalled — delete and re-upload";
  if (imp.status === "parsed" || imp.status === "approved") return "Commit never completed — delete and re-upload";
  return "Upload didn't finish — delete and re-upload";
}

// Inline trash icon (SVG beats emoji — no � rendering issues, consistent sizing)
function TrashIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <path d="M3 6h18"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" x2="10" y1="11" y2="17"/>
      <line x1="14" x2="14" y1="11" y2="17"/>
    </svg>
  );
}

// Small warning triangle (inline SVG) — replaces the ⚠ emoji to avoid encoding issues
function WarnTriangle({ size = 12, color = T.red }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" x2="12" y1="9" y2="13"/>
      <line x1="12" x2="12.01" y1="17" y2="17"/>
    </svg>
  );
}

// Chevron with real stroke weight — replaces the ▾ text character which is too thin to see
function ChevronIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

export function StatementHistory() {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [folderMenu, setFolderMenu] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [docMetas, setDocMetas] = useState<Map<string, DocMeta>>(new Map());
  const [dateRanges, setDateRanges] = useState<Map<string, ImportDateRange>>(new Map());

  // NEW: unified delete flow state
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [undoNow, setUndoNow] = useState(Date.now());
  const undoTimerRef = useRef<number | null>(null);
  const [hoverRow, setHoverRow] = useState<string | null>(null);
  // Tracks the viewport position of the "..." button so the portaled dropdown can anchor to it
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);

  const fetchImports = async () => {
    if (!userId) return;
    setLoading(true);
    const sb = getSupabase();
    if (!sb) { setLoading(false); return; }
    const { data, error } = await sb
      .from("imports")
      .select("id, document_id, issuer, filename, file_url, status, created_at, committed_count, error")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    console.log("[StatementHistory] query result:", { count: data?.length, error });
    if (!error && data) {
      setImports(data as ImportRow[]);
      const docIds = (data as ImportRow[]).map(i => i.document_id).filter(Boolean) as string[];
      if (docIds.length > 0) {
        const { data: docs } = await sb
          .from("user_documents")
          .select("id, metadata")
          .in("id", docIds);
        if (docs) {
          const metaMap = new Map<string, DocMeta>();
          for (const doc of docs) {
            const summary = doc.metadata?.statement_summary ?? doc.metadata;
            const m: DocMeta = {};
            if (summary?.institution) {
              m.institution = summary.institution;
              m.account_last4 = summary.account_last4;
              m.statement_period = summary.statement_period;
            }
            // OCR error codes get written to one of three locations by smart-import-ocr.ts.
            // Try all three in order — whichever one is present wins.
            const ocrCode =
              doc.metadata?.ocr?.error_code ||
              doc.metadata?.ocr_error_code ||
              doc.metadata?.error_code ||
              undefined;
            if (ocrCode) m.ocr_error_code = String(ocrCode);
            if (m.institution || m.ocr_error_code) {
              metaMap.set(doc.id, m);
            }
          }
          setDocMetas(metaMap);
        }
      }

      // Fetch transaction date ranges per import. Parser doesn't populate
      // statement_meta.period_start/end, so tx dates are the only reliable
      // signal for which month/year a statement covers.
      const importIds = (data as ImportRow[]).map(i => i.id);
      if (importIds.length > 0) {
        const { data: txs, error: txErr } = await sb
          .from("transactions")
          .select("import_id, date, posted_at")
          .eq("user_id", userId)
          .in("import_id", importIds);
        if (txErr) {
          console.warn("[StatementHistory] date range query failed", txErr);
        } else if (txs) {
          const rangeMap = new Map<string, ImportDateRange>();
          for (const t of txs as { import_id: string | null; date: string | null; posted_at: string | null }[]) {
            if (!t.import_id) continue;
            const dateStr = t.date ?? t.posted_at;
            if (!dateStr) continue;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) continue;
            const existing = rangeMap.get(t.import_id);
            if (!existing) {
              rangeMap.set(t.import_id, { min: d, max: d });
            } else {
              if (d < existing.min) existing.min = d;
              if (d > existing.max) existing.max = d;
            }
          }
          setDateRanges(rangeMap);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchImports(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Undo timer: tick every 100ms for progress bar + auto-finalize after window
  useEffect(() => {
    if (!undoSnapshot) return;
    const tick = window.setInterval(() => setUndoNow(Date.now()), 100);
    const remaining = undoSnapshot.expiresAt - Date.now();
    if (remaining <= 0) {
      setUndoSnapshot(null);
      return () => clearInterval(tick);
    }
    undoTimerRef.current = window.setTimeout(() => setUndoSnapshot(null), remaining);
    return () => {
      clearInterval(tick);
      if (undoTimerRef.current) { clearTimeout(undoTimerRef.current); undoTimerRef.current = null; }
    };
  }, [undoSnapshot?.expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC key closes the confirm modal
  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPendingDelete(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDelete]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(imports.map(i => i.id)));
  const selectAllEmpty = () => setSelected(new Set(
    imports.filter(i => (!i.committed_count || i.committed_count === 0) && i.status !== "committed" && i.status !== "parsed_unreconciled").map(i => i.id)
  ));
  const clearSelection = () => { setSelected(new Set()); setSelectMode(false); };

  const requestDelete = (imps: ImportRow[], scope: "row" | "folder" | "bulk", title: string) => {
    if (imps.length === 0) return;
    setPendingDelete({ imports: imps, scope, title });
  };

  const performDelete = async () => {
    if (!pendingDelete) return;
    const sb = getSupabase();
    if (!sb || !userId) return;
    const ids = pendingDelete.imports.map(i => i.id);
    setDeleting(true);
    try {
      // Snapshot transactions BEFORE delete so we can restore on undo OR from Trash
      const { data: txSnapshot, error: snapErr } = await sb
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .in("import_id", ids);
      if (snapErr) console.warn("[StatementHistory] snapshot failed (undo will be empty for tx)", snapErr);
      const txRows = txSnapshot || [];

      // Group transactions by import_id so each import carries its own snapshot in DB
      const txByImport = new Map<string, any[]>();
      for (const tx of txRows) {
        const impId = String((tx as any).import_id || "");
        if (!impId) continue;
        if (!txByImport.has(impId)) txByImport.set(impId, []);
        txByImport.get(impId)!.push(tx);
      }

      // Hard-delete transactions (so they don't leak to other views)
      const { error: txDelErr } = await sb
        .from("transactions").delete()
        .eq("user_id", userId)
        .in("import_id", ids);
      if (txDelErr) throw txDelErr;

      // Soft-delete imports: set deleted_at + stash snapshot per import
      const nowIso = new Date().toISOString();
      for (const id of ids) {
        const snapshot = txByImport.get(id) || [];
        const { error: updErr } = await sb
          .from("imports")
          .update({ deleted_at: nowIso, deleted_snapshot: snapshot })
          .eq("id", id)
          .eq("user_id", userId);
        if (updErr) throw updErr;
      }

      // Optimistic UI: remove from local state
      setImports(prev => prev.filter(i => !ids.includes(i.id)));

      // Stash for 10s in-memory "Undo" toast (existing UX)
      setUndoSnapshot({
        imports: pendingDelete.imports,
        transactions: txRows,
        count: pendingDelete.imports.length,
        txCount: txRows.length,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      });
      setUndoNow(Date.now());

      // Refresh trash list so restore UI picks them up after 10s expiry
      void fetchTrash();

      // Exit select mode if we were in it
      if (selectMode) clearSelection();
      setPendingDelete(null);
    } catch (e: any) {
      console.error("[StatementHistory] delete failed", e);
      alert(`Delete failed: ${e?.message || "unknown error"}. Check function logs.`);
    } finally {
      setDeleting(false);
    }
  };

  const performUndo = async () => {
    if (!undoSnapshot) return;
    const sb = getSupabase();
    if (!sb || !userId) { setUndoSnapshot(null); return; }
    const snap = undoSnapshot;
    setUndoSnapshot(null);
    try {
      const ids = snap.imports.map(i => i.id);
      // Clear soft-delete flags on imports (un-delete)
      if (ids.length > 0) {
        const { error: restErr } = await sb
          .from("imports")
          .update({ deleted_at: null, deleted_snapshot: null })
          .in("id", ids)
          .eq("user_id", userId);
        if (restErr) throw restErr;
      }
      // Re-insert the hard-deleted transactions
      if (snap.transactions.length > 0) {
        const { error: txErr } = await sb.from("transactions").insert(snap.transactions);
        if (txErr) throw txErr;
      }
      await fetchImports();
      void fetchTrash();
    } catch (e: any) {
      console.error("[StatementHistory] undo failed", e);
      alert(`Undo failed: ${e?.message || "unknown error"}. Check Trash — your statement may still be recoverable there.`);
    }
  };

  // ─── TRASH: persistent soft-delete recovery ───
  const [trash, setTrash] = useState<Array<ImportRow & { deleted_at: string; deleted_snapshot: any[] }>>([]);
  const [trashOpen, setTrashOpen] = useState(false);

  const fetchTrash = useCallback(async () => {
    if (!userId) return;
    const sb = getSupabase();
    if (!sb) return;
    const { data, error } = await sb
      .from("imports")
      .select("id, document_id, issuer, filename, file_url, status, created_at, committed_count, error, deleted_at, deleted_snapshot")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .gte("deleted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("deleted_at", { ascending: false })
      .limit(50);
    if (error) {
      console.warn("[StatementHistory] trash fetch failed", error);
      return;
    }
    setTrash((data as any) || []);
  }, [userId]);

  useEffect(() => { void fetchTrash(); }, [fetchTrash]);

  const performRestore = async (importId: string) => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    const row = trash.find(r => r.id === importId);
    if (!row) return;
    try {
      // Re-insert transactions from the stashed snapshot
      const snapshot = Array.isArray(row.deleted_snapshot) ? row.deleted_snapshot : [];
      if (snapshot.length > 0) {
        const { error: txErr } = await sb.from("transactions").insert(snapshot);
        if (txErr) throw txErr;
      }
      // Un-delete the import
      const { error: impErr } = await sb
        .from("imports")
        .update({ deleted_at: null, deleted_snapshot: null })
        .eq("id", importId)
        .eq("user_id", userId);
      if (impErr) throw impErr;
      // Refresh both views
      await fetchImports();
      await fetchTrash();
    } catch (e: any) {
      console.error("[StatementHistory] restore failed", e);
      alert(`Restore failed: ${e?.message || "unknown error"}.`);
    }
  };

  const performPermanentDelete = async (importId: string) => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    if (!confirm("Permanently delete this statement? This cannot be undone.")) return;
    try {
      const { error } = await sb
        .from("imports")
        .delete()
        .eq("id", importId)
        .eq("user_id", userId);
      if (error) throw error;
      await fetchTrash();
    } catch (e: any) {
      console.error("[StatementHistory] permanent delete failed", e);
      alert(`Permanent delete failed: ${e?.message || "unknown error"}.`);
    }
  };

  const filteredImports = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return imports;
    return imports.filter(imp => {
      const meta = imp.document_id ? docMetas.get(imp.document_id) : undefined;
      const issuer = detectIssuer(imp, meta);
      if (issuer.toLowerCase().includes(q)) return true;
      if (meta?.account_last4 && meta.account_last4.includes(q)) return true;
      const range = dateRanges.get(imp.id);
      const year = range ? range.max.getFullYear() : new Date(imp.created_at).getFullYear();
      if (String(year).includes(q)) return true;
      if (range) {
        const d = new Date(range.min); d.setDate(1);
        while (d <= range.max) {
          if (MONTH_NAMES[d.getMonth()].includes(q)) return true;
          d.setMonth(d.getMonth() + 1);
        }
      } else {
        if (MONTH_NAMES[new Date(imp.created_at).getMonth()].includes(q)) return true;
      }
      return false;
    });
  })();

  const folders: FolderGroup[] = (() => {
    const map = new Map<string, FolderGroup>();
    for (const imp of filteredImports) {
      const meta = imp.document_id ? docMetas.get(imp.document_id) : undefined;
      const issuer = detectIssuer(imp, meta);
      const range = dateRanges.get(imp.id);
      // Prefer actual transaction year over created_at (which is just upload time).
      // IMPORTANT: use range.max (END of statement period), not range.min (START).
      // A statement spanning Dec 16 2024 – Jan 15 2025 should land in the 2025 folder
      // (it's the Jan 2025 statement), not a lonely 2024 folder. This was fixed before
      // (commits 57c66484, b09624cb) and regressed — don't revert without reading the
      // comment thread on those commits.
      const year = range
        ? range.max.getFullYear()
        : meta?.statement_period
          ? parseInt(meta.statement_period.match(/\d{4}/)?.[0] || String(new Date(imp.created_at).getFullYear()))
          : new Date(imp.created_at).getFullYear();
      const key = `${issuer}-${year}`;
      if (!map.has(key)) {
        map.set(key, { key, label: `${issuer} ${year}`, issuer, year, imports: [], totalTx: 0, earliest: imp.created_at, latest: imp.created_at, txEarliest: null, txLatest: null });
      }
      const g = map.get(key)!;
      g.imports.push(imp);
      g.totalTx += imp.committed_count || 0;
      if (imp.created_at < g.earliest) g.earliest = imp.created_at;
      if (imp.created_at > g.latest) g.latest = imp.created_at;
      if (range) {
        if (!g.txEarliest || range.min < g.txEarliest) g.txEarliest = range.min;
        if (!g.txLatest || range.max > g.txLatest) g.txLatest = range.max;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.year !== a.year ? b.year - a.year : a.issuer.localeCompare(b.issuer));
  })();

  useEffect(() => {
    if (folders.length > 0 && expandedGroups.size === 0) {
      const cy = new Date().getFullYear();
      setExpandedGroups(new Set(folders.filter(f => f.year === cy).map(f => f.key)));
    }
  }, [folders.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFolder = (key: string) => {
    if (selectMode) return;
    setExpandedGroups(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const emptyCount = imports.filter(i => (!i.committed_count || i.committed_count === 0) && i.status !== "committed" && i.status !== "parsed_unreconciled").length;
  const stuckImports = imports.filter(isStuck);

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

  // Pending delete summary for modal
  const pendingTxCount = pendingDelete
    ? pendingDelete.imports.reduce((sum, i) => sum + (i.committed_count || 0), 0)
    : 0;

  // Undo progress (0..1 remaining)
  const undoProgress = undoSnapshot
    ? Math.max(0, (undoSnapshot.expiresAt - undoNow) / UNDO_WINDOW_MS)
    : 0;
  const undoSecondsLeft = undoSnapshot
    ? Math.max(0, Math.ceil((undoSnapshot.expiresAt - undoNow) / 1000))
    : 0;

  const selectedCount = selected.size;
  const selectedImports = imports.filter(i => selected.has(i.id));

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em" }}>Statement History</div>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        {!selectMode ? (
          <button
            onClick={() => { setSelectMode(true); setExpandedGroups(new Set(folders.map(f => f.key))); }}
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

      {/* ========== SEARCH BAR ========== */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.dim, pointerEvents: "none" }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search statements by bank, year, or month�"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "10px 14px 10px 36px",
            fontSize: 13, fontFamily: "inherit",
            color: T.text, background: T.surface,
            border: `1px solid ${T.border}`, borderRadius: 10,
            outline: "none",
          }}
          onFocus={e => { e.currentTarget.style.borderColor = T.accent; }}
          onBlur={e => { e.currentTarget.style.borderColor = T.border; }}
        />
      </div>

      {/* ========== RECENT UPLOADS STRIP ========== */}
      {!query.trim() && imports.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Recent uploads</div>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4, paddingRight: 80 }}>
            {imports.slice(0, 5).map(imp => {
              const meta = imp.document_id ? docMetas.get(imp.document_id) : undefined;
              const issuer = detectIssuer(imp, meta);
              const range = dateRanges.get(imp.id);
              const period = formatPeriod(range);
              const badge = isHeldForReview(imp) ? { label: "Needs review", color: T.amber } : isStuck(imp) ? { label: "Needs attention", color: T.amber } : statusBadge(imp.status);
              const txLabel = imp.committed_count != null && imp.committed_count > 0 ? `${imp.committed_count} tx` : "0 tx";
              return (
                <div key={imp.id} style={{
                  flex: "0 0 auto", minWidth: 180, maxWidth: 220,
                  scrollSnapAlign: "start",
                  padding: "12px 14px", borderRadius: 12,
                  background: T.surface, border: `1px solid ${T.border}`,
                  cursor: "default",
                }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{issuer}</div>
                  {period && <div style={{ fontSize: 11, color: T.dim, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{period}</div>}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: T.dim }}>{txLabel}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: `${badge.color}15`, border: `1px solid ${badge.color}30`, color: badge.color, letterSpacing: "0.05em" }}>
                      {badge.label.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========== EMPTY SEARCH STATE ========== */}
      {query.trim() && filteredImports.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: T.dim }}>
          No statements match &ldquo;{query.trim()}&rdquo;.
        </div>
      )}

      {selectMode && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "12px 14px", borderRadius: 10, background: T.surface, border: `1px solid ${T.border}`, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: selectedCount > 0 ? T.text : T.dim, flex: 1, minWidth: 120 }}>
            {selectedCount === 0 ? "Tap rows to select" : `${selectedCount} selected`}
          </span>
          <button onClick={selectAllEmpty} style={{ fontSize: 11, fontWeight: 600, color: T.amber, background: `${T.amber}12`, border: `1px solid ${T.amber}30`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            Select empty ({emptyCount})
          </button>
          <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            Select all
          </button>
          {/* Always-visible Delete button — disabled when 0 selected, so users know the path */}
          <button
            onClick={() => selectedCount > 0 && requestDelete(selectedImports, "bulk", `Delete ${selectedCount} statement${selectedCount !== 1 ? "s" : ""}?`)}
            disabled={selectedCount === 0}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 700,
              color: selectedCount === 0 ? T.dim : "#fff",
              background: selectedCount === 0 ? "transparent" : T.red,
              border: selectedCount === 0 ? `1px solid ${T.border}` : "none",
              borderRadius: 6, padding: "6px 14px",
              cursor: selectedCount === 0 ? "not-allowed" : "pointer",
              opacity: selectedCount === 0 ? 0.55 : 1,
              transition: "all 0.15s",
            }}
          >
            <TrashIcon size={14} color={selectedCount === 0 ? T.dim : "#fff"} />
            Delete{selectedCount > 0 ? ` ${selectedCount}` : ""}
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {stuckImports.length > 0 && !selectMode && (
          <div style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: `${T.amber}0c`,
            border: `1px solid ${T.amber}55`,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 4,
          }}>
            <div style={{ flexShrink: 0, color: T.amber, marginTop: 1 }}>
              <WarnTriangle size={16} color={T.amber} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.amber, marginBottom: 2 }}>
                {stuckImports.length} upload{stuckImports.length !== 1 ? "s" : ""} didn't finish
              </div>
              <div style={{ fontSize: 11.5, color: T.muted, lineHeight: 1.5 }}>
                Byte couldn't finish processing {stuckImports.length === 1 ? "this statement" : "these statements"}. Check the reason on each flagged row below, then delete and re-upload.
              </div>
            </div>
            <button
              onClick={() => requestDelete(stuckImports, "bulk", `Delete ${stuckImports.length} stuck upload${stuckImports.length !== 1 ? "s" : ""}?`)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 11, fontWeight: 700, color: "#fff",
                background: T.red, border: "none",
                borderRadius: 6, padding: "6px 12px",
                cursor: "pointer", flexShrink: 0,
                alignSelf: "center",
              }}
              title={`Delete all ${stuckImports.length} stuck upload${stuckImports.length !== 1 ? "s" : ""}`}
            >
              <TrashIcon size={12} color="#fff" />
              Delete all
            </button>
          </div>
        )}
        {folders.map(folder => {
          const isOpen = query.trim() ? true : expandedGroups.has(folder.key);
          const color = issuerColor(folder.issuer);
          const emoji = issuerEmoji(folder.issuer);
          const folderAllSelected = folder.imports.every(i => selected.has(i.id));
          return (
            <div key={folder.key} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${isOpen ? color + "33" : T.border}`, background: T.surface, transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
                <button onClick={() => toggleFolder(folder.key)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
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
                      {folder.txEarliest && folder.txLatest
                        ? ` · ${folder.txEarliest.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })} – ${folder.txLatest.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}`
                        : ` · ${formatDate(folder.earliest)} – ${formatDate(folder.latest)}`}
                    </div>
                  </div>
                  {!selectMode && (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: T.muted, opacity: 0.75,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s, opacity 0.15s",
                      flexShrink: 0,
                      background: `${T.border}40`,
                    }}>
                      <ChevronIcon size={16} />
                    </div>
                  )}
                </button>
                {!selectMode && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, paddingRight: 10 }}>
                    {/* Prominent folder-level trash icon — goes through modal confirm */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const label = `Delete "${folder.label}" folder?`;
                        requestDelete(folder.imports, "folder", label);
                      }}
                      title="Delete entire folder"
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 32, height: 32, borderRadius: 8,
                        background: "transparent", border: "none", cursor: "pointer",
                        color: T.red, opacity: 0.7,
                        transition: "opacity 0.15s, background 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = `${T.red}18`; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.background = "transparent"; }}
                    >
                      <TrashIcon size={16} />
                    </button>
                    {/* "..." menu kept for folder-scoped select actions (delete removed from here) */}
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (folderMenu === folder.key) {
                            setFolderMenu(null);
                            setMenuAnchor(null);
                          } else {
                            // Measure the button's viewport position so the portaled dropdown
                            // can anchor correctly (avoids being clipped by folder overflow:hidden)
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setMenuAnchor({
                              top: rect.bottom + 6,
                              right: window.innerWidth - rect.right,
                            });
                            setFolderMenu(folder.key);
                          }
                        }}
                        title="More"
                        style={{ width: 28, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", color: T.dim, fontSize: 18, lineHeight: 1, borderRadius: 8 }}
                      >⋯</button>
                      {folderMenu === folder.key && menuAnchor && createPortal(
                        <>
                          <div
                            style={{ position: "fixed", inset: 0, zIndex: 90 }}
                            onClick={() => { setFolderMenu(null); setMenuAnchor(null); }}
                          />
                          <div
                            style={{
                              position: "fixed",
                              top: menuAnchor.top,
                              right: menuAnchor.right,
                              zIndex: 91,
                              minWidth: 220,
                              borderRadius: 10,
                              background: "#0f1a2e",
                              border: `1px solid ${T.border}`,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                              overflow: "hidden",
                            }}
                          >
                            <button
                              onClick={() => {
                                folder.imports.forEach(i => setSelected(prev => new Set(prev).add(i.id)));
                                setSelectMode(true);
                                setExpandedGroups(new Set([folder.key]));
                                setFolderMenu(null);
                                setMenuAnchor(null);
                              }}
                              style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: T.muted, background: "none", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                            >☑ Select all in folder</button>
                            <button
                              onClick={() => {
                                const emptyInFolder = folder.imports.filter(i => (!i.committed_count || i.committed_count === 0) && i.status !== "committed" && i.status !== "parsed_unreconciled");
                                emptyInFolder.forEach(i => setSelected(prev => new Set(prev).add(i.id)));
                                setSelectMode(true);
                                setExpandedGroups(new Set([folder.key]));
                                setFolderMenu(null);
                                setMenuAnchor(null);
                              }}
                              style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 12, fontWeight: 600, color: T.amber, background: "none", border: "none", cursor: "pointer" }}
                            >⚠ Select empty in folder</button>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                  </div>
                )}
              </div>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  {folder.imports.map((imp, idx) => {
                    const meta = imp.document_id ? docMetas.get(imp.document_id) : undefined;
                    const range = dateRanges.get(imp.id);
                    const period = formatPeriod(range);
                    const filename = cleanFilename(imp);
                    const knownInstitution = meta?.institution && meta.institution.length < 50 && ["bmo","rbc","td","cibc","scotiabank","capital one","triangle","world elite","amex","national bank","simplii","tangerine","pc financial","ctfs","canadian tire"].some(b => meta.institution!.toLowerCase().includes(b));

                    // Name priority:
                    //  1. Full institution + period if parser metadata is good
                    //  2. Period derived from tx dates (most reliable real-world case)
                    //  3. Institution name alone
                    //  4. Filename
                    //  5. Import id (should never hit)
                    let name: string;
                    let subtitle: string | null = null;
                    if (knownInstitution && meta?.statement_period) {
                      name = `${meta.institution}${meta.account_last4 ? ` \u00B7\u00B7\u00B7${meta.account_last4}` : ""} \u00B7 ${meta.statement_period}`;
                    } else if (period) {
                      name = period;
                      subtitle = filename;
                    } else if (knownInstitution) {
                      name = meta!.institution!;
                      subtitle = filename;
                    } else if (filename) {
                      name = filename;
                    } else {
                      name = imp.id;
                    }
                    const isEmpty = !imp.committed_count || imp.committed_count === 0;
                    const held = isHeldForReview(imp);
                    const stuck = isStuck(imp);
                    const isChecked = selected.has(imp.id);
                    const isHovered = hoverRow === imp.id;
                    const txCountLabel = imp.committed_count != null && imp.committed_count > 0
                      ? `${imp.committed_count} tx`
                      : "0 transactions";
                    // Held > stuck > normal status badge precedence
                    const badge = held ? { label: "Needs review", color: T.amber } : stuck ? { label: "Needs attention", color: T.amber } : statusBadge(imp.status);

                    return (
                      <div
                        key={imp.id}
                        onMouseEnter={() => setHoverRow(imp.id)}
                        onMouseLeave={() => setHoverRow(null)}
                        onClick={() => {
                          if (selectMode) {
                            toggleSelect(imp.id);
                          } else {
                            window.location.href = `/dashboard/transactions?import_id=${imp.id}`;
                          }
                        }}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px 11px 66px", borderBottom: idx < folder.imports.length - 1 ? `1px solid ${T.border}` : "none", background: isChecked ? `${T.red}10` : (held ? `${T.amber}08` : (stuck ? `${T.amber}08` : (isHovered && !selectMode ? `${T.border}40` : "transparent"))), transition: "background 0.15s", cursor: "pointer" }}
                      >
                        {selectMode && (
                          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isChecked ? T.red : T.border}`, background: isChecked ? T.red : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isChecked && <span style={{ color: "#fff", fontSize: 11, lineHeight: 1 }}>✓</span>}
                          </div>
                        )}
                        <div style={{ fontSize: 14, flexShrink: 0 }}>📄</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                          {subtitle && (
                            <div style={{ fontSize: 10.5, color: T.dim, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>
                          )}
                          <div style={{ fontSize: 10, color: T.dim, marginTop: 1, display: "flex", alignItems: "center", gap: 4 }}>
                            {held ? (
                              <span style={{ color: T.amber, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, lineHeight: 1.4 }}>
                                <WarnTriangle size={10} color={T.amber} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>Totals don't match the bank — review before importing</span>
                              </span>
                            ) : stuck ? (
                              <span style={{ color: T.amber, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600, lineHeight: 1.4 }}>
                                <WarnTriangle size={10} color={T.amber} />
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{getStuckReason(imp, meta)}</span>
                              </span>
                            ) : (
                              <>
                                <span>{new Date(imp.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</span>
                                <span>·</span>
                                {isEmpty
                                  ? <span style={{ color: T.red, display: "inline-flex", alignItems: "center", gap: 3 }}><WarnTriangle size={10} /> {txCountLabel}</span>
                                  : <span>{txCountLabel}</span>}
                              </>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${badge.color}15`, border: `1px solid ${badge.color}30`, color: badge.color, letterSpacing: "0.05em", flexShrink: 0 }}>
                          {badge.label.toUpperCase()}
                        </span>
                        {/* Per-row actions: Review button for held rows, trash for others */}
                        {!selectMode && held && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/dashboard/transactions?import_id=${imp.id}&review=1`);
                            }}
                            title="Review held statement"
                            style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              padding: "4px 12px", borderRadius: 8,
                              background: `${T.amber}20`, border: `1px solid ${T.amber}40`,
                              cursor: "pointer", color: T.amber,
                              fontSize: 11, fontWeight: 700, letterSpacing: "0.03em",
                              flexShrink: 0,
                            }}
                          >
                            Review
                          </button>
                        )}
                        {!selectMode && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const short = name.length > 40 ? name.slice(0, 37) + "…" : name;
                              requestDelete([imp], "row", held ? `Delete held statement "${short}"?` : stuck ? `Delete stuck upload "${short}"?` : `Delete "${short}"?`);
                            }}
                            title={held ? "Delete held statement" : stuck ? "Delete stuck upload" : "Delete statement"}
                            style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              width: 30, height: 30, borderRadius: 8,
                              background: stuck ? `${T.red}18` : "transparent",
                              border: "none", cursor: "pointer",
                              color: T.red,
                              opacity: held ? 0.4 : (stuck ? 1 : (isHovered ? 1 : 0.55)),
                              transition: "opacity 0.15s, background 0.15s",
                              flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${T.red}28`; e.currentTarget.style.opacity = "1"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = stuck ? `${T.red}18` : "transparent"; e.currentTarget.style.opacity = held ? "0.4" : (stuck ? "1" : (isHovered ? "1" : "0.55")); }}
                          >
                            <TrashIcon size={15} />
                          </button>
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

      {/* ========== TRASH (soft-deleted, 30-day retention) ========== */}
      {trash.length > 0 && (
        <div style={{ marginTop: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          <button
            onClick={() => setTrashOpen(v => !v)}
            style={{
              width: "100%", background: "transparent", border: "none", cursor: "pointer",
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
              color: T.text, textAlign: "left",
            }}
          >
            <TrashIcon size={14} color={T.dim} />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
              Recently deleted ({trash.length})
            </span>
            <span style={{ fontSize: 11, color: T.dim }}>
              {trashOpen ? "▲" : "▼"}
            </span>
          </button>
          {trashOpen && (
            <div style={{ borderTop: `1px solid ${T.border}` }}>
              <div style={{ padding: "10px 16px", fontSize: 11, color: T.dim, background: `${T.border}30` }}>
                Statements are kept for 30 days after delete. Restore to bring transactions back.
              </div>
              {trash.map((t, i) => {
                const snapshotCount = Array.isArray(t.deleted_snapshot) ? t.deleted_snapshot.length : 0;
                const deletedDate = t.deleted_at ? new Date(t.deleted_at) : null;
                const deletedLabel = deletedDate ? deletedDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "—";
                const filename = (t as any).filename || null;
                const issuer = (t as any).issuer || "Unknown";
                return (
                  <div key={t.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 16px", borderBottom: i < trash.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{ fontSize: 14, flexShrink: 0 }}>🗑️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {issuer}{filename ? ` · ${filename}` : ""}
                      </div>
                      <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                        {snapshotCount} transaction{snapshotCount !== 1 ? "s" : ""} · deleted {deletedLabel}
                      </div>
                    </div>
                    <button
                      onClick={() => performRestore(t.id)}
                      style={{
                        fontSize: 12, fontWeight: 600, color: T.green,
                        background: `${T.green}14`, border: `1px solid ${T.green}40`,
                        borderRadius: 7, padding: "6px 12px", cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => performPermanentDelete(t.id)}
                      title="Delete permanently"
                      style={{
                        fontSize: 12, fontWeight: 600, color: T.red,
                        background: "transparent", border: `1px solid ${T.red}40`,
                        borderRadius: 7, padding: "6px 10px", cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      <TrashIcon size={12} color={T.red} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== CONFIRM DELETE MODAL ========== */}
      {pendingDelete && (
        <>
          <div
            onClick={() => { if (!deleting) setPendingDelete(null); }}
            style={{ position: "fixed", inset: 0, background: "rgba(5, 9, 20, 0.72)", zIndex: 100, backdropFilter: "blur(2px)" }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              zIndex: 101,
              width: "min(440px, calc(100vw - 32px))",
              background: T.surface,
              border: `1px solid ${T.red}40`,
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(248, 113, 113, 0.08)",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${T.red}18`, border: `1px solid ${T.red}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <TrashIcon size={20} color={T.red} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>
                {pendingDelete.title}
              </div>
            </div>

            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.55, marginBottom: 18 }}>
              <div style={{ marginBottom: 10 }}>This will permanently delete:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 14px", borderRadius: 8, background: `${T.red}0c`, border: `1px solid ${T.red}22`, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.dim, fontSize: 12 }}>Statements</span>
                  <span style={{ color: T.text, fontWeight: 700 }}>{pendingDelete.imports.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.dim, fontSize: 12 }}>Transactions</span>
                  <span style={{ color: T.text, fontWeight: 700 }}>{pendingTxCount.toLocaleString()}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5 }}>
                Your categorization rules and vendor memory are <strong style={{ color: T.green }}>not affected</strong>.
                You'll have <strong style={{ color: T.amber }}>10 seconds to undo</strong> after deleting.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                style={{
                  fontSize: 13, fontWeight: 600, color: T.dim,
                  background: "transparent", border: `1px solid ${T.border}`,
                  borderRadius: 8, padding: "9px 18px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={deleting}
                autoFocus
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 13, fontWeight: 700, color: "#fff",
                  background: T.red, border: "none",
                  borderRadius: 8, padding: "9px 20px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.65 : 1,
                  boxShadow: deleting ? "none" : `0 4px 14px ${T.red}44`,
                }}
              >
                {!deleting && <TrashIcon size={14} color="#fff" />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========== UNDO TOAST ========== */}
      {undoSnapshot && (
        <div
          style={{
            position: "fixed",
            bottom: 24, right: 24,
            zIndex: 99,
            minWidth: 320, maxWidth: "calc(100vw - 48px)",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `${T.green}18`, border: `1px solid ${T.green}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, color: T.green, fontSize: 14, fontWeight: 700,
            }}>
              ✓
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                Deleted {undoSnapshot.count} statement{undoSnapshot.count !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                {undoSnapshot.txCount.toLocaleString()} transaction{undoSnapshot.txCount !== 1 ? "s" : ""} · undo in {undoSecondsLeft}s
              </div>
            </div>
            <button
              onClick={performUndo}
              style={{
                fontSize: 12, fontWeight: 700, color: T.amber,
                background: `${T.amber}14`, border: `1px solid ${T.amber}40`,
                borderRadius: 8, padding: "7px 14px",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              Undo
            </button>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: `${T.border}` }}>
            <div style={{
              height: "100%",
              width: `${undoProgress * 100}%`,
              background: T.amber,
              transition: "width 0.1s linear",
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
