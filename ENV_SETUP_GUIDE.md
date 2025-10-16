# 🔧 Environment Setup Guide - Localhost Testing

## Step 1: Create Backend Environment File

Create `.env` in the project root with:

```env
# === BACKEND (Netlify Functions) ===
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
OPENAI_API_KEY=sk-your-openai-key
OPENAI_CHAT_MODEL=gpt-4o-mini

# Chat backend flags
CHAT_BACKEND_VERSION=v2         # route UI to the new function
ENABLE_TOOL_CALLING=false       # keep tools off while testing

# Optional OCR/Gmail flags (keep off during chat tests)
ENABLE_GMAIL_TOOLS=false
ENABLE_SMART_IMPORT=false
```

## Step 2: Create Frontend Environment File

Create `.env.local` in the project root with:

```env
# === FRONTEND (Vite / Browser) ===
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# Chat feature flags
VITE_CHAT_BUBBLE_ENABLED=true   # show the new floating chat
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

## Step 3: Add .env files to .gitignore (already done)

Make sure these lines are in `.gitignore`:
```
.env
.env.local
.env*.local
```

## Step 4: Get Your Supabase Keys

1. Go to your **dev** Supabase project (not production!)
2. Navigate to **Settings** → **API**
3. Copy:
   - Project URL → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

## Step 5: Get Your OpenAI Key

1. Go to https://platform.openai.com/api-keys
2. Create a new key if needed
3. Copy to `OPENAI_API_KEY`

## ⚠️ Important Security Notes

- **NEVER** commit `.env` or `.env.local` files
- Use **dev/staging Supabase** for local testing (not production)
- Keep `service_role` keys secret (server-side only)
- Only `VITE_*` variables are exposed to the browser

## 🧪 Testing Your Setup

After creating the env files:

```bash
# Install dependencies
npm install

# Start local dev server
netlify dev
# or
ntl dev

# In another terminal, test the backend:
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"00000000-0000-4000-8000-000000000001","messages":[{"role":"user","content":"Hello!"}]}'
```

You should see a streamed response!

## 📝 Next Steps

Once env files are created, proceed to the test plan in `LOCALHOST_TEST_PLAN.md`

