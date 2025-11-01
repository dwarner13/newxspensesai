# Duplicate Map & Overlap Analysis

**Date**: 2025-01-XX  
**Purpose**: Identify duplicate logic, overlapping functions, and consolidation opportunities

---

## Summary Table

| Category | Duplicate Count | Confidence | Impact | Recommendation |
|----------|----------------|------------|--------|----------------|
| Chat Endpoints | 3 | High | Critical | Consolidate to single v3 endpoint |
| OCR Services | 8+ | High | High | Reduce to 2-3 core services |
| PII Masking | 4+ | High | High | Single source of truth |
| Guardrails | 3 | Medium | Medium | Single production module |
| Memory Systems | 2 | Medium | Medium | Consolidate or separate clearly |
| Chat Hooks | 3+ | Medium | Low | Single unified hook |

---

## Detailed Duplicate Analysis

### 1. Chat Endpoints (CRITICAL)

**Files:**
1. `netlify/functions/chat.ts` (v2)
   - Uses `guardrails-production.ts`
   - Has rate limiting
   - Uses `router.ts` for employee routing
   - **Status**: Active but may be superseded

2. `netlify/functions/chat-v3-production.ts` (v3)
   - Comprehensive implementation
   - Inline guardrails
   - Attachment handling
   - SSE streaming
   - **Status**: Production-ready

3. `netlify/functions/prime-chat.ts`
   - Prime-specific handler
   - May overlap with main chat
   - **Status**: Active

**Legacy (Unused):**
- `netlify/functions/_legacy/chat-complex.ts`
- `netlify/functions/_legacy/chat-sse.ts`
- `netlify/functions/_legacy/chat-stream.ts`

**Overlap:**
- All handle chat requests
- All call OpenAI API
- All handle SSE streaming
- All manage sessions

**Recommendation:**
- **Keep**: `chat-v3-production.ts` as single production endpoint
- **Migrate**: `prime-chat.ts` logic into v3 if needed
- **Delete**: `chat.ts` (v2) after migration
- **Delete**: All `_legacy` files

**Confidence**: High (95%)  
**Effort**: Medium (2-3 days)

---

### 2. OCR Services (HIGH IMPACT)

**Files:**
1. `src/server/ocr/ocrService.ts`
   - Base OCR service
   - **Status**: Core implementation

2. `src/server/ocr/ocrServiceEnhanced.ts`
   - Enhanced version
   - **Status**: Enhanced implementation

3. `src/server/ocr/serverOCRService.ts`
   - Server wrapper
   - **Status**: Server wrapper

4. `src/utils/ocrService.ts`
   - Client-side OCR service
   - **Status**: Client implementation

5. `src/utils/googleVisionService.ts`
   - Google Vision API wrapper
   - **Status**: API wrapper

6. `src/utils/smartOCRManager.ts`
   - Smart engine selection
   - **Status**: Manager

7. `src/systems/EnhancedOCRSystem.ts`
   - System-level OCR
   - **Status**: System wrapper

8. `worker/src/ocr/index.ts`
   - Worker OCR (Tesseract + Google Vision)
   - **Status**: Worker implementation

9. `api/routes/ocr.js` (Legacy)
   - Express route
   - **Status**: Legacy/Unused

**Overlap:**
- All handle OCR processing
- Multiple Google Vision API wrappers
- Similar error handling
- Similar result formatting

**Recommendation:**
- **Keep**: `src/utils/googleVisionService.ts` (API wrapper)
- **Keep**: `src/utils/smartOCRManager.ts` (engine selection)
- **Keep**: `worker/src/ocr/index.ts` (worker implementation)
- **Consolidate**: Server OCR services into single implementation
- **Delete**: `api/routes/ocr.js` (legacy)

**Confidence**: High (90%)  
**Effort**: High (5-7 days)

---

### 3. PII Masking (HIGH IMPACT)

**Files:**
1. `netlify/functions/_shared/pii.ts`
   - Main PII masking wrapper
   - Uses `pii-patterns.ts`
   - **Status**: Active

2. `netlify/functions/_shared/pii-patterns.ts`
   - PII pattern definitions
   - 40+ PII types
   - **Status**: Pattern definitions

3. `chat_runtime/redaction.ts`
   - Chat runtime redaction
   - 7 PII types
   - **Status**: Chat-specific

4. `worker/src/redaction/patterns.ts`
   - Worker redaction patterns
   - **Status**: Worker-specific

5. `netlify/functions/_shared/guardrails.ts`
   - Includes `redactPII()` function
   - Uses different patterns
   - **Status**: Guardrails implementation

**Overlap:**
- Multiple PII pattern definitions
- Similar masking logic
- Different pattern sets (some overlap)

**Recommendation:**
- **Keep**: `pii-patterns.ts` as single source of truth
- **Keep**: `pii.ts` as wrapper
- **Refactor**: `chat_runtime/redaction.ts` to use `pii-patterns.ts`
- **Refactor**: `worker/src/redaction/patterns.ts` to use `pii-patterns.ts`
- **Refactor**: `guardrails.ts` to use `pii.ts` wrapper

**Confidence**: High (95%)  
**Effort**: Medium (3-4 days)

---

### 4. Guardrails (MEDIUM IMPACT)

**Files:**
1. `netlify/functions/_shared/guardrails.ts`
   - Main guardrails implementation
   - Includes PII, moderation, jailbreak
   - **Status**: Active

2. `netlify/functions/_shared/guardrails-production.ts`
   - Production guardrails
   - Used by `chat.ts`
   - **Status**: Production

3. `netlify/functions/_shared/guardrails-merged.ts`
   - Merged version
   - **Status**: Unknown

**Overlap:**
- All implement guardrails
- Similar functionality
- Different implementations

**Recommendation:**
- **Audit**: Compare all three implementations
- **Keep**: Best production implementation
- **Delete**: Redundant implementations
- **Standardize**: Single production module

**Confidence**: Medium (70%)  
**Effort**: Low (1-2 days)

---

### 5. Memory Systems (MEDIUM IMPACT)

**Files:**
1. `netlify/functions/_shared/memory.ts`
   - Shared memory helpers
   - Used by chat functions
   - **Status**: Active

2. `chat_runtime/memory.ts`
   - Chat runtime memory
   - Part of centralized runtime
   - **Status**: Runtime implementation

**Overlap:**
- Both handle memory operations
- Both interact with Supabase
- Similar functions (fetchUserFacts, etc.)

**Recommendation:**
- **Keep**: `chat_runtime/memory.ts` as part of centralized runtime
- **Migrate**: Functions from `_shared/memory.ts` to runtime
- **Delete**: `_shared/memory.ts` after migration

**Confidence**: Medium (75%)  
**Effort**: Medium (2-3 days)

---

### 6. Chat Hooks (LOW IMPACT)

**Files:**
1. `src/hooks/useChat.ts`
   - Unified chat hook
   - SSE streaming
   - **Status**: Active

2. `src/ui/hooks/useStreamChat.ts`
   - Streaming chat hook
   - **Status**: Alternative implementation

3. `src/lib/chatEndpoint.ts`
   - Chat endpoint wrapper
   - **Status**: Helper

**Overlap:**
- All handle chat API calls
- Similar streaming logic

**Recommendation:**
- **Keep**: `useChat.ts` as primary hook
- **Audit**: `useStreamChat.ts` for unique features
- **Consolidate**: If features overlap

**Confidence**: Medium (65%)  
**Effort**: Low (1 day)

---

## Unused/Dead Code

### Functions in `_legacy` Directory

**Files:**
- `netlify/functions/_legacy/chat-complex.ts`
- `netlify/functions/_legacy/chat-sse.ts`
- `netlify/functions/_legacy/chat-stream.ts`

**Status**: Unused legacy implementations  
**Recommendation**: Delete after confirming no references

### Functions in `functions-backup` Directory

**Files:** (30+ files)
- `netlify/functions-backup/chat.ts`
- `netlify/functions-backup/ocr-ingest.ts`
- `netlify/functions-backup/guardrails.ts`
- And many more...

**Status**: Backup copies, not deployed  
**Recommendation**: Delete (backups should be in git history)

---

## Schema Duplicates

### Chat Tables

**Potential Overlap:**
- `conversations` vs `ai_conversations` vs `chat_sessions`
- `messages` (JSONB) vs `messages` (table) vs `chat_messages`

**Status**: Partially consolidated in `chat_runtime` schema  
**Recommendation**: Complete migration to `chat_runtime` schema

---

## Consolidation Priority

### High Priority (Do First)

1. **Chat Endpoints** - Consolidate to single v3 endpoint
2. **PII Masking** - Single source of truth for patterns
3. **OCR Services** - Reduce to 2-3 core services

### Medium Priority

4. **Guardrails** - Single production module
5. **Memory Systems** - Complete migration to runtime

### Low Priority

6. **Chat Hooks** - Consolidate if needed
7. **Legacy Cleanup** - Delete unused directories

---

## Duplication Metrics

**Total Duplicate Files Identified**: 25+  
**Total Lines of Duplicate Code**: ~5000+ (estimated)  
**Consolidation Effort**: 15-20 days  
**Risk Reduction**: High (fewer code paths = fewer bugs)

---

**Report Generated**: 2025-01-XX  
**Next Steps**: Create consolidation plan and execute high-priority consolidations

