# ⚡ CRYSTAL CONTEXT FLAGS — QUICK IMPLEMENTATION

**Purpose:** Add context flag support to chat-v3-production.ts  
**Time:** 5-10 minutes  
**Difficulty:** Easy  

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Define Context Config at Top of File

Add this after the constants section:

```typescript
// ==================== CONTEXT FLAGS ====================
// Control which data layers Crystal receives (1 = on, 0 = off)
const contextConfig = {
  facts: process.env.CRYSTAL_CONTEXT_FACTS === '1',
  history: process.env.CRYSTAL_CONTEXT_HISTORY === '1',
  analytics: process.env.CRYSTAL_CONTEXT_ANALYTICS === '1',
  budgets: process.env.CRYSTAL_CONTEXT_BUDGETS === '1'
};

// Log active context layers
console.log('[Crystal Context Config]', {
  facts: contextConfig.facts ? '✅' : '❌',
  history: contextConfig.history ? '✅' : '❌',
  analytics: contextConfig.analytics ? '✅' : '❌',
  budgets: contextConfig.budgets ? '✅' : '❌'
});
```

---

### Step 2: Modify Memory Facts Fetching

**Before:**
```typescript
// Always fetch memory facts
let factLines = '';
try {
  const { data: facts } = await supabaseSrv
    .from('user_memory_facts')
    .select('fact,created_at')
    .eq('user_id', params.userId)
    .order('created_at', { ascending: false })
    .limit(12);
  factLines = (facts ?? []).map(f => `- ${f.fact}`).join('\n');
} catch (e: any) {
  console.warn('[context] facts fetch failed', e?.message);
}
```

**After:**
```typescript
// Fetch memory facts (conditional)
let factLines = '';
if (contextConfig.facts) {
  try {
    const { data: facts } = await supabaseSrv
      .from('user_memory_facts')
      .select('fact,created_at')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(12);
    factLines = (facts ?? []).map(f => `- ${f.fact}`).join('\n');
  } catch (e: any) {
    console.warn('[context] facts fetch failed', e?.message);
  }
}
```

---

### Step 3: Modify History Fetching

**Before:**
```typescript
// Always fetch history
let historyBlock = '';
try {
  const { data: msgs, error: msgErr } = await supabaseSrv
    .from('chat_messages')
    .select('role, content_redacted, created_at, employee_key')
    .eq('user_id', params.userId)
    .eq('session_id', params.sessionId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (!msgErr && msgs?.length) {
    const ordered = [...msgs].reverse();
    historyBlock = ordered
      .map((m) => {
        const who = m.role === 'user' ? 'User' : (m.employee_key || 'Assistant');
        const text = String(m.content_redacted || '').slice(0, 240);
        return `- ${who}: ${text}`;
      })
      .join('\n');
  }
} catch (e: any) {
  console.warn('[context] history fetch failed', e?.message);
}
```

**After:**
```typescript
// Fetch history (conditional)
let historyBlock = '';
if (contextConfig.history) {
  try {
    const { data: msgs, error: msgErr } = await supabaseSrv
      .from('chat_messages')
      .select('role, content_redacted, created_at, employee_key')
      .eq('user_id', params.userId)
      .eq('session_id', params.sessionId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!msgErr && msgs?.length) {
      const ordered = [...msgs].reverse();
      historyBlock = ordered
        .map((m) => {
          const who = m.role === 'user' ? 'User' : (m.employee_key || 'Assistant');
          const text = String(m.content_redacted || '').slice(0, 240);
          return `- ${who}: ${text}`;
        })
        .join('\n');
    }
  } catch (e: any) {
    console.warn('[context] history fetch failed', e?.message);
  }
}
```

---

### Step 4: Modify Analytics Fetching

**Before:**
```typescript
// Always fetch analytics
let analyticsBlock = '';
if (params.employeeSlug === 'crystal-analytics') {
  try {
    const { data: txRows, error: txErr } = await supabaseSrv
      .from('transactions')
      .select('amount, amount_cents, category, merchant, memo, transaction_date, posted_at, occurred_at, date, created_at')
      .eq('user_id', params.userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
      .limit(5000);
    // ... rest of analytics logic
  } catch (e: any) {
    console.warn('[context] analytics failed', e?.message);
  }
}
```

**After:**
```typescript
// Fetch analytics (conditional)
let analyticsBlock = '';
if (contextConfig.analytics && params.employeeSlug === 'crystal-analytics') {
  try {
    const { data: txRows, error: txErr } = await supabaseSrv
      .from('transactions')
      .select('amount, amount_cents, category, merchant, memo, transaction_date, posted_at, occurred_at, date, created_at')
      .eq('user_id', params.userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
      .limit(5000);
    // ... rest of analytics logic
  } catch (e: any) {
    console.warn('[context] analytics failed', e?.message);
  }
}
```

---

### Step 5: Modify Budget Fetching

**Before:**
```typescript
// Always fetch budgets
let budgetsBlock = '';
if (params.employeeSlug === 'crystal-analytics') {
  try {
    const { data: budgets, error: bErr } = await supabaseSrv
      .from('budgets')
      .select('category, limit_amount, period, is_active')
      .eq('user_id', params.userId)
      .eq('is_active', true)
      .limit(20);
    if (!bErr && budgets?.length) {
      const lines = budgets.map(b => `- ${b.category}: ${b.limit_amount} (${b.period})`).join('\n');
      budgetsBlock = `## Active Budgets\n${lines}`;
    }
  } catch (e: any) {
    // No budgets table or RLS
  }
}
```

**After:**
```typescript
// Fetch budgets (conditional)
let budgetsBlock = '';
if (contextConfig.budgets && params.employeeSlug === 'crystal-analytics') {
  try {
    const { data: budgets, error: bErr } = await supabaseSrv
      .from('budgets')
      .select('category, limit_amount, period, is_active')
      .eq('user_id', params.userId)
      .eq('is_active', true)
      .limit(20);
    if (!bErr && budgets?.length) {
      const lines = budgets.map(b => `- ${b.category}: ${b.limit_amount} (${b.period})`).join('\n');
      budgetsBlock = `## Active Budgets\n${lines}`;
    }
  } catch (e: any) {
    // No budgets table or RLS
  }
}
```

---

### Step 6: Add Logging

Add this for monitoring:

```typescript
// Log context assembly timing and size
const contextAssemblyStart = Date.now();

// ... context fetching code ...

const contextAssemblyTime = Date.now() - contextAssemblyStart;
const contextSize = context.length;

console.log('[Crystal Context Assembly]', {
  time_ms: contextAssemblyTime,
  size_bytes: contextSize,
  layers_active: {
    facts: contextConfig.facts,
    history: contextConfig.history,
    analytics: contextConfig.analytics,
    budgets: contextConfig.budgets
  },
  user_id: params.userId
});
```

---

## 📋 ENVIRONMENT FILE

### `.env.local` (Development)
```bash
# Crystal Context Flags (1=on, 0=off)
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1
```

### `.env.production` (Production - Full Context)
```bash
CRYSTAL_CONTEXT_FACTS=1
CRYSTAL_CONTEXT_HISTORY=1
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=1
```

### `.env.production-perf` (Production - High Performance)
```bash
# Minimal context for max performance
CRYSTAL_CONTEXT_FACTS=0
CRYSTAL_CONTEXT_HISTORY=0
CRYSTAL_CONTEXT_ANALYTICS=1
CRYSTAL_CONTEXT_BUDGETS=0
```

---

## 🧪 TESTING

### Test 1: Full Context
```bash
export CRYSTAL_CONTEXT_FACTS=1
export CRYSTAL_CONTEXT_HISTORY=1
export CRYSTAL_CONTEXT_ANALYTICS=1
export CRYSTAL_CONTEXT_BUDGETS=1

npm run dev
# Test: "Show my top categories" → Should see full details
```

### Test 2: Analytics Only
```bash
export CRYSTAL_CONTEXT_FACTS=0
export CRYSTAL_CONTEXT_HISTORY=0
export CRYSTAL_CONTEXT_ANALYTICS=1
export CRYSTAL_CONTEXT_BUDGETS=0

npm run dev
# Test: Same query → Should be faster, less personal
```

### Test 3: No Analytics
```bash
export CRYSTAL_CONTEXT_FACTS=1
export CRYSTAL_CONTEXT_HISTORY=1
export CRYSTAL_CONTEXT_ANALYTICS=0
export CRYSTAL_CONTEXT_BUDGETS=0

npm run dev
# Test: "Show my spending" → Should still see history/facts, but no analytics
```

---

## 📊 VERIFICATION SCRIPT

Create `verify-context-flags.sh`:

```bash
#!/bin/bash

echo "🚩 Crystal Context Flags Configuration"
echo ""
echo "Current Settings:"
echo "  CRYSTAL_CONTEXT_FACTS=${CRYSTAL_CONTEXT_FACTS:-not set}"
echo "  CRYSTAL_CONTEXT_HISTORY=${CRYSTAL_CONTEXT_HISTORY:-not set}"
echo "  CRYSTAL_CONTEXT_ANALYTICS=${CRYSTAL_CONTEXT_ANALYTICS:-not set}"
echo "  CRYSTAL_CONTEXT_BUDGETS=${CRYSTAL_CONTEXT_BUDGETS:-not set}"
echo ""

# Check for defaults
FACTS=${CRYSTAL_CONTEXT_FACTS:-1}
HISTORY=${CRYSTAL_CONTEXT_HISTORY:-1}
ANALYTICS=${CRYSTAL_CONTEXT_ANALYTICS:-1}
BUDGETS=${CRYSTAL_CONTEXT_BUDGETS:-1}

echo "With Defaults:"
echo "  Facts:    $FACTS $([ "$FACTS" = "1" ] && echo "✅" || echo "❌")"
echo "  History:  $HISTORY $([ "$HISTORY" = "1" ] && echo "✅" || echo "❌")"
echo "  Analytics: $ANALYTICS $([ "$ANALYTICS" = "1" ] && echo "✅" || echo "❌")"
echo "  Budgets:  $BUDGETS $([ "$BUDGETS" = "1" ] && echo "✅" || echo "❌")"
```

Run:
```bash
chmod +x verify-context-flags.sh
./verify-context-flags.sh
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Added `contextConfig` object at top of file
- [ ] Wrapped facts fetching with `if (contextConfig.facts)`
- [ ] Wrapped history fetching with `if (contextConfig.history)`
- [ ] Wrapped analytics fetching with `if (contextConfig.analytics)`
- [ ] Wrapped budgets fetching with `if (contextConfig.budgets)`
- [ ] Added logging for context assembly
- [ ] Created `.env.production` with appropriate settings
- [ ] Tested with full context (all 1s)
- [ ] Tested with high performance (analytics only)
- [ ] Tested with conversation focus (no analytics)
- [ ] Verified response quality at each setting
- [ ] Checked performance metrics
- [ ] Updated deployment docs

---

## 📈 PERFORMANCE TARGETS

**Measure these after deployment:**

```
Query Time (per request):
  Full Context: < 350ms
  Analytics Only: < 200ms
  Minimal: < 50ms

DB Queries per Request:
  Full Context: 4-5 queries
  Analytics Only: 1 query
  Minimal: 0 queries

Response Quality:
  Full Context: Excellent
  Analytics Only: Good
  Minimal: Fair (generic)
```

---

## ✅ SUCCESS CRITERIA

- ✅ Context flags read from environment
- ✅ Each flag controls its corresponding layer
- ✅ Layers fetch conditionally (not all 4 every time)
- ✅ Performance improves when flags disabled
- ✅ Logging shows active layers
- ✅ No errors from missing tables when flags disabled
- ✅ Different configurations tested

---

## 📚 NEXT STEPS

1. **Deploy to Staging:** Test all 4 presets
2. **Monitor Metrics:** Track query time, DB load, user satisfaction
3. **A/B Test:** Try different configs with user cohorts
4. **Optimize:** Disable layers that don't improve UX
5. **Document:** Record your final configuration choices

---

**Status:** ✅ Ready to Implement  
**Time Estimate:** 5-10 minutes  
**Difficulty:** Easy  
**Impact:** High (performance + flexibility)  

🚀 **Deploy context flags to production!**





