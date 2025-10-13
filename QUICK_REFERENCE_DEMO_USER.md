# Demo User Quick Reference

## 🎯 Demo User UUID
```
00000000-0000-4000-8000-000000000001
```

---

## ⚡ Quick Setup

### 1️⃣ Netlify Environment Variables
Add **BOTH** in Netlify Dashboard → Site settings → Environment variables:
```bash
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001  # Client-side
DEMO_USER_ID=00000000-0000-4000-8000-000000000001       # Server-side
```

### 2️⃣ Local `.env` File
```bash
VITE_DEMO_USER_ID=00000000-0000-4000-8000-000000000001  # Client
DEMO_USER_ID=00000000-0000-4000-8000-000000000001       # Server
```

### 3️⃣ Create in Database
Run `database-setup-demo-user.sql` in Supabase SQL Editor

---

## 📝 Usage Patterns

### ✅ Client-Side (React/Browser)
```typescript
// Your code - works perfectly!
const uid = session?.user?.id 
  ?? import.meta.env.VITE_DEMO_USER_ID 
  ?? "00000000-0000-4000-8000-000000000001"

window.location.href = `/.netlify/functions/gmail-oauth-start?userId=${uid}`
```

### ✅ Server-Side (Netlify Functions)
```typescript
import { DEMO_USER_ID } from './_shared/demo-user'

const userId = event.queryStringParameters?.userId || DEMO_USER_ID
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `src/utils/getDemoUserId.ts` | Client-side helper utilities |
| `netlify/functions/_shared/demo-user.ts` | Server-side helper utilities |
| `database-setup-demo-user.sql` | Creates demo user in Supabase |
| `DEMO_USER_SETUP.md` | Complete guide with examples |

---

## 🔍 Key Differences

| Aspect | Client-Side | Server-Side |
|--------|-------------|-------------|
| **Prefix** | `VITE_` required | No prefix |
| **Access** | `import.meta.env.VITE_*` | `process.env.*` |
| **Used In** | React components, pages | Netlify Functions |
| **Visibility** | Bundled in JS (public) | Server-only (private) |
| **Secrets?** | ❌ NO - visible in browser | ✅ YES - safe |

---

## ✅ Checklist

- [ ] `VITE_DEMO_USER_ID` added to Netlify
- [ ] `DEMO_USER_ID` added to Netlify
- [ ] Both added to local `.env`
- [ ] Ran SQL script in Supabase
- [ ] Verified demo user exists in database
- [ ] Tested in browser (client-side)
- [ ] Tested in Netlify Function (server-side)

---

## 🧪 Test Commands

```bash
# Test locally
npm run dev

# Verify in Supabase
SELECT * FROM profiles WHERE id = '00000000-0000-4000-8000-000000000001';

# Test Gmail OAuth
# Click your "Connect Gmail" button and check URL contains userId
```

---

## 📖 Full Documentation
See `DEMO_USER_SETUP.md` for complete guide with examples!



