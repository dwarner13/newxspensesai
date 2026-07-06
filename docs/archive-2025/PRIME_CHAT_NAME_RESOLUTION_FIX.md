# Prime Chat User Name Resolution Fix

## Summary

Fixed Prime chat greeting to properly resolve and display user's real name instead of `{firstName}` placeholder or email address.

## Root Cause

1. **Config placeholder**: `src/config/employeeChatConfig.ts` line 62 had hardcoded `'Hi {firstName} — I\'m Prime...'`
2. **Inconsistent name resolution**: Multiple components had different fallback logic, some falling back to email prefix
3. **Backend missing name context**: Chat endpoint didn't inject user name context into system prompts

## Changes Made

### 1. Created Name Resolution Helper
**File**: `src/lib/user/resolveDisplayName.ts` (NEW)

- Single source of truth for name resolution
- Priority: `profiles.display_name` → `profiles.first_name` → `profiles.full_name` → `user.user_metadata.full_name/name` → `null`
- **Never returns email local-part as name**
- Provides both `displayName` and `firstName` (first token of displayName)

### 2. Updated Prime Greeting Config
**File**: `src/config/employeeChatConfig.ts`

- Removed `{firstName}` placeholder from Prime config (Prime greeting handled separately via `buildPrimeGreeting()`)
- Commented out the placeholder line

### 3. Updated Prime Greeting Builder
**File**: `src/components/chat/greetings/primeGreeting.ts`

- Removed email prefix fallback from `getDisplayName()`
- Now falls back to `'there'` instead of email

### 4. Updated UnifiedAssistantChat
**File**: `src/components/chat/UnifiedAssistantChat.tsx`

- For non-Prime employees: Uses `resolveDisplayNameSync()` to replace `{firstName}` placeholder
- For Prime: Already uses `buildPrimeGreeting()` which handles name correctly

### 5. Updated PrimeWelcomeCard
**File**: `src/components/chat/PrimeWelcomeCard.tsx`

- Replaced email prefix fallback with `resolveDisplayNameSync()`
- Never shows email as name

### 6. Updated PrimeOnboardingWelcome
**File**: `src/components/chat/PrimeOnboardingWelcome.tsx`

- Replaced email prefix fallback with `resolveDisplayNameSync()`
- Never shows email as name

### 7. Updated Backend Chat Endpoint
**File**: `netlify/functions/chat.ts`

- Added user name context injection to system messages
- Informs AI: "Address the user as [firstName]. NEVER show their email address as their name."
- Falls back to "there" if name unavailable

## Files Changed

1. ✅ `src/lib/user/resolveDisplayName.ts` (NEW)
2. ✅ `src/config/employeeChatConfig.ts`
3. ✅ `src/components/chat/greetings/primeGreeting.ts`
4. ✅ `src/components/chat/UnifiedAssistantChat.tsx`
5. ✅ `src/components/chat/PrimeWelcomeCard.tsx`
6. ✅ `src/components/chat/PrimeOnboardingWelcome.tsx`
7. ✅ `netlify/functions/chat.ts`

## Verification Checklist

### Test 1: New User Sign Up
1. Sign up with a new account
2. Set `display_name` in profile to "Darrell Warner"
3. Open Prime Chat
4. **Expected**: Greeting shows "Hi Darrell — I'm Prime."
5. **NOT Expected**: `{firstName}` placeholder or email address

### Test 2: Page Refresh
1. With user signed in and name set
2. Open Prime Chat (verify greeting shows name)
3. Refresh page (F5)
4. **Expected**: Greeting still shows "Hi Darrell — I'm Prime."
5. **NOT Expected**: Placeholder or email

### Test 3: Sign Out / Sign In
1. Sign out
2. Sign back in
3. Open Prime Chat
4. **Expected**: Greeting shows correct name
5. **NOT Expected**: Placeholder or email

### Test 4: Missing Profile Row
1. Create user account but don't set any name fields
2. Open Prime Chat
3. **Expected**: Greeting shows "Hi there — I'm Prime."
4. **NOT Expected**: Email address or `{firstName}` placeholder

### Test 5: Email Never Shown as Name
1. Sign in with email "test@example.com"
2. Don't set any name fields in profile
3. Open Prime Chat
4. **Expected**: Greeting shows "Hi there — I'm Prime."
5. **NOT Expected**: "Hi test — I'm Prime." (email prefix)

### Test 6: Backend Context Injection
1. Open browser DevTools → Network tab
2. Send a message to Prime Chat
3. Check `/chat` request/response
4. **Expected**: System message includes "Address the user as [firstName]"
5. **Expected**: System message includes "NEVER show their email address as their name"

## Code Diffs

### resolveDisplayName.ts (NEW)
```typescript
export async function resolveDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolvedName> {
  // Priority: display_name → first_name → full_name → user_metadata → null
  // NEVER returns email local-part
}
```

### employeeChatConfig.ts
```diff
- openGreeting: 'Hi {firstName} — I\'m Prime. What would you like to work on right now?',
+ // openGreeting is handled by buildPrimeGreeting() - no placeholder needed
+ // openGreeting: 'Hi {firstName} — I\'m Prime. What would you like to work on right now?',
```

### primeGreeting.ts
```diff
- function getDisplayName(options: PrimeGreetingOptions): string {
-   return (
-     profile?.display_name?.trim() ||
-     profile?.first_name?.trim() ||
-     profile?.full_name?.trim() ||
-     firstName ||
-     (userEmail ? userEmail.split('@')[0] : null) ||  // REMOVED
-     'there'
-   );
+ function getDisplayName(options: PrimeGreetingOptions): string {
+   return (
+     profile?.display_name?.trim() ||
+     profile?.first_name?.trim() ||
+     profile?.full_name?.trim() ||
+     firstName ||
+     'there'  // Never email prefix
+   );
}
```

### UnifiedAssistantChat.tsx
```diff
- const userContext = buildUserContextFromProfile(profile, firstName, displayName || 'there');
- const employeeName = userContext.preferredName;
- finalGreetingText = finalGreetingText.replace(/\{firstName\}/g, employeeName);
+ const resolvedName = resolveDisplayNameSync(profile, user);
+ const userName = resolvedName.firstName ?? 'there';
+ finalGreetingText = finalGreetingText.replace(/\{firstName\}/g, userName);
```

### chat.ts (Backend)
```diff
+ // Add user name context (CRITICAL: Never show email as name)
+ if (userProfile?.preferredName) {
+   const firstName = userProfile.preferredName.split(' ')[0] || userProfile.preferredName;
+   mergedUserContext += `\n\n**User Name Context (IMPORTANT):**
+- User display name: ${userProfile.preferredName}
+- Address the user as "${firstName}" in greetings and responses
+- NEVER show their email address as their name
+- If name is missing or unavailable, address them as "there"`;
+ }
```

## Notes

- All changes maintain existing UI layout/styling (no redesign)
- No new agents introduced
- Works across page refreshes (name resolution is synchronous from profile/auth)
- Backend injection ensures AI never uses email as name
- Fallback to "there" is consistent across all components



