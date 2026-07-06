# 👑 Prime Boss - Implementation Checklist

**Target:** Launch Prime on first-sign-in with persistent intro state + clean styling  
**Status:** 🟡 **Phase 2 of 3 (Backend Complete, Frontend Pending)**  
**Date:** October 20, 2025

---

## ✅ PHASE 1: DATABASE & BACKEND (COMPLETE)

### Database
- [x] Migration file created: `sql/migrations/20251020_prime_user_state.sql`
  - [x] Table: `prime_user_state` (user_id, has_seen_intro, intro_step, preferences, timestamps)
  - [x] RLS policies (select_own, update_own, service_all)
  - [x] Indexes (user_id, has_seen_intro)
  - [x] Helper functions:
    - [x] `get_or_create_prime_state()` — fetch/create with defaults
    - [x] `mark_prime_intro_complete()` — mark intro done
  - [x] Auto-timestamp trigger

### Netlify Function
- [x] `netlify/functions/prime-intro.ts` created
  - [x] GET endpoint: fetch user state (or create defaults)
  - [x] PATCH endpoint: update intro state
  - [x] Input validation (x-user-id header required)
  - [x] Error handling with safeLog
  - [x] Intro step validation (0-2 range)
  - [x] Auto-set intro_completed_at on completion
  - [x] Returns 405 for unsupported methods
  - [x] Logs at debug/warn/error levels (PII-safe)

### Documentation
- [x] `PRIME_BOSS_AUDIT.md` — full technical specs
- [x] `PRIME_QUICK_REFERENCE.md` — copy-paste code
- [x] `PRIME_MIGRATION_DEPLOY.md` — deployment guide
- [x] `sql/migrations/20251020_prime_user_state.sql` — migration file

---

## 🔄 PHASE 2: FRONTEND COMPONENTS (IN PROGRESS)

### React Components to Create

#### 1. Modal Component
**File:** `src/components/prime/PrimeIntroModal.tsx`
- [ ] Create file
- [ ] 3-step intro modal (Welcome, Team, Quick Start)
- [ ] Crown/Zap/Users icons (lucide-react)
- [ ] Back/Next/Let's Go buttons
- [ ] Close (X) button
- [ ] Progress bar (3 dots)
- [ ] Dark theme (gray-900/gray-800 gradient)
- [ ] Calls PATCH endpoint on "Let's Go"

**Code:**
```typescript
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { X, Crown, Zap, Users } from "lucide-react";

export function PrimeIntroModal({ open, onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  const handleComplete = async () => {
    if (user?.id) {
      await fetch("/.netlify/functions/prime-intro", {
        method: "PATCH",
        headers: { "x-user-id": user.id },
        body: JSON.stringify({ has_seen_intro: true, intro_step: 2 })
      });
    }
    onComplete();
  };

  if (!open) return null;

  const steps = [
    { title: "👑 Meet Prime", subtitle: "Your AI CEO", description: "I orchestrate your entire AI team...", icon: <Crown className="w-16 h-16 text-amber-500" /> },
    { title: "🤝 Your AI Team", subtitle: "30+ Specialists", description: "Byte, Tag, Crystal, and more...", icon: <Users className="w-16 h-16 text-blue-500" /> },
    { title: "⚡ Quick Start", subtitle: "Ask Anything", description: "Click my bubble in top-right...", icon: <Zap className="w-16 h-16 text-yellow-500" /> }
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 max-w-md text-white shadow-2xl">
        <button onClick={handleComplete} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center space-y-4 mb-8">
          {current.icon}
          <h2 className="text-3xl font-bold">{current.title}</h2>
          <p className="text-sm text-gray-400">{current.subtitle}</p>
          <p className="text-gray-300">{current.description}</p>
        </div>
        <div className="flex gap-2 mb-4">
          {steps.map((_, i) => (<div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-amber-500" : "bg-gray-700"}`} />))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="flex-1 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50">Back</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 font-semibold">Next</button>
          ) : (
            <button onClick={handleComplete} className="flex-1 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 font-semibold">Let's Go!</button>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 2. Custom Hook
**File:** `src/components/prime/usePrimeIntro.ts`
- [ ] Create file
- [ ] useAuth hook integration
- [ ] GET endpoint call to fetch state
- [ ] Show modal only if `has_seen_intro === false`
- [ ] useEffect dependency on user.id

**Code:**
```typescript
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

export function usePrimeIntro() {
  const { user } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const checkIntro = async () => {
      try {
        const res = await fetch("/.netlify/functions/prime-intro", {
          headers: { "x-user-id": user.id }
        });
        const state = await res.json();
        setShowIntro(!state.has_seen_intro);
      } finally {
        setLoading(false);
      }
    };

    checkIntro();
  }, [user?.id]);

  return { showIntro, loading, hideIntro: () => setShowIntro(false) };
}
```

### Layout Integration

#### 3. Update DashboardLayout
**File:** `src/layouts/DashboardLayout.tsx`
- [ ] Add imports at top:
  ```typescript
  import { PrimeIntroModal } from "../components/prime/PrimeIntroModal";
  import { usePrimeIntro } from "../components/prime/usePrimeIntro";
  ```
- [ ] Call hook inside component:
  ```typescript
  const { showIntro, hideIntro } = usePrimeIntro();
  ```
- [ ] Add to JSX (before `<Outlet />`):
  ```typescript
  <PrimeIntroModal open={showIntro} onComplete={hideIntro} />
  ```

### Boss Bubble Styling

#### 4. Fix BossBubble Appearance
**File:** `src/components/boss/BossBubble.tsx` (lines 23-65)
- [ ] Replace neon red/yellow button with:
  ```typescript
  button.innerHTML = '👑';  // Just crown emoji
  button.style.background = 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
  button.style.width = '56px';
  button.style.height = '56px';
  button.style.borderRadius = '50%';
  button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
  button.style.animation = 'pulse 2s infinite';
  ```
- [ ] Add CSS animation:
  ```css
  @keyframes pulse {
    0%, 100% { box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.8); }
  }
  ```

---

## 🧪 PHASE 3: TESTING & DEPLOYMENT (PENDING)

### Local Testing
- [ ] **Start dev servers:**
  ```bash
  npm run dev &
  netlify dev &
  ```

- [ ] **Test 1: Fresh User (Incognito)**
  - [ ] Navigate to http://localhost:8888
  - [ ] Modal appears (3-step intro)
  - [ ] Click through steps
  - [ ] Click "Let's Go"
  - [ ] Modal closes
  - [ ] Prime crown button visible in top-right

- [ ] **Test 2: Returning User**
  - [ ] Close incognito window
  - [ ] Clear browser cache
  - [ ] Login as same user
  - [ ] Modal does NOT appear
  - [ ] Prime crown button visible immediately

- [ ] **Test 3: Chat Flow**
  - [ ] Click crown button
  - [ ] Chat panel opens
  - [ ] Type: "Show spending trends"
  - [ ] Prime routes to Crystal
  - [ ] Navigates to `/dashboard/crystal`

- [ ] **Test 4: Browser Console**
  - [ ] No TypeScript errors
  - [ ] No "undefined function" errors
  - [ ] Network tab shows:
    - [ ] GET /.netlify/functions/prime-intro (200)
    - [ ] PATCH /.netlify/functions/prime-intro (200)

### Production Deployment
- [ ] Run `npm run build` (no errors)
- [ ] Run `npm run lint` (no errors)
- [ ] Git add all files:
  ```bash
  git add -A
  ```
- [ ] Git commit with clear message:
  ```bash
  git commit -m "feat(prime): Add intro modal, persistent state, clean styling"
  ```
- [ ] Push to main:
  ```bash
  git push origin main
  ```
- [ ] Wait for Netlify deploy (~3 min)
- [ ] Monitor: https://app.netlify.com/[site]/deploys
- [ ] Verify production URL:
  - [ ] First login shows intro
  - [ ] Second login skips intro
  - [ ] Crown button visible + clickable
  - [ ] Chat works
  - [ ] No console errors

---

## 📋 DETAILED REQUIREMENTS

### Modal Component Requirements
```
✓ 3 steps visible (progress bar)
✓ Centered, max-width 400px
✓ Dark theme (gray-900 gradient)
✓ White text
✓ Close button (X, top-right)
✓ Back/Next navigation
✓ "Let's Go" on final step
✓ Icons: Crown (amber), Users (blue), Zap (yellow)
✓ Calls PATCH endpoint when complete
✓ Modal closes after completion
✓ z-index: 50 (below Prime button at z-40)
```

### Hook Requirements
```
✓ Fetches intro state on mount
✓ Only fetches if user.id exists
✓ Returns { showIntro, loading, hideIntro }
✓ showIntro = !has_seen_intro
✓ Handles errors gracefully
✓ Re-runs on user.id change
```

### Layout Integration
```
✓ Imports modal + hook
✓ Calls hook
✓ Passes props correctly
✓ Modal renders before <Outlet />
✓ No prop drilling
```

### Styling Requirements
```
✓ Crown emoji (👑), not neon button
✓ Blue gradient (3b82f6 → 8b5cf6)
✓ 56px circular button
✓ Pulsing shadow animation
✓ Hover scale effect (1.1x)
✓ z-index: 40 (below modal)
✓ Top: 20px, Right: 20px
```

---

## 🚀 DEPLOYMENT COMMAND SEQUENCE

```bash
# 1. Create React files (from templates above)
mkdir -p src/components/prime
# ... create PrimeIntroModal.tsx and usePrimeIntro.ts

# 2. Update DashboardLayout.tsx (add imports + hook + JSX)

# 3. Update BossBubble.tsx (replace button styling)

# 4. Test locally
npm run dev &
netlify dev &
# ... manual testing (incognito + regular windows)

# 5. Deploy
git add -A
git commit -m "feat(prime): Add intro modal, persistent state, clean styling"
git push origin main

# 6. Monitor
# Watch: https://app.netlify.com/[site]/deploys
# Should complete in ~3 min
```

---

## ❓ TROUBLESHOOTING

### Issue: "prime-intro function not found (404)"
**Cause:** Function not loaded by Netlify  
**Fix:** `netlify dev` auto-detects new functions; restart terminal

### Issue: "Modal doesn't appear on fresh user"
**Cause:** Hook not fetching state or user.id missing  
**Fix:** Check browser console for errors; verify x-user-id header

### Issue: "Button still neon red/yellow"
**Cause:** Old CSS cached or BossBubble not updated  
**Fix:** Hard refresh (Ctrl+Shift+R); re-run netlify dev

### Issue: "Modal doesn't close after 'Let's Go'"
**Cause:** PATCH endpoint failed silently  
**Fix:** Check Network tab in DevTools; verify Supabase migration ran

---

## ✅ FINAL CHECKLIST (Before Commit)

- [ ] All 4 React files created
- [ ] All 3 files have correct imports
- [ ] TypeScript compiles (`npm run build`)
- [ ] Linter passes (`npm run lint`)
- [ ] Local smoke test passes (incognito + regular)
- [ ] No console errors
- [ ] No network errors (200 status codes)
- [ ] Git status clean except for new files
- [ ] Commit message clear and descriptive
- [ ] Ready to push

---

**Status:** 🟡 **Awaiting Frontend Implementation**  
**Estimated Completion:** 45 min (3 React files + styling + local test)  
**Go-Live:** ✅ Ready after merge to main

**Next Action:** Create `PrimeIntroModal.tsx` in `src/components/prime/`





