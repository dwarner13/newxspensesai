# Netlify Functions ESM Format Fix

## Problem
Netlify deploy logs show warnings:
```
"import.meta" is not available with the "cjs" output format and will be empty
```

Functions affected: `chat.zip`, `prime-state.zip`

## Root Cause
Despite having:
- `package.json` with `"type": "module"`
- `netlify.toml` with `node_bundler = "esbuild"`

Netlify's esbuild bundler was still outputting CommonJS format, causing `import.meta` warnings.

## Solution
Added explicit ESM format configuration to `[functions.esbuild]` section:

```toml
[functions.esbuild]
  format = "esm"
  sourcemap = false
```

## Change Made

**File:** `netlify.toml`

**Diff:**
```diff
[functions.esbuild]
+  format = "esm"
   sourcemap = false
```

## Verification Steps

### 1. Pre-Deploy Verification

```bash
# Verify netlify.toml has format = "esm"
grep -A 2 "\[functions.esbuild\]" netlify.toml

# Expected output:
# [functions.esbuild]
#   format = "esm"
#   sourcemap = false
```

### 2. Post-Deploy Verification

**In Netlify Dashboard → Deploys → Latest Deploy → Build Log:**

- [ ] **No warnings about "import.meta" and "cjs output format"**
- [ ] **Functions bundle successfully**
- [ ] **Build log shows esbuild bundling with ESM format**

**Check Function Logs:**
- [ ] **No runtime errors related to `import.meta`**
- [ ] **Functions execute successfully**

### 3. Test Production Endpoints

```bash
# Test prime-state (uses import.meta.env)
curl https://<your-site>.netlify.app/.netlify/functions/prime-state

# Test chat function
curl -X POST https://<your-site>.netlify.app/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","message":"hello"}'
```

**Expected Results:**
- ✅ Functions return 200/401/etc (not 500)
- ✅ No errors in function logs
- ✅ `import.meta.env` works correctly in `prime-state.ts`

## Technical Details

### Why This Works

1. **Explicit Format:** Setting `format = "esm"` explicitly tells esbuild to output ESM, regardless of other settings
2. **Compatibility:** Works with `package.json` `"type": "module"` setting
3. **Netlify Support:** Netlify's esbuild integration respects the `format` option in `[functions.esbuild]`

### Functions Using import.meta

- `netlify/functions/prime-state.ts` (line 332):
  ```typescript
  if (import.meta.env?.DEV || process.env.NETLIFY_DEV === 'true') {
  ```

### Alternative (if format option not supported)

If Netlify doesn't support `format` in TOML, the functions should still work because:
- `package.json` has `"type": "module"`
- Functions use ESM syntax (`export const handler`)
- Netlify should detect ESM from `package.json`

However, explicit `format = "esm"` ensures esbuild outputs ESM format.

## Status

✅ **Fix Applied:** `format = "esm"` added to `[functions.esbuild]`  
⏳ **Pending:** Deploy and verify warnings are gone

