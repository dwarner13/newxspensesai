# Test Prime Tool Calling - Email Invoice Processing

$userId = "00000000-0000-4000-8000-000000000001"
$endpoint = "http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1"
$headers = @{"Content-Type" = "application/json"}

# Test: Tool Calling Delegation
Write-Host "=== Testing Prime Tool Calling: Email Invoice Processing ===" -ForegroundColor Cyan
Write-Host ""

$body = @{
    userId = $userId
    message = "Pull invoices from my email and process them."
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Yellow
Write-Host $body
Write-Host ""

Write-Host "Sending request to: $endpoint" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $endpoint `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop

    Write-Host "--- Response Status ---" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host ""

    Write-Host "--- Response Body ---" -ForegroundColor Green
    $responseBody = $response.Content | ConvertFrom-Json
    $responseBody | ConvertTo-Json -Depth 10 | Write-Host

    Write-Host ""
    Write-Host "=== Analysis ===" -ForegroundColor Cyan
    
    if ($responseBody.ok) {
        Write-Host "✅ Response is OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Response not OK" -ForegroundColor Red
    }

    if ($responseBody.employee -eq "prime-boss") {
        Write-Host "✅ Employee is Prime" -ForegroundColor Green
    } else {
        Write-Host "❌ Employee is not Prime: $($responseBody.employee)" -ForegroundColor Red
    }

    if ($responseBody.hadToolCalls -eq $true) {
        Write-Host "✅ Tool calls were executed (delegation happened)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No tool calls (Prime responded directly)" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Reply length: $($responseBody.reply.Length) characters" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Reply preview:" -ForegroundColor Yellow
    Write-Host $responseBody.reply.Substring(0, [Math]::Min(200, $responseBody.reply.Length)) -ForegroundColor White

}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception
}





