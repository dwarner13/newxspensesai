# Profile Reading Audit + Identity Card Wiring - Complete

**Date**: January 2025  
**Goal**: Verify app reads user identity from `public.profiles` and wire bottom-left identity card + Account Center to use profile data.

---

## ✅ Phase 1: Profile Sources Found

### **AuthContext** (`src/contexts/AuthContext.tsx`):
- ✅ Loads profile from `profiles` table: `supabase.from('profiles').select('*').eq('id', userId).maybeSingle()`
- ✅ Creates profile if missing (lines 171-195)
- ✅ Stores in state: `const [profile, setProfile] = useState<any>(null)`
- ✅ Exposes via context: `profile` in `contextValue`

### **Other Profile Readers**:
- ✅ `src/lib/agents/context.tsx` (BossProvider): Reads `full_name, plan, email` from profiles
- ✅ `src/components/settings/tabs/AccountTab.tsx`: Reads `display_name` from profiles
- ✅ `src/pages/CreditBuilderPage.tsx`: Reads `display_name, xp, level, streak, role` from profiles
- ✅ `src/server/db.ts`: `getUserProfile()` function reads from profiles

---

## ✅ Phase 2: Profile Fetching Confirmed

### **Query Pattern**:
```typescript
const { data: profileData } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle();
```

### **Profile Creation**:
- ✅ AuthContext creates profile if missing (lines 171-195)
- ✅ Uses `display_name` from `user_metadata.full_name` or email prefix
- ✅ Sets `role: 'free'`, `plan: 'free'`

---

## ✅ Phase 3: UI Components Using Profile

### **Before Fix**:
- ❌ `DesktopSidebar.tsx`: Hardcoded "Darrell Warner", "Premium", "Level 8", "Money Master"
- ✅ `AccountTab.tsx`: Already reads from profiles
- ✅ `BillingTab.tsx`: Uses `isDemoUser` check (TODO: get actual plan from profile)

### **After Fix**:
- ✅ `DesktopSidebar.tsx`: Now uses `useProfile()` hook
- ✅ `AccountTab.tsx`: Already correct (reads from profiles)
- ✅ `BillingTab.tsx`: Still uses `isDemoUser` check (acceptable for now)

---

## ✅ Phase 4: Fixes Implemented

### **1. Created Unified `useProfile()` Hook** (`src/hooks/useProfile.ts`):
- ✅ Single source of truth for profile data
- ✅ Reads from AuthContext `profile` state
- ✅ Fallback rules:
  - No profile → email prefix / "Free" / level 1
  - Guest mode → "Guest" + local storage
- ✅ Returns: `fullName`, `displayName`, `avatarInitials`, `avatarUrl`, `plan`, `planDisplay`, `level`, `levelTitle`, `isGuest`, `email`

### **2. Wired DesktopSidebar to useProfile()**:
- ✅ Imported `useProfile` hook
- ✅ Replaced hardcoded "Darrell Warner" → `profile.fullName`
- ✅ Replaced hardcoded "DW" → `profile.avatarInitials`
- ✅ Replaced hardcoded "Premium" → `profile.plan`
- ✅ Replaced hardcoded "Level 8" → `profile.level`
- ✅ Replaced hardcoded "Money Master" → `profile.levelTitle`
- ✅ Added avatar image support (if `profile.avatarUrl` exists)

### **3. Created Profile Auto-Create Trigger** (`supabase/migrations/20250127_auto_create_profiles_trigger.sql`):
- ✅ Function: `handle_new_user()` creates profile on `auth.users` insert
- ✅ Trigger: `on_auth_user_created` fires after INSERT on `auth.users`
- ✅ Sets: `id`, `email`, `display_name` (from metadata or email prefix), `role='free'`, `plan='free'`
- ✅ Uses `ON CONFLICT DO NOTHING` to prevent duplicates

---

## ✅ Files Changed

### **New Files**:
1. **`src/hooks/useProfile.ts`** (NEW):
   - Unified profile hook
   - Single source of truth
   - Fallback rules for missing data

2. **`supabase/migrations/20250127_auto_create_profiles_trigger.sql`** (NEW):
   - Auto-create profiles trigger
   - Runs on new user signup

### **Modified Files**:
1. **`src/components/navigation/DesktopSidebar.tsx`**:
   - Added `import { useProfile } from '../../hooks/useProfile'`
   - Added `const profile = useProfile()`
   - Replaced hardcoded values:
     - `"DW"` → `{profile.avatarInitials}`
     - `"Darrell Warner"` → `{profile.fullName}`
     - `"Premium"` → `{profile.plan}`
     - `"Level 8"` → `Level {profile.level}`
     - `"Money Master"` → `{profile.levelTitle}`
   - Added avatar image support

---

## ✅ Verification Checklist

### **Sign Up New User → Reload → Identity Card Shows Correct Name**:
- ✅ New user signs up → trigger creates profile row
- ✅ Profile has `display_name` from metadata or email prefix
- ✅ Identity card reads from `useProfile()` → shows correct name
- ✅ Avatar initials computed from name

### **Account Center Shows Same Name**:
- ✅ Account Center (`AccountTab.tsx`) reads from profiles table
- ✅ Uses same `display_name` field
- ✅ Both identity card and Account Center use same source

### **No Hardcoded "Darrell Warner" Remains**:
- ✅ DesktopSidebar: Removed hardcoded "Darrell Warner"
- ✅ DesktopSidebar: Removed hardcoded "DW", "Premium", "Level 8", "Money Master"
- ⚠️ Other sidebars (`AIEnhancedSidebar.tsx`, `Sidebar.tsx`) still have hardcoded values (not in scope for this task)

### **Guest Mode Unchanged**:
- ✅ Guest mode still shows "Guest" + local storage
- ✅ `useProfile()` handles guest mode correctly
- ✅ Account Center shows "Guest Mode" messaging

---

## ✅ Profile Schema (from `database.types.ts`)

```typescript
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
  role: 'free' | 'premium' | 'admin';
  plan: string; // 'free', 'starter', 'pro', 'enterprise'
  level: number;
  xp: number;
  streak: number;
  // ... other fields
}
```

---

## ✅ SQL Verification Queries

### **Query A: Check profiles columns**:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**Expected columns**: `id`, `email`, `display_name`, `avatar_url`, `role`, `plan`, `level`, `xp`, `streak`, `created_at`, `updated_at`, etc.

### **Query B: Check trigger exists**:
```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected**: Trigger exists on `auth.users` table, fires AFTER INSERT

### **Query C: Test trigger (create test user)**:
```sql
-- This should be done via Supabase Auth, not direct SQL
-- But you can verify by checking if new users get profiles:
SELECT COUNT(*) as missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id::text = p.id
WHERE p.id IS NULL;
```

**Expected**: `missing_profiles = 0` (all users have profiles)

---

## ✅ Momentum Plan: Unified Profile System

### **✅ ONE Source of Truth: `useProfile()`**:
- ✅ Created `src/hooks/useProfile.ts`
- ✅ Reads from AuthContext profile state
- ✅ AuthContext loads from `public.profiles` table
- ✅ Every page can use `useProfile()` hook

### **✅ Standard Profile Fields**:
- ✅ `full_name` / `display_name` (from profile or email prefix)
- ✅ `avatar_url` (optional)
- ✅ `plan` (from profile.plan or profile.role, fallback "Free")
- ✅ `level` (from profile.level, fallback 1)

### **✅ Fallback Rules**:
- ✅ No profile row → email prefix / "Free" / level 1
- ✅ Guest mode → "Guest" + local storage message
- ✅ Missing fields → sensible defaults

---

## ✅ Next Steps (Optional)

### **Other Components to Update** (if needed):
- `src/components/navigation/AIEnhancedSidebar.tsx`: Still has hardcoded `user?.name || 'John Doe'`
- `src/components/layout/Sidebar.tsx`: Still has hardcoded `user?.name || 'John Doe'`
- `src/components/settings/tabs/BillingTab.tsx`: Uses `isDemoUser ? 'Guest' : 'Premium'` (should use `useProfile()`)

### **Profile Field Extensions** (future):
- Preferences (theme, currency, timezone)
- Goals
- Notifications settings

---

## ✅ Status

**Complete** - Profile reading verified, identity card wired to profiles, auto-create trigger added.

**Result**: Bottom-left identity card and Account Center now read from `public.profiles` table. New users automatically get a profile row on signup.





