import { useState, useEffect } from "react";

const C = {
  bg: "#0b1220", surface: "#111a2e", border: "#1e2d4a",
  text: "#e8ecf4", muted: "#a0aec4", dim: "#6b7a99",
  accent: "#c8a64e", green: "#34d399", cyan: "#22d3ee", purple: "#a78bfa", yellow: "#fbbf24",
};

interface PostLoginSplashProps {
  userName?: string;
  onContinue: () => void;
  onOpenPrime?: () => void;
}

export default function PostLoginSplash({ userName = "there", onContinue, onOpenPrime }: PostLoginSplashProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showButtons, setShowButtons] = useState(false);

  const agents = [
    { name: "Byte", color: C.green, letter: "B", line: "2 new statements imported \u2014 24 transactions extracted and staged." },
    { name: "Tag", color: C.cyan, letter: "T", line: "All 24 categorized with 96% confidence. 3 flagged for your review." },
    { name: "Prime", color: C.accent, letter: "\u2655", line: "$420 in new tax deductions identified. Your Xspense Score is 62." },
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
      minHeight: "100dvh", width: "100vw",
      background: `radial-gradient(ellipse at 50% 30%, rgba(200,166,78,0.04) 0%, ${C.bg} 70%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      padding: "60px 24px 40px",
      overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom, 24px)",
      cursor: showButtons ? "default" : "pointer",
    }}>
      {/* Crown */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.accent}25, ${C.accent}08)`,
        border: `2px solid ${C.accent}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, marginBottom: 12,
        boxShadow: `0 0 40px ${C.accent}15, 0 0 80px ${C.accent}08`,
        animation: "crownFloat 3s ease-in-out infinite",
        flexShrink: 0,
      }}>{"\uD83D\uDC51"}</div>

      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
        color: C.accent, fontWeight: 700, marginBottom: 10,
      }}>Previously On XspensesAI</div>

      <h1 style={{
        fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, letterSpacing: -1,
        color: C.text, marginBottom: 6, textAlign: "center",
      }}>Welcome Back, {userName}</h1>

      <p style={{ fontSize: 15, color: C.dim, marginBottom: 16, textAlign: "center" }}>
        Here&apos;s what your AI team did while you were away.
      </p>

      {/* Agent lines */}
      <div style={{ maxWidth: 480, width: "100%", marginBottom: 16 }}>
        {agents.map((agent, i) => (
          <div key={agent.name} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "10px 14px", marginBottom: 6,
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

      {/* Buttons */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        opacity: showButtons ? 1 : 0,
        transform: showButtons ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <button onClick={(e) => { e.stopPropagation(); onContinue(); }} style={{
          padding: "14px 40px", borderRadius: 12, fontSize: 15, fontWeight: 700,
          background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
          border: "none", color: "#0b1220", cursor: "pointer",
          boxShadow: `0 4px 24px ${C.accent}44`,
          transition: "all 0.2s", minWidth: 260,
        }}>Continue to Dashboard {"\u2192"}</button>

        <div style={{ fontSize: 10, color: C.dim, marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}44` }} />
          Secure session restored {"\u2022"} Guardrails active
        </div>
      </div>

      {!showButtons && (
        <div style={{ position: "fixed", bottom: 24, fontSize: 10, color: C.dim, opacity: 0.5 }}>Tap anywhere to skip</div>
      )}

      <style>{`@keyframes crownFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
    </div>
  );
}
