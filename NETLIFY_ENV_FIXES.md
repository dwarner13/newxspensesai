# Netlify Environment Variable Fixes

**Date**: October 13, 2025  
**Status**: ✅ Complete

---

## 🎯 Problem Summary

Several Netlify functions were incorrectly using `VITE_` prefixed environment variables, which are **only available in client-side Vite builds**, not in Netlify serverless functions.

### Issues Found:
1. ❌ `netlify/functions/supabase.ts` - Used `VITE_SUPABASE_URL` and `VITE_SUPABASE_SERVICE_ROLE_KEY` as fallbacks
2. ❌ `netlify/functions/weekly-sync.ts` - Created its own Supabase client with `VITE_` fallbacks
3. ❌ `netlify/functions/selftest.ts` - Checked for `VITE_` variables (misleading)
4. ❌ Non-null assertions (`!`) could crash if env vars missing

---

## ✅ Fixes Applied

### 1. `netlify/functions/supabase.ts` (Centralized Admin Client)

**Before:**
```typescript
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
```

**After:**
```typescript
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error(
    'Missing SUPABASE_URL environment variable. Please set it in your Netlify environment variables.'
  )
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Please set it in your Netlify environment variables.'
  )
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { 
    persistSession: false, 
    autoRefreshToken: false 
  },
})
```

**Benefits:**
- ✅ Clear error messages if env vars missing
- ✅ No misleading fallbacks to `VITE_` vars
- ✅ Fails fast with helpful error messages

---

### 2. `netlify/functions/weekly-sync.ts` (Use Centralized Client)

**Before:**
```typescript
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

**After:**
```typescript
import { supabaseAdmin as supabase } from "./supabase";
```

**Benefits:**
- ✅ Single source of truth for admin client
- ✅ Automatic validation from centralized module
- ✅ Easier to maintain and update

---

### 3. `netlify/functions/selftest.ts` (Accurate Environment Checks)

**Before:**
```typescript
const okSupaUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const okSupaKey = !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
const okSupaServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
```

**After:**
```typescript
// Note: VITE_ prefixed vars are NOT available in Netlify Functions
// They are only for client-side Vite builds
const okOpenAI = !!process.env.OPENAI_API_KEY;
const okSupaUrl = !!process.env.SUPABASE_URL;
const okSupaKey = !!process.env.SUPABASE_ANON_KEY;
const okSupaServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
```

**Benefits:**
- ✅ Accurate environment variable checking
- ✅ Clear documentation about VITE_ vars
- ✅ Better structured response with `checks` object

---

## 📚 Environment Variable Best Practices

### ✅ DO:
1. **Use proper validation** with helpful error messages
2. **Use centralized clients** (import from `./supabase`)
3. **Document what variables are needed** in each function
4. **Use specific variable names** for server vs client:
   - Server: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### ❌ DON'T:
1. **Don't use `VITE_` vars in Netlify Functions** - They won't exist!
2. **Don't use non-null assertions (`!`)** without validation
3. **Don't create multiple Supabase admin clients** - Use the centralized one
4. **Don't silently fail** - Throw clear errors when env vars missing

---

## 🔧 Required Environment Variables

Make sure these are set in your **Netlify Dashboard** → **Site settings** → **Environment variables**:

### Required for All Functions:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
OPENAI_API_KEY=sk-...your-openai-key

# Demo User (for testing before auth is fully set up)
DEMO_USER_ID=00000000-0000-4000-8000-000000000001
```

### Optional (for specific features):
```bash
# Gmail Integration
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GMAIL_REDIRECT_URI=https://xspensesai.com/.netlify/functions/gmail-callback
GMAIL_REDIRECT_URI_LOCAL=http://localhost:8888/.netlify/functions/gmail-callback

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Other integrations
PLAID_CLIENT_ID=...
PLAID_SECRET=...
```

---

## 🧪 Testing

### Test Locally:
```bash
# 1. Create .env file in project root
cp .env.example .env

# 2. Add your actual keys (NOT VITE_ prefixed)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...

# 3. Test the selftest endpoint
netlify dev
# Then visit: http://localhost:8888/.netlify/functions/selftest
```

### Expected Response:
```json
{
  "ok": true,
  "checks": {
    "openai": true,
    "supabaseUrl": true,
    "supabaseAnonKey": true,
    "supabaseServiceKey": true
  },
  "timestamp": "2025-10-13T..."
}
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All required env vars set in Netlify Dashboard
- [ ] `/selftest` endpoint returns `"ok": true`
- [ ] No `VITE_` variables used in any `netlify/functions/` files
- [ ] All functions import `supabaseAdmin` from `./supabase` (not creating their own)
- [ ] Error messages are clear and helpful

---

## 📝 Pattern Examples

### ✅ CORRECT - Centralized Supabase Admin:
```typescript
// netlify/functions/my-function.ts
import { supabaseAdmin } from './supabase'

export const handler = async (event) => {
  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
  // ...
}
```

### ❌ INCORRECT - Creating own client:
```typescript
// DON'T DO THIS
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.SUPABASE_URL!,  // ❌ No validation
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ❌ Could crash
)
```

### ✅ CORRECT - Gmail Redirect URI Logic:
```typescript
// Determine environment from request
const redirectUri = event.headers.host?.includes('localhost')
  ? process.env.GMAIL_REDIRECT_URI_LOCAL
  : process.env.GMAIL_REDIRECT_URI

// Or use Netlify-specific variable
const redirectUri = process.env.NETLIFY_DEV === 'true'
  ? process.env.GMAIL_REDIRECT_URI_LOCAL
  : process.env.GMAIL_REDIRECT_URI
```

### ❌ INCORRECT - Using process.env.URL:
```typescript
// DON'T DO THIS - process.env.URL doesn't exist in Netlify
const redirectUri = process.env.URL?.includes("localhost")
  ? process.env.GMAIL_REDIRECT_URI_LOCAL
  : process.env.GMAIL_REDIRECT_URI
```

---

## 🔍 Files Modified

1. ✅ `netlify/functions/supabase.ts` - Added validation, removed VITE_ fallbacks
2. ✅ `netlify/functions/weekly-sync.ts` - Now uses centralized admin client
3. ✅ `netlify/functions/selftest.ts` - Accurate env checks, better response structure

---

## 📖 Additional Resources

- [Netlify Environment Variables Documentation](https://docs.netlify.com/environment-variables/overview/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html) - Only for client-side!
- [Supabase Admin Client Best Practices](https://supabase.com/docs/guides/api#using-the-api)

---

## ✅ Summary

All Netlify functions now:
- ✅ Use proper environment variables (no `VITE_` in server code)
- ✅ Have clear error messages when env vars missing
- ✅ Use centralized Supabase admin client
- ✅ Are production-ready and maintainable

**No more silent failures or misleading fallbacks!** 🎉

