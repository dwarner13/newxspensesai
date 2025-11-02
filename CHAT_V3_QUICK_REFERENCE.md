# 🚀 Chat v3 - Quick Reference Card

**TL;DR**: Production-ready chat with rate limiting, sessions, and enhanced monitoring

---

## 📋 Quick Comparison

| | v2 | v3 |
|---|---|---|
| **Request** | `{userId, messages[]}` | `{userId, message}` |
| **Response** | Plain text | SSE with metadata |
| **Sessions** | ❌ | ✅ |
| **Rate Limiting** | ❌ | ✅ 20/min |
| **Message IDs** | ❌ | ✅ UUID |
| **Token Budgets** | ❌ | ✅ 4k |

---

## 🔌 API

### Endpoint
```
POST /.netlify/functions/chat-v3-production
Content-Type: application/json
```

### Request Body
```json
{
  "userId": "user-123",
  "message": "Hello!",
  "sessionId": "optional-uuid",
  "mode": "balanced"
}
```

### Response (SSE)
```
data: {"ok":true,"sessionId":"<uuid>","messageUid":"<uuid>","employee":"prime-boss"}

data: {"delta":"Hello"}
data: {"delta":"!"}
data: [DONE]
```

---

## 🧪 Quick Test

```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"test","message":"Hello!"}'
```

**Expected**: JSON metadata + streaming deltas + `[DONE]`

---

## 🚦 Rate Limiting

- **Limit**: 20 requests/minute per user
- **Error**: 429 with `Retry-After` header
- **Table**: `rate_limits`

**Test**:
```bash
# Send 21 requests rapidly
for i in {1..21}; do
  curl -X POST '...' -d "{\"userId\":\"test\",\"message\":\"$i\"}" &
done
```

**Expected**: 21st request → 429

---

## 💾 Database

### Migration
```bash
psql $DATABASE_URL < supabase/migrations/20251016_chat_v3_production.sql
```

### Tables Created
- `rate_limits` - Rate limiting state
- `chat_sessions` - Conversation containers *(used now!)*
- `chat_messages` - Messages with IDs *(enhanced)*
- `chat_session_summaries` - Rolling summaries *(updated)*
- `chat_usage_log` - Metrics *(populated)*

---

## 📊 Monitoring

### Usage by User
```sql
SELECT user_id, COUNT(*), SUM(total_tokens) 
FROM chat_usage_log 
GROUP BY user_id;
```

### Rate Limit Status
```sql
SELECT * FROM rate_limits 
WHERE window_start > now() - interval '2 minutes';
```

### PII Events
```sql
SELECT * FROM guardrail_events 
WHERE rule_type = 'pii_detected' 
ORDER BY created_at DESC;
```

---

## 🔐 Security

### PII Masking
```
Input:  "My card is 4532-1234-5678-9012"
Output: "My card is ████████9012"
```

### Guardrails
- ✅ PII detection (local regex)
- ✅ Content moderation (OpenAI API)
- ✅ Jailbreak detection (GPT-4o-mini)

### Modes
- `strict`: Maximum security
- `balanced`: Smart defaults *(default)*
- `creative`: Relaxed (chat only)

---

## 🚀 Deployment

### Option 1: Side-by-Side
```bash
# Keep both /chat (v2) and /chat-v3 (v3)
netlify deploy
```

### Option 2: Replace
```bash
mv chat.ts chat-v2-backup.ts
mv chat-v3-production.ts chat.ts
CHAT_BACKEND_VERSION=v3
netlify deploy --prod
```

---

## ⚡ Performance

### Targets
- ⚡ TTFT: < 500ms
- ⏱️ Response: 2-5s
- 💾 DB: < 100ms

### Check
```sql
SELECT 
  AVG(latency_ms) as avg_ttft,
  AVG(duration_ms) as avg_duration
FROM chat_usage_log;
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| "v3 disabled" | Set `CHAT_BACKEND_VERSION=v3` |
| 429 on first request | `DELETE FROM rate_limits WHERE user_id='...'` |
| No streaming | Check OpenAI API key |
| PII not masked | Verify patterns in `_shared/pii-patterns.ts` |

---

## 📚 Full Docs

- **Summary**: `CHAT_V3_PRODUCTION_SUMMARY.md`
- **Testing**: `CHAT_V3_TESTING_GUIDE.md`
- **Current State**: `CHAT_SYSTEM_CURRENT_STATE.md`

---

## ✅ Pre-Deploy Checklist

- [ ] Run migration SQL
- [ ] Set `CHAT_BACKEND_VERSION=v3`
- [ ] Test locally (basic chat)
- [ ] Test rate limiting (21 requests)
- [ ] Test PII masking
- [ ] Verify DB writes
- [ ] Deploy & smoke test

---

**Status**: ✅ Production-Ready | **Next**: Test → Deploy → Monitor













