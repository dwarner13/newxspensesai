# XspensesAI System Architecture

**Last Updated:** February 20, 2025  
**Status:** Production Ready  
**Version:** 2.0

---

## Overview

XspensesAI is an AI-powered expense tracking and financial wellness app that uses a multi-employee architecture to provide intelligent financial insights, transaction categorization, document processing, and forecasting.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Vite   │  │  React   │  │ Tailwind │  │ Zustand  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/SSE
┌─────────────────────────────────────────────────────────────┐
│              Netlify Functions (Backend)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    chat.ts   │  │  router.ts   │  │ commit-import│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   memory.ts   │  │  guardrails │  │ categorize   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP
┌─────────────────────────────────────────────────────────────┐
│                    Worker (Node/TS)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ hybridOcr.ts │  │processDoc.ts │  │  parsing     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ Postgres
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (Postgres)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ transactions │  │  imports     │  │  employees   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  memory_*    │  │ tag_learning │  │  sessions    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↕ API
┌─────────────────────────────────────────────────────────────┐
│                    OpenAI (GPT-4o)                          │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │   Chat API   │  │  Embeddings  │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Netlify Functions (serverless)
- **Worker:** Node.js/TypeScript for document processing
- **Database:** Supabase (Postgres) with RLS
- **AI:** OpenAI GPT-4o for chat, embeddings for memory
- **OCR:** Hybrid OCR pipeline (pdf-parse → OCR fallback)

---

## Employee System

### Canonical Employees

All employees use canonical slugs stored in `employee_profiles` table:

| Slug | Name | Role | Model | Key Tools |
|------|------|------|-------|-----------|
| `prime-boss` | Prime | CEO & Orchestrator | gpt-4o | `request_employee_handoff` |
| `byte-docs` | Byte | Document Processing | gpt-4o-mini | OCR, parsing |
| `tag-ai` | Tag | Categorization Expert | gpt-4o-mini | `tag_update_transaction_category` |
| `crystal-ai` | Crystal | Financial Insights | gpt-4o | `crystal_summarize_income`, `crystal_summarize_expenses` |
| `finley-ai` | Finley | Forecasting Planner | gpt-4o | Crystal tools + forecasting |
| `ledger-tax` | Ledger | Tax Specialist | gpt-4o | Tax tools |
| `goalie-goals` | Goalie | Goals & Budgets | gpt-4o-mini | Goal tools |
| `blitz-debt` | Blitz | Debt Management | gpt-4o-mini | Debt tools |

### Employee Registry

**Location:** `src/employees/registry.ts`

**Purpose:** Single source of truth for employee definitions

**Key Functions:**
- `resolveSlug(aliasOrSlug)` - Resolves aliases to canonical slugs
- `getEmployee(slug)` - Gets employee profile
- `getAllEmployees()` - Lists all active employees
- `getEmployeeSystemPrompt(slug)` - Gets system prompt
- `getEmployeeModelConfig(slug)` - Gets model config (model, temperature, maxTokens)

**Alias Support:**
- `crystal-analytics` → `crystal-ai`
- `tag-categorize` → `tag-ai`
- `byte-doc` → `byte-docs`
- `prime` → `prime-boss`
- And more (see `employee_slug_aliases` table)

**Caching:** 5-minute TTL in-memory cache

### Routing Logic

**Location:** `netlify/functions/_shared/router.ts`

**Flow:**
1. Check if user explicitly requested an employee → use that
2. Check keyword patterns (tax → Ledger, income/expense → Crystal, etc.)
3. Check Finley patterns (forecast, plan, payoff, savings)
4. Check few-shot similarity examples
5. Default to Prime

**Key Routing Patterns:**

- **Crystal:** Income/expense summaries, spending breakdowns, top merchants
- **Finley:** Forecasting, debt payoff, savings projections, "by December", retirement planning
- **Tag:** Categorization, organization, "fix category"
- **Byte:** Document upload, OCR, receipt scanning
- **Ledger:** Tax questions, deductions, CRA/GST
- **Goalie:** Goals, budgets, savings targets
- **Blitz:** Debt management, payoff strategies

**Router is async** and uses the employee registry to resolve slugs and get personas.

---

## Tools & Workflows

### Tool Registration

**Location:** `src/agent/tools/index.ts`

**Pattern:**
```typescript
export const tools = [
  ['tool_name', {
    id: 'tool_name',
    description: '...',
    inputSchema: zodSchema,
    outputSchema: zodSchema,
    run: executeFunction,
    meta: { mutates: true, timeout: 15000 }
  }],
  // ...
] as const;
```

### Key Tools

#### Crystal Tools
- **`crystal_summarize_income`** - Aggregates income transactions (total, count, average, top merchants)
- **`crystal_summarize_expenses`** - Aggregates expense transactions (total, count, average, top merchants)

#### Finley Tools
- **`finley_debt_payoff_forecast`** - Calculates months to payoff, total interest
- **`finley_savings_forecast`** - Projects savings growth with compounding

#### Tag Tools
- **`tag_update_transaction_category`** - Updates category + saves to learning table
- **`tag_create_manual_transaction`** - Creates manual transaction entry

#### Prime Tools
- **`request_employee_handoff`** - Delegates to another employee

### Tool Execution Flow

```
User Message → Router → Employee Selected → System Prompt Built
    ↓
Tool Call Detected → Tool Schema Validated → Execute Tool
    ↓
Result Returned → Added to Context → Response Generated
```

---

## Memory System

### Architecture

**Location:** `netlify/functions/_shared/memory.ts`

**Components:**

1. **User Memory Facts** (`user_memory_facts` table)
   - Long-term facts about user (preferences, financial info, goals)
   - Categories: `preference`, `financial`, `personal`, `goal`
   - Confidence scoring (0.0-1.0)
   - Verified flag (user-confirmed vs inferred)

2. **Memory Embeddings** (`memory_embeddings` table)
   - pgvector embeddings (1536 dimensions)
   - Stores chunks from documents, conversations, facts
   - `source_id` links to session/conversation
   - Cosine similarity search for RAG

3. **Session Summaries** (`chat_sessions` table)
   - Rolling summaries of long conversations
   - Reduces token usage for context

### Session-Aware Recall

**Key Feature:** Memory recall prioritizes session-scoped memories

**Flow:**
```
recall(userId, sessionId, query)
    ↓
1. Query memory_embeddings WHERE source_id = sessionId
    ↓
2. Calculate cosine similarity
    ↓
3. If ≥3 session results → return session-scoped memories
    ↓
4. Else → fallback to global user-wide search
```

**Benefits:**
- Conversations stay contextually relevant
- Cross-employee shared sessions maintain context
- Global fallback ensures no information loss

### Memory Extraction

**Location:** `netlify/functions/_shared/memory-extraction.ts`

**Process:**
1. After each message, extract facts using LLM
2. Score confidence (0.0-1.0)
3. Filter low-confidence facts
4. Store in `user_memory_facts`
5. Generate embeddings for RAG

### Memory Usage

- **Prime:** Uses memory for personalization, context building
- **Crystal:** Uses memory for financial insights, user preferences
- **Tag:** Uses memory for categorization patterns
- **All employees:** Access shared memory via `recall()`

---

## Smart Import & OCR Pipeline

### Complete Flow

```
1. User Uploads File
   ↓
2. Worker Receives (processDocument.ts)
   ↓
3. Hybrid OCR Pipeline (hybridOcr.ts)
   ├─ Primary: pdf-parse (PDFs) / text extraction (CSV/text)
   ├─ Confidence check (< 0.3 or < 50 chars)
   └─ Fallback: OCR (OCR.space / Tesseract / Google Vision)
   ↓
4. Text Extracted → Redaction (PII masking)
   ↓
5. Parsing → Extract transactions
   ↓
6. Categorization → Tag learning applied
   ↓
7. Staging → transactions_staging table (status='parsed')
   ↓
8. User Reviews → Preview table
   ↓
9. Commit → commit-import.ts
   ├─ Validates status='parsed'
   ├─ Moves to transactions table
   ├─ Links via import_id
   ├─ Updates import status='committed'
   └─ Computes summary + issues
   ↓
10. Summary Display → Total transactions, credits, debits, top categories
```

### Hybrid OCR

**Location:** `worker/src/ocr/hybridOcr.ts`

**Strategy:**
- **PDFs:** Try `pdf-parse` first, fallback to OCR if confidence low
- **Images:** Skip primary, go straight to OCR
- **CSV/Text:** Direct text extraction (high confidence)

**Confidence Calculation:**
- PDF: Based on text length per page
- CSV: Structure-based (commas + newlines = 0.9)
- Text: Always 0.9
- Image: Always 0.0 (triggers OCR)

**Result Structure:**
```typescript
{
  pages: [{ pageNumber, text }],
  fullText: string,
  source: 'primary' | 'fallback',
  confidence: number,
  hadFallback: boolean,
  warnings: string[],
  metadata: { fileType, pageCount, processingTimeMs, ... }
}
```

### Smart Import Phase 2

**Status:** ✅ Complete

**Features:**
- ✅ Robust commit flow (validates status, prevents double-commit)
- ✅ Summary computation (totals, date range, top categories)
- ✅ Issue detection (uncategorized, duplicates)
- ✅ UI components (ImportList, summary panel, issues panel)
- ✅ Transaction linking via `import_id`

**Key Files:**
- `netlify/functions/commit-import.ts` - Commit handler
- `src/pages/dashboard/SmartImportAI.tsx` - Main UI
- `src/components/smart-import/ImportList.tsx` - Import history

---

## Transactions, Smart Categories & Analytics

### Transaction Storage

**Table:** `transactions`

**Key Fields:**
- `id`, `user_id`, `import_id` (links to Smart Import)
- `date`, `amount`, `type` ('income' | 'expense')
- `merchant`, `description`, `category`
- `category_source` ('manual' | 'learned' | 'ai')
- `confidence` (0-100)

### Tag Learning (Phase 1)

**Status:** ✅ Complete

**How It Works:**
1. User changes category → `tag_update_transaction_category` tool called
2. Tool updates transaction + saves to `tag_category_corrections` table
3. Future categorizations query learning table for patterns
4. Tag gets smarter over time

**Table:** `tag_category_corrections`
- Stores: `user_id`, `transaction_id`, `merchant_name`, `old_category`, `new_category`, `source`, `reason`
- Indexed on `(user_id, merchant_name)` for fast lookups

**Phase 2 (Future):**
- Use learning data for auto-categorization
- Optional embeddings for semantic matching

### Crystal Summaries

**Tools:**
- `crystal_summarize_income` - Aggregates income by time period
- `crystal_summarize_expenses` - Aggregates expenses by time period

**Output:**
```typescript
{
  total: number,
  count: number,
  average: number,
  topMerchants: [{ merchant, total, count }]
}
```

### Finley Forecasting

**Uses Crystal Tools:**
- Calls `crystal_summarize_income` and `crystal_summarize_expenses` first
- Uses real data for accurate forecasts
- Then applies forecasting logic (debt payoff, savings growth)

**Forecasting Tools:**
- `finley_debt_payoff_forecast` - Simulates monthly payments, calculates interest
- `finley_savings_forecast` - Projects savings with compounding

---

## Test Suite Overview

### Test Structure

```
tests/
├── smart-import/
│   └── commitImport.test.ts      # Commit flow validation
├── router/
│   └── finleyRouting.test.ts     # Routing pattern tests
├── tools/
│   └── tagUpdateTransactionCategory.test.ts  # Tag learning tests
└── employees/
    └── registry.test.ts          # Registry sanity tests
```

### Test Coverage

**Smart Import (4 tests):**
- Validates import status before commit
- Tests `already_committed` error
- Tests missing transactions error
- Tests invalid status error

**Finley Routing (12 tests):**
- 8 forecasting question patterns
- 4 regression tests (Crystal/Tag routing)

**Tag Learning (4 tests):**
- Successful update with learning
- Graceful failure handling
- Transaction not found
- Old category fetching

**Employee Registry (6 tests):**
- Slug resolution
- Alias resolution
- Employee loading
- Model config retrieval

**Total:** ~26 tests

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui

# Specific file
npm test -- tests/router/finleyRouting.test.ts
```

**Note:** Tests use mocks for Supabase/DB calls - no real database required.

---

## Security & RLS Overview

### Row Level Security (RLS)

**Key Tables with RLS:**

- **`transactions`** - Users can only see their own transactions
- **`imports`** - Users can only access their own imports
- **`transactions_staging`** - Users can only see their own staged transactions
- **`tag_category_corrections`** - Users can only see their own corrections
- **`memory_embeddings`** - Users can only access their own memories
- **`user_memory_facts`** - Users can only see their own facts

### Security Principles

1. **No secrets on frontend** - All sensitive operations server-side
2. **User ID from headers** - `x-user-id` header (not from request body)
3. **RLS policies** - Database-level security, not just application-level
4. **PII redaction** - Guardrails mask PII before storage/logging
5. **Rate limiting** - Prevents abuse

### Guardrails

**Location:** `netlify/functions/_shared/guardrails.ts`

**Features:**
- 40+ PII patterns (SSN, credit cards, emails, etc.)
- OpenAI moderation API integration
- Jailbreak detection
- Full audit trail (`guardrail_events` table)

**Presets:**
- **Strict** (ingestion) - Full PII mask
- **Balanced** (chat) - Keep last-4 digits
- **Creative** (relaxed) - Still PII protected

---

## Roadmap Snapshot

### Next Big Phases

1. **Performance & Caching**
   - Redis caching for frequent queries
   - CDN for static assets
   - Database query optimization

2. **UI/UX Polish**
   - Main dashboard tiles (Prime summary, Smart Import status, Finley card)
   - Smart Import AI page layout improvements
   - Per-employee mini dashboards

3. **More Tests**
   - Integration tests with real DB
   - E2E tests for critical flows
   - Performance tests

4. **Future Employees/Features**
   - Enhanced forecasting models
   - Investment tracking
   - Budget optimization
   - Receipt OCR improvements

### Phase 2 Items (In Progress)

- Tag learning auto-categorization (using `tag_category_corrections`)
- Enhanced Finley forecasting (retirement planning, investment growth)
- Crystal condensed insight mode (short answers)
- Shared document sidebar (unified Document Intelligence panel)

---

## Key File Locations

### Core System Files

- **Employee Registry:** `src/employees/registry.ts`
- **Router:** `netlify/functions/_shared/router.ts`
- **Chat Handler:** `netlify/functions/chat.ts`
- **Memory System:** `netlify/functions/_shared/memory.ts`
- **Session Management:** `netlify/functions/_shared/session.ts`

### Tools

- **Tool Registry:** `src/agent/tools/index.ts`
- **Crystal Tools:** `src/agent/tools/impl/crystal_*.ts`
- **Finley Tools:** `src/agent/tools/impl/finley_*.ts`
- **Tag Tools:** `src/agent/tools/impl/tag_*.ts`

### Smart Import

- **Commit Handler:** `netlify/functions/commit-import.ts`
- **Worker:** `worker/src/workflow/processDocument.ts`
- **Hybrid OCR:** `worker/src/ocr/hybridOcr.ts`
- **UI:** `src/pages/dashboard/SmartImportAI.tsx`

### Database Migrations

- **Employee Unification:** `supabase/migrations/20250216_unify_employee_slugs.sql`
- **Finley Phase 1:** `supabase/migrations/20250220_add_finley_phase1.sql`
- **Tag Learning:** `supabase/migrations/20250220_tag_learning_phase1.sql`
- **Crystal Employee:** `supabase/migrations/20250216_add_crystal_employee.sql`

---

## Quick Reference

### Common Commands

```bash
# Start dev servers
npm run netlify:dev        # Frontend + Functions (port 8888)
npm run worker:dev         # Worker (separate terminal)

# Run tests
npm test                   # All tests
npm run test:watch         # Watch mode

# Run migrations
supabase migration up      # Apply all pending migrations

# Test specific features
npm run test:registry      # Employee registry
npm run test:finley-routing # Finley routing
```

### Common Patterns

**Adding a new employee:**
1. Add row to `employee_profiles` table (via migration)
2. Add alias if needed to `employee_slug_aliases`
3. Registry automatically picks it up

**Adding a new tool:**
1. Create tool in `src/agent/tools/impl/tool_name.ts`
2. Register in `src/agent/tools/index.ts`
3. Add to employee's `tools_allowed` array (via migration)

**Testing routing:**
- Use `scripts/test-finley-routing.ts` as template
- Or add test to `tests/router/`

---

## TODO: Future Enhancements

- [ ] Add architecture diagrams (Mermaid/ASCII)
- [ ] Add API endpoint documentation
- [ ] Add deployment guide
- [ ] Add troubleshooting guide
- [ ] Add performance benchmarks
- [ ] Add security audit details
- [ ] Add screenshots of key UI components

---

**This document is the single source of truth for XspensesAI system architecture. For implementation details, see specific Phase 1/2 summary documents.**





