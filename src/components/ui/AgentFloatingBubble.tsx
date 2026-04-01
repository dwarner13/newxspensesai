import { BUBBLE_SIZE, BUBBLE_BOTTOM, BUBBLE_RIGHT, BUBBLE_Z } from "@/lib/agentBubble";

interface AgentFloatingBubbleProps {
  /** Single letter or emoji shown inside the bubble */
  letter: string;
  /** Primary agent color — used for gradient and glow */
  color: string;
  /** Secondary gradient color — defaults to darker shade of color */
  colorTo?: string;
  onClick: () => void;
  label?: string;
  /** Red badge count — shown when agent needs attention (e.g. uncategorized transactions) */
  badgeCount?: number;
  /** Pulses the bubble to draw attention */
  pulse?: boolean;
}

export function AgentFloatingBubble({
  letter, color, colorTo, onClick, label, badgeCount = 0, pulse = false
}: AgentFloatingBubbleProps) {
  return (
    <>
      <style>{`
        @keyframes agentPulse {
          0% { box-shadow: 0 0 0 0 ${color}66; }
          70% { box-shadow: 0 0 0 12px ${color}00; }
          100% { box-shadow: 0 0 0 0 ${color}00; }
        }
      `}</style>
      <button
        onClick={onClick}
        aria-label={label || "Open Copilot"}
        title={label || "Open Copilot"}
        className="fixed rounded-full shadow-lg transition-transform active:scale-95 hover:scale-105"
        style={{
          bottom: BUBBLE_BOTTOM,
          right: BUBBLE_RIGHT,
          width: BUBBLE_SIZE,
          height: BUBBLE_SIZE,
          background: `linear-gradient(135deg, ${color}, ${colorTo || color + "cc"})`,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 800,
          color: "#fff",
          boxShadow: `0 4px 20px ${color}44`,
          zIndex: BUBBLE_Z,
          fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
          animation: pulse ? "agentPulse 2s ease-in-out infinite" : "none",
          position: "fixed",
        }}
      >
        {letter}
        {badgeCount > 0 && (
          <div style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: "#ef4444",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
            border: "2px solid #0b1220",
            pointerEvents: "none",
            fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
          }}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </div>
        )}
      </button>
    </>
  );
}
