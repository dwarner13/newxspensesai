# 🏷️ Tag AI SDK Usage Guide

## Installation

The SDK is pre-built at `src/ai/sdk/tagClient.ts` and ready to use:

```typescript
import { createTagClient, useTagClient } from "@/ai/sdk/tagClient";
```

---

## Basic Usage

### Client Initialization

```typescript
// In server context
import { createTagClient } from "@/ai/sdk/tagClient";

const tagClient = createTagClient(userId);
```

### React Hook (Recommended)

```typescript
// In React components
import { useTagClient } from "@/ai/sdk/tagClient";

export default function MyComponent() {
  const tagClient = useTagClient();
  
  // Now use tagClient.categorize(), etc.
}
```

---

## Core Methods

### 1. Categorize Transactions

```typescript
const result = await tagClient.categorize(["tx-1", "tx-2", "tx-3"]);

if (result.ok) {
  result.results?.forEach(r => {
    console.log(`${r.transaction_id}: ${r.category_id} (${Math.round(r.confidence * 100)}%)`);
  });
} else {
  console.error("Categorization failed:", result.error);
}

// Response:
// {
//   ok: true,
//   results: [
//     {
//       transaction_id: "tx-1",
//       category_id: "cat-coffee",
//       confidence: 0.95,
//       reason: "Matched on merchant name 'Starbucks'",
//       suggestions: [
//         { category_id: "cat-food", confidence: 0.03, label: "Food" },
//         { category_id: "cat-utilities", confidence: 0.02, label: "Utilities" }
//       ]
//     }
//   ]
// }
```

### 2. Preview Categorization (Dry Run)

```typescript
const preview = await tagClient.categorizeDryRun(["tx-1", "tx-2"]);

// Same response format as categorize, but doesn't save to DB
// Use this to show suggestions before committing
```

### 3. Correct a Categorization

```typescript
const correction = await tagClient.correct("tx-1", "cat-coffee");

if (correction.ok) {
  console.log("Corrected to:", correction.category_id);
  // Locked as manual source with confidence=1
  // AI learns from this correction
}

// Response:
// {
//   ok: true,
//   transaction_id: "tx-1",
//   category_id: "cat-coffee",
//   source: "manual",
//   confidence: 1,
//   version: 2
// }
```

### 4. Ask Why

```typescript
const explanation = await tagClient.why("tx-1");

if (explanation.ok && explanation.explanation) {
  const { tx, latest, ai, suggestions } = explanation.explanation;
  
  console.log(`Merchant: ${tx.merchant_name}`);
  console.log(`Amount: $${tx.amount}`);
  console.log(`Category: ${latest.category_id}`);
  console.log(`Confidence: ${Math.round(latest.confidence * 100)}%`);
  console.log(`AI Reasoning: ${ai?.rationale}`);
  console.log(`Suggestions:`, suggestions);
}

// Response:
// {
//   ok: true,
//   explanation: {
//     tx: {
//       merchant_name: "Starbucks",
//       amount: 5.75,
//       posted_at: "2025-10-19T12:30:00Z",
//       memo: "Coffee"
//     },
//     latest: {
//       category_id: "cat-coffee",
//       source: "ai",
//       confidence: 0.95,
//       version: 1,
//       decided_at: "2025-10-19T12:30:00Z"
//     },
//     ai: {
//       confidence: 0.95,
//       rationale: "Merchant name matched 'Starbucks'. Similar to 42 past transactions..."
//     },
//     suggestions: [
//       "Accept this categorization",
//       "Correct to a different category",
//       "Create an automation rule"
//     ]
//   }
// }
```

### 5. Get Categories

```typescript
const categories = await tagClient.getCategories();

if (categories.ok) {
  categories.categories?.forEach(cat => {
    console.log(`${cat.emoji} ${cat.name}`);
  });
}

// Response:
// {
//   ok: true,
//   categories: [
//     { id: "cat-coffee", name: "Coffee", emoji: "☕" },
//     { id: "cat-groceries", name: "Groceries", emoji: "🛒" },
//     { id: "cat-fuel", name: "Fuel", emoji: "⛽" },
//     // ...
//   ]
// }
```

### 6. Get Automation Rules

```typescript
const rules = await tagClient.getRules();

if (rules.ok) {
  rules.rules?.forEach(rule => {
    console.log(`${rule.merchant_name} → ${rule.category_name}`);
  });
}

// Response:
// {
//   ok: true,
//   rules: [
//     { 
//       id: "rule-1",
//       merchant_name: "Starbucks",
//       category_id: "cat-coffee",
//       category_name: "Coffee",
//       created_at: "2025-10-19T12:00:00Z"
//     },
//     // ...
//   ]
// }
```

### 7. Create Automation Rule

```typescript
const newRule = await tagClient.createRule("Whole Foods", "cat-groceries");

if (newRule.ok) {
  console.log("Rule created! Future Whole Foods transactions will auto-categorize.");
} else {
  console.error("Failed:", newRule.error);
}

// Response:
// { ok: true }
```

### 8. Get Transaction History

```typescript
const history = await tagClient.getHistory("tx-1");

if (history.ok) {
  history.history?.forEach(h => {
    console.log(`v${h.version}: ${h.category_id} (${h.source}, ${Math.round(h.confidence*100)}%)`);
  });
}

// Response:
// {
//   ok: true,
//   history: [
//     {
//       version: 1,
//       category_id: "cat-utilities",
//       source: "ai",
//       confidence: 0.72,
//       decided_at: "2025-10-19T10:00:00Z"
//     },
//     {
//       version: 2,
//       category_id: "cat-coffee",
//       source: "manual",
//       confidence: 1.0,
//       decided_at: "2025-10-19T12:30:00Z"
//     }
//   ]
// }
```

### 9. Export Corrections

```typescript
// Get blob
const result = await tagClient.exportCorrections(30); // Last 30 days

if (result.ok && result.blob) {
  // Use blob (e.g., upload to server, analyze locally)
  console.log("CSV ready:", result.filename);
}

// Or download directly
await tagClient.downloadCorrections(30);
// → Downloads: categorization_corrections_30d_2025-10-19.csv
```

---

## Real-World Examples

### Example 1: Auto-Categorize Selected Transactions

```tsx
// src/pages/transactions/TransactionsPage.tsx
import { useTagClient } from "@/ai/sdk/tagClient";

export default function TransactionsPage() {
  const tagClient = useTagClient();
  const [selectedTxns, setSelectedTxns] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleCategorize = async () => {
    setLoading(true);
    try {
      const txIds = selectedTxns.map(t => t.id);
      const result = await tagClient.categorize(txIds);
      
      if (result.ok) {
        setResults(result.results || []);
        
        // Show toast
        toast.success(`Categorized ${result.results?.length || 0} transactions`);
        
        // Check for low-confidence items
        const lowConfidence = result.results?.filter(r => r.confidence < 0.6) || [];
        if (lowConfidence.length > 0) {
          toast.info(`${lowConfidence.length} items need review`);
        }
      } else {
        toast.error(`Failed: ${result.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleCategorize}
        disabled={selectedTxns.length === 0 || loading}
      >
        {loading ? "Categorizing..." : `🤖 Categorize ${selectedTxns.length} items`}
      </button>
      
      {results.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-4">
          {results.map(r => (
            <div key={r.transaction_id} className="flex justify-between py-2">
              <span>{r.transaction_id}</span>
              <span>{r.category_id} ({Math.round(r.confidence * 100)}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Example 2: Show Why Categorization

```tsx
// In a transaction detail modal
import { useTagClient } from "@/ai/sdk/tagClient";

export function TransactionDetail({ txId }: { txId: string }) {
  const tagClient = useTagClient();
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    tagClient.why(txId).then(result => {
      if (result.ok) {
        setExplanation(result.explanation);
      }
      setLoading(false);
    });
  }, [txId]);

  if (loading) return <div>Loading...</div>;
  if (!explanation) return <div>No explanation</div>;

  const { tx, latest, ai } = explanation;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">{tx.merchant_name}</p>
        <p className="text-2xl">${tx.amount.toFixed(2)}</p>
      </div>

      <div className="rounded-lg bg-green-50 p-3">
        <p className="text-sm font-semibold">Categorized as</p>
        <p className="text-lg">{latest.category_id}</p>
        <p className="text-xs text-gray-600">
          {latest.source} • {Math.round(latest.confidence * 100)}% confident
        </p>
      </div>

      {ai?.rationale && (
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-sm font-semibold">AI Reasoning</p>
          <p className="text-sm">{ai.rationale}</p>
        </div>
      )}
    </div>
  );
}
```

### Example 3: Batch Correction from Queue

```tsx
// src/components/transactions/LowConfidenceQueue.tsx
import { useTagClient } from "@/ai/sdk/tagClient";

export function LowConfidenceQueue({ rows }: { rows: TxRow[] }) {
  const tagClient = useTagClient();
  const [selected, setSelected] = useState<string[]>([]);

  const handleCorrect = async (txId: string, categoryId: string) => {
    const result = await tagClient.correct(txId, categoryId);
    
    if (result.ok) {
      toast.success("Corrected! AI will learn from this.");
      // Refresh data
    }
  };

  return (
    <div className="space-y-2">
      {rows.filter(r => r.confidence < 0.6).map(row => (
        <div key={row.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded">
          <div>
            <p>{row.merchant}</p>
            <p className="text-sm text-gray-600">
              Suggested: {row.category} ({Math.round(row.confidence * 100)}%)
            </p>
          </div>
          <button
            onClick={() => handleCorrect(row.id, row.category)}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Example 4: Create Rule from Transaction

```tsx
// In transaction context menu
async function handleCreateRule(txId: string, merchantName: string) {
  const tagClient = useTagClient();
  
  // First, get the current categorization
  const why = await tagClient.why(txId);
  if (!why.ok || !why.explanation) return;

  const categoryId = why.explanation.latest.category_id;

  // Create the rule
  const result = await tagClient.createRule(merchantName, categoryId);
  
  if (result.ok) {
    toast.success(`Rule created: ${merchantName} → ${categoryId}`);
    // Future transactions with this merchant will auto-categorize
  }
}
```

### Example 5: Export & Download Corrections

```tsx
// In an analytics page
export function CorrectionExport() {
  const tagClient = useTagClient();
  const [loading, setLoading] = useState(false);

  const handleExport = async (days: number) => {
    setLoading(true);
    try {
      await tagClient.downloadCorrections(days);
      toast.success("CSV downloaded!");
    } catch (err) {
      toast.error(`Export failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button onClick={() => handleExport(7)} disabled={loading}>
        📥 Last 7 days
      </button>
      <button onClick={() => handleExport(30)} disabled={loading}>
        📥 Last 30 days
      </button>
      <button onClick={() => handleExport(90)} disabled={loading}>
        📥 Last 90 days
      </button>
    </div>
  );
}
```

---

## Error Handling

All methods return `{ ok: boolean, error?: string }` format:

```typescript
const result = await tagClient.categorize(txIds);

if (!result.ok) {
  switch (result.error) {
    case "No transaction IDs provided":
      console.error("Empty selection");
      break;
    case "HTTP 401":
      console.error("Unauthorized");
      break;
    case "HTTP 404":
      console.error("Not found");
      break;
    default:
      console.error("Error:", result.error);
  }
}
```

---

## Performance Tips

1. **Batch Operations**
   ```typescript
   // Good: Batch 500 at once
   const result = await tagClient.categorize(txIds); // Max 500
   
   // Avoid: Multiple small requests
   for (const id of txIds) {
     await tagClient.categorize([id]); // Inefficient
   }
   ```

2. **Cache Results**
   ```typescript
   const cache = new Map();
   
   async function whyWithCache(txId: string) {
     if (cache.has(txId)) return cache.get(txId);
     const result = await tagClient.why(txId);
     if (result.ok) cache.set(txId, result);
     return result;
   }
   ```

3. **Debounce Requests**
   ```typescript
   import { debounce } from "lodash-es";
   
   const debouncedCategorize = debounce(async (txIds: string[]) => {
     await tagClient.categorize(txIds);
   }, 500);
   ```

---

## Type Safety

Full TypeScript support with exported types:

```typescript
import {
  CategorizeResult,
  WhyResult,
  CorrectionResult,
  CategoriesResult,
  RulesResult,
  HistoryResult,
  ExportResult
} from "@/ai/sdk/tagClient";

// Strongly typed responses
const result: CategorizeResult = await tagClient.categorize(txIds);
if (result.ok && result.results) {
  result.results.forEach(r => {
    // r.transaction_id, r.category_id, r.confidence, etc. all typed
  });
}
```

---

## Testing

```typescript
// Mock for unit tests
const mockTagClient = {
  categorize: jest.fn().mockResolvedValue({
    ok: true,
    results: [{ transaction_id: "tx-1", category_id: "cat-coffee", confidence: 0.95 }]
  }),
  why: jest.fn().mockResolvedValue({
    ok: true,
    explanation: { /* ... */ }
  }),
  // Mock other methods...
};

// Use in test
render(<MyComponent tagClient={mockTagClient} />);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "userId required" error | Ensure userId is set before calling `useTagClient()` |
| "HTTP 401" in responses | Check `x-user-id` header is passed (SDK does this automatically) |
| "No transactions selected" | Verify txIds array is not empty |
| CSV download doesn't work | Check browser allows downloads, disable popup blockers |
| Categorization slow | Batch operations (max 500 per request) |

---

## API Reference Summary

| Method | Params | Returns | Use Case |
|--------|--------|---------|----------|
| `categorize()` | txIds[] | CategorizeResult | Save categorization |
| `categorizeDryRun()` | txIds[] | CategorizeResult | Preview suggestions |
| `correct()` | txId, categoryId | CorrectionResult | Learn from manual correction |
| `why()` | txId | WhyResult | Show AI reasoning |
| `getCategories()` | — | CategoriesResult | Populate dropdowns |
| `getRules()` | — | RulesResult | Show automation rules |
| `createRule()` | merchant, categoryId | { ok, error } | Auto-tag future txns |
| `getHistory()` | txId | HistoryResult | Show categorization versions |
| `exportCorrections()` | days? | ExportResult | Download CSV |
| `downloadCorrections()` | days? | void | Trigger browser download |

---

**Status:** ✅ Production-ready  
**Last Updated:** 2025-10-19  
**Version:** 1.0




