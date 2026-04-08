import { THEME } from "./agentConfig";

interface ChipItem {
  icon: string;
  label: string;
  action?: () => void;
}

interface QuickActionChipsProps {
  chips: ChipItem[];
}

export function QuickActionChips({ chips }: QuickActionChipsProps) {
  return (
    <div
      className="prime-chip-row"
      style={{
        display: "flex",
        flexWrap: "nowrap",
        justifyContent: "flex-start",
        gap: 8,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        paddingBottom: 4,
      }}
    >
      <style>{`
        .prime-chip-row::-webkit-scrollbar { display: none; }
        @media (max-width: 768px) {
          .prime-chip-row .prime-chip {
            font-size: 12px !important;
            padding: 8px 12px !important;
            border-radius: 20px !important;
          }
        }
      `}</style>
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={chip.action}
          className="prime-chip"
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "7px 14px",
            borderRadius: 20,
            whiteSpace: "nowrap",
            background: THEME.surfaceLight,
            border: `1px solid ${THEME.border}`,
            color: THEME.textMuted,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = THEME.accent;
            e.currentTarget.style.color = THEME.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = THEME.border;
            e.currentTarget.style.color = THEME.textMuted;
          }}
        >
          {chip.icon} {chip.label}
        </button>
      ))}
    </div>
  );
}
