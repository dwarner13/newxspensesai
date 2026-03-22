import { useState } from "react";
import { THEME } from "./dashboardConfig";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import { Reveal } from "../PrimeChatV2/Reveal";
import type { AgentName } from "../PrimeChatV2/agentConfig";

interface AgentBriefingCardProps {
  agent: AgentName;
  color: string;
  title: string;
  body: string;
  cta?: string;
  ctaColor?: string;
  urgency?: "high" | "medium" | null;
  delay?: number;
  onCtaClick?: () => void;
}

export function AgentBriefingCard({ agent, color, title, body, cta, ctaColor, urgency, delay = 0, onCtaClick }: AgentBriefingCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onCtaClick}
        style={{
          background: hovered ? `${color}0c` : THEME.surface,
          border: `1px solid ${hovered ? color + "33" : THEME.border}`,
          borderRadius: 18, padding: "22px 24px",
          transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered ? `0 8px 32px ${color}15` : "0 2px 12px rgba(0,0,0,0.15)",
          cursor: "pointer", position: "relative", overflow: "hidden",
        }}
      >
        {urgency && (
          <div style={{
            position: "absolute", top: 14, right: 14,
            width: 8, height: 8, borderRadius: "50%",
            background: urgency === "high" ? "#f87171" : "#fb923c",
            boxShadow: `0 0 8px ${urgency === "high" ? "#f87171" : "#fb923c"}66`,
          }} />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <AgentDot agent={agent} size={36} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{agent}</div>
            <div style={{ fontSize: 10.5, color: THEME.textDim }}>just now</div>
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 8, lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.55, marginBottom: 16 }}>{body}</div>
        {cta && (
          <button style={{
            padding: "8px 18px", borderRadius: 10, fontSize: 11.5, fontWeight: 600,
            background: `${ctaColor || color}12`, border: `1px solid ${ctaColor || color}28`,
            color: ctaColor || color, cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = `${ctaColor || color}22`}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = `${ctaColor || color}12`}
          >{cta} {"\u2192"}</button>
        )}
      </div>
    </Reveal>
  );
}
