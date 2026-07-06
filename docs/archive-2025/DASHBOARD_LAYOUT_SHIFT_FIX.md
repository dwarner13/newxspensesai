# Dashboard Layout Shift Fix

**Date:** 2025-01-20  
**Status:** ✅ Complete  
**Objective:** Fix dashboard UI shifting right (top-right profile icons + floating rail)

---

## 🐛 Problem

**Symptoms:**
- Fixed/right UI (floating rail + top-right nav) appears offset to the right
- Dashboard content appears shifted

**Root Cause:** 
- `GuidedOnboardingShell.tsx` was modifying `document.body.style.width`, `position`, and `top` for scroll lock
- If cleanup doesn't run properly, these styles persist and cause layout shifts
- Aggressive scroll lock (position: fixed, width: 100%) can cause layout recalculation

---

## ✅ Solution

### 1. Fixed GuidedOnboardingShell Scroll Lock

**File:** `src/components/onboarding/GuidedOnboardingShell.tsx` (lines 83-120)

**Before:**
```tsx
// Aggressive scroll lock - modifies position, width, top
document.body.style.overflow = 'hidden';
document.body.style.position = 'fixed';
document.body.style.top = `-${scrollY}px`;
document.body.style.width = '100%';
```

**After:**
```tsx
// Safe scroll lock - ONLY changes overflow
const prev = document.body.style.overflow;
document.body.style.overflow = 'hidden';

return () => {
  document.body.style.overflow = prev;
};
```

**Changes:**
- ✅ Removed `position = 'fixed'` modification
- ✅ Removed `top` modification
- ✅ Removed `width = '100%'` modification
- ✅ Only changes `overflow` property (safe)
- ✅ Proper cleanup restores original overflow

### 2. Added Debug Logging

**File:** `src/layouts/DashboardLayout.tsx` (lines 134-145)

**Added:**
```tsx
useEffect(() => {
  if (import.meta.env.DEV) {
    console.debug('[LayoutDebug] DashboardLayout mounted', {
      bodyPaddingRight: getComputedStyle(document.body).paddingRight,
      htmlPaddingRight: getComputedStyle(document.documentElement).paddingRight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      bodyPosition: getComputedStyle(document.body).position,
      bodyWidth: getComputedStyle(document.body).width,
      bodyMarginRight: getComputedStyle(document.body).marginRight,
    });
  }
}, []);
```

**Purpose:** Monitor body/html styles to detect any unwanted modifications

### 3. Verified WelcomeBackOverlay Scroll Lock

**File:** `src/components/onboarding/WelcomeBackOverlay.tsx`

**Status:** ✅ Already correct
- Only changes `overflow` property
- Does NOT add `padding-right`
- Does NOT change `width`
- Proper cleanup

---

## 📝 Files Modified

**Modified:**
- `src/components/onboarding/GuidedOnboardingShell.tsx` (simplified scroll lock)
- `src/layouts/DashboardLayout.tsx` (added debug logging)

---

## ✅ Verification Steps

### Step 1: Check Debug Logs

1. Reload app
2. Open browser DevTools → Console
3. **Expected:** See `[LayoutDebug] DashboardLayout mounted` log
4. **Expected:** All values should be:
   - `bodyPaddingRight: "0px"` ✅
   - `htmlPaddingRight: "0px"` ✅
   - `bodyOverflow: "auto"` or `"scroll"` (not "hidden" unless overlay is open) ✅
   - `bodyPosition: "static"` ✅
   - `bodyWidth: "..."` (not "100%") ✅
   - `bodyMarginRight: "0px"` ✅

### Step 2: Visual Check

1. Navigate to dashboard
2. **Expected:** Top-right profile icons align correctly
3. **Expected:** Floating rail (`right-4`) is in correct position
4. **Expected:** No rightward shift

### Step 3: Test Onboarding Flow

1. Complete onboarding (if needed)
2. **Expected:** No layout shift during onboarding
3. **Expected:** After onboarding completes, dashboard aligns correctly

### Step 4: Test WelcomeBackOverlay

1. Log out and log back in
2. WelcomeBackOverlay appears
3. **Expected:** Dashboard remains aligned (no shift)
4. Close overlay
5. **Expected:** No layout shift when closing

### Step 5: Window Resize

1. Resize browser window
2. **Expected:** Dashboard content and floating rail remain stable
3. **Expected:** No drift or shift

---

## 🔍 Root Cause Summary

**Issue:** `GuidedOnboardingShell` was using aggressive scroll lock that modified:
- `document.body.style.position = 'fixed'`
- `document.body.style.width = '100%'`
- `document.body.style.top = '-{scrollY}px'`

**Problem:** If cleanup doesn't run properly (e.g., component unmounts unexpectedly), these styles persist and cause layout shifts.

**Fix:** Simplified to only change `overflow` property, which is safe and doesn't affect layout.

---

## 🎯 Key Changes

✅ **GuidedOnboardingShell:** Only changes `overflow` (safe)  
✅ **WelcomeBackOverlay:** Already correct (only changes `overflow`)  
✅ **Debug Logging:** Added to monitor body/html styles  
✅ **No Padding/Width Changes:** Body dimensions unchanged  

---

**End of Document**




