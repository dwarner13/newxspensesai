# React StrictMode Disable Guide

**Date:** 2025-01-20  
**Purpose:** Debug mount/unmount "reload" behavior in development

---

## 📋 Summary

Added a DEV-ONLY flag to conditionally disable React StrictMode for debugging purposes. This helps determine if StrictMode's double-rendering behavior is causing unwanted reload effects.

---

## 🔧 Implementation

### File: `src/main.tsx`

**Changes:**
- Added `DISABLE_STRICT_MODE` flag (DEV-only, controlled by env var)
- Conditionally wraps app with `<StrictMode>` based on flag
- Extracted app wrapper to avoid duplication

**Flag Logic:**
```typescript
const DISABLE_STRICT_MODE = import.meta.env.DEV && import.meta.env.VITE_DISABLE_STRICT_MODE === 'true';
```

---

## 🚀 How to Use

### Enable StrictMode Disable (for testing)

1. **Create/Edit `.env.local` file** (in project root):
   ```bash
   VITE_DISABLE_STRICT_MODE=true
   ```

2. **Restart dev server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. **Verify:** Check browser console - you should see components mount only once (no double-mount)

### Disable StrictMode Disable (revert to normal)

1. **Remove or set to false in `.env.local`:**
   ```bash
   VITE_DISABLE_STRICT_MODE=false
   # or remove the line entirely
   ```

2. **Restart dev server**

---

## ✅ Verification Steps

### Step 1: Baseline (StrictMode Enabled)

1. Ensure `.env.local` does NOT have `VITE_DISABLE_STRICT_MODE=true`
2. Start dev server
3. Open browser DevTools → Console
4. Navigate to dashboard
5. **Expected:** Components mount twice (StrictMode behavior)
   - Look for: `[ComponentName] Mount` logs appearing twice
   - Or: useEffect running twice on initial mount

### Step 2: Test with StrictMode Disabled

1. Add `VITE_DISABLE_STRICT_MODE=true` to `.env.local`
2. Restart dev server (required for env var changes)
3. Clear browser cache/refresh
4. Navigate to dashboard
5. **Expected:** Components mount once only
   - Look for: `[ComponentName] Mount` logs appearing once
   - Or: useEffect running once on initial mount

### Step 3: Compare Behavior

**If "reloading" stops when StrictMode is disabled:**
- ✅ Confirms StrictMode is causing the behavior
- This is expected in dev mode (StrictMode intentionally double-mounts)
- Consider: Is the "reload" actually a problem, or just StrictMode's helpful debugging?

**If "reloading" continues when StrictMode is disabled:**
- ❌ StrictMode is NOT the cause
- Look for other causes:
  - Hot Module Replacement (HMR) issues
  - State management re-initialization
  - Route transitions
  - Auth context re-initialization

---

## 🔍 What to Look For

### Console Logs

Watch for these patterns:

**With StrictMode (normal):**
```
[AuthContext] Mount
[AuthContext] Mount  // ← Second mount (StrictMode)
[Component] Mount
[Component] Mount    // ← Second mount (StrictMode)
```

**Without StrictMode (disabled):**
```
[AuthContext] Mount
[Component] Mount    // ← Only one mount
```

### Component Behavior

**StrictMode Effects:**
- useEffect runs twice on mount
- Components mount → unmount → mount again
- State resets between mounts
- Can cause "flash" or "reload" appearance

**Without StrictMode:**
- useEffect runs once on mount
- Components mount once
- State persists normally
- No double-mount behavior

---

## ⚠️ Important Notes

### DO NOT Commit with StrictMode Disabled

**Never commit:**
```typescript
const DISABLE_STRICT_MODE = true; // ❌ BAD
```

**Always use env var:**
```typescript
const DISABLE_STRICT_MODE = import.meta.env.DEV && import.meta.env.VITE_DISABLE_STRICT_MODE === 'true'; // ✅ GOOD
```

### Why Keep StrictMode Enabled?

StrictMode helps catch:
- Unsafe lifecycle methods
- Deprecated APIs
- Side effects without cleanup
- State update issues

**Production builds** automatically disable StrictMode-like behavior, so this is dev-only.

---

## 🔄 Reverting Changes

### Option 1: Remove Env Var

1. Delete or comment out `VITE_DISABLE_STRICT_MODE=true` in `.env.local`
2. Restart dev server
3. StrictMode re-enabled automatically

### Option 2: Revert Code Changes

If you want to remove the flag entirely:

1. **Revert `src/main.tsx` to:**
   ```typescript
   createRoot(document.getElementById('root')!).render(
     <StrictMode>
       <HelmetProvider>
         {/* ... rest of app ... */}
       </HelmetProvider>
     </StrictMode>
   );
   ```

2. **Remove the flag declaration:**
   ```typescript
   // Delete this line:
   const DISABLE_STRICT_MODE = import.meta.env.DEV && import.meta.env.VITE_DISABLE_STRICT_MODE === 'true';
   ```

---

## 📝 Files Modified

**Modified:**
- `src/main.tsx` (added conditional StrictMode wrapper)

**Created:**
- `STRICT_MODE_DISABLE_GUIDE.md` (this file)

---

## 🎯 Expected Outcomes

### If StrictMode is the cause:
- "Reload" behavior stops when disabled
- Components mount once instead of twice
- useEffect runs once instead of twice
- **Action:** Accept this as normal dev behavior, or refactor components to be StrictMode-safe

### If StrictMode is NOT the cause:
- "Reload" behavior continues when disabled
- Need to investigate other causes:
  - HMR configuration
  - State management
  - Route transitions
  - Auth context initialization

---

**End of Document**




