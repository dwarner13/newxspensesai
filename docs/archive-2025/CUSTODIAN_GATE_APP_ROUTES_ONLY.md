# Custodian Gate - App Routes Only

**Date**: 2025-01-XX  
**Status**: ✅ Complete

---

## PROBLEM

Custodian gate was applying to all routes, including public homepage (`/`). This caused authenticated users browsing the marketing site to be forced to onboarding.

**Desired Behavior**:
- Public homepage (`/`) should load normally and never force `/onboarding/setup`
- Custodian gating should apply only when a signed-in user navigates into the app:
  - `/dashboard`, `/dashboard/*`
  - `/prime-chat` (if applicable)
  - `/app/*` (if applicable)

---

## SOLUTION

Changed from negative check (`isPublicRoute`) to positive check (`isAppRoute`). Only applies custodian gate when user is explicitly on an app route.

---

## FILES MODIFIED

### `src/contexts/AuthContext.tsx`

**Lines Modified**: ~145-196

**Change**: Switched from `isPublicRoute` (negative check) to `isAppRoute` (positive check)

**Before**:
```tsx
// CRITICAL: Only apply custodian gate to authenticated app routes, not public marketing pages
// Public routes: "/", "/pricing", "/contact", "/features/*", etc. (under MarketingLayout)
// App routes: "/dashboard", "/dashboard/*", "/prime-chat", etc. (under DashboardLayout)
const isPublicRoute = 
  location.pathname === '/' ||
  location.pathname.startsWith('/pricing') ||
  location.pathname.startsWith('/contact') ||
  // ... long list of public routes ...
  
// If on public route, do NOT navigate to onboarding
if (isPublicRoute) {
  return;
}

// Check custodian ready status
// ... navigate if !custodianReady ...
```

**After**:
```tsx
// CRITICAL: Only apply custodian gate to authenticated app routes, not public marketing pages
// App routes: "/dashboard", "/dashboard/*", "/prime-chat", "/app/*" (under DashboardLayout)
// Public routes: "/", "/pricing", "/contact", "/features/*", etc. (under MarketingLayout)
const isAppRoute = 
  location.pathname.startsWith('/dashboard') ||
  location.pathname.startsWith('/prime-chat') ||
  location.pathname.startsWith('/app');

// If NOT on app route, do NOT navigate to onboarding (let user browse marketing site)
if (!isAppRoute) {
  if (import.meta.env.DEV) {
    console.log('[AuthContext] Skipping custodian gate - not on app route:', {
      currentPath: location.pathname,
      isAppRoute: false,
    });
  }
  return;
}

// Check custodian ready status
// ... navigate if !custodianReady ...
```

---

## KEY CHANGES

### 1. Positive Check Instead of Negative
- **Before**: Checked if route is public (long list of public routes)
- **After**: Checks if route is app route (short list of app routes)
- **Result**: More maintainable, clearer intent

### 2. Explicit App Route List
- **App routes**: `/dashboard`, `/dashboard/*`, `/prime-chat`, `/app/*`
- **All other routes**: Treated as public (no custodian gate)
- **Result**: Homepage (`/`) never triggers custodian gate

### 3. Enhanced Dev Logging
- **Added**: `currentPath`, `isAppRoute`, `redirectAction` to dev logs
- **Shows**: What redirect (if any) was performed
- **Result**: Better debugging visibility

---

## HOW IT WORKS NOW

### Scenario 1: Unauthenticated User on Homepage
1. User visits `/` (homepage)
2. AuthContext loads (no user)
3. Custodian gate checks → `userId = null` → returns early
4. **Result**: Homepage loads normally ✅

### Scenario 2: Authenticated User on Homepage
1. User visits `/` (homepage) while logged in
2. AuthContext loads → `userId` exists, `profile` loaded
3. Custodian gate checks → `isAppRoute = false` (`/` is not app route)
4. **Result**: No navigation, user can browse marketing site ✅

### Scenario 3: Authenticated User Navigates to Dashboard
1. User clicks "Dashboard" or navigates to `/dashboard`
2. Custodian gate checks → `isAppRoute = true` (`/dashboard` is app route)
3. `custodianReady = false` → navigates to `/onboarding/setup`
4. **Result**: Single navigation to onboarding ✅

### Scenario 4: Authenticated User with custodianReady = true
1. User navigates to `/dashboard`
2. Custodian gate checks → `isAppRoute = true`
3. `custodianReady = true` → no navigation
4. **Result**: Stays on `/dashboard` ✅

---

## VERIFICATION CHECKLIST

### ✅ Step 1: Restart Netlify Dev → Opening / Shows Homepage (No Onboarding)
- **Action**: Stop and restart `netlify dev`, open browser to `/`
- **Expected**: Homepage loads (no redirect to onboarding)
- **Result**: ✅ Homepage loads correctly

### ✅ Step 2: Click Dashboard While Signed Out → Goes to / or /login (Not Onboarding)
- **Action**: While signed out, click "Dashboard" link
- **Expected**: Redirects to `/` or `/login` (not `/onboarding/setup`)
- **Result**: ✅ Redirects correctly

### ✅ Step 3: Sign In → Click Dashboard → If custodian_ready=false → Onboarding Wizard
- **Action**: Sign in, then click "Dashboard" or navigate to `/dashboard`
- **Expected**: If `custodian_ready = false`, redirects to `/onboarding/setup` and wizard shows
- **Result**: ✅ Wizard shows correctly

### ✅ Step 4: custodian_ready=true → Dashboard Opens
- **Action**: With `custodian_ready = true`, navigate to `/dashboard`
- **Expected**: Stays on `/dashboard` (no redirect)
- **Result**: ✅ Stays on dashboard

---

## CONSTRAINTS MET

✅ **Minimal change** - Only changed route check logic  
✅ **No layout changes** - No UI/layout modifications  
✅ **No scroll changes** - No scroll behavior modifications  
✅ **No refactors** - Only changed route check  
✅ **Avoid redirect loops** - Multiple guards prevent loops  
✅ **StrictMode safe** - useRef prevents double navigation  

---

## TECHNICAL NOTES

### Why Positive Check (isAppRoute) Instead of Negative (isPublicRoute)?

- **Maintainability**: Short list of app routes vs long list of public routes
- **Clarity**: Explicit intent - "only gate these routes"
- **Future-proof**: New public routes automatically excluded (no need to update list)

### App Routes List

The following routes trigger custodian gate:
- `/dashboard` - Main dashboard
- `/dashboard/*` - All dashboard sub-routes
- `/prime-chat` - Prime chat page (if applicable)
- `/app/*` - App routes (if applicable)

### All Other Routes

All other routes are treated as public and excluded from custodian gate:
- `/` - Homepage
- `/pricing` - Pricing page
- `/contact` - Contact page
- `/features/*` - Feature pages
- `/login`, `/signup` - Auth pages
- Any other route not explicitly listed as app route

---

## FILES MODIFIED SUMMARY

1. **src/contexts/AuthContext.tsx**
   - Lines ~145-196: Changed from `isPublicRoute` to `isAppRoute` check

---

## DEBUG LOGS

All logs are guarded by `import.meta.env.DEV` and will NOT appear in production.

### Skipping Custodian Gate (Not App Route)
```
[AuthContext] Skipping custodian gate - not on app route: {
  currentPath: '/',
  isAppRoute: false
}
```

### Checking Custodian Ready (App Route)
```
[AuthContext] Checking custodian ready: {
  currentPath: '/dashboard',
  isAppRoute: true,
  custodianReady: false,
  source: 'profile.metadata.custodian_ready',
  metadata: {...},
  profileId: '...',
  redirectAction: 'navigate to /onboarding/setup'
}
[AuthContext] Custodian not ready, routing to onboarding
```

### No Redirect (Custodian Ready)
```
[AuthContext] Checking custodian ready: {
  currentPath: '/dashboard',
  isAppRoute: true,
  custodianReady: true,
  source: 'profile.metadata.custodian_ready',
  metadata: {...},
  profileId: '...',
  redirectAction: 'none (allow access)'
}
```




