# 🧪 Test Your Chat System NOW

**Quick guide to test everything we built**

---

## 🎯 Option 1: Test Locally (Recommended First)

### Step 1: Run Database Migrations

```powershell
# Navigate to your project
cd C:\Users\user\Desktop\project-bolt-fixed

# Apply migrations (if you have psql and connection string)
psql $env:DATABASE_URL -f supabase/migrations/20251016_chat_v3_production.sql
psql $env:DATABASE_URL -f supabase/migrations/20251016_memory_extraction.sql

# OR via Supabase dashboard:
# 1. Go to https://app.supabase.com
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy/paste contents of each migration file
# 5. Run them
```

### Step 2: Check Your Environment Files

Make sure you have `.env` and `.env.local` with real values (not placeholders):

**`.env`** (check this file):
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co  # Real URL
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...            # Real key
OPENAI_API_KEY=sk-proj-...                      # Real key
CHAT_BACKEND_VERSION=v3                         # ← Set to v3
```

**`.env.local`** (check this file):
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_CHAT_BUBBLE_ENABLED=true
```

### Step 3: Start the Server

```powershell
# Start Netlify Dev (recommended - runs everything)
netlify dev

# Wait for:
# ◈ Server now ready on http://localhost:8888
```

### Step 4: Test Backend (curl in new terminal)

Open a **new PowerShell window** and test:

```powershell
# Test 1: Basic chat
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -H 'Content-Type: application/json' `
  -d '{\"userId\":\"test-001\",\"message\":\"Hello!\"}'

# Expected: You should see streaming JSON like:
# data: {"ok":true,"sessionId":"...","messageUid":"...","employee":"prime-boss"}
# data: {"delta":"Hello"}
# data: {"delta":"!"}
# data: [DONE]
```

**If you see this, IT WORKS!** ✅

### Step 5: Test Memory Extraction

```powershell
# Send a message with facts
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -H 'Content-Type: application/json' `
  -d '{\"userId\":\"test-002\",\"message\":\"I prefer CSV format and weekly notifications\"}'

# Wait 2-3 seconds for extraction, then check database
```

**Verify in Supabase**:
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Table Editor**
4. Open `user_memory_facts` table
5. Look for `user_id = 'test-002'`

**Expected**: You should see facts like:
- `pref:export_format=CSV`
- `pref:notification_frequency=weekly`

### Step 6: Test Context Retrieval

```powershell
# Ask a follow-up question
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -H 'Content-Type: application/json' `
  -d '{\"userId\":\"test-002\",\"message\":\"What format do I prefer?\"}'

# Expected: Assistant should mention "CSV format" from memory
```

### Step 7: Test Rate Limiting

```powershell
# Send 21 requests rapidly
for ($i=1; $i -le 21; $i++) {
  Start-Job -ScriptBlock {
    param($num)
    curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' `
      -H 'Content-Type: application/json' `
      -d "{`"userId`":`"test-rate`",`"message`":`"Test $num`"}"
  } -ArgumentList $i
}

# Wait for jobs
Get-Job | Wait-Job | Receive-Job
```

**Expected**: 
- First 20 requests: 200 OK
- 21st request: 429 Too Many Requests

---

## 🎯 Option 2: Test Frontend (If You Have UI)

### Step 1: Make Sure Server is Running

```powershell
netlify dev
# Should be on http://localhost:8888
```

### Step 2: Open Browser

```
http://localhost:8888
```

### Step 3: Look for Purple Crown Button (👑)

- Should be at **bottom-right** of dashboard
- If you don't see it:
  - Check `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`
  - Hard refresh: `Ctrl + Shift + R`
  - Check browser console for errors

### Step 4: Click Crown & Test

1. Click purple crown button
2. Type: **"Hello"**
3. Press Enter

**Expected**:
- Message appears immediately
- Assistant response streams in
- No errors in console

### Step 5: Test Memory

1. Type: **"I prefer CSV format"**
2. Wait for response
3. Type: **"What format do I prefer?"**

**Expected**: Assistant mentions "CSV"

---

## 🎯 Option 3: Quick Smoke Test (Fastest)

If you just want to see if it works:

```powershell
# 1. Start server
netlify dev

# 2. In new terminal, one test
curl http://localhost:8888/.netlify/functions/chat-v3-production `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"userId":"quick-test","message":"Hi"}'
```

**Expected**: Streaming response (JSON chunks)

---

## 🐛 Troubleshooting

### Error: "Chat backend v3 is disabled"

**Fix**:
```powershell
# Check .env file
cat .env | Select-String "CHAT_BACKEND_VERSION"

# If not v3, add it:
Add-Content .env "`nCHAT_BACKEND_VERSION=v3"

# Restart server
```

### Error: "your-dev-project.supabase.co"

**Fix**: Replace placeholders in `.env` and `.env.local` with real Supabase credentials
1. Go to https://app.supabase.com
2. Settings → API
3. Copy URL and keys
4. Replace in env files
5. Restart server

### Error: "Connection refused" or "404"

**Fix**:
```powershell
# Make sure you're using the right port
# Netlify dev uses 8888, not 5173/5174
http://localhost:8888  # ← Use this
```

### Error: No streaming, just JSON

**Fix**: Check you're hitting the right endpoint:
```powershell
# Should be:
/chat-v3-production

# NOT:
/chat  (that's the old v2)
```

### Migration Errors

**Fix**: Run migrations via Supabase dashboard instead:
1. Open each `.sql` file
2. Copy contents
3. Paste in Supabase SQL Editor
4. Run

---

## ✅ Success Checklist

After testing, you should have:

- [ ] **Basic chat works** (curl returns streaming response)
- [ ] **Memory extraction** (facts appear in `user_memory_facts` table)
- [ ] **Context retrieval** (assistant uses stored facts)
- [ ] **Rate limiting** (21st request blocked with 429)
- [ ] **No errors** in terminal logs
- [ ] **Database writes** (check `chat_sessions`, `chat_messages` tables)

---

## 📊 Verify Database

```sql
-- Check sessions
SELECT id, user_id, message_count, created_at 
FROM chat_sessions 
ORDER BY created_at DESC 
LIMIT 5;

-- Check messages
SELECT role, content, created_at 
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 10;

-- Check memory facts
SELECT user_id, fact, created_at 
FROM user_memory_facts 
ORDER BY created_at DESC 
LIMIT 10;

-- Check rate limits
SELECT user_id, count, window_start 
FROM rate_limits;

-- Check usage
SELECT user_id, total_tokens, latency_ms, created_at 
FROM chat_usage_log 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🚀 Next Steps

Once local testing works:

1. **Deploy to Netlify**:
   ```powershell
   netlify deploy --prod
   ```

2. **Set environment variables** in Netlify dashboard:
   - `CHAT_BACKEND_VERSION=v3`
   - All Supabase keys
   - OpenAI key

3. **Test production**:
   ```powershell
   curl https://your-site.netlify.app/.netlify/functions/chat-v3-production `
     -Method POST `
     -Headers @{"Content-Type"="application/json"} `
     -Body '{"userId":"prod-test","message":"Hi"}'
   ```

---

## 📚 Need More Help?

- **Complete examples**: `FINAL_CHAT_INTEGRATION.md`
- **Full test suite**: `CHAT_V3_TESTING_GUIDE.md`
- **Memory examples**: `MEMORY_INTEGRATION_EXAMPLE.md`
- **Quick reference**: `CHAT_V3_QUICK_REFERENCE.md`

---

## 🎯 Quick Decision Tree

```
Do you have .env files with REAL keys?
├─ NO  → Go to env.backend.example and env.frontend.example
│         Copy to .env and .env.local, fill in real values
└─ YES → Continue

Did you run migrations?
├─ NO  → Run via Supabase dashboard SQL Editor
└─ YES → Continue

Is netlify dev running?
├─ NO  → Run: netlify dev
└─ YES → Continue

Can you curl localhost:8888?
├─ NO  → Check firewall, check server started correctly
└─ YES → Test with curl command above!
```

---

**START HERE**: Run `netlify dev`, then test with the curl commands above! 🚀













