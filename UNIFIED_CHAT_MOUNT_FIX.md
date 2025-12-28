# UnifiedAssistantChat Mount/Unmount Fix

**Date:** 2025-01-20  
**Status:** ✅ Complete  
**Objective:** Stop UnifiedAssistantChat from mounting/unmounting repeatedly due to onboarding/profile gating

---

## 📋 Summary

Refactored UnifiedAssistantChat to use stable readiness signals from AuthContext (matching RouteDecisionGate logic). Chat now only mounts once after route and profile readiness are stable, preventing flicker and unmount/remount loops.

---

## 🔧 Implementation

### File: `src/components/chat/UnifiedAssistantChat.tsx`

**Changes:**
- Removed unreliable window state checks (`__onboardingState`, `__profileData`)
- Removed complex profile metadata checks
- Added stable gating using AuthContext signals:
  - `routeReady = ready && !isProfileLoading`
  - `onboardingCompleted` (same logic as RouteDecisionGate)
- Early return before hooks if on onboarding route
- Early return after hooks if not ready/onboarding incomplete
- Added debug logging for mount decisions

**Gating Logic:**
```typescript
// 1. Hard block: onboarding routes
if (isOnboardingRoute) return null;

// 2. Get auth state
const { ready, userId, profile, isProfileLoading, ... } = useAuth();

// 3. Check route readiness
const routeReady = ready && !isProfileLoading;

// 4. Check onboarding completion (same as RouteDecisionGate)
const onboardingCompleted = useMemo(() => {
  if (!profile) return false;
  const onboardingStatus = (profile as any).onboarding_status;
  return onboardingStatus === 'completed' || profile.onboarding_completed === true;
}, [profile]);

// 5. Mount only when both conditions met
const shouldMount = routeReady && onboardingCompleted;
if (!shouldMount) return null;
```

---

## 🔍 What Changed

### Before

- Used unreliable window state (`__onboardingState`, `__profileData`)
- Checked profile metadata in complex way
- Could mount/unmount on route changes
- Multiple sources of truth for onboarding status

### After

- Uses AuthContext signals (same as RouteDecisionGate)
- Single source of truth for onboarding status
- Only mounts once when conditions are stable
- Does not unmount on normal route changes within `/dashboard`

---

## ✅ Verification Steps

### Step 1: Navigate Between Dashboard Pages

1. Log in and complete onboarding
2. Navigate to `/dashboard`
3. Navigate to `/dashboard/transactions`
4. Navigate to `/dashboard/settings`
5. Navigate back to `/dashboard`
6. **Expected:** Chat mounts ONCE (not on every route change)
7. **Expected:** No unmount/remount logs in console

### Step 2: Check Console Logs

1. Open browser DevTools → Console
2. Filter for `[CHAT_MOUNT]`
3. **Expected:** See "✅ Chat mount allowed" ONCE after onboarding completes
4. **Expected:** No "⛔ Chat mount blocked" after onboarding completed
5. **Expected:** No repeated mount/unmount logs

### Step 3: Verify No Flicker

1. Navigate between dashboard pages rapidly
2. **Expected:** Chat panel does not flicker or disappear
3. **Expected:** Chat stays mounted (if it was open)

### Step 4: Test After Onboarding

1. Complete onboarding flow
2. Navigate to dashboard
3. **Expected:** Chat mounts once
4. **Expected:** No "Blocked visibility during onboarding" messages after onboarding completes

---

## 📝 Files Modified

**Modified:**
- `src/components/chat/UnifiedAssistantChat.tsx` (refactored gating logic)

---

## 🎯 Key Improvements

1. **Stable Signals:** Uses same logic as RouteDecisionGate
2. **Single Source of Truth:** AuthContext profile data only
3. **No Window State:** Removed unreliable window globals
4. **Early Returns:** Prevents unnecessary hook calls
5. **Debug Logging:** Clear visibility into mount decisions

---

## 🔄 How to Revert

If needed, revert to previous logic:

1. Restore window state checks:
   ```typescript
   const onboardingState = (window as any).__onboardingState;
   const profileData = (window as any).__profileData;
   ```

2. Restore complex metadata checks:
   ```typescript
   const onboardingCompleted = profileData?.metadata && typeof profileData.metadata === 'object'
     ? (profileData.metadata as any)?.onboarding?.completed === true
     : false;
   ```

3. Restore old gating logic

---

**End of Document**




