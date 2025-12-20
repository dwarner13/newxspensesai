# Guest Mode Implementation Summary

**Date:** January 22, 2025  
**Status:** ✅ Complete

## Overview

Implemented "Continue as Guest" functionality for localhost demo mode. Guest sessions persist across page refreshes and allow users to access the dashboard without Supabase auth or Netlify functions.

## Files Changed

### 1. Demo Auth Utility
**File:** `src/lib/demoAuth.ts` (NEW)
- `isDemoMode()` - Checks if demo mode is enabled (localhost or `VITE_DEMO_MODE=true`)
- `setGuestSession()` - Stores guest session in localStorage
- `getGuestSession()` - Retrieves guest session from localStorage
- `clearGuestSession()` - Removes guest session
- `isGuestSession()` - Checks if guest session exists
- `createGuestUser()` - Creates user object compatible with AuthContext

### 2. Auth Context Updates
**File:** `src/contexts/AuthContext.tsx`
- Added import for `demoAuth` utilities
- Updated `checkSession()` to check for guest session FIRST before Supabase
- Updated `signOut()` to clear guest session and navigate to login

### 3. Login Page Updates
**File:** `src/pages/LoginPage.tsx`
- Updated "Continue as Guest" button to use `isDemoMode()` instead of `import.meta.env.DEV`
- Button now calls `setGuestSession()` before navigating to dashboard

### 4. Auth Guard Updates
**File:** `src/components/auth/AuthGuard.tsx`
- Added import for `demoAuth` utilities
- Updated to accept guest sessions (checks `userId` in addition to `user`)
- Skips session validation for guest sessions

### 5. Chat Fallback
**File:** `src/ui/hooks/useStreamChat.ts`
- Added guest mode check before making chat API calls
- Returns mock response: "Guest mode is enabled. Connect Supabase/Netlify to use full AI features."
- Prevents hard failures when Netlify functions aren't available

### 6. Guest Mode Badge
**File:** `src/components/ui/GuestModeBadge.tsx` (NEW)
- Small badge component showing "Guest Mode" indicator
- Only visible when guest session is active

### 7. Dashboard Header Updates
**File:** `src/components/ui/DashboardHeader.tsx`
- Added `GuestModeBadge` component next to AI status indicator

## How It Works

### Demo Mode Detection
Demo mode is enabled when:
- `window.location.hostname === 'localhost'` OR
- `VITE_DEMO_MODE === 'true'`

### Guest Session Flow

1. **User clicks "Continue as Guest"**
   - `setGuestSession()` stores session in localStorage
   - Navigates to `/dashboard`

2. **AuthContext checks session**
   - First checks for guest session in localStorage
   - If found, creates guest user object and sets auth state
   - If not found, falls back to Supabase session check

3. **Page refresh**
   - Guest session persists via localStorage
   - AuthContext loads guest session on mount
   - User stays logged in as guest

4. **Logout**
   - Clears guest session from localStorage
   - Clears Supabase session (if any)
   - Navigates to login page

### Guest User Object

```typescript
{
  id: '00000000-0000-4000-8000-000000000001', // or VITE_DEMO_USER_ID
  email: 'guest@xspensesai.local',
  user_metadata: {
    full_name: 'Guest',
    name: 'Guest',
  }
}
```

## Chat Fallback

When guest mode is active:
- Chat API calls are intercepted before reaching Netlify functions
- Returns mock response: "Guest mode is enabled. Connect Supabase/Netlify to use full AI features."
- Prevents errors when backend isn't available

## UI Indicators

- **Guest Mode Badge**: Small amber badge in dashboard header showing "Guest Mode"
- Only visible when guest session is active
- Positioned next to AI status indicator

## Route Protection

All route guards updated to accept:
- Real Supabase session OR
- Guest session (via `userId` check)

## Production Safety

- Guest mode ONLY works on localhost or when `VITE_DEMO_MODE=true`
- Staging/production unchanged - requires real auth
- No production routes modified incorrectly

## Testing Checklist

✅ On localhost, click "Continue as Guest" → lands on dashboard  
✅ Refresh page → still in dashboard (guest session persists)  
✅ "Logout" clears guest session and returns to login  
✅ Staging/production behavior unchanged  
✅ Guest Mode badge visible in header  
✅ Chat shows mock response instead of failing  

## Enabling Demo Mode

### Option 1: Automatic (localhost)
Just run on localhost - demo mode is automatically enabled.

### Option 2: Explicit Flag
Set environment variable:
```bash
VITE_DEMO_MODE=true npm run dev
```

Or in `.env.local`:
```
VITE_DEMO_MODE=true
```

## Notes

- Guest session stored in localStorage key: `xspensesai_guest_session`
- Guest user ID: `00000000-0000-4000-8000-000000000001` (or `VITE_DEMO_USER_ID` if set)
- Guest email: `guest@xspensesai.local`
- Guest name: `Guest`
- Chat fallback prevents hard failures but doesn't provide real AI features
- All existing production logic preserved






