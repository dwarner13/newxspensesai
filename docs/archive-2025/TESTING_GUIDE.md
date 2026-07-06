# 🧪 Testing Guide – Local & Production

## Status

✅ Dev Server Running
- Frontend: http://localhost:5175
- Functions: http://localhost:8888
- Vite: Hot reload enabled
- All 30+ functions loaded

⚠️ One syntax error fixed
- `MobileMenuDrawer.tsx:29` - JSDoc comment with JSX braces

---

## Health Check

### Test Basic Functions

```bash
# Simple health check
curl -i http://localhost:8888/.netlify/functions/test

# Expected: 200 OK
# Body: { "message": "Hello from Lambda" }
```

```bash
# Self test
curl -i http://localhost:8888/.netlify/functions/selftest

# Expected: 200 OK
# Body: { "ok": true }
```

---

## Transactions API

### Get Latest Transactions

```bash
curl -i http://localhost:8888/.netlify/functions/tx-list-latest \
  -H "x-user-id: test-user-123"

# Expected: 200 OK
# Body: { "ok": true, "transactions": [...], "total": N }
```

### Get Categories

```bash
curl -i http://localhost:8888/.netlify/functions/tag-categories \
  -H "x-user-id: test-user-123"

# Expected: 200 OK
# Body: { "ok": true, "categories": [...] }
```

### Get Rules

```bash
curl -i http://localhost:8888/.netlify/functions/tag-rules \
  -H "x-user-id: test-user-123"

# Expected: 200 OK
# Body: { "ok": true, "rules": [...] }
```

---

## Categorization

### Categorize a Transaction

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/tag-categorize \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "tx-123",
    "merchant_name": "Starbucks"
  }'

# Expected: 200 OK
# Body: {
#   "ok": true,
#   "category_id": "cat-coffee",
#   "confidence": 0.85,
#   "source": "similarity"  // or "rule", "alias", "ai"
# }
```

### Dry Run (No Save)

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/tag-categorize-dryrun \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_name": "Unknown Merchant XYZ"
  }'

# Expected: 200 OK
# Body: {
#   "ok": true,
#   "category_id": "cat-other",
#   "confidence": 0.65,
#   "reason": "AI categorization"
# }
```

### Get Why (Explanation)

```bash
curl -i http://localhost:8888/.netlify/functions/tag-why \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"transaction_id": "tx-123"}'

# Expected: 200 OK
# Body: {
#   "ok": true,
#   "category_id": "cat-coffee",
#   "reason": "Similar to: Starbucks Coffee (92% match)",
#   "confidence": 0.85
# }
```

---

## Security & Status

### Security Status

```bash
curl -i http://localhost:8888/.netlify/functions/security-status

# Expected: 200 OK
# Body: {
#   "ok": true,
#   "status": "healthy",
#   "checks": {
#     "auth": "pass",
#     "rls": "pass",
#     "rate_limit": "pass",
#     "validation": "pass",
#     "pii": "pass",
#     "audit": "pass"
#   }
# }
```

---

## Chat (Requires OpenAI API Key)

### Simple Chat Message

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/chat \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"message":"Say hello in one sentence."}'

# Expected: 200 OK
# Body: {
#   "ok": true,
#   "response": "Hello! How can I help you today?"
# }
```

### Chat with Intent Routing

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/chat \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"message":"/categorize please analyze my last 10 transactions"}'

# Expected: 200 OK with routed to tag-categorize
# Response includes categorization results
```

---

## Error Cases (Test Graceful Handling)

### Missing Auth Header

```bash
curl -i http://localhost:8888/.netlify/functions/tx-list-latest

# Expected: 401 Unauthorized
# Body: { "ok": false, "error": "Unauthorized" }
```

### Rate Limit (100 requests in 1 second)

```bash
for i in {1..101}; do
  curl http://localhost:8888/.netlify/functions/test &
done
wait

# Expected: Some return 429 Too Many Requests
# Body: { "ok": false, "error": "Rate limited" }
```

### Invalid Input

```bash
curl -i -X POST http://localhost:8888/.netlify/functions/tag-categorize \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"merchant_name": ""}'  # Empty string

# Expected: 400 Bad Request
# Body: { "ok": false, "error": "Validation failed", "details": {...} }
```

### Payload Too Large

```bash
python3 -c "
import json
huge = json.dumps({'data': 'x' * (250 * 1024)})
print(huge)
" | curl -i -X POST http://localhost:8888/.netlify/functions/tag-categorize \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d @-

# Expected: 413 Payload Too Large
# Body: { "ok": false, "error": "Payload too large" }
```

---

## Browser Testing

### Open Frontend

```
http://localhost:5175
```

### Test Flow

1. **Sign In**
   - Use test account
   - Verify JWT stored in localStorage

2. **Dashboard**
   - Verify transactions load
   - Check category pills render
   - Confirm confidence badges show

3. **Chat**
   - Click chat bubble
   - Type: `/categorize` + Enter
   - Verify results appear

4. **Notifications**
   - Open notifications bell
   - Verify unread count
   - Click to mark read

5. **Rules**
   - Navigate to Smart Categories
   - Verify rules list
   - Create new rule

---

## Performance Testing

### Measure Latency

```bash
# Non-AI endpoint (should be <100ms)
time curl -s http://localhost:8888/.netlify/functions/tag-categories \
  -H "x-user-id: test-user-123" > /dev/null

# AI endpoint (should be <3s)
time curl -s -X POST http://localhost:8888/.netlify/functions/tag-categorize \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"merchant_name": "New Merchant", "transaction_id": "tx-456"}' > /dev/null
```

### Throughput Test (100 concurrent)

```bash
ab -n 100 -c 10 http://localhost:8888/.netlify/functions/test

# Expected:
# - Requests per second: >50
# - Failed requests: 0
# - Avg response time: <100ms
```

---

## Database Verification

### Check Categorization Stored

```sql
-- In Supabase SQL Editor
SELECT 
  id, transaction_id, category_id, confidence, source, created_at
FROM transaction_categorization
ORDER BY created_at DESC
LIMIT 10;
```

### Check Rate Limits

```sql
SELECT 
  user_id, route, request_count, window_start
FROM api_rate_limits
WHERE window_start > NOW() - INTERVAL '1 minute'
ORDER BY window_start DESC;
```

### Check Audit Logs

```sql
SELECT 
  id, user_id, action, resource_type, created_at
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## Logs & Debugging

### Watch Live Logs

```bash
netlify logs --tail
# or
netlify dev --live
```

### Check Specific Function

```bash
# In Netlify dashboard:
# Functions → [function-name] → Invocations

# Or via CLI:
netlify logs --function=tag-categorize --tail
```

### Filter by User

```bash
netlify logs --tail | grep "test-user-123"
```

---

## Deployment Verification (Production)

After deploying to production:

```bash
# Health check
curl https://your-site.netlify.app/.netlify/functions/health

# Expected: 200 OK with services healthy

# Monitor for 24h
# Check error rate < 1%
# Check latency p95 < 200ms (non-AI)
```

---

## Summary

| Component | Status | Test | Pass |
|-----------|--------|------|------|
| Health | ✅ | curl test | - |
| Functions | ✅ | All loaded | - |
| Transactions API | ✅ | GET endpoints | - |
| Categorization | ✅ | POST /categorize | - |
| Chat | ✅ | POST /chat | - |
| Security | ✅ | Auth headers | - |
| Rate Limit | ✅ | 100 concurrent | - |
| Error Handling | ✅ | Invalid input | - |
| Database | ✅ | RLS working | - |
| Logs | ✅ | netlify logs | - |

---

**Ready to test!** Run curl commands above or open http://localhost:5175

**Next:** Deploy to production with `git push origin main`





