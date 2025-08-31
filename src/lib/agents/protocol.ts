// A single, shared envelope that ALL agents (Boss + Employees) read/write.

export type AgentRole = 'boss' | 'employee';

export type RouteSlug =
  | 'dashboard.home'
  | 'dashboard.smartImport'
  | 'dashboard.assistant'
  | 'dashboard.therapy'
  | 'dashboard.goals'
  | 'dashboard.predictions'
  | 'dashboard.aiCategorization'
  | 'dashboard.billReminders'
  | 'dashboard.debtPlanner'
  | 'dashboard.financialFreedom'
  | 'dashboard.podcast'
  | 'dashboard.spotify'
  | 'dashboard.wellness'
  | 'dashboard.taxAssistant'
  | 'dashboard.businessIntel'
  | 'dashboard.automation'
  | 'dashboard.tools'
  | 'dashboard.analytics'
  | 'dashboard.settings'
  | 'dashboard.reports';

// Capability names help the Boss pick the right employee.
export type Capability =
  | 'ingest_documents'
  | 'categorize_expenses'
  | 'financial_qna'
  | 'therapy_coaching'
  | 'goal_planning'
  | 'spend_forecast'
  | 'bill_reminders'
  | 'debt_planning'
  | 'freedom_planning'
  | 'podcasts_audio'
  | 'spotify_nowplaying'
  | 'wellness_habits'
  | 'tax_qna'
  | 'business_kpis'
  | 'automation_flows'
  | 'utilities_tools'
  | 'analytics_reports'
  | 'settings_profile'
  | 'reports_export';

// Supabase user context injected automatically.
export interface UserContext {
  userId: string;
  name?: string;
  plan?: string;
  email?: string;
  // quick stats (optional, fill if cheap to compute)
  recentUploads?: number;
  nextBillDueDays?: number | null;
  goalsCount?: number | null;
}

// Message envelope passed between Boss and Employees.
export interface AgentMessage {
  id: string;
  from: AgentRole;              // 'boss' | 'employee'
  to: RouteSlug | 'boss';       // a specific employee route or 'boss'
  timestamp: number;
  // The natural-language prompt or instruction.
  text: string;

  // Intent the sender thinks is correct (optional).
  intent?: string;

  // If Boss is delegating, include target capability/slug.
  handoff?: {
    slug: RouteSlug;
    capability?: Capability;
    // arbitrary payload the employee can use to prefill UI.
    payload?: Record<string, any>;
  };

  // The context snapshot added by the framework.
  context?: UserContext;
}
