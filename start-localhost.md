# 🚀 Start Localhost - Step by Step

## ⚠️ BEFORE YOU START

You need to create two environment files with your API keys:

### 1. Create `.env` file in project root:

```env
# === BACKEND (Netlify Functions) ===
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
OPENAI_API_KEY=sk-your-openai-key
OPENAI_CHAT_MODEL=gpt-4o-mini

# Chat backend flags
CHAT_BACKEND_VERSION=v2
ENABLE_TOOL_CALLING=false
ENABLE_GMAIL_TOOLS=false
ENABLE_SMART_IMPORT=false
```

### 2. Create `.env.local` file in project root:

```env
# === FRONTEND (Vite / Browser) ===
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key

# Chat feature flags
VITE_CHAT_BUBBLE_ENABLED=true
VITE_CHAT_ENDPOINT=/.netlify/functions/chat
```

---

## 🔑 Where to Get Your Keys

### Supabase Keys (Use DEV project, not production!):
1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your **development** project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for both `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### OpenAI Key:
1. Go to: https://platform.openai.com/api-keys
2. Create a new key if needed
3. Copy to `OPENAI_API_KEY`

---

## ▶️ Start the Server

Once you've created both `.env` files, run:

```bash
netlify dev
```

This will:
- Install dependencies if needed
- Start the Netlify dev server
- Start the Vite frontend
- Proxy all functions through localhost

---

## ✅ Verify It's Working

### 1. Check the terminal output:
You should see:
```
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
```

### 2. Open browser:
Go to: http://localhost:8888

### 3. Look for the purple crown button (👑):
- Should appear at bottom-right corner
- Click it to open Prime Chat

### 4. Test in another terminal:
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"00000000-0000-4000-8000-000000000001","messages":[{"role":"user","content":"Hi"}]}'
```

You should see a streaming response!

---

## 🐛 Troubleshooting

### "Chat backend v2 is disabled"
- Make sure `.env` has `CHAT_BACKEND_VERSION=v2`
- Restart `netlify dev`

### Crown button not showing
- Make sure `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`
- Restart `netlify dev`
- Hard refresh browser (Ctrl+Shift+R)

### 500 errors
- Check your OpenAI key is valid
- Check your Supabase keys are correct
- Look at the `netlify dev` terminal for error messages

---

## 📚 Next Steps

Once localhost is running:
1. Read `QUICK_START_LOCALHOST.md` for quick tests
2. Read `LOCALHOST_TEST_PLAN.md` for comprehensive testing
3. Test all the employee routing scenarios

---

## 🛑 To Stop

Press `Ctrl+C` in the terminal running `netlify dev`

