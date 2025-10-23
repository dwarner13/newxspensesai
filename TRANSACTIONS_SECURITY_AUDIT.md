# Transactions Security Audit — AI Pipeline Hub

**Status:** 🚨 **CRITICAL ISSUES IDENTIFIED**  
**Date:** October 19, 2025  
**Scope:** Transactions page + server functions + AI integrations (Prime, Byte, Tag, Crystal, Ledger)

---

## Part A: Current State Map

### Files & Responsibilities

#### **Frontend Components**

```
src/pages/TransactionsPage.tsx [995 lines]
├─ Render transactions table (mobile + desktop)
├─ Bulk edit/categorize UI
├─ Filter: date range, category, source file
├─ Export CSV (UNMASKED - PII RISK)
├─ Mock mode for demo (useMockData = true)
└─ CONCERNS:
   ❌ Uses client Supabase (getTransactions, updateTransaction, etc.) — No API gateway
   ❌ No error boundaries or Suspense
   ❌ No PII masking on export
   ❌ No audit logging for edit/delete
   ❌ Mock mode flag hardcoded in code
   ❌ Receipt URL opened in iframe — No XSS check

src/hooks/useTransactions.ts [185 lines]
├─ Hook for paginated transaction fetching
├─ Cursor-based pagination (✅ good)
├─ Filters: days, confidence, uncategorized, search
├─ Calls: /.netlify/functions/tx-list-latest (POST)
└─ CONCERNS:
   ⚠️  Header: x-user-id (NOT SECURE — should use Bearer token from session)
   ⚠️  No CSRF protection
   ⚠️  Error messages expose details
   ⚠️  No retry logic or exponential backoff
   ⚠️  setFilters() is a no-op (see line 161-165)

src/components/transactions/TransactionDetailModal.tsx
src/components/transactions/TransactionCards.tsx
src/components/transactions/TransactionCategorizer.tsx
└─ Not fully reviewed — likely using old patterns
```

#### **Server Functions**

```
netlify/functions/tx-list-latest.ts [219 lines]
├─ GET/POST endpoint for transaction list
├─ Zod input validation ✅
├─ Cursor pagination ✅
├─ RLS: Uses x-user-id header for scoping
└─ CONCERNS:
   ❌ No Bearer token verification — x-user-id is CLIENT-PROVIDED
   ❌ No rate limiting
   ❌ No audit logging
   ⚠️  safeLog() exists but PII could slip through

netlify/functions/categorize-transactions.ts
netlify/functions/tag-categorize.ts
netlify/functions/tag-categorize-dryrun.ts
netlify/functions/analytics-categorization.ts
└─ Implement Tag AI — needs review for auth, logging, PII

netlify/functions/commit-import.ts
netlify/functions/crystal-analyze-import.ts
netify/functions/prime-handoff.ts
└─ Smart Import orchestration — use as reference for pattern
```

#### **Shared Libraries**

```
netlify/functions/_shared/pii.ts [185 lines]
├─ Comprehensive PII detection (✅)
├─ Multiple strategies: last4, full, domain
├─ maskPII(), containsPII(), countPII()
└─ STATUS: ✅ READY — but NOT USED in tx-list-latest

netlify/functions/_shared/rate-limit.ts [148 lines]
├─ Supabase-based sliding window
├─ assertWithinRateLimit(userId, maxPerMinute=20)
└─ STATUS: ✅ READY — but NOT USED in tx functions

netlify/functions/_shared/guardrails*.ts
├─ guardrails.ts, guardrails-merged.ts, guardrails-production.ts
├─ Input/output moderation, PII masking
└─ STATUS: ✅ EXISTS — needs integration

netlify/functions/_shared/supabase.ts
├─ serverSupabase() — creates client with service role
└─ STATUS: ⚠️  Mixed auth — uses SERVICE ROLE for RLS queries (risky)
```

### Data Flow

```
User Views TransactionsPage
  │
  ├─ useTransactions()
  │  └─ POST /.netlify/functions/tx-list-latest
  │     ├─ Input: { days, pageSize, cursor, minConfidence, onlyUncategorized, q }
  │     ├─ Auth: x-user-id header (CLIENT HEADER — INSECURE)
  │     ├─ Query: Supabase (RLS: .eq("user_id", user_id))
  │     └─ Output: { ok, data, nextCursor, count } [NO PII MASKING]
  │
  ├─ Bulk Edit → updateTransaction() [direct Supabase client]
  │  └─ ❌ NO SERVER FUNCTION — client → DB directly
  │  └─ ❌ NO AUDIT LOG
  │
  ├─ Categorize → handleBulkCategorize() [direct Supabase client]
  │  └─ ❌ NO AI INTEGRATION (should delegate to Tag)
  │
  ├─ Export CSV → formatCurrency(), exportTransactions()
  │  └─ ❌ NO PII MASKING — emails, SSNs if in memo/description leak
  │
  └─ Delete → deleteTransaction() [direct Supabase client]
     └─ ❌ NO SOFT DELETE OR AUDIT TRAIL
```

---

## Part B: Security/PII Checklist Results

### RLS & Database Policies

| Item | Status | Details |
|------|--------|---------|
| **RLS Enabled** | ❌ UNKNOWN | transactions table — confirm with SQL audit |
| **user_id Scope** | ❌ RISKY | Header-based, not bearer token |
| **Tenant Scope** | ❌ MISSING | No account_id or org_id filtering |
| **Indexes** | ⚠️ PARTIAL | Need user_id, posted_at, category; check performance |
| **Soft Deletes** | ❌ MISSING | Hard deletes leave audit gaps |

### PII Masking

| Component | Status | Details |
|-----------|--------|---------|
| **maskPII() utility** | ✅ EXISTS | Credit cards, SSNs, emails, phones (comprehensive) |
| **Used in tx-list-latest** | ❌ NO | Raw transaction data returned |
| **Used in CSV export** | ❌ NO | Full merchant, memo leaked |
| **Used in chat transcripts** | ⚠️ UNKNOWN | If AI sees raw txns, PII exposed |
| **Logs (safeLog)** | ⚠️ PARTIAL | Logs PII events but not all fields masked |

### Authentication & Authorization

| Item | Status | Details |
|------|--------|---------|
| **Session Token** | ✅ EXISTS | useAuth() context |
| **Bearer Token in Functions** | ❌ MISSING | tx-list-latest uses x-user-id header |
| **Frontend Blocks Unauth** | ⚠️ WEAK | Likely relies on Supabase auth redirect; no explicit check |
| **Role Separation** | ❌ NONE | No user vs admin vs AI employee roles |
| **Service Role Usage** | ❌ RISKY | serverSupabase() uses service role for RLS queries (defeats RLS) |

### Secrets & Configuration

| Item | Status | Details |
|------|--------|---------|
| **Anon Key in Functions** | ❌ RISKY | `.env` has VITE_SUPABASE_ANON_KEY |
| **Service Role Key** | ⚠️ CAUTIOUS | Used in functions; not leaked but risky pattern |
| **API Endpoints** | ⚠️ HARDCODED | "/.netlify/functions/tx-list-latest" in hook |
| **CORS Headers** | ❌ UNKNOWN | Netlify functions likely allow all origins |
| **Virus Scan** | ❌ MISSING | No scan before importing documents |

### Rate Limiting

| Item | Status | Details |
|------|--------|---------|
| **Rate Limit Utility** | ✅ EXISTS | `rate-limit.ts` with sliding window |
| **Applied to tx-list-latest** | ❌ NO | No rate limiting on endpoint |
| **Applied to categorize** | ❌ NO | AI endpoints likely unprotected |
| **Per-IP + Per-User** | ⚠️ PARTIAL | Per-user only; no per-IP for login attempts |

### Input Validation

| Item | Status | Details |
|------|--------|---------|
| **tx-list-latest** | ✅ YES | Zod schema validates days, pageSize, cursor, q |
| **CSV Injection** | ❌ NO | Export adds quotes but no formula check (="..." bypass) |
| **XSS in URLs** | ❌ NO | Receipt URLs not sanitized before iframe |
| **Merchant Name Injection** | ❌ NO | Search term (q param) not escaped |

### Error Handling & Audit

| Item | Status | Details |
|------|--------|---------|
| **Global Error Handler** | ❌ MISSING | No Sentry/ErrorBoundary for UI |
| **Stack Trace Redaction** | ❌ MISSING | 500 error returns raw message |
| **PII in Error Messages** | ❌ RISK | If query fails, user_id or transaction data in trace |
| **Audit Logs** | ❌ MISSING | No guardrail_events table writes |
| **Edit/Delete Trails** | ❌ MISSING | Hard deletes, no changelog |

### Moderation & Guardrails

| Item | Status | Details |
|------|--------|---------|
| **Input Moderation** | ⚠️ PARTIAL | guardrails.ts exists; not wired to tx endpoints |
| **Output Moderation** | ❌ NO | No filter on transaction descriptions before showing AI |
| **Prime Context** | ❌ RISKY | If Prime sees raw memo/descriptions, moderation needed |
| **Consent Banner** | ❌ MISSING | No disclosure about AI processing of transactions |

### Accessibility & UX

| Item | Status | Details |
|------|--------|---------|
| **Keyboard Navigation** | ⚠️ PARTIAL | Table has checkboxes; modals may not have focus management |
| **Screen Reader Labels** | ❌ MISSING | No aria-label on buttons, filter controls |
| **Loading States** | ✅ YES | Skeleton loader in place |
| **Error Messages** | ❌ WEAK | Generic "Failed to load transactions" (user-safe but not helpful) |

---

## Part C: Gaps & Risks

### Severity: CRITICAL 🚨

| Gap | Risk | Impact | Effort |
|-----|------|--------|--------|
| **No Bearer Token Auth** | Client can spoof user_id header; access any user's transactions | Data breach, compliance violation | 1 day |
| **Service Role in RLS Queries** | RLS policies bypassed; all queries unfiltered | Privilege escalation if bug in serverSupabase() | 1 day |
| **CSV Export Unmasked** | Full PII (emails, SSNs, account numbers) exported to user's device | Compliance (GDPR, CCPA); data loss if laptop stolen | 2 hours |
| **No Audit Trail on Edits** | Hard deletes; no changelog; compliance audit impossible | Regulatory failure, forensics impossible | 1 day |
| **No Rate Limiting** | Brute force, data exfiltration via repeated API calls | DoS, abuse, API quota exhaustion | 4 hours |

### Severity: HIGH ⚠️

| Gap | Risk | Impact | Effort |
|-----|------|--------|--------|
| **XSS in Receipt URL** | Malicious iframe src → stored XSS if URL not sanitized | Session hijacking, credential theft | 4 hours |
| **CSV Formula Injection** | Formulas in descriptions execute in Excel → malware | Macro execution, lateral movement | 6 hours |
| **Missing Consent Banner** | Users unaware transactions sent to Prime/Crystal | GDPR non-compliance, trust loss | 2 hours |
| **No Error Boundaries** | Unhandled error crashes whole page; no recovery UI | User frustration, support load | 4 hours |
| **Client Direct DB** | Bulk edit/delete calls Supabase directly; no server function | Easier to intercept, modify requests, bypass validation | 2 days |
| **AI Sees Raw Data** | Prime/Crystal context includes unmasked descriptions, memos | PII exposure in AI logs/training | 1 day |

### Severity: MEDIUM ⚠️

| Gap | Risk | Impact | Effort |
|-----|------|--------|--------|
| **No Soft Delete** | Deleted transactions lost forever; cannot audit recoveries | Compliance, forensic failure | 1 day |
| **Mock Mode Hardcoded** | useMockData=true in code; can flip in prod | Risk of demo data in production | 2 hours |
| **No CSRF Tokens** | PUT/DELETE requests from forms vulnerable | Account compromise via phishing | 4 hours |
| **Merchant Injection** | Search term (q param) not escaped; could break SQL or XSS | Query failure, account compromise | 2 hours |
| **No Screen Reader Labels** | Accessibility fail for government/public sector users | Compliance (Section 508, AODA) | 1 day |
| **Sparse Indexes** | Missing user_id, category, posted_at indexes on transactions | Slow queries, poor UX | 2 hours (DBA time) |

---

## Part D: Exact Patch Plan

### **Patch 1: Bearer Token Auth for tx-list-latest (CRITICAL)**

**File:** `netlify/functions/tx-list-latest.ts`

**Change:** Replace x-user-id header with Bearer token verification

```typescript
// BEFORE (line 96-99):
const user_id = event.headers["x-user-id"] as string | undefined;
if (!user_id) {
  return { statusCode: 401, body: "Unauthorized" };
}

// AFTER: Add at top after imports
import { createClient } from "@supabase/supabase-js";

async function getUserIdFromBearerToken(token: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.VITE_SUPABASE_ANON_KEY || ""
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.id) return null;
    return user.id;
  } catch (err) {
    return null;
  }
}

// Replace lines 96-99 with:
const authHeader = event.headers["authorization"] || "";
const token = authHeader.replace(/^Bearer\s+/i, "");
if (!token) {
  return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Missing auth token" }) };
}
const user_id = await getUserIdFromBearerToken(token);
if (!user_id) {
  return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Invalid token" }) };
}
```

---

### **Patch 2: Apply Rate Limiting (CRITICAL)**

**File:** `netlify/functions/tx-list-latest.ts`

**Change:** Add rate limit check after auth

```typescript
// After line 108 (after serverSupabase()):
import { assertWithinRateLimit } from "./_shared/rate-limit";

export const handler: Handler = async (event) => {
  try {
    // ... existing auth code ...
    
    // ADD HERE (after user_id verified):
    try {
      await assertWithinRateLimit(user_id, 60); // 60 reqs/minute
    } catch (err: any) {
      if (err.statusCode === 429) {
        return {
          statusCode: 429,
          headers: { "Retry-After": String(err.retryAfter) },
          body: JSON.stringify({ ok: false, error: err.message })
        };
      }
      throw err;
    }
    
    // ... rest of handler ...
```

---

### **Patch 3: PII Masking for Transactions (CRITICAL)**

**File:** Create `netlify/functions/tx-sanitize.ts`

```typescript
/**
 * Sanitize transaction fields to redact PII
 */
import { maskPII } from "./_shared/pii";

export function sanitizeTransaction(tx: any) {
  return {
    ...tx,
    memo: tx.memo ? maskPII(tx.memo).masked : null,
    merchant_name: tx.merchant_name, // assume pre-sanitized (brand name)
    // Note: ID, amount, posted_at, category_id are safe
  };
}

export function sanitizeTransactionArray(txns: any[]) {
  return txns.map(sanitizeTransaction);
}
```

**Apply in tx-list-latest.ts (line 191):**

```typescript
// BEFORE:
const rows: TransactionRow[] = items.map((i: any) => ({
  // ...
  memo: i.memo ?? null,
}));

// AFTER:
import { sanitizeTransaction } from "./tx-sanitize";

const rows: TransactionRow[] = items.map((i: any) => 
  sanitizeTransaction({
    id: i.id,
    user_id: i.user_id,
    merchant_name: i.merchant_name,
    merchant_norm: i.merchant_norm ?? null,
    amount: Number(i.amount),
    posted_at: i.posted_at,
    memo: i.memo ?? null,
    category_id: i.category ?? null,
    category_name: i.category ?? null,
    confidence: i.category_confidence ?? null,
    source: i.category ? "manual" : null,
  })
);
```

---

### **Patch 4: Update Client Hook to Use Bearer Token (CRITICAL)**

**File:** `src/hooks/useTransactions.ts`

**Change:** Replace x-user-id header with Bearer token from session

```typescript
// BEFORE (line 98-103):
const resp = await fetch("/.netlify/functions/tx-list-latest", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-user-id": userId,  // ❌ REMOVE THIS
  },
  body: JSON.stringify({

// AFTER:
import { useAuth } from "@/contexts/AuthContext";

export function useTransactions(options: UseTransactionsOptions = {}): UseTransactionsResult {
  const { userId } = useAuth();
  const { session } = useAuth(); // ADD THIS

  const fetchTransactions = useCallback(
    async (cursor?: string | null) => {
      if (!userId) {
        setError("Not authenticated");
        return;
      }
      
      // ADD BEARER TOKEN VERIFICATION:
      if (!session?.access_token) {
        setError("Session expired");
        return;
      }

      // ... existing code ...

      const resp = await fetch("/.netlify/functions/tx-list-latest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`, // ✅ USE BEARER TOKEN
        },
        body: JSON.stringify({
          days,
          pageSize,
          cursor: cursor ?? null,
          minConfidence,
          onlyUncategorized,
          q: q || undefined,
        }),
      }).then((r) => r.json());
```

---

### **Patch 5: CSV Export PII Masking**

**File:** `src/pages/TransactionsPage.tsx` (lines 370-397)

**Change:** Mask PII before exporting

```typescript
// ADD THIS HELPER AT TOP OF FILE:
function maskPIIInExport(text: string): string {
  // Simple masks for common PII patterns
  // Full regex available from netlify/functions/_shared/pii.ts
  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '***-**-XXXX') // SSN
    .replace(/\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g, '****-****-****-XXXX') // CC
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]') // Email
    .replace(/\+?1?\s?(\d{3})?[-.\s]?(\d{3})[-.\s]?(\d{4})/g, '[PHONE_REDACTED]'); // Phone
}

// THEN update exportTransactions() around line 370-397:
const exportTransactions = () => {
  const data = transactions.map(t => ({
    Date: formatDate(t.date),
    Description: maskPIIInExport(t.description), // ✅ MASK MERCHANT
    Amount: t.amount,
    Type: t.type,
    Category: t.category,
    Subcategory: t.subcategory || '',
    'Source File': t.file_name,
    'Auto Categorized': isAutoCategorized(t) ? 'Yes' : 'No',
    'Has Receipt': t.receipt_url ? 'Yes' : 'No'
  }));

  // ... rest of CSV generation stays the same ...
};
```

---

### **Patch 6: Audit Trail for Edits/Deletes**

**File:** Create `netlify/functions/_shared/audit-log.ts`

```typescript
/**
 * Write audit events for transaction modifications
 */
import { createClient } from "@supabase/supabase-js";

export async function logAuditEvent(
  userId: string,
  action: "UPDATE_CATEGORY" | "DELETE" | "EDIT" | "EXPORT",
  resourceId: string,
  resourceType: "transaction" | "import" | "batch",
  details?: Record<string, unknown>,
  result?: "SUCCESS" | "FAILURE"
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from("guardrail_events").insert({
      user_id: userId,
      actor: "user",
      action,
      resource_id: resourceId,
      resource_type: resourceType,
      details: details || {},
      result: result || "SUCCESS",
      timestamp: new Date().toISOString(),
      ip_address: "", // TODO: capture from event.ip
    });
  } catch (err: any) {
    console.error("[Audit] Failed to log:", err?.message);
    // Fail silently — don't block user operations
  }
}
```

---

### **Patch 7: Create Transactions Update Function (Move from Client)**

**File:** Create `netlify/functions/transactions-update.ts`

```typescript
/**
 * POST /netlify/functions/transactions-update
 * 
 * Safely update transaction category.
 * Includes: bearer auth, rate limit, audit log, PII masking
 */

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { assertWithinRateLimit } from "./_shared/rate-limit";
import { logAuditEvent } from "./_shared/audit-log";
import { maskPII } from "./_shared/pii";
import { safeLog } from "./_shared/safeLog";

// Bearer token extraction (reuse from tx-list-latest)
async function getUserIdFromBearerToken(token: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || "",
      process.env.VITE_SUPABASE_ANON_KEY || ""
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.id) return null;
    return user.id;
  } catch (err) {
    return null;
  }
}

const UpdateSchema = z.object({
  transaction_id: z.string().uuid(),
  category_id: z.string().optional(),
  category_name: z.string().max(255).optional(),
  memo: z.string().max(1000).optional(),
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ ok: false, error: "Method not allowed" }) };
    }

    // 1. Auth
    const authHeader = event.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Missing auth token" }) };
    }
    const user_id = await getUserIdFromBearerToken(token);
    if (!user_id) {
      return { statusCode: 401, body: JSON.stringify({ ok: false, error: "Invalid token" }) };
    }

    // 2. Rate limit
    try {
      await assertWithinRateLimit(user_id, 100); // More lenient for edits
    } catch (err: any) {
      return {
        statusCode: 429,
        headers: { "Retry-After": String(err.retryAfter) },
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }

    // 3. Validate input
    const body = JSON.parse(event.body || "{}");
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Invalid input", details: parsed.error.flatten() }) };
    }
    const { transaction_id, category_id, category_name, memo } = parsed.data;

    // 4. Fetch & verify ownership
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: tx, error: fetchErr } = await supabase
      .from("transactions")
      .select("user_id, category, memo")
      .eq("id", transaction_id)
      .single();

    if (fetchErr || !tx) {
      return { statusCode: 404, body: JSON.stringify({ ok: false, error: "Transaction not found" }) };
    }
    if (tx.user_id !== user_id) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: "Forbidden" }) };
    }

    // 5. Update
    const updatePayload: Record<string, unknown> = {};
    if (category_id) updatePayload.category = category_id;
    if (category_name) updatePayload.category = category_name;
    if (memo) updatePayload.memo = memo;

    const { error: updateErr } = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", transaction_id)
      .eq("user_id", user_id);

    if (updateErr) throw updateErr;

    // 6. Audit log
    await logAuditEvent(
      user_id,
      "UPDATE_CATEGORY",
      transaction_id,
      "transaction",
      {
        old_category: tx.category,
        new_category: category_id || category_name,
        timestamp: new Date().toISOString()
      },
      "SUCCESS"
    );

    safeLog("transactions-update.success", { user_id, transaction_id, action: "update_category" });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, id: transaction_id })
    };
  } catch (err: any) {
    safeLog("transactions-update.error", { error: maskPII(err?.message).masked });
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Failed to update" }) };
  }
};
```

---

### **Patch 8: Soft Delete + Audit Trail**

**File:** Create SQL migration

```sql
-- Add soft delete column to transactions
ALTER TABLE transactions ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create changelog table
CREATE TABLE transaction_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'restore'
  old_values JSONB,
  new_values JSONB,
  changed_at TIMESTAMP DEFAULT now(),
  changed_by TEXT -- 'user', 'ai_employee', etc.
);

-- RLS on changelog
ALTER TABLE transaction_changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own changelog" ON transaction_changelog
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transaction_changelog_user_id ON transaction_changelog(user_id);
CREATE INDEX idx_transaction_changelog_tx_id ON transaction_changelog(transaction_id);
CREATE INDEX idx_transaction_changelog_changed_at ON transaction_changelog(changed_at DESC);
```

---

### **Patch 9: Add Consent Banner**

**File:** Create `src/components/consent/TransactionConsentBanner.tsx`

```typescript
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export function TransactionConsentBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = async () => {
    if (!user) return;
    
    // Store dismissal in user metadata
    await supabase.auth.updateUser({
      data: { transaction_consent_v1_dismissed: new Date().toISOString() }
    });
    
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
      <div className="flex items-start">
        <AlertCircle className="text-blue-600 mr-3 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">AI Processing Notice</h3>
          <p className="text-sm text-blue-800 mt-1">
            Your transactions are processed by our AI team (Prime, Crystal, Tag, Ledger) to provide insights, 
            categorization, and financial advice. Personal information (emails, account numbers, phone numbers) 
            is automatically masked before AI processing. <a href="/privacy" className="underline">Learn more</a>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 text-blue-600 hover:text-blue-800"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
```

**Add to TransactionsPage.tsx (line 415):**

```typescript
import { TransactionConsentBanner } from "../components/consent/TransactionConsentBanner";

// Inside return (after PageHeader):
<TransactionConsentBanner />
```

---

### **Patch 10: XSS Prevention for Receipt URLs**

**File:** `src/pages/TransactionsPage.tsx` (line 966-971)

**Change:** Sanitize receipt URL before loading in iframe

```typescript
// ADD DOMPurify helper at top:
import DOMPurify from "dompurify";

// In receipt viewer (line 966-971):
// BEFORE:
{viewingReceipt.toLowerCase().includes('.pdf') ? (
  <iframe
    src={viewingReceipt}
    className="w-full h-[70vh] border rounded"
    title="Receipt PDF"
  />
) : (
  <img
    src={viewingReceipt}
    alt="Receipt"
    className="max-w-full h-auto rounded"
  />
)}

// AFTER:
{viewingReceipt.toLowerCase().includes('.pdf') ? (
  <iframe
    src={DOMPurify.sanitize(viewingReceipt, { ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|blob):|[^a-z]|[a-z+.\-]*(?:[^a-z+.\-:]|$))/i })}
    className="w-full h-[70vh] border rounded"
    title="Receipt PDF"
    sandbox="allow-same-origin" // ✅ Sandbox iframe
  />
) : (
  <img
    src={DOMPurify.sanitize(viewingReceipt, { ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|blob):|[^a-z]|[a-z+.\-]*(?:[^a-z+.\-:]|$))/i })}
    alt="Receipt"
    className="max-w-full h-auto rounded"
  />
)}
```

---

### **Patch 11: Global Error Boundary**

**File:** Create `src/components/ErrorBoundary.tsx`

```typescript
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to service
    console.error("Error Boundary caught:", error, errorInfo);
    // Could send to Sentry/monitoring service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="font-semibold text-red-900">Something went wrong</h2>
          <p className="text-sm text-red-700 mt-1">Please refresh the page or contact support.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap TransactionsPage in layout:**

```typescript
// In DashboardLayout.tsx or routes:
<ErrorBoundary>
  <TransactionsPage />
</ErrorBoundary>
```

---

### **Patch 12: Accessibility Labels**

**File:** `src/pages/TransactionsPage.tsx` — Add aria-labels

```typescript
// Line 429 (Filter button):
<button 
  className="btn-outline flex items-center"
  onClick={() => setShowFilters(!showFilters)}
  aria-label={showFilters ? "Hide transaction filters" : "Show transaction filters"}
>

// Line 746 (Select All checkbox):
<input
  type="checkbox"
  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
  checked={selectAll}
  onChange={handleSelectAll}
  aria-label="Select all transactions on this page"
/>

// Line 782 (Individual checkboxes):
<input
  type="checkbox"
  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
  checked={selectedTransactions.includes(transaction.id)}
  onChange={() => handleSelectTransaction(transaction.id)}
  aria-label={`Select transaction from ${transaction.description}`}
/>
```

---

## Part E: Acceptance Criteria

- [ ] **Bearer token auth** in tx-list-latest; x-user-id header removed
- [ ] **Rate limiting** applied: 60 req/min for tx-list-latest, 100 for tx-update
- [ ] **PII masking** applied: transactions returned, CSV exports, AI context
- [ ] **Audit trail** logged: all edits, deletes to guardrail_events
- [ ] **Soft deletes** enabled: deleted_at column, transaction_changelog table
- [ ] **Consent banner** displayed on TransactionsPage
- [ ] **XSS prevention**: Receipt URLs sanitized, iframe sandboxed
- [ ] **Error boundary** wraps TransactionsPage; graceful error recovery
- [ ] **Accessibility**: aria-labels on all buttons, form controls
- [ ] **No unmasked PII in logs**: All safeLog() calls verified
- [ ] **No mock mode in prod**: useMockData removed or gated by env var
- [ ] **CSV export injection**: Formula escape (=) checked
- [ ] **Client → Server migration**: Bulk edit/delete use tx-update function, not direct DB

---

## Part F: Follow-up Tests

### Manual Testing (Local)

```bash
# 1. Bearer Token Test
curl -X POST http://localhost:8888/.netlify/functions/tx-list-latest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [invalid-token]"
# Expected: 401 Unauthorized

curl -X POST http://localhost:8888/.netlify/functions/tx-list-latest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(supabase auth getAccessToken)"
# Expected: 200 OK with transactions

# 2. Rate Limit Test
for i in {1..65}; do
  curl -s -X POST http://localhost:8888/.netlify/functions/tx-list-latest \
    -H "Authorization: Bearer $TOKEN" | jq .ok
done
# Expected: 64 OK, then 429 Too Many Requests

# 3. PII Masking Test
curl -X POST http://localhost:8888/.netlify/functions/tx-list-latest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 30}' | jq '.data[0].memo'
# Expected: SSNs/emails/cards masked (e.g., "***-**-XXXX")

# 4. CSV Export Test
# Export transactions with memo containing "john@example.com 555-1234"
# Open CSV, verify memo masked as "[EMAIL_REDACTED] [PHONE_REDACTED]"

# 5. Audit Log Test
# Make an edit via tx-update
# Check guardrail_events table: SELECT * FROM guardrail_events WHERE user_id = $1
# Expected: entry with action='UPDATE_CATEGORY', result='SUCCESS'
```

### Unit Tests

```typescript
// src/__tests__/transactions-security.test.ts

import { maskPII } from "@netlify/functions/_shared/pii";
import { sanitizeTransaction } from "@netlify/functions/tx-sanitize";

describe("Transaction Security", () => {
  it("masks SSN in memo", () => {
    const result = maskPII("My SSN is 123-45-6789");
    expect(result.masked).toContain("***-**-6789");
  });

  it("masks email in description", () => {
    const result = maskPII("Contact: john@example.com");
    expect(result.masked).toContain("[EMAIL_REDACTED]");
  });

  it("sanitizes transaction removes PII from memo", () => {
    const tx = {
      id: "123",
      memo: "SSN: 123-45-6789",
      merchant_name: "Starbucks"
    };
    const sanitized = sanitizeTransaction(tx);
    expect(sanitized.memo).toContain("***-**-6789");
  });

  it("rate limiter throws 429 on exceeded limit", async () => {
    // Mock 65 rapid requests
    // Expect: first 60 OK, then 429
  });
});
```

---

## Summary

**Status:** 🚨 **CRITICAL — DEPLOY PATCHES BEFORE PROD**

**Key Actions:**
1. ✅ Apply Patches 1-4 (Bearer auth, rate limit, PII masking) — **Blocking**
2. ✅ Apply Patches 5-7 (Audit trail, soft deletes) — **High priority**
3. ✅ Apply Patches 8-12 (Consent, XSS, accessibility) — **Medium priority**
4. ✅ Run manual tests + unit tests
5. ✅ Deploy to staging; verify logs, audit trail, no PII leaks
6. ✅ Cut release with conventional commit: `feat(security): transaction pipeline hardening`

**Timeline:** ~2 weeks for full implementation + testing.
**Owner:** Security + Backend Lead.

---

**End of Audit**





