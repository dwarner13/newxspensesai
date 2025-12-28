# Route Transition Stability Fix ✅

## Root Cause Analysis

### Issue 1: Hook Count Violation Warning
**Root Cause**: 
- Hook count tracking was incrementing on every render (`hookCountRef.current += 1`)
- This was not actually tracking hook count, just render count
- Component unmounting/remounting during navigation would reset the ref, causing false warnings

**Fix**: 
- Removed inaccurate hook count tracking code
- All hooks are called unconditionally before any early returns (React rules compliance)

### Issue 2: UnifiedAssistantChat Unmounting on Route Changes
**Root Cause**: 
- `shouldMount` check depended on route conditions (`isOnboardingRoute`, `isSettingsRoute`)
- These conditions change during navigation, causing unmounts
- Early return `if (!shouldMount) return null;` was unmounting the component

**Fix**: 
- Added `hasEverMountedRef` to track if component has ever been allowed to mount
- Once mounted, component stays mounted: `shouldMount = canMount || hasEverMountedRef.current`
- Changed early return to render hidden div instead of `null` to prevent unmounts
- Removed route-specific checks from `shouldMount` (only check onboarding completion)

### Issue 3: Route Shell Fallback Flashing
**Root Cause**: 
- RouteDecisionGate was already fixed (uses `hasBootedRef` to prevent loader on route changes)
- No changes needed - loader only shows on first boot

### Issue 4: 404 Spam During Navigation
**Root Cause**: 
- `usePrimeLiveStats` and `useByteQueueStats` didn't have "once" behavior
- They kept retrying on 404, causing rerender storms
- `useActivityFeed` had some logic but wasn't fully preventing spam

**Fix**: 
- Added `isFunctionDisabledRef` to all three hooks
- On 404, set `isFunctionDisabledRef.current = true` and stop refetching
- Auto-refresh intervals check `isFunctionDisabledRef.current` before running
- Silent disable (no error state, no console spam after first 404)

---

## Files Changed

### 1. `src/components/chat/UnifiedAssistantChat.tsx`
**Change A**: Removed hook count tracking
```typescript
// REMOVED: Inaccurate hook count tracking
// Hook count tracking removed - was causing false warnings
// All hooks are called unconditionally before any early returns
```

**Change B**: Made mount state persistent
```typescript
// Track if component has ever been allowed to mount (persists across route changes)
const hasEverMountedRef = useRef(false);

// Mount when: routeReady AND onboardingCompleted
// Once mounted, stay mounted (hasEverMountedRef persists)
const canMount = routeReady && onboardingCompleted;
const shouldMount = canMount || hasEverMountedRef.current;

// Track mount state (persists across route changes)
useEffect(() => {
  if (canMount) {
    hasEverMountedRef.current = true;
  }
}, [canMount]);
```

**Change C**: Changed early return to prevent unmounts
```typescript
// Use CSS hiding instead of unmounting to prevent remounts
if (!shouldMount) {
  return (
    <div className="hidden" aria-hidden="true" />
  );
}
```

**Change D**: Simplified onboarding blocked check
```typescript
// Use CSS hiding instead of unmounting to prevent remounts
const onboardingBlocked = useMemo(() => {
  // Check if onboarding is not completed
  if (!onboardingCompleted) {
    return true;
  }
  // Otherwise, onboarding is not blocked
  return false;
}, [onboardingCompleted]);
```

### 2. `src/hooks/usePrimeLiveStats.ts`
**Change**: Added "once" behavior for 404
```typescript
// Track if function is disabled (404 detected) - persists across renders
const isFunctionDisabledRef = useRef(false);

// Guard: Function disabled (404 detected previously) - stop refetching
if (isFunctionDisabledRef.current) {
  setIsLoading(false);
  setIsError(false);
  setErrorMessage(undefined);
  return;
}

// On 404, disable silently
if (response.status === 404) {
  isFunctionDisabledRef.current = true;
  setIsLoading(false);
  setIsError(false);
  setErrorMessage(undefined);
  if (import.meta.env.DEV) {
    console.info('[usePrimeLiveStats] Function not found (404), disabling quietly');
  }
  return;
}

// Auto-refresh only if function is enabled
useEffect(() => {
  if (!ready || !userId || isDemoUser || isFunctionDisabledRef.current) return;
  // ...
}, [ready, userId, isDemoUser, fetchStats]);
```

### 3. `src/hooks/useByteQueueStats.ts`
**Change**: Added "once" behavior for 404
```typescript
// Track if function is disabled (404 detected) - persists across renders
const isFunctionDisabledRef = useRef(false);

// Guard: Function disabled (404 detected previously) - stop refetching
if (isFunctionDisabledRef.current) {
  setIsLoading(false);
  setIsError(false);
  return;
}

// On 404, disable silently
if (response.status === 404) {
  isFunctionDisabledRef.current = true;
  setIsLoading(false);
  setIsError(false);
  if (import.meta.env.DEV) {
    console.info('[useByteQueueStats] Function not found (404), disabling quietly');
  }
  return;
}

// Auto-refresh only if function is enabled
useEffect(() => {
  if (!userId || isFunctionDisabledRef.current) return;
  // ...
}, [userId, fetchStats]);
```

### 4. `src/hooks/useActivityFeed.ts`
**Status**: Already had "once" behavior via `isFunctionDisabledRef`
- No changes needed - already handles 404 correctly

---

## Code Diffs

### A) Hook Count Tracking Removed
```diff
- // Track hook count to detect violations
- const hookCountRef = useRef<number>(0);
- const previousHookCountRef = useRef<number>(0);
- hookCountRef.current += 1;
- useEffect(() => {
-   if (import.meta.env.DEV) {
-     if (previousHookCountRef.current > 0 && hookCountRef.current !== previousHookCountRef.current) {
-       console.warn('[UnifiedAssistantChat] ⚠️ Hook count changed between renders!', ...);
-     }
-     previousHookCountRef.current = hookCountRef.current;
-   }
- });
+ // Hook count tracking removed - was causing false warnings
+ // All hooks are called unconditionally before any early returns
```

### B) Persistent Mount State
```diff
+ // Track if component has ever been allowed to mount (persists across route changes)
+ const hasEverMountedRef = useRef(false);
+
  // Mount when: routeReady AND onboardingCompleted
- const shouldMount = routeReady && onboardingCompleted && !isOnboardingRoute && !isSettingsRoute;
+ const canMount = routeReady && onboardingCompleted;
+ const shouldMount = canMount || hasEverMountedRef.current;
+
+ useEffect(() => {
+   if (canMount) {
+     hasEverMountedRef.current = true;
+   }
+ }, [canMount]);

- // Early return: Don't mount until conditions are stable
- if (!shouldMount) {
-   return null;
- }
+ // Use CSS hiding instead of unmounting to prevent remounts
+ if (!shouldMount) {
+   return (
+     <div className="hidden" aria-hidden="true" />
+   );
+ }
```

### C) 404 "Once" Behavior
```diff
+ const isFunctionDisabledRef = useRef(false);
+
  const fetchStats = useCallback(async () => {
+   if (isFunctionDisabledRef.current) {
+     setIsLoading(false);
+     setIsError(false);
+     return;
+   }
+
    const response = await fetch(...);
+
+   if (response.status === 404) {
+     isFunctionDisabledRef.current = true;
+     setIsLoading(false);
+     setIsError(false);
+     if (import.meta.env.DEV) {
+       console.info('[usePrimeLiveStats] Function not found (404), disabling quietly');
+     }
+     return;
+   }
    // ...
  }, [...]);

  useEffect(() => {
-   if (!ready || !userId || isDemoUser) return;
+   if (!ready || !userId || isDemoUser || isFunctionDisabledRef.current) return;
    // ...
  }, [...]);
```

---

## Verification Steps

### Test 1: No "Hook Count Changed" Warning
**Steps:**
1. Open browser console
2. Navigate between dashboard pages (click 5 sidebar links quickly)
3. **Verify**: No "Hook count changed between renders!" warnings
4. **Verify**: No React hook violation errors

**Expected**: ✅ No hook warnings

---

### Test 2: UnifiedAssistantChat Stays Mounted
**Steps:**
1. Open React DevTools
2. Find `UnifiedAssistantChat` component
3. Click 5 sidebar links quickly
4. **Verify**: Component does NOT unmount/remount (no "Unmounted" logs)
5. **Verify**: Component stays in component tree

**Expected**: ✅ Component stays mounted, no unmount/remount

---

### Test 3: No Blur Flash During Navigation
**Steps:**
1. Click 5 sidebar links quickly
2. **Verify**: No blurry flash/flicker between pages
3. **Verify**: Smooth transitions (if animations enabled)
4. **Verify**: Layout stays stable (no height jumps)

**Expected**: ✅ No flash, stable layout

---

### Test 4: 404 Hooks Stop Spamming
**Steps:**
1. Open Network tab in DevTools
2. Navigate between dashboard pages
3. **Verify**: After first 404 for `prime-live-stats`, no more requests
4. **Verify**: After first 404 for `smart_import_stats`, no more requests
5. **Verify**: After first 404 for `activity-feed`, no more requests
6. **Verify**: Console shows "Function not found (404), disabling quietly" once per hook

**Expected**: ✅ 404 hooks stop after first failure

---

### Test 5: RouteDecisionGate Doesn't Flash
**Steps:**
1. Navigate between dashboard pages
2. **Verify**: "Preparing your workspace..." screen does NOT appear
3. **Verify**: Only shows on first boot (hard refresh)

**Expected**: ✅ No loader flash on route changes

---

## Technical Details

### Mount Persistence Logic
1. Component checks `canMount = routeReady && onboardingCompleted`
2. If `canMount` is true, set `hasEverMountedRef.current = true`
3. Component stays mounted: `shouldMount = canMount || hasEverMountedRef.current`
4. Once mounted, component never unmounts (even if route changes)

### 404 "Once" Behavior
1. On first fetch, if response is 404, set `isFunctionDisabledRef.current = true`
2. All subsequent fetches check `isFunctionDisabledRef.current` and return early
3. Auto-refresh intervals check `isFunctionDisabledRef.current` before running
4. Silent disable (no error state, no console spam)

### CSS Hiding vs Unmounting
- **Before**: `if (!shouldMount) return null;` → Component unmounts
- **After**: `if (!shouldMount) return <div className="hidden" />;` → Component stays mounted, hidden with CSS
- **Benefit**: Prevents remounts, preserves component state, no hook re-initialization

---

**Status**: ✅ Route Transitions Stable + No Hook Warnings + No 404 Spam



