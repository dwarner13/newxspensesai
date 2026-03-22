import { useState } from "react";
import { THEME, type ReportTemplate } from "./reportsConfig";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import { Reveal } from "../PrimeChatV2/Reveal";

interface TemplateCardProps {
  template: ReportTemplate;
  index: number;
  onGenerate?: (template: ReportTemplate) => void;
}

export function TemplateCard({ template: t, index, onGenerate }: TemplateCardProps) {
  const [h, setH] = useState(false);
  return (
    <Reveal delay={300 + index * 80}>
      <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
        background: h ? `${t.color}0a` : THEME.surface,
        border: `1px solid ${h ? t.color + "33" : THEME.border}`,
        borderRadius: 16, padding: "20px", cursor: "pointer",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        transform: h ? "translateY(-2px)" : "translateY(0)",
        boxShadow: h ? `0 8px 32px ${t.color}0d` : `0 2px 12px ${t.color}04`,
        position: "relative",
      }}>
        {t.popular && (
          <div style={{ position: "absolute", top: 12, right: 12, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: `${THEME.accent}15`, color: THEME.accent, border: `1px solid ${THEME.accent}22` }}>Popular</div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${t.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 0 12px ${t.color}15` }}>{t.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text }}>{t.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <AgentDot agent={t.agent} size={16} />
              <span style={{ fontSize: 10.5, color: t.color, fontWeight: 600 }}>{t.agent}</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 14 }}>{t.desc}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: THEME.textDim, padding: "3px 10px", borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.border}` }}>{t.format}</span>
          <button onClick={() => onGenerate?.(t)} style={{
            padding: "6px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: `${t.color}12`, border: `1px solid ${t.color}28`,
            color: t.color, cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = `${t.color}22`}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = `${t.color}12`}
          >Generate {"\u2192"}</button>
        </div>
      </div>
    </Reveal>
  );
}
