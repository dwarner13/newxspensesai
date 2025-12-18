# Localhost Auth + Profiles Test Checklist

**Date**: 2025-01-20  
**Status**: Ready for Testing

---

## Prerequisites

1. ✅ Supabase migration applied: `20250120_create_profiles_table_rls.sql`
2. ✅ Supabase local instance running (or remote dev project)
3. ✅ Frontend dev server running (`npm run dev`)
4. ✅ Netlify functions running locally (`netlify dev` or `netlify functions:serve`)

---

## Test 1: Signup Flow

### Steps:
1. Navigate to `http://localhost:3000/signup`
2. Click "Sign up with Google" or "Sign up with Apple" OR enter email/password
3. Complete OAuth flow or email verification
4. Should redirect to `/auth/callback` then to dashboard

### Expected Results:
- ✅ `/signup` route loads correctly
- ✅ Signup form displays
- ✅ OAuth buttons work (if configured)
- ✅ Email/password signup works (if using email)
- ✅ After signup, redirects to `/auth/callback`
- ✅ After callback, redirects to dashboard

### Verification:
```sql
-- Check profile was created
SELECT * FROM profiles WHERE email = '<your-test-email>';
-- Should return 1 row with:
-- - id = auth.uid()::text
-- - email = your email
-- - display_name = name from OAuth or email prefix
-- - role = 'free'
-- - plan = 'free'
```

---

## Test 2: Login Flow

### Steps:
1. Navigate to `http://localhost:3000/login`
2. Click "Sign in with Google" or enter email/password
3. Complete authentication

### Expected Results:
- ✅ `/login` route loads correctly
- ✅ Login form displays
- ✅ OAuth login works
- ✅ Email/password login works
- ✅ After login, redirects to dashboard

### Verification:
```sql
-- Check profile exists
SELECT * FROM profiles WHERE email = '<your-test-email>';
-- Should return existing profile
```

---

## Test 3: Profile Creation on First Login

### Steps:
1. Sign up with a NEW email (one that doesn't have a profile)
2. Complete authentication
3. Check browser console for logs

### Expected Results:
- ✅ Console shows: `🔍 AuthContext: Profile missing, creating new profile for user: <userId>`
- ✅ Console shows: `✅ AuthContext: Profile created successfully`
- ✅ Profile row exists in database

### Verification:
```sql
-- Check profile was auto-created
SELECT id, email, display_name, role, plan, created_at 
FROM profiles 
WHERE email = '<new-test-email>';
-- Should return 1 row with all fields populated
```

---

## Test 4: Settings Page Loads Profile

### Steps:
1. Login as authenticated user
2. Navigate to `http://localhost:3000/dashboard/settings`
3. Check that profile data displays

### Expected Results:
- ✅ Settings page loads without errors
- ✅ Profile data displays (name, email, etc.)
- ✅ No console errors about missing profile

### Verification:
- Open browser DevTools → Console
- Should see no errors about `profiles` table
- Profile data should be visible in UI

---

## Test 5: Backend JWT Verification - Valid Token

### Steps:
1. Login to get a valid session
2. Open browser DevTools → Application → Local Storage
3. Find Supabase auth token (key: `sb-<project-ref>-auth-token`)
4. Extract the `access_token` from the stored JSON
5. Make a test API call with Authorization header:

```bash
# Test chat endpoint
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{"message": "Hello"}'
```

### Expected Results:
- ✅ Request succeeds (status 200)
- ✅ Response contains chat message
- ✅ No authentication errors

### Verification:
- Check Netlify function logs for: `[verifyAuth] Token verified`
- Response should NOT contain `"error": "Authentication required"`

---

## Test 6: Backend JWT Verification - Spoofed userId Fails

### Steps:
1. Login to get a valid session
2. Extract `access_token` from localStorage
3. Make API call with valid token BUT try to spoof userId in body:

```bash
# Try to spoof userId (should fail - userId comes from JWT now)
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <valid-access-token>" \
  -d '{"userId": "00000000-0000-0000-0000-000000000000", "message": "Hello"}'
```

### Expected Results:
- ✅ Request succeeds BUT uses userId from JWT token, NOT from body
- ✅ Backend ignores `userId` in request body
- ✅ Only userId from JWT token is used

### Verification:
- Check function logs - userId should come from JWT, not body
- Response should work with YOUR userId, not the spoofed one

---

## Test 7: Backend JWT Verification - Missing Token Returns 401

### Steps:
1. Make API call WITHOUT Authorization header:

```bash
# No auth header
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### Expected Results:
- ✅ Request returns status 401
- ✅ Response contains: `{"error": "Missing Authorization header"}`

### Verification:
- Status code: 401
- Response body: `{"error": "Missing Authorization header"}`

---

## Test 8: Backend JWT Verification - Invalid Token Returns 401

### Steps:
1. Make API call with invalid/fake token:

```bash
# Invalid token
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token-here" \
  -d '{"message": "Hello"}'
```

### Expected Results:
- ✅ Request returns status 401
- ✅ Response contains: `{"error": "Invalid token: ..."}`

### Verification:
- Status code: 401
- Response body contains error about invalid token

---

## Test 9: Reset Password Page

### Steps:
1. Navigate to `http://localhost:3000/reset-password`
2. Enter your email address
3. Click "Send Reset Link"

### Expected Results:
- ✅ `/reset-password` route loads correctly
- ✅ Reset password form displays
- ✅ Email input works
- ✅ Submit button works
- ✅ Success message displays after submission
- ✅ Email sent (check Supabase logs or email inbox)

### Verification:
- Page loads without errors
- Form submission works
- Success state displays

---

## Test 10: Auth Callback Route

### Steps:
1. Complete OAuth signup/login
2. Should redirect to `/auth/callback`
3. Should then redirect to dashboard

### Expected Results:
- ✅ `/auth/callback` route loads correctly
- ✅ Handles OAuth callback properly
- ✅ Redirects to dashboard after successful auth

### Verification:
- No errors in console
- Redirect happens smoothly

---

## Test 11: All Backend Functions Use JWT

### Test Each Function:

#### A. Chat Function
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```
- ✅ Requires Authorization header
- ✅ Returns 401 without token

#### B. Smart Import Stats
```bash
curl -X POST http://localhost:8888/.netlify/functions/smart_import_stats \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```
- ✅ Requires Authorization header
- ✅ Returns 401 without token

#### C. Prime Live Stats
```bash
curl -X GET "http://localhost:8888/.netlify/functions/prime-live-stats" \
  -H "Authorization: Bearer <token>"
```
- ✅ Requires Authorization header
- ✅ Returns 401 without token

#### D. Activity Feed
```bash
curl -X GET "http://localhost:8888/.netlify/functions/activity-feed" \
  -H "Authorization: Bearer <token>"
```
- ✅ Requires Authorization header
- ✅ Returns 401 without token

---

## Test 12: RLS Policies Work

### Steps:
1. Login as User A
2. Get User A's profile ID
3. Try to query User B's profile (should fail)

### Expected Results:
- ✅ User can only SELECT their own profile
- ✅ User can only UPDATE their own profile
- ✅ User cannot access other users' profiles

### Verification:
```sql
-- As User A, try to access User B's profile (should return 0 rows)
SELECT * FROM profiles WHERE id = '<user-b-id>';
-- Should return empty (RLS blocks it)
```

---

## Common Issues & Solutions

### Issue: "relation profiles does not exist"
**Solution**: Run migration `20250120_create_profiles_table_rls.sql`

### Issue: "permission denied for table profiles"
**Solution**: Check RLS policies are created correctly

### Issue: "401 Authentication required" on valid requests
**Solution**: 
- Check Authorization header format: `Bearer <token>`
- Verify token is valid (not expired)
- Check `verifyAuth.ts` is imported correctly

### Issue: Profile not created on signup
**Solution**: 
- Check browser console for errors
- Verify `AuthContext.tsx` profile creation logic runs
- Check Supabase logs for insert errors

### Issue: Routes return 404
**Solution**: 
- Verify routes added to `App.tsx`
- Check route paths match exactly (`/login`, `/signup`, etc.)
- Restart dev server

---

## Success Criteria

✅ All routes accessible (`/login`, `/signup`, `/auth/callback`, `/reset-password`)  
✅ Profile auto-created on first login  
✅ Settings page loads profile data  
✅ All backend functions require JWT token  
✅ Spoofed userId in body is ignored  
✅ Unauthenticated requests return 401  
✅ RLS policies prevent cross-user access  

---

## Next Steps After Testing

1. ✅ Fix any issues found
2. ✅ Document any edge cases
3. ✅ Prepare for production deployment (separate task)

---

**END OF CHECKLIST**

