# UnifiedAssistantChat Crash Loop Fix

**Date:** 2025-01-20  
**Status:** ✅ Complete  
**Objective:** Fix crash loop caused by undefined `onboardingActive` reference

---

## 🐛 Problem

**Issue:** `UnifiedAssistantChat.tsx` referenced `onboardingActive` on line 1098, which was not defined anywhere in the component.

**Impact:**
- Threw `ReferenceError: onboardingActive is not defined`
- Triggered ErrorBoundary
- Caused app to re-render repeatedly (appeared as page reloads)
- Created crash loop

---

## ✅ Solution

### File: `src/components/chat/UnifiedAssistantChat.tsx` (lines 1098-1119)

**Changes:**
1. **Removed undefined reference:** `const shouldHideOnboarding = onboardingActive;`
2. **Added safe derived logic:** Created `onboardingBlocked` using `useMemo` with existing signals
3. **Added debug logging:** One-time mount confirmation log

**New Logic:**
```typescript
// Derive onboarding blocked state from existing signals
const onboardingBlocked = useMemo(() => {
  // Check if we're on an onboarding route (shouldn't happen due to early return, but safe check)
  if (location.pathname.startsWith('/onboarding')) {
    return true;
  }
  // Check if onboarding is not completed (shouldn't happen due to early return, but safe check)
  if (!onboardingCompleted) {
    return true;
  }
  // Otherwise, onboarding is not blocked
  return false;
}, [location.pathname, onboardingCompleted]);

const shouldHideOnboarding = onboardingBlocked;

// Debug log: one-time mount confirmation
useEffect(() => {
  console.debug('[UnifiedAssistantChat] mount allowed', { onboardingBlocked });
}, []); // Empty deps = run once on mount
```

---

## 🔍 Why This Works

**Safety:**
- Uses only existing signals (`location.pathname`, `onboardingCompleted`)
- No undefined variables
- No ReferenceError possible

**Logic:**
- At this point in the code, we've already passed early returns for:
  - Onboarding routes (line 110-112)
  - Incomplete onboarding (line 163-165)
- So `onboardingBlocked` should be `false` in normal operation
- But we compute it safely for CSS hiding logic

**Performance:**
- `useMemo` ensures computation only happens when dependencies change
- Debug log runs once on mount (empty dependency array)

---

## ✅ Verification

### Step 1: No ReferenceError

1. Open browser DevTools → Console
2. Navigate to dashboard
3. **Expected:** No `ReferenceError: onboardingActive is not defined`
4. **Expected:** See debug log: `[UnifiedAssistantChat] mount allowed { onboardingBlocked: false }`

### Step 2: No ErrorBoundary Trigger

1. Navigate between dashboard pages
2. **Expected:** No ErrorBoundary errors
3. **Expected:** No crash loops or page reloads

### Step 3: Chat Mounts Correctly

1. Complete onboarding
2. Navigate to dashboard
3. **Expected:** Chat mounts once
4. **Expected:** No repeated mount/unmount logs

### Step 4: Normal Navigation Works

1. Navigate between `/dashboard`, `/dashboard/transactions`, `/dashboard/settings`
2. **Expected:** Chat stays mounted (doesn't unmount/remount)
3. **Expected:** No errors in console

---

## 📝 Files Modified

**Modified:**
- `src/components/chat/UnifiedAssistantChat.tsx` (fixed undefined reference, added safe logic)

---

## 🎯 Key Improvements

✅ **No ReferenceError:** All variables are properly defined  
✅ **Safe Logic:** Uses only existing signals  
✅ **Debug Logging:** One-time mount confirmation  
✅ **Performance:** useMemo optimization  
✅ **Stability:** No crash loops or ErrorBoundary triggers  

---

**End of Document**




