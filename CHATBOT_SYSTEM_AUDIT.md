# 🔍 Chatbot System Audit - Complete Health Check

**Date:** January 2025  
**Status:** Comprehensive System Mapping  
**Goal:** Understand canonical architecture, identify legacy code, assess health

---

## 1. HIGH-LEVEL SUMMARY

The XspensesAI chatbot system has evolved through multiple iterations and is now consolidated around a **unified chat architecture**. The canonical flow uses:

- **Single endpoint**: `/.netlify/functions/chat` (unified, production-ready)
- **Single UI component**: `UnifiedAssistantChat.tsx` (desktop slide-out + mobile bottom sheet)
- **Single router**: `netlify/functions/_shared/router.ts` (intelligent employee routing)
- **Unified guardrails**: `netlify/functions/_shared/guardrails-unified.ts` (PII + moderation + jailbreak)
- **Unified memory**: `netlify/functions/_shared/memory.ts` (facts + embeddings + session summaries)

The system supports **9+ employees** (Prime, Byte, Tag, Crystal, Liberty, Goalie, Finley, Blitz, Chime) with intelligent routing, handoffs, tool calling, and persistent memory. All employees share the same security layer (guardrails) and memory system.

**Key Architecture Points:**
- Frontend: `UnifiedAssistantChat` → `usePrimeChat` hook → `/.netlify/functions/chat`
- Backend: `chat.ts` → `router.ts` → `guardrails-unified.ts` → `memory.ts` → OpenAI
- State: `useUnifiedChatLauncher` (global Zustand-like state) manages open/close, active employee, activity flags
- Database: `chat_sessions`, `chat_messages`, `user_memory_facts`, `memory_embeddings`, `employee_profiles`

---

## 2. CANONICAL STACK

### ✅ Canonical Endpoint
- **File**: `netlify/functions/chat.ts`
- **Route**: `POST /.netlify/functions/chat`
- **Status**: ✅ Production-ready, actively used
- **Features**: SSE streaming, guardrails, memory, session management, tool calling, employee routing
- **Request Format**: `{ userId, employeeSlug?, message, sessionId?, stream?: true }`

### ✅ Canonical Router
- **File**: `netlify/functions/_shared/router.ts`
- **Function**: `routeToEmployee(userText: string, ...)`
- **Status**: ✅ Active, intelligent routing based on message content
- **Logic**: Pattern matching + few-shot examples → selects employee slug (prime-boss, byte-docs, tag-ai, crystal-ai, liberty-ai, goalie-ai, finley-ai, blitz-ai, chime-ai)
- **Handoffs**: Supports employee delegation via `delegate` tool (Prime → specialists)

### ✅ Canonical Chat UI
- **File**: `src/components/chat/UnifiedAssistantChat.tsx`
- **Status**: ✅ Primary UI, actively used
- **Layout**: Desktop slide-out panel (right side, 420px), Mobile full-screen bottom sheet
- **Hook**: Uses `usePrimeChat` for backend communication
- **State**: Managed by `useUnifiedChatLauncher` (global state for open/close, active employee)
- **Launcher**: `DesktopChatSideBar.tsx` (vertical blue pill on right edge, desktop only)

### ✅ Canonical Employee Registry
- **File**: `src/employees/registry.ts`
- **Database**: `employee_profiles` table (Supabase)
- **Status**: ✅ Single source of truth for employee definitions
- **Functions**: `getEmployee(slug)`, `getAllEmployees()`, `resolveSlug(alias)`, `getEmployeeSystemPrompt(slug)`
- **Cache**: 5-minute TTL for performance

### ✅ Canonical Guardrail/Memory Layer
- **Guardrails**: `netlify/functions/_shared/guardrails-unified.ts`
  - **Function**: `runInputGuardrails(input, userId, stage, cfg)`
  - **Features**: PII masking (40+ types), OpenAI moderation, jailbreak detection, audit logging
  - **Presets**: Strict (ingestion), Balanced (chat), Creative (relaxed)
  - **Status**: ✅ All employees protected, integrated into `chat.ts`

- **Memory**: `netlify/functions/_shared/memory.ts`
  - **Functions**: `getMemory()`, `recall()`, `upsertFact()`, `queueMemoryExtraction()`
  - **Tables**: `user_memory_facts`, `memory_embeddings`, `chat_session_summaries`
  - **Status**: ✅ Integrated into `chat.ts`, all employees share memory

---

## 3. OTHER CHATBOTS / LEGACY CODE

### 🔴 Legacy Endpoints (Not Used)

| File | Status | Recommendation |
|------|--------|----------------|
| `netlify/functions_old/chat-v2.ts` | Dead | Safe to remove |
| `netlify/functions_old/chat-v3-production.ts` | Dead | Safe to remove |
| `netlify/functions_old/_legacy/chat-stream.ts` | Dead | Safe to remove |
| `netlify/functions_old/_legacy/chat-sse.ts` | Dead | Safe to remove |
| `netlify/functions_old/_legacy/chat-complex.ts` | Dead | Safe to remove |
| `netlify/functions-backup/chat.ts` | Backup | Archive or remove |
| `netlify/functions-backup/chat-simple.ts` | Backup | Archive or remove |
| `supabase/functions/universal-ai-chat/index.ts` | Alternative | Check if used, likely safe to remove |
| `api/routes/ai-employees.js` | Express route | Check if Express server is active, likely dead |

### 🟡 Legacy Chat Components (May Still Be Imported)

| File | Status | Used By | Recommendation |
|------|--------|---------|----------------|
| `src/components/chat/PrimeChatCentralized.tsx` | Legacy | Possibly `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/chat/ByteChatCentralized.tsx` | Legacy | Possibly `ByteChatTest.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/chat/_legacy/PrimeChat-page.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/chat/_legacy/ByteDocumentChat.tsx` | Legacy | Possibly `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/chat/_legacy/EnhancedPrimeChat.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/chat/_legacy/PrimeChatInterface.tsx` | Legacy | `AIEmployeeTestInterface.tsx` | Keep for testing only |
| `src/components/prime/PrimeChatSlideout.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/prime/PrimeChatV2.tsx` | Legacy | `PrimeChatV2Mount.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/prime/PrimeChatV2Mount.tsx` | Legacy | `main.tsx` | **Remove from main.tsx** |
| `src/components/dashboard/DashboardPrimeChat.tsx` | Legacy | `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/ai/AIEmployeeChat.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/ai/AIEmployeeChatbot.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/ai/UniversalAIEmployeeChat.tsx` | Legacy | `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/chat/UniversalChatInterface.tsx` | Legacy | `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/chat/MobileChatInterface.tsx` | Legacy | `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/components/chat/EnhancedChatInterface.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/chat/SharedChatInterface.tsx` | Legacy | Unknown | Safe to remove |
| `src/components/layout/MobileChatbotModal.tsx` | Legacy | Possibly `MobileBottomNav.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/ui/components/PrimeChatDrawer.tsx` | Legacy | `PrimeChatMount.tsx`, `PrimeDockButton.tsx` | Safe to remove |
| `src/ui/components/PrimeChatMount.tsx` | Legacy | `main.tsx` | **Remove from main.tsx** |
| `src/ui/components/PrimeDockButton.tsx` | Legacy | Unknown | Safe to remove |
| `prime-module/components/PrimeChat.tsx` | Module | Isolated module | Keep if module is used |

### 🟡 Legacy Chat Pages (Route-Based)

| File | Status | Route | Recommendation |
|------|--------|-------|----------------|
| `src/pages/chat/PrimeChatSimple.tsx` | Legacy | `/chat/prime` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/TagChat.tsx` | Legacy | `/chat/tag` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/LibertyChat.tsx` | Legacy | `/chat/liberty` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/GoalieChat.tsx` | Legacy | `/chat/goalie` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/SettingsChat.tsx` | Legacy | `/chat/settings` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/TaxChat.tsx` | Legacy | `/chat/tax` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/BIChat.tsx` | Legacy | `/chat/bi` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/AnalyticsChat.tsx` | Legacy | `/chat/analytics` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/WellnessChat.tsx` | Legacy | `/chat/wellness` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/SpotifyChat.tsx` | Legacy | `/chat/spotify` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/PodcastChat.tsx` | Legacy | `/chat/podcast` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/TherapistChat.tsx` | Legacy | `/chat/therapist` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/ChimeChat.tsx` | Legacy | `/chat/chime` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/DebtChat.tsx` | Legacy | `/chat/debt` | **Migrate to UnifiedAssistantChat** |
| `src/pages/chat/AutomationChat.tsx` | Legacy | `/chat/automation` | **Migrate to UnifiedAssistantChat** |
| `src/pages/ByteChatTest.tsx` | Test | `/smart-import` | Keep for testing, but use UnifiedAssistantChat |
| `src/pages/dashboard/EmployeeChatPage.tsx` | Legacy | Unknown | **Migrate to UnifiedAssistantChat** |

### 🟡 Legacy Hooks / Services

| File | Status | Used By | Recommendation |
|------|--------|---------|----------------|
| `src/hooks/_legacy/useChat.ts` | Legacy | `PrimeChatCentralized.tsx`, `ByteChatCentralized.tsx` | **Migrate to usePrimeChat** |
| `src/services/UniversalAIController.ts` | Legacy | `ConnectedDashboard.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/lib/universalAIEmployeeConnection.ts` | Legacy | Unknown | Check if used, likely safe to remove |
| `src/lib/ai-employees.ts` | Legacy | Unknown | Check if used, likely safe to remove |
| `src/systems/AIEmployeeOrchestrator.ts` | Legacy | `ByteDocumentChat.tsx` | **Migrate to UnifiedAssistantChat** |
| `src/systems/AIResponseEngine.ts` | Legacy | Unknown | Check if used, likely safe to remove |
| `src/lib/smartHandoff.ts` | Legacy | Unknown | Check if used, may be needed for handoffs |
| `chat_runtime/memory.ts` | Deprecated | Marked deprecated | Safe to remove (use `_shared/memory.ts`) |

### 🟡 Duplicate Router Files

| File | Status | Recommendation |
|------|--------|----------------|
| `netlify/functions/_shared/router.ts` | ✅ Canonical | Keep |
| `netlify/functions_old/_shared/router.ts` | Legacy | Safe to remove |
| `netlify/functions/_shared/prime_router.ts` | Legacy | Check if used, likely safe to remove |
| `netlify/functions/_shared/agent-router.ts` | Legacy | Check if used, likely safe to remove |
| `netlify/functions_old/_shared/agent-router.ts` | Legacy | Safe to remove |

### 🟡 Duplicate Guardrail Files

| File | Status | Recommendation |
|------|--------|----------------|
| `netlify/functions/_shared/guardrails-unified.ts` | ✅ Canonical | Keep (used by chat.ts) |
| `netlify/functions/_shared/guardrails-production.ts` | Legacy | Check if used, likely safe to remove |
| `netlify/functions/_shared/guardrails.ts` | Legacy | Check if used, likely safe to remove |
| `netlify/functions/_shared/guardrails-merged.ts` | Legacy | Safe to remove |
| `netlify/functions/_shared/guardrails_adapter.ts` | Legacy | Check if used, likely safe to remove |
| `netlify/functions_old/_shared/guardrails*.ts` | Legacy | Safe to remove |

### 🟡 Duplicate Memory Files

| File | Status | Recommendation |
|------|--------|----------------|
| `netlify/functions/_shared/memory.ts` | ✅ Canonical | Keep |
| `netlify/functions/_shared/memory-orchestrator.ts` | ✅ Active | Keep (used by chat.ts) |
| `netlify/functions/_shared/memory-extraction.ts` | ✅ Active | Keep (used by memory.ts) |
| `netlify/functions/_shared/memory_adapter.ts` | Legacy | Check if used, likely safe to remove |
| `netlify/functions_old/_shared/memory*.ts` | Legacy | Safe to remove |
| `netlify/functions_old/memory.ts` | Legacy | Safe to remove |
| `chat_runtime/memory.ts` | Deprecated | Safe to remove (marked deprecated) |

---

## 4. HEALTH CHECK - ISSUES & RISKS

### ⚠️ ISSUE #1: Multiple Chat UIs Still Active
**Files Involved:**
- `ConnectedDashboard.tsx` still renders `DashboardPrimeChat`, `ByteDocumentChat`, `UniversalChatInterface`, `MobileChatInterface`
- `main.tsx` still imports `PrimeChatMount`, `PrimeChatV2Mount`

**Why It Might Break:**
- Users may see multiple chat UIs simultaneously
- State conflicts between old and new chat systems
- Confusion about which chat is canonical

**Suggested Fix:**
- Remove all legacy chat component imports from `ConnectedDashboard.tsx`
- Remove `PrimeChatMount` and `PrimeChatV2Mount` from `main.tsx`
- Ensure all chat launches go through `useUnifiedChatLauncher`

### ⚠️ ISSUE #2: Legacy Hook Still Used
**Files Involved:**
- `src/hooks/_legacy/useChat.ts` still imported by `PrimeChatCentralized.tsx`, `ByteChatCentralized.tsx`

**Why It Might Break:**
- Duplicate logic between `useChat` and `usePrimeChat`
- Potential inconsistencies in session management or streaming

**Suggested Fix:**
- Migrate `PrimeChatCentralized.tsx` and `ByteChatCentralized.tsx` to use `usePrimeChat`
- Or deprecate these components entirely in favor of `UnifiedAssistantChat`

### ⚠️ ISSUE #3: Multiple Router Files
**Files Involved:**
- `netlify/functions/_shared/router.ts` (canonical)
- `netlify/functions/_shared/prime_router.ts` (unknown usage)
- `netlify/functions/_shared/agent-router.ts` (unknown usage)

**Why It Might Break:**
- Confusion about which router is used
- Potential routing inconsistencies

**Suggested Fix:**
- Search codebase for imports of `prime_router.ts` and `agent-router.ts`
- If unused, remove them
- If used, document why and consider consolidating

### ⚠️ ISSUE #4: Guardrail File Confusion
**Files Involved:**
- Multiple guardrail files: `guardrails-unified.ts`, `guardrails-production.ts`, `guardrails.ts`, `guardrails-merged.ts`

**Why It Might Break:**
- `chat.ts` imports `guardrails-unified.ts` (correct)
- But other files may import different guardrail modules
- Inconsistent PII masking or moderation behavior

**Suggested Fix:**
- Audit all imports of guardrail files
- Ensure all chat paths use `guardrails-unified.ts`
- Remove or deprecate other guardrail files

### ⚠️ ISSUE #5: Legacy Service Classes
**Files Involved:**
- `src/services/UniversalAIController.ts` still used by `ConnectedDashboard.tsx`

**Why It Might Break:**
- `UniversalAIController` calls `/.netlify/functions/chat` directly (bypassing `usePrimeChat`)
- May not integrate with `useUnifiedChatLauncher` state
- Duplicate session management logic

**Suggested Fix:**
- Remove `UniversalAIController` usage from `ConnectedDashboard.tsx`
- Use `useUnifiedChatLauncher` + `UnifiedAssistantChat` instead

### ⚠️ ISSUE #6: Route-Based Chat Pages
**Files Involved:**
- Multiple `/chat/*` routes still exist (`PrimeChatSimple.tsx`, `TagChat.tsx`, etc.)

**Why It Might Break:**
- Users can navigate to old chat pages
- These pages use `usePrimeChat` directly (not `UnifiedAssistantChat`)
- May not integrate with unified chat launcher

**Suggested Fix:**
- Remove or redirect `/chat/*` routes to dashboard with unified chat open
- Or migrate these pages to use `UnifiedAssistantChat`

### ⚠️ ISSUE #7: Employee Slug Inconsistencies
**Files Involved:**
- `src/utils/employeeUtils.ts` has slug mappings
- `netlify/functions/_shared/router.ts` uses different slugs
- `src/employees/registry.ts` loads from database

**Why It Might Break:**
- Slug aliases may not resolve correctly
- Router may select employee that doesn't match frontend display

**Suggested Fix:**
- Ensure `router.ts` uses canonical slugs from `employee_profiles` table
- Use `resolveSlug()` from registry consistently
- Document canonical slug list

### ⚠️ ISSUE #8: Memory System Deprecation Warning
**Files Involved:**
- `chat_runtime/memory.ts` marked as deprecated
- But may still be imported somewhere

**Why It Might Break:**
- If still used, may cause confusion about which memory API is canonical

**Suggested Fix:**
- Search for imports of `chat_runtime/memory.ts`
- Migrate to `netlify/functions/_shared/memory.ts`
- Remove deprecated file

---

## 5. CLEANUP RECOMMENDATIONS

### 🔴 High Priority (Remove Immediately)

1. **Remove legacy endpoints:**
   - `netlify/functions_old/chat-v2.ts`
   - `netlify/functions_old/chat-v3-production.ts`
   - `netlify/functions_old/_legacy/*.ts`
   - `netlify/functions-backup/*.ts`

2. **Remove legacy chat components from active use:**
   - Remove `DashboardPrimeChat`, `ByteDocumentChat`, `UniversalChatInterface`, `MobileChatInterface` from `ConnectedDashboard.tsx`
   - Remove `PrimeChatMount`, `PrimeChatV2Mount` from `main.tsx`

3. **Remove duplicate router files:**
   - `netlify/functions_old/_shared/router.ts`
   - Check and remove `netlify/functions/_shared/prime_router.ts` if unused
   - Check and remove `netlify/functions/_shared/agent-router.ts` if unused

4. **Remove duplicate guardrail files:**
   - `netlify/functions/_shared/guardrails-merged.ts`
   - `netlify/functions/_shared/guardrails.ts` (if not used)
   - `netlify/functions/_shared/guardrails-production.ts` (if not used)
   - `netlify/functions_old/_shared/guardrails*.ts`

5. **Remove deprecated memory file:**
   - `chat_runtime/memory.ts` (marked deprecated)

### 🟡 Medium Priority (Migrate Then Remove)

1. **Migrate legacy chat components:**
   - `PrimeChatCentralized.tsx` → Use `UnifiedAssistantChat` instead
   - `ByteChatCentralized.tsx` → Use `UnifiedAssistantChat` instead
   - `src/components/chat/_legacy/ByteDocumentChat.tsx` → Use `UnifiedAssistantChat` instead

2. **Migrate legacy hooks:**
   - `src/hooks/_legacy/useChat.ts` → Migrate consumers to `usePrimeChat`

3. **Migrate route-based chat pages:**
   - All `/chat/*` pages → Redirect to dashboard with unified chat open, or migrate to `UnifiedAssistantChat`

4. **Migrate legacy services:**
   - `src/services/UniversalAIController.ts` → Remove usage, use `useUnifiedChatLauncher` + `UnifiedAssistantChat`

### 🟢 Low Priority (Archive for Reference)

1. **Archive legacy components:**
   - Move `src/components/chat/_legacy/*` to `src/components/chat/_archive/`
   - Move `src/components/prime/*` (old Prime chat) to archive

2. **Archive documentation:**
   - Keep old audit docs (`PRIME_CHAT_UI_AUDIT.md`, etc.) for reference but mark as historical

---

## 6. EMPLOYEES & TOOLS STATUS

### ✅ Active Employees (from router.ts and registry)

| Employee Slug | Canonical Name | Status | Tools |
|---------------|----------------|--------|-------|
| `prime-boss` | Prime (CEO & Orchestrator) | ✅ Active | `delegate` tool for handoffs |
| `byte-docs` | Byte (Document Processing) | ✅ Active | OCR, document parsing |
| `tag-ai` | Tag (Categorization) | ✅ Active | Categorization tools (from `tools/index.ts`) |
| `crystal-ai` | Crystal (Analytics) | ✅ Active | Analytics queries |
| `liberty-ai` | Liberty (Debt Freedom) | ✅ Active | Debt payoff planning |
| `goalie-ai` | Goalie (Goal Setting) | ✅ Active | Goal management |
| `finley-ai` | Finley (Forecasting) | ✅ Active | Loan forecasting |
| `blitz-ai` | Blitz (Rapid Actions) | ✅ Active | Action plan generation |
| `chime-ai` | Chime (Reminders) | ✅ Active | Notification generation |

### 🔧 Tools System

- **Tool Registry**: `src/agent/tools/index.ts` (exports `toOpenAIToolDefs`, `pickTools`, `executeTool`)
- **Tool Execution**: Integrated into `chat.ts` (lines 59-60)
- **Tool Context**: `ToolContext` type includes `userId`, `sessionId`, `employeeSlug`
- **Status**: ✅ Active, used by Tag and other employees

### 🔄 Handoff System

- **Delegate Tool**: `chat_runtime/tools/delegate.ts` (Prime → specialists)
- **Status**: ✅ Implemented, Prime can delegate to Byte, Tag, Crystal, etc.
- **Database**: `chat_sessions` supports `parent_session_id` for child sessions

---

## 7. MEMORY & GUARDRAILS STATUS

### ✅ Memory System (Fully Integrated)

- **Canonical API**: `netlify/functions/_shared/memory.ts`
- **Functions**: `getMemory()`, `recall()`, `upsertFact()`, `queueMemoryExtraction()`
- **Tables**: `user_memory_facts`, `memory_embeddings`, `chat_session_summaries`
- **Integration**: Called from `chat.ts` before routing
- **Status**: ✅ All employees share memory

### ✅ Guardrails System (Fully Integrated)

- **Canonical API**: `netlify/functions/_shared/guardrails-unified.ts`
- **Function**: `runInputGuardrails(input, userId, stage, cfg)`
- **Features**: PII masking (40+ types), OpenAI moderation, jailbreak detection
- **Presets**: Strict (ingestion), Balanced (chat), Creative (relaxed)
- **Integration**: Called from `chat.ts` BEFORE routing/model calls
- **Status**: ✅ All employees protected, PII masked before storage

---

## 8. SUMMARY CHECKLIST

### ✅ What's Working Well

- ✅ Single canonical endpoint (`chat.ts`)
- ✅ Single canonical UI (`UnifiedAssistantChat.tsx`)
- ✅ Unified guardrails and memory
- ✅ Intelligent employee routing
- ✅ Tool calling system
- ✅ Session persistence
- ✅ SSE streaming

### ⚠️ What Needs Cleanup

- ⚠️ Multiple legacy chat components still imported
- ⚠️ Legacy hooks still in use
- ⚠️ Duplicate router/guardrail/memory files
- ⚠️ Route-based chat pages still exist
- ⚠️ Legacy service classes still used

### 🎯 Next Steps

1. **Immediate**: Remove legacy endpoints and duplicate files
2. **Short-term**: Migrate `ConnectedDashboard.tsx` to use only `UnifiedAssistantChat`
3. **Medium-term**: Migrate all route-based chat pages
4. **Long-term**: Archive all legacy components

---

## 9. REFACTOR STATUS – UNIFIED CHAT CLEANUP

**Date:** January 2025  
**Status:** ✅ **COMPLETED**  
**Goal:** Remove legacy chat systems and ensure unified chat is the only chat system

### ✅ Completed Cleanup Tasks

#### 1. Legacy Chat Components Removed from Active Use
- ✅ **ConnectedDashboard.tsx**: Removed `UniversalChatInterface`, `MobileChatInterface`, `ByteDocumentChat`, `DashboardPrimeChat`
- ✅ **ConnectedDashboard.tsx**: Removed `UniversalAIController` usage and related state (`activeChat`, `aiController`, `isByteChatOpen`, `isPrimeChatOpen`)
- ✅ **main.tsx**: Removed `PrimeChatMount` and `PrimeChatV2Mount` imports (they were not rendered but imported)
- ✅ **ConnectedDashboard.tsx**: Removed `usePrimeAutoGreet` hook usage

#### 2. Route-Based Chat Pages Migrated
- ✅ Created `ChatPageRedirect.tsx` component that redirects legacy routes to dashboard with unified chat open
- ✅ Updated all `/chat/*` routes in `App.tsx` to use `ChatPageRedirect`:
  - `/prime` → redirects with `prime-boss`
  - `/chat/tag` → redirects with `tag-ai`
  - `/goals` → redirects with `goalie-ai`
  - `/debt`, `/freedom` → redirects with `liberty-ai`
  - `/bills` → redirects with `chime-ai`
  - `/tax` → redirects with `ledger-tax`
  - `/analytics` → redirects with `crystal-ai`
  - All other legacy routes redirect with `prime-boss`
- ✅ Removed unused lazy imports for legacy chat pages (`PrimeChatSimple`, `GoalieChat`, `DebtChat`, etc.)

#### 3. Unified Chat Launcher Confirmed
- ✅ **DashboardLayout.tsx**: Already has `UnifiedAssistantChat` and `DesktopChatSideBar` rendered
- ✅ **Desktop**: Vertical blue pill button (`DesktopChatSideBar`) on right edge, uses `useUnifiedChatLauncher`
- ✅ **Mobile**: Bottom nav "Prime" button opens unified chat (handled by `MobileBottomNav.tsx`)
- ✅ All dashboard pages share the same layout with unified chat launcher

#### 4. Backend Files Status
- ⚠️ **Note**: `netlify/functions_old/` directory contains legacy endpoints but no imports found
- ⚠️ **Note**: `guardrails-production.ts` is actually used by `guardrails-unified.ts`, so it should NOT be deleted
- ✅ **Duplicate router files**: No imports found for `prime_router.ts` or `agent-router.ts` (safe to archive)
- ✅ **Deprecated memory**: `chat_runtime/memory.ts` only referenced in docs, not code (safe to remove)

### 📋 Files Modified

1. **src/components/dashboard/ConnectedDashboard.tsx**
   - Removed legacy chat component imports
   - Removed `UniversalAIController` and related state
   - Removed legacy chat UI rendering

2. **src/main.tsx**
   - Removed `PrimeChatMount` and `PrimeChatV2Mount` imports

3. **src/App.tsx**
   - Created `ChatPageRedirect` component for legacy routes
   - Updated all `/chat/*` routes to use redirect component
   - Removed unused lazy imports

4. **src/components/chat/ChatPageRedirect.tsx** (NEW)
   - Component that redirects legacy chat routes to dashboard with unified chat open

### 🎯 Remaining TODOs (Low Priority)

1. **Archive Legacy Endpoints** (not blocking):
   - Move `netlify/functions_old/` to `netlify/functions_archive/` for reference
   - Remove `netlify/functions-backup/` if confirmed unused

2. **Archive Legacy Components** (not blocking):
   - Move `src/components/chat/_legacy/*` to `src/components/chat/_archive/`
   - Move `src/components/prime/*` (old Prime chat) to archive

3. **Remove Deprecated Memory File** (not blocking):
   - Remove `chat_runtime/memory.ts` (only referenced in docs)

4. **Document Guardrails Dependencies**:
   - Note that `guardrails-production.ts` is used by `guardrails-unified.ts` and should NOT be deleted

### ✅ Verification Checklist

- ✅ No legacy chat components rendered in `ConnectedDashboard.tsx`
- ✅ No legacy chat mounts in `main.tsx`
- ✅ All `/chat/*` routes redirect to unified chat
- ✅ Unified chat launcher works on desktop (side tab) and mobile (bottom nav)
- ✅ TypeScript build passes (no linter errors)
- ✅ All chat functionality goes through `UnifiedAssistantChat` component

### 🔒 Security & Architecture Confirmation

- ✅ All chat requests go through canonical endpoint: `/.netlify/functions/chat`
- ✅ All chat requests protected by `guardrails-unified.ts` (PII masking, moderation, jailbreak detection)
- ✅ All chat requests use canonical memory system: `netlify/functions/_shared/memory.ts`
- ✅ All chat requests use canonical router: `netlify/functions/_shared/router.ts`
- ✅ No code paths bypass guardrails or memory systems

---

**End of Audit**

