# Prime Live Stats Integration

## Overview

Connected the **Prime WORKSPACE** (left panel) and **Prime — AI Command Center** (middle card) to live data from the database, replacing hardcoded values with real-time statistics.

## Files Created/Modified

### Backend
- **`netlify/functions/prime-live-stats.ts`** (NEW)
  - Netlify function endpoint: `/.netlify/functions/prime-live-stats`
  - HTTP Method: GET
  - Query param: `userId` (optional, can be extracted from auth header in future)

### Frontend
- **`src/hooks/usePrimeLiveStats.ts`** (NEW)
  - React hook that fetches and manages Prime live stats
  - Auto-refreshes every 30 seconds
  - Returns: `{ data, isLoading, isError, errorMessage, refetch }`

### Components Updated
- **`src/components/workspace/employees/PrimeWorkspacePanel.tsx`**
  - Now uses `usePrimeLiveStats` hook
  - Displays real employee online/idle/offline status
  - Shows live count: "X/Y Online" in footer

- **`src/components/workspace/employees/PrimeUnifiedCard.tsx`**
  - Now uses `usePrimeLiveStats` hook
  - Stats row shows:
    - **AI Agents**: `onlineEmployees` (with total in parentheses)
    - **Tasks Routed**: `liveTasks` (recent activity count)
    - **Success Rate**: `successRate * 100` (currently 99%)

## Data Sources

### Online Detection
**Tables Used:**
- `chat_usage_log` (primary): `employee_slug`, `created_at`
- `chat_sessions` (backup): `employee_slug`, `updated_at`

**Logic:**
- Employee is **online** if they have activity within last **10 minutes**
- Employee is **idle** if they have activity within last **1 hour** (but not 10 minutes)
- Employee is **offline** if no activity in last hour

**Activity Sources:**
1. `chat_usage_log.created_at` - Most reliable (logged on every chat completion)
2. `chat_sessions.updated_at` - Backup indicator (updated when messages are added)

### Live Tasks Count
**Table Used:**
- `chat_sessions`: `updated_at`

**Logic:**
- Counts all `chat_sessions` where `updated_at > now() - 10 minutes`
- Represents "active work" happening right now (recent chat activity)

### Employee List
**Table Used:**
- `employee_profiles`: `slug`, `title`, `emoji`, `is_active`

**Logic:**
- Fetches all employees where `is_active = true`
- Extracts name from `title` (e.g., "Byte - Document Processing Specialist" → "Byte")
- Extracts role from `title` (everything after " - ")

### Success Rate
**Current:** Hardcoded to `0.99` (99%)

**Future Enhancement:**
- Can compute from `chat_usage_log.success` column
- Formula: `(successful_tasks / total_tasks) * 100`
- Consider time window (e.g., last 24 hours or last 7 days)

## Configuration

### Activity Window Threshold

**Location:** `netlify/functions/prime-live-stats.ts`

```typescript
const ACTIVITY_WINDOW_MINUTES = 10; // Employee is "online" if activity within this window
```

**To adjust:**
1. Change `ACTIVITY_WINDOW_MINUTES` constant
2. Also update idle threshold (currently 60 minutes) if needed

### Auto-Refresh Interval

**Location:** `src/hooks/usePrimeLiveStats.ts`

```typescript
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
```

**To adjust:**
- Change `REFRESH_INTERVAL_MS` to desired milliseconds
- Recommended: 30-60 seconds for live stats

### Success Rate Calculation

**Location:** `netlify/functions/prime-live-stats.ts`

Currently hardcoded:
```typescript
const successRate = 0.99;
```

**To compute from data:**
```typescript
// Example: Compute from chat_usage_log
const { count: totalTasks } = await sb
  .from('chat_usage_log')
  .select('id', { count: 'exact', head: true })
  .gte('created_at', last24Hours.toISOString());

const { count: successfulTasks } = await sb
  .from('chat_usage_log')
  .select('id', { count: 'exact', head: true })
  .eq('success', true)
  .gte('created_at', last24Hours.toISOString());

const successRate = totalTasks > 0 ? successfulTasks / totalTasks : 0.99;
```

## Testing Checklist

### Prime WORKSPACE (Left Panel)
- [ ] Open `/dashboard/prime-chat`
- [ ] Verify employee list shows real statuses (Online/Idle/Offline)
- [ ] Send a message to Tag or Byte
- [ ] Wait 30 seconds (auto-refresh)
- [ ] Verify that employee shows "Online" status
- [ ] Check footer shows correct "X/Y Online" count

### Prime — AI Command Center (Middle Card)
- [ ] Verify "AI Agents" number reflects `onlineEmployees` count
- [ ] Verify "Tasks Routed" number reflects `liveTasks` count
- [ ] Verify "Success Rate" shows 99% (or computed value)
- [ ] Check numbers update after auto-refresh (30 seconds)

### Error Handling
- [ ] Simulate backend failure (stop Netlify dev server)
- [ ] Verify UI shows "Status temporarily unavailable" without crashing
- [ ] Verify existing data is preserved (not cleared on error)
- [ ] Restart backend and verify stats recover

### Edge Cases
- [ ] Test with no employees in database (should show empty list gracefully)
- [ ] Test with no recent activity (all employees should show "Offline")
- [ ] Test with mixed activity (some online, some idle, some offline)

## Future Enhancements

1. **Success Rate Calculation**
   - Compute from `chat_usage_log.success` column
   - Add time window selector (24h, 7d, 30d)

2. **Activity Weighting**
   - Weight different activity types (chat vs. document processing vs. categorization)
   - Consider activity frequency (more frequent = more "online")

3. **Employee-Specific Activity**
   - Show last activity timestamp per employee
   - Display "Last active: 5 min ago" tooltip

4. **Real-Time Updates**
   - Use WebSocket or Server-Sent Events for instant updates
   - Remove need for polling/auto-refresh

5. **Activity History**
   - Track activity patterns over time
   - Show activity trends (e.g., "Byte is most active during mornings")

## Notes

- The endpoint does not require authentication currently (uses `userId` query param)
- Consider adding JWT auth header extraction in future for better security
- Activity detection is user-agnostic (shows global activity, not per-user)
- To show per-user activity, filter `chat_usage_log` and `chat_sessions` by `user_id`










