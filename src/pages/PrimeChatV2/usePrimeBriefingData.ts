import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

function isIncome(t: { amount: number; category?: string; merchant_name?: string; type?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  return t.amount < 0 || txType === "income" || cat === "income" || INCOME_PATTERNS.test(merchant);
}

const CATEGORY_COLORS: Record<string, string> = {
  "Groceries": "#34d399", "Food & Dining": "#f87171", "Transportation": "#60a5fa",
  "Shopping": "#a78bfa", "Subscriptions": "#818cf8", "Personal Care": "#ec4899",
  "Healthcare": "#f87171", "Bank Fees": "#94a3b8", "Income": "#34d399", "Other": "#4a5a75",
};

export interface PrimeBriefingData {
  statementCount: number;
  transactionCount: number;
  totalSpent: number;
  monthOverMonthPct: number;
  topCategoryChange: { category: string; pct: number };
  categoryBreakdown: { label: string; amount: number; color: string }[];
  uncategorizedCount: number;
  pendingImports: number;
  trendAlert: { category: string; months: number[]; direction: "up" | "down" } | null;
  deductions: { total: number; categories: { label: string; amount: number; color: string }[] };
  loading: boolean;
}

export function usePrimeBriefingData(): PrimeBriefingData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();

  return useMemo(() => {
    if (txLoading || impLoading) {
      return {
        statementCount: 0, transactionCount: 0, totalSpent: 0,
        monthOverMonthPct: 0, topCategoryChange: { category: "", pct: 0 },
        categoryBreakdown: [], uncategorizedCount: 0, pendingImports: 0,
        trendAlert: null, deductions: { total: 0, categories: [] }, loading: true,
      };
    }

    const expenses = transactions.filter(t => !isIncome(t));

    // Total spent
    const totalSpent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

    // Category breakdown (expenses only)
    const catMap: Record<string, number> = {};
    expenses.forEach(t => {
      const cat = t.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + Math.abs(t.amount);
    });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount]) => ({
        label, amount: Math.round(amount),
        color: CATEGORY_COLORS[label] || "#4a5a75",
      }));

    // Uncategorized
    const uncategorizedCount = transactions.filter(
      t => !t.category || t.category === "Uncategorized"
    ).length;

    // Pending imports
    const pendingImports = imports.filter(
      i => i.status === "parsed" || i.status === "pending"
    ).length;

    // Month-over-month: compare the two most recent months that have data
    // (not hardcoded to calendar "this month" which may be empty)
    const monthBuckets: Record<string, { spend: number; catMap: Record<string, number> }> = {};
    expenses.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!monthBuckets[key]) monthBuckets[key] = { spend: 0, catMap: {} };
      const amt = Math.abs(t.amount);
      const cat = t.category || "Other";
      monthBuckets[key].spend += amt;
      monthBuckets[key].catMap[cat] = (monthBuckets[key].catMap[cat] || 0) + amt;
    });
    const sortedMonths = Object.keys(monthBuckets).sort().reverse();
    const latestBucket = sortedMonths[0] ? monthBuckets[sortedMonths[0]] : null;
    const prevBucket = sortedMonths[1] ? monthBuckets[sortedMonths[1]] : null;
    const curMonthSpend = latestBucket?.spend || 0;
    const prevMonthSpend = prevBucket?.spend || 0;
    const curCatMap = latestBucket?.catMap || {};
    const prevCatMap = prevBucket?.catMap || {};

    const monthOverMonthPct = prevMonthSpend > 0
      ? Math.round(((curMonthSpend - prevMonthSpend) / prevMonthSpend) * 100)
      : 0;

    // Top category change
    let topCatChange = { category: "", pct: 0 };
    for (const cat of Object.keys(curCatMap)) {
      const prev = prevCatMap[cat] || 0;
      if (prev > 0) {
        const pct = Math.round(((curCatMap[cat] - prev) / prev) * 100);
        if (Math.abs(pct) > Math.abs(topCatChange.pct)) {
          topCatChange = { category: cat, pct };
        }
      }
    }

    // Trend alert: find a category increasing across the 3 most recent months
    let trendAlert: PrimeBriefingData["trendAlert"] = null;
    const m3Bucket = sortedMonths[2] ? monthBuckets[sortedMonths[2]] : null;
    if (m3Bucket && prevBucket && latestBucket) {
      for (const cat of Object.keys(catMap)) {
        const m3 = m3Bucket.catMap[cat] || 0;
        const m2 = prevCatMap[cat] || 0;
        const m1 = curCatMap[cat] || 0;
        if (m3 > 0 && m2 > m3 && m1 > m2) {
          trendAlert = {
            category: cat,
            months: [Math.round(m3), Math.round(m2), Math.round(m1)],
            direction: "up",
          };
          break;
        }
      }
    }

    // Tax deductions (only if these categories exist in data)
    const deductibleLabels = ["Home Office", "Vehicle", "Supplies", "Business Meals"];
    const deductionColors: Record<string, string> = {
      "Home Office": "#fb923c", Vehicle: "#60a5fa", Supplies: "#a78bfa", "Business Meals": "#34d399",
    };
    const dedCats = deductibleLabels
      .filter(l => catMap[l] && catMap[l] > 0)
      .map(l => ({ label: l, amount: Math.round(catMap[l]), color: deductionColors[l] || "#4a5a75" }));
    const dedTotal = dedCats.reduce((s, c) => s + c.amount, 0);

    return {
      statementCount: imports.length,
      transactionCount: transactions.length,
      totalSpent: Math.round(totalSpent),
      monthOverMonthPct,
      topCategoryChange: topCatChange,
      categoryBreakdown,
      uncategorizedCount,
      pendingImports,
      trendAlert,
      deductions: { total: dedTotal, categories: dedCats },
      loading: false,
    };
  }, [transactions, imports, txLoading, impLoading]);
}

export function buildSummaryText(d: PrimeBriefingData): string {
  const dir = d.monthOverMonthPct > 0 ? "up" : "down";
  const topCat = d.topCategoryChange;

  let text =
    `You've processed ${d.statementCount} statement${d.statementCount !== 1 ? "s" : ""} totaling $${d.totalSpent.toLocaleString()} ` +
    `across ${d.transactionCount} transactions this period.`;

  if (d.monthOverMonthPct !== 0) {
    text += ` Your spending is ${dir} ${Math.abs(d.monthOverMonthPct)}% month-over-month`;
    if (topCat.category) {
      text += ` \u2014 the biggest driver is a ${Math.abs(topCat.pct)}% ${topCat.pct > 0 ? "jump" : "drop"} in ${topCat.category}`;
    }
    text += ".";
  }

  if (d.deductions.total > 0) {
    text += ` I've identified $${d.deductions.total.toLocaleString()} in potential tax deductions you'll want to flag for your accountant.`;
  }

  return text;
}

export function buildThoughtsText(d: PrimeBriefingData): string {
  const parts: string[] = [];

  if (d.trendAlert) {
    const { category, months, direction } = d.trendAlert;
    const trend = months.map(m => `$${m.toLocaleString()}`).join(" \u2192 ");
    parts.push(
      `The ${category.toLowerCase()} ${direction === "up" ? "spike" : "drop"} has been ` +
      `${direction === "up" ? "climbing" : "declining"} ${months.length} months straight: ${trend}. ` +
      `Worth keeping an eye on.`
    );
  }

  if (d.uncategorizedCount > 0) {
    parts.push(
      `Tag found ${d.uncategorizedCount} transaction${d.uncategorizedCount !== 1 ? "s" : ""} that still need your call. ` +
      `Worth knocking those out \u2014 it'll sharpen everything else.`
    );
  }

  if (d.categoryBreakdown.length > 0) {
    const top = d.categoryBreakdown[0];
    parts.push(
      `Your top spending category is ${top.label} at $${top.amount.toLocaleString()}. ` +
      `That's ${d.totalSpent > 0 ? Math.round((top.amount / d.totalSpent) * 100) : 0}% of your total spend.`
    );
  }

  return parts.length > 0 ? parts.join(" ") : "Everything looks solid this period. No major flags to report.";
}
