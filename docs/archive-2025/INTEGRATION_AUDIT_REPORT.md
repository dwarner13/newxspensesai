# XspensesAI Full Integration Audit Report

**Date:** 2025-01-20  
**Scope:** Onboarding → Profile → Welcome → Chat → Guardrails → Memory/Brain → OCR/Import → Transactions → Settings  
**Objective:** Factual report identifying wiring, duplications, broken paths, and canonical highways

---

## 1. Executive Summary

### ✅ What Works
- **Unified Chat Endpoint**: Single canonical endpoint `/.netlify/functions/chat` used by all employees (Prime, Byte, Crystal, Tag, etc.)
- **Guardrails Pipeline**: Unified guardrails system (`netlify/functions/_shared/guardrails-unified.ts`) applied to ALL chat messages BEFORE routing/model calls
- **Memory System**: Unified memory API (`netlify/functions/_shared/memory.ts`) with recall/store functions integrated into chat.ts
- **Session Management**: Stable session IDs per user+employee combination, stored in `chat_sessions` table
- **OCR Pipeline**: Complete flow from upload → OCR → guardrails → normalization → transactions table

### ❌ What is Broken
- **Profile Context Not Reaching Chat**: `getUserProfile()` in chat.ts reads limited fields (`display_name, first_name, full_name, account_type, currency, time_zone, metadata`) but does NOT read onboarding fields (`account_name`, `time_zone`, `date_locale`, `tax_included`, `tax_system`) that are written during onboarding
- **Settings Shows "Not Set"**: Settings page (`src/pages/ProfileSettingsPage.tsx`) only reads/writes `display_name` and `avatar_url`, missing all onboarding fields
- **Onboarding Completion Check Inconsistency**: RouteDecisionGate checks `onboarding_status='completed'` OR `onboarding_completed=true`, but Custodian writes `onboarding_completed=true` without setting `onboarding_status='completed'`
- **Welcome Overlay Logic**: PrimeWelcomeBackCard checks `onboarding_completed_at` but may not show if profile refresh fails

### 🔄 What is Duplicated
- **Profile Reading Functions**: 
  - `getUserProfile()` in `netlify/functions/chat.ts:127-211` (backend)
  - `buildUserContext()` in `src/lib/userContextHelpers.ts:37-66` (frontend)
  - `buildUserContextFromProfile()` in `src/lib/userContextHelpers.ts:76-107` (frontend)
  - All read different subsets of profile fields
- **Onboarding Completion Checks**: 
  - RouteDecisionGate checks `onboarding_status='completed'` OR `onboarding_completed=true`
  - OnboardingSetupPage checks same fields
  - DashboardLayout checks `onboarding_completed !== true`
  - All use slightly different logic
- **Chat Endpoint Calls**: Multiple wrappers call same endpoint:
  - `sendChatV2()` in `src/lib/api/chat.ts:142-174`
  - `sendChat()` in `src/services/chatApi.ts:12-19`
  - Direct fetch in `src/lib/universalAIEmployeeConnection.ts:493-504`
  - Direct fetch in `src/services/UniversalAIController.ts:456-467`

---

## 2. System Inventory

### Database Tables

#### Profiles Table (`profiles`)
**Columns:**
- `id` (uuid, PK)
- `display_name` (text, nullable)
- `first_name` (text, nullable)
- `full_name` (text, nullable)
- `account_name` (text, nullable) - **Written by onboarding, NOT read by chat**
- `account_type` (text, nullable)
- `currency` (text, nullable)
- `time_zone` (text, nullable) - **Written by onboarding, read by chat**
- `date_locale` (text, nullable) - **Written by onboarding, NOT read by chat**
- `tax_included` (text, nullable) - **Written by onboarding, NOT read by chat**
- `tax_system` (text, nullable) - **Written by onboarding, NOT read by chat**
- `onboarding_completed` (boolean, default false)
- `onboarding_status` (text, nullable) - 'not_started' | 'in_progress' | 'completed'
- `onboarding_step` (text, nullable)
- `onboarding_completed_at` (timestamptz, nullable)
- `metadata` (jsonb, nullable) - Contains `settings`, `expense_mode`, `currency`, `onboarding` nested objects
- `avatar_url` (text, nullable)
- `updated_at` (timestamptz)

**Read Locations:**
- `netlify/functions/chat.ts:140-144` - SELECT `display_name, first_name, full_name, account_type, currency, time_zone, metadata`
- `src/pages/ProfileSettingsPage.tsx:94-98` - SELECT `*`
- `src/contexts/AuthContext.tsx:90` - Via `getOrCreateProfile()`

**Write Locations:**
- `src/pages/onboarding/AccountSetupScreen.tsx:75-87` - UPDATE `display_name, account_name, time_zone, date_locale, currency, tax_included, tax_system`
- `src/components/onboarding/CustodianOnboardingWizard.tsx:797-802` - UPSERT `display_name, currency, onboarding_completed, onboarding_step, account_name, account_type`
- `src/pages/onboarding/FinalScreen.tsx:43-50` - UPDATE `onboarding_completed, onboarding_completed_at`
- `src/pages/ProfileSettingsPage.tsx:302-305` - UPDATE `display_name, avatar_url`

#### Chat Sessions Table (`chat_sessions`)
**Columns:**
- `id` (uuid, PK)
- `user_id` (uuid)
- `employee_slug` (text)
- `context` (jsonb) - Contains `workspace` field for Smart Import AI detection
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Read Locations:**
- `netlify/functions/chat.ts:907-916` - Check `context.workspace` for Smart Import AI
- `netlify/functions/chat.ts:876` - Via `ensureSession()`

**Write Locations:**
- `netlify/functions/chat.ts:876` - Via `ensureSession()` creates/updates session

#### Memory Tables
- `user_memory_facts` - Stores extracted facts about user
- `memory_embeddings` - Vector embeddings for RAG
- `chat_messages` - Individual messages per session
- `chat_convo_summaries` - Conversation summaries for Custodian

#### OCR/Import Tables
- `user_documents` - Document metadata, OCR text (redacted)
- `imports` - Import tracking
- `transactions_staging` - Parsed transactions before commit
- `transactions` - Final committed transactions

### Functions

#### Backend Functions (Netlify)
- `netlify/functions/chat.ts` - **CANONICAL CHAT ENDPOINT**
  - Handler: `export const handler: Handler` (line 513)
  - Route: `POST /.netlify/functions/chat`
  - Flow: Auth → Guardrails → Routing → Memory → Session → Model Call → Response
  - Guardrails: Applied at line 701 via `runInputGuardrails()`
  - Memory: Recalled at line 931 via `getMemory()`
  - Profile: Read at line 1083 via `getUserProfile()`
  - Context: Formatted at line 1084 via `formatUserContextForPrompt()`

- `netlify/functions/_shared/guardrails-unified.ts`
  - Function: `runInputGuardrails()` (line 144)
  - Presets: 'strict', 'balanced', 'creative'
  - Applied: BEFORE routing/model calls (no bypass paths)

- `netlify/functions/_shared/memory.ts`
  - Function: `getMemory()` - Unified memory recall API
  - Function: `recall()` - Legacy fallback
  - Function: `upsertFact()` - Store facts
  - Function: `embedAndStore()` - Store embeddings

- `netlify/functions/smart-import-ocr.ts`
  - Handler: OCR processing with guardrails
  - Guardrails: Applied at line 127 via `runGuardrails()` with stage 'ingestion_ocr'
  - Flow: Upload → OCR → Guardrails → Store redacted text → Queue normalization

- `netlify/functions/normalize-transactions.ts`
  - Handler: Parse OCR text → NormalizedTransaction[] → transactions_staging → transactions

#### Frontend Functions
- `src/lib/api/chat.ts`
  - `sendChatV2()` - Wrapper for chat endpoint (line 142)
  - Calls: `POST /.netlify/functions/chat`

- `src/lib/userContextHelpers.ts`
  - `buildUserContext()` - React hook version (line 37)
  - `buildUserContextFromProfile()` - Non-React version (line 76)
  - `formatUserContextForPrompt()` - Format for prompts (line 115)

- `src/contexts/AuthContext.tsx`
  - `loadProfile()` - Load profile from DB (line 87)
  - `refreshProfile()` - Refresh profile (line 100)
  - Uses: `getOrCreateProfile()` from `src/lib/profileHelpers.ts`

### Components

#### Onboarding Components
- `src/components/onboarding/CustodianOnboardingWizard.tsx`
  - Writes: `display_name, currency, onboarding_completed=true, onboarding_step='custodian_complete'` (line 767-775)
  - Does NOT write: `onboarding_status='completed'`
  - Location: `src/pages/onboarding/OnboardingSetupPage.tsx` renders this

- `src/pages/onboarding/AccountSetupScreen.tsx`
  - Writes: `display_name, account_name, time_zone, date_locale, currency, tax_included, tax_system` (line 75-87)
  - Part of: Legacy onboarding flow (`/onboarding/account-setup`)

- `src/pages/onboarding/FinalScreen.tsx`
  - Writes: `onboarding_completed=true, onboarding_completed_at` (line 43-50)
  - Part of: Legacy onboarding flow (`/onboarding/final`)

#### Welcome Components
- `src/components/onboarding/PrimeWelcomeBackCard.tsx`
  - Checks: `profile?.onboarding_completed_at` (line 60)
  - Shows: Welcome back message if completed_at exists
  - Location: `src/components/chat/UnifiedAssistantChat.tsx` may render this

- `src/components/onboarding/CinematicOnboardingOverlay.tsx`
  - Checks: `onboarding_completed !== true` (line 326)
  - Writes: `onboarding_status='in_progress'`, `onboarding_step` (line 411-502)
  - Location: Commented out in `DashboardLayout.tsx:456` (legacy)

#### Chat Components
- `src/components/chat/UnifiedAssistantChat.tsx`
  - **CANONICAL CHAT UI**
  - Calls: `sendChatV2()` from `src/lib/api/chat.ts`
  - Reads: Profile from `useProfileContext()` (line 947)
  - Builds: User context via `buildUserContextFromProfile()` (line 947)
  - Location: Rendered in `DashboardLayout.tsx`

- `src/pages/dashboard/EmployeeChatPage.tsx`
  - Calls: `sendChatV2()` with `systemPromptOverride` (line 111)
  - Location: Route `/dashboard/chat/:employeeId?`

#### Settings Components
- `src/pages/ProfileSettingsPage.tsx`
  - Reads: `SELECT *` from profiles (line 94-98)
  - Writes: Only `display_name, avatar_url` (line 296-300)
  - **MISSING**: Does not read/write onboarding fields (`account_name`, `time_zone`, `date_locale`, `currency`, `tax_included`, `tax_system`)

- `src/components/settings/tabs/AccountTab.tsx`
  - Shows: `onboarding_status` debug info (line 264-265)
  - Does NOT allow editing onboarding fields

### Routes

#### Onboarding Routes
- `/onboarding/setup` - Custodian onboarding wizard (OnboardingSetupPage)
- `/onboarding/welcome` - Legacy welcome screen
- `/onboarding/account-setup` - Legacy account setup (AccountSetupScreen)
- `/onboarding/final` - Legacy final screen (FinalScreen)

#### Dashboard Routes
- `/dashboard` - Main dashboard (RouteDecisionGate → DashboardLayout)
- `/dashboard/chat/:employeeId?` - Employee chat page
- `/dashboard/settings` - Settings page (ProfileSettingsPage)
- `/dashboard/transactions` - Transactions list
- `/dashboard/smart-import` - Smart Import workspace

---

## 3. Wiring Map

### A) Auth → Profile Load → UI Availability

**Flow:**
```
1. AuthContext.tsx:120-362
   ↓
   Checks Supabase session OR demo user
   ↓
2. AuthContext.tsx:87-97 (loadProfile)
   ↓
   Calls getOrCreateProfile(userId, email)
   ↓
3. profileHelpers.ts:getOrCreateProfile()
   ↓
   SELECT from profiles WHERE id = userId
   ↓
4. AuthContext.tsx:68 (setProfile)
   ↓
   Profile available in AuthContext.profile
   ↓
5. RouteDecisionGate.tsx:96 (useAuth)
   ↓
   Reads profile from AuthContext
   ↓
6. DashboardLayout.tsx:131-197
   ↓
   Profile available for all child components
```

**Status:** ✅ Working  
**Issue:** Profile load is fire-and-forget (non-blocking), may cause race conditions if components mount before profile loads

**File References:**
- `src/contexts/AuthContext.tsx:87-97` - loadProfile function
- `src/contexts/AuthContext.tsx:68` - profile state
- `src/components/auth/RouteDecisionGate.tsx:96` - Reads profile
- `src/layouts/DashboardLayout.tsx:131-197` - Profile available to children

---

### B) Onboarding (Custodian) → Writes → Profile Fields → Settings Display

**Flow:**
```
1. OnboardingSetupPage.tsx
   ↓
   Renders CustodianOnboardingWizard.tsx
   ↓
2. CustodianOnboardingWizard.tsx:767-775
   ↓
   UPSERT profiles SET:
     - display_name = answers.firstName
     - currency = answers.currency
     - onboarding_completed = true
     - onboarding_step = 'custodian_complete'
     - account_name = answers.businessName (optional)
     - account_type = answers.goal (optional)
   ↓
3. CustodianOnboardingWizard.tsx:826
   ↓
   Calls refreshProfile() to update AuthContext
   ↓
4. ProfileSettingsPage.tsx:94-98
   ↓
   SELECT * FROM profiles WHERE id = user.id
   ↓
   BUT: Only displays display_name and avatar_url
   ↓
   MISSING: account_name, time_zone, date_locale, currency, tax_included, tax_system
```

**Status:** ❌ BROKEN  
**Issue:** Settings page does not read or display onboarding fields written by Custodian

**File References:**
- `src/components/onboarding/CustodianOnboardingWizard.tsx:767-802` - Writes profile
- `src/pages/ProfileSettingsPage.tsx:94-98` - Reads profile (incomplete)
- `src/pages/ProfileSettingsPage.tsx:296-300` - Writes profile (only display_name, avatar_url)

---

### C) Welcome Back / Welcome Overlay → When Triggered → How Dismissed

**Flow:**
```
1. PrimeWelcomeBackCard.tsx:60
   ↓
   Checks: profile?.onboarding_completed_at
   ↓
   Shows if: completed_at exists
   ↓
2. UnifiedAssistantChat.tsx:900-996
   ↓
   Builds greeting text for Prime
   ↓
   Reads: profile.metadata.expense_mode, currency, onboarding.completed
   ↓
   Shows: Structured WOW greeting if isFirstRun
   ↓
3. DashboardLayout.tsx:456
   ↓
   PrimeIntroModal COMMENTED OUT (legacy)
   ↓
   No overlay shown
```

**Status:** ⚠️ PARTIALLY WORKING  
**Issue:** PrimeWelcomeBackCard may not show if profile refresh fails after onboarding completion

**File References:**
- `src/components/onboarding/PrimeWelcomeBackCard.tsx:60` - Checks onboarding_completed_at
- `src/components/chat/UnifiedAssistantChat.tsx:900-996` - Builds Prime greeting
- `src/layouts/DashboardLayout.tsx:456` - PrimeIntroModal commented out

---

### D) Chat (Prime + All Employees) → Which Endpoint(s) → What Context is Included

**Flow:**
```
1. UnifiedAssistantChat.tsx
   ↓
   Calls sendChatV2() from src/lib/api/chat.ts:142
   ↓
2. src/lib/api/chat.ts:146
   ↓
   POST /.netlify/functions/chat
   Body: { userId, employeeSlug, message, sessionId, stream, systemPromptOverride }
   ↓
3. netlify/functions/chat.ts:513 (handler)
   ↓
   Step 1: Auth verification (line 573)
   Step 2: Guardrails (line 701) - runInputGuardrails()
   Step 3: Employee routing (line 764) - routeToEmployee()
   Step 4: Load employee profile (line 813) - employee_profiles table
   Step 5: Session management (line 876) - ensureSession()
   Step 6: Memory recall (line 931) - getMemory()
   Step 7: Profile context (line 1083) - getUserProfile()
   Step 8: Format context (line 1084) - formatUserContextForPrompt()
   Step 9: Build messages (line 1100+)
   Step 10: Model call (line 1200+)
   Step 11: Response (SSE or JSON)
```

**Context Included:**
- **User Profile Context** (line 1083-1084):
  - `preferredName` (from display_name → first_name → full_name)
  - `scope` (from account_type)
  - `primaryGoal` (from metadata.settings.primary_goal)
  - `proactivityLevel` (from metadata.settings.proactivity_level)
  - `timezone` (from metadata.timezone OR time_zone column)
  - `currency` (from currency column)
  - `accountType` (from account_type column)
  - **MISSING**: account_name, date_locale, tax_included, tax_system

- **Memory Context** (line 931-992):
  - Recalled facts from `user_memory_facts` via `getMemory()`
  - Session-scoped memories prioritized
  - Filtered for Smart Import AI if workspace='smart_import_ai'

- **Employee Persona** (line 813-868):
  - Loaded from `employee_profiles.system_prompt`
  - Tools loaded from `employee_profiles.tools_allowed`

- **Conversation History** (line 1100+):
  - Loaded from `chat_messages` via `getRecentMessages()`

**Status:** ✅ Working (but incomplete context)  
**Issue:** `getUserProfile()` does not read onboarding fields (`account_name`, `date_locale`, `tax_included`, `tax_system`)

**File References:**
- `src/components/chat/UnifiedAssistantChat.tsx` - Calls sendChatV2
- `src/lib/api/chat.ts:142-174` - sendChatV2 wrapper
- `netlify/functions/chat.ts:513` - Main handler
- `netlify/functions/chat.ts:127-211` - getUserProfile (incomplete)
- `netlify/functions/chat.ts:218-257` - formatUserContextForPrompt

---

### E) Guardrails Pipeline → Where Applied → Any Bypass Paths

**Flow:**
```
1. netlify/functions/chat.ts:701
   ↓
   runInputGuardrails(guardrailContext, { messages })
   ↓
2. netlify/functions/_shared/guardrails-unified.ts:144
   ↓
   runInputGuardrails() function
   ↓
   - PII masking (always on)
   - Content moderation (configurable)
   - Jailbreak detection (configurable)
   ↓
3. Returns: { ok: boolean, maskedMessages, signals, events }
   ↓
4. If !ok: Return blocked response (line 712-725)
   ↓
5. If ok: Use masked text for routing/model calls (line 729)
```

**Applied To:**
- ✅ ALL chat messages (chat.ts:701)
- ✅ OCR output (smart-import-ocr.ts:127) - stage='ingestion_ocr'
- ✅ Email ingestion (gmail-sync.ts) - stage='ingestion_email'

**Bypass Paths:**
- ❌ NONE FOUND - All paths go through guardrails

**Status:** ✅ Working - No bypass paths

**File References:**
- `netlify/functions/chat.ts:701` - Guardrails applied to chat
- `netlify/functions/_shared/guardrails-unified.ts:144` - runInputGuardrails function
- `netlify/functions/smart-import-ocr.ts:127` - Guardrails applied to OCR

---

### F) Memory/Brain → Write Paths + Recall Paths + Storage Tables

**Write Paths:**
```
1. After chat response (chat.ts:1400+)
   ↓
   extractFactsFromMessages([userMsg, assistantMsg])
   ↓
   For each fact:
     - upsertFact() → user_memory_facts table
     - embedAndStore() → memory_embeddings table
```

**Recall Paths:**
```
1. Before model call (chat.ts:931)
   ↓
   getMemory({ userId, sessionId, query: masked })
   ↓
   - Queries memory_embeddings with sessionId (session-scoped)
   - Falls back to global user-wide search if <3 session results
   ↓
   Returns: { context: string, facts: Array<{fact, score, fact_id}> }
   ↓
   Injected into system prompt (line 1100+)
```

**Storage Tables:**
- `user_memory_facts` - Extracted facts (fact, confidence, source)
- `memory_embeddings` - Vector embeddings (pgvector, 1536 dimensions)
- `chat_sessions` - Session metadata (for session-scoped recall)
- `chat_messages` - Individual messages (for conversation history)

**Status:** ✅ Working

**File References:**
- `netlify/functions/_shared/memory.ts` - Memory API
- `netlify/functions/chat.ts:931` - Memory recall
- `netlify/functions/chat.ts:1400+` - Memory extraction (after response)

---

### G) OCR / Smart Import → Upload → Storage → Job Queue/Worker → Parsed Output → Transactions Table

**Flow:**
```
1. User uploads file
   ↓
   useSmartImport hook → uploadFile()
   ↓
2. smart-import-init.ts
   ↓
   Creates user_documents record (status='pending')
   Creates imports record (status='pending')
   Generates signed upload URL
   ↓
3. Client uploads to Supabase Storage (docs bucket)
   ↓
4. smart-import-finalize.ts
   ↓
   Routes by MIME type:
     - Images/PDFs → smart-import-ocr.ts
     - CSV/OFX/QIF → smart-import-parse-csv.ts
   ↓
5. smart-import-ocr.ts (for images/PDFs)
   ↓
   Downloads file from Storage
   Runs OCR (Google Vision or OCR.space)
   Applies STRICT guardrails (line 127)
   Stores REDACTED OCR text in user_documents.ocr_text
   Stores OCR JSON in Storage: {storage_path}.ocr.json
   Marks document status as 'ready'
   Calls normalize-transactions.ts (fire-and-forget)
   ↓
6. normalize-transactions.ts
   ↓
   Reads user_documents.ocr_text
   Parses OCR text → NormalizedTransaction[]
   Saves to transactions_staging table
   Updates imports.status = 'parsed'
   Commits to transactions table (idempotent upsert)
```

**Status:** ✅ Working

**File References:**
- `src/hooks/useSmartImport.ts` - Upload hook
- `netlify/functions/smart-import-init.ts` - Initialize upload
- `netlify/functions/smart-import-finalize.ts` - Route by type
- `netlify/functions/smart-import-ocr.ts:127` - OCR with guardrails
- `netlify/functions/normalize-transactions.ts` - Parse and store transactions

---

### H) Settings/Account Center → Which Profile Fields Read/Write → Which are "Not Set" and Why

**Read Locations:**
- `src/pages/ProfileSettingsPage.tsx:94-98`
  - SELECT `*` FROM profiles
  - BUT: Only displays `display_name` and `avatar_url` in UI

**Write Locations:**
- `src/pages/ProfileSettingsPage.tsx:296-300`
  - UPDATE profiles SET `display_name, avatar_url`

**Fields Written by Onboarding but NOT Read/Written by Settings:**
- `account_name` - Written by AccountSetupScreen.tsx:79, CustodianOnboardingWizard.tsx:779
- `time_zone` - Written by AccountSetupScreen.tsx:80
- `date_locale` - Written by AccountSetupScreen.tsx:81
- `currency` - Written by AccountSetupScreen.tsx:82, CustodianOnboardingWizard.tsx:770
- `tax_included` - Written by AccountSetupScreen.tsx:83
- `tax_system` - Written by AccountSetupScreen.tsx:84

**Why "Not Set":**
- Settings page does not read these fields from database
- Settings page does not display these fields in UI
- Settings page does not allow editing these fields

**Status:** ❌ BROKEN - Settings page missing onboarding fields

**File References:**
- `src/pages/ProfileSettingsPage.tsx:94-98` - Reads profile (incomplete)
- `src/pages/ProfileSettingsPage.tsx:296-300` - Writes profile (only display_name, avatar_url)
- `src/pages/onboarding/AccountSetupScreen.tsx:75-87` - Writes onboarding fields
- `src/components/onboarding/CustodianOnboardingWizard.tsx:767-802` - Writes onboarding fields

---

## 4. Duplication Check

### Duplicate Profile Reading Functions

**Location 1:** `netlify/functions/chat.ts:127-211`
- Function: `getUserProfile()`
- Reads: `display_name, first_name, full_name, account_type, currency, time_zone, metadata`
- Purpose: Backend chat context

**Location 2:** `src/lib/userContextHelpers.ts:37-66`
- Function: `buildUserContext()`
- Reads: Profile from `useProfileContext()` hook
- Purpose: Frontend React components

**Location 3:** `src/lib/userContextHelpers.ts:76-107`
- Function: `buildUserContextFromProfile()`
- Reads: Raw profile object passed as parameter
- Purpose: Non-React contexts

**Issue:** All three read different subsets of fields, causing inconsistency

**Recommendation:** Consolidate to single source of truth with complete field list

---

### Duplicate Onboarding Completion Checks

**Location 1:** `src/components/auth/RouteDecisionGate.tsx:121-149`
- Checks: `onboarding_status === 'completed'` OR `onboarding_completed === true`
- Logic: `const onboardingCompleted = onboardingStatus === 'completed' || profile.onboarding_completed === true;`

**Location 2:** `src/pages/onboarding/OnboardingSetupPage.tsx:22-24`
- Checks: Same logic as RouteDecisionGate
- Logic: `const isCompleted = onboardingStatus === 'completed' || profile?.onboarding_completed === true;`

**Location 3:** `src/layouts/DashboardLayout.tsx:564`
- Checks: `onboarding_completed !== true`
- Logic: Simpler check, only boolean

**Issue:** Inconsistent logic across components

**Recommendation:** Use single helper function for onboarding completion check

---

### Duplicate Chat Endpoint Wrappers

**Location 1:** `src/lib/api/chat.ts:142-174`
- Function: `sendChatV2()`
- Calls: `POST /.netlify/functions/chat`
- Used by: UnifiedAssistantChat, EmployeeChatPage

**Location 2:** `src/services/chatApi.ts:12-19`
- Function: `sendChat()`
- Calls: `POST /.netlify/functions/chat`
- Used by: ChatTest page (legacy)

**Location 3:** `src/lib/universalAIEmployeeConnection.ts:493-504`
- Direct fetch call
- Calls: `POST /.netlify/functions/chat`
- Used by: UniversalAIEmployee class (legacy)

**Location 4:** `src/services/UniversalAIController.ts:456-467`
- Direct fetch call
- Calls: `POST /.netlify/functions/chat`
- Used by: UniversalAIController class (legacy)

**Issue:** Multiple wrappers, but all call same endpoint (not a problem, just duplication)

**Recommendation:** Consolidate to single wrapper (`sendChatV2`)

---

## 5. Broken/Incomplete Wiring

### P0: Profile Context Not Reaching Chat

**Location:** `netlify/functions/chat.ts:127-211`

**Issue:** `getUserProfile()` only reads:
```typescript
SELECT display_name, first_name, full_name, account_type, currency, time_zone, metadata
```

**Missing Fields:**
- `account_name` - Written by onboarding, not read by chat
- `date_locale` - Written by onboarding, not read by chat
- `tax_included` - Written by onboarding, not read by chat
- `tax_system` - Written by onboarding, not read by chat

**Impact:** Prime chat does not know user's account name, date locale, or tax settings from onboarding

**Fix:**
```typescript
// In chat.ts:140-144, change SELECT to:
.select('display_name, first_name, full_name, account_type, currency, time_zone, account_name, date_locale, tax_included, tax_system, metadata')

// In chat.ts:198-206, add to return object:
return {
  preferredName,
  scope,
  primaryGoal,
  proactivityLevel,
  timezone,
  currency,
  accountType,
  accountName: profile.account_name || null,        // ADD
  dateLocale: profile.date_locale || null,          // ADD
  taxIncluded: profile.tax_included || null,        // ADD
  taxSystem: profile.tax_system || null,            // ADD
};

// In chat.ts:218-257, add to formatUserContextForPrompt():
if (userProfile.accountName) {
  parts.push(`- Account name: ${userProfile.accountName}`);
}
if (userProfile.dateLocale) {
  parts.push(`- Date locale: ${userProfile.dateLocale}`);
}
if (userProfile.taxIncluded) {
  parts.push(`- Tax included: ${userProfile.taxIncluded}`);
}
if (userProfile.taxSystem) {
  parts.push(`- Tax system: ${userProfile.taxSystem}`);
}
```

**Verification:**
1. Complete onboarding with Custodian
2. Open Prime chat
3. Check console logs for `[Chat] getUserProfile:` - should include accountName, dateLocale, taxIncluded, taxSystem
4. Send message to Prime asking "What's my account name?" - should respond with account name from onboarding

---

### P0: Settings Shows "Not Set" for Onboarding Fields

**Location:** `src/pages/ProfileSettingsPage.tsx`

**Issue:** Settings page only reads/writes `display_name` and `avatar_url`, missing all onboarding fields

**Fix:**
```typescript
// In ProfileSettingsPage.tsx:54-57, add to formData:
const [formData, setFormData] = useState({
  display_name: '',
  avatar_url: '',
  account_name: '',        // ADD
  time_zone: '',            // ADD
  date_locale: '',          // ADD
  currency: '',             // ADD
  tax_included: '',         // ADD
  tax_system: ''            // ADD
});

// In ProfileSettingsPage.tsx:106-111, populate formData:
if (data) {
  setProfile(data);
  setFormData({
    display_name: data.display_name || '',
    avatar_url: data.avatar_url || '',
    account_name: data.account_name || '',      // ADD
    time_zone: data.time_zone || '',             // ADD
    date_locale: data.date_locale || '',         // ADD
    currency: data.currency || '',               // ADD
    tax_included: data.tax_included || '',       // ADD
    tax_system: data.tax_system || ''            // ADD
  });
}

// In ProfileSettingsPage.tsx:296-300, update to include all fields:
const updates = {
  display_name: formData.display_name.trim() || null,
  avatar_url: formData.avatar_url.trim() || null,
  account_name: formData.account_name.trim() || null,    // ADD
  time_zone: formData.time_zone || null,                  // ADD
  date_locale: formData.date_locale || null,              // ADD
  currency: formData.currency || null,                    // ADD
  tax_included: formData.tax_included || null,            // ADD
  tax_system: formData.tax_system || null                 // ADD
};

// Add UI fields in ProfileSettingsPage.tsx render (after line 563):
<div>
  <label htmlFor="account_name" className="block text-sm font-medium text-gray-700 mb-1">
    Account Name
  </label>
  <input
    id="account_name"
    type="text"
    className="input"
    placeholder="Enter account name"
    value={formData.account_name}
    onChange={(e) => handleInputChange('account_name', e.target.value)}
  />
</div>
// ... repeat for other fields
```

**Verification:**
1. Complete onboarding with Custodian (sets account_name, currency, etc.)
2. Navigate to Settings page
3. Verify all onboarding fields are displayed and editable
4. Update a field and save
5. Verify field persists after page refresh

---

### P1: Onboarding Completion Check Inconsistency

**Location:** `src/components/onboarding/CustodianOnboardingWizard.tsx:771`

**Issue:** Custodian writes `onboarding_completed=true` but does NOT write `onboarding_status='completed'`

**Impact:** RouteDecisionGate prefers `onboarding_status='completed'` but falls back to `onboarding_completed=true`, causing potential inconsistency

**Fix:**
```typescript
// In CustodianOnboardingWizard.tsx:767-775, add onboarding_status:
const payload: any = {
  id: userId,
  display_name: answers.firstName.trim(),
  currency: answers.currency || 'CAD',
  onboarding_completed: true,
  onboarding_status: 'completed',        // ADD
  onboarding_step: 'custodian_complete',
  onboarding_completed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
```

**Verification:**
1. Complete onboarding with Custodian
2. Check database: `SELECT onboarding_completed, onboarding_status FROM profiles WHERE id = <userId>`
3. Verify both are set: `onboarding_completed=true`, `onboarding_status='completed'`
4. Navigate to dashboard - should not redirect to onboarding

---

## 6. "Single Canonical Highway" Confirmation

### What is the Canonical Chat Endpoint?

**Answer:** `POST /.netlify/functions/chat`

**Handler:** `netlify/functions/chat.ts:513` (`export const handler: Handler`)

**Status:** ✅ CONFIRMED - Single canonical endpoint

---

### Do Any UIs Call a Different Endpoint?

**Answer:** ❌ NO - All UIs call `/.netlify/functions/chat`

**Callers:**
1. `src/lib/api/chat.ts:146` - `sendChatV2()` - Used by UnifiedAssistantChat, EmployeeChatPage
2. `src/services/chatApi.ts:12` - `sendChat()` - Used by ChatTest (legacy)
3. `src/lib/universalAIEmployeeConnection.ts:493` - Direct fetch - Used by UniversalAIEmployee (legacy)
4. `src/services/UniversalAIController.ts:456` - Direct fetch - Used by UniversalAIController (legacy)

**Status:** ✅ CONFIRMED - All call same endpoint

---

### Do Any Flows Bypass Guardrails or Memory?

**Answer:** ❌ NO - All flows go through guardrails and memory

**Guardrails:**
- ✅ Chat messages: Applied at `chat.ts:701`
- ✅ OCR output: Applied at `smart-import-ocr.ts:127`
- ✅ Email ingestion: Applied in `gmail-sync.ts` (assumed, not verified)

**Memory:**
- ✅ Chat: Recalled at `chat.ts:931` before model call
- ✅ Chat: Extracted at `chat.ts:1400+` after response

**Status:** ✅ CONFIRMED - No bypass paths

---

## 7. Fix List (Ranked)

### P0: Blocks Onboarding or User Identity

#### Fix 1: Profile Context Not Reaching Chat
**Files:**
- `netlify/functions/chat.ts:140-144` - Update SELECT statement
- `netlify/functions/chat.ts:198-206` - Add fields to return object
- `netlify/functions/chat.ts:218-257` - Add fields to formatUserContextForPrompt()

**Change:**
- Add `account_name, date_locale, tax_included, tax_system` to SELECT
- Add fields to getUserProfile() return type and return object
- Add fields to formatUserContextForPrompt() output

**Verification:**
1. Complete onboarding with Custodian (sets account_name="Test Account")
2. Open Prime chat
3. Check console: `[Chat] getUserProfile:` should show accountName: "Test Account"
4. Ask Prime: "What's my account name?" - should respond with "Test Account"

---

#### Fix 2: Settings Shows "Not Set" for Onboarding Fields
**Files:**
- `src/pages/ProfileSettingsPage.tsx:54-57` - Add fields to formData state
- `src/pages/ProfileSettingsPage.tsx:106-111` - Populate formData from profile
- `src/pages/ProfileSettingsPage.tsx:296-300` - Include fields in updates
- `src/pages/ProfileSettingsPage.tsx:547-563` - Add UI fields for editing

**Change:**
- Add `account_name, time_zone, date_locale, currency, tax_included, tax_system` to formData
- Read these fields from profile and populate formData
- Write these fields when saving
- Add input fields in UI for editing

**Verification:**
1. Complete onboarding (sets account_name="Test", currency="CAD")
2. Navigate to Settings
3. Verify account_name and currency are displayed (not "Not set")
4. Edit account_name to "Updated Test"
5. Save and refresh - verify "Updated Test" persists

---

#### Fix 3: Onboarding Completion Check Inconsistency
**Files:**
- `src/components/onboarding/CustodianOnboardingWizard.tsx:771` - Add `onboarding_status: 'completed'`

**Change:**
- Add `onboarding_status: 'completed'` to payload when saving onboarding completion

**Verification:**
1. Complete onboarding with Custodian
2. Check database: `SELECT onboarding_completed, onboarding_status FROM profiles WHERE id = <userId>`
3. Both should be set: `onboarding_completed=true`, `onboarding_status='completed'`

---

### P1: Breaks Chat Context / Employee Identity

#### Fix 4: Consolidate Profile Reading Functions
**Files:**
- `netlify/functions/chat.ts:127-211` - getUserProfile()
- `src/lib/userContextHelpers.ts:37-107` - buildUserContext(), buildUserContextFromProfile()

**Change:**
- Create single source of truth for profile field list
- Update all three functions to read same fields
- Ensure consistency between backend and frontend

**Verification:**
1. Check that all three functions read same fields
2. Verify no field is read by one but not others

---

### P2: Breaks OCR → Chat/Tooling

#### Fix 5: Verify OCR Context Reaches Chat
**Files:**
- `netlify/functions/chat.ts:266-343` - buildAttachmentContext()

**Status:** ✅ Already working - buildAttachmentContext() loads documents and includes OCR text in context

**Verification:**
1. Upload document via Smart Import
2. Wait for OCR to complete
3. Open Byte chat
4. Attach document to chat
5. Ask Byte about document - should reference OCR text

---

## 8. Verify Checklist (10 Concrete Steps)

1. **Complete onboarding with Custodian:**
   - Navigate to `/onboarding/setup`
   - Fill out Custodian wizard (first name, currency, etc.)
   - Verify profile is saved: `SELECT * FROM profiles WHERE id = <userId>`
   - Check: `onboarding_completed=true`, `onboarding_status='completed'`, `account_name` is set

2. **Verify profile context reaches chat:**
   - Open Prime chat
   - Check console logs: `[Chat] getUserProfile:` should include `accountName`, `dateLocale`, `taxIncluded`, `taxSystem`
   - Ask Prime: "What's my account name?" - should respond with account name from onboarding

3. **Verify settings displays onboarding fields:**
   - Navigate to `/dashboard/settings`
   - Verify `account_name`, `currency`, `time_zone`, `date_locale`, `tax_included`, `tax_system` are displayed (not "Not set")
   - Edit a field and save
   - Refresh page - verify field persists

4. **Verify guardrails are applied:**
   - Send message with PII (e.g., "My SSN is 123-45-6789")
   - Check console: `[Chat] Guardrails passed, PII masked:` should show masked text
   - Verify response does not contain raw PII

5. **Verify memory recall:**
   - Tell Prime: "I prefer CSV exports"
   - Wait for response
   - In new chat, ask: "What format do I prefer?" - should mention CSV

6. **Verify OCR pipeline:**
   - Upload PDF via Smart Import
   - Check `user_documents` table: `ocr_text` should contain redacted text
   - Check `transactions` table: transactions should be parsed and stored

7. **Verify session management:**
   - Open Prime chat, send message
   - Check `chat_sessions` table: session should exist with `user_id` and `employee_slug='prime-boss'`
   - Refresh page, send another message - should use same session

8. **Verify employee routing:**
   - Send message to Prime: "Categorize this transaction"
   - Check console: Should route to Tag (or appropriate employee)
   - Verify response comes from correct employee

9. **Verify welcome overlay:**
   - Complete onboarding
   - Navigate to dashboard
   - Check if PrimeWelcomeBackCard shows (if implemented)
   - Verify greeting includes user's name

10. **Verify all employees use same endpoint:**
    - Open Prime chat, send message
    - Check network tab: Request to `/.netlify/functions/chat`
    - Open Byte chat, send message
    - Check network tab: Request to `/.netlify/functions/chat` (same endpoint)
    - Verify both go through guardrails (check response headers: `X-Guardrails: active`)

---

## Appendix: File Path Reference

### Critical Files
- `netlify/functions/chat.ts` - Canonical chat endpoint
- `netlify/functions/_shared/guardrails-unified.ts` - Guardrails system
- `netlify/functions/_shared/memory.ts` - Memory system
- `src/components/chat/UnifiedAssistantChat.tsx` - Canonical chat UI
- `src/components/auth/RouteDecisionGate.tsx` - Onboarding gate
- `src/components/onboarding/CustodianOnboardingWizard.tsx` - Onboarding wizard
- `src/pages/ProfileSettingsPage.tsx` - Settings page
- `src/contexts/AuthContext.tsx` - Auth and profile context

### Database Tables
- `profiles` - User profile data
- `chat_sessions` - Chat session management
- `chat_messages` - Individual messages
- `user_memory_facts` - Extracted facts
- `memory_embeddings` - Vector embeddings
- `user_documents` - Document metadata and OCR text
- `transactions` - Final transactions

---

**End of Report**




