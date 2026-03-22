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
      style={{
        display: "flex",
        gap: 7,
        overflowX: "auto",
        scrollbarWidth: "none",
        paddingBottom: 2,
      }}
    >
      {chips.map((chip) => (
        <button
          key={chip.label}
          onClick={chip.action}
          style={{
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
