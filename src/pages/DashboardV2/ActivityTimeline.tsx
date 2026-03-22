import { THEME, AGENT_META, type AgentName } from "./dashboardConfig";
import { AgentDot } from "../PrimeChatV2/AgentDot";

interface ActivityItem {
  agent: string;
  action: string;
  detail: string;
  time: string;
}

interface ActivityTimelineProps {
  items: ActivityItem[];
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  return (
    <div>
      {items.map((a, i) => {
        const agentName = a.agent as AgentName;
        const meta = AGENT_META[agentName] || AGENT_META.Prime;
        return (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < items.length - 1 ? 14 : 0, position: "relative" }}>
            {i < items.length - 1 && (
              <div style={{ position: "absolute", left: 13, top: 28, width: 1, height: "calc(100% + 2px)", background: THEME.border }} />
            )}
            <AgentDot agent={agentName} size={26} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: meta.color }}>{a.agent}</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>{a.time}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: THEME.text, marginBottom: 1 }}>{a.action}</div>
              <div style={{ fontSize: 11, color: THEME.textDim }}>{a.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
