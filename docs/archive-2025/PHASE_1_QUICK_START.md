# ⚡ Phase 1: Quick Start (Copy & Paste Ready)

**Status:** ✅ All files created and ready to deploy  
**Estimated Time:** 30 min setup + 1 week testing  
**Lines of Code:** ~1,500 TypeScript + ~250 SQL

---

## 📋 What You Get

4 User Segments for Prime Personalization:
- **🎯 first_time** - New users (no onboarding or login history)
- **👋 returning** - Active users (logged in within 14 days)
- **⏸️ inactive** - Dormant users (14+ days since login)
- **⭐ power_user** - Engaged users (200+ tx OR 10+ rules OR 3+ goals)

---

## 🚀 5-Minute Setup

### 1. Deploy SQL Migration

```bash
# Option A: Via Supabase CLI
cd your-project
supabase migration up

# Option B: Manual - Copy entire contents of this file into Supabase SQL editor:
# migrations/20251019_phase1_user_segmentation.sql
```

**Verify it worked:**
```sql
SELECT * FROM metrics_segmentation_decisions LIMIT 1;
-- Should return empty table (no errors)
```

### 2. All TypeScript Files Are Ready

Copy these to your project (all created):
- ✅ `src/types/prime.ts` (120 lines)
- ✅ `src/lib/user-usage.ts` (160 lines)
- ✅ `src/lib/user-status.ts` (180 lines)
- ✅ `src/ai/prime/intro/getPrimeIntroMessage.ts` (110 lines)
- ✅ `src/components/SegmentationBadge.tsx` (200 lines)
- ✅ `src/lib/user-status.test.ts` (550 lines) - Tests
- ✅ `netlify/functions/prime/segmentation.ts` (100 lines) - Optional endpoint

### 3. Wire Into Your App (3 Integration Points)

#### A) On User Login
```typescript
// src/hooks/useAuth.ts
import { recordUserLogin } from "@/lib/user-usage";

const handleLogin = async (email, password) => {
  const user = await supabase.auth.signInWithPassword({ email, password });
  
  // 👇 Add this one line
  if (user.data.user) await recordUserLogin(supabase, user.data.user.id);
  
  return user;
};
```

#### B) On Dashboard Load
```typescript
// src/pages/dashboard/Dashboard.tsx
import { getPrimeIntroMessage } from "@/ai/prime/intro/getPrimeIntroMessage";
import { SegmentationBadge } from "@/components/SegmentationBadge";

export default function Dashboard() {
  const { user } = useAuth();
  const supabase = useSupabaseClient();
  const [intro, setIntro] = useState(null);

  useEffect(() => {
    if (user?.id) {
      getPrimeIntroMessage({ supabase, userId: user.id })
        .then(setIntro);
    }
  }, [user?.id]);

  return (
    <div>
      {/* Show segmentation badge (optional debug) */}
      {intro && <SegmentationBadge decision={intro.decision} showSignals={true} />}
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

#### C) After Onboarding Completes
```typescript
// src/pages/onboarding/Final.tsx
import { markOnboardingComplete } from "@/lib/user-usage";

export default function OnboardingComplete() {
  const { user } = useAuth();
  const supabase = useSupabaseClient();

  useEffect(() => {
    if (user?.id) {
      markOnboardingComplete(supabase, user.id);
    }
  }, [user?.id]);

  return <Navigate to="/dashboard" />;
}
```

---

## ✅ Quick Tests

### Run Unit Tests
```bash
npm test -- user-status.test.ts

# Expected output:
# ✓ 40+ tests passing
# ✓ ~500ms total
```

### Quick Manual Test
```typescript
import { decideUserStatus, SegmentationBoundaries } from "@/lib/user-status";

// Test 1: First-time user
const d1 = decideUserStatus(SegmentationBoundaries.firstTime());
console.assert(d1.status === "first_time"); ✓

// Test 2: Power user
const d2 = decideUserStatus(SegmentationBoundaries.powerUser());
console.assert(d2.status === "power_user"); ✓

// Test 3: Inactive user
const d3 = decideUserStatus(SegmentationBoundaries.inactive());
console.assert(d3.status === "inactive"); ✓

// Test 4: Returning user
const d4 = decideUserStatus(SegmentationBoundaries.returning());
console.assert(d4.status === "returning"); ✓
```

---

## 🎨 UI Components

### Simple Badge
```typescript
import { SegmentationBadge } from "@/components/SegmentationBadge";

<SegmentationBadge decision={intro.decision} />
// Renders: ⭐ power_user · high_usage_signals
```

### With Signals Breakdown
```typescript
<SegmentationBadge decision={intro.decision} showSignals={true} />
// Renders:
// ⭐ power_user · high_usage_signals
//   📊 300 tx | 📋 15 rules | 🎯 5 goals
//   🕐 Last login: 2 days ago
//   ✓ Onboarding: Complete
```

### Compact Pill
```typescript
import { SegmentationStatusPill } from "@/components/SegmentationBadge";

<SegmentationStatusPill status={intro.decision.status} />
// Renders: ⭐ Power User
```

### Full Card (Admin/Debug)
```typescript
import { SegmentationCard } from "@/components/SegmentationBadge";

<SegmentationCard decision={intro.decision} />
// Renders detailed card with all signals + grid
```

---

## 🔧 Configuration

### Custom Thresholds
```typescript
import { decideUserStatus } from "@/lib/user-status";

const decision = decideUserStatus(signals, {
  inactiveDays: 21,  // Default: 14
  powerUserThresholds: {
    transactions: 500,  // Default: 200
    rules: 20,          // Default: 10
    goals: 5,           // Default: 3
  },
});
```

### Environment Variables (Optional)
```bash
# .env.local
VITE_SEGMENTATION_INACTIVE_DAYS=14
VITE_SEGMENTATION_POWER_TX=200
VITE_SEGMENTATION_POWER_RULES=10
VITE_SEGMENTATION_POWER_GOALS=3
```

---

## 📊 Test Endpoint (Optional)

Test segmentation via HTTP:

```bash
# Start dev server
npm run dev

# In another terminal:
curl "http://localhost:8888/.netlify/functions/prime/segmentation?userId=550e8400-e29b-41d4-a716-446655440000"

# Response:
{
  "ok": true,
  "decision": {
    "status": "power_user",
    "reason": "high_usage: 300 transactions, 15 rules, 5 goals",
    "signals": {
      "transactions": 300,
      "rules": 15,
      "goals": 5,
      "lastLoginAt": "2025-10-19T10:00:00.000Z",
      "onboardingComplete": true
    },
    "evaluatedAt": "2025-10-19T12:34:56.789Z"
  }
}
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| **"Migration failed"** | Run in Supabase SQL editor, not CLI (if using local dev) |
| **"getUsageSignals returns 0s"** | Tables don't exist yet; migration didn't run |
| **"Always returns first_time"** | Call `recordUserLogin()` after auth; call `markOnboardingComplete()` after onboarding |
| **Tests timing out** | Increase timeout: `vitest.config.ts` → `testTimeout: 10000` |
| **Type errors** | Update `tsconfig.json` if using path aliases; check `@/` alias |

---

## 📈 Monitoring

### Check Telemetry
```sql
-- How many users segmented?
SELECT status, COUNT(*) as cnt
FROM metrics_segmentation_decisions
WHERE decided_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Sample output:
-- status      | cnt
-- first_time  | 42
-- returning   | 156
-- inactive    | 8
-- power_user  | 23
```

### Latest User Decisions
```sql
-- See latest decision for each user
SELECT * FROM public.v_user_segmentation_latest
ORDER BY decided_at DESC
LIMIT 10;
```

---

## 🎯 Next: Phase 2

Once Phase 1 is stable (> 1000 decisions in telemetry), move to Phase 2:

**Phase 2: Adaptive Greetings**
- Segment-specific greeting copy
- Action chips based on segment
- Goal progress suggestions
- Re-engagement messaging

Expected implementation: 1-2 weeks

---

## ✨ Success Checklist

- [ ] SQL migration deployed (no errors)
- [ ] All 6 TypeScript files added to project
- [ ] `npm test -- user-status.test.ts` passes
- [ ] Dashboard loads without console errors
- [ ] `recordUserLogin()` wired to auth
- [ ] `markOnboardingComplete()` wired to onboarding
- [ ] `getPrimeIntroMessage()` returns correct status for test users
- [ ] Telemetry table has > 10 rows after testing
- [ ] Team reviewed thresholds (are defaults good for your users?)
- [ ] Deployed to staging environment

---

## 📞 Questions?

Refer to:
- **Architecture:** `PRIME_INTELLIGENCE_AUDIT_AND_MODERNIZATION_PLAN.md`
- **Full Details:** `PHASE_1_IMPLEMENTATION_GUIDE.md`
- **Code Comments:** Inline JSDoc in each `.ts` file

---

**Status:** ✅ Phase 1 Ready to Deploy  
**Estimated TTD:** 1-2 weeks from staging → production  
**Owner:** Prime Intelligence Initiative






