# Client-Side Notifications — Usage Guide

**File:** `src/lib/notifications-client.ts`  
**Status:** ✅ **READY**  
**Date:** October 19, 2025

---

## 📋 Overview

The notifications client provides:

- ✅ **Fetch notifications** — With filtering by employee, priority, read status
- ✅ **Mark read** — Single or bulk operations
- ✅ **Orchestration** — Batch delegate critical/warning items to Prime
- ✅ **Auto-polling** — Default 30s interval with React hook
- ✅ **Type safety** — Full TypeScript interfaces
- ✅ **Bearer auth** — Automatic token handling from session

---

## 🎯 Core APIs

### 1. **fetchNotifications(token, filter?)**

Get notifications with optional filtering.

```typescript
import { fetchNotifications } from "@/lib/notifications-client";

// Fetch all notifications
const result = await fetchNotifications(token);
console.log(result.items); // Notification[]
console.log(result.unreadCount); // number

// Fetch with filters
const critical = await fetchNotifications(token, {
  priority: "critical",
  read: false, // unread only
  limit: 20,
  offset: 0
});

// Fetch by employee
const crystalNotes = await fetchNotifications(token, {
  employee: "crystal-analytics",
  limit: 50
});
```

### 2. **markNotificationRead(token, id)**

Mark a single notification as read.

```typescript
import { markNotificationRead } from "@/lib/notifications-client";

const result = await markNotificationRead(token, notificationId);
if (result.ok) {
  console.log(`Marked as read: ${result.updated} notification`);
}
```

### 3. **markAllNotificationsRead(token)**

Mark all notifications as read.

```typescript
import { markAllNotificationsRead } from "@/lib/notifications-client";

const result = await markAllNotificationsRead(token);
console.log(`Marked as read: ${result.updated} notifications`);
```

### 4. **orchestrateNotifications(token, items)**

Batch delegate critical/warning items to Prime with full context.

```typescript
import { orchestrateNotifications } from "@/lib/notifications-client";

const critical = notifications.filter(n => 
  n.priority === "critical" || n.priority === "warning"
);

const result = await orchestrateNotifications(token, critical);
console.log(`Delegated to: ${result.delegations?.join(", ")}`);
```

---

## 🎣 React Hook — useNotifications()

Main hook for managing notifications in components.

### Basic Usage

```typescript
import { useNotifications } from "@/lib/notifications-client";

export function NotificationCenter() {
  const {
    notifications,      // Notification[]
    unreadCount,        // number
    isLoading,          // boolean
    error,              // string | null
    markRead,           // (id: string) => Promise
    markAllRead,        // () => Promise
    orchestrate,        // (items: Notification[]) => Promise
    refresh             // () => Promise
  } = useNotifications();

  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      {notifications.map(n => (
        <div
          key={n.id}
          onClick={() => markRead(n.id)}
          className="p-2 border rounded cursor-pointer"
        >
          <strong>{n.title}</strong>
          <p>{n.description}</p>
          <small>{n.priority}</small>
        </div>
      ))}
      
      {unreadCount > 0 && (
        <button onClick={markAllRead}>Mark All Read</button>
      )}
    </div>
  );
}
```

### With Polling Configuration

```typescript
// Poll every 10 seconds instead of default 30s
const { notifications, unreadCount } = useNotifications({
  pollInterval: 10000,  // milliseconds
  limit: 100,           // max notifications to fetch
  autoLoad: true        // auto-fetch on mount (default true)
});

// Disable polling (manual refresh only)
const { notifications, refresh } = useNotifications({
  pollInterval: 0       // disable auto-polling
});

// Trigger manual refresh
await refresh();
```

---

## 🔥 Convenience Hooks

### useUnreadNotifications()

Get only unread notifications.

```typescript
import { useUnreadNotifications } from "@/lib/notifications-client";

export function UnreadBadge() {
  const unread = useUnreadNotifications();
  
  return (
    <span className="bg-red-500 text-white rounded-full px-2">
      {unread.length}
    </span>
  );
}
```

### useNotificationsByPriority()

Filter by priority level.

```typescript
import { useNotificationsByPriority } from "@/lib/notifications-client";

export function CriticalAlerts() {
  const critical = useNotificationsByPriority("critical");
  
  if (critical.length === 0) return <div>All clear! ✓</div>;
  
  return (
    <div className="bg-red-100">
      <h2>⚠️ Critical Issues ({critical.length})</h2>
      {critical.map(n => (
        <div key={n.id}>{n.title}</div>
      ))}
    </div>
  );
}
```

### useNotificationsByEmployee()

Filter by employee.

```typescript
import { useNotificationsByEmployee } from "@/lib/notifications-client";

export function CrystalInsights() {
  const crystal = useNotificationsByEmployee("crystal-analytics");
  
  return (
    <div>
      <h3>💎 Crystal's Insights ({crystal.length})</h3>
      {crystal.map(n => (
        <div key={n.id} className="p-2 bg-blue-50 rounded">
          {n.title}
          {n.href && <a href={n.href}>View</a>}
        </div>
      ))}
    </div>
  );
}
```

### useActionableNotifications()

Get critical + warning notifications.

```typescript
import { useActionableNotifications } from "@/lib/notifications-client";

export function ActionBoard() {
  const actionable = useActionableNotifications();
  
  return (
    <div>
      <h2>Action Items ({actionable.length})</h2>
      {actionable.map(n => (
        <div key={n.id} className="p-3 border-l-4 border-yellow-500">
          <strong>{n.title}</strong>
          <p>{n.description}</p>
          {n.href && (
            <a href={n.href} className="text-blue-600">
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

## 🔔 Notification Bell Component

### Complete Example

```typescript
import { useNotifications } from "@/lib/notifications-client";
import { useState } from "react";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    orchestrate
  } = useNotifications({
    pollInterval: 15000  // Update every 15s
  });

  const [open, setOpen] = useState(false);

  const handleMarkRead = async (id: string) => {
    await markRead(id);
  };

  const handleOrchestrate = async () => {
    const critical = notifications.filter(
      n => n.priority === "critical" || n.priority === "warning"
    );
    
    if (critical.length > 0) {
      await orchestrate(critical);
      console.log(`Delegated ${critical.length} items to Prime`);
    }
  };

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold">Notifications</h2>
            <button
              onClick={markAllRead}
              className="text-sm text-blue-600 hover:underline"
            >
              Mark All Read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer ${
                    !n.read_at ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleMarkRead(n.id)}
                >
                  <div className="flex justify-between items-start">
                    <strong className="text-sm">{n.title}</strong>
                    <span className={`text-xs px-2 py-1 rounded ${
                      n.priority === "critical" ? "bg-red-200 text-red-800" :
                      n.priority === "warning" ? "bg-yellow-200 text-yellow-800" :
                      n.priority === "success" ? "bg-green-200 text-green-800" :
                      "bg-blue-200 text-blue-800"
                    }`}>
                      {n.priority}
                    </span>
                  </div>
                  
                  {n.description && (
                    <p className="text-sm text-gray-600 mt-1">{n.description}</p>
                  )}
                  
                  {n.href && (
                    <a
                      href={n.href}
                      className="text-sm text-blue-600 hover:underline mt-1 block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </a>
                  )}
                  
                  <small className="text-gray-400">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </small>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-3 border-t flex gap-2">
            <button
              onClick={handleOrchestrate}
              className="flex-1 px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
            >
              Delegate to Prime
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex-1 px-3 py-2 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Notification Dashboard

```typescript
import { useNotifications, useActionableNotifications } from "@/lib/notifications-client";

export function NotificationDashboard() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const actionable = useActionableNotifications();

  const byPriority = {
    critical: notifications.filter(n => n.priority === "critical").length,
    warning: notifications.filter(n => n.priority === "warning").length,
    info: notifications.filter(n => n.priority === "info").length,
    success: notifications.filter(n => n.priority === "success").length
  };

  const byEmployee = {
    "prime-boss": notifications.filter(n => n.employee === "prime-boss").length,
    "crystal-analytics": notifications.filter(n => n.employee === "crystal-analytics").length,
    "byte-docs": notifications.filter(n => n.employee === "byte-docs").length,
    "tag-categorizer": notifications.filter(n => n.employee === "tag-categorizer").length
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Notification Center</h1>
        <div className="grid grid-cols-4 gap-4">
          <Card title="Critical" value={byPriority.critical} color="red" />
          <Card title="Warnings" value={byPriority.warning} color="yellow" />
          <Card title="Info" value={byPriority.info} color="blue" />
          <Card title="Success" value={byPriority.success} color="green" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">By Employee</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(byEmployee).map(([emp, count]) => (
            <Card key={emp} title={emp} value={count} />
          ))}
        </div>
      </div>

      {actionable.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-2">⚠️ Action Required</h2>
          <p className="mb-3">{actionable.length} notifications need attention</p>
          <button
            onClick={markAllRead}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Mark All as Reviewed
          </button>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  color = "gray"
}: {
  title: string;
  value: number;
  color?: string;
}) {
  const bgColor =
    color === "red"
      ? "bg-red-50"
      : color === "yellow"
        ? "bg-yellow-50"
        : color === "blue"
          ? "bg-blue-50"
          : color === "green"
            ? "bg-green-50"
            : "bg-gray-50";

  const textColor =
    color === "red"
      ? "text-red-700"
      : color === "yellow"
        ? "text-yellow-700"
        : color === "blue"
          ? "text-blue-700"
          : color === "green"
            ? "text-green-700"
            : "text-gray-700";

  return (
    <div className={`${bgColor} rounded-lg p-4 text-center`}>
      <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
    </div>
  );
}
```

---

## 🔗 Orchestration Flow

```typescript
import { useNotifications } from "@/lib/notifications-client";

export function AutoDelegation() {
  const { notifications, orchestrate, markAllRead, isLoading } = useNotifications({
    pollInterval: 10000  // Check every 10 seconds
  });

  const handleAutoDelegation = async () => {
    // Get actionable items
    const actionable = notifications.filter(
      n => n.priority === "critical" || n.priority === "warning"
    );

    if (actionable.length === 0) {
      console.log("No actionable items");
      return;
    }

    // Delegate to Prime
    const result = await orchestrate(actionable);

    if (result.ok) {
      console.log(`✓ Delegated ${result.orchestrated} items`);
      console.log(`Delegated to: ${result.delegations?.join(", ")}`);

      // Mark as read after delegation
      await markAllRead();
    } else {
      console.error(`✗ Delegation failed: ${result.error}`);
    }
  };

  return (
    <div>
      <button
        onClick={handleAutoDelegation}
        disabled={isLoading}
        className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
      >
        {isLoading ? "Loading..." : "Auto-Delegate to Prime"}
      </button>
    </div>
  );
}
```

---

## 📚 Type Reference

### Notification

```typescript
interface Notification {
  id: string;
  user_id: string;
  employee: EmployeeKey;
  priority: NotificationPriority;
  title: string;
  description: string | null;
  href: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null; // ISO timestamp, null if unread
  created_at: string;
}
```

### NotificationFilter

```typescript
interface NotificationFilter {
  employee?: EmployeeKey;
  priority?: NotificationPriority;
  read?: boolean; // true = read, false = unread, undefined = all
  limit?: number;
  offset?: number;
}
```

### UseNotificationsOptions

```typescript
interface UseNotificationsOptions {
  autoLoad?: boolean;         // default true
  pollInterval?: number;      // default 30000 (ms)
  limit?: number;             // default 50
}
```

---

## ✅ Best Practices

### 1. **Don't Over-Poll**
```typescript
// ❌ Bad: Too frequent
useNotifications({ pollInterval: 1000 }); // Every 1s

// ✅ Good: Reasonable interval
useNotifications({ pollInterval: 30000 }); // Every 30s
```

### 2. **Orchestrate Strategically**
```typescript
// ❌ Bad: Orchestrate everything
await orchestrate(notifications);

// ✅ Good: Only actionable items
const actionable = notifications.filter(
  n => n.priority === "critical" || n.priority === "warning"
);
await orchestrate(actionable);
```

### 3. **Handle Errors Gracefully**
```typescript
const { error, notifications } = useNotifications();

if (error) {
  console.warn(`Failed to load notifications: ${error}`);
  // Still show cached notifications
}
```

### 4. **Deep Link to Context**
```typescript
// In NotificationBell, make title clickable too
{n.href && (
  <a href={n.href} onClick={(e) => e.stopPropagation()}>
    {n.title}
  </a>
)}
```

---

## 🚀 Deployment Checklist

- [x] `fetchNotifications` with filtering
- [x] `markNotificationRead` / `markAllNotificationsRead`
- [x] `orchestrateNotifications` for batch delegation
- [x] `useNotifications` hook with auto-polling
- [x] Convenience hooks (unread, by priority, by employee, actionable)
- [x] Full TypeScript interfaces
- [x] Bearer token auth
- [x] Error handling
- [x] Component examples

---

**Status:** ✅ Notifications client system ready for production. 🎉






