# Onboarding Profile Save Fix

## Problem
The onboarding setup page was failing with a 400 error when saving to `/rest/v1/profiles?on_conflict=id`. The issue was caused by:
1. Using `account_mode` instead of `account_type` (actual DB column name)
2. Including fields that don't exist in the database schema
3. Missing error logging to debug issues
4. Not refreshing AuthContext profile after save (so Custodian couldn't recognize the saved data)

## Solution

### File Changed
- `src/pages/onboarding/OnboardingSetupPage.tsx`

### Changes Made

#### 1. Fixed Column Name Mapping
- Changed `account_mode` → `account_type` (matches actual DB column)
- Updated interface: `ProfileFormData.account_mode` → `ProfileFormData.account_type`
- Updated all form state references

#### 2. Cleaned Up Payload
**Before:**
```typescript
{
  id: userId,
  email: user.email || null,
  display_name: formData.display_name.trim() || null,
  business_name: formData.business_name.trim() || null,  // ❌ Not in core schema
  account_mode: formData.account_mode,  // ❌ Wrong column name
  currency: formData.currency,
  profile_completed: true,  // ❌ May not exist
  onboarding_completed_at: new Date().toISOString(),  // ❌ May not exist
}
```

**After:**
```typescript
{
  id: userId,
  email: user.email || null,
  display_name: formData.display_name.trim() || null,
  account_type: formData.account_type,  // ✅ Correct column name
  currency: formData.currency,
}
```

#### 3. Enhanced Error Logging
Added comprehensive error logging:
```typescript
console.error('[OnboardingSetupPage] Failed to save profile:', {
  message: error.message,
  details: error.details,
  hint: error.hint,
  code: error.code,
  payloadKeys: Object.keys(payload),
});
```

#### 4. Added Profile Refresh
After successful save:
```typescript
await refreshProfile();
```
This ensures AuthContext.profile is updated so Custodian can recognize the saved data.

#### 5. Updated UI Preview
Profile preview now reads from `AuthContext.profile` (after save) instead of only local state:
```typescript
{profile?.display_name || formData.display_name || 'Not set'}
{profile?.account_type || formData.account_type || 'Not set'}
{profile?.currency || formData.currency || 'Not set'}
```

## Final Payload Mapping

| Form Field | DB Column | Type | Example |
|------------|-----------|------|---------|
| Display Name | `display_name` | string \| null | "John Doe" |
| Goal | `account_type` | 'personal' \| 'business' \| 'both' | "both" |
| Currency | `currency` | string | "CAD" |
| Email | `email` | string \| null | "user@example.com" |
| User ID | `id` | uuid | (from AuthContext) |

## Test Checklist for Staging

### ✅ Pre-Save Tests
- [ ] Page loads without errors
- [ ] Form fields are pre-filled from existing profile (if available)
- [ ] Form fields are pre-filled from user metadata (if no profile)
- [ ] Display Name field accepts input
- [ ] Goal dropdown shows: Personal, Business, Both
- [ ] Currency dropdown shows: CAD, USD, EUR, GBP, AUD, JPY
- [ ] Profile Preview shows current form values

### ✅ Save Tests
- [ ] Click "Confirm & Save" with valid data
- [ ] Check browser console for payload log:
  ```
  [OnboardingSetupPage] Saving profile with payload keys: ['id', 'email', 'display_name', 'account_type', 'currency']
  ```
- [ ] Verify no 400 error occurs
- [ ] Verify success toast appears: "Profile saved successfully!"
- [ ] Verify profile is saved to Supabase (check Supabase dashboard)
- [ ] Verify `refreshProfile()` is called (check console for profile reload)

### ✅ Post-Save Tests
- [ ] After save, Profile Preview updates to show saved values from AuthContext
- [ ] Navigate to dashboard successfully
- [ ] Custodian recognizes saved profile:
  - Check console for: "Saved: Display Name = ___, Account Type = ___, Currency = ___."
  - Or verify Custodian can read from `AuthContext.profile`

### ✅ Error Handling Tests
- [ ] Try saving with empty Display Name → Should show validation error
- [ ] Simulate network error → Should show error toast with message
- [ ] Check console for detailed error logs (message, details, hint, code)

### ✅ Database Verification
Run in Supabase SQL Editor:
```sql
SELECT id, email, display_name, account_type, currency, updated_at
FROM profiles
WHERE id = '<your-user-id>'
ORDER BY updated_at DESC
LIMIT 1;
```

Expected result:
- `display_name` matches entered value
- `account_type` matches selected goal ('personal', 'business', or 'both')
- `currency` matches selected currency ('CAD', 'USD', etc.)
- `updated_at` is recent (just updated)

## Primary Key Check

To verify `onConflict: "id"` is safe, run:
```sql
SELECT 
  column_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'profiles'
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE');
```

**Expected:** `id` should show as PRIMARY KEY

If `id` is PRIMARY KEY, then `onConflict: "id"` is correct ✅

If `id` is not PRIMARY KEY, we may need to switch to "get-or-create then update" pattern.

## Notes

- The Profile interface in `profileHelpers.ts` has `account_mode` but the actual DB column is `account_type`. The interface uses `[key: string]: any` so it still works, but the payload must use `account_type`.
- Business name field is still in the form but not saved to the core profile (may be stored elsewhere or removed in future).
- After save, Custodian will recognize the profile via `AuthContext.profile` which is refreshed automatically.










