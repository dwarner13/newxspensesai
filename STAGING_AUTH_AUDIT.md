# Staging Auth Audit - Demo Mode Usage

## Part A: Audit Summary

### Files That Control Demo Mode:

1. **`src/contexts/AuthContext.tsx`** (Primary)
   - **Line 24**: `DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-4000-8000-000000000001"`
   - **Line 58-69**: Falls back to demo if `!supabase` (no Supabase configured)
   - **Line 131-137**: Falls back to demo if `!currentSession?.user?.id` (no session)
   - **Line 141-145**: Falls back to demo on error
   - **Line 240-244**: Switches to demo on `SIGNED_OUT` event
   - **Line 392-396**: Switches to demo after `signOut()`
   - **Issue**: No environment check - demo fallback happens in ALL environments including staging/production

2. **`src/pages/LoginPage.tsx`**
   - **Line 215-221**: "Continue as Guest" button only shows when `import.meta.env.DEV === true`
   - **Status**: ✅ Already gated correctly

3. **`src/lib/realtime/useJobsRealtime.ts`**
   - **Line 20**: Uses `effectiveUserId = userId || (isDemoUser ? '00000000-0000-4000-8000-000000000001' : null)`
   - **Issue**: No UUID validation before using userId in queries

4. **`src/utils/getDemoUserId.ts`**
   - **Line 5-19**: `getDemoUserId()` function with fallback
   - **Status**: Used by some components but not the main auth flow

5. **`netlify/functions/_shared/demo-user.ts`**
   - **Line 8**: `DEMO_USER_ID = process.env.DEMO_USER_ID || '00000000-0000-4000-8000-000000000001'`
   - **Line 20-48**: `getUserIdOrDemo()` function for backend functions
   - **Status**: Backend functions - separate concern

### Environment Variables Referenced:

- `VITE_DEMO_USER_ID` - Frontend demo user ID (optional)
- `DEMO_USER_ID` - Backend demo user ID (optional)
- `import.meta.env.DEV` - Vite dev mode flag (used in LoginPage only)

### Logic Conditions:

**Current Demo Fallback Triggers:**
1. No Supabase client available (`!supabase`)
2. No active session (`!currentSession?.user?.id`)
3. Error during session check
4. User signs out (`SIGNED_OUT` event)
5. After `signOut()` call

**Problem**: All triggers apply in ALL environments (dev, staging, production)

### Staging Impact:

**Current Behavior**: Staging falls back to demo user when:
- User visits site without being logged in
- Session expires
- User signs out
- Any auth error occurs

**Expected Behavior**: Staging should:
- Show login UI when no session
- Require real Supabase auth
- Only allow demo mode in local/dev or when `VITE_FORCE_DEMO=true`

---

## Part B: Fix Plan

1. Add demo gate function: `isDemoAllowed()`
2. Update AuthContext to check demo gate before falling back
3. Add UUID validation helper
4. Update useJobsRealtime to validate UUID before queries
5. Ensure userId is always valid UUID or null (never invalid string)

---

## Part C: Forgot Password Status

**Existing Files:**
- `src/pages/ResetPasswordPage.tsx` - Exists but only handles request, not actual reset
- `src/pages/LoginPage.tsx` - Missing "Forgot password?" link

**Needed:**
1. Add "Forgot password?" link to LoginPage
2. Update ResetPasswordPage to handle token from URL and allow password reset
3. Ensure redirectTo URL is correct

---

## Part D: Environment Variables

**Required for Netlify:**
- `VITE_SUPABASE_URL` ✅
- `VITE_SUPABASE_ANON_KEY` ✅
- `VITE_FORCE_DEMO` (optional, default: false)

**Dev-only logging**: Add console.log showing env mode, demo enabled status, user id source





