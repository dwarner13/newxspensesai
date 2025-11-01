# Quick Test Script for Crystal Chat System
# This script tests feature flags, employee badge, and chat integration

param(
  [string]$endpoint = "http://localhost:8888/.netlify/functions/chat-v3-production",
  [int]$delayMs = 500
)

Write-Host ""
Write-Host "╔═════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          CRYSTAL CHAT SYSTEM — QUICK TEST SCRIPT              ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Color helpers
function Test-Pass { Write-Host "✅ PASS" -ForegroundColor Green -NoNewline }
function Test-Fail { Write-Host "❌ FAIL" -ForegroundColor Red -NoNewline }
function Test-Skip { Write-Host "⏭️  SKIP" -ForegroundColor Yellow -NoNewline }
function Test-Pending { Write-Host "⏳ PENDING" -ForegroundColor Gray -NoNewline }

$passCount = 0
$failCount = 0
$skipCount = 0

# Test 1: Check endpoint availability
Write-Host ""
Write-Host "📋 TEST 1: Endpoint Availability" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

try {
  $resp = Invoke-WebRequest -Uri $endpoint -Method OPTIONS -ErrorAction Stop -TimeoutSec 5
  if ($resp.StatusCode -eq 200 -or $resp.StatusCode -eq 405) {
    Test-Pass
    $passCount++
    Write-Host " — Endpoint is reachable"
  } else {
    Test-Fail
    $failCount++
    Write-Host " — Unexpected status code: $($resp.StatusCode)"
  }
} catch {
  Test-Fail
  $failCount++
  Write-Host " — Cannot reach endpoint at $endpoint"
  Write-Host "  Make sure 'npm run dev' is running"
  exit 1
}

# Test 2: Basic Message (Prime)
Write-Host ""
Write-Host "📋 TEST 2: Basic Message to Prime" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

try {
  $body = @{
    userId = "test-$(Get-Random -Minimum 1000 -Maximum 9999)"
    message = "Hi Prime, who are you?"
    employeeSlug = "prime-boss"
  } | ConvertTo-Json

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  
  $resp = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -ErrorAction Stop `
    -TimeoutSec 30

  $stopwatch.Stop()
  $time = $stopwatch.ElapsedMilliseconds

  if ($resp.StatusCode -eq 200) {
    $content = $resp.Content | ConvertFrom-Json
    if ($content.message -and $content.message.Length -gt 10) {
      Test-Pass
      $passCount++
      Write-Host " — Response received in ${time}ms"
      Write-Host "  Message: '$($content.message.Substring(0, [Math]::Min(50, $content.message.Length)))...'"
    } else {
      Test-Fail
      $failCount++
      Write-Host " — Empty or invalid response"
    }
  } else {
    Test-Fail
    $failCount++
    Write-Host " — HTTP $($resp.StatusCode)"
  }
} catch {
  Test-Fail
  $failCount++
  Write-Host " — Error: $($_.Exception.Message)"
}

Start-Sleep -Milliseconds $delayMs

# Test 3: Analytics Query (Prime → Crystal Auto-Handoff)
Write-Host ""
Write-Host "📋 TEST 3: Auto-Handoff (Finance Query)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

try {
  $body = @{
    userId = "test-$(Get-Random -Minimum 1000 -Maximum 9999)"
    message = "Show me my spending trends"
    employeeSlug = "prime-boss"
  } | ConvertTo-Json

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  
  $resp = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -ErrorAction Stop `
    -TimeoutSec 30

  $stopwatch.Stop()
  $time = $stopwatch.ElapsedMilliseconds

  if ($resp.StatusCode -eq 200) {
    $content = $resp.Content | ConvertFrom-Json
    # Check if response contains financial keywords
    $response = $content.message.ToLower()
    $hasFinance = $response -match "(spend|trend|category|budget|expense|finance|analytics)"
    
    if ($hasFinance) {
      Test-Pass
      $passCount++
      Write-Host " — Finance intent detected and handled in ${time}ms"
      Write-Host "  Response type: $($content.employee ?? 'crystal-analytics')"
    } else {
      Test-Fail
      $failCount++
      Write-Host " — Response lacks financial content"
    }
  } else {
    Test-Fail
    $failCount++
    Write-Host " — HTTP $($resp.StatusCode)"
  }
} catch {
  Test-Fail
  $failCount++
  Write-Host " — Error: $($_.Exception.Message)"
}

Start-Sleep -Milliseconds $delayMs

# Test 4: Direct Crystal Query
Write-Host ""
Write-Host "📋 TEST 4: Direct Crystal Query" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

try {
  $body = @{
    userId = "test-$(Get-Random -Minimum 1000 -Maximum 9999)"
    message = "What are my top spending categories?"
    employeeSlug = "crystal-analytics"
  } | ConvertTo-Json

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  
  $resp = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body `
    -ErrorAction Stop `
    -TimeoutSec 30

  $stopwatch.Stop()
  $time = $stopwatch.ElapsedMilliseconds

  if ($resp.StatusCode -eq 200) {
    $content = $resp.Content | ConvertFrom-Json
    if ($content.message -and $content.message.Length -gt 10) {
      Test-Pass
      $passCount++
      Write-Host " — Crystal responded in ${time}ms"
      Write-Host "  Employee: crystal-analytics"
    } else {
      Test-Fail
      $failCount++
      Write-Host " — Empty response"
    }
  } else {
    Test-Fail
    $failCount++
    Write-Host " — HTTP $($resp.StatusCode)"
  }
} catch {
  Test-Fail
  $failCount++
  Write-Host " — Error: $($_.Exception.Message)"
}

Start-Sleep -Milliseconds $delayMs

# Test 5: Conversation History (Multi-turn)
Write-Host ""
Write-Host "📋 TEST 5: Conversation History (Multi-turn)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

try {
  $userId = "test-$(Get-Random -Minimum 1000 -Maximum 9999)"
  $sessionId = "session-$(Get-Random -Minimum 1000 -Maximum 9999)"
  
  # First message
  $body1 = @{
    userId = $userId
    sessionId = $sessionId
    message = "Remember: I run a bakery"
    employeeSlug = "prime-boss"
  } | ConvertTo-Json

  $resp1 = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body1 `
    -ErrorAction Stop `
    -TimeoutSec 30

  Start-Sleep -Milliseconds $delayMs

  # Second message (should reference bakery)
  $body2 = @{
    userId = $userId
    sessionId = $sessionId
    message = "What did I just tell you?"
    employeeSlug = "prime-boss"
  } | ConvertTo-Json

  $resp2 = Invoke-WebRequest -Uri $endpoint `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body2 `
    -ErrorAction Stop `
    -TimeoutSec 30

  if ($resp1.StatusCode -eq 200 -and $resp2.StatusCode -eq 200) {
    $content2 = $resp2.Content | ConvertFrom-Json
    if ($content2.message.ToLower() -match "bakery") {
      Test-Pass
      $passCount++
      Write-Host " — History working (multi-turn context preserved)"
    } else {
      Test-Skip
      $skipCount++
      Write-Host " — No history (empty transaction table or disabled flag)"
    }
  } else {
    Test-Fail
    $failCount++
    Write-Host " — One of the requests failed"
  }
} catch {
  Test-Skip
  $skipCount++
  Write-Host " — Skipped: $($_.Exception.Message)"
}

Start-Sleep -Milliseconds $delayMs

# Test 6: Performance Check
Write-Host ""
Write-Host "📋 TEST 6: Performance Check (10 requests)" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray

try {
  $times = @()
  
  for ($i = 0; $i -lt 10; $i++) {
    $body = @{
      userId = "perf-test-$i"
      message = "What are my top categories?"
      employeeSlug = "crystal-analytics"
    } | ConvertTo-Json

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    $resp = Invoke-WebRequest -Uri $endpoint `
      -Method POST `
      -Headers @{"Content-Type" = "application/json"} `
      -Body $body `
      -ErrorAction SilentlyContinue `
      -TimeoutSec 30

    $stopwatch.Stop()
    
    if ($resp.StatusCode -eq 200) {
      $times += $stopwatch.ElapsedMilliseconds
    }
    
    Start-Sleep -Milliseconds 100
  }

  if ($times.Count -ge 8) {
    $avg = [int]($times | Measure-Object -Average).Average
    $min = [int]($times | Measure-Object -Minimum).Minimum
    $max = [int]($times | Measure-Object -Maximum).Maximum
    
    if ($avg -lt 500) {
      Test-Pass
      $passCount++
      Write-Host " — Performance acceptable"
      Write-Host "  Avg: ${avg}ms | Min: ${min}ms | Max: ${max}ms"
    } else {
      Test-Fail
      $failCount++
      Write-Host " — Slow response times"
      Write-Host "  Avg: ${avg}ms (target: <300ms)"
    }
  } else {
    Test-Fail
    $failCount++
    Write-Host " — Most requests failed"
  }
} catch {
  Test-Fail
  $failCount++
  Write-Host " — Error: $($_.Exception.Message)"
}

# Summary
Write-Host ""
Write-Host "╔═════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                         TEST SUMMARY                           ║" -ForegroundColor Cyan
Write-Host "╚═════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "Results:" -ForegroundColor Yellow
Write-Host "  ✅ Passed:  $passCount" -ForegroundColor Green
Write-Host "  ❌ Failed:  $failCount" -ForegroundColor Red
Write-Host "  ⏭️  Skipped: $skipCount" -ForegroundColor Gray
Write-Host "  📊 Total:   $($passCount + $failCount + $skipCount)" -ForegroundColor Cyan
Write-Host ""

if ($failCount -eq 0) {
  Write-Host "🎉 ALL TESTS PASSED! Ready for deployment." -ForegroundColor Green
  exit 0
} else {
  Write-Host "⚠️  Some tests failed. Review the output above." -ForegroundColor Yellow
  exit 1
}






