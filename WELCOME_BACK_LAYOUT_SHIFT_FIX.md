# Welcome Back Overlay Layout Shift Fix

**Date:** 2025-01-20  
**Status:** ✅ Complete  
**Objective:** Fix WelcomeBackOverlay causing dashboard/floating rail layout shifts

---

## 🐛 Problem

**Symptoms:**
- Dashboard content and floating rail appear shifted when WelcomeBackOverlay opens/closes
- Layout reflows occur when overlay mounts/unmounts

**Root Cause:** 
- Overlay was rendered inside dashboard layout tree (`RouteDecisionGate`)
- Multiple `fixed` positioned elements can cause layout recalculation
- Portal structure needed proper wrapper hierarchy

---

## ✅ Solution

### 1. Portal Structure Fix

**File:** `src/components/onboarding/WelcomeBackOverlay.tsx`

**Before:**
```tsx
return createPortal(
  <>
    <div className="fixed inset-0 z-[9999]"> {/* Backdrop */}
    <div className="fixed inset-0 z-[10000]"> {/* Content */}
  </>,
  document.body
);
```

**After:**
```tsx
return createPortal(
  <div className="fixed inset-0 z-[9999]"> {/* Root wrapper - fixed */}
    <div className="absolute inset-0"> {/* Backdrop - absolute */}
    <div className="absolute inset-0"> {/* Content - absolute */}
    <div className="relative"> {/* Card - relative */}
  </div>,
  document.body
);
```

**Key Changes:**
- ✅ Single root wrapper: `fixed inset-0 z-[9999]`
- ✅ Backdrop: `absolute inset-0` (relative to root wrapper)
- ✅ Content container: `absolute inset-0` (relative to root wrapper)
- ✅ Card: `relative` (not fixed)

### 2. Scroll Lock (No Padding/Width Changes)

**Implementation:**
```tsx
useEffect(() => {
  if (!isVisible) return;

  // Store original overflow value
  const prev = document.body.style.overflow;
  
  // Lock scroll - ONLY change overflow, nothing else
  document.body.style.overflow = 'hidden';
  
  // Dev-only debug logging
  if (import.meta.env.DEV) {
    console.debug('[WelcomeBackOverlay] open', {
      bodyOverflow: getComputedStyle(document.body).overflow,
      bodyPaddingRight: getComputedStyle(document.body).paddingRight,
      bodyWidth: getComputedStyle(document.body).width,
      bodyMarginRight: getComputedStyle(document.body).marginRight,
    });
  }
  
  // Cleanup: Restore original overflow on unmount/close
  return () => {
    document.body.style.overflow = prev;
  };
}, [isVisible]);
```

**Safety:**
- ✅ Only changes `overflow` property
- ✅ Does NOT add `padding-right`
- ✅ Does NOT change `width`
- ✅ Does NOT change `margin-right`
- ✅ Does NOT use `transform` on body
- ✅ Restores original value on cleanup

### 3. Debug Logging

**Added:** Dev-only console.debug when overlay opens

**Logs:**
- `bodyOverflow`: Current overflow value
- `bodyPaddingRight`: Should be `0px` (no padding added)
- `bodyWidth`: Should be unchanged
- `bodyMarginRight`: Should be unchanged

---

## 📝 Files Modified

**Modified:**
- `src/components/onboarding/WelcomeBackOverlay.tsx`
  - Fixed portal structure (single root wrapper)
  - Changed backdrop/content from `fixed` to `absolute`
  - Added debug logging
  - Scroll lock only changes overflow

---

## ✅ Verification Steps

### Step 1: No Layout Shift on Open

1. Log in and navigate to dashboard
2. **Expected:** Dashboard content and floating rail are in correct positions
3. WelcomeBackOverlay appears
4. **Expected:** Dashboard content and floating rail remain in EXACT same positions (no shift)
5. Check console for debug log:
   ```
   [WelcomeBackOverlay] open {
     bodyOverflow: "hidden",
     bodyPaddingRight: "0px",  // ✅ No padding added
     bodyWidth: "...",         // ✅ Unchanged
     bodyMarginRight: "0px"     // ✅ No margin added
   }
   ```

### Step 2: No Layout Shift on Close

1. Close overlay (X, ESC, or click outside)
2. **Expected:** No layout shift when closing
3. **Expected:** Body overflow restored to original value

### Step 3: Portal Structure

1. Open browser DevTools → Elements
2. When overlay is visible, check DOM structure
3. **Expected:** Structure:
   ```
   <body>
     <div class="fixed inset-0 z-[9999]">  <!-- Root wrapper -->
       <div class="absolute inset-0">      <!-- Backdrop -->
       <div class="absolute inset-0">      <!-- Content -->
         <div class="relative">            <!-- Card -->
   ```
4. **Expected:** Overlay is direct child of `<body>`, not inside dashboard containers

### Step 4: Window Resize

1. Open overlay
2. Resize browser window
3. **Expected:** Dashboard content and floating rail remain stable (no drift)
4. Close overlay
5. **Expected:** No layout shift

### Step 5: Refresh Test

1. Open overlay
2. Refresh page
3. **Expected:** No layout shift
4. **Expected:** Overlay appears correctly (if session allows)

---

## 🎯 Key Features

✅ **Portal Rendering:** Overlay renders outside layout tree  
✅ **Proper Structure:** Single root wrapper with absolute children  
✅ **No Layout Impact:** Dashboard layout unaffected  
✅ **Scroll Lock:** Only toggles `overflow` (safe)  
✅ **Debug Logging:** Dev-only logging for verification  
✅ **No Padding/Width Changes:** Body dimensions unchanged  

---

## 🔍 Structure Hierarchy

```
document.body (Portal target)
└── <div className="fixed inset-0 z-[9999]"> (Root wrapper - fixed)
    ├── <div className="absolute inset-0"> (Backdrop - absolute)
    └── <div className="absolute inset-0"> (Content container - absolute)
        └── <div className="relative"> (Card - relative)
```

**Why This Works:**
- Root wrapper is `fixed` → positions relative to viewport
- Backdrop/content are `absolute` → positions relative to root wrapper
- Card is `relative` → positions relative to content container
- All elements are inside portal → outside dashboard layout tree

---

**End of Document**




