# Profile Page Test Steps

**Date**: 2025-01-20  
**Status**: Ready for Testing

---

## Prerequisites

1. ✅ Run migration: `supabase migration up` (or apply `20250120_add_profile_fields.sql` manually)
2. ✅ Frontend dev server running: `npm run dev`
3. ✅ User logged in (not demo user)

---

## Test Steps

### Step 1: Navigate to Profile Page

1. Login to the application
2. Navigate to `/dashboard/settings`
3. Click the "Profile" button in the Settings Unified Card
4. Should navigate to `/dashboard/settings/profile`

**Expected Result**: ✅ Profile page loads without errors

---

### Step 2: Verify Profile Loads

1. Check that profile data displays:
   - Display Name field populated (or empty)
   - Account Name field populated (or empty)
   - Avatar URL field (may be empty)
   - Timezone field (may be empty)
   - Currency dropdown shows current value (defaults to USD)
   - Date Locale dropdown shows current value (defaults to en-US)
   - Role field shows current role (read-only)
   - Plan field shows current plan (read-only)

**Expected Result**: ✅ All fields display correctly, read-only fields are disabled

---

### Step 3: Test Profile Creation (if missing)

1. If profile doesn't exist yet:
   - Page should automatically create profile
   - Console should show: `✅ AuthContext: Profile created successfully`
   - Profile fields should populate with defaults

**Expected Result**: ✅ Profile auto-created if missing

---

### Step 4: Test Custodian Suggestions

1. If any fields are empty, check for "Smart Profile (Custodian Suggestions)" panel
2. Suggestions should appear for:
   - Currency (if timezone suggests Canada)
   - Display Name (if empty, derived from email)
   - Timezone (if empty, from browser)
   - Date Locale (if empty, from browser)
3. Click "Apply" on a suggestion
4. Field should update in form (but NOT saved yet)

**Expected Result**: ✅ Suggestions appear, Apply button updates form state only

---

### Step 5: Edit Profile Fields

1. Edit "Display Name" field
2. Edit "Account Name" field
3. Edit "Avatar URL" field (optional)
4. Change "Timezone" field
5. Change "Currency" dropdown
6. Change "Date Locale" dropdown

**Expected Result**: ✅ All fields are editable, changes reflect in form state

---

### Step 6: Save Profile

1. Click "Save Changes" button
2. Should show loading state ("Saving...")
3. Should show success toast: "Profile saved successfully"
4. Page should reload profile data

**Expected Result**: ✅ Profile saves successfully, success message appears

---

### Step 7: Verify Persistence

1. Refresh the page (F5 or navigate away and back)
2. Check that all saved values persist:
   - Display Name matches what you saved
   - Account Name matches what you saved
   - Currency matches what you selected
   - Date Locale matches what you selected
   - Timezone matches what you entered

**Expected Result**: ✅ All saved values persist after refresh

---

### Step 8: Test Read-Only Fields

1. Try to edit "Role" field - should be disabled
2. Try to edit "Plan" field - should be disabled
3. Check that these fields show current values but cannot be changed

**Expected Result**: ✅ Role and Plan fields are read-only (disabled)

---

### Step 9: Test Cancel Button

1. Make some changes to form fields
2. Click "Cancel" button
3. Should navigate back to `/dashboard/settings`
4. Changes should NOT be saved

**Expected Result**: ✅ Cancel navigates back without saving

---

### Step 10: Test Error Handling

1. Disconnect from internet (or stop Supabase)
2. Try to save profile
3. Should show error toast: "Failed to save profile"

**Expected Result**: ✅ Error handling works, user sees error message

---

## Database Verification

After saving, verify in database:

```sql
SELECT 
  id,
  email,
  display_name,
  account_name,
  avatar_url,
  time_zone,
  currency,
  date_locale,
  role,
  plan,
  updated_at
FROM profiles
WHERE id = '<your-user-id>';
```

**Expected Result**: ✅ All fields match what you saved in the UI

---

## Common Issues & Solutions

### Issue: "relation profiles does not exist"
**Solution**: Run migration `20250120_add_profile_fields.sql`

### Issue: "permission denied for table profiles"
**Solution**: Check RLS policies are correct, ensure user is authenticated

### Issue: Profile not loading
**Solution**: 
- Check browser console for errors
- Verify user is logged in (not demo user)
- Check Supabase connection

### Issue: Suggestions not appearing
**Solution**: 
- Ensure profile has empty fields
- Check browser console for suggestion generation errors
- Verify Intl API is available

### Issue: Save button doesn't work
**Solution**:
- Check browser console for errors
- Verify RLS policies allow UPDATE
- Ensure user ID matches profile ID

---

## Success Criteria

✅ Profile page accessible at `/dashboard/settings/profile`  
✅ Profile loads from database  
✅ Profile auto-created if missing  
✅ Custodian suggestions appear for empty fields  
✅ Suggestions can be applied to form  
✅ All fields are editable (except role/plan)  
✅ Save button persists changes  
✅ Changes persist after refresh  
✅ Role and Plan are read-only  
✅ Cancel button navigates back  

---

## Next Steps

After this page works:
1. ✅ Test all scenarios above
2. ✅ Fix any issues found
3. ✅ Prepare for Custodian AI upgrade (next phase)

---

**END OF TEST STEPS**
















