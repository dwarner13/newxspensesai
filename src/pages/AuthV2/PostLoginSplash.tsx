import { useState, useEffect, useRef } from "react";
import { AUTH_THEME as C } from "./authConfig";

// TODO: import { useNavigate } from "react-router-dom";

interface SplashLine {
  agent: string;
  color: string;
  letter: string;
  text: string;
}

interface PostLoginSplashProps {
  userName?: string;
  agentLines?: SplashLine[];
  onContinue?: () => void;
  onOpenPrime?: () => void;
}

const DEFAULT_LINES: SplashLine[] = [
  { agent: "Byte", color: "#34d399", letter: "B", text: "2 new statements imported \u2014 24 transactions extracted and staged." },
  { agent: "Tag", color: "#22d3ee", letter: "T", text: "All 24 categorized with 96% confidence. 3 flagged for your review." },
  { agent: "Prime", color: "#c8a64e", letter: "\u2655", text: "$420 in new tax deductions identified. Your Xspense Score is 62." },
];

export default function PostLoginSplash({
  userName = "Darrell",
  agentLines = DEFAULT_LINES,
  onContinue,
  onOpenPrime,
}: PostLoginSplashProps) {
  const [phase, setPhase] = useState(0);
  const [typedLines, setTypedLines] = useState<string[]>(agentLines.map(() => ""));
  const [showButtons, setShowButtons] = useState(false);
  const lineIdxRef = useRef(0);
  const charIdxRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 1) return;

    const iv = setInterval(() => {
      const li = lineIdxRef.current;
      const ci = charIdxRef.current;

      if (li >= agentLines.length) {
        clearInterval(iv);
        setPhase(2);
        setTimeout(() => setShowButtons(true), 400);
        return;
      }

      const currentText = agentLines[li].text;
      if (ci <= currentText.length) {
        setTypedLines(prev => {
          const next = [...prev];
          next[li] = currentText.slice(0, ci);
          return next;
        });
        charIdxRef.current = ci + 1;
      } else {
        lineIdxRef.current = li + 1;
        charIdxRef.current = 0;
      }
    }, 22);

    return () => clearInterval(iv);
  }, [phase, agentLines]);

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
      background: C.bg, color: C.text, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "50%", left: "50%", width: 600, height: 600,
        borderRadius: "50%", background: `radial-gradient(circle, ${C.accent}06 0%, transparent 70%)`,
        transform: "translate(-50%, -50%)", filter: "blur(60px)",
      }} />

      <div style={{
        maxWidth: 560, width: "100%", textAlign: "center", position: "relative", zIndex: 1,
        opacity: phase >= 0 ? 1 : 0, transition: "opacity 1s",
      }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: "0 auto 24px",
          background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, boxShadow: `0 0 40px ${C.accent}33`,
          opacity: phase >= 0 ? 1 : 0, transform: phase >= 0 ? "scale(1)" : "scale(0.8)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
        }}>{"\uD83D\uDC51"}</div>

        <div style={{
          fontSize: 10, textTransform: "uppercase", letterSpacing: 2.5, color: C.accent,
          fontWeight: 700, marginBottom: 16,
          opacity: phase >= 0 ? 1 : 0, transition: "opacity 0.6s 0.3s",
        }}>Previously on XspensesAI</div>

        <h1 style={{
          fontSize: 32, fontWeight: 800, marginBottom: 8,
          opacity: phase >= 0 ? 1 : 0, transition: "opacity 0.6s 0.4s",
        }}>Welcome back, {userName}</h1>
        <p style={{
          fontSize: 14, color: C.textMuted, marginBottom: 40,
          opacity: phase >= 0 ? 1 : 0, transition: "opacity 0.6s 0.5s",
        }}>Here's what your AI team did while you were away.</p>

        {/* Agent lines */}
        <div style={{ textAlign: "left", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {agentLines.map((line, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, alignItems: "flex-start",
              opacity: phase >= 1 && (i === 0 || typedLines[i - 1].length > 0) ? 1 : 0,
              transform: phase >= 1 && (i === 0 || typedLines[i - 1].length > 0) ? "translateY(0)" : "translateY(10px)",
              transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: `linear-gradient(135deg, ${line.color}30, ${line.color}10)`,
                border: `1.5px solid ${line.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: line.agent === "Prime" ? 16 : 13, fontWeight: 700, color: line.color,
                boxShadow: `0 0 16px ${line.color}22`,
              }}>{line.letter}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: line.color, marginBottom: 4 }}>{line.agent}</div>
                <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.5, minHeight: 20 }}>
                  {typedLines[i]}
                  {phase === 1 && typedLines[i].length > 0 && typedLines[i].length < line.text.length && (
                    <span style={{ color: line.color }}>{"\u2588"}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{
          marginTop: 48, display: "flex", flexDirection: "column", gap: 10, alignItems: "center",
          opacity: showButtons ? 1 : 0, transform: showButtons ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <button onClick={onContinue} style={{
            padding: "16px 48px", borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, #a08030)`,
            border: "none", color: "#0b1220", fontSize: 15, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            boxShadow: `0 4px 24px ${C.accent}44`, transition: "all 0.15s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.boxShadow = `0 6px 32px ${C.accent}66`; e.currentTarget.style.transform = "translateY(-2px)"; }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.boxShadow = `0 4px 24px ${C.accent}44`; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Continue to Dashboard <span style={{ fontSize: 18 }}>{"\u2192"}</span>
          </button>

          <button onClick={onOpenPrime} style={{
            padding: "12px 32px", borderRadius: 12,
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.textMuted, fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.text; }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}
          >
            {"\uD83D\uDCAC"} Open Prime Chat
          </button>
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 32,
          opacity: showButtons ? 1 : 0, transition: "opacity 0.5s 0.3s",
        }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}66` }} />
          <span style={{ fontSize: 10, color: C.textDim }}>Secure session restored {"\u2022"} Guardrails active</span>
        </div>
      </div>
    </div>
  );
}
