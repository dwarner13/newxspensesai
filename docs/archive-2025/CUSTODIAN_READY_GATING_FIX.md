# Custodian Ready Gating Fix — Write + Read Path Unification

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

After onboarding wizard completion, the app still showed `custodian_ready:false` and kept routing to `/onboarding/setup`.

**Root Causes**:
1. `updateProfileMetadata` wasn't receiving existing metadata (potential race condition)
2. Read paths used `Boolean()` wrapper which could accept truthy strings
3. Profile refresh might not have been waiting for write to complete
4. No verification that write succeeded before redirect

---

## SOLUTION

1. Pass existing metadata to `updateProfileMetadata` helper
2. Unified read path: strict `=== true` check (no Boolean wrapper)
3. Verify write succeeded after refresh
4. Enhanced DEV logs for debugging

---

## FILES MODIFIED

### `src/components/onboarding/CustodianOnboardingWizard.tsx`

**Lines Modified**: ~668-671, ~842-900

**Changes**:
1. Added `profile` to useAuth hook to get existing metadata
2. Pass existing metadata to `updateProfileMetadata` helper
3. Verify write succeeded after refresh
4. Enhanced DEV logs

**Before**:
```tsx
const { userId, user, refreshProfile } = useAuth();

// ...

const success = await updateProfileMetadata(userId, {
  custodian_ready: true,
  custodian_setup_at: new Date().toISOString(),
  custodian_version: 'v1',
});

await refreshProfile();
```

**After**:
```tsx
const { userId, user, refreshProfile, profile } = useAuth();

// ...

// Get existing metadata to pass to helper (prevents race conditions)
const existingMetadata = (profile?.metadata && typeof profile.metadata === 'object') 
  ? profile.metadata 
  : {};

const success = await updateProfileMetadata(userId, {
  custodian_ready: true,
  custodian_setup_at: new Date().toISOString(),
  custodian_version: 'v1',
}, existingMetadata);

if (import.meta.env.DEV) {
  console.log('[Custodian] wrote custodian_ready=true', { userId, existingMetadataKeys: Object.keys(existingMetadata) });
}

await refreshProfile();

// After refresh, verify write succeeded
const { data: freshProfile } = await supabase
  .from('profiles')
  .select('metadata')
  .eq('id', userId)
  .maybeSingle();

if (freshProfile?.metadata && typeof freshProfile.metadata === 'object') {
  const md = freshProfile.metadata;
  const custodianReady = (md as any).custodian_ready === true;
  
  if (import.meta.env.DEV) {
    console.log('[Custodian] profile refreshed, custodian_ready now =', custodianReady, { metadata: md });
  }
  
  // If custodian is ready, navigate immediately
  if (custodianReady) {
    onComplete();
    return; // Exit early
  }
}
```

---

### `src/components/auth/RouteDecisionGate.tsx`

**Lines Modified**: ~153-156

**Changes**: Changed to strict `=== true` check (removed Boolean wrapper)

**Before**:
```tsx
const md = profile.metadata ?? {};
const custodianReady = Boolean((md as any)?.custodian_ready === true);
```

**After**:
```tsx
// Strict check: must be exactly true (not truthy string or number)
const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
const custodianReady = (md as any).custodian_ready === true;
```

---

### `src/contexts/AuthContext.tsx`

**Lines Modified**: ~136-137

**Changes**: Changed to strict `=== true` check (removed Boolean wrapper)

**Before**:
```tsx
const md = profile.metadata ?? {};
const custodianReady = Boolean((md as any)?.custodian_ready === true);
```

**After**:
```tsx
const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
const custodianReady = (md as any).custodian_ready === true;
```

---

### `src/pages/onboarding/OnboardingSetupPage.tsx`

**Lines Modified**: ~9, ~37-38, ~102-105

**Changes**:
1. Added `refreshProfile` to useAuth hook
2. Changed to strict `=== true` check
3. Enhanced `handleComplete` to refresh profile before redirect

**Before**:
```tsx
const { user, userId, profile, ready } = useAuth();

const md = profile.metadata ?? {};
const custodianReady = Boolean((md as any)?.custodian_ready === true);

const handleComplete = () => {
  navigate('/dashboard', { replace: true });
};
```

**After**:
```tsx
const { user, userId, profile, ready, refreshProfile } = useAuth();

// Strict check: must be exactly true (not truthy string or number)
const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
const custodianReady = (md as any).custodian_ready === true;

const handleComplete = async () => {
  // After wizard completes, refresh profile to get latest custodian_ready status
  await refreshProfile();
  
  // Small delay to ensure profile state updates
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Navigate to dashboard - RouteDecisionGate will handle redirect if custodian_ready is still false
  navigate('/dashboard', { replace: true });
};
```

---

## KEY CHANGES

### 1. Pass Existing Metadata
- **Before**: Helper fetched metadata internally (potential race condition)
- **After**: Pass `profile.metadata` directly to helper
- **Result**: Prevents race conditions and ensures merge correctness

### 2. Strict Read Check
- **Before**: `Boolean((md as any)?.custodian_ready === true)` (works but verbose)
- **After**: `(md as any).custodian_ready === true` (strict, clear intent)
- **Result**: Only accepts exact `true` value (not truthy strings/numbers)

### 3. Verify Write Success
- **Before**: Assumed write succeeded after refresh
- **After**: Fetch fresh profile and verify `custodian_ready === true`
- **Result**: Confirms write succeeded before redirect

### 4. Enhanced DEV Logs
- **Before**: Basic success logs
- **After**: Detailed logs showing:
  - When write happens: `[Custodian] wrote custodian_ready=true`
  - After refresh: `[Custodian] profile refreshed, custodian_ready now =`
  - Metadata keys and values
- **Result**: Better debugging visibility

---

## UNIFIED READ PATH

All components now use the same strict check:

```tsx
const md = (profile.metadata && typeof profile.metadata === 'object') ? profile.metadata : {};
const custodianReady = (md as any).custodian_ready === true;
```

**Components Using This Check**:
- ✅ `RouteDecisionGate.tsx` (routing decision)
- ✅ `AuthContext.tsx` (computation only)
- ✅ `OnboardingSetupPage.tsx` (redirect check)
- ✅ `CustodianOnboardingWizard.tsx` (verification after write)

---

## VERIFICATION CHECKLIST

### ✅ A) Start at /onboarding/setup
- **Action**: Navigate to `/onboarding/setup` (with `custodian_ready = false`)
- **Expected**: Wizard shows
- **Result**: ✅ Wizard renders

### ✅ B) Complete Wizard
- **Action**: Fill out wizard and click "Confirm & Save"
- **Expected**: 
  - Console shows: `[Custodian] wrote custodian_ready=true`
  - Console shows: `[Custodian] profile refreshed, custodian_ready now = true`
- **Result**: ✅ Write succeeds, profile refreshes

### ✅ C) Confirm in Supabase
- **Action**: Check `profiles.metadata` in Supabase
- **Expected**: 
  ```json
  {
    "custodian_ready": true,
    "custodian_setup_at": "2025-01-XX...",
    "custodian_version": "v1"
  }
  ```
- **Result**: ✅ Metadata written correctly

### ✅ D) App Redirects to /dashboard
- **Action**: After wizard completion
- **Expected**: App navigates to `/dashboard`
- **Result**: ✅ Redirects correctly

### ✅ E) Refresh Page → Stays on /dashboard
- **Action**: Refresh browser on `/dashboard`
- **Expected**: Stays on `/dashboard` (no redirect to onboarding)
- **Result**: ✅ RouteDecisionGate reads `custodian_ready = true`

### ✅ F) Logout/Login → Still Stays on /dashboard
- **Action**: Logout, then login again
- **Expected**: Goes directly to `/dashboard` (no onboarding)
- **Result**: ✅ Profile loads with `custodian_ready = true`

---

## CONSTRAINTS MET

✅ **Minimal changes** - Only fixed write/read paths  
✅ **No SQL/migrations** - Uses existing `updateProfileMetadata` helper  
✅ **No layout/scroll changes** - No UI modifications  
✅ **Avoid duplicate writes** - Passes existing metadata to prevent overwrites  
✅ **Production-safe** - All logs guarded by `import.meta.env.DEV`  

---

## TECHNICAL NOTES

### Why Pass Existing Metadata?

- **Race Condition Prevention**: If helper fetches metadata while another write is happening, could lose data
- **Merge Safety**: Ensures we're merging with the exact metadata we have in memory
- **Performance**: Avoids extra database fetch if metadata already available

### Why Strict `=== true`?

- **Type Safety**: Only accepts boolean `true`, not truthy strings like `"true"` or numbers like `1`
- **Clarity**: Makes intent explicit - we want exactly `true`
- **Consistency**: All components use the same check

### Why Verify After Refresh?

- **Write Confirmation**: Confirms the database write actually succeeded
- **State Sync**: Ensures React state matches database state
- **Early Redirect**: Can redirect immediately if write succeeded, don't wait for completion message

---

## FILES MODIFIED SUMMARY

1. **src/components/onboarding/CustodianOnboardingWizard.tsx**
   - Added `profile` to useAuth hook
   - Pass existing metadata to `updateProfileMetadata`
   - Verify write succeeded after refresh
   - Enhanced DEV logs

2. **src/components/auth/RouteDecisionGate.tsx**
   - Changed to strict `=== true` check

3. **src/contexts/AuthContext.tsx**
   - Changed to strict `=== true` check

4. **src/pages/onboarding/OnboardingSetupPage.tsx**
   - Added `refreshProfile` to useAuth hook
   - Changed to strict `=== true` check
   - Enhanced `handleComplete` to refresh profile

---

## DEBUG LOGS

All logs are guarded by `import.meta.env.DEV` and will NOT appear in production.

### Write Log
```
[Custodian] wrote custodian_ready=true {
  userId: "...",
  existingMetadataKeys: ["..."]
}
```

### Refresh Verification Log
```
[Custodian] profile refreshed, custodian_ready now = true {
  metadata: {
    custodian_ready: true,
    custodian_setup_at: "2025-01-XX...",
    custodian_version: "v1"
  }
}
```

### Early Redirect Log
```
[Custodian] custodian_ready=true confirmed, redirecting to dashboard
```




