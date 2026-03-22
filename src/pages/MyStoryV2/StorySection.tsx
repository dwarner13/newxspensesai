import { type ReactNode } from "react";
import { THEME } from "./storyConfig";
import { Reveal } from "../PrimeChatV2/Reveal";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import type { AgentName } from "../PrimeChatV2/agentConfig";

interface StorySectionProps {
  title: string;
  icon: string;
  agent: AgentName;
  agentColor: string;
  delay?: number;
  children: ReactNode;
}

export function StorySection({ title, icon, agent, agentColor, delay = 0, children }: StorySectionProps) {
  return (
    <Reveal delay={delay}>
      <div style={{
        background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18,
        padding: "24px", marginBottom: 16, boxShadow: `0 4px 20px ${agentColor}06`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: THEME.text, flex: 1 }}>{title}</span>
          <AgentDot agent={agent} size={24} />
          <span style={{ fontSize: 10, fontWeight: 600, color: agentColor }}>{agent}</span>
        </div>
        {children}
      </div>
    </Reveal>
  );
}
