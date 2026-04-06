import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSupabase } from "@/lib/supabase";

const C = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc",
  accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee",
  red: "#f87171", amber: "#fbbf24", purple: "#a78bfa",
};

interface PostLoginSplashProps {
  userName?: string;
  onContinue: () => void;
  onOpenPrime?: () => void;
  onUploadStatement?: () => void;
  onScanReceipt?: () => void;
}

export default function PostLoginSplash({ userName = "there", onContinue, onOpenPrime, onUploadStatement, onScanReceipt }: PostLoginSplashProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const [byteMessage, setByteMessage] = useState<string | null>(null);
  const [byteUploading, setByteUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [tagTransactions, setTagTransactions] = useState<any[]>([]);
  const [tagFixing, setTagFixing] = useState<string | null>(null);
  const [tagFixed, setTagFixed] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [splashData, setSplashData] = useState({
    statementCount: 0, transactionCount: 0, uncategorizedCount: 0,
    categorizedPct: 0, deductionsTotal: 0, xspenseScore: 0, loaded: false,
  });

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth <= 768);
    h(); window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase(); if (!sb) return;
        const { data: { session } } = await sb.auth.getSession(); if (!session) return;
        const uid = session.user.id;
        const { count: txCount } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', uid);
        const { count: uncatCount } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', uid).or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null');
        const { count: stmtCount } = await sb.from('imports').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'committed');
        const DEDUCTIBLE = ['Transportation', 'Housing', 'Utilities', 'Healthcare', 'Education', 'Insurance', 'Subscriptions', 'Bank Fees', 'Business'];
        const { data: deductTxs } = await sb.from('transactions').select('amount').eq('user_id', uid).in('category', DEDUCTIBLE);
        const deductionsTotal = Math.round((deductTxs ?? []).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0));
        const total = txCount || 0;
        const uncat = uncatCount || 0;
        const categorizedPct = total > 0 ? Math.round(((total - uncat) / total) * 100) : 0;
        const xspenseScore = Math.min(100, Math.round(40 + categorizedPct * 0.5 + (stmtCount || 0) * 2));
        setSplashData({ statementCount: stmtCount || 0, transactionCount: total, uncategorizedCount: uncat, categorizedPct, deductionsTotal, xspenseScore, loaded: true });
      } catch { /* silent */ }
    })();
  }, []);

  // Fetch 3 Needs Review transactions for Tag card
  useEffect(() => {
    if (!splashData.loaded) return;
    (async () => {
      try {
        const sb = getSupabase(); if (!sb) return;
        const { data: { session } } = await sb.auth.getSession(); if (!session) return;
        const { data } = await sb.from('transactions')
          .select('id, merchant_name, category, amount, date')
          .eq('user_id', session.user.id)
          .or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null')
          .order('date', { ascending: false })
          .limit(3);
        setTagTransactions(data || []);
      } catch { /* silent */ }
    })();
  }, [splashData.loaded]);

  // Byte upload handler
  const handleByteUpload = async (file: File) => {
    setByteUploading(true);
    setUploadProgress(0);
    setByteMessage("Reading your statement...");
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 300);
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/.netlify/functions/receipt-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ image_base64: base64, mime_type: file.type, filename: file.name }),
        });
        const data = await res.json();
        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadComplete(true);
        setByteMessage("Done \u2713 Found transactions in your statement. Ready to review them now.");
        setTimeout(() => {
          sessionStorage.setItem("xai_splash_date", new Date().toDateString());
          navigate('/dashboard/transactions');
        }, 2000);
      };
      reader.readAsDataURL(file);
    } catch {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setByteMessage("Upload failed \u2014 try again.");
      setByteUploading(false);
    }
  };

  // Tag quick fix handler
  const handleTagFix = async (txId: string, newCategory: string) => {
    setTagFixing(txId);
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      await sb.from('transactions').update({ category: newCategory, category_source: 'splash_fix', updated_at: new Date().toISOString() }).eq('id', txId);
      setTagFixed(prev => new Set([...prev, txId]));
      setTagTransactions(prev => prev.map(t => t.id === txId ? { ...t, category: newCategory } : t));
    } catch { /* silent */ }
    finally { setTagFixing(null); }
  };

  const isNewUser = splashData.loaded && splashData.transactionCount === 0;

  return (
    <div style={{
      minHeight: "100vh",
      // @ts-ignore — Safari needs -webkit-fill-available
      WebkitMinHeight: "-webkit-fill-available",
      width: "100%",
      display: "flex", flexDirection: "column", alignItems: "center",
      overflowY: "auto",
      padding: isMobile ? "16px" : "16px 24px",
      paddingBottom: "24px",
      background: "#0b1220",
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      boxSizing: "border-box" as const,
    }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: isMobile ? 16 : 12 }}>
        {/* Hidden file inputs */}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) void handleByteUpload(e.target.files[0]); e.target.value = ''; }} />
        <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) void handleByteUpload(e.target.files[0]); e.target.value = ''; }} />
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(200,166,78,0.15)", border: "2px solid rgba(200,166,78,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, margin: "0 auto 6px", animation: "crownFloat 3s ease-in-out infinite" }}>{"\uD83D\uDC51"}</div>
        <div style={{ fontSize: 10, letterSpacing: 3, color: C.accent, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Previously on XspensesAI</div>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: C.text, margin: 0, letterSpacing: -0.5 }}>Welcome Back, {userName}</h1>
        <p style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>{isNewUser ? "Meet your AI finance team. Let's get started." : "Your AI team has been working. Here's the situation."}</p>
      </div>

      {/* Three agent cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
        gap: 10, width: "100%", maxWidth: 1100,
        marginBottom: 10, alignItems: "stretch",
      }}>

        {/* CARD 1 — PRIME */}
        <div style={{
          background: "linear-gradient(135deg, rgba(200,166,78,0.08), rgba(17,26,46,0.9))",
          border: "1px solid rgba(200,166,78,0.2)",
          borderTop: "3px solid #c8a64e",
          borderRadius: 20, padding: "14px 16px", position: "relative",
          display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", boxSizing: "border-box" as const,
        }}>
          <div style={{ position: "absolute", bottom: -10, right: 12, fontSize: 96, fontWeight: 900, color: "rgba(200,166,78,0.06)", lineHeight: 1, userSelect: "none" }}>1</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(200,166,78,0.2)", border: "1.5px solid rgba(200,166,78,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.accent, boxShadow: "0 0 20px rgba(200,166,78,0.2)" }}>{"\u2655"}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>Prime</div>
              <div style={{ fontSize: 10, color: C.dim }}>Your CFO Advisor</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: C.green }}>{"\u25CF"} Live</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: C.accent, letterSpacing: -1 }}>{isNewUser ? "Ready" : `$${splashData.deductionsTotal.toLocaleString()}`}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{isNewUser ? "your AI CFO advisor" : "in potential tax deductions identified"}</div>
            {!isNewUser && (
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(200,166,78,0.1)", border: "1px solid rgba(200,166,78,0.2)", color: C.accent }}>Score: {splashData.xspenseScore}</span>
                <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: C.green }}>{splashData.categorizedPct}% organized</span>
              </div>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.dim, fontStyle: "italic", lineHeight: 1.6, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(200,166,78,0.05)", borderLeft: "2px solid rgba(200,166,78,0.3)" }}>
            "{isNewUser ? "Upload your first statement and I'll analyze your complete financial position." : splashData.deductionsTotal > 0 ? "Your books are in good shape. Let's make sure every deduction is captured before tax season." : "Upload your first statement and I'll analyze your financial position immediately."}"
          </div>
          <button onClick={(e) => { e.stopPropagation(); onOpenPrime?.(); onContinue(); }} style={{ width: "100%", padding: "12px", marginTop: "auto", borderRadius: 10, background: "rgba(200,166,78,0.08)", border: "1px solid rgba(200,166,78,0.25)", color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {isNewUser ? "Learn about Prime \u2192" : "View Prime Briefing \u2192"}
          </button>
        </div>

        {/* CARD 2 — BYTE */}
        <div style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(17,26,46,0.9))",
          border: "1px solid rgba(34,211,238,0.2)",
          borderTop: "3px solid #22d3ee",
          borderRadius: 20, padding: "14px 16px", position: "relative",
          display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", boxSizing: "border-box" as const,
        }}>
          <div style={{ position: "absolute", bottom: -10, right: 12, fontSize: 96, fontWeight: 900, color: "rgba(34,211,238,0.05)", lineHeight: 1, userSelect: "none" }}>2</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(34,211,238,0.15)", border: "1.5px solid rgba(34,211,238,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: C.cyan, boxShadow: "0 0 20px rgba(34,211,238,0.15)" }}>B</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>Byte</div>
              <div style={{ fontSize: 10, color: C.dim }}>Document Processor</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: C.green }}>{"\u25CF"} Ready</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: C.cyan, letterSpacing: -1 }}>{splashData.statementCount}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{isNewUser ? "statements \u2014 let's change that" : `statements processed ${"\u00b7"} ${splashData.transactionCount.toLocaleString()} transactions`}</div>
          </div>

          {byteMessage ? (
            <div style={{ fontSize: 11, color: C.green, fontStyle: "italic", lineHeight: 1.6, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(52,211,153,0.06)", borderLeft: "2px solid rgba(52,211,153,0.3)" }}>
              "{byteMessage}"
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.dim, fontStyle: "italic", lineHeight: 1.6, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(34,211,238,0.04)", borderLeft: "2px solid rgba(34,211,238,0.2)" }}>
              "Drop a statement and I'll have it processed in 60 seconds. PDF, CSV, or photo."
            </div>
          )}

          {(byteUploading || uploadComplete) && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: "#22d3ee" }}>{byteMessage || "Reading your file..."}</span>
                <span style={{ fontSize: 10, color: "#22d3ee", fontWeight: 700 }}>{Math.round(uploadProgress)}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(34,211,238,0.15)" }}>
                <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg, #22d3ee, #34d399)", width: `${uploadProgress}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: "auto" }}>
            <button onClick={() => fileRef.current?.click()} disabled={byteUploading} style={{ padding: "10px 8px", borderRadius: 10, background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.3)", color: C.cyan, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {"\uD83D\uDCC4"} {byteUploading ? "Processing..." : "Upload Statement"}
            </button>
            <button onClick={() => cameraRef.current?.click()} disabled={byteUploading} style={{ padding: "10px 8px", borderRadius: 10, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", color: C.green, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {"\uD83E\uDDFE"} Scan Receipt
            </button>
          </div>
          {uploadComplete && (
            <button onClick={() => { sessionStorage.setItem("xai_splash_date", new Date().toDateString()); navigate('/dashboard/transactions'); }} style={{ width: "100%", marginTop: 10, padding: "12px", borderRadius: 10, background: "linear-gradient(135deg, #22d3ee, #0891b2)", border: "none", color: "#0b1220", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              View Your Transactions {"\u2192"}
            </button>
          )}
        </div>

        {/* CARD 3 — TAG */}
        <div style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.05), rgba(17,26,46,0.9))",
          border: `1px solid ${splashData.uncategorizedCount > 0 ? "rgba(251,191,36,0.3)" : "rgba(34,211,238,0.2)"}`,
          borderTop: `3px solid ${splashData.uncategorizedCount > 0 ? "#fbbf24" : "#22d3ee"}`,
          borderRadius: 20, padding: "14px 16px", position: "relative",
          display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", boxSizing: "border-box" as const,
        }}>
          <div style={{ position: "absolute", bottom: -10, right: 12, fontSize: 96, fontWeight: 900, color: "rgba(34,211,238,0.05)", lineHeight: 1, userSelect: "none" }}>3</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: splashData.uncategorizedCount > 0 ? "rgba(251,191,36,0.15)" : "rgba(34,211,238,0.15)", border: `1.5px solid ${splashData.uncategorizedCount > 0 ? "rgba(251,191,36,0.4)" : "rgba(34,211,238,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: splashData.uncategorizedCount > 0 ? C.amber : C.cyan }}>T</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: splashData.uncategorizedCount > 0 ? C.amber : C.cyan }}>Tag</div>
              <div style={{ fontSize: 10, color: C.dim }}>Categorization Expert</div>
            </div>
            {splashData.uncategorizedCount > 0 && (
              <div style={{ marginLeft: "auto", fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: C.amber, fontWeight: 700 }}>{splashData.uncategorizedCount} to review</div>
            )}
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, color: splashData.uncategorizedCount > 0 ? C.amber : C.cyan, letterSpacing: -1 }}>{splashData.categorizedPct}%</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>categorized {"\u00b7"} {splashData.uncategorizedCount} need your input</div>
          </div>

          {/* Live transactions to fix */}
          {tagTransactions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: C.dim, fontWeight: 700, marginBottom: 8 }}>Fix these now:</div>
              {tagTransactions.map(tx => (
                <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: tagFixed.has(tx.id) ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${tagFixed.has(tx.id) ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`, marginBottom: 4, opacity: tagFixed.has(tx.id) ? 0.7 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.merchant_name || "Unknown"}</div>
                    <div style={{ fontSize: 10, color: C.dim }}>${Math.abs(Number(tx.amount)).toFixed(2)}</div>
                  </div>
                  {tagFixing === tx.id ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(34,211,238,0.3)", borderTopColor: "#22d3ee", animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 10, color: "#22d3ee" }}>Saving...</span>
                    </div>
                  ) : tagFixed.has(tx.id) ? (
                    <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>{"\u2713"} Fixed</span>
                  ) : (
                    <select onChange={e => { if (e.target.value) void handleTagFix(tx.id, e.target.value); }} defaultValue="" style={{ fontSize: 10, padding: "3px 6px", borderRadius: 6, background: "#0b1220", border: "1px solid #1e2d4a", color: C.text, cursor: "pointer" }}>
                      <option value="" disabled>Categorize...</option>
                      {["Income", "Groceries", "Food & Dining", "Transportation", "Housing", "Utilities", "Shopping", "Subscriptions", "Entertainment", "Healthcare", "Bank Fees", "Transfers", "Debt Payments", "Personal Care", "Business"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}

          {tagTransactions.length === 0 && splashData.loaded && (
            <div style={{ fontSize: 11, color: C.green, fontStyle: "italic", lineHeight: 1.6, marginBottom: 8, padding: "6px 10px", borderRadius: 10, background: "rgba(52,211,153,0.06)", borderLeft: "2px solid rgba(52,211,153,0.3)" }}>
              "All transactions categorized. Books are clean {"\u2713"}"
            </div>
          )}

          <button onClick={(e) => { e.stopPropagation(); onContinue(); }} style={{ width: "100%", padding: "10px", marginTop: "auto", borderRadius: 10, background: splashData.uncategorizedCount > 0 ? "rgba(251,191,36,0.12)" : "rgba(34,211,238,0.1)", border: `1px solid ${splashData.uncategorizedCount > 0 ? "rgba(251,191,36,0.3)" : "rgba(34,211,238,0.25)"}`, color: splashData.uncategorizedCount > 0 ? C.amber : C.cyan, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {splashData.uncategorizedCount > 0 ? `Open Tag \u2014 Fix ${splashData.uncategorizedCount} transactions \u2192` : "All clean \u2014 View Categories \u2192"}
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ width: "100%", maxWidth: 1100, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#9ba8bc" }}>That's a preview {"\u2014"} your full financial picture is inside</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onContinue(); }} style={{ width: "100%", maxWidth: isMobile ? "100%" : 480, padding: "16px", borderRadius: 14, fontSize: 15, fontWeight: 800, background: `linear-gradient(135deg, ${C.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: "0 4px 24px rgba(200,166,78,0.4)", letterSpacing: 0.3 }}>
          Continue to Dashboard {"\u2192"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            <span style={{ fontSize: 11, color: C.green, fontWeight: 500 }}>Guardrails active</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
            <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 500 }}>Session secured</span>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes crownFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
      </div>
    </div>
  );
}
