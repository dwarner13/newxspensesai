# 👑 Prime Boss - Quick Reference Card

**Status:** 🚀 Ready to Ship | **Time:** 2.5 hours | **Risk:** 🟢 LOW

---

## Current State vs. Missing

| Feature | Status | Impact |
|---------|--------|--------|
| Chat bubble (BossBubble.tsx) | ✅ Working | Can talk to Prime |
| Routing to employees | ✅ Working | Routes work |
| Guardrails (PII, moderation) | ✅ Working | Safe input |
| **Intro modal** | ❌ Missing | 🔴 CRITICAL |
| **Persistent intro state** | ❌ Missing | 🔴 CRITICAL |
| **Boss button styling** | ⚠️ Ugly (neon red) | 🟠 Breaks design |
| Notification badge | ✅ Exists | Just needs wiring |
| Real-time updates | ✅ Working | Uses Supabase |

---

## 5 Steps to Ship

```
1️⃣  SQL: prime_user_state table           (10 min)
2️⃣  Function: prime-intro.ts               (15 min)
3️⃣  React: PrimeIntroModal.tsx            (20 min)
4️⃣  Fix: BossBubble styling (crown + pulse) (15 min)
5️⃣  Wire: Bell badge notifications         (20 min)
_____________________________________________
Total: 2.5 hours
```

---

## Files to Create (Copy-Paste Ready)

### 1. SQL Migration
**Path:** `sql/migrations/20251020_prime_user_state.sql`

```sql
CREATE TABLE IF NOT EXISTS public.prime_user_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  has_seen_intro boolean DEFAULT false,
  intro_step int DEFAULT 0,
  intro_completed_at timestamptz,
  preferences jsonb DEFAULT '{"theme":"dark"}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.prime_user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY prime_state_select_own ON public.prime_user_state FOR SELECT
  USING (user_id = (auth.uid())::text);
CREATE POLICY prime_state_update_own ON public.prime_user_state FOR UPDATE
  USING (user_id = (auth.uid())::text) WITH CHECK (user_id = (auth.uid())::text);

CREATE OR REPLACE FUNCTION public.get_or_create_prime_state(p_user_id text)
RETURNS jsonb LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.prime_user_state (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN (SELECT jsonb_build_object('has_seen_intro', has_seen_intro, 'intro_step', intro_step)
    FROM public.prime_user_state WHERE user_id = p_user_id);
END $$;
```

**Install:** Paste into Supabase SQL Editor → Run

### 2. Netlify Function
**Path:** `netlify/functions/prime-intro.ts`

```typescript
import { Handler } from "@netlify/functions";
import { serverSupabase } from "./_shared/supabase";

export const handler: Handler = async (event) => {
  const userId = event.headers["x-user-id"];
  if (!userId) return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };

  try {
    const { supabase } = serverSupabase();
    
    if (event.httpMethod === "GET") {
      const { data } = await supabase.rpc("get_or_create_prime_state", { p_user_id: userId });
      return { statusCode: 200, body: JSON.stringify(data) };
    }
    
    if (event.httpMethod === "PATCH") {
      const body = JSON.parse(event.body || "{}");
      const { data } = await supabase.from("prime_user_state")
        .update({ has_seen_intro: body.has_seen_intro ?? true, intro_step: body.intro_step ?? 2 })
        .eq("user_id", userId).select().single();
      return { statusCode: 200, body: JSON.stringify(data) };
    }
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
```

**Install:** Create file → `netlify dev` (auto-loads)

### 3. React Modal Component
**Path:** `src/components/prime/PrimeIntroModal.tsx` (See full audit for complete code)

**Install:** Create file → import in DashboardLayout

### 4. React Hook
**Path:** `src/components/prime/usePrimeIntro.ts` (See full audit for complete code)

**Install:** Create file → use in DashboardLayout

### 5. Update DashboardLayout
**File:** `src/layouts/DashboardLayout.tsx`

```typescript
import { PrimeIntroModal } from "../components/prime/PrimeIntroModal";
import { usePrimeIntro } from "../components/prime/usePrimeIntro";

// Inside component:
const { showIntro, hideIntro } = usePrimeIntro();

// In JSX:
return (
  <>
    <PrimeIntroModal open={showIntro} onComplete={hideIntro} />
    {/* rest of layout */}
  </>
);
```

### 6. Fix BossBubble Styling
**File:** `src/components/boss/BossBubble.tsx` (lines 23-65)

Replace neon red/yellow button with:
```typescript
button.style.cssText = `
  position: fixed !important;
  top: 20px !important;
  right: 20px !important;
  width: 56px !important;
  height: 56px !important;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
  border: none !important;
  border-radius: 50% !important;
  font-size: 24px !important;
  cursor: pointer !important;
  z-index: 40 !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4) !important;
  animation: pulse 2s infinite !important;
`;
```

---

## Testing Flow

```bash
# 1. Fresh user (incognito window or clear cache)
# Should see: 3-step modal → "Let's Go" → crown button appears

# 2. Second login (same user)
# Should see: Modal skipped → crown button immediately visible

# 3. Click crown
# Should see: Chat panel opens → "I'm 👑 Prime..."

# 4. Send message: "Show spending trends"
# Should see: Routes to Crystal → navigates to /dashboard/crystal

# 5. Check logs
# Should see: No errors, no PII in console
```

---

## Critical Paths (What Could Break)

| Issue | Fix | Time |
|-------|-----|------|
| Modal doesn't appear | Run SQL migration in Supabase | 2 min |
| Function 404 | Run `netlify dev` in project root | 2 min |
| Button still neon red | Paste corrected CSS | 2 min |
| No notification badge | Wire useNotifications() to bell | 5 min |
| TypeScript errors | Check imports (Crown, Zap, Users from lucide-react) | 3 min |

---

## Rollback (If Needed)

```bash
# Revert last commit
git revert HEAD

# Or delete specific files
rm sql/migrations/20251020_prime_user_state.sql
rm netlify/functions/prime-intro.ts
rm -rf src/components/prime/
git checkout src/layouts/DashboardLayout.tsx
git checkout src/components/boss/BossBubble.tsx

# Redeploy
netlify deploy
```

---

## Acceptance Checklist (Final)

- [ ] User sees intro on first login
- [ ] Modal persists choice (no repeat)
- [ ] Crown button blue + pulsing (not red/yellow)
- [ ] Click button → chat opens
- [ ] Type message → routes to employee → navigates
- [ ] Bell shows notification count
- [ ] No console errors
- [ ] No PII in logs

---

## Go-Live Command

```bash
git add -A
git commit -m "feat(prime): Add intro modal, persistent state, clean styling"
git push origin main

# Netlify auto-deploys (~3 min)
# Check: https://app.netlify.com/[site]/deploys
```

---

**Full Details:** See `PRIME_BOSS_AUDIT.md`  
**Status:** ✅ **Ready to Deploy Today**





