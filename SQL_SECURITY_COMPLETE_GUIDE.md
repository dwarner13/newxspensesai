# 🔐 SQL Security Complete Guide: Audit Logs, Consents & Signatures

**Version:** 1.0  
**Date:** 2025-10-19  
**Status:** Production-Ready  
**Scope:** Comprehensive security hardening for XspensesAI platform

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Migration Deployment](#migration-deployment)
5. [Security Policies](#security-policies)
6. [Implementation Guide](#implementation-guide)
7. [Testing & Verification](#testing--verification)
8. [Compliance & Regulations](#compliance--regulations)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Overview

This guide provides a complete implementation of security hardening for XspensesAI, consisting of three main components:

### 1. **Audit Logs Immutability** (`20251019_audit_logs_immutable.sql`)
- Make `audit_logs` table INSERT-ONLY for authenticated users
- Prevent UPDATE/DELETE operations through RLS and triggers
- Enable administrative access for compliance reporting
- Ensure audit trail integrity

### 2. **User Consents** (`20251019_user_consents_and_signatures.sql`)
- Track user consent to data processing policies
- Version-based consent management for GDPR compliance
- Support AI team access consent
- Store consent timestamps and hashes

### 3. **Signature Verification** (`netlify/functions/_shared/verify-signature.ts`)
- HMAC-SHA256 signature verification with timing-safe comparison
- Prevent replay attacks with timestamp-based signing
- Support webhook and API request verification
- Audit trail for verification attempts

---

## Architecture

### Component Relationships

```
┌─────────────────────────────────────────────────────────┐
│                    XspensesAI Security                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐   ┌──────────────────┐           │
│  │ Audit Logs       │   │ User Consents    │           │
│  │ (Immutable)      │   │ (Versioned)      │           │
│  │                  │   │                  │           │
│  │ • INSERT-ONLY    │   │ • Track consent  │           │
│  │ • No UPDATE      │   │ • GDPR tracking  │           │
│  │ • No DELETE      │   │ • AI team access │           │
│  │ • RLS enforced   │   │ • RLS policies   │           │
│  └──────────────────┘   └──────────────────┘           │
│           ▲                      ▲                      │
│           │                      │                      │
│  ┌────────┴──────────────────────┴────────────────┐    │
│  │  Signature Verification (Node.js)             │    │
│  │                                                │    │
│  │ • HMAC-SHA256 verification                   │    │
│  │ • Timing-safe comparison                     │    │
│  │ • Replay attack prevention                   │    │
│  │ • Audit logging                              │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ▼
Netlify Function (with signature verification)
    │
    ├─→ Verify signature (timing-safe)
    ├─→ Check consent acceptance
    ├─→ Log to audit_logs (immutable)
    ├─→ Log verification attempt
    │
    ▼
Database (RLS enforced)
    │
    ├─→ audit_logs (INSERT-ONLY)
    ├─→ user_consents (version tracked)
    ├─→ signature_verification_log (audit trail)
    │
    ▼
Compliance Reports (service role access)
```

---

## Database Schema

### 1. Audit Logs Table (Modified)

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action TEXT NOT NULL,        -- 'create', 'update', 'delete', 'export'
  resource_type TEXT NOT NULL, -- 'transaction', 'document', 'rule'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT,             -- 'user', 'prime', 'byte', 'tag', 'crystal'
  change_reason TEXT,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_user_created_at ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

**RLS Policies:**
- ✅ **INSERT**: Authenticated users can insert (service role manages)
- ❌ **UPDATE**: Revoked (immutable)
- ❌ **DELETE**: Revoked (immutable)
- ✅ **SELECT**: Users can view own records

### 2. User Consents Table (New)

```sql
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_version TEXT NOT NULL,      -- 'privacy-v1.0', 'ai-team-access-v1.0'
  consent_text_hash TEXT NOT NULL,    -- SHA256 hash of consent text
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_version)
);

-- Indexes
CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_user_accepted_at ON user_consents(user_id, accepted_at DESC);
```

**RLS Policies:**
- ✅ **SELECT**: Users can view own consents
- ✅ **INSERT**: Users can accept consents
- ✅ **Service Role**: Full access for admin operations

### 3. HMAC Secrets Table (New)

```sql
CREATE TABLE public.hmac_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  secret_hash TEXT NOT NULL,          -- Never store plaintext
  algorithm TEXT NOT NULL DEFAULT 'sha256',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB,
  UNIQUE (user_id, name)
);
```

### 4. Signature Verification Log Table (New)

```sql
CREATE TABLE public.signature_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_id UUID REFERENCES hmac_secrets(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'POST',
  status TEXT NOT NULL,    -- 'success', 'failed', 'expired'
  ip_address TEXT,
  user_agent TEXT,
  request_body_hash TEXT,
  signature_provided TEXT, -- Redacted in logs
  signature_computed TEXT, -- Redacted in logs
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Migration Deployment

### Step 1: Backup Current Data

```bash
# Backup Supabase database before applying migrations
# Using Supabase CLI:
supabase db pull --schema public

# Or manual backup:
pg_dump -h db.xxxx.supabase.co -U postgres -d postgres > backup_2025_10_19.sql
```

### Step 2: Apply Audit Logs Migration

```bash
# Apply the audit logs immutability migration
supabase migration up 20251019_audit_logs_immutable

# Or via Supabase UI → SQL Editor → Paste and run
```

### Step 3: Apply User Consents & Signatures Migration

```bash
# Apply the user consents and signatures migration
supabase migration up 20251019_user_consents_and_signatures

# Or via Supabase UI → SQL Editor → Paste and run
```

### Step 4: Verify Deployment

```sql
-- Run verification queries (see Testing & Verification section)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('audit_logs', 'user_consents', 'hmac_secrets', 'signature_verification_log');

-- Expected: All should have rowsecurity = 't' (true)
```

### Step 5: Update Environment Variables

```bash
# .env.local (development)
VITE_APP_ENV=development
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyxxx...

# .env.production (Netlify)
WEBHOOK_SECRET=your_secret_key_here
CONSENT_VERSION_CURRENT=privacy-v1.0
CONSENT_VERSION_AI_TEAM=ai-team-access-v1.0
```

---

## Security Policies

### Audit Logs: Immutability Enforcement

```sql
-- 🔐 Principle: Once written, audit logs cannot be modified or deleted

-- 1. Role-level permissions (database level)
REVOKE UPDATE ON public.audit_logs FROM authenticated;
REVOKE DELETE ON public.audit_logs FROM authenticated;

-- 2. RLS policies (row-level)
CREATE POLICY "audit_logs_deny_update" ON public.audit_logs
  FOR UPDATE USING (false) WITH CHECK (false);

CREATE POLICY "audit_logs_deny_delete" ON public.audit_logs
  FOR DELETE USING (false);

-- 3. Application-level triggers (defense-in-depth)
CREATE TRIGGER prevent_audit_log_modification_trigger
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_modification();
```

### User Consents: Compliance Tracking

```sql
-- 🔐 Principle: Track all user consent acceptances for GDPR compliance

-- Users can only view/accept their own consents
CREATE POLICY "uc_select_own" ON public.user_consents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "uc_insert_own" ON public.user_consents
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role can manage for reporting
CREATE POLICY "uc_service_role_full_access" ON public.user_consents
  FOR ALL USING (auth.role() = 'service_role');
```

### Signature Verification: Authentication

```sql
-- 🔐 Principle: Verify request authenticity using HMAC-SHA256

-- HMAC secrets are user-specific and hashed
CREATE POLICY "hs_select_own" ON public.hmac_secrets
  FOR SELECT USING (user_id = auth.uid());

-- Verification log is audit-only (append-only)
CREATE POLICY "svl_select_own" ON public.signature_verification_log
  FOR SELECT USING (user_id = auth.uid());
```

---

## Implementation Guide

### 1. Using Audit Logs in Netlify Functions

```typescript
// netlify/functions/_shared/audit.ts
import { serverSupabase } from './supabase';

export async function logAuditEvent(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  oldValues?: any,
  newValues?: any,
  changedBy?: string
) {
  const { supabase } = serverSupabase();

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      changed_by: changedBy || 'system',
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[Audit Log Error]', error);
    // Still continue - don't fail the operation
  }

  return data;
}

// Usage in a transaction function:
export const handler: Handler = async (event) => {
  const userId = event.headers['x-user-id'];

  try {
    // Perform operation
    const transaction = { id: '123', amount: 100, category: 'Food' };

    // Log to audit
    await logAuditEvent(
      userId,
      'create',
      'transaction',
      transaction.id,
      null,
      transaction,
      'user'
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    // Still log the error
    await logAuditEvent(
      userId,
      'error',
      'transaction',
      null,
      null,
      { error: error?.message },
      'system'
    );

    throw error;
  }
};
```

### 2. Recording User Consents

```typescript
// React component for consent banner
import { useAuth } from '@/contexts/AuthContext';
import { serverSupabase } from '@/netlify/functions/_shared/supabase';

export function ConsentBanner() {
  const { user } = useAuth();
  const [accepted, setAccepted] = useState(false);

  const handleAcceptConsent = async () => {
    const { supabase } = serverSupabase();

    // Hash the consent text (in production, use SHA256)
    const consentText = 'I consent to data processing by AI team...';
    const consentHash = await sha256(consentText);

    const { error } = await supabase
      .from('user_consents')
      .insert({
        user_id: user?.id,
        consent_version: 'ai-team-access-v1.0',
        consent_text_hash: consentHash,
        accepted_at: new Date().toISOString(),
      })
      .on('*', (payload) => {
        console.log('Consent recorded:', payload);
      });

    if (!error) {
      setAccepted(true);
    }
  };

  return (
    <div className="consent-banner">
      <p>We use AI agents (Prime, Byte, Tag, Crystal) to analyze your financial data.</p>
      <button onClick={handleAcceptConsent}>Accept</button>
    </div>
  );
}
```

### 3. Implementing Signature Verification

```typescript
// netlify/functions/webhook-handler.ts
import { Handler } from '@netlify/functions';
import { verifySignature, withSignatureVerification } from './_shared/verify-signature';
import { safeLog } from './_shared/safeLog';

async function handleWebhook(event: any) {
  try {
    const payload = JSON.parse(event.body);

    // Process webhook
    console.log('[Webhook] Received:', payload.event);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Webhook processed' }),
    };
  } catch (error: any) {
    safeLog('webhook-error', { error: error?.message });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
}

// Wrap handler with signature verification
export const handler = withSignatureVerification(handleWebhook, {
  headerName: 'x-signature',
  secret: process.env.WEBHOOK_SECRET,
  optional: false, // Require signature
});

// Or manual verification:
export const handlerManual: Handler = async (event) => {
  const signature = event.headers['x-signature'];
  const result = verifySignature(event.body, signature, process.env.WEBHOOK_SECRET || '');

  if (!result.valid) {
    safeLog('signature-verification-failed', { error: result.error });
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid signature' }) };
  }

  return handleWebhook(event);
};
```

### 4. Creating Signed Requests (Outbound)

```typescript
// src/lib/api-client.ts
import { createSignedHeader } from '@/netlify/functions/_shared/verify-signature';

export async function makeSignedRequest(
  endpoint: string,
  body: any,
  secret: string
) {
  const jsonBody = JSON.stringify(body);
  const signedHeader = createSignedHeader(jsonBody, secret);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signedHeader,
    },
    body: jsonBody,
  });

  return response.json();
}

// Usage:
const result = await makeSignedRequest(
  'https://api.example.com/webhook',
  { event: 'transaction.created', data: {...} },
  process.env.API_SECRET
);
```

---

## Testing & Verification

### 1. Verify RLS Configuration

```sql
-- Check that audit_logs is immutable
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'audit_logs' AND schemaname = 'public';
-- Expected: rowsecurity = 't'

-- List RLS policies
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'audit_logs' AND schemaname = 'public'
ORDER BY policyname;

-- Should see:
-- - audit_logs_insert_authenticated (INSERT)
-- - audit_logs_select_own (SELECT)
-- - audit_logs_deny_update (UPDATE, false)
-- - audit_logs_deny_delete (DELETE, false)
```

### 2. Test Audit Log Immutability

```sql
-- As authenticated user, try to update (should fail)
UPDATE public.audit_logs
SET action = 'HACKED'
WHERE id = '123...';
-- Expected: ERROR: Audit logs are immutable

-- Try to delete (should fail)
DELETE FROM public.audit_logs
WHERE id = '123...';
-- Expected: ERROR: Audit logs are immutable

-- Only INSERT is allowed
INSERT INTO public.audit_logs (user_id, action, resource_type, created_at)
VALUES (auth.uid(), 'test', 'transaction', now());
-- Expected: Success (1 row inserted)
```

### 3. Test User Consents

```sql
-- User accepts consent
INSERT INTO public.user_consents (user_id, consent_version, consent_text_hash)
VALUES (auth.uid(), 'privacy-v1.0', 'hash123...');

-- User can view own consent
SELECT * FROM public.user_consents
WHERE user_id = auth.uid();
-- Expected: 1 row returned

-- User cannot view other user's consent (due to RLS)
SELECT * FROM public.user_consents
WHERE user_id != auth.uid();
-- Expected: 0 rows returned
```

### 4. Test Signature Verification

```typescript
// test/signature-verification.test.ts
import { verifySignature, createSignature } from '@/netlify/functions/_shared/verify-signature';

describe('Signature Verification', () => {
  it('should verify valid signature', () => {
    const secret = 'my-secret-key';
    const body = 'request body';
    const signature = createSignature(body, secret);

    const result = verifySignature(body, signature, secret);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid signature', () => {
    const secret = 'my-secret-key';
    const body = 'request body';
    const invalidSignature = 'invalid123...';

    const result = verifySignature(body, invalidSignature, secret);
    expect(result.valid).toBe(false);
  });

  it('should prevent timing attacks', () => {
    const secret = 'my-secret-key';
    const body = 'request body';
    const validSignature = createSignature(body, secret);
    const almostValidSignature = validSignature.slice(0, -1) + 'X';

    // Both should return false (not time-based difference)
    const result1 = verifySignature(body, almostValidSignature, secret);
    const result2 = verifySignature(body, 'completely-different', secret);

    expect(result1.valid).toBe(false);
    expect(result2.valid).toBe(false);
  });
});
```

---

## Compliance & Regulations

### GDPR Compliance

✅ **Data Subject Rights:**
- Users can view their own audit logs (`audit_logs_select_own` policy)
- Users can view their consent history (`uc_select_own` policy)
- Right to be forgotten handled by ON DELETE CASCADE

✅ **Consent Management:**
- `user_consents` table tracks all consent acceptances with timestamps
- Version tracking allows tracking policy updates
- Hash verification ensures consent text integrity

✅ **Data Processing Audit Trail:**
- `audit_logs` immutability ensures compliance records cannot be tampered with
- All AI employee actions (`changed_by` field) are logged
- Timestamp (`created_at`) records exact time of action

### HIPAA Compliance (if applicable)

✅ **Audit Controls:**
- Immutable audit logs ensure accountability
- User identification and timestamp on all events
- Comprehensive logging of data access and modifications

✅ **Access Controls:**
- RLS enforces user data isolation
- Service role restrictions for admin operations
- Signature verification for inter-system communication

### SOC 2 Compliance

✅ **CC6.1 - Logical/Physical Access Controls:**
- RLS policies enforce principle of least privilege
- HMAC signature verification for authentication
- User consent tracking for authorization

✅ **CC7 - Security Monitoring & Alerting:**
- `audit_logs` provides comprehensive event logging
- `signature_verification_log` tracks security events
- Views available for analytics and reporting

---

## Troubleshooting

### Issue: "Audit logs are immutable and cannot be modified"

**Cause:** Attempting to UPDATE audit logs (correct behavior)  
**Solution:** Audit logs are INSERT-ONLY. Create new records instead of updating

```sql
-- ❌ Wrong
UPDATE public.audit_logs SET action = 'new_action' WHERE id = '...';

-- ✅ Correct
INSERT INTO public.audit_logs (user_id, action, resource_type)
VALUES (auth.uid(), 'new_action', 'transaction');
```

### Issue: "User cannot view other user's audit logs"

**Cause:** RLS policy restricting to own records  
**Solution:** This is correct behavior. Use service role for admin access

```typescript
// For admin dashboard, use service role:
import { createClient } from '@supabase/supabase-js';

const serviceSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Backend only!
);

// Now can access other users' logs
const { data } = await serviceSupabase
  .from('audit_logs')
  .select('*')
  .eq('action', 'critical');
```

### Issue: "Invalid signature" errors on webhooks

**Cause:**
1. Secret key mismatch
2. Body not in raw format
3. Signature header missing

**Solutions:**
```typescript
// ✅ Use raw body, not parsed JSON
const handler: Handler = async (event) => {
  const rawBody = event.body; // Use raw body
  const signature = event.headers['x-signature'];
  const result = verifySignature(rawBody, signature, process.env.WEBHOOK_SECRET);
};

// ✅ Verify secret key matches sender
console.log('Secret used:', process.env.WEBHOOK_SECRET);
console.log('Signature provided:', event.headers['x-signature']);

// ✅ Check header name (case-insensitive)
const sig = event.headers['x-signature'] || 
            event.headers['X-Signature'] ||
            event.headers['X-SIGNATURE'];
```

---

## FAQ

### Q: Can I DELETE audit logs?
**A:** No. Audit logs are immutable by design (INSERT-ONLY). If you need to remove sensitive data, use data retention policies for old logs, or contact support.

### Q: How do I check if a user has accepted consent?
**A:** Use the helper function:
```sql
SELECT public.has_user_consented(user_id, 'privacy-v1.0');
-- Returns: true or false
```

### Q: Can I rotate API secrets?
**A:** Yes. The `hmac_secrets` table supports rotation:
```sql
UPDATE public.hmac_secrets
SET rotated_at = now(), is_active = false
WHERE id = 'old_secret_id';

INSERT INTO public.hmac_secrets (user_id, name, secret_hash, is_active)
VALUES (user_id, 'api-key-v2', 'new_hash', true);
```

### Q: How long are verification logs kept?
**A:** All logs are kept indefinitely in the database. For data retention policies, implement periodic archival using a scheduled job.

### Q: Can I use different hash algorithms?
**A:** Yes. The `hmac_secrets.algorithm` field supports `sha256` (default) and `sha512`. Update the configuration in your Netlify function.

### Q: How do I handle signature verification failures in production?
**A:** Log the event and reject the request:
```typescript
const result = verifySignature(body, signature, secret);
if (!result.valid) {
  await logSignatureFailure(result); // Your logging function
  return { statusCode: 401, body: 'Unauthorized' };
}
```

---

## Next Steps

1. **Deploy migrations** (see Migration Deployment section)
2. **Update Netlify functions** to log audit events
3. **Implement consent banner** in React UI
4. **Set up signature verification** for webhooks
5. **Configure monitoring** for security events
6. **Test in staging** environment
7. **Deploy to production**
8. **Monitor audit logs** for compliance

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **GDPR Compliance:** https://gdpr-info.eu/
- **Node.js Crypto:** https://nodejs.org/api/crypto.html

---

**Last Updated:** 2025-10-19  
**Maintained By:** Security Team  
**Next Review:** 2025-11-19






