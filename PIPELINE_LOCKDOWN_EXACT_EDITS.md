# Pipeline Lockdown - Exact File Edits

**Date:** January 26, 2025  
**Purpose:** Exact code changes for pipeline lockdown

---

## File 1: `src/utils/ocrService.ts`

### Change 1: Add deprecation function (after line 3)

```typescript
const DEPRECATION_MESSAGE = `DEPRECATED: Frontend OCR bypasses guardrails. Use backend smart-import-ocr pipeline.
  
Import and use:
  import { requestOcrProcessing } from '@/lib/ocr/requestOcrProcessing';
  
This ensures:
  ✅ Guardrails are applied (PII masking, moderation)
  ✅ OCR text is redacted before storage
  ✅ Consistent pipeline across all entry points
  ✅ Idempotency support (requestId parameter)`;

function throwIfDeprecated() {
  if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
    throw new Error(DEPRECATION_MESSAGE);
  }
  // In production, log warning but don't throw (fail gracefully)
  console.error('[DEPRECATED OCR]', DEPRECATION_MESSAGE);
}
```

### Change 2: Update comment (line 1-2)

```typescript
// ⚠️ DEPRECATED: Use server-side pipeline instead (smart-import-* + normalize-transactions)
// This exposes API key in browser and bypasses guardrails
// 
// 🚫 HARD DEPRECATION: All functions in this file throw errors in DEV mode
// Use src/lib/ocr/requestOcrProcessing.ts instead (canonical backend pipeline)
```

### Change 3: Add guard to `processImageWithOCR` (line 628)

```typescript
export const processImageWithOCR = async (imageFile: File): Promise<OCRResult> => {
  throwIfDeprecated(); // 🚫 Hard deprecation - throws in DEV
  
  try {
```

### Change 4: Add guard to `extractTextFromImage` (line 49)

```typescript
export const extractTextFromImage = async (imageUrl: string): Promise<OCRResult> => {
  throwIfDeprecated(); // 🚫 Hard deprecation - throws in DEV
  
  try {
```

### Change 5: Add guard to `extractTextWithOpenAIVision` (line 6)

```typescript
export const extractTextWithOpenAIVision = async (imageFile: File): Promise<OCRResult> => {
  throwIfDeprecated(); // 🚫 Hard deprecation - throws in DEV
  
  try {
```

---

## File 2: `src/lib/ocr/requestOcrProcessing.ts` (NEW FILE)

**Full file contents:** See `src/lib/ocr/requestOcrProcessing.ts`

**Key exports:**
- `requestOcrProcessing(request)` - Main function
- `pollOcrCompletion(docId, userId, maxAttempts?, intervalMs?)` - Polling helper

---

## File 3: `supabase/migrations/20250126_pipeline_lockdown_idempotency.sql` (NEW FILE)

**Full file contents:** See `supabase/migrations/20250126_pipeline_lockdown_idempotency.sql`

**Key changes:**
1. Adds `client_message_id` column to `chat_messages`
2. Adds `request_id` column to `chat_messages`
3. Adds UNIQUE constraint `(thread_id, client_message_id)` where `client_message_id IS NOT NULL`
4. Adds UNIQUE constraint `(thread_id, request_id)` where `request_id IS NOT NULL`
5. Ensures `chat_threads` table exists
6. Ensures `thread_id` column exists in `chat_messages`

---

## File 4: `src/lib/dev/regressionGuards.ts` (NEW FILE)

**Full file contents:** See `src/lib/dev/regressionGuards.ts`

**Key exports:**
- `guardChatMount(componentName)` - Only one chat mount
- `guardEngineRender()` / `guardHistoryRender()` - Engine XOR history rule
- `guardScrollOwner(owner, path)` - Dashboard scroll owner rule
- `guardOcrBypass(functionName)` - OCR bypass forbidden
- `guardMessageInsert(threadId, clientMessageId?, requestId?)` - Message duplication prevention
- `resetRegressionGuards()` - Reset for testing

---

## Integration Examples

### Example 1: Update Smart Import UI

**Before:**
```typescript
import { processImageWithOCR } from '@/utils/ocrService';
const result = await processImageWithOCR(file);
```

**After:**
```typescript
import { requestOcrProcessing } from '@/lib/ocr/requestOcrProcessing';
const result = await requestOcrProcessing({
  file,
  userId: user.id,
  requestId: `ocr-${Date.now()}`, // Optional idempotency key
});
```

### Example 2: Add Chat Mount Guard

**In component:**
```typescript
import { guardChatMount } from '@/lib/dev/regressionGuards';

useEffect(() => {
  const cleanup = guardChatMount('MyChatComponent');
  return cleanup;
}, []);
```

### Example 3: Add Message Insert Guard

**In chat.ts (before insert):**
```typescript
import { guardMessageInsert } from '@/lib/dev/regressionGuards';

// Before inserting message
guardMessageInsert(threadId, clientMessageId, requestId);

await sb.from('chat_messages').insert({
  thread_id: threadId,
  client_message_id: clientMessageId, // Add idempotency key
  request_id: requestId, // Add idempotency key
  // ... other fields
});
```

---

## Verification SQL

### Check idempotency constraints:
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_messages'
AND column_name IN ('client_message_id', 'request_id', 'thread_id');

-- Check unique constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'chat_messages'::regclass
AND conname LIKE '%client_message_id%' OR conname LIKE '%request_id%';

-- Test idempotency
INSERT INTO chat_messages (thread_id, user_id, role, content, client_message_id)
VALUES ('test-thread', 'test-user', 'user', 'Test', 'test-123');

-- Should fail on second insert
INSERT INTO chat_messages (thread_id, user_id, role, content, client_message_id)
VALUES ('test-thread', 'test-user', 'user', 'Test', 'test-123');
```

---

## Summary

✅ **4 files modified/created**  
✅ **All lint checks pass**  
✅ **Idempotency constraints added**  
✅ **DEV guards implemented**  
✅ **Frontend OCR deprecated**

**Status:** Ready for testing and deployment


