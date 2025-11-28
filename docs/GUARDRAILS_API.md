# 🛡️ Unified Guardrails API Documentation

**Version**: 2.2 (Consolidated)  
**Date**: November 20, 2025  
**Status**: ✅ Production Ready

---

## Overview

The Unified Guardrails API (`guardrails-unified.ts`) is the **single source of truth** for all guardrails operations in XspensesAI. It provides:

- ✅ PII detection and masking (40+ types)
- ✅ Content moderation (OpenAI)
- ✅ Jailbreak detection
- ✅ Config caching (performance)
- ✅ Messages array support
- ✅ Attachment metadata support
- ✅ Employee-agnostic protection

---

## Quick Start

### For Chat Messages (Message Arrays)

```typescript
import { runInputGuardrails, sendBlockedResponse, type GuardrailContext } from './_shared/guardrails-unified';

const ctx: GuardrailContext = {
  userId: 'user-123',
  sessionId: 'session-456',
  employeeSlug: 'prime-boss',
  source: 'chat',
};

const result = await runInputGuardrails(ctx, {
  messages: [
    { role: 'user', content: 'My credit card is 4532-1234-5678-9012' }
  ],
});

if (!result.ok) {
  // Handle blocked message
  return sendBlockedResponse(result.blockedReason!, result.events);
}

// Use masked messages
const maskedText = result.maskedMessages[0].content;
// maskedText = "My credit card is **** **** **** 9012"
```

### For Single Strings (Ingestion Functions)

```typescript
import { runGuardrailsForText } from './_shared/guardrails-unified';

const result = await runGuardrailsForText(
  ocrText,
  userId,
  'ingestion_ocr'  // or 'ingestion_email' or 'chat'
);

if (!result.ok) {
  // Handle blocked content
  console.error('Blocked:', result.reasons);
  return;
}

// Use masked text
const safeText = result.text;
```

---

## API Reference

### `runInputGuardrails()`

Main function for processing message arrays with attachments.

**Signature:**
```typescript
async function runInputGuardrails(
  ctx: GuardrailContext,
  input: GuardrailInput
): Promise<GuardrailResult>
```

**Parameters:**
- `ctx`: Context object with `userId`, `sessionId?`, `employeeSlug?`, `source?`
- `input`: Object with `messages` array and optional `attachments` array

**Returns:**
```typescript
{
  ok: boolean;
  blockedReason?: string;
  maskedMessages: Array<{ role: string; content: string }>;
  events: GuardrailEvent[];
  signals?: {
    pii?: boolean;
    piiTypes?: string[];
    moderation?: any;
    jailbreak?: { verdict: 'yes' | 'no'; score?: number };
  };
}
```

**Example:**
```typescript
const result = await runInputGuardrails(
  { userId: 'user-123', source: 'chat' },
  {
    messages: [
      { role: 'user', content: 'Hello, my email is john@example.com' }
    ],
    attachments: [
      { id: 'doc-1', type: 'pdf', fileName: 'statement.pdf' }
    ]
  }
);
```

---

### `runGuardrailsForText()`

Convenience function for single string processing (used by ingestion functions).

**Signature:**
```typescript
async function runGuardrailsForText(
  text: string,
  userId: string,
  stage: 'chat' | 'ingestion_email' | 'ingestion_ocr',
  config?: GuardrailConfig
): Promise<Outcome>
```

**Parameters:**
- `text`: Input text to check
- `userId`: User ID
- `stage`: Stage identifier (`'chat'`, `'ingestion_email'`, or `'ingestion_ocr'`)
- `config`: Optional config (will load from DB if not provided)

**Returns:**
```typescript
{
  ok: boolean;
  text: string;  // Masked/redacted text
  reasons: string[];
  block_message?: string;
  signals: {
    moderation?: any;
    jailbreak?: { verdict: 'yes' | 'no'; score?: number };
    pii?: boolean;
    piiTypes?: string[];
  };
}
```

**Example:**
```typescript
const result = await runGuardrailsForText(
  'My SSN is 123-45-6789',
  'user-123',
  'ingestion_ocr'
);

if (!result.ok) {
  console.error('Blocked:', result.reasons);
} else {
  console.log('Safe text:', result.text);
  // Safe text: "My SSN is [REDACTED:SSN]"
}
```

---

### `getGuardrailConfig()`

Get guardrail configuration with caching (5-minute TTL).

**Signature:**
```typescript
async function getGuardrailConfig(
  userId: string,
  tenantId?: string
): Promise<GuardrailConfig>
```

**Returns:**
```typescript
{
  preset: 'strict' | 'balanced' | 'creative';
  jailbreakThreshold: number;  // 0..100
  moderationBlock: boolean;
  piiEntities: string[];  // Specific PII types to detect
  ingestion: { pii: boolean; moderation: boolean };
  chat: { pii: boolean; moderation: boolean; jailbreak: boolean };
}
```

**Example:**
```typescript
const config = await getGuardrailConfig('user-123');
console.log('Preset:', config.preset);  // 'strict', 'balanced', or 'creative'
```

---

### `sendBlockedResponse()`

Generate a safe, user-friendly blocked response.

**Signature:**
```typescript
function sendBlockedResponse(
  blockedReason: string,
  events: GuardrailEvent[]
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
```

**Example:**
```typescript
if (!result.ok) {
  const response = sendBlockedResponse(result.blockedReason!, result.events);
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
}
```

---

### `invalidateGuardrailConfigCache()`

Invalidate config cache for a user (call when settings are updated).

**Signature:**
```typescript
function invalidateGuardrailConfigCache(
  userId: string,
  tenantId?: string
): void
```

**Example:**
```typescript
// After updating guardrail settings
await updateGuardrailSettings(userId, newSettings);
invalidateGuardrailConfigCache(userId);
```

---

## Types

### `GuardrailContext`

```typescript
interface GuardrailContext {
  userId: string;
  sessionId?: string;
  employeeSlug?: string;  // prime-boss, liberty-ai, tag-ai, etc.
  source?: 'chat' | 'upload' | 'tool';
}
```

### `GuardrailInput`

```typescript
interface GuardrailInput {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  attachments?: Array<{
    id: string;
    type: 'pdf' | 'image' | 'csv' | 'statement' | 'other';
    fileName?: string;
  }>;
}
```

### `GuardrailResult`

```typescript
interface GuardrailResult {
  ok: boolean;
  blockedReason?: string;
  maskedMessages: GuardrailInput['messages'];
  events: GuardrailEvent[];
  signals?: {
    pii?: boolean;
    piiTypes?: string[];
    moderation?: any;
    jailbreak?: { verdict: 'yes' | 'no'; score?: number };
  };
}
```

### `GuardrailEvent`

```typescript
interface GuardrailEvent {
  type: 'pii_masked' | 'moderation_flag' | 'blocked' | 'info';
  detail: string;
  metadata?: Record<string, any>;
}
```

---

## Migration Guide

### From `guardrails-production.ts`

**Old:**
```typescript
import { getGuardrailConfig, runGuardrails } from './guardrails-production';

const config = await getGuardrailConfig(userId);
const result = await runGuardrails(text, userId, 'chat', config);
```

**New:**
```typescript
import { runGuardrailsForText } from './guardrails-unified';

const result = await runGuardrailsForText(text, userId, 'chat');
// Config is loaded automatically with caching
```

### From `guardrails.ts` (Legacy)

**Old:**
```typescript
import { applyGuardrails } from './guardrails';

const result = await applyGuardrails(text, {}, userId);
```

**New:**
```typescript
import { runGuardrailsForText } from './guardrails-unified';

const result = await runGuardrailsForText(text, userId, 'chat');
```

---

## Security Guarantees

1. **PII Masking Happens First**: All PII is masked before any API calls or storage
2. **Config Caching**: Config is cached for 5 minutes (performance optimization)
3. **Employee-Agnostic**: All employees share the same protection layer
4. **Audit Trail**: All guardrail events are logged (TODO: DB logging)

---

## Performance

- **Config Caching**: 5-minute TTL reduces database queries
- **Short-Circuit**: Fails fast on first violation
- **Regex Optimization**: Patterns compiled once at import
- **<50ms**: Typical latency for 10k characters

---

## Presets

### `strict`
- **Use**: Ingestion (email sync, OCR)
- **PII**: Full mask `[REDACTED:TYPE]`
- **Moderation**: Blocks on violations
- **Jailbreak**: Blocks on detection

### `balanced`
- **Use**: Chat (default)
- **PII**: Keep last-4 (`**** **** **** 1234`)
- **Moderation**: Flags but continues
- **Jailbreak**: Flags but continues

### `creative`
- **Use**: Creative tasks (relaxed)
- **PII**: Still protected
- **Moderation**: More lenient
- **Jailbreak**: More lenient

---

## Files

- **Canonical API**: `netlify/functions/_shared/guardrails-unified.ts`
- **Core Engine**: `netlify/functions/_shared/guardrails-production.ts` (internal)
- **PII Patterns**: `netlify/functions/_shared/pii-patterns.ts`

---

## Support

For questions or issues, see:
- `docs/PHASE_2_2_GUARDRAILS_AUDIT.md` - Audit and consolidation details
- `docs/PHASE_2_2_COMPLETION_SUMMARY.md` - Completion summary



