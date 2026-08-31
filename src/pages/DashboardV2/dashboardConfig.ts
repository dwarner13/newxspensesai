import { THEME } from "../PrimeChatV2/agentConfig";
export { THEME };

export type AgentName = "Prime" | "Tag" | "Crystal" | "Byte";

export const AGENT_META: Record<AgentName, { color: string; letter: string; role: string }> = {
  Prime: { color: THEME.accent, letter: "\u2655", role: "Financial Assistant" },
  Byte:  { color: "#34d399", letter: "B", role: "Smart Import" },
  Tag:   { color: "#22d3ee", letter: "T", role: "Categorizer" },
  Crystal: { color: "#a78bfa", letter: "C", role: "Analytics" },
};
