# 🚀 Starting the Dev Server

## Quick Start

Run this command in your terminal:

```bash
pnpm dev
```

Or if that doesn't work:

```bash
pnpm --package=netlify-cli dlx netlify dev --port 8888
```

## If Port 8888 is Busy

```bash
pnpm --package=netlify-cli dlx netlify dev --port 9999
```

## Troubleshooting

### 1. Missing Environment Variables

Create a `.env` file in the project root:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

### 2. Dependencies Not Installed

```bash
pnpm install
```

### 3. npm Cache Issues

```bash
npm cache clean --force
pnpm install
```

### 4. Check Server Status

Open in browser: http://localhost:8888

Or test API:
```bash
curl http://localhost:8888/.netlify/functions/chat
```

## Expected Output

When server starts successfully, you should see:
```
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
```

## Smoke Tests

Once server is running, test these endpoints:

### Chat (Prime)
```bash
curl -i http://localhost:8888/.netlify/functions/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"hello there\"}]}"
```

### Routing (Tag)
```bash
curl -i http://localhost:8888/.netlify/functions/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"categorize these receipts by vendor and tax\"}]}"
```

### Streaming (SSE)
```bash
curl -i http://localhost:8888/.netlify/functions/chat ^
  -H "Accept: text/event-stream" -H "Content-Type: application/json" ^
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"My email is test@example.com — stream slowly\"}]}"
```

### OCR
```powershell
powershell -Command "Set-Content -Path $env:TEMP\receipt.txt -Value 'Save-On-Foods`nTotal: $12.34`n07/15/2025'"
curl -i -F "file=@%TEMP%\receipt.txt;type=text/plain" http://localhost:8888/.netlify/functions/ocr
```

## Good Response Indicators

✅ **Status**: `HTTP/1.1 200 OK`

✅ **Headers** (should include):
- `X-Guardrails: active`
- `X-PII-Mask: enabled`
- `X-Memory-Hit: 0.00` (or higher)
- `X-Memory-Count: 0` (or count)
- `X-Session-Summary: absent` (or present)
- `X-Session-Summarized: no` (or yes)
- `X-Employee: prime` (or crystal/tag/byte)
- `X-Route-Confidence: 0.50-1.00`

For SSE: `X-Stream-Chunk-Count: > 0`

For OCR: `X-OCR-Provider`, `X-OCR-Parse`, `X-Transactions-Saved`



















