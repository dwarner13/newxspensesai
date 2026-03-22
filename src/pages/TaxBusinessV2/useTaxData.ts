import { useState, useEffect } from "react";

export interface TaxData {
  deductionsFound: number;
  estimatedSavings: string;
  docsProcessed: number;
  filingDeadline: string;
  daysToDeadline: number;
  deductionCategories: { name: string; amount: number; count: number; confidence: number; color: string }[];
  deadlines: { label: string; date: string; status: string; color: string }[];
  tips: { title: string; desc: string; duration: string; icon: string; color: string }[];
  loading: boolean;
}

export function useTaxData(): TaxData {
  const [data, setData] = useState<TaxData>({
    deductionsFound: 0, estimatedSavings: "", docsProcessed: 0,
    filingDeadline: "", daysToDeadline: 0, deductionCategories: [],
    deadlines: [], tips: [], loading: true,
  });

  useEffect(() => {
    setData({
      deductionsFound: 3280, estimatedSavings: "$820\u2013$985", docsProcessed: 12,
      filingDeadline: "Apr 30, 2026", daysToDeadline: 39,
      deductionCategories: [
        { name: "Home Office", amount: 1440, count: 18, confidence: 92, color: "#fb923c" },
        { name: "Vehicle", amount: 960, count: 12, confidence: 78, color: "#60a5fa" },
        { name: "Supplies", amount: 880, count: 24, confidence: 95, color: "#a78bfa" },
      ],
      deadlines: [
        { label: "T1 Filing Deadline", date: "Apr 30, 2026", status: "39 days", color: "#fbbf24" },
        { label: "Q1 Installment", date: "Mar 15, 2026", status: "Passed", color: "#34d399" },
        { label: "Q2 Installment", date: "Jun 15, 2026", status: "85 days", color: "#60a5fa" },
      ],
      tips: [
        { title: "Home Office Deductions", desc: "Calculate your home office percentage and document it properly.", duration: "3 min", icon: "\uD83C\uDFE0", color: "#fb923c" },
        { title: "Vehicle Expense Logs", desc: "CRA requires mileage logs. Here's the easy way to track them.", duration: "4 min", icon: "\uD83D\uDE97", color: "#60a5fa" },
        { title: "Business vs Personal", desc: "How to separate expenses when you use one card for both.", duration: "3 min", icon: "\uD83D\uDCB3", color: "#a78bfa" },
      ],
      loading: false,
    });
  }, []);

  return data;
}
