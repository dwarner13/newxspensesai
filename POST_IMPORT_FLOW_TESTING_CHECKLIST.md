# Post-Import Flow Testing Checklist

**Purpose**: Verify Byte → Tag+Crystal → Prime recap flow works correctly  
**Time**: ~5 minutes

---

## Pre-Test Setup

1. ✅ Open Byte chat (`/dashboard` → click Byte)
2. ✅ Open browser DevTools → Network tab (to monitor API calls)
3. ✅ Have a test document ready (PDF/CSV/image)

---

## Test 1: Import Completion Signal ✅

**Goal**: Verify `BYTE_IMPORT_COMPLETED` event fires once per import

**Steps**:
1. Upload a document via Byte
2. Wait for import processing
3. **Check console logs** for: `[useByteImportCompletion] BYTE_IMPORT_COMPLETED received`
4. **Verify**: Event fires exactly once (not multiple times)

**Pass Criteria**: ✅ Event fires once per import

**If Failed**: Check `useByteImportCompletion` hook polling logic

---

## Test 2: Byte Closeout Message ✅

**Goal**: Verify Byte sends exactly one closing message

**Steps**:
1. Upload document via Byte
2. Wait for import to complete
3. **Check chat**: Should see message: "All set — I finished importing your documents and sent them for categorization and analysis."
4. **Refresh page** (F5)
5. **Verify**: Message does NOT duplicate on refresh

**Pass Criteria**: ✅ Exactly one closeout message, no duplicates on refresh

**If Failed**: Check `byteImportCloseoutSentRef` guard in `UnifiedAssistantChat.tsx`

---

## Test 3: Tag + Crystal Silent Processing ✅

**Goal**: Verify Tag and Crystal run silently (no chat messages)

**Steps**:
1. Upload document via Byte
2. Wait for import completion
3. **Check Network tab**:
   - Look for `/categorize-transactions` call (should succeed)
   - Look for `/crystal-analyze-import` call (should succeed)
4. **Check chat**: Should NOT see any Tag or Crystal messages
5. **Check console**: Should see `[usePostImportHandoff] Tag categorization failed (silent)` or success logs

**Pass Criteria**: ✅ Tag + Crystal calls succeed, no chat messages appear

**If Failed**: Check `usePostImportHandoff` hook silent processing logic

---

## Test 4: Prime Summary Ready Strip ✅

**Goal**: Verify UI strip appears when summary is ready

**Steps**:
1. Upload document via Byte
2. Wait for import completion + Tag + Crystal processing (~10-30 seconds)
3. **Check UI**: Should see green strip: "🟢 Prime summary ready" with "View Prime Summary" button
4. **Verify**: Strip appears only once, no duplicates

**Pass Criteria**: ✅ Strip appears once, shows correct text

**If Failed**: Check `primeSummaryReady` state in `usePostImportHandoff` hook

---

## Test 5: Prime Recap on Click ✅

**Goal**: Verify Prime recap appears only after clicking button

**Steps**:
1. Wait for "Prime summary ready" strip to appear
2. **Click "View Prime Summary" button**
3. **Check chat**: 
   - Should switch to Prime employee
   - Should see Prime recap message with:
     - Document count
     - Transaction count
     - Top 3 categories
     - Notable insights (3 bullets)
4. **Verify**: Strip disappears after click
5. **Refresh page** (F5)
6. **Verify**: Recap does NOT duplicate on refresh

**Pass Criteria**: ✅ Recap appears once, includes all required info, no duplicates

**If Failed**: Check `consumePrimeSummary` logic and `recap_consumed` flag

---

## Test 6: Anti-Spam Guarantees ✅

**Goal**: Verify no duplicate messages on refresh

**Steps**:
1. Complete full flow (upload → closeout → strip → recap)
2. **Refresh page** (F5) multiple times
3. **Verify**:
   - Byte closeout message appears only once
   - Prime recap appears only once
   - Strip does not reappear after being consumed

**Pass Criteria**: ✅ No duplicates on refresh

**If Failed**: Check guards:
   - `byteImportCloseoutSentRef` (Byte closeout)
   - `recap_consumed` flag (Prime recap)
   - `processingImportsRef` (import processing)

---

## Test 7: Prime Greeting Prevention ✅

**Goal**: Verify Prime doesn't greet twice

**Steps**:
1. Start fresh session with Prime (no previous messages)
2. Upload document via Byte
3. Complete flow → click "View Prime Summary"
4. **Check**: Prime recap should NOT include greeting if Prime already greeted earlier
5. **Verify**: If Prime hasn't greeted yet, recap should still be calm (no forced greeting)

**Pass Criteria**: ✅ No duplicate greetings

**If Failed**: Check `hasPrimeGreeted` logic in handoff handler

---

## Post-Test Verification

### Check Console Logs
Look for:
- `[useByteImportCompletion] BYTE_IMPORT_COMPLETED received` (once per import)
- `[usePostImportHandoff] BYTE_IMPORT_COMPLETED received` (once per import)
- `[usePostImportHandoff] Tag categorization failed (silent)` or success
- `[usePostImportHandoff] Crystal analysis failed (silent)` or success
- `[preparePrimeSummary]` logs

### Check Network Calls
- `POST /.netlify/functions/categorize-transactions` (should succeed)
- `POST /.netlify/functions/crystal-analyze-import` (should succeed)

### Check Database (Optional)
```sql
-- Check import status
SELECT id, status, created_at FROM imports WHERE user_id = '<your_user_id>' ORDER BY created_at DESC LIMIT 1;

-- Check transactions
SELECT COUNT(*) FROM transactions_staging WHERE import_id = '<import_id>';

-- Check categories
SELECT category, COUNT(*) FROM transactions_staging WHERE import_id = '<import_id>' GROUP BY category;
```

---

## Troubleshooting

### Byte Closeout Not Appearing
- **Check**: `BYTE_IMPORT_COMPLETED` event is firing
- **Check**: `byteImportCloseoutSentRef` guard is working
- **Check**: Byte is active employee when event fires

### Tag/Crystal Not Running
- **Check**: Network tab shows API calls
- **Check**: Console logs show success/failure
- **Check**: `usePostImportHandoff` hook is mounted

### Prime Summary Not Ready
- **Check**: `preparePrimeSummary` function completes
- **Check**: `primeSummaryStore` has entry for importId
- **Check**: `primeSummaryReady` state is set

### Recap Not Appearing
- **Check**: "View Prime Summary" button click handler fires
- **Check**: Employee switch to Prime succeeds
- **Check**: `consumePrimeSummary` is called

---

## Success Criteria

✅ **All 7 tests pass** = Post-import flow is working  
⚠️ **5-6 tests pass** = Partial functionality (check failed tests)  
❌ **<5 tests pass** = Critical issues (check event bus, hooks, guards)




