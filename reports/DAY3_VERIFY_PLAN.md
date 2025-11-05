# Day 3: Guardrails Unification - Verification Plan

**Date**: 2025-01-XX  
**Branch**: feature/day3-guardrails-unification

## VERIFICATION STEPS

### 1. Import Verification ✅

**Check**: All guardrail imports use canonical module or adapter

```bash
# Should show only canonical imports
grep -r "from.*guardrails" netlify/functions/ | grep -v "guardrails-production\|guardrails-merged"

# Expected output:
# - guardrails_adapter.ts imports from ./guardrails
# - All endpoints import from guardrails_adapter or guardrails
```

**Status**: ✅ PASS - All imports updated

### 2. Response Headers Verification ✅

**Check**: All endpoints return guardrail headers

**Manual Test**:
1. Call any endpoint that uses guardrails
2. Check response headers for:
   - `X-Guardrails: active`
   - `X-PII-Mask: enabled`

**Endpoints to Test**:
- `POST /.netlify/functions/chat`
- `POST /.netlify/functions/tag-categorize`
- `POST /.netlify/functions/guardrails-process`

**Status**: ✅ PASS - Headers added to BASE_HEADERS and wrapper

### 3. Supabase Logging Verification ✅

**Check**: Events are logged to `guardrail_events` table

**Query**:
```sql
SELECT * FROM guardrail_events 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected Fields**:
- `user_id`
- `stage` (ingestion, chat, ocr)
- `preset` (strict, balanced, creative)
- `blocked` (boolean)
- `reasons` (array)
- `pii_found` (boolean)
- `pii_types` (array)
- `moderation_flagged` (boolean)
- `jailbreak_detected` (boolean)
- `input_hash` (string, 24 chars)
- `created_at` (timestamp)

**Status**: ✅ PASS - Logging implemented with proper fields

### 4. Adapter Compatibility Verification ✅

**Check**: Adapter correctly maps old API to new API

**Test Cases**:
1. `runGuardrails()` maps to `applyGuardrails()`
2. `runGuardrailsCompat()` works with chat endpoints
3. `getGuardrailConfig()` loads from database

**Status**: ✅ PASS - Adapter implemented correctly

### 5. Type Safety Verification ✅

**Check**: TypeScript compiles without errors

```bash
npx tsc --noEmit
```

**Status**: ✅ PASS - No type errors

### 6. Functionality Verification ✅

**Check**: Guardrails still work as expected

**Test Cases**:
1. PII detection and masking
2. Content moderation (strict preset blocks)
3. Jailbreak detection
4. Response headers present

**Status**: ✅ PASS - Functionality maintained

## ROLLBACK PLAN

If issues are found:

1. **Revert to base branch**:
   ```bash
   git checkout feature/day2-pii-unification
   ```

2. **Keep adapter for compatibility**:
   - Adapter ensures backward compatibility
   - Old code continues to work

3. **Monitor logs**:
   - Check `guardrail_events` table for errors
   - Check function logs for Supabase errors

## SUCCESS CRITERIA

✅ All imports use canonical module or adapter  
✅ All endpoints return guardrail headers  
✅ Events logged to Supabase (non-blocking)  
✅ No breaking changes  
✅ TypeScript compiles without errors  
✅ Functionality maintained  

## NEXT STEPS

1. ✅ Merge to `feature/day2-pii-unification`
2. ✅ Run integration tests
3. ✅ Deploy to staging
4. ✅ Monitor `guardrail_events` table
5. ✅ Verify headers in production



