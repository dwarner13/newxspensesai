# Prime Persona - Quick Test Reference

## 🚀 Quick Start Testing

### Prerequisites
```bash
# Ensure your local server is running on localhost:8888
npm run dev
```

---

## ✅ Test Case 1: Prime Says Hello

```powershell
$body = @{
  userId = "00000000-0000-4000-8000-000000000001"
  message = "Hi Prime, quick hello"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1" `
  -Method POST `
  -Headers @{"content-type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content
```

### ✅ Expected Results
- Response contains `"employee":"prime-boss"`
- Tone is executive/professional
- Mentions ability to orchestrate team
- `"ok":true`

---

## ✅ Test Case 2: Memory Recall

```powershell
# Store a preference
$body1 = @{
  userId = "00000000-0000-4000-8000-000000000001"
  sessionId = "test-session-1"
  message = "I prefer CSV exports for all reports"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1" `
  -Method POST `
  -Headers @{"content-type"="application/json"} `
  -Body $body1 | Select-Object -ExpandProperty Content

# Ask Prime to recall
$body2 = @{
  userId = "00000000-0000-4000-8000-000000000001"
  sessionId = "test-session-1"
  message = "What export format do I prefer?"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1" `
  -Method POST `
  -Headers @{"content-type"="application/json"} `
  -Body $body2 | Select-Object -ExpandProperty Content
```

### ✅ Expected Results
- Second response recalls "CSV exports"
- References conversation history
- Shows personalization awareness
- Response includes context blocks

---

## ✅ Test Case 3: Analytics Summary

```powershell
$body = @{
  userId = "00000000-0000-4000-8000-000000000001"
  message = "Show my spending trends for the last 3 months"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1" `
  -Method POST `
  -Headers @{"content-type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content
```

### ✅ Expected Results
- Response includes analytics context (if data exists)
- Shows breakdown by month
- Lists top categories
- Prime provides insights or delegates to Crystal
- `"employee":"prime-boss"`

---

## ✅ Test Case 4: Tool Calling (Delegation)

```powershell
$body = @{
  userId = "00000000-0000-4000-8000-000000000001"
  message = "Pull invoices from my email and process them"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1" `
  -Method POST `
  -Headers @{"content-type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content
```

### ✅ Expected Results
- `"hadToolCalls":true` in response
- Prime recognizes email/document task
- Delegates to `byte-docs` specialist
- Response includes synthesis of Byte's result
- `"employee":"prime-boss"` (Prime remains owner)
- Logs should show: `[Chat] Prime tool-call probe starting`

---

## ✅ Test Case 5: PII Protection

```powershell
$body = @{
  userId = "00000000-0000-4000-8000-000000000001"
  message = "My credit card is 4111-1111-1111-1111 and SSN is 123-45-6789"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1" `
  -Method POST `
  -Headers @{"content-type"="application/json"} `
  -Body $body | Select-Object -ExpandProperty Content
```

### ✅ Expected Results
- Prime refuses to store raw PII
- References guardrails
- Offers secure alternative
- Message includes: "I've protected your payment card"
- Logs show PII detection: `[Chat] PII masked`

---

## 🔍 Debugging Tips

### Check Logs in Terminal
```bash
# Watch for Prime tool-call logs
# Should see:
# [Chat] Routed to: prime-boss
# [Chat] Prime context: X history messages
# [Chat] Prime tool-call probe starting
# [Chat] Prime probe result: finish_reason=..., tools=X
```

### Database Verification
```sql
-- Check that messages are saved with correct employee_key
SELECT employee_key, role, content FROM chat_messages 
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC 
LIMIT 10;

-- Should see:
-- employee_key='prime-boss' for assistant messages from Prime
-- employee_key='user' for user messages
-- employee_key='byte-docs' for assistant messages from Byte (if delegated)
```

### Memory Facts Check
```sql
-- Verify memory facts are being stored
SELECT * FROM user_memory_facts 
WHERE user_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📊 Response Structure

### Successful Response
```json
{
  "ok": true,
  "sessionId": "uuid-or-ephemeral",
  "messageUid": "message-id",
  "reply": "Prime's response text here...",
  "employee": "prime-boss",
  "hadToolCalls": false
}
```

### With Tool Calls
```json
{
  "ok": true,
  "sessionId": "uuid",
  "messageUid": "msg-id",
  "reply": "Synthesis response after delegating to specialist...",
  "employee": "prime-boss",
  "hadToolCalls": true
}
```

---

## 🧪 Full Test Sequence (Copy-Paste)

```powershell
# Test all 5 scenarios in sequence

$userId = "00000000-0000-4000-8000-000000000001"
$endpoint = "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1"
$headers = @{"content-type"="application/json"}

function Test-Prime {
  param(
    [string]$Message,
    [string]$SessionId = ""
  )
  
  $body = @{
    userId = $userId
    message = $Message
  }
  if ($SessionId) { $body.sessionId = $SessionId }
  
  $resp = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers $headers `
    -Body ($body | ConvertTo-Json) | Select-Object -ExpandProperty Content
  
  Write-Host "--- Response ---" -ForegroundColor Green
  $resp | ConvertFrom-Json | ConvertTo-Json | Write-Host
  Write-Host ""
}

# Test 1
Write-Host "=== Test 1: Hello ===" -ForegroundColor Cyan
Test-Prime "Hi Prime, quick hello"

# Test 2 & 3 (Memory)
Write-Host "=== Test 2: Memory Store ===" -ForegroundColor Cyan
Test-Prime -Message "I prefer CSV exports" -SessionId "test-1"

Write-Host "=== Test 2b: Memory Recall ===" -ForegroundColor Cyan
Test-Prime -Message "What export format do I prefer?" -SessionId "test-1"

# Test 3
Write-Host "=== Test 3: Analytics ===" -ForegroundColor Cyan
Test-Prime "Show my spending trends"

# Test 4
Write-Host "=== Test 4: Delegation ===" -ForegroundColor Cyan
Test-Prime "Pull invoices from my email"

# Test 5
Write-Host "=== Test 5: PII Protection ===" -ForegroundColor Cyan
Test-Prime "My card is 4111-1111-1111-1111"
```

---

## 🎯 Success Criteria

All 5 tests PASS when:
1. ✅ Response has `"ok":true`
2. ✅ All responses show `"employee":"prime-boss"`
3. ✅ Test 2b shows memory recall
4. ✅ Test 4 shows `"hadToolCalls":true`
5. ✅ Test 5 shows guardrail message

---

## 📞 Troubleshooting

| Issue | Check |
|-------|-------|
| `"reply": ""` (empty) | Check OpenAI API key, model availability |
| `"hadToolCalls": false` when delegating | Model may not choose delegation, add more context |
| Memory not recalled | Memory facts table might be empty |
| PII still showing | PII masking might be disabled |
| Long response time | Database queries slow, check indexes on tables |

---

## 📝 Notes

- All tests use non-stream mode (`?nostream=1`) for easier JSON parsing
- Session ID is optional; server creates ephemeral sessions if not provided
- Memory facts are optional; tests continue even if table missing
- Tool calling only happens with non-stream AND Prime AND decision to delegate






