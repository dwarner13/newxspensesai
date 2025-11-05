# 🚀 CORRECT PowerShell Commands for Testing

## Step 1: Start Server (Already Running)
```powershell
netlify dev
# Wait for: ◈ Server now ready on http://localhost:8888
```

## Step 2: Test Basic Chat (PowerShell Syntax)
```powershell
# Method 1: Using Invoke-RestMethod (Recommended)
Invoke-RestMethod -Uri 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"userId":"test-001","message":"Hello!"}'

# Method 2: Using curl.exe (if available)
curl.exe -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -H 'Content-Type: application/json' `
  -d '{\"userId\":\"test-001\",\"message\":\"Hello!\"}'
```

## Step 3: Test Memory Extraction
```powershell
Invoke-RestMethod -Uri 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"userId":"test-002","message":"I prefer CSV format and weekly notifications"}'
```

## Step 4: Test Context Retrieval
```powershell
Invoke-RestMethod -Uri 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -Method POST `
  -ContentType 'application/json' `
  -Body '{"userId":"test-002","message":"What format do I prefer?"}'
```

## Step 5: Test Rate Limiting
```powershell
# Send 21 requests rapidly
1..21 | ForEach-Object {
  Start-Job -ScriptBlock {
    param($num)
    try {
      Invoke-RestMethod -Uri 'http://localhost:8888/.netlify/functions/chat-v3-production' `
        -Method POST `
        -ContentType 'application/json' `
        -Body "{`"userId`":`"test-rate`",`"message`":`"Test $num`"}"
    } catch {
      Write-Host "Request $num failed: $($_.Exception.Message)"
    }
  } -ArgumentList $_
}

# Wait for all jobs to complete
Get-Job | Wait-Job | Receive-Job
Get-Job | Remove-Job
```

## Alternative: Simple Test
```powershell
# Quick test to see if server responds
$body = @{
  userId = "quick-test"
  message = "Hi there!"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:8888/.netlify/functions/chat-v3-production' `
  -Method POST `
  -ContentType 'application/json' `
  -Body $body
```

## Expected Results

**Success**: You should see streaming JSON like:
```
{"ok":true,"sessionId":"...","messageUid":"...","employee":"prime-boss"}
{"delta":"Hello"}
{"delta":"!"}
[DONE]
```

**Error**: Check these common issues:
- Server not running: `netlify dev`
- Wrong endpoint: Use `/chat-v3-production` not `/chat`
- Environment: Check `.env` has `CHAT_BACKEND_VERSION=v3`
- Database: Run migrations in Supabase dashboard

## Quick Troubleshooting

```powershell
# Check if server is running
netstat -an | findstr :8888

# Check environment variables
Get-Content .env | Select-String "CHAT_BACKEND_VERSION"

# Test basic connectivity
Test-NetConnection -ComputerName localhost -Port 8888
```

---

**START HERE**: Copy and paste the "Simple Test" command above! 🚀











