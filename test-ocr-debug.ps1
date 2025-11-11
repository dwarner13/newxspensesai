# Better OCR Test Script with Error Handling
$documentId = "22b63fe2-f675-45c9-a1ea-76a4fdf6d008"

Write-Host "Testing OCR function with document ID: $documentId" -ForegroundColor Cyan
Write-Host ""

$body = @{
    documentId = $documentId
    mode = "bank_statement"
    providerOverride = "ocr_space"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:8888/.netlify/functions/ocr" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "❌ Error occurred!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host ""
    
    # Get error response body
    $errorStream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errorStream)
    $errorBody = $reader.ReadToEnd()
    
    Write-Host "Error Response:" -ForegroundColor Yellow
    Write-Host $errorBody
    
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Cyan
    Write-Host "1. Document not found in user_documents table" -ForegroundColor Gray
    Write-Host "2. source_url is invalid or file can't be downloaded" -ForegroundColor Gray
    Write-Host "3. OCR provider API key missing (OCRSPACE_API_KEY)" -ForegroundColor Gray
    Write-Host "4. Check the Admin PowerShell window for detailed error logs" -ForegroundColor Gray
}


