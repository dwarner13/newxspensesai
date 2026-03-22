import { useState, useEffect } from "react";
import { THEME } from "./storyConfig";

interface HealthRingProps {
  grade: "A" | "B" | "C" | "D" | "F";
  size?: number;
}

const GRADE_CONFIG = {
  A: { pct: 95, color: "#34d399", label: "Excellent" },
  B: { pct: 80, color: "#60a5fa", label: "Good" },
  C: { pct: 65, color: "#fb923c", label: "Needs Attention" },
  D: { pct: 50, color: "#f87171", label: "At Risk" },
  F: { pct: 30, color: "#ef4444", label: "Critical" },
};

export function HealthRing({ grade, size = 80 }: HealthRingProps) {
  const config = GRADE_CONFIG[grade];
  const [anim, setAnim] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnim(config.pct), 500); return () => clearTimeout(t); }, []);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={THEME.border} strokeWidth={6} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={config.color} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={circ - (anim / 100) * circ}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: config.color }}>{grade}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: config.color, fontWeight: 600, marginTop: 12 }}>{config.label}</div>
      <div style={{ fontSize: 10, color: THEME.textDim, marginTop: 4 }}>
        {grade === "C" || grade === "D" || grade === "F" ? "Expenses exceed income" : "Positive cash flow"}
      </div>
    </div>
  );
}
