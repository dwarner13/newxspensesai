import { useMemo } from "react";
import { useImportList } from "@/hooks/useImportList";
import { useTransactions } from "@/hooks/useTransactions";
import type { RecentReport, ScheduledReport } from "./reportsConfig";

export interface ReportsData {
  totalGenerated: number;
  thisMonth: number;
  scheduledCount: number;
  templateCount: number;
  recentReports: RecentReport[];
  scheduledReports: ScheduledReport[];
  deductionTotal: number;
  loading: boolean;
}

export function useReportsData(): ReportsData {
  const { imports, isLoading: impLoading } = useImportList();
  const { transactions, isLoading: txLoading } = useTransactions();

  return useMemo(() => {
    if (impLoading || txLoading) {
      return {
        totalGenerated: 0, thisMonth: 0, scheduledCount: 0, templateCount: 6,
        recentReports: [], scheduledReports: [], deductionTotal: 0, loading: true,
      };
    }

    // Derive "reports" from imports (each processed import = a generated report)
    const totalGenerated = imports.length;
    const now = new Date();
    const thisMonthImports = imports.filter(i => {
      const d = new Date(i.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonth = thisMonthImports.length;

    // Build recent reports from actual imports
    const recentReports: RecentReport[] = [...imports]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5)
      .map(imp => {
        const d = new Date(imp.created_at);
        const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return {
          name: `Import — ${imp.statementLabel || imp.docName}`,
          agent: "Byte",
          color: "#34d399",
          date: dateStr,
          format: "CSV",
          size: "",
        };
      });

    // Deductions for Prime insight
    const deductLabels = ["Home Office", "Vehicle", "Supplies", "Business Meals"];
    const deductionTotal = transactions
      .filter(t => deductLabels.includes(t.category || ""))
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Scheduled reports are a future feature
    const scheduledReports: ScheduledReport[] = [
      { name: "Monthly Summary", agent: "Prime", color: "#c8a64e", freq: "1st of month", next: "Apr 1", active: true },
      { name: "Tax Deduction Update", agent: "Prime", color: "#c8a64e", freq: "Every 2 weeks", next: "Mar 29", active: true },
      { name: "Weekly Category Check", agent: "Tag", color: "#22d3ee", freq: "Every Monday", next: "Mar 24", active: false },
    ];

    return {
      totalGenerated,
      thisMonth,
      scheduledCount: scheduledReports.filter(r => r.active).length,
      templateCount: 6,
      recentReports,
      scheduledReports,
      deductionTotal: Math.round(deductionTotal),
      loading: false,
    };
  }, [imports, transactions, impLoading, txLoading]);
}
