# Test OCR Function
# This script helps you test the OCR function

Write-Host "=== OCR Function Test ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if server is running
Write-Host "1. Testing selftest endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8888/.netlify/functions/selftest" -Method GET
    Write-Host "   ✅ Server is running!" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Server is not running. Start it with: pnpm --package=netlify-cli dlx netlify dev --port 8888" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Test 2: Instructions for creating a test document
Write-Host "2. To test OCR, you need a document ID from user_documents table." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Option A: Create a test document in Supabase:" -ForegroundColor Cyan
Write-Host "   - Go to your Supabase dashboard" -ForegroundColor Gray
Write-Host "   - Open the 'user_documents' table" -ForegroundColor Gray
Write-Host "   - Insert a new row with:" -ForegroundColor Gray
Write-Host "     * user_id: 'test-user-123' (or your user ID)" -ForegroundColor Gray
Write-Host "     * source_url: 'https://example.com/test-bank-statement.pdf' (a publicly accessible PDF URL)" -ForegroundColor Gray
Write-Host "     * status: 'pending'" -ForegroundColor Gray
Write-Host "     * doc_type: 'bank_statement' (optional)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option B: Use an existing document ID:" -ForegroundColor Cyan
Write-Host "   - Query your Supabase database:" -ForegroundColor Gray
Write-Host "     SELECT id, user_id, source_url FROM user_documents LIMIT 1;" -ForegroundColor Gray
Write-Host ""

# Test 3: Prompt for document ID
Write-Host "3. Enter a document ID to test (or press Enter to skip):" -ForegroundColor Yellow
$documentId = Read-Host "   Document ID"

if ($documentId) {
    Write-Host ""
    Write-Host "4. Testing OCR function with document ID: $documentId" -ForegroundColor Yellow
    
    $body = @{
        documentId = $documentId
        # Optional: providerOverride = "ocr_space"
        # Optional: mode = "bank_statement"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest `
            -Uri "http://localhost:8888/.netlify/functions/ocr" `
            -Method POST `
            -Headers @{"Content-Type"="application/json"} `
            -Body $body
        
        Write-Host "   ✅ OCR request successful!" -ForegroundColor Green
        Write-Host "   Status Code: $($response.StatusCode)" -ForegroundColor Gray
        Write-Host "   Response Headers:" -ForegroundColor Gray
        $response.Headers | Format-Table
        Write-Host "   Response Body:" -ForegroundColor Gray
        $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    } catch {
        Write-Host "   ❌ OCR request failed!" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Response: $responseBody" -ForegroundColor Red
        }
    }
} else {
    Write-Host ""
    Write-Host "   Skipped OCR test. Run this script again when you have a document ID." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan


