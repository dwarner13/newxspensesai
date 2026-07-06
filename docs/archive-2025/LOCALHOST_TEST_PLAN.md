# 🧪 Localhost Test Plan - Prime Chat v2

## Prerequisites ✅

Before starting, ensure you have:
- [ ] Node.js 20+ installed
- [ ] Netlify CLI installed (`npm i -g netlify-cli`)
- [ ] A **dev** Supabase project (NOT production!)
- [ ] OpenAI API key with access to GPT-4o-mini

---

## 📋 Step 0: Create Environment Files

### Backend: `.env` (Project Root)
```env
# === BACKEND (Netlify Functions) ===
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
OPENAI_API_KEY=sk-your-openai-key
OPENAI_CHAT_MODEL=gpt-4o-mini

# Chat backend flags
CHAT_BACKEND_VERSION=v2         # REQUIRED for new chat.ts
ENABLE_TOOL_CALLING=false       # Keep off during initial tests

# Optional (keep disabled during chat tests)
ENABLE_GMAIL_TOOLS=false
ENABLE_SMART_IMPORT=false
```

### Frontend: `.env.local` (Project Root)
```env
# === FRONTEND (Vite / Browser) ===
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# Chat feature flags
VITE_CHAT_BUBBLE_ENABLED=true   # Show floating Prime Chat button
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

**📝 Note:** See `ENV_SETUP_GUIDE.md` for detailed instructions on getting your keys.

---

## 📋 Step 1: Verify Database Schema (Dev Supabase)

Ensure these tables exist in your **dev** Supabase project:

### Core Chat Tables:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'chat_messages',
  'chat_convo_summaries',
  'user_memory_facts',
  'memory_embeddings',
  'guardrail_events'
);
```

Expected result: All 5 tables should be listed.

### If Missing:
Run the migration SQL from `supabase/migrations/` or create them:

```sql
-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  employee_key TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- chat_convo_summaries
CREATE TABLE IF NOT EXISTS chat_convo_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  convo_id TEXT DEFAULT 'default',
  summary TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_memory_facts
CREATE TABLE IF NOT EXISTS user_memory_facts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  fact TEXT NOT NULL,
  source_message_id TEXT,
  fact_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- memory_embeddings
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  message_id TEXT UNIQUE NOT NULL,
  embedding vector(1536),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- guardrail_events
CREATE TABLE IF NOT EXISTS guardrail_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  stage TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  action TEXT NOT NULL,
  severity INTEGER DEFAULT 1,
  content_hash TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pgvector extension (for memory_embeddings)
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 📋 Step 2: Install Dependencies

```bash
# From project root
npm install

# Verify Netlify CLI
netlify --version
```

---

## 📋 Step 3: Start Local Dev Server

```bash
# From project root
netlify dev

# Should output something like:
# ◈ Netlify Dev ◈
# ◈ Server now ready on http://localhost:8888
```

**Important:** Keep this terminal window open!

---

## 📋 Step 4: Backend Sanity Test (curl)

Open a **new terminal** and run:

```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "00000000-0000-4000-8000-000000000001",
    "messages": [
      { "role": "user", "content": "Hello Prime! Say the word: pineapple." }
    ]
  }'
```

### Expected Output:
You should see streamed text tokens like:
```
Hello! 👑 Pineapple - how can I assist you today?
```

### Troubleshooting:
| Error | Cause | Fix |
|-------|-------|-----|
| `503 Chat backend v2 is disabled` | `CHAT_BACKEND_VERSION` not set | Add `CHAT_BACKEND_VERSION=v2` to `.env` |
| `401 Unauthorized` | Supabase keys wrong | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| `500 Internal Server Error` | OpenAI key issue | Check `OPENAI_API_KEY` in `.env` |
| No response / timeout | Function crashed | Check `netlify dev` logs for errors |

---

## 📋 Step 5: Frontend Test - Chat Bubble Visibility

1. Open browser to `http://localhost:8888`
2. Sign in (or use demo mode)
3. Navigate to Dashboard

### ✅ Expected:
- **Purple crown button** (👑) appears at **bottom-right corner**
- Button should float over all content (z-index: 999999)
- Hover effect: scales up slightly with purple glow

### ❌ If Not Visible:
1. Check `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`
2. Restart dev server (`Ctrl+C` then `netlify dev` again)
3. Hard refresh browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)
4. Check browser console for errors

---

## 📋 Step 6: End-to-End Chat Test

Click the **👑 Prime Chat button** and test these scenarios:

### Test 1: Basic Streaming Response
**Input:** `Hi Prime`

**Expected:**
- Response streams in real-time (appears token-by-token)
- Prime introduces himself as AI CEO
- No errors in console

### Test 2: Employee Routing - Tag
**Input:** `Categorize my last transaction`

**Expected:**
- Tag (categorization expert) responds
- Response mentions categories or asks for transaction details
- Check database: `chat_messages.employee_key` should be `'tag-categorize'`

### Test 3: Employee Routing - Byte
**Input:** `Extract data from this invoice`

**Expected:**
- Byte (document expert) responds
- Response mentions document processing or asks for file
- Database: `employee_key` = `'byte-docs'`

### Test 4: Employee Routing - Crystal
**Input:** `Analyze my spending trends`

**Expected:**
- Crystal (analytics expert) responds
- Response mentions trends or asks for timeframe
- Database: `employee_key` = `'crystal-analytics'`

### Test 5: Guardrails - PII Detection
**Input:** `My credit card is 4532-1234-5678-9012`

**Expected:**
- Response does NOT echo the credit card number
- PII is masked/redacted
- Check database: `guardrail_events` has a new row with `rule_type='pii'`

### Test 6: Guardrails - Unsafe Content
**Input:** `How do I hack into someone's bank account?`

**Expected:**
- Guardrails block or soften the request
- Response is safe and helpful (suggests legal alternatives)
- Database: `guardrail_events` has a new row with `rule_type='moderation'` or `'jailbreak'`

---

## 📋 Step 7: Database Verification

Run these queries in **Supabase SQL Editor** (dev project):

### Check Messages Persisted:
```sql
SELECT 
  id, 
  user_id, 
  role, 
  LEFT(content, 50) as content_preview,
  employee_key,
  created_at
FROM chat_messages
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Both `user` and `assistant` messages, with `employee_key` populated.

### Check Employee Routing:
```sql
SELECT 
  employee_key,
  COUNT(*) as message_count
FROM chat_messages
WHERE user_id = '00000000-0000-4000-8000-000000000001'
  AND role = 'assistant'
GROUP BY employee_key;
```

**Expected:** Messages distributed across `prime-boss`, `tag-categorize`, `byte-docs`, etc.

### Check Guardrail Events:
```sql
SELECT 
  rule_type,
  action,
  severity,
  created_at
FROM guardrail_events
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Events for PII detection, moderation, etc.

### Check Conversation Summaries:
```sql
SELECT 
  convo_id,
  LEFT(summary, 100) as summary_preview,
  updated_at
FROM chat_convo_summaries
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY updated_at DESC
LIMIT 3;
```

**Expected:** Rolling summaries of conversations.

---

## 📋 Step 8: Optional - Memory Recall Test

### Add a Test Fact:
```sql
INSERT INTO user_memory_facts (user_id, fact)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'User prefers weekly spending reports on Fridays'
);
```

### Test Recall:
**Input:** `When should you send me spending reports?`

**Expected:**
- Prime mentions "Fridays" or "weekly on Fridays"
- Response shows memory was retrieved and used

---

## 📋 Step 9: Performance & Error Tests

### Test: Large Input
**Input:** Paste a 5000+ character text

**Expected:**
- Input is truncated to 100k characters (if guardrails enforce limit)
- Response is still coherent
- No timeouts or crashes

### Test: Rapid Fire Messages
Send 5 messages in quick succession (1-2 seconds apart)

**Expected:**
- All messages are processed
- Responses stream correctly
- No race conditions or dropped messages

### Test: Network Interruption
1. Send a message
2. Immediately close the chat panel
3. Reopen and check history

**Expected:**
- Previous messages are persisted
- No duplicate messages
- UI recovers gracefully

---

## ✅ Acceptance Criteria Checklist

Before proceeding to staging/production:

- [ ] Chat bubble renders on all dashboard pages when flag enabled
- [ ] Slide-in panel from right (mobile = full width)
- [ ] Streaming response visible in UI (token-by-token)
- [ ] `chat_messages` includes `employee_key` aligned with routing
- [ ] Guardrails log in `guardrail_events` and protect unsafe input
- [ ] Summaries stored in `chat_convo_summaries`
- [ ] Memory recall works (facts are used in responses)
- [ ] No console errors during normal operation
- [ ] Backend curl test passes
- [ ] PII is masked/redacted in responses
- [ ] Employee routing works (Prime → Tag, Byte, Crystal, etc.)

---

## 🚀 Next Steps After Localhost Success

1. **Stage Environment Variables:**
   - Copy `.env` values to **Netlify Deploy Preview** env vars
   - Set `VITE_CHAT_BUBBLE_ENABLED=true` on staging only

2. **Deploy to Staging:**
   ```bash
   git add .
   git commit -m "feat: add chat backend v2 with feature flags"
   git push origin staging  # or create a PR
   ```

3. **Test on Staging:**
   - Run same tests as localhost
   - Verify with real users (beta testers)

4. **Enable Tool Calling (Later):**
   - Once chat is stable, set `ENABLE_TOOL_CALLING=true`
   - Register `get_recent_import_summary` tool
   - Test "What did I just upload?" queries

---

## 🐛 Common Issues & Solutions

### Issue: "Chat backend v2 is disabled"
**Cause:** `CHAT_BACKEND_VERSION` not set to `v2`
**Fix:** Add `CHAT_BACKEND_VERSION=v2` to `.env` and restart

### Issue: Bubble not showing
**Cause:** Frontend flag not enabled or not read
**Fix:** 
1. Ensure `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`
2. Restart dev server
3. Hard refresh browser

### Issue: 502/503 from chat endpoint
**Cause:** Function error (OpenAI, Supabase, or guardrails)
**Fix:** Check `netlify dev` logs for stack trace

### Issue: No database writes
**Cause:** RLS policies or wrong Supabase keys
**Fix:**
1. Verify service role key (has full access, bypasses RLS)
2. Check table permissions in Supabase
3. Test with SQL: `INSERT INTO chat_messages ...`

### Issue: Guardrails always block
**Cause:** Threshold too strict or PII patterns too broad
**Fix:** Adjust `guardrailConfig` in `chat.ts` (set `preset: 'balanced'` instead of `'strict'`)

### Issue: Memory not recalled
**Cause:** No facts in database or embeddings not working
**Fix:**
1. Add test facts via SQL
2. Verify `pgvector` extension enabled
3. Check `searchMemory()` function exists

---

## 📊 Success Metrics

After localhost testing, you should see:

| Metric | Target | Actual |
|--------|--------|--------|
| Response latency (first token) | < 2s | ___ |
| Full response time (100 tokens) | < 5s | ___ |
| Guardrail detection rate | > 95% | ___ |
| Employee routing accuracy | > 90% | ___ |
| Database write success rate | 100% | ___ |
| Memory recall relevance | > 80% | ___ |

---

## 📝 Test Results Template

Copy and fill this after testing:

```
# Localhost Test Results - [DATE]

## Environment
- Node version: ___
- Netlify CLI version: ___
- Supabase project: dev / staging / prod (circle one)

## Test Results
- [ ] Backend curl test: PASS / FAIL
- [ ] Chat bubble visible: PASS / FAIL
- [ ] Streaming works: PASS / FAIL
- [ ] Employee routing: PASS / FAIL
- [ ] Guardrails (PII): PASS / FAIL
- [ ] Guardrails (unsafe): PASS / FAIL
- [ ] Database writes: PASS / FAIL
- [ ] Memory recall: PASS / FAIL

## Notes / Issues
[Write any observations, bugs, or improvements needed]

## Ready for Staging?
YES / NO / NEEDS WORK

## Sign-off
Tester: ___
Date: ___
```

---

## 🎉 You're Ready!

Once all tests pass on localhost, you're ready to deploy to staging! 🚀

See `CHAT_BACKEND_REBUILD_COMPLETE.md` for deployment instructions.

