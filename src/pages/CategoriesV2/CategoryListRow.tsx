import type { CategoryData } from "./categoryConfig";
import { categoryShare, trendLabel } from "@/lib/categoryList";

/**
 * K-a — compact, accessible Categories list row (replaces the 3-column card grid).
 * The row opens the category; subcategory chips stay available as separate buttons.
 */

const C = { text: "#e8ecf4", muted: "#c8d0e0", dim: "#9ba8bc", border: "#1e2d4a", track: "#1a2640", up: "#f87171", down: "#34d399" };
const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface CategoryListRowProps {
  category: CategoryData;
  totalSpent: number;
  isMobile: boolean;
  onOpen: () => void;
  onSubcategory?: (name: string, merchantNames: string[]) => void;
  /** Transfers and other non-spend rows show no share of expenses. */
  showShare?: boolean;
}

export function CategoryListRow({ category, totalSpent, isMobile, onOpen, onSubcategory, showShare = true }: CategoryListRowProps) {
  const share = showShare ? categoryShare(category.spent, totalSpent) : 0;
  const trend = trendLabel(category.trend);
  const subs = (category.subcategories || []).slice(0, 3);
  return (
    <li style={{ borderBottom: `1px solid ${C.border}`, listStyle: "none" }}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${category.name}: $${fmt(category.spent)}, ${category.transactionCount} transactions${showShare ? `, ${share}% of expenses` : ""}. Open details`}
        style={{
          width: "100%", minHeight: isMobile ? 64 : 60, padding: isMobile ? "10px 14px" : "10px 18px",
          display: "grid", alignItems: "center", gap: isMobile ? 10 : 16, textAlign: "left",
          gridTemplateColumns: isMobile ? "36px minmax(0, 1fr) auto" : "36px minmax(0, 1.6fr) minmax(0, 1fr) 110px 64px",
          background: "transparent", border: "none", cursor: "pointer", color: C.text, fontFamily: "inherit",
        }}
      >
        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 10, background: `${category.color}18`, border: `1px solid ${category.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {category.icon}
        </span>
        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category.name}</span>
          <span style={{ fontSize: 13, color: C.dim }}>
            {category.transactionCount} transaction{category.transactionCount === 1 ? "" : "s"}
            {isMobile && showShare && share > 0 ? ` · ${share}%` : ""}
          </span>
        </span>
        {!isMobile && (
          <span aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showShare && (
              <>
                <span style={{ flex: 1, height: 6, borderRadius: 3, background: C.track, overflow: "hidden" }}>
                  <span style={{ display: "block", width: `${share}%`, height: "100%", background: category.color, borderRadius: 3 }} />
                </span>
                <span style={{ width: 40, textAlign: "right", fontSize: 13, color: C.dim }}>{share}%</span>
              </>
            )}
          </span>
        )}
        <span style={{ fontSize: 16, fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>${fmt(category.spent)}</span>
        {!isMobile && (
          <span style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: trend.tone === "up" ? C.up : trend.tone === "down" ? C.down : C.dim }}>
            {trend.text}
          </span>
        )}
      </button>
      {subs.length > 0 && onSubcategory && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: isMobile ? "0 14px 10px 60px" : "0 18px 10px 70px" }}>
          {subs.map((sub) => (
            <button
              key={sub.name}
              type="button"
              onClick={() => onSubcategory(sub.name, sub.merchantNames)}
              style={{
                minHeight: 32, padding: "0 10px", borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: `${category.color}14`, border: `1px solid ${category.color}30`, color: C.muted, fontFamily: "inherit",
              }}
            >
              {sub.name} <span style={{ color: C.dim }}>${fmt(sub.spent)}</span>
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
