# 🚀 Quick Start - Localhost Testing (5 Minutes)

This is the **fast track** to get Prime Chat v2 running locally. For detailed explanations, see `LOCALHOST_TEST_PLAN.md`.

---

## Step 1: Create Environment Files (2 min)

Create `.env` in project root:
```env
SUPABASE_URL=https://your-dev-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
OPENAI_API_KEY=sk-your-openai-key
CHAT_BACKEND_VERSION=v2
ENABLE_TOOL_CALLING=false
```

Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://your-dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-dev-anon-key
VITE_CHAT_BUBBLE_ENABLED=true
```

> **Where to get keys?** See `ENV_SETUP_GUIDE.md`

---

## Step 2: Install & Start (1 min)

```bash
npm install
netlify dev
```

Leave this terminal running!

---

## Step 3: Test Backend (30 sec)

Open new terminal:
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat' \
  -H 'Content-Type: application/json' \
  -d '{"userId":"00000000-0000-4000-8000-000000000001","messages":[{"role":"user","content":"Hi"}]}'
```

You should see a streamed response! ✅

---

## Step 4: Test Frontend (1 min)

1. Open browser: `http://localhost:8888`
2. Sign in or use demo mode
3. Go to Dashboard
4. Look for **purple crown button** (👑) at bottom-right
5. Click it and type: `Hello Prime`

You should see a streaming response! ✅

---

## Step 5: Test Employee Routing (30 sec)

Try these messages:
- "Categorize my expenses" → Tag responds
- "Extract data from invoice" → Byte responds
- "Show spending trends" → Crystal responds

---

## ✅ Success!

If all tests pass, you're ready! Next steps:
1. Read `LOCALHOST_TEST_PLAN.md` for detailed tests
2. Deploy to staging when ready
3. Enable tool calling later

---

## 🐛 Troubleshooting

**No crown button?**
- Check `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`
- Restart `netlify dev`
- Hard refresh browser

**503 error?**
- Add `CHAT_BACKEND_VERSION=v2` to `.env`
- Restart `netlify dev`

**500 error?**
- Check OpenAI key in `.env`
- Check Supabase keys

**Need help?** See `LOCALHOST_TEST_PLAN.md` troubleshooting section.

