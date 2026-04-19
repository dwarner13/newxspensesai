import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { THEME, type CategoryData } from "./categoryConfig";
import { AnimatedBar } from "./AnimatedBar";

interface CategoryCardProps {
  category: CategoryData;
  onClick: () => void;
  onSubcategoryClick?: (subName: string, merchantNames: string[]) => void;
}

export function CategoryCard({ category, onClick, onSubcategoryClick }: CategoryCardProps) {
  const navigate = useNavigate();
  const isNeedsReviewClean = category.name === 'Needs Review' && category.transactionCount === 0;
  const avg = category.budget; // budget now holds avg monthly spend
  const pct = avg > 0 ? Math.round((category.spent / avg) * 100) : 0;
  const isOver = pct > 100;
  const barColor = category.color;
  // In All Time view, pct can be 1000%+ (total spend vs avg monthly). Hide bar entirely above 200 to avoid noise.
  const showBar = avg > 0 && pct <= 200;
  const trendDir = category.trend > 0 ? "\u2191" : category.trend < 0 ? "\u2193" : "";
  const trendColor = category.trend > 10 ? THEME.red : category.trend < -5 ? THEME.green : THEME.textDim;

  if (isNeedsReviewClean) {
    return (
      <button
        onClick={onClick}
        style={{
          background: THEME.surface, border: `1px solid #22c55e33`, borderRadius: 14,
          padding: "16px 18px", textAlign: "left", cursor: "pointer", transition: "all 0.2s",
          width: "100%", height: "100%", minHeight: 190,
          display: "flex", flexDirection: "column",
          boxShadow: "0 2px 12px rgba(34,197,94,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#22c55e18", border: "1px solid #22c55e30", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text, marginBottom: 2 }}>Needs Review</div>
            <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>All clear</div>
          </div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e', marginBottom: 6 }}>$0</div>
        <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12 }}>Books are clean - ready for Tax Summary</div>
        <button
          onClick={e => { e.stopPropagation(); navigate('/dashboard/tax-summary'); }}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: '#22c55e18', border: '1px solid #22c55e30', color: '#22c55e',
            cursor: 'pointer',
          }}
        >
          View Tax Summary {'\u2192'}
        </button>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{
        background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
        padding: "16px 18px", textAlign: "left", cursor: "pointer", transition: "all 0.2s",
        width: "100%", height: "100%", minHeight: 190,
        display: "flex", flexDirection: "column",
        boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = category.color + "66"; e.currentTarget.style.boxShadow = `0 8px 32px ${category.color}15`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.1)"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: category.color + "18", border: `1px solid ${category.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {category.icon}
        </div>
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

      {/* Spend + average */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: category.color }}>
          ${category.spent.toLocaleString()}
        </span>
        {avg > 0 && (
          <span style={{ fontSize: 12, color: THEME.textDim }}>avg ${avg.toLocaleString()}/mo</span>
        )}
      </div>

      {/* Progress bar */}
      {showBar && <AnimatedBar pct={Math.min(pct, 150)} color={barColor} />}

      {/* Subcategory chips */}
      {category.subcategories && category.subcategories.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}
          onClick={e => e.stopPropagation()}
        >
          {category.subcategories.slice(0, 4).map(sub => (
            <button
              key={sub.name}
              onClick={e => {
                e.stopPropagation();
                onSubcategoryClick?.(sub.name, sub.merchantNames);
              }}
              style={{
                padding: "3px 9px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                background: `${category.color}14`, border: `1px solid ${category.color}28`,
                color: category.color, cursor: "pointer", transition: "all 0.15s",
                display: "inline-flex", alignItems: "center", gap: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${category.color}28`; e.currentTarget.style.borderColor = `${category.color}55`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${category.color}14`; e.currentTarget.style.borderColor = `${category.color}28`; }}
            >
              {sub.name}
              <span style={{ opacity: 0.7 }}>${sub.spent >= 1000 ? (sub.spent / 1000).toFixed(1) + "k" : sub.spent}</span>
            </button>
          ))}
        </div>
      )}

      {/* Spacer pushes Top merchant to bottom of card */}
      <div style={{ flex: 1 }} />

      {/* Top merchant */}
      <div style={{ marginTop: 10, fontSize: 10, color: THEME.textDim }}>
        Top: <span style={{ color: THEME.textMuted }}>{category.topMerchant}</span>
      </div>
    </button>
  );
}
