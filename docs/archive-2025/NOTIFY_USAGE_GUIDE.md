# Notification System — Complete Usage Guide

**Status:** ✅ **READY**  
**File:** `src/lib/notify.ts`  
**Date:** October 19, 2025

---

## 📋 Overview

The `notify()` helper provides a type-safe, React-friendly API for creating notifications across the XspensesAI platform. Notifications are:

- ✅ **Employee-tagged** — Associated with specific AI agents (Prime, Crystal, Byte, Tag, Ledger, Goalie)
- ✅ **Priority-based** — Success, Info, Warning, Critical
- ✅ **Deep-linkable** — Optional `href` for navigation
- ✅ **Metadata-rich** — Custom `payload` for contextual data
- ✅ **RLS-protected** — User-scoped via Supabase

---

## 🎯 Priority Levels

| Priority | Use Case | Color | Icon | Example |
|----------|----------|-------|------|---------|
| **success** | Task completed | 🟢 Green | ✓ | Rules synced, import finished |
| **info** | Informational | 🔵 Blue | ℹ️ | New insight found, status update |
| **warning** | Alert/caution | 🟡 Yellow | ⚠️ | Budget alert, low confidence |
| **critical** | Urgent action | 🔴 Red | ✕ | Payment failed, blocked operation |

---

## 💡 Quick Examples

### Success Notification (Task Complete)

```typescript
// Prime: Maintenance task finished
await notify({
  userId: user.id,
  employee: "prime-boss",
  priority: "success",
  title: "Prime finished today's maintenance tasks",
  description: "Rules sync and index refresh completed."
});

// OR use convenience helper
await notifyPrime("Maintenance Complete", "Rules sync finished", {
  priority: "success"
});
```

### Info Notification (Insight)

```typescript
// Crystal: Spending spike detected
await notify({
  userId: user.id,
  employee: "crystal-analytics",
  priority: "info",
  title: "Crystal found a spending spike in Dining",
  description: "Up 28% WoW. View insight.",
  href: "/analytics?insight=spike-dining",
  payload: { category: "Dining", delta: 0.28 }
});

// OR use convenience helper
await notifyCrystal("Spending Spike", "Dining up 28% WoW", {
  href: "/analytics?insight=spike-dining",
  payload: { category: "Dining", delta: 0.28 }
});
```

### Warning Notification (Alert)

```typescript
// Tag: Categorization issue
await notify({
  userId: user.id,
  employee: "tag-categorizer",
  priority: "warning",
  title: "Low Confidence Categorizations",
  description: "12 transactions have <60% confidence. Review recommended.",
  href: "/categories?filter=low-confidence"
});

// OR use convenience helper
await notifyWarning(
  "Low Confidence Categorizations",
  "12 transactions need review",
  "/categories?filter=low-confidence"
);
```

### Critical Notification (Urgent)

```typescript
// Byte: Document processing error
await notify({
  userId: user.id,
  employee: "byte-docs",
  priority: "critical",
  title: "Import Failed",
  description: "File size exceeds limit (>50MB). Please split and retry.",
  href: "/imports?error=true"
});

// OR use convenience helper
await notifyCritical(
  "Import Failed",
  "File size exceeds limit (>50MB)"
);
```

---

## 🤖 Employee-Specific Patterns

### Crystal Analytics (Spending Insights)

```typescript
// Spending pattern insight
await notifyCrystal("Unusual Category Spike", "Groceries +45% vs last month", {
  priority: "info",
  href: "/analytics?category=groceries",
  payload: { 
    category: "Groceries", 
    delta: 0.45, 
    period: "month-over-month" 
  }
});

// Budget warning
await notifyCrystal("Approaching Budget Limit", "Dining: $450/$500 (90%)", {
  priority: "warning",
  href: "/budgets/dining"
});

// Forecast alert
await notifyCrystal("Forecast Alert", "Based on trends, budget will exceed by $125", {
  priority: "critical",
  href: "/budgets/forecast"
});
```

### Prime Boss (Tasks & Delegation)

```typescript
// Task completion
await notifyPrime("Daily Analysis Complete", "Market trends analyzed", {
  priority: "success"
});

// Action request
await notifyPrime("Review Needed", "5 conflicting categorizations detected", {
  priority: "warning",
  href: "/categories?review=true"
});

// Delegation status
await notifyPrime("Crystal Handoff Ready", "Awaiting your sign-off on insights", {
  priority: "info",
  href: "/team/crystal-status"
});

// Maintenance notice
await notifyPrime("System Maintenance", "Cache cleared and indexes refreshed", {
  priority: "success"
});
```

### Byte Docs (Document Processing)

```typescript
// Import success
await notifyByte("Statement Successfully Imported", "143 transactions extracted", {
  priority: "success",
  href: "/imports/latest",
  payload: { transactionCount: 143, fileFormat: "pdf" }
});

// Processing complete
await notifyByte("OCR Processing Complete", "50 receipt images scanned", {
  priority: "success",
  href: "/imports/batch-123"
});

// Error occurred
await notifyByte("Import Failed", "Unreadable PDF format. Try re-scanning.", {
  priority: "critical",
  href: "/imports?error=pdf-corrupt"
});
```

### Tag Categorizer (Rules & Learning)

```typescript
// Learning milestone
await notifyTag("New Rules Learned", "8 new merchant patterns identified", {
  priority: "success",
  href: "/categories/rules"
});

// Categorization milestone
await notifyTag("Auto Rate Improved", "Now 96% auto-categorized (was 91%)", {
  priority: "info",
  href: "/analytics?metric=auto-rate"
});

// Confidence issue
await notifyTag("Categorization Review", "15 transactions with <50% confidence", {
  priority: "warning",
  href: "/categories?confidence=low"
});
```

### Ledger Tax (Compliance & Filing)

```typescript
// Report ready
await notifyLedger("Quarterly Tax Report Ready", "Q4 2024 summary prepared", {
  priority: "info",
  href: "/tax/reports/q4-2024"
});

// Compliance alert
await notifyLedger("Tax Filing Deadline", "Q4 taxes due in 7 days", {
  priority: "warning",
  href: "/tax/deadlines"
});

// Filing success
await notifyLedger("Tax Return Filed", "Estimated refund: $2,450", {
  priority: "success",
  href: "/tax/filings"
});
```

### Goalie Goals (Goal Tracking)

```typescript
// Milestone reached
await notifyGoalie("Goal Milestone!", "Emergency fund reached $5,000 target", {
  priority: "success",
  href: "/goals/emergency-fund"
});

// Progress update
await notifyGoalie("Goal On Track", "Vacation savings: 67% complete", {
  priority: "info",
  href: "/goals/vacation"
});

// Goal at risk
await notifyGoalie("Goal Off Track", "Monthly savings behind by $340", {
  priority: "warning",
  href: "/goals/monthly-savings"
});
```

---

## 🎣 React Hook Usage

### In Components

```typescript
import { useNotify } from "@/lib/notify";

export function MyComponent() {
  const { notify } = useNotify();

  const handleImportComplete = async (count: number) => {
    const result = await notify({
      employee: "byte-docs",
      priority: "success",
      title: "Import Complete",
      description: `${count} transactions imported successfully`
    });

    if (result.ok) {
      console.log(`Notification sent: ${result.id}`);
    } else {
      console.error(`Failed: ${result.error}`);
    }
  };

  return (
    <button onClick={() => handleImportComplete(50)}>
      Trigger Notification
    </button>
  );
}
```

### With Error Handling

```typescript
export function SafeNotify() {
  const { notify } = useNotify();

  const sendAlert = async () => {
    try {
      const result = await notify({
        priority: "critical",
        title: "System Alert",
        description: "Action required immediately"
      });

      if (!result.ok) {
        // Graceful fallback
        console.warn(`Notification failed: ${result.error}`);
        // Could still show toast or inline message
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  return <button onClick={sendAlert}>Send Alert</button>;
}
```

---

## 📦 Batch Notifications

### Multiple Notifications at Once

```typescript
import { notifyBatch } from "@/lib/notify";

// After large import
const results = await notifyBatch([
  {
    userId: user.id,
    employee: "byte-docs",
    priority: "success",
    title: "Import Complete",
    description: "143 transactions processed"
  },
  {
    userId: user.id,
    employee: "tag-categorizer",
    priority: "info",
    title: "Auto-Categorization Running",
    description: "Assigning categories to new transactions"
  },
  {
    userId: user.id,
    employee: "crystal-analytics",
    priority: "info",
    title: "Analysis Queued",
    description: "Will generate insights once categorization completes"
  }
]);

// Check results
results.forEach((r, i) => {
  if (r.ok) console.log(`Notification ${i} sent: ${r.id}`);
  else console.error(`Notification ${i} failed: ${r.error}`);
});
```

---

## 🔗 Deep Linking Patterns

### Query Parameters

```typescript
// Analytics insight
await notifyCrystal("Spike Alert", "Dining +28% WoW", {
  href: "/analytics?insight=spike-dining&category=Dining"
});

// Categories filter
await notifyTag("Review Needed", "Low confidence items", {
  href: "/categories?filter=low-confidence&sort=confidence-asc"
});

// Import details
await notifyByte("Statement Imported", "Latest file processed", {
  href: "/imports/latest?view=preview&sort=date-desc"
});

// Budget detail
await notifyCrystal("Budget Alert", "Dining 90% utilized", {
  href: "/budgets/dining?range=month&tab=spending"
});
```

### Payload for Context

```typescript
// Pass structured data for later retrieval
await notify({
  employee: "crystal-analytics",
  priority: "info",
  title: "Spending Analysis",
  description: "Dining category spike detected",
  href: "/analytics?id=spike-123",
  payload: {
    spendingId: "spike-123",
    category: "Dining",
    periodStart: "2024-10-01",
    periodEnd: "2024-10-15",
    delta: 0.28,
    confidence: 0.95
  }
});
```

---

## ✅ Validation & Constraints

| Field | Max Length | Required | Default |
|-------|-----------|----------|---------|
| `title` | 255 chars | ✓ | — |
| `description` | 1000 chars | ✗ | null |
| `href` | ∞ | ✗ | null |
| `payload` | ∞ (JSON) | ✗ | null |
| `employee` | — | ✗ | "prime-boss" |
| `priority` | — | ✗ | "info" |

### Error Handling

```typescript
const result = await notify({
  title: "", // ❌ Error: title is required
});
// → { ok: false, error: "title is required" }

const result = await notify({
  title: "A".repeat(300), // ❌ Error: title too long
});
// → { ok: false, error: "title must be ≤255 characters" }

const result = await notify({
  title: "Valid",
  description: "B".repeat(1500) // ❌ Error: description too long
});
// → { ok: false, error: "description must be ≤1000 characters" }
```

---

## 🔐 Security & Privacy

- ✅ **RLS Protected**: Notifications are user-scoped by `user_id`
- ✅ **No PII in Titles**: Keep titles generic; use `href` for user-specific details
- ✅ **Payload Encrypted**: If sensitive data needed, store in `payload` (encrypted in DB)
- ✅ **Server-Side Validation**: All inputs validated before insert

### Bad Practices ❌

```typescript
// DON'T include sensitive info in title
await notify({
  title: "Salary deposit: $5,000 received", // ❌ PII exposed
  description: "From employer ACME Corp"
});

// DON'T include full email
await notify({
  title: "Contact added: john.smith@example.com", // ❌ Email exposed
});
```

### Good Practices ✅

```typescript
// DO: Generic title + detailed href
await notify({
  title: "Income Received",
  description: "Deposit processed",
  href: "/transactions?type=income&id=tx-123"
});

// DO: Generic + payload for context
await notify({
  title: "Contact Added",
  href: "/contacts/john-123",
  payload: { contactId: "john-123", contactType: "employer" }
});
```

---

## 📚 Type Reference

### NotificationPriority

```typescript
type NotificationPriority = "success" | "info" | "warning" | "critical";
```

### EmployeeKey

```typescript
type EmployeeKey =
  | "prime-boss"
  | "crystal-analytics"
  | "byte-docs"
  | "tag-categorizer"
  | "ledger-tax"
  | "goalie-agent";
```

### NotifyParams

```typescript
interface NotifyParams {
  employee?: EmployeeKey; // defaults to "prime-boss"
  priority?: NotificationPriority; // defaults to "info"
  title: string; // required, ≤255 chars
  description?: string; // optional, ≤1000 chars
  href?: string; // optional deep link
  payload?: Record<string, unknown>; // optional metadata
  userId?: string; // optional (auto-filled from auth if not provided)
}
```

### NotifyResponse

```typescript
interface NotifyResponse {
  ok: boolean;
  id?: string; // notification ID if success
  error?: string; // error message if failed
}
```

---

## 🚀 Deployment Checklist

- [x] `notify()` helper in `src/lib/notify.ts`
- [x] Priority levels include "success"
- [x] Employee-scoped helpers (`notifyCrystal`, `notifyPrime`, etc.)
- [x] Batch notification support
- [x] Type safety (TypeScript interfaces)
- [x] Error handling & validation
- [x] React hook wrapper (`useNotify`)
- [x] RLS protection via Supabase
- [x] Examples for each employee

---

## 📖 Additional Resources

- **Notification Bell UI**: `src/ui/components/NotificationBell.tsx`
- **DB Schema**: `notifications` table in Supabase
- **Server Helper**: `netlify/functions/_shared/notify.ts`

---

**Status:** ✅ Notification system ready for production. All priority levels, employee patterns, and deep-linking examples documented.

🎉 **Ready to ship notifications across all AI employees!**






