# 🔄 BYTE-OCR TWO-STAGE COMMIT ARCHITECTURE

**Purpose:** Separate OCR parsing from transaction commitment for better error handling and user experience  
**Status:** ✅ Recommended Pattern  
**Improvement:** Preview → Approval → Commit workflow  

---

## 📋 OVERVIEW

### Old (Single-Stage) Process
```
Upload → OCR Parse → Immediately commit to DB → Return result
```

**Problem:** User sees parsed data but can't verify before commit; no rollback option.

### New (Two-Stage) Process
```
Upload → OCR Parse (staging) → Show preview → User approves → Commit to DB
```

**Benefit:** User can review parsed transactions before they're finalized.

---

## 🔀 ARCHITECTURE CHANGES

### Stage 1: `byte-ocr-parse.ts` (Parse Only)

```typescript
// OLD: Parsed AND committed to transactions
for (const tx of normalizedTx) {
  await sb.from('transactions').upsert({...}); // ❌ REMOVED
}

// NEW: Only to staging, mark status='parsed'
for (const tx of normalizedTx) {
  await sb.from('transactions_staging').upsert({...}); // ✅ ONLY STAGING
}

await sb.from('imports').update({
  status: 'parsed',  // ✅ NOT 'completed'
  pages: pageCount,
  error: null
});
```

### Stage 2: `commit-import.ts` (NEW - Commit Only)

```typescript
export async function handler(event: any) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  const { userId, importId } = JSON.parse(event.body || '{}');
  if (!userId || !importId) return { statusCode: 400, body: 'Missing userId or importId' };

  // 1. Read from staging
  const { data: rows, error } = await sb
    .from('transactions_staging')
    .select('data_json, hash')
    .eq('user_id', userId)
    .eq('import_id', importId);
  
  if (error) return { statusCode: 500, body: error.message };
  if (!rows?.length) return { statusCode: 404, body: 'No staged transactions' };

  // 2. Commit to final transactions table
  for (const r of rows) {
    const tx = r.data_json;
    await sb.from('transactions').upsert(
      {
        user_id: userId,
        import_id: importId,
        posted_at: tx.posted_at,
        amount: tx.amount,
        merchant: tx.merchant,
        category: tx.category,
        memo: tx.memo,
        account_id: tx.account_id,
        hash: r.hash,
        created_at: new Date().toISOString()
      },
      { onConflict: 'user_id,posted_at,amount,hash' }
    );
  }

  // 3. Mark import as committed
  await sb
    .from('imports')
    .update({ status: 'committed' })
    .eq('id', importId)
    .eq('user_id', userId);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      committed: rows?.length || 0
    })
  };
}
```

---

## 📊 DATA FLOW

```
Client                    Stage 1: Parse              Stage 2: Commit
  |                           |                           |
  |-- Upload file ----------->|                           |
  |                           |-- OCR Parse               |
  |                           |-- Normalize               |
  |                           |-- Hash                    |
  |                           |-- Store in staging        |
  |                           |-- Mark status='parsed'    |
  |<-- {importId, rows} ------|                           |
  |                           |                           |
  |-- Show preview to user    |                           |
  |-- User approves           |                           |
  |                           |                           |
  |-- POST /commit-import ---> commit {userId, importId}  |
  |                           |                           |
  |                           |-- Read staging            |
  |                           |-- Upsert to transactions  |
  |                           |-- Mark committed          |
  |                           |                           |
  |<-- {ok, committed: 42} ---|                           |
```

---

## 🔑 KEY IMPROVEMENTS

### 1. **Status Flow**

| Stage | Status | Meaning |
|-------|--------|---------|
| Upload received | `pending` | File uploaded, waiting for parse |
| After OCR | `parsed` | ✅ Parsed & staged, awaiting approval |
| User approves | `committed` | ✅ Transactions finalized in DB |
| Error during parse | `failed` | ❌ Parse error, check logs |

### 2. **Staging Table Benefits**

- **Preview**: Show user parsed data before commit
- **Verification**: User can review and reject bad parses
- **Rollback**: Delete from staging without affecting final DB
- **Audit**: Keep staging data for 7 days then archive
- **Retry**: Reparse without duplicating in transactions

### 3. **Transaction Idempotency**

Both stages use **hash-based upserts** (same hash = same transaction):

```typescript
// Parse stage (upsert to staging)
{ onConflict: 'import_id,hash' }

// Commit stage (upsert to transactions)
{ onConflict: 'user_id,posted_at,amount,hash' }
```

**Result:** Safe to retry either stage without duplicates.

---

## 🎯 WORKFLOW WITH UI

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS FILE                                            │
│    - File size validated (25MB max)                             │
│    - MIME type validated (PDF/CSV/Image)                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. GET SIGNED URL & UPLOAD TO STORAGE                           │
│    - Client gets signed URL from server                         │
│    - Client uploads directly to Supabase Storage                │
│    - Response: {path, bucket}                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. INGEST-STATEMENT                                             │
│    - Create import record (status='pending')                    │
│    - Trigger byte-ocr-parse (async)                            │
│    - Response: {importId}                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. BYTE-OCR-PARSE (Stage 1)                                     │
│    - Download file from Storage                                 │
│    - Parse (PDF/CSV/Image) → Extract rows                       │
│    - Normalize → Hash → Validate                                │
│    - Upsert to transactions_staging                             │
│    - Update import (status='parsed')                            │
│    - Return: {rowsParsed, preview[0:20]}                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. SHOW PREVIEW TO USER                                         │
│    - Display table: Date | Merchant | Category | Amount         │
│    - Show stats: X rows parsed, Y total                         │
│    - Buttons: APPROVE | REJECT | EDIT                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         ┌────────────────────┴────────────────────┐
         |                                         |
    USER APPROVES                          USER REJECTS
         |                                         |
         ↓                                         ↓
┌──────────────────────┐        ┌─────────────────────────┐
│ 6a. COMMIT-IMPORT    │        │ 6b. REJECT (Cleanup)    │
│ - Read staging       │        │ - Delete staging rows   │
│ - Upsert to final    │        │ - Mark import='failed'  │
│ - Mark 'committed'   │        │ - Optional: show UI     │
│ - Return: 42 rows ✅ │        │ - Show: Parse errors    │
└──────────────────────┘        └─────────────────────────┘
         |
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. PRIME-HANDOFF                                                │
│    - Create handoff to Crystal                                  │
│    - Fetch transaction count                                    │
│    - Save Prime's acknowledgment                                │
│    - Return: {handoffId}                                        │
└─────────────────────────────────────────────────────────────────┘
         |
         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. CRYSTAL-ANALYZE-IMPORT                                       │
│    - Query committed transactions                               │
│    - Compute analytics (spend, trends, MoM)                     │
│    - Generate insights & advice                                 │
│    - Save advice_messages                                       │
│    - Return: {summary, budgetImpact, forecastDelta}             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 SETUP

### Create Netlify Function

**File:** `netlify/functions/commit-import.ts`

```typescript
import { createSupabaseClient } from '../_shared/supabase';

const sb = createSupabaseClient();

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { userId, importId } = await req.json();

    if (!userId || !importId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing userId or importId' }),
        { status: 400 }
      );
    }

    // 1. Read from staging
    const { data: rows, error } = await sb
      .from('transactions_staging')
      .select('data_json, hash')
      .eq('user_id', userId)
      .eq('import_id', importId);

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500 }
      );
    }

    if (!rows?.length) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No staged transactions' }),
        { status: 404 }
      );
    }

    // 2. Commit to final transactions table
    for (const r of rows) {
      const tx = r.data_json;
      await sb.from('transactions').upsert(
        {
          user_id: userId,
          import_id: importId,
          posted_at: tx.posted_at,
          amount: tx.amount,
          merchant: tx.merchant,
          category: tx.category,
          memo: tx.memo,
          account_id: tx.account_id,
          hash: r.hash,
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_id,posted_at,amount,hash' }
      );
    }

    // 3. Mark import as committed
    await sb
      .from('imports')
      .update({ status: 'committed' })
      .eq('id', importId)
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({
        ok: true,
        committed: rows?.length || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Commit error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500 }
    );
  }
};
```

### Update `byte-ocr-parse.ts`

Remove the transaction commit loop and update status:

```typescript
// OLD:
await sb.from('transactions').upsert({...}); // ❌ DELETE

// NEW:
await sb.from('imports').update({
  status: 'parsed',  // ✅ NOT 'completed'
  pages: pageCount,
  error: null
});
```

---

## 💻 CLIENT INTEGRATION

### React Hook for Commit

```typescript
// lib/useCommitImport.ts
import { useState } from 'react';

export function useCommitImport() {
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commit = async (userId: string, importId: string): Promise<number | null> => {
    setIsCommitting(true);
    setError(null);

    try {
      const res = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, importId })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Commit failed: ${res.status}`);
      }

      const { committed } = await res.json();
      return committed;
    } catch (err: any) {
      setError(err.message);
      console.error('Commit error:', err);
      return null;
    } finally {
      setIsCommitting(false);
    }
  };

  return { commit, isCommitting, error };
}
```

### UI Component

```typescript
// After preview is shown
<button
  onClick={async () => {
    const committed = await commit(userId, importId);
    if (committed) {
      toast.success(`${committed} transactions committed!`);
      // Proceed to Prime handoff
    }
  }}
  disabled={isCommitting}
>
  {isCommitting ? 'Committing...' : 'Approve & Commit'}
</button>
```

---

## ✅ STATUS STATES

```
PENDING → PARSED → COMMITTED → (Prime → Crystal) ✅
   ↓       ↓         ↓
 [Parse] [Review] [Finalize]
           ↓
        FAILED (if user rejects or error)
```

---

## 📊 BENEFITS

| Aspect | Benefit |
|--------|---------|
| **User Control** | Review before finalizing |
| **Error Recovery** | Easy to reject and re-parse |
| **Audit Trail** | Staging keeps history |
| **Performance** | Parse can be async; commit is fast |
| **Safety** | Two-step prevents bad data |
| **Rollback** | Delete staging rows, reimport |

---

## 🎯 SUMMARY

✅ **Separation of Concerns**: Parse and commit are independent  
✅ **User Approval**: Preview + approve workflow  
✅ **Idempotent**: Both stages use hash-based upserts  
✅ **Status Flow**: pending → parsed → committed  
✅ **Error Handling**: Detailed error responses at each stage  

**Files:** `byte-ocr-parse.ts` (updated) + `commit-import.ts` (new)  
**Status:** Ready for implementation  

---

**Last Updated:** October 18, 2025





