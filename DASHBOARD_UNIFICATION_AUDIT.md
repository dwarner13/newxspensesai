# Dashboard Structure Unification Audit

## Step 1 & 2: Route Configuration & Current Structure Audit

### Routes Found
All routes are configured in `src/App.tsx`:
- `/dashboard/overview` → `<OverviewPage />`
- `/dashboard/planning` → `<PlanningPage />`
- `/dashboard/business` → `<BusinessPage />`
- `/dashboard/entertainment` → `<EntertainmentPage />`
- `/dashboard/reports` → `<ReportsPage />` (wrapped in Suspense)
- `/dashboard/analytics` → `<AnalyticsPage />` (wrapped in Suspense)

### Current Structure Audit

#### 1. OverviewPage (`src/pages/dashboard/OverviewPage.tsx`)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Only uses `center` prop
- **DashboardThreeColumnLayout**: ✅ Yes (via DashboardPageShell)
- **Activity Feed**: ❌ Missing - DashboardContentGrid adds it externally
- **Full-width loader**: ❌ None
- **Extra wrappers**: None
- **Issue**: Not using 3-column layout properly - missing left/right slots

#### 2. PlanningPage (`src/pages/dashboard/PlanningPage.tsx`)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Only uses `center` prop
- **DashboardThreeColumnLayout**: ✅ Yes (via DashboardPageShell)
- **Activity Feed**: ❌ Missing - DashboardContentGrid adds it externally
- **Full-width loader**: ❌ None
- **Extra wrappers**: None
- **Issue**: Not using 3-column layout properly - missing left/right slots

#### 3. BusinessPage (`src/pages/dashboard/BusinessPage.tsx`)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Only uses `center` prop
- **DashboardThreeColumnLayout**: ✅ Yes (via DashboardPageShell)
- **Activity Feed**: ❌ Missing - DashboardContentGrid adds it externally
- **Full-width loader**: ❌ None
- **Extra wrappers**: None
- **Issue**: Not using 3-column layout properly - missing left/right slots

#### 4. EntertainmentPage (`src/pages/dashboard/EntertainmentPage.tsx`)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Only uses `center` prop
- **DashboardThreeColumnLayout**: ✅ Yes (via DashboardPageShell)
- **Activity Feed**: ❌ Missing - DashboardContentGrid adds it externally
- **Full-width loader**: ❌ None
- **Extra wrappers**: None
- **Issue**: Not using 3-column layout properly - missing left/right slots

#### 5. ReportsPage (`src/pages/dashboard/ReportsPage.tsx`)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Uses `left` and `center` props
- **DashboardThreeColumnLayout**: ✅ Yes (via DashboardPageShell)
- **Activity Feed**: ❌ Missing `right` prop - DashboardContentGrid detects as workspace and skips it
- **Full-width loader**: ❌ None
- **Extra wrappers**: None
- **Issue**: Missing Activity Feed in right slot

#### 6. AnalyticsPage (`src/pages/dashboard/AnalyticsPage.tsx`)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Uses `left` and `center` props
- **DashboardThreeColumnLayout**: ✅ Yes (via DashboardPageShell)
- **Activity Feed**: ❌ Missing `right` prop - DashboardContentGrid detects as workspace and skips it
- **Full-width loader**: ❌ None
- **Extra wrappers**: None
- **Issue**: Missing Activity Feed in right slot

### Reference: SmartCategoriesPage (Canonical Structure)
- **Wrapper**: `DashboardPageShell`
- **Layout**: Uses `left`, `center`, and `right` props
- **DashboardThreeColumnLayout**: ✅ Yes
- **Activity Feed**: ✅ Present in `right` slot: `<ActivityFeedSidebar scope="smart-categories" />`
- **Structure**: Perfect example of canonical layout

## Step 3: Canonical Layout Contract

**Canonical Structure:**
```tsx
<DashboardPageShell
  left={...} // Optional: workspace panel or empty div
  center={...} // Required: main content
  right={<ActivityFeedSidebar scope="..." />} // Required: Activity Feed
/>
```

**Rules:**
1. All pages MUST use `DashboardPageShell`
2. All pages MUST provide `right` prop with `ActivityFeedSidebar`
3. Header and tabs are rendered by `DashboardHeader` (in DashboardLayout) - pages don't render them
4. No full-width loaders outside 3-column layout
5. No extra spacing wrappers (DashboardPageShell handles pt-6)

## Step 4: Required Fixes

### Fix 1-4: Overview/Planning/Business/Entertainment
- Add `right` prop with `ActivityFeedSidebar`
- Add empty `left` prop (or leave undefined - DashboardPageShell handles empty slots)

### Fix 5-6: Reports/Analytics
- Add `right` prop with `ActivityFeedSidebar`

### Fix 7: DashboardContentGrid
- Update workspace detection to exclude these 6 pages
- They now handle their own Activity Feed via DashboardPageShell

## Step 5: Tab Navigation
- ✅ Already handled by `DashboardHeader` component
- ✅ Tabs correctly highlight based on route
- ✅ Navigation works correctly

