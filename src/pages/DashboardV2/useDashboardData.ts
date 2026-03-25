import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  // Primary signal: type field set by commit-import (most reliable)
  // Do NOT use amount sign — expenses are stored as negative values
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

export interface DashboardData {
  income: number;
  expenses: number;
  netFlow: number;
  deductions: number;
  statementCount: number;
  transactionCount: number;
  incomeTrend: number;
  expenseTrend: number;
  deductionNew: number;
  uncategorizedCount: number;
  pendingImports: number;
  topCategory: { name: string; amount: number; pct: number; trend: number };
  trendAlert: { category: string; months: number[]; direction: "up" | "down" } | null;
  recentAgentActions: { agent: string; action: string; detail: string; time: string }[];
  loading: boolean;
}

export function useDashboardData(): DashboardData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();

  return useMemo(() => {
    if (txLoading || impLoading) {
      return {
        income: 0, expenses: 0, netFlow: 0, deductions: 0,
        statementCount: 0, transactionCount: 0,
        incomeTrend: 0, expenseTrend: 0, deductionNew: 0,
        uncategorizedCount: 0, pendingImports: 0,
        topCategory: { name: "", amount: 0, pct: 0, trend: 0 },
        trendAlert: null, recentAgentActions: [], loading: true,
      };
    }

    const incTxs = transactions.filter(t => isIncome(t));
    const expTxs = transactions.filter(t => !isIncome(t));
    const income = incTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = expTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const netFlow = income - expenses;

    // Month buckets for trends
    const monthBuckets: Record<string, { inc: number; exp: number; catMap: Record<string, number> }> = {};
    transactions.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!monthBuckets[key]) monthBuckets[key] = { inc: 0, exp: 0, catMap: {} };
      const amt = Math.abs(t.amount);
      if (isIncome(t)) { monthBuckets[key].inc += amt; }
      else {
        monthBuckets[key].exp += amt;
        const cat = t.category || "Other";
        monthBuckets[key].catMap[cat] = (monthBuckets[key].catMap[cat] || 0) + amt;
      }
    });
    const sorted = Object.keys(monthBuckets).sort().reverse();
    const cur = sorted[0] ? monthBuckets[sorted[0]] : null;
    const prev = sorted[1] ? monthBuckets[sorted[1]] : null;

    const incomeTrend = prev && prev.inc > 0
      ? Math.round(((cur?.inc || 0) - prev.inc) / prev.inc * 100) : 0;
    const expenseTrend = prev && prev.exp > 0
      ? Math.round(((cur?.exp || 0) - prev.exp) / prev.exp * 100) : 0;

    // Category totals (expenses)
    const catMap: Record<string, number> = {};
    expTxs.forEach(t => {
      const cat = t.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
    });

    // Top category
    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const topEntry = catEntries[0];
    const topPct = topEntry && expenses > 0 ? Math.round((topEntry[1] / expenses) * 100) : 0;
    const topCatTrend = topEntry && prev?.catMap[topEntry[0]] && prev.catMap[topEntry[0]] > 0
      ? Math.round(((cur?.catMap[topEntry[0]] || 0) - prev.catMap[topEntry[0]]) / prev.catMap[topEntry[0]] * 100) : 0;

    // Deductions
    const deductLabels = ["Home Office", "Vehicle", "Supplies", "Business Meals"];
    const deductions = deductLabels.reduce((s, l) => s + (catMap[l] || 0), 0);

    // Uncategorized
    const uncategorizedCount = transactions.filter(t => !t.category || t.category === "Uncategorized").length;
    const pendingImports = imports.filter(i => i.status === "parsed" || i.status === "pending").length;

    // Trend alert: 3 months increasing
    let trendAlert: DashboardData["trendAlert"] = null;
    const m3 = sorted[2] ? monthBuckets[sorted[2]] : null;
    if (m3 && prev && cur) {
      for (const cat of Object.keys(catMap)) {
        const v3 = m3.catMap[cat] || 0;
        const v2 = prev.catMap[cat] || 0;
        const v1 = cur.catMap[cat] || 0;
        if (v3 > 0 && v2 > v3 && v1 > v2) {
          trendAlert = { category: cat, months: [Math.round(v3), Math.round(v2), Math.round(v1)], direction: "up" };
          break;
        }
      }
    }

    // Recent agent actions from imports
    const actions: DashboardData["recentAgentActions"] = [];
    const recentImports = [...imports].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3);
    for (const imp of recentImports) {
      const ago = getTimeAgo(imp.created_at);
      actions.push({ agent: "Byte", action: `Imported ${imp.statementLabel || imp.docName}`, detail: `Status: ${imp.status}`, time: ago });
    }
    if (uncategorizedCount === 0 && transactions.length > 0) {
      actions.push({ agent: "Tag", action: "All transactions categorized", detail: "High confidence across the board", time: "recently" });
    } else if (uncategorizedCount > 0) {
      actions.push({ agent: "Tag", action: `Flagged ${uncategorizedCount} for review`, detail: "Uncategorized or low confidence", time: "recently" });
    }
    if (trendAlert) {
      actions.push({ agent: "Crystal", action: `Trend detected: ${trendAlert.category}`, detail: `${trendAlert.months.length}-month acceleration`, time: "recently" });
    }
    if (deductions > 0) {
      actions.push({ agent: "Prime", action: `Found $${Math.round(deductions).toLocaleString()} in deductions`, detail: `Across ${deductLabels.filter(l => (catMap[l] || 0) > 0).length} categories`, time: "recently" });
    }

    return {
      income: Math.round(income),
      expenses: Math.round(expenses),
      netFlow: Math.round(netFlow),
      deductions: Math.round(deductions),
      statementCount: imports.length,
      transactionCount: transactions.length,
      incomeTrend,
      expenseTrend,
      deductionNew: 0,
      uncategorizedCount,
      pendingImports,
      topCategory: {
        name: topEntry?.[0] || "",
        amount: Math.round(topEntry?.[1] || 0),
        pct: topPct,
        trend: topCatTrend,
      },
      trendAlert,
      recentAgentActions: actions,
      loading: false,
    };
  }, [transactions, imports, txLoading, impLoading]);
}

function getTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function buildRecapText(d: DashboardData): string {
  const parts: string[] = [];
  if (d.statementCount > 0) {
    parts.push(`Byte imported ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""} (${d.transactionCount} transactions)`);
  }
  if (d.uncategorizedCount === 0 && d.transactionCount > 0) {
    parts.push("Tag auto-categorized all with high confidence");
  } else if (d.uncategorizedCount > 0) {
    parts.push(`Tag flagged ${d.uncategorizedCount} transaction${d.uncategorizedCount !== 1 ? "s" : ""} for review`);
  }
  if (d.trendAlert) {
    parts.push(`Crystal flagged a ${d.trendAlert.months.length}-month ${d.trendAlert.category.toLowerCase()} trend`);
  }
  if (d.deductions > 0) {
    parts.push(`Prime identified $${d.deductions.toLocaleString()} in potential tax deductions`);
  }
  return parts.length > 0 ? `Since your last visit: ${parts.join(", ")}.` : "Your AI team is standing by. Upload a statement to get started.";
}
