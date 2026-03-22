import { useState, useEffect } from "react";
import { THEME, getScoreColor, getScoreLabel } from "./scoreConfig";

interface ScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 200, showLabel = true }: ScoreRingProps) {
  const [anim, setAnim] = useState(0);
  const [counting, setCounting] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnim(score), 500);
    let current = 0;
    const iv = setInterval(() => {
      current += 1;
      if (current >= score) { setCounting(score); clearInterval(iv); }
      else setCounting(current);
    }, 20);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [score]);

  const color = getScoreColor(score);
  const stroke = size > 100 ? 10 : 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{
        position: "absolute", inset: size * 0.1, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        filter: "blur(20px)",
      }} />
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", position: "relative", zIndex: 1 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={THEME.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - (anim / 100) * circ}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", filter: `drop-shadow(0 0 8px ${color}66)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
        <div style={{ fontSize: size * 0.24, fontWeight: 800, color: THEME.text, lineHeight: 1 }}>{counting}</div>
        {showLabel && (
          <>
            <div style={{ fontSize: Math.max(size * 0.055, 10), fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 4 }}>{getScoreLabel(score)}</div>
            <div style={{ fontSize: Math.max(size * 0.05, 9), color: THEME.textDim, marginTop: 2 }}>out of 100</div>
          </>
        )}
      </div>
    </div>
  );
}

/** Compact score ring for dashboard/sidebar use */
export function CompactScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(score), 300); return () => clearTimeout(t); }, [score]);
  const color = getScoreColor(score);
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={THEME.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ - (anim / 100) * circ}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.32, fontWeight: 800, color }}>{score}</span>
      </div>
    </div>
  );
}
