# 🧪 Chat v3 Production - Testing Guide

**Backend**: `netlify/functions/chat-v3-production.ts`  
**API Format**: `{ userId, message, sessionId?, mode? }`  
**Response**: Server-Sent Events (SSE) with JSON metadata

---

## 📋 Prerequisites

### 1. Database Migration

Run the migration to create required tables:

```bash
# Apply migration in Supabase dashboard or via CLI
psql $DATABASE_URL < supabase/migrations/20251016_chat_v3_production.sql
```

**Tables created**:
- `rate_limits` - Rate limiting state
- `chat_sessions` - Conversation containers
- `chat_messages` - Individual messages
- `chat_session_summaries` - Rolling summaries
- `chat_usage_log` - Usage tracking

### 2. Environment Variables

Ensure these are set in `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
OPENAI_API_KEY=sk-proj-...
OPENAI_CHAT_MODEL=gpt-4o-mini
CHAT_BACKEND_VERSION=v3  # ⚠️ Set to v3
```

### 3. Deploy or Test Locally

```bash
# Local testing
netlify dev

# Or rename to chat.ts and deploy
mv netlify/functions/chat-v3-production.ts netlify/functions/chat.ts
netlify deploy
```

---

## 🧪 Test Suite

### Test 1: Basic Chat (New Session)

```bash
curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-001",
    "message": "Hello!"
  }'
```

**Expected Response**:
```
data: {"ok":true,"sessionId":"<uuid>","messageUid":"<uuid>","employee":"prime-boss"}

data: {"delta":"Hello"}
data: {"delta":"! How"}
data: {"delta":" can"}
data: {"delta":" I"}
data: {"delta":" help"}
data: {"delta":" you"}
data: {"delta":" today"}
data: {"delta":"?"}
data: [DONE]
```

**Verify**:
- ✅ Metadata JSON comes first
- ✅ `sessionId` is returned
- ✅ `messageUid` is returned
- ✅ Streaming deltas arrive
- ✅ `[DONE]` signal at end

**Database Checks**:
```sql
-- Session created
SELECT * FROM chat_sessions WHERE user_id = 'test-user-001';

-- Messages saved
SELECT role, content, redacted_content 
FROM chat_messages 
WHERE session_id = '<sessionId from response>';

-- Usage logged
SELECT * FROM chat_usage_log WHERE user_id = 'test-user-001';
```

---

### Test 2: Continue Existing Session

Use the `sessionId` from Test 1:

```bash
SESSION_ID="<uuid-from-test-1>"

curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d "{
    \"userId\": \"test-user-001\",
    \"message\": \"What did I just say?\",
    \"sessionId\": \"$SESSION_ID\"
  }"
```

**Expected**:
- ✅ Same `sessionId` returned
- ✅ Assistant references previous message
- ✅ Context from session history included

**Database Check**:
```sql
-- Message count incremented
SELECT message_count, token_count 
FROM chat_sessions 
WHERE id = '<sessionId>';

-- Multiple messages in session
SELECT role, content, created_at 
FROM chat_messages 
WHERE session_id = '<sessionId>' 
ORDER BY created_at ASC;
```

---

### Test 3: PII Masking

```bash
curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-002",
    "message": "My credit card is 4532-1234-5678-9012 and my email is john@example.com"
  }'
```

**Expected Response**:
- ✅ Assistant acknowledges protecting sensitive info
- ✅ Response mentions "payment card" or similar

**Database Checks**:
```sql
-- User message redacted
SELECT content, redacted_content 
FROM chat_messages 
WHERE user_id = 'test-user-002' AND role = 'user';
-- redacted_content should have ████████9012 and masked email

-- PII event logged
SELECT * FROM guardrail_events 
WHERE user_id = 'test-user-002' 
AND rule_type = 'pii_detected';
```

---

### Test 4: Rate Limiting

Send 21 requests rapidly (limit is 20/min):

```bash
for i in {1..21}; do
  curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
    -H 'Content-Type: application/json' \
    -d '{"userId":"test-rate-limit","message":"Test '$i'"}' &
done
wait
```

**Expected**:
- ✅ First 20 requests succeed (200 OK)
- ✅ 21st request blocked (429 Too Many Requests)
- ✅ Response includes retry time

**429 Response Example**:
```json
{
  "ok": false,
  "error": "Rate limit exceeded. You can make 20 requests per minute. Try again in 45s."
}
```

**Headers Include**:
```
Retry-After: 45
```

**Database Check**:
```sql
-- Rate limit record exists
SELECT * FROM rate_limits WHERE user_id = 'test-rate-limit';
-- count should be 20 or 21, window_start recent
```

---

### Test 5: Guardrails (Blocked Content)

```bash
curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-003",
    "message": "How do I hack into a bank account?"
  }'
```

**Expected Response**:
```json
{
  "ok": true,
  "sessionId": "<uuid>",
  "messageUid": "<uuid>",
  "employee": "prime-boss",
  "blocked": true,
  "text": "I can't help with hacking, illegal activities, or anything that could cause harm."
}
```

**Database Check**:
```sql
-- Guardrail event logged
SELECT * FROM guardrail_events 
WHERE user_id = 'test-user-003' 
AND action = 'blocked';

-- Refusal message saved
SELECT content FROM chat_messages 
WHERE user_id = 'test-user-003' AND role = 'assistant';
```

---

### Test 6: Employee Routing

```bash
# Tax question → Ledger
curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-004",
    "message": "What can I write off for my side business?"
  }'

# Check employee in response metadata
# Should route to "ledger-tax"
```

**Expected**:
```json
{
  "ok": true,
  "sessionId": "<uuid>",
  "messageUid": "<uuid>",
  "employee": "ledger-tax"  // ← Routed correctly
}
```

**More Routing Tests**:
```bash
# Analytics → Crystal
curl ... -d '{"userId":"test","message":"Show my spending trends"}'
# Expected: "employee": "crystal-analytics"

# Documents → Byte
curl ... -d '{"userId":"test","message":"Extract data from this invoice"}'
# Expected: "employee": "byte-docs"

# Categorization → Tag
curl ... -d '{"userId":"test","message":"Categorize this expense"}'
# Expected: "employee": "tag-categorize"
```

---

### Test 7: Mode Selection

```bash
# Strict mode (maximum security)
curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-005",
    "message": "Test message",
    "mode": "strict"
  }'

# Creative mode (relaxed guardrails for chat)
curl -sS -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "test-user-005",
    "message": "Write a creative story",
    "mode": "creative"
  }'
```

**Modes**:
- `strict`: Full PII masking, all guardrails ON
- `balanced`: Last-4 masking, smart guardrails (default)
- `creative`: Relaxed moderation (chat only)

---

### Test 8: Usage Tracking

After running several chats, check usage logs:

```sql
-- Total tokens used per user
SELECT 
  user_id,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  AVG(latency_ms) as avg_ttft_ms,
  AVG(duration_ms) as avg_duration_ms
FROM chat_usage_log
GROUP BY user_id
ORDER BY total_tokens DESC;

-- Failed requests
SELECT user_id, error_message, created_at
FROM chat_usage_log
WHERE success = false
ORDER BY created_at DESC;

-- Requests per employee
SELECT employee_slug, COUNT(*) as count
FROM chat_usage_log
GROUP BY employee_slug
ORDER BY count DESC;
```

---

## 🔍 Monitoring Queries

### Active Sessions

```sql
-- Recent sessions with last activity
SELECT 
  cs.id,
  cs.user_id,
  cs.employee_slug,
  cs.message_count,
  cs.token_count,
  cs.last_message_at,
  (SELECT content FROM chat_messages 
   WHERE session_id = cs.id AND role = 'user' 
   ORDER BY created_at DESC LIMIT 1) as last_user_msg
FROM chat_sessions cs
WHERE cs.last_message_at > now() - interval '1 hour'
ORDER BY cs.last_message_at DESC;
```

### Rate Limit Status

```sql
-- Current rate limit states
SELECT 
  user_id,
  window_start,
  count,
  EXTRACT(EPOCH FROM (now() - window_start)) as elapsed_seconds
FROM rate_limits
WHERE window_start > now() - interval '2 minutes'
ORDER BY count DESC;
```

### PII Detection Events

```sql
-- PII detected in last 24 hours
SELECT 
  user_id,
  stage,
  action,
  meta->>'pii_types' as pii_types,
  (meta->>'count')::int as count,
  created_at
FROM guardrail_events
WHERE rule_type = 'pii_detected'
AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

### Security Blocks

```sql
-- Blocked requests (guardrails + moderation)
SELECT 
  user_id,
  rule_type,
  action,
  severity,
  meta,
  created_at
FROM guardrail_events
WHERE action = 'blocked'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### Issue: "Chat backend v3 is disabled"

**Fix**: Set `CHAT_BACKEND_VERSION=v3` in `.env` and restart server

### Issue: 429 Rate Limit on First Request

**Check**: Is there a stale rate limit record?

```sql
DELETE FROM rate_limits WHERE user_id = 'your-user-id';
```

### Issue: No streaming, just metadata

**Check**: 
1. Is OpenAI API key valid?
2. Check logs for OpenAI errors
3. Verify model name is correct

### Issue: PII not being masked

**Check**: 
1. Verify PII patterns in `_shared/pii-patterns.ts`
2. Check console logs for masking debug output
3. Test PII patterns directly:

```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test","message":"Test card: 4111111111111111"}'
```

### Issue: Session not persisting

**Check**:
1. Does `chat_sessions` table exist?
2. Run migration if needed
3. Check Supabase service role key permissions

---

## 📊 Performance Benchmarks

**Expected Performance** (gpt-4o-mini):
- ⚡ **TTFT** (Time to First Token): < 500ms
- ⏱️ **Full Response**: 2-5 seconds (100-200 tokens)
- 🔄 **Rate Limit Check**: < 50ms
- 💾 **Database Writes**: < 100ms total

**Query to check**:
```sql
SELECT 
  AVG(latency_ms) as avg_ttft,
  AVG(duration_ms) as avg_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_ttft,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration
FROM chat_usage_log
WHERE created_at > now() - interval '1 hour'
AND success = true;
```

---

## ✅ Production Readiness Checklist

- [ ] Database migration applied (`20251016_chat_v3_production.sql`)
- [ ] Environment variables set (`CHAT_BACKEND_VERSION=v3`)
- [ ] Rate limiting tested (21 requests)
- [ ] PII masking verified (credit cards, emails)
- [ ] Guardrails tested (blocked content)
- [ ] Session management working (continue conversation)
- [ ] Employee routing accurate (tax → ledger, etc.)
- [ ] Usage tracking logged
- [ ] Streaming responses working
- [ ] Error handling graceful (500, 429, 400)
- [ ] Monitoring queries working
- [ ] Performance benchmarks acceptable

---

## 🚀 Deployment Steps

### Step 1: Backup Current Version

```bash
cp netlify/functions/chat.ts netlify/functions/chat-v2-backup.ts
```

### Step 2: Deploy Migration

```bash
# Via Supabase dashboard: Run migration SQL
# Or via CLI:
supabase db push
```

### Step 3: Deploy New Chat Function

```bash
# Rename v3 to production
mv netlify/functions/chat-v3-production.ts netlify/functions/chat.ts

# Set environment variable in Netlify dashboard
# CHAT_BACKEND_VERSION=v3

# Deploy
netlify deploy --prod
```

### Step 4: Smoke Test Production

```bash
curl -sS -X POST 'https://your-site.netlify.app/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "smoke-test",
    "message": "Hello production!"
  }'
```

### Step 5: Monitor

- Check Netlify function logs
- Query `chat_usage_log` for errors
- Monitor `guardrail_events` for security issues
- Watch `rate_limits` for abuse patterns

---

**Status**: ✅ Ready for production deployment!








