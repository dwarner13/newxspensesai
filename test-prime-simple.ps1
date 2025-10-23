# Simple Prime Test - Testing Key Scenarios

$userId = "00000000-0000-4000-8000-000000000001"
$endpoint = "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1"
$headers = @{"Content-Type" = "application/json"}

function Test-Prime {
    param(
        [string]$Message,
        [string]$TestName,
        [string]$SessionId = $null
    )
    
    Write-Host ""
    Write-Host "--- TEST: $TestName ---" -ForegroundColor Cyan
    
    $body = @{userId = $userId; message = $Message}
    if ($SessionId) { $body.sessionId = $SessionId }
    
    try {
        $response = Invoke-WebRequest -Uri $endpoint -Method POST -Headers $headers -Body ($body | ConvertTo-Json) -ErrorAction Stop
        $data = $response.Content | ConvertFrom-Json
        
        Write-Host "Status: $($response.StatusCode) | Employee: $($data.employee) | Tool Calls: $($data.hadToolCalls)" -ForegroundColor Green
        Write-Host "Reply: $($data.reply.Substring(0, [Math]::Min(150, $data.reply.Length)))" -ForegroundColor White
        return $data.ok
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host ""
Write-Host "========== PRIME PERSONA - SIMPLE TESTS ==========" -ForegroundColor Magenta

# Test 1: Hello
$t1 = Test-Prime "Hi Prime" "Hello"

# Test 2: Analytics
$t2 = Test-Prime "Show spending trends" "Analytics"

# Test 3: Email/Delegation
$t3 = Test-Prime "Process my email invoices" "Email Processing"

# Test 4: PII
$t4 = Test-Prime "My card is 4111-1111-1111-1111" "PII Protection"

Write-Host ""
Write-Host "Results: " -NoNewline -ForegroundColor Green
$results = @($t1, $t2, $t3, $t4) | Where-Object {$_}
Write-Host "$($results.Count)/4 tests successful" -ForegroundColor Green





