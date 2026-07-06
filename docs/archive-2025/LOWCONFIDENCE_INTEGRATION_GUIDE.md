# 📋 Low-Confidence Queue Integration Guide

## Overview

The `LowConfidenceQueue` component displays transactions with **< 60% AI confidence** and allows users to:
- ✅ **Batch approve** all suggestions as-is (locks them as manual)
- ✅ **Individual correct** via `CategoryPill` dropdown
- ✅ **View history** of categorizations for a merchant
- ✅ **Create rules** to automate future similar transactions

---

## Components & Hooks

### 1. **LowConfidenceQueue Component**
```
src/components/transactions/LowConfidenceQueue.tsx
```

**Props:**
```typescript
{
  rows: TxRow[];                           // All transactions
  onApproveAll: () => Promise<void>;       // Batch approve handler
  onChooseTopSuggestion?: () => Promise<void>; // Future: auto-select top
  onOpenHistory: (txId, merchant) => void; // Show history modal
  onOpenRule: (merchant, catId) => void;   // Show rule builder
  onCorrect: (tx, to_category_id) => Promise<void>; // Individual correct
}
```

**Behavior:**
- Filters rows where `confidence < 0.6`
- Shows only first 10 items (paginate if needed)
- Displays confidence % next to CategoryPill
- Empty state: "All caught up. 🎉"

---

### 2. **useLowConfidenceQueue Hook**
```
src/hooks/useLowConfidenceQueue.ts
```

**Usage:**
```typescript
const { isLoading, error, correctTransaction, approveAllLowConfidence } = useLowConfidenceQueue({
  userId: currentUser.id,
  onReloadMetrics: async () => {
    // Called after batch approve
    // Reload charts, stats, etc.
  },
});
```

**Methods:**
- `correctTransaction(tx, to_category_id)` – Single correction
- `approveAllLowConfidence(rows)` – Batch approve all < 60%

---

## Integration: Complete Example

### Step 1: Import Components & Hooks

```tsx
import { useState, useEffect } from 'react';
import LowConfidenceQueue from '@/components/transactions/LowConfidenceQueue';
import { useLowConfidenceQueue } from '@/hooks/useLowConfidenceQueue';
import { useTransactions } from '@/hooks/useTransactions';
import { useMetrics } from '@/hooks/useMetrics';
import TransactionListTable from '@/components/transactions/TransactionListTable';
```

### Step 2: Set Up State & Hooks

```tsx
export default function TransactionsPage() {
  const userId = 'current-user-id'; // From auth context
  const { rows, setRows } = useTransactions();
  const { reloadMetrics } = useMetrics();

  // History modal state
  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    txId?: string;
    merchant?: string;
  }>({ open: false });

  // Rule builder modal state
  const [ruleModal, setRuleModal] = useState<{
    open: boolean;
    merchant?: string;
    categoryId?: string | null;
  }>({ open: false });

  // Low-confidence queue hook
  const { isLoading, error, correctTransaction, approveAllLowConfidence } =
    useLowConfidenceQueue({
      userId,
      onReloadMetrics: reloadMetrics,
    });

  // Handlers
  const handleApproveAll = async () => {
    try {
      await approveAllLowConfidence(rows);
      setRows([...rows]); // Trigger re-render
    } catch (err) {
      console.error('Batch approve failed:', err);
    }
  };

  const handleCorrect = async (tx: TxRow, to_category_id: string) => {
    try {
      await correctTransaction(tx, to_category_id);
      setRows([...rows]); // Trigger re-render
    } catch (err) {
      console.error('Correction failed:', err);
    }
  };

  const handleOpenHistory = (txId: string, merchant?: string) => {
    setHistoryModal({ open: true, txId, merchant });
  };

  const handleOpenRule = (merchant?: string, categoryId?: string | null) => {
    setRuleModal({ open: true, merchant, categoryId });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Low-Confidence Queue */}
      <LowConfidenceQueue
        rows={rows}
        onApproveAll={handleApproveAll}
        onOpenHistory={handleOpenHistory}
        onOpenRule={handleOpenRule}
        onCorrect={handleCorrect}
      />

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-400">
          Error: {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-sm text-gray-400">Processing...</div>
      )}

      {/* Main Transaction List */}
      <TransactionListTable
        rows={rows}
        onUpdate={setRows}
      />

      {/* History Modal – implement or use existing */}
      {historyModal.open && (
        <HistoryModal
          txId={historyModal.txId}
          merchant={historyModal.merchant}
          onClose={() => setHistoryModal({ open: false })}
        />
      )}

      {/* Rule Builder Modal – implement or use existing */}
      {ruleModal.open && (
        <RuleBuilderModal
          merchant={ruleModal.merchant}
          categoryId={ruleModal.categoryId}
          onClose={() => setRuleModal({ open: false })}
          onSave={async (rule) => {
            // Save rule via API
            // Trigger re-filter of low-confidence
          }}
        />
      )}
    </div>
  );
}
```

---

## Data Flow

```
User taps "Approve All"
    ↓
useLowConfidenceQueue.approveAllLowConfidence()
    ↓
For each tx where confidence < 0.6:
  - POST to /.netlify/functions/tag-correction
  - Set tx.source = "manual"
  - Set tx.confidence = 1
    ↓
reloadMetrics() callback fires
    ↓
Component re-renders with filtered rows
    ↓
LowConfidenceQueue shows "All caught up. 🎉"
```

---

## API Integration: /tag-correction

The hook calls this endpoint for each correction:

```
POST /.netlify/functions/tag-correction
Headers:
  Content-Type: application/json
  x-user-id: {userId}

Body:
{
  "transaction_id": "uuid",
  "user_id": "uuid",
  "to_category_id": "uuid"
}

Response:
{
  "transaction_id": "uuid",
  "category_id": "uuid",
  "source": "manual",
  "confidence": 1,
  "updated_at": "2025-10-19T..."
}
```

---

## CategoryPill Integration

The `CategoryPill` component inside each low-confidence row:
- Shows current category (or "Uncat" if null)
- Opens dropdown on click
- On select, calls `onCorrect(tx, catId)`
- Displays confidence % badge

**Props:**
```tsx
<CategoryPill
  value={tx.category_id ?? null}
  confidence={tx.confidence}
  onChange={(catId) => onCorrect(tx, catId!)}
/>
```

---

## Optional Features (Future)

### 1. **Auto-Choose Top Suggestions**
```tsx
onChooseTopSuggestion={async () => {
  // Call server to compute top 3 suggestions
  // User picks from top 3 automatically
}}
```

### 2. **Pagination**
```tsx
// Currently shows first 10, add pagination:
const [page, setPage] = useState(0);
const pageSize = 10;
const paginatedRows = lowRows.slice(
  page * pageSize,
  (page + 1) * pageSize
);
```

### 3. **Inline History Tooltip**
```tsx
// Hover on merchant name to show last 3 categorizations
```

---

## Error Handling

The hook includes:
- ✅ Try-catch around each correction
- ✅ Batch continues even if one fails
- ✅ Error state for UI feedback
- ✅ Loading state during operations

**In UI:**
```tsx
{error && (
  <div className="p-3 rounded-lg bg-red-500/20 text-red-400">
    {error}
  </div>
)}

{isLoading && <Spinner />}
```

---

## Testing Checklist

- [ ] Open TransactionsPage with low-confidence items
- [ ] See LowConfidenceQueue filtered to < 60%
- [ ] Click "Approve All" → all items lock (confidence = 1, source = "manual")
- [ ] Count shows "0 to review" after approve
- [ ] Click CategoryPill on an item → dropdown opens
- [ ] Select different category → item corrects + re-renders
- [ ] Click "History" → modal opens with merchant history
- [ ] Click "Add Rule" → rule builder modal opens
- [ ] Handle errors gracefully (network down, auth fail, etc.)
- [ ] Check console for no warnings/errors
- [ ] Metrics reload after batch/individual actions

---

## File Locations

| File | Purpose |
|------|---------|
| `src/components/transactions/LowConfidenceQueue.tsx` | Queue display component |
| `src/hooks/useLowConfidenceQueue.ts` | Queue logic hook |
| `src/components/transactions/TransactionListTable.tsx` | Main table (above/below queue) |
| `src/hooks/useTransactions.ts` | Transaction data fetching |
| `src/hooks/useMetrics.ts` | Metrics dashboard data |
| `src/components/CategoryPill.tsx` | Category selector |
| `netlify/functions/tag-correction.ts` | Backend endpoint |

---

## Performance Notes

- **Max 10 items** in queue to avoid UI lag
- **Batch corrections** loop through with sequential POSTs (consider parallel if needed)
- **Metrics reload** deferred until batch complete
- **Local state updates** before API response (optimistic UI)

---

## Accessibility

- ✅ Buttons have clear labels
- ✅ Confidence % shown numerically + visually
- ✅ Keyboard navigable (Tab through buttons, Enter to click)
- ✅ Error messages clear and visible
- ✅ Loading state indicated

---

## Related Components

- **TransactionListTable** – Main transaction grid
- **CategoryPill** – Category selector (embedded in queue)
- **HistoryModal** – Show categorization history (to implement)
- **RuleBuilderModal** – Create category rules (to implement)

---

**Integration Status:** ✅ Ready for use  
**Last Updated:** 2025-10-19





