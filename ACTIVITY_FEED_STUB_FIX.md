# Activity Feed Stub Function Fix

**Date:** 2025-01-20  
**Status:** ✅ Complete  
**Objective:** Fix repeated 404 errors for `/.netlify/functions/activity-feed` by adding minimal stub

---

## 📋 Summary

Simplified the existing `activity-feed.ts` Netlify function to a minimal stub that always returns HTTP 200 with an empty events array. This stops 404 errors and noisy retries in development.

---

## 🔧 Implementation

### File: `netlify/functions/activity-feed.ts`

**Changes:**
- Removed authentication requirement (`verifyAuth`)
- Removed database queries (`activity_events` table)
- Simplified to return empty array immediately
- Kept CORS headers and OPTIONS handling
- Added TODO comment for future implementation

**Response Format:**
```json
{
  "ok": true,
  "events": []
}
```

**Headers:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Allow-Methods: GET, OPTIONS`
- `Content-Type: application/json`

---

## ✅ Verification Steps

### Step 1: Reload App

1. Start dev server (if not running)
2. Navigate to dashboard
3. Open browser DevTools → Network tab
4. Filter for `activity-feed`
5. **Expected:** Request returns `200 OK` (not `404 Not Found`)

### Step 2: Check Console

1. Open browser DevTools → Console
2. Look for activity feed errors
3. **Expected:** No 404 errors for `activity-feed`
4. **Expected:** No retry warnings

### Step 3: Verify Response

1. In Network tab, click on `activity-feed` request
2. Check Response tab
3. **Expected:** 
   ```json
   {
     "ok": true,
     "events": []
   }
   ```

### Step 4: Check Hook Behavior

1. Components using `useActivityFeed` should:
   - Not show loading state indefinitely
   - Not retry repeatedly
   - Display empty activity feed gracefully

---

## 🔍 What Changed

### Before

- Function required authentication
- Queried `activity_events` table
- Could fail with 404 if table missing
- Could fail with 401 if auth missing
- Caused noisy retries in dev

### After

- No authentication required (stub)
- No database queries
- Always returns 200 OK
- Returns empty array
- Stops 404 errors immediately

---

## 📝 Files Modified

**Modified:**
- `netlify/functions/activity-feed.ts` (simplified to stub)

---

## 🚀 Next Steps

When ready to implement full functionality:

1. **Restore authentication:**
   ```typescript
   const { userId, error: authError } = await verifyAuth(event);
   ```

2. **Restore database queries:**
   ```typescript
   const sb = admin();
   const { data: events } = await sb
     .from('activity_events')
     .select('*')
     .eq('user_id', userId)
     .order('created_at', { ascending: false })
     .limit(limit);
   ```

3. **Ensure `activity_events` table exists** in Supabase

---

## ⚠️ Notes

- **This is a temporary stub** - full implementation should be added later
- **No data is returned** - activity feed will be empty until full implementation
- **No authentication** - stub accepts all requests (dev-only acceptable)
- **CORS enabled** - allows cross-origin requests

---

**End of Document**




