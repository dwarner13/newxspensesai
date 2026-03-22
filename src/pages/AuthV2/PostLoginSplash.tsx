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
      minHeight: "100vh", width: "100vw",
      background: `radial-gradient(ellipse at 50% 30%, rgba(200,166,78,0.04) 0%, ${C.bg} 70%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
      padding: "40px 24px",
      cursor: showButtons ? "default" : "pointer",
    }}>
      {/* Crown with glow */}
      <div style={{
        width: 80, height: 80, borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.accent}25, ${C.accent}08)`,
        border: `2px solid ${C.accent}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, marginBottom: 32,
        boxShadow: `0 0 40px ${C.accent}15, 0 0 80px ${C.accent}08`,
        animation: "crownFloat 3s ease-in-out infinite",
      }}>{"\uD83D\uDC51"}</div>

      <div style={{
        fontSize: 10, textTransform: "uppercase", letterSpacing: 3,
        color: C.accent, fontWeight: 700, marginBottom: 16,
      }}>Previously On XspensesAI</div>

      <h1 style={{
        fontSize: 36, fontWeight: 800, letterSpacing: -1,
        color: C.text, marginBottom: 8, textAlign: "center",
      }}>Welcome back, {userName}</h1>

      <p style={{ fontSize: 14, color: C.dim, marginBottom: 40, textAlign: "center" }}>
        Here&apos;s what your AI team did while you were away.
      </p>

      {/* Agent lines */}
      <div style={{ maxWidth: 520, width: "100%", marginBottom: 40 }}>
        {agents.map((agent, i) => (
          <div key={agent.name} style={{
            display: "flex", alignItems: "flex-start", gap: 14,
            padding: "16px 20px", marginBottom: 12,
            background: visibleLines > i ? `${agent.color}06` : "transparent",
            border: `1px solid ${visibleLines > i ? agent.color + "18" : "transparent"}`,
            borderRadius: 16,
            opacity: visibleLines > i ? 1 : 0,
            transform: visibleLines > i ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
              background: `linear-gradient(135deg, ${agent.color}25, ${agent.color}10)`,
              border: `1.5px solid ${agent.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: agent.color,
              boxShadow: `0 0 16px ${agent.color}15`,
            }}>{agent.letter}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: agent.color, marginBottom: 3 }}>{agent.name}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{agent.line}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        opacity: showButtons ? 1 : 0,
        transform: showButtons ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <button onClick={(e) => { e.stopPropagation(); onContinue(); }} style={{
          padding: "16px 48px", borderRadius: 14, fontSize: 16, fontWeight: 700,
          background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
          border: "none", color: "#0b1220", cursor: "pointer",
          boxShadow: `0 4px 24px ${C.accent}44`,
          transition: "all 0.2s", minWidth: 280,
        }}>Continue to Dashboard {"\u2192"}</button>

        <button onClick={(e) => { e.stopPropagation(); onOpenPrime?.(); }} style={{
          padding: "12px 36px", borderRadius: 12, fontSize: 14, fontWeight: 600,
          background: "transparent", border: `1px solid ${C.border}`,
          color: C.muted, cursor: "pointer", transition: "all 0.2s",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, boxShadow: `0 0 8px ${C.accent}44` }} />
          Open Prime Chat
        </button>

        <div style={{ fontSize: 11, color: C.dim, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}44` }} />
          Secure session restored {"\u2022"} Guardrails active
        </div>
      </div>

      {!showButtons && (
        <div style={{ position: "fixed", bottom: 32, fontSize: 11, color: C.dim, opacity: 0.5 }}>Tap anywhere to skip</div>
      )}

      <style>{`@keyframes crownFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }`}</style>
    </div>
  );
}
