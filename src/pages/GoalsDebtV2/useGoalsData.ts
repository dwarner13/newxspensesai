import { useState, useEffect, useCallback } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { allTimeRange } from "@/lib/financialSummary";
import { hasFigures } from "@/components/finance/FinancialState";
import type { GoalData, DebtData, LessonData } from "./goalsConfig";

export interface GoalsPageData {
  goals: GoalData[];
  debts: DebtData[];
  lessons: LessonData[];
  totalDebt: number;
  totalGoalTarget: number;
  totalGoalCurrent: number;
  /**
   * UX-FST2-7 (AR-1b FR-005): the server's average Net Cash Flow per comparable statement period
   * (goals.averageNetCashFlowPerPeriod); null without enough statement coverage. Replaces the
   * browser 'latest month income minus expenses' figure.
   */
  averageNetCashFlowPerPeriod: number | null;
  periodsUsed: number;
  /** Retired: a browser projection (debt / monthly savings). Always 0 = not available. */
  debtFreeMonths: number;
  loading: boolean;
  /** The goals or debts could not be loaded (shown as an error, never as example data). */
  loadError: boolean;
  /** Goal / debt storage is not set up in the database (missing table or column). */
  unavailable: boolean;
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
  // UX-FST2-7: figures from the shared engine (all statements); no browser month buckets.
  const scope = useMemo(() => allTimeRange(), []);
  const financial = useFinancialSummary(scope);
  const summary = hasFigures(financial) ? financial.summary : null;
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

  const averageNetCashFlowPerPeriod = summary ? summary.goals.averageNetCashFlowPerPeriod : null;
  const periodsUsed = summary ? summary.goals.periodsUsed : 0;
  const debtFreeMonths = 0;

  return {
    goals, debts, lessons: LESSONS,
    totalDebt, totalGoalTarget, totalGoalCurrent,
    averageNetCashFlowPerPeriod, periodsUsed, debtFreeMonths,
    loading: loading || financial.status === 'loading',
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
