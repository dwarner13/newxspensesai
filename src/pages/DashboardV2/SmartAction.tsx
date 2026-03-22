import { useState } from "react";
import { THEME } from "./dashboardConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface SmartActionProps {
  icon: string;
  label: string;
  reason: string;
  agentColor: string;
  delay?: number;
  onClick?: () => void;
}

export function SmartAction({ icon, label, reason, agentColor, delay = 0, onClick }: SmartActionProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
          borderRadius: 14, background: hovered ? "#1a2844" : THEME.surfaceLight,
          border: `1px solid ${hovered ? agentColor + "33" : THEME.border}`,
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        <div style={{ fontSize: 20, width: 36, height: 36, borderRadius: 10, background: `${agentColor}12`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{label}</div>
          <div style={{ fontSize: 11, color: THEME.textDim }}>{reason}</div>
        </div>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke={THEME.textDim} strokeWidth={2} strokeLinecap="round" /></svg>
      </div>
    </Reveal>
  );
}
