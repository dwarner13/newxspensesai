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
}

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncome(t: { amount: number; category?: string; merchant_name?: string }): boolean {
  const cat = (t.category || "").toLowerCase();
  const merchant = (t.merchant_name || "").toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || "").toLowerCase();
  return t.amount < 0 || txType === "income" || cat === "income" || INCOME_PATTERNS.test(merchant);
}

// Example data shown when tables don't exist or are empty (onboarding)
const EXAMPLE_GOALS: GoalData[] = [
  { name: "Emergency Fund", target: 5000, current: 2100, icon: "\uD83D\uDEE1\uFE0F", color: "#60a5fa", deadline: "Aug 2026", priority: "high", tip: "At your current savings rate, you'll hit this by July. Consider redirecting $200/mo from dining." },
  { name: "New Car Down Payment", target: 15000, current: 3800, icon: "\uD83D\uDE97", color: "#a78bfa", deadline: "Dec 2026", priority: "medium", tip: "25% there. Your vehicle deductions could be redirected here after tax season." },
  { name: "Vacation Fund", target: 3000, current: 1200, icon: "\u2708\uFE0F", color: "#22d3ee", deadline: "Jun 2026", priority: "low", tip: "On track if you save $450/mo. Consider pausing one subscription to boost this." },
];

const EXAMPLE_DEBTS: DebtData[] = [
  { name: "CIBC Visa", balance: 1700, rate: 19.99, minPayment: 45, color: "#f87171", type: "Credit Card" },
  { name: "Canadian Tire MC", balance: 850, rate: 22.99, minPayment: 25, color: "#fb923c", type: "Credit Card" },
  { name: "Student Loan", balance: 12400, rate: 5.5, minPayment: 280, color: "#60a5fa", type: "Loan" },
];

const LESSONS: LessonData[] = [
  { title: "The 50/30/20 Rule", desc: "How to split your income for maximum financial health", duration: "3 min", icon: "\uD83D\uDCCA", color: "#c8a64e", agent: "Prime" },
  { title: "Debt Snowball vs Avalanche", desc: "Which payoff strategy is right for you?", duration: "5 min", icon: "\u2744\uFE0F", color: "#60a5fa", agent: "Goalie" },
  { title: "Tax Deductions for Self-Employed", desc: "CRA-approved deductions you might be missing", duration: "4 min", icon: "\uD83E\uDDFE", color: "#34d399", agent: "Prime" },
  { title: "Building an Emergency Fund", desc: "Why 3-6 months of expenses is the magic number", duration: "3 min", icon: "\uD83D\uDEE1\uFE0F", color: "#a78bfa", agent: "Goalie" },
];

export function useGoalsData(): GoalsPageData {
  const { userId } = useAuth();
  const { transactions, isLoading: txLoading } = useTransactions();
  const [goals, setGoals] = useState<GoalData[]>([]);
  const [debts, setDebts] = useState<DebtData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGoalsDebts = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const supabase = getSupabase();
    if (!supabase) { setGoals(EXAMPLE_GOALS); setDebts(EXAMPLE_DEBTS); setLoading(false); return; }

    try {
      // Try fetching goals
      const { data: goalsData, error: goalsErr } = await supabase
        .from("goals")
        .select("name, target, current, icon, color, deadline, priority")
        .eq("user_id", userId)
        .order("priority", { ascending: true });

      if (goalsErr?.code === "42P01" || goalsErr?.message?.includes("does not exist")) {
        // Table doesn't exist — use example data
        setGoals(EXAMPLE_GOALS);
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
        setGoals(EXAMPLE_GOALS);
      }

      // Try fetching debts
      const { data: debtsData, error: debtsErr } = await supabase
        .from("debts")
        .select("name, balance, rate, min_payment, color, type")
        .eq("user_id", userId)
        .order("rate", { ascending: false });

      if (debtsErr?.code === "42P01" || debtsErr?.message?.includes("does not exist")) {
        setDebts(EXAMPLE_DEBTS);
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
        setDebts(EXAMPLE_DEBTS);
      }
    } catch {
      setGoals(EXAMPLE_GOALS);
      setDebts(EXAMPLE_DEBTS);
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
  };
}

export function buildGoalieIntro(d: GoalsPageData): string {
  if (d.goals.length === 0 && d.debts.length === 0) {
    return "Welcome to Goals & Debt! Set your first goal or add a debt to start tracking. I'll help you build a plan.";
  }
  const goalPct = d.totalGoalTarget > 0 ? Math.round((d.totalGoalCurrent / d.totalGoalTarget) * 100) : 0;
  return `You've got ${d.goals.length} active goal${d.goals.length !== 1 ? "s" : ""} and $${d.totalDebt.toLocaleString()} in total debt. You're ${goalPct}% toward your targets. Let me show you where to focus \u2014 I've ranked everything by impact and urgency.`;
}
