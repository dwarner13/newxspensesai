# 🖥️ LOCALHOST TESTING — COMPLETE GUIDE

**Goal:** Test Crystal Chat System on your local machine  
**Time:** 5-10 minutes to setup, 2-5 minutes to test  
**Difficulty:** Easy  

---

## 🚀 QUICK START (5 steps)

### Step 1: Open Terminal
```bash
# Press: Win + X, then Terminal (or PowerShell)
# Or: Open Command Prompt / PowerShell manually
```

### Step 2: Navigate to Project
```bash
cd C:\Users\user\Desktop\project-bolt-fixed
```

### Step 3: Start Dev Server
```bash
npm run dev
```

**You should see:**
```
◈ Netlify Dev ◈
◈ Loaded function chat-v3-production
◈ Ready on http://localhost:8888
```

### Step 4: Open New Terminal Window
```bash
# Press: Win + X → Terminal (or open new PowerShell)
# Keep first terminal running!
```

### Step 5: Run Tests
```bash
# In new terminal, navigate to project
cd C:\Users\user\Desktop\project-bolt-fixed

# Run the test script
.\QUICK_TEST_SCRIPT.ps1
```

---

## 📋 DETAILED SETUP

### Step 1: Prerequisites

Check that you have:

```bash
# Check Node.js
node --version
# Should show: v16+ or higher

# Check npm
npm --version
# Should show: v7+ or higher
```

If missing:
- Download: https://nodejs.org/
- Install LTS version
- Restart terminal
- Try again

### Step 2: Environment Setup

```bash
# Navigate to project
cd C:\Users\user\Desktop\project-bolt-fixed

# Create .env.local if not exists
# Copy from .env.example or create new:
```

Create file `.env.local` with:
```bash
# API Keys (use your existing ones)
OPENAI_API_KEY=your-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-key-here

# Feature Flags (test with all enabled)
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1
```

### Step 3: Install Dependencies

```bash
# In project directory
npm install

# Takes ~2-3 minutes
# Wait for completion
```

### Step 4: Start Development Server

```bash
# Still in project directory
npm run dev

# Should output:
# ◈ Netlify Dev ◈
# ◈ Loaded function chat-v3-production
# ◈ Ready on http://localhost:8888
```

**Important:** Keep this terminal open! Don't close it.

### Step 5: Open New Terminal for Testing

```bash
# Open new PowerShell/Terminal window
# Press: Win + X → Terminal (or Ctrl+Shift+T)

# Navigate to project
cd C:\Users\user\Desktop\project-bolt-fixed

# Run tests
.\QUICK_TEST_SCRIPT.ps1
```

---

## 🧪 TESTING LOCALLY

### Option A: Automated Tests (Recommended)

```bash
# In second terminal (first still running npm run dev)
.\QUICK_TEST_SCRIPT.ps1
```

**Expected output:**
```
✅ PASS — Endpoint is reachable
✅ PASS — Response received in 245ms
✅ PASS — Finance intent detected
✅ PASS — Crystal responded in 180ms
✅ PASS — History working
✅ PASS — Performance acceptable

🎉 ALL TESTS PASSED!
```

### Option B: Manual Tests (Step by Step)

#### Test 1: Basic Message

```powershell
# In second terminal
$body = @{
  userId = "test-user-1"
  message = "Hi Prime, who are you?"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

# Should return: Response from Prime
```

#### Test 2: Finance Query (Auto-Handoff)

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

# Should return: Financial analysis (Crystal handles it)
```

#### Test 3: Direct Crystal Query

```powershell
$body = @{
  userId = "test-user-3"
  message = "What are my top categories?"
  employeeSlug = "crystal-analytics"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body

# Should return: Budget/spending info from Crystal
```

---

## 🎨 TESTING IN BROWSER

### Access the Chat Component

If you have a React app running on port 3000:

```bash
# In third terminal
npm start

# Opens: http://localhost:3000
```

Then navigate to chat component and:
- [ ] See employee badge (purple for Prime)
- [ ] Type a message
- [ ] Press Enter or click Send
- [ ] See response from API

### Test Different Employees

Change the `employeeSlug` in component:
```tsx
const [activeEmployee, setActiveEmployee] = useState('crystal-analytics');

// Changes badge to emerald (Crystal)
```

---

## 📊 PERFORMANCE TESTING

### Measure Response Times

```powershell
# Run 10 times and measure
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
    -Body $body `
    -ErrorAction SilentlyContinue
  
  $sw.Stop()
  $times += $sw.ElapsedMilliseconds
  
  Start-Sleep -Milliseconds 100
}

# Show results
$avg = [int]($times | Measure-Object -Average).Average
$min = [int]($times | Measure-Object -Minimum).Minimum
$max = [int]($times | Measure-Object -Maximum).Maximum

Write-Host "Performance Results:"
Write-Host "  Average: ${avg}ms"
Write-Host "  Min: ${min}ms"
Write-Host "  Max: ${max}ms"
```

**Expected:** Avg < 300ms

---

## 🔍 VIEW LOGS

### Console Output

Watch the first terminal where `npm run dev` is running:

```
[12:34:56] - GET /.netlify/functions/chat-v3-production
[12:34:57] [Crystal Context] FACTS=true, HISTORY=true, ANALYTICS=true, BUDGETS=true
[12:34:58] [Chat] Response: "Your top categories..."
[12:34:59] - POST complete (234ms)
```

### Enable Debug Logging

```bash
# In .env.local add:
DEBUG=*

# Then restart:
npm run dev
```

---

## 🚨 TROUBLESHOOTING

### Problem: "Cannot reach http://localhost:8888"

**Solution:**
```bash
# Make sure npm run dev is still running in first terminal
# Check terminal 1 for errors
# Restart: Ctrl+C then npm run dev
```

### Problem: "Cannot find module"

**Solution:**
```bash
npm install
npm run dev
```

### Problem: "EADDRINUSE: address already in use"

**Solution:**
```bash
# Port 8888 is busy
# Kill the process:
# On Windows:
netstat -ano | findstr :8888
taskkill /PID <PID> /F

# Or just restart your computer
```

### Problem: "Empty or invalid response"

**Solution:**
```bash
# Check database connection
# Verify .env.local has correct keys:
cat .env.local

# Check SUPABASE_URL is correct
# Check OPENAI_API_KEY is valid
```

### Problem: "Feature flags not working"

**Solution:**
```bash
# Verify .env.local
cat .env.local

# Restart npm dev (flags cached at startup):
# Ctrl+C
npm run dev
```

---

## ✅ COMPLETE TESTING CHECKLIST

### Setup
- [ ] `npm install` completed
- [ ] `.env.local` created with API keys
- [ ] `npm run dev` running in Terminal 1
- [ ] Terminal 2 ready for testing

### Automated Tests
- [ ] Run `.\QUICK_TEST_SCRIPT.ps1`
- [ ] All 6 tests pass
- [ ] Response times acceptable

### Manual Tests
- [ ] Test 1 passes (basic message)
- [ ] Test 2 passes (auto-handoff)
- [ ] Test 3 passes (direct Crystal)

### Performance
- [ ] Average < 300ms
- [ ] Min < 100ms
- [ ] Max < 500ms

### Browser (if running UI)
- [ ] Badge displays
- [ ] Badge color correct
- [ ] Message sends
- [ ] Response displays

---

## 💡 TIPS & TRICKS

### Keep Multiple Terminals Open

```
Terminal 1: npm run dev        (leave running)
Terminal 2: .\QUICK_TEST_SCRIPT.ps1  (run tests)
Terminal 3: npm start          (React app, if you have one)
```

### Quick Test Command

Create a file `test.ps1`:
```powershell
$body = @{
  userId = "test-$(Get-Random)"
  message = "Hi Prime"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{"Content-Type" = "application/json"} `
  -Body $body | Select-Object StatusCode, Content
```

Then run:
```bash
.\test.ps1
```

### Watch for Changes

If modifying code:
```bash
# Terminal 1 automatically restarts on file changes
# Just save your file and test again
```

---

## 🎯 TYPICAL LOCALHOST SESSION

```bash
# Terminal 1
npm run dev
# Keep this running

# Terminal 2
.\QUICK_TEST_SCRIPT.ps1
# Results in ~2 minutes

# If all pass:
✅ PASS
✅ PASS
✅ PASS
✅ PASS
✅ PASS
✅ PASS

🎉 ALL TESTS PASSED! Ready for deployment.
```

---

## 📱 BROWSER TESTING

### Open in Browser

```
http://localhost:8888/.netlify/functions/chat-v3-production
```

Doesn't work directly (API endpoint).

### For UI Component

```
http://localhost:3000/dashboard/chat
```

(If you have React app running on port 3000)

### Test in Browser Console

```javascript
// Open DevTools: F12
// Go to Console tab
// Paste:

const resp = await fetch('/.netlify/functions/chat-v3-production', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'test-user-' + Date.now(),
    message: 'Hi Prime',
    employeeSlug: 'prime-boss'
  })
});

const data = await resp.json();
console.log(data);
```

---

## 🔐 SECURITY NOTE

**Don't commit `.env.local`** to git!

It contains API keys. The file should be in `.gitignore`:

```bash
# In .gitignore
.env.local
.env.*.local
```

---

## 🚀 NEXT STEPS

### After Tests Pass ✅

1. Review results
2. Check console for warnings
3. Deploy to Netlify:
   ```bash
   netlify deploy
   ```
4. Test in staging
5. Deploy to production:
   ```bash
   netlify deploy --prod
   ```

### If Tests Fail ❌

1. Check error message
2. Review troubleshooting above
3. Check logs in Terminal 1
4. Verify .env.local
5. Try again

---

## 📞 HELP

**Common issues?** Check:
- `TESTING_GUIDE_COMPLETE.md` (detailed troubleshooting)
- `TESTING_START_HERE.md` (quick reference)
- Terminal 1 logs (for specific errors)

**Need more help?** Check:
- Node.js: https://nodejs.org/en/docs/
- Netlify: https://docs.netlify.com/
- API Keys: Check your Supabase/OpenAI dashboards

---

## 🎉 YOU'RE ALL SET!

1. ✅ Terminal 1: `npm run dev`
2. ✅ Terminal 2: `.\QUICK_TEST_SCRIPT.ps1`
3. ✅ Watch results
4. ✅ Done!

---

**Time to start:** < 5 minutes  
**Time to test:** 2-5 minutes  
**Total time:** 10 minutes maximum  

🚀 **Start testing on localhost now!**





