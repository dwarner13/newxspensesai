# Account Mode Toggle Test Steps

**Date**: 2025-01-20  
**Status**: Ready for Testing

---

## Prerequisites

1. ✅ Run migration: `supabase migration up` (or apply `20250120_add_account_mode.sql` manually)
2. ✅ Frontend dev server running: `npm run dev`
3. ✅ User logged in (not demo user)

---

## Test Steps

### Step 1: Verify Profile Button Navigation

1. Navigate to `/dashboard/settings`
2. Click the "Profile" button in Settings Unified Card
3. Should navigate to `/dashboard/settings/profile` without errors

**Expected Result**: ✅ Profile button navigates correctly, no duplicate onClick handlers

---

### Step 2: Verify Account Mode Toggle Appears

1. On Profile page, scroll to "Profile Basics" section
2. Look for "Account Mode" field with three buttons: Personal / Business / Both
3. Check that one button is highlighted (default should be "Both")

**Expected Result**: ✅ Account Mode toggle appears with 3 options, default is "Both"

---

### Step 3: Test Account Mode Toggle - Personal

1. Click "Personal" button
2. Verify button highlights (purple background)
3. Verify Business Name field disappears (if it was visible)
4. Click "Save Changes"
5. Refresh page
6. Verify "Personal" is still selected

**Expected Result**: ✅ Personal mode saves and persists

---

### Step 4: Test Account Mode Toggle - Business

1. Click "Business" button
2. Verify button highlights
3. Verify Business Name field appears
4. Enter a business name (e.g., "Acme Corp")
5. Click "Save Changes"
6. Refresh page
7. Verify "Business" is still selected
8. Verify business name persists

**Expected Result**: ✅ Business mode saves, business name field appears and persists

---

### Step 5: Test Account Mode Toggle - Both

1. Click "Both" button
2. Verify button highlights
3. Verify Business Name field appears (should be visible for "both")
4. Enter a business name (e.g., "My Business LLC")
5. Click "Save Changes"
6. Refresh page
7. Verify "Both" is still selected
8. Verify business name persists

**Expected Result**: ✅ Both mode saves, business name field appears and persists

---

### Step 6: Test Business Name Field Visibility

1. Set Account Mode to "Personal"
2. Verify Business Name field is hidden
3. Set Account Mode to "Business"
4. Verify Business Name field appears
5. Set Account Mode to "Both"
6. Verify Business Name field remains visible

**Expected Result**: ✅ Business Name field shows/hides correctly based on account_mode

---

### Step 7: Test Business Name Persistence

1. Set Account Mode to "Business"
2. Enter business name: "Test Business Inc"
3. Click "Save Changes"
4. Wait for success message
5. Refresh page
6. Verify business name is still "Test Business Inc"
7. Change Account Mode to "Personal"
8. Click "Save Changes"
9. Refresh page
10. Verify Account Mode is "Personal"
11. Change Account Mode back to "Business"
12. Verify business name is still "Test Business Inc" (should persist even when hidden)

**Expected Result**: ✅ Business name persists across mode changes

---

### Step 8: Database Verification

After saving, verify in database:

```sql
SELECT 
  id,
  account_mode,
  business_name,
  display_name,
  updated_at
FROM profiles
WHERE id = '<your-user-id>';
```

**Expected Result**: ✅ 
- `account_mode` matches selected value ('personal', 'business', or 'both')
- `business_name` matches entered value (or NULL if Personal mode)

---

## Common Issues & Solutions

### Issue: Account Mode toggle doesn't work
**Solution**: 
- Check browser console for errors
- Verify formData.account_mode is initialized correctly
- Check that onClick handlers are set correctly

### Issue: Business Name field doesn't appear
**Solution**: 
- Verify conditional rendering: `{(formData.account_mode === 'business' || formData.account_mode === 'both') && ...}`
- Check that account_mode state updates correctly

### Issue: Values don't persist after save
**Solution**: 
- Check browser console for save errors
- Verify migration was applied (columns exist)
- Check RLS policies allow UPDATE
- Verify save function includes account_mode and business_name in update

### Issue: Profile button has duplicate onClick
**Solution**: 
- Check SettingsUnifiedCard.tsx - Profile button should have exactly ONE onClick
- Remove any conflicting handlers

---

## Success Criteria

✅ Profile button navigates correctly (single onClick handler)  
✅ Account Mode toggle appears with 3 options  
✅ Toggle works (Personal/Business/Both)  
✅ Business Name field appears when mode is Business or Both  
✅ Business Name field hides when mode is Personal  
✅ Account Mode saves correctly  
✅ Business Name saves correctly  
✅ Values persist after refresh  
✅ Database columns updated correctly  

---

## Quick Test Checklist

- [ ] Profile button navigates to `/dashboard/settings/profile`
- [ ] Account Mode toggle visible with 3 options
- [ ] Default mode is "Both"
- [ ] Clicking "Personal" highlights button, hides Business Name
- [ ] Clicking "Business" highlights button, shows Business Name
- [ ] Clicking "Both" highlights button, shows Business Name
- [ ] Save works for all modes
- [ ] Values persist after refresh
- [ ] Database shows correct account_mode and business_name

---

**END OF TEST STEPS**
















