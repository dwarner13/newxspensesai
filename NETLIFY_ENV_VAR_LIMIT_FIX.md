# Netlify Environment Variable 4KB Limit Fix

**Issue**: Netlify functions failing to deploy with error:
```
Failed to create function: invalid parameter for function creation: 
Your environment variables exceed the 4KB limit imposed by AWS Lambda.
```

## Root Cause

AWS Lambda has a 4KB limit on environment variables per function. Netlify passes ALL environment variables from the dashboard to ALL functions, so if you have many/large env vars, they exceed this limit.

## Solution

### Option 1: Remove Unnecessary Environment Variables (Recommended)

**VITE_ prefixed variables are automatically excluded from functions** - they're only used in the frontend build. However, you may have duplicate or unnecessary variables.

**Check your Netlify Dashboard → Site settings → Environment variables:**

1. **Remove duplicates:**
   - If you have both `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`, keep only `VITE_SUPABASE_ANON_KEY` for frontend
   - Functions should use `SUPABASE_SERVICE_ROLE_KEY` (not anon key)

2. **Remove VITE_ vars from build environment** (they're only needed at build time):
   - `VITE_CHAT_BUBBLE_ENABLED` - can be hardcoded or removed
   - `VITE_CHAT_ENDPOINT` - can be hardcoded
   - `VITE_DEMO_USER_ID` - only needed if using demo mode
   - `VITE_SPOTIFY_CLIENT_ID` - only needed for Spotify integration
   - `VITE_SPOTIFY_REDIRECT_URI` - only needed for Spotify integration

3. **Keep only essential vars for functions:**
   ```
   SUPABASE_URL
   SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_ANON_KEY (if needed by some functions)
   OPENAI_API_KEY
   DEMO_USER_ID (if using demo mode)
   ```

4. **Optional vars (only if needed):**
   ```
   GMAIL_CLIENT_ID
   GMAIL_CLIENT_SECRET
   GMAIL_REDIRECT_URI
   GMAIL_REDIRECT_URI_LOCAL
   GMAIL_SCOPES
   OCR_SPACE_API_KEY
   REACT_APP_GOOGLE_VISION_API_KEY
   SPOTIFY_CLIENT_SECRET
   ```

### Option 2: Move VITE_ Variables to Build-Only (REQUIRED FIX)

**This MUST be done in Netlify Dashboard - there's no code-based solution.**

**Step-by-step instructions:**

1. Go to **Netlify Dashboard** → Your Site (`xspensesai-staging`)
2. Click **Site settings** (gear icon)
3. Click **Environment variables** in the left sidebar
4. For EACH of these `VITE_` variables, click the **Edit** button (pencil icon):
   - `VITE_CHAT_BUBBLE_ENABLED`
   - `VITE_CHAT_ENDPOINT`
   - `VITE_DEMO_USER_ID`
   - `VITE_SPOTIFY_CLIENT_ID`
   - `VITE_SPOTIFY_REDIRECT_URI`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL`

5. In the edit dialog, find the **"Scopes"** section
6. **Uncheck "Functions"** (keep only "Builds" checked)
7. Click **Save**
8. Repeat for all 7 `VITE_` variables
9. **Redeploy** the site

**Visual guide:**
- When editing a variable, you should see checkboxes for:
  - ☑️ Builds
  - ☑️ Functions ← **UNCHECK THIS** for VITE_ variables
  - ☑️ Deploy previews (optional)

**Why this works:**
- Variables scoped to "Builds" only are available during `pnpm build`
- They are NOT passed to Lambda functions at runtime
- This reduces the env var payload sent to AWS Lambda

### Option 3: Use Netlify's Function-Specific Variables (Advanced)

You can set variables per-function using Netlify's API or CLI, but this is more complex and not recommended unless necessary.

## Verification

After reducing env vars:

1. Check total size: Count characters in all env var names + values
2. Should be < 4000 bytes total
3. Redeploy and verify functions deploy successfully

## Current Environment Variables (from error log)

These are being passed to functions:
- DEMO_USER_ID
- GMAIL_CLIENT_ID
- GMAIL_CLIENT_SECRET
- GMAIL_REDIRECT_URI
- GMAIL_REDIRECT_URI_LOCAL
- GMAIL_SCOPES
- OCR_SPACE_API_KEY
- OPENAI_API_KEY
- REACT_APP_GOOGLE_VISION_API_KEY
- SPOTIFY_CLIENT_SECRET
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_URL
- VITE_CHAT_BUBBLE_ENABLED (should be build-only)
- VITE_CHAT_ENDPOINT (should be build-only)
- VITE_DEMO_USER_ID (should be build-only)
- VITE_SPOTIFY_CLIENT_ID (should be build-only)
- VITE_SPOTIFY_REDIRECT_URI (should be build-only)
- VITE_SUPABASE_ANON_KEY (should be build-only)
- VITE_SUPABASE_URL (should be build-only)

**Action**: Mark all `VITE_` variables as "Build-time only" in Netlify Dashboard.

