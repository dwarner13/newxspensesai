import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import type { CategoryData } from "./categoryConfig";
import { getCategoryMeta } from "./categoryConfig";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  // Primary signal: type field set by commit-import (most reliable)
  // Do NOT use amount sign — expenses are stored as negative values
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

export interface CategoriesPageData {
  categories: CategoryData[];
  totalSpent: number;
  totalBudget: number;
  categoryCount: number;
  uncategorizedCount: number;
  avgSpentPerCategory: number;
  loading: boolean;
}

export function useCategoriesData(): CategoriesPageData {
  const { transactions, isLoading } = useTransactions();

  return useMemo(() => {
    if (isLoading) {
      return {
        categories: [], totalSpent: 0, totalBudget: 0, categoryCount: 0,
        uncategorizedCount: 0, avgSpentPerCategory: 0, loading: true,
      };
    }

    const expenses = transactions.filter(t => !isIncome(t));

    // Group by month buckets for MoM calculation
    const monthBuckets: Record<string, Record<string, number>> = {};
    expenses.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const cat = t.category || "Other";
      if (!monthBuckets[key]) monthBuckets[key] = {};
      monthBuckets[key][cat] = (monthBuckets[key][cat] || 0) + Math.abs(t.amount);
    });
    const sortedMonths = Object.keys(monthBuckets).sort().reverse();
    const latestMonth = sortedMonths[0] ? monthBuckets[sortedMonths[0]] : {};
    const prevMonth = sortedMonths[1] ? monthBuckets[sortedMonths[1]] : {};

    // Aggregate per category
    const catMap: Record<string, { spent: number; count: number; merchants: Record<string, number> }> = {};
    expenses.forEach(t => {
      const cat = t.category || "Other";
      if (!catMap[cat]) catMap[cat] = { spent: 0, count: 0, merchants: {} };
      const amt = Math.abs(t.amount);
      catMap[cat].spent += amt;
      catMap[cat].count++;
      const m = t.merchant_name || "Unknown";
      catMap[cat].merchants[m] = (catMap[cat].merchants[m] || 0) + amt;
    });

    const categories: CategoryData[] = Object.entries(catMap)
      .sort((a, b) => b[1].spent - a[1].spent)
      .map(([name, data]) => {
        const meta = getCategoryMeta(name);
        const cur = latestMonth[name] || 0;
        const prev = prevMonth[name] || 0;
        const trend = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
        const topMerchant = Object.entries(data.merchants).sort((a, b) => b[1] - a[1])[0];
        return {
          name,
          spent: Math.round(data.spent),
          budget: meta.budget,
          color: meta.color,
          icon: meta.icon,
          trend,
          topMerchant: topMerchant ? topMerchant[0] : "Unknown",
          transactionCount: data.count,
        };
      });

    const totalSpent = categories.reduce((s, c) => s + c.spent, 0);
    const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
    const uncategorizedCount = transactions.filter(
      t => !t.category || t.category === "Uncategorized"
    ).length;

    return {
      categories,
      totalSpent,
      totalBudget,
      categoryCount: categories.length,
      uncategorizedCount,
      avgSpentPerCategory: categories.length > 0 ? Math.round(totalSpent / categories.length) : 0,
      loading: false,
    };
  }, [transactions, isLoading]);
}
