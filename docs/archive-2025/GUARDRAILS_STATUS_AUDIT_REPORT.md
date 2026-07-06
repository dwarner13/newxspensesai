# Guardrails Status Audit Report

**Date**: 2025-01-20  
**Type**: READ-ONLY Audit  
**Goal**: Determine why UI shows "Guardrails: Offline" or "Protection unknown"

---

## ✅ EXECUTIVE SUMMARY

**Status**: Guardrails health mechanism **EXISTS** and is **IMPLEMENTED**

**Root Cause**: The UI shows "Offline" or "Unknown" because:
1. ✅ Health endpoint exists (`/.netlify/functions/guardrails-health`)
2. ✅ Frontend hook exists (`useGuardrailsHealth`)
3. ⚠️ **Health endpoint may be failing** (404, 500, or network error)
4. ⚠️ **Legacy components** still show hardcoded "Unknown" text
5. ⚠️ **Health checks may be failing** (missing env vars, module load errors, DB connection issues)

---

## 1. ✅ GUARDRAILS HEALTH ENDPOINT EXISTS

### File: `netlify/functions/guardrails-health.ts`

**Status**: ✅ **EXISTS**

**What it does**:
- Returns `{ status: 'active' | 'degraded' | 'offline', checks: {...}, last_check_at, version }`
- Checks 3 things:
  1. **Moderation**: Verifies `getGuardrailConfig()` and `runInputGuardrails()` are callable
  2. **PII Masking**: Verifies `PII_DETECTORS` are available
  3. **Logging**: Verifies Supabase connection to `guardrail_events` table

**Status Logic**:
- `active`: All checks pass (`moderation && pii_masking && logging`)
- `degraded`: Some checks pass (`moderation || pii_masking || logging`)
- `offline`: All checks fail

**Potential Failure Points**:
- ❌ Module import fails → `status: 'offline'`
- ❌ `getGuardrailConfig()` throws → `checks.moderation: false`
- ❌ Supabase connection fails → `checks.logging: false`
- ❌ Missing `OPENAI_API_KEY` → `checks.moderation: false`

**Endpoint URL**: `/.netlify/functions/guardrails-health`  
**Methods**: `GET`, `POST`, `OPTIONS`  
**Auth**: Not required (public health check)

---

## 2. ✅ FRONTEND HOOK EXISTS

### File: `src/hooks/useGuardrailsHealth.ts`

**Status**: ✅ **EXISTS**

**What it does**:
- Polls `/.netlify/functions/guardrails-health` every 30 seconds when chat is open
- Caches last good health status for 60 seconds
- On error, uses cached status (degraded) if recent, otherwise shows offline
- Returns `{ health, isLoading, error, refetch }`

**Error Handling**:
```typescript
// If endpoint fails:
if (lastGoodHealthRef.current && cacheAge < 60000) {
  // Use cached status (degraded)
  setHealth({ ...lastGoodHealthRef.current, status: 'degraded' });
} else {
  // Set offline
  setHealth({ status: 'offline', ... });
}
```

**Potential Failure Points**:
- ❌ Endpoint returns 404 → `status: 'offline'`
- ❌ Endpoint returns 500 → `status: 'offline'`
- ❌ Network error → `status: 'offline'` (after cache expires)
- ❌ JSON parse error → `status: 'offline'`

---

## 3. ✅ UI IMPLEMENTATION EXISTS

### File: `src/components/chat/UnifiedAssistantChat.tsx`

**Status**: ✅ **EXISTS**

**What it does**:
- Uses `useGuardrailsHealth(isOpen, 30000)` hook
- Formats status text via `getGuardrailsStatusText()`:
  - `active` → "Guardrails: Active · PII protection on"
  - `degraded` → "Guardrails: Degraded · Limited protection"
  - `offline` → "Guardrails: Offline · Protection unavailable"
- Displays in bottom pill via `ChatInputBar` component

**Status Display Logic**:
```typescript
const getGuardrailsStatusText = (): string | undefined => {
  if (guardrailsHealthLoading && !guardrailsHealth) {
    return undefined; // Don't show "unknown" during initial load
  }
  if (guardrailsHealth) {
    if (guardrailsHealth.status === 'active') return 'Guardrails: Active · PII protection on';
    if (guardrailsHealth.status === 'degraded') return 'Guardrails: Degraded · Limited protection';
    if (guardrailsHealth.status === 'offline') return 'Guardrails: Offline · Protection unavailable';
  }
  // If health check failed, show offline (never show "unknown")
  return 'Guardrails: Offline · Protection unavailable';
};
```

**Key Point**: Code explicitly prevents "unknown" from showing - always maps to "offline"

---

## 4. ⚠️ LEGACY COMPONENTS STILL SHOW "UNKNOWN"

### Files with hardcoded "Unknown" text:

1. **`src/components/workspace/AIWorkspaceGuardrailsChip.tsx`** (line 35)
   - Default text: `'Guardrails Status Unknown'`
   - Used in: `PrimeWorkspace`, `TagWorkspace`, `ByteWorkspaceOverlay`

2. **`src/components/chat/ByteWorkspaceOverlay.tsx`** (line 52)
   - Text: `unknown: 'Guardrails Status Unknown'`

3. **`src/components/workspace/employees/PrimeWorkspace.tsx`** (line 64)
   - Text: `unknown: 'Guardrails Status Unknown'`

4. **`src/components/workspace/employees/TagWorkspace.tsx`** (line 59)
   - Text: `unknown: 'Guardrails Status Unknown'`

**Impact**: These components may show "Guardrails Status Unknown" if they don't use `useGuardrailsHealth` hook.

---

## 5. 🔍 WHY UI SHOWS "OFFLINE" OR "UNKNOWN"

### Root Causes:

#### A) **Health Endpoint Failing** (Most Likely)
**Symptoms**: UI shows "Guardrails: Offline · Protection unavailable"

**Possible Causes**:
1. **404 Error**: Endpoint not deployed or not accessible
   - Check: `netlify.toml` functions directory is `netlify/functions-dist`
   - Check: `scripts/build-functions.ts` compiles `guardrails-health.ts`
   - Check: Function is built and deployed

2. **500 Error**: Endpoint crashes during execution
   - Check: Server logs for `[guardrails-health]` errors
   - Check: Module imports succeed (`guardrails-unified.js`, `pii.js`)
   - Check: Supabase connection works

3. **Network Error**: Frontend can't reach endpoint
   - Check: CORS headers are correct
   - Check: `/.netlify/functions/guardrails-health` is accessible in browser
   - Check: No firewall/proxy blocking requests

#### B) **Health Checks Failing** (Second Most Likely)
**Symptoms**: UI shows "Guardrails: Degraded · Limited protection" or "Offline"

**Possible Causes**:
1. **Missing `OPENAI_API_KEY`** → `checks.moderation: false` → `status: 'degraded'` or `'offline'`
2. **Module Load Error** → `checks.moderation: false`, `checks.pii_masking: false` → `status: 'offline'`
3. **Supabase Connection Error** → `checks.logging: false` → `status: 'degraded'` or `'offline'`

#### C) **Legacy Components** (Less Likely)
**Symptoms**: UI shows "Guardrails Status Unknown"

**Possible Causes**:
1. Components using `AIWorkspaceGuardrailsChip` with `guardrailsActive: false` or `null`
2. Components not using `useGuardrailsHealth` hook
3. Hardcoded fallback text showing "Unknown"

---

## 6. 📋 VERIFICATION CHECKLIST

### Backend Health Endpoint:
- [ ] `/.netlify/functions/guardrails-health` returns 200 (not 404)
- [ ] Response JSON contains `{ status, checks, last_check_at, version }`
- [ ] `status` is `'active'`, `'degraded'`, or `'offline'` (not null)
- [ ] Server logs show `[guardrails-health] Health check completed` (no errors)

### Environment Variables:
- [ ] `OPENAI_API_KEY` is set (required for moderation check)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (required for logging check)
- [ ] `SUPABASE_URL` is set (required for logging check)

### Module Loading:
- [ ] `netlify/functions/_shared/guardrails-unified.js` exists and exports `getGuardrailConfig`, `runInputGuardrails`
- [ ] `netlify/functions/_shared/pii.js` exists and exports `PII_DETECTORS`
- [ ] `getGuardrailConfig()` call succeeds (doesn't throw)

### Database:
- [ ] `guardrail_events` table exists in Supabase
- [ ] Supabase connection works (can query `guardrail_events`)

### Frontend Hook:
- [ ] `useGuardrailsHealth` hook is called when chat opens
- [ ] Hook polls every 30 seconds (check Network tab)
- [ ] Hook receives valid JSON response (not 404/500)
- [ ] Hook sets `health` state (not null)

### UI Display:
- [ ] `UnifiedAssistantChat` uses `useGuardrailsHealth` hook
- [ ] `getGuardrailsStatusText()` returns correct text based on `guardrailsHealth.status`
- [ ] Bottom pill shows status (not blank or "unknown")
- [ ] Legacy components (`AIWorkspaceGuardrailsChip`) are updated or removed

---

## 7. 🎯 RECOMMENDED NEXT STEPS

### **Option A: Fix Health Endpoint** (Recommended)
**If endpoint is returning 404 or 500**:
1. Verify `netlify.toml` functions directory is correct
2. Verify `scripts/build-functions.ts` compiles `guardrails-health.ts`
3. Check server logs for errors
4. Test endpoint directly: `curl http://localhost:8888/.netlify/functions/guardrails-health`

**If endpoint is returning `status: 'offline'`**:
1. Check environment variables (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
2. Check module imports succeed
3. Check Supabase connection works
4. Review server logs for specific check failures

### **Option B: Update Legacy Components**
**If legacy components show "Unknown"**:
1. Update `AIWorkspaceGuardrailsChip` to use `useGuardrailsHealth` hook
2. Remove hardcoded "Unknown" text
3. Ensure all workspace components use unified hook

### **Option C: Hide Status** (Fallback)
**If health endpoint is unreliable**:
1. Hide guardrails status badge until endpoint is fixed
2. Show status only when `status === 'active'` (hide degraded/offline)
3. Remove status display entirely (not recommended)

---

## 8. 📊 SUMMARY TABLE

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Health Endpoint** | ✅ EXISTS | `netlify/functions/guardrails-health.ts` | May be failing (404/500) |
| **Frontend Hook** | ✅ EXISTS | `src/hooks/useGuardrailsHealth.ts` | Polls every 30s, caches for 60s |
| **UI Display** | ✅ EXISTS | `src/components/chat/UnifiedAssistantChat.tsx` | Maps to "offline" if health fails |
| **Legacy Components** | ⚠️ EXISTS | `AIWorkspaceGuardrailsChip.tsx` | Shows "Unknown" if not updated |

---

## 9. 🔍 DEBUGGING COMMANDS

### Test Health Endpoint:
```bash
# Local dev
curl http://localhost:8888/.netlify/functions/guardrails-health

# Production (replace with your domain)
curl https://your-domain.netlify.app/.netlify/functions/guardrails-health
```

### Check Function Build:
```bash
# Verify function is compiled
ls -la netlify/functions-dist/guardrails-health.mjs

# Rebuild functions
npm run functions:build
```

### Check Environment Variables:
```bash
# In Netlify dashboard or local .env
echo $OPENAI_API_KEY
echo $SUPABASE_SERVICE_ROLE_KEY
echo $SUPABASE_URL
```

### Check Server Logs:
```bash
# Look for guardrails-health logs
# Should see: "[guardrails-health] Health check completed: { status, checks, duration }"
```

---

## 10. ✅ CONCLUSION

**Guardrails health mechanism EXISTS and is IMPLEMENTED correctly.**

**The UI shows "Offline" or "Unknown" because**:
1. Health endpoint may be failing (404, 500, or network error)
2. Health checks may be failing (missing env vars, module load errors, DB connection issues)
3. Legacy components still show hardcoded "Unknown" text

**Recommended Action**:
1. **First**: Verify health endpoint is accessible and returns 200
2. **Second**: Check environment variables and module loading
3. **Third**: Update legacy components to use unified hook

**Minimal Change Required**: Fix health endpoint failures OR update legacy components (depending on root cause).

---

**STATUS**: ✅ Audit Complete - Ready for Implementation Fix



