import { useState, useEffect } from "react";
import { THEME } from "./agentConfig";

interface CategoryBreakdown {
  label: string;
  amount: number;
  color: string;
}

interface SpendingBreakdownProps {
  categories: CategoryBreakdown[];
  total: number;
}

function MiniBar({ label, amount, total, color }: CategoryBreakdown & { total: number }) {
  const pct = Math.round((amount / total) * 100);
  const [wide, setWide] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWide(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: THEME.textMuted }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
          ${amount.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: THEME.surface, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            borderRadius: 3,
            background: color,
            width: `${wide}%`,
            transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </div>
  );
}

export function SpendingBreakdown({ categories, total }: SpendingBreakdownProps) {
  return (
    <div
      style={{
        background: THEME.surface,
        border: `1px solid ${THEME.border}`,
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 1.6,
          color: THEME.textDim,
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Spending Breakdown — This Period
      </div>

      {categories.map((cat) => (
        <MiniBar key={cat.label} {...cat} total={total} />
      ))}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 14,
          paddingTop: 12,
          borderTop: `1px solid ${THEME.border}`,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.textMuted }}>Total</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: THEME.text }}>
          ${total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
