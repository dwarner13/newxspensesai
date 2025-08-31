import { Capability, RouteSlug } from './protocol';

export type Employee = {
  slug: RouteSlug;
  title: string;
  path: string;
  capabilities: Capability[];
};

export const EMPLOYEES: Employee[] = [
  { slug: 'dashboard.home', title: 'Personal Finance AI', path: '/dashboard', capabilities: ['analytics_reports'] },
  { slug: 'dashboard.smartImport', title: 'Smart Import AI', path: '/dashboard/smart-import-ai', capabilities: ['ingest_documents','categorize_expenses'] },
  { slug: 'dashboard.assistant', title: 'AI Financial Assistant', path: '/dashboard/ai-financial-assistant', capabilities: ['financial_qna','categorize_expenses','analytics_reports'] },
  { slug: 'dashboard.therapy', title: 'AI Financial Therapist', path: '/dashboard/financial-therapist', capabilities: ['therapy_coaching'] },
  { slug: 'dashboard.goals', title: 'AI Goal Concierge', path: '/dashboard/goal-concierge', capabilities: ['goal_planning'] },
  { slug: 'dashboard.predictions', title: 'Spending Predictions', path: '/dashboard/spending-predictions', capabilities: ['spend_forecast'] },
  { slug: 'dashboard.aiCategorization', title: 'AI Categorization', path: '/dashboard/ai-categorization', capabilities: ['categorize_expenses'] },
  { slug: 'dashboard.billReminders', title: 'Bill Reminder System', path: '/dashboard/bill-reminders', capabilities: ['bill_reminders'] },
  { slug: 'dashboard.debtPlanner', title: 'Debt Payoff Planner', path: '/dashboard/debt-payoff-planner', capabilities: ['debt_planning'] },
  { slug: 'dashboard.financialFreedom', title: 'AI Financial Freedom', path: '/dashboard/ai-financial-freedom', capabilities: ['freedom_planning'] },
  { slug: 'dashboard.podcast', title: 'Personal Podcast', path: '/dashboard/personal-podcast', capabilities: ['podcasts_audio'] },
  { slug: 'dashboard.spotify', title: 'Spotify Integration', path: '/dashboard/spotify-integration', capabilities: ['spotify_nowplaying'] },
  { slug: 'dashboard.wellness', title: 'Wellness Studio', path: '/dashboard/wellness-studio', capabilities: ['wellness_habits'] },
  { slug: 'dashboard.taxAssistant', title: 'Tax Assistant', path: '/dashboard/tax-assistant', capabilities: ['tax_qna'] },
  { slug: 'dashboard.businessIntel', title: 'Business Intelligence', path: '/dashboard/business-intelligence', capabilities: ['business_kpis'] },
  { slug: 'dashboard.automation', title: 'Smart Automation', path: '/dashboard/smart-automation', capabilities: ['automation_flows'] },
  { slug: 'dashboard.tools', title: 'Tools', path: '/dashboard/tools', capabilities: ['utilities_tools'] },
  { slug: 'dashboard.analytics', title: 'Analytics', path: '/dashboard/analytics', capabilities: ['analytics_reports'] },
  { slug: 'dashboard.settings', title: 'Settings', path: '/dashboard/settings', capabilities: ['settings_profile'] },
  { slug: 'dashboard.reports', title: 'Reports', path: '/dashboard/reports', capabilities: ['reports_export'] },
];

// helpers
export const bySlug = (s: RouteSlug) => EMPLOYEES.find(e => e.slug === s);
export const pathFor = (s: RouteSlug) => bySlug(s)?.path ?? '/dashboard';
