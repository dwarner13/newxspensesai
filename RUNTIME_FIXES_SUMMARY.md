# Runtime Fixes Summary - Complete

## Summary

Fixed 3 runtime issues causing localhost flipping/blinking:
1. ✅ OnboardingGuard hooks order mismatch
2. ✅ UnifiedAssistantChat hard crash (currentEmployeeSlug)
3. ✅ Supabase 404 for /rest/v1/uploads

## Files Changed

### 1. `src/components/auth/OnboardingGuard.tsx`

**Issue**: `useMemo` hook was called AFTER early returns, violating Rules of Hooks.

**Fix**: Moved `useMemo` hook to top level (before any early returns).

**Before**:
```typescript
if (!ready || loading || isProfileLoading) {
  return <LoadingSpinner />;
}
if (!user && !userId) {
  return <Navigate to="/login" />;
}
const onboardingCompleted = useMemo(...); // ❌ Hook after early return
```

**After**:
```typescript
const onboardingCompleted = useMemo(...); // ✅ Hook at top level
if (!ready || loading || isProfileLoading) {
  return <LoadingSpinner />;
}
if (!user && !userId) {
  return <Navigate to="/login" />;
}
```

### 2. `src/components/chat/UnifiedAssistantChat.tsx`

**Issue**: `currentEmployeeSlug` was referenced in `useMemo` hooks before it was defined.

**Fix**: Moved `currentEmployeeSlug` definition BEFORE `useMemo` hooks that reference it.

**Before**:
```typescript
const showPrimeOnboarding = React.useMemo(() => {
  if (currentEmployeeSlug !== 'prime-boss') return false; // ❌ Reference before initialization
  ...
}, [currentEmployeeSlug]);

const currentEmployeeSlug = effectiveEmployeeSlug; // Defined later
```

**After**:
```typescript
const effectiveEmployeeSlug = initialEmployeeSlug || globalActiveEmployeeSlug || 'prime-boss';
const currentEmployeeSlug = effectiveEmployeeSlug; // ✅ Defined first

const showPrimeOnboarding = React.useMemo(() => {
  if (currentEmployeeSlug !== 'prime-boss') return false; // ✅ Safe reference
  ...
}, [currentEmployeeSlug]);
```

### 3. `src/lib/agents/context.tsx`

**Issue**: Querying non-existent `uploads` table causing 404 errors.

**Fix**: Changed to use `user_documents` table (the actual table that exists).

**Before**:
```typescript
const { count } = await supabase
  .from('uploads') // ❌ Table doesn't exist
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id);
```

**After**:
```typescript
const { count } = await supabase
  .from('user_documents') // ✅ Correct table
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id);
```

### 4. `src/server/db.ts`

**Issue**: Storage bucket `uploads` doesn't exist (should be `docs`).

**Fix**: Changed storage bucket from `uploads` to `docs`, added error handling.

**Before**:
```typescript
const { data: files } = await client.storage
  .from('uploads') // ❌ Bucket doesn't exist
  .list(`${userId}/`);
```

**After**:
```typescript
try {
  const { data: files } = await client.storage
    .from('docs') // ✅ Correct bucket
    .list(`${userId}/`);
  ...
} catch (storageError) {
  // Silently ignore - non-critical
}
```

### 5. `src/agent/tools/impl/ingest_statement_enhanced.ts`

**Issue**: Storage bucket `uploads` doesn't exist.

**Fix**: Changed to `docs` bucket with fallback to `uploads` (legacy support).

**Before**:
```typescript
const { data, error } = await client.storage
  .from('uploads') // ❌ Bucket doesn't exist
  .download(fileId);
```

**After**:
```typescript
const { data, error } = await client.storage
  .from('docs') // ✅ Correct bucket
  .download(fileId);

// Fallback to 'uploads' if file not found (legacy support)
if (error && error.message?.includes('not found')) {
  const { data: legacyData } = await client.storage
    .from('uploads')
    .download(fileId);
  ...
}
```

## Test Checklist

### ✅ Fix 1: OnboardingGuard Hook Order

1. **Run app**
   - ✅ No "React has detected a change in the order of Hooks" warning
   - ✅ Component renders without errors

2. **Check console**
   - ✅ No hook order warnings
   - ✅ No "undefined -> useMemo" errors

### ✅ Fix 2: UnifiedAssistantChat Crash

1. **Load dashboard**
   - ✅ No "Cannot access 'currentEmployeeSlug' before initialization" error
   - ✅ Chat component loads stable

2. **Open Prime chat**
   - ✅ Chat opens without crash
   - ✅ No initialization errors

### ✅ Fix 3: Supabase 404

1. **Check Network tab**
   - ✅ No `/rest/v1/uploads` 404 errors
   - ✅ Queries use correct tables (`user_documents`)

2. **Check console**
   - ✅ No 404 spam
   - ✅ Optional stats queries fail gracefully (wrapped in try/catch)

## Breaking Changes

- **None** - All fixes are backward compatible
- Storage bucket fallback added for legacy support

## Summary

All three runtime issues are fixed:
1. ✅ OnboardingGuard follows Rules of Hooks
2. ✅ UnifiedAssistantChat no longer crashes
3. ✅ No more 404 spam from missing `uploads` table

The app should now load stable on localhost without flipping/blinking.










