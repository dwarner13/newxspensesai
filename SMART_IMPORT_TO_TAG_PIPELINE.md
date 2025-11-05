# 🔄 Smart Import → Tag AI Pipeline Guide

## Overview

This guide shows the **complete end-to-end flow** from document upload through AI categorization:

```
User uploads statement
    ↓
Smart Import: get-upload-url (signed URL)
    ↓
Upload to S3 with virus scan
    ↓
OCR via Byte (extract transactions)
    ↓
Normalize & validate transactions
    ↓
Save to DB (transactions table)
    ↓
TAG AI: Auto-categorize via /tag-categorize
    ↓
Update transaction_categorization table
    ↓
Show results + low-confidence queue
    ↓
User reviews & corrects (optional)
```

---

## Architecture

### System Components

| Component | Role | Input | Output |
|-----------|------|-------|--------|
| **Smart Import** | Upload & OCR | File upload | Extracted transactions |
| **Normalization** | Clean data | Raw OCR results | Validated tx objects |
| **Database** | Persist | Tx objects | Transaction IDs |
| **Tag AI** | Categorize | Transaction IDs | Categories + confidence |
| **Queue** | Manual review | Low-confidence items | User corrections |

---

## Data Flow

### 1️⃣ Upload Phase

```typescript
// src/pages/transactions/TransactionsPage.tsx

import { StatementUpload } from "@/components/smart-import/StatementUpload";

export default function TransactionsPage() {
  const handleUploadSuccess = async (uploadedTxns: TxRow[]) => {
    // Smart Import returns normalized transactions
    console.log(`✅ Uploaded ${uploadedTxns.length} transactions`);
    
    // Auto-trigger categorization
    await triggerCategorization(uploadedTxns);
  };

  return (
    <div className="space-y-6">
      <StatementUpload onSuccess={handleUploadSuccess} />
      {/* Rest of page */}
    </div>
  );
}
```

### 2️⃣ Normalization Phase

```typescript
// netlify/functions/_shared/normalize.ts

export interface RawTransaction {
  merchant_name: string;
  amount: number;
  date: string; // "Oct 19, 2025" or "2025-10-19"
  memo?: string;
}

export interface NormalizedTransaction {
  merchant_name: string;
  merchant_slug: string;      // "starbucks-coffee"
  amount: number;             // Always positive
  posted_at: string;          // ISO 8601
  memo?: string;
  import_id: string;          // Links to import batch
  user_id: string;
}

export async function normalizeTransaction(
  raw: RawTransaction,
  userId: string,
  importId: string
): Promise<NormalizedTransaction> {
  return {
    merchant_name: raw.merchant_name.trim(),
    merchant_slug: slugify(raw.merchant_name),
    amount: Math.abs(Number(raw.amount)),
    posted_at: normalizeDate(raw.date),
    memo: raw.memo?.trim(),
    import_id: importId,
    user_id: userId,
  };
}
```

### 3️⃣ Save to Database

```typescript
// netlify/functions/_shared/db.ts

import { createClient } from "@supabase/supabase-js";

export async function saveTransactions(
  txns: NormalizedTransaction[],
  userId: string
): Promise<string[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      headers: { "x-user-id": userId }
    }
  );

  const { data, error } = await supabase
    .from("transactions")
    .insert(txns)
    .select("id");

  if (error) {
    console.error("[DB] Insert failed:", error);
    throw error;
  }

  // Return new transaction IDs for categorization
  return data?.map(d => d.id) || [];
}
```

---

## Tag AI Integration

### 4️⃣ Auto-Categorize Phase

```typescript
// src/pages/transactions/TransactionsPage.tsx

import { useTagClient } from "@/ai/sdk/tagClient";

export default function TransactionsPage() {
  const tagClient = useTagClient();
  const [categorizing, setCategorizing] = useState(false);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);

  async function triggerCategorization(uploadedTxns: TxRow[]) {
    setCategorizing(true);
    try {
      const txIds = uploadedTxns.map(t => t.id);

      // Call Tag AI SDK
      const result = await tagClient.categorize(txIds);

      if (!result.ok) {
        toast.error(`Categorization failed: ${result.error}`);
        return;
      }

      // Count low-confidence items
      const lowConf = result.results?.filter(r => r.confidence < 0.6) || [];
      setLowConfidenceCount(lowConf.length);

      // Show results
      toast.success(
        `✅ Categorized ${result.results?.length} transactions` +
        (lowConf.length > 0 ? ` (${lowConf.length} need review)` : "")
      );

      // Refresh transaction list
      refetchTransactions();
    } catch (err) {
      console.error("[Tag] Categorization error:", err);
      toast.error("Categorization failed");
    } finally {
      setCategorizing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload component */}
      <StatementUpload onSuccess={triggerCategorization} />

      {/* Low-confidence queue */}
      {lowConfidenceCount > 0 && (
        <div className="rounded-lg bg-yellow-50 p-4">
          <p className="font-semibold">
            🔍 {lowConfidenceCount} transactions need review
          </p>
          <LowConfidenceQueue rows={rows} />
        </div>
      )}

      {/* Transaction list */}
      <TransactionListTable rows={rows} />
    </div>
  );
}
```

### 5️⃣ Backend Orchestration

```typescript
// netlify/functions/ingest-statement.ts
// (This is called after OCR completes)

import { tagCategorize } from "@/ai/sdk/tagClient";

export async function handler(event) {
  const { userId, ocrResults, importId } = JSON.parse(event.body);

  try {
    // 1. Normalize transactions
    const normalized = await Promise.all(
      ocrResults.map(raw =>
        normalizeTransaction(raw, userId, importId)
      )
    );

    // 2. Save to database
    const txIds = await saveTransactions(normalized, userId);
    console.log(`✅ Saved ${txIds.length} transactions`);

    // 3. Auto-categorize
    const categorizeResult = await tagCategorize(userId, txIds);

    if (!categorizeResult.ok) {
      console.warn("[Tag] Categorization incomplete:", categorizeResult.error);
      // Don't fail the import, just log
    } else {
      console.log(`✅ Categorized ${categorizeResult.results?.length} items`);
    }

    // 4. Return results to client
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        count: txIds.length,
        categorized: categorizeResult.results?.length || 0,
        lowConfidence: categorizeResult.results?.filter(
          r => r.confidence < 0.6
        ).length || 0,
      }),
    };
  } catch (err) {
    console.error("[Ingest] Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
    };
  }
}
```

---

## Complete Example: Upload → Categorize → Display

### Component: SmartImportFlow

```tsx
// src/components/smart-import/SmartImportFlow.tsx

import { useState } from "react";
import { StatementUpload } from "./StatementUpload";
import { LowConfidenceQueue } from "@/components/transactions/LowConfidenceQueue";
import { useTagClient } from "@/ai/sdk/tagClient";
import type { TxRow } from "@/hooks/useTransactions";

export function SmartImportFlow() {
  const tagClient = useTagClient();
  const [uploadedTxns, setUploadedTxns] = useState<TxRow[]>([]);
  const [categorizing, setCategorizing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [lowConfidenceRows, setLowConfidenceRows] = useState<TxRow[]>([]);

  async function handleUploadSuccess(txns: TxRow[]) {
    setUploadedTxns(txns);
    setCategorizing(true);

    try {
      // Categorize all uploaded transactions
      const result = await tagClient.categorize(txns.map(t => t.id));

      if (!result.ok) {
        throw new Error(result.error);
      }

      setResults(result);

      // Build low-confidence rows for UI
      const lowConf = result.results
        ?.filter(r => r.confidence < 0.6)
        .map(r => ({
          ...txns.find(t => t.id === r.transaction_id),
          confidence: r.confidence,
          suggestions: r.suggestions,
        })) || [];

      setLowConfidenceRows(lowConf);

      // Show toast
      if (lowConf.length === 0) {
        toast.success(`✅ Categorized ${result.results?.length} transactions`);
      } else {
        toast.info(
          `✅ Categorized ${result.results?.length} transactions ` +
          `(${lowConf.length} need review)`
        );
      }
    } catch (err) {
      toast.error(
        `Categorization failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setCategorizing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div>
        <h2 className="text-lg font-semibold mb-2">📤 Upload Statement</h2>
        <StatementUpload onSuccess={handleUploadSuccess} />
      </div>

      {/* Categorizing Status */}
      {categorizing && (
        <div className="rounded-lg bg-blue-50 p-4 flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>Categorizing transactions...</span>
        </div>
      )}

      {/* Results Summary */}
      {results && (
        <div className="rounded-lg bg-green-50 p-4">
          <div className="font-semibold text-green-900">
            ✅ Results ({results.results?.length} transactions)
          </div>
          <div className="text-sm text-green-700 mt-1 space-y-1">
            <p>
              High confidence: {results.results?.filter((r: any) => r.confidence >= 0.6).length || 0}
            </p>
            <p>
              Low confidence: {results.results?.filter((r: any) => r.confidence < 0.6).length || 0}
            </p>
          </div>
        </div>
      )}

      {/* Low-Confidence Queue */}
      {lowConfidenceRows.length > 0 && (
        <div>
          <h3 className="text-md font-semibold mb-2">
            🔍 Review Low-Confidence Items
          </h3>
          <LowConfidenceQueue rows={lowConfidenceRows} />
        </div>
      )}

      {/* Results Table */}
      {uploadedTxns.length > 0 && (
        <div>
          <h3 className="text-md font-semibold mb-2">📋 Uploaded Transactions</h3>
          <TransactionListTable rows={uploadedTxns} />
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling

### Resilient Categorization

```typescript
// If Tag AI fails, import still succeeds

async function robustCategorize(txIds: string[], userId: string) {
  try {
    const result = await tagCategorize(userId, txIds);
    return result;
  } catch (err) {
    // Log but don't block import
    console.error("[Tag] Categorization failed:", err);
    
    // Notify user
    await notifyUser(userId, {
      title: "Import Successful, Categorization Pending",
      message: "Transactions imported successfully. Categorization will retry in background.",
      type: "info",
    });

    // Return success but flag for retry
    return {
      ok: false,
      error: "Categorization pending",
      pendingRetry: true,
    };
  }
}
```

---

## Transaction State Machine

```
UPLOAD
  ↓
[Pending: OCR]
  ↓
[Pending: Normalize]
  ↓
[Pending: Save]
  ↓
[Uncategorized] ← Saved to DB
  ↓
[Pending: Categorize] ← Tag AI processing
  ↓
[Categorized: AI] ← confidence >= 0.6
[Categorized: LowConf] ← confidence < 0.6 (needs review)
  ↓
User Reviews/Corrects
  ↓
[Categorized: Manual] ← User confirmed or corrected
  ↓
[Final]
```

---

## Notifications

### Emit Events During Pipeline

```typescript
// src/lib/notify.ts

export async function notifyImportProgress(userId: string, stage: string) {
  await fetch("/.netlify/functions/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({
      user_id: userId,
      employee: "byte-doc", // Smart Import AI
      title: `Import ${stage}`,
      message: getStageMessage(stage),
      priority: stage === "error" ? "high" : "normal",
      deeplink: `/transactions?import=latest`,
    }),
  });
}

function getStageMessage(stage: string): string {
  const messages = {
    upload: "📤 Document uploaded",
    ocr: "🔍 Extracting transactions...",
    normalize: "✨ Normalizing data...",
    save: "💾 Saving to database...",
    categorize: "🏷️ Auto-categorizing...",
    lowconf: "🔔 Some items need review",
    complete: "✅ Import complete!",
    error: "❌ Import failed",
  };
  return messages[stage as keyof typeof messages] || "Processing...";
}
```

---

## Performance Considerations

### Batch Processing

```typescript
// Don't categorize one-by-one
const txIds = uploadedTxns.map(t => t.id);

// Good: Batch all at once (max 500)
await tagClient.categorize(txIds);

// Bad: Loop (slow)
for (const id of txIds) {
  await tagClient.categorize([id]); // N requests instead of 1
}
```

### Async, Non-Blocking

```typescript
// Upload/OCR/Normalize: Fast (user waits)
// Categorization: Can be async (background)

// Option 1: Fire and forget
tagClient.categorize(txIds).catch(err => {
  console.error("Async categorization failed:", err);
  // Retry in background job
});

// Option 2: Wait for results
const result = await tagClient.categorize(txIds);
// User sees results immediately
```

---

## Testing the Pipeline

### Manual Test Flow

```bash
# 1. Open Transactions page
# 2. Click "Upload Statement"
# 3. Select test CSV or PDF
#    → Shows "Extracting transactions..."
#    → Shows "Auto-categorizing..."
# 4. See results table
#    → Green rows: High confidence (✅)
#    → Yellow rows: Low confidence (🔍)
# 5. Click "Review" on low-confidence item
#    → Shows LowConfidenceQueue
#    → See suggestions
# 6. Click "Correct" → Selects category
#    → Calls /tag-correction
#    → Item updates to Manual + 100% confidence
# 7. All low-conf items reviewed
#    → "All caught up! ✨"
```

### Curl Testing

```bash
# Test complete flow

# 1. Get upload URL
curl -X POST http://localhost:8888/.netlify/functions/get-upload-url \
  -H "x-user-id: test-user" \
  -d '{"filename": "statement.csv"}'
# Response: { uploadUrl: "...", key: "..." }

# 2. Upload file to S3 (signed URL)
curl -X PUT <uploadUrl> --data-binary @statement.csv

# 3. Trigger OCR & ingest
curl -X POST http://localhost:8888/.netlify/functions/ingest-statement \
  -H "x-user-id: test-user" \
  -d '{
    "key": "...",
    "importId": "imp-123",
    "userId": "test-user"
  }'
# Response: { ok: true, count: 25, categorized: 23, lowConfidence: 2 }

# 4. Check categorization result
curl -X POST http://localhost:8888/.netlify/functions/tag-categorize \
  -H "x-user-id: test-user" \
  -d '{"transaction_ids": ["tx-1", "tx-2"]}'

# 5. Correct low-confidence item
curl -X POST http://localhost:8888/.netlify/functions/tag-correction \
  -H "x-user-id: test-user" \
  -d '{
    "transaction_id": "tx-1",
    "to_category_id": "cat-coffee"
  }'
```

---

## Integration Points Summary

| Layer | Component | Role |
|-------|-----------|------|
| **UI** | StatementUpload | File selection, progress |
| **UI** | LowConfidenceQueue | Manual review widget |
| **API** | get-upload-url | Signed URL generation |
| **API** | ingest-statement | OCR orchestration |
| **API** | tag-categorize | Auto-categorization |
| **API** | tag-correction | Learn from corrections |
| **SDK** | tagClient | Unified interface |
| **DB** | transactions | Store TXs |
| **DB** | transaction_categorization | Store categories |
| **Notify** | Crystal/Byte | Progress updates |

---

## Next Steps

- [ ] Wire StatementUpload to TransactionsPage
- [ ] Implement SmartImportFlow component
- [ ] Test complete upload → categorize flow
- [ ] Monitor low-confidence items
- [ ] Verify corrections train AI
- [ ] Check background retry job

---

**Status:** ✅ Ready for integration  
**Complexity:** Medium (combines 3 systems)  
**User Impact:** High (seamless import experience)





