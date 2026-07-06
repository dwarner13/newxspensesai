# 🧪 Chat Runtime Testing Guide

## Pre-Test Setup Checklist

Before you run `netlify dev` and test the chat endpoint:

### ✅ 1. Database Migrations Applied

Run in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('chat_sessions', 'chat_messages', 'employee_profiles');
```

**Expected**: 3 tables returned

**If not exists**:
```bash
# Apply migrations
supabase db push

# Or copy/paste SQL in Supabase Dashboard
```

### ✅ 2. Verify Extensions

```sql
SELECT extname FROM pg_extension 
WHERE extname IN ('vector', 'pgcrypto');
```

**Expected**: Both extensions shown

**If missing**:
```sql
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### ✅ 3. Check Seed Data

```sql
SELECT slug, title FROM employee_profiles;
```

**Expected**: 3 employees (prime-boss, byte-doc, tag-ai)

**If empty**: Re-run seed INSERT from migration file

### ✅ 4. Environment Variables

Create `.env` in project root:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional
DEFAULT_EMPLOYEE_SLUG=prime-boss
DEFAULT_TOKEN_BUDGET=6000
DEFAULT_TOP_K=5
```

### ✅ 5. Install Dependencies

```bash
npm install @supabase/supabase-js openai
npm install -D tsx
```

---

## 🚀 Testing Steps

### Step 1: Verify Database Query

Test the vector search function:

```sql
-- This should return without error (even if empty)
SELECT search_memory_embeddings(
  'TEST_USER',
  '[0,0,0...]'::vector(1536),  -- Dummy embedding
  NULL,
  5,
  0.5
);
```

### Step 2: Start Netlify Dev

```bash
netlify dev
```

**Expected output**:
```
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
◈ Functions server now ready on http://localhost:8888/.netlify/functions
```

### Step 3: Test with curl (Windows)

```powershell
curl -N -X POST "http://localhost:8888/.netlify/functions/chat" `
  -H "Content-Type: application/json" `
  -d '{\"userId\":\"TEST_USER\",\"employeeSlug\":\"prime-boss\",\"message\":\"Hello!\",\"stream\":true}'
```

Or use the test script:

```bash
scripts\testChatEndpoint.bat
```

### Step 4: Expected Response

**Streaming (SSE)**:
```
data: {"type":"start","session_id":"...","employee":{"slug":"prime-boss","title":"Prime - CEO & Orchestrator","emoji":"👑"}}

data: {"type":"text","content":"Hello"}

data: {"type":"text","content":"!"}

data: {"type":"text","content":" I"}

data: {"type":"text","content":"'m"}

... (more chunks)

data: {"type":"done","total_tokens":123}
```

**Non-streaming (JSON)**:
```json
{
  "session_id": "uuid-here",
  "message_id": "uuid-here",
  "content": "Hello! I'm Prime, the CEO of XspensesAI...",
  "employee": {
    "slug": "prime-boss",
    "title": "Prime - CEO & Orchestrator",
    "emoji": "👑"
  },
  "tokens": {
    "prompt": 45,
    "completion": 78,
    "total": 123
  }
}
```

---

## 🐛 Common Issues

### Issue: "Cannot find module 'chat_runtime/memory'"

**Solution**:
```bash
# The imports in Netlify functions use relative paths
# Ensure chat_runtime/ folder exists in project root
ls -la chat_runtime/
```

### Issue: "Employee not found: prime-boss"

**Solution**:
```sql
-- Check seed data
SELECT * FROM employee_profiles;

-- If empty, re-run seed INSERT from migration
-- Lines 58-78 in 000_centralized_chat_runtime.sql
```

### Issue: "SUPABASE_URL is not defined"

**Solution**:
```bash
# Check .env file exists
cat .env | grep SUPABASE_URL

# Netlify loads .env automatically
# Verify in netlify dev output
```

### Issue: "OpenAI API error: 401"

**Solution**:
```bash
# Verify API key
echo $OPENAI_API_KEY

# Test directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Issue: Stream hangs or times out

**Solution**:
- Check OpenAI API status
- Verify network connection
- Check Netlify function logs: `netlify dev` output
- Test with `stream: false` first

### Issue: "RLS policy violation"

**Solution**:
```sql
-- Verify RLS policies exist
SELECT * FROM v_rls_policies 
WHERE tablename = 'chat_sessions';

-- Test with service role key (should work)
-- If still fails, check user_id format (text vs uuid)
```

---

## 📈 Parity Test Workflow

Once basic testing works:

### 1. Start Both Endpoints

```bash
# Terminal 1: OLD endpoint (if you have one)
npm run dev:old

# Terminal 2: NEW endpoint
netlify dev
```

### 2. Run Parity Test

```bash
npm run parity
```

### 3. Review Results

```bash
# View summary in console (already printed)

# Open CSV
cat /tmp/parity_results.csv

# Or in Excel
start /tmp/parity_results.csv  # Windows
open /tmp/parity_results.csv   # Mac
xdg-open /tmp/parity_results.csv  # Linux
```

### 4. Iterate

If parity score < 90:
- Review errors in CSV
- Check specific failing prompts
- Adjust NEW endpoint
- Re-run tests

---

## 🎯 What You're Testing Right Now

Your curl command tests:

```bash
curl -N -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"TEST_USER","employeeSlug":"finance-analyzer","message":"Give me a 2-sentence overview of how you work."}'
```

This will:
1. ✅ Call the NEW centralized chat endpoint
2. ✅ Create a session for TEST_USER + finance-analyzer
3. ✅ Build context (employee prompt, facts, RAG, etc.)
4. ✅ Stream response from OpenAI
5. ✅ Save message to database
6. ✅ Return SSE stream

**Note**: `finance-analyzer` must exist in `employee_profiles` table. If you only have seed data (prime-boss, byte-doc, tag-ai), use one of those instead:

```bash
curl -N -X POST "http://localhost:8888/.netlify/functions/chat" \
  -H "Content-Type: application/json" \
  -d '{"userId":"TEST_USER","employeeSlug":"prime-boss","message":"Give me a 2-sentence overview of how you work."}'
```

---

## ✅ You're Ready!

Run your curl command and let me know:
1. What response you get (streaming chunks or error)
2. Any errors in `netlify dev` console
3. Database verification query results

I'll help troubleshoot any issues! 🚀

