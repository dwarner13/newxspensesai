# SYSTEM_MAP.md — XspensesAI Agent-Runtime Specification

> Generated 2026-07-05 from live code on branch `sidebar-safe-refactor`.
> Source of truth: code + Supabase schema. The ~665 stale root `.md` files are NOT authoritative — see Section 12 for archive proposal.

---

## 1. System Overview

**What it is:** AI-powered personal finance platform. A team of AI "employees" (Prime, Byte, Tag, Crystal, Finley, Goalie, Liberty, Blitz, Chime, Ledger, Custodian) collaborate to help users manage finances through conversational AI, document processing, and automated categorization.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite (port 5174), Tailwind CSS |
| State | Jotai (atoms, primary), Zustand (stores), React Query v5 |
| Backend | Netlify Functions (Node.js TypeScript, esbuild CJS) |
| Database | Supabase (PostgreSQL) with RLS |
| AI Models | OpenAI GPT-4o / GPT-4o-mini (employees), Claude claude-sonnet-4-6 (OCR fallback, issuer detection) |
| OCR | Google Vision API (primary), Claude Vision (fallback < 75% confidence) |
| Package Manager | pnpm |
| Path Alias | `@/` maps to `src/` |
| Dev Server | `npm run dev:netlify` (port 8888, proxies Vite) |

### Deployment Rule

**`sidebar-safe-refactor` IS prod.** Deploy via `git push origin sidebar-safe-refactor` ONLY. Netlify rebuilds functions from git.

**NEVER use `netlify deploy --build --prod` for function changes** — CLI ships working tree, then the next git push rebuilds from commits, wiping any CLI-deployed code. Frontend-only changes (`src/**`) can use either method.

### Employee Brain Architecture

All employee personas (system prompts, tools, model configs) live in the Supabase `employee_profiles` table. Loaded via `getEmployeeProfileCached()` in `src/employees/registry.ts` with a **5-minute in-memory cache** (CACHE_TTL = 300,000ms). Backend has a secondary 60-second runtime cache in `chat.ts`.

Fallback: if DB is unreachable, `employeeRegistryBackend.ts` extracts employee_key from slug prefix (e.g., `prime-boss` -> `prime`).

---

## 2. Employees

### Employees (verified against employee_profiles, prompt lengths live 2026-07-06)

Three tiers by actual DB `system_prompt` length. Slugs are the REAL rows in
`employee_profiles`. Three slugs (`blitz-debt`, `ledger-tax`, `goalie-coach`) are
near-empty stub ROWS — NOT aliases that resolve to full brains.

#### Tier 1 — Real brains (7)

| Name | Slug | prompt_len | Page / Panel | Tools | Hands Off To |
|------|------|-----------|-------------|-------|-------------|
| **Prime** | `prime-boss` | 6548 | PrimeBriefingPanel (portal, all pages) | `tx_search`, `request_employee_handoff` | Byte, Tag, Crystal |
| **Crystal** | `crystal-ai` | 6176 | CrystalCopilotPanel (My Story) | `analytics_forecast`, `analytics_extract_patterns`, `crystal_summarize_income`, `crystal_summarize_expenses` | — |
| **Liberty** | `liberty-ai` | 6031 | — (routed via chat) | debt payoff engine | — |
| **Byte** | `byte-docs` | 5627 | UploadPageV2 (BytePanelOpen state) | `summarize_import`, `byte_rename_import`, `get_recent_documents`, `get_document_by_id`, `get_transactions_by_document`, `request_employee_handoff` | Prime |
| **Tag** | `tag-ai` | 4234 | TagCopilotPanel (Transactions, Categories) | `tag_*` suite (7 tools), `request_employee_handoff` | Prime (via HANDOFF: JSON) |
| **Custodian** | `custodian` | 3958 | CustodianPanel (Settings) | system help, diagnostics, `ACTION:NAVIGATE:/path` | — |
| **Goalie** | `goalie-ai` | 2511 | GoalieCopilotPanel (Goals & Debt) | `goalie_create_goal`, `goalie_list_goals`, `goalie_update_goal_progress`, `goalie_summarize_goals`, `goalie_suggest_actions` | — |

#### Tier 2 — Thin but real (2)

| Name | Slug | prompt_len | Page / Panel | Notes |
|------|------|-----------|-------------|-------|
| **Chime** | `chime-ai` | 2210 | — (routed via chat) | Short but functional brain; bill/payment reminders |
| **Finley** | `finley-ai` | 257 | — (routed via chat) | Borderline — 257 chars is a paragraph, not a full persona. Forecasting tools carry the behavior, not the prompt |

#### Tier 3 — Stub rows, NOT aliases (3)

Independent near-empty rows in `employee_profiles`. An agent routed here gets a
lobotomized persona, NOT a canonical brain. Live face of the resetThread slug bug (K10b).

| Slug | prompt_len | Reality |
|------|-----------|---------|
| `blitz-debt` | 120 | Placeholder. `usePrimeChat.ts:~2146` routes here — no full `blitz-ai` brain exists |
| `ledger-tax` | 100 | Placeholder. Ledger has no real brain despite LedgerCopilotPanel on Tax Business page |
| `goalie-coach` | 89 | Placeholder. Separate row from `goalie-ai` (2511) — NOT an alias for it |

### Router Stubs (aliases that resolve to canonical slugs)

These are NOT separate employees. The alias resolver in `src/employees/registry.ts` (lines 193-236) maps them:

| Alias | Resolves To |
|-------|------------|
| `crystal-analytics` | `crystal-ai` |
| `goalie-goals` | `goalie-ai` |
| `finley-forecasts` | `finley-ai` |
| `prime`, `prime-ai` | `prime-boss` |
| `byte`, `byte-doc` | `byte-docs` |
| `tag`, `tag-categorize` | `tag-ai` |
| `crystal` | `crystal-ai` |
| `goalie`, `goalie-security` | `goalie-ai` |
| `liberty`, `liberty-freedom` | `liberty-ai` |
| `blitz`, `blitz-actions` | `blitz-ai` (⚠ no `blitz-ai` row exists in DB — falls back) |
| `chime` | `chime-ai` |
| `ledger` | `ledger-tax` (⚠ `ledger-tax` row is a 100-char stub, not a brain) |

> **CORRECTION:** `goalie-coach` and `blitz-debt` are NOT aliases — they are their own
> stub rows in `employee_profiles` (89 / 120 chars). Do not treat them as resolving to
> `goalie-ai` / `blitz-ai`. See Tier 3 above.

### Routing Logic (`_shared/router.ts`)

1. Explicit employee override (user says "talk to [name]")
2. Keyword/fewshot pattern matching with confidence thresholds (0.75-1.0)
3. Jaccard word similarity (50% threshold) against FEWSHOTS training examples
4. Default: `prime-boss`

---

## 3. Dashboard Pages

### Core Pages (nested under `/dashboard`)

| Route | Component | File | Employee Panel | Data Hook | Backend Fn | Supabase Tables Read |
|-------|-----------|------|---------------|-----------|-----------|---------------------|
| `/` (index) | DashboardHomeV2 | `src/pages/DashboardV2/DashboardHomeV2.tsx` | AgentBriefingCard (Prime) | `useDashboardData` | — | transactions, imports |
| `transactions` | TransactionsPageV2 | `src/pages/TransactionsPageV2.tsx` | TagCopilotPanel | `useTransactions`, `useImportList` | — | transactions, imports |
| `categories` | CategoriesPageV2 | `src/pages/CategoriesV2/CategoriesPageV2.tsx` | TagCopilotPanel | `useCategoriesData` | — | transactions |
| `my-story` / `ai-results` | MyFinancialStoryV2 | `src/pages/MyStoryV2/MyFinancialStoryV2.tsx` | CrystalCopilotPanel | `useStoryData` | — | transactions, imports |
| `xspense-score` | XspenseScorePage | `src/pages/XspenseScore/XspenseScorePage.tsx` | — | `useXspenseScore` | — | transactions, imports |
| `upload` | UploadPageV2 | `src/pages/UploadV2/UploadPageV2.tsx` | Byte (state var) | `runSmartImportPipeline` | prime-router, smart-import-*, process-statement | user_documents, imports |
| `goal-concierge` | GoalsDebtPageV2 | `src/pages/GoalsDebtV2/GoalsDebtPageV2.tsx` | GoalieCopilotPanel | `useGoalsData` | — | goals, debts |
| `reports` | ReportsPageV2 | `src/pages/ReportsV2/ReportsPageV2.tsx` | Inline chat (Prime/Crystal/Tag) | `useReportsData` | generate-report, generate-tax-report | transactions |
| `monthly-recap` / `personal-podcast` | MonthlyRecapPageV2 | `src/pages/MonthlyRecapV2/MonthlyRecapPageV2.tsx` | — | `useRecapData` | — | transactions |
| `tax-business` | TaxBusinessPageV2 | `src/pages/TaxBusinessV2/TaxBusinessPageV2.tsx` | LedgerCopilotPanel | — | generate-tax-report | transactions |
| `settings` | SettingsPageV2 | `src/pages/SettingsV2/SettingsPageV2.tsx` | CustodianPanel | `useAuth`, `useProfile` | — | profiles |
| `inbox` | InboxPage | `src/pages/Inbox/InboxPage.tsx` | — | — | — | notifications |

### Layout Architecture

- **Desktop**: `DashboardLayout.tsx` — 3-column (sidebar + content + optional Prime panel). Prime panel is portal-mounted via `isPrimeBriefingOpenAtom` (Jotai).
- **Mobile**: `MobileRevolution.tsx` — bottom navigation tabs, single-column.
- **Gate**: `MobileLayoutGate.tsx` detects viewport width (<768px = mobile).

### Auth Context Stack (outermost to innermost)

`AudioProvider` > `PersonalPodcastProvider` > `AIFinancialAssistantProvider` > `UserProvider` > `ProfileProvider` > `OnboardingUIProvider` > `RouteTransitionProvider` > `DevToolsProvider` > `RightPanelProvider` > `WorkspaceProvider` > `BossProvider` > Routes

---

## 4. Actions

| Trigger | Handler File / Fn | Reads | Writes | Reversible? | Protected? |
|---------|-------------------|-------|--------|------------|-----------|
| Send chat message | `chat.ts` (POST) | chat_sessions, chat_messages, employee_profiles, memory | chat_messages, chat_sessions, chat_convo_summaries | No (message persisted) | Auth required |
| Upload file | `smart-import-init.ts` | user_documents (dedup check) | user_documents (new row) | Yes (delete-upload) | Auth required |
| Run OCR | `smart-import-ocr.ts` | Supabase Storage | user_documents.ocr_text, import_summaries | No | Internal |
| Normalize transactions | `normalize-transactions.ts` | user_documents.ocr_text | transactions_staging | Yes (staging only) | Internal |
| Commit import | `commit-import.ts` | transactions_staging, imports | transactions, imports (status=committed) | No (final) | Auth required |
| Update category | `tx-update-category.ts` | transactions | transactions.category, vendor_category_memory | Yes (re-categorize) | Auth required |
| Split transaction | `tx-split.ts` | transactions | transactions (update + insert) | No (no undo) | Auth required |
| Create goal | `goalie-ai` tool | — | goals | Yes (delete) | Auth required |
| Delete upload | `delete-upload.ts` | imports, transactions, Storage | Deletes records + files | No (destructive) | Auth required |
| Clear chat history | `clear-chat-history.ts` | chat_messages, chat_convo_summaries | Deletes records | No (destructive) | Auth required |
| Generate report | `generate-report.ts` | transactions | — (returns HTML/JSON) | N/A (read-only) | Auth required |
| Send report email | `send-report-email.ts` | transactions | Sends via Resend API | No (email sent) | Auth required |

---

## 5. OCR / Parsing Pipeline (Detailed)

### Full Chain

```
                          CLIENT                                             SERVER
                            |                                                  |
    [1] User drops file     |                                                  |
    (PrimeChatV2 drag-drop  |                                                  |
     or UploadPageV2)       |                                                  |
            |               |                                                  |
    [2] runSmartImportPipeline.ts                                              |
            |               |                                                  |
            +-- Mode A: POST /.netlify/functions/prime-router (multipart) ---->+
            |                                                                  |
            +-- Mode B (fallback): step-by-step pipeline ----------------->    |
                            |                                                  |
                            |    [3] smart-import-init.ts                      |
                            |        - Compute upload_hash = SHA256(userId|    |
                            |          fileName|fileSize|mimeType|lastModified)|
                            |        - Check user_documents for existing hash  |
                            |        - Create user_documents row (status=      |
                            |          'uploading')                            |
                            |        - Return signed upload URL + docId        |
                            |                                                  |
                            |    [4] Client PUTs bytes to signed URL           |
                            |                                                  |
                            |    [5] smart-import-finalize.ts                  |
                            |        - Route by MIME: PDF/image -> OCR         |
                            |          CSV/OFX/QIF -> parse-csv               |
                            |                                                  |
                            |    [6] smart-import-ocr.ts (142 KB)             |
                            |        Stage 1: pdf-parse (text extraction)      |
                            |          Confidence = alphanumeric ratio          |
                            |          If >= 75%: proceed                      |
                            |          If < 75%: fallback                      |
                            |        Stage 2: Google Vision API (per-page)     |
                            |          Early stop at >= 85% on 2+ pages        |
                            |          Max 10 pages                            |
                            |        Stage 3: Claude Vision (claude-sonnet-4-6)|
                            |          Bank-specific extraction rules           |
                            |        Output: user_documents.ocr_text           |
                            |                                                  |
                            |    [7] prime-router status mode polls            |
                            |        ocr-job-status.ts                         |
                            |        (stale lock detection: 10 min)            |
                            |                                                  |
                            |    [8] smart-import-sync.ts                      |
                            |        - Wait for OCR (60s timeout, 1s poll)     |
                            |        - Call normalize-transactions             |
                            |        - If autoCommit: call commit-import       |
                            |                                                  |
                            |    [9] normalize-transactions.ts                 |
                            |        - Detect issuer (ISSUER_PATTERNS regex)   |
                            |        - Parse OCR via ocr_normalize.ts          |
                            |        - INSERT into transactions_staging        |
                            |          (hash = SHA256(import_id|date|          |
                            |           merchant|amount))                      |
                            |        - Set imports.status = 'parsed'           |
                            |                                                  |
                            |    [10] RECONCILIATION GATE                      |
                            |        commit-import.ts (lines 655-723)          |
                            |        - Sum staging debits/credits              |
                            |        - Compare vs printed statement totals     |
                            |          from import_summaries                   |
                            |        - If discrepancy <= $1.00: RECONCILED     |
                            |        - If discrepancy > $1.00: HTTP 422        |
                            |          status = 'parsed_unreconciled'          |
                            |          User must manually review               |
                            |                                                  |
                            |    [11] commit-import.ts (if reconciled)         |
                            |        - Fetch staging rows                      |
                            |        - Tag auto-categorize uncategorized rows  |
                            |          via categorizeTransactionWithLearning() |
                            |        - INSERT into transactions                |
                            |          (ON CONFLICT hash DO NOTHING)           |
                            |        - Build StatementBreakdown v1             |
                            |        - Update imports (status=committed,       |
                            |          statement_breakdown_json)               |
                            |        - Detect recurring obligations            |
                            |        - Queue Chime payment notifications       |
                            |                                                  |
                            |    [12] tag-categorize-batch.ts                  |
                            |        - Rule matching first                     |
                            |        - Vendor memory lookup                    |
                            |        - Claude AI fallback for uncertain        |
                            |                                                  |
                            |    [13] prime-summary.ts                         |
                            |        - LLM path (if PRIME_SUMMARY_ALLOW_LLM=1)|
                            |        - Deterministic formatter (fallback)      |
                            |        - Returns advisor summary + breakdown     |
```

### Bank-Specific Parsing (process-statement.ts, Claude Vision prompt)

All bank rules are in a single Claude Vision prompt (lines 199-252 of `process-statement.ts`) — **one branchy parser, NOT per-bank profiles**.

| Bank | Format | Rules |
|------|--------|-------|
| **RBC VISA** | Single AMOUNT column | +ve = charge (debit), -ve = payment (credit); strip "Foreign Currency - USD" lines |
| **RBC Chequing** | 3-column (Withdrawals/Deposits/Balance) | Use first two columns only; skip opening/closing balance rows |
| **BMO** | 3-column (Amounts deducted/added/Balance) | Same 3-column logic; strip terminal IDs |
| **TD** | 3-column (Withdrawals/Deposits/Balance) | Strip pre-auth prefixes; handle wrapped descriptions |
| **Scotiabank** | 3-column | Strip terminal IDs from merchants |
| **CIBC** | 3-column | Detect "Pre-Authorized Payment" prefixes |
| **Capital One** | Auto-detected via ISSUER_PATTERNS | Standard parsing |
| **Triangle MC / Canadian Tire** | Auto-detected via ISSUER_PATTERNS | Issuer detection returns null (KNOWN ISSUE) |
| **Tangerine** | Credit union rules | Mobile cheque deposits, ABM withdrawals |
| **Simplii** | Standard | Interac e-Transfer detection |

All banks: strip store IDs (`#6620`), terminal IDs (`*#XXXX`) from merchant names.

### 4 Dedup Hash Columns on user_documents / staging

| Column | Table | Hash Input | Purpose |
|--------|-------|-----------|---------|
| `upload_hash` | user_documents | `SHA256(userId\|fileName\|fileSize\|mimeType\|lastModified)` | Prevent re-uploading same file |
| `file_hash` | user_documents | SHA256 of file bytes | Content-based dedup (different metadata, same bytes) |
| `hash` | transactions_staging | `SHA256(import_id\|date\|merchant\|amount)` | Prevent duplicate staging rows (UNIQUE) |
| `hash` | transactions | Same as staging | Prevent duplicate committed rows (`transactions_dedupe_key` UNIQUE) |

### Reconciliation Gate Detail

- **Trigger**: `commit-import.ts` lines 655-723
- **Method**: `|computed_net - (closing_balance - opening_balance)| > $1.00`
- **Pass**: `imports.status = 'committed'`, HTTP 200
- **Fail**: `imports.status = 'parsed_unreconciled'`, HTTP 422
- **Recovery**: User reviews in Smart Import, then re-commits

### Protected Functions (auth required)

`chat.ts`, `smart-import-init.ts`, `smart-import-sync.ts`, `commit-import.ts`, `approve-import.ts`, `delete-upload.ts`, `tx-search.ts`, `tx-update-category.ts`, `tx-split.ts`, `generate-report.ts`, `generate-tax-report.ts`, `send-report-email.ts`, `prime-state.ts`, `prime-summary.ts`, `activity-feed.ts`, `admin-data.ts` (+ admin check)

---

## 6. Backend Functions Index

### Core Pipeline (6)

| Function | Purpose | Auth |
|----------|---------|------|
| `chat.ts` | Unified chat endpoint — routing, guardrails, memory, streaming, tool execution | Yes |
| `prime-router.ts` | Orchestrates upload/status/summary modes for import pipeline | Yes |
| `prime-summary.ts` | Generates advisor summary (LLM or deterministic) after import | Yes |
| `prime-state.ts` | Returns Prime's canonical state for UI (read-only) | Yes |
| `prime-briefing.ts` | Generates daily briefing after import sweep | Yes |
| `prime-live-stats.ts` | Real-time employee stats for command center | Yes |

### Smart Import Pipeline (7)

| Function | Purpose | Auth |
|----------|---------|------|
| `smart-import-init.ts` | Creates doc record, returns signed upload URL | Yes |
| `smart-import-finalize.ts` | Routes by MIME to OCR or CSV parser | Yes |
| `smart-import-ocr.ts` | Multi-stage OCR (pdf-parse -> Google Vision -> Claude Vision) | Internal |
| `smart-import-parse-csv.ts` | CSV/OFX/QIF parser (multi-bank format) | Internal |
| `smart-import-sync.ts` | Waits for OCR, triggers normalize, optionally commits | Yes |
| `normalize-transactions.ts` | OCR text -> transactions_staging rows | Internal |
| `commit-import.ts` | Staging -> transactions with reconciliation gate | Yes |

### OCR & Document (8)

| Function | Purpose | Auth |
|----------|---------|------|
| `ocr-job-status.ts` | Poll async OCR job progress | Yes |
| `process-statement.ts` | One-shot statement OCR with Claude Vision | Yes |
| `process-spreadsheet.ts` | XLSX classification via Claude | Yes |
| `byte-ocr-parse.ts` | Byte's standalone OCR parser | Yes |
| `delete-upload.ts` | Secure file + DB record deletion | Yes |
| `purge-document.ts` | OCR artifact cleanup (keeps transactions) | Yes |
| `approve-import.ts` | Mark import as user-approved | Yes |
| `byte-warm.ts` | Scheduled cold-start prevention (every 1 min) | No |

### Transaction Management (4)

| Function | Purpose | Auth |
|----------|---------|------|
| `tx-search.ts` | Search/filter committed transactions (NON_SPEND_CATEGORIES excluded) | Yes |
| `tx-get.ts` | Fetch single transaction with signed amounts | Yes |
| `tx-update-category.ts` | Update category + optional vendor learning | Yes |
| `tx-split.ts` | Split transaction into multiple categories | Yes |

### Tag Categorization (18)

| Function | Purpose | Auth |
|----------|---------|------|
| `tag-action.ts` | NL intent handler (preview, commit, save_rule, undo, bulk_apply, fix_type) | Yes |
| `tag-categorize-batch.ts` | Batch AI categorization (rules -> vendor memory -> Claude) | Yes |
| `tag-categorize-committed.ts` | Rule-based categorization of committed rows (no AI) | Yes |
| `tag-background-sweep.ts` | Post-import sweep for "Needs Review" rows | Yes |
| `tag-bulk-fix.ts` | Apply known merchant categorization fixes | Yes |
| `tag-reclassify-other.ts` | Re-categorize "Other" transactions | Yes |
| `tag-smart-review.ts` | Scan for categorization errors, return issues | Yes |
| `apply-category-rules.ts` | Apply user rules + vendor memory to committed rows | Yes |
| `tag-chat.ts` | Tag's standalone chat endpoint | Yes |
| `tag-copilot.ts` | Tag's copilot panel (Claude + tool_use blocks) | Yes |
| `tag-explain.ts` | Explain single transaction categorization | Yes |
| `tag-merchant-insights.ts` | Merchant category insights | Yes |
| `tag-merchant-sweep.ts` | Unknown merchant detection | Yes |
| `tag-learn.ts` | Category correction learning | Yes |
| `tag-memory-upsert.ts` | Direct vendor -> category upsert | Yes |
| `tag-activity-log.ts` | Tag activity history | Yes |
| `tag-inbox.ts` | Tag notification inbox | Yes |
| `tag-notifications.ts` | Tag notification settings | Yes |

### Other Functions (16)

| Function | Purpose | Auth |
|----------|---------|------|
| `chat-threads.ts` | Recent conversation threads list | Yes |
| `clear-chat-history.ts` | Delete messages + summaries for session/employee | Yes |
| `custodian-chat.ts` | Custodian system help chat | Yes |
| `activity-feed.ts` | Activity events for user | Yes |
| `generate-report.ts` | Financial report generation | Yes |
| `generate-tax-report.ts` | 3-page HTML tax summary | Yes |
| `send-report-email.ts` | Email report via Resend | Yes |
| `send-email.ts` | Generic email sender (Resend/SendGrid) | Yes |
| `receipt-upload.ts` | Receipt OCR + auto-match to transactions | Yes |
| `receipt-match.ts` | Match pending receipts to committed transactions | Yes |
| `sync-recurring-obligations.ts` | Detect recurring payment patterns | Yes |
| `user-subcategories.ts` | Built-in + user subcategories | Yes |
| `document-insights.ts` | AI Q&A on uploaded documents | Yes |
| `set-import-issuer.ts` | Detect bank issuer via Claude Haiku | Yes |
| `admin-data.ts` | Admin dashboard data | Yes + Admin |
| `memory-extraction-worker.ts` | Async memory fact processing | No (scheduled) |

### Health & Test (7)

| Function | Purpose |
|----------|---------|
| `ping.ts` | `{ ok: true, message: 'Pong!' }` |
| `functions-health.ts` | Quick health check (no AI calls, <100ms) |
| `guardrails-health.ts` | Guardrails module + Supabase reachability |
| `test.ts`, `selftest.ts` | Basic test endpoints |
| `ocr.ts` | OCR stub (ESM) |
| `categorize-transactions.ts` | Categorization stub |

### Key Shared Modules (`_shared/`)

| Module | Purpose |
|--------|---------|
| `guardrails-unified.ts` | PII masking (32+ detectors), moderation, jailbreak detection |
| `pii-patterns.ts` | Single source of truth for PII detection |
| `router.ts` | Employee routing (fewshot + keyword matching) |
| `session.ts` | Chat session management (ensureSession, getRecentMessages) |
| `ensureThread.ts` | Thread creation/resume (UNIQUE constraint handler) |
| `primeByteAnnouncement.ts` | Byte -> Prime completion announcement |
| `primeSummarizer.ts` | LLM prompt + deterministic formatter |
| `financial-snapshot.ts` | Build financial snapshot (NON_SPEND filtered) |
| `categorize.ts` | Transaction categorization logic |
| `employeeRegistryBackend.ts` | Backend slug-to-key resolver |
| `employeeModelConfig.ts` | Model routing per employee |
| `tool-schemas.ts` / `tool-executor.ts` / `tool-registry.ts` | Tool system |
| `openai_client.ts` | OpenAI SDK initialization |
| `logAiActivity.ts` | AI activity event logging |

---

## 7. Data / Tables

### Core Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `chat_sessions` | Session tracking (legacy, mostly superseded by threads) | Unverified |
| `chat_messages` | Individual messages with session_id + thread_id | **YES** |
| `chat_threads` | Thread grouping — UNIQUE(user_id, assistant_key) | **YES** |
| `chat_convo_summaries` | AI-generated conversation summaries | **YES** |
| `transactions` | Final committed financial data | **YES** |
| `transactions_staging` | Temporary parsed rows pre-commit | **YES** |
| `imports` | Upload tracking + statement_breakdown_json (JSONB) | **YES** |
| `import_summaries` | OCR metadata + fallback breakdown storage | **YES** |
| `user_documents` | Document files + OCR text/status/hashes | **YES** (inferred) |
| `employee_profiles` | AI employee registry (slug, system_prompt, tools_allowed, model) | No (backend-only) |
| `profiles` | Extended user profiles (extends auth.users) | **YES** |
| `goals` | Savings goals | **YES** |
| `debts` | Debt tracking | **YES** |
| `score_history` | Xspense Score time series | **YES** |

### Categorization Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `category_rules` | User-defined auto-categorization rules | **YES** |
| `vendor_category_memory` | Tag learned merchant -> category associations | **YES** |
| `normalized_merchants` | Canonical merchant name mapping | **YES** |
| `category_history` | Audit trail of category changes | **YES** |
| `correction_events` | User manual category corrections | **YES** |
| `merchant_profiles` | Learned merchant defaults | **YES** |
| `transaction_categorizations` | Immutable versioned categorization history | **YES** |

### Activity & Audit Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `ai_activity_events` | Employee activity logging (event_type, announced_at) | **YES** (inferred) |
| `notifications` | In-app notifications from AI employees | **YES** |
| `audit_logs` | System audit trail | **YES** |
| `tag_activity_log` | Tag-specific activity | Referenced |
| `jobs` | Async job/task tracking | **YES** |
| `ocr_jobs` | OCR job status tracking | Referenced |

### Metrics Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `metrics_categorization_daily` | Daily categorization metrics | **YES** |
| `metrics_rule_performance` | Per-rule accuracy tracking | **YES** |
| `metrics_function_performance` | Function latency & errors | **YES** |
| `metrics_user_corrections` | Learning metrics from corrections | **YES** |

### Legacy / Compatibility

| Table | Purpose | RLS |
|-------|---------|-----|
| `conversations` | Legacy conversation metadata | **YES** |
| `messages` | Alias for chat_messages | **YES** |
| `receipts` | Receipt storage | **YES** |
| `rules` | Generic rules | Referenced |
| `tool_calls` | Tool execution tracking | Referenced |
| `handoffs` | Agent-to-agent handoff records | **YES** |
| `prime_user_state` | Prime intro + preferences | **YES** |

---

## 8. Chat Identifier Model + Handoff Protocol + Shared State

### Three Identifiers (Reconciled)

```
+--------------+----------+----------------+------------------+-------------------+
| Identifier   | Created  | Persisted      | Scope            | Primary Use       |
+--------------+----------+----------------+------------------+-------------------+
| session_id   | Frontend | localStorage   | User + Employee  | Message history   |
|              | (UUID)   | chat_session_  |                  | grouping (legacy) |
|              |          | {userId}_{slug}|                  |                   |
+--------------+----------+----------------+------------------+-------------------+
| thread_id    | Backend  | localStorage + | User + Employee  | FK for messages   |
|              | (UUID)   | chat_threads   | (UNIQUE)         | (primary)         |
|              |          | table          |                  |                   |
+--------------+----------+----------------+------------------+-------------------+
| conversation | Backend  | chat_convo_    | User + Employee  | Analytics /       |
| _id          | (derived)| summaries      |                  | history sidebar   |
+--------------+----------+----------------+------------------+-------------------+
```

### 1-Thread-Per-Assistant Model

**Constraint**: `chat_threads` has `UNIQUE(user_id, assistant_key)` — exactly ONE thread per user+assistant exists in the database.

**ensureThread.ts behavior** (current, post-revert):
- If `threadId` is passed: upsert that exact thread (for frontend-provided IDs)
- If no `threadId`: always resume the single existing thread for that user+assistant
- If no thread exists: create one (new user case)

**Conversation freshness is handled at the session/message-load layer, NOT by creating threads.** The backend always returns the same thread_id for a given user+employee. The frontend controls what messages are visible based on session_id rotation.

### New Chat Lifecycle

1. User clicks "New Chat" in PrimeChatV2
2. Frontend generates `newSessionId = crypto.randomUUID()`
3. Writes to `localStorage.setItem(\`chat_session_${userId}_prime-boss\`, newSessionId)`
4. `resetThread()` clears thread_id from localStorage and resets 13 state values
5. Next message sends new sessionId to backend
6. Backend's `ensureThread()` returns the SAME thread (UNIQUE constraint)
7. Backend's `ensureSession()` creates a new session row
8. Frontend loads no history (new session has no messages yet)

### Vestigial Identifiers

- **`chat_sessions` table**: Mostly unused; session_id lives primarily in localStorage
- **`conversation_id`**: Backward-compat column in `chat_convo_summaries` (code handles both `convo_id` and `conversation_id` column names)
- **`useChatHistory.ts`**: Dead code — defined but never imported anywhere. Replaced by `useUnifiedChatEngine`

### Handoff Protocol

#### Tool-Based Handoff (`request_employee_handoff`)

**Location**: `src/agent/tools/impl/request_employee_handoff.ts`

**Schema**:
```
{
  target_slug: string     // e.g., "byte-docs", "tag-ai"
  reason?: string
  summary_for_next_employee?: string
  handoff_type?: "standard" | "plugin"
  plugin_payload?: Record<string, any>
}
```

**Who can initiate**: Prime and Tag (confirmed in `chat.ts`)

**Backend processing** (in `chat.ts`):
1. Parse `request_employee_handoff` tool call from model output
2. Validate target slug exists
3. Update `chat_sessions.employee_slug` to new employee
4. Insert system message: "Handing off to [employee]..."
5. Continue conversation with new employee's system prompt + tools

#### Tag's HANDOFF: Signal Parsing

**Location**: `tag-chat.ts` (lines 1085-1093), `TagCopilotPanel.tsx`

Tag emits a structured signal in its reply text:
```
HANDOFF:{"to":"prime-boss","reason":"categorization complete"}
```

Frontend regex in TagCopilotPanel:
```typescript
const handoffMatch = replyText.match(/HANDOFF:\s*\{[^}]*"to"\s*:\s*"([^"]+)"[^}]*\}/);
```

Backend regex in tag-chat.ts:
```typescript
const handoffMatch = reply.match(/HANDOFF:\s*(\{[^}]+\})/);
```

**ISSUE**: Only Tag parses incoming HANDOFF: JSON. Other agents do not have HANDOFF parsing logic. This is asymmetric.

#### Byte -> Prime Announcement

**Location**: `_shared/primeByteAnnouncement.ts`

**Flow**:
1. Byte completes OCR -> inserts `ai_activity_events` with `event_type: 'byte.import.completed'`
2. `announceByteCompletionToPrime()` fetches unannounced events (`announced_at IS NULL`)
3. Calls `ensureThread(sb, userId, employeeKey, undefined, undefined, { resumeLatest: true })` to find Prime's thread
4. Inserts system message with completion details
5. Marks event as announced (idempotency via `client_message_id: 'byte-announce-${importRunId}'`)

### What Autonomous Agent-to-Agent Handoff Would Require

Currently, handoff is semi-manual (tool call -> backend routing). Full autonomous handoff would need:

1. **Shared handoff bus**: A `handoffs` table row (already exists) with structured payload, status tracking, and TTL
2. **Arrival greeting**: When employee B receives a handoff, it should generate an arrival message acknowledging the context — currently missing
3. **Symmetric parsing**: All employees need to parse incoming HANDOFF: signals, not just Tag
4. **Context transfer**: The `summary_for_next_employee` field must be reliably passed through and injected into the target employee's system prompt
5. **Completion callback**: Target employee should be able to signal "handoff complete, returning to Prime" without user intervention
6. **Pipeline ordering**: Prime -> Byte -> Tag -> Prime close (strict order, per CLAUDE.md)

---

## 9. Known Issues & Tech Debt

### Critical

| ID | Issue | Files | Status |
|----|-------|-------|--------|
| K1 | **NON_SPEND_CATEGORIES duplicated in 9 files** instead of shared module | `usePrimeBriefingData.ts`, `financial-snapshot.ts`, `tx-search.ts`, `useStoryData.ts`, `useDashboardData.ts`, `useXspenseScore.ts`, `useCategoriesData.ts`, `CrystalCopilotPanel.tsx`, `chat.ts` | OPEN |
| K2 | **prime-summary called 3x per import** | `prime-summary.ts`, `prime-router.ts` | OPEN |
| K3 | **ai_activity_events insert failing** — employee_id NOT NULL | `logAiActivity.ts`, `byteActivityEvents.ts` | OPEN |

### Medium

| ID | Issue | Files | Status |
|----|-------|-------|--------|
| K4 | **Issuer detection null for Canadian Tire / Triangle** — needs hardcoded pattern | `set-import-issuer.ts` | OPEN |
| K5 | **Foreign currency captures USD instead of CAD** | `normalize-transactions.ts`, `process-statement.ts` | OPEN |
| K6 | **Payment/credit transactions dropped from capture** | OCR parsers | OPEN |
| K7 | **Placeholder text "still syncing" in Issues section** | Prime summary UI | OPEN |
| K8 | **Handoff-arrival greeting missing** — target employee doesn't acknowledge handoff context | `chat.ts` | OPEN |
| K9 | **HANDOFF: JSON parsing asymmetric** — only Tag parses it | `tag-chat.ts` vs all others | OPEN |
| K10 | **Identifier fragmentation** — session_id, thread_id, conversation_id triple; chat_sessions vestigial | Multiple | ARCHITECTURAL |
| K10b | **resetThread slugs resolve to stub rows** — `usePrimeChat.ts:~2146` uses `blitz-debt` (120 chars) / `goalie-coach` (89 chars); near-empty `employee_profiles` rows, not canonical brains. Users hitting these paths get lobotomized agents. Confirmed live via prompt_len query 2026-07-06 | `usePrimeChat.ts`, `employee_profiles` | OPEN — USER-FACING |

### Low

| ID | Issue | Files | Status |
|----|-------|-------|--------|
| K11 | **useChatHistory.ts is dead code** | `src/hooks/useChatHistory.ts` | OPEN (delete) |
| K12 | **Em-dash mojibake in source comment** — `"a"\u20ac\u201c"` | `PrimeChatV2.tsx` line 21 | COSMETIC |
| K13 | **Employee color definitions duplicated** in `employeeThemes.ts` + `employeeDisplayConfig.ts` | `src/config/` | By design (different purposes) |
| K14 | **ByteCopilotPanel.tsx is dead code** — never imported | `src/components/` | OPEN (delete) |
| K15 | **crystal-analyze-import.ts is a stub** — returns `{ ok: true, skipped: true }` | `netlify/functions/` | PLACEHOLDER |
| K16 | **Goalie pages fully implemented** but data hooks may use placeholder data | `src/pages/GoalsDebtV2/` | VERIFY |
| K17 | **BMO dropped rows** — balance column confused with transaction amount in edge cases | `process-statement.ts` prompt | OPEN |
| K18 | **Duplicate RLS policy potential** — only 1 safe DROP POLICY in migrations (20260302 for category_rules) | `sql/migrations/` | LOW RISK |

### Fixed (for reference)

| ID | Issue | Fix Commit |
|----|-------|-----------|
| F1 | Session rotation / zombie-session | `9a863e5b` |
| F2 | Transfers counted as spending (all paths) | Multiple (see MEMORY.md) |
| F3 | import_summaries missing UNIQUE(import_id) | `20260312` migration |
| F4 | teamActivitySummary circular injection | `ac56b225` |
| F5 | chat_convo_summaries 42703 error (nonexistent session_id filter) | `fae5c26f` |

---

## 10. Security Hardening Checklist

| Area | Current State | Risk | Action | Status |
|------|--------------|------|--------|--------|
| **RLS on core tables** | 39+ tables with ENABLE ROW LEVEL SECURITY | LOW | Verify all policies use `auth.uid()` correctly | VERIFY |
| **RLS on employee_profiles** | No RLS (backend-only table) | LOW | Acceptable if only admin/service role writes | OK |
| **Duplicate RLS policies** | 1 safe DROP POLICY (category_rules, 20260302) | LOW | Audit all migrations for policy name collisions | TODO |
| **PII masking** | 32+ detectors in `pii-patterns.ts` (single source of truth) | LOW | Never duplicate PII logic outside this file | OK |
| **Guardrails on all chat** | `guardrails-unified.ts` runs on every POST to chat.ts | LOW | Verify no bypass paths exist | VERIFY |
| **Auth on endpoints** | All mutation endpoints require `verifyAuth` | LOW | Audit test endpoints (`test.ts`, `selftest.ts`, `ocr.ts`) for prod exposure | TODO |
| **Public endpoints** | `ocr-ingest-simple.ts`, `openai-vision.ts` have NO auth | **MEDIUM** | Rate-limit or auth-gate these in production | TODO |
| **Admin check** | `admin-data.ts` verifies `is_admin=true` | LOW | Ensure `is_admin` column is not user-writable via RLS | VERIFY |
| **OpenAI never from frontend** | All AI calls server-side via Netlify Functions | LOW | Ensure no `VITE_OPENAI_*` env vars leak | OK |
| **Audit trail immutability** | `transaction_categorizations` is append-only (versioned) | LOW | Ensure no DELETE policies exist on audit tables | VERIFY |
| **Consent tracking** | No `consents` table found in migrations or code | **MEDIUM** | Add consent tracking for GDPR/PIPEDA compliance | TODO |
| **Signed upload URLs** | Supabase Storage signed URLs for file uploads | LOW | Verify URL expiry is short (< 1 hour) | VERIFY |
| **Secrets in code** | `secrets/google-vision-key.json` referenced in `vision-ocr.ts` (dev only) | LOW | Ensure .gitignore covers secrets/ | VERIFY |
| **Rate limiting** | `rate-limit-v2.ts` exists in _shared | LOW | Verify it's applied to chat.ts and other high-traffic endpoints | VERIFY |
| **Function output format** | CJS (esbuild `format = "cjs"`) | LOW | Correct for Netlify Functions | OK |

---

## 11. Dual-Track Storyboard

### User Journey (top) + Data Flow (bottom)

#### Beat 1: Signup / Onboarding

**USER**: Visits `/signup` -> creates account -> redirected to `/onboarding/setup` -> Custodian guides through profile setup.

**DATA**:
```
auth.users (Supabase Auth) -> profiles (auto-created on signup)
  -> prime_user_state (has_seen_intro = false)
  -> OnboardingSetupPage renders CustodianPanel
```

---

#### Beat 2: Upload

**USER**: Navigates to `/dashboard/upload` -> drags PDF/CSV onto UploadPageV2 -> sees upload progress overlay.

**DATA**:
```
File -> runSmartImportPipeline.ts
  -> POST prime-router (upload mode)
    -> smart-import-init.ts
      WRITE: user_documents (status='uploading', upload_hash)
      RETURN: signed URL + docId
    -> Client PUT bytes to signed URL
      WRITE: Supabase Storage (docs bucket)
```

---

#### Beat 3: OCR / Parse

**USER**: Sees "Byte is processing..." overlay with progress indicator.

**DATA**:
```
smart-import-finalize.ts routes by MIME:
  PDF/Image -> smart-import-ocr.ts
    Stage 1: pdf-parse (text extraction)
    Stage 2: Google Vision API (per-page, if confidence < 75%)
    Stage 3: Claude Vision claude-sonnet-4-6 (fallback)
    WRITE: user_documents.ocr_text, user_documents.ocr_status='ready'
    WRITE: import_summaries (raw_ocr_text, confidence_score, source)

  CSV/OFX -> smart-import-parse-csv.ts
    WRITE: transactions_staging (parsed rows)

ocr-job-status.ts polled every 2s by prime-router status mode
```

---

#### Beat 4: Reconcile

**USER**: If reconciled: seamless flow to commit. If unreconciled: sees "Review Required" with discrepancy amount.

**DATA**:
```
smart-import-sync.ts waits for OCR -> calls normalize-transactions.ts
  WRITE: transactions_staging (hash-deduped)
  WRITE: imports.status = 'parsed'

commit-import.ts reconciliation gate:
  READ: import_summaries (opening_balance, closing_balance)
  COMPUTE: |net_computed - net_printed| > $1.00?
    YES -> imports.status = 'parsed_unreconciled', HTTP 422
    NO  -> proceed to commit
```

---

#### Beat 5: Tag (Auto-Categorize)

**USER**: Sees categories appearing on transactions in real-time. Can correct via TagCopilotPanel.

**DATA**:
```
commit-import.ts calls categorizeTransactionWithLearning():
  READ: category_rules (user rules)
  READ: vendor_category_memory (learned associations)
  FALLBACK: Claude AI for uncertain merchants
  WRITE: transactions.category
  WRITE: vendor_category_memory (learning)

tag-categorize-batch.ts for bulk:
  WRITE: transactions_staging.tag_category, tag_confidence, tag_status
```

---

#### Beat 6: Commit

**USER**: Transactions appear in `/dashboard/transactions`. Import marked complete.

**DATA**:
```
commit-import.ts:
  READ: transactions_staging
  WRITE: transactions (INSERT ON CONFLICT hash DO NOTHING)
  WRITE: imports (status='committed', committed_at, committed_count, statement_breakdown_json)
  CALL: detectAndUpsertRecurringObligations()
  CALL: queueUpcomingPaymentNotifications() (Chime)
```

---

#### Beat 7: Chat + Handoff

**USER**: Opens Prime panel -> asks about spending -> Prime may hand off to Crystal for deep analytics or Tag for recategorization.

**DATA**:
```
POST /.netlify/functions/chat
  -> guardrails-unified.ts (PII mask, moderation, jailbreak)
  -> router.ts selects employee by slug or keyword
  -> ensureThread() resumes single thread (UNIQUE constraint)
  -> ensureSession() creates/finds session
  -> getRecentMessages(sessionId) loads context
  -> OpenAI API call with system_prompt + tools
  -> Tool execution (tx_search, request_employee_handoff, etc.)
  -> WRITE: chat_messages (session_id + thread_id)
  -> ASYNC: Custodian generates conversation summary -> chat_convo_summaries

Handoff: request_employee_handoff tool call
  -> UPDATE chat_sessions.employee_slug
  -> INSERT system message for new employee
  -> Next request routes to new employee
```

---

#### Beat 8: Crystal (Analytics)

**USER**: Views `/dashboard/my-story` -> sees spending trends, income analysis, category breakdowns via CrystalCopilotPanel.

**DATA**:
```
useStoryData.ts:
  READ: transactions (NON_SPEND_CATEGORIES filtered)
  COMPUTE: monthly trends, category totals, income vs expense

CrystalCopilotPanel.tsx:
  POST /.netlify/functions/chat (employeeSlug: 'crystal-ai')
  TOOLS: analytics_forecast, crystal_summarize_income, crystal_summarize_expenses
```

---

#### Beat 9: Goalie (Goals & Debt)

**USER**: Views `/dashboard/goal-concierge` -> sets savings goals, tracks debt payoff via GoalieCopilotPanel.

**DATA**:
```
useGoalsData.ts:
  READ: goals, debts, transactions (for savings rate)

GoalieCopilotPanel.tsx:
  POST /.netlify/functions/chat (employeeSlug: 'goalie-ai')
  TOOLS: goalie_create_goal, goalie_list_goals, goalie_update_goal_progress
```

---

#### Beat 10: Export to Accountant

**USER**: Navigates to `/dashboard/reports` or `/dashboard/tax-business` -> generates tax summary -> downloads or emails to accountant.

**DATA**:
```
POST /.netlify/functions/generate-tax-report
  READ: transactions (filtered by deductible categories)
  COMPUTE: Bucket by tax category (meals, office, vehicle, etc.)
  RETURN: Content-Type: text/html (user prints to PDF)

POST /.netlify/functions/send-report-email
  READ: transactions
  SEND: Via Resend API to accountant email
```

---

## 12. Stale Root `.md` Archive Proposal

There are **664 stale `.md` files** in the project root (excluding `CLAUDE.md` and `README.md`). These are session logs, audit reports, implementation summaries, and fix documentation from 2025-2026 that do NOT reflect the current codebase state.

**Proposed action**: `git mv` all 664 files to `docs/archive-2025/` in a single commit.

**Files to KEEP in root**:
- `CLAUDE.md` (project instructions, actively maintained)
- `README.md` (project readme)
- `SYSTEM_MAP.md` (this file)

**`git mv` command list** (review before executing — DO NOT execute without Darrell's approval):

```bash
# Create target directory
mkdir -p docs/archive-2025

# Move all root .md files EXCEPT CLAUDE.md, README.md, SYSTEM_MAP.md
git mv ACCOUNT_MODE_IMPLEMENTATION_SUMMARY.md docs/archive-2025/
git mv ACCOUNT_MODE_TEST_STEPS.md docs/archive-2025/
git mv ACTIVITY_FEED_DUPLICATE_AUDIT.md docs/archive-2025/
git mv ACTIVITY_FEED_DUPLICATE_REMOVAL.md docs/archive-2025/
git mv ACTIVITY_FEED_STUB_FIX.md docs/archive-2025/
git mv ADVANCED_ANALYTICS_COMPLETE.md docs/archive-2025/
git mv AGENTS.md docs/archive-2025/
git mv AGENT_NETWORK.md docs/archive-2025/
git mv AI_CHATBOT_GUIDE.md docs/archive-2025/
git mv AI_CHAT_SYSTEM_ERD.md docs/archive-2025/
git mv AI_CHAT_SYSTEM_REPORT.md docs/archive-2025/
git mv AI_COMPONENTS_GUIDE.md docs/archive-2025/
git mv AI_COMPONENTS_SUMMARY.md docs/archive-2025/
git mv AI_EMPLOYEE_CAPABILITIES_AUDIT.md docs/archive-2025/
git mv AI_EMPLOYEE_DOCUMENT_PROCESSING_GUIDE.md docs/archive-2025/
git mv AI_EMPLOYEE_SYSTEM_GUIDE.md docs/archive-2025/
git mv AI_EMPLOYEE_TOOLS_AND_MEMORY_GUIDE.md docs/archive-2025/
git mv AI_FLUENCY_IMPLEMENTATION_SUMMARY.md docs/archive-2025/
git mv AI_FLUENCY_SYSTEM_IMPLEMENTATION.md docs/archive-2025/
git mv AI_INTEGRATION_README.md docs/archive-2025/
# ... (664 files total — full list available on request)
```

**Alternatively, a single shell command**:

```bash
mkdir -p docs/archive-2025
for f in *.md; do
  case "$f" in
    CLAUDE.md|README.md|SYSTEM_MAP.md) continue ;;
    *) git mv "$f" docs/archive-2025/ ;;
  esac
done
```

> **I have NOT executed this.** Darrell reviews and runs it himself.

---

## Appendix: Live Chat Engine Chain

```
PrimeChatV2.tsx (UI)
  -> useUnifiedChatEngine.ts (hook, employeeSlug: "prime-boss")
    -> usePrimeChat.ts (handles session/thread lifecycle, additionalPrimeContext)
      -> POST /.netlify/functions/chat
        -> guardrails-unified.ts
        -> router.ts (employee selection)
        -> ensureThread() (resume single thread)
        -> ensureSession() (create/find session)
        -> getRecentMessages(sessionId)
        -> OpenAI API (model from employeeModelConfig)
        -> Tool execution if needed
        -> WRITE chat_messages
        -> ASYNC: conversation summary via Custodian

useChatHistory.ts — DEAD CODE (never imported)
```

---

*End of SYSTEM_MAP.md*
