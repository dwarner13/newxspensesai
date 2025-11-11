# Start Netlify Dev Server (Windows PowerShell)
# Handles port conflicts, missing CLI, and provides smoke test commands

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

Write-Info "🚀 Starting Netlify Dev Server..."

# Step 1: Ensure netlify.toml exists
Write-Info "📝 Checking netlify.toml..."
if (-not (Test-Path "netlify.toml")) {
    Write-Warning "netlify.toml not found, creating..."
    @"
[dev]
port = 8888
functions = "netlify/functions"
publish = "dist"

[functions]
node_bundler = "esbuild"
"@ | Out-File -FilePath "netlify.toml" -Encoding utf8
    Write-Success "✅ Created netlify.toml"
} else {
    Write-Success "✅ netlify.toml exists"
}

# Step 2: Check/update package.json dev script
Write-Info "📦 Checking package.json dev script..."
$packageJson = Get-Content "package.json" | ConvertFrom-Json
if ($packageJson.scripts.dev -ne "netlify dev --port 8888") {
    Write-Warning "Updating dev script in package.json..."
    $packageJson.scripts.dev = "netlify dev --port 8888"
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    Write-Success "✅ Updated dev script"
} else {
    Write-Success "✅ Dev script already configured"
}

# Step 3: Install netlify-cli if missing
Write-Info "📥 Checking netlify-cli..."
$hasNetlifyCli = Test-Path "node_modules/.bin/netlify"
if (-not $hasNetlifyCli) {
    Write-Warning "netlify-cli not found, installing..."
    pnpm add -D netlify-cli@latest
    Write-Success "✅ Installed netlify-cli"
} else {
    Write-Success "✅ netlify-cli found"
}

# Step 4: Try to start server
$port = 8888
$portBusy = $false

function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Check if port is busy
if (Test-Port -Port $port) {
    Write-Warning "Port $port is busy, trying 9999..."
    $port = 9999
    $portBusy = $true
}

Write-Info "🌐 Starting server on port $port..."

# Try pnpm dev first
try {
    Write-Info "Attempting: pnpm dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm dev" -PassThru
    Start-Sleep -Seconds 3
    Write-Success "✅ Server starting via pnpm dev"
    $startMethod = "pnpm dev"
} catch {
    Write-Warning "pnpm dev failed, trying dlx..."
    try {
        Write-Info "Attempting: pnpm dlx netlify dev"
        $process = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; pnpm --package=netlify-cli dlx netlify dev --port $port" -PassThru
        Start-Sleep -Seconds 3
        Write-Success "✅ Server starting via pnpm dlx"
        $startMethod = "pnpm dlx netlify dev"
    } catch {
        Write-Error "Failed to start server. Try manually:"
        Write-Info "  pnpm --package=netlify-cli dlx netlify dev --port $port"
        exit 1
    }
}

# Wait a bit for server to start
Start-Sleep -Seconds 5

# Print success banner
Write-Host ""
Write-Success "═══════════════════════════════════════════════════════════"
Write-Success "✅ NETLIFY DEV SERVER STARTED"
Write-Success "═══════════════════════════════════════════════════════════"
Write-Host ""
Write-Info "🌐 Server URL: http://localhost:$port"
Write-Info "📝 Started via: $startMethod"
if ($portBusy) {
    Write-Warning "⚠️  Port 8888 was busy, using port 9999"
}
Write-Host ""

# Print smoke test commands
Write-Info "📋 SMOKE TEST COMMANDS (copy & paste):"
Write-Host ""
Write-Host "# --- CHAT (Prime) ---" -ForegroundColor Yellow
Write-Host "curl -i http://localhost:$port/.netlify/functions/chat \"
Write-Host "  -H `"Content-Type: application/json`" \"
Write-Host "  -d `"{\`"messages\`":[{\`"role\`":\`"user\`",\`"content\`":\`"hello there\`"}]}`""
Write-Host ""
Write-Host "# --- ROUTING (Tag) ---" -ForegroundColor Yellow
Write-Host "curl -i http://localhost:$port/.netlify/functions/chat \"
Write-Host "  -H `"Content-Type: application/json`" \"
Write-Host "  -d `"{\`"messages\`":[{\`"role\`":\`"user\`",\`"content\`":\`"categorize these receipts by vendor and tax\`"}]}`""
Write-Host ""
Write-Host "# --- STREAMING (SSE) ---" -ForegroundColor Yellow
Write-Host "curl -i http://localhost:$port/.netlify/functions/chat \"
Write-Host "  -H `"Accept: text/event-stream`" -H `"Content-Type: application/json`" \"
Write-Host "  -d `"{\`"messages\`":[{\`"role\`":\`"user\`",\`"content\`":\`"My email is test@example.com — stream slowly\`"}]}`""
Write-Host ""
Write-Host "# --- OCR (fake receipt) ---" -ForegroundColor Yellow
Write-Host "powershell -Command `"Set-Content -Path `$env:TEMP\\receipt.txt -Value 'Save-On-Foods`nTotal: `$12.34`n07/15/2025'`""
Write-Host "curl -i -F `"file=@%TEMP%\\receipt.txt;type=text/plain`" \"
Write-Host "  http://localhost:$port/.netlify/functions/ocr"
Write-Host ""

# Print what "Good" looks like
Write-Info "✅ EXPECTED RESPONSE (Good):"
Write-Host ""
Write-Host "Status: HTTP/1.1 200 OK" -ForegroundColor Green
Write-Host ""
Write-Host "Headers (Core 8):" -ForegroundColor Cyan
Write-Host "  X-Guardrails: active"
Write-Host "  X-PII-Mask: enabled"
Write-Host "  X-Memory-Hit: 0.00 (or higher if memory recalled)"
Write-Host "  X-Memory-Count: 0 (or count if memory recalled)"
Write-Host "  X-Session-Summary: absent (or present)"
Write-Host "  X-Session-Summarized: no (or yes)"
Write-Host "  X-Employee: prime (or crystal/tag/byte)"
Write-Host "  X-Route-Confidence: 0.50-1.00"
Write-Host ""
Write-Host "For SSE:" -ForegroundColor Cyan
Write-Host "  X-Stream-Chunk-Count: > 0"
Write-Host ""
Write-Host "For OCR:" -ForegroundColor Cyan
Write-Host "  X-OCR-Provider: local|ocrspace|vision|none"
Write-Host "  X-OCR-Parse: invoice|receipt|bank|none"
Write-Host "  X-Transactions-Saved: 0 (or count if Supabase configured)"
Write-Host ""

# Print troubleshooting
Write-Info "🔧 TROUBLESHOOTING:"
Write-Host ""
Write-Host "If 'command not found':" -ForegroundColor Yellow
Write-Host "  pnpm --package=netlify-cli dlx netlify dev --port $port"
Write-Host ""
Write-Host "If ECOMPROMISED error:" -ForegroundColor Yellow
Write-Host "  npm cache clean --force"
Write-Host "  Then retry: pnpm --package=netlify-cli dlx netlify dev --port $port"
Write-Host ""
Write-Host "If port busy:" -ForegroundColor Yellow
Write-Host "  pnpm --package=netlify-cli dlx netlify dev --port 9999"
Write-Host ""

Write-Success "🎉 Ready for testing!"
Write-Host ""









