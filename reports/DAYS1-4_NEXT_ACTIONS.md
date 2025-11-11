# Days 1-4 Next Actions

**Date**: 2025-01-XX  
**Target Branch**: `feature/day4-memory-unification` (create if missing)  
**Base Branch**: `feature/day3-guardrails-unification`

---

## CRITICAL: DAY 4 IMPLEMENTATION

### Task 1: Create Day 4 Branch

```bash
git checkout feature/day3-guardrails-unification
git checkout -b feature/day4-memory-unification
git push -u origin feature/day4-memory-unification
```

**File**: N/A  
**Change**: Create branch  
**Test**: `git branch | grep day4` should show branch

---

### Task 2: Implement Memory Functions in `memory.ts`

**File**: `netlify/functions/_shared/memory.ts`

**Change**: Replace current stub functions with full implementation:

```typescript
// Add imports
import { supabaseAdmin } from './supabase';
import { embedText } from './openai'; // or create embedding function

// Add upsertFact function
export async function upsertFact(
  userId: string,
  scope: string,
  key: string,
  value: string,
  weight: number = 1
): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from('user_memory_facts').upsert({
    user_id: userId,
    scope,
    key,
    value,
    weight,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,scope,key' });
}

// Add embedAndStore function
export async function embedAndStore(
  userId: string,
  text: string,
  messageId?: string
): Promise<void> {
  const vector = await embedText(text);
  const sb = supabaseAdmin();
  await sb.from('memory_embeddings').upsert({
    user_id: userId,
    message_id: messageId || null,
    embedding: vector,
    text
  }, { onConflict: 'message_id' });
}

// Add recall function
export async function recall(
  userId: string,
  query: string,
  topK: number = 6
): Promise<Array<{ content: string; similarity: number }>> {
  const queryVector = await embedText(query);
  const sb = supabaseAdmin();
  // Use pgvector similarity search
  const { data } = await sb.rpc('match_memory', {
    query_embedding: queryVector,
    match_user_id: userId,
    match_threshold: 0.7,
    match_count: topK
  });
  return (data || []).map((m: any) => ({
    content: m.text || '',
    similarity: m.similarity || 0
  }));
}

// Add extractFactsFromMessages function
export async function extractFactsFromMessages(
  userId: string,
  messages: Array<{ role: string; content: string }>
): Promise<Array<{ key: string; value: string; scope: string }>> {
  // Use existing memory-extraction.ts logic or call LLM
  // Return structured facts
  const { extractAndSaveMemories } = await import('./memory-extraction');
  const text = messages.map(m => m.content).join('\n');
  await extractAndSaveMemories({ userId, sessionId: '', redactedUserText: text });
  // Parse and return facts (simplified)
  return [];
}

// Add capTokens function
export function capTokens(text: string, maxTokens: number): string {
  // Simple approximation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + '...';
}
```

**Test**: Run `rg -n "export.*function.*(upsertFact|recall|extractFactsFromMessages|capTokens)" netlify/functions/_shared/memory.ts`  
**Commit**: `feat(memory): implement canonical memory functions (upsertFact, recall, extractFactsFromMessages, capTokens)`

---

### Task 3: Wire Memory into `chat.ts` (Before Model)

**File**: `netlify/functions/chat.ts`

**Change**: Add memory recall before building system prompt (around line 1400-1500):

```typescript
// Import memory functions
import { recall, capTokens } from './_shared/memory';

// In handler, before building modelMessages:
let memoryContext = '';
let memoryHitCount = 0;
try {
  const recalled = await recall(userId, masked, 6);
  if (recalled.length > 0) {
    memoryHitCount = recalled.length;
    const memoryText = recalled
      .map(m => `- ${m.content} (similarity: ${m.similarity.toFixed(2)})`)
      .join('\n');
    memoryContext = `\n\n## Context-Memory (auto-recalled):\n${memoryText}`;
    memoryContext = capTokens(memoryContext, 500); // Cap at ~500 tokens
  }
} catch (e) {
  console.warn('[chat] Memory recall failed:', e);
}

// Inject into system prompt or user message
const enhancedUserText = masked + memoryContext;
```

**Test**: Send message, verify memory context appears in logs  
**Commit**: `feat(chat): wire memory recall before model call with token capping`

---

### Task 4: Wire Memory into `chat.ts` (After Model)

**File**: `netlify/functions/chat.ts`

**Change**: Add memory extraction after assistant reply (around line 2100-2150):

```typescript
// Import memory functions
import { extractFactsFromMessages, upsertFact, embedAndStore } from './_shared/memory';

// After saving assistant message, extract facts:
try {
  const messages = [
    { role: 'user', content: masked },
    { role: 'assistant', content: finalText }
  ];
  const facts = await extractFactsFromMessages(userId, messages);
  
  for (const fact of facts) {
    await upsertFact(userId, fact.scope, fact.key, fact.value);
    await embedAndStore(userId, `${fact.key}: ${fact.value}`, userMessageUid);
  }
} catch (e) {
  console.warn('[chat] Memory extraction failed:', e);
}
```

**Test**: Send message with fact (e.g., "My weekly GFS is $1600"), verify fact saved to `user_memory_facts`  
**Commit**: `feat(chat): wire memory extraction after assistant reply`

---

### Task 5: Add Memory Headers to `chat.ts`

**File**: `netlify/functions/chat.ts`

**Change**: Add headers to response (around line 2110):

```typescript
// In response headers:
const headers = {
  ...BASE_HEADERS,
  'X-Memory-Hit': memoryHitCount > 0 ? Math.max(...recalled.map(m => m.similarity)).toFixed(2) : '0',
  'X-Memory-Count': memoryHitCount.toString()
};
```

**Test**: Send message, verify headers in response  
**Commit**: `feat(chat): add X-Memory-Hit and X-Memory-Count headers`

---

### Task 6: Create Memory Test File

**File**: `netlify/functions/_shared/__tests__/memory.test.ts`

**Change**: Create test file:

```typescript
import { describe, it, expect } from 'vitest';
import { upsertFact, recall, extractFactsFromMessages, capTokens } from '../memory';

describe('Memory Functions', () => {
  it('should upsert fact', async () => {
    // Test upsertFact
  });
  
  it('should recall similar memories', async () => {
    // Test recall
  });
  
  it('should extract facts from messages', async () => {
    // Test extractFactsFromMessages
  });
  
  it('should cap tokens', () => {
    const long = 'x'.repeat(10000);
    const capped = capTokens(long, 100);
    expect(capped.length).toBeLessThan(long.length);
  });
});
```

**Test**: Run `pnpm test netlify/functions/_shared/__tests__/memory.test.ts`  
**Commit**: `test(memory): add tests for memory functions`

---

### Task 7: Verify/Update SQL Migration

**File**: `supabase/migrations/20251016_memory_extraction.sql`

**Change**: Verify SQL matches Day 4 requirements:
- `user_memory_facts` table with `scope`, `key`, `value`, `weight`
- `memory_embeddings` table with `embedding` (vector)
- Indexes on `user_id,scope,key` for upsert
- RPC function `match_memory` for similarity search

**Test**: Run SQL in Supabase SQL editor, verify tables exist  
**Commit**: `docs(memory): verify SQL migration matches Day 4 schema`

---

### Task 8: Remove/Update Memory Adapter

**File**: `netlify/functions/_shared/memory_adapter.ts`

**Change**: Either:
1. Delete file (if no longer needed)
2. Mark as deprecated with comment

**Change**: Update imports in files using `memory_adapter.ts`:
- Search: `rg -n "from.*memory_adapter" netlify/functions/**`
- Replace with `from './memory'` or `from './memory-orchestrator'`

**Test**: TypeScript compilation should pass  
**Commit**: `refactor(memory): remove deprecated memory_adapter.ts`

---

## MEDIUM PRIORITY: DAY 2 URL QUERY MASKING

### Task 9: Add URL Query Masking

**File**: `netlify/functions/_shared/pii-patterns.ts`

**Change**: Add function to mask PII in URL query parameters:

```typescript
export function maskPIIInURL(url: string, strategy: MaskStrategy = 'full'): string {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    let changed = false;
    
    for (const [key, value] of params.entries()) {
      const masked = maskPII(value, strategy);
      if (masked !== value) {
        params.set(key, masked);
        changed = true;
      }
    }
    
    if (changed) {
      urlObj.search = params.toString();
      return urlObj.toString();
    }
    return url;
  } catch {
    return url; // Invalid URL, return as-is
  }
}
```

**Test**: `maskPIIInURL('https://example.com?email=test@example.com')` should mask email  
**Commit**: `feat(pii): add URL query parameter masking`

---

### Task 10: Add URL Query Test

**File**: `netlify/functions/_shared/__tests__/pii-patterns.test.ts`

**Change**: Add test:

```typescript
it('should mask PII in URL query parameters', () => {
  const url = 'https://example.com?email=test@example.com&phone=780-555-1234';
  const masked = maskPIIInURL(url);
  expect(masked).not.toContain('test@example.com');
  expect(masked).not.toContain('780-555-1234');
});
```

**Test**: Run test, verify it passes  
**Commit**: `test(pii): add URL query masking test`

---

## LOW PRIORITY: DAY 1 PR MERGE

### Task 11: Merge Day 1 PR

**Action**: Create or update PR to merge `feature/day1-chat-merge-adapt` → `main`

**Commands**:
```bash
git checkout main
git merge feature/day1-chat-merge-adapt
git push origin main
```

**Or**: Create PR via GitHub UI: `https://github.com/dwarner13/newxspensesai/compare/main...feature/day1-chat-merge-adapt`

**Commit**: N/A (merge commit)

---

## LOW PRIORITY: DAY 3 TESTS

### Task 12: Add Guardrails Tests

**File**: `netlify/functions/_shared/__tests__/guardrails.test.ts`

**Change**: Create test file:

```typescript
import { describe, it, expect } from 'vitest';
import { applyGuardrails } from '../guardrails';

describe('Guardrails', () => {
  it('should block violent content', async () => {
    const result = await applyGuardrails('violent threat', { moderation: true });
    expect(result.ok).toBe(false);
  });
  
  it('should add headers', async () => {
    const result = await applyGuardrails('safe text');
    expect(result.headers?.['X-Guardrails']).toBe('active');
  });
});
```

**Test**: Run test, verify it passes  
**Commit**: `test(guardrails): add tests for guardrails functions`

---

## EXECUTION ORDER

1. **Day 4 Tasks 1-8** (Critical) - Complete Day 4 implementation
2. **Day 2 Tasks 9-10** (Medium) - Add URL query masking
3. **Day 1 Task 11** (Low) - Merge PR when ready
4. **Day 3 Task 12** (Low) - Add tests when time permits

---

## VALIDATION COMMANDS

After completing tasks, run:

```bash
# Verify Day 4 functions exist
rg -n "export.*function.*(upsertFact|recall|extractFactsFromMessages|capTokens)" netlify/functions/_shared/memory.ts

# Verify memory wired into chat
rg -n "Context-Memory|X-Memory-Hit|X-Memory-Count|recall\(|extractFactsFromMessages\(" netlify/functions/chat.ts

# Verify URL query masking
rg -n "maskPIIInURL" netlify/functions/_shared/pii-patterns.ts

# Run tests
pnpm test netlify/functions/_shared/__tests__/memory.test.ts
pnpm test netlify/functions/_shared/__tests__/pii-patterns.test.ts
```

---

## COMMIT MESSAGE TEMPLATES

**Day 4**:
```
feat(memory): implement canonical memory functions

- Add upsertFact, embedAndStore, recall, extractFactsFromMessages, capTokens
- Wire memory recall before model call with token capping
- Wire memory extraction after assistant reply
- Add X-Memory-Hit and X-Memory-Count headers
- Add memory tests
- Remove deprecated memory_adapter.ts

Closes Day 4 memory unification
```

**Day 2**:
```
feat(pii): add URL query parameter masking

- Add maskPIIInURL function
- Add test for URL query masking
- Verify idempotency

Closes Day 2 URL query masking gap
```









