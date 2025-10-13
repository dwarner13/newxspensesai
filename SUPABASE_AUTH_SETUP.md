# Supabase Authentication Setup Guide

**Last Updated**: October 13, 2025  
**Purpose**: Enable real Supabase authentication with magic link and OAuth

---

## 🎯 Overview

This guide will help you:
1. Configure Supabase Authentication URLs
2. Enable magic link authentication
3. Test real user login
4. Transition from demo user to real users

---

## ⚙️ Step 1: Configure Supabase Authentication URLs

### A. Go to Supabase Dashboard

1. Log in to https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **URL Configuration**

### B. Set Site URL

Set your **Site URL** based on environment:

**For Local Development:**
```
http://localhost:8888
```

**For Production:**
```
https://xspensesai.com
```

### C. Add Redirect URLs

Add **both** URLs to **Additional Redirect URLs**:

```
http://localhost:8888/auth/callback
https://xspensesai.com/auth/callback
```

These URLs handle the callback after successful authentication.

---

## 📧 Step 2: Configure Email Settings

### A. Email Templates (Optional - for custom branding)

Go to **Authentication** → **Email Templates**

Customize the **Magic Link** template:
- Subject: "Your sign-in link for XspensesAI"
- Body: Use Supabase's default or customize with your brand

### B. SMTP Settings (Production)

For production, configure custom SMTP:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enter your SMTP credentials (e.g., SendGrid, AWS SES, etc.)
3. Test the configuration

**For Development**: Supabase's default email works fine (may go to spam)

---

## 🔐 Step 3: Enable Authentication Methods

### A. Magic Link (Email OTP)

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Under **Email Auth**, enable "Enable Email Signup"
4. Enable "Confirm email" (optional, for production)

### B. Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
   - (Get these from Google Cloud Console)

### C. Other Providers (Optional)

You can also enable:
- Apple
- GitHub
- Microsoft
- etc.

---

## 🚀 Step 4: Update Your Environment Variables

Make sure your `.env` file has:

```bash
# Client-side (VITE_ prefix - exposed to browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001

# Server-side (NO prefix - functions only)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
DEMO_USER_ID=00000000-0000-4000-8000-000000000001
```

### Netlify Environment Variables

Also add to **Netlify Dashboard** → **Environment variables**:
- All `VITE_*` variables (for client-side builds)
- All non-`VITE_` variables (for Netlify Functions)

---

## 💻 Step 5: Add Magic Link Login to Your App

### Option A: Use the MagicLinkLogin Component (Already Created)

In your `LoginPage.tsx`, add:

```typescript
import MagicLinkLogin from '../components/MagicLinkLogin';

// Inside your LoginPage component:
<div className="space-y-6">
  {/* Existing OAuth buttons */}
  
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-gray-300"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="px-2 bg-white text-gray-500">Or sign in with email</span>
    </div>
  </div>

  <MagicLinkLogin />
</div>
```

### Option B: Inline Magic Link Form

```typescript
// Add state
const [email, setEmail] = useState('');
const [emailSent, setEmailSent] = useState(false);

// Add function
const handleMagicLink = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const { signInWithOtp } = useAuth();
    await signInWithOtp(email);
    setEmailSent(true);
    toast.success('Check your email for the magic link!');
  } catch (error) {
    toast.error('Failed to send magic link');
  }
};

// Add JSX
{!emailSent ? (
  <form onSubmit={handleMagicLink}>
    <input 
      type="email" 
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="you@example.com"
      className="w-full px-4 py-3 border rounded-lg"
    />
    <button 
      type="submit"
      className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg"
    >
      Send Magic Link
    </button>
  </form>
) : (
  <div>Check your email for the magic link!</div>
)}
```

---

## 🧪 Step 6: Test Authentication

### Test 1: Magic Link Login (Local)

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:8888/login`
3. Enter your email
4. Click "Send Magic Link"
5. Check your email (may be in spam)
6. Click the link in email
7. Should redirect to `http://localhost:8888/auth/callback`
8. Then to dashboard with real userId

**Check Console:**
```
🔍 AuthContext: Logged in as your-email@example.com
```

### Test 2: Demo User Fallback

1. Sign out or don't sign in
2. Navigate around the app
3. Check console:
```
🔍 AuthContext: No session - using demo user 00000000-0000-4000-8000-000000000001
```

### Test 3: Gmail OAuth with Real User

Once logged in:

```typescript
const { userId, isDemoUser } = useAuth();

if (isDemoUser) {
  toast.warning('Sign in to connect Gmail');
} else {
  // userId is the real user ID
  window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${userId}`;
}
```

---

## 🔄 Step 7: Update Components to Use Real userId

### Before (Using Demo User Only):
```typescript
const uid = import.meta.env.VITE_DEMO_USER_ID || "00000000-0000-4000-8000-000000000001"
```

### After (Real User with Demo Fallback):
```typescript
const { userId, isDemoUser } = useAuth()

// userId is automatically:
// - Real user ID if logged in
// - Demo user ID if not logged in
```

### Example: Gmail Connect Button
```typescript
import { useAuth } from '../contexts/AuthContext';

export function GmailConnectButton() {
  const { userId, isDemoUser } = useAuth();
  
  const handleConnect = () => {
    if (isDemoUser) {
      // Show login prompt
      if (window.confirm('Sign in to connect your Gmail account?')) {
        navigate('/login');
      }
      return;
    }
    
    // Use real userId for OAuth
    window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${userId}`;
  };
  
  return (
    <button onClick={handleConnect}>
      {isDemoUser ? 'Sign in to Connect Gmail' : 'Connect Gmail'}
    </button>
  );
}
```

---

## 📊 Step 8: Database Setup for Real Users

When a user signs up via magic link, Supabase Auth creates the user automatically in `auth.users`.

You'll want to also create a profile in your `profiles` table:

### Create a Database Trigger (Automatic Profile Creation)

Run this SQL in Supabase SQL Editor:

```sql
-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This automatically creates a profile record whenever someone signs up!

---

## 🎯 Step 9: Row Level Security (RLS) Policies

Ensure users can only access their own data:

```sql
-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Similar policies for other tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Repeat for: chat_messages, conversations, receipts, etc.
```

---

## ⚠️ Important: Keep Service Role in Functions

Even with RLS, your Netlify Functions should use the **service role key** to bypass RLS when needed:

### Why?
- Functions orchestrate complex operations across multiple tables
- Service role can read/write all data (for admin operations)
- Safer than exposing RLS complexity to client

### Usage in Functions:
```typescript
// netlify/functions/my-function.ts
import { supabaseAdmin } from './supabase' // Uses service role

export const handler = async (event) => {
  const userId = event.queryStringParameters?.userId
  
  // Service role bypasses RLS - can read any user's data
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
    
  // Function decides what to return based on logic
  return { statusCode: 200, body: JSON.stringify(data) }
}
```

---

## ✅ Verification Checklist

Before going to production:

### Supabase Dashboard:
- [ ] Site URL configured (localhost + production)
- [ ] Redirect URLs added for both environments
- [ ] Email auth enabled
- [ ] (Optional) Google OAuth configured
- [ ] Email templates customized
- [ ] (Production) Custom SMTP configured

### Environment Variables:
- [ ] `VITE_SUPABASE_URL` set (client-side)
- [ ] `VITE_SUPABASE_ANON_KEY` set (client-side)
- [ ] `VITE_DEMO_USER_ID` set (client-side)
- [ ] `SUPABASE_URL` set (server-side)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (server-side)
- [ ] `DEMO_USER_ID` set (server-side)

### Database:
- [ ] `handle_new_user()` function created
- [ ] Trigger for auto-profile creation enabled
- [ ] RLS policies configured for all tables
- [ ] Demo user exists in database

### Code:
- [ ] `AuthContext` updated with real auth logic
- [ ] `MagicLinkLogin` component created
- [ ] Login page includes magic link option
- [ ] Components use `userId` from `useAuth()`
- [ ] Functions use `userId` from query params/body

### Testing:
- [ ] Magic link works locally
- [ ] Magic link works in production
- [ ] Profile created automatically on signup
- [ ] Demo user fallback works when not logged in
- [ ] Gmail OAuth uses real userId when logged in
- [ ] Sign out switches to demo user

---

## 🔧 Troubleshooting

### Issue: "Email rate limit exceeded"

**Solution**: Supabase has rate limits. In production, use custom SMTP.

### Issue: Magic link email not received

**Solutions**:
1. Check spam folder
2. Verify email in Supabase logs (Dashboard → Auth → Logs)
3. Test with different email provider (Gmail, Outlook)

### Issue: Redirect loop after login

**Solution**: Check redirect URLs match exactly in Supabase dashboard.

### Issue: "Invalid redirect URL"

**Solution**: Add the exact callback URL to Supabase → Authentication → URL Configuration → Additional Redirect URLs

### Issue: User logged in but profile not created

**Solution**: 
1. Check if trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Verify function exists: `\df handle_new_user`
3. Re-run the trigger SQL

---

## 🚀 Next Steps

After authentication is working:

1. **Remove demo user prompts** - Only show for unauthenticated users
2. **Add user profile page** - Let users update their info
3. **Implement onboarding** - Guide new users through setup
4. **Add email verification** - Enable "Confirm email" in Supabase
5. **Set up password reset** - Use Supabase's built-in flow

---

## 📚 Related Documentation

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Magic Links Guide](https://supabase.com/docs/guides/auth/auth-magic-link)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- `DEMO_USER_SETUP.md` - Demo user configuration
- `NETLIFY_ENV_FIXES.md` - Environment variable guide

---

## ✨ Summary

**What Changed:**
- ✅ Real Supabase authentication enabled
- ✅ Magic link (OTP) login working
- ✅ Demo user as fallback when not logged in
- ✅ `userId` automatically set from session or demo
- ✅ Gmail OAuth uses real `userId`
- ✅ Functions still use service role key

**User Experience:**
1. **Not logged in**: Demo mode with `DEMO_USER_ID`
2. **Logged in**: Real user ID from Supabase session
3. **Sign out**: Returns to demo mode (no forced login)

**Your app now supports both real users AND demo mode!** 🎉



