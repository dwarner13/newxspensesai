import { useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useImportList } from "@/hooks/useImportList";
import type { RecapEpisode } from "./recapConfig";

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  // Primary signal: type field set by commit-import (most reliable)
  // Do NOT use amount sign — expenses are stored as negative values
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

export interface RecapData {
  episodes: RecapEpisode[];
  totalEpisodes: number;
  totalDuration: string;
  pendingRecaps: number;
  loading: boolean;
}

export function useRecapData(): RecapData {
  const { transactions, isLoading: txLoading } = useTransactions();
  const { imports, isLoading: impLoading } = useImportList();

  return useMemo(() => {
    if (txLoading || impLoading) {
      return { episodes: [], totalEpisodes: 0, totalDuration: "0h", pendingRecaps: 0, loading: true };
    }

    // Group transactions by month
    const buckets: Record<string, { inc: number; exp: number; count: number; cats: Record<string, number> }> = {};
    transactions.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { inc: 0, exp: 0, count: 0, cats: {} };
      const amt = Math.abs(t.amount);
      if (isIncome(t)) buckets[key].inc += amt;
      else { buckets[key].exp += amt; const c = t.category || "Other"; buckets[key].cats[c] = (buckets[key].cats[c] || 0) + amt; }
      buckets[key].count++;
    });

    const sorted = Object.entries(buckets).sort((a, b) => b[0].localeCompare(a[0]));

    const episodes: RecapEpisode[] = sorted.map(([key, b]) => {
      const [y, m] = key.split("-");
      const monthLabel = new Date(Number(y), Number(m)).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const net = b.inc - b.exp;
      const ratio = b.inc > 0 ? net / b.inc : -1;
      const grade = ratio >= 0.2 ? "A" : ratio >= 0 ? "B" : ratio >= -0.1 ? "C" : "D";
      const topCat = Object.entries(b.cats).sort((a, b) => b[1] - a[1])[0];
      const uncatCount = transactions.filter(t => {
        const d = new Date(t.posted_at || "");
        return d.getFullYear() === Number(y) && d.getMonth() === Number(m) && (!t.category || t.category === "Uncategorized");
      }).length;

      const highlights: RecapEpisode["agentHighlights"] = [
        { agent: "Byte", color: "#34d399", text: `Processed ${b.count} transactions from ${imports.length} statements` },
        { agent: "Tag", color: "#22d3ee", text: uncatCount > 0 ? `${b.count - uncatCount} categorized, ${uncatCount} need review` : `All ${b.count} transactions categorized` },
        { agent: "Crystal", color: "#a78bfa", text: topCat ? `Top spend: ${topCat[0]} at $${Math.round(topCat[1]).toLocaleString()}` : "No spending data" },
      ];

      return {
        id: key,
        title: `${monthLabel} Recap`,
        month: monthLabel,
        duration: `${Math.max(3, Math.round(b.count / 8))} min`,
        date: new Date(Number(y), Number(m), 1).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        income: Math.round(b.inc),
        expenses: Math.round(b.exp),
        net: Math.round(net),
        healthGrade: grade,
        agentHighlights: highlights,
        hasAudio: false,
      };
    });

    return {
      episodes,
      totalEpisodes: episodes.length,
      totalDuration: `${episodes.reduce((s, e) => s + parseInt(e.duration) || 0, 0)}m`,
      pendingRecaps: episodes.length > 0 ? 1 : 0,
      loading: false,
    };
  }, [transactions, imports, txLoading, impLoading]);
}
