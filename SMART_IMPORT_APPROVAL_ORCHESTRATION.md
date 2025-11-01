# ⚙️ SMART IMPORT APPROVAL ORCHESTRATION

**Purpose:** Complete end-to-end orchestration from approval through Prime & Crystal analysis  
**Status:** ✅ Production-Ready  
**Pattern:** Sequential API Calls + Event Broadcasting  

---

## 📋 OVERVIEW

### Complete Orchestration Flow

```
User clicks "Approve & Commit"
    ↓ (emit import:approve)
SmartImportAI page receives event
    ↓ (sequential calls)
1. Call commit-import
    ↓ (rows committed to DB)
2. Call prime-handoff
    ↓ (create handoff, Prime acknowledges)
3. Call crystal-analyze-import
    ↓ (Crystal analyzes, generates insights)
emit advisory:ready
    ↓ (broadcast to advisory card)
AdvisoryCard displays results
    ↓ (show summary, budget impact, forecast delta)
User sees complete analysis ✅
```

---

## 🎯 EVENT ORCHESTRATION

### The `import:approve` Event Listener

**File:** `src/pages/dashboard/SmartImportAI.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { bus } from '@/lib/bus';

export default function SmartImportAI() {
  const { userId } = useAuthContext();
  const [advisoryResult, setAdvisoryResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // =========================================================================
  // ORCHESTRATION: Approval → Commit → Prime → Crystal
  // =========================================================================
  useEffect(() => {
    const off = bus.on('import:approve', async ({ importId }: any) => {
      console.log('[Orchestration] Starting approval chain', { importId });
      setIsProcessing(true);

      try {
        // =====================================================================
        // STEP 1: COMMIT TRANSACTIONS
        // =====================================================================
        console.log('[Orchestration] Step 1: Committing transactions...');
        bus.emit('import:commit:start', { importId, userId });

        const commitRes = await fetch('/.netlify/functions/commit-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, importId })
        }).then(r => r.json());

        if (!commitRes.ok) {
          throw new Error(commitRes.error || 'Commit failed');
        }

        console.log('[Orchestration] ✅ Commit complete', {
          committed: commitRes.committed
        });

        bus.emit('import:commit:complete', {
          importId,
          committed: commitRes.committed
        });

        // =====================================================================
        // STEP 2: PRIME HANDOFF & ACKNOWLEDGMENT
        // =====================================================================
        console.log('[Orchestration] Step 2: Prime handoff...');
        bus.emit('prime:handoff:start', { importId });

        const primeRes = await fetch('/.netlify/functions/prime-handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, importId })
        }).then(r => r.json());

        if (!primeRes.handoffId) {
          throw new Error(primeRes.error || 'Prime handoff failed');
        }

        console.log('[Orchestration] ✅ Prime acknowledged', {
          handoffId: primeRes.handoffId,
          message: primeRes.primeMessage
        });

        bus.emit('prime:message', {
          message: primeRes.primeMessage,
          handoffId: primeRes.handoffId
        });

        // =====================================================================
        // STEP 3: CRYSTAL FINANCIAL ANALYSIS
        // =====================================================================
        console.log('[Orchestration] Step 3: Crystal analysis...');
        bus.emit('crystal:analyze:start', {
          importId,
          handoffId: primeRes.handoffId
        });

        const crystalRes = await fetch('/.netlify/functions/crystal-analyze-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            handoffId: primeRes.handoffId
          })
        }).then(r => r.json());

        if (!crystalRes.summary) {
          throw new Error(crystalRes.error || 'Crystal analysis failed');
        }

        console.log('[Orchestration] ✅ Crystal analysis complete', {
          handoffId: crystalRes.handoffId,
          summary: crystalRes.summary.substring(0, 100) + '...'
        });

        // =====================================================================
        // STEP 4: BROADCAST RESULTS
        // =====================================================================
        const advisory = {
          importId,
          handoffId: primeRes.handoffId,
          committed: commitRes.committed,
          summary: crystalRes.summary,
          budgetImpact: crystalRes.budgetImpact,
          forecastDelta: crystalRes.forecastDelta,
          topCategories: crystalRes.topCategories,
          timestamp: new Date().toISOString()
        };

        console.log('[Orchestration] ✅ Complete! Broadcasting advisory', advisory);

        setAdvisoryResult(advisory);

        // Emit to advisory card (or any other listeners)
        bus.emit('advisory:ready', advisory);

        // Update page status
        bus.emit('import:complete', {
          importId,
          status: 'analyzed',
          advisory
        });
      } catch (err: any) {
        console.error('[Orchestration] ❌ Error in approval chain:', err);

        const errorPayload = {
          importId,
          error: err.message,
          stage: 'unknown'
        };

        bus.emit('import:error', errorPayload);
        setAdvisoryResult({ error: err.message });
      } finally {
        setIsProcessing(false);
      }
    });

    return () => off();
  }, [userId]);

  // ... rest of component ...
}
```

---

## 📊 DETAILED ORCHESTRATION STEPS

### Step 1: Commit Transactions

**Purpose:** Move staged transactions from `transactions_staging` to final `transactions` table

**Call:**
```typescript
POST /.netlify/functions/commit-import
{
  userId: string;
  importId: string;
}
```

**Response:**
```json
{
  "ok": true,
  "committed": 42
}
```

**What Happens:**
1. Read rows from `transactions_staging` (filtered by import_id)
2. Upsert to `transactions` table (hash-based idempotency)
3. Update `imports` status to `committed`
4. Return number of rows committed

**Events Emitted:**
```typescript
bus.emit('import:commit:start', { importId, userId });
bus.emit('import:commit:complete', { importId, committed: 42 });
```

---

### Step 2: Prime Handoff

**Purpose:** Create handoff record, Prime acknowledges import, prepares context for Crystal

**Call:**
```typescript
POST /.netlify/functions/prime-handoff
{
  userId: string;
  importId: string;
}
```

**Response:**
```json
{
  "ok": true,
  "handoffId": "hoff_uuid",
  "primeMessage": "I've successfully processed your import...",
  "transactionCount": 42,
  "importedAt": "2025-10-18T15:30:45Z"
}
```

**What Happens:**
1. Fetch import record & transaction count
2. Create `handoffs` record (from: prime-boss, to: crystal-analytics)
3. Save Prime's acknowledgment message to `chat_messages`
4. Return handoff ID for next step

**Events Emitted:**
```typescript
bus.emit('prime:handoff:start', { importId });
bus.emit('prime:message', { message, handoffId });
```

---

### Step 3: Crystal Analysis

**Purpose:** Crystal performs financial analysis on committed transactions and generates insights

**Call:**
```typescript
POST /.netlify/functions/crystal-analyze-import
{
  userId: string;
  handoffId: string;
}
```

**Response:**
```json
{
  "ok": true,
  "handoffId": "hoff_uuid",
  "summary": "Based on your transactions...",
  "budgetImpact": "Food spending increased 23%...",
  "forecastDelta": "Monthly projection ↑ 15%",
  "topCategories": [
    "Food: $450.50",
    "Transport: $120.00",
    "Other: $89.99"
  ]
}
```

**What Happens:**
1. Fetch handoff record & recent transactions
2. Fetch user facts for context
3. Compute spending analytics (trends, MoM, top drivers)
4. Call OpenAI as Crystal with enriched context
5. Extract structured insights
6. Save advice to `advice_messages` table
7. Update handoff status to `completed`

**Events Emitted:**
```typescript
bus.emit('crystal:analyze:start', { importId, handoffId });
bus.emit('crystal:analyze:complete', { handoffId, advice });
```

---

## 🎨 APPROVAL BUTTON & FLOW

### In SmartImportAI Page

```typescript
// src/pages/dashboard/SmartImportAI.tsx

const handleApproveCommit = async () => {
  if (!importId) return;

  // Emit the orchestration trigger
  bus.emit('import:approve', { importId });
};

// In JSX:
<button
  onClick={handleApproveCommit}
  disabled={isProcessing}
  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition"
>
  {isProcessing ? (
    <>
      <span className="inline-block animate-spin mr-2">⏳</span>
      Processing...
    </>
  ) : (
    <>✅ Approve & Commit ({parsedPreview.length} transactions)</>
  )}
</button>
```

---

## 📈 ADVISORY CARD COMPONENT

### Display Crystal's Insights

**File:** `src/ui/components/AdvisoryCard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { bus } from '@/lib/bus';

interface AdvisoryResult {
  importId: string;
  handoffId: string;
  committed: number;
  summary: string;
  budgetImpact: string;
  forecastDelta: string;
  topCategories: string[];
  timestamp: string;
}

export function AdvisoryCard() {
  const [advisory, setAdvisory] = useState<AdvisoryResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const off = bus.on('advisory:ready', (data: AdvisoryResult) => {
      console.log('[AdvisoryCard] Received advisory', data);
      setAdvisory(data);
      setIsVisible(true);
    });

    return () => off();
  }, []);

  if (!isVisible || !advisory) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl max-w-md p-6 border-l-4 border-purple-600 z-40">
      {/* HEADER */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">💎 Crystal's Insights</h3>
          <p className="text-xs text-slate-500 mt-1">
            {new Date(advisory.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* COMMITMENT SUMMARY */}
      <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm font-semibold text-green-900">
          ✅ {advisory.committed} transactions committed
        </p>
      </div>

      {/* SUMMARY */}
      <div className="mb-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          {advisory.summary}
        </p>
      </div>

      {/* TOP CATEGORIES */}
      {advisory.topCategories && advisory.topCategories.length > 0 && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs font-semibold text-slate-600 mb-2">📊 Top Categories</p>
          <div className="space-y-1">
            {advisory.topCategories.map((cat, i) => (
              <p key={i} className="text-xs text-slate-700">
                {cat}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* BUDGET IMPACT */}
      {advisory.budgetImpact && (
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-900 mb-2">⚠️ Budget Impact</p>
          <p className="text-xs text-yellow-800 leading-relaxed">
            {advisory.budgetImpact}
          </p>
        </div>
      )}

      {/* FORECAST DELTA */}
      {advisory.forecastDelta && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-blue-900 mb-2">📈 Forecast Update</p>
          <p className="text-xs text-blue-800 leading-relaxed">
            {advisory.forecastDelta}
          </p>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex gap-2 pt-4 border-t border-slate-200">
        <button className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded transition">
          📊 View Transactions
        </button>
        <button className="flex-1 px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition">
          🤖 Chat with Crystal
        </button>
      </div>
    </div>
  );
}
```

---

## 🔄 ERROR HANDLING & RECOVERY

### Error Scenarios

```typescript
// SmartImportAI.tsx - Enhanced error handling

useEffect(() => {
  const off = bus.on('import:approve', async ({ importId }: any) => {
    try {
      // STEP 1: Commit
      const commitRes = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, importId })
      }).then(r => r.json());

      if (!commitRes.ok) {
        // ❌ Commit failed
        bus.emit('import:error', {
          importId,
          stage: 'commit',
          error: commitRes.error,
          message: 'Failed to commit transactions. Data remains in staging.',
          recoverySteps: [
            'Check database connections',
            'Verify transaction hash uniqueness',
            'Retry the operation'
          ]
        });
        return;
      }

      // STEP 2: Prime handoff
      const primeRes = await fetch('/.netlify/functions/prime-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, importId })
      }).then(r => r.json());

      if (!primeRes.handoffId) {
        // ❌ Prime handoff failed (but data is committed!)
        bus.emit('import:partial_error', {
          importId,
          stage: 'prime_handoff',
          error: primeRes.error,
          message: 'Transactions committed but Prime handoff failed.',
          committed: commitRes.committed
        });
        return;
      }

      // STEP 3: Crystal analysis
      const crystalRes = await fetch('/.netlify/functions/crystal-analyze-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          handoffId: primeRes.handoffId
        })
      }).then(r => r.json());

      if (!crystalRes.summary) {
        // ❌ Crystal failed (but everything else succeeded!)
        bus.emit('import:partial_error', {
          importId,
          stage: 'crystal_analysis',
          error: crystalRes.error,
          message: 'Transactions committed and Prime acknowledged, but Crystal analysis failed.',
          committed: commitRes.committed,
          handoffId: primeRes.handoffId
        });
        return;
      }

      // ✅ SUCCESS: All steps complete
      bus.emit('advisory:ready', {
        importId,
        handoffId: primeRes.handoffId,
        committed: commitRes.committed,
        summary: crystalRes.summary,
        budgetImpact: crystalRes.budgetImpact,
        forecastDelta: crystalRes.forecastDelta,
        topCategories: crystalRes.topCategories
      });

    } catch (err: any) {
      // Network or unexpected error
      bus.emit('import:error', {
        importId,
        stage: 'unknown',
        error: err.message,
        networkError: true
      });
    }
  });

  return () => off();
}, [userId]);
```

---

## 📊 ORCHESTRATION TIMING

### Expected Durations

```
┌─────────────────────────────────────────────────────────┐
│ APPROVAL ORCHESTRATION TIMING                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Commit:      ~500ms   (DB write)                    │
│    ├─ Read staging rows:  50ms                         │
│    ├─ Upsert to final:    300ms                        │
│    └─ Update import:      150ms                        │
│                                                         │
│ 2. Prime Handoff: ~1000ms (Create records + messaging) │
│    ├─ Fetch context:      300ms                        │
│    ├─ Create handoff:     200ms                        │
│    ├─ Save message:       200ms                        │
│    └─ Return:             300ms                        │
│                                                         │
│ 3. Crystal Analysis: ~3000ms (LLM inference)           │
│    ├─ Fetch transactions: 300ms                        │
│    ├─ Compute analytics:  500ms                        │
│    ├─ Call OpenAI:        2000ms ⏱️ (longest)          │
│    ├─ Parse insights:     100ms                        │
│    └─ Save advice:        100ms                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ TOTAL:     ~4500ms = 4.5 seconds                       │
└─────────────────────────────────────────────────────────┘
```

### Optimal User Experience

```
User clicks "Approve"
    ↓ (button disables, show spinner)
    ↓
~4.5s processing
    ↓
Advisory card appears with results
    ↓ (enable "View Transactions" & "Chat with Crystal" buttons)
    ↓
User can navigate or continue
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Create `import:approve` event listener in SmartImportAI
- [ ] Implement Step 1: commit-import call
- [ ] Implement Step 2: prime-handoff call
- [ ] Implement Step 3: crystal-analyze-import call
- [ ] Emit `advisory:ready` event after all steps
- [ ] Create `AdvisoryCard` component
- [ ] Add advisory card listener to emit
- [ ] Add error handling for each step
- [ ] Add partial error handling (if one step fails)
- [ ] Test complete flow end-to-end
- [ ] Test with 10, 50, 100+ transactions
- [ ] Test error recovery (network failures)
- [ ] Monitor timing in production
- [ ] Add telemetry for each step duration
- [ ] Create user-facing error messages

---

## 🎯 EVENT SEQUENCE (Complete)

| # | Event | Source | Trigger | Payload |
|---|-------|--------|---------|---------|
| 1 | `import:approve` | Button | User clicks approve | `{importId}` |
| 2 | `import:commit:start` | SmartImportAI | Before API call | `{importId, userId}` |
| 3 | `import:commit:complete` | SmartImportAI | After API success | `{importId, committed}` |
| 4 | `prime:handoff:start` | SmartImportAI | Before API call | `{importId}` |
| 5 | `prime:message` | SmartImportAI | After API success | `{message, handoffId}` |
| 6 | `crystal:analyze:start` | SmartImportAI | Before API call | `{importId, handoffId}` |
| 7 | `crystal:analyze:complete` | SmartImportAI | After API success | `{handoffId, advice}` |
| 8 | `advisory:ready` | SmartImportAI | All steps done ✅ | `{advisory}` |
| — | `import:error` | SmartImportAI | Any step fails ❌ | `{error, stage}` |
| — | `import:partial_error` | SmartImportAI | Later step fails ⚠️ | `{committed, handoffId, error}` |

---

## 🔗 RELATED GUIDES

- [`SMART_IMPORT_INTEGRATION_FLOW.md`](./SMART_IMPORT_INTEGRATION_FLOW.md) — End-to-end flow
- [`BYTE_OCR_TWO_STAGE_COMMIT.md`](./BYTE_OCR_TWO_STAGE_COMMIT.md) — Two-stage pipeline
- [`SMART_IMPORT_UI_HELPERS.md`](./SMART_IMPORT_UI_HELPERS.md) — UI helpers
- [`SMART_IMPORT_GUARDRAILS_LOGGING.md`](./SMART_IMPORT_GUARDRAILS_LOGGING.md) — Security

---

## 🎯 SUMMARY

✅ **Sequential Orchestration:** Commit → Prime → Crystal  
✅ **Event Broadcasting:** Each step emits status events  
✅ **Advisory Results:** Crystal insights shown in card  
✅ **Error Handling:** Graceful failures with recovery steps  
✅ **User Feedback:** Real-time progress & final results  
✅ **Timing:** ~4.5s total (acceptable for financial analysis)  

**Files:**
- `src/pages/dashboard/SmartImportAI.tsx` (orchestration listener)
- `src/ui/components/AdvisoryCard.tsx` (results display)
- `netlify/functions/commit-import.ts` (already exists)
- `netlify/functions/prime-handoff.ts` (already exists)
- `netlify/functions/crystal-analyze-import.ts` (already exists)

---

**Last Updated:** October 18, 2025






