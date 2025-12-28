# Netlify Functions: Remove import.meta.env Usage (CJS-Safe)

## Problem
Netlify deploy logs show CJS bundling warnings:
```
"import.meta" is not available with the "cjs" output format and will be empty
```

Functions affected: `chat.zip`, `prime-state.zip`

## Root Cause
Netlify Functions were using `import.meta.env` which is not available in CommonJS output format, causing bundling warnings even though the code was guarded.

## Solution
Replaced all `import.meta.env` usage in server/functions code paths with `process.env`-based checks.

## Changes Made

### 1. Created Shared DEV Detection Helper
**File:** `netlify/functions/_shared/isDev.ts` (NEW)

```typescript
/**
 * Server-safe DEV detection helper
 * 
 * Use this instead of import.meta.env in Netlify Functions/server code.
 * Works in CJS and ESM environments.
 */
export function isDev(): boolean {
  return (
    process.env.NETLIFY_DEV === 'true' ||
    process.env.NODE_ENV !== 'production'
  );
}
```

### 2. Fixed `netlify/functions/prime-state.ts`
**Line 332:** Replaced `import.meta.env?.DEV` with `process.env` check

```diff
- if (import.meta.env?.DEV || process.env.NETLIFY_DEV === 'true') {
+ if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV !== 'production') {
```

### 3. Fixed `src/server/db.ts`
**Line 186:** Replaced `import.meta.env.DEV` with `process.env` check

```diff
- if (import.meta.env.DEV) {
+ if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV !== 'production') {
```

### 4. Updated `src/env.ts`
**Lines 19-32:** Updated `readEnv` to skip `import.meta` entirely in server contexts

```diff
  const readEnv = (key: string, fallbackKey?: string): string => {
+   // Server-side (Node.js / Netlify Functions) - prefer process.env
+   // Skip import.meta entirely in server contexts to avoid CJS bundling warnings
+   const isServer = typeof process !== 'undefined' && process.env;
+   if (isServer) {
      if (process.env[key]) return process.env[key] as string;
      if (fallbackKey && process.env[fallbackKey]) return process.env[fallbackKey] as string;
+     return ''; // Return early for server-side - don't check import.meta
    }
    // Client-side (Vite browser) - use import.meta.env
    // Safe check: typeof import.meta !== 'undefined' prevents CJS crashes
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      ...
    }
  }
```

**Why:** `readEnv` is used by `getSupabaseUrl()` which is called from `src/server/db.ts` (used by Netlify functions). By detecting server context and returning early, we avoid any `import.meta` references in server code paths.

## Files Changed

1. ✅ `netlify/functions/_shared/isDev.ts` - NEW helper file
2. ✅ `netlify/functions/prime-state.ts` - Removed `import.meta.env?.DEV`
3. ✅ `src/server/db.ts` - Removed `import.meta.env.DEV`
4. ✅ `src/env.ts` - Skip `import.meta` in server contexts

## Verification Steps

### Pre-Deploy Verification

```bash
# Verify no import.meta.env usage in functions
grep -r "import.meta.env" netlify/functions/ --exclude-dir=_shared

# Expected: Only comments, no actual usage

# Verify no import.meta.env usage in server code
grep -r "import.meta.env" src/server/

# Expected: Only vitest test code (OK), no runtime usage
```

### Post-Deploy Verification

**1. Check Netlify Deploy Logs:**
- [ ] **No warnings about `"import.meta" is not available with the "cjs" output format`**
- [ ] **Functions bundle successfully**
- [ ] **Build completes without import.meta warnings**

**2. Test Production Endpoints:**
```bash
# Test prime-state (previously used import.meta.env?.DEV)
curl https://<your-site>.netlify.app/.netlify/functions/prime-state

# Test chat function
curl -X POST https://<your-site>.netlify.app/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","message":"hello"}'
```

**Expected Results:**
- ✅ Functions return 200/401/etc (not 500)
- ✅ No errors in function logs
- ✅ DEV conditionals work correctly (logging in dev mode)

**3. Test Local Development:**
```bash
# Start Netlify Dev
netlify dev

# Test prime-state locally
curl http://localhost:8888/.netlify/functions/prime-state

# Expected: Should log "[prime-state] ✅ Handler called" in dev mode
```

## Technical Details

### DEV Detection Logic

The new server-safe DEV detection checks:
1. `process.env.NETLIFY_DEV === 'true'` - Netlify Dev local environment
2. `process.env.NODE_ENV !== 'production'` - Development mode

This matches the behavior of `import.meta.env.DEV` but works in CJS environments.

### Why This Works

1. **No import.meta in Server Paths:** All server/functions code now uses `process.env` exclusively
2. **Client-Side Preserved:** `src/env.ts` still uses `import.meta.env` for client-side code (Vite browser), but skips it entirely in server contexts
3. **CJS Compatible:** `process.env` works in both CJS and ESM, eliminating bundling warnings

### Note on `src/server/redact.ts`

The file `src/server/redact.ts` still contains `import.meta.vitest` on lines 136-137. This is **intentional** - it's for Vitest test framework integration, not runtime code. Vitest uses `import.meta.vitest` for its test API, which is safe and expected.

## Status

✅ **Fix Applied:** All `import.meta.env` usage removed from server/functions code paths  
✅ **Helper Created:** `isDev()` helper available for future use  
⏳ **Pending:** Deploy and verify warnings are gone

