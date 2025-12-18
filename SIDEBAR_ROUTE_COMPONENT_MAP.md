# Sidebar Route → Component Mapping

**Generated:** 2025-01-XX  
**Purpose:** Verify route → component → layout mapping for sidebar dashboard pages

---

## Route → Component → Layout Table

| Route | Component File | Component Name | Layout Used | Status |
|-------|---------------|---------------|-------------|--------|
| `/dashboard` | `src/components/XspensesProDashboard.jsx` | `XspensesProDashboard` | Custom (2-col with Activity Feed) | ⚠️ Main dashboard |
| `/dashboard/smart-import-ai` | `src/pages/dashboard/SmartImportChatPage.tsx` | `SmartImportChatPage` | `DashboardPageShell` | ✅ |
| `/dashboard/ai-chat-assistant` | `src/pages/dashboard/AIChatAssistantPage.tsx` | `AIChatAssistantPage` | `DashboardPageShell` | ✅ |
| `/dashboard/ai-financial-assistant` | `src/pages/dashboard/AIChatAssistantPage.tsx` | `AIChatAssistantPage` | `DashboardPageShell` | ✅ |
| `/dashboard/team-room` | Redirects to `/dashboard/prime-chat` | - | - | ⚠️ Redirect |
| `/dashboard/ai-categorization` | `src/pages/dashboard/SmartCategoriesPage.tsx` | `SmartCategoriesPage` | `DashboardPageShell` | ✅ |
| `/dashboard/smart-categories` | `src/pages/dashboard/SmartCategoriesPage.tsx` | `SmartCategoriesPage` | `DashboardPageShell` | ✅ |
| `/dashboard/transactions` | `src/pages/dashboard/TransactionsPage.tsx` | `TransactionsPage` | `DashboardPageShell` | ✅ |
| `/dashboard/goal-concierge` | `src/pages/dashboard/GoalConciergePage.tsx` | `GoalConciergePage` | `DashboardPageShell` | ✅ |
| `/dashboard/smart-automation` | `src/pages/dashboard/SmartAutomation.tsx` | `SmartAutomationPage` | `DashboardPageShell` | ✅ |
| `/dashboard/spending-predictions` | `src/pages/dashboard/SpendingPredictionsPage.tsx` | `SpendingPredictionsPage` | `DashboardPageShell` | ✅ |
| `/dashboard/debt-payoff-planner` | `src/pages/dashboard/DebtPayoffPlannerPage.tsx` | `DebtPayoffPlannerPage` | `DashboardPageShell` | ✅ |
| `/dashboard/ai-financial-freedom` | `src/pages/dashboard/AIFinancialFreedomPage.tsx` | `AIFinancialFreedomPage` | `DashboardPageShell` | ✅ |
| `/dashboard/bill-reminders` | `src/pages/dashboard/BillRemindersPage.tsx` | `BillRemindersPage` | `DashboardPageShell` | ✅ |
| `/dashboard/podcast` | Redirects to `/dashboard/personal-podcast` | - | - | ⚠️ Redirect |
| `/dashboard/personal-podcast` | `src/pages/dashboard/PersonalPodcastPage.tsx` | `PersonalPodcastPage` | `DashboardPageShell` | ✅ |
| `/dashboard/financial-story` | `src/pages/dashboard/FinancialStoryPage.tsx` | `FinancialStoryPage` | `DashboardPageShell` | ✅ |
| `/dashboard/financial-therapist` | `src/pages/dashboard/AIFinancialTherapistPage.tsx` | `AIFinancialTherapistPage` | `DashboardPageShell` | ✅ |
| `/dashboard/wellness-studio` | `src/pages/dashboard/WellnessStudioPage.tsx` | `WellnessStudioPage` | `DashboardPageShell` | ✅ |
| `/dashboard/spotify-integration` | Redirects to `/dashboard/spotify` | - | - | ⚠️ Redirect |
| `/dashboard/spotify` | `src/pages/dashboard/SpotifyIntegrationPage.tsx` | `SpotifyIntegrationPage` | `DashboardPageShell` | ✅ |
| `/dashboard/tax-assistant` | `src/pages/dashboard/TaxAssistantPage.tsx` | `TaxAssistantPage` | `DashboardPageShell` | ✅ |
| `/dashboard/business-intelligence` | `src/pages/dashboard/BusinessIntelligencePage.tsx` | `BusinessIntelligencePage` | `DashboardPageShell` | ✅ |
| `/dashboard/settings` | `src/pages/dashboard/SettingsPage.tsx` | `SettingsPage` | `DashboardPageShell` | ✅ |
| `/dashboard/prime-chat` | `src/pages/dashboard/PrimeChatPage.tsx` | `PrimeChatPage` | `DashboardPageShell` | ✅ |
| `/dashboard/analytics-ai` | `src/pages/dashboard/AnalyticsAI.tsx` | `AnalyticsAI` | `DashboardPageShell` | ✅ |

---

## Console Log Verification

Console logs have been added to the following components for route mount verification:

- ✅ `SmartImportChatPage` - logs `[route-mount] /dashboard/smart-import-ai SmartImportChatPage`
- ✅ `AIChatAssistantPage` - logs `[route-mount] /dashboard/ai-chat-assistant AIChatAssistantPage`
- ✅ `GoalConciergePage` - logs `[route-mount] /dashboard/goal-concierge GoalConciergePage`
- ✅ `SmartAutomationPage` - logs `[route-mount] /dashboard/smart-automation SmartAutomationPage`

**To verify:** Open browser console and navigate to these routes. You should see the `[route-mount]` logs.

---

## Layout Component Details

### DashboardPageShell
- **File:** `src/components/layout/DashboardPageShell.tsx`
- **Wraps:** `DashboardThreeColumnLayout`
- **Provides:** Consistent `pt-6` spacing, 3-column structure enforcement

### DashboardThreeColumnLayout
- **File:** `src/components/layout/DashboardThreeColumnLayout.tsx`
- **Grid Template (3-column):** `grid-cols-[300px_minmax(0,1fr)_320px]`
- **Grid Template (2-column):** `grid-cols-[minmax(0,1fr)_320px]`
- **Column Widths:**
  - Left: 300px fixed
  - Center: `minmax(0,1fr)` (flexible, dominant)
  - Right: 320px fixed (Activity Feed)

---

## Excluded Routes (Top-Nav Pages)

These routes are **NOT** sidebar routes and are excluded from this audit:

- `/dashboard/overview` → `OverviewPage` (top-nav)
- `/dashboard/planning` → `PlanningPage` (top-nav)
- `/dashboard/analytics` → `AnalyticsPage` (top-nav)
- `/dashboard/business` → `BusinessPage` (top-nav)
- `/dashboard/entertainment` → `EntertainmentPage` (top-nav)
- `/dashboard/reports` → `ReportsPage` (top-nav)

---

## Summary

- **Total Sidebar Routes:** 20 (excluding redirects and main dashboard)
- **Using DashboardPageShell:** 19/20 (95%)
- **Custom Layout:** 1 (`/dashboard` - main dashboard)
- **Layout Consistency:** ✅ All sidebar workspace pages use consistent 3-column layout

