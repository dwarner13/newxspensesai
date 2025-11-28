# Brain & Guardrails Recon - Brain Map

**Generated**: 2025-01-06  
**Scope**: Complete AI brain architecture scan (read-only)

---

## Overview

This document maps the current AI "brain" architecture: models, routing, tools, memory, guardrails, headers, employees, OCR/Bank flows.

### What's Wired

- **Model**: `gpt-4o-mini` (default), configurable via `OPENAI_CHAT_MODEL`
- **Streaming**: Enabled with SSE, PII masking in-stream
- **Memory**: Vector embeddings (`text-embedding-3-large`), recall/embed/extract pipeline
- **Guardrails**: 3-layer (PII masking → moderation → jailbreak detection)
- **Routing**: Deterministic + LLM fallback via `prime_router.ts`
- **Employees**: 4 core wired (Prime, Crystal, Tag, Byte); 13+ additional defined but minimal routing
- **OCR Pipeline**: Multi-provider (OCRSpace, Google Vision, local stub) → parsers → normalize → categorize → save

---

## Employee ↔ Chat Page ↔ Router Case ↔ Tools ↔ Headers

| Employee | Chat Page | Router Case | Tools | Headers Present |
|----------|-----------|-------------|-------|-----------------|
| **Prime** | `src/pages/chat/PrimeChatSimple.tsx` | ✅ `routeTurn()` default | ✅ `delegate` tool | ✅ All core headers |
| **Crystal** | `src/pages/dashboard/SpendingPredictionsPage.tsx` | ✅ `case 'analytics'` | ✅ `delegate` tool (Crystal-specific) | ✅ All core headers |
| **Tag** | `src/pages/dashboard/AICategorizationPage.tsx` | ✅ `case 'categorization'` | ❌ None | ✅ All core headers |
| **Byte** | `src/pages/ByteChatTest.tsx` | ✅ `case 'code'/'ocr'` | ✅ `ocr_file` tool | ✅ All core headers |
| **Goalie** | `src/pages/chat/GoalieChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Automa** | `src/pages/chat/AutomationChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Blitz** | `src/pages/chat/DebtChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Liberty** | `src/pages/chat/LibertyChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Chime** | `src/pages/chat/ChimeChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Roundtable** | `src/pages/chat/PodcastChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Serenity** | `src/pages/chat/TherapistChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Harmony** | `src/pages/chat/WellnessChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Wave** | `src/pages/chat/SpotifyChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Ledger** | `src/pages/chat/TaxChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Intelia** | `src/pages/chat/BIChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Dash** | `src/pages/chat/AnalyticsChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |
| **Custodian** | `src/pages/chat/SettingsChat.tsx` | ❌ Not in router | ❌ None | ✅ All core headers |

**Note**: Router only handles 4 employees (Prime, Crystal, Tag, Byte). Remaining 13 employees have chat pages but no router cases.

---

## Memory Fabric

### Where Called

1. **`recall()`**:
   - `netlify/functions/chat.ts:1891` - Memory recall before model call
   - `netlify/functions/_shared/memory.ts:221` - Vector similarity search

2. **`embedAndStore()`**:
   - `netlify/functions/chat.ts:2310, 2401, 2548, 2729` - After fact extraction
   - `netlify/functions/_shared/ocr_memory.ts:203` - After OCR fact extraction
   - `netlify/functions/_shared/memory.ts:173` - Embedding generation

3. **`extractFactsFromMessages()`**:
   - `netlify/functions/chat.ts:2297, 2388, 2535, 2716` - Post-assistant response
   - `netlify/functions/_shared/memory.ts:285` - Fact extraction logic

### Headers & Stats

- `X-Memory-Hit`: Top similarity score (0.0-1.0) (`chat.ts:1894`)
- `X-Memory-Count`: Number of recalled facts (`chat.ts:1893`)
- Token caps: `memory.capTokens()` used for context truncation (600-1200 tokens)

### Token Management

- Context window: `MAX_CONTEXT_TOKENS = 4000`
- Reserve for answer: ~1500 tokens
- Memory truncation: 600 tokens max
- Recall query: ~1200 tokens

---

## Guardrails & PII

### PII Detection & Masking

**Where used**:
- `netlify/functions/chat.ts:1710` - User input masking (`last4` strategy)
- `netlify/functions/ocr.ts` - OCR text masking
- `netlify/functions/_shared/pii.ts:31` - Main masking function
- `netlify/functions/_shared/pii-patterns.ts` - Pattern library (20+ detectors)

**Patterns covered**:
- Financial: PAN, routing numbers, bank accounts
- Government: SSN, SIN, NINO, passport
- Contact: Email, phone (US/CA/UK/EU)
- Address: Street addresses, postal codes
- Network: IP addresses

**SSE Masking**:
- `netlify/functions/chat.ts:2611` - SSE transform with PII masker (`last4`)
- `netlify/functions/_shared/sse_mask_transform.ts` - Reusable transform

### Guardrail Events

**Where logged**:
- `netlify/functions/chat.ts:1726, 1784` - PII detection + moderation
- `netlify/functions/ocr.ts:335, 394` - OCR guardrail events
- `netlify/functions/_shared/guardrails.ts:468` - Unified logging

**Event schema**:
- `user_id`, `stage`, `rule_type`, `action`, `severity`, `content_hash`, `meta`

---

## Headers Telemetry

### Core Headers (All Routes)

| Header | Set By | Values |
|--------|--------|--------|
| `X-Guardrails` | `buildResponseHeaders()` | `active` / `inactive` |
| `X-PII-Mask` | `buildResponseHeaders()` | `enabled` / `disabled` |
| `X-Memory-Hit` | `buildResponseHeaders()` | `0.00` - `1.00` (float) |
| `X-Memory-Count` | `buildResponseHeaders()` | `0` - `N` (integer) |
| `X-Session-Summary` | `buildResponseHeaders()` | `present` / `absent` |
| `X-Session-Summarized` | `buildResponseHeaders()` | `yes` / `no` / `async` |
| `X-Employee` | `buildResponseHeaders()` | `prime` / `crystal` / `tag` / `byte` |
| `X-Route-Confidence` | `buildResponseHeaders()` | `0.00` - `1.00` (float) |

### Streaming Headers

| Header | Set By | Values |
|--------|--------|--------|
| `X-Stream-Chunk-Count` | `buildResponseHeaders()` (optional) | `0` - `N` |

### OCR-Specific Headers

| Header | Set By | Values |
|--------|--------|--------|
| `X-OCR-Provider` | `buildResponseHeaders()` | `ocrspace` / `vision` / `local` / `none` |
| `X-OCR-Parse` | `buildResponseHeaders()` | `invoice` / `receipt` / `bank` / `none` |
| `X-Transactions-Saved` | `buildResponseHeaders()` | `0` - `N` |
| `X-Categorizer` | `buildResponseHeaders()` | `rules` / `tag` |
| `X-Vendor-Matched` | `buildResponseHeaders()` | `yes` / `no` |
| `X-XP-Awarded` | `buildResponseHeaders()` | `0` - `N` |

**Gap**: `buildResponseHeaders()` defined in `ocr.ts` but **missing in `chat.ts`** (referenced but not imported/defined).

---

## Bank/OCR Pipelines

### OCR Providers

1. **OCRSpace**: `netlify/functions/_shared/ocr_providers.ts:52`
   - API key: `OCRSPACE_API_KEY`
   - Supports: PDF, images (via FormData upload or URL)

2. **Google Vision**: `netlify/functions/_shared/ocr_providers.ts:113`
   - Credentials: `GOOGLE_APPLICATION_CREDENTIALS`
   - Supports: PDF, images

3. **Local (Stub)**: `netlify/functions/_shared/ocr_providers.ts:30`
   - Placeholder for pdf.js/tesseract integration

**Fallback**: `bestEffortOCR()` tries all providers, returns first success

### Parsers

- `parseInvoiceLike()`: `netlify/functions/_shared/ocr_parsers.ts:56`
- `parseReceiptLike()`: `netlify/functions/_shared/ocr_parsers.ts:121`
- `parseBankStatementLike()`: `netlify/functions/_shared/ocr_parsers.ts:180` (stub)

### Normalization & Categorization

- `toTransactions()`: `netlify/functions/_shared/ocr_normalize.ts:41` - Converts ParsedDoc → NormalizedTransaction[]
- `categorize()`: `netlify/functions/_shared/ocr_normalize.ts:112` - Rule-based + Tag fallback
- `matchVendor()`: `netlify/functions/_shared/ocr_memory.ts` - Vendor aliases matching
- `rememberCategory()`: `netlify/functions/_shared/ocr_memory.ts` - Learn from corrections

### Save Paths

- `insertTransaction()`: `netlify/functions/_shared/transactions_store.ts`
- `insertItems()`: `netlify/functions/_shared/transactions_store.ts`
- `linkToDocument()`: `netlify/functions/_shared/transactions_store.ts` (non-blocking)

**Database tables**: `transactions`, `transaction_items`, `user_documents`, `vendor_aliases`

---

## Prompts

### Prime Persona

- **File**: `netlify/functions/chat.ts:114-168`
- **Role**: CEO/Orchestrator
- **Usage**: Default employee, delegation coordinator

### Crystal Persona V2

- **File**: `netlify/functions/chat.ts:174-499`
- **Role**: CFO-level Financial Analyst
- **Usage**: Analytics, insights, forecasting

### Tag Persona

- **File**: `netlify/functions/chat.ts:1577-1591`
- **Role**: Transaction Categorizer & PII Specialist
- **Usage**: Categorization, tax classification

### Byte Persona

- **File**: `netlify/functions/chat.ts:1593-1605`
- **Role**: Code & Tools Specialist
- **Usage**: OCR, parsing, debugging

### Employee Personas (DB)

- **Table**: `employee_profiles`
- **Fields**: `system_prompt`, `tools_allowed`
- **Active employees**: Fetched at runtime (`chat.ts:1531`)

---

## Streaming & SSE

### Configuration

- **Model**: `gpt-4o-mini` (configurable)
- **Temperature**: `0.3`
- **Max tokens**: Not explicitly set (model default)

### SSE Transform

- **File**: `netlify/functions/chat.ts:2620-2749`
- **Features**:
  - PII masking per chunk (`last4` strategy)
  - Chunk counting (`streamChunkCount`)
  - Buffer management (complete SSE event parsing)
  - Final text persistence (after streaming completes)

---

## Notes

- **Token caps**: Memory context capped at 600 tokens, recall queries at 1200 tokens
- **SSE masking**: Real-time PII redaction during streaming
- **Router gaps**: 13 employees have chat pages but no router cases (manual override only)
- **Header builder**: Defined in `ocr.ts` but missing in `chat.ts` (needs extraction/sharing)

















