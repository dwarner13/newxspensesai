// src/navigation/nav-registry.tsx
import type { ReactNode } from "react";
import {
  Crown, Receipt, Landmark, Tags, BarChart3, FileText,
  Target, Bell, Mic, Briefcase, Settings, Upload
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
  group: string;
  description: string;
  badge?: 'new' | 'soon';
};

// ─── Single source of truth for navigation ───────────────────────────────────
// 11 destinations. No shells without badges. No duplicates. No feature-tool names.
//
// Groups:
//   PRIME   — standalone crown item, no group label rendered
//   MY MONEY — core data destinations
//   INSIGHTS — read-only analysis
//   PLAN     — forward-looking tools (mostly soon)
//   LEARN    — podcast / education
//   TOOLS    — tax, settings
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  // ── Prime ── (rendered without a group label, special violet styling)
  {
    label: "Prime",
    to: "/dashboard/prime-chat",
    icon: <Crown className="w-5 h-5" />,
    group: "PRIME",
    description: "Your AI financial advisor — ask anything",
  },

  // ── My Money ──
  {
    label: "Transactions",
    to: "/dashboard/transactions",
    icon: <Receipt className="w-5 h-5" />,
    group: "MY MONEY",
    description: "Every transaction, searchable and sortable",
  },
  {
    label: "Accounts",
    to: "/dashboard/bank-accounts",
    icon: <Landmark className="w-5 h-5" />,
    group: "MY MONEY",
    description: "Connected bank accounts",
  },
  {
    label: "Categories",
    to: "/dashboard/smart-categories",
    icon: <Tags className="w-5 h-5" />,
    group: "MY MONEY",
    description: "AI-powered spending categories with Tag",
  },

  // ── Insights ──
  {
    label: "Analytics",
    to: "/dashboard/analytics-ai",
    icon: <BarChart3 className="w-5 h-5" />,
    group: "INSIGHTS",
    description: "Spending trends and patterns",
  },
  {
    label: "Reports",
    to: "/dashboard/reports",
    icon: <FileText className="w-5 h-5" />,
    group: "INSIGHTS",
    description: "Export and share financial reports",
  },

  // ── Plan ──
  {
    label: "Goals & Debt",
    to: "/dashboard/goal-concierge",
    icon: <Target className="w-5 h-5" />,
    group: "PLAN",
    description: "Goals, debt payoff, and savings targets",
    badge: 'soon',
  },
  {
    label: "Bills",
    to: "/dashboard/bill-reminders",
    icon: <Bell className="w-5 h-5" />,
    group: "PLAN",
    description: "Upcoming bills and payment reminders",
    badge: 'soon',
  },

  // ── Learn ──
  {
    label: "Monthly Recap",
    to: "/dashboard/personal-podcast",
    icon: <Mic className="w-5 h-5" />,
    group: "LEARN",
    description: "Your AI-generated financial podcast — real numbers, real insights",
    badge: 'new',
  },

  // ── Tools ──
  {
    label: "Tax & Business",
    to: "/dashboard/tax-assistant",
    icon: <Briefcase className="w-5 h-5" />,
    group: "TOOLS",
    description: "Tax prep and business intelligence",
    badge: 'soon',
  },
  {
    label: "Settings",
    to: "/dashboard/settings",
    icon: <Settings className="w-5 h-5" />,
    group: "TOOLS",
    description: "Account, security, and preferences",
  },
];

export { Upload }; // re-export for Import quick-action in sidebar
export default NAV_ITEMS;
