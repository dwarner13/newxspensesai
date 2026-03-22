// src/navigation/nav-registry.tsx
import type { ReactNode } from "react";
import {
  Home, Receipt, Tags, Brain, FileText, Star,
  Target, Mic, Briefcase, Settings
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
// PRIMARY: always visible in sidebar
// MORE: collapsed by default behind "More" toggle
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  // ── Primary ──
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: <Home className="w-5 h-5" />,
    group: "PRIMARY",
    description: "AI briefing and financial overview",
  },
  {
    label: "Transactions",
    to: "/dashboard/transactions",
    icon: <Receipt className="w-5 h-5" />,
    group: "PRIMARY",
    description: "Every transaction, searchable and sortable",
  },
  {
    label: "Categories",
    to: "/dashboard/categories",
    icon: <Tags className="w-5 h-5" />,
    group: "PRIMARY",
    description: "AI-powered spending categories with Tag",
  },
  {
    label: "My Story",
    to: "/dashboard/my-story",
    icon: <Brain className="w-5 h-5" />,
    group: "PRIMARY",
    description: "Your financial narrative by Crystal",
    badge: 'new',
  },
  {
    label: "Reports",
    to: "/dashboard/reports",
    icon: <FileText className="w-5 h-5" />,
    group: "PRIMARY",
    description: "Export and share financial reports",
  },
  {
    label: "Xspense Score",
    to: "/dashboard/xspense-score",
    icon: <Star className="w-5 h-5" />,
    group: "PRIMARY",
    description: "Your financial health score",
  },

  // ── More ──
  {
    label: "Goals & Debt",
    to: "/dashboard/goal-concierge",
    icon: <Target className="w-5 h-5" />,
    group: "MORE",
    description: "Goals, debt payoff, and savings targets",
    badge: 'soon',
  },
  {
    label: "Monthly Recap",
    to: "/dashboard/monthly-recap",
    icon: <Mic className="w-5 h-5" />,
    group: "MORE",
    description: "AI-generated financial recaps",
  },
  {
    label: "Tax & Business",
    to: "/dashboard/tax-business",
    icon: <Briefcase className="w-5 h-5" />,
    group: "MORE",
    description: "Tax optimization powered by Ledger",
    badge: 'soon',
  },
  {
    label: "Settings",
    to: "/dashboard/settings",
    icon: <Settings className="w-5 h-5" />,
    group: "MORE",
    description: "Account, security, and preferences",
  },
];

export default NAV_ITEMS;
