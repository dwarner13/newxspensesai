# Staging Auth Testing Checklist

## Part E: Testing Steps

### Prerequisites
- Staging URL: https://xspensesai-staging.netlify.app
- Local URL: http://localhost:8888 (or your dev port)
- Test email account (for sign up/reset)

---

## Test 1: Localhost - Demo Mode Enabled

### Steps:
1. **Start local dev server**: `pnpm dev`
2. **Open browser console** (F12)
3. **Navigate to**: `http://localhost:8888`
4. **Verify console logs show**:
   ```
   [AuthContext] Environment: { mode: 'dev', demoEnabled: true, forceDemo: false }
   [AuthContext] User ID source: demo user (dev mode) { userId: '00000000-0000-4000-8000-000000000001', mode: 'dev', demoEnabled: true }
   ```
5. **Verify**: User can access dashboard without logging in (demo mode)
6. **Verify**: "Continue as Guest" button appears on login page

### Expected Results:
- ✅ Demo mode enabled in dev
- ✅ Console shows demo user ID
- ✅ No login required
- ✅ Dashboard accessible

---

## Test 2: Staging - Real Auth Required (No Demo)

### Steps:
1. **Navigate to**: https://xspensesai-staging.netlify.app
2. **Open browser console** (F12)
3. **Clear cookies/localStorage** (to ensure no session)
4. **Verify console logs show**:
   ```
   [AuthContext] Environment: { mode: 'production', demoEnabled: false, forceDemo: false }
   [AuthContext] User ID source: null (staging/prod, no demo) { userId: null, mode: 'production', demoEnabled: false }
   ```
5. **Verify**: User is redirected to `/login` or sees login UI
6. **Verify**: "Continue as Guest" button does NOT appear
7. **Verify**: Dashboard requires login

### Expected Results:
- ✅ Demo mode disabled in staging
- ✅ Console shows null userId
- ✅ Login required
- ✅ No demo fallback

---

## Test 3: Sign Up Flow

### Steps:
1. **Navigate to**: `/login` (staging or localhost)
2. **Click**: "Create an account" button
3. **Enter**: Valid email address
4. **Enter**: Password (min 8 characters)
5. **Enter**: Confirm password (must match)
6. **Click**: "Create an account"
7. **Verify**: Success toast: "Account created! Please check your email to confirm your account."
8. **Check email** for confirmation link
9. **Click confirmation link**
10. **Verify**: Redirected to dashboard
11. **Verify**: User is logged in (not demo user)

### Expected Results:
- ✅ Account created successfully
- ✅ Email confirmation sent
- ✅ Confirmation link works
- ✅ User logged in after confirmation
- ✅ `isDemoUser` is `false`

---

## Test 4: Sign In Flow

### Steps:
1. **Navigate to**: `/login` (staging)
2. **Enter**: Registered email
3. **Enter**: Password
4. **Click**: "Log in"
5. **Verify**: Success toast: "Signed in successfully!"
6. **Verify**: Redirected to dashboard
7. **Open console** and verify:
   ```
   [AuthContext] User ID source: real auth { userId: '<uuid>', email: '<email>', mode: 'production' }
   ```
8. **Verify**: `isDemoUser` is `false`

### Expected Results:
- ✅ Login successful
- ✅ Real user ID (UUID format)
- ✅ Not demo user
- ✅ Dashboard accessible

---

## Test 5: Forgot Password Request

### Steps:
1. **Navigate to**: `/login` (staging)
2. **Click**: "Forgot password?" link (under password field)
3. **Verify**: Redirected to `/reset-password`
4. **Enter**: Registered email address
5. **Click**: "Send Reset Link"
6. **Verify**: Success toast: "Check your email for a password reset link."
7. **Verify**: Success message shown: "We've sent a password reset link to <email>"
8. **Check email** for reset link

### Expected Results:
- ✅ "Forgot password?" link visible
- ✅ Reset request sent
- ✅ Success message displayed
- ✅ Email received

---

## Test 6: Password Reset Flow

### Steps:
1. **Open reset email** from Test 5
2. **Click reset link** in email
3. **Verify**: Redirected to `/reset-password?token=<token>` (or similar)
4. **Verify**: Form shows "Reset Your Password" (not email request form)
5. **Enter**: New password (min 8 characters)
6. **Enter**: Confirm password (must match)
7. **Click**: "Reset Password"
8. **Verify**: Success toast: "Password reset successfully!"
9. **Verify**: Redirected to `/dashboard` after 2 seconds
10. **Try logging in** with new password
11. **Verify**: Login successful

### Expected Results:
- ✅ Reset form appears when token present
- ✅ Password validation works
- ✅ Password mismatch error shown if passwords don't match
- ✅ Reset successful
- ✅ Can login with new password

---

## Test 7: UUID Validation - Jobs/Notifications Queries

### Steps:
1. **Open browser console** (F12)
2. **Navigate to**: Dashboard (while logged in)
3. **Check console** for warnings:
   - Should NOT see: `[useJobsRealtime] Skipping - invalid userId format`
   - Should see: User ID is valid UUID format
4. **Verify**: No database errors related to invalid UUID
5. **Test with invalid userId** (if possible in dev):
   - Set invalid userId in console
   - Verify queries skip gracefully
   - Verify warning logged: `[useJobsRealtime] Skipping - invalid userId format`

### Expected Results:
- ✅ No invalid UUID errors
- ✅ Queries only run with valid UUID
- ✅ Warnings logged for invalid UUIDs
- ✅ No crashes from invalid user IDs

---

## Test 8: Sign Out Flow

### Steps:
1. **Sign in** to staging
2. **Sign out** (via UI or API)
3. **Verify**: Redirected to login page (or stays on current page)
4. **Verify**: User ID is `null` (not demo user)
5. **Verify**: `isDemoUser` is `false`
6. **Verify**: Cannot access protected routes
7. **Open console** and verify:
   ```
   ✅ Signed out successfully - login required
   [AuthContext] User ID source: null (staging/prod, no demo)
   ```

### Expected Results:
- ✅ Sign out successful
- ✅ No demo fallback in staging
- ✅ Login required after sign out
- ✅ User ID is null (not demo UUID)

---

## Test 9: Session Expiry

### Steps:
1. **Sign in** to staging
2. **Wait for session to expire** (or manually expire in Supabase dashboard)
3. **Try to access** protected route
4. **Verify**: Redirected to login
5. **Verify**: No demo fallback
6. **Verify**: User must log in again

### Expected Results:
- ✅ Session expiry handled
- ✅ No demo fallback
- ✅ Login required

---

## Test 10: Force Demo Mode (Optional)

### Steps:
1. **Set environment variable**: `VITE_FORCE_DEMO=true` in Netlify Dashboard
2. **Redeploy** staging
3. **Navigate to**: Staging URL
4. **Verify**: Demo mode enabled even in production
5. **Verify console** shows:
   ```
   [AuthContext] Environment: { mode: 'production', demoEnabled: true, forceDemo: true }
   ```
6. **Remove** `VITE_FORCE_DEMO` variable
7. **Redeploy**
8. **Verify**: Demo mode disabled again

### Expected Results:
- ✅ `VITE_FORCE_DEMO=true` enables demo in production
- ✅ Can be used for testing
- ✅ Should be removed after testing

---

## Verification Checklist

After all tests:

- [ ] Demo mode only works in dev or when `VITE_FORCE_DEMO=true`
- [ ] Staging requires real Supabase auth
- [ ] Sign up flow works end-to-end
- [ ] Sign in flow works
- [ ] Forgot password link visible on login page
- [ ] Password reset request sends email
- [ ] Password reset form appears when token present
- [ ] Password reset updates password successfully
- [ ] UUID validation prevents invalid user IDs
- [ ] Jobs/notifications queries skip invalid UUIDs
- [ ] Sign out clears user (no demo fallback in staging)
- [ ] Console logs show correct env mode and demo status
- [ ] No 502 errors from invalid UUIDs
- [ ] No crashes from missing env vars

---

## Common Issues & Solutions

### Issue: Demo mode still enabled in staging
**Solution**: Check `VITE_FORCE_DEMO` is not set to `'true'` in Netlify Dashboard

### Issue: Invalid UUID errors
**Solution**: Verify `useJobsRealtime` validates UUID before queries

### Issue: Password reset link doesn't work
**Solution**: Check `redirectTo` URL matches your domain exactly

### Issue: Console logs not showing
**Solution**: Ensure `import.meta.env.DEV` is true (only shows in dev mode)
















