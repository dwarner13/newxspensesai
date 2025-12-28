# System Map

**Purpose:** Quick navigation guide for jumping to any area of the XspensesAI codebase in Cursor.

---

## Frontend Routes

### Dashboard Pages
- **Prime Chat:** `src/pages/dashboard/PrimeChatPage.tsx`
- **Smart Import (Byte):** `src/pages/dashboard/SmartImportChatPage.tsx`
- **Smart Categories (Tag):** `src/pages/dashboard/SmartCategoriesPage.tsx`
- **Analytics (Crystal):** `src/pages/dashboard/AnalyticsPage.tsx`
- **Transactions:** `src/pages/dashboard/DashboardTransactionsPage.tsx`
- **Settings:** `src/pages/dashboard/SettingsPage.tsx`

### Route Configuration
- **Main Router:** `src/App.tsx`
- **Route Definitions:** `src/navigation/nav-registry.tsx`

---

## Chat UI Components

### Core Chat Components
- **UnifiedAssistantChat:** `src/components/chat/UnifiedAssistantChat.tsx` - Main chat interface for all employees
- **ChatInputBar:** `src/components/chat/ChatInputBar.tsx` - Input bar with "+" button menu
- **PrimeSlideoutShell:** `src/components/prime/PrimeSlideoutShell.tsx` - Slideout panel shell with scroll container
- **ByteUploadPanel:** `src/components/chat/ByteUploadPanel.tsx` - Byte's upload UI with dropzone

### Chat Hooks
- **usePrimeChat:** `src/hooks/usePrimeChat.ts` - Core chat engine hook
- **useUnifiedChatEngine:** `src/hooks/useUnifiedChatEngine.ts` - Unified chat engine
- **useUnifiedChatLauncher:** `src/hooks/useUnifiedChatLauncher.ts` - Chat launcher hook

### Chat Configuration
- **Employee Chat Config:** `src/config/employeeChatConfig.ts` - Greetings, quick actions, prompts
- **Employee Display Config:** `src/config/employeeDisplayConfig.ts` - Display names, subtitles

---

## Netlify Functions Entry Points

### Core Functions
- **chat.ts:** `netlify/functions/chat.ts` - Main chat endpoint (POST), handles all employees
- **guardrails-health.ts:** `netlify/functions/guardrails-health.ts` - Guardrails health check (GET)
- **prime-state.ts:** `netlify/functions/prime-state.ts` - Prime state endpoint (GET)
- **prime-live-stats.ts:** `netlify/functions/prime-live-stats.ts` - Prime live stats (GET)
- **activity-feed.ts:** `netlify/functions/activity-feed.ts` - Activity feed endpoint (GET)

### Smart Import Functions
- **smart-import-init.ts:** `netlify/functions/smart-import-init.ts` - Initialize upload (POST)
- **smart-import-finalize.ts:** `netlify/functions/smart-import-finalize.ts` - Finalize upload (POST)
- **smart-import-ocr.ts:** `netlify/functions/smart-import-ocr.ts` - OCR processing (POST)
- **normalize-transactions.ts:** `netlify/functions/normalize-transactions.ts` - Parse OCR → transactions (POST)

### Shared Utilities
- **Shared Code:** `netlify/functions/_shared/` - Common utilities, guardrails, OCR providers, etc.

---

## Agent Tools

### Tool Registry
- **Tool Index:** `src/agent/tools/index.ts` - Tool registry and `pickTools()` function

### Document Tools (Byte)
- **get_recent_documents:** `src/agent/tools/impl/get_recent_documents.ts` - List recent documents
- **get_document_by_id:** `src/agent/tools/impl/get_document_by_id.ts` - Get document with OCR text
- **get_transactions_by_document:** `src/agent/tools/impl/get_transactions_by_document.ts` - Get transactions linked to document

### Other Tools
- **request_employee_handoff:** `src/agent/tools/impl/request_employee_handoff.ts` - Transfer to another employee
- **transactions_query:** `src/agent/tools/impl/transactions_query.ts` - Query transactions
- **tag_category_brain:** `src/agent/tools/impl/tag_category_brain.ts` - Tag's categorization tool

---

## Supabase Tables

### Chat & Sessions
- **chat_sessions:** Chat session metadata (employee_slug, user_id, created_at)
- **chat_messages:** Messages (role, content, tool_calls, employee_slug, session_id)
- **handoffs:** Employee handoff records (from_employee, to_employee, status)

### Documents & Imports
- **user_documents:** Document metadata (id, user_id, original_name, status, ocr_text, storage_path)
- **imports:** Import job tracking (id, user_id, document_id, status, file_url)
- **transactions_staging:** Parsed transactions before commit
- **transactions:** Final transactions (id, user_id, date, merchant, amount, category, document_id)

### Employee System
- **employee_profiles:** AI employee configs (slug, system_prompt, tools_allowed, model, temperature)
- **employee_runtime_audit:** Tool execution audit logs (employee_slug, tool_id, execution_time_ms)

### User Data
- **profiles:** User profiles (id, first_name, display_name, metadata, onboarding_status)
- **auth.users:** Supabase auth users (id, email, user_metadata)

---

## Quick Search Patterns

### Cursor Search Shortcuts
- Search for `// ====== PRIME CHAT UI ======` → Jump to Prime chat UI code
- Search for `// ====== BYTE UPLOAD PANEL ======` → Jump to Byte upload code
- Search for `// ====== CHAT SEND / RECEIVE ======` → Jump to chat message handling
- Search for `// ====== GUARDRAILS HEALTH ======` → Jump to guardrails health endpoint
- Search for `// ====== PRIME STATE / LIVE STATS ======` → Jump to Prime state endpoints

### Component Search
- `@wiring:byte-docs` → Byte-related code markers
- `employeeSlug === 'byte-docs'` → Byte-specific logic
- `normalizedSlug === 'byte-docs'` → Byte normalization

---

## Build & Dev Scripts

### Local Development
- **`npm run dev:netlify`** - Start Netlify Dev with function watching
- **`npm run functions:dev`** - Watch and build functions (uses cross-env for Windows)
- **`npm run functions:build`** - Build functions once

### Function Build Process
- **Build Script:** `scripts/build-functions.ts` - Builds all functions to `netlify/functions-dist/`
- **Netlify Config:** `netlify.toml` - Points to `netlify/functions-dist` directory

---

## Key Data Flows

### Document Upload Flow
1. User uploads → `smart-import-init.ts` → Creates `user_documents` record
2. File uploaded → `smart-import-finalize.ts` → Routes to OCR or CSV parser
3. OCR runs → `smart-import-ocr.ts` → Stores OCR text in `user_documents.ocr_text`
4. Parse runs → `normalize-transactions.ts` → Creates `transactions_staging` → `transactions`

### Chat Flow
1. User sends message → `ChatInputBar.tsx` → `usePrimeChat.send()`
2. Frontend → `/.netlify/functions/chat` (POST)
3. Backend → `netlify/functions/chat.ts` → Routes to employee → Executes tools → Streams response
4. Response saved → `chat_messages` table → Tool calls logged → `employee_runtime_audit` table

### Byte Document Retrieval Flow
1. User asks about documents → Byte calls `get_recent_documents` tool
2. Tool queries → `user_documents` table (filtered by user_id)
3. Byte calls → `get_document_by_id` tool → Gets OCR text
4. Byte summarizes → Offers handoff to Tag for categorization





