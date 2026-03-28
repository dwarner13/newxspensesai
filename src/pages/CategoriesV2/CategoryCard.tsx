import { THEME, type CategoryData } from "./categoryConfig";
import { AnimatedBar } from "./AnimatedBar";

interface CategoryCardProps {
  category: CategoryData;
  onClick: () => void;
}

export function CategoryCard({ category, onClick }: CategoryCardProps) {
  const pct = category.budget > 0 ? Math.round((category.spent / category.budget) * 100) : 0;
  const isOver = pct > 100;
  const trendDir = category.trend > 0 ? "\u2191" : category.trend < 0 ? "\u2193" : "";
  const trendColor = category.trend > 10 ? THEME.red : category.trend < -5 ? THEME.green : THEME.textDim;

  return (
    <button
      onClick={onClick}
      style={{
        background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
        padding: "16px 18px", textAlign: "left", cursor: "pointer", transition: "all 0.2s",
        width: "100%", boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = category.color + "66"; e.currentTarget.style.boxShadow = `0 8px 32px ${category.color}15`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)"; }}
    >
      {/* Top row: icon + name + trend */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: category.color + "18", border: `1px solid ${category.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>{category.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text, marginBottom: 2 }}>{category.name}</div>
          <div style={{ fontSize: 10, color: THEME.textDim }}>{category.transactionCount} transactions</div>
        </div>
        {category.trend !== 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
            {trendDir}{Math.abs(category.trend)}%
          </span>
        )}
      </div>

      {/* Spend + budget */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: isOver ? THEME.red : THEME.text }}>
          ${category.spent.toLocaleString()}
        </span>
        {category.budget > 0 && (
          <span style={{ fontSize: 12, color: THEME.textDim }}>
            / ${category.budget.toLocaleString()}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {category.budget > 0 && (
        <AnimatedBar pct={pct} color={isOver ? THEME.red : pct >= 80 ? THEME.amber : category.color} />
      )}

      {/* Top merchant */}
      <div style={{ marginTop: 10, fontSize: 10, color: THEME.textDim }}>
        Top: <span style={{ color: THEME.textMuted }}>{category.topMerchant}</span>
      </div>
    </button>
  );
}
