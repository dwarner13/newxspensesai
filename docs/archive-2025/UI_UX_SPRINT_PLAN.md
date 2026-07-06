# XspensesAI — UI/UX Sprint Plan
**Date:** February 20, 2025  
**Status:** Day 0 — Analysis & Planning  
**Goal:** Map current state, identify issues, plan redesign sprint

---

## System Map

### What's Built (Backend)
✅ **Complete & Functional:**
- Employee System Unification (8 employees: Prime, Byte, Tag, Crystal, Finley, Ledger, Goalie, Blitz)
- Smart Import Phase 2 (upload → OCR → staging → commit → summary)
- Hybrid OCR Pipeline (PDF/CSV/image support with fallback)
- Finley Phase 1 Forecasting (debt payoff + savings projection)
- Tag Learning Phase 1 (saves corrections, Phase 2 auto-categorization pending)
- Memory System (session-aware recall)
- Router (async, uses registry, routes to correct employees)
- Test Suite (26 tests covering core functionality)

### Current Frontend Pages

#### Primary Pages (Active)
1. **`/dashboard`** → `ConnectedDashboard.tsx` (main dashboard)
2. **`/transactions`** → `DashboardTransactionsPage.tsx` (1701 lines — very large)
3. **`/smart-import`** → `SmartImportAI.tsx` (502 lines)
4. **`/categories`** → `SmartCategoriesPage.tsx` (AI categorization page)
5. **`/ai-categorization`** → `AICategorizationPage.tsx` (legacy categorization UI)
6. **`/chat/:employeeSlug?`** → `EmployeeChatPage.tsx` (unified chat for all employees)

#### Legacy/Duplicate Pages
- `DesktopDashboard.tsx` (standalone component, may be unused)
- `AICategorizationPage.tsx` (overlaps with `SmartCategoriesPage.tsx`)
- Multiple dashboard variants in `src/components/dashboard/`

#### Employee UI Status

| Employee | Dedicated Page | Entry Point | Chat Experience | Notes |
|----------|---------------|-------------|-----------------|-------|
| **Prime** | ❌ | ✅ (Dashboard bubble) | ✅ | Main orchestrator, appears in dashboard |
| **Crystal** | ❌ | ✅ (Chat route) | ✅ | Routes from Prime, has tools |
| **Tag** | ❌ | ✅ (Chat route) | ✅ | Routes from Prime, has learning tool |
| **Finley** | ❌ | ✅ (Chat route) | ✅ | Routes from Prime, has forecasting tools |
| **Byte** | ❌ | ✅ (Smart Import page) | ✅ | Document processing specialist |
| **Ledger** | ❌ | ✅ (Chat route) | ✅ | Tax specialist |
| **Goalie** | ❌ | ✅ (Chat route) | ✅ | Goals & budgets |
| **Blitz** | ❌ | ✅ (Chat route) | ✅ | Debt management |

**Summary:** All employees have chat experience via `EmployeeChatPage.tsx`, but **none have dedicated dashboard pages**. Prime appears as a bubble on main dashboard.

---

## Step 1: Frontend Scan Results

### Dead / Unused Components

1. **`src/components/DesktopDashboard.tsx`** — Standalone dashboard component, likely replaced by `ConnectedDashboard.tsx`
2. **`src/components/chat/_legacy/ByteDocumentChat.tsx`** — Legacy Byte chat component (marked as legacy)
3. **`src/pages/dashboard/AICategorizationPage.tsx`** — Overlaps with `SmartCategoriesPage.tsx`, likely legacy
4. **Multiple dashboard layout variants** — Need to verify which are actually used

### Duplicates / Legacy

1. **Dashboard Components:**
   - `ConnectedDashboard.tsx` (main)
   - `DesktopDashboard.tsx` (unused?)
   - Multiple dashboard layout files in `src/layouts/` and `src/components/layout/`

2. **Categorization Pages:**
   - `SmartCategoriesPage.tsx` (newer, should be primary)
   - `AICategorizationPage.tsx` (legacy, 1791 lines — very large)

3. **Chat Components:**
   - `AIEmployeeChat.tsx` (main chat component)
   - `src/components/chat/_legacy/ByteDocumentChat.tsx` (legacy Byte-specific chat)

4. **Prime UI:**
   - `DashboardPrimeChat.tsx`
   - `DashboardPrimeBubble.tsx`
   - Prime chat in `EmployeeChatPage.tsx`

### Broken / Glitchy

1. **`DashboardTransactionsPage.tsx` (1701 lines):**
   - Very large component — likely has performance issues
   - Multiple state hooks (`useState`, `useEffect`, `useMemo`) — complex state management
   - Category editing may have race conditions
   - TODO comment at line 640 for Tag tool Phase 2 integration

2. **Mobile Navigation:**
   - `MobileNav.tsx` vs `DesktopSidebar.tsx` — need to verify consistency
   - Mobile sidebar behavior may be inconsistent

3. **Smart Import:**
   - Preview table may overflow on mobile
   - Commit button states may not update correctly
   - Summary panel may not show all data

4. **Empty States:**
   - Need to verify empty states exist for all pages
   - Zero transaction states may be missing

### Inconsistent Styling

1. **Spacing:**
   - Mixed use of `p-4`, `p-6`, `p-8` — no consistent scale
   - Gap spacing varies: `gap-2`, `gap-3`, `gap-4`, `gap-6`
   - Margin inconsistencies: `mb-3`, `mb-4`, `mb-5`, `mb-6`

2. **Cards:**
   - Some use `bg-white rounded-xl shadow-sm`
   - Others use `bg-slate-50 rounded-lg border`
   - No consistent card component

3. **Colors:**
   - Mixed use of `slate`, `gray`, `blue`, `green`, `red`, `yellow`
   - No clear color system for status (success, error, warning, info)

4. **Typography:**
   - Headings vary: `text-2xl`, `text-3xl`, `text-4xl` without clear hierarchy
   - Body text: `text-sm`, `text-base` mixed inconsistently
   - No consistent label/chip styling

5. **Buttons:**
   - Multiple button styles: `bg-blue-600`, `bg-green-600`, `bg-slate-100`
   - No consistent button component
   - Loading states vary

6. **Glassmorphism:**
   - Not consistently used (found `backdrop-blur` in some places)
   - No clear pattern for when to use it

### Good Patterns to Reuse

1. **`MetricsCard.tsx`** — Good pattern for stat tiles (can be standardized)
2. **`DashboardCard.tsx`** — Base card component (can be enhanced)
3. **`ImportList.tsx`** — Clean list pattern with status chips
4. **`CategoryBreakdownChart.tsx`** — Chart component pattern (uses recharts)
5. **Status chips in `ImportList.tsx`** — Good pattern for status indicators
6. **Employee selector in `EmployeeSelector.tsx`** — Good pattern for employee switching

---

## Step 2: Ideal UI Architecture

### Proposed Page Structure

#### 1. Dashboard Home (`/dashboard`)
**Route:** `/dashboard`  
**Component:** `DashboardPage.tsx` (new, replaces `ConnectedDashboard.tsx`)

**Sections:**
- **Prime's Greeting** — Personalized welcome, quick actions
- **Financial Snapshot** — Income, expenses, net, transaction count (current month)
- **Finley Suggestion Card** — "You could save $X by..." or debt payoff tip
- **Byte Recent Uploads** — Last 3 imports with status chips
- **Crystal Insights Card** — Top spending category, trend indicator
- **Quick Actions Grid:**
  - Goals (Goalie)
  - Smart Import (Byte)
  - Transactions (Tag)
  - Smart Categories (Crystal)
  - Forecast (Finley)

**Components:**
- `DashboardGreeting.tsx` (new)
- `FinancialSnapshot.tsx` (new)
- `FinleySuggestionCard.tsx` (new)
- `RecentUploadsCard.tsx` (new)
- `CrystalInsightsCard.tsx` (new)
- `QuickActionsGrid.tsx` (new)

**Existing:** `ConnectedDashboard.tsx` (refactor into above components)

---

#### 2. Smart Import Page (`/smart-import`)
**Route:** `/smart-import`  
**Component:** `SmartImportPage.tsx` (refactor `SmartImportAI.tsx`)

**Sections:**
- **Upload Zone** — Drag & drop, file picker, camera scan
- **Parsed Preview** — Table with category suggestions, confidence scores
- **Commit Panel** — Summary, commit button, loading states
- **Fixable Issues Panel** — Unassigned categories, duplicates
- **Import History** — List of past imports (uses `ImportList.tsx`)

**Components:**
- `UploadZone.tsx` (new)
- `PreviewTable.tsx` (new, refactor from existing preview)
- `CommitPanel.tsx` (new, extract from existing)
- `IssuesPanel.tsx` (new, extract from existing)
- `ImportList.tsx` (exists, enhance)

**Existing:** `SmartImportAI.tsx` (refactor into above components)

---

#### 3. Transactions Page (`/transactions`)
**Route:** `/transactions`  
**Component:** `TransactionsPage.tsx` (refactor `DashboardTransactionsPage.tsx`)

**Sections:**
- **Filters Bar** — Month, vendor, category, account, search
- **Transaction Table** — Sortable columns, category editing, receipt preview
- **Receipt Preview Panel** — Side panel for receipt images
- **AI Chat Bubble** — "Talk to Tag / Crystal" mini chat
- **Empty State** — Friendly message when no transactions

**Components:**
- `TransactionFilters.tsx` (new)
- `TransactionTable.tsx` (new, extract from existing)
- `ReceiptPreviewPanel.tsx` (new)
- `AIChatBubble.tsx` (new, mini chat for Tag/Crystal)
- `EmptyState.tsx` (new, reusable)

**Existing:** `DashboardTransactionsPage.tsx` (1701 lines — break into above components)

---

#### 4. Smart Categories Page (`/categories`)
**Route:** `/categories`  
**Component:** `CategoriesPage.tsx` (refactor `SmartCategoriesPage.tsx`)

**Sections:**
- **Top Categories Overview** — Grid of category cards with totals
- **Trends** — Up/down indicators, percentage changes
- **AI Recommendations** — Crystal insights, Tag learning status
- **Category Insights** — Click category → see details, trends, merchants

**Components:**
- `CategoryOverview.tsx` (new)
- `CategoryCard.tsx` (new, reusable)
- `TrendIndicator.tsx` (new)
- `AIRecommendations.tsx` (new)
- `CategoryDetailsPanel.tsx` (new)

**Existing:** `SmartCategoriesPage.tsx` (refactor), `AICategorizationPage.tsx` (remove/merge)

---

#### 5. AI Employee Page (`/employees`)
**Route:** `/employees`  
**Component:** `EmployeesPage.tsx` (new)

**Sections:**
- **Employee Grid** — Cards for each employee (Prime, Crystal, Tag, Finley, etc.)
- **Employee Card** — Avatar, name, title, emoji, skills/tools, quick actions
- **Quick Actions:**
  - "Ask Finley a forecast"
  - "Ask Crystal an insight"
  - "Ask Tag about categories"

**Components:**
- `EmployeeGrid.tsx` (new)
- `EmployeeCard.tsx` (new)
- `EmployeeSkills.tsx` (new)

**Existing:** None (new page)

---

#### 6. Settings / Profile (`/settings`)
**Route:** `/settings`  
**Component:** `SettingsPage.tsx` (may exist, verify)

**Sections:**
- **Profile Editor** — Name, email, avatar upload
- **Subscription Tier UI** — Current plan, upgrade options
- **Integrations** — Spotify, Gmail, etc.
- **Preferences** — Theme, notifications

**Components:**
- `ProfileEditor.tsx` (new/verify)
- `SubscriptionCard.tsx` (new)
- `IntegrationsList.tsx` (new)

**Existing:** May exist, need to verify

---

## Step 3: Visual Style System

### Colors

**Base Palette:**
```css
--slate-50: #f8fafc
--slate-100: #f1f5f9
--slate-200: #e2e8f0
--slate-300: #cbd5e1
--slate-400: #94a3b8
--slate-500: #64748b
--slate-600: #475569
--slate-700: #334155
--slate-800: #1e293b
--slate-900: #0f172a
```

**Accent Colors:**
```css
--blue-50: #eff6ff
--blue-500: #3b82f6
--blue-600: #2563eb
--blue-700: #1d4ed8

--green-50: #f0fdf4
--green-500: #22c55e
--green-600: #16a34a

--red-50: #fef2f2
--red-500: #ef4444
--red-600: #dc2626

--yellow-50: #fefce8
--yellow-500: #eab308
--yellow-600: #ca8a04

--purple-50: #faf5ff
--purple-500: #a855f7
--purple-600: #9333ea
```

**Status Colors:**
- Success: `green-600`
- Error: `red-600`
- Warning: `yellow-600`
- Info: `blue-600`

**Background:**
- Primary: `slate-50`
- Card: `white`
- Hover: `slate-50`

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

**Usage:**
- Cards: `shadow-sm` (default), `shadow-md` (hover)
- Modals: `shadow-xl`
- Dropdowns: `shadow-lg`

### Border Radius

```css
--radius-sm: 0.375rem (6px)  // Buttons, badges
--radius-md: 0.5rem (8px)    // Inputs, small cards
--radius-lg: 0.75rem (12px)  // Cards (default)
--radius-xl: 1rem (16px)     // Large cards, modals
```

**Tailwind Classes:**
- `rounded-md` (default for cards)
- `rounded-lg` (larger cards)
- `rounded-xl` (modals, hero sections)

### Spacing Scale

**Consistent Scale:**
```css
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)      // Default padding
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)    // Card padding
--space-8: 2rem (32px)      // Section spacing
--space-12: 3rem (48px)     // Page padding
```

**Tailwind Usage:**
- Card padding: `p-6` (default), `p-4` (compact)
- Section spacing: `space-y-6` (default), `space-y-8` (large sections)
- Page padding: `p-6` (mobile), `p-8` (desktop)

### Typography

**Headings:**
```css
h1: text-4xl font-bold (36px)      // Page titles
h2: text-3xl font-bold (30px)     // Section titles
h3: text-2xl font-semibold (24px) // Card titles
h4: text-xl font-semibold (20px)   // Subsection titles
h5: text-lg font-medium (18px)    // Labels
h6: text-base font-medium (16px)   // Small labels
```

**Body:**
```css
body: text-base (16px)             // Default
small: text-sm (14px)              // Secondary text
tiny: text-xs (12px)               // Captions, metadata
```

**Labels / Chips:**
```css
chip: text-xs font-medium px-2 py-1 rounded-md
badge: text-sm font-semibold px-3 py-1 rounded-full
```

### Component Tokens

#### Card Style
```tsx
className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
```

#### Button Style
```tsx
// Primary
className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors"

// Secondary
className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors"

// Danger
className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 transition-colors"
```

#### Badge / Chip Style
```tsx
// Status chip
className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"

// Info badge
className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700"
```

### Dark Mode Palette

**Background:**
- Primary: `slate-900`
- Card: `slate-800`
- Hover: `slate-700`

**Text:**
- Primary: `slate-100`
- Secondary: `slate-400`
- Muted: `slate-500`

**Borders:**
- Default: `slate-700`
- Hover: `slate-600`

### Glassmorphism Usage

**Where to Use:**
- Navigation bars (sidebar, top nav)
- Floating action buttons
- Modal overlays
- Hero sections (optional)

**Where NOT to Use:**
- Cards (use solid backgrounds)
- Tables (use solid backgrounds)
- Forms (use solid backgrounds)

**Pattern:**
```tsx
className="bg-white/80 backdrop-blur-md border border-white/20"
```

### Chart Style

**Colors:**
- Primary: `blue-500`
- Secondary: `green-500`
- Tertiary: `purple-500`
- Warning: `yellow-500`
- Error: `red-500`

**Grid:**
- Light gray: `slate-200`
- Axis: `slate-400`

**Tooltip:**
- Background: `slate-800`
- Text: `slate-100`
- Border: `slate-700`

---

## Step 4: UI/UX Sprint Plan

### Day 1: Dashboard Overview
**Goal:** Create clean, welcoming dashboard home page

**Components to Build:**
- `DashboardGreeting.tsx` — Prime's personalized welcome
- `FinancialSnapshot.tsx` — Income, expenses, net, transaction count
- `FinleySuggestionCard.tsx` — Forecasting suggestions
- `RecentUploadsCard.tsx` — Last 3 imports
- `CrystalInsightsCard.tsx` — Top spending category, trends
- `QuickActionsGrid.tsx` — Grid of action buttons

**Pages to Update:**
- `DashboardPage.tsx` (new, replaces `ConnectedDashboard.tsx`)

**Tailwind Patterns:**
- Standardize card: `bg-white rounded-lg shadow-sm border border-slate-200 p-6`
- Standardize spacing: `space-y-6` for sections, `p-6` for cards
- Standardize typography: `text-4xl font-bold` for page title, `text-2xl font-semibold` for card titles

**API Hooks:**
- `useDashboardSnapshot()` — Fetch current month income/expenses/transactions
- `useRecentImports()` — Fetch last 3 imports
- `useFinleySuggestions()` — Get forecasting suggestions
- `useCrystalInsights()` — Get top spending category

**Test Steps:**
1. Navigate to `/dashboard`
2. See Prime's greeting with user name
3. See financial snapshot with correct numbers
4. See Finley suggestion card (if applicable)
5. See recent uploads (if any)
6. See Crystal insights card
7. Click quick action buttons → navigate to correct pages

**Stretch Goals:**
- Add animations (fade-in, slide-up)
- Add loading skeletons
- Add error states

---

### Day 2: Smart Import UI
**Goal:** Clean, intuitive import flow

**Components to Build:**
- `UploadZone.tsx` — Drag & drop, file picker, camera scan
- `PreviewTable.tsx` — Clean table with category suggestions
- `CommitPanel.tsx` — Summary, commit button, loading states
- `IssuesPanel.tsx` — Unassigned categories, duplicates

**Pages to Update:**
- `SmartImportPage.tsx` (refactor `SmartImportAI.tsx`)

**Tailwind Patterns:**
- Upload zone: `border-2 border-dashed border-slate-300 rounded-lg p-12`
- Table: `w-full text-sm` with hover states
- Status chips: Standardize from `ImportList.tsx`

**API Hooks:**
- `useSmartImport()` — Handle upload, preview, commit
- `useImportSummary()` — Get summary after commit
- `useImportIssues()` — Get fixable issues

**Test Steps:**
1. Navigate to `/smart-import`
2. Upload a PDF/CSV/image
3. See preview table with categories
4. Click "Commit Import"
5. See summary panel with totals
6. See issues panel (if any)
7. See import in history list

**Stretch Goals:**
- Add progress bar for upload
- Add OCR confidence indicators
- Add bulk category editing

---

### Day 3: Transactions UI
**Goal:** Fast, smooth transaction management

**Components to Build:**
- `TransactionFilters.tsx` — Month, vendor, category, account, search
- `TransactionTable.tsx` — Sortable columns, category editing
- `ReceiptPreviewPanel.tsx` — Side panel for receipt images
- `AIChatBubble.tsx` — Mini chat for Tag/Crystal
- `EmptyState.tsx` — Friendly empty state

**Pages to Update:**
- `TransactionsPage.tsx` (refactor `DashboardTransactionsPage.tsx` — break into components)

**Tailwind Patterns:**
- Table: `w-full text-sm` with `hover:bg-slate-50` rows
- Filters: `flex items-center gap-4` with consistent spacing
- Side panel: `w-96 bg-white border-l border-slate-200`

**API Hooks:**
- `useTransactions()` — Fetch transactions with filters
- `useUpdateCategory()` — Update transaction category
- `useReceiptPreview()` — Fetch receipt image

**Test Steps:**
1. Navigate to `/transactions`
2. See transaction table
3. Filter by month, category, vendor
4. Edit category inline
5. Click transaction → see receipt preview panel
6. Click "Talk to Tag" → see mini chat bubble
7. Test empty state (if no transactions)

**Stretch Goals:**
- Add bulk actions (select multiple, bulk categorize)
- Add export (CSV, PDF)
- Add transaction search with autocomplete

---

### Day 4: Smart Categories UI
**Goal:** Beautiful category insights

**Components to Build:**
- `CategoryOverview.tsx` — Grid of category cards
- `CategoryCard.tsx` — Reusable category card with totals, trends
- `TrendIndicator.tsx` — Up/down arrows, percentage changes
- `AIRecommendations.tsx` — Crystal insights, Tag learning status
- `CategoryDetailsPanel.tsx` — Click category → see details

**Pages to Update:**
- `CategoriesPage.tsx` (refactor `SmartCategoriesPage.tsx`)

**Tailwind Patterns:**
- Category grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Category card: Standard card with gradient accents
- Trend indicator: `text-green-600` (up), `text-red-600` (down)

**API Hooks:**
- `useCategories()` — Fetch category totals, trends
- `useCategoryDetails()` — Fetch category details (merchants, timeline)
- `useAIRecommendations()` — Get Crystal insights, Tag learning status

**Test Steps:**
1. Navigate to `/categories`
2. See category overview grid
3. See trend indicators (up/down)
4. See AI recommendations panel
5. Click category card → see details panel
6. See Tag learning status

**Stretch Goals:**
- Add category charts (spending over time)
- Add category comparison (compare two categories)
- Add category goals (set spending limits)

---

### Day 5: AI Employee Dashboards
**Goal:** Showcase each employee's capabilities

**Components to Build:**
- `EmployeeGrid.tsx` — Grid of employee cards
- `EmployeeCard.tsx` — Avatar, name, title, emoji, skills, quick actions
- `EmployeeSkills.tsx` — List of tools/skills each employee has

**Pages to Update:**
- `EmployeesPage.tsx` (new)

**Tailwind Patterns:**
- Employee grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Employee card: Standard card with emoji avatar, gradient accent
- Skills list: `flex flex-wrap gap-2` with badges

**API Hooks:**
- `useEmployees()` — Fetch all employees from registry
- `useEmployeeTools()` — Get tools for each employee

**Test Steps:**
1. Navigate to `/employees`
2. See grid of all 8 employees
3. See employee cards with avatars, names, titles
4. See skills/tools for each employee
5. Click "Ask Finley a forecast" → navigate to chat
6. Click "Ask Crystal an insight" → navigate to chat

**Stretch Goals:**
- Add employee status (online/offline)
- Add recent activity (last used)
- Add employee descriptions

---

### Day 6: Navigation (Sidebar + MobileNav)
**Goal:** Consistent, smooth navigation

**Components to Build:**
- `Sidebar.tsx` (refactor `DesktopSidebar.tsx`) — Clean sidebar with consistent styling
- `MobileNav.tsx` (refactor existing) — Bottom nav for mobile
- `NavItem.tsx` — Reusable nav item component
- `NavSection.tsx` — Reusable nav section component

**Pages to Update:**
- `App.tsx` — Ensure routes match nav items
- `DesktopSidebar.tsx` → `Sidebar.tsx`
- `MobileNav.tsx` (refactor)

**Tailwind Patterns:**
- Sidebar: `w-64 bg-white border-r border-slate-200`
- Nav item: `flex items-center gap-3 px-4 py-2 rounded-md hover:bg-slate-50`
- Active nav item: `bg-blue-50 text-blue-700`

**API Hooks:**
- `useNavigation()` — Get current route, active nav item

**Test Steps:**
1. See sidebar on desktop
2. See bottom nav on mobile
3. Click nav items → navigate correctly
4. See active state on current page
5. Test mobile sidebar toggle (if exists)

**Stretch Goals:**
- Add nav item badges (notification counts)
- Add nav item tooltips
- Add keyboard shortcuts

---

### Day 7: Polishing + Animations + Onboarding
**Goal:** Smooth, delightful experience

**Components to Build:**
- `LoadingSkeleton.tsx` — Skeleton loaders for cards, tables
- `ErrorBoundary.tsx` — Error handling component
- `Toast.tsx` — Consistent toast notifications
- `OnboardingFlow.tsx` — First-time user onboarding

**Pages to Update:**
- All pages (add loading states, error states)

**Tailwind Patterns:**
- Loading skeleton: `animate-pulse bg-slate-200 rounded`
- Toast: `bg-slate-800 text-white rounded-lg shadow-lg p-4`
- Onboarding: `fixed inset-0 bg-black/50 backdrop-blur-sm`

**API Hooks:**
- `useOnboarding()` — Track onboarding progress

**Test Steps:**
1. See loading skeletons while data loads
2. See error states if API fails
3. See toast notifications for actions
4. Test onboarding flow (first-time user)

**Stretch Goals:**
- Add page transitions (fade, slide)
- Add micro-interactions (button hover, card hover)
- Add success animations (checkmark, confetti)

---

## Step 5: Deliverables

### System Map ✅
- **What's Built:** 8 employees, Smart Import Phase 2, Hybrid OCR, Finley Phase 1, Tag Learning Phase 1, Memory System, Router, Test Suite
- **Employee UI:** All employees have chat experience, none have dedicated pages, Prime appears as bubble on dashboard
- **Pages:** 6 primary pages (`/dashboard`, `/transactions`, `/smart-import`, `/categories`, `/ai-categorization`, `/chat/:employeeSlug?`), 3+ legacy/duplicate pages

### UI Architecture Map ✅
- **Final Structure:** 6 main areas (Dashboard, Smart Import, Transactions, Smart Categories, AI Employees, Settings)
- **Routes:** Defined for each area
- **Components:** Listed for each area (existing vs new)

### Issues List ✅
- **Dead/Unused:** `DesktopDashboard.tsx`, `ByteDocumentChat.tsx` (legacy), `AICategorizationPage.tsx` (overlaps)
- **Duplicates/Legacy:** Multiple dashboard variants, categorization pages overlap, chat components duplicated
- **Broken/Glitchy:** `DashboardTransactionsPage.tsx` (1701 lines, complex state), mobile nav inconsistencies, empty states missing
- **Inconsistent Styling:** Mixed spacing, colors, typography, buttons, cards — no design system
- **Good Patterns:** `MetricsCard.tsx`, `DashboardCard.tsx`, `ImportList.tsx`, `CategoryBreakdownChart.tsx`, status chips

### Style Guide Draft ✅
- **Colors:** Base palette (slate), accent colors (blue, green, red, yellow, purple), status colors
- **Shadows:** 5-level scale (sm, md, lg, xl)
- **Border Radius:** 4-level scale (sm, md, lg, xl)
- **Spacing:** Consistent 8px scale
- **Typography:** Heading hierarchy (h1-h6), body text, labels/chips
- **Component Tokens:** Card, button, badge/chip styles
- **Dark Mode:** Palette defined
- **Glassmorphism:** Usage guidelines
- **Chart Style:** Colors, grid, tooltip

### Component List ✅
**Reusable Components to Create:**
1. `Card.tsx` — Base card component
2. `StatTile.tsx` — Stat tile (income, expenses, etc.)
3. `StatusChip.tsx` — Status indicator chip
4. `Button.tsx` — Consistent button component
5. `Badge.tsx` — Badge/chip component
6. `EmptyState.tsx` — Empty state component
7. `LoadingSkeleton.tsx` — Loading skeleton
8. `FilterBar.tsx` — Filter bar component
9. `NavItem.tsx` — Nav item component
10. `AIChatBubble.tsx` — Mini chat bubble

### Sprint Plan ✅
- **Day 1:** Dashboard Overview (6 components, 1 page)
- **Day 2:** Smart Import UI (4 components, 1 page)
- **Day 3:** Transactions UI (5 components, 1 page)
- **Day 4:** Smart Categories UI (5 components, 1 page)
- **Day 5:** AI Employee Dashboards (3 components, 1 page)
- **Day 6:** Navigation (4 components, 2 files)
- **Day 7:** Polishing + Animations + Onboarding (4 components, all pages)

### Recommended Build Order ✅
1. **Day 1 FIRST** — Dashboard sets the tone, most visible page
2. **Day 6 SECOND** — Navigation needed for all pages
3. **Day 2-5** — Core feature pages (Smart Import, Transactions, Categories, Employees)
4. **Day 7 LAST** — Polish after everything is built

### Day 1 Starting Checklist ✅
**Components to Create:**
- `src/components/dashboard/DashboardGreeting.tsx`
- `src/components/dashboard/FinancialSnapshot.tsx`
- `src/components/dashboard/FinleySuggestionCard.tsx`
- `src/components/dashboard/RecentUploadsCard.tsx`
- `src/components/dashboard/CrystalInsightsCard.tsx`
- `src/components/dashboard/QuickActionsGrid.tsx`

**Pages to Create:**
- `src/pages/dashboard/DashboardPage.tsx` (new, replaces `ConnectedDashboard.tsx`)

**Hooks to Create:**
- `src/hooks/useDashboardSnapshot.ts`
- `src/hooks/useRecentImports.ts`
- `src/hooks/useFinleySuggestions.ts`
- `src/hooks/useCrystalInsights.ts`

**Files to Touch:**
- `src/App.tsx` — Update route for `/dashboard`
- `src/components/dashboard/DashboardPage.tsx` — New main dashboard page
- `src/components/dashboard/*.tsx` — New dashboard components
- `src/hooks/*.ts` — New hooks

**API Endpoints Needed:**
- Dashboard snapshot RPC (may need to create or use existing queries)
- Recent imports query (exists)
- Finley suggestions (may need new endpoint or use chat)
- Crystal insights (may need new endpoint or use chat)

---

## Next Steps

1. **Review this plan** — Confirm structure, components, priorities
2. **Create Day 1 components** — Start with `DashboardGreeting.tsx`, `FinancialSnapshot.tsx`
3. **Set up hooks** — Create `useDashboardSnapshot.ts` hook
4. **Test Day 1** — Verify dashboard loads, shows correct data
5. **Move to Day 2** — Smart Import UI

**Ready to start Day 1?** 🚀





