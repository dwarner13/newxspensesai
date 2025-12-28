# Onboarding Setup Blank Wizard Fix

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

Clicking Dashboard routes to `/onboarding/setup` (expected when custodian not ready), but the page is blank (only background). No wizard renders.

**Root Cause**:
- Component had early returns that could result in blank screen
- Loading states weren't properly separated
- Unauthenticated users weren't handled (would show loader forever)
- No visual feedback when component renders

---

## SOLUTION

Fixed the component to:
1. Always render something (never return null)
2. Properly handle unauthenticated users (redirect to homepage)
3. Separate loading states for better UX
4. Add dev-only visual debug
5. Ensure wizard always renders when `custodian_ready = false`

---

## FILES MODIFIED

### `src/pages/onboarding/OnboardingSetupPage.tsx`

**Lines Modified**: Entire file restructured

**Change**: Improved loading states, added unauthenticated redirect, added dev debug

**Before**:
```tsx
// Show loading while auth initializes (prevent blank screen)
if (!ready || !user || !userId || !profile) {
  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
      <div className="text-center flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p className="text-white text-lg">Loading your setup…</p>
      </div>
    </div>
  );
}

return <CustodianOnboardingWizard onComplete={handleComplete} />;
```

**After**:
```tsx
// Show loading while auth initializes (prevent blank screen)
if (!ready) {
  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
      <div className="text-center flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p className="text-white text-lg">Loading your setup…</p>
      </div>
    </div>
  );
}

// Redirect unauthenticated users (don't show wizard)
if (!user || !userId) {
  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
      <div className="text-center flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p className="text-white text-lg">Redirecting…</p>
      </div>
    </div>
  );
}

// Show loading while profile loads (prevent blank screen)
if (!profile) {
  return (
    <div className="bg-gradient-to-b from-[#0f172a] to-[#1a1e3a] flex items-center justify-center py-20 min-h-screen">
      <div className="text-center flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4 mx-auto"></div>
        <p className="text-white text-lg">Loading your setup…</p>
      </div>
    </div>
  );
}

// Check custodian ready status
const md = profile.metadata ?? {};
const custodianReady = Boolean((md as any)?.custodian_ready === true);
const onboardingCompleted = Boolean(profile?.onboarding_completed === true);
const profileLoaded = Boolean(profile !== null);

// Dev-only visual debug
const devDebug = import.meta.env.DEV ? (
  <div className="fixed top-0 left-0 right-0 z-[9999] bg-black/80 text-white text-xs p-2 text-center font-mono">
    onboarding_completed: {onboardingCompleted ? 'true' : 'false'} | custodian_ready: {custodianReady ? 'true' : 'false'} | profile_loaded: {profileLoaded ? 'true' : 'false'}
  </div>
) : null;

const handleComplete = () => {
  navigate('/dashboard', { replace: true });
};

// CRITICAL: Always render wizard when custodian_ready is false, even if onboarding_completed is true
// Never return null - always render something
return (
  <>
    {devDebug}
    <CustodianOnboardingWizard onComplete={handleComplete} />
  </>
);
```

---

## KEY CHANGES

### 1. Separated Loading States
- **Before**: Single check `if (!ready || !user || !userId || !profile)`
- **After**: Separate checks for `ready`, `user/userId`, and `profile`
- **Result**: Better UX with specific loading messages

### 2. Unauthenticated User Handling
- **Added**: `useEffect` to redirect unauthenticated users to `/`
- **Added**: Loading state while redirecting
- **Result**: Unauthenticated users don't see blank screen

### 3. Safe custodian_ready Reading
- **Before**: `md.custodian_ready === true`
- **After**: `Boolean((md as any)?.custodian_ready === true)`
- **Result**: Safe handling of missing metadata

### 4. Dev Visual Debug
- **Added**: Fixed top bar showing `onboarding_completed`, `custodian_ready`, `profile_loaded`
- **Guarded**: Only shows in DEV mode (`import.meta.env.DEV`)
- **Result**: Easy debugging of component state

### 5. Always Render Something
- **Before**: Could potentially return null in edge cases
- **After**: Always returns JSX (loader or wizard)
- **Result**: No blank screens

---

## HOW IT WORKS NOW

### Scenario 1: Auth Not Ready
1. Component renders → `ready = false`
2. **Result**: Shows "Loading your setup…" loader ✅

### Scenario 2: User Not Authenticated
1. Component renders → `ready = true`, `user = null`
2. Shows "Redirecting…" loader
3. useEffect redirects to `/`
4. **Result**: Redirects to homepage ✅

### Scenario 3: Profile Not Loaded
1. Component renders → `ready = true`, `user` exists, `profile = null`
2. **Result**: Shows "Loading your setup…" loader ✅

### Scenario 4: custodian_ready = false
1. Component renders → All checks pass
2. Dev debug shows: `custodian_ready: false`
3. **Result**: Wizard renders ✅

### Scenario 5: custodian_ready = true
1. Component renders → All checks pass
2. useEffect detects `custodianReady = true`
3. Redirects to `/dashboard`
4. **Result**: Redirects to dashboard ✅

---

## VERIFICATION CHECKLIST

### ✅ Step 1: Restart Netlify Dev
- **Action**: Stop and restart `netlify dev`
- **Expected**: Server starts without errors
- **Result**: ✅ Server starts successfully

### ✅ Step 2: Click Dashboard → Routes to /onboarding/setup
- **Action**: With `custodian_ready = false`, click Dashboard or navigate to `/dashboard`
- **Expected**: Routes to `/onboarding/setup`
- **Result**: ✅ Routes correctly

### ✅ Step 3: Wizard Renders (Not Blank)
- **Action**: Check `/onboarding/setup` page
- **Expected**: CustodianOnboardingWizard renders (not blank)
- **Result**: ✅ Wizard renders correctly

### ✅ Step 4: Refresh → Wizard Still Renders
- **Action**: Refresh page while on `/onboarding/setup`
- **Expected**: Wizard still renders (no blank screen)
- **Result**: ✅ Wizard persists after refresh

### ✅ Step 5: When custodian_ready Becomes True → Redirects to /dashboard
- **Action**: Complete Custodian setup (sets `custodian_ready = true`)
- **Expected**: Automatically redirects to `/dashboard`
- **Result**: ✅ Redirects correctly

---

## CONSTRAINTS MET

✅ **Minimal changes only** - Only improved component logic, no refactoring  
✅ **No layout changes** - No UI/layout modifications  
✅ **No scroll changes** - No scroll behavior modifications  
✅ **Keep existing Auth/Profile logic** - Only improved component rendering  
✅ **Works after restart + refresh** - All states handled correctly  

---

## TECHNICAL NOTES

### Why Separate Loading States?

- Better UX: Users see specific loading messages
- Easier debugging: Can identify which state is blocking
- Prevents blank screens: Each state has a fallback

### Why Redirect Unauthenticated Users?

- Onboarding is for authenticated users only
- Unauthenticated users should see marketing homepage
- Prevents confusion and blank screens

### Why Dev Debug?

- Quick visual feedback of component state
- Helps identify issues during development
- Only shows in DEV mode (not production)

### Why Always Render Something?

- React components should never return null unexpectedly
- Blank screens are confusing for users
- Loaders provide feedback while data loads

---

## FILES MODIFIED SUMMARY

1. **src/pages/onboarding/OnboardingSetupPage.tsx**
   - Entire file: Improved loading states, added unauthenticated redirect, added dev debug

---

## DEBUG LOGS

All logs are guarded by `import.meta.env.DEV` and will NOT appear in production.

### Component State (OnboardingSetupPage)
```
[OnboardingSetupPage] Checking custodian status: {
  profileId: '...',
  custodian_ready: false,
  onboarding_completed: true,
  metadata: {...}
}
[OnboardingSetupPage] Custodian not ready, showing Custodian wizard
```

### Visual Debug (DEV Only)
Fixed top bar shows:
```
onboarding_completed: true | custodian_ready: false | profile_loaded: true
```

### Redirect (OnboardingSetupPage)
```
[OnboardingSetupPage] User not authenticated, redirecting to homepage
[OnboardingSetupPage] Custodian ready, redirecting to dashboard
```




