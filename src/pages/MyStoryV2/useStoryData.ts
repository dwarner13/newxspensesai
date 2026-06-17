import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  // Primary signal: type field set by commit-import (most reliable)
  // Do NOT use amount sign - expenses are stored as negative values
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

const NON_SPEND_CATEGORIES = new Set([
  "transfers", "transfer",
  "loan payments", "loan payment",
  "credit card payments", "credit card payment",
  "investments", "investment",
  "debt payments", "debt payment",
  "income", "business income",
]);

function isNonSpend(t: { category?: string }): boolean {
  return NON_SPEND_CATEGORIES.has((t.category || "").toLowerCase().trim());
}

const CAT_COLORS: Record<string, string> = {
  "Groceries": "#34d399", "Food & Dining": "#f87171", "Transportation": "#22d3ee",
  "Shopping": "#fb923c", "Subscriptions": "#60a5fa", "Personal Care": "#f472b6",
  "Healthcare": "#f87171", "Bank Fees": "#94a3b8", "Income": "#34d399", "Other": "#4a5a75",
};

export interface StoryData {
  income: number;
  expenses: number;
  netPosition: number;
  statementCount: number;
  transactionCount: number;
  deductions: number;
  incomeTrendPct: number;
  expenseTrendPct: number;
  healthGrade: "A" | "B" | "C" | "D" | "F";
  periodStart: string;
  periodEnd: string;
  periodMonths: number;
  categoryBreakdown: { cat: string; amount: number; pct: number; color: string }[];
  trends: { label: string; trend: "up" | "down" | "stable"; months: string; pct: string; color: string }[];
  deductionBreakdown: { label: string; amount: number; color: string }[];
  categoryHealth: { cat: string; status: string; confidence: number; note: string; statusColor: string }[];
  loading: boolean;
}

export function useStoryData(): StoryData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();

  return useMemo(() => {
    if (txLoading || impLoading) {
      return {
        income: 0, expenses: 0, netPosition: 0, statementCount: 0,
        transactionCount: 0, deductions: 0, incomeTrendPct: 0, expenseTrendPct: 0,
        healthGrade: "C" as const, periodStart: "", periodEnd: "", periodMonths: 0,
        categoryBreakdown: [], trends: [], deductionBreakdown: [], categoryHealth: [],
        loading: true,
      };
    }

    const incTxs = transactions.filter(t => isIncome(t));
    const expTxs = transactions.filter(t => !isIncome(t) && !isNonSpend(t));
    const income = incTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = expTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
    const netPosition = income - expenses;

    // Health grade
    const ratio = income > 0 ? netPosition / income : -1;
    const healthGrade: StoryData["healthGrade"] =
      ratio >= 0.2 ? "A" : ratio >= 0 ? "B" : ratio >= -0.1 ? "C" : ratio >= -0.3 ? "D" : "F";

    // Period
    const dates = transactions.map(t => t.posted_at || "").filter(Boolean).sort();
    const fmtMonth = (iso: string) => {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };
    const periodStart = dates[0] ? fmtMonth(dates[0]) : "";
    const periodEnd = dates[dates.length - 1] ? fmtMonth(dates[dates.length - 1]) : "";
    const periodMonths = dates.length >= 2
      ? Math.max(1, Math.ceil((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (30 * 86400000)))
      : 1;

    // Category breakdown
    const catMap: Record<string, number> = {};
    expTxs.forEach(t => { const c = t.category || "Other"; catMap[c] = (catMap[c] || 0) + Math.abs(t.amount); });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amount]) => ({
        cat, amount: Math.round(amount),
        pct: expenses > 0 ? Math.round((amount / expenses) * 100) : 0,
        color: CAT_COLORS[cat] || "#4a5a75",
      }));

    // Month buckets for trends
    const monthBuckets: Record<string, { inc: number; exp: number; catMap: Record<string, number> }> = {};
    transactions.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!monthBuckets[key]) monthBuckets[key] = { inc: 0, exp: 0, catMap: {} };
      const amt = Math.abs(t.amount);
      if (isIncome(t)) monthBuckets[key].inc += amt;
      else { monthBuckets[key].exp += amt; const c = t.category || "Other"; monthBuckets[key].catMap[c] = (monthBuckets[key].catMap[c] || 0) + amt; }
    });
    const sorted = Object.keys(monthBuckets).sort().reverse();
    const cur = sorted[0] ? monthBuckets[sorted[0]] : null;
    const prev = sorted[1] ? monthBuckets[sorted[1]] : null;
    const m3 = sorted[2] ? monthBuckets[sorted[2]] : null;

    const incomeTrendPct = prev && prev.inc > 0 ? Math.round(((cur?.inc || 0) - prev.inc) / prev.inc * 100) : 0;
    const expenseTrendPct = prev && prev.exp > 0 ? Math.round(((cur?.exp || 0) - prev.exp) / prev.exp * 100) : 0;

    // Trends per category (last 3 months)
    const trends = categoryBreakdown.slice(0, 5).map(cb => {
      const v1 = cur?.catMap[cb.cat] || 0;
      const v2 = prev?.catMap[cb.cat] || 0;
      const v3 = m3?.catMap[cb.cat] || 0;
      const pctChange = v2 > 0 ? Math.round(((v1 - v2) / v2) * 100) : 0;
      const trend: "up" | "down" | "stable" = pctChange > 5 ? "up" : pctChange < -5 ? "down" : "stable";
      const months = [v3, v2, v1].map(v => `$${Math.round(v).toLocaleString()}`).join(" \u2192 ");
      return {
        label: cb.cat, trend, months,
        pct: `${pctChange >= 0 ? "+" : ""}${pctChange}%`,
        color: cb.color,
      };
    });

    // Deductions
    const deductLabels = ["Transportation", "Subscriptions", "Bank Fees", "Food & Dining"];
    const deductColors: Record<string, string> = { "Transportation": "#22d3ee", "Subscriptions": "#60a5fa", "Bank Fees": "#94a3b8", "Food & Dining": "#f87171" };
    const deductionBreakdown = deductLabels
      .filter(l => catMap[l] && catMap[l] > 0)
      .map(l => ({ label: l, amount: Math.round(catMap[l]), color: deductColors[l] || "#4a5a75" }));
    const deductions = deductionBreakdown.reduce((s, d) => s + d.amount, 0);

    // Category health (based on uncategorized ratio)
    const categoryHealth = categoryBreakdown.slice(0, 6).map(cb => {
      const catTxs = expTxs.filter(t => (t.category || "Other") === cb.cat);
      const uncatCount = catTxs.filter(t => !t.category || t.category === "Uncategorized").length;
      const conf = catTxs.length > 0 ? Math.round(((catTxs.length - uncatCount) / catTxs.length) * 100) : 100;
      return {
        cat: cb.cat,
        status: conf >= 95 ? "Clean" : conf >= 80 ? "Review" : "Needs Work",
        confidence: conf,
        note: conf >= 95 ? "High confidence" : `${uncatCount} items may need review`,
        statusColor: conf >= 95 ? "#34d399" : conf >= 80 ? "#fb923c" : "#f87171",
      };
    });

    return {
      income: Math.round(income), expenses: Math.round(expenses),
      netPosition: Math.round(netPosition),
      statementCount: imports.length, transactionCount: transactions.length,
      deductions, incomeTrendPct, expenseTrendPct, healthGrade,
      periodStart, periodEnd, periodMonths,
      categoryBreakdown, trends, deductionBreakdown, categoryHealth,
      loading: false,
    };
  }, [transactions, imports, txLoading, impLoading]);
}

export function buildCrystalIntro(d: StoryData): string {
  return `Here's your financial story for the past ${d.periodMonths} month${d.periodMonths !== 1 ? "s" : ""}. I've analyzed ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""} and ${d.transactionCount} transaction${d.transactionCount !== 1 ? "s" : ""} to build this picture. Your spending patterns show some clear trends \u2014 let me walk you through what I found.`;
}


