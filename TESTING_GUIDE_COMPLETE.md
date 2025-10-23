# 🧪 COMPLETE TESTING GUIDE

**Status:** ✅ Ready to Test  
**Scope:** Feature flags, employee badge, chat components, handoff system  
**Time:** 15-30 minutes  

---

## 🎯 QUICK START

### Option 1: Local Development (Recommended)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
npm test

# Terminal 3 (Optional): Watch for changes
npm run dev:watch
```

### Option 2: Build & Deploy
```bash
# Build production bundle
npm run build

# Deploy to Netlify
netlify deploy --prod

# Verify in production
curl -X POST https://your-site.netlify.app/.netlify/functions/chat-v3-production \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test-user","message":"Hi"}'
```

---

## 📋 TEST MATRIX

### Feature Flags Testing

| Test | Command | Expected | Status |
|------|---------|----------|--------|
| Full context | All flags = 1 | 4 DB queries | ⬜ |
| Analytics only | Analytics = 1, others = 0 | 1 DB query | ⬜ |
| No analytics | Analytics = 0 | 0 analytics queries | ⬜ |
| Minimal | All = 0 | Generic response | ⬜ |

### Employee Badge Testing

| Test | Component | Expected | Status |
|------|-----------|----------|--------|
| Prime badge | Shows purple badge | "Active: Prime" | ⬜ |
| Crystal badge | Shows emerald badge | "Active: Crystal" | ⬜ |
| Responsiveness | Mobile/desktop | Badge fits screen | ⬜ |
| Color accuracy | All 6 employees | Correct colors | ⬜ |

### Chat Integration

| Test | Action | Expected | Status |
|------|--------|----------|--------|
| Send message | Type & press Enter | Message appears | ⬜ |
| Get response | Message sent | Crystal responds | ⬜ |
| Error handling | Break API | Error shown | ⬜ |
| Auto-handoff | Finance query to Prime | Switches to Crystal | ⬜ |

---

## 🚀 LOCAL TESTING

### Step 1: Setup Environment

```bash
# Navigate to project
cd C:\Users\user\Desktop\project-bolt-fixed

# Create/update .env.local
cat > .env.local << 'EOF'
# Feature Flags (test with full context)
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1

# API Keys (use existing)
OPENAI_API_KEY=your-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key-here
EOF

cat .env.local
```

### Step 2: Start Dev Server

```bash
# Install dependencies (if needed)
npm install

# Start dev server
npm run dev

# You should see:
# > netlify dev
# ◈ Netlify Dev ◈
# ◈ Loaded function chat-v3-production
# ◈ Ready on http://localhost:8888
```

### Step 3: Test with curl

#### Test 1: Basic Chat
```bash
# PowerShell
$body = @{
  userId = "test-user-$(Get-Random)"
  message = "Hi, who are you?"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

# Expected: 200 OK with JSON response
```

#### Test 2: Analytics Query (Auto-Handoff)
```bash
$body = @{
  userId = "test-user-123"
  message = "Show me my spending trends"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

# Expected: Handoff to Crystal, finance analysis
```

#### Test 3: Direct Crystal Query
```bash
$body = @{
  userId = "test-user-123"
  message = "What's my budget status?"
  employeeSlug = "crystal-analytics"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

# Expected: Crystal responds with budget info
```

---

## 🧪 COMPREHENSIVE TEST SCENARIOS

### Scenario 1: Feature Flags - Full Context

**Setup:**
```bash
# .env.local
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1
```

**Test Steps:**
```powershell
# 1. Send message to Crystal
$userId = "test-$(Get-Random)"
$sessionId = "session-$(Get-Random)"

$body = @{
  userId = $userId
  sessionId = $sessionId
  message = "Analyze my spending"
  employeeSlug = "crystal-analytics"
} | ConvertTo-Json

$resp = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

$content = $resp.Content | ConvertFrom-Json
Write-Host "Response: $($content.message)" -ForegroundColor Green

# 2. Check logs for context assembly
# Should see: "[Crystal Context Assembly] time_ms: ~100-300"

# 3. Follow-up message (test history)
$body2 = @{
  userId = $userId
  sessionId = $sessionId
  message = "Can you elaborate?"
  employeeSlug = "crystal-analytics"
} | ConvertTo-Json

$resp2 = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body2

# Should reference previous message (history working)
```

**Expected Results:**
- ✅ First response includes analytics context
- ✅ Logs show 4 DB queries
- ✅ Second message acknowledges previous context
- ✅ Response time: 100-350ms

---

### Scenario 2: Feature Flags - Analytics Only

**Setup:**
```bash
# .env.local
CRYSTAL_CONTEXT_FACTS=0
CRYSTAL_CONTEXT_HISTORY=0
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=0
```

**Test Steps:**
```powershell
# Send same message as Scenario 1
$body = @{
  userId = "test-perf-$(Get-Random)"
  message = "Analyze my spending"
  employeeSlug = "crystal-analytics"
} | ConvertTo-Json

Measure-Command {
  $resp = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body
}

# Should be much faster
```

**Expected Results:**
- ✅ Only analytics context included
- ✅ Logs show 1 DB query
- ✅ Response time: 50-200ms (faster!)
- ✅ Response quality: Still good (focused)

---

### Scenario 3: Employee Badge - Component Test

**Setup:**
```bash
# Your component has the badge
npm run dev

# Navigate to component in browser
# http://localhost:3000/dashboard/chat
```

**Test Steps:**
1. **Visual Check**
   - [ ] Badge appears above chat
   - [ ] Purple color for Prime
   - [ ] Dot indicator visible
   - [ ] Text readable

2. **Dynamic Employee**
   ```tsx
   // In component
   const [activeEmployee, setActiveEmployee] = useState('crystal-analytics');
   
   // Should show emerald Crystal badge
   ```

3. **Responsive**
   - [ ] Badge fits on mobile (< 375px)
   - [ ] Badge fits on tablet (768px)
   - [ ] Badge fits on desktop (1920px)

**Expected Results:**
- ✅ Badge displays correctly
- ✅ Colors match specifications
- ✅ Responsive on all sizes
- ✅ No text overflow

---

### Scenario 4: Auto-Handoff System

**Setup:**
```bash
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1
```

**Test Steps:**
```powershell
# Test 1: Finance keyword (should handoff)
$body = @{
  userId = "test-handoff-$(Get-Random)"
  message = "What are my spending trends?"
  employeeSlug = "prime-boss"  # Start with Prime
} | ConvertTo-Json

$resp = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

$content = $resp.Content | ConvertFrom-Json

# Check logs: Should see "Auto-handoff Prime → Crystal"
Write-Host "Response indicates: $($content.employee)" -ForegroundColor Green

# Test 2: Non-finance query (should NOT handoff)
$body2 = @{
  userId = "test-no-handoff-$(Get-Random)"
  message = "Tell me a joke"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

$resp2 = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body2

# Should stay with Prime
```

**Expected Results:**
- ✅ Finance keywords trigger handoff
- ✅ Non-finance stays with Prime
- ✅ Handoff logged in chat_messages
- ✅ User gets correct specialist response

---

### Scenario 5: Chat Integration (Full Flow)

**Setup:**
```bash
# Browser dev console or your test component
```

**Test Steps:**
```javascript
// Test sending message and receiving response
const userId = 'user-' + Date.now();
const message = 'Show my top categories';

const resp = await fetch('/.netlify/functions/chat-v3-production', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId,
    message,
    employeeSlug: 'crystal-analytics'
  })
});

const data = await resp.json();
console.log('Response:', data.message);

// Expected: Financial analysis of top categories
```

**Expected Results:**
- ✅ Message sent successfully
- ✅ Response received within 500ms
- ✅ Response is relevant to query
- ✅ No errors in console

---

## 📊 PERFORMANCE TESTING

### Test: Query Time Measurement

```powershell
# PowerShell script to measure response times
$times = @()
for ($i = 0; $i -lt 10; $i++) {
  $body = @{
    userId = "perf-test-$i"
    message = "What are my top categories?"
    employeeSlug = "crystal-analytics"
  } | ConvertTo-Json
  
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  
  $resp = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body
  
  $sw.Stop()
  $times += $sw.ElapsedMilliseconds
}

# Calculate stats
$avg = ($times | Measure-Object -Average).Average
$min = ($times | Measure-Object -Minimum).Minimum
$max = ($times | Measure-Object -Maximum).Maximum

Write-Host "Performance Results:"
Write-Host "  Average: $avg ms"
Write-Host "  Min: $min ms"
Write-Host "  Max: $max ms"
```

**Expected Results:**
- ✅ Average < 300ms
- ✅ Min < 100ms
- ✅ Max < 500ms
- ✅ Consistent performance

---

## 🔍 DEBUGGING

### Enable Verbose Logging

```bash
# Add to .env.local
DEBUG=*

# Or for specific logging
DEBUG=chat:*

# Start dev server
npm run dev
```

### Check Logs

```bash
# Real-time logs
netlify dev --log

# Or view Netlify function logs
netlify logs

# Search for specific patterns
netlify logs | grep "Crystal Context"
```

### Debug Feature Flags

```powershell
# Add this to your function to log flags
console.log('[Flags] FACTS:', process.env.CRYSTAL_CONTEXT_FACTS);
console.log('[Flags] HISTORY:', process.env.CRYSTAL_CONTEXT_HISTORY);
console.log('[Flags] ANALYTICS:', process.env.CRYSTAL_CONTEXT_ANALYTICS);
console.log('[Flags] BUDGETS:', process.env.CRYSTAL_CONTEXT_BUDGETS);

# Run and check console output
```

---

## ✅ TEST CHECKLIST

### Feature Flags
- [ ] Full context works (all 4 layers)
- [ ] Analytics-only works (1 layer)
- [ ] Performance improves when disabling
- [ ] Flags read from environment
- [ ] Defaults work (no env vars set)

### Employee Badge
- [ ] Prime badge displays (purple)
- [ ] Crystal badge displays (emerald)
- [ ] All 6 employees have correct colors
- [ ] Badge responsive on mobile
- [ ] Badge accessible (contrast, labels)

### Chat Component
- [ ] Message sends on Enter
- [ ] Message sends on button click
- [ ] Response displays
- [ ] Error shows on API failure
- [ ] Input clears after send

### Auto-Handoff
- [ ] Finance keywords trigger handoff
- [ ] Non-finance stays with Prime
- [ ] Handoff is transparent to user
- [ ] Logged in chat_messages
- [ ] Works with feature flags

### Performance
- [ ] Response time < 300ms (full context)
- [ ] Response time < 200ms (analytics only)
- [ ] DB load reasonable
- [ ] No N+1 queries

---

## 🚨 COMMON ISSUES

### Issue 1: "Cannot GET /.netlify/functions/chat-v3-production"
**Solution:**
```bash
# Restart dev server
npm run dev

# Check if function file exists
ls netlify/functions/chat-v3-production.ts
```

### Issue 2: Feature flags not working
**Solution:**
```bash
# Check env vars
echo $env:CRYSTAL_CONTEXT_FACTS

# Restart dev server (env vars cached)
npm run dev

# Or set inline
$env:CRYSTAL_CONTEXT_FACTS=1
```

### Issue 3: Slow response time
**Solution:**
```bash
# Disable analytics flag
CRYSTAL_CONTEXT_ANALYTICS=0

# Or disable all non-essential
CRYSTAL_CONTEXT_FACTS=0
CRYSTAL_CONTEXT_HISTORY=0
CRYSTAL_CONTEXT_BUDGETS=0
```

### Issue 4: Chat not updating
**Solution:**
```bash
# Clear browser cache
# Ctrl+Shift+Delete

# Hard refresh
# Ctrl+Shift+R

# Check console for errors
# F12 → Console tab
```

---

## 📝 TEST REPORT TEMPLATE

```markdown
# Test Report — Date: [TODAY]

## Feature Flags
- [x] Full context: PASS (300ms, 4 queries)
- [x] Analytics-only: PASS (120ms, 1 query)
- [x] No analytics: PASS (50ms, 0 queries)
- [x] Minimal: PASS (15ms, generic response)

## Employee Badge
- [x] Prime badge: PASS (purple, visible)
- [x] Crystal badge: PASS (emerald, visible)
- [x] Responsiveness: PASS (all sizes)
- [x] Accessibility: PASS (contrast 9.2:1)

## Chat Integration
- [x] Send message: PASS
- [x] Get response: PASS (< 500ms)
- [x] Error handling: PASS
- [x] Auto-handoff: PASS

## Performance
- [x] Avg response: 250ms ✅
- [x] P95 response: 350ms ✅
- [x] Error rate: 0% ✅

## Issues Found
- None 🎉

## Sign-off
- Tester: [Your Name]
- Date: [Today]
- Status: ✅ READY FOR PRODUCTION
```

---

## 🚀 DEPLOYMENT VERIFICATION

### Before Deploying to Production

```bash
# 1. Run all tests locally
npm test

# 2. Build production bundle
npm run build

# 3. Check for errors
npm run lint

# 4. Verify no console errors
npm run dev  # Check console

# 5. Test locally one more time
# ... run scenarios ...

# 6. Deploy
netlify deploy --prod

# 7. Verify in production
curl -X POST https://your-site.netlify.app/.netlify/functions/chat-v3-production \
  -H 'Content-Type: application/json' \
  -d '{"userId":"prod-test","message":"Hi"}'
```

---

## 📞 SUPPORT

### Need Help?

1. **Check logs:**
   ```bash
   netlify logs
   ```

2. **Test single component:**
   ```bash
   npm run test:chat-component
   ```

3. **Debug feature flags:**
   ```bash
   CRYSTAL_CONTEXT_FACTS=1 npm run dev
   ```

4. **Check database connection:**
   ```bash
   npm run test:db-connection
   ```

---

## 🎯 SUMMARY

**Total Tests:** 20+  
**Scenarios:** 5  
**Performance Tests:** Included  
**Expected Time:** 15-30 minutes  

**Critical Path:**
1. Setup environment ✅
2. Start dev server ✅
3. Run Scenario 1 (Full Context) ✅
4. Run Scenario 4 (Auto-Handoff) ✅
5. Test Chat Component ✅
6. Verify Performance ✅

---

**Status:** ✅ Ready to Test  
**Date:** Today  
**Version:** 1.0  

🧪 **Begin testing now!**





