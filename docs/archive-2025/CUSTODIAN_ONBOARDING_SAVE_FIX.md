# Custodian Onboarding Save Fix

## Problem
The onboarding setup page needed to reliably save profile data and mark onboarding as complete, storing completion flags in `metadata` JSONB column (not as separate columns) to avoid schema changes.

## Solution

### File Modified
- `src/pages/onboarding/OnboardingSetupPage.tsx`

### Changes Made

#### 1. Fixed Payload Mapping (Only Real DB Columns)
**Payload now includes:**
- `id`: user.id (uuid)
- `email`: user.email (string | null)
- `display_name`: trimmed string | null
- `account_type`: 'personal' | 'business' | 'both'
- `currency`: string like "CAD"
- `metadata`: JSONB object with merged onboarding flags

#### 2. Added Onboarding Completion in Metadata
**Before:** No completion tracking
**After:** Stores completion flags in `metadata` JSONB:
```typescript
metadata: {
  ...existingMetadata,  // Preserves existing metadata
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
}
```

**Key points:**
- Merges with existing metadata (doesn't overwrite)
- Fetches existing metadata from profile or database if not available
- Uses metadata JSONB column (no schema changes needed)

#### 3. Enhanced Error Logging
**Now logs:**
- `error.message`
- `error.details`
- `error.hint`
- `error.code`
- `payloadKeys`: Array of keys being sent

**Example console output:**
```javascript
[OnboardingSetupPage] Failed to save profile: {
  message: "...",
  details: "...",
  hint: "...",
  code: "...",
  payloadKeys: ["id", "email", "display_name", "account_type", "currency", "metadata"]
}
```

#### 4. Post-Save Actions
**After successful save:**
1. ✅ Calls `await refreshProfile()` - Updates AuthContext so Custodian can recognize saved data
2. ✅ Shows success toast: "Profile saved successfully!"
3. ✅ Redirects to `/dashboard`

#### 5. Prevent Restarting Onboarding
**Added check on mount:**
- Checks if `metadata.onboarding_completed === true`
- If completed, redirects to `/dashboard` immediately
- Prevents users from restarting onboarding after completion

## Final Payload Structure

```typescript
{
  id: string,                    // uuid from AuthContext.userId
  email: string | null,          // user.email
  display_name: string | null,   // trimmed form input
  account_type: 'personal' | 'business' | 'both',  // form selection
  currency: string,              // "CAD", "USD", etc.
  metadata: {                    // JSONB - merged with existing
    ...existingMetadata,
    onboarding_completed: true,
    onboarding_completed_at: "2024-01-20T12:34:56.789Z"
  }
}
```

## Columns Written to Database

| Column | Type | Source | Example |
|--------|------|--------|---------|
| `id` | uuid | `user.id` | `"123e4567-e89b-12d3-a456-426614174000"` |
| `email` | text \| null | `user.email` | `"user@example.com"` |
| `display_name` | text \| null | Form input (trimmed) | `"John Doe"` |
| `account_type` | text | Form selection | `"both"` |
| `currency` | text | Form selection | `"CAD"` |
| `metadata` | jsonb | Merged object | `{"onboarding_completed": true, "onboarding_completed_at": "2024-01-20T12:34:56.789Z"}` |

## Test Checklist for Staging

### ✅ Pre-Save Tests
- [ ] Open staging → sign in
- [ ] Navigate to onboarding setup page (`/onboarding/setup`)
- [ ] Verify form loads without errors
- [ ] Verify Display Name field accepts input
- [ ] Verify Goal dropdown shows: Personal, Business, Both
- [ ] Verify Currency dropdown shows: CAD, USD, EUR, GBP, AUD, JPY
- [ ] Verify Profile Preview shows current form values

### ✅ Save Tests
- [ ] Enter Display Name: "Test User"
- [ ] Select Goal: "both"
- [ ] Select Currency: "CAD"
- [ ] Click "Confirm & Save"
- [ ] **Verify:** No error toast appears
- [ ] **Verify:** Success toast appears: "Profile saved successfully!"
- [ ] **Verify:** Console shows payload log:
  ```
  [OnboardingSetupPage] Saving profile with payload keys: ['id', 'email', 'display_name', 'account_type', 'currency', 'metadata']
  ```
- [ ] **Verify:** Redirects to `/dashboard` automatically

### ✅ Post-Save Verification
- [ ] **Verify:** Dashboard loads successfully
- [ ] **Verify:** Dashboard greets with display_name (e.g., "Welcome, Test User!")
- [ ] **Verify:** Custodian recognizes saved profile:
  - Check console for profile refresh
  - Verify `AuthContext.profile` contains saved data
  - Custodian should be able to read: "Saved: Display Name = Test User, Account Type = both, Currency = CAD"

### ✅ Onboarding Completion Check
- [ ] Refresh the onboarding setup page (`/onboarding/setup`)
- [ ] **Verify:** Page redirects to `/dashboard` immediately (does NOT restart onboarding)
- [ ] **Verify:** Console shows: `[OnboardingSetupPage] Onboarding already completed, redirecting to dashboard`

### ✅ Database Verification
Run in Supabase SQL Editor:
```sql
SELECT 
  id,
  email,
  display_name,
  account_type,
  currency,
  metadata->>'onboarding_completed' as onboarding_completed,
  metadata->>'onboarding_completed_at' as onboarding_completed_at,
  updated_at
FROM profiles
WHERE id = '<your-user-id>'
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected result:**
- `display_name` = "Test User" (or your entered value)
- `account_type` = "both" (or your selected value)
- `currency` = "CAD" (or your selected value)
- `metadata->>'onboarding_completed'` = "true"
- `metadata->>'onboarding_completed_at'` = recent ISO timestamp
- `updated_at` = recent timestamp

### ✅ Error Handling Tests
- [ ] Try saving with empty Display Name → Should show validation error
- [ ] Simulate network error → Should show error toast with detailed message
- [ ] Check console for detailed error logs (message, details, hint, code, payloadKeys)

## Code Diff Summary

### Key Changes in `handleSave()`:

1. **Metadata Fetching & Merging:**
```typescript
// Get existing metadata to merge (don't overwrite)
let existingMetadata: Record<string, any> = {};
if (profile?.metadata && typeof profile.metadata === 'object') {
  existingMetadata = { ...profile.metadata };
} else {
  // Try to fetch existing metadata if not in profile
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('metadata')
    .eq('id', userId)
    .maybeSingle();
  
  if (existingProfile?.metadata && typeof existingProfile.metadata === 'object') {
    existingMetadata = { ...existingProfile.metadata };
  }
}

// Merge onboarding completion flags into metadata
const mergedMetadata = {
  ...existingMetadata,
  onboarding_completed: true,
  onboarding_completed_at: new Date().toISOString(),
};
```

2. **Payload with Metadata:**
```typescript
const payload = {
  id: userId,
  email: user.email || null,
  display_name: formData.display_name.trim() || null,
  account_type: formData.account_type,
  currency: formData.currency,
  metadata: mergedMetadata,  // ✅ Added metadata
};
```

3. **Enhanced Error Logging:**
```typescript
console.error('[OnboardingSetupPage] Failed to save profile:', {
  message: error.message,
  details: error.details,
  hint: error.hint,
  code: error.code,
  payloadKeys: Object.keys(payload),
});
```

4. **Post-Save Actions:**
```typescript
await refreshProfile();  // ✅ Refresh AuthContext
toast.success('Profile saved successfully!');
navigate('/dashboard');  // ✅ Redirect
```

### Key Changes in `useEffect()`:

**Added onboarding completion check:**
```typescript
// Check if onboarding is already completed (in metadata)
const isCompleted = profile?.metadata && 
  typeof profile.metadata === 'object' && 
  (profile.metadata as any)?.onboarding_completed === true;

if (isCompleted) {
  console.log('[OnboardingSetupPage] Onboarding already completed, redirecting to dashboard');
  navigate('/dashboard', { replace: true });
  return;
}
```

## Notes

- **No Schema Changes Required:** Uses existing `metadata` JSONB column
- **Metadata Preservation:** Merges with existing metadata, doesn't overwrite
- **Custodian Recognition:** After `refreshProfile()`, Custodian can read saved data from `AuthContext.profile`
- **Prevents Restart:** Checks `metadata.onboarding_completed` on mount and redirects if true
- **Error Visibility:** Comprehensive logging helps debug any save failures

## Quick Test Checklist (After Deploy)

1. ✅ Open staging → sign in
2. ✅ Go to onboarding setup
3. ✅ Enter Display Name + choose Goal + Currency
4. ✅ Click Confirm & Save
5. ✅ **No error toast** ✅
6. ✅ Refresh page → **Should NOT restart onboarding** ✅
7. ✅ Dashboard greets with display_name ✅










