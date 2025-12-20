# User/Auth/Profile Audit Report
**Date**: 2025-01-XX  
**Status**: Audit Complete - No Code Changes Made

---

## 1. WHAT EXISTS NOW

### A. Authentication System

**Status**: ✅ **Real Supabase Auth + Demo User Fallback**

**Evidence**:
- **File**: `src/contexts/AuthContext.tsx`
  - Lines 23-369: Complete AuthProvider implementation
  - Lines 51-134: Session checking with Supabase `getSession()`
  - Lines 135-207: `onAuthStateChange` subscription for real-time auth updates
  - Lines 222-280: `signInWithGoogle()`, `signInWithApple()`, `signInWithOtp()` implementations
  - Lines 311-335: `signOut()` with demo user fallback
  - **Demo User ID**: `00000000-0000-4000-8000-000000000001` (from `VITE_DEMO_USER_ID` env var)

**Auth Methods Supported**:
1. ✅ Google OAuth (`signInWithGoogle`)
2. ✅ Apple OAuth (`signInWithApple`)  
3. ✅ Magic Link/OTP (`signInWithOtp`)
4. ✅ Demo user fallback (when no Supabase or no session)

**Key Behavior**:
- If no Supabase configured → uses demo user
- If no session exists → uses demo user
- After sign out → switches to demo user (does NOT force login)
- `userId` is ALWAYS set (real user ID or demo user ID)
- `isDemoUser` flag available for conditional logic

---

### B. Pages & Routes

**Status**: ⚠️ **Partial - Missing Reset Password Route**

**Existing Pages**:
1. ✅ **LoginPage** (`src/pages/LoginPage.tsx`)
   - Email/password form (appears unused)
   - Google/Apple OAuth buttons
   - Magic link input
   - Route: `/login` (referenced but NOT defined in `App.tsx` routes)

2. ✅ **SignupPage** (`src/pages/SignupPage.tsx`)
   - Email/password signup form
   - Google/Apple OAuth buttons
   - Route: `/signup` (referenced but NOT defined in `App.tsx` routes)

3. ✅ **AuthCallbackPage** (`src/pages/AuthCallbackPage.tsx`)
   - Handles OAuth redirects (`/auth/callback`)
   - Route: `/auth/callback` (referenced but NOT defined in `App.tsx` routes)

4. ✅ **ProfileSettingsPage** (`src/pages/ProfileSettingsPage.tsx`)
   - Full profile management UI
   - Route: `/dashboard/settings` (✅ EXISTS in `App.tsx` line 381)

5. ✅ **AdminPanelPage** (`src/pages/AdminPanelPage.tsx`)
   - Admin-only panel
   - Route: NOT found in `App.tsx` (page exists but no route)

**Missing Routes**:
- ❌ `/login` - Page exists but route NOT in `App.tsx`
- ❌ `/signup` - Page exists but route NOT in `App.tsx`
- ❌ `/auth/callback` - Page exists but route NOT in `App.tsx`
- ❌ `/reset-password` - Page does NOT exist
- ❌ `/profile` - Does NOT exist (use `/dashboard/settings` instead)

**Why It Matters**: Users cannot actually navigate to login/signup pages via routes. They exist but are orphaned.

---

### C. Database Tables

**Status**: ⚠️ **Schema Mismatch - Code References `profiles` But Migration Creates `users`**

**Migration Found**: `supabase/migrations/20241201000001_production_schema.sql`

**Table Created**: `public.users` (Lines 9-21)
```sql
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'USD',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}'
);
```

**Code References**: `profiles` table (throughout codebase)
- `src/contexts/AuthContext.tsx` line 86: `.from('profiles')`
- `src/pages/ProfileSettingsPage.tsx` line 127: `.from('profiles')`
- `src/lib/agents/context.tsx` line 19: `.from('profiles')`
- `src/types/database.types.ts` lines 105-138: `Profile` interface with extensive fields

**Profile Interface** (`src/types/database.types.ts`):
```typescript
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
  role: 'free' | 'premium' | 'admin';
  last_login_at: string | null;
  transaction_count: number;
  total_uploaded: number;
  account_created_at: string;
  xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
  email_notifications: boolean;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  // Onboarding fields
  user_source: string | null;
  referrer_name: string | null;
  account_name: string | null;
  time_zone: string | null;
  date_locale: string | null;
  currency: string | null;
  tax_included: string | null;
  tax_system: string | null;
  commitment_level: string | null;
  marketing_consent: boolean | null;
  accepted_ai_terms: boolean | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
}
```

**Why It Matters**: Code expects `profiles` table with 30+ fields, but migration only creates `users` table with 10 fields. This will cause runtime errors when profile queries execute.

---

### D. Row Level Security (RLS)

**Status**: ⚠️ **Partial - Chat Tables Protected, User Tables Unclear**

**RLS Found**:
- ✅ **Chat System RLS** (`supabase/migrations/001_centralized_chat_rls.sql`)
  - `chat_sessions` - Users can only access own sessions
  - `chat_messages` - Users can only access messages in own sessions
  - `user_memory_facts` - Users can only access own facts
  - Uses `auth.uid()::text` for user isolation

- ✅ **Production Schema RLS** (`supabase/migrations/20241201000001_production_schema.sql` line 393)
  - RLS ENABLED on: `users`, `categories`, `accounts`, `transactions`, `uploaded_documents`, etc.
  - **BUT**: No actual policies created (only `ENABLE ROW LEVEL SECURITY` statements)

**RLS Missing**:
- ❌ No policies found for `profiles` table (if it exists)
- ❌ No policies found for `users` table (policies not created in migration)
- ❌ No policies for demo user access (demo UUID `00000000-0000-4000-8000-000000000001`)

**Why It Matters**: If RLS is enabled but no policies exist, tables are effectively locked (deny by default). Users cannot read/write their own data.

---

### E. Backend Functions (Netlify Functions)

**Status**: ⚠️ **userId Required But No JWT Verification**

**Auth Pattern Found**:
- **File**: `netlify/functions/chat.ts` line 408-415
  ```typescript
  if (!userId || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'userId and message are required' }),
    };
  }
  ```

- **File**: `netlify/functions/_shared/supabase.ts`
  - Uses `admin()` function with service role key
  - No JWT verification - trusts `userId` from request body

**Functions Checked**:
1. ✅ `chat.ts` - Requires `userId` in body, no JWT check
2. ✅ `smart_import_stats.ts` - Requires `userId`, no JWT check
3. ✅ `prime-live-stats.ts` - Requires `userId`, no JWT check
4. ✅ `activity-feed.ts` - Requires `userId`, no JWT check
5. ✅ `memory-extraction-worker.ts` - Uses admin client

**Why It Matters**: Any client can pass any `userId` and access that user's data. No authentication verification on backend.

---

## 2. RISKS / CONFLICTS

### 🔴 Critical Risks

1. **Demo User Foreign Key Violations**
   - **Location**: Throughout codebase (537 matches found)
   - **Issue**: Demo user UUID `00000000-0000-4000-8000-000000000001` does NOT exist in `auth.users`
   - **Impact**: Foreign key constraints fail when demo user tries to create records
   - **Evidence**: 
     - `netlify/functions/smart-import-init.ts` lines 78-79: Skips imports insert for demo users
     - `MEMORY_EXTRACTION_QUEUE_FK_FIX.md`: Documents FK violations with demo user
   - **Fix Needed**: Create demo user in `auth.users` OR remove FK constraints OR handle demo user specially

2. **Schema Mismatch: `profiles` vs `users`**
   - **Location**: Code references `profiles`, migration creates `users`
   - **Impact**: Profile queries will fail with "relation profiles does not exist"
   - **Evidence**: 
     - `src/contexts/AuthContext.tsx` line 86: `.from('profiles')`
     - `src/pages/ProfileSettingsPage.tsx` line 127: `.from('profiles')`
     - Migration creates `users` table, not `profiles`
   - **Fix Needed**: Either create `profiles` table OR update all code to use `users`

3. **Missing RLS Policies for User Data**
   - **Location**: `supabase/migrations/20241201000001_production_schema.sql` line 393
   - **Issue**: RLS enabled but no policies created
   - **Impact**: Users cannot read/write their own data (deny by default)
   - **Fix Needed**: Create RLS policies for `users`/`profiles` table

4. **No Backend Auth Verification**
   - **Location**: All Netlify functions
   - **Issue**: Functions trust `userId` from request body without JWT verification
   - **Impact**: Any client can impersonate any user
   - **Fix Needed**: Verify JWT token and extract `userId` from token, not body

5. **Orphaned Auth Pages**
   - **Location**: `src/pages/LoginPage.tsx`, `SignupPage.tsx`, `AuthCallbackPage.tsx`
   - **Issue**: Pages exist but routes not defined in `App.tsx`
   - **Impact**: Users cannot navigate to login/signup
   - **Fix Needed**: Add routes to `App.tsx`

### ⚠️ Medium Risks

6. **Hardcoded Admin Email**
   - **Location**: `src/hooks/useAdminAccess.ts` line 18
   - **Issue**: `const userIsAdmin = user?.email === "darrell.warner13@gmail.com";`
   - **Impact**: Admin access tied to single email, not database role
   - **Fix Needed**: Use `profile.role === 'admin'` instead

7. **Profile Creation Logic**
   - **Location**: `src/pages/ProfileSettingsPage.tsx` lines 113-136
   - **Issue**: Creates profile on-demand if missing, but table may not exist
   - **Impact**: Profile creation will fail if `profiles` table doesn't exist
   - **Fix Needed**: Ensure `profiles` table exists before allowing profile creation

---

## 3. RECOMMENDED MVP BUILD PLAN

### Phase 1: Fix Critical Schema Issues

**A. Create `profiles` Table Migration**
```sql
-- File: supabase/migrations/YYYYMMDD_create_profiles_table.sql
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    display_name TEXT,
    account_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'free' CHECK (role IN ('free', 'premium', 'admin')),
    last_login_at TIMESTAMPTZ,
    transaction_count INTEGER DEFAULT 0,
    total_uploaded INTEGER DEFAULT 0,
    account_created_at TIMESTAMPTZ DEFAULT NOW(),
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    email_notifications BOOLEAN DEFAULT true,
    stripe_customer_id TEXT,
    subscription_id TEXT,
    subscription_status TEXT,
    current_period_end TIMESTAMPTZ,
    -- Onboarding fields
    user_source TEXT,
    referrer_name TEXT,
    time_zone TEXT DEFAULT 'UTC',
    date_locale TEXT DEFAULT 'en-US',
    currency TEXT DEFAULT 'USD',
    tax_included TEXT,
    tax_system TEXT,
    commitment_level TEXT,
    marketing_consent BOOLEAN,
    accepted_ai_terms BOOLEAN,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**B. Create RLS Policies for `profiles`**
```sql
-- File: supabase/migrations/YYYYMMDD_profiles_rls.sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Users can update own profile
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert own profile (on signup)
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Service role has full access
CREATE POLICY "Service role full access"
    ON profiles FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Demo user access (if needed for development)
CREATE POLICY "Demo user can access demo profile"
    ON profiles FOR ALL
    TO authenticated
    USING (
        id::text = '00000000-0000-4000-8000-000000000001'
        OR id = auth.uid()
    )
    WITH CHECK (
        id::text = '00000000-0000-4000-8000-000000000001'
        OR id = auth.uid()
    );
```

**C. Create Demo User in `auth.users` (Optional)**
```sql
-- File: supabase/migrations/YYYYMMDD_create_demo_user.sql
-- Only if you want demo user to work with FK constraints
-- Note: This requires Supabase Admin API or manual creation
-- Alternative: Remove FK constraints OR handle demo user specially in code
```

---

### Phase 2: Add Missing Routes

**File**: `src/App.tsx`

Add routes inside `<Route element={<MarketingLayout />}>`:
```typescript
<Route path="/login" element={<LoginPage />} />
<Route path="/signup" element={<SignupPage />} />
<Route path="/auth/callback" element={<AuthCallbackPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} /> // Create this page
```

---

### Phase 3: Backend Auth Verification

**File**: `netlify/functions/_shared/auth.ts` (NEW)

```typescript
import { admin } from './supabase.js';

export async function verifyAuth(event: any): Promise<{ userId: string; error?: string }> {
  // Extract JWT from Authorization header
  const authHeader = event.headers.authorization || event.headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: '', error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const supabase = admin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { userId: '', error: 'Invalid token' };
    }
    
    return { userId: user.id };
  } catch (error) {
    return { userId: '', error: 'Auth verification failed' };
  }
}
```

**Update Functions**: Replace `userId` from body with verified `userId` from JWT:
```typescript
// In chat.ts, smart_import_stats.ts, etc.
const { userId, error } = await verifyAuth(event);
if (error || !userId) {
  return { statusCode: 401, body: JSON.stringify({ error }) };
}
```

---

### Phase 4: Frontend AuthContext Updates

**File**: `src/contexts/AuthContext.tsx`

**Changes Needed**:
1. ✅ Already loads profile from `profiles` table (line 86)
2. ✅ Already handles demo user fallback
3. ⚠️ Ensure profile creation on first signup (add trigger or handle in signup flow)

**Add Profile Creation Trigger** (Database):
```sql
-- File: supabase/migrations/YYYYMMDD_profile_creation_trigger.sql
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, account_name, account_created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'account_name', NEW.email),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_on_signup();
```

---

### Phase 5: Custodian Integration Plan

**For Custodian Onboarding/Profile Setup**:

1. **Profile Creation Flow**:
   - Custodian calls `create_profile_on_signup()` trigger automatically
   - OR Custodian calls explicit profile creation API after signup
   - Profile fields populated from onboarding flow

2. **Onboarding Fields**:
   - `account_name` - From onboarding step 1
   - `time_zone`, `date_locale`, `currency` - From onboarding step 2
   - `tax_included`, `tax_system` - From onboarding step 3
   - `onboarding_completed` - Set to `true` when flow completes
   - `onboarding_completed_at` - Timestamp when flow completes

3. **Profile Update API**:
   - Create Netlify function: `netlify/functions/update-profile.ts`
   - Accepts profile fields, verifies auth, updates `profiles` table
   - Used by Custodian to update profile during onboarding

---

## 4. EVIDENCE SUMMARY

### Files Referenced

**Auth System**:
- `src/contexts/AuthContext.tsx` - Main auth context (369 lines)
- `src/pages/LoginPage.tsx` - Login page (440 lines)
- `src/pages/SignupPage.tsx` - Signup page (347 lines)
- `src/pages/AuthCallbackPage.tsx` - OAuth callback (166 lines)
- `src/utils/getDemoUserId.ts` - Demo user utilities
- `src/constants/demoUser.ts` - Demo user constants

**Database**:
- `supabase/migrations/20241201000001_production_schema.sql` - Creates `users` table
- `supabase/migrations/001_centralized_chat_rls.sql` - Chat RLS policies
- `src/types/database.types.ts` - Profile interface definition

**Backend**:
- `netlify/functions/chat.ts` - Main chat endpoint (2136 lines)
- `netlify/functions/_shared/supabase.ts` - Admin client
- `netlify/functions/_shared/demo-user.ts` - Demo user helpers

**Routes**:
- `src/App.tsx` - Main routing (475 lines) - Missing auth routes

**Profile Management**:
- `src/pages/ProfileSettingsPage.tsx` - Profile settings UI (811 lines)
- `src/pages/onboarding/AccountSetupScreen.tsx` - Onboarding flow

---

## 5. ACCEPTANCE CRITERIA FOR MVP

✅ **Database**:
- [ ] `profiles` table exists with all fields from `Profile` interface
- [ ] RLS policies created for `profiles` table
- [ ] Profile creation trigger on `auth.users` insert
- [ ] Demo user handling (either create in `auth.users` OR remove FK constraints)

✅ **Routes**:
- [ ] `/login` route works
- [ ] `/signup` route works
- [ ] `/auth/callback` route works
- [ ] `/reset-password` route created and works
- [ ] `/dashboard/settings` route works (already exists)

✅ **Backend**:
- [ ] JWT verification in Netlify functions
- [ ] `userId` extracted from JWT, not request body
- [ ] Demo user support in backend functions

✅ **Frontend**:
- [ ] AuthContext loads profile from `profiles` table
- [ ] Profile creation on first signup
- [ ] Profile updates work
- [ ] Demo user fallback works

✅ **Custodian Integration**:
- [ ] Profile creation API for onboarding
- [ ] Profile update API for onboarding
- [ ] Onboarding fields mapped to profile fields

---

## 6. NEXT STEPS

1. **Create SQL Migration**: `YYYYMMDD_create_profiles_table.sql` + `YYYYMMDD_profiles_rls.sql`
2. **Add Routes**: Update `src/App.tsx` with auth routes
3. **Create Reset Password Page**: `src/pages/ResetPasswordPage.tsx`
4. **Add Backend Auth**: Create `netlify/functions/_shared/auth.ts` and update functions
5. **Test**: Signup → Profile Creation → Login → Profile Access
6. **Custodian Wiring**: Profile creation/update APIs for onboarding flow

---

**END OF AUDIT**







