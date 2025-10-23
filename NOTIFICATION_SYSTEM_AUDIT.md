# XspensesAI Notification System — Complete Audit
**Date**: October 18, 2025  
**Status**: PARTIAL IMPLEMENTATION ⚠️  
**Recommendation**: Enhance + Bridge Gap

---

## 📋 EXECUTIVE SUMMARY

| Component | Status | Notes |
|-----------|--------|-------|
| **Bell UI Component** | ✅ Exists | `AlertsBell.tsx` (simple, basic) |
| **Backend Notify Function** | ✅ Exists | `_shared/notify.ts` (minimal) |
| **Hooks/Real-time** | ✅ Partial | `useNotifications.ts` (watches `user_notifications` table) |
| **Disabled Endpoints** | 🟡 Disabled | `/alerts` + `/mark-alert-read` in `-disabled` folder |
| **Supabase Tables** | ⚠️ UNCLEAR | Referenced but not found in migrations |
| **Employee Emission** | ❌ MISSING | No employee → notification wiring |
| **Priority Levels** | ❌ MISSING | No severity/priority concept in UI |
| **Employee Tagging** | ❌ MISSING | No "which employee" field |
| **Deep-linking** | ⚠️ Partial | `href` field exists in `notify.ts` but not used in UI |
| **Mark All Read** | ❌ MISSING | Only individual mark-read exists |
| **Prime Orchestration** | ❌ MISSING | No "Have Prime Handle It" button |

---

## 🔍 **DETAILED FINDINGS**

### **1. Bell Component** ✅
**File**: `src/components/Notifications/AlertsBell.tsx` (180 lines)

**Current Features**:
- ✅ Bell icon with unread badge
- ✅ Click-to-open dropdown (basic)
- ✅ List of alerts (id, kind, title, details, created_at, read)
- ✅ Click-to-mark-read per alert
- ✅ Refresh button
- ✅ Refetch every 30 seconds

**Missing**:
- ❌ No employee tagging (no "From Byte", "From Prime" labels)
- ❌ No priority levels (only `kind`: info/warning/success)
- ❌ No deep-links (no onClick navigation)
- ❌ No "Mark All Read" button
- ❌ No grouping by priority/employee
- ❌ No "Have Prime Handle" orchestration button

**Code Quality**: 
- Functional but basic
- Hard-coded refresh interval (30s)
- No error handling for API failures

---

### **2. Backend Notify Function** ✅
**File**: `netlify/functions/_shared/notify.ts` (20 lines)

**What it does**:
```typescript
export async function notify(userId: string, payload: {
  type: 'import' | 'review' | 'system';
  title: string;
  body?: string;
  href?: string;
  meta?: any;
}) {
  // Inserts into user_notifications table
}
```

**Limitations**:
- ❌ No `employee` field (can't tag which AI sent it)
- ❌ No `priority` field (all notifications equal weight)
- ❌ Limited type enum ('import'|'review'|'system')
- ❌ No payload validation (Zod)

---

### **3. useNotifications Hook** ✅
**File**: `src/hooks/useNotifications.ts` (50 lines)

**What it does**:
- Queries `user_notifications` table on mount
- Subscribes to real-time Postgres changes (INSERT events)
- Returns `{ items, loading }`

**Limitations**:
- ❌ No field filtering (doesn't know about `employee` or `priority`)
- ❌ Assumes `user_notifications` table exists (not verified in migrations)
- ❌ No "mark read" integration
- ⚠️ Infinite subscription if component never unmounts

---

### **4. Disabled Endpoints** 🟡

#### **`netlify/functions-disabled/alerts.ts`**
- Reads from `sync_events` table (different table!)
- Returns: `{ items: SyncEvent[] }`
- **Status**: DISABLED (why?)

#### **`netlify/functions-disabled/mark-alert-read.ts`**
- Marks single alert read in `sync_events` table
- Updates `read: true`
- **Status**: DISABLED (why?)

**Critical Issue**: Two different tables! (`user_notifications` vs `sync_events`)

---

### **5. Supabase Schema** ⚠️ UNCLEAR

**Tables Referenced**:
1. `user_notifications` (used by `useNotifications.ts`)
   - Assumed columns: id, user_id, type, title, body, href, meta, created_at, read
   - **NOT FOUND** in migrations

2. `sync_events` (used by disabled functions)
   - Assumed columns: id, user_id, kind, title, details, created_at, read
   - **NOT FOUND** in migrations

3. `notifications` (used by `notificationService.ts`)
   - Schema: id, user_id, org_id, type, severity, title, message, data, action_type, action_url, channels, delivered_at, read_at, dismissed_at, created_at
   - **NOT FOUND** in migrations

**Problem**: Multiple schemas, no clear source of truth. Tables may not actually exist in your Supabase DB!

---

### **6. Employee Emission** ❌ MISSING

**Usage of `notify()`**:
```
✅ netlify/functions-disabled/normalize-transactions.ts (Lines 138, 147)
✅ netlify/functions/tools/email-fetch-attachments.ts (Line 181)
```

**Problem**: These are low-level transaction functions, NOT employee-orchestrated.

**Where employees SHOULD emit**:
- `chat-v3-production.ts` (Prime after delegation)
- `byte-ocr-parse.ts` (Byte after parsing)
- `crystal-analyze-import.ts` (Crystal after analysis)
- `categorize-transactions.ts` (Tag after categorization)

**Current Status**: ❌ Employees don't emit notifications yet

---

### **7. Disabled Employee Routing** 🟡
**File**: `netlify/functions/_shared/router.ts`

```typescript
const shortPersonas = {
  'tag-categorize': "🏷️ Tag...",
  // etc.
};
```

✅ Employee slugs are correct and normalized:
- `prime-boss` ✅
- `byte-docs` ✅
- `tag-categorizer` ✅
- `crystal-analytics` ✅
- `ledger-tax` ✅
- `goalie-agent` ✅

---

## 📊 **GAP ANALYSIS**

| Requirement | Status | File | Gap |
|------------|--------|------|-----|
| Bell component | ✅ | AlertsBell.tsx | Missing employee labels, priorities, grouping |
| Unread badge | ✅ | AlertsBell.tsx | Works |
| Priority levels | ❌ | — | Not in schema or UI |
| Employee tagging | ❌ | — | Missing in notify() + schema + UI |
| Deep-linking | ⚠️ | AlertsBell.tsx | `href` field not used in onClick |
| Mark Read (single) | ✅ | AlertsBell.tsx | Works (though API disabled) |
| Mark Read (all) | ❌ | — | Missing endpoint + UI button |
| Prime Orchestration | ❌ | — | Missing "Have Prime Handle It" logic |
| Real-time updates | ✅ | useNotifications.ts | Works (if table exists) |
| Multi-table schema | ⚠️ | Various | Confusion: `user_notifications` vs `sync_events` vs `notifications` |

---

## 🎯 **ROOT CAUSES**

1. **Schema Fragmentation**: 3 different notification tables, unclear which is production
2. **Disabled Functions**: `/alerts` + `/mark-alert-read` are in `-disabled` folder (why?)
3. **No Employee Concept**: Notifications don't track which AI employee sent them
4. **No Priority Concept**: All notifications weighted equally
5. **No Orchestration**: No way for Prime to batch-handle notifications
6. **UI ↔ API Mismatch**: UI calls disabled functions; real-time hook uses different table

---

## ✅ **WHAT'S WORKING**

```
✅ Bell UI renders (basic but functional)
✅ Real-time subscription works (if user_notifications table exists)
✅ Mark single read works (if API enabled)
✅ Refresh button works
✅ Unread badge counts correctly
✅ Employee routing is normalized and ready
```

---

## ❌ **WHAT'S BROKEN/MISSING**

```
❌ Endpoints are disabled (why? uncommitted bug?)
❌ No employee tagging in schema
❌ No priority/severity in UI
❌ No "Mark All Read" button
❌ No "Have Prime Handle" orchestration
❌ No deep-linking (href ignored in UI)
❌ No grouping/sectioning by employee or priority
❌ No employees emit notifications yet
❌ Schema unclear (multiple tables, no migrations)
```

---

## 🚀 **RECOMMENDED ACTION PLAN**

### **Option A: MINIMAL FIX** (Today, 2-3 hours)
1. ✅ Re-enable `/alerts` + `/mark-alert-read` functions
2. ✅ Verify `user_notifications` OR `sync_events` table exists in Supabase
3. ✅ Add `"Mark all read"` button to AlertsBell
4. ✅ Add employee field to `notify()` function signature

### **Option B: MEDIUM UPGRADE** (Today + Tomorrow, 4-6 hours)
1. Do Option A
2. ✅ Create unified `notifications` table with proper schema:
   - id, user_id, employee, priority, title, description, href, created_at, read, payload
3. ✅ Replace AlertsBell with your new NotificationBell component (typed, grouped)
4. ✅ Add employees to emit notifications (Prime, Byte, Crystal, Tag)
5. ✅ Wire "Have Prime Handle" button (group actions → chat endpoint)

### **Option C: FULL IMPLEMENTATION** (2-3 days)
1. Do Option B
2. ✅ Create `notification_rules` + `notification_preferences` tables (user controls)
3. ✅ Add email/SMS delivery channels
4. ✅ Implement notification batching
5. ✅ Add admin dashboard for notification audit trail
6. ✅ Implement "You've been mentioned" + @-tagging

---

## 📝 **SPECIFIC EDITS NEEDED**

### **1. Schema: New or Update `notifications` Table**
```sql
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee TEXT NOT NULL, -- 'prime-boss', 'byte-docs', 'crystal-analytics', 'tag-categorizer'
  priority TEXT NOT NULL DEFAULT 'info', -- 'critical' | 'action' | 'info' | 'success'
  title TEXT NOT NULL,
  description TEXT,
  href TEXT, -- deep-link (/transactions?needsReview=true, etc)
  payload JSONB, -- action data Prime can use
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread 
  ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User sees own notifications"
  ON public.notifications FOR ALL
  USING (auth.uid() = user_id);
```

### **2. Update `notify()` Function**
```typescript
export async function notify(userId: string, payload: {
  employee: 'prime-boss' | 'byte-docs' | 'crystal-analytics' | 'tag-categorizer' | 'ledger-tax' | 'goalie-agent';
  priority?: 'critical' | 'action' | 'info' | 'success';
  title: string;
  description?: string;
  href?: string;
  meta?: Record<string, any>;
}) {
  const admin = createClient(url, key, { auth: { persistSession: false } });
  await admin.from('notifications').insert({
    user_id: userId,
    employee: payload.employee,
    priority: payload.priority || 'info',
    title: payload.title,
    description: payload.description,
    href: payload.href,
    payload: payload.meta,
    created_at: new Date().toISOString()
  });
}
```

### **3. New Endpoints**

#### **GET `/.netlify/functions/notifications`**
```typescript
// Returns user's last 50 notifications, pageable
// Query: ?page=1&limit=50&unreadOnly=false
// Response: { items: NotificationItem[], total: number }
```

#### **POST `/.netlify/functions/notifications/read`**
```typescript
// Mark single or all read
// Body: { id?: string; markAll?: boolean }
// Response: { ok: true, updated: number }
```

#### **POST `/.netlify/functions/notifications/have-prime-handle`**
```typescript
// Orchestrate actionable notifications via Prime
// Body: { notificationIds: string[] }
// Response: { handoffId: string; status: 'queued' }
```

### **4. Wire Employees to Emit**

#### **In `commit-import.ts` (after commit succeeds)**
```typescript
import { notify } from './_shared/notify';

await notify(imp.user_id, {
  employee: 'byte-docs',
  priority: 'success',
  title: `${committed} transactions imported`,
  description: `Your statement has been processed and categorized`,
  href: `/transactions?importId=${importId}`,
  meta: { importId, transactionCount: committed }
});
```

#### **In `categorize-transactions.ts` (after categorization)**
```typescript
await notify(imp.user_id, {
  employee: 'tag-categorizer',
  priority: 'success',
  title: `Categorized ${updated} transactions`,
  description: updated > 0 ? 'Auto-categorization complete' : 'No changes needed',
  href: `/transactions?importId=${importId}`,
  meta: { importId, categorized: updated }
});
```

#### **In `crystal-analyze-import.ts` (after analysis)**
```typescript
await notify(imp.user_id, {
  employee: 'crystal-analytics',
  priority: 'action',
  title: 'Crystal's Spending Insights',
  description: summary,
  href: `/dashboard/smart-import-ai?importId=${importId}`,
  meta: { importId, adviceId }
});
```

### **5. Replace AlertsBell with NotificationBell**
```typescript
// In Header.tsx or wherever bell is used:
import NotificationBell from '@/components/Notifications/NotificationBell';

<NotificationBell
  items={notifications}
  onMarkAllRead={handleMarkAllRead}
  onMarkRead={handleMarkRead}
  onRefresh={handleRefresh}
/>
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

- [ ] Verify which notification table actually exists in Supabase (user_notifications? sync_events? notifications?)
- [ ] Create/migrate `notifications` table with schema above
- [ ] Update `notify()` to include employee + priority
- [ ] Re-enable `/alerts` endpoint (or create new `GET /notifications`)
- [ ] Create `POST /notifications/read` endpoint
- [ ] Create `POST /notifications/have-prime-handle` endpoint
- [ ] Wire Byte to emit on `commit-import.ts`
- [ ] Wire Tag to emit on `categorize-transactions.ts`
- [ ] Wire Crystal to emit on `crystal-analyze-import.ts`
- [ ] Replace AlertsBell with NotificationBell component
- [ ] Test: Import statement → get 3 notifications (Byte, Tag, Crystal)
- [ ] Test: Click "Have Prime Handle It" → orchestrates via chat
- [ ] Test: Mark all read works
- [ ] Test: Deep-links work (click notification → goes to correct page)

---

## 🎬 **NEXT STEP**

**Before I provide the exact implementation (SQL + functions + wiring), confirm:**

1. Which notification table should be the source of truth?
   - `user_notifications` (assumed by useNotifications.ts)?
   - `sync_events` (used by disabled functions)?
   - New unified `notifications` table?

2. Should we:
   - **Option A**: Minimal fix (re-enable existing, add employee field)?
   - **Option B**: Medium upgrade (new schema, wire employees, add grouping)?
   - **Option C**: Full implementation (notifications + preferences + channels)?

**What's your preference?**





