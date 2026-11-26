import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions } from "@/hooks/useTransactions";
import type { GoalData, DebtData, LessonData } from "./goalsConfig";

export interface GoalsPageData {
  goals: GoalData[];
  debts: DebtData[];
  lessons: LessonData[];
  totalDebt: number;
  totalGoalTarget: number;
  totalGoalCurrent: number;
  monthlySavings: number;
  debtFreeMonths: number;
  loading: boolean;
  /** The goals or debts could not be loaded (shown as an error, never as example data). */
  loadError: boolean;
  /** Goal / debt storage is not set up in the database (missing table or column). */
  unavailable: boolean;
}

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  // Primary signal: type field set by commit-import (most reliable)
  // Do NOT use amount sign - expenses are stored as negative values
  return txType === "income" || cat === "income" || cat === "business income" || INCOME_PATTERNS.test(merchant);
}

// HONEST-1: no example goals or debts. They were shown as the customer's own when the
// tables were empty or failed to load ($23,000 of goals, $14,950 of debt on an empty
// account). Empty data now stays empty; a load failure is reported, not papered over.

const LESSONS: LessonData[] = [
  { title: "The 50/30/20 Rule", desc: "How to split your income for maximum financial health", duration: "3 min", icon: "\uD83D\uDCCA", color: "#c8a64e", agent: "Prime" },
  { title: "Debt Snowball vs Avalanche", desc: "Which payoff strategy is right for you?", duration: "5 min", icon: "\u2744\uFE0F", color: "#60a5fa", agent: "Goalie" },
  { title: "Tax Deductions for Self-Employed", desc: "CRA-approved deductions you might be missing", duration: "4 min", icon: "\uD83E\uDDFE", color: "#34d399", agent: "Prime" },
  { title: "Building an Emergency Fund", desc: "Why 3-6 months of expenses is the magic number", duration: "3 min", icon: "\uD83D\uDEE1\uFE0F", color: "#a78bfa", agent: "Goalie" },
];

// Missing table / column (42P01, 42703, PGRST204, PGRST205): the feature has no storage yet.
// On 2026-11-25 the shared database had a goals table without the queried columns and no
// debts table, so every customer was shown the example data.
function isSchemaMissing(e: { code?: string } | null): boolean {
  return !!e && ["42P01", "42703", "PGRST204", "PGRST205"].includes(String(e.code || ""));
}

export function useGoalsData(): GoalsPageData {
  const { userId } = useAuth();
  const { transactions, isLoading: txLoading } = useTransactions();
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [debts, setDebts] = useState<DebtData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const fetchGoalsDebts = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const supabase = getSupabase();
    if (!supabase) { setGoals([]); setDebts([]); setLoadError(true); setLoading(false); return; }
    setLoadError(false);
    setUnavailable(false);

    try {
      // Try fetching goals
      const { data: goalsData, error: goalsErr } = await supabase
        .from("goals")
        .select("name, target, current, icon, color, deadline, priority")
        .eq("user_id", userId)
        .order("priority", { ascending: true });

      if (goalsErr) {
        setGoals([]);
        if (isSchemaMissing(goalsErr)) setUnavailable(true); else setLoadError(true);
      } else if (goalsData && goalsData.length > 0) {
        setGoals(goalsData.map((g: Record<string, unknown>) => ({
          name: String(g.name || ""),
          target: Number(g.target || 0),
          current: Number(g.current || 0),
          icon: String(g.icon || "\uD83C\uDFAF"),
          color: String(g.color || "#60a5fa"),
          deadline: g.deadline ? new Date(String(g.deadline)).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "",
          priority: (String(g.priority || "medium") as GoalData["priority"]),
          tip: "",
        })));
      } else {
        setGoals([]);
      }

      // Try fetching debts
      const { data: debtsData, error: debtsErr } = await supabase
        .from("debts")
        .select("name, balance, rate, min_payment, color, type")
        .eq("user_id", userId)
        .order("rate", { ascending: false });

      if (debtsErr) {
        setDebts([]);
        if (isSchemaMissing(debtsErr)) setUnavailable(true); else setLoadError(true);
      } else if (debtsData && debtsData.length > 0) {
        setDebts(debtsData.map((d: Record<string, unknown>) => ({
          name: String(d.name || ""),
          balance: Number(d.balance || 0),
          rate: Number(d.rate || 0),
          minPayment: Number(d.min_payment || 0),
          color: String(d.color || "#f87171"),
          type: String(d.type || "Credit Card"),
        })));
      } else {
        setDebts([]);
      }
    } catch {
      setGoals([]);
      setDebts([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchGoalsDebts(); }, [fetchGoalsDebts]);

  // Derive computed values
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalGoalCurrent = goals.reduce((s, g) => s + g.current, 0);

  // Monthly savings from transactions (income - expenses for most recent month)
  let monthlySavings = 0;
  if (!txLoading && transactions.length > 0) {
    const monthBuckets: Record<string, { inc: number; exp: number }> = {};
    transactions.forEach(t => {
      const d = new Date(t.posted_at || "");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!monthBuckets[key]) monthBuckets[key] = { inc: 0, exp: 0 };
      if (isIncome(t)) monthBuckets[key].inc += Math.abs(t.amount);
      else monthBuckets[key].exp += Math.abs(t.amount);
    });
    const sorted = Object.keys(monthBuckets).sort().reverse();
    const latest = sorted[0] ? monthBuckets[sorted[0]] : null;
    if (latest) monthlySavings = Math.max(0, Math.round(latest.inc - latest.exp));
  }

  const debtFreeMonths = monthlySavings > 0 ? Math.ceil(totalDebt / monthlySavings) : totalDebt > 0 ? 999 : 0;

  return {
    goals, debts, lessons: LESSONS,
    totalDebt, totalGoalTarget, totalGoalCurrent,
    monthlySavings, debtFreeMonths,
    loading: loading || txLoading,
    loadError,
    unavailable,
  };
}

export function buildGoalieIntro(d: GoalsPageData): string {
  if (d.goals.length === 0 && d.debts.length === 0) {
    return "Welcome to Goals & Debt! Set your first goal or add a debt to start tracking. I'll help you build a plan.";
  }
  const goalPct = d.totalGoalTarget > 0 ? Math.round((d.totalGoalCurrent / d.totalGoalTarget) * 100) : 0;
  return `You've got ${d.goals.length} active goal${d.goals.length !== 1 ? "s" : ""} and $${d.totalDebt.toLocaleString()} in total debt. You're ${goalPct}% toward your targets. Let me show you where to focus \u2014 I've ranked everything by impact and urgency.`;
}
