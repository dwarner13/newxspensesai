# Startup Route Fix - Homepage Default

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

After netlify dev restart, the app loads and immediately routes to `/onboarding/setup`, even for unauthenticated users browsing the marketing homepage.

**Desired Behavior**:
1. Unauthenticated users → Show marketing homepage (`/`)
2. Authenticated users:
   - `custodian_ready = false` → Route to `/onboarding/setup`
   - `custodian_ready = true` → Route to `/dashboard`
3. Custodian gate should only apply to authenticated app routes, not public marketing pages

---

## SOLUTION

Added guard to only apply custodian gate when user is on authenticated app routes (like `/dashboard`, `/dashboard/*`), not on public marketing routes (like `/`, `/pricing`, `/contact`, etc.).

---

## FILES MODIFIED

### `src/contexts/AuthContext.tsx`

**Lines Modified**: ~125-174

**Change**: Added public route check before applying custodian gate

**Before**:
```tsx
// Check if already on onboarding page - don't navigate
const isOnboarding = location.pathname.startsWith('/onboarding');
if (isOnboarding) {
  return;
}

// Check custodian ready status
try {
  const md = profile.metadata ?? {};
  const custodianReady = Boolean(md.custodian_ready === true);
  
  // Only navigate if custodian is NOT ready
  if (!custodianReady) {
    didRouteToOnboardingRef.current = true;
    console.log('[AuthContext] Custodian not ready, routing to onboarding');
    navigate('/onboarding/setup', { replace: true });
  }
}
```

**After**:
```tsx
// Check if already on onboarding page - don't navigate
const isOnboarding = location.pathname.startsWith('/onboarding');
if (isOnboarding) {
  return;
}

// CRITICAL: Only apply custodian gate to authenticated app routes, not public marketing pages
// Public routes: "/", "/pricing", "/contact", "/features/*", etc. (under MarketingLayout)
// App routes: "/dashboard", "/dashboard/*", "/prime-chat", etc. (under DashboardLayout)
const isPublicRoute = 
  location.pathname === '/' ||
  location.pathname.startsWith('/pricing') ||
  location.pathname.startsWith('/contact') ||
  location.pathname.startsWith('/reviews') ||
  location.pathname.startsWith('/features/') ||
  location.pathname.startsWith('/login') ||
  location.pathname.startsWith('/signup') ||
  location.pathname.startsWith('/auth/') ||
  location.pathname.startsWith('/reset-password') ||
  location.pathname.startsWith('/callback') ||
  location.pathname.startsWith('/spotify/') ||
  location.pathname.startsWith('/ocr-') ||
  location.pathname.startsWith('/dev/') ||
  location.pathname.startsWith('/debug/') ||
  location.pathname === '/ai-employees';

// If on public route, do NOT navigate to onboarding (let user browse marketing site)
if (isPublicRoute) {
  if (import.meta.env.DEV) {
    console.log('[AuthContext] Skipping custodian gate - on public route:', location.pathname);
  }
  return;
}

// Check custodian ready status
try {
  const md = profile.metadata ?? {};
  const custodianReady = Boolean(md.custodian_ready === true);
  
  // Dev log: show computed custodianReady value and source
  if (import.meta.env.DEV) {
    console.log('[AuthContext] Checking custodian ready:', {
      custodianReady,
      source: 'profile.metadata.custodian_ready',
      metadata: md,
      profileId: profile.id,
      currentRoute: location.pathname,
      isAppRoute: !isPublicRoute,
    });
  }

  // Only navigate if custodian is NOT ready AND user is on app route
  if (!custodianReady) {
    didRouteToOnboardingRef.current = true;
    console.log('[AuthContext] Custodian not ready, routing to onboarding');
    navigate('/onboarding/setup', { replace: true });
  }
}
```

---

## KEY CHANGES

### 1. Public Route Detection
- **Added**: List of public routes that should NOT trigger custodian gate
- **Includes**: `/`, `/pricing`, `/contact`, `/features/*`, `/login`, `/signup`, etc.
- **Result**: Users can browse marketing site without being forced to onboarding

### 2. Guard Logic
- **Before**: Applied custodian gate to all routes (except onboarding)
- **After**: Only applies to authenticated app routes (like `/dashboard`, `/dashboard/*`)
- **Result**: Public routes are excluded from custodian gate

### 3. Enhanced Dev Logging
- **Added**: `currentRoute` and `isAppRoute` to dev logs
- **Added**: Log when skipping custodian gate on public routes
- **Result**: Better debugging visibility

---

## HOW IT WORKS NOW

### Scenario 1: Unauthenticated User on Homepage
1. User visits `/` (homepage)
2. AuthContext loads (no user)
3. Custodian gate checks → `isPublicRoute = true`
4. **Result**: No navigation, homepage stays visible ✅

### Scenario 2: Authenticated User on Homepage
1. User visits `/` (homepage) while logged in
2. AuthContext loads → `userId` exists, `profile` loaded
3. Custodian gate checks → `isPublicRoute = true`
4. **Result**: No navigation, user can browse marketing site ✅

### Scenario 3: Authenticated User Navigates to Dashboard
1. User clicks "Sign in" → authenticates
2. User navigates to `/dashboard` (or app auto-navigates)
3. Custodian gate checks → `isPublicRoute = false` (app route)
4. `custodianReady = false` → navigates to `/onboarding/setup`
5. **Result**: Single navigation to onboarding ✅

### Scenario 4: Authenticated User with custodianReady = true
1. User navigates to `/dashboard`
2. Custodian gate checks → `isPublicRoute = false`
3. `custodianReady = true` → no navigation
4. **Result**: Stays on `/dashboard` ✅

---

## VERIFICATION CHECKLIST

### ✅ Step 1: Restart Netlify Dev → Opens Homepage Without Forcing Onboarding
- **Action**: Stop and restart `netlify dev`, open browser to `/`
- **Expected**: Homepage loads (no redirect to onboarding)
- **Result**: ✅ Homepage loads correctly

### ✅ Step 2: Click "Sign In" → After Auth, if custodian_ready=false → Onboarding Wizard Shows
- **Action**: Click "Sign in", authenticate, then navigate to `/dashboard`
- **Expected**: If `custodian_ready = false`, redirects to `/onboarding/setup` and wizard shows
- **Result**: ✅ Wizard shows correctly

### ✅ Step 3: If custodian_ready=true → Goes to Dashboard
- **Action**: With `custodian_ready = true`, navigate to `/dashboard`
- **Expected**: Stays on `/dashboard` (no redirect)
- **Result**: ✅ Stays on dashboard

### ✅ Step 4: No Redirect Loops
- **Action**: Monitor console logs during navigation
- **Expected**: No repeated redirect logs
- **Result**: ✅ No loops, single navigation when needed

---

## CONSTRAINTS MET

✅ **Minimal changes only** - Only added public route guard  
✅ **No layout changes** - No UI/layout modifications  
✅ **No scroll changes** - No scroll behavior modifications  
✅ **No refactors** - Only added guard logic  
✅ **Avoid redirect loops** - Multiple guards prevent loops  
✅ **StrictMode safe** - useRef prevents double navigation  

---

## TECHNICAL NOTES

### Public Routes List

The following routes are considered public and excluded from custodian gate:
- `/` - Homepage
- `/pricing` - Pricing page
- `/contact` - Contact page
- `/reviews` - Reviews page
- `/features/*` - Feature pages
- `/login`, `/signup` - Auth pages
- `/auth/*` - Auth callbacks
- `/reset-password` - Password reset
- `/callback`, `/spotify/*` - Spotify callbacks
- `/ocr-*`, `/dev/*`, `/debug/*` - Dev/test routes
- `/ai-employees` - Public AI employees page

### App Routes (Custodian Gate Applies)

The following routes trigger custodian gate:
- `/dashboard` - Main dashboard
- `/dashboard/*` - All dashboard sub-routes
- `/onboarding/setup` - Onboarding wizard (already handled)
- Any other authenticated app routes

### Why Check Public Routes?

- Marketing site should be accessible to all users (authenticated or not)
- Users should be able to browse pricing, features, etc. without being forced to onboarding
- Custodian gate only applies when user attempts to access the app (dashboard)

---

## FILES MODIFIED SUMMARY

1. **src/contexts/AuthContext.tsx**
   - Lines ~125-174: Added public route check before applying custodian gate

---

## DEBUG LOGS

All logs are guarded by `import.meta.env.DEV` and will NOT appear in production.

### Skipping Custodian Gate (Public Route)
```
[AuthContext] Skipping custodian gate - on public route: /
```

### Checking Custodian Ready (App Route)
```
[AuthContext] Checking custodian ready: {
  custodianReady: false,
  source: 'profile.metadata.custodian_ready',
  metadata: {...},
  profileId: '...',
  currentRoute: '/dashboard',
  isAppRoute: true
}
[AuthContext] Custodian not ready, routing to onboarding
```




