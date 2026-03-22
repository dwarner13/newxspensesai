import { AGENT_COLORS, AGENT_LABELS, type AgentName } from "./agentConfig";

interface AgentDotProps {
  agent: AgentName;
  size?: number;
}

export function AgentDot({ agent, size = 28 }: AgentDotProps) {
  const color = AGENT_COLORS[agent];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        border: `1.5px solid ${color}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: agent === "Prime" ? size * 0.45 : size * 0.38,
        fontWeight: 700,
        color: color,
      }}
    >
      {AGENT_LABELS[agent]}
    </div>
  );
}
