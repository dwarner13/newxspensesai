# Unified Notify API Guide

## Overview

The `notify()` function is the primary way to send notifications to users from AI employees. Two implementations:

1. **Client-side** (`src/lib/notify.ts`) — Direct RLS-based insertion
2. **Server-side** (`netlify/functions/_shared/notify.ts`) — Service role key insertion

Both share the same TypeScript interfaces for consistency.

---

## Quick Start

### Client-Side (React Components)

```typescript
import { notify } from "@/lib/notify";

// In a React component or async handler
await notify({
  userId: user.id,
  employee: "byte-docs",
  priority: "info",
  title: "Byte finished processing your statement",
  description: `${pages} pages processed • ${failed} failed`,
  href: "/smart-import",
  payload: { pages, failed, importId },
});
```

### Server-Side (Netlify Functions)

```typescript
import { notify } from "./_shared/notify";
import { serverSupabase } from "./_shared/supabase";

export const handler: Handler = async (event) => {
  const userId = /* extract from token */;
  
  await notify({
    userId,
    employee: "crystal-analytics",
    priority: "action",
    title: "Analysis complete",
    description: "Your import is ready for review",
    href: "/smart-import",
    payload: { importId },
  });
};
```

---

## API Reference

### `notify(options): Promise<NotifyResult>`

Send a single notification.

#### Parameters

```typescript
interface NotifyOptions {
  userId: string;                    // User's UUID (auth.uid())
  employee: NotifyEmployeeSlug;      // "byte-docs" | "crystal-analytics" | "tag-ai" | etc.
  priority: NotifyPriority;          // "info" | "warning" | "action" | "urgent"
  title: string;                     // Main notification text (required)
  description?: string;              // Additional context
  href?: string;                     // Deep-link (e.g., "/smart-import?importId=xyz")
  payload?: Record<string, any>;     // Arbitrary JSON for AI orchestration
}
```

#### Returns

```typescript
interface NotifyResult {
  ok: boolean;      // true if inserted successfully
  id?: string;      // Notification UUID (if successful)
  error?: string;   // Error message (if failed)
}
```

#### Example

```typescript
const result = await notify({
  userId: "550e8400-e29b-41d4-a716-446655440000",
  employee: "tag-ai",
  priority: "action",
  title: "12 transactions need category review",
  description: "Tap to approve Tag's suggestions.",
  href: "/transactions?filter=needsReview&importId=xyz",
  payload: { needsReview: 12, importId: "xyz" },
});

if (!result.ok) {
  console.error("Failed to notify:", result.error);
} else {
  console.log("Notification sent:", result.id);
}
```

---

### `notifyBatch(items): Promise<NotifyResult>`

Send multiple notifications in a single batch.

#### Parameters

```typescript
notifyBatch: (items: NotifyOptions[]) => Promise<NotifyResult>;
```

#### Example

```typescript
const results = await notifyBatch([
  {
    userId: user.id,
    employee: "byte-docs",
    priority: "info",
    title: "PDF processed",
    payload: { pages: 5 },
  },
  {
    userId: user.id,
    employee: "tag-ai",
    priority: "warning",
    title: "Tag needs your input",
    href: "/transactions?filter=untagged",
    payload: { untagged: 42 },
  },
]);

if (!results.ok) {
  console.error("Batch failed:", results.error);
}
```

---

## Priority Levels

| Priority | Use Case | UI Styling |
|----------|----------|-----------|
| `"info"` | General FYI (parse complete, welcome) | 💙 Blue |
| `"warning"` | Attention needed (needs review, expired) | 🟡 Yellow |
| `"action"` | User action required (confirm, approve) | 🟠 Orange |
| `"urgent"` | Time-sensitive, critical (budget exceeded, error) | 🔴 Red |

---

## Employee Slugs

```typescript
type NotifyEmployeeSlug =
  | "byte-docs"        // Document processing & OCR
  | "crystal-analytics" // Financial insights & analysis
  | "tag-ai"           // Transaction categorization
  | "prime-boss"       // CEO / orchestrator
  | "ledger-tax"       // Tax & accounting
  | "goalie-agent";    // Risk & guardrails
```

---

## Integration Patterns

### Pattern 1: Post-Processing Notification

```typescript
// In byte-ocr-parse.ts (Netlify function)
import { notify } from "./_shared/notify";

export const handler: Handler = async (event) => {
  const { userId, importId } = /* extract */;
  
  try {
    const { rows } = await parseFile(/* ... */);
    
    // Success notification
    await notify({
      userId,
      employee: "byte-docs",
      priority: "info",
      title: `${rows.length} transactions parsed`,
      href: `/smart-import?importId=${importId}`,
      payload: { importId, rowCount: rows.length },
    });
  } catch (err) {
    // Error notification
    await notify({
      userId,
      employee: "byte-docs",
      priority: "urgent",
      title: "Parse failed",
      description: err.message,
      href: "/smart-import",
    });
  }
};
```

### Pattern 2: Action Request Notification

```typescript
// In categorize-transactions.ts
import { notify } from "./_shared/notify";

export const handler: Handler = async (event) => {
  const { userId, needsReview } = /* ... */;
  
  if (needsReview.length > 0) {
    await notify({
      userId,
      employee: "tag-ai",
      priority: "action",
      title: `${needsReview.length} transactions need category confirmation`,
      description: "Tap to approve or adjust Tag's suggestions.",
      href: "/transactions?filter=needsReview",
      payload: { needsReview: needsReview.length, transactionIds: needsReview },
    });
  }
};
```

### Pattern 3: Analysis Notification

```typescript
// In crystal-analyze-import.ts
import { notify } from "./_shared/notify";

export const handler: Handler = async (event) => {
  const { userId, importId, analysis } = /* ... */;
  
  await notify({
    userId,
    employee: "crystal-analytics",
    priority: analysis.alerts.length > 0 ? "warning" : "info",
    title: analysis.alerts.length > 0
      ? `Crystal found ${analysis.alerts.length} budget concerns`
      : "Crystal's analysis is ready",
    description: analysis.summary,
    href: `/insights?importId=${importId}`,
    payload: { importId, alerts: analysis.alerts, summary: analysis.summary },
  });
};
```

### Pattern 4: Batch Workflow Notifications

```typescript
// In prime-handoff.ts or orchestrate-notifications.ts
import { notifyBatch } from "./_shared/notify";

export const handler: Handler = async (event) => {
  const { userId, items } = /* ... */;
  
  // Notify for each completed subtask
  const notifications = items.map(item => ({
    userId,
    employee: item.completedBy,
    priority: item.status === "success" ? "info" : "warning",
    title: item.title,
    description: item.summary,
    href: item.deepLink,
    payload: item.metadata,
  }));
  
  await notifyBatch(notifications);
};
```

---

## Error Handling

### Client-Side

```typescript
try {
  const result = await notify({ /* ... */ });
  
  if (!result.ok) {
    // Graceful degradation — don't crash UI
    console.warn("Notification failed:", result.error);
    // Optionally: toast.warn("Could not send notification")
  } else {
    console.log("Notification sent:", result.id);
  }
} catch (err) {
  console.error("[notify] Unexpected error:", err);
  // Handle gracefully
}
```

### Server-Side

```typescript
try {
  const result = await notify({ /* ... */ });
  
  if (!result.ok) {
    safeLog("notification.failed", { error: result.error });
    // Server functions should continue even if notify fails
  } else {
    safeLog("notification.sent", { id: result.id });
  }
} catch (err) {
  safeLog("notification.error", { message: err.message });
  // Don't re-throw; notifications are non-critical
}
```

---

## Row-Level Security (RLS)

### Client-Side (RLS Enforced)

Uses the user's **access token** → RLS policies ensure:
- User can only notify **their own user_id**
- Cannot forge notifications for other users

### Server-Side (No RLS)

Uses **service role key** → Direct access, no RLS checks:
- Can notify any user (trusted code)
- Typically called from trusted Netlify functions
- Must validate `userId` carefully before calling

---

## Database Schema Reference

Notifications are stored in the `public.notifications` table:

```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_slug text not null,
  priority text not null default 'info',
  title text not null,
  description text,
  href text,
  payload jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: Users can only see their own
alter table public.notifications enable row level security;

create policy "user_can_read_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "user_can_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## Testing

### Manual Test (Client-Side)

```typescript
// In browser console or React component
import { notify } from "@/lib/notify";

await notify({
  userId: "YOUR_USER_ID_HERE",
  employee: "prime-boss",
  priority: "info",
  title: "Test notification",
  description: "This is a test",
});
```

### Manual Test (Netlify Function)

```bash
curl -X POST http://localhost:8888/.netlify/functions/test-notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "employee": "byte-docs",
    "priority": "info",
    "title": "Test from Netlify"
  }'
```

---

## Best Practices

1. **Always include `employee`** — Notifications show which AI triggered them
2. **Use `href` for actions** — Let users click directly to relevant page
3. **Keep `title` short** — ~50 chars for mobile/bell display
4. **Use `payload` sparingly** — Only for data Prime needs to orchestrate
5. **Don't notify on every event** — Batch related updates
6. **Test RLS** — Verify users can't see others' notifications
7. **Handle failures gracefully** — Notifications are not critical; app continues
8. **Use appropriate priority** — Don't overuse "urgent"
9. **Avoid spam** — Throttle duplicate notifications from same employee
10. **Log for debugging** — Use `safeLog` on server, `console` on client

---

## Troubleshooting

### Notification doesn't appear

1. Check browser console for errors
2. Verify RLS policy allows user to insert
3. Confirm `userId` matches `auth.uid()`
4. Check Supabase dashboard → `notifications` table for new rows

### RLS Permission Denied

```
Error: new row violates row-level security policy
```

**Client-side**: Ensure `userId === auth.uid()` (automatic with context)

**Server-side**: Use service role key via `serverSupabase()`

### Batch insert fails

1. Verify all items have required fields
2. Check for duplicate UUIDs
3. Ensure no circular `userId` references

---

## Migration from Legacy notify()

If using old `notifyLegacy()`:

**Before:**
```typescript
await notifyLegacy(userId, { type: "import", title: "Done" });
```

**After:**
```typescript
await notify({
  userId,
  employee: "byte-docs",
  priority: "info",
  title: "Done",
});
```

---

## Related APIs

- `GET /.netlify/functions/notifications` — Fetch user's notifications
- `POST /.netlify/functions/notifications/read` — Mark as read
- `POST /.netlify/functions/orchestrate-notifications` — Batch to Prime

See [NOTIFICATION_SYSTEM_GUIDE.md](./NOTIFICATION_SYSTEM_GUIDE.md) for full API docs.






