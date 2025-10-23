# 🚀 Phase 1: User Segmentation System - Implementation Guide

**Date:** 2025-10-19  
**Status:** Ready for Deployment  
**Duration:** 1-2 weeks  
**Deliverables:** 5 files + 1 SQL migration + unit tests

---

## Overview

Phase 1 implements the foundation for Prime's personalization system by classifying users into 4 segments:

| Segment | Condition | Use Case |
|---------|-----------|----------|
| `first_time` | No onboarding OR no login | Initial greeting + tutorial |
| `returning` | Active (< 14 days idle) + below power threshold | Standard greeting |
| `inactive` | Not logged in for 14+ days | Re-engagement messaging |
| `power_user` | 200+ tx OR 10+ rules OR 3+ goals | Advanced features |

---

## File Structure

```
src/
  types/
    prime.ts                          ✅ Created
  lib/
    user-status.ts                    ✅ Created
    user-usage.ts                     ✅ Created
    __tests__/
      user-status.test.ts             ✅ Created
  ai/
    prime/
      intro/
        getPrimeIntroMessage.ts       ✅ Created
netlify/
  functions/
    prime/
      segmentation.ts                 ✅ Created (optional test endpoint)
migrations/
  20251019_phase1_user_segmentation.sql  ✅ Created
```

---

## Step-by-Step Implementation

### Step 1: Copy Types File

**File:** `src/types/prime.ts`

This defines all TypeScript interfaces for segmentation. Already created; no action needed.

```bash
# Verify it exists
ls -la src/types/prime.ts
```

### Step 2: Copy User Usage Module

**File:** `src/lib/user-usage.ts`

Fetches usage signals from Supabase (transactions, rules, goals, login timestamp).

Already created; includes:
- `getUsageSignals(supabase, userId)` - Main function
- `recordUserLogin(supabase, userId)` - Update last_login_at
- `markOnboardingComplete(supabase, userId)` - Mark onboarding done
- `summarizeSignals(signals)` - Human-readable summary

### Step 3: Copy Segmentation Logic

**File:** `src/lib/user-status.ts`

Core algorithm to classify users. Already created; includes:
- `decideUserStatus(signals, opts?)` - Main classification function
- `describeSegmentationDecision(decision)` - Readable descriptions
- `SegmentationBoundaries` - Test helpers for boundary testing

**Default Thresholds** (configurable):
```typescript
inactiveDays: 14          // Days to mark as inactive
powerUser.transactions: 200
powerUser.rules: 10
powerUser.goals: 3
```

### Step 4: Wire into Prime Intro

**File:** `src/ai/prime/intro/getPrimeIntroMessage.ts`

Entry point for Prime's greeting system. Already created.

```typescript
// Usage in your components:
import { getPrimeIntroMessage } from "@/ai/prime/intro/getPrimeIntroMessage";

const intro = await getPrimeIntroMessage({ supabase, userId });
console.log(intro.decision.status); // "power_user"
console.log(intro.message);         // "" (Phase 2 fills this)
console.log(intro.actions);         // [] (Phase 2 fills this)
```

### Step 5: Deploy SQL Migration

**File:** `migrations/20251019_phase1_user_segmentation.sql`

Run this migration to:
1. Add `onboarding_complete` and `last_login_at` to profiles
2. Create `category_rules` table (if missing)
3. Create `goals` table (if missing)
4. Create `metrics_segmentation_decisions` telemetry table
5. Add indexes for performance
6. Create RLS policies and debug view

**Deployment:**
```bash
# Option 1: Using Supabase CLI
supabase migration up

# Option 2: Manually in Supabase SQL editor
# Copy-paste the entire migration file and run
```

**Verification:**
```sql
-- Check columns added to profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('onboarding_complete', 'last_login_at');

-- Check telemetry table created
SELECT * FROM information_schema.tables 
WHERE table_name = 'metrics_segmentation_decisions';

-- Check new view
SELECT * FROM public.v_user_segmentation_latest LIMIT 1;
```

### Step 6: Optional - Add Test Endpoint

**File:** `netlify/functions/prime/segmentation.ts`

HTTP endpoint for testing segmentation decisions.

**Usage:**
```bash
# Test endpoint (local)
curl "http://localhost:8888/.netlify/functions/prime/segmentation?userId=550e8400-e29b-41d4-a716-446655440000"

# Response:
{
  "ok": true,
  "decision": {
    "status": "power_user",
    "reason": "high_usage: 300 transactions, 15 rules, 5 goals",
    "signals": { "transactions": 300, "rules": 15, "goals": 5, ... },
    "evaluatedAt": "2025-10-19T12:34:56.789Z"
  }
}
```

### Step 7: Integration Points

#### Call on User Login
```typescript
// src/hooks/useAuth.ts (or wherever you handle login)
import { recordUserLogin } from "@/lib/user-usage";

export function useAuth() {
  const supabase = useSupabaseClient();
  
  const handleLogin = async (user) => {
    // ... existing login logic ...
    
    // Record login for segmentation
    await recordUserLogin(supabase, user.id);
  };
  
  return { handleLogin, /* ... */ };
}
```

#### Call on Dashboard Load
```typescript
// src/pages/dashboard/Dashboard.tsx
import { getPrimeIntroMessage } from "@/ai/prime/intro/getPrimeIntroMessage";

export default function Dashboard() {
  const { userId } = useAuth();
  const supabase = useSupabaseClient();
  const [intro, setIntro] = useState<PrimeIntro | null>(null);

  useEffect(() => {
    if (userId) {
      getPrimeIntroMessage({ supabase, userId })
        .then(setIntro)
        .catch(err => console.error("Failed to get Prime intro:", err));
    }
  }, [userId, supabase]);

  return (
    <div>
      {intro && (
        <PrimeBubble decision={intro.decision} message={intro.message} />
      )}
      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

#### Mark Onboarding Complete
```typescript
// src/pages/onboarding/OnboardingComplete.tsx
import { markOnboardingComplete } from "@/lib/user-usage";

export default function OnboardingComplete() {
  const { userId } = useAuth();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (userId) {
      markOnboardingComplete(supabase, userId);
    }
  }, [userId, supabase]);

  return <Navigate to="/dashboard" />;
}
```

---

## Testing

### Unit Tests

Run all segmentation tests:
```bash
npm test -- user-status.test.ts
```

Test coverage:
- ✅ First-time user detection
- ✅ Inactive user detection (13/14/15 day boundaries)
- ✅ Power user thresholds (199/200/201 tx, etc.)
- ✅ Returning user classification
- ✅ Segmentation priority (first_time > inactive > power_user > returning)
- ✅ Description generation
- ✅ Boundary helpers

### Manual Testing (Local)

**Test Case 1: First-Time User**
```typescript
const signals: UsageSignals = {
  transactions: 0,
  rules: 0,
  goals: 0,
  lastLoginAt: null,
  onboardingComplete: false,
};
const decision = decideUserStatus(signals);
console.assert(decision.status === "first_time");
```

**Test Case 2: Inactive User (15 days)**
```typescript
const signals = SegmentationBoundaries.forInactivity(15);
const decision = decideUserStatus(signals);
console.assert(decision.status === "inactive");
```

**Test Case 3: Power User (300 transactions)**
```typescript
const signals = SegmentationBoundaries.forTransactions(300);
const decision = decideUserStatus(signals);
console.assert(decision.status === "power_user");
```

**Test Case 4: Returning User**
```typescript
const signals = SegmentationBoundaries.returning();
const decision = decideUserStatus(signals);
console.assert(decision.status === "returning");
```

### E2E Testing in Staging

1. Create test users in staging Supabase with different profiles:
   - User A: No onboarding → expects `first_time`
   - User B: Active, 15 tx → expects `returning`
   - User C: Inactive (30 days) → expects `inactive`
   - User D: 300 tx → expects `power_user`

2. Load Dashboard for each user and verify console logs:
```bash
# Open DevTools → Console
# You should see telemetry logs like:
// [getPrimeIntroMessage] Segmented user as power_user
// [getPrimeIntroMessage] Logged telemetry to metrics_segmentation_decisions
```

3. Query telemetry table:
```sql
SELECT status, COUNT(*) as cnt, reason
FROM metrics_segmentation_decisions
WHERE decided_at > NOW() - INTERVAL '1 hour'
GROUP BY status, reason;
```

---

## Configuration

### Adjust Thresholds

**In code:**
```typescript
import { decideUserStatus } from "@/lib/user-status";

// Override defaults
const decision = decideUserStatus(signals, {
  inactiveDays: 21,  // 21 days instead of 14
  powerUserThresholds: {
    transactions: 500,  // Higher threshold
    rules: 20,
    goals: 5,
  },
});
```

**Via environment variables** (optional enhancement):
```typescript
// src/lib/user-status.ts
const DEFAULT_OPTIONS: Required<SegmentationOptions> = {
  inactiveDays: import.meta.env.VITE_SEGMENTATION_INACTIVE_DAYS ?? 14,
  powerUserThresholds: {
    transactions: import.meta.env.VITE_SEGMENTATION_POWER_TX ?? 200,
    rules: import.meta.env.VITE_SEGMENTATION_POWER_RULES ?? 10,
    goals: import.meta.env.VITE_SEGMENTATION_POWER_GOALS ?? 3,
  },
};
```

---

## Deployment Checklist

- [ ] **Database**
  - [ ] Run SQL migration (`20251019_phase1_user_segmentation.sql`)
  - [ ] Verify `profiles.onboarding_complete` and `profiles.last_login_at` exist
  - [ ] Verify `metrics_segmentation_decisions` table created with indexes
  - [ ] Verify RLS policies in place

- [ ] **Code**
  - [ ] All 5 new files created in correct locations
  - [ ] `getPrimeIntroMessage` wired into Prime component
  - [ ] `recordUserLogin` called on login
  - [ ] `markOnboardingComplete` called after onboarding
  - [ ] Unit tests passing (npm test)

- [ ] **Monitoring**
  - [ ] Feature flag added (if using feature flags)
  - [ ] Telemetry table monitoring configured
  - [ ] Error logging enabled in production
  - [ ] Alert set for telemetry write failures

- [ ] **Documentation**
  - [ ] Team notified of new columns in profiles
  - [ ] Onboarding guide updated for new integration points
  - [ ] Threshold values documented in team wiki

---

## Troubleshooting

### Issue: "profiles table not found"
**Cause:** Migration not run yet  
**Fix:** Run SQL migration via Supabase CLI or web editor

### Issue: "getUsageSignals returns all zeros"
**Cause:** Tables (transactions, category_rules, goals) don't exist  
**Fix:** Migration creates placeholder tables; verify they exist and have data

### Issue: "Segmentation always returns first_time"
**Cause:** `last_login_at` is NULL or `onboarding_complete` is false  
**Fix:** Call `recordUserLogin()` and `markOnboardingComplete()` at appropriate times

### Issue: "Telemetry not being logged"
**Cause:** RLS policy blocks insert or table doesn't exist  
**Fix:** Check RLS policies and run migration verification steps

### Issue: Tests timing out
**Cause:** Jest/Vitest timeout too short  
**Fix:** Increase timeout in vitest.config.ts: `testTimeout: 10000`

---

## Phase 1 → Phase 2 Preview

Phase 2 will add **Adaptive Greetings**:

```typescript
// Phase 2 placeholder in getPrimeIntroMessage.ts
const message = getSegmentSpecificMessage()[decision.status];
const actions = getSegmentSpecificActions()[decision.status];

// Will generate:
// "first_time": "👑 Welcome! I'm Prime, your AI financial orchestrator..."
// "returning": "👑 Welcome back! Ready to make progress?"
// "inactive": "👑 We've missed you! A lot has changed..."
// "power_user": "👑 Welcome back, financial strategist!..."
```

---

## Success Criteria

✅ **Phase 1 Complete When:**

1. All 5 TypeScript files created and passing TypeScript compiler
2. SQL migration deployed successfully
3. All unit tests passing (40+ test cases)
4. `getPrimeIntroMessage` returns correct status for all 4 segments
5. Telemetry table collecting decisions (query shows > 0 rows)
6. No console errors in dashboard load
7. Threshold customization working via options parameter

✅ **Ready to Proceed to Phase 2:**

1. Production dashboard shows segmentation in console logs
2. Telemetry table has > 1000 decisions collected
3. Segment distribution aligns with expectations
4. No performance issues (segmentation < 100ms per user)
5. Team confident in threshold values (from telemetry analysis)

---

## Files Summary

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `src/types/prime.ts` | 120 | Type definitions | ✅ |
| `src/lib/user-usage.ts` | 160 | Fetch signals | ✅ |
| `src/lib/user-status.ts` | 180 | Segmentation logic | ✅ |
| `src/ai/prime/intro/getPrimeIntroMessage.ts` | 110 | Prime integration | ✅ |
| `netlify/functions/prime/segmentation.ts` | 100 | Test endpoint | ✅ |
| `src/lib/user-status.test.ts` | 550 | Unit tests | ✅ |
| `migrations/20251019_phase1_user_segmentation.sql` | 250 | DB schema | ✅ |
| **Total** | **~1,470** | **Complete Phase 1** | **✅** |

---

## Next Steps

1. **This Week:** Deploy Phase 1 to staging
2. **Week 2:** Collect telemetry, validate thresholds
3. **Week 3:** Code review + deploy to production
4. **Week 4:** Begin Phase 2 (Adaptive Greetings + Action Chips)

---

**Questions?** Refer to `PRIME_INTELLIGENCE_AUDIT_AND_MODERNIZATION_PLAN.md` for architecture context, or reach out to the Prime Intelligence team.

🎯 **Status:** Phase 1 Ready for Deployment





