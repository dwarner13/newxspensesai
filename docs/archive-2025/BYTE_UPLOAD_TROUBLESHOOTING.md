# Byte Upload Troubleshooting Guide

## Issue: Byte will not upload any files

This guide helps diagnose and fix issues with Byte file uploads.

## Common Causes & Solutions

### 1. Missing Storage Bucket "docs" ⚠️ **MOST COMMON**

**Problem**: The Supabase Storage bucket "docs" doesn't exist.

**Symptoms**:
- Upload starts but fails immediately
- Error message: "The related resource does not exist" or "bucket does not exist"
- Console error: `Storage error for bucket "docs"`

**Solution**:
1. Go to your Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Click **New Bucket**
4. Name it exactly: `docs` (lowercase)
5. Make it **Public** (or configure RLS policies if needed)
6. Click **Create Bucket**

**Verification**: Try uploading again after creating the bucket.

---

### 2. Missing Database Table `user_documents`

**Problem**: The `user_documents` table hasn't been created.

**Symptoms**:
- Error: "Failed to create user_documents record"
- Error code: `42P01` (relation does not exist)

**Solution**:
1. Check if migration `20250205_fix_user_documents_schema.sql` has been run
2. Run the clean SQL file `fix_user_documents_clean.sql` in Supabase SQL Editor (no comments, avoids syntax errors)
3. Verify table exists:
   ```sql
   SELECT * FROM user_documents LIMIT 1;
   ```

---

### 2b. Demo User Foreign Key Error ⚠️ **FIXED**

**Problem**: Demo user doesn't exist in `auth.users`, causing foreign key constraint violation.

**Symptoms**:
- Error: `"insert or update on table \"imports\" violates foreign key constraint \"imports_user_id_fkey\""`
- Error code: `23503`
- Details: `"Key (user_id)=(00000000-0000-4000-8000-000000000001) is not present in table \"users\""`

**Solution**: ✅ **FIXED** - The code now skips creating `imports` records for demo users. Uploads will work, but import tracking won't be available for demo users.

**Note**: If you want full functionality for demo users, create the demo user in `auth.users` using Supabase Auth Admin API.

---

### 3. Missing `onUploadFiles` Prop

**Problem**: The `ByteUnifiedCard` component isn't receiving the upload function.

**Symptoms**:
- Toast error: "Upload function not available"
- Console error: `[ByteUnifiedCard] onUploadFiles prop is missing!`

**Solution**:
- Check that `SmartImportChatPage` is passing `uploadFiles` to `ByteUnifiedCard`
- Verify `useSmartImport()` hook is working correctly
- Check browser console for React prop warnings

**Code Location**: `src/pages/dashboard/SmartImportChatPage.tsx` line 82

---

### 4. Missing User ID

**Problem**: User is not authenticated or `userId` is null.

**Symptoms**:
- Upload button is disabled (grayed out)
- Toast error: "Please log in to upload files"
- Console log shows `userId: null`

**Solution**:
- Ensure user is logged in OR demo user is enabled
- Check `AuthContext` is providing `userId`
- Verify `useAuth()` hook returns valid `userId`

**Code Location**: `src/components/smart-import/ByteUnifiedCard.tsx` line 93

---

### 5. Network/API Errors

**Problem**: Netlify functions are failing or not accessible.

**Symptoms**:
- Upload progress stops at a certain percentage
- Network errors in browser console
- 500 errors from Netlify functions

**Solution**:
1. Check browser Network tab for failed requests:
   - `/.netlify/functions/smart-import-init`
   - `/.netlify/functions/smart-import-finalize`
2. Check Netlify function logs for errors
3. Verify environment variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Test functions directly:
   ```bash
   curl -X POST http://localhost:8888/.netlify/functions/smart-import-init \
     -H "Content-Type: application/json" \
     -d '{"userId":"test","filename":"test.pdf","mime":"application/pdf"}'
   ```

---

### 6. File Validation Issues

**Problem**: Files are being rejected by validation.

**Symptoms**:
- Files selected but upload doesn't start
- Toast error about file type or size
- Console warnings about invalid files

**Solution**:
- Check file types are supported: `.pdf`, `.csv`, `.xlsx`, `.xls`, `.jpg`, `.jpeg`, `.png`, `.heic`
- Check file size is under 10MB
- Verify file isn't corrupted

**Code Location**: `src/components/smart-import/ByteUnifiedCard.tsx` line 249

---

## Diagnostic Steps

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Look for errors starting with `[ByteUnifiedCard]` or `[useSmartImport]`
4. Note any error messages

### Step 2: Check Network Tab
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try uploading a file
4. Look for failed requests (red status codes)
5. Check request/response details

### Step 3: Check Supabase Storage
1. Go to Supabase Dashboard
2. Navigate to **Storage** → **Buckets**
3. Verify `docs` bucket exists
4. Check bucket permissions

### Step 4: Check Database
1. Go to Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run:
   ```sql
   SELECT * FROM user_documents ORDER BY created_at DESC LIMIT 5;
   ```
4. If table doesn't exist, run the migration

### Step 5: Check Netlify Functions
1. Go to Netlify Dashboard
2. Navigate to **Functions** tab
3. Check logs for `smart-import-init` and `smart-import-finalize`
4. Look for error messages

---

## Quick Fix Checklist

- [ ] Storage bucket "docs" exists in Supabase
- [ ] `user_documents` table exists in database
- [ ] User is authenticated (or demo user enabled)
- [ ] Netlify functions are deployed and accessible
- [ ] Environment variables are set correctly
- [ ] File types are supported
- [ ] File size is under 10MB
- [ ] Browser console shows no errors
- [ ] Network requests are succeeding

---

## Still Not Working?

1. **Check the exact error message** in browser console
2. **Check Netlify function logs** for server-side errors
3. **Verify all environment variables** are set correctly
4. **Test with a simple file** (small PDF or CSV)
5. **Check Supabase logs** for database errors

---

## Code References

- Upload hook: `src/hooks/useSmartImport.ts`
- Byte component: `src/components/smart-import/ByteUnifiedCard.tsx`
- Page component: `src/pages/dashboard/SmartImportChatPage.tsx`
- Init function: `netlify/functions/smart-import-init.ts`
- Finalize function: `netlify/functions/smart-import-finalize.ts`
- Upload utilities: `netlify/functions/_shared/upload.ts`
- Database migration: `supabase/migrations/20250205_fix_user_documents_schema.sql`

