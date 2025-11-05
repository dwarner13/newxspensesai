# 🧪 START HERE — TESTING GUIDE

**Welcome!** This document walks you through testing all the new features.

---

## 🎯 WHAT ARE WE TESTING?

✅ **Feature Flags** — Control Crystal's context layers  
✅ **Employee Badge** — Show which AI is active  
✅ **Chat Component** — Send/receive messages  
✅ **Auto-Handoff** — Finance queries route to Crystal  
✅ **Performance** — Response times < 300ms  

---

## ⚡ QUICK START (5 minutes)

### 1. Start Development Server

```bash
# Terminal 1
cd C:\Users\user\Desktop\project-bolt-fixed
npm run dev
```

**Expected output:**
```
◈ Netlify Dev ◈
◈ Loaded function chat-v3-production
◈ Ready on http://localhost:8888
```

### 2. Run Automated Tests

```bash
# Terminal 2 (in same directory)
.\QUICK_TEST_SCRIPT.ps1
```

**Expected output:**
```
✅ PASS — Endpoint is reachable
✅ PASS — Response received in 245ms
✅ PASS — Finance intent detected
✅ PASS — Crystal responded in 180ms
✅ PASS — History working (multi-turn context preserved)
✅ PASS — Performance acceptable

🎉 ALL TESTS PASSED! Ready for deployment.
```

---

## 📖 DETAILED TESTING (15-30 minutes)

If you want to test each feature manually:

### Test 1: Basic Chat Message

```powershell
$body = @{
  userId = "test-user-1"
  message = "Hi Prime, who are you?"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body
```

**Expected:** Response from Prime about his role

---

### Test 2: Auto-Handoff

```powershell
$body = @{
  userId = "test-user-2"
  message = "Show my spending trends"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body
```

**Expected:** Response with financial analysis (Crystal handles it)

---

### Test 3: Feature Flags

Update `.env.local`:
```bash
# Test Full Context
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1
```

Restart `npm run dev` and test. Response should include facts, history, analytics, budgets.

Then change to:
```bash
# Test Analytics Only (faster)
CRYSTAL_CONTEXT_FACTS=0
CRYSTAL_CONTEXT_HISTORY=0
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=0
```

Restart and test again. Response should be faster (~100-200ms vs 300ms).

---

## 📊 TEST RESULTS CHECKLIST

- [ ] Test 1 passes (basic message)
- [ ] Test 2 passes (auto-handoff)
- [ ] Test 3 passes (feature flags work)
- [ ] Response time < 300ms (full context)
- [ ] Response time < 200ms (analytics only)
- [ ] No console errors
- [ ] Chat component loads
- [ ] Employee badge displays

---

## 🔧 DEBUGGING

### Problem: Endpoint not found

**Solution:**
```bash
# Make sure dev server is running
npm run dev

# Check it's on http://localhost:8888
```

### Problem: Slow responses

**Solution:**
```bash
# Reduce context layers in .env.local
CRYSTAL_CONTEXT_FACTS=0
CRYSTAL_CONTEXT_HISTORY=0
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=0

# Restart dev server
npm run dev
```

### Problem: Empty responses

**Solution:**
```bash
# Check database connection
# Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

# Restart dev server
npm run dev
```

---

## 📚 FULL DOCUMENTATION

For more detailed testing:

- **`TESTING_GUIDE_COMPLETE.md`** — Full testing guide (20+ tests)
- **`QUICK_TEST_SCRIPT.ps1`** — Automated test script
- **`CRYSTAL_FEATURE_FLAGS_FINAL.md`** — Feature flags documentation
- **`CRYSTAL_EMPLOYEE_BADGE_GUIDE.md`** — Badge component guide
- **`CRYSTAL_CHAT_COMPONENT_GUIDE.md`** — Chat component guide

---

## 🚀 NEXT STEPS

### After Testing Passes ✅

1. Review test results
2. Check console for any warnings
3. Deploy to staging: `netlify deploy`
4. Test in staging environment
5. Deploy to production: `netlify deploy --prod`

### If Tests Fail ❌

1. Check `TESTING_GUIDE_COMPLETE.md` for troubleshooting
2. Review console logs: `npm run dev` → Press Ctrl+Shift+K
3. Verify environment variables: `cat .env.local`
4. Check database connection: `SUPABASE_URL` and key set?

---

## 💡 TIPS

**Quick check (30 seconds):**
```bash
npm run dev
# Then in another terminal:
.\QUICK_TEST_SCRIPT.ps1
```

**Full test (15 minutes):**
- Read `TESTING_GUIDE_COMPLETE.md`
- Follow Scenario 1 → Scenario 5
- Check performance metrics

**Deep dive (30 minutes):**
- Test all feature flag combinations
- Check badge on mobile/desktop
- Verify auto-handoff triggers
- Performance profiling

---

## 📞 HAVING ISSUES?

1. **Check the logs:**
   ```bash
   # Look for errors in console
   npm run dev
   ```

2. **Verify setup:**
   ```bash
   # Make sure files exist
   ls netlify/functions/chat-v3-production.ts
   cat .env.local
   ```

3. **Restart everything:**
   ```bash
   # Kill current dev server
   # Ctrl+C in Terminal 1
   npm run dev
   ```

---

## ✅ SUCCESS CRITERIA

You know testing is complete when:

- ✅ Automated test script shows 6 passes
- ✅ Manual tests work as expected
- ✅ Response times are acceptable
- ✅ No error messages in console
- ✅ Badge displays correctly in UI

---

## 🎉 YOU'RE READY!

Once all tests pass, you're ready to:
- Deploy to staging
- Deploy to production
- Show it to users!

---

**Questions?** Check `TESTING_GUIDE_COMPLETE.md` for detailed answers.

**Ready to start?** Run: `.\QUICK_TEST_SCRIPT.ps1`

🚀 **Happy testing!**






