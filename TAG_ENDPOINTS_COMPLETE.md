# 🏷️ Tag AI Endpoints – Complete Reference

## Overview

All Tag AI categorization endpoints with integration patterns and examples.

---

## Endpoint List

| Endpoint | Method | Purpose | Auth | Example |
|----------|--------|---------|------|---------|
| `/tag-categorize` | POST | Categorize transaction(s) | x-user-id | Batch or single |
| `/tag-categorize-dryrun` | POST | Preview without saving | x-user-id | Test suggestions |
| `/tag-correction` | POST | Lock/learn from user correction | x-user-id | Manual override |
| `/tag-categories` | GET | List user categories | x-user-id | Dropdown options |
| `/tag-rules` | GET/POST | Manage category rules | x-user-id | Automation |
| `/tag-tx-categ-history` | GET | Transaction categorization history | x-user-id | Analytics |
| `/tag-why` | GET | Explain categorization decision | x-user-id | User query |
| `/tag-export-corrections` | GET | CSV export of corrections | x-user-id | Download analytics |

---

## 1. /tag-categorize – Main Categorization

**POST** – Categorize one or more transactions

```bash
curl -X POST /.netlify/functions/tag-categorize \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-uuid" \
  -d '{
    "transaction_ids": ["tx-1", "tx-2"]
  }'
```

**Response:**
```json
{
  "ok": true,
  "results": [
    {
      "transaction_id": "tx-1",
      "category_id": "cat-123",
      "confidence": 0.95,
      "reason": "Similar to past: Starbucks → Coffee",
      "suggestions": [
        { "category_id": "cat-456", "confidence": 0.03, "label": "Food" },
        { "category_id": "cat-789", "confidence": 0.01, "label": "Utilities" }
      ]
    }
  ]
}
```

**UI Integration:**
```tsx
async function handleCategorize(txIds: string[]) {
  const resp = await fetch('/.netlify/functions/tag-categorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId
    },
    body: JSON.stringify({ transaction_ids: txIds })
  }).then(r => r.json());

  if (resp.ok) {
    // Update UI with results
    resp.results.forEach(r => {
      // Show category + confidence
      // If confidence < 0.6, show in LowConfidenceQueue
    });
  }
}
```

---

## 2. /tag-categorize-dryrun – Preview

**POST** – Test categorization without saving

```bash
curl -X POST /.netlify/functions/tag-categorize-dryrun \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-uuid" \
  -d '{
    "transaction_ids": ["tx-1"]
  }'
```

**Response:** Same as `/tag-categorize` (no side effects)

**Use Case:** User reviews suggestions before committing

---

## 3. /tag-correction – Learn from Corrections

**POST** – User corrects a categorization (locks as manual, trains AI)

```bash
curl -X POST /.netlify/functions/tag-correction \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-uuid" \
  -d '{
    "transaction_id": "tx-1",
    "to_category_id": "cat-456"
  }'
```

**Response:**
```json
{
  "ok": true,
  "transaction_id": "tx-1",
  "category_id": "cat-456",
  "source": "manual",
  "confidence": 1,
  "version": 2
}
```

**UI Integration (CategoryPill onChange):**
```tsx
<CategoryPill
  value={tx.category_id}
  confidence={tx.confidence}
  onChange={async (catId) => {
    const resp = await fetch('/.netlify/functions/tag-correction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId
      },
      body: JSON.stringify({
        transaction_id: tx.id,
        to_category_id: catId
      })
    }).then(r => r.json());

    if (resp.ok) {
      tx.category_id = catId;
      tx.source = 'manual';
      tx.confidence = 1;
      setRows([...rows]);
    }
  }}
/>
```

---

## 4. /tag-categories – List Categories

**GET** – Fetch all user categories

```bash
curl -X GET /.netlify/functions/tag-categories \
  -H "x-user-id: user-uuid"
```

**Response:**
```json
{
  "ok": true,
  "categories": [
    { "id": "cat-123", "name": "Coffee", "emoji": "☕" },
    { "id": "cat-456", "name": "Groceries", "emoji": "🛒" },
    { "id": "cat-789", "name": "Gas", "emoji": "⛽" }
  ]
}
```

**UI Integration (Dropdown options):**
```tsx
const { categories } = await fetch('/.netlify/functions/tag-categories', {
  headers: { 'x-user-id': userId }
}).then(r => r.json());

// Use in CategoryPill, LowConfidenceQueue dropdowns
```

---

## 5. /tag-rules – Manage Automation

**GET** – List rules

```bash
curl -X GET /.netlify/functions/tag-rules \
  -H "x-user-id: user-uuid"
```

**POST** – Create new rule

```bash
curl -X POST /.netlify/functions/tag-rules \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-uuid" \
  -d '{
    "merchant_name": "Starbucks",
    "category_id": "cat-123"
  }'
```

**UI Integration (Add Rule button):**
```tsx
<button
  onClick={() => setRuleModal({ open: true, merchant: tx.merchant_name })}
  className="..."
>
  Add Rule
</button>

{ruleModal.open && (
  <RuleBuilderModal
    merchant={ruleModal.merchant}
    onSave={async (merchant, categoryId) => {
      const resp = await fetch('/.netlify/functions/tag-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ merchant_name: merchant, category_id: categoryId })
      }).then(r => r.json());

      if (resp.ok) {
        // Refresh categorizations, close modal
      }
    }}
  />
)}
```

---

## 6. /tag-tx-categ-history – Analytics

**GET** – Transaction categorization history

```bash
curl -X GET "/.netlify/functions/tag-tx-categ-history?transaction_id=tx-1" \
  -H "x-user-id: user-uuid"
```

**Response:**
```json
{
  "ok": true,
  "history": [
    {
      "version": 2,
      "category_id": "cat-456",
      "source": "manual",
      "confidence": 1,
      "decided_at": "2025-10-19T10:00:00Z"
    },
    {
      "version": 1,
      "category_id": "cat-123",
      "source": "ai",
      "confidence": 0.82,
      "decided_at": "2025-10-19T09:50:00Z"
    }
  ]
}
```

**UI Integration (History modal):**
```tsx
<button
  onClick={() => setHistoryOpen(true)}
  className="..."
>
  History
</button>

{historyOpen && (
  <HistoryModal
    txId={tx.id}
    merchant={tx.merchant_name}
    onFetch={async () => {
      const resp = await fetch(
        `/.netlify/functions/tag-tx-categ-history?transaction_id=${tx.id}`,
        { headers: { 'x-user-id': userId } }
      ).then(r => r.json());
      return resp.history;
    }}
  />
)}
```

---

## 7. /tag-why – Explain Decision

**GET** – Why was this categorized this way?

```bash
curl -X GET "/.netlify/functions/tag-why?transaction_id=tx-1" \
  -H "x-user-id: user-uuid"
```

**Response:**
```json
{
  "ok": true,
  "explanation": {
    "tx": {
      "merchant_name": "Starbucks",
      "amount": 5.75,
      "posted_at": "2025-10-19",
      "memo": null
    },
    "latest": {
      "category_id": "cat-123",
      "source": "ai",
      "confidence": 0.95,
      "reason": "Similar to past: Starbucks → Coffee",
      "version": 1,
      "decided_at": "2025-10-19T09:50:00Z"
    },
    "ai": {
      "confidence": 0.95,
      "rationale": "Merchant name + amount match coffee shop pattern"
    },
    "suggestions": [
      "If this is wrong, pick the correct category to teach Tag.",
      "Create a rule if this merchant should always map to a category.",
      "Set a default category in Merchant Profile for repeat mappings."
    ]
  }
}
```

**Chat Integration (/why command):**
```tsx
if (intent === "why" || text?.startsWith("/why")) {
  const [, txId] = text.split(/\s+/);
  if (!txId) return replyErr("Usage: /why <transactionId>");

  const resp = await fetch(
    `/.netlify/functions/tag-why?transaction_id=${txId}`,
    { headers: { 'x-user-id': userId } }
  ).then(r => r.json());

  if (!resp?.ok) return replyErr("Could not explain this one.");

  const { tx, latest, ai, suggestions } = resp.explanation;
  return replyOk(
    `**Why** for ${tx.merchant_name} $${tx.amount.toFixed(2)} on ${tx.posted_at?.slice(0,10)}\n` +
    `• Category ID: ${latest.category_id ?? "Uncategorized"}\n` +
    `• Source: ${latest.source} @ v${latest.version} • Confidence: ${Math.round(latest.confidence*100)}%\n` +
    (latest.reason ? `• Reason: ${latest.reason}\n` : "") +
    (ai?.rationale ? `• AI note: ${ai.rationale}\n` : "") +
    `\nSuggestions:\n- ${suggestions.join("\n- ")}`
  );
}
```

---

## 8. /tag-export-corrections – Analytics Export

**GET** – Download categorization corrections as CSV

```bash
curl -X GET "/.netlify/functions/tag-export-corrections?windowDays=30" \
  -H "x-user-id: user-uuid" \
  -o corrections.csv
```

**CSV Format:**
```
transaction_id,created_at,from_category_id,to_category_id
tx-1,2025-10-19T10:00:00Z,cat-123,cat-456
tx-2,2025-10-19T09:50:00Z,cat-789,cat-123
```

**UI Integration (Download button):**
```tsx
<button
  onClick={() => {
    window.open(
      `/.netlify/functions/tag-export-corrections?windowDays=30`,
      "_blank"
    );
  }}
  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
>
  Download CSV (30 days)
</button>
```

---

## Complete Transaction Page Integration

```tsx
import { useState } from 'react';
import LowConfidenceQueue from '@/components/transactions/LowConfidenceQueue';
import { useLowConfidenceQueue } from '@/hooks/useLowConfidenceQueue';
import { useTransactions } from '@/hooks/useTransactions';

export default function TransactionsPage() {
  const userId = 'current-user-id';
  const { rows, setRows } = useTransactions();
  const [historyModal, setHistoryModal] = useState({ open: false });
  const [ruleModal, setRuleModal] = useState({ open: false });

  const { correctTransaction, approveAllLowConfidence } = useLowConfidenceQueue({
    userId,
    onReloadMetrics: async () => {
      // Refresh dashboard data
    },
  });

  return (
    <div className="space-y-6 p-6">
      {/* Low-Confidence Queue */}
      <LowConfidenceQueue
        rows={rows}
        onApproveAll={async () => {
          await approveAllLowConfidence(rows);
          setRows([...rows]);
        }}
        onOpenHistory={(txId, merchant) => {
          setHistoryModal({ open: true, txId, merchant });
        }}
        onOpenRule={(merchant, catId) => {
          setRuleModal({ open: true, merchant, catId });
        }}
        onCorrect={async (tx, catId) => {
          await correctTransaction(tx, catId);
          setRows([...rows]);
        }}
      />

      {/* Export Button */}
      <button
        onClick={() => {
          window.open(
            `/.netlify/functions/tag-export-corrections?windowDays=30`,
            "_blank"
          );
        }}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
      >
        Download CSV (30 days)
      </button>

      {/* Main Table */}
      <TransactionListTable rows={rows} onUpdate={setRows} />
    </div>
  );
}
```

---

## Authentication & Headers

**All endpoints require:**
```
x-user-id: <user-uuid>
```

**POST endpoints also require:**
```
Content-Type: application/json
```

---

## Error Handling

**Standard error response:**
```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

**Common status codes:**
- `200` – Success
- `400` – Bad request (missing params)
- `401` – Unauthorized (no x-user-id)
- `404` – Not found (tx, category, etc.)
- `405` – Method not allowed
- `500` – Server error

---

## Performance Notes

- All endpoints are **authenticated** (RLS via x-user-id)
- All POST operations **idempotent** (retry-safe)
- CSV exports **paginated** by windowDays (max 90)
- Batch categorization **sequential** (consider parallel if perf needed)

---

## Testing Commands

```bash
# Test categorization
curl -X POST http://localhost:8888/.netlify/functions/tag-categorize \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-1" \
  -d '{"transaction_ids": ["test-tx-1"]}'

# Test correction
curl -X POST http://localhost:8888/.netlify/functions/tag-correction \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user-1" \
  -d '{"transaction_id": "test-tx-1", "to_category_id": "cat-123"}'

# Test why explanation
curl http://localhost:8888/.netlify/functions/tag-why?transaction_id=test-tx-1 \
  -H "x-user-id: test-user-1"

# Download CSV
curl http://localhost:8888/.netlify/functions/tag-export-corrections?windowDays=30 \
  -H "x-user-id: test-user-1" \
  -o corrections.csv
```

---

**Status:** ✅ All endpoints implemented and documented  
**Last Updated:** 2025-10-19





