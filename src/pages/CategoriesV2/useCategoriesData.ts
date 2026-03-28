import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import type { CategoryData } from "./categoryConfig";
import { getCategoryMeta } from "./categoryConfig";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;

function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

export interface FlaggedTransaction {
  id: string;
  merchant: string;
  amount: string;
  issue: string;
  category: string;
}

export interface SubcategorySuggestion {
  parentCategory: string;
  parentColor: string;
  subcategories: { name: string; amount: string; count: number; topMerchant: string }[];
}

export interface CategoriesPageData {
  categories: CategoryData[];
  totalSpent: number;
  totalIncome: number;
  totalBudget: number;
  categoryCount: number;
  uncategorizedCount: number;
  avgSpentPerCategory: number;
  loading: boolean;
  flaggedTransactions: FlaggedTransaction[];
  subcategorySuggestions: SubcategorySuggestion[];
  availablePeriods: string[];
}

export function useCategoriesData(selectedPeriod?: string): CategoriesPageData {
  const { transactions, isLoading } = useTransactions();

  return useMemo(() => {
    if (isLoading) {
      return {
        categories: [], totalSpent: 0, totalIncome: 0, totalBudget: 0, categoryCount: 0,
        uncategorizedCount: 0, avgSpentPerCategory: 0, loading: true,
        flaggedTransactions: [], subcategorySuggestions: [], availablePeriods: [],
      };
    }

    // Build available periods (YYYY-MM) from all transactions
    const periodSet = new Set<string>();
    transactions.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (!isNaN(d.getTime())) {
        periodSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    const availablePeriods = Array.from(periodSet).sort().reverse();

    // Filter to selected period when provided
    const periodFiltered = selectedPeriod
      ? transactions.filter(t => {
          const d = new Date(t.posted_at || "");
          if (isNaN(d.getTime())) return false;
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === selectedPeriod;
        })
      : transactions;

    // Income total
    const totalIncome = Math.round(
      periodFiltered.filter(t => isIncome(t)).reduce((s, t) => s + Math.abs(t.amount), 0)
    );

    const expenses = periodFiltered.filter(t => !isIncome(t));

    // MoM trend buckets — always from all transactions for context
    const monthBuckets: Record<string, Record<string, number>> = {};
    transactions.filter(t => !isIncome(t)).forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

    // Exclude Transfers from totalSpent — money movement, not real spending
    const totalSpent = categories
      .filter(c => c.name !== "Transfers")
      .reduce((s, c) => s + c.spent, 0);
    const totalBudget = categories.reduce((s, c) => s + c.budget, 0);

    const uncategorizedCount = periodFiltered.filter(
      t => !t.category || t.category === "Uncategorized"
    ).length;

    const flaggedTransactions: FlaggedTransaction[] = periodFiltered
      .filter(t => !t.category || t.category === "Uncategorized" || t.category === "Other")
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        merchant: t.merchant_name || "Unknown",
        amount: `$${Math.abs(t.amount).toFixed(2)}`,
        issue: !t.category || t.category === "Uncategorized"
          ? "Uncategorized \u2014 Tag needs your input"
          : "Categorized as Other \u2014 can you be more specific?",
        category: t.category || "Uncategorized",
      }));

    const subcategorySuggestions: SubcategorySuggestion[] = [];
    const SUBCATEGORY_PATTERNS: Record<string, { name: string; keywords: string[] }[]> = {
      "Transportation": [
        { name: "Gas & Fuel",  keywords: ["petro", "shell", "esso", "gas", "fuel", "husky", "irving"] },
        { name: "Parking",     keywords: ["parking", "park lot", "parkade", "impark", "indigo"] },
        { name: "Rideshare",   keywords: ["uber", "lyft", "taxi"] },
        { name: "Transit",     keywords: ["transit", "presto", "bus", "train"] },
      ],
      "Food & Dining": [
        { name: "Coffee",      keywords: ["starbucks", "tim horton", "second cup", "coffee", "cafe"] },
        { name: "Delivery",    keywords: ["doordash", "ubereats", "skip"] },
        { name: "Restaurants", keywords: ["restaurant", "grill", "pub", "sushi", "pizza", "burger"] },
      ],
      "Shopping": [
        { name: "Online",      keywords: ["amazon", "amzn", "ebay"] },
        { name: "Clothing",    keywords: ["zara", "h&m", "old navy", "gap", "winners"] },
        { name: "Electronics", keywords: ["best buy", "apple", "the source", "staples"] },
      ],
      "Subscriptions": [
        { name: "Streaming",       keywords: ["netflix", "disney", "crave", "spotify", "apple tv"] },
        { name: "Software",        keywords: ["github", "notion", "figma", "openai", "cursor", "netlify", "vercel"] },
        { name: "Cloud & Storage", keywords: ["icloud", "google", "dropbox", "microsoft"] },
      ],
    };

    for (const [catName, patterns] of Object.entries(SUBCATEGORY_PATTERNS)) {
      const catTxs = expenses.filter(t => t.category === catName);
      if (catTxs.length < 5) continue;
      const matched: { name: string; amount: number; count: number; merchants: Record<string, number> }[] = [];
      for (const pattern of patterns) {
        const hits = catTxs.filter(t =>
          pattern.keywords.some(k => (t.merchant_name || "").toLowerCase().includes(k))
        );
        if (hits.length < 2) continue;
        const total = hits.reduce((s, t) => s + Math.abs(t.amount), 0);
        const merchantCounts: Record<string, number> = {};
        hits.forEach(t => { const m = t.merchant_name || "Unknown"; merchantCounts[m] = (merchantCounts[m] || 0) + 1; });
        matched.push({ name: pattern.name, amount: total, count: hits.length, merchants: merchantCounts });
      }
      if (matched.length < 2) continue;
      const catMeta = categories.find(c => c.name === catName);
      subcategorySuggestions.push({
        parentCategory: catName,
        parentColor: catMeta?.color || "#94a3b8",
        subcategories: matched.map(m => ({
          name: m.name,
          amount: `$${Math.round(m.amount).toLocaleString()}`,
          count: m.count,
          topMerchant: Object.entries(m.merchants).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown",
        })),
      });
    }

    return {
      categories,
      totalSpent,
      totalIncome,
      totalBudget,
      categoryCount: categories.filter(c => c.name !== "Transfers").length,
      uncategorizedCount,
      avgSpentPerCategory: categories.length > 0 ? Math.round(totalSpent / categories.length) : 0,
      loading: false,
      flaggedTransactions,
      subcategorySuggestions,
      availablePeriods,
    };
  }, [transactions, isLoading, selectedPeriod]);
}
