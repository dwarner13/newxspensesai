# PowerShell script to create environment file templates
# Run this script, then fill in your actual keys

Write-Host "Creating environment file templates..." -ForegroundColor Cyan

# Create .env template
$envContent = @"
# === BACKEND (Netlify Functions) ===
# Replace these with your actual values

# Supabase (use DEV project for local testing!)
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
OPENAI_CHAT_MODEL=gpt-4o-mini

# Chat backend flags
CHAT_BACKEND_VERSION=v2
ENABLE_TOOL_CALLING=false
ENABLE_GMAIL_TOOLS=false
ENABLE_SMART_IMPORT=false
"@

# Create .env.local template
$envLocalContent = @"
# === FRONTEND (Vite / Browser) ===
# Replace these with your actual values

# Supabase (use DEV project for local testing!)
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# Chat feature flags
VITE_CHAT_BUBBLE_ENABLED=true
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
"@

# Write files if they don't exist
if (-not (Test-Path ".env")) {
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Created .env file" -ForegroundColor Green
    Write-Host "   Please edit .env and add your actual keys!" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  .env already exists, skipping..." -ForegroundColor Yellow
}

if (-not (Test-Path ".env.local")) {
    $envLocalContent | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "✅ Created .env.local file" -ForegroundColor Green
    Write-Host "   Please edit .env.local and add your actual keys!" -ForegroundColor Yellow
} else {
    Write-Host "⚠️  .env.local already exists, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env and .env.local with your actual keys" -ForegroundColor White
Write-Host "2. Get keys from:" -ForegroundColor White
Write-Host "   - Supabase: https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host "   - OpenAI: https://platform.openai.com/api-keys" -ForegroundColor Gray
Write-Host "3. Run: netlify dev" -ForegroundColor White
Write-Host "4. Open: http://localhost:8888" -ForegroundColor White
Write-Host ""

