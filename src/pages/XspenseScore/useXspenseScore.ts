import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";
import type { ScorePillar, ScoreHistoryPoint, ScoreAction } from "./scoreConfig";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  return t.amount < 0 || txType === "income" || cat === "income" || INCOME_PATTERNS.test(merchant);
}

function clamp(v: number) { return Math.max(0, Math.min(100, Math.round(v))); }

export interface XspenseScoreData {
  overallScore: number;
  previousScore: number;
  pillars: ScorePillar[];
  history: ScoreHistoryPoint[];
  topActions: ScoreAction[];
  loading: boolean;
}

export function useXspenseScore(): XspenseScoreData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();

  return useMemo(() => {
    if (txLoading || impLoading) {
      return { overallScore: 0, previousScore: 0, pillars: [], history: [], topActions: [], loading: true };
    }

    const incTxs = transactions.filter(t => isIncome(t));
    const expTxs = transactions.filter(t => !isIncome(t));
    const income = incTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = expTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const uncatCount = transactions.filter(t => !t.category || t.category === "Uncategorized").length;
    const catPct = transactions.length > 0 ? ((transactions.length - uncatCount) / transactions.length) * 100 : 0;

    // Category concentration
    const catMap: Record<string, number> = {};
    expTxs.forEach(t => { const c = t.category || "Other"; catMap[c] = (catMap[c] || 0) + Math.abs(t.amount); });
    const topCatPct = expenses > 0 ? (Math.max(...Object.values(catMap)) / expenses) * 100 : 0;

    // Month buckets
    const mb: Record<string, { inc: number; exp: number }> = {};
    transactions.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!mb[k]) mb[k] = { inc: 0, exp: 0 };
      if (isIncome(t)) mb[k].inc += Math.abs(t.amount); else mb[k].exp += Math.abs(t.amount);
    });
    const sorted = Object.keys(mb).sort().reverse();
    const curNet = sorted[0] ? mb[sorted[0]].inc - mb[sorted[0]].exp : 0;
    const prevNet = sorted[1] ? mb[sorted[1]].inc - mb[sorted[1]].exp : 0;
    const netTrend = curNet > 0 && prevNet > 0 ? "positive" : curNet > prevNet ? "improving" : "declining";

    // Deductions
    const deductLabels = ["Home Office", "Vehicle", "Supplies", "Business Meals"];
    const deductTotal = deductLabels.reduce((s, l) => s + (catMap[l] || 0), 0);
    const hasDeductions = deductTotal > 0;

    // Import recency
    const lastImport = imports.length > 0 ? new Date(imports[0].created_at) : null;
    const daysSinceImport = lastImport ? Math.floor((Date.now() - lastImport.getTime()) / 86400000) : 999;

    // === PILLAR SCORING ===

    // 1. Spending Behavior (25%)
    const incExpRatio = income > 0 ? clamp(income >= expenses ? 85 : (income / expenses) * 70) : 30;
    const trendScore = netTrend === "positive" ? 90 : netTrend === "improving" ? 65 : 35;
    const concentrationScore = clamp(topCatPct < 30 ? 95 : topCatPct < 50 ? 60 : 30);
    const spendingScore = clamp((incExpRatio + trendScore + concentrationScore) / 3);
    const spendingFactors = [
      { label: "Income vs expenses", value: income >= expenses ? "In balance" : `Over by ${Math.round(((expenses - income) / income) * 100)}%`, status: (income >= expenses ? "pass" : "fail") as "pass" | "warn" | "fail", tip: income < expenses ? "Expenses exceed income. Review top spending categories." : "" },
      { label: "Spending trend", value: netTrend, status: (netTrend === "positive" ? "pass" : netTrend === "improving" ? "warn" : "fail") as "pass" | "warn" | "fail", tip: "" },
      { label: "Category concentration", value: `${Math.round(topCatPct)}% in one category`, status: (topCatPct < 30 ? "pass" : topCatPct < 50 ? "warn" : "fail") as "pass" | "warn" | "fail", tip: topCatPct >= 50 ? "Over 50% in one category. Review for potential splits." : "" },
    ];

    // 2. Tax Readiness (20%)
    const dedScore = hasDeductions ? 80 : 40;
    const catAccScore = clamp(catPct);
    const taxScore = clamp((dedScore + catAccScore) / 2);
    const taxFactors = [
      { label: "Deductions identified", value: hasDeductions ? `$${Math.round(deductTotal).toLocaleString()}` : "None found", status: (hasDeductions ? "pass" : "warn") as "pass" | "warn" | "fail", tip: !hasDeductions ? "Upload business-related statements to identify deductions." : "" },
      { label: "Categorization accuracy", value: `${Math.round(catPct)}%`, status: (catPct >= 90 ? "pass" : catPct >= 70 ? "warn" : "fail") as "pass" | "warn" | "fail", tip: "" },
    ];

    // 3. Financial Organization (15%)
    const catOrgScore = clamp(catPct);
    const importRecency = clamp(daysSinceImport < 7 ? 95 : daysSinceImport < 30 ? 70 : 30);
    const flaggedScore = clamp(uncatCount === 0 ? 95 : Math.max(30, 95 - uncatCount * 10));
    const orgScore = clamp((catOrgScore + importRecency + flaggedScore) / 3);
    const orgFactors = [
      { label: "Transactions categorized", value: `${Math.round(catPct)}%`, status: (catPct >= 95 ? "pass" : catPct >= 80 ? "warn" : "fail") as "pass" | "warn" | "fail", tip: "" },
      { label: "Flagged items", value: uncatCount > 0 ? `${uncatCount} pending` : "All clear", status: (uncatCount === 0 ? "pass" : "warn") as "pass" | "warn" | "fail", tip: uncatCount > 0 ? `${uncatCount} items need review.` : "" },
      { label: "Statements up to date", value: daysSinceImport < 7 ? "Current" : `${daysSinceImport}d ago`, status: (daysSinceImport < 7 ? "pass" : daysSinceImport < 30 ? "warn" : "fail") as "pass" | "warn" | "fail", tip: "" },
    ];

    // 4. Cash Flow Health (20%)
    const cashFlowBase = curNet > 0 ? 80 : curNet > -500 ? 50 : 25;
    const cashFlowScore = clamp(cashFlowBase);
    const cashFactors = [
      { label: "Net cash flow", value: curNet >= 0 ? `+$${Math.round(curNet).toLocaleString()}` : `-$${Math.round(Math.abs(curNet)).toLocaleString()}`, status: (curNet > 0 ? "pass" : curNet > -500 ? "warn" : "fail") as "pass" | "warn" | "fail", tip: curNet < 0 ? "Cash flow is negative. Review expenses." : "" },
      { label: "Net flow trend", value: netTrend, status: (netTrend === "positive" ? "pass" : "warn") as "pass" | "warn" | "fail", tip: "" },
    ];

    // 5. Debt Management (15%) — no debts table yet, use neutral score
    const debtScore = 65;
    const debtFactors = [
      { label: "Debt tracking", value: "Not set up", status: "warn" as const, tip: "Add debts in Goals & Debt to track your progress." },
    ];

    // 6. App Engagement (5%)
    const uploadFreqScore = daysSinceImport < 7 ? 95 : daysSinceImport < 30 ? 70 : 30;
    const engScore = clamp(uploadFreqScore);
    const engFactors = [
      { label: "Upload frequency", value: daysSinceImport < 7 ? "Weekly" : daysSinceImport < 30 ? "Monthly" : "Rare", status: (daysSinceImport < 7 ? "pass" : daysSinceImport < 30 ? "warn" : "fail") as "pass" | "warn" | "fail", tip: "" },
      { label: "Statements processed", value: String(imports.length), status: (imports.length > 0 ? "pass" : "warn") as "pass" | "warn" | "fail", tip: "" },
    ];

    const pillars: ScorePillar[] = [
      { name: "Spending Behavior", score: spendingScore, icon: "\uD83D\uDCB8", weight: 0.25, factors: spendingFactors },
      { name: "Tax Readiness", score: taxScore, icon: "\uD83E\uDDFE", weight: 0.20, factors: taxFactors },
      { name: "Financial Organization", score: orgScore, icon: "\uD83D\uDDC2\uFE0F", weight: 0.15, factors: orgFactors },
      { name: "Cash Flow Health", score: cashFlowScore, icon: "\uD83D\uDCB0", weight: 0.20, factors: cashFactors },
      { name: "Debt Management", score: debtScore, icon: "\uD83D\uDCB3", weight: 0.15, factors: debtFactors },
      { name: "App Engagement", score: engScore, icon: "\uD83D\uDCF1", weight: 0.05, factors: engFactors },
    ];

    const overallScore = clamp(pillars.reduce((s, p) => s + p.score * p.weight, 0));
    const previousScore = Math.max(0, overallScore - 4); // Simple estimate

    // History (simulated from current score)
    const history: ScoreHistoryPoint[] = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      history.push({ month: monthNames[d.getMonth()], score: Math.max(20, overallScore - i * 3 + Math.round(Math.random() * 4)) });
    }
    history[history.length - 1].score = overallScore;

    // Top actions
    const topActions: ScoreAction[] = [];
    if (income < expenses) topActions.push({ action: "Reduce top spending category", impact: "+6 pts", agent: "Crystal", color: "#a78bfa" });
    if (uncatCount > 0) topActions.push({ action: `Resolve ${uncatCount} flagged transactions`, impact: "+3 pts", agent: "Tag", color: "#22d3ee" });
    if (!hasDeductions) topActions.push({ action: "Upload business statements for deductions", impact: "+5 pts", agent: "Ledger", color: "#34d399" });
    if (daysSinceImport > 7) topActions.push({ action: "Upload a recent statement", impact: "+2 pts", agent: "Byte", color: "#34d399" });
    if (topActions.length === 0) topActions.push({ action: "Keep up the great work!", impact: "Maintain", agent: "Prime", color: "#c8a64e" });

    return { overallScore, previousScore, pillars, history, topActions, loading: false };
  }, [transactions, imports, txLoading, impLoading]);
}
