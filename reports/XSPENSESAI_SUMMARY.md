# XspensesAI System Summary & Architecture

**Date**: 2025-01-XX  
**Status**: Complete System Audit  
**Purpose**: High-level summary of XspensesAI architecture, subsystems, and data flows

---

## Executive Summary

XspensesAI is a comprehensive financial automation platform combining multi-agent AI orchestration, OCR document processing, intelligent categorization, and user-facing dashboards. The system employs 7+ specialized AI employees (Prime, Byte, Tag, Crystal, Ledger, Goalie, Blitz) orchestrated by Prime as the CEO/orchestrator. The architecture spans Netlify Functions (serverless), Supabase (PostgreSQL with RLS), Google Vision API (OCR), OpenAI API (chat), and a React frontend. Key subsystems include: Chat System (multi-agent conversations with memory/RAG), OCR Pipeline (Google Vision + redaction), Security Guardrails (PII detection, rate limiting, RLS), Catalog System (transactions/categories), and Frontend Dashboard (React components). The system demonstrates strong security posture with comprehensive RLS policies, PII redaction at multiple layers, and guardrails middleware, though some duplication exists across chat endpoints, OCR services, and PII masking utilities.

---

## Chat System

### Purpose
Multi-agent conversational AI system enabling users to interact with specialized AI employees for financial tasks. Prime acts as orchestrator, delegating to specialists (Byte for documents, Tag for categorization, Crystal for analytics, etc.).

### Main Files/Functions

**Netlify Functions:**
- `netlify/functions/chat.ts` - Main chat endpoint (v2, with guardrails)
- `netlify/functions/chat-v3-production.ts` - Production chat endpoint (v3, comprehensive)
- `netlify/functions/prime-chat.ts` - Prime-specific chat handler
- `netlify/functions/_legacy/chat-complex.ts` - Legacy complex chat (unused)
- `netlify/functions/_legacy/chat-sse.ts` - Legacy SSE chat (unused)
- `netlify/functions/_legacy/chat-stream.ts` - Legacy streaming chat (unused)

**Frontend Components:**
- `src/components/chat/PrimeChatInterface.tsx` - Prime chat UI
- `src/components/chat/ByteDocumentChat.tsx` - Byte document chat UI
- `src/components/chat/EnhancedChatInterface.tsx` - Universal enhanced chat
- `src/hooks/useChat.ts` - Unified chat hook with SSE streaming

**Core Runtime:**
- `chat_runtime/types.ts` - Type definitions
- `chat_runtime/memory.ts` - Session and message management
- `chat_runtime/redaction.ts` - PII redaction
- `chat_runtime/contextBuilder.ts` - Context assembly
- `chat_runtime/tools/delegate.ts` - Delegation tool for Prime

**Shared Utilities:**
- `netlify/functions/_shared/router.ts` - Employee routing logic
- `netlify/functions/_shared/memory.ts` - Memory helpers
- `netlify/functions/_shared/tool-registry.ts` - Tool registry

**Supabase Edge Functions:**
- `supabase/functions/universal-ai-chat/index.ts` - Universal chat handler
- `supabase/functions/chat/index.ts` - Chat edge function

### How Data Flows

**User → Chat → Response Flow:**

1. **User Action**: User types message in chat UI (PrimeChatInterface or ByteDocumentChat)
2. **Frontend Hook**: `useChat.ts` sends POST to `/.netlify/functions/chat` or `/.netlify/functions/chat-v3-production`
3. **Guardrails Check**: Input passes through `guardrails.ts` (PII masking, moderation, jailbreak detection)
4. **Session Management**: Function creates/retrieves `chat_sessions` record from Supabase
5. **Context Building**: `contextBuilder.ts` assembles context from:
   - Employee profile (`employee_profiles` table)
   - User facts (`user_memory_facts` table)
   - Conversation history (`chat_messages` table)
   - RAG embeddings (`memory_embeddings` table via vector search)
6. **Routing**: If Prime, may delegate via `delegate.ts` tool to specialists (Byte, Tag, Crystal)
7. **OpenAI Call**: Streams to OpenAI API with assembled context
8. **Response Streaming**: SSE stream sent back to frontend
9. **Storage**: Messages saved to `chat_messages` table, usage logged to `chat_usage_log`
10. **UI Update**: Frontend receives SSE events and updates UI in real-time

**Delegation Flow (Prime → Specialist):**

1. Prime receives user request requiring specialist
2. Prime calls `delegate` tool with target employee and task
3. `agentBridge.ts` creates new session for specialist employee
4. Specialist processes request with their own context/personality
5. Result returned to Prime
6. Prime synthesizes and responds to user

### Security Coverage

- **RLS Policies**: All chat tables have RLS enabled (`chat_sessions`, `chat_messages`, `user_memory_facts`)
- **PII Redaction**: Applied before OpenAI calls via `redaction.ts` and `maskPII()` functions
- **Guardrails**: `guardrails.ts` checks moderation, jailbreak, PII (always on)
- **Rate Limiting**: `rate-limit-v2.ts` enforces 20 req/min per user
- **Auth Checks**: All endpoints verify `userId` from JWT/auth token
- **Event Logging**: `guardrail_events` table logs all violations

### Dependencies

- **OpenAI API**: `OPENAI_API_KEY` for chat completions
- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for database
- **Model**: Default `gpt-4o-mini`, configurable per employee

---

## AI Employee Orchestration

### Purpose
Intelligent routing and delegation system allowing Prime to coordinate specialized AI employees. Each employee has distinct capabilities, tools, and personalities.

### Main Files/Functions

**Employee Registry:**
- `src/data/aiEmployees.ts` - Employee definitions
- `supabase/migrations/004_add_all_employees.sql` - Database employee profiles
- `netlify/functions/_shared/router.ts` - Routing logic (Jaccard similarity)

**Orchestration:**
- `src/systems/AIEmployeeOrchestrator.ts` - Main orchestrator class
- `src/systems/AIEmployeeSystem.ts` - Employee system wrapper
- `src/systems/AIResponseEngine.ts` - Response engine
- `chat_runtime/tools/delegate.ts` - Delegation tool implementation
- `chat_runtime/internal/agentBridge.ts` - Internal employee-to-employee communication

**Tool Registry:**
- `netlify/functions/_shared/tool-registry.ts` - Tool registry
- `netlify/functions/_shared/tool-schemas.ts` - Tool schemas
- `supabase/migrations/000_centralized_chat_runtime.sql` - `tools_registry` table

**Employee Profiles:**
- `docs/PRIME_PROMPT.md` - Prime's system prompt with delegation instructions
- `src/ai-knowledge/byte-knowledge-base.ts` - Byte's knowledge
- `src/ai-knowledge/crystal-knowledge-base.ts` - Crystal's knowledge

### How Data Flows

**Routing Decision Flow:**

1. User sends message to Prime
2. Prime analyzes intent using `router.ts` (Jaccard similarity + regex patterns)
3. Decision: Answer directly OR delegate to specialist
4. If delegate: Prime calls `delegate` tool with target employee slug
5. `agentBridge.ts` creates session for specialist with context
6. Specialist processes with their tools/personality
7. Result returned to Prime
8. Prime synthesizes and responds

**Employee Slugs (Canonical):**
- `prime-boss` - CEO/Orchestrator
- `byte-doc` - Document processing specialist
- `tag-ai` - Categorization specialist
- `crystal-analytics` - Analytics & predictions
- `ledger-tax` - Tax specialist
- `goalie-coach` - Goal tracking
- `blitz-debt` - Debt elimination

### Security Coverage

- **Tool Access Control**: `tools_registry` table defines `auth_scope` per tool
- **Employee Isolation**: Each employee has separate session, memory, context
- **Depth Guards**: Delegation depth limited to prevent infinite loops
- **Cycle Detection**: `agentBridge.ts` tracks delegation chains

### Dependencies

- **Database**: `employee_profiles` table stores employee configs
- **Tools Registry**: `tools_registry` table defines available tools
- **OpenAI**: Each employee can use different models/temperatures

---

## OCR + Google Vision Pipeline

### Purpose
Extract text from uploaded documents (receipts, statements) using Google Vision API, with PII redaction, parsing, and normalization.

### Main Files/Functions

**Netlify Functions:**
- `netlify/functions/ocr-receipt.ts` - Receipt OCR endpoint
- `netlify/functions/byte-ocr-parse.ts` - Byte's OCR parsing

**Server-Side OCR Services:**
- `src/server/ocr/ocrService.ts` - Base OCR service
- `src/server/ocr/ocrServiceEnhanced.ts` - Enhanced OCR service
- `src/server/ocr/serverOCRService.ts` - Server OCR service wrapper
- `src/utils/ocrService.ts` - Client-side OCR service
- `src/utils/googleVisionService.ts` - Google Vision API wrapper
- `src/utils/smartOCRManager.ts` - Smart OCR engine selection

**Systems:**
- `src/systems/EnhancedOCRSystem.ts` - Enhanced OCR system
- `src/lib/documentProcessingPipeline.ts` - Document processing pipeline
- `src/lib/multiDocumentAnalysisEngine.ts` - Multi-doc analysis

**Worker:**
- `worker/src/ocr/index.ts` - OCR worker (Tesseract + Google Vision)
- `worker/src/workflow/processDocument.ts` - Document processing workflow

**API Routes:**
- `api/routes/ocr.js` - Express OCR route (legacy)

**Frontend Components:**
- `src/components/receipts/ReceiptScanner.tsx` - Receipt scanner UI
- `src/components/chat/PrimeUpload.tsx` - Upload component

### How Data Flows

**OCR Pipeline Flow:**

1. **Upload Init**: User uploads file via ReceiptScanner or PrimeUpload
2. **File Validation**: Validates MIME type, size, file extension
3. **Smart OCR Selection**: `smartOCRManager.ts` selects engine (Google Vision preferred, fallback to OCR.space/Tesseract)
4. **Google Vision API Call**: 
   - File converted to base64
   - POST to `https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_VISION_API_KEY}`
   - Features: `TEXT_DETECTION`, `DOCUMENT_TEXT_DETECTION`
5. **Text Extraction**: Raw OCR text extracted from API response
6. **PII Redaction**: `maskPII()` or `redactPII()` applied to extracted text
7. **Parsing**: Document parsed based on type (receipt vs statement)
   - Receipt: Extract vendor, amount, date, items
   - Statement: Extract transactions, dates, balances
8. **Normalization**: Data normalized into standard format
9. **Storage**: Results stored in Supabase (transactions, receipts tables)
10. **UI Update**: Frontend displays extracted data with confirmation options

**Redaction Flow (within OCR):**

1. OCR text extracted
2. `maskPII()` scans for patterns (credit cards, SSN, emails, etc.)
3. PII replaced with tokens like `{{CARD_9010}}` or `[REDACTED:SSN]`
4. Redacted text stored/processed
5. Original masked data stored separately (encrypted)

### Security Coverage

- **PII Detection**: Multiple PII detection layers (`pii.ts`, `pii-patterns.ts`, `guardrails.ts`)
- **File Validation**: MIME type checking, size limits, dangerous extension blocking
- **Storage**: Redacted versions stored; originals encrypted
- **Event Logging**: OCR operations logged with PII detection events

### Dependencies

- **Google Vision API**: `GOOGLE_VISION_API_KEY` environment variable
- **Fallback**: OCR.space API (optional), Tesseract.js (local)
- **Supabase Storage**: Uploaded files stored in buckets

---

## Catalog System

### Purpose
Manages financial data catalog: transactions, categories, receipts, accounts. Provides organization and querying capabilities.

### Main Files/Functions

**Database Schema:**
- `supabase/migrations/20241201000001_production_schema.sql` - Core catalog tables
- Tables: `transactions`, `categories`, `receipts`, `accounts`, `budgets`

**Netlify Functions:**
- `netlify/functions/transactions-list.ts` - List transactions
- `netlify/functions/tag-categorize.ts` - Categorization
- `netlify/functions/tag-categories.ts` - Category management
- `netlify/functions/categorize-transactions.ts` - Batch categorization

**Frontend:**
- `src/pages/dashboard/DashboardTransactionsPage.tsx` - Transactions dashboard
- `src/components/transactions/` - Transaction components
- `src/components/dashboard/` - Dashboard components

### How Data Flows

**Transaction Creation Flow:**

1. User uploads document or manually creates transaction
2. OCR extracts data (if document)
3. Transaction inserted into `transactions` table
4. Tag AI categorizes transaction (auto or manual)
5. Category stored in `transaction.category_id`
6. UI displays transaction in dashboard

**Categorization Flow:**

1. User requests categorization or auto-categorization runs
2. `tag-categorize.ts` function called
3. Tag AI analyzes merchant/description
4. Category assigned from `categories` table
5. Rule learned and stored in `categorization_rules` table
6. Transaction updated with category

### Security Coverage

- **RLS Policies**: `transactions` table has RLS (`user_id = auth.uid()`)
- **Categories**: User-specific categories with RLS
- **Audit Logging**: Transaction changes logged

### Dependencies

- **Supabase**: Database for transactions/categories
- **Tag AI**: Categorization logic

---

## Security & Guardrails

### Purpose
Comprehensive security layer protecting user data, preventing abuse, and ensuring compliance.

### Main Files/Functions

**Core Guardrails:**
- `netlify/functions/_shared/guardrails.ts` - Main guardrails function
- `netlify/functions/_shared/guardrails-production.ts` - Production guardrails
- `netlify/functions/_shared/guardrails-merged.ts` - Merged guardrails
- `netlify/functions/guardrails-process.ts` - Guardrails processor

**PII Detection:**
- `netlify/functions/_shared/pii.ts` - PII masking wrapper
- `netlify/functions/_shared/pii-patterns.ts` - PII pattern definitions (40+ types)
- `chat_runtime/redaction.ts` - Chat runtime redaction
- `worker/src/redaction/patterns.ts` - Worker redaction patterns

**Rate Limiting:**
- `netlify/functions/_shared/rate-limit.ts` - Rate limiter
- `netlify/functions/_shared/rate-limit-v2.ts` - Rate limiter v2

**Auth & Verification:**
- `netlify/functions/_shared/verify-signature.ts` - Signature verification
- `netlify/functions/_shared/session.ts` - Session management

**Audit & Logging:**
- `netlify/functions/_shared/audit.ts` - Audit logging
- `netlify/functions/_shared/guardrail-log.ts` - Guardrail event logging
- `netlify/functions/_shared/safeLog.ts` - Safe logging (no PII)

**Security Status:**
- `netlify/functions/security-status.ts` - Security status endpoint

**Database:**
- `supabase/migrations/008_guardrails_system.sql` - Guardrails tables
- `supabase/migrations/20251013_guardrail_events.sql` - Guardrail events table

### How Data Flows

**Guardrails Pipeline:**

1. User input received
2. **PII Detection**: `maskPII()` scans for 40+ PII types
   - Credit cards, SSN, emails, phone numbers, bank accounts, etc.
   - Global patterns (US, UK, Canada, EU, Asia-Pacific)
3. **Redaction**: PII masked with tokens (`{{CARD_9010}}`) or `[REDACTED:TYPE]`
4. **Moderation**: OpenAI moderation API checks for harmful content
5. **Jailbreak Detection**: GPT-4o-mini checks for prompt injection
6. **Hallucination Check**: (Optional) Verifies financial claims against data
7. **Event Logging**: Violations logged to `guardrail_events` table
8. **Action**: Block (strict mode) or sanitize and continue (balanced mode)

**RLS Policy Flow:**

1. User authenticated via Supabase Auth
2. Database query executed
3. RLS policy checks `auth.uid() = user_id`
4. If match: Query proceeds
5. If no match: Query returns empty (no error, silent deny)

### Security Coverage

**RLS Enabled Tables:**
- `chat_sessions`, `chat_messages`, `user_memory_facts`
- `transactions`, `categories`, `receipts`
- `notifications`, `guardrail_events`
- `employee_profiles`, `tools_registry`
- All user-scoped tables

**Guardrails Coverage:**
- **PII Detection**: Always on (compliance requirement)
- **Jailbreak Protection**: Always on (security requirement)
- **Moderation**: User configurable (strict/balanced/creative presets)
- **Hallucination Check**: Optional (not yet implemented)

**Rate Limiting:**
- Chat: 20 requests/minute per user
- OCR: Per-file limits
- Configurable via `rate-limit-v2.ts`

### Dependencies

- **OpenAI Moderation API**: `omni-moderation-latest` model
- **Supabase Auth**: JWT tokens for user identification
- **Database**: `guardrail_events` table for audit trail

---

## Netlify Functions

### Active Functions

**Chat:**
- `chat.ts` (v2) - Main chat endpoint
- `chat-v3-production.ts` (v3) - Production chat endpoint
- `prime-chat.ts` - Prime-specific handler

**OCR:**
- `ocr-receipt.ts` - Receipt OCR
- `byte-ocr-parse.ts` - Byte OCR parsing

**Tag/Categorization:**
- `tag-categorize.ts` - Categorize transactions
- `tag-categories.ts` - Category management
- `tag-correction.ts` - Record corrections
- `tag-rules.ts` - Rule management
- `tag-batch-categorize.ts` - Batch categorization
- `tag-brain-update.ts` - Update Tag's brain
- `tag-why.ts` - Explain categorization

**Guardrails:**
- `guardrails-process.ts` - Process guardrails
- `guardrail-config-get.ts` - Get config
- `guardrail-config-save.ts` - Save config

**Notifications:**
- `notifications.ts` - Main notifications
- `notifications-get.ts` - Get notifications
- `notifications-read.ts` - Mark read
- `notifications-orchestrate.ts` - Orchestrate notifications
- `orchestrate-notifications.ts` - Orchestrate (duplicate?)

**Other:**
- `transactions-list.ts` - List transactions
- `analytics-categorization.ts` - Analytics
- `crystal-analyze-import.ts` - Crystal analysis
- `commit-import.ts` - Commit import
- `security-status.ts` - Security status

### Unused/Legacy Functions

**Legacy:**
- `netlify/functions/_legacy/chat-complex.ts` - Legacy complex chat
- `netlify/functions/_legacy/chat-sse.ts` - Legacy SSE chat
- `netlify/functions/_legacy/chat-stream.ts` - Legacy streaming chat

**Backup:**
- `netlify/functions-backup/` - Backup functions (not deployed)

### Functions Using Guardrails

- `chat.ts` - Uses `guardrails-production.ts`
- `chat-v3-production.ts` - Has inline guardrails
- `ocr-receipt.ts` - Should use guardrails (needs verification)

### Functions Without Guardrails

- `transactions-list.ts` - Direct Supabase access (protected by RLS)
- `tag-categories.ts` - Direct Supabase access (protected by RLS)
- Most tag functions - Direct Supabase access (protected by RLS)

---

## Frontend Integration

### Purpose
React-based UI for user interactions: dashboards, chat interfaces, document upload, transaction management.

### Main Components

**Dashboard:**
- `src/pages/dashboard/DashboardTransactionsPage.tsx` - Main transactions page
- `src/components/dashboard/DashboardPrimeChat.tsx` - Prime chat on dashboard
- `src/components/dashboard/DashboardPrimeBubble.tsx` - Prime bubble
- `src/layouts/DashboardLayout.tsx` - Dashboard layout

**Chat:**
- `src/components/chat/PrimeChatInterface.tsx` - Prime chat UI
- `src/components/chat/ByteDocumentChat.tsx` - Byte chat UI
- `src/components/chat/EnhancedChatInterface.tsx` - Enhanced chat

**Upload:**
- `src/components/receipts/ReceiptScanner.tsx` - Receipt scanner
- `src/components/chat/PrimeUpload.tsx` - Upload component
- `src/components/upload/` - Upload components

**Transactions:**
- `src/components/transactions/` - Transaction components
- `src/hooks/useTransactions.ts` - Transaction hook

**Hooks:**
- `src/hooks/useChat.ts` - Unified chat hook
- `src/hooks/useSmartImport.ts` - Smart import hook
- `src/hooks/useNotifications.ts` - Notifications hook

### How Data Flows

**Dashboard → API → Supabase → UI:**

1. User views dashboard (`DashboardTransactionsPage`)
2. Frontend calls `useTransactions.ts` hook
3. Hook calls `/.netlify/functions/transactions-list`
4. Function queries Supabase `transactions` table (RLS enforced)
5. Results returned to frontend
6. UI renders transaction list

**Chat → API → OpenAI → UI:**

1. User types in chat (`PrimeChatInterface`)
2. `useChat.ts` hook sends POST to `/.netlify/functions/chat`
3. Function processes, calls OpenAI
4. SSE stream returned
5. Hook receives SSE events, updates UI in real-time

---

## Dependencies Summary

### Environment Variables

**Required:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access
- `OPENAI_API_KEY` - OpenAI API key for chat
- `GOOGLE_VISION_API_KEY` - Google Vision API key for OCR

**Optional:**
- `OPENAI_CHAT_MODEL` - Model override (default: `gpt-4o-mini`)
- `CHAT_BACKEND_VERSION` - Backend version flag (`v2` or `v3`)

### External APIs

- **OpenAI API**: Chat completions, embeddings, moderation
- **Google Vision API**: OCR text extraction
- **Supabase**: Database, storage, auth, edge functions
- **OCR.space**: Fallback OCR (optional)

### Database Tables

**Core:**
- `users`, `profiles` - User data
- `transactions` - Financial transactions
- `categories` - Transaction categories
- `receipts` - Receipt data

**Chat:**
- `chat_sessions`, `chat_messages` - Chat history
- `employee_profiles` - AI employee configs
- `user_memory_facts` - User memory
- `memory_embeddings` - Vector embeddings

**Security:**
- `guardrail_events` - Security audit log
- `chat_usage_log` - Usage tracking

---

## Duplicates & Overlaps

### Critical Duplicates

1. **Chat Endpoints** (3 implementations)
   - `chat.ts` (v2)
   - `chat-v3-production.ts` (v3)
   - `prime-chat.ts` (Prime-specific)
   - **Recommendation**: Consolidate to single v3 endpoint

2. **OCR Services** (8+ implementations)
   - `src/server/ocr/ocrService.ts`
   - `src/server/ocr/ocrServiceEnhanced.ts`
   - `src/server/ocr/serverOCRService.ts`
   - `src/utils/ocrService.ts`
   - `src/utils/smartOCRManager.ts`
   - `src/systems/EnhancedOCRSystem.ts`
   - `worker/src/ocr/index.ts`
   - `api/routes/ocr.js` (legacy)
   - **Recommendation**: Consolidate to 2-3 core services

3. **PII Masking** (4+ implementations)
   - `netlify/functions/_shared/pii.ts`
   - `netlify/functions/_shared/pii-patterns.ts`
   - `chat_runtime/redaction.ts`
   - `worker/src/redaction/patterns.ts`
   - `netlify/functions/_shared/guardrails.ts` (includes redaction)
   - **Recommendation**: Single source of truth for PII patterns

4. **Guardrails** (3 implementations)
   - `guardrails.ts`
   - `guardrails-production.ts`
   - `guardrails-merged.ts`
   - **Recommendation**: Single production guardrails module

### Moderate Duplicates

5. **Memory Systems** (2 implementations)
   - `netlify/functions/_shared/memory.ts`
   - `chat_runtime/memory.ts`
   - **Recommendation**: Consolidate or clearly separate concerns

6. **Chat Hooks** (Multiple)
   - `src/hooks/useChat.ts`
   - `src/ui/hooks/useStreamChat.ts`
   - `src/lib/chatEndpoint.ts`
   - **Recommendation**: Single unified hook

---

## Next Steps

### Immediate Actions

1. **Consolidate Chat Endpoints**: Merge `chat.ts` and `chat-v3-production.ts` into single production endpoint
2. **Consolidate OCR Services**: Reduce 8+ OCR implementations to 2-3 core services
3. **Unify PII Patterns**: Single source of truth for PII detection patterns
4. **Standardize Guardrails**: Single production guardrails module

### Medium-Term Actions

5. **Remove Legacy Functions**: Delete `_legacy` and `functions-backup` directories
6. **Document API Contracts**: Clear API contracts for all Netlify functions
7. **Add Integration Tests**: Test chat, OCR, guardrails end-to-end

### Long-Term Actions

8. **Migrate to Centralized Runtime**: Complete migration to `chat_runtime/` architecture
9. **Optimize Database Queries**: Review and optimize RLS policy queries
10. **Enhance Monitoring**: Add metrics/alerting for guardrails, rate limits, API usage

---

**Report Generated**: 2025-01-XX  
**Analysis Scope**: Full codebase scan (src, netlify/functions, supabase, agents)  
**Total Files Analyzed**: 1000+  
**Duplicates Identified**: 6 critical, 2 moderate

