# 📁 File Structure & Import Patterns Guide

## Correct File Locations

### ✅ CORRECT Shared Utilities

```
netlify/functions/_shared/
├── supabase.ts              ✅ Main Supabase client factory
├── sec.ts                   ✅ Security utilities (getUserId, rateLimit, etc.)
├── metrics.ts               ✅ Metrics/telemetry helpers
└── types.ts                 ✅ Shared TypeScript types
```

### ❌ DO NOT USE

```
netlify/functions/supabase.ts           ❌ (wrong location, use _shared)
netlify/functions/_shared/supabaseAdmin.ts  ❌ (renamed to supabase.ts)
netlify/functions/[employee]/supabase.ts    ❌ (not a shared pattern)
src/lib/supabaseAdmin.ts                    ❌ (for frontend only)
```

---

## Shared Utilities

### 1️⃣ `netlify/functions/_shared/supabase.ts`

```typescript
// netlify/functions/_shared/supabase.ts

import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client (service role key)
 * Used in backend functions for full database access
 * Bypasses RLS for administrative operations
 */
export function serverSupabase() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false } // No session persistence on backend
  });
  
  return { supabase };
}

/**
 * Convenience export for destructuring
 */
export const { supabase: supabaseAdmin } = serverSupabase();
```

**Usage in functions:**

```typescript
// ✅ CORRECT
import { serverSupabase } from "./_shared/supabase";

export const handler: Handler = async (event) => {
  const { supabase } = serverSupabase();
  const { data, error } = await supabase.from("transactions").select("*");
};

// OR (if exported as supabaseAdmin)
import { supabaseAdmin } from "./_shared/supabase";

export const handler: Handler = async (event) => {
  const { data, error } = await supabaseAdmin.from("transactions").select("*");
};
```

---

### 2️⃣ `netlify/functions/_shared/sec.ts`

```typescript
// netlify/functions/_shared/sec.ts

import { z } from "zod";
import { serverSupabase } from "./supabase";

const { supabase } = serverSupabase();

/**
 * Extract and validate user ID from request headers
 * Throws if missing or invalid (fail-fast)
 */
export function getUserId(headers: Record<string, string | string[] | undefined>): string {
  const h = headers["x-user-id"];
  const id = Array.isArray(h) ? h[0] : h;
  
  if (!id || typeof id !== "string" || id.trim() === "") {
    throw new Error("Unauthorized");
  }
  
  return id;
}

/**
 * Check rate limit quota atomically in DB
 * Sets statusCode = 429 on quota exceeded
 */
export async function rateLimit(
  userId: string,
  route: string,
  limit: number = 60,
  windowSec: number = 60
): Promise<void> {
  const { data, error } = await supabase.rpc("check_and_consume_quota", {
    p_user_id: userId,
    p_route: route,
    p_limit: limit,
    p_window_sec: windowSec
  });

  if (error) throw error;

  if (!data) {
    const err: any = new Error("Too Many Requests");
    err.statusCode = 429;
    throw err;
  }
}

/**
 * Guard against excessively large payloads
 * Prevents DOS attacks
 */
export function ensureSize(eventBody: string | null | undefined): void {
  const MAX_BODY_BYTES = 200 * 1024;

  if (eventBody && Buffer.byteLength(eventBody, "utf8") > MAX_BODY_BYTES) {
    const err: any = new Error("Payload too large");
    err.statusCode = 413;
    throw err;
  }
}

/**
 * Redact PII from objects before logging
 * Strips credit cards, emails, SSNs, API keys
 */
export function redact<T = any>(obj: T): T {
  if (!obj) return obj as T;

  const clone = JSON.parse(JSON.stringify(obj));

  const scrub = (v: any): any => {
    if (typeof v !== "string") return v;

    v = v.replace(/\b\d{12,19}\b/g, "[redacted]"); // Credit cards
    v = v.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted]"); // Emails
    v = v.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[redacted]"); // SSNs
    v = v.replace(/sk_live_[a-zA-Z0-9]{20,}/g, "[redacted]"); // Stripe keys

    return v;
  };

  const walk = (x: any): any => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === "object") {
      for (const k of Object.keys(x)) x[k] = walk(x[k]);
      return x;
    }
    return scrub(x);
  };

  return walk(clone) as T;
}

/**
 * Idempotency key validation
 */
export const IdemKey = z.string().max(128);
export type IdemKey = z.infer<typeof IdemKey>;
```

**Usage in functions:**

```typescript
// ✅ CORRECT
import { getUserId, rateLimit, ensureSize, redact } from "./_shared/sec";

export const handler: Handler = async (event) => {
  try {
    ensureSize(event.body);
    const userId = getUserId(event.headers as any); // Throws if missing
    await rateLimit(userId, "my-endpoint", 60, 60); // Throws if rate limited

    console.log("Request:", redact(JSON.parse(event.body!))); // Safe logging

    // Process...
  } catch (e: any) {
    const code = e.statusCode || 500;
    return { statusCode: code, body: JSON.stringify({ ok: false }) };
  }
};
```

---

## Endpoint File Structure

### Template: Complete Endpoint

```typescript
// netlify/functions/my-endpoint.ts
// Pattern: [feature]-[action].ts (e.g., tag-categorize.ts, employee-pull.ts)

import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { serverSupabase } from "./_shared/supabase";
import { getUserId, rateLimit, ensureSize, redact } from "./_shared/sec";

const { supabase } = serverSupabase();

// 1. Input validation schema
const Input = z.object({
  field1: z.string().min(1).max(100),
  field2: z.number().int().min(0).max(100),
});

type InputType = z.infer<typeof Input>;

// 2. Main handler
export const handler: Handler = async (event) => {
  try {
    // Security: Method validation
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Security: Payload size guard
    ensureSize(event.body);

    // Security: Extract authenticated user
    const userId = getUserId(event.headers as any);

    // Security: Rate limit check
    await rateLimit(userId, "my-endpoint", 60, 60);

    // Security: Input validation
    const parsed = Input.safeParse(JSON.parse(event.body ?? "{}"));
    if (!parsed.success) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors
        })
      };
    }

    const { field1, field2 } = parsed.data;

    // Business logic (in zone of trust)
    const { data, error } = await supabase
      .from("my_table")
      .insert({ user_id: userId, field1, field2 });

    if (error) throw error;

    // Logging (with redaction)
    console.log("[MyEndpoint] Success:", redact({
      userId,
      field1,
      field2
    }));

    // Response
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, data })
    };

  } catch (e: any) {
    // Error handling with proper status codes
    const code = e.statusCode || 500;
    console.error(`[MyEndpoint] Error (${code}):`, redact(e));

    return {
      statusCode: code,
      body: JSON.stringify({
        ok: false,
        error: code === 429 ? "Rate limited" : "Failed"
      })
    };
  }
};
```

---

## Frontend File Structure

```
src/
├── lib/
│   ├── supabase.ts              ✅ Client-side Supabase (anon key)
│   ├── embeddings.ts            ✅ OpenAI embedding helpers
│   ├── notify.ts                ✅ Client-side notification sender
│   └── hooks/
│       ├── useTransactions.ts    ✅ Fetch + manage transactions
│       ├── useMetrics.ts         ✅ Fetch analytics
│       └── useCategoryConfirmation.ts ✅ Low-confidence confirmation
│
├── components/
│   ├── TransactionListTable.tsx  ✅ Main transaction view
│   ├── CategoryConfirmation.tsx  ✅ Inline confirmation modal
│   ├── RuleSuggestions.tsx       ✅ Display + dismiss suggestions
│   └── NotificationBell.tsx      ✅ Real-time notifications
│
└── pages/
    ├── Dashboard.tsx             ✅ Main transaction view
    ├── SmartCategories.tsx        ✅ Category analytics
    └── RuleBuilder.tsx            ✅ Create automation rules
```

**Frontend Supabase client:**

```typescript
// src/lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client (anon key)
 * RLS policies enforce user isolation automatically
 * Never use service role key on frontend!
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * Get current user session
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get current user ID
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id || null;
}
```

---

## Import Patterns by Location

### In Backend Functions (Netlify)

```typescript
// ✅ CORRECT imports

// Supabase
import { serverSupabase } from "./_shared/supabase";
const { supabase } = serverSupabase();

// OR shorter
import { supabase } from "./_shared/supabase";

// Security
import { getUserId, rateLimit, ensureSize, redact } from "./_shared/sec";

// Relative paths (stay in netlify/functions)
import { someHelper } from "./_shared/helpers";
import { RATE_LIMITS } from "./_shared/constants";

// ❌ WRONG imports

// Don't import from src (frontend code)
import { supabase } from "../../../src/lib/supabase"; // ❌

// Don't import from wrong _shared path
import { redact } from "../_shared/sec"; // ❌ (wrong relative path)

// Don't use sibling function's local code
import { helper } from "../other-function/helpers"; // ❌
```

### In Frontend (React)

```typescript
// ✅ CORRECT imports

// Supabase client
import { supabase, getUserId } from "@/lib/supabase";

// Hooks
import { useTransactions } from "@/hooks/useTransactions";
import { useMetrics } from "@/hooks/useMetrics";

// Components
import { TransactionListTable } from "@/components/TransactionListTable";

// ❌ WRONG imports

// Don't import netlify functions directly
import { serverSupabase } from "../../netlify/functions/_shared/supabase"; // ❌

// Don't import service role code
import { rateLimit } from "../../netlify/functions/_shared/sec"; // ❌
```

---

## Environment Variables

### `.env.local` (Backend + Frontend)

```bash
# Backend (Netlify Functions)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-...
SITE_URL=https://your-site.netlify.app

# Frontend (Vite - must start with VITE_)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**In Netlify UI (Functions):**

```
Site Settings → Build & Deploy → Environment
├── SUPABASE_URL = ...
├── SUPABASE_SERVICE_ROLE_KEY = ...
├── OPENAI_API_KEY = ...
└── SITE_URL = ...
```

---

## Testing Imports Locally

```bash
# Start dev server
npm run dev

# In new terminal: test a function
curl -X POST http://localhost:8888/.netlify/functions/my-endpoint \
  -H "x-user-id: test-user-123" \
  -H "Content-Type: application/json" \
  -d '{"field1": "value", "field2": 5}'

# Verify response
# { "ok": true, "data": ... }
```

---

## Debugging Import Errors

### Error: `Cannot find module './_shared/supabase'`

```
Fix: Check you're in netlify/functions/ directory
❌ netlify/functions/my-endpoint/_shared/supabase.ts (wrong nesting)
✅ netlify/functions/_shared/supabase.ts (correct)

Then import:
import { supabase } from "./_shared/supabase";
```

### Error: `SUPABASE_URL is not defined`

```
Fix: Check environment variables in:
1. .env.local (local dev)
2. Netlify Site Settings (production)

Test: In Netlify function, log process.env:
console.log("URL:", process.env.SUPABASE_URL);
```

### Error: `RLS policy rejection`

```
Fix: Check RLS policies allow the operation

In Supabase:
1. Go to Authentication → Policies
2. Verify policy for your table exists
3. Check WHERE clause includes user_id = auth.uid()

Example:
CREATE POLICY "users_own_data" ON my_table
  FOR ALL USING (auth.uid() = user_id);
```

---

## Summary

✅ **Correct Structure**
```
netlify/functions/_shared/
├── supabase.ts       (Supabase client factory)
├── sec.ts            (Security utilities)
├── metrics.ts        (Telemetry)
└── types.ts          (Shared types)

netlify/functions/
├── [feature]-[action].ts   (Endpoints)
├── [feature]-worker.ts     (Scheduled)
└── _shared/                (Shared code)

src/lib/
├── supabase.ts       (Frontend client)
├── embeddings.ts     (Frontend helpers)
└── hooks/
    └── *.ts          (Custom hooks)
```

✅ **Import Pattern**
```
Backend:   import { X } from "./_shared/Y";
Frontend:  import { X } from "@/lib/Y";
```

✅ **Security**
```
Backend:   Use service role key (server-side only)
Frontend:  Use anon key (RLS enforced)
```

✅ **Environment**
```
.env.local:        Local development
Netlify UI:        Production secrets
VITE_*:            Frontend visible
Others:            Backend only
```

---

**Status:** ✅ **Ready to Use**
**Consistency:** All files follow this structure
**Maintainability:** Clear import patterns prevent confusion




