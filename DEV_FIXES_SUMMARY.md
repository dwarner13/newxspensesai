# Dev Fixes Summary - Netlify Functions 404 + Hook Order

**Date**: 2025-01-20  
**Status**: In Progress

---

## ISSUES IDENTIFIED

### Issue A: Netlify Functions Returning 404
- `/.netlify/functions/prime-state` returns 404
- Other functions (`activity-feed`, `smart_import_stats`) also 404
- `netlify/functions-dist` directory is empty (functions not built)

### Issue B: Prime Chat "Blink / Open Twice"
- React warning: "Hook count changed between renders"
- Chat opens twice / blinks
- X button may not close reliably

---

## ROOT CAUSES

### A) Functions Not Built
- `netlify.toml` points to `netlify/functions-dist` but directory is empty
- Build script (`scripts/build-functions.ts`) has import syntax issue preventing build
- `dev:netlify` script runs functions:dev and netlify dev concurrently, but functions may not be built before netlify dev starts

### B) Hook Order Issue
- Component has early return (`if (!shouldMount)`) AFTER all hooks are called (correct)
- However, hooks might be called conditionally based on `shouldMount` state changes
- Component unmounts/remounts causing hook count to change

---

## FIXES APPLIED

### 1. Fixed Build Script Import Syntax

**File**: `scripts/build-functions.ts`

**Change**: Fixed import statement that was causing tsx/esbuild to fail

```diff
- import { glob } from 'glob';
+ import { globSync } from 'glob';
- import * as path from 'path';
- import * as fs from 'fs';
+ import path from 'node:path';
+ import fs from 'node:fs';
```

**Also**: Removed `**/*.ts` from comment (was causing parse error)

**Status**: ✅ Fixed - Script now runs (but has import resolution errors to fix separately)

---

### 2. Added Ping Healthcheck Function

**File**: `netlify/functions/ping.ts` (NEW)

**Purpose**: Simple healthcheck to verify functions are serving

```typescript
export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, message: 'Pong!', timestamp: ... }),
  };
};
```

**Status**: ✅ Created

---

### 3. Hook Order Fix (In Progress)

**File**: `src/components/chat/UnifiedAssistantChat.tsx`

**Issue**: Early return happens after hooks, but component unmounts/remounts causing hook count warnings

**Current Code** (lines 1216-1223):
```typescript
// Early return: Don't mount until conditions are stable
// CRITICAL: This happens AFTER all hooks are called
if (!shouldMount) {
  return (
    <div className="hidden" aria-hidden="true" />
  );
}
```

**Analysis**: 
- ✅ All hooks are called before early return (correct)
- ⚠️ Component still unmounts when `shouldMount` changes from false → true
- ⚠️ This causes React to see different hook counts between renders

**Fix Needed**: Ensure component never unmounts, only hides with CSS (already partially implemented)

---

## REMAINING WORK

### A) Fix Function Build Import Resolution

**Error**: 
```
Could not resolve "../../src/lib/ai/userContext.js"
Could not resolve "../../src/lib/ai/systemPrompts.js"
```

**Options**:
1. Make these imports external in build script
2. Fix import paths to use relative paths from functions directory
3. Copy these files to functions directory

**Recommended**: Add to `external` array in `buildOptions`:

```typescript
external: [
  '@supabase/supabase-js',
  'openai',
  // ... existing
  '../../src/lib/ai/userContext.js',  // Add
  '../../src/lib/ai/systemPrompts.js', // Add
],
```

**OR**: Fix import paths in `contextInjection.ts` to use absolute imports or copy files.

---

### B) Ensure Functions Build Before Netlify Dev Starts

**Current Script**:
```json
"dev:netlify": "concurrently \"npm run functions:dev\" \"netlify dev --port 8888\""
```

**Issue**: `netlify dev` may start before functions are built

**Fix**: Build functions once before starting watch:

```json
"dev:netlify": "npm run functions:build && concurrently \"npm run functions:dev\" \"netlify dev --port 8888\""
```

---

### C) Fix Hook Order Warning

**Current**: Component returns `<div className="hidden">` when `!shouldMount`, which still causes unmount

**Fix**: Ensure component always renders (never returns early), use CSS to hide:

```typescript
// Remove early return, always render
// Use shouldHide variable (already exists) to control visibility
return (
  <div className={shouldHide ? 'hidden' : ''} aria-hidden={shouldHide}>
    {/* ... chat content ... */}
  </div>
);
```

**Note**: Component already has `shouldHide` logic (line 1699), but early return (line 1219) prevents it from being used.

---

## VERIFICATION STEPS

### After Fixes Applied:

1. **Build Functions**:
   ```bash
   npm run functions:build
   ```
   Expected: Functions build successfully, `netlify/functions-dist` populated

2. **Start Dev Server**:
   ```bash
   npm run dev:netlify
   ```
   Expected: Functions build first, then netlify dev starts

3. **Test Ping Endpoint**:
   ```bash
   curl http://localhost:8888/.netlify/functions/ping
   ```
   Expected: `{"ok": true, "message": "Pong!", ...}`

4. **Test Prime State Endpoint**:
   ```bash
   curl http://localhost:8888/.netlify/functions/prime-state
   ```
   Expected: `200 OK` with PrimeState JSON (or 401 if not authenticated)

5. **Test Chat**:
   - Open Prime Chat
   - Verify no "Hook count changed" warning
   - Verify chat opens once (no blink)
   - Verify X button closes chat

---

## FILES CHANGED

1. ✅ `scripts/build-functions.ts` - Fixed import syntax
2. ✅ `netlify/functions/ping.ts` - Added healthcheck
3. ⏳ `src/components/chat/UnifiedAssistantChat.tsx` - Hook order fix (pending)
4. ⏳ `package.json` - Update dev:netlify script (pending)
5. ⏳ `scripts/build-functions.ts` - Fix import resolution (pending)

---

## NEXT STEPS

1. Fix import resolution in build script (add to external or fix paths)
2. Update `dev:netlify` script to build functions first
3. Remove early return in UnifiedAssistantChat, use CSS hiding only
4. Test all endpoints return 200
5. Verify no hook warnings in console



