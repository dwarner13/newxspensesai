import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { THEME, REPORT_TEMPLATES, type ReportTemplate } from "./reportsConfig";
import { useReportsData } from "./useReportsData";
import { TemplateCard } from "./TemplateCard";
import { ReportsList, ScheduledList } from "./ReportsList";
import { Reveal } from "../PrimeChatV2/Reveal";
import { AgentDot } from "../PrimeChatV2/AgentDot";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";

export default function ReportsPageV2() {
  const data = useReportsData();
  const navigate = useNavigate();
  const { transactions } = useTransactions();
  const { imports } = useImportList();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"templates" | "recent" | "scheduled">("templates");
  useEffect(() => setLoaded(true), []);

  const handleGenerate = useCallback((tmpl: ReportTemplate) => {
    if (tmpl.name === "Category Breakdown" || tmpl.name === "Statement Import Log") {
      // CSV export
      const isCategory = tmpl.name === "Category Breakdown";
      if (isCategory) {
        const catMap: Record<string, number> = {};
        transactions.forEach(t => { const c = t.category || "Other"; catMap[c] = (catMap[c] || 0) + Math.abs(t.amount); });
        const rows = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `"${cat}",${amt.toFixed(2)}`);
        const csv = ["Category,Amount", ...rows].join("\n");
        downloadCSV(csv, "category-breakdown.csv");
      } else {
        const rows = imports.map(i => `"${i.statementLabel}","${i.docName}","${i.status}","${i.created_at}"`);
        const csv = ["Statement,File,Status,Date", ...rows].join("\n");
        downloadCSV(csv, "import-log.csv");
      }
      toast.success(`${tmpl.name} exported`);
    } else if (tmpl.name === "Tax Deduction Report") {
      const deductLabels = ["Home Office", "Vehicle", "Supplies", "Business Meals"];
      const deductTxs = transactions.filter(t => deductLabels.includes(t.category || ""));
      const rows = deductTxs.map(t => `"${t.posted_at?.slice(0, 10)}","${t.merchant_name}","${t.category}",${Math.abs(t.amount).toFixed(2)}`);
      const csv = ["Date,Merchant,Category,Amount", ...rows].join("\n");
      downloadCSV(csv, "tax-deductions.csv");
      toast.success("Tax deductions exported");
    } else {
      toast(`${tmpl.name} — PDF generation coming soon`);
    }
  }, [transactions, imports]);

  if (data.loading) {
    return (
      <div style={{
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        color: THEME.text, minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 13, color: THEME.textMuted }}>Loading reports...</div>
      </div>
    );
  }

  const insightText = data.deductionTotal > 0
    ? `Your monthly summary is ready for export. Tax deduction report updated — $${data.deductionTotal.toLocaleString()} identified. I'd recommend sending the Accountant Package before month-end.`
    : `Your monthly summary is ready for export with ${data.totalGenerated} processed statement${data.totalGenerated !== 1 ? "s" : ""}. Generate a report to get started.`;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: THEME.text, padding: "28px 36px" }}>

        {/* Header */}
        <Reveal delay={0}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "white" }}>Reports</h1>
              <p style={{ fontSize: 13, color: THEME.textMuted, marginTop: 4 }}>AI-generated financial reports &bull; Powered by your AI team</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setTab("scheduled")} style={{
                padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer",
              }}>Schedule Report</button>
              <button onClick={() => setTab("templates")} style={{
                padding: "10px 20px", borderRadius: 12, fontSize: 12.5, fontWeight: 600,
                background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`,
                border: "none", color: "#0b1220", cursor: "pointer",
                boxShadow: `0 4px 16px ${THEME.accent}35`,
              }}>+ New Report</button>
            </div>
          </div>
        </Reveal>

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Reports Generated", value: `${data.totalGenerated}`, color: THEME.accent, icon: "\uD83D\uDCCA" },
            { label: "This Month", value: `${data.thisMonth}`, color: "#60a5fa", icon: "\uD83D\uDCC5" },
            { label: "Scheduled", value: `${data.scheduledCount}`, color: "#34d399", icon: "\u23F0" },
            { label: "Templates", value: `${data.templateCount}`, color: "#a78bfa", icon: "\uD83D\uDCC4" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={100 + i * 60} style={{ flex: 1 }}>
              <div style={{
                background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14,
                padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
                boxShadow: `0 4px 16px ${s.color}06`,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: THEME.textDim, fontWeight: 700, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: THEME.text }}>{s.value}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Prime insight — dynamic */}
        <Reveal delay={250}>
          <div style={{
            display: "flex", gap: 10, padding: "14px 18px", borderRadius: 14,
            background: `${THEME.accent}06`, border: `1px solid ${THEME.accent}15`,
            marginBottom: 24, alignItems: "center",
          }}>
            <AgentDot agent="Prime" size={28} />
            <div style={{ flex: 1, fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: THEME.accent }}>Prime:</span> {insightText}
            </div>
            <button onClick={() => handleGenerate(REPORT_TEMPLATES[0])} style={{
              padding: "7px 16px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: `${THEME.accent}12`, border: `1px solid ${THEME.accent}28`, color: THEME.accent,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>Generate Now {"\u2192"}</button>
          </div>
        </Reveal>

        {/* Tab bar */}
        <Reveal delay={300}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {([
              { id: "templates" as const, label: "\uD83D\uDCC4 Report Templates", count: REPORT_TEMPLATES.length },
              { id: "recent" as const, label: "\uD83D\uDDD3\uFE0F Recent Reports", count: data.recentReports.length },
              { id: "scheduled" as const, label: "\u23F0 Scheduled", count: data.scheduledCount },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "9px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                background: tab === t.id ? THEME.accentGlow : THEME.surface,
                border: `1px solid ${tab === t.id ? THEME.accent + "44" : THEME.border}`,
                color: tab === t.id ? THEME.accent : THEME.textMuted,
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {t.label}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 6,
                  background: tab === t.id ? `${THEME.accent}20` : THEME.bg,
                  color: tab === t.id ? THEME.accent : THEME.textDim,
                }}>{t.count}</span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* Tab content */}
        {tab === "templates" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {REPORT_TEMPLATES.map((t, i) => (
              <TemplateCard key={t.name} template={t} index={i} onGenerate={handleGenerate} />
            ))}
          </div>
        )}
        {tab === "recent" && <ReportsList reports={data.recentReports} />}
        {tab === "scheduled" && <ScheduledList reports={data.scheduledReports} />}
      </div>
    </>
  );
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
