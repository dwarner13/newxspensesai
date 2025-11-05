# Environment Variables Guide

**Last Updated**: 2025-01-XX  
**Version**: 1.0

---

## Overview

XspensesAI uses environment variables for configuration. Some are **required** for core functionality, while others are **optional** and provide enhanced features.

---

## Required Variables

### Supabase Configuration

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Purpose**: Database persistence, memory storage, XP tracking, transaction storage

**Without These**:
- ✅ Chat endpoint works (no persistence)
- ✅ OCR endpoint works (text extraction, parsing)
- ⚠️ **Transactions won't be saved** (`X-Transactions-Saved: 0`)
- ⚠️ **Memory facts won't be stored** (RAG recall won't work)
- ⚠️ **XP won't be tracked** (`X-XP-Awarded: 0`)
- ⚠️ **Session summaries won't be stored**

**Behavior**: The application will log warnings but continue to function. OCR will parse documents and return JSON, but transaction persistence will be skipped.

---

### OpenAI Configuration

```env
OPENAI_API_KEY=sk-...
```

**Purpose**: Chat completions, embeddings, moderation, LLM-based categorization

**Without This**:
- ❌ Chat endpoint will fail (returns error)
- ❌ OCR categorization fallback won't work (Tag employee)
- ✅ OCR text extraction still works (without categorization)

---

## Optional Variables

### OCR Providers

```env
OCRSPACE_API_KEY=your-ocrspace-key
GOOGLE_APPLICATION_CREDENTIALS=path/to/google-credentials.json
```

**Purpose**: Enhanced OCR accuracy (OCR.Space API, Google Cloud Vision)

**Without These**:
- ✅ OCR still works (local stubs)
- ⚠️ Returns warnings: `X-OCR-Provider: none`
- ⚠️ Text extraction may be limited

**Behavior**: The OCR endpoint will attempt to use available providers in order (local → OCR.Space → Vision). If none are configured, it returns warnings but still processes the request.

---

### Feature Flags

```env
ENABLE_GUARDRAILS=true      # Default: true
ENABLE_PII_MASKING=true     # Default: true
ENABLE_MEMORY=true          # Default: true
ENABLE_XP=true              # Default: true
```

**Purpose**: Toggle features on/off for testing or deployment scenarios

**Behavior**: If set to `false`, the feature is disabled. Defaults to `true` if not set.

---

## Setup Instructions

### 1. Copy Sample File

```bash
cp .env.sample .env
```

### 2. Edit `.env` File

Add your actual values:

```env
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-proj-...
```

### 3. Load Environment Variables

#### For Netlify Dev

Netlify Dev automatically loads `.env` file from the project root.

```bash
netlify dev
```

**Note**: Ensure `.env` is in `.gitignore` (never commit secrets).

#### For Production (Netlify)

Set environment variables in Netlify Dashboard:
1. Go to Site Settings → Environment Variables
2. Add each variable
3. Redeploy

#### For Local Development (without Netlify Dev)

Some shells/IDEs load `.env` automatically. If not, use a package like `dotenv`:

```bash
# Install dotenv-cli
npm install -g dotenv-cli

# Run with env vars
dotenv -e .env netlify dev
```

---

## Environment Variable Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SUPABASE_URL` | ✅ Yes | - | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | - | Supabase service role key (bypasses RLS) |
| `OPENAI_API_KEY` | ✅ Yes | - | OpenAI API key for completions/embeddings |
| `OCRSPACE_API_KEY` | ❌ No | - | OCR.Space API key |
| `GOOGLE_APPLICATION_CREDENTIALS` | ❌ No | - | Path to Google Cloud credentials JSON |
| `ENABLE_GUARDRAILS` | ❌ No | `true` | Enable guardrails system |
| `ENABLE_PII_MASKING` | ❌ No | `true` | Enable PII masking |
| `ENABLE_MEMORY` | ❌ No | `true` | Enable memory/RAG system |
| `ENABLE_XP` | ❌ No | `true` | Enable XP system |

---

## Validation

### Check Environment Variables

```bash
# List all env vars (from shell)
env | grep -E "SUPABASE|OPENAI|OCR"

# Or in Node.js
node -e "console.log(process.env.SUPABASE_URL ? 'SUPABASE_URL: set' : 'SUPABASE_URL: missing')"
```

### Test OCR Without Supabase

```bash
# Upload a receipt (will parse but not save)
curl -F "file=@receipt.txt" http://localhost:8888/.netlify/functions/ocr

# Expected: X-Transactions-Saved: 0 (no Supabase)
# Expected: X-OCR-Parse: receipt (parsing still works)
```

### Test With Supabase

```bash
# After setting SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
curl -F "file=@receipt.txt" http://localhost:8888/.netlify/functions/ocr

# Expected: X-Transactions-Saved: 1+ (saved to database)
# Expected: X-XP-Awarded: 5+ (XP awarded)
```

---

## Security Best Practices

1. **Never commit `.env`**: Ensure `.env` is in `.gitignore`
2. **Use `.env.sample`**: Commit a sample file with empty values
3. **Rotate keys**: Regularly rotate API keys and service role keys
4. **Limit scope**: Use least-privilege keys (avoid service role keys in client code)
5. **Environment-specific**: Use different keys for dev/staging/production

---

## Troubleshooting

### Issue: "Transactions not saving"

**Solution**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set and valid.

**Check**:
```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Issue: "OCR returns warnings"

**Solution**: This is expected if OCR providers aren't configured. OCR still works but may have limited accuracy.

### Issue: "Chat endpoint fails"

**Solution**: Ensure `OPENAI_API_KEY` is set and valid.

**Check**:
```bash
echo $OPENAI_API_KEY
```

---

## See Also

- [`README.md`](../README.md) - Main documentation
- [`docs/DB.md`](DB.md) - Database schema
- [`docs/HEADERS.md`](HEADERS.md) - Response headers

