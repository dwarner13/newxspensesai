# 👑 Prime Connection Audit & Wiring Plan
## Source of Truth Architecture Design

**Date**: 2025-01-20  
**Status**: ✅ Audit Complete - Ready for Implementation  
**Purpose**: Establish Prime as the single source-of-truth brain for XspensesAI dashboard orchestration

---

## 📋 EXECUTIVE SUMMARY

### Current State
- **Prime is defined in 5+ locations** with overlapping but inconsistent implementations
- **Prime is used as fallback router** (default when no keywords match) but lacks orchestration authority
- **Multiple decision makers** exist independently: RouteDecisionGate, dashboard card configs, sidebar visibility, onboarding gates
- **Prime has limited context**: Only receives 12 user facts, no conversation history, no financial snapshot
- **No canonical Prime state**: UI components make independent decisions about what to show

### Target State
- **ONE Prime contract** that all UI reads from (read-only)
- **Prime owns all product decisions**: stage, feature visibility, next actions, routing
- **Prime has full context**: financial snapshot, memory summary, user profile, transaction state
- **UI becomes reactive**: Components consume Prime state, don't make decisions

### Key Findings
1. **Prime Footprint**: 5 prompt definitions, 3 routing implementations, 4 UI components, 0 orchestration layer
2. **Decision Conflicts**: 8+ parallel decision makers (onboarding gates, sidebar visibility, dashboard CTAs, chat routing)
3. **Data Available**: Transactions, categories, OCR outputs, memory facts, user profile all exist but not unified
4. **Missing**: Financial snapshot function, Prime state contract, unified context injection

---

## 1️⃣ PRIME FOOTPRINT TABLE

| File Path | Type | What It Does | Inputs | Outputs | Notes |
|-----------|------|--------------|--------|---------|-------|
| `docs/PRIME_PROMPT.md` | Documentation | Comprehensive Prime persona (256 lines) | None | Reference doc | Most detailed definition |
| `src/ai/prime/buildPrompt.ts` | Service | Builds Prime prompt with context | facts, history, analytics, tasks | System prompt string | Frontend prompt builder |
| `netlify/functions/_shared/router.ts` | Service | Routes messages to employees | userText, conversationHistory | employee slug, persona | Prime is default fallback (line 194) |
| `netlify/functions/chat.ts` | Function | Chat endpoint handler | userId, message, sessionId | SSE stream | Uses router.ts, injects context |
| `src/hooks/usePrimeChat.ts` | Hook | Prime chat state management | userId, sessionId, employeeOverride | messages, send, headers | Frontend chat hook |
| `src/contexts/PrimeChatContext.tsx` | Context | Prime chat provider | conversationId, initialQuestion | Chat state | Wraps usePrimeChat |
| `src/components/chat/PrimeSidebarChat.tsx` | Component | Sidebar chat UI | None | Renders chat | Uses usePrimeChat hook |
| `src/pages/dashboard/PrimeChatPage.tsx` | Component | Prime workspace page | None | Full page layout | Main Prime chat entry point |
| `src/components/workspace/employees/PrimeUnifiedCard.tsx` | Component | Inline Prime card | None | Chat workspace | Dashboard inline chat |
| `src/components/workspace/employees/PrimeWorkspace.tsx` | Component | Floating Prime overlay | open, onClose | Chat overlay | Floating chat modal |
| `src/ai/prime/intro/getPrimeIntroMessage.ts` | Service | Generates Prime intro | supabase, userId | PrimeIntro (decision, message) | User segmentation integration |
| `src/lib/user-status.ts` | Service | User segmentation logic | UsageSignals | SegmentationDecision | Determines first_time/returning/power_user |
| `src/components/boss/BossBubble.tsx` | Component | Dashboard chat bubble | None | Greeting UI | Legacy component (deprecated?) |

### Prime Pattern Analysis

**Pattern A: Router Fallback** (`router.ts`)
- Prime selected when no keywords match
- Default: `selectedEmployee = 'prime-boss'` (line 194)
- No special orchestration logic

**Pattern B: Frontend Prompt Builder** (`buildPrompt.ts`)
- Builds prompt with facts/history/analytics
- Used by chat components
- No state management

**Pattern C: Chat Hook** (`usePrimeChat.ts`)
- Manages chat state (messages, streaming)
- Calls `/chat` endpoint
- No orchestration decisions

**Pattern D: Segmentation** (`getPrimeIntroMessage.ts`)
- Determines user status (first_time/returning/power_user)
- Used for personalized greetings
- Not connected to routing/visibility decisions

**Pattern E: UI Components** (Multiple)
- Various Prime chat UIs
- All consume hooks/contexts
- No orchestration authority

---

## 2️⃣ DECISION CONFLICTS LIST

| File Path | Decision Being Made | Current Owner | Why It Conflicts | Proposed New Owner (Prime) | Migration Note |
|-----------|---------------------|---------------|------------------|----------------------------|----------------|
| `src/components/auth/RouteDecisionGate.tsx` | Onboarding required? | RouteDecisionGate | Checks `profile.onboarding_completed` directly | Prime | Prime should determine stage, gate reads Prime state |
| `src/navigation/nav-registry.tsx` | Sidebar items visible? | Static NAV_ITEMS array | All items always visible | Prime | Prime should return `featureVisibilityMap` |
| `src/components/dashboard/dashboardCardsConfig.tsx` | Which cards to show? | Card config functions | Hardcoded card logic | Prime | Prime should return `suggestedNextAction` + card priorities |
| `src/components/dashboard/ConnectedDashboard.tsx` | Dashboard stats/CTAs? | ConnectedDashboard | Fetches stats independently | Prime | Prime should provide `financialSnapshot` |
| `src/lib/user-status.ts` | User stage (novice/guided/power)? | User segmentation | Determines status independently | Prime | Prime should own `currentStage` |
| `netlify/functions/_shared/router.ts` | Chat routing decisions | Router | Keyword-based routing | Prime | Prime should own routing logic (or router reads Prime rules) |
| `src/components/navigation/DesktopSidebar.tsx` | Route → Employee mapping | Static `routeToEmployee` map | Hardcoded mappings | Prime | Prime should provide `routeEmployeeMap` |
| `src/components/onboarding/CinematicOnboardingOverlay.tsx` | Onboarding flow steps? | Onboarding components | Independent flow logic | Prime | Prime should own onboarding stage |
| `src/hooks/useAdminAccess.ts` | Feature access (premium/admin)? | useAdminAccess | Checks profile.role directly | Prime | Prime should include in `featureVisibilityMap` |
| `src/agent/entitlements/resolver-enhanced.ts` | Tool/feature entitlements? | Entitlements resolver | Checks subscription/plan | Prime | Prime should consume entitlements, own visibility |

### Duplicated Stage Logic

**"Novice" / "First Time" Definitions:**
1. `RouteDecisionGate.tsx` (line 144): `!onboardingCompleted`
2. `user-status.ts` (line 52): `!onboardingComplete || !lastLoginAt`
3. `getPrimeIntroMessage.ts` (line 60): Fallback to `first_time` on error
4. Onboarding components: Various checks for missing profile fields

**"Paid" / "Premium" Definitions:**
1. `useAdminAccess.ts` (line 42): `profile.role === 'premium'`
2. `entitlements/resolver-enhanced.ts` (line 59): `subscription_status === 'active'`
3. `security/withSecurity.tsx`: Page-level access checks

**"Completed Onboarding" Definitions:**
1. `RouteDecisionGate.tsx` (line 156): `onboarding_status === 'completed' || onboarding_completed === true`
2. `OnboardingSetupPage.tsx`: Similar logic (needs verification)
3. Profile metadata: Various field checks

---

## 3️⃣ AVAILABLE DATA INVENTORY

### Data Domain: Transactions

| Source | Shape Summary | How to Query | Freshness | Known Gaps |
|--------|--------------|--------------|-----------|------------|
| `transactions` table | `id, user_id, date, amount, category, merchant, type, description` | `supabase.from('transactions').select('*').eq('user_id', userId)` | Real-time | No aggregate queries cached |
| `src/agent/tools/impl/transactions_query.ts` | Tool: Returns transactions + summary (totalAmount, totalExpenses, totalIncome) | `execute({ startDate?, endDate?, type? }, { userId })` | Real-time | Good for Prime consumption |
| `src/agent/tools/impl/crystal_summarize_expenses.ts` | Tool: Expense summary (total, count, average, topMerchants) | `execute({ startDate?, endDate? }, { userId })` | Real-time | Crystal-specific, but Prime can use |
| `src/agent/tools/impl/crystal_summarize_income.ts` | Tool: Income summary (total, count, average, topMerchants) | `execute({ startDate?, endDate? }, { userId })` | Real-time | Crystal-specific, but Prime can use |
| `src/agent/tools/impl/transaction_category_totals.ts` | Tool: Category totals (category, totalAmount, transactionCount, avgAmount) | `execute({ startDate?, endDate?, type? }, { userId })` | Real-time | Perfect for Prime financial snapshot |
| `src/lib/smartCategoriesSummarizer.ts` | Period summaries (this-month, last-month, this-year) | `summarizeCategoriesByPeriod(period, userId)` | Real-time | Good helper function |

**Aggregate Queries Available:**
- ✅ Total transactions count
- ✅ Total expenses/income
- ✅ Category breakdowns
- ✅ Top merchants
- ✅ Date ranges
- ✅ Uncategorized count (via `category.is.null` filter)

**Missing Aggregates:**
- ❌ Monthly spend trend (need to group by month)
- ❌ Cashflow (income - expenses) calculation
- ❌ Spending velocity (spend per day/week)

### Data Domain: Categories

| Source | Shape Summary | How to Query | Freshness | Known Gaps |
|--------|--------------|--------------|-----------|------------|
| `categories` table | `id, user_id, name, slug, color, icon, parent_id` | `supabase.from('categories').select('*').eq('user_id', userId)` | Real-time | User + system categories |
| `src/agent/tools/impl/tag_category_brain.ts` | Tool: Category suggestions + rules | `execute({ description, merchant, amount? }, { userId })` | Real-time | Tag-specific |
| Uncategorized logic | `transactions` where `category IS NULL OR category = 'Uncategorized'` | `.or('category.is.null,category.eq.Uncategorized')` | Real-time | Standard query pattern |

**Available:**
- ✅ Category list (user + system)
- ✅ Uncategorized transaction count
- ✅ Category rules (if rules table exists)

**Missing:**
- ❌ Category usage frequency
- ❌ Category spending trends

### Data Domain: OCR / Documents

| Source | Shape Summary | How to Query | Freshness | Known Gaps |
|--------|--------------|--------------|-----------|------------|
| `receipts` table | `id, user_id, file_name, file_url, created_at, status` | `supabase.from('receipts').select('*').eq('user_id', userId)` | Real-time | Status field indicates processing state |
| `uploaded_files` table | `id, user_id, file_name, file_type, file_size, created_at` | `supabase.from('uploaded_files').select('*').eq('user_id', userId)` | Real-time | General uploads |
| `documents` table | `id, user_id, document_type, status, extracted_data` | `supabase.from('documents').select('*').eq('user_id', userId)` | Real-time | If exists (needs verification) |
| `src/services/WorkerService.ts` | Processing pipeline state | Worker job status | Real-time | Processing status |

**Available:**
- ✅ Document count
- ✅ Last upload timestamp
- ✅ Processing status

**Missing:**
- ❌ OCR success rate
- ❌ Document type breakdown
- ❌ Extraction quality metrics

### Data Domain: Memory / Facts

| Source | Shape Summary | How to Query | Freshness | Known Gaps |
|--------|--------------|--------------|-----------|------------|
| `user_memory_facts` table | `id, user_id, fact, fact_hash, source, confidence, created_at` | `supabase.from('user_memory_facts').select('*').eq('user_id', userId).order('created_at', { ascending: false })` | Real-time | Facts stored as text strings |
| `netlify/functions/_shared/memory.ts` | `getUserFacts(userId, maxFacts)` | Helper function | Real-time | Returns parsed facts |
| `memory_embeddings` table | `id, user_id, message_id, text, embedding, content_redacted` | Vector search via `match_memory_embeddings()` | Real-time | RAG search available |
| `chat_sessions` table | `id, user_id, employee_slug, created_at, updated_at` | `supabase.from('chat_sessions').select('*').eq('user_id', userId)` | Real-time | Conversation sessions |
| `chat_messages` table | `id, session_id, role, content, created_at` | `supabase.from('chat_messages').select('*').eq('session_id', sessionId)` | Real-time | Message history |

**Available:**
- ✅ User facts (preferences, goals, financial state)
- ✅ Conversation history (per session)
- ✅ RAG embeddings (semantic search)

**Missing:**
- ❌ Memory summary (needs aggregation)
- ❌ Fact confidence filtering (only high-confidence facts)
- ❌ Conversation summaries (if `chat_convo_summaries` exists)

### Data Domain: User Profile

| Source | Shape Summary | How to Query | Freshness | Known Gaps |
|--------|--------------|--------------|-----------|------------|
| `profiles` table | `id, display_name, role, onboarding_completed, onboarding_status, transaction_count, last_login_at, currency, time_zone, metadata` | `supabase.from('profiles').select('*').eq('id', userId).single()` | Real-time | Full user profile |
| `src/lib/user-usage.ts` | `getUsageSignals(supabase, userId)` | Helper function | Real-time | Returns UsageSignals (transactions, rules, goals, lastLoginAt, onboardingComplete) |

**Available:**
- ✅ User identity (name, email)
- ✅ Onboarding status
- ✅ Subscription/role
- ✅ Usage signals (transaction_count, etc.)
- ✅ Preferences (currency, timezone)

**Missing:**
- ❌ User goals (if goals table exists, needs verification)
- ❌ Debt state (if debt tables exist, needs verification)

### Data Domain: Goals / Debt (Needs Verification)

| Source | Shape Summary | How to Query | Freshness | Known Gaps |
|--------|--------------|--------------|-----------|------------|
| Goals table | **UNKNOWN** - Needs verification if exists | TBD | TBD | May not exist |
| Debt table | **UNKNOWN** - Needs verification if exists | TBD | TBD | May not exist |

**Status**: ⚠️ **VERIFY** - Check if `goals` or `debt` tables exist in Supabase schema

---

## 4️⃣ PRIME CONTRACT (TypeScript Interface)

### Recommended Approach: **PrimeContext (Frontend Context)**

**Justification:**
- Frontend components already use React Context pattern (`PrimeChatContext`, `BossProvider`)
- Real-time updates via context re-renders
- Can be hydrated from backend endpoint (`/api/prime-state`)
- Fits existing architecture (hooks, components, contexts)

**Alternative Considered:** PrimeService (shared client service)
- ❌ Less reactive (requires manual refresh)
- ❌ Doesn't fit React patterns

**Alternative Considered:** PrimeOrchestrator (server-driven via `/chat`)
- ❌ Chat endpoint is for messages, not state
- ❌ Would require new endpoint anyway

### PrimeState Interface

```typescript
// src/types/prime-state.ts

/**
 * Prime's Canonical State Contract
 * 
 * This is the SINGLE SOURCE OF TRUTH for all Prime decisions.
 * All UI components read from this (read-only).
 * Only Prime backend updates this state.
 */

export interface PrimeState {
  /** User profile summary (identity, preferences) */
  userProfileSummary: UserProfileSummary;
  
  /** Financial snapshot (transactions, categories, spending) */
  financialSnapshot: FinancialSnapshot;
  
  /** Memory summary (facts, recent conversations) */
  memorySummary: MemorySummary;
  
  /** Current user stage (drives onboarding, feature visibility) */
  currentStage: UserStage;
  
  /** Single suggested next action (CTA) */
  suggestedNextAction: SuggestedNextAction | null;
  
  /** Feature visibility map (which features are visible/enabled) */
  featureVisibilityMap: FeatureVisibilityMap;
  
  /** Warnings/blockers (missing onboarding fields, errors) */
  warnings: PrimeWarning[];
  
  /** Last updated timestamp */
  lastUpdated: string; // ISO timestamp
}

export interface UserProfileSummary {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: 'free' | 'premium' | 'admin';
  currency: string | null;
  timezone: string | null;
  onboardingCompleted: boolean;
  onboardingStatus: 'pending' | 'in_progress' | 'completed' | null;
  lastLoginAt: string | null;
  accountCreatedAt: string;
}

export interface FinancialSnapshot {
  /** Basic flags */
  hasTransactions: boolean;
  transactionCount: number;
  
  /** Categorization state */
  uncategorizedCount: number;
  categorizedCount: number;
  categoryCount: number; // Unique categories used
  
  /** Spending metrics */
  monthlySpend: number; // Current month expenses
  monthlyIncome: number; // Current month income
  netCashflow: number; // income - expenses
  
  /** Top categories (spending) */
  topCategories: Array<{
    category: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  
  /** Top merchants */
  topMerchants: Array<{
    merchant: string;
    totalAmount: number;
    transactionCount: number;
  }>;
  
  /** Date ranges */
  firstTransactionDate: string | null; // ISO date
  lastTransactionDate: string | null; // ISO date
  
  /** Debt state (if available) */
  hasDebt: 'yes' | 'no' | 'unknown';
  debtTotal: number | null; // If known
  
  /** Goals state (if available) */
  hasGoals: 'yes' | 'no' | 'unknown';
  activeGoalCount: number | null; // If known
  
  /** Stress signals (simple heuristics) */
  stressSignals: StressSignal[];
}

export interface StressSignal {
  type: 'high_uncategorized' | 'negative_cashflow' | 'high_spending_velocity' | 'missing_categories';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestedAction?: string;
}

export interface MemorySummary {
  factCount: number;
  highConfidenceFacts: Array<{
    key: string;
    value: string;
    confidence: number;
  }>;
  recentConversations: Array<{
    sessionId: string;
    employeeSlug: string;
    lastMessageAt: string;
    summary?: string;
  }>;
  pendingTasks: Array<{
    id: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

export type UserStage = 'novice' | 'guided' | 'power';

export interface SuggestedNextAction {
  id: string;
  type: 'onboarding' | 'import' | 'categorize' | 'analyze' | 'goal' | 'chat';
  title: string;
  description: string;
  ctaText: string;
  route: string; // e.g., '/dashboard/smart-import-ai'
  priority: 'low' | 'medium' | 'high';
  icon?: string;
}

export interface FeatureVisibilityMap {
  [featureKey: string]: {
    visible: boolean;
    enabled: boolean;
    reason?: string; // Why hidden/disabled
  };
}

// Feature keys (examples)
export type FeatureKey =
  | 'smart_import'
  | 'smart_categories'
  | 'analytics_ai'
  | 'goal_concierge'
  | 'debt_payoff_planner'
  | 'tax_assistant'
  | 'personal_podcast'
  | 'financial_therapist'
  | 'business_intelligence'
  | 'reports'
  | 'settings';

export interface PrimeWarning {
  type: 'missing_onboarding_field' | 'subscription_expired' | 'data_quality' | 'system_error';
  severity: 'info' | 'warning' | 'error';
  message: string;
  actionRequired: boolean;
  actionRoute?: string;
}
```

### PrimeContext Hook

```typescript
// src/contexts/PrimeContext.tsx

import { createContext, useContext, useEffect, useState } from 'react';
import type { PrimeState } from '@/types/prime-state';

const PrimeContext = createContext<PrimeState | null>(null);

export function PrimeProvider({ children }: { children: React.ReactNode }) {
  const [primeState, setPrimeState] = useState<PrimeState | null>(null);
  const { userId } = useAuth();
  
  useEffect(() => {
    if (!userId) return;
    
    // Fetch Prime state from backend
    const fetchPrimeState = async () => {
      const res = await fetch('/.netlify/functions/prime-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const state = await res.json();
      setPrimeState(state);
    };
    
    fetchPrimeState();
    
    // Refresh every 30 seconds (or on events)
    const interval = setInterval(fetchPrimeState, 30000);
    return () => clearInterval(interval);
  }, [userId]);
  
  return (
    <PrimeContext.Provider value={primeState}>
      {children}
    </PrimeContext.Provider>
  );
}

export function usePrimeState(): PrimeState | null {
  return useContext(PrimeContext);
}
```

---

## 5️⃣ FINANCIAL SNAPSHOT DESIGN

### Function: `buildFinancialSnapshot(userId: string): Promise<FinancialSnapshot>`

**Location**: `netlify/functions/_shared/financial-snapshot.ts`

**Inputs:**
- `userId: string` (required)

**Outputs:**
- `FinancialSnapshot` (see interface above)

### Rule Logic (High Level)

```typescript
async function buildFinancialSnapshot(userId: string): Promise<FinancialSnapshot> {
  const supabase = admin();
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // 1. BASIC FLAGS
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('id, date, amount, category, merchant, type')
    .eq('user_id', userId);
  
  const hasTransactions = (allTransactions?.length || 0) > 0;
  const transactionCount = allTransactions?.length || 0;
  
  // 2. CATEGORIZATION STATE
  const uncategorizedTransactions = allTransactions?.filter(
    t => !t.category || t.category === 'Uncategorized'
  ) || [];
  const uncategorizedCount = uncategorizedTransactions.length;
  const categorizedCount = transactionCount - uncategorizedCount;
  
  const uniqueCategories = new Set(
    allTransactions?.map(t => t.category).filter(Boolean) || []
  );
  const categoryCount = uniqueCategories.size;
  
  // 3. MONTHLY SPENDING
  const currentMonthTransactions = allTransactions?.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= currentMonthStart && txDate <= currentMonthEnd;
  }) || [];
  
  const monthlyExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const monthlyIncome = currentMonthTransactions
    .filter(t => t.type === 'income' || (t.type === null && t.amount > 0))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const netCashflow = monthlyIncome - monthlyExpenses;
  
  // 4. TOP CATEGORIES (current month)
  const categoryMap = new Map<string, { total: number; count: number }>();
  currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
    .forEach(t => {
      const cat = t.category || 'Uncategorized';
      const existing = categoryMap.get(cat) || { total: 0, count: 0 };
      categoryMap.set(cat, {
        total: existing.total + Math.abs(t.amount),
        count: existing.count + 1,
      });
    });
  
  const topCategories = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      totalAmount: stats.total,
      transactionCount: stats.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);
  
  // 5. TOP MERCHANTS (current month)
  const merchantMap = new Map<string, { total: number; count: number }>();
  currentMonthTransactions
    .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
    .forEach(t => {
      const merchant = t.merchant || 'Unknown';
      const existing = merchantMap.get(merchant) || { total: 0, count: 0 };
      merchantMap.set(merchant, {
        total: existing.total + Math.abs(t.amount),
        count: existing.count + 1,
      });
    });
  
  const topMerchants = Array.from(merchantMap.entries())
    .map(([merchant, stats]) => ({
      merchant,
      totalAmount: stats.total,
      transactionCount: stats.count,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);
  
  // 6. DATE RANGES
  const dates = allTransactions?.map(t => t.date).filter(Boolean).sort() || [];
  const firstTransactionDate = dates.length > 0 ? dates[0] : null;
  const lastTransactionDate = dates.length > 0 ? dates[dates.length - 1] : null;
  
  // 7. DEBT STATE (if debt table exists)
  let hasDebt: 'yes' | 'no' | 'unknown' = 'unknown';
  let debtTotal: number | null = null;
  
  try {
    const { data: debtData } = await supabase
      .from('debt') // VERIFY: Does this table exist?
      .select('balance')
      .eq('user_id', userId);
    
    if (debtData && debtData.length > 0) {
      hasDebt = 'yes';
      debtTotal = debtData.reduce((sum, d) => sum + (d.balance || 0), 0);
    } else {
      hasDebt = 'no';
    }
  } catch {
    // Table doesn't exist or error
    hasDebt = 'unknown';
  }
  
  // 8. GOALS STATE (if goals table exists)
  let hasGoals: 'yes' | 'no' | 'unknown' = 'unknown';
  let activeGoalCount: number | null = null;
  
  try {
    const { data: goalsData } = await supabase
      .from('goals') // VERIFY: Does this table exist?
      .select('id, status')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (goalsData) {
      activeGoalCount = goalsData.length;
      hasGoals = activeGoalCount > 0 ? 'yes' : 'no';
    } else {
      hasGoals = 'no';
    }
  } catch {
    hasGoals = 'unknown';
  }
  
  // 9. STRESS SIGNALS (simple heuristics)
  const stressSignals: StressSignal[] = [];
  
  // High uncategorized (>20% uncategorized)
  const uncategorizedRatio = transactionCount > 0 
    ? uncategorizedCount / transactionCount 
    : 0;
  if (uncategorizedRatio > 0.2 && transactionCount > 10) {
    stressSignals.push({
      type: 'high_uncategorized',
      severity: uncategorizedRatio > 0.5 ? 'high' : 'medium',
      message: `${Math.round(uncategorizedRatio * 100)}% of transactions are uncategorized`,
      suggestedAction: 'Categorize transactions to get better insights',
    });
  }
  
  // Negative cashflow
  if (netCashflow < 0 && monthlyIncome > 0) {
    stressSignals.push({
      type: 'negative_cashflow',
      severity: Math.abs(netCashflow) > monthlyIncome * 0.2 ? 'high' : 'medium',
      message: `Spending exceeds income by ${Math.abs(netCashflow).toFixed(2)} this month`,
      suggestedAction: 'Review spending patterns or set a budget',
    });
  }
  
  // Missing categories (no categories used)
  if (categoryCount === 0 && transactionCount > 5) {
    stressSignals.push({
      type: 'missing_categories',
      severity: 'medium',
      message: 'No categories assigned to transactions',
      suggestedAction: 'Set up categories to organize your expenses',
    });
  }
  
  return {
    hasTransactions,
    transactionCount,
    uncategorizedCount,
    categorizedCount,
    categoryCount,
    monthlySpend: monthlyExpenses,
    monthlyIncome,
    netCashflow,
    topCategories,
    topMerchants,
    firstTransactionDate,
    lastTransactionDate,
    hasDebt,
    debtTotal,
    hasGoals,
    activeGoalCount,
    stressSignals,
  };
}
```

### Data Needed Checklist

**✅ Available:**
- Transactions table (with all required fields)
- Categories (via transactions.category)
- Date filtering (transactions.date)
- Amount calculations (transactions.amount)
- Type filtering (transactions.type)

**⚠️ Needs Verification:**
- Debt table (`debt` table exists?)
- Goals table (`goals` table exists?)
- Spending velocity calculation (needs date grouping)

**❌ Missing (Nice to Have):**
- Budgets table (if exists, for budget vs actual)
- Recurring transactions detection
- Spending trends (month-over-month)

---

## 6️⃣ PRIME → DASHBOARD WIRING MAP

| UI Surface | Current Logic Location | New Prime Source Field | UI Consumption Point | Removal Note |
|------------|------------------------|------------------------|----------------------|--------------|
| **Sidebar Visibility** | `nav-registry.tsx` (static array) | `featureVisibilityMap['smart_import'].visible` | `DesktopSidebar.tsx` - Filter NAV_ITEMS by Prime state | Remove static visibility, use Prime map |
| **Dashboard Cards** | `dashboardCardsConfig.tsx` (hardcoded cards) | `suggestedNextAction` + `financialSnapshot` | `ConnectedDashboard.tsx` - Render cards from Prime state | Remove hardcoded card logic |
| **Dashboard Stats** | `ConnectedDashboard.tsx` (fetches stats) | `financialSnapshot` | `ConnectedDashboard.tsx` - Use Prime snapshot | Remove `fetchDashboardStats()` |
| **Onboarding Gate** | `RouteDecisionGate.tsx` (checks profile) | `currentStage === 'novice'` | `RouteDecisionGate.tsx` - Read Prime stage | Remove `onboardingRequired` logic |
| **User Status** | `user-status.ts` (segmentation) | `currentStage` | `getPrimeIntroMessage.ts` - Use Prime stage | Remove `decideUserStatus()` |
| **Chat Routing** | `router.ts` (keyword matching) | Prime routing rules (via `/chat` endpoint) | `router.ts` - Prime provides routing hints | Keep router, but Prime influences decisions |
| **Feature Access** | `useAdminAccess.ts` (checks role) | `featureVisibilityMap[feature].enabled` | Components using `useAdminAccess` - Use Prime map | Remove `hasAccess()` checks |
| **Next Action CTA** | Dashboard cards (hardcoded CTAs) | `suggestedNextAction` | `DashboardHeroRow.tsx` - Render Prime CTA | Remove hardcoded CTAs |

### Detailed Wiring Plan

#### 1. Sidebar Visibility

**Current:**
```typescript
// nav-registry.tsx
const NAV_ITEMS = [
  { label: "Smart Import AI", to: "/dashboard/smart-import-ai", ... },
  { label: "Analytics AI", to: "/dashboard/analytics-ai", ... },
  // All items always visible
];
```

**New:**
```typescript
// DesktopSidebar.tsx
const primeState = usePrimeState();
const visibleItems = NAV_ITEMS.filter(item => {
  const featureKey = routeToFeatureKey(item.to);
  return primeState?.featureVisibilityMap[featureKey]?.visible ?? true;
});
```

#### 2. Dashboard Cards

**Current:**
```typescript
// dashboardCardsConfig.tsx
export const getCoreAIToolsCards = (dashboardStats, helpers) => {
  return [
    { id: 'smart-import', title: 'Smart Import AI', ... },
    // Hardcoded cards
  ];
};
```

**New:**
```typescript
// ConnectedDashboard.tsx
const primeState = usePrimeState();
const nextAction = primeState?.suggestedNextAction;
const financialSnapshot = primeState?.financialSnapshot;

// Render cards based on Prime state
if (nextAction) {
  return <ActionCard action={nextAction} />;
}
```

#### 3. Onboarding Gate

**Current:**
```typescript
// RouteDecisionGate.tsx
const onboardingRequired = !profile.onboarding_completed;
```

**New:**
```typescript
// RouteDecisionGate.tsx
const primeState = usePrimeState();
const onboardingRequired = primeState?.currentStage === 'novice';
```

---

## 7️⃣ SAFE MIGRATION PLAN

### Phase M0: Introduce Prime Contract (Parallel, Read-Only)

**Goal**: Add Prime state endpoint + context WITHOUT changing behavior

**Steps:**
1. Create `netlify/functions/prime-state.ts` endpoint
   - Calls `buildFinancialSnapshot()`
   - Calls `getUserProfileSummary()`
   - Calls `getMemorySummary()`
   - Determines `currentStage` (novice/guided/power)
   - Builds `featureVisibilityMap` (based on current logic)
   - Returns `PrimeState`

2. Create `src/contexts/PrimeContext.tsx`
   - Fetches from `/prime-state` endpoint
   - Provides `usePrimeState()` hook
   - Refreshes every 30 seconds

3. Add `PrimeProvider` to `App.tsx`
   - Wrap dashboard routes
   - No behavior changes yet

4. Add logging to verify Prime state is populated
   - Log `primeState` in dev console
   - Verify all fields are populated

**Done Criteria:**
- ✅ `/prime-state` endpoint returns valid `PrimeState`
- ✅ `usePrimeState()` hook works in components
- ✅ No UI behavior changes
- ✅ All existing features work as before

**Rollback**: Remove `PrimeProvider` wrapper, delete endpoint

---

### Phase M1: Replace Sidebar Visibility Logic

**Goal**: Sidebar items filtered by Prime `featureVisibilityMap`

**Steps:**
1. Update `DesktopSidebar.tsx`
   - Import `usePrimeState()`
   - Filter `NAV_ITEMS` by `featureVisibilityMap`
   - Add fallback (show all if Prime state unavailable)

2. Test visibility logic
   - Free user: Some features hidden
   - Premium user: All features visible
   - Novice user: Advanced features hidden

3. Remove old visibility checks (if any)
   - Check `useAdminAccess` usage in sidebar
   - Remove redundant checks

**Done Criteria:**
- ✅ Sidebar items respect Prime visibility map
- ✅ Free/premium visibility works correctly
- ✅ No regressions in sidebar behavior

**Rollback**: Revert `DesktopSidebar.tsx` to static `NAV_ITEMS`

---

### Phase M2: Replace Dashboard Next-Action Logic

**Goal**: Dashboard cards/CTAs come from Prime `suggestedNextAction`

**Steps:**
1. Update `ConnectedDashboard.tsx`
   - Remove `fetchDashboardStats()` call
   - Use `primeState.financialSnapshot` instead
   - Render `suggestedNextAction` as primary CTA

2. Update `dashboardCardsConfig.tsx`
   - Accept `PrimeState` as parameter
   - Generate cards from Prime state
   - Keep fallback for missing state

3. Update `DashboardHeroRow.tsx`
   - Render Prime `suggestedNextAction` if available
   - Fallback to default hero if not

4. Test dashboard rendering
   - Novice user: Shows onboarding CTA
   - New user: Shows import CTA
   - Power user: Shows analytics CTA

**Done Criteria:**
- ✅ Dashboard CTAs come from Prime
- ✅ Financial stats come from Prime snapshot
- ✅ No duplicate stat fetching

**Rollback**: Restore `fetchDashboardStats()` call, revert card configs

---

### Phase M3: Consolidate Onboarding/Stage Gates

**Goal**: All stage logic uses Prime `currentStage`

**Steps:**
1. Update `RouteDecisionGate.tsx`
   - Read `primeState.currentStage` instead of `profile.onboarding_completed`
   - `currentStage === 'novice'` → redirect to onboarding

2. Update `getPrimeIntroMessage.ts`
   - Use `primeState.currentStage` instead of `decideUserStatus()`
   - Remove `user-status.ts` dependency

3. Update onboarding components
   - Read stage from Prime state
   - Update stage when onboarding completes

4. Remove `user-status.ts` (or mark deprecated)
   - Keep for backward compatibility initially
   - Remove after Phase M3 verified

**Done Criteria:**
- ✅ Onboarding gate uses Prime stage
- ✅ User segmentation uses Prime stage
- ✅ No duplicate stage logic

**Rollback**: Restore `onboardingRequired` logic in `RouteDecisionGate.tsx`

---

### Phase M4: Consolidate Chat Routing Prompts

**Goal**: Prime influences chat routing decisions

**Steps:**
1. Update `router.ts`
   - Accept `primeState` as optional parameter
   - Use Prime routing hints if available
   - Fallback to keyword matching

2. Update `/chat` endpoint
   - Fetch Prime state before routing
   - Pass Prime state to router
   - Prime can override routing decisions

3. Test routing behavior
   - Prime suggests routing based on user stage
   - Novice users → Prime routes to onboarding
   - Power users → Prime routes to specialists

**Done Criteria:**
- ✅ Chat routing considers Prime state
- ✅ Routing decisions are consistent
- ✅ No regressions in employee selection

**Rollback**: Remove Prime state parameter from router

---

### Phase M5: Remove Legacy Decision Makers

**Goal**: Delete all duplicate decision logic

**Steps:**
1. Remove `useAdminAccess.ts` feature checks
   - Replace with `featureVisibilityMap` reads
   - Update all components using `useAdminAccess`

2. Remove hardcoded card configs
   - Delete `dashboardCardsConfig.tsx` hardcoded logic
   - Keep as helper functions (accept Prime state)

3. Remove duplicate onboarding checks
   - Remove field checks in onboarding components
   - Trust Prime `currentStage`

4. Remove `user-status.ts` (if not already removed)
   - Delete file
   - Update imports

5. Audit for remaining decision makers
   - Search for `onboarding_completed` checks
   - Search for `profile.role` checks
   - Search for hardcoded feature visibility

**Done Criteria:**
- ✅ No duplicate decision logic
- ✅ All decisions go through Prime
- ✅ Single source of truth established

**Rollback**: Restore deleted files from git history

---

### Rollback Strategy

**Per-Phase Rollback:**
- Each phase has specific rollback steps
- Git commits per phase enable easy revert
- Feature flags can disable Prime integration

**Full Rollback (Emergency):**
1. Remove `PrimeProvider` from `App.tsx`
2. Restore `fetchDashboardStats()` in `ConnectedDashboard.tsx`
3. Restore `onboardingRequired` logic in `RouteDecisionGate.tsx`
4. Restore static `NAV_ITEMS` in sidebar
5. Delete `/prime-state` endpoint

**Rollback Time**: < 5 minutes (revert git commits)

---

### Single Source of Truth Checklist

**What Must Be Removed Last (Phase M5):**

- [ ] `RouteDecisionGate.tsx` - `onboardingRequired` logic
- [ ] `user-status.ts` - `decideUserStatus()` function
- [ ] `useAdminAccess.ts` - `hasAccess()` checks
- [ ] `dashboardCardsConfig.tsx` - Hardcoded card logic
- [ ] `ConnectedDashboard.tsx` - `fetchDashboardStats()`
- [ ] `DesktopSidebar.tsx` - Static `NAV_ITEMS` filtering
- [ ] `router.ts` - Independent routing decisions (keep but Prime-influenced)

**Verification:**
- Search codebase for `onboarding_completed` (should only be in Prime state builder)
- Search for `profile.role` (should only be in Prime state builder)
- Search for hardcoded feature visibility (should only be in Prime state builder)

---

## 8️⃣ IMPLEMENTATION NOTES

### Backend Endpoint: `/prime-state`

**Location**: `netlify/functions/prime-state.ts`

**Request:**
```typescript
POST /.netlify/functions/prime-state
Body: { userId: string }
```

**Response:**
```typescript
PrimeState (see interface above)
```

**Implementation:**
- Calls `buildFinancialSnapshot(userId)`
- Calls `getUserProfileSummary(userId)`
- Calls `getMemorySummary(userId)`
- Determines `currentStage` (novice/guided/power)
- Builds `suggestedNextAction`
- Builds `featureVisibilityMap`
- Returns complete `PrimeState`

### Frontend Integration

**1. Add PrimeProvider to App.tsx:**
```typescript
<PrimeProvider>
  <DashboardLayout>
    {/* ... */}
  </DashboardLayout>
</PrimeProvider>
```

**2. Use Prime State in Components:**
```typescript
const primeState = usePrimeState();
if (!primeState) return <Loading />;

const nextAction = primeState.suggestedNextAction;
const financialSnapshot = primeState.financialSnapshot;
```

**3. Update Existing Logic:**
- Replace `profile.onboarding_completed` → `primeState.currentStage === 'novice'`
- Replace `fetchDashboardStats()` → `primeState.financialSnapshot`
- Replace `hasAccess('premium')` → `primeState.featureVisibilityMap[feature].enabled`

---

## ✅ DEFINITION OF DONE

After this audit + plan:
- ✅ **ONE clear Prime brain design** - PrimeState contract defined
- ✅ **Every major decision has an owner** - Prime owns stage, visibility, next actions
- ✅ **We know exactly what to wire next** - Migration plan with 5 phases
- ✅ **The system becomes explainable** - All decisions traceable to Prime state
- ✅ **Debuggable** - Prime state visible in dev tools, logging available

---

## 📝 NEXT STEPS

1. **Verify Data Sources** (Before Phase M0):
   - Check if `debt` table exists
   - Check if `goals` table exists
   - Verify `chat_convo_summaries` table structure

2. **Implement Phase M0** (Foundation):
   - Create `/prime-state` endpoint
   - Create `PrimeContext` + `PrimeProvider`
   - Add to `App.tsx` (no behavior changes)

3. **Test Prime State** (Verification):
   - Verify all fields populate correctly
   - Test with different user types (free, premium, novice, power)
   - Log Prime state in dev console

4. **Proceed with Migration Phases** (M1 → M5):
   - Follow migration plan step-by-step
   - Test after each phase
   - Rollback if issues arise

---

**END OF AUDIT**



