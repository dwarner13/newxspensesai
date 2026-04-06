import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

const C = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc",
  accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", purple: "#a78bfa", yellow: "#fbbf24",
};

interface PostLoginSplashProps {
  userName?: string;
  onContinue: () => void;
  onOpenPrime?: () => void;
  onUploadStatement?: () => void;
  onScanReceipt?: () => void;
}

export default function PostLoginSplash({ userName = "there", onContinue, onUploadStatement, onScanReceipt }: PostLoginSplashProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showButtons, setShowButtons] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [splashData, setSplashData] = useState({
    statementCount: 0, transactionCount: 0, uncategorizedCount: 0,
    categorizedPct: 0, deductionsTotal: 0, xspenseScore: 0, loaded: false,
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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

  const agents = [
    { name: "Byte", color: C.green, letter: "B", line: splashData.loaded ? (splashData.statementCount > 0 ? `${splashData.statementCount} statement${splashData.statementCount !== 1 ? 's' : ''} processed \u2014 ${splashData.transactionCount.toLocaleString()} transactions in your books.` : "Ready to process your first statement. Drop a PDF and I'll go to work.") : "Checking your imports..." },
    { name: "Tag", color: C.cyan, letter: "T", line: splashData.loaded ? (splashData.transactionCount > 0 ? `${splashData.categorizedPct}% categorized${splashData.uncategorizedCount > 0 ? ` \u2014 ${splashData.uncategorizedCount} still need your input.` : '. All transactions clean.'}` : "Standing by \u2014 upload a statement and I'll categorize everything automatically.") : "Checking categories..." },
    { name: "Prime", color: C.accent, letter: "\u2655", line: splashData.loaded ? (splashData.deductionsTotal > 0 ? `$${splashData.deductionsTotal.toLocaleString()} in potential tax deductions identified. Your Xspense Score is ${splashData.xspenseScore}.` : splashData.transactionCount > 0 ? `Your Xspense Score is ${splashData.xspenseScore}. Upload more statements to unlock deeper insights.` : "Ready to brief you. Upload your first statement to get started.") : "Preparing your briefing..." },
  ];

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    agents.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 800 + i * 1200));
    });
    timers.push(setTimeout(() => setShowButtons(true), 800 + agents.length * 1200 + 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  const skipToEnd = () => {
    if (!showButtons) {
      setVisibleLines(agents.length);
      setShowButtons(true);
    }
  };

  return (
    <div onClick={skipToEnd} style={{
      position: "relative",
      minHeight: "100vh",
      // @ts-ignore — Safari needs -webkit-fill-available for proper vh
      WebkitMinHeight: "-webkit-fill-available",
      width: "100%",
      background: C.bg,
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      cursor: showButtons ? "default" : "pointer",
    }}>
      {/* LEFT PANEL — Crown + Agents */}
      <div style={{
        flex: isMobile ? "1 1 auto" : "0 0 50%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px" : "48px 40px",
        paddingTop: isMobile ? "env(safe-area-inset-top, 24px)" : "48px",
        background: `radial-gradient(ellipse at 50% 30%, rgba(200,166,78,0.04) 0%, ${C.bg} 70%)`,
        borderRight: isMobile ? "none" : `1px solid ${C.border}`,
        overflowY: "auto",
      }}>
        {/* Crown */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "#1e2d4a",
          border: `2px solid ${C.accent}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, marginBottom: 4,
          boxShadow: `0 0 40px ${C.accent}15, 0 0 80px ${C.accent}08`,
          animation: "crownFloat 3s ease-in-out infinite",
          flexShrink: 0,
        }}>{"\uD83D\uDC51"}</div>

        <div style={{
          fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
          color: C.accent, fontWeight: 700, marginBottom: 6,
        }}>{splashData.loaded && splashData.transactionCount === 0 ? 'Your AI Finance Team' : 'Previously On XspensesAI'}</div>

        <h1 style={{
          fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, letterSpacing: -1,
          color: C.text, marginBottom: 2, textAlign: "center",
        }}>Welcome Back, {userName}</h1>

        <p style={{ fontSize: 15, color: C.dim, marginBottom: isMobile ? 10 : 20, textAlign: "center" }}>
          {splashData.loaded && splashData.transactionCount === 0
            ? "Your AI team is ready. Let's get started."
            : "Here's what your AI team did while you were away."}
        </p>

        {/* Agent lines */}
        <div style={{ maxWidth: 480, width: "100%", marginBottom: isMobile ? 12 : 0 }}>
          {agents.map((agent, i) => (
            <div key={agent.name} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "8px 12px", marginBottom: 4,
              background: visibleLines > i ? `${agent.color}06` : "transparent",
              border: `1px solid ${visibleLines > i ? agent.color + "18" : "transparent"}`,
              borderRadius: 14,
              opacity: visibleLines > i ? 1 : 0,
              transform: visibleLines > i ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${agent.color}25, ${agent.color}10)`,
                border: `1.5px solid ${agent.color}33`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: agent.color,
                boxShadow: `0 0 12px ${agent.color}15`,
              }}>{agent.letter}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: agent.color, marginBottom: 2 }}>{agent.name}</div>
                <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{agent.line}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — CTAs */}
      <div style={{
        flex: isMobile ? "1 1 auto" : "0 0 50%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "0 24px 24px" : "48px 40px",
        paddingBottom: isMobile ? "max(24px, env(safe-area-inset-bottom, 24px))" : "48px",
        background: isMobile ? "transparent" : "#0d1628",
        overflowY: "auto",
      }}>
        <div style={{
          maxWidth: 480, width: "100%",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          opacity: showButtons ? 1 : 0,
          transform: showButtons ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {/* Section label — desktop only */}
          {!isMobile && (
            <div style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
              color: C.dim, fontWeight: 700, marginBottom: 12,
            }}>What's Your First Move?</div>
          )}

          {/* Action tiles */}
          <div style={{ width: "100%" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 10 : 14,
              width: "100%", marginBottom: isMobile ? 8 : 14,
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); onUploadStatement ? onUploadStatement() : onContinue(); }}
                style={{
                  background: `${C.cyan}0d`, border: `1.5px solid ${C.cyan}55`,
                  borderRadius: isMobile ? 14 : 16,
                  padding: isMobile ? "14px 12px" : "24px 16px",
                  minHeight: isMobile ? 90 : 140, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 6 : 10,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${C.cyan}1a`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${C.cyan}0d`)}
              >
                <span style={{ fontSize: isMobile ? 22 : 28 }}>{"\uD83D\uDCC4"}</span>
                <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: C.cyan }}>Upload Statement</span>
                <span style={{ fontSize: isMobile ? 10 : 11, color: `${C.cyan}88` }}>Bank {"\u00b7"} Credit card</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); onScanReceipt ? onScanReceipt() : onContinue(); }}
                style={{
                  background: `${C.green}0d`, border: `1.5px solid ${C.green}55`,
                  borderRadius: isMobile ? 14 : 16,
                  padding: isMobile ? "14px 12px" : "24px 16px",
                  minHeight: isMobile ? 90 : 140, cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? 6 : 10,
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${C.green}1a`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${C.green}0d`)}
              >
                <span style={{ fontSize: isMobile ? 22 : 28 }}>{"\uD83E\uDDFE"}</span>
                <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: C.green }}>Scan a Receipt</span>
                <span style={{ fontSize: isMobile ? 10 : 11, color: `${C.green}88` }}>Photo {"\u00b7"} PDF</span>
              </button>
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={(e) => { e.stopPropagation(); onContinue(); }}
            style={{
              width: "100%", padding: isMobile ? "14px 40px" : "16px 40px",
              borderRadius: 12, fontSize: isMobile ? 15 : 16, fontWeight: 700,
              background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
              border: "none", color: "#0b1220", cursor: "pointer",
              boxShadow: `0 4px 24px ${C.accent}44`,
              transition: "all 0.2s",
            }}
          >
            Continue to Dashboard {"\u2192"}
          </button>

          {/* Status pills */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: `${C.green}12`, border: `1px solid ${C.green}44`,
              borderRadius: 20, padding: "5px 12px",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: `0 0 6px ${C.green}88` }} />
              <span style={{ fontSize: 11, color: C.green, fontWeight: 500 }}>Guardrails active</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.35)",
              borderRadius: 20, padding: "5px 12px",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 500 }}>Session secured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tap to skip — mobile only */}
      {!showButtons && isMobile && (
        <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, textAlign: "center", fontSize: 10, color: C.dim, opacity: 0.5 }}>Tap anywhere to skip</div>
      )}

      <style>{`@keyframes crownFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
    </div>
  );
}
