# 🚀 START HERE - Localhost Setup

## Quick 3-Step Setup

### Step 1: Create Environment Files (2 minutes)

Run this command to create template files:
```powershell
.\setup-env-files.ps1
```

This creates two files:
- `.env` - Backend configuration
- `.env.local` - Frontend configuration

### Step 2: Add Your API Keys (2 minutes)

**Edit `.env`** and replace:
- `SUPABASE_URL` - Get from Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` - Get from Supabase (⚠️ Keep secret!)
- `OPENAI_API_KEY` - Get from https://platform.openai.com/api-keys

**Edit `.env.local`** and replace:
- `VITE_SUPABASE_URL` - Same as above
- `VITE_SUPABASE_ANON_KEY` - Get from Supabase Dashboard → Settings → API

> ⚠️ **Important:** Use your **DEV** Supabase project, NOT production!

### Step 3: Start the Server (1 minute)

```bash
netlify dev
```

Wait for:
```
◈ Server now ready on http://localhost:8888
```

Then open: **http://localhost:8888**

---

## ✅ How to Know It's Working

1. **Browser:** Look for purple crown button (👑) at bottom-right
2. **Click it:** Prime Chat panel should open
3. **Type "Hi":** You should see a streaming response

---

## 🐛 Problems?

### "Chat backend v2 is disabled"
- Make sure `.env` has `CHAT_BACKEND_VERSION=v2`
- Restart `netlify dev`

### Crown button not visible
- Make sure `.env.local` has `VITE_CHAT_BUBBLE_ENABLED=true`
- Restart `netlify dev`
- Hard refresh browser (Ctrl+Shift+R)

### Can't find API keys?
See `ENV_SETUP_GUIDE.md` for detailed screenshots and instructions

---

## 📚 What to Do Next

Once localhost is running:
1. **Quick tests:** See `QUICK_START_LOCALHOST.md`
2. **Full testing:** See `LOCALHOST_TEST_PLAN.md`
3. **Architecture:** See `CHAT_BACKEND_REBUILD_COMPLETE.md`

---

## 🎯 Test Scenarios to Try

Type these messages in chat:
- `"Hi Prime"` → Basic response
- `"Categorize my expenses"` → Routes to Tag
- `"Extract data from invoice"` → Routes to Byte
- `"Analyze my spending"` → Routes to Crystal
- `"My SSN is 123-45-6789"` → PII should be masked

---

## 📊 Success Checklist

Before deploying to staging, verify:
- [ ] Purple crown button visible
- [ ] Chat opens when clicked
- [ ] Messages stream in real-time
- [ ] Employee routing works (Tag, Byte, Crystal)
- [ ] PII is masked in responses
- [ ] No errors in browser console
- [ ] Backend curl test works (see `LOCALHOST_TEST_PLAN.md`)

---

## 🎉 Ready to Deploy?

Once all tests pass:
1. Commit and push to GitHub (already done! ✅)
2. Set environment variables in Netlify
3. Deploy to staging
4. Test on staging
5. Roll out to production gradually

See `LOCALHOST_SETUP_COMPLETE.md` for deployment guide.

