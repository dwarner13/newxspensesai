# 🔗 Smart Categories Dashboard – Deep-Links & Routing Guide

## Overview

The Smart Categories dashboard supports **deep-linking** for direct navigation to specific views, filters, and transactions. This enables seamless navigation from:

- Low-confidence queue notifications
- Prime Chat (/why explanations)
- Email alerts
- Analytics insights
- Transaction table context menus

---

## URL Patterns

### Base Route
```
/dashboard/smart-categories
```

### With Query Parameters

| Parameter | Type | Example | Purpose |
|-----------|------|---------|---------|
| `filter` | string | `low`, `manual`, `ai`, `rules` | Filter by confidence/source |
| `focusTx` | string | `tx-123` | Highlight specific transaction |
| `category` | string | `cat-coffee` | Filter by category |
| `tab` | string | `queue`, `rules`, `analytics` | Active tab |
| `import` | string | `imp-456` | Filter by import batch |
| `date_from` | date | `2025-10-01` | Date range start |
| `date_to` | date | `2025-10-31` | Date range end |

### Example URLs

```
# View low-confidence items
/dashboard/smart-categories?filter=low

# Focus on specific transaction
/dashboard/smart-categories?filter=low&focusTx=tx-123

# View all Coffee category items
/dashboard/smart-categories?category=cat-coffee

# Review specific import
/dashboard/smart-categories?import=imp-456&filter=ai

# Analytics for last 30 days
/dashboard/smart-categories?tab=analytics&date_from=2025-09-19&date_to=2025-10-19

# Focus on manually corrected items
/dashboard/smart-categories?filter=manual&tab=queue
```

---

## Route Configuration

### src/AppRoutes.tsx

```typescript
import { SmartCategories } from "@/pages/dashboard/SmartCategories";

export function AppRoutes() {
  return (
    <Routes>
      {/* Smart Categories with deep-link support */}
      <Route 
        path="/dashboard/smart-categories" 
        element={<SmartCategories />} 
      />
    </Routes>
  );
}
```

---

## Component Implementation

### SmartCategories.tsx with Deep-Link Support

```tsx
// src/pages/dashboard/SmartCategories.tsx

import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTagClient } from "@/ai/sdk/tagClient";
import { LowConfidenceQueue } from "@/components/transactions/LowConfidenceQueue";
import { CategorizationAnalytics } from "@/components/transactions/CategorizationAnalytics";
import { CategoryRules } from "@/components/transactions/CategoryRules";

interface PageState {
  filter: "low" | "manual" | "ai" | "rules" | "all";
  focusTx?: string;
  category?: string;
  tab: "queue" | "rules" | "analytics";
  import?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function SmartCategories() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tagClient = useTagClient();

  // Parse URL parameters
  const pageState: PageState = {
    filter: (searchParams.get("filter") as any) || "low",
    focusTx: searchParams.get("focusTx") || undefined,
    category: searchParams.get("category") || undefined,
    tab: (searchParams.get("tab") as any) || "queue",
    import: searchParams.get("import") || undefined,
    dateFrom: searchParams.get("date_from") || undefined,
    dateTo: searchParams.get("date_to") || undefined,
  };

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [focusedRow, setFocusedRow] = useState<any>(null);

  // Fetch data based on URL parameters
  useEffect(() => {
    fetchData();
  }, [pageState]);

  // Scroll to focused transaction
  useEffect(() => {
    if (pageState.focusTx && focusedRow) {
      const element = document.getElementById(`tx-${pageState.focusTx}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.classList.add("ring-2", "ring-blue-500");
      setTimeout(() => {
        element?.classList.remove("ring-2", "ring-blue-500");
      }, 3000);
    }
  }, [focusedRow, pageState.focusTx]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (pageState.filter && pageState.filter !== "all") {
        params.append("filter", pageState.filter);
      }
      if (pageState.category) {
        params.append("category", pageState.category);
      }
      if (pageState.import) {
        params.append("import", pageState.import);
      }
      if (pageState.dateFrom) {
        params.append("date_from", pageState.dateFrom);
      }
      if (pageState.dateTo) {
        params.append("date_to", pageState.dateTo);
      }

      const response = await fetch(
        `/.netlify/functions/tx-list-latest?${params.toString()}`,
        { headers: { "x-user-id": userId } }
      );

      const result = await response.json();
      setData(result.transactions || []);

      // Find and highlight focused transaction
      if (pageState.focusTx) {
        const focused = result.transactions?.find(
          (t: any) => t.id === pageState.focusTx
        );
        setFocusedRow(focused);
      }
    } catch (err) {
      console.error("[SmartCategories] Fetch error:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  // Helper: Update URL without full navigation
  function updateUrl(newParams: Partial<PageState>) {
    const updated = { ...pageState, ...newParams };
    const params = new URLSearchParams();

    Object.entries(updated).forEach(([key, value]) => {
      if (value) params.append(key, String(value));
    });

    navigate(`/dashboard/smart-categories?${params.toString()}`, {
      replace: true,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">🏷️ Smart Categories</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["low", "manual", "ai", "rules", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => updateUrl({ filter: f, focusTx: undefined })}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              pageState.filter === f
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {f === "low" && "🔍 Low Confidence"}
            {f === "manual" && "✍️ Manual"}
            {f === "ai" && "🤖 AI"}
            {f === "rules" && "⚙️ Rules"}
            {f === "all" && "📊 All"}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["queue", "rules", "analytics"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => updateUrl({ tab })}
            className={`px-4 py-2 font-medium transition ${
              pageState.tab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {tab === "queue" && "📋 Queue"}
            {tab === "rules" && "⚙️ Rules"}
            {tab === "analytics" && "📊 Analytics"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Content */}
      {!loading && (
        <>
          {pageState.tab === "queue" && (
            <LowConfidenceQueue
              rows={data}
              focusedId={pageState.focusTx}
              onSelect={(txId) => updateUrl({ focusTx: txId })}
              onClear={() => updateUrl({ focusTx: undefined })}
            />
          )}

          {pageState.tab === "rules" && (
            <CategoryRules categoryId={pageState.category} />
          )}

          {pageState.tab === "analytics" && (
            <CategorizationAnalytics
              dateFrom={pageState.dateFrom}
              dateTo={pageState.dateTo}
              categoryId={pageState.category}
            />
          )}
        </>
      )}
    </div>
  );
}
```

---

## Deep-Link Generators

### Helper Functions to Generate Links

```typescript
// src/lib/deeplinks.ts

export function smartCategoriesLink(params: {
  filter?: "low" | "manual" | "ai" | "rules" | "all";
  focusTx?: string;
  category?: string;
  tab?: "queue" | "rules" | "analytics";
  import?: string;
  dateFrom?: string;
  dateTo?: string;
}): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.append(key, String(value));
    }
  });

  return `/dashboard/smart-categories?${search.toString()}`;
}

// Usage examples
export const deeplinks = {
  // View low-confidence queue
  lowConfidenceQueue: () =>
    smartCategoriesLink({ filter: "low", tab: "queue" }),

  // Focus on specific transaction
  focusTransaction: (txId: string) =>
    smartCategoriesLink({ filter: "low", focusTx: txId }),

  // View category details
  viewCategory: (categoryId: string) =>
    smartCategoriesLink({ category: categoryId, tab: "analytics" }),

  // Review specific import
  reviewImport: (importId: string) =>
    smartCategoriesLink({ import: importId, filter: "ai" }),

  // Date range analytics
  analyticsDateRange: (from: string, to: string) =>
    smartCategoriesLink({
      tab: "analytics",
      date_from: from,
      date_to: to,
    }),

  // View manually corrected items
  manualCorrections: () =>
    smartCategoriesLink({ filter: "manual", tab: "queue" }),

  // View all rules
  allRules: () =>
    smartCategoriesLink({ tab: "rules" }),
};
```

---

## Integration Examples

### From LowConfidenceQueue (Notification)

```tsx
// When user clicks notification badge
import { deeplinks } from "@/lib/deeplinks";

function NotificationBell() {
  const handleClick = (notification: Notification) => {
    if (notification.employee === "tag-ai" && notification.context?.txId) {
      // Deep-link to specific low-confidence transaction
      window.location.href = deeplinks.focusTransaction(
        notification.context.txId
      );
    }
  };

  return (
    <button onClick={() => handleClick(notification)}>
      🔔 {lowConfidenceCount}
    </button>
  );
}
```

### From Prime Chat (/why explanation)

```tsx
// In chat message for explanation
function ChatWhy({ txId, explanation }: { txId: string; explanation: any }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <div className="bg-blue-50 rounded-lg p-3">
        <p className="font-semibold">{explanation.tx.merchant_name}</p>
        <p className="text-sm text-gray-600">
          Categorized as: {explanation.latest.category_id}
        </p>
      </div>

      <button
        onClick={() => {
          navigate(deeplinks.focusTransaction(txId));
        }}
        className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View in Smart Categories
      </button>
    </div>
  );
}
```

### From TransactionListTable (Context Menu)

```tsx
// Right-click context menu on transaction
function TransactionContextMenu({ txId, categoryId }: Props) {
  const navigate = useNavigate();

  return (
    <Menu>
      <MenuItem
        onClick={() => {
          navigate(deeplinks.focusTransaction(txId));
        }}
      >
        📊 View in Smart Categories
      </MenuItem>

      <MenuItem
        onClick={() => {
          navigate(deeplinks.viewCategory(categoryId));
        }}
      >
        🏷️ View Category Details
      </MenuItem>
    </Menu>
  );
}
```

### From Analytics (Date Range Click)

```tsx
// Click on date range in analytics chart
function AnalyticsChart({ data }: Props) {
  const navigate = useNavigate();

  const handleDateRangeSelect = (from: Date, to: Date) => {
    navigate(
      deeplinks.analyticsDateRange(
        from.toISOString().split("T")[0],
        to.toISOString().split("T")[0]
      )
    );
  };

  return (
    <LineChart
      onSelectRange={handleDateRangeSelect}
      data={data}
    />
  );
}
```

---

## URL State Persistence

### useSmartCategoriesUrl Hook

```typescript
// src/hooks/useSmartCategoriesUrl.ts

import { useSearchParams, useNavigate } from "react-router-dom";
import { useCallback } from "react";

export interface SmartCategoriesState {
  filter: "low" | "manual" | "ai" | "rules" | "all";
  focusTx?: string;
  category?: string;
  tab: "queue" | "rules" | "analytics";
  import?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useSmartCategoriesUrl() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const state: SmartCategoriesState = {
    filter: (searchParams.get("filter") as any) || "low",
    focusTx: searchParams.get("focusTx") || undefined,
    category: searchParams.get("category") || undefined,
    tab: (searchParams.get("tab") as any) || "queue",
    import: searchParams.get("import") || undefined,
    dateFrom: searchParams.get("date_from") || undefined,
    dateTo: searchParams.get("date_to") || undefined,
  };

  const updateState = useCallback(
    (updates: Partial<SmartCategoriesState>) => {
      const newState = { ...state, ...updates };
      const params = new URLSearchParams();

      Object.entries(newState).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value));
        }
      });

      navigate(`/dashboard/smart-categories?${params.toString()}`, {
        replace: true,
      });
    },
    [state, navigate]
  );

  return { state, updateState };
}

// Usage
export function SmartCategories() {
  const { state, updateState } = useSmartCategoriesUrl();

  return (
    <button onClick={() => updateState({ filter: "manual" })}>
      Show Manual
    </button>
  );
}
```

---

## Link Sharing

### Copy Link to Clipboard

```tsx
// In Smart Categories header
function SmartCategoriesHeader({ state }: Props) {
  const [copied, setCopied] = useState(false);

  const currentUrl = window.location.href;

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <h1>🏷️ Smart Categories</h1>
      <button
        onClick={handleCopyLink}
        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        title="Copy link to share"
      >
        {copied ? "✅ Copied" : "📋 Share"}
      </button>
    </div>
  );
}
```

---

## Testing Deep-Links

### Manual Test Scenarios

```bash
# Test 1: Low-confidence filter
open "http://localhost:3000/dashboard/smart-categories?filter=low"
# Expected: Shows only low-confidence transactions

# Test 2: Focus on specific transaction
open "http://localhost:3000/dashboard/smart-categories?filter=low&focusTx=tx-123"
# Expected: Shows tx-123 highlighted with blue ring

# Test 3: Category filter
open "http://localhost:3000/dashboard/smart-categories?category=cat-coffee"
# Expected: Shows all Coffee category items

# Test 4: Analytics tab with date range
open "http://localhost:3000/dashboard/smart-categories?tab=analytics&date_from=2025-10-01&date_to=2025-10-31"
# Expected: Shows analytics for Oct 1-31

# Test 5: Multiple filters
open "http://localhost:3000/dashboard/smart-categories?filter=manual&tab=queue&import=imp-456"
# Expected: Shows manually corrected items from import imp-456

# Test 6: URL persistence on refresh
# 1. Navigate to /dashboard/smart-categories?filter=low&focusTx=tx-123
# 2. Refresh page (Cmd+R)
# 3. Expected: State persists, tx-123 still focused
```

---

## Notification Deep-Links

### Emit Notifications with Deep-Links

```typescript
// src/lib/notify.ts

export async function notifyLowConfidenceFound(
  userId: string,
  count: number,
  txId?: string
) {
  await fetch("/.netlify/functions/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({
      user_id: userId,
      employee: "tag-ai",
      title: `${count} items need review`,
      message: `Low-confidence categorization detected. Review and correct to help AI improve.`,
      priority: count > 5 ? "high" : "normal",
      deeplink: txId
        ? `/dashboard/smart-categories?filter=low&focusTx=${txId}`
        : `/dashboard/smart-categories?filter=low`,
    }),
  });
}
```

---

## Accessibility

### Browser Back/Forward Navigation

```tsx
// Smart Categories component
useEffect(() => {
  const handlePopState = () => {
    // URL changed via back/forward button
    // Component re-renders with new searchParams
    console.log("User navigated via browser back/forward");
  };

  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}, []);
```

---

## Summary

| Feature | Implementation |
|---------|-----------------|
| **Base Route** | `/dashboard/smart-categories` |
| **URL Parameters** | `filter`, `focusTx`, `category`, `tab`, `import`, `date_from`, `date_to` |
| **Deep-Link Generator** | `deeplinks` object with helper functions |
| **State Hook** | `useSmartCategoriesUrl` for managing URL state |
| **Scroll to Focus** | Auto-scroll + highlight focused transaction |
| **Browser Navigation** | Back/forward button support |
| **Link Sharing** | Copy current URL to clipboard |
| **Notifications** | Emit with deep-links for quick navigation |

---

**Status:** ✅ Ready for implementation  
**Complexity:** Low (React Router built-in support)  
**User Impact:** High (seamless navigation experience)




