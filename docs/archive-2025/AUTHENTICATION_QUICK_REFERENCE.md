# Authentication Quick Reference

## 🎯 Quick Setup Checklist

### 1. Supabase Dashboard Configuration
```
✅ Authentication → URL Configuration
   Site URL: http://localhost:8888 (dev) or https://xspensesai.com (prod)
   Additional URLs:
   - http://localhost:8888/auth/callback
   - https://xspensesai.com/auth/callback

✅ Authentication → Providers
   - Enable "Email" (magic link)
   - (Optional) Enable "Google OAuth"
```

### 2. Environment Variables
```bash
# Both Netlify AND local .env
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001
DEMO_USER_ID=00000000-0000-4000-8000-000000000001
```

### 3. Database
```sql
-- Run in Supabase SQL Editor (already in database-setup-demo-user.sql)
-- Creates profile automatically when user signs up
```

---

## 💻 Code Usage

### Get User ID (Works for Real Users AND Demo)
```typescript
const { userId, isDemoUser } = useAuth()

// userId is ALWAYS set:
// - Real user ID if logged in
// - Demo user ID (00000000-...) if not logged in
```

### Check if Using Demo
```typescript
const { isDemoUser } = useAuth()

if (isDemoUser) {
  toast.warning('Sign in to save your data');
}
```

### Gmail OAuth Example
```typescript
// Your code - Perfect! ✅
const { session, userId } = useAuth()

window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${userId}`

// userId is automatically:
// - session.user.id if logged in
// - DEMO_USER_ID if not logged in
```

### Add Magic Link to Login Page
```typescript
import MagicLinkLogin from '../components/MagicLinkLogin'

// In your LoginPage.tsx:
<MagicLinkLogin />
```

---

## 🔄 Authentication Flow

### Magic Link Flow:
1. User enters email → `signInWithOtp(email)`
2. Supabase sends email with magic link
3. User clicks link → redirects to `/auth/callback`
4. `AuthContext` detects session → sets `userId` to real user ID
5. Components automatically use real user ID

### Demo User Flow:
1. No login → `AuthContext` sets `userId` to `DEMO_USER_ID`
2. User can browse app with demo data
3. When user signs in → switches to real user ID
4. When user signs out → switches back to demo user ID

---

## 🧪 Testing

### Test Magic Link (Local):
```bash
1. npm run dev
2. Go to http://localhost:8888/login
3. Enter your email
4. Click "Send Magic Link"
5. Check email (may be in spam)
6. Click link → should log you in
7. Check console: "Logged in as your-email@example.com"
```

### Test Demo Fallback:
```bash
1. Don't sign in (or sign out)
2. Navigate to dashboard
3. Check console: "No session - using demo user 00000000-..."
4. Features should work with demo data
```

---

## 📝 Key Functions

### AuthContext Hook:
```typescript
const {
  user,           // Real user object (or null for demo)
  userId,         // ALWAYS set (real or demo)
  session,        // Supabase session (or null for demo)
  isDemoUser,     // true if using demo user
  signInWithOtp,  // Send magic link
  signInWithGoogle, // Google OAuth
  signOut,        // Sign out (switches to demo)
  loading,        // Initial auth check
  ready           // Auth system ready
} = useAuth()
```

---

## ⚠️ Important Notes

### 1. Functions Use Service Role
```typescript
// netlify/functions/*.ts
import { supabaseAdmin } from './supabase'

// Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS)
// This is correct and secure for server-side operations
```

### 2. Client Uses Anon Key
```typescript
// src/lib/supabase.ts
// Uses VITE_SUPABASE_ANON_KEY
// RLS policies protect data
```

### 3. Sign Out Behavior
```typescript
// Sign out switches to demo user instead of forcing login
// User can still use app in demo mode
// To force login: navigate('/login') in signOut function
```

---

## 🔍 Debugging

### Check Current Auth State:
```typescript
console.log('Auth State:', {
  userId: useAuth().userId,
  isDemoUser: useAuth().isDemoUser,
  hasSession: !!useAuth().session
})
```

### Console Messages:
- `"Logged in as email@example.com"` → Real user
- `"No session - using demo user 00000..."` → Demo mode
- `"User signed out - switching to demo user"` → Signed out

---

## 📚 Files Modified

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Added `userId`, `isDemoUser`, `signInWithOtp` |
| `src/components/MagicLinkLogin.tsx` | NEW - Magic link login form |
| `SUPABASE_AUTH_SETUP.md` | Complete setup guide |
| `database-setup-demo-user.sql` | Creates demo user + trigger for new users |

---

## ✅ Success Criteria

- [ ] Magic link email received and works
- [ ] User profile created automatically on signup
- [ ] `userId` is real user ID when logged in
- [ ] `userId` is demo user ID when not logged in
- [ ] Gmail OAuth uses correct `userId`
- [ ] Sign out switches to demo user (no login required)
- [ ] App works in both modes (real user + demo)

---

## 🚀 Next Steps

1. Add `<MagicLinkLogin />` to your login page
2. Test magic link login locally
3. Deploy to Netlify
4. Configure Supabase URLs for production
5. Test in production
6. Remove demo user data before public launch

---

**Need help? Check `SUPABASE_AUTH_SETUP.md` for detailed guide!**



