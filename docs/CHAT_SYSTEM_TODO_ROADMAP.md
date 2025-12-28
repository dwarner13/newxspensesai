# XspensesAI Chat System – Execution Roadmap

**Created**: November 20, 2025  
**Source**: `COMPLETE_CHAT_SYSTEM_AUDIT.md`  
**Status**: Ready for Execution

---

## Overview

This roadmap transforms the comprehensive audit into actionable, ordered tasks. Each phase builds on the previous one. **Do not skip phases** - they are designed to stabilize the foundation before adding features.

**Estimated Timeline**: 10-12 weeks total
- Phase 1: 2-3 weeks (Critical Stabilization)
- Phase 2: 2-3 weeks (Memory & Guardrails Unification)
- Phase 3: 2-3 weeks (UX & Handoff Improvements)
- Phase 4: 3-4 weeks (Advanced Features & Optimization)

---

## Phase 1 – Critical Stabilization

**Goal**: Fix architectural inconsistencies that prevent reliable operation. These must be completed before any new features.

**Why First**: Multiple sources of truth create bugs, confusion, and maintenance burden. Prime's inability to delegate breaks core orchestration.

---

### 1.1 Consolidate Employee Definitions

**Description**:  
Currently, employee definitions exist in 4 places: database (`employee_profiles`), `src/systems/AIEmployeeSystem.ts`, `src/config/ai-employees.js`, and `src/lib/universalAIEmployeeConnection.ts`. This causes inconsistencies, duplicate slugs, and conflicting prompts. We need a single source of truth: the database.

**Tasks**:
- [ ] Audit all employees currently in database (`employee_profiles` table)
- [ ] Create migration file: `supabase/migrations/YYYYMMDDHHMM_consolidate_employee_definitions.sql`
- [ ] For each employee found in code but missing from database:
  - [ ] Extract system prompt from code
  - [ ] Extract tools_allowed from code
  - [ ] Extract capabilities from code
  - [ ] Extract model config (model, temperature, max_tokens)
  - [ ] Insert into `employee_profiles` table with canonical slug
- [ ] Create alias mapping function/table for slug resolution (e.g., `prime` → `prime-boss`, `byte` → `byte-docs`)
- [ ] Update `src/employees/registry.ts` to ONLY read from database (remove hardcoded fallbacks)
- [ ] Remove hardcoded employee definitions from:
  - [ ] `src/systems/AIEmployeeSystem.ts` (keep only types/interfaces)
  - [ ] `src/config/ai-employees.js` (deprecate or remove)
  - [ ] `src/lib/universalAIEmployeeConnection.ts` (keep only personality helpers if needed)
- [ ] Update all references to use canonical slugs via `resolveSlug()` function
- [ ] Test: Verify all employees load from database correctly
- [ ] Test: Verify slug aliases resolve correctly

**Files to Touch**:
- `supabase/migrations/YYYYMMDDHHMM_consolidate_employee_definitions.sql` (new)
- `src/employees/registry.ts` (update)
- `src/systems/AIEmployeeSystem.ts` (remove hardcoded data)
- `src/config/ai-employees.js` (deprecate/remove)
- `src/lib/universalAIEmployeeConnection.ts` (clean up)
- `netlify/functions/_shared/router.ts` (verify uses registry)
- `netlify/functions/chat.ts` (verify uses registry)

**Done Criteria**:
- ✅ All 10+ employees exist in `employee_profiles` table with complete data
- ✅ No hardcoded employee definitions in code (only database)
- ✅ `resolveSlug()` handles all aliases correctly
- ✅ All code references use canonical slugs via registry
- ✅ Tests pass: employees load from database, aliases resolve

---

### 1.2 Fix Prime Delegation & Handoff

**Description**:  
Prime is the orchestrator but cannot delegate to other employees because it's missing the `request_employee_handoff` tool. This breaks the core multi-agent workflow. We need to add the tool to Prime's `tools_allowed` array and ensure the handoff flow works end-to-end.

**Tasks**:
- [ ] Verify `request_employee_handoff` tool exists in `src/agent/tools/index.ts`
- [ ] Create migration: `supabase/migrations/YYYYMMDDHHMM_add_handoff_tool_to_prime.sql`
- [ ] Update `employee_profiles` table: Add `request_employee_handoff` to Prime's `tools_allowed` array
- [ ] Update Prime's system prompt (in database) to mention delegation capability
- [ ] Test handoff flow:
  - [ ] Prime receives message requiring specialist
  - [ ] Prime calls `request_employee_handoff` tool
  - [ ] Tool creates handoff record
  - [ ] Frontend receives handoff metadata
  - [ ] Frontend switches to new employee
  - [ ] Conversation continues with context
- [ ] Document handoff behavior in Prime's system prompt

**Files to Touch**:
- `supabase/migrations/YYYYMMDDHHMM_add_handoff_tool_to_prime.sql` (new)
- `src/agent/tools/impl/request_employee_handoff.ts` (verify exists and works)
- `netlify/functions/chat.ts` (verify tool calling enabled for Prime)
- `src/hooks/useChat.ts` (verify handles handoff metadata)
- Frontend chat components (verify display handoff transitions)

**Done Criteria**:
- ✅ Prime has `request_employee_handoff` in `tools_allowed` array
- ✅ Prime's system prompt mentions delegation
- ✅ Handoff tool executes successfully when Prime calls it
- ✅ Frontend switches employees on handoff
- ✅ End-to-end test: Prime → Specialist handoff works
- ✅ Handoff metadata visible in frontend

---

### 1.3 Consolidate Chat Endpoints to Single Canonical Function

**Description**:  
Multiple chat endpoints exist (`chat.ts`, `chat-v3-production.ts`, plus legacy endpoints). This creates confusion about which to use, maintenance burden, and potential inconsistencies. We need one canonical endpoint that all frontend code uses.

**Tasks**:
- [ ] Audit all chat endpoints:
  - [ ] `netlify/functions/chat.ts` (current main endpoint)
  - [ ] `netlify/functions/chat-v3-production.ts` (needs evaluation)
  - [ ] `netlify/functions/_legacy/chat-complex.ts` (mark for removal)
  - [ ] `netlify/functions/_legacy/chat-sse.ts` (mark for removal)
  - [ ] `netlify/functions/_legacy/chat-stream.ts` (mark for removal)
- [ ] Compare `chat.ts` vs `chat-v3-production.ts`:
  - [ ] List unique features in each
  - [ ] Decide which to keep (likely `chat.ts` if it's more complete)
  - [ ] Merge any unique features from the other into the chosen one
- [ ] Update chosen endpoint to include all necessary features:
  - [ ] Guardrails (PII masking, moderation)
  - [ ] Employee routing
  - [ ] Memory retrieval
  - [ ] Tool calling
  - [ ] SSE streaming
  - [ ] Session management
  - [ ] Rate limiting (if needed)
- [ ] Update all frontend code to use single endpoint:
  - [ ] `src/hooks/useChat.ts`
  - [ ] `src/hooks/useStreamChat.ts`
  - [ ] `src/lib/chat-api.ts`
  - [ ] `src/lib/chatEndpoint.ts`
  - [ ] All chat components
- [ ] Remove or deprecate unused endpoints:
  - [ ] Move legacy endpoints to `_legacy` folder with deprecation notice
  - [ ] Add deprecation warnings in code
- [ ] Document the canonical endpoint API in `docs/CHAT_API.md`
- [ ] Test: All frontend components use single endpoint
- [ ] Test: Endpoint handles all use cases (streaming, non-streaming, tool calling, handoffs)

**Files to Touch**:
- `netlify/functions/chat.ts` (enhance if needed, make canonical)
- `netlify/functions/chat-v3-production.ts` (evaluate, merge features, deprecate)
- `netlify/functions/_legacy/chat-*.ts` (add deprecation notices)
- `src/hooks/useChat.ts` (update endpoint)
- `src/hooks/useStreamChat.ts` (update endpoint)
- `src/lib/chat-api.ts` (update endpoint)
- `src/lib/chatEndpoint.ts` (update endpoint)
- All frontend chat components (verify endpoint usage)
- `docs/CHAT_API.md` (new - document API)

**Done Criteria**:
- ✅ Single canonical endpoint (`chat.ts`) exists with all features
- ✅ All frontend code uses the canonical endpoint
- ✅ Legacy endpoints marked deprecated or removed
- ✅ API documented
- ✅ Tests pass: all use cases work with single endpoint
- ✅ No references to deprecated endpoints in active code

---

### 1.4 Audit and Fix Employee Tool Access

**Description**:  
Tools are registered but not all employees have correct access. Some employees are missing tools they should have, and some may have tools they shouldn't. We need to audit and fix tool access for all employees.

**Tasks**:
- [ ] List all tools in `src/agent/tools/index.ts` (50+ tools)
- [ ] For each active employee, audit `tools_allowed` array:
  - [ ] `prime-boss` - Should have `request_employee_handoff` (from 1.2)
  - [ ] `byte-docs` - Verify OCR and ingest tools
  - [ ] `tag-ai` - Verify tag tools and handoff
  - [ ] `crystal-ai` - Verify crystal and analytics tools
  - [ ] `finley-ai` - Verify finley forecast tools and queries
  - [ ] `goalie-ai` - Verify goalie tools
  - [ ] `liberty-ai` - Verify liberty tools and handoff
  - [ ] `blitz-ai` - Audit and add missing tools
  - [ ] `chime-ai` - Verify chime notification tools
  - [ ] `ledger-tax` - Add to database if missing, assign tax tools
- [ ] Create migration: `supabase/migrations/YYYYMMDDHHMM_fix_employee_tool_access.sql`
- [ ] Update `tools_allowed` arrays for all employees
- [ ] Verify tool calling is enabled in `chat.ts` for all employees
- [ ] Test: Each employee can call their assigned tools
- [ ] Document tool access matrix in `docs/EMPLOYEE_TOOLS.md`

**Files to Touch**:
- `supabase/migrations/YYYYMMDDHHMM_fix_employee_tool_access.sql` (new)
- `netlify/functions/chat.ts` (verify tool calling enabled)
- `src/agent/tools/index.ts` (reference for tool list)
- `docs/EMPLOYEE_TOOLS.md` (new - document tool matrix)

**Done Criteria**:
- ✅ All employees have correct `tools_allowed` arrays
- ✅ Tool calling enabled for all employees in chat endpoint
- ✅ Tests pass: each employee can call their tools
- ✅ Tool access matrix documented
- ✅ No employees have tools they shouldn't have

---

## Phase 2 – Memory & Guardrails Unification

**Goal**: Consolidate duplicate implementations into single, authoritative systems. This reduces bugs, improves maintainability, and ensures consistent behavior.

**Why Second**: These systems are used everywhere. Consolidating them prevents inconsistencies and makes future changes easier.

---

### 2.1 Consolidate Memory Systems

**Description**:  
Five different memory implementations exist: `memory.ts`, `memory-extraction.ts`, `context-retrieval.ts`, `chat_runtime/memory.ts`, and `rag/retriever.ts`. This creates confusion, inconsistencies, and maintenance burden. We need one authoritative memory system.

**Tasks**:
- [ ] Audit all memory implementations:
  - [ ] `netlify/functions/_shared/memory.ts` (main memory manager)
  - [ ] `netlify/functions/_shared/memory-extraction.ts` (LLM-based extraction)
  - [ ] `netlify/functions/_shared/context-retrieval.ts` (context building)
  - [ ] `chat_runtime/memory.ts` (legacy)
  - [ ] `src/agent/rag/retriever.ts` (advanced RAG)
- [ ] Choose authoritative implementation (likely `memory.ts` + `memory-extraction.ts` + `context-retrieval.ts` combined)
- [ ] Create unified memory API:
  - [ ] `getMemory()` - Retrieve user facts, RAG, session history
  - [ ] `extractMemory()` - Extract facts from conversation (async)
  - [ ] `searchMemory()` - RAG semantic search
  - [ ] `getSessionSummary()` - Get or generate session summary
- [ ] Migrate all code to use unified API:
  - [ ] `netlify/functions/chat.ts` (use unified API)
  - [ ] All other functions using memory
- [ ] Deprecate or remove duplicate implementations:
  - [ ] `chat_runtime/memory.ts` (mark deprecated, remove if unused)
  - [ ] `src/agent/rag/retriever.ts` (integrate features into unified API or keep if needed separately)
- [ ] Document unified memory API in `docs/MEMORY_API.md`
- [ ] Test: All memory operations use unified API
- [ ] Test: Memory retrieval works correctly in chat flow

**Files to Touch**:
- `netlify/functions/_shared/memory.ts` (enhance to be authoritative)
- `netlify/functions/_shared/memory-extraction.ts` (integrate into unified API)
- `netlify/functions/_shared/context-retrieval.ts` (integrate into unified API)
- `chat_runtime/memory.ts` (deprecate/remove)
- `src/agent/rag/retriever.ts` (evaluate - keep if needed, integrate otherwise)
- `netlify/functions/chat.ts` (use unified API)
- `docs/MEMORY_API.md` (new - document API)

**Done Criteria**:
- ✅ Single unified memory API exists
- ✅ All code uses unified API
- ✅ Duplicate implementations removed or deprecated
- ✅ Memory API documented
- ✅ Tests pass: memory operations work correctly
- ✅ No direct calls to deprecated memory systems

---

### 2.2 Consolidate Guardrails Systems

**Description**:  
Five different guardrails implementations exist: `guardrails-production.ts`, `guardrails-unified.ts`, `guardrails.ts`, `guardrails-merged.ts`, and `guardrails_adapter.ts`. This creates confusion about which to use and potential inconsistencies. We need one authoritative guardrails system.

**Tasks**:
- [ ] Audit all guardrails implementations:
  - [ ] `netlify/functions/_shared/guardrails-production.ts` (main production)
  - [ ] `netlify/functions/_shared/guardrails-unified.ts` (unified API)
  - [ ] `netlify/functions/_shared/guardrails.ts` (legacy)
  - [ ] `netlify/functions/_shared/guardrails-merged.ts` (merged version)
  - [ ] `netlify/functions/_shared/guardrails_adapter.ts` (adapter)
- [ ] Compare implementations to identify:
  - [ ] Which has most complete features
  - [ ] Which has best API design
  - [ ] Which is most performant
- [ ] Choose authoritative implementation (likely `guardrails-production.ts` or `guardrails-unified.ts`)
- [ ] Create unified guardrails API:
  - [ ] `runGuardrails()` - Main guardrails function
  - [ ] `getGuardrailConfig()` - Load user/tenant config
  - [ ] Support for all features: PII masking, moderation, jailbreak detection
- [ ] Migrate all code to use unified API:
  - [ ] `netlify/functions/chat.ts` (use unified API)
  - [ ] `netlify/functions/smart-import-finalize.ts` (use unified API)
  - [ ] All other functions using guardrails
- [ ] Deprecate or remove duplicate implementations:
  - [ ] Mark unused implementations as deprecated
  - [ ] Remove if confirmed unused
- [ ] Add caching for guardrails config (load once, cache per tenant/user)
- [ ] Document unified guardrails API in `docs/GUARDRAILS_API.md`
- [ ] Test: All guardrails operations use unified API
- [ ] Test: PII masking, moderation, jailbreak detection work correctly

**Files to Touch**:
- `netlify/functions/_shared/guardrails-production.ts` (enhance or use as-is)
- `netlify/functions/_shared/guardrails-unified.ts` (evaluate, merge if better)
- `netlify/functions/_shared/guardrails.ts` (deprecate/remove)
- `netlify/functions/_shared/guardrails-merged.ts` (deprecate/remove)
- `netlify/functions/_shared/guardrails_adapter.ts` (evaluate - keep if needed)
- `netlify/functions/chat.ts` (use unified API)
- `netlify/functions/smart-import-finalize.ts` (use unified API)
- All other functions using guardrails
- `docs/GUARDRAILS_API.md` (new - document API)

**Done Criteria**:
- ✅ Single unified guardrails API exists
- ✅ All code uses unified API
- ✅ Config caching implemented
- ✅ Duplicate implementations removed or deprecated
- ✅ Guardrails API documented
- ✅ Tests pass: PII masking, moderation, jailbreak work correctly
- ✅ No direct calls to deprecated guardrails systems

---

### 2.3 Make Memory Extraction Async

**Description**:  
Memory extraction currently runs synchronously after each response, blocking the response stream. This slows down user experience. We should move it to a background job that runs asynchronously.

**Tasks**:
- [ ] Identify where memory extraction happens (likely in `chat.ts` after response)
- [ ] Create background job system (or use existing):
  - [ ] Option A: Netlify Background Functions
  - [ ] Option B: Supabase Edge Functions
  - [ ] Option C: Queue system (e.g., `memory_extraction_queue` table)
- [ ] Create async memory extraction function:
  - [ ] Accepts: `userId`, `sessionId`, `userMessage`, `assistantResponse`
  - [ ] Extracts facts using LLM
  - [ ] Stores facts in `user_memory_facts` table
  - [ ] Generates embeddings if needed
  - [ ] Handles errors gracefully (don't fail if extraction fails)
- [ ] Update `chat.ts` to queue memory extraction instead of running synchronously:
  - [ ] After response streamed, queue extraction job
  - [ ] Don't wait for extraction to complete
  - [ ] Log extraction job ID for tracking
- [ ] Add retry logic for failed extractions:
  - [ ] Retry up to 3 times
  - [ ] Exponential backoff
  - [ ] Log failures
- [ ] Test: Memory extraction happens asynchronously
- [ ] Test: Responses are faster (no blocking)
- [ ] Test: Facts still extracted correctly

**Files to Touch**:
- `netlify/functions/_shared/memory-extraction.ts` (make async-compatible)
- `netlify/functions/chat.ts` (queue extraction instead of sync call)
- Background job handler (new or existing)
- Queue table migration if needed: `supabase/migrations/YYYYMMDDHHMM_add_memory_extraction_queue.sql`

**Done Criteria**:
- ✅ Memory extraction runs asynchronously
- ✅ Responses not blocked by extraction
- ✅ Extraction still works correctly
- ✅ Retry logic implemented
- ✅ Tests pass: faster responses, facts still extracted
- ✅ No synchronous memory extraction in chat flow

---

## Phase 3 – UX & Handoff Improvements

**Goal**: Improve user experience by making tool execution visible, improving handoff flow, and consolidating chat components.

**Why Third**: UX improvements depend on stable foundation (Phases 1-2). These make the system more user-friendly and maintainable.

---

### 3.1 Add Tool Calling UI

**Description**:  
Tool execution is currently invisible to users. They don't know when tools are being called or what results are returned. We should show tool execution in the UI so users understand what's happening.

**Tasks**:
- [ ] Design tool execution UI:
  - [ ] Show tool name when called
  - [ ] Show loading state during execution
  - [ ] Show tool results (formatted nicely)
  - [ ] Show errors if tool fails
  - [ ] Collapsible/expandable for long results
- [ ] Update chat endpoint to send tool execution events:
  - [ ] `tool_calling` event with tool name
  - [ ] `tool_executing` event with status
  - [ ] `tool_result` event with results
  - [ ] `tool_error` event if failed
- [ ] Update frontend chat components to display tool execution:
  - [ ] Parse tool events from SSE stream
  - [ ] Render tool execution UI
  - [ ] Style consistently with chat messages
- [ ] Update `useChat` hook to handle tool events
- [ ] Test: Tool execution visible in UI
- [ ] Test: Tool results displayed correctly
- [ ] Test: Tool errors handled gracefully

**Files to Touch**:
- `netlify/functions/chat.ts` (send tool events in SSE stream)
- `src/hooks/useChat.ts` (handle tool events)
- `src/hooks/useStreamChat.ts` (handle tool events)
- Frontend chat components (display tool execution)
- `src/components/chat/ToolExecution.tsx` (new - tool execution UI component)

**Done Criteria**:
- ✅ Tool execution visible in UI
- ✅ Tool results displayed
- ✅ Tool errors shown gracefully
- ✅ UI consistent with chat messages
- ✅ Tests pass: tool execution shown correctly

---

### 3.2 Improve Handoff Context Passing

**Description**:  
When employees hand off to each other, context is not passed. The new employee doesn't know what was discussed. We should pass conversation context during handoff so the new employee can continue seamlessly.

**Tasks**:
- [ ] Update `request_employee_handoff` tool to include context:
  - [ ] Recent conversation summary (last N messages)
  - [ ] Key facts extracted from conversation
  - [ ] Reason for handoff
  - [ ] User's original intent
- [ ] Update handoff record in database to store context:
  - [ ] Add `context_summary` field to handoff table
  - [ ] Add `key_facts` field (array)
  - [ ] Add `handoff_reason` field
- [ ] Update receiving employee's system prompt to include handoff context:
  - [ ] Load handoff context when employee receives handoff
  - [ ] Include in system prompt: "You're taking over from [employee]. Context: [summary]"
- [ ] Update frontend to show handoff context:
  - [ ] Display handoff reason
  - [ ] Show brief context summary
  - [ ] Make it clear why employee switched
- [ ] Test: Context passed during handoff
- [ ] Test: Receiving employee understands context
- [ ] Test: Handoff UI shows context

**Files to Touch**:
- `src/agent/tools/impl/request_employee_handoff.ts` (include context)
- Handoff table migration if needed: `supabase/migrations/YYYYMMDDHHMM_add_handoff_context.sql`
- `netlify/functions/chat.ts` (load handoff context for receiving employee)
- Frontend chat components (display handoff context)
- `src/components/chat/HandoffTransition.tsx` (new - handoff UI component)

**Done Criteria**:
- ✅ Context passed during handoff
- ✅ Receiving employee gets context in system prompt
- ✅ Handoff UI shows context and reason
- ✅ Tests pass: context passed correctly
- ✅ Seamless handoff experience

---

### 3.3 Consolidate Chat Components

**Description**:  
40+ chat components exist with unclear hierarchy. Each employee has custom UI, creating duplication and inconsistent UX. We should create a shared chat component library.

**Tasks**:
- [ ] Audit all chat components:
  - [ ] List all components in `src/components/chat/`
  - [ ] List all components in `src/pages/chat/`
  - [ ] Identify which are active vs legacy
- [ ] Design shared chat component API:
  - [ ] `ChatInterface` - Base chat component
  - [ ] Props: `employeeSlug`, `sessionId`, `onMessage`, etc.
  - [ ] Handles: message display, input, streaming, tool execution, handoffs
- [ ] Create shared chat component:
  - [ ] `src/components/chat/SharedChatInterface.tsx` (new)
  - [ ] Reusable across all employees
  - [ ] Consistent styling and behavior
- [ ] Migrate employee-specific components to use shared component:
  - [ ] `PrimeChatCentralized.tsx` → Use `SharedChatInterface`
  - [ ] `ByteChatCentralized.tsx` → Use `SharedChatInterface`
  - [ ] Other employee components → Use `SharedChatInterface`
- [ ] Remove duplicate code:
  - [ ] Extract common logic to shared component
  - [ ] Keep only employee-specific customizations
- [ ] Move legacy components to `_legacy` folder:
  - [ ] Mark as deprecated
  - [ ] Remove if confirmed unused
- [ ] Test: All employees use shared component
- [ ] Test: Consistent UX across employees

**Files to Touch**:
- `src/components/chat/SharedChatInterface.tsx` (new - shared component)
- `src/components/chat/PrimeChatCentralized.tsx` (migrate to shared)
- `src/components/chat/ByteChatCentralized.tsx` (migrate to shared)
- Other employee chat components (migrate to shared)
- Legacy components (move to `_legacy` or remove)

**Done Criteria**:
- ✅ Shared chat component exists
- ✅ All employees use shared component
- ✅ Consistent UX across employees
- ✅ Duplicate code removed
- ✅ Legacy components cleaned up
- ✅ Tests pass: all employees render correctly

---

## Phase 4 – Advanced Features & Optimization

**Goal**: Add advanced capabilities and optimize performance. These are nice-to-have features that improve the system but aren't critical for basic operation.

**Why Fourth**: These depend on stable foundation and good UX. They enhance the system but aren't blockers.

---

### 4.1 Consistently Enable RAG Retrieval

**Description**:  
RAG retrieval exists but isn't consistently used in chat flow. We should enable it for all employees to provide more context-aware responses.

**Tasks**:
- [ ] Audit RAG retrieval usage:
  - [ ] Check where RAG is currently used
  - [ ] Check where it should be used but isn't
- [ ] Enable RAG retrieval in chat flow:
  - [ ] Add RAG retrieval to `buildContext()` function
  - [ ] Enable for all employees (or configurable per employee)
  - [ ] Set reasonable defaults (top-K=5, similarity threshold=0.7)
- [ ] Optimize RAG retrieval:
  - [ ] Cache embeddings if possible
  - [ ] Optimize vector search queries
  - [ ] Limit retrieval to relevant scopes
- [ ] Show RAG sources to users:
  - [ ] Display which documents/chunks were retrieved
  - [ ] Show similarity scores (optional)
  - [ ] Make sources clickable if possible
- [ ] Test: RAG retrieval works for all employees
- [ ] Test: Responses more context-aware
- [ ] Test: Performance acceptable

**Files to Touch**:
- `netlify/functions/_shared/context-retrieval.ts` (enable RAG)
- `netlify/functions/chat.ts` (use RAG in context building)
- Frontend chat components (display RAG sources)
- `src/components/chat/RAGSources.tsx` (new - display sources)

**Done Criteria**:
- ✅ RAG retrieval enabled for all employees
- ✅ Responses more context-aware
- ✅ RAG sources shown to users
- ✅ Performance acceptable
- ✅ Tests pass: RAG works correctly

---

### 4.2 Auto-Generate Session Summaries

**Description**:  
Session summaries exist but aren't auto-generated. We should automatically generate summaries after N messages to keep context manageable and improve long conversations.

**Tasks**:
- [ ] Design summary generation trigger:
  - [ ] After N messages (e.g., 20)
  - [ ] After N tokens (e.g., 8000)
  - [ ] On session close
- [ ] Create summary generation function:
  - [ ] Use LLM to generate summary
  - [ ] Extract key facts
  - [ ] Store in `chat_session_summaries` table
- [ ] Update context building to use summaries:
  - [ ] If session has summary, include it instead of full history
  - [ ] Include recent messages after summary
- [ ] Trigger summary generation:
  - [ ] In `chat.ts` after message threshold
  - [ ] Run asynchronously (don't block response)
- [ ] Test: Summaries auto-generated
- [ ] Test: Summaries used in context building
- [ ] Test: Long conversations work better

**Files to Touch**:
- `netlify/functions/_shared/session-summaries.ts` (create or enhance)
- `netlify/functions/chat.ts` (trigger summary generation)
- `netlify/functions/_shared/context-retrieval.ts` (use summaries)

**Done Criteria**:
- ✅ Summaries auto-generated after threshold
- ✅ Summaries used in context building
- ✅ Long conversations work better
- ✅ Tests pass: summaries generated and used correctly

---

### 4.3 Add Error Recovery for Smart Import

**Description**:  
Smart Import pipeline has no error recovery. If a step fails, the user is stuck. We should add error recovery and retry logic.

**Tasks**:
- [ ] Audit Smart Import pipeline:
  - [ ] Identify all failure points
  - [ ] Identify which failures are recoverable
- [ ] Add error recovery:
  - [ ] Retry logic for transient failures
  - [ ] Rollback for failed commits
  - [ ] Clear error messages for users
  - [ ] Save state for recovery
- [ ] Add error UI:
  - [ ] Show error messages clearly
  - [ ] Provide retry buttons
  - [ ] Show progress/status
- [ ] Test: Error recovery works
- [ ] Test: Users can recover from failures

**Files to Touch**:
- `netlify/functions/smart-import-finalize.ts` (add error recovery)
- `netlify/functions/byte-ocr-parse.ts` (add error recovery)
- `netlify/functions/commit-import.ts` (add rollback)
- `src/pages/dashboard/SmartImportAI.tsx` (add error UI)

**Done Criteria**:
- ✅ Error recovery implemented
- ✅ Users can recover from failures
- ✅ Clear error messages
- ✅ Tests pass: error recovery works

---

### 4.4 Performance Optimization

**Description**:  
Several performance issues exist: guardrails config loaded per-request, RAG retrieval not optimized, multiple database queries. We should optimize these.

**Tasks**:
- [ ] Cache guardrails config:
  - [ ] Load once per tenant/user
  - [ ] Cache in memory (with TTL)
  - [ ] Invalidate on updates
- [ ] Optimize RAG retrieval:
  - [ ] Cache embeddings
  - [ ] Optimize vector queries
  - [ ] Limit retrieval scope
- [ ] Reduce database queries:
  - [ ] Batch queries where possible
  - [ ] Use database views/functions
  - [ ] Cache frequently accessed data
- [ ] Profile and measure:
  - [ ] Add performance metrics
  - [ ] Identify bottlenecks
  - [ ] Optimize hot paths
- [ ] Test: Performance improved
- [ ] Test: Response times acceptable

**Files to Touch**:
- `netlify/functions/_shared/guardrails-production.ts` (add caching)
- `netlify/functions/_shared/context-retrieval.ts` (optimize RAG)
- `netlify/functions/chat.ts` (optimize queries)

**Done Criteria**:
- ✅ Guardrails config cached
- ✅ RAG retrieval optimized
- ✅ Database queries reduced
- ✅ Performance improved
- ✅ Tests pass: acceptable response times

---

## Where to Start Next

### Recommended First Task: **Phase 1.1 – Consolidate Employee Definitions**

**Why This First:**
1. **Foundation for Everything**: All other tasks depend on having a single source of truth for employees. If we fix this first, all subsequent work will be easier.
2. **High Impact, Low Risk**: This is primarily a data migration and code cleanup task. It doesn't change behavior, just consolidates where data lives.
3. **Unblocks Other Tasks**: Once employees are in the database, fixing Prime delegation (1.2) and tool access (1.4) becomes straightforward.
4. **Clear Success Criteria**: Easy to verify - either all employees are in the database or they're not.

**How to Execute:**
1. Start by auditing the database: `SELECT * FROM employee_profiles ORDER BY slug;`
2. Compare with code definitions in `src/systems/AIEmployeeSystem.ts`
3. Create migration to add missing employees
4. Update registry to only read from database
5. Remove hardcoded definitions
6. Test thoroughly

**Estimated Time**: 3-5 days

**Dependencies**: None (can start immediately)

---

## Progress Tracking

Use this section to track progress as you complete tasks:

### Phase 1 – Critical Stabilization
- [ ] 1.1 Consolidate Employee Definitions
- [ ] 1.2 Fix Prime Delegation & Handoff
- [ ] 1.3 Consolidate Chat Endpoints
- [ ] 1.4 Audit and Fix Employee Tool Access

### Phase 2 – Memory & Guardrails Unification
- [ ] 2.1 Consolidate Memory Systems
- [ ] 2.2 Consolidate Guardrails Systems
- [ ] 2.3 Make Memory Extraction Async

### Phase 3 – UX & Handoff Improvements
- [ ] 3.1 Add Tool Calling UI
- [ ] 3.2 Improve Handoff Context Passing
- [ ] 3.3 Consolidate Chat Components

### Phase 4 – Advanced Features & Optimization
- [ ] 4.1 Consistently Enable RAG Retrieval
- [ ] 4.2 Auto-Generate Session Summaries
- [ ] 4.3 Add Error Recovery for Smart Import
- [ ] 4.4 Performance Optimization

---

**Last Updated**: November 20, 2025  
**Next Review**: After Phase 1 completion



