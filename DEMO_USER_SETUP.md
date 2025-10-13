# Demo User Setup Guide

**Last Updated**: October 13, 2025  
**Purpose**: Set up a demo user for testing features before authentication is fully implemented

---

## 🎯 Quick Setup

### Demo User UUID:
```
00000000-0000-4000-8000-000000000001
```

This is a valid UUID v4 format that's easy to recognize as a demo user.

---

## 📝 Step 1: Add to Environment Variables

### ⚠️ **Important: Client vs Server Variables**

You need **TWO** different variables:

| Variable | Used In | Prefix |
|----------|---------|--------|
| `VITE_DEMO_USER_ID` | Client-side (browser/React) | `VITE_` |
| `DEMO_USER_ID` | Server-side (Netlify Functions) | None |

### A. Netlify (Production/Deploy Previews)

1. Go to **Netlify Dashboard**
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add **BOTH** variables:
   ```
   Key:   VITE_DEMO_USER_ID
   Value: 00000000-0000-4000-8000-000000000001
   
   Key:   DEMO_USER_ID
   Value: 00000000-0000-4000-8000-000000000001
   ```

### B. Local Development

Create a `.env` file in your project root (if it doesn't exist):

```bash
# .env (for local development only - DO NOT COMMIT)

# === CLIENT-SIDE (accessible in browser via import.meta.env) ===
# Use VITE_ prefix - these are bundled into your JavaScript
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001

# === SERVER-SIDE (accessible in Netlify Functions via process.env) ===
# NO VITE_ prefix - these stay server-side only
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...
OPENAI_API_KEY=sk-...
DEMO_USER_ID=00000000-0000-4000-8000-000000000001
```

### C. Why Two Variables?

**`VITE_DEMO_USER_ID`** (Client-side):
- ✅ Used in React components, pages, hooks
- ✅ Accessed via `import.meta.env.VITE_DEMO_USER_ID`
- ✅ Bundled into JavaScript at build time
- ⚠️ **Visible in browser** - don't use for secrets!

**`DEMO_USER_ID`** (Server-side):
- ✅ Used in Netlify Functions
- ✅ Accessed via `process.env.DEMO_USER_ID`
- ✅ Never exposed to browser
- ✅ Safe for server-only operations

---

## 📊 Step 2: Create Demo User in Database

Run the SQL script to create the demo user in your Supabase database:

```bash
# Option 1: Via Supabase Dashboard
# 1. Go to Supabase Dashboard
# 2. Select your project
# 3. Go to SQL Editor
# 4. Copy and paste the contents of database-setup-demo-user.sql
# 5. Click "Run"

# Option 2: Via psql command line
psql -h db.your-project.supabase.co -U postgres -d postgres -f database-setup-demo-user.sql
```

The script will create:
- ✅ Demo user profile with email `demo@xspensesai.com`
- ✅ Pro tier features enabled
- ✅ Initial XP and level
- ✅ Welcome conversation with Prime
- ✅ Sample transactions for testing

---

## 🔧 Step 3: Use in Your Code

### A. Client-Side (React Components/Pages)

```typescript
// src/pages/Settings.tsx (or any React component)
import { getUserIdOrDemo } from '../utils/getDemoUserId'
import { useAuth } from '../contexts/AuthContext' // Your auth context

export default function Settings() {
  const { session } = useAuth()
  
  const handleConnectGmail = async () => {
    // Get user ID with demo fallback
    const userId = getUserIdOrDemo(session)
    
    // Call your Netlify function
    window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${userId}`
  }
  
  return (
    <button onClick={handleConnectGmail}>
      Connect Gmail
    </button>
  )
}
```

**Or inline (like your code):**
```typescript
// Your exact code - this works perfectly! ✅
const uid = session?.user?.id 
  ?? import.meta.env.VITE_DEMO_USER_ID 
  ?? "00000000-0000-4000-8000-000000000001"

window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${uid}`
```

### B. Server-Side (Netlify Functions)

```typescript
// netlify/functions/gmail-oauth-start.ts
import { getUserIdOrDemo, DEMO_USER_ID } from './_shared/demo-user'

export const handler = async (event) => {
  // Option 1: Use helper (reads from query params or body)
  const userId = getUserIdOrDemo(event)
  
  // Option 2: Manual with fallback
  const userId = event.queryStringParameters?.userId || DEMO_USER_ID
  
  // Generate OAuth URL for this user
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    state: userId, // Pass to callback
  })
  
  return {
    statusCode: 200,
    body: JSON.stringify({ authUrl })
  }
}
```

### C. Full Example: Gmail OAuth Flow

**Client-Side Button:**
```typescript
// src/components/GmailConnect.tsx
import { getUserIdOrDemo, isUsingDemoUser } from '../utils/getDemoUserId'

export function GmailConnectButton() {
  const { session } = useAuth()
  const userId = getUserIdOrDemo(session)
  
  const handleConnect = () => {
    // Show warning if using demo
    if (isUsingDemoUser(userId)) {
      alert('⚠️ Demo mode: Gmail connection will be associated with demo account')
    }
    
    window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${userId}`
  }
  
  return <button onClick={handleConnect}>Connect Gmail</button>
}
```

**Server-Side Function:**
```typescript
// netlify/functions/gmail-oauth-start.ts
import { Handler } from '@netlify/functions'
import { google } from 'googleapis'
import { DEMO_USER_ID } from './_shared/demo-user'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NETLIFY_DEV === 'true'
    ? process.env.GMAIL_REDIRECT_URI_LOCAL
    : process.env.GMAIL_REDIRECT_URI
)

export const handler: Handler = async (event) => {
  const userId = event.queryStringParameters?.userId || DEMO_USER_ID
  
  console.log(`[Gmail OAuth] Starting flow for user: ${userId}`)
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    state: userId, // Will be returned in callback
  })
  
  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
      'Cache-Control': 'no-cache',
    },
    body: '',
  }
}
```

---

## 🧪 Step 4: Test the Setup

### Test 1: Verify Demo User Exists

```bash
# Call the selftest function
curl http://localhost:8888/.netlify/functions/selftest

# Or in production
curl https://xspensesai.com/.netlify/functions/selftest
```

### Test 2: Fetch Demo User Data

Create a test function or use an existing one:

```typescript
// netlify/functions/test-demo.ts
import { Handler } from '@netlify/functions'
import { supabaseAdmin } from './supabase'
import { DEMO_USER_ID } from './_shared/demo-user'

export const handler: Handler = async () => {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', DEMO_USER_ID)
    .single()
  
  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', DEMO_USER_ID)
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      demo_user_id: DEMO_USER_ID,
      profile_exists: !!profile,
      profile: profile,
      transaction_count: transactions?.length || 0,
      transactions: transactions
    })
  }
}
```

```bash
# Test locally
curl http://localhost:8888/.netlify/functions/test-demo
```

Expected response:
```json
{
  "demo_user_id": "00000000-0000-4000-8000-000000000001",
  "profile_exists": true,
  "profile": {
    "id": "00000000-0000-4000-8000-000000000001",
    "email": "demo@xspensesai.com",
    "full_name": "Demo User",
    "plan_id": "pro"
  },
  "transaction_count": 3,
  "transactions": [...]
}
```

---

## 🎯 Real-World Usage Examples

### Example 1: Gmail Integration Testing

```typescript
// In your frontend (e.g., Settings page)
async function connectGmail() {
  const response = await fetch('/.netlify/functions/gmail-connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // If no user session, use demo user
      userId: user?.id || '00000000-0000-4000-8000-000000000001'
    })
  })
  
  const { authUrl } = await response.json()
  window.location.href = authUrl // Redirect to Google OAuth
}
```

### Example 2: Chat System Testing

```typescript
// netlify/functions/chat.ts
import { getUserIdOrDemo } from './_shared/demo-user'

export const handler: Handler = async (event) => {
  const userId = getUserIdOrDemo(event)
  const { message, employeeSlug } = JSON.parse(event.body || '{}')
  
  // Save message with demo user ID
  await supabaseAdmin.from('chat_messages').insert({
    user_id: userId,
    employee_slug: employeeSlug,
    content: message,
    role: 'user'
  })
  
  // Generate AI response...
}
```

### Example 3: Receipt Processing Testing

```typescript
// netlify/functions/process-receipt.ts
import { DEMO_USER_ID } from './_shared/demo-user'

export const handler: Handler = async (event) => {
  const userId = event.queryStringParameters?.userId || DEMO_USER_ID
  
  // Process receipt for demo user
  const { data: receipt } = await supabaseAdmin
    .from('receipts')
    .insert({
      user_id: userId,
      merchant: 'Test Merchant',
      amount: 45.50,
      // ...
    })
  
  // Trigger AI employees to process...
}
```

---

## ⚠️ Important Notes

### Security Considerations:

1. **DO NOT use demo user in production** - This is for testing only!
2. **Implement proper authentication** before going live
3. **Remove demo user data** periodically if exposed to public
4. **Monitor demo user activity** for abuse

### When to Stop Using Demo User:

Remove the demo user fallback once you have:
- ✅ Working authentication (Google OAuth, email/password, etc.)
- ✅ Session management
- ✅ User registration flow
- ✅ JWT token validation

### Cleanup:

When ready to remove demo user:

```sql
-- Run this in Supabase SQL Editor
DELETE FROM chat_messages WHERE user_id = '00000000-0000-4000-8000-000000000001';
DELETE FROM conversations WHERE user_id = '00000000-0000-4000-8000-000000000001';
DELETE FROM transactions WHERE user_id = '00000000-0000-4000-8000-000000000001';
DELETE FROM user_xp WHERE user_id = '00000000-0000-4000-8000-000000000001';
DELETE FROM gmail_connections WHERE user_id = '00000000-0000-4000-8000-000000000001';
DELETE FROM profiles WHERE id = '00000000-0000-4000-8000-000000000001';
```

Then remove from environment variables:
- Netlify Dashboard → Environment variables → Delete `DEMO_USER_ID`
- Remove from `.env` file locally

---

## 🔍 Troubleshooting

### Issue: "Demo user not found"

**Solution**:
1. Verify environment variable is set: `echo $DEMO_USER_ID`
2. Check Netlify environment variables are saved
3. Re-run `database-setup-demo-user.sql`
4. Redeploy your site after adding env var

### Issue: "Cannot insert into profiles"

**Solution**:
- Check if RLS (Row Level Security) is blocking inserts
- Use the service role key (not anon key) in the SQL script
- Or temporarily disable RLS: `ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;`

### Issue: Gmail OAuth failing with demo user

**Solution**:
- Verify `DEMO_USER_ID` matches in database and environment
- Check Gmail callback redirects to correct URL
- Ensure demo user exists in `profiles` table before OAuth flow

---

## ✅ Checklist

Before deploying:

- [ ] `DEMO_USER_ID` added to Netlify environment variables
- [ ] `DEMO_USER_ID` added to local `.env` file
- [ ] Demo user created in database (run SQL script)
- [ ] Verified demo user exists (check in Supabase dashboard)
- [ ] Tested at least one function with demo user
- [ ] Updated functions to use `getUserIdOrDemo()` helper
- [ ] Documented when demo user will be removed

---

## 📚 Related Files

- `netlify/functions/_shared/demo-user.ts` - Demo user utility functions
- `database-setup-demo-user.sql` - SQL script to create demo user
- `NETLIFY_ENV_FIXES.md` - Environment variable documentation
- `.env.example` - Example environment variables

---

## 🎉 You're All Set!

Your demo user is ready to use. You can now test:
- ✅ Gmail OAuth integration
- ✅ AI chat system
- ✅ Receipt processing
- ✅ Transaction categorization
- ✅ Any feature requiring a user ID

**Happy testing!** 🚀

