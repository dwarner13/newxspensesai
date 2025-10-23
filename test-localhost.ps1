#!/usr/bin/env pwsh
# Simple localhost test script

Write-Host ""
Write-Host "Testing Crystal Chat on localhost..."
Write-Host ""

# Test 1: Basic Message
Write-Host "TEST 1: Basic Message to Prime" -ForegroundColor Yellow

$body = @{
  userId = "test-$(Get-Random)"
  message = "Hi Prime, who are you?"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -TimeoutSec 30 `
    -ErrorAction Stop
  
  $data = $response.Content | ConvertFrom-Json
  Write-Host "✅ PASS - Response received" -ForegroundColor Green
  Write-Host "   Message: $($data.message.Substring(0, [Math]::Min(80, $data.message.Length)))..." -ForegroundColor Gray
} catch {
  Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Finance Query (Auto-Handoff)
Write-Host "TEST 2: Finance Query (Auto-Handoff)" -ForegroundColor Yellow

$body = @{
  userId = "test-$(Get-Random)"
  message = "Show me my spending trends"
  employeeSlug = "prime-boss"
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -TimeoutSec 30 `
    -ErrorAction Stop
  
  $data = $response.Content | ConvertFrom-Json
  
  if ($data.message -match "(spend|trend|category|budget)") {
    Write-Host "✅ PASS - Finance intent detected" -ForegroundColor Green
  } else {
    Write-Host "⚠️  WARN - Response may not be finance-focused" -ForegroundColor Yellow
  }
  Write-Host "   Response: $($data.message.Substring(0, [Math]::Min(80, $data.message.Length)))..." -ForegroundColor Gray
} catch {
  Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Direct Crystal Query
Write-Host "TEST 3: Direct Crystal Query" -ForegroundColor Yellow

$body = @{
  userId = "test-$(Get-Random)"
  message = "What are my top categories?"
  employeeSlug = "crystal-analytics"
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/chat-v3-production" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -TimeoutSec 30 `
    -ErrorAction Stop
  
  $data = $response.Content | ConvertFrom-Json
  Write-Host "✅ PASS - Crystal responded" -ForegroundColor Green
  Write-Host "   Message: $($data.message.Substring(0, [Math]::Min(80, $data.message.Length)))..." -ForegroundColor Gray
} catch {
  Write-Host "❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Green
Write-Host ""





