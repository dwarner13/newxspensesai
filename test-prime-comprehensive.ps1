# Comprehensive Prime Persona Test Suite

$userId = "00000000-0000-4000-8000-000000000001"
$endpoint = "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1"
$headers = @{"Content-Type" = "application/json"}

function Test-Prime {
    param(
        [string]$Message,
        [string]$SessionId = "",
        [string]$TestName
    )
    
    Write-Host ""
    Write-Host "=== TEST: $TestName ===" -ForegroundColor Cyan
    Write-Host ""
    
    $body = @{
        userId = $userId
        message = $Message
    }
    if ($SessionId) { $body.sessionId = $SessionId }
    
    $bodyJson = $body | ConvertTo-Json
    Write-Host "Message: $Message" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        $response = Invoke-WebRequest -Uri $endpoint `
            -Method POST `
            -Headers $headers `
            -Body $bodyJson `
            -ErrorAction Stop
        
        $responseBody = $response.Content | ConvertFrom-Json
        
        Write-Host "[OK] Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "[OK] Employee: $($responseBody.employee)" -ForegroundColor Green
        
        if ($responseBody.hadToolCalls) {
            Write-Host "[OK] Tool Calls: YES (delegation occurred)" -ForegroundColor Green
        } else {
            Write-Host "[--] Tool Calls: NO (direct response)" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $preview = $responseBody.reply
        if ($preview.Length -gt 300) {
            Write-Host $preview.Substring(0, 300) + "..." -ForegroundColor White
        } else {
            Write-Host $preview -ForegroundColor White
        }
        
        return $responseBody
    }
    catch {
        Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host ""
Write-Host "========== PRIME PERSONA COMPREHENSIVE TEST SUITE ==========" -ForegroundColor Magenta
Write-Host ""

# Test 1: Basic Greeting
$test1 = Test-Prime -Message "Hi Prime, quick hello" -TestName "Basic Greeting"

# Test 2: Memory - Store preference
$test2 = Test-Prime -Message "I prefer CSV exports for all reports and weekly summaries" -SessionId "test-session-1" -TestName "Memory: Store Preference"

# Test 2b: Memory - Recall
$test2b = Test-Prime -Message "What export format do I prefer?" -SessionId "test-session-1" -TestName "Memory: Recall Preference"

# Test 3: Analytics
$test3 = Test-Prime -Message "Show my spending trends for the last 3 months" -TestName "Analytics: Spending Trends"

# Test 4: Delegation
$test4 = Test-Prime -Message "Pull invoices from my email and process them" -TestName "Delegation: Email Invoices"

# Test 5: PII Protection
$test5 = Test-Prime -Message "My credit card is 4111-1111-1111-1111" -TestName "Security: PII Protection"

# Summary
Write-Host ""
Write-Host "========== TEST SUMMARY ==========" -ForegroundColor Green
Write-Host ""

$tests = @($test1, $test2, $test2b, $test3, $test4, $test5)
$passed = 0
$failed = 0

foreach ($test in $tests) {
    if ($test -and $test.ok -eq $true) {
        $passed++
        Write-Host "[PASS]" -ForegroundColor Green
    } else {
        $failed++
        Write-Host "[FAIL]" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor Cyan
Write-Host ""

if ($failed -eq 0) {
    Write-Host "SUCCESS! All tests passed - Prime is working perfectly!" -ForegroundColor Green
} else {
    Write-Host "WARNING: Some tests failed. Review output above." -ForegroundColor Yellow
}
