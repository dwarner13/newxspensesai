# Phase 2.1 - Consolidate Memory Systems - Implementation Plan

**Date**: November 20, 2025  
**Status**: 📋 Planning Complete - Ready for Implementation

---

## Current State Analysis

### Memory Implementations Found:

1. **`netlify/functions/_shared/memory.ts`** (518 lines)
   - ✅ **Core functions**: `upsertFact()`, `recall()`, `extractFactsFromMessages()`, `embedAndStore()`
   - ✅ **Currently used by**: `chat.ts` (primary usage)
   - ✅ **Status**: Core implementation, well-structured

2. **`netlify/functions/_shared/memory-extraction.ts`** (390 lines)
   - ✅ **Function**: `extractAndSaveMemories()` - LLM-based structured extraction
   - ⚠️ **Currently used by**: `memory-orchestrator.ts` only
   - ✅ **Status**: Advanced extraction (not used in chat.ts yet)

3. **`netlify/functions/_shared/context-retrieval.ts`** (322 lines)
   - ✅ **Function**: `retrieveContext()` - Combines facts + RAG + tasks
   - ⚠️ **Currently used by**: `memory-orchestrator.ts` only
   - ✅ **Status**: Advanced retrieval (not used in chat.ts yet)

4. **`netlify/functions/_shared/memory-orchestrator.ts`** (142 lines)
   - ✅ **Functions**: `runMemoryOrchestration()`, `getMemoryContext()`, `extractMemoriesPostResponse()`
   - ⚠️ **Currently used by**: None (orphaned)
   - ✅ **Status**: Orchestration layer (good design, but unused)

5. **`chat_runtime/memory.ts`** (519 lines)
   - ⚠️ **Class**: `MemoryManager` - Legacy class-based API
   - ⚠️ **Currently used by**: Unknown (likely unused)
   - ⚠️ **Status**: Legacy, should be deprecated

6. **`src/agent/rag/retriever.ts`** (393 lines)
   - ⚠️ **Class**: `KnowledgeRetriever` - Advanced RAG with reranking
   - ⚠️ **Currently used by**: Unknown (likely unused in chat flow)
   - ⚠️ **Status**: Advanced RAG (keep for future use, but not canonical)

7. **`netlify/functions/_shared/memory_adapter.ts`** (161 lines)
   - ⚠️ **Function**: `getMemoryCompat()` - Compatibility adapter
   - ⚠️ **Status**: Already deprecated, can be removed

---

## Current Usage in `chat.ts`

**What `chat.ts` currently uses:**
```typescript
import { recall, upsertFact, extractFactsFromMessages } from './_shared/memory.js';

// Memory recall (line 345)
memoryFacts = await recall({ userId, query: masked, k: 5, minScore: 0.2, sessionId });

// Fact extraction (line 830, 1145)
const extractedFacts = extractFactsFromMessages([...]);

// Fact storage (line 866, 1181)
await upsertFact({ userId, convoId, source: 'chat', fact });
```

**What `chat.ts` does NOT use:**
- ❌ `memory-extraction.ts` (LLM-based extraction)
- ❌ `context-retrieval.ts` (unified context retrieval)
- ❌ `memory-orchestrator.ts` (orchestration layer)

---

## Unified Memory API Design

### Canonical Module: `netlify/functions/_shared/memory.ts`

**Enhancement Strategy:**
1. Keep existing functions (`recall`, `upsertFact`, `extractFactsFromMessages`) as-is
2. Add new unified functions that wrap advanced features:
   - `getMemory()` - Unified retrieval (combines recall + context-retrieval)
   - `queueMemoryExtraction()` - Queue async extraction (for Phase 2.3)
3. Internally use `memory-extraction.ts` and `context-retrieval.ts` as helpers
4. Re-export useful types

### Unified API Functions:

```typescript
// ============================================================================
// UNIFIED MEMORY API (Phase 2.1)
// ============================================================================

/**
 * Get unified memory context (facts + RAG + tasks + summaries)
 * 
 * This is the single entry point for memory retrieval.
 * Combines recall() + context-retrieval.ts for comprehensive context.
 */
export async function getMemory(params: {
  userId: string;
  sessionId: string;
  query: string;
  options?: {
    maxFacts?: number;
    topK?: number;
    minScore?: number;
    includeTasks?: boolean;
    includeSummaries?: boolean;
  };
}): Promise<{
  context: string;  // Formatted context block
  facts: RecalledFact[];
  memories: Array<{ content: string; similarity: number }>;
  tasks?: Array<{ description: string; due_date: string | null }>;
  summaries?: Array<{ summary: string; created_at: string }>;
}>;

/**
 * Queue memory extraction for async processing (Phase 2.3)
 * 
 * For now, this is a wrapper around extractAndSaveMemories().
 * In Phase 2.3, this will queue to a background job system.
 */
export async function queueMemoryExtraction(params: {
  userId: string;
  sessionId: string;
  userMessage: string;
  assistantResponse?: string;
}): Promise<void>;

// Keep existing functions for backward compatibility:
export { recall, upsertFact, extractFactsFromMessages, embedAndStore };
```

---

## Implementation Steps

### Step 1: Enhance `memory.ts` with Unified API
- ✅ Add `getMemory()` function (wraps `recall()` + `retrieveContext()`)
- ✅ Add `queueMemoryExtraction()` function (wraps `extractAndSaveMemories()`)
- ✅ Re-export types from other modules
- ✅ Add clear documentation header

### Step 2: Update `chat.ts` to Use Unified API
- ✅ Replace `recall()` with `getMemory()` (more comprehensive)
- ✅ Replace `extractFactsFromMessages()` + `upsertFact()` with `queueMemoryExtraction()`
- ✅ Keep backward compatibility during transition

### Step 3: Mark Legacy Modules as Deprecated
- ⚠️ `chat_runtime/memory.ts` - Add deprecation notice
- ⚠️ `memory_adapter.ts` - Already deprecated, can be removed later
- ✅ Keep `memory-extraction.ts` and `context-retrieval.ts` as internal helpers

### Step 4: Document Unified API
- ✅ Create `docs/MEMORY_API.md` with complete API reference

---

## Migration Path

### Before (Current):
```typescript
// chat.ts
import { recall, upsertFact, extractFactsFromMessages } from './_shared/memory.js';

// Retrieve memories
const memoryFacts = await recall({ userId, query: masked, k: 5, minScore: 0.2 });

// Extract and store facts
const extractedFacts = extractFactsFromMessages([...]);
for (const fact of extractedFacts) {
  await upsertFact({ userId, convoId, source: 'chat', fact });
}
```

### After (Unified):
```typescript
// chat.ts
import { getMemory, queueMemoryExtraction } from './_shared/memory.js';

// Retrieve unified memory context
const memory = await getMemory({
  userId,
  sessionId: finalSessionId,
  query: masked,
  options: { maxFacts: 12, topK: 6, minScore: 0.2 }
});

// Queue extraction (async, non-blocking)
queueMemoryExtraction({
  userId,
  sessionId: finalSessionId,
  userMessage: masked,
  assistantResponse: assistantContent
}).catch(err => console.warn('Memory extraction failed:', err));
```

---

## Files to Modify

### Enhance:
- ✅ `netlify/functions/_shared/memory.ts` - Add unified API functions

### Update:
- ✅ `netlify/functions/chat.ts` - Use unified API

### Deprecate:
- ⚠️ `chat_runtime/memory.ts` - Add deprecation notice
- ⚠️ `netlify/functions/_shared/memory_adapter.ts` - Already deprecated

### Keep as Internal Helpers:
- ✅ `memory-extraction.ts` - Used by unified API
- ✅ `context-retrieval.ts` - Used by unified API
- ✅ `memory-orchestrator.ts` - Can be removed later (functionality merged into unified API)

### Create:
- ✅ `docs/MEMORY_API.md` - Complete API documentation

---

## Success Criteria

- ✅ Single unified memory API exists (`memory.ts`)
- ✅ `chat.ts` uses unified API only
- ✅ Legacy modules marked as deprecated
- ✅ Memory API documented
- ✅ No breaking changes (backward compatible)
- ✅ Ready for Phase 2.3 (async extraction)

---

## Next Steps After Phase 2.1

1. **Phase 2.2**: Consolidate Guardrails (already done ✅)
2. **Phase 2.3**: Make Memory Extraction Async
   - Convert `queueMemoryExtraction()` to actual background job
   - Add queue table or use Netlify Background Functions
   - Update `chat.ts` to not wait for extraction



