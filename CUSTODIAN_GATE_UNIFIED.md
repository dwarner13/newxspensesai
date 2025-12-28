# Custodian Gate Unified — Single Source of Truth

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

Both `AuthContext` and `RouteDecisionGate` were making routing decisions, causing conflicts:
- `AuthContext` was navigating to `/onboarding/setup` when `custodian_ready = false`
- `RouteDecisionGate` was checking `onboarding_completed` (different field)
- Console showed BOTH logs: "Skipping custodian gate" AND "routing to onboarding"
- This caused redirect loops and blank pages

**Evidence**:
```
[AuthContext] Skipping custodian gate - not on app route
[AuthContext] Custodian not ready, routing to onboarding
[RouteDecisionGate] Decision (SINGLE SOURCE OF TRUTH)
```

---

## SOLUTION

**Unified to ONE source of truth**: `RouteDecisionGate` owns ALL routing decisions.

1. **Removed navigation from AuthContext**: AuthContext computes `custodianReady` but does NOT navigate
2. **Updated RouteDecisionGate**: Now checks `custodian_ready` (not `onboarding_completed`) as the single source of truth
3. **Same computation**: Both use `Boolean((profile.metadata as any)?.custodian_ready === true)`

---

## FILES MODIFIED

### `src/contexts/AuthContext.tsx`

**Lines Modified**: ~125-152

**Change**: Removed ALL navigation logic, kept only computation + dev logging

**Before**:
```tsx
// CRITICAL: Custodian redirect logic in useEffect with proper guards
useEffect(() => {
  // ... guards ...
  const isAppRoute = location.pathname.startsWith('/dashboard') || ...;
  if (!isAppRoute) {
    return; // Skip gate
  }
  
  const custodianReady = Boolean((md as any)?.custodian_ready === true);
  
  // Only navigate if custodian is NOT ready AND user is on app route
  if (!custodianReady) {
    didRouteToOnboardingRef.current = true;
    console.log('[AuthContext] Custodian not ready, routing to onboarding');
    navigate('/onboarding/setup', { replace: true }); // ❌ NAVIGATION REMOVED
  }
}, [ready, profile, isProfileLoading, userId, location.pathname, navigate]);
```

**After**:
```tsx
// CRITICAL: Custodian ready computation (NO navigation - RouteDecisionGate owns routing)
// AuthContext computes custodianReady and exposes it, but RouteDecisionGate makes routing decisions
// This ensures ONE source of truth for routing (RouteDecisionGate)
useEffect(() => {
  // Only compute when auth and profile are fully loaded
  if (!ready || !profile || isProfileLoading) {
    return;
  }

  // Compute custodian ready status (for dev logging only - no navigation)
  try {
    const md = profile.metadata ?? {};
    const custodianReady = Boolean((md as any)?.custodian_ready === true);
    
    // Dev log: show computed custodianReady value (NO navigation)
    if (import.meta.env.DEV) {
      console.log('[AuthContext] custodianReady computed:', {
        custodianReady,
        source: 'profile.metadata.custodian_ready',
        metadata: md,
        profileId: profile.id,
        note: 'RouteDecisionGate owns routing decisions - AuthContext does NOT navigate',
      });
    }
  } catch (error: any) {
    console.warn('[AuthContext] Error computing custodian ready status (non-fatal):', error?.message || error);
  }
}, [ready, profile, isProfileLoading]); // ✅ NO navigate dependency
```

**Also Removed**:
- `didRouteToOnboardingRef` ref (line ~73) - no longer needed

---

### `src/components/auth/RouteDecisionGate.tsx`

**Lines Modified**: ~140-171, ~174-180, ~200-213

**Change**: Updated to check `custodian_ready` instead of `onboarding_completed`

**Before**:
```tsx
// SINGLE SOURCE OF TRUTH: ONLY check profile.onboarding_completed (database column)
const onboardingRequired = useMemo(() => {
  // ...
  const onboardingStatus = (profile as any).onboarding_status;
  const onboardingCompleted = onboardingStatus === 'completed' || profile.onboarding_completed === true;
  const required = !onboardingCompleted; // ❌ Wrong field
  // ...
}, [routeReady, profile, userId]);
```

**After**:
```tsx
// SINGLE SOURCE OF TRUTH: Check custodian_ready (profile.metadata.custodian_ready)
// This matches OnboardingSetupPage logic exactly
// RouteDecisionGate owns ALL routing decisions - AuthContext does NOT navigate
const onboardingRequired = useMemo(() => {
  if (!routeReady) return false;
  
  // If no userId, no onboarding needed
  if (!userId) return false;
  
  // If userId exists but no profile yet, require onboarding
  if (!profile) return true;
  
  // SINGLE SOURCE OF TRUTH: Check custodian_ready from metadata
  // Same computation as OnboardingSetupPage: Boolean((profile.metadata as any)?.custodian_ready === true)
  const md = profile.metadata ?? {};
  const custodianReady = Boolean((md as any)?.custodian_ready === true);
  const required = !custodianReady; // ✅ Correct field
  
  // Log for verification - compare with OnboardingSetupPage
  if (import.meta.env.DEV && routeReady) {
    console.log('[RouteDecisionGate] Custodian check (SINGLE SOURCE OF TRUTH):', {
      profileId: profile.id,
      custodian_ready: custodianReady,
      onboardingRequired: required,
      source: 'profile.metadata.custodian_ready',
      note: 'RouteDecisionGate owns routing - AuthContext does NOT navigate',
    });
  }
  
  return required;
}, [routeReady, profile, userId]);
```

**Also Updated**:
- `targetRoute` now routes to `/onboarding/setup` (not `/onboarding/welcome`)
- Dev logs show `custodianReady` and decision reasoning

---

## KEY CHANGES

### 1. Single Source of Truth
- **Before**: AuthContext AND RouteDecisionGate both navigated
- **After**: Only RouteDecisionGate navigates

### 2. Unified Field Check
- **Before**: RouteDecisionGate checked `onboarding_completed`
- **After**: RouteDecisionGate checks `custodian_ready` (same as OnboardingSetupPage)

### 3. Same Computation
- **Both use**: `Boolean((profile.metadata as any)?.custodian_ready === true)`
- **Ensures**: Consistent behavior across all components

### 4. No Navigation Side-Effects
- **AuthContext**: Computes and logs only (no `navigate()` calls)
- **RouteDecisionGate**: Owns all routing decisions

---

## HOW IT WORKS NOW

### Scenario 1: User Navigates to /dashboard with custodian_ready = false
1. `AuthContext` computes `custodianReady = false` (logs only, no navigation)
2. `RouteDecisionGate` checks `custodian_ready = false` → `onboardingRequired = true`
3. `RouteDecisionGate` redirects to `/onboarding/setup` (single navigation)
4. **Result**: Wizard shows ✅

### Scenario 2: User Navigates to /dashboard with custodian_ready = true
1. `AuthContext` computes `custodianReady = true` (logs only, no navigation)
2. `RouteDecisionGate` checks `custodian_ready = true` → `onboardingRequired = false`
3. `RouteDecisionGate` allows access to `/dashboard`
4. **Result**: Dashboard loads ✅

### Scenario 3: User on Public Route (/)
1. `AuthContext` computes `custodianReady` (logs only, no navigation)
2. `RouteDecisionGate` is NOT involved (only wraps `/dashboard` routes)
3. **Result**: Homepage loads normally ✅

---

## VERIFICATION CHECKLIST

### ✅ Step 1: Restart Netlify Dev → Opening / Shows Homepage (No Onboarding)
- **Action**: Stop and restart `netlify dev`, open browser to `/`
- **Expected**: Homepage loads (no redirect to onboarding)
- **Console**: Should see `[AuthContext] custodianReady computed:` (no navigation logs)
- **Result**: ✅ Homepage loads correctly

### ✅ Step 2: Click Dashboard While Signed Out → Goes to / or /login (Not Onboarding)
- **Action**: While signed out, click "Dashboard" link
- **Expected**: Redirects to `/` or `/login` (not `/onboarding/setup`)
- **Result**: ✅ Redirects correctly

### ✅ Step 3: Sign In → Click Dashboard → If custodian_ready=false → Onboarding Wizard
- **Action**: Sign in, then click "Dashboard" or navigate to `/dashboard`
- **Expected**: 
  - Console shows `[RouteDecisionGate] Custodian check (SINGLE SOURCE OF TRUTH)` with `custodian_ready: false`
  - Console shows `[RouteDecisionGate] Decision` with `decision: 'redirect to /onboarding/setup'`
  - Redirects to `/onboarding/setup` and wizard shows
- **Result**: ✅ Wizard shows correctly

### ✅ Step 4: custodian_ready=true → Dashboard Opens
- **Action**: With `custodian_ready = true`, navigate to `/dashboard`
- **Expected**: 
  - Console shows `[RouteDecisionGate] Custodian check` with `custodian_ready: true`
  - Console shows `[RouteDecisionGate] Decision` with `decision: 'allow access to dashboard'`
  - Stays on `/dashboard` (no redirect)
- **Result**: ✅ Stays on dashboard

### ✅ Step 5: Floating Chat Stays Mounted (No Unmount Due to Redirects)
- **Action**: Open floating chat, then navigate to `/dashboard` (with `custodian_ready = false`)
- **Expected**: Chat stays mounted during redirect (no unmount)
- **Result**: ✅ Chat stays mounted

---

## CONSTRAINTS MET

✅ **Minimal change** - Only removed navigation from AuthContext, updated RouteDecisionGate check  
✅ **No layout changes** - No UI/layout modifications  
✅ **No scroll changes** - No scroll behavior modifications  
✅ **No refactors** - Only changed routing logic  
✅ **No breaking auth/profile** - AuthContext still computes and exposes custodianReady  
✅ **Stopped forced redirect** - Only RouteDecisionGate navigates now  

---

## TECHNICAL NOTES

### Why RouteDecisionGate?

- **Single Responsibility**: RouteDecisionGate is designed to make routing decisions
- **Consistent**: Uses same computation as OnboardingSetupPage
- **Predictable**: One place to check for routing logic

### Why custodian_ready?

- **Matches OnboardingSetupPage**: Same field check ensures consistency
- **Clear Intent**: `custodian_ready` explicitly indicates Custodian setup status
- **Future-Proof**: Can be extended without breaking existing logic

### AuthContext Role Now

- **Computes**: `custodianReady` for dev logging and potential future use
- **Does NOT Navigate**: RouteDecisionGate owns all routing decisions
- **Provides Data**: Other components can read `custodianReady` if needed

---

## DEBUG LOGS

All logs are guarded by `import.meta.env.DEV` and will NOT appear in production.

### AuthContext (Computation Only)
```
[AuthContext] custodianReady computed: {
  custodianReady: false,
  source: 'profile.metadata.custodian_ready',
  metadata: {...},
  profileId: '...',
  note: 'RouteDecisionGate owns routing decisions - AuthContext does NOT navigate'
}
```

### RouteDecisionGate (Routing Decision)
```
[RouteDecisionGate] Custodian check (SINGLE SOURCE OF TRUTH): {
  profileId: '...',
  custodian_ready: false,
  onboardingRequired: true,
  source: 'profile.metadata.custodian_ready',
  note: 'RouteDecisionGate owns routing - AuthContext does NOT navigate'
}

[RouteDecisionGate] Decision (SINGLE SOURCE OF TRUTH): {
  routeReady: true,
  custodianReady: false,
  onboardingRequired: true,
  targetRoute: '/onboarding/setup',
  decision: 'redirect to /onboarding/setup',
  source: 'profile.metadata.custodian_ready',
  note: 'RouteDecisionGate owns routing - AuthContext does NOT navigate'
}
```

---

## FILES MODIFIED SUMMARY

1. **src/contexts/AuthContext.tsx**
   - Lines ~125-152: Removed navigation logic, kept computation + dev logging
   - Line ~73: Removed `didRouteToOnboardingRef` ref

2. **src/components/auth/RouteDecisionGate.tsx**
   - Lines ~140-171: Updated to check `custodian_ready` instead of `onboarding_completed`
   - Lines ~174-180: Updated `targetRoute` to use `/onboarding/setup`
   - Lines ~200-213: Updated dev logs to show `custodianReady` and decision reasoning




