# Post-Import Flow — Staging Gate Checklist

**Purpose**: Verify idempotency and correctness before production  
**Time**: ~10 minutes

---

## Pre-Test Setup

1. ✅ Open Byte chat (`/dashboard` → click Byte)
2. ✅ Open browser DevTools → Console tab (for debug logs)
3. ✅ Open Network tab (to monitor API calls)
4. ✅ Have 2-3 test documents ready (PDF/CSV/image)

---

## ✅ Test 1: Byte Closeout Idempotency (Refresh)

**Goal**: Byte closeout cannot duplicate on page refresh

**Steps**:
1. Upload document via Byte
2. Wait for Byte closeout message: "All set — I finished importing..."
3. **Refresh page** (F5) **3 times**
4. **Check chat**: Should see exactly ONE closeout message
5. **Check console**: Should see `[UnifiedAssistantChat] Byte closeout skipped (already sent)` on refresh

**PASS Criteria**: ✅ Exactly one closeout message, console shows skip logs

**FAIL If**: Multiple closeout messages appear

---

## ✅ Test 2: Byte Closeout Idempotency (Hot Reload)

**Goal**: Byte closeout cannot duplicate on hot reload/dev restart

**Steps**:
1. Upload document via Byte
2. Wait for Byte closeout message
3. **Restart Netlify dev** (stop/start server)
4. **Refresh page** (F5)
5. **Check chat**: Should see exactly ONE closeout message

**PASS Criteria**: ✅ Exactly one closeout message after dev restart

**FAIL If**: Duplicate closeout appears after restart

---

## ✅ Test 3: Byte Closeout Idempotency (Employee Switch)

**Goal**: Byte closeout cannot duplicate when switching employees away and back

**Steps**:
1. Upload document via Byte
2. Wait for Byte closeout message
3. **Switch to Prime** (click Prime in sidebar)
4. **Switch back to Byte** (click Byte in sidebar)
5. **Check chat**: Should see exactly ONE closeout message

**PASS Criteria**: ✅ Exactly one closeout message after employee switch

**FAIL If**: Duplicate closeout appears after switch

---

## ✅ Test 4: Byte Closeout Idempotency (Multiple Imports)

**Goal**: Each import gets exactly one closeout message

**Steps**:
1. Upload document #1 via Byte → wait for closeout
2. Upload document #2 via Byte → wait for closeout
3. Upload document #3 via Byte → wait for closeout
4. **Check chat**: Should see exactly 3 closeout messages (one per import)
5. **Refresh page** (F5)
6. **Check chat**: Should still see exactly 3 closeout messages (no duplicates)

**PASS Criteria**: ✅ Exactly 3 closeout messages, no duplicates on refresh

**FAIL If**: Duplicate closeouts or missing closeouts

---

## ✅ Test 5: Prime Recap Idempotency (Double-Click)

**Goal**: Prime recap cannot duplicate on double-click

**Steps**:
1. Upload document via Byte
2. Wait for "Prime summary ready" strip
3. **Double-click "View Prime Summary" button rapidly** (5+ clicks)
4. **Check chat**: Should see exactly ONE Prime recap message
5. **Check console**: Should see skip logs after first click

**PASS Criteria**: ✅ Exactly one recap message, console shows skip logs

**FAIL If**: Multiple recap messages appear

---

## ✅ Test 6: Prime Recap Idempotency (Employee Switch)

**Goal**: Prime recap cannot duplicate when switching away and back

**Steps**:
1. Upload document via Byte
2. Wait for "Prime summary ready" strip
3. **Click "View Prime Summary"** → verify recap appears
4. **Switch to Byte** (click Byte in sidebar)
5. **Switch back to Prime** (click Prime in sidebar)
6. **Check chat**: Should see exactly ONE recap message

**PASS Criteria**: ✅ Exactly one recap message after employee switch

**FAIL If**: Duplicate recap appears after switch

---

## ✅ Test 7: Prime Recap Idempotency (Refresh)

**Goal**: Prime recap cannot duplicate on page refresh

**Steps**:
1. Upload document via Byte
2. Wait for "Prime summary ready" strip
3. **Click "View Prime Summary"** → verify recap appears
4. **Refresh page** (F5) **3 times**
5. **Check chat**: Should see exactly ONE recap message
6. **Check**: Strip should NOT reappear (already consumed)

**PASS Criteria**: ✅ Exactly one recap message, strip doesn't reappear

**FAIL If**: Duplicate recap or strip reappears

---

## ✅ Test 8: Message Authorship

**Goal**: Messages are authored by correct employee

**Steps**:
1. Upload document via Byte
2. Wait for Byte closeout message
3. **Check message**: Should show Byte avatar/name (not user)
4. Click "View Prime Summary"
5. **Check Prime recap**: Should show Prime avatar/name (not Byte, not user)
6. **Check message meta**: Inspect message object in console
   - Byte closeout: `meta.employee_key === 'byte-docs'`
   - Prime recap: `meta.employee_key === 'prime-boss'`

**PASS Criteria**: ✅ Correct avatars/names, correct meta.employee_key

**FAIL If**: Wrong employee shown or missing employee_key

---

## ✅ Test 9: Array Merge Safety

**Goal**: injectedMessages merge correctly without order issues

**Steps**:
1. Upload document via Byte
2. Wait for Byte closeout (should appear in correct position)
3. Click "View Prime Summary"
4. Wait for Prime recap (should appear after Byte closeout)
5. **Check message order**: Should be chronological
   - User upload message
   - Byte closeout
   - Prime recap
6. **Refresh page** (F5)
7. **Check order**: Should remain stable (no reordering)

**PASS Criteria**: ✅ Messages in correct chronological order, stable on refresh

**FAIL If**: Messages out of order or reorder on refresh

---

## ✅ Test 10: Crystal Failure Resilience

**Goal**: Summary still prepares even if Crystal fails

**Steps**:
1. Upload document via Byte
2. **Simulate Crystal failure** (disable network or mock error)
3. Wait for processing (~10-30 seconds)
4. **Check**: "Prime summary ready" strip should still appear
5. **Check console**: Should see Crystal error log but summary still prepared
6. Click "View Prime Summary"
7. **Check**: Recap should appear (may have fallback content)

**PASS Criteria**: ✅ Summary prepares even if Crystal fails, recap appears

**FAIL If**: Summary doesn't prepare or strip doesn't appear

---

## Post-Test Verification

### Check Console Logs (Dev Only)
Look for debug logs (should only appear in dev):
- `[UnifiedAssistantChat] Byte closeout injected` (once per import)
- `[UnifiedAssistantChat] Byte closeout skipped (already sent)` (on refresh)
- `[UnifiedAssistantChat] Prime recap injected` (once per import)
- `[UnifiedAssistantChat] Prime recap skipped (already consumed)` (on double-click)
- `[usePostImportHandoff] Summary consumed` (once per import)

### Check Message IDs
- Byte closeout: `byte-closeout-{importId}` (stable, no timestamp)
- Prime recap: `prime-recap-{importId}` (stable, no timestamp)

### Check Guards
- `byteImportCloseoutSentRef` Set contains `${userId}:${importId}`
- `primeSummaryStore` Map has entry with `consumed: true`
- `processingImportsRef` Set contains `importId`

---

## Troubleshooting

### Byte Closeout Duplicates
- **Check**: `byteImportCloseoutSentRef` is Set (not cleared on refresh)
- **Check**: Stable ID uses `importId` only (no `Date.now()`)
- **Check**: Guard checks both ID and meta flag

### Prime Recap Duplicates
- **Check**: `consumePrimeSummary` called before async operations
- **Check**: `recap_consumed` flag checked before injection
- **Check**: Stable ID uses `importId` only

### Wrong Employee Avatar
- **Check**: `meta.employee_key` set correctly
- **Check**: Message `role` is `'assistant'` (not `'user'`)

### Messages Out of Order
- **Check**: `injectedMessages` merged after `messages` in `allMessages`
- **Check**: Messages have stable timestamps

---

## Success Criteria

✅ **All 10 tests pass** = Ready for production  
⚠️ **8-9 tests pass** = Review failed tests, may need fixes  
❌ **<8 tests pass** = Do not deploy, critical issues

---

## Production Safety

- ✅ Debug logs are dev-only (`import.meta.env.DEV` check)
- ✅ No console logs in production builds
- ✅ Guards prevent duplicates even without logs
- ✅ Stable IDs ensure idempotency across refreshes




