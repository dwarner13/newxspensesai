import { CHAT_VISUALS } from "@/lib/chatVisualStandards";

interface ThinkingIndicatorProps {
  /** Agent identity colour (Prime gold, Tag turquoise, …). */
  color: string;
  /** Visible label, e.g. "Prime is thinking…". Shown only while a real request is pending. */
  label: string;
}

/**
 * Three ~10px pulsing dots plus a visible label. Presentational only: the caller decides
 * when a genuine request is in flight. Screen readers hear the label once (role="status").
 * Motion stops under prefers-reduced-motion.
 */
export function ThinkingIndicator({ color, label }: ThinkingIndicatorProps) {
  const dot = CHAT_VISUALS.thinkingDot;
  return (
    <div role="status" style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0", minHeight: 24 }}>
      <style>{`
        @keyframes xaiThinkDot { 0%,80%,100% { transform: scale(0.7); opacity: 0.35; } 40% { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .xai-think-dot { animation: none !important; opacity: 0.8 !important; } }
      `}</style>
      <span aria-hidden="true" style={{ display: "flex", gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="xai-think-dot"
            style={{
              width: dot, height: dot, borderRadius: "50%", background: color,
              animation: `xaiThinkDot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </span>
      <span style={{ fontSize: CHAT_VISUALS.thinkingLabel, color: "#c8d0e0" }}>{label}</span>
    </div>
  );
}
