# 🚀 Quick Test Commands

## PowerShell Commands for Testing Chat System

### 📡 Test Echo Mode
```powershell
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{'content-type'='application/json'} `
  -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"test"}' | ConvertTo-Json
```

### 📡 Test Full Pipeline (with echo mode disabled)
```powershell
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{'content-type'='application/json'} `
  -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"Can you help me track my expenses?"}' | ConvertTo-Json -Depth 5
```

### 🔍 Test with Full Headers
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST `
  -Headers @{'content-type'='application/json'} `
  -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"hello"}' `
  -UseBasicParsing

Write-Host "Status:" $response.StatusCode
Write-Host "Backend:" $response.Headers['X-Chat-Backend']
$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
```

### ❌ Test Error Handling (Invalid JSON)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{'content-type'='application/json'} `
    -Body 'not-json'
} catch {
  Write-Host "Expected Error:" $_.ErrorDetails.Message
}
```

### ❌ Test Error Handling (Missing Fields)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{'content-type'='application/json'} `
    -Body '{"userId":"00000000-0000-4000-8000-000000000001"}'
} catch {
  Write-Host "Expected Error:" $_.ErrorDetails.Message
}
```

### 🔄 Restart Server
```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

# Start Netlify Dev in background
netlify dev
```

### ✅ Check Server Status
```powershell
Invoke-WebRequest -Uri "http://localhost:8888/" -UseBasicParsing | Select-Object StatusCode
```

### 🌐 Open Browser
```powershell
Start-Process "http://localhost:8888"
```

---

## 🔧 Toggle Echo Mode

### Enable Echo Mode
```powershell
Add-Content -Path .env -Value "`nCHAT_ECHO_MODE=1"
```

### Disable Echo Mode
```powershell
(Get-Content .env) | Where-Object { $_ -notmatch "CHAT_ECHO_MODE" } | Set-Content .env
```

### Check Echo Mode Status
```powershell
Get-Content .env | Select-String "CHAT_ECHO_MODE"
```

---

## 📊 Multiple Tests at Once

```powershell
# Run a series of tests
Write-Host "`n=== Test 1: Echo Mode ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST -Headers @{'content-type'='application/json'} `
  -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"test 1"}' | ConvertTo-Json

Write-Host "`n=== Test 2: Different Message ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST -Headers @{'content-type'='application/json'} `
  -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"What are my expenses?"}' | ConvertTo-Json

Write-Host "`n=== Test 3: With Session ID ===" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
  -Method POST -Headers @{'content-type'='application/json'} `
  -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"hello","sessionId":"test-session-123"}' | ConvertTo-Json
```

---

## 🎯 Quick Copy-Paste Commands

**Most Common Test:**
```powershell
Invoke-RestMethod -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" -Method POST -Headers @{'content-type'='application/json'} -Body '{"userId":"00000000-0000-4000-8000-000000000001","message":"hello"}' | ConvertTo-Json
```

**Check Server:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8888/" -UseBasicParsing | Select-Object StatusCode
```

**Restart Everything:**
```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 2; netlify dev
```













