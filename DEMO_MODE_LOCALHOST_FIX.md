# Demo Mode Localhost Fix

## Problem
Localhost was stuck blinking/loading because demo mode auto-enabled on localhost, setting `isDemoUser=true` and forcing a fake user ID `00000000-0000-4000-8000-000000000001`. This user doesn't exist in Supabase, so RLS causes repeated 401s and the UI loops.

## Solution

### Files Modified
1. `src/lib/demoAuth.ts`
2. `src/contexts/AuthContext.tsx`
3. `src/components/dashboard/ConnectedDashboard.tsx`
4. `src/hooks/useActivityFeed.ts`
5. `src/hooks/usePrimeIntro.ts`

### Changes Made

#### 1. demoAuth.ts - Disable Auto-Enable on Localhost

**Before:**
```typescript
export function isDemoMode(): boolean {
  // Check explicit env flag
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true;
  }
  
  // Check if running on localhost
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
  }
  
  return false;
}
```

**After:**
```typescript
/**
 * Check if demo mode is enabled
 * 
 * Demo mode ONLY activates when explicitly enabled via VITE_DEMO_MODE === 'true'
 * It does NOT auto-enable on localhost - require real Supabase auth in development
 */
export function isDemoMode(): boolean {
  // Only activate with explicit env flag
  return import.meta.env.VITE_DEMO_MODE === 'true';
}
```

**Key Changes:**
- ✅ Removed localhost auto-detection
- ✅ Only activates with explicit `VITE_DEMO_MODE === 'true'`
- ✅ Requires real Supabase auth in development

#### 2. AuthContext.tsx - Remove Demo Fallbacks

**Before:**
- `isDemoAllowed()` returned `true` in dev mode
- Guest session fallback on localhost
- Demo user fallback when no session found
- Demo user fallback on errors

**After:**
```typescript
/**
 * Check if demo mode is allowed
 * 
 * Demo mode ONLY activates when explicitly enabled via VITE_DEMO_MODE === 'true'
 * It does NOT auto-enable on localhost - require real Supabase auth in development
 */
function isDemoAllowed(): boolean {
  // Only allow demo if explicitly enabled
  return import.meta.env.VITE_DEMO_MODE === 'true';
}
```

**Removed:**
- ✅ Guest session check (STEP 1 removed)
- ✅ Demo user fallback when no Supabase configured
- ✅ Demo user fallback when no session found
- ✅ Demo user fallback on errors
- ✅ Demo user fallback on SIGNED_OUT

**Result:**
- ✅ No session → `userId = null`, `isDemoUser = false`
- ✅ User must sign in to access dashboard
- ✅ No fake user IDs causing 401 loops

#### 3. ConnectedDashboard.tsx - Add API Call Guards

**Before:**
```typescript
useEffect(() => {
  const fetchDashboardStats = async () => {
    if (!userId) {
      setIsLoadingStats(false);
      return;
    }
    // ... API calls
  };
  fetchDashboardStats();
}, [userId]);
```

**After:**
```typescript
useEffect(() => {
  const fetchDashboardStats = async () => {
    // Only fetch if userId exists and is NOT a demo user
    if (!userId || isDemoUser) {
      setIsLoadingStats(false);
      return;
    }
    // ... API calls
  };
  fetchDashboardStats();
}, [userId, isDemoUser]);
```

**Key Changes:**
- ✅ Added `isDemoUser` check to prevent API calls with demo user ID
- ✅ Updated dependency array to include `isDemoUser`

#### 4. useActivityFeed.ts - Add API Call Guards

**Before:**
```typescript
const fetchEvents = useCallback(async () => {
  if (!userId) {
    setIsLoading(false);
    setIsError(false);
    setEvents([]);
    return;
  }
  // ... API calls
}, [userId, limit, category, unreadOnly]);
```

**After:**
```typescript
const fetchEvents = useCallback(async () => {
  // Only fetch if userId exists and is NOT a demo user
  if (!userId || isDemoUser) {
    setIsLoading(false);
    setIsError(false);
    setEvents([]);
    return;
  }
  // ... API calls
}, [userId, isDemoUser, limit, category, unreadOnly]);
```

**Key Changes:**
- ✅ Added `isDemoUser` check
- ✅ Updated dependency array

#### 5. usePrimeIntro.ts - Add API Call Guards

**Before:**
```typescript
useEffect(() => {
  const fetchIntroState = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    // ... API calls
  };
  fetchIntroState();
}, [user?.id]);
```

**After:**
```typescript
useEffect(() => {
  const fetchIntroState = async () => {
    // Only fetch if user exists and is NOT a demo user
    if (!user?.id || isDemoUser) {
      setLoading(false);
      return;
    }
    // ... API calls
  };
  fetchIntroState();
}, [user?.id, isDemoUser]);
```

**Key Changes:**
- ✅ Added `isDemoUser` check to `fetchIntroState`
- ✅ Added `isDemoUser` check to `complete` function
- ✅ Updated dependency arrays

## Guard Pattern Applied

All API calls now follow this pattern:

```typescript
// Only fetch if userId exists and is NOT a demo user
if (!userId || isDemoUser) {
  // Skip API call
  return;
}
// Make API call
```

## Removed Old Requests

- ✅ Removed guest session fallback logic
- ✅ Removed demo user fallback logic
- ✅ Removed unused imports (`isDemoMode`, `getGuestSession`, `createGuestUser`, `clearGuestSession`)

## Test Checklist

### ✅ After Fix - Localhost Behavior

1. **Run `netlify dev`**
2. **Open `http://localhost:8888/dashboard`**
3. **Expected Results:**
   - ✅ If not signed in → Shows sign-in UI (no blinking/loading loop)
   - ✅ After sign-in → Stable dashboard (no 401/404 spam)
   - ✅ Console should NOT spam 401/404 anymore
   - ✅ No demo user ID `00000000-0000-4000-8000-000000000001` in network requests

### ✅ Verify No Demo Mode Auto-Enable

1. **Check console logs:**
   - ✅ Should NOT see: "No session - using demo user (dev mode)"
   - ✅ Should NOT see: "Guest session found - using guest user"
   - ✅ Should see: "No session - user must log in"

2. **Check network tab:**
   - ✅ No requests with demo user ID
   - ✅ No 401 errors when not signed in
   - ✅ API calls only happen after real sign-in

### ✅ Verify Guards Work

1. **Sign out:**
   - ✅ Dashboard stats don't fetch
   - ✅ Activity feed doesn't fetch
   - ✅ Prime intro doesn't fetch
   - ✅ No API errors in console

2. **Sign in:**
   - ✅ All API calls work normally
   - ✅ No 401 errors
   - ✅ Dashboard loads correctly

## How to Enable Demo Mode (If Needed)

If you need demo mode for testing, set explicit env var:

```bash
# .env
VITE_DEMO_MODE=true
```

**Note:** Demo mode should only be used for specific testing scenarios, not for normal development.

## Summary

- ✅ Demo mode no longer auto-enables on localhost
- ✅ Requires real Supabase auth session for dashboard
- ✅ Shows sign-in UI when not logged in (no blinking loop)
- ✅ API calls guarded to prevent 401 loops
- ✅ No fake user IDs causing RLS errors
- ✅ Clean console (no 401/404 spam)










