import { AGENT_COLORS, type AgentName } from "./agentConfig";
import { AgentDot } from "./AgentDot";

interface AgentCalloutProps {
  agent: AgentName;
  text: string;
  cta?: string;
  onCtaClick?: () => void;
}

export function AgentCallout({ agent, text, cta, onCtaClick }: AgentCalloutProps) {
  const color = AGENT_COLORS[agent];
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "12px 14px",
        marginBottom: 2,
        borderRadius: 12,
        background: `${color}06`,
        borderLeft: `3px solid ${color}55`,
      }}
    >
      <AgentDot agent={agent} size={24} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: "#e8ecf4", lineHeight: 1.6 }}>{text}</div>
        {cta && (
          <button
            onClick={onCtaClick}
            style={{
              marginTop: 8,
              fontSize: 11,
              fontWeight: 600,
              color: color,
              background: `${color}11`,
              border: `1px solid ${color}22`,
              padding: "4px 12px",
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = `${color}22`)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = `${color}11`)
            }
          >
            {cta} &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
