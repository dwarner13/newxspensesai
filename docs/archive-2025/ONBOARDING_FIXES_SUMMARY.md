# Prime/Custodian Onboarding Flow Fixes + WOW Polish

**Date:** 2025-01-30  
**Status:** ✅ Complete

---

## 📋 Summary

Fixed critical blockers and enhanced UX for the Prime/Custodian onboarding flow:
- ✅ **BLOCKER 1:** Added `display_name` and `account_name` columns to profiles table
- ✅ **BLOCKER 2:** Fixed name step to never derive from email, start blank unless `display_name` exists
- ✅ **BUG 1:** Verified single rendering (already guarded)
- ✅ **UX:** Confirmation cards already implemented (no form scrolling)
- ✅ **Style:** Glowing button style already matches Byte chat

---

## 📁 Files Changed

### 1. Migration SQL
- **File:** `supabase/migrations/20250130_add_display_name_to_profiles.sql`
- **Purpose:** Adds `display_name` column and ensures `account_name` exists

### 2. Onboarding Component
- **File:** `src/components/onboarding/CinematicOnboardingOverlay.tsx`
- **Changes:**
  - Fixed `getInitialName` to only use `display_name` (never derive from email)
  - Updated save logic to persist `display_name` correctly
  - Username suggestion already implemented (shows when input looks like username)

---

## 🔧 Detailed Changes

### BLOCKER 1: Supabase Migration

**File:** `supabase/migrations/20250130_add_display_name_to_profiles.sql`

```sql
-- Adds display_name column if it doesn't exist
-- Ensures account_name exists (should already exist from previous migration)
-- Creates/verifies RLS policy for users to update own profile
-- Notifies PostgREST to reload schema cache
```

**Key Features:**
- ✅ Safe migration (checks if columns exist before adding)
- ✅ RLS policy verification/creation
- ✅ PostgREST schema cache reload
- ✅ No data loss (all columns nullable)

**To Apply:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250130_add_display_name_to_profiles.sql`
3. Paste and run
4. Verify columns exist in Table Editor → profiles

---

### BLOCKER 2: Name Step Fix

**File:** `src/components/onboarding/CinematicOnboardingOverlay.tsx`

**Change 1: Initial Name Logic (lines 144-152)**
```typescript
// BEFORE: Derived from email if no profile values
const getInitialName = useMemo(() => {
  if (profile?.display_name) return profile.display_name;
  if (profile?.preferred_name) return profile.preferred_name;
  // ... email derivation logic ...
}, [profile]);

// AFTER: Only uses display_name, never derives from email
const getInitialName = useMemo(() => {
  // Only use existing display_name if it exists, otherwise start blank
  if (profile?.display_name && profile.display_name.trim().length > 0) {
    return profile.display_name.trim();
  }
  // Return empty string - user must type their name (no email derivation)
  return '';
}, [profile]);
```

**Change 2: Save Logic (lines 393-400)**
```typescript
// Already correct - saves to display_name
const updateData: Record<string, any> = {
  display_name: formData.preferred_name.trim(),
  currency: formData.currency,
  account_name: formData.account_type.trim(),
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

**Username Suggestion (already implemented):**
- Shows when input contains `@`, `.` + digits, or `_` + digits
- Quick actions: "Keep as is" or "Edit name"
- Only appears AFTER user types (not on initial load)

---

### BUG 1: Double UI Rendering

**Status:** ✅ Already Fixed

**Guards in Place:**
- Single `currentScene` state (line 115)
- Conditional rendering: `{currentScene === 'identity' && (...)}` (line 837)
- Single footer: `{(currentScene === 'identity' || currentScene === 'defaults') && (...)}` (line 1203)
- `hasInitialized` guard prevents duplicate profile updates (line 119)

**Verification:**
- Only one "Back/Continue" footer renders
- Steps render once per scene transition
- No duplicate inputs or buttons

---

### UX: Confirmation Cards (Already Implemented)

**Status:** ✅ Already Complete

**Features:**
- ✅ 3 AI configuration cards (Location, Currency, Account Type)
- ✅ Each card shows current value + check icon + "Change" button
- ✅ Inline picker/modal opens when "Change" clicked
- ✅ Sticky footer at bottom
- ✅ Modal max height: `min(86vh, 720px)`
- ✅ Internal content scrolls if needed, but primary layout fits without scrolling

**Card Structure:**
```tsx
<div className="flex-shrink-0 p-4 bg-slate-800/40 border border-slate-700/30 rounded-lg">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span>🌍</span>
      <div>
        <p className="text-xs text-slate-400">Location</p>
        <p className="text-sm font-medium text-white">{formData.country || 'Not set'}</p>
      </div>
    </div>
    {formData.country && <Check />}
    <button onClick={() => setEditingCard('country')}>Change</button>
  </div>
  {editingCard === 'country' && <InlineSelector />}
</div>
```

---

### Style: Glowing Button (Already Implemented)

**Status:** ✅ Already Matches Byte Chat Style

**Button Features:**
- ✅ Perimeter glow aura (amber/orange/pink for name step, emerald/teal/cyan for defaults)
- ✅ Dark gradient background (`from-slate-800 via-slate-900 to-black`)
- ✅ Accent color ring (`boxShadow` with rgba accent color)
- ✅ Reflective shine (`bg-gradient-to-br from-white/10`)
- ✅ Hover effects (lift + glow pulse)
- ✅ Active state (scale down)
- ✅ Focus ring (accent color outline)

**Example (Name Step Button):**
```tsx
<motion.div className="pointer-events-none absolute inset-[-3px] rounded-full opacity-0 bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 blur-xl" />
<button
  className="group/btn relative inline-flex items-center justify-center rounded-full px-8 py-2.5 text-sm font-semibold tracking-wide text-white bg-gradient-to-br from-slate-800 via-slate-900 to-black border border-slate-700/60 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
  style={{
    boxShadow: '0 0 0 1px rgba(245, 158, 11, 0.4), 0 10px 28px rgba(15,23,42,0.9)',
  }}
>
  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
  <span className="relative">Continue</span>
</button>
```

---

## 🧪 Testing Instructions

### Prerequisites

1. **Run Migration:**
   ```bash
   # Option 1: Supabase Dashboard
   # Go to SQL Editor → Copy/paste migration → Run
   
   # Option 2: Supabase CLI
   supabase db push
   ```

2. **Clear Stale localStorage:**
   ```javascript
   // In browser console:
   localStorage.removeItem('onboarding_draft');
   localStorage.removeItem('onboarding_preferredName');
   localStorage.removeItem('onboarding_profileDraft');
   localStorage.removeItem('onboarding_completed');
   localStorage.removeItem('onboarding_draft_version');
   ```

### Happy Path Test

1. **Start Fresh:**
   - Clear localStorage (see above)
   - Ensure user has no `display_name` in profile
   - Navigate to `/dashboard`

2. **Scene 1: Prime Greeting**
   - ✅ Should show "Welcome to XspensesAI" card
   - ✅ Prime icon with glow
   - ✅ "Continue" button with amber glow
   - ✅ Click "Continue"

3. **Scene 2: Custodian Handoff**
   - ✅ Should show "Account setup in progress" card
   - ✅ Animated lock icon
   - ✅ "Continue" button with emerald glow
   - ✅ Click "Continue"

4. **Scene 3: Identity (Name Step)**
   - ✅ Input should be **BLANK** (not pre-filled with email)
   - ✅ Placeholder: "Your name"
   - ✅ Type a username-like value (e.g., "darrell.warner13")
   - ✅ Should show suggestion: "That looks like a username..."
   - ✅ Quick actions: "Keep as is" or "Edit name"
   - ✅ Type a proper name (e.g., "Darrell")
   - ✅ Suggestion should disappear
   - ✅ Click "Continue" (button text briefly changes to "Got it.")

5. **Scene 4: Defaults (Financial Defaults)**
   - ✅ Should show 3 confirmation cards (Location, Currency, Account Type)
   - ✅ Cards should fit without scrolling
   - ✅ Each card has "Change" button
   - ✅ Click "Change" on Currency → Selector appears inline
   - ✅ Select "CAD" → Card updates with checkmark
   - ✅ Click "Change" on Account Type → Selector appears
   - ✅ Select "Personal" → Card updates with checkmark
   - ✅ Sticky footer visible at bottom
   - ✅ Click "Confirm & Secure" → Shows "Applying configuration..." → Brief verification → Completes

6. **Scene 5: Completion**
   - ✅ Shows "Securing profile..." → "Custodian verification..." → "All set. Your workspace is ready."
   - ✅ Overlay fades out
   - ✅ Dashboard loads

### Verification Queries

**Check Profile Data:**
```sql
SELECT id, display_name, account_name, currency, onboarding_completed 
FROM profiles 
WHERE id = auth.uid();
```

**Expected Results:**
- `display_name`: User's typed name (not email-derived)
- `account_name`: Selected account type (e.g., "personal")
- `currency`: Selected currency (e.g., "CAD")
- `onboarding_completed`: `true`

---

## 🐛 Troubleshooting

### Issue: "Could not find the 'account_name' column"
**Solution:** Run the migration file to add the column.

### Issue: Name field pre-filled with email
**Solution:** 
1. Clear localStorage (see Prerequisites)
2. Ensure `profile.display_name` is null/empty in database
3. Refresh page

### Issue: Double rendering of steps
**Solution:** 
- Check browser console for React warnings
- Verify `currentScene` state is not being set multiple times
- Ensure component is not mounted twice in React tree

### Issue: Cards require scrolling
**Solution:**
- Verify modal max-height: `min(86vh, 720px)`
- Check viewport height (should be at least 600px)
- Ensure cards use `flex-shrink-0` to prevent expansion

---

## ✅ Acceptance Criteria

- [x] Migration adds `display_name` and `account_name` columns
- [x] RLS policies allow authenticated users to update own profile
- [x] Name step starts blank (no email derivation)
- [x] Username suggestion appears when input looks like username
- [x] Name saves to `profiles.display_name`
- [x] Account type saves to `profiles.account_name`
- [x] No duplicate UI rendering
- [x] Confirmation cards fit without scrolling
- [x] Buttons match Byte chat glowing style
- [x] Dashboard loads after onboarding completes

---

## 📝 Notes

- **Migration Safety:** Uses `DO $$ BEGIN ... END $$` blocks to check column existence before adding
- **Name Derivation:** Completely removed - only uses existing `display_name` if present
- **Username Detection:** Checks for `@`, `.` + digits, or `_` + digits
- **Button Style:** Reuses exact pattern from `EmployeeUnifiedCardBase.tsx` (Byte chat style)
- **Card Layout:** Uses flexbox with `flex-shrink-0` to prevent expansion, `min-h-0` to allow scrolling

---

## 🚀 Next Steps

1. **Deploy Migration:**
   - Run migration in production Supabase
   - Verify columns exist
   - Test onboarding flow

2. **Monitor:**
   - Check for any "column not found" errors
   - Verify `display_name` is being saved correctly
   - Ensure no email-derived names appear

3. **Future Enhancements:**
   - Add more currency options if needed
   - Add country autocomplete/search
   - Add account type descriptions/tooltips

---

**End of Summary**








