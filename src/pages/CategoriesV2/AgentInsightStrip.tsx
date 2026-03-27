import { THEME } from "./categoryConfig";
import type { CategoriesPageData } from "./useCategoriesData";

interface AgentInsightStripProps {
  data: CategoriesPageData;
}

export function AgentInsightStrip({ data }: AgentInsightStripProps) {
  // Dynamic Tag insight
  const tagText = data.uncategorizedCount > 0
    ? `${data.uncategorizedCount} transaction${data.uncategorizedCount !== 1 ? "s" : ""} still need categorization. Review to improve accuracy.`
    : "All transactions categorized. Tag confidence is high across the board.";

  // Dynamic Crystal insight
  const top = data.categories[0];
  const crystalText = top
    ? `${top.name} is your highest spend at $${top.spent.toLocaleString()} (${data.totalSpent > 0 ? Math.round((top.spent / data.totalSpent) * 100) : 0}% of total).${top.trend > 10 ? ` Up ${top.trend}% from last month — worth watching.` : ""}`
    : "Upload statements to see spending insights.";

  const insights = [
    { agent: "Tag", color: THEME.cyan, text: tagText },
    { agent: "Crystal", color: THEME.purple, text: crystalText },
  ];

  return (
    <div style={{ display: "flex", gap: 10 }}>
      {insights.map(ins => (
        <div key={ins.agent} style={{
          flex: 1, display: "flex", gap: 10, padding: "12px 14px", borderRadius: 12,
          background: `${ins.color}06`, borderLeft: `3px solid ${ins.color}44`,
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            background: `${ins.color}20`, border: `1px solid ${ins.color}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: ins.color,
          }}>{ins.agent[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              display: "inline-block", fontSize: 9, textTransform: "uppercase", fontWeight: 700,
              letterSpacing: 1, padding: "1px 6px", borderRadius: 4, marginBottom: 4,
              background: `${ins.color}15`, color: ins.color,
            }}>{ins.agent}</span>
            <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.5 }}>{ins.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
