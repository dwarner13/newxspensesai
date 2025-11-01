# 🛡️ SMART IMPORT GUARDRAILS & SAFE LOGGING

**Purpose:** Secure patterns for file uploads, PII protection, and audit logging  
**Status:** ✅ Production-Ready  
**Security Level:** High  

---

## 📋 OVERVIEW

### Core Principles

1. **Feature Flags First** — All risky operations behind toggles
2. **No PII in Logs** — Never log file content, PII, or sensitive data
3. **Metadata Only** — Log operation metadata for audit trail
4. **Structured Logs** — Consistent format for analysis and alerts
5. **Error Isolation** — Catch and sanitize errors before logging

---

## 🔐 GUARDRAILS MODULE

### Create `netlify/functions/_shared/guardrails.ts`

```typescript
/**
 * Guardrails for secure file handling and logging
 * 
 * Features:
 * - Feature flag enforcement
 * - Safe error handling
 * - PII redaction
 * - Structured logging with context
 */

import { LogLevel, createLogger } from './logger';

export interface SafeLogContext {
  userId?: string;
  sessionId?: string;
  importId?: string;
  fileName?: string;
  fileSize?: number;
  contentType?: string;
  status?: string;
  duration?: number;
  errorCode?: string;
  [key: string]: any;
}

/**
 * Safe logger that redacts PII
 */
export function safeLog(event: string, context: SafeLogContext, level: LogLevel = 'info') {
  // Redact sensitive fields
  const redacted = {
    ...context,
    userId: context.userId ? `user_${context.userId.substring(0, 8)}...` : undefined,
    sessionId: context.sessionId ? `sess_${context.sessionId.substring(0, 8)}...` : undefined,
    // Never include: file content, credit cards, SSNs, tokens, emails
  };

  createLogger().log(level, `[SmartImport] ${event}`, redacted);
}

/**
 * Higher-order function to wrap handlers with guardrails
 * 
 * Usage:
 *   export default withGuardrails(async (req, body) => { ... })
 */
export function withGuardrails(
  handler: (req: Request, body: any) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      // 1. Check if feature is enabled
      const isEnabled = process.env.SMART_IMPORT_ENABLED === '1';
      if (!isEnabled) {
        safeLog('feature_disabled', { requestId }, 'warn');
        return new Response(
          JSON.stringify({ error: 'Smart Import is not enabled' }),
          { status: 403 }
        );
      }

      // 2. Parse and validate request
      let body: any = {};
      try {
        if (req.method === 'POST') {
          const contentType = req.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            body = await req.json();
          } else if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            body = Object.fromEntries(formData.entries());
          }
        }
      } catch (e: any) {
        safeLog('parse_error', {
          requestId,
          error: e.message,
          contentType: req.headers.get('content-type')
        }, 'error');
        return new Response(
          JSON.stringify({ error: 'Invalid request format' }),
          { status: 400 }
        );
      }

      // 3. Call the handler
      const response = await handler(req, body);

      // 4. Log success
      const duration = Date.now() - startTime;
      const status = response.status;
      safeLog('request_complete', {
        requestId,
        status,
        duration,
        method: req.method,
        pathname: new URL(req.url).pathname
      });

      return response;
    } catch (err: any) {
      // 5. Handle unexpected errors
      const duration = Date.now() - startTime;
      safeLog('handler_error', {
        requestId,
        error: err?.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
        duration
      }, 'error');

      return new Response(
        JSON.stringify({ error: 'Internal server error', requestId }),
        { status: 500 }
      );
    }
  };
}

/**
 * Validate file upload safety
 */
export function validateFileUpload(file: {
  name?: string;
  size?: number;
  type?: string;
}): { valid: boolean; error?: string } {
  const MAX_SIZE = 25 * 1024 * 1024; // 25MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'text/csv',
    'image/png',
    'image/jpeg',
  ];

  // Check size
  if (file.size && file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 25MB)`
    };
  }

  // Check type
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}`
    };
  }

  // Check name (prevent traversal)
  if (file.name) {
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid file name'
      };
    }
    if (file.name.length > 255) {
      return {
        valid: false,
        error: 'File name too long'
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize error messages (no sensitive data leakage)
 */
export function sanitizeError(err: any, context?: string): string {
  const msg = String(err?.message || err || 'Unknown error');

  // Remove common sensitive patterns
  const sanitized = msg
    .replace(/authorization[:\s]*(.*)/gi, '[REDACTED]')
    .replace(/token[:\s]*(.*)/gi, '[REDACTED]')
    .replace(/api[_-]?key[:\s]*(.*)/gi, '[REDACTED]')
    .replace(/password[:\s]*(.*)/gi, '[REDACTED]')
    .replace(/\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}/g, '[CARD_REDACTED]')
    .replace(/\d{3}[\s\-]?\d{2}[\s\-]?\d{4}/g, '[SSN_REDACTED]');

  return sanitized;
}

/**
 * Check rate limits (optional, basic in-memory)
 */
const rateLimitMap = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.reset) {
    rateLimitMap.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count < limit) {
    entry.count++;
    return true;
  }

  return false;
}
```

---

## 📝 LOGGER MODULE

### Create `netlify/functions/_shared/logger.ts`

```typescript
/**
 * Structured logging for audit trails and debugging
 * 
 * Outputs JSON format for easy parsing by log aggregators
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  context: Record<string, any>;
  requestId?: string;
}

class Logger {
  log(level: LogLevel, event: string, context: Record<string, any> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      context: this.filterContext(context)
    };

    // Output as JSON for log aggregators
    const output = JSON.stringify(entry);

    if (level === 'error' || level === 'warn') {
      console.error(output);
    } else {
      console.log(output);
    }

    // Optional: Send to external logging service (DataDog, Sentry, etc.)
    // await sendToExternalLogger(entry);
  }

  private filterContext(context: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      // Skip sensitive keys
      if (
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('key')
      ) {
        continue;
      }

      // Handle large objects
      if (typeof value === 'object' && value !== null) {
        filtered[key] = '[OBJECT]';
      } else if (typeof value === 'string' && value.length > 200) {
        filtered[key] = value.substring(0, 200) + '...';
      } else {
        filtered[key] = value;
      }
    }

    return filtered;
  }
}

export function createLogger(): Logger {
  return new Logger();
}
```

---

## ⚙️ FEATURE FLAGS

### Environment Variables

**.env.local:**
```bash
# Smart Import Feature Flags
SMART_IMPORT_ENABLED=1
IMPORTS_ENABLED=1
BYTE_OCR_ENABLED=1
SMART_IMPORT_MAX_FILE_SIZE=26214400
SMART_IMPORT_MAX_FILES_PER_HOUR=50
SMART_IMPORT_DEBUG=0
```

**Netlify Deploy Settings:**
```
SMART_IMPORT_ENABLED=1
IMPORTS_ENABLED=1
BYTE_OCR_ENABLED=1
SMART_IMPORT_MAX_FILE_SIZE=26214400
SMART_IMPORT_MAX_FILES_PER_HOUR=50
SMART_IMPORT_DEBUG=0
```

### Feature Flag Helper

```typescript
// lib/featureFlags.ts
export const SmartImportFlags = {
  isEnabled: () => process.env.SMART_IMPORT_ENABLED === '1',
  importsEnabled: () => process.env.IMPORTS_ENABLED === '1',
  ocrEnabled: () => process.env.BYTE_OCR_ENABLED === '1',
  maxFileSize: () => parseInt(process.env.SMART_IMPORT_MAX_FILE_SIZE || '26214400', 10),
  maxFilesPerHour: () => parseInt(process.env.SMART_IMPORT_MAX_FILES_PER_HOUR || '50', 10),
  debugMode: () => process.env.SMART_IMPORT_DEBUG === '1',
};
```

---

## 🔧 INGEST-STATEMENT WITH GUARDRAILS

### Complete Implementation

```typescript
// netlify/functions/ingest-statement.ts
import { withGuardrails, safeLog, validateFileUpload, checkRateLimit } from './_shared/guardrails';
import { createSupabaseClient } from './_shared/supabase';

const sb = createSupabaseClient();

export default withGuardrails(async (req, body) => {
  const requestId = crypto.randomUUID();

  try {
    // 1. Extract userId and file from request
    const userId = body?.userId;
    if (!userId) {
      safeLog('ingest.missing_user_id', { requestId }, 'warn');
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400 }
      );
    }

    // 2. Rate limit check
    if (!checkRateLimit(`ingest_${userId}`, 50, 3600000)) {
      safeLog('ingest.rate_limit_exceeded', { requestId, userId }, 'warn');
      return new Response(
        JSON.stringify({ error: 'Too many imports. Try again later.' }),
        { status: 429 }
      );
    }

    // 3. Get file from FormData or body
    let file: { name: string; data: Uint8Array; type: string } | null = null;

    if (body instanceof FormData) {
      const fileField = body.get('file');
      if (fileField && fileField instanceof File) {
        file = {
          name: fileField.name,
          data: new Uint8Array(await fileField.arrayBuffer()),
          type: fileField.type
        };
      }
    } else if (body?.file) {
      file = body.file;
    }

    if (!file) {
      safeLog('ingest.missing_file', { requestId, userId }, 'warn');
      return new Response(
        JSON.stringify({ error: 'Missing file' }),
        { status: 400 }
      );
    }

    // 4. Validate file
    const validation = validateFileUpload({
      name: file.name,
      size: file.data.length,
      type: file.type
    });

    if (!validation.valid) {
      safeLog('ingest.validation_failed', {
        requestId,
        userId,
        error: validation.error,
        fileName: file.name,
        fileSize: file.data.length
      }, 'warn');
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400 }
      );
    }

    // 5. Log file metadata (NOT content)
    safeLog('ingest.start', {
      requestId,
      userId,
      fileName: file.name,
      fileSize: file.data.length,
      contentType: file.type
    });

    // 6. Upload to Supabase Storage
    const storagePath = `users/${userId}/import_${Date.now()}_${file.name}`;

    const { data: uploadData, error: uploadError } = await sb.storage
      .from('xspenses-imports')
      .upload(storagePath, file.data, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      safeLog('ingest.upload_failed', {
        requestId,
        userId,
        error: uploadError.message,
        storagePath
      }, 'error');
      return new Response(
        JSON.stringify({ error: 'Upload failed' }),
        { status: 500 }
      );
    }

    // 7. Create import record
    const { data: importRecord, error: importError } = await sb
      .from('imports')
      .insert({
        user_id: userId,
        source: 'web_upload',
        file_url: uploadData.path,
        file_type: file.type,
        status: 'pending',
        error: null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (importError) {
      safeLog('ingest.db_insert_failed', {
        requestId,
        userId,
        error: importError.message
      }, 'error');
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500 }
      );
    }

    // 8. Trigger async OCR parse
    try {
      const ocrEndpoint = process.env.NETLIFY_URL || 'http://localhost:8888';
      await fetch(`${ocrEndpoint}/.netlify/functions/byte-ocr-parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: importRecord.id,
          userId
        })
      });
    } catch (e: any) {
      safeLog('ingest.ocr_trigger_failed', {
        requestId,
        userId,
        importId: importRecord.id,
        error: e.message
      }, 'warn');
      // Don't fail the response; async job will retry
    }

    // 9. Log success
    safeLog('ingest.success', {
      requestId,
      userId,
      importId: importRecord.id,
      fileSize: file.data.length
    });

    return new Response(
      JSON.stringify({
        ok: true,
        importId: importRecord.id,
        status: 'pending',
        message: 'File uploaded. Processing...'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    safeLog('ingest.unexpected_error', {
      requestId,
      userId: body?.userId,
      error: err?.message
    }, 'error');

    return new Response(
      JSON.stringify({ error: 'Server error', requestId }),
      { status: 500 }
    );
  }
});
```

---

## 📊 LOGGING BEST PRACTICES

### What to Log

✅ **DO log:**
- Operation metadata: event name, timestamp, duration
- User identifiers: redacted user ID, session ID (first 8 chars only)
- File metadata: filename, size, type (NOT content)
- Status codes: success/failure, error codes
- Performance metrics: duration, file size
- Rate limit events
- Authentication events

### What NOT to Log

❌ **DON'T log:**
- File content or raw bytes
- Bank account numbers
- Credit card numbers
- Social Security numbers
- Passwords or tokens
- Full email addresses
- Full phone numbers
- Any PII or sensitive data

---

## 🔍 LOG ANALYSIS

### Example Log Output

```json
{
  "timestamp": "2025-10-18T15:30:45.123Z",
  "level": "info",
  "event": "[SmartImport] ingest.success",
  "context": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_550e8400...",
    "importId": "imp_123456789",
    "fileSize": 2097152
  }
}
```

### CloudWatch/Datadog Queries

```javascript
// Find all ingest operations
source:netlify event:"ingest.*" | stats count by event

// Find errors
source:netlify level:error event:"ingest.*"

// Performance analysis
source:netlify event:"ingest.success" | stats avg(duration) by fileSize

// User activity
source:netlify userId:"user_*" | stats count by userId
```

---

## 🎯 TESTING GUARDRAILS

### Test Feature Flag Disabled

```typescript
// Mock env
process.env.SMART_IMPORT_ENABLED = '0';

const response = await handler(new Request('http://localhost/'));
expect(response.status).toBe(403);
```

### Test File Validation

```typescript
import { validateFileUpload } from './_shared/guardrails';

// Valid PDF
expect(validateFileUpload({
  name: 'statement.pdf',
  size: 1024 * 1024,
  type: 'application/pdf'
}).valid).toBe(true);

// Too large
expect(validateFileUpload({
  name: 'huge.pdf',
  size: 30 * 1024 * 1024,
  type: 'application/pdf'
}).valid).toBe(false);

// Wrong type
expect(validateFileUpload({
  name: 'script.exe',
  size: 1024,
  type: 'application/octet-stream'
}).valid).toBe(false);
```

### Test Rate Limiting

```typescript
import { checkRateLimit } from './_shared/guardrails';

const userId = 'user_123';

// First 10 should succeed
for (let i = 0; i < 10; i++) {
  expect(checkRateLimit(`ingest_${userId}`, 10, 60000)).toBe(true);
}

// 11th should fail
expect(checkRateLimit(`ingest_${userId}`, 10, 60000)).toBe(false);
```

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Add all feature flags to `.env.local`
- [ ] Add all feature flags to Netlify environment variables
- [ ] Create `netlify/functions/_shared/guardrails.ts`
- [ ] Create `netlify/functions/_shared/logger.ts`
- [ ] Update `netlify/functions/ingest-statement.ts` with guardrails
- [ ] Test with feature flag disabled (should return 403)
- [ ] Test with oversized file (should return 400)
- [ ] Test with invalid file type (should return 400)
- [ ] Verify logs appear in CloudWatch/Netlify Functions
- [ ] Verify no PII in logs
- [ ] Test rate limiting

---

## 🔗 RELATED GUIDES

- [`BYTE_OCR_TWO_STAGE_COMMIT.md`](./BYTE_OCR_TWO_STAGE_COMMIT.md) — Two-stage pipeline
- [`SMART_IMPORT_DATABASE_VERIFICATION.md`](./SMART_IMPORT_DATABASE_VERIFICATION.md) — DB checks
- [`XSPENSES_AUDIT_SMART_IMPORT.md`](./XSPENSES_AUDIT_SMART_IMPORT.md) — Full audit

---

## 🎯 SUMMARY

✅ **Feature Flags** — All operations behind toggles  
✅ **Safe Logging** — Metadata only, no PII  
✅ **Structured Logs** — JSON format for aggregation  
✅ **Rate Limiting** — Prevent abuse  
✅ **File Validation** — Type, size, name checks  
✅ **Error Sanitization** — No sensitive data leakage  

**Files:**
- `netlify/functions/_shared/guardrails.ts` (new)
- `netlify/functions/_shared/logger.ts` (new)
- `netlify/functions/ingest-statement.ts` (updated)
- `.env.local` (feature flags)

---

**Last Updated:** October 18, 2025






