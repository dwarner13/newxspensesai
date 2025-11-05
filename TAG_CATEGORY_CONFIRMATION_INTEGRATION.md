# Tag AI — Category Confirmation Integration Guide

**Status:** ✅ **COMPLETE**  
**Date:** October 19, 2025  
**Version:** 1.0

---

## 📋 Overview

A comprehensive guide for integrating the **CategoryConfirmation component** into your transaction import/categorization flow. This enables:

- ✅ **Confidence-based UX** — High confidence (≥70%) auto-accept, low confidence (<70%) ask user
- ✅ **Top 3 alternatives** — Let user pick from suggestions
- ✅ **Inline confirmation** — No modal, stays in context
- ✅ **Automatic learning** — User corrections create new rules via `/tag-correction`
- ✅ **Visual feedback** — Confidence dots + color indicators
- ✅ **Redacted reasons** — Show why (safely, no PII)

---

## 🎯 UX Flow

```
User uploads transactions
         ↓
Tag categorizes (rules → AI → default)
         ↓
Component receives results
         ↓
High confidence (≥70%)?
  ├─ YES → Show ✅ green badge (done)
  └─ NO → Show ⚠️ yellow card → Expand options
         ↓
User picks from top 3 suggestions
         ↓
onClick → call /tag-correction
         ↓
System learns new rule
         ↓
Dismiss & continue
```

---

## 🔌 Integration Steps

### Step 1: Import Component & Hook

```typescript
// Inside your page/component
import { CategoryConfirmation, useCategoryConfirmation } from "@/ui/components/CategoryConfirmation";
```

### Step 2: Initialize Hook

```typescript
export function MyTransactionPage() {
  const { results, isLoading, categorize, confirm, clear } = useCategoryConfirmation();
  const { userId } = useAuth();

  // ... rest of component
}
```

### Step 3: Categorize After Upload

```typescript
async function handleTransactionsSaved(savedTxns: Transaction[]) {
  // Format for categorization
  const formatted = savedTxns.map((t) => ({
    id: t.id,
    user_id: userId,
    merchant_name: t.vendor_raw || t.description,
    amount: t.amount,
    memo: t.memo,
    posted_at: t.posted_at,
  }));

  try {
    // Trigger categorization (shows results automatically)
    await categorize(userId, formatted);
    toast.success(`Categorized ${formatted.length} transactions`);
  } catch (err) {
    toast.error("Categorization failed");
  }
}
```

### Step 4: Render Component

```typescript
return (
  <div className="space-y-4">
    {/* Upload UI */}
    {/* ... */}

    {/* Categorization results with inline confirmation */}
    {results.length > 0 && (
      <CategoryConfirmation
        results={results}
        onConfirm={async (txId, catId) => {
          await confirm(txId, catId);
          toast.success("Updated & learned!");
        }}
        onDismiss={() => {
          clear();
          toast.info("Done reviewing categorizations");
        }}
        maxVisible={5}
      />
    )}

    {/* Loading indicator */}
    {isLoading && <Spinner />}
  </div>
);
```

---

## 🎨 Component Behavior

### High Confidence (≥70%)

```
┌─────────────────────────────────┐
│ Transaction abc123…             │
│ Source: rule • Matched Amazon…  │
│ ────────────────────────────────│
│ 📊 ●●●●● 95%              ✅   │
└─────────────────────────────────┘
```

- **Green** background
- **Checkmark** indicator
- No interaction needed
- Auto-accepted

### Low Confidence (<70%)

```
┌─────────────────────────────────┐
│ Transaction def456…             │
│ Source: ai • Unknown merchant    │
│ ────────────────────────────────│
│ 📊 ●●○○○ 45%  [v]              │
└─────────────────────────────────┘
    ↓ User clicks [v] to expand
┌─────────────────────────────────┐
│ Choose correct category:        │
│                                 │
│ [✓] Entertainment (45%)         │
│    Suggested                    │
│                                 │
│ Or choose alternatives:         │
│ [↓] Shopping (38%)              │
│ [↓] Dining (22%)                │
│ [↓] Gas & Fuel (15%)            │
│                                 │
│ [Skip for now]                  │
└─────────────────────────────────┘
    ↓ User clicks one
    ↓ confirm() called
    ↓ /tag-correction invoked
    ↓ Rule learned
    ↓ Result dismissed
```

- **Yellow** background (warning)
- **Chevron** expand button
- Shows top 3 alternatives
- **Skip** button to defer decision

---

## 💡 Advanced Usage

### Custom Confirmation Handler

```typescript
// Instead of using the hook's confirm()
async function handleCustomConfirmation(txId: string, catId: string) {
  try {
    // Call correction endpoint directly
    const resp = await fetch("/.netlify/functions/tag-correction", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({
        transaction_id: txId,
        to_category_id: catId,
        note: "Manual override via UI",
      }),
    }).then((r) => r.json());

    // Log to Crystal for insights
    await logToCrystal(userId, "category-corrected", {
      transactionId: txId,
      toCategory: catId,
      learned: resp.learned,
    });

    // Remove from results
    setResults((prev) => prev.filter((r) => r.transaction_id !== txId));

    toast.success(`✓ Updated. ${resp.learned?.rule_created ? "📚 New rule learned!" : ""}`);
  } catch (err) {
    toast.error("Failed to confirm category");
  }
}

// Use in component
<CategoryConfirmation
  results={results}
  onConfirm={handleCustomConfirmation}
  onDismiss={clear}
/>
```

### Integration with Smart Import AI

```typescript
// In SmartImportAI.tsx after commit

const approveAndAnalyze = async () => {
  // ... existing steps ...

  // After categorize-transactions completes
  const { results, isLoading, categorize, confirm, clear } =
    useCategoryConfirmation();

  // Fetch updated transactions with categories
  const txnsWithCats = await fetchTransactionsWithCategories(importId);

  // Show confirmation UI
  await categorize(userId, txnsWithCats);

  // Now CategoryConfirmation component handles rest
  // (user can confirm/skip, system learns)
};
```

### Batch Processing with Progress

```typescript
export function BatchCategoryConfirmation() {
  const [batches, setBatches] = useState<CategorizationResult[][]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const { results, categorize, confirm, clear } = useCategoryConfirmation();

  const handleNextBatch = async () => {
    if (currentBatch < batches.length - 1) {
      setCurrentBatch((p) => p + 1);
      clear(); // Show next batch
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium">
          Batch {currentBatch + 1} of {batches.length}
        </div>
        <div className="h-2 flex-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{
              width: `${((currentBatch + 1) / batches.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <CategoryConfirmation
        results={batches[currentBatch]}
        onConfirm={confirm}
        onDismiss={handleNextBatch}
      />
    </div>
  );
}
```

---

## 🔐 Security Considerations

### PII Redaction in Reasons

The `reason` field is kept short and redacted by `/tag-categorize` to prevent leaking PII:

```typescript
// Backend sanitizes reasons
const reason = "Matched rule: Amazon merchants";  // ✅ Safe
const reason = "Merchant contains user email";     // ❌ Never returned
```

### User-Scoped Confirmation

All `/tag-correction` calls validate user_id:

```typescript
// RLS prevents other users from correcting another user's transactions
body: JSON.stringify({
  transaction_id: txId,        // Must belong to userId
  user_id: userId,             // Enforced by RLS
  to_category_id: catId,       // Must be user's category or system
})
```

### Rate Limiting

- Hook enforces **max 5 visible results** (pagination)
- Component prevents rapid-fire clicks (loading state)
- Each confirm call is debounced

---

## 📊 Analytics & Metrics

### Track via Crystal Logging

```typescript
// Log every categorization confirmation for insights
async function logCategoryMetric(
  userId: string,
  transactionId: string,
  fromConfidence: number,
  toConfidence: number,
  learned: boolean
) {
  await fetch("/.netlify/functions/crystal-log-event", {
    method: "POST",
    headers: { "x-user-id": userId },
    body: JSON.stringify({
      event: "category_confirmed",
      metadata: {
        transaction_id: transactionId,
        from_confidence: fromConfidence,
        to_confidence: toConfidence,
        learned_rule: learned,
        timestamp: new Date().toISOString(),
      },
    }),
  });
}
```

### Query Stats

```typescript
// Fetch categorization health
const stats = await fetch(
  "/.netlify/functions/tag-tx-categ-history?user_stats=true",
  { headers: { "x-user-id": userId } }
).then((r) => r.json());

// Returns:
// {
//   total_categorizations: 500,
//   auto_rate_percent: 96.5,
//   avg_confidence_percent: 87.2,
//   manual_corrections: 23,
//   rules_created: 8
// }
```

---

## 🧪 Testing

### Unit Tests

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryConfirmation } from "@/ui/components/CategoryConfirmation";

describe("CategoryConfirmation", () => {
  it("shows high-confidence results with checkmark", () => {
    const results = [
      {
        transaction_id: "txn-1",
        category_id: "cat-1",
        category_name: "Shopping",
        confidence: 0.95,
        source: "rule",
        reason: "Matched Amazon",
      },
    ];

    render(
      <CategoryConfirmation results={results} onConfirm={jest.fn()} onDismiss={jest.fn()} />
    );

    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("expands low-confidence results on click", async () => {
    const results = [
      {
        transaction_id: "txn-2",
        category_id: "cat-2",
        category_name: "Entertainment",
        confidence: 0.45,
        source: "ai",
        reason: "Unknown vendor",
        alternatives: [
          {
            category_id: "cat-3",
            category_name: "Dining",
            confidence: 0.38,
            reason: "Alternative 1",
          },
        ],
      },
    ];

    const mockConfirm = jest.fn();
    render(
      <CategoryConfirmation
        results={results}
        onConfirm={mockConfirm}
        onDismiss={jest.fn()}
      />
    );

    // Should show expandable button
    const expandBtn = screen.getByRole("button", { name: /expand/i });
    fireEvent.click(expandBtn);

    // Should now show alternatives
    expect(screen.getByText(/Choose correct category:/i)).toBeInTheDocument();
  });

  it("calls onConfirm when user selects category", async () => {
    const mockConfirm = jest.fn().mockResolvedValue({});
    const results = [
      {
        transaction_id: "txn-3",
        category_id: "cat-3",
        category_name: "Dining",
        confidence: 0.5,
        source: "ai",
        reason: "Restaurant",
      },
    ];

    render(
      <CategoryConfirmation results={results} onConfirm={mockConfirm} onDismiss={jest.fn()} />
    );

    // Expand
    fireEvent.click(screen.getByRole("button", { name: /expand/i }));

    // Click primary suggestion
    fireEvent.click(screen.getByText("Suggested (50%)").closest("button")!);

    // Wait for confirmation
    await screen.findByText("Dining");
    expect(mockConfirm).toHaveBeenCalledWith("txn-3", "cat-3");
  });
});
```

### E2E Test

```bash
# In SmartImportAI.tsx
1. Upload 3 transactions (1 high conf, 2 low conf)
2. Verify CategoryConfirmation appears with 1 high + 2 low
3. Click expand on low-confidence card
4. Select alternative category
5. Verify /tag-correction called
6. Verify rule learned (if applicable)
7. Verify card dismissed
8. Click "Done"
9. Verify all results cleared
```

---

## 🚀 Deployment Checklist

- [ ] `CategoryConfirmation` component created and tested
- [ ] `useCategoryConfirmation` hook integrated into page
- [ ] `/tag-categorize` returns `alternatives` in results
- [ ] `/tag-correction` updates transaction & learns rule
- [ ] Confidence threshold (0.7) matches your requirements
- [ ] Redaction rules applied to reason field
- [ ] RLS policies enforced on corrections
- [ ] Toast notifications wired
- [ ] Loading states show spinner
- [ ] Accessibility: ARIA labels on buttons
- [ ] Mobile-responsive (cards stack)
- [ ] Error handling for network failures

---

## 📚 Reference

### CategorizationResult Type

```typescript
interface CategorizationResult {
  transaction_id: string;         // UUID
  category_id: string;            // UUID or "uncategorized"
  category_name: string;          // "Shopping", "Dining", etc.
  confidence: number;             // 0.0-1.0 (0-100%)
  source: "rule" | "ai" | "manual" | "default";
  reason: string;                 // Redacted: "Matched rule: Amazon"
  alternatives?: Array<{          // Top 3 for low-confidence
    category_id: string;
    category_name: string;
    confidence: number;
    reason: string;
  }>;
}
```

### useCategoryConfirmation Hook API

```typescript
const { 
  results,           // Current results array
  isLoading,         // true while categorizing
  categorize,        // (userId, transactions) → Promise<results>
  confirm,           // (txId, catId) → Promise<void>
  clear              // () → void
} = useCategoryConfirmation();
```

---

**Integration Complete!** ✅

All categorization confirmation flows are production-ready.






