# NotificationBell Component — Complete Implementation Guide
**Path 2: Production-Grade Notifications**

---

## 📋 FILES PROVIDED

1. **`sql/migrations/001_create_notifications.sql`** ✅
   - Notifications table with employee_slug, priority, RLS
   - Helper functions (mark_all_read, mark_read, get_unread_count)
   - Audit table for tracking user actions

2. **`netlify/functions/_shared/notify.ts`** ✅
   - Enhanced notify() with employee + priority
   - Backward-compatible notifyLegacy() wrapper
   - Full TypeScript types

3. **`netlify/functions/notifications.ts`** ✅
   - GET /notifications (pageable, filterable)
   - POST /notifications/read (single + all)
   - POST /notifications/have-prime-handle (orchestration)
   - JWT auth + RLS enforcement

---

## 🚀 QUICK START (5 Steps)

### **Step 1: Deploy SQL Migration**
```bash
# Option A: Supabase Dashboard
# Copy-paste sql/migrations/001_create_notifications.sql into Supabase SQL editor

# Option B: psql
psql -h <host> -U postgres -d postgres -f sql/migrations/001_create_notifications.sql

# Option C: Supabase CLI
supabase migration new create_notifications
# (copy-paste the SQL)
supabase db push
```

**Verify**:
```sql
-- Should exist:
SELECT * FROM pg_tables WHERE tablename = 'notifications';
SELECT * FROM pg_type WHERE typname = 'notification_priority';
```

---

### **Step 2: Create NotificationBell Component**

Create `src/components/Notifications/NotificationBell.tsx` with the code you provided:

```typescript
// Use the NotificationBell code you gave me earlier
// File: src/components/Notifications/NotificationBell.tsx
// (already provided in your original message)
```

---

### **Step 3: Create useNotifications Hook**

Create `src/hooks/useNotifications.ts`:

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationItem } from '@/components/Notifications/NotificationBell';

export function useNotifications() {
  const { getSession } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let interval: NodeJS.Timeout;

    async function fetchNotifications() {
      try {
        const session = await getSession();
        if (!session?.access_token) return;

        const res = await fetch('/.netlify/functions/notifications?limit=50', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch notifications');

        const data = await res.json();
        if (mounted) {
          setItems(
            (data.items || []).map((n: any) => ({
              id: n.id,
              title: n.title,
              description: n.description,
              createdAt: n.created_at,
              employee: n.employee_slug,
              priority: n.priority,
              read: n.read,
              href: n.href,
              payload: n.payload,
            }))
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('[useNotifications] fetch failed', err);
        if (mounted) setLoading(false);
      }
    }

    fetchNotifications();
    // Refetch every 30 seconds
    interval = setInterval(fetchNotifications, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getSession]);

  return { items, loading };
}
```

---

### **Step 4: Replace AlertsBell in Header**

In your `src/components/layout/Header.tsx`:

```typescript
// BEFORE:
import AlertsBell from '@/components/Notifications/AlertsBell';

// AFTER:
import NotificationBell from '@/components/Notifications/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';

// In component:
function Header() {
  const { items, loading } = useNotifications();
  const { getSession } = useAuth();

  async function handleMarkAllRead() {
    const session = await getSession();
    if (!session?.access_token) return;

    await fetch('/.netlify/functions/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ markAll: true }),
    });

    // Refetch
    window.location.reload(); // or use better state management
  }

  async function handleMarkRead(id: string) {
    const session = await getSession();
    if (!session?.access_token) return;

    await fetch('/.netlify/functions/notifications/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id }),
    });

    // Refetch
    window.location.reload();
  }

  async function handleRefresh() {
    window.location.reload();
  }

  return (
    // ... existing header code ...
    <NotificationBell
      items={items}
      onMarkAllRead={handleMarkAllRead}
      onMarkRead={handleMarkRead}
      onRefresh={handleRefresh}
    />
    // ...
  );
}
```

---

### **Step 5: Wire Employees to Emit Notifications**

#### **In `netlify/functions/commit-import.ts` (Byte success notification)**

```typescript
// At the end, after successful commit:
import { notify } from './_shared/notify';

// After update succeeds:
await notify(imp.user_id, {
  employee: 'byte-docs',
  priority: 'success',
  title: `${committed} transactions imported`,
  description: `Your statement has been processed and saved`,
  href: `/dashboard/smart-import-ai?importId=${importId}`,
  meta: { importId, transactionCount: committed }
});
```

#### **In `netlify/functions/categorize-transactions.ts` (Tag success notification)**

```typescript
// At the end, after categorization succeeds:
import { notify } from './_shared/notify';

// After updates complete:
if (updates.length > 0) {
  await notify(imp.user_id, {
    employee: 'tag-ai',
    priority: 'success',
    title: `Categorized ${updates.length} transactions`,
    description: `Auto-categorization complete for your import`,
    href: `/transactions?importId=${importId}`,
    meta: { importId, categorized: updates.length }
  });
}
```

#### **In `netlify/functions/crystal-analyze-import.ts` (Crystal insights notification)**

```typescript
// After analysis completes:
import { notify } from './_shared/notify';

// After generating insights:
await notify(imp.user_id, {
  employee: 'crystal-analytics',
  priority: 'action',
  title: 'Crystal's Spending Insights',
  description: summary.slice(0, 100) + '...',
  href: `/dashboard/smart-import-ai?importId=${importId}&view=insights`,
  meta: { importId, adviceId }
});
```

---

## 🧪 TESTING

### **Test 1: Manual Notification Creation**

```bash
# Create a test notification via Supabase SQL:
INSERT INTO public.notifications (
  user_id,
  employee_slug,
  priority,
  title,
  description,
  href
) VALUES (
  'YOUR_USER_ID',
  'byte-docs',
  'success',
  'Test notification from Byte',
  'This is a test',
  '/transactions'
);
```

**Expected**: Notification appears in bell dropdown

---

### **Test 2: Mark Read**

```bash
curl -X POST http://localhost:8888/.netlify/functions/notifications/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"id": "UUID_OF_NOTIF"}'
```

**Expected**: `{ "ok": true }`

---

### **Test 3: Mark All Read**

```bash
curl -X POST http://localhost:8888/.netlify/functions/notifications/read \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"markAll": true}'
```

**Expected**: `{ "ok": true, "updated": 3 }`

---

### **Test 4: Have Prime Handle**

```bash
curl -X POST http://localhost:8888/.netlify/functions/notifications/have-prime-handle \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "notificationIds": ["UUID1", "UUID2", "UUID3"]
  }'
```

**Expected**: 
```json
{
  "ok": true,
  "handoffId": "xyz",
  "summary": "• [byte-docs] 42 transactions imported\n• [tag-ai] Categorized 42 transactions",
  "marked_read": 3
}
```

---

### **Test 5: End-to-End Flow**

1. Upload a bank statement on `/dashboard/smart-import-ai`
2. Byte processes → notification appears
3. Tag categorizes → notification appears
4. Crystal analyzes → notification appears
5. Click notification → navigates to correct page
6. Click "Have Prime Handle" → sends to Prime chat
7. Mark all read → all disappear

---

## 📊 NOTIFICATION TYPES TO EXPECT

| Employee | Example Notification | Priority |
|----------|----------------------|----------|
| **Byte** | "42 transactions imported" | success |
| **Tag** | "Categorized 42 transactions" | success |
| **Crystal** | "Crystal's Spending Insights" | action |
| **Prime** | "Your budget exceeded" | critical |
| **Ledger** | "Tax-deductible items found" | info |
| **Goalie** | "Goal updated to 95%" | info |

---

## 🔧 TROUBLESHOOTING

### **Notifications not appearing?**

1. Check user_id matches:
   ```sql
   SELECT user_id FROM public.auth.users LIMIT 1;
   ```
   Should match the `user_id` in your notifications table

2. Check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```

3. Check JWT token:
   - Add `console.log` in notifications.ts handler
   - Decode token: `jwt.io`
   - Verify `sub` claim matches `user_id`

### **API returns 401?**

- JWT token invalid or expired
- Missing Authorization header
- Token not being passed correctly from client

### **"Mark All Read" doesn't work?**

- Check function `mark_all_notifications_read` exists:
  ```sql
  SELECT * FROM pg_proc WHERE proname = 'mark_all_notifications_read';
  ```
- Check user_id parameter matches table user_id

---

## 📝 NEXT: REAL-TIME UPDATES (OPTIONAL)

To make notifications appear instantly (instead of 30s polling):

```typescript
// In useNotifications hook:
useEffect(() => {
  const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);
  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        setItems(prev => [payload.new, ...prev]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] SQL migration deployed to Supabase
- [ ] NotificationBell component created
- [ ] useNotifications hook created
- [ ] notifications.ts endpoint deployed to Netlify
- [ ] notify() calls added to commit-import.ts
- [ ] notify() calls added to categorize-transactions.ts
- [ ] notify() calls added to crystal-analyze-import.ts
- [ ] Header.tsx updated to use NotificationBell
- [ ] Tested manual notification creation
- [ ] Tested mark read (single)
- [ ] Tested mark all read
- [ ] Tested have prime handle
- [ ] Tested end-to-end flow
- [ ] Checked for any linter errors
- [ ] Deployed to production

---

## 🎬 FINAL CHECKLIST

**You now have:**
- ✅ Production-grade notification schema (employee tagging, priority levels, RLS)
- ✅ Modern NotificationBell UI component (grouped, priority-colored, orchestration button)
- ✅ Backend Netlify endpoints (fetch, mark read, Prime orchestration)
- ✅ Employee emission wiring (Byte, Tag, Crystal notify on success)
- ✅ Real-time capabilities (polling, optional: Supabase Realtime)

**This is Path 2 complete!** 🚀

For Path 3 (email/SMS channels, preferences, etc.), that's a future upgrade.






