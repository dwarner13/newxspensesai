import { useState } from "react";
import { THEME } from "./storyConfig";
import type { StoryData } from "./useStoryData";

interface ReportPreviewSidebarProps {
  data: StoryData;
}

interface ReportToggle {
  label: string;
  agent: string;
  color: string;
  defaultOn: boolean;
}

const TOGGLES: ReportToggle[] = [
  { label: "Prime advisory note", agent: "Prime", color: "#c8a64e", defaultOn: true },
  { label: "Tag category breakdown", agent: "Tag", color: "#22d3ee", defaultOn: true },
  { label: "Crystal analytics", agent: "Crystal", color: "#a78bfa", defaultOn: true },
  { label: "Trend analysis", agent: "Crystal", color: "#a78bfa", defaultOn: false },
  { label: "All transactions list", agent: "Byte", color: "#34d399", defaultOn: false },
  { label: "Tax deduction summary", agent: "Prime", color: "#c8a64e", defaultOn: true },
];

export function ReportPreviewSidebar({ data }: ReportPreviewSidebarProps) {
  const [toggleState, setToggleState] = useState<Record<string, boolean>>(
    Object.fromEntries(TOGGLES.map(t => [t.label, t.defaultOn]))
  );

  const toggle = (label: string) => {
    setToggleState(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: THEME.textDim, fontWeight: 700, marginBottom: 16 }}>Report Preview</div>

      {/* Mini report card */}
      <div style={{
        background: `linear-gradient(135deg, ${THEME.accent}12, #a78bfa08)`,
        borderRadius: 16, padding: "20px", marginBottom: 16,
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text, marginBottom: 4 }}>XspensesAI</div>
        <div style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 16 }}>
          Statement Report \u2022 {data.periodStart} \u2013 {data.periodEnd}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Income", value: `$${data.income.toLocaleString()}`, color: "#34d399" },
            { label: "Expenses", value: `$${data.expenses.toLocaleString()}`, color: "#f87171" },
            { label: "Transactions", value: `${data.transactionCount}`, color: THEME.text },
            { label: "Net", value: `$${data.netPosition.toLocaleString()}`, color: "#fb923c" },
          ].map(s => (
            <div key={s.label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
              <div style={{ fontSize: 9, color: THEME.textDim, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        <button style={{
          width: "100%", marginTop: 14, padding: "10px", borderRadius: 10,
          fontSize: 12, fontWeight: 600,
          background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
          border: "none", color: "#0b1220", cursor: "pointer",
          boxShadow: `0 2px 12px ${THEME.accent}33`,
        }}>{"\uD83D\uDCC4"} Download PDF</button>
      </div>

      {/* Toggles */}
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4, color: THEME.textDim, fontWeight: 700, marginBottom: 12 }}>Include in Report</div>
      {TOGGLES.map(t => (
        <div key={t.label} onClick={() => toggle(t.label)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 0", borderBottom: `1px solid ${THEME.border}`, cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.color }} />
            <span style={{ fontSize: 13, color: THEME.text }}>{t.label}</span>
          </div>
          <div style={{
            width: 36, height: 20, borderRadius: 10,
            background: toggleState[t.label] ? t.color : THEME.border,
            position: "relative", transition: "background 0.2s",
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 2,
              left: toggleState[t.label] ? 18 : 2,
              transition: "left 0.2s",
            }} />
          </div>
        </div>
      ))}

      {/* Page selector */}
      <div style={{ marginTop: 16, display: "flex", gap: 6 }}>
        {[1, 2, 3, 4].map(p => (
          <div key={p} style={{
            width: 32, height: 32, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: p === 1 ? THEME.accent : THEME.surface,
            color: p === 1 ? "#0b1220" : THEME.textMuted,
            fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${p === 1 ? THEME.accent : THEME.border}`,
          }}>{p}</div>
        ))}
      </div>
    </div>
  );
}
