# Complete Notifications System — Reference Guide

**Status:** ✅ **FULLY IMPLEMENTED**  
**Date:** October 19, 2025  
**Last Updated:** October 19, 2025

---

## 🎯 System Overview

The XspensesAI notifications system is a **three-layer architecture**:

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: CREATION (Server)                          │
│  • notify() helper creates notifications            │
│  • Employee-tagged (prime-boss, crystal, etc.)      │
│  • Priority-based (success, info, warning, critical)│
│  • Deep-linkable with payloads                      │
└─────────────────────────────────────────────────────┘
                        ↓
        (Persisted in Supabase: notifications table)
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 2: RETRIEVAL & MANAGEMENT (Server → Client)  │
│  • notifications-get: Fetch with filtering          │
│  • notifications-read: Mark single/all read         │
│  • notifications-orchestrate: Batch delegate        │
│  • Bearer token auth (from session)                 │
└─────────────────────────────────────────────────────┘
                        ↓
        (Consumed by React via useNotifications hook)
                        ↓
┌─────────────────────────────────────────────────────┐
│ Layer 3: DISPLAY & INTERACTION (Client)             │
│  • useNotifications() hook (auto-polling)           │
│  • useUnreadNotifications() convenience             │
│  • useNotificationsByPriority/Employee()            │
│  • useActionableNotifications()                     │
│  • NotificationBell component + Dashboard           │
└─────────────────────────────────────────────────────┘
```

---

## 📦 Files & Components

### Server (Creation & Persistence)

| File | Purpose | Key Exports |
|------|---------|------------|
| `src/lib/notify.ts` | Create notifications | `notify()`, `notifyPrime()`, `notifyCrystal()`, etc. |

### Server (Retrieval & Management)

| File | Purpose | Endpoint |
|------|---------|----------|
| `netlify/functions/notifications-get.ts` | Fetch with filtering | `GET /.netlify/functions/notifications-get` |
| `netlify/functions/notifications-read.ts` | Mark read (single/all) | `POST /.netlify/functions/notifications-read` |
| `netlify/functions/notifications-orchestrate.ts` | Batch delegate | `POST /.netlify/functions/notifications-orchestrate` |

### Client (Retrieval & Display)

| File | Purpose | Key Exports |
|------|---------|------------|
| `src/lib/notifications-client.ts` | Client API + hooks | `useNotifications()`, `fetchNotifications()`, etc. |

### UI Components (TBD - for you to integrate)

| Component | Location | Purpose |
|-----------|----------|---------|
| `NotificationBell` | `src/ui/components/NotificationBell.tsx` | Header notification dropdown |
| `NotificationDashboard` | `src/pages/dashboard/NotificationDashboard.tsx` | Full notification center page |

---

## 🚀 Quick Start Examples

### 1. Create a Notification (Server-side)

```typescript
import { notify, notifyPrime, notifyCrystal } from "@/lib/notify";

// Generic notify
await notify({
  userId: user.id,
  employee: "prime-boss",
  priority: "success",
  title: "Maintenance Complete",
  description: "Rules sync and index refresh finished."
});

// OR use convenience helper
await notifyPrime("Maintenance Complete", "Rules sync finished", {
  priority: "success"
});

// Crystal insight
await notifyCrystal("Spending Spike", "Dining up 28% WoW", {
  href: "/analytics?insight=spike-dining",
  payload: { category: "Dining", delta: 0.28 }
});
```

### 2. Fetch Notifications (React Component)

```typescript
import { useNotifications } from "@/lib/notifications-client";

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    orchestrate,
    refresh
  } = useNotifications({
    pollInterval: 30000,  // Poll every 30s
    limit: 50
  });

  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      {notifications.map(n => (
        <div key={n.id} onClick={() => markRead(n.id)}>
          <strong>{n.title}</strong>
          <p>{n.description}</p>
        </div>
      ))}
      {unreadCount > 0 && (
        <button onClick={markAllRead}>Mark All Read</button>
      )}
    </div>
  );
}
```

### 3. Fetch Specific Notifications

```typescript
import { useUnreadNotifications, useNotificationsByEmployee } from "@/lib/notifications-client";

// Unread only
const unread = useUnreadNotifications();

// By employee
const crystalNotes = useNotificationsByEmployee("crystal-analytics");

// By priority
const critical = useNotificationsByPriority("critical");

// Actionable (critical + warning)
const actionable = useActionableNotifications();
```

### 4. Orchestrate (Delegate to Prime)

```typescript
const { notifications, orchestrate } = useNotifications();

const handleDelegation = async () => {
  const critical = notifications.filter(
    n => n.priority === "critical" || n.priority === "warning"
  );
  
  const result = await orchestrate(critical);
  console.log(`Delegated ${result.orchestrated} items to Prime`);
};
```

---

## 🏛️ Database Schema

### notifications table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee TEXT NOT NULL, -- "prime-boss", "crystal-analytics", etc.
  priority TEXT NOT NULL, -- "success", "info", "warning", "critical"
  title TEXT NOT NULL,    -- Max 255 chars
  description TEXT,       -- Max 1000 chars
  href TEXT,              -- Optional deep link
  payload JSONB,          -- Optional metadata
  read_at TIMESTAMP,      -- NULL = unread, timestamp = read
  created_at TIMESTAMP DEFAULT now(),
  
  -- Indexes for common queries
  UNIQUE(id),
  INDEX(user_id),
  INDEX(user_id, read_at),  -- For "unread count"
  INDEX(user_id, employee),
  INDEX(user_id, priority),
  INDEX(created_at DESC)
);

-- RLS Policy: Users can only see their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## 🔐 Authentication & Authorization

### Bearer Token Flow

1. **Client has session:**
   ```typescript
   const { session } = useAuth(); // from Supabase auth
   const token = session.access_token;
   ```

2. **Client sends bearer token:**
   ```typescript
   fetch(endpoint, {
     headers: { Authorization: `Bearer ${token}` }
   });
   ```

3. **Server extracts and verifies:**
   ```typescript
   const authHeader = event.headers["authorization"] || "";
   const token = authHeader.replace(/^Bearer\s+/i, "");
   
   const supabase = createClient(URL, ANON_KEY);
   const { data: { user } } = await supabase.auth.getUser(token);
   const user_id = user?.id;
   ```

4. **All queries scoped to user_id:**
   ```typescript
   await supabase
     .from("notifications")
     .select("*")
     .eq("user_id", user_id)  // RLS enforced
   ```

---

## 📊 API Reference

### 1. notifications-get

**Endpoint:** `GET /.netlify/functions/notifications-get`

**Query Params:**
```
?employee=crystal-analytics    // Filter by employee
&priority=critical             // Filter by priority
&read=false                    // false=unread, true=read, omit=all
&limit=50                      // Default 50, max 200
&offset=0                      // Pagination offset
```

**Example:**
```bash
curl -X GET "...?employee=crystal-analytics&read=false&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "items": [ { "id": "...", "title": "...", "priority": "...", ... } ],
  "unreadCount": 5,
  "total": 12
}
```

### 2. notifications-read

**Endpoint:** `POST /.netlify/functions/notifications-read`

**Request Bodies:**
```json
// Mark single
{ "id": "notification-uuid" }

// Mark all
{ "all": true }
```

**Response:**
```json
{ "ok": true, "updated": 1 }
```

### 3. notifications-orchestrate

**Endpoint:** `POST /.netlify/functions/notifications-orchestrate`

**Request Body:**
```json
{
  "items": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "employee": "crystal-analytics",
      "priority": "critical",
      "title": "Budget Alert",
      "description": "...",
      "href": "/budgets/dining",
      "payload": null,
      "read_at": null,
      "created_at": "2024-10-19T12:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "orchestrated": 1,
  "delegations": ["prime-boss"],
  "summary": "📋 **Orchestrated Notification Summary**\n..."
}
```

---

## 🎣 React Hooks Reference

### useNotifications(options?)

Main hook for notification management.

```typescript
const {
  notifications,      // Notification[]
  unreadCount,        // number
  isLoading,          // boolean
  error,              // string | null
  markRead,           // (id: string) => Promise<MarkReadResponse>
  markAllRead,        // () => Promise<MarkReadResponse>
  orchestrate,        // (items: Notification[]) => Promise<OrchestrateResponse>
  refresh             // () => Promise<void>
} = useNotifications({
  autoLoad: true,           // default true
  pollInterval: 30000,      // ms, default 30000
  limit: 50                 // default 50
});
```

**Example:**
```typescript
// Fetch and poll every 10 seconds
const { notifications, unreadCount } = useNotifications({
  pollInterval: 10000
});

// Manual refresh only (no polling)
const { notifications, refresh } = useNotifications({
  pollInterval: 0
});
await refresh();
```

### useUnreadNotifications(options?)

Get only unread notifications (convenience hook).

```typescript
const unread = useUnreadNotifications();
// Returns: Notification[] (filtered to read_at === null)
```

### useNotificationsByPriority(priority, options?)

Filter by priority level.

```typescript
const critical = useNotificationsByPriority("critical");
const warnings = useNotificationsByPriority("warning");
```

### useNotificationsByEmployee(employee, options?)

Filter by AI employee.

```typescript
const crystalNotes = useNotificationsByEmployee("crystal-analytics");
const primeNotes = useNotificationsByEmployee("prime-boss");
```

### useActionableNotifications(options?)

Get critical + warning notifications only.

```typescript
const actionable = useActionableNotifications();
// Returns: Notification[] where priority is "critical" or "warning"
```

---

## 💼 Common Usage Patterns

### Pattern 1: Notification Bell with Auto-Delegation

```typescript
import { useNotifications } from "@/lib/notifications-client";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    orchestrate
  } = useNotifications({ pollInterval: 15000 });

  const handleDelegate = async () => {
    const critical = notifications.filter(
      n => n.priority === "critical" || n.priority === "warning"
    );
    
    if (critical.length > 0) {
      await orchestrate(critical);
      console.log(`✓ Delegated ${critical.length} items to Prime`);
    }
  };

  return (
    <div className="relative">
      <button className="relative">
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5">
            {unreadCount}
          </span>
        )}
      </button>
      
      <div className="dropdown">
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className="p-3 hover:bg-gray-50 cursor-pointer"
          >
            <strong>{n.title}</strong>
            {n.href && <a href={n.href}>→ View</a>}
          </div>
        ))}
        <button onClick={handleDelegate}>
          Delegate {critical.length} to Prime
        </button>
      </div>
    </div>
  );
}
```

### Pattern 2: Dashboard Overview

```typescript
import {
  useNotifications,
  useActionableNotifications,
  useNotificationsByEmployee
} from "@/lib/notifications-client";

export function NotificationDashboard() {
  const { notifications, markAllRead } = useNotifications();
  const actionable = useActionableNotifications();
  const crystalNotes = useNotificationsByEmployee("crystal-analytics");

  const counts = {
    critical: notifications.filter(n => n.priority === "critical").length,
    warning: notifications.filter(n => n.priority === "warning").length,
    crystal: crystalNotes.length
  };

  return (
    <div className="p-6 space-y-4">
      <h1>Notification Center</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <Card label="Critical" value={counts.critical} color="red" />
        <Card label="Warnings" value={counts.warning} color="yellow" />
        <Card label="Crystal Insights" value={counts.crystal} color="blue" />
      </div>

      {actionable.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded">
          <h2>{actionable.length} action items pending</h2>
          <button onClick={markAllRead} className="mt-2">
            Mark as Reviewed
          </button>
        </div>
      )}
    </div>
  );
}
```

### Pattern 3: Employee-Specific Notifications

```typescript
import { useNotificationsByEmployee } from "@/lib/notifications-client";

export function CrystalInsights() {
  const insights = useNotificationsByEmployee("crystal-analytics");

  return (
    <div>
      <h2>💎 Crystal's Insights</h2>
      {insights.map(n => (
        <div key={n.id} className="p-3 bg-blue-50 rounded mb-2">
          <div className="font-semibold">{n.title}</div>
          <div className="text-sm text-gray-600">{n.description}</div>
          {n.href && (
            <a href={n.href} className="text-blue-600 text-sm mt-1 block">
              View Details →
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 Type Definitions

```typescript
// Priority levels
type NotificationPriority = "success" | "info" | "warning" | "critical";

// Employee identifiers
type EmployeeKey =
  | "prime-boss"
  | "crystal-analytics"
  | "byte-docs"
  | "tag-categorizer"
  | "ledger-tax"
  | "goalie-agent";

// Notification object (from DB)
interface Notification {
  id: string;
  user_id: string;
  employee: EmployeeKey;
  priority: NotificationPriority;
  title: string;                    // Max 255 chars
  description: string | null;       // Max 1000 chars
  href: string | null;              // Optional deep link
  payload: Record<string, unknown> | null;
  read_at: string | null;           // ISO timestamp or null
  created_at: string;
}

// Parameters for creating a notification
interface NotifyParams {
  employee?: EmployeeKey;           // default "prime-boss"
  priority?: NotificationPriority;  // default "info"
  title: string;                    // Required, ≤255 chars
  description?: string;             // Optional, ≤1000 chars
  href?: string;                    // Optional deep link
  payload?: Record<string, unknown>; // Optional metadata
  userId?: string;                  // Optional, auto-filled from auth
}

// Hook options
interface UseNotificationsOptions {
  autoLoad?: boolean;               // default true
  pollInterval?: number;            // ms, default 30000
  limit?: number;                   // default 50
}

// Hook return value
interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  markRead: (id: string) => Promise<MarkReadResponse>;
  markAllRead: () => Promise<MarkReadResponse>;
  orchestrate: (items: Notification[]) => Promise<OrchestrateResponse>;
  refresh: () => Promise<void>;
}
```

---

## ✅ Integration Checklist

### For Each Employee (Prime, Crystal, Byte, etc.)

- [ ] **Create notifications** when employee completes action:
  ```typescript
  await notifyPrime("Task Done", "Description", { priority: "success" });
  ```

- [ ] **Display unread count** in header/UI:
  ```typescript
  const { unreadCount } = useNotifications();
  ```

- [ ] **Show notifications** in bell dropdown:
  ```typescript
  const { notifications, markRead } = useNotifications();
  ```

- [ ] **Enable orchestration** (delegate to Prime):
  ```typescript
  const { orchestrate } = useNotifications();
  await orchestrate(critical);
  ```

### For Dashboards & Pages

- [ ] Add `NotificationBell` to header
- [ ] Add notification center page with dashboard
- [ ] Wire employee-specific notification views
- [ ] Test polling (check network tab for requests every 30s)
- [ ] Test mark read (verify UI updates)
- [ ] Test deep links (click notification → navigate to detail page)

---

## 🚨 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/invalid bearer token | Check `session.access_token` is valid |
| 403 Forbidden | Notification doesn't belong to user | Verify notification is for authenticated user |
| Empty items array | No notifications exist | Create test notification with `notify()` |
| Polling doesn't work | pollInterval too low or disabled | Check `pollInterval` >= 5000 (ms) |
| Memory leak | Hook dependencies incorrect | Review `useEffect` dependencies |
| Notifications not updating | Cache stale | Manually call `refresh()` |

---

## 📚 Documentation Files

- **Creation**: `NOTIFY_USAGE_GUIDE.md` — Creating notifications
- **Client API**: `NOTIFICATIONS_CLIENT_USAGE.md` — Hooks & helpers
- **Deployment**: `NOTIFICATIONS_ENDPOINTS_DEPLOYMENT.md` — Server functions
- **This file**: `NOTIFICATIONS_COMPLETE_SYSTEM.md` — Full system overview

---

**Status:** ✅ Complete notification system ready for integration! 🎉

**Next Steps:**
1. Deploy the 3 Netlify functions
2. Integrate `useNotifications()` hook into dashboard
3. Wire notification creation calls from each employee function
4. Test end-to-end with sample notifications
5. Monitor Netlify logs for errors






