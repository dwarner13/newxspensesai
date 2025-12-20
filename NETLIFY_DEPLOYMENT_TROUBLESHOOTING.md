# Netlify Deployment Troubleshooting Guide

## Issue: Cannot View Site

If you're seeing logs like:
```
🔗 Chat Endpoint: /.netlify/functions/chat
AuthProvider render: Object
🔍 AuthContext: Checking Supabase session...
```

But the page isn't loading, here's how to fix it:

---

## Step 1: Verify Site is Deployed

### Check Netlify Dashboard
1. Go to https://app.netlify.com
2. Find your site
3. Check the "Deploys" tab
4. Look for the latest deployment status:
   - ✅ **Published** = Site is live
   - ⏳ **Building** = Still deploying
   - ❌ **Failed** = Build error (check logs)

### Check Site URL
- Your site should be at: `https://your-site-name.netlify.app`
- Or custom domain if configured

---

## Step 2: Check Environment Variables

The app requires these environment variables in Netlify:

### Required for Frontend (VITE_ prefix):
1. Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
2. Add these variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
```

### Required for Backend Functions (NO VITE_ prefix):
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
OPENAI_API_KEY=sk-...your-openai-key
```

### Optional (for demo mode):
```bash
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001
VITE_FORCE_DEMO=true  # Only if you want demo mode in production
```

---

## Step 3: Redeploy After Setting Variables

After adding environment variables:

1. **Trigger a new deployment:**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Deploy site"
   - OR push a new commit to trigger auto-deploy

2. **Wait for build to complete** (usually 2-5 minutes)

---

## Step 4: Check Browser Console

Open browser DevTools (F12) and check:

### Console Tab
Look for errors like:
- `Failed to fetch`
- `Supabase environment variables not configured`
- `Cannot read property of undefined`
- Any red error messages

### Network Tab
Check if requests are failing:
- `/.netlify/functions/chat` - Should return 200 OK
- `/index.html` - Should return 200 OK
- Any 404 or 500 errors?

---

## Step 5: Common Issues & Fixes

### Issue: "Supabase environment variables not configured"
**Fix:** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify environment variables

### Issue: Page loads but shows blank/white screen
**Possible causes:**
1. Missing environment variables → Add them and redeploy
2. JavaScript error → Check browser console
3. Build failed → Check Netlify build logs

### Issue: "Checking Supabase session..." forever
**Fix:** 
- Add Supabase env vars OR
- Enable demo mode: `VITE_FORCE_DEMO=true`

### Issue: Functions return 500 errors
**Fix:** Add backend env vars (without VITE_ prefix):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

---

## Step 6: Quick Test Commands

### Test if site is accessible:
```bash
curl https://your-site-name.netlify.app
```

### Test if functions work:
```bash
curl https://your-site-name.netlify.app/.netlify/functions/selftest
```

Expected response:
```json
{
  "ok": true,
  "checks": {
    "openai": true,
    "supabaseUrl": true,
    ...
  }
}
```

---

## Step 7: Deploy via CLI (Alternative)

If GitHub auto-deploy isn't working:

```bash
# 1. Login to Netlify
netlify login

# 2. Link your site (if not already linked)
netlify link

# 3. Deploy
netlify deploy --prod
```

---

## Step 8: Check Build Logs

In Netlify Dashboard → Deploys → Click on latest deploy → View build logs

Look for:
- ✅ Build successful
- ❌ Build failed (check error messages)
- ⚠️ Warnings (usually OK)

Common build errors:
- Missing dependencies → Check `package.json`
- TypeScript errors → Fix before deploying
- Environment variable errors → Add missing vars

---

## Quick Checklist

- [ ] Site is deployed (check Netlify dashboard)
- [ ] Environment variables are set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- [ ] Latest deployment succeeded
- [ ] Browser console shows no errors
- [ ] Network requests are successful
- [ ] Site URL is correct

---

## Still Not Working?

1. **Check Netlify build logs** for specific errors
2. **Check browser console** for runtime errors
3. **Verify environment variables** are set correctly (no typos)
4. **Try redeploying** after fixing issues
5. **Check if demo mode works**: Add `VITE_FORCE_DEMO=true` temporarily

---

## Need Help?

Share:
1. Your Netlify site URL
2. Browser console errors (screenshot)
3. Netlify build log errors
4. Which step you're stuck on



