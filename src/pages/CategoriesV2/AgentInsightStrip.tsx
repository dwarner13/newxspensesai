import { THEME } from "./categoryConfig";
import type { CategoriesPageData } from "./useCategoriesData";

interface AgentInsightStripProps {
  data: CategoriesPageData;
}

export function AgentInsightStrip({ data }: AgentInsightStripProps) {
  // Dynamic Tag insight
  const tagText = data.uncategorizedCount > 0
    ? `${data.uncategorizedCount} transaction${data.uncategorizedCount !== 1 ? "s" : ""} still need categorization. Review to improve accuracy.`
    : data.categories.length > 0 ? "All transactions have a category." : "No transactions to categorize yet.";

  // Dynamic Crystal insight
  // UX-FST2-6: the server's insight wording only (no browser shares or month-over-month claims).
  const crystalText = [data.topCategoryText, data.spendingClaimText].filter(Boolean).join(" ")
    || (data.summary ? "No spending to summarise for this period." : "Spending insights appear once your figures are available.");

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
