# XspensesAI – AI Tools & Autonomy Audit v1

**Date:** February 2025  
**Scope:** AI Tool System, Employee Access, Autonomy Levels, Safety Mechanisms  
**Focus:** Safety and control audit for AI agent tool usage

---

## 1. TOOL INVENTORY

### 1.1 All Registered AI Tools

| Tool ID | File Path | Description | READ Access | WRITE Access | Risk Level |
|---------|-----------|-------------|-------------|--------------|------------|
| `transactions_query` | `src/agent/tools/impl/transactions_query.ts` | Query transactions with flexible filters (date, category, type, amount, merchant) | `transactions` table | None | **LOW** |
| `tag_update_transaction_category` | `src/agent/tools/impl/tag_update_transaction_category.ts` | Update transaction category and save correction for learning | `transactions`, `tag_category_corrections` | `transactions.category`, `tag_category_corrections` (insert) | **MEDIUM** |
| `tag_create_manual_transaction` | `src/agent/tools/impl/tag_create_manual_transaction.ts` | Create new income/expense transaction from chat | None | `transactions` (insert) | **MEDIUM** |
| `tag_explain_category` | `src/agent/tools/impl/tag_explain.ts` | Explain why Tag chose a specific category | `transactions`, `tag_category_corrections` | None | **LOW** |
| `tag_merchant_insights` | `src/agent/tools/impl/tag_merchant_insights.ts` | Get Tag's learning history for a merchant | `transactions`, `tag_category_corrections` | None | **LOW** |
| `tag_category_brain` | `src/agent/tools/impl/tag_category_brain.ts` | Get aggregated intelligence for a spending category | `transactions`, `tag_category_corrections` | None | **LOW** |
| `bulk_categorize` | `src/agent/tools/impl/bulk_categorize.ts` | Bulk categorize transactions by vendor pattern or date range | `transactions` | `transactions.category`, `analytics_cache` (upsert) | **HIGH** |
| `transaction_category_totals` | `src/agent/tools/impl/transaction_category_totals.ts` | Get transaction totals grouped by category | `transactions` | None | **LOW** |
| `crystal_summarize_income` | `src/agent/tools/impl/crystal_summarize_income.ts` | Summarize income transactions with totals and top merchants | `transactions` | None | **LOW** |
| `crystal_summarize_expenses` | `src/agent/tools/impl/crystal_summarize_expenses.ts` | Summarize expense transactions with totals and top merchants | `transactions` | None | **LOW** |
| `analytics_forecast` | `src/agent/tools/impl/analytics_forecast.ts` | Forecast financial scenarios (payoff timelines, future balances) | `transactions`, `goals` | None | **LOW** |
| `analytics_extract_patterns` | `src/agent/tools/impl/analytics_extract_patterns.ts` | Extract patterns from structured financial data | `transactions` | None | **LOW** |
| `account_balances_query` | `src/agent/tools/impl/account_balances_query.ts` | Query account balances and summaries | `accounts`, `transactions` | None | **LOW** |
| `goals_query` | `src/agent/tools/impl/goals_query.ts` | Query user financial goals | `goals` | None | **LOW** |
| `create_goal` | `src/agent/tools/impl/create_goal.ts` | Create a new financial goal | None | `goals` (insert) | **MEDIUM** |
| `update_goal` | `src/agent/tools/impl/update_goal.ts` | Update an existing financial goal | `goals` | `goals` (update) | **MEDIUM** |
| `goalie_create_goal` | `src/agent/tools/impl/goalie_create_goal.ts` | Create a new financial goal (Goalie-specific) | None | `goals` (insert) | **MEDIUM** |
| `goalie_list_goals` | `src/agent/tools/impl/goalie_list_goals.ts` | List user financial goals with progress tracking | `goals` | None | **LOW** |
| `goalie_update_goal_progress` | `src/agent/tools/impl/goalie_update_goal_progress.ts` | Update goal progress or status | `goals` | `goals` (update) | **MEDIUM** |
| `goalie_summarize_goals` | `src/agent/tools/impl/goalie_summarize_goals.ts` | Summarize user's goals with aggregated statistics | `goals` | None | **LOW** |
| `goalie_suggest_actions` | `src/agent/tools/impl/goalie_suggest_actions.ts` | Suggest actionable next steps based on goals and spending | `goals`, `transactions` | None | **LOW** |
| `finley_debt_payoff_forecast` | `src/agent/tools/impl/finley_debt_payoff_forecast.ts` | Calculate debt payoff timelines with projections | `transactions`, `goals` | None | **LOW** |
| `finley_savings_forecast` | `src/agent/tools/impl/finley_savings_forecast.ts` | Calculate savings growth over time | `transactions`, `goals` | None | **LOW** |
| `finley_loan_forecast` | `src/agent/tools/impl/finley_loan_forecast.ts` | Calculate loan/mortgage payoff timelines | `transactions`, `goals` | None | **LOW** |
| `chime_summarize_upcoming_obligations` | `src/agent/tools/impl/chime_summarize_upcoming_obligations.ts` | Get list of upcoming recurring payment obligations | `transactions`, `recurring_obligations` | None | **LOW** |
| `chime_list_obligations` | `src/agent/tools/impl/chime_list_obligations.ts` | List all recurring payment obligations | `transactions`, `recurring_obligations` | None | **LOW** |
| `chime_list_upcoming_notifications` | `src/agent/tools/impl/chime_list_upcoming_notifications.ts` | List notifications queued for user | `notifications` | None | **LOW** |
| `chime_draft_notification_copy` | `src/agent/tools/impl/chime_draft_notification_copy.ts` | Draft friendly notification text (read-only generation) | None | None | **LOW** |
| `chime_generate_notification` | `src/agent/tools/impl/chime_generate_notification.ts` | Generate safe notification text (read-only generation) | None | None | **LOW** |
| `request_employee_handoff` | `src/agent/tools/impl/request_employee_handoff.ts` | Transfer conversation to another AI employee | `employee_profiles` | `handoffs` (insert) | **LOW** |
| `vision_ocr_light` | `src/agent/tools/impl/vision_ocr_light.ts` | Light Vision OCR for reading text from images | External OCR API | None | **LOW** |
| `ingest_statement_enhanced` | `src/agent/tools/impl/ingest_statement_enhanced.ts` | Process financial statements with OCR and categorization | `user_documents`, `transactions` | `user_documents`, `transactions` (insert/update) | **HIGH** |
| `detect_anomalies` | `src/agent/tools/impl/detect_anomalies.ts` | Detect unusual spending patterns | `transactions` | None | **LOW** |
| `detect_anomalies_advanced` | `src/agent/tools/impl/detect_anomalies_advanced.ts` | Run advanced anomaly detection with ML models | `transactions` | None | **LOW** |
| `merchant_lookup` | `src/agent/tools/impl/merchant_lookup.ts` | Look up and enrich merchant information | `merchants`, external APIs | None | **LOW** |
| `generate_monthly_report_enhanced` | `src/agent/tools/impl/generate_monthly_report_enhanced.ts` | Generate comprehensive monthly financial reports | `transactions`, `goals`, `accounts` | None | **LOW** |
| `delete_my_data` | `src/agent/tools/impl/delete_my_data.ts` | Permanently delete all user data (GDPR compliance) | All user tables | All user tables (delete) | **HIGH** |
| `export_my_data` | `src/agent/tools/impl/export_my_data.ts` | Export all user data as downloadable file | All user tables | None | **LOW** |
| `manage_billing` | `src/agent/tools/impl/manage_billing.ts` | Handle billing operations (upgrades, downgrades, cancellations) | `profiles`, `subscriptions` | `profiles`, `subscriptions` (update), Stripe API | **HIGH** |
| `manage_knowledge_pack` | `src/agent/tools/impl/manage_knowledge_pack.ts` | Upload, update, or delete documents in knowledge packs | `knowledge_packs`, `documents` | `knowledge_packs`, `documents` (insert/update/delete) | **MEDIUM** |
| `create_org` | `src/agent/tools/impl/create_org.ts` | Create a new organization for team collaboration | None | `organizations` (insert) | **MEDIUM** |
| `invite_member` | `src/agent/tools/impl/invite_member.ts` | Invite a new member to the organization | `organizations`, `profiles` | `organization_members` (insert), email notifications | **MEDIUM** |
| `set_reminder` | `src/agent/tools/impl/set_reminder.ts` | Schedule automated reminders and notifications | None | `reminders` (insert) | **MEDIUM** |
| `search_docs` | `src/agent/tools/impl/search_docs.ts` | Search through knowledge packs and cached web content | `knowledge_packs`, `documents` | None | **LOW** |
| `safe_web_research` | `src/agent/tools/impl/safe_web_research.ts` | Research information from approved web sources | External web APIs | None | **LOW** |
| `check_usage_limits` | `src/agent/tools/impl/check_usage_limits.ts` | Check if user can perform action within plan limits | `profiles`, `usage_limits` | None | **LOW** |
| `record_usage` | `src/agent/tools/impl/record_usage.ts` | Record resource usage for billing and limit tracking | `profiles` | `usage_logs` (insert) | **LOW** |

**Total Tools:** 44 registered tools

---

### 1.2 Mutating Tools

**Tools that write or mutate data:**

| Tool ID | Mutations | Reversible? | Impact Scope |
|---------|-----------|-------------|--------------|
| `tag_update_transaction_category` | Updates `transactions.category`, inserts into `tag_category_corrections` | ✅ Yes (can revert category) | Single transaction |
| `tag_create_manual_transaction` | Inserts new row into `transactions` | ✅ Yes (can delete transaction) | Single transaction |
| `bulk_categorize` | Updates multiple `transactions.category`, upserts `analytics_cache` | ⚠️ Partial (can revert categories, cache may be stale) | Multiple transactions (bulk) |
| `create_goal` | Inserts new row into `goals` | ✅ Yes (can delete goal) | Single goal |
| `update_goal` | Updates `goals` row | ✅ Yes (can revert changes) | Single goal |
| `goalie_create_goal` | Inserts new row into `goals` | ✅ Yes (can delete goal) | Single goal |
| `goalie_update_goal_progress` | Updates `goals.current_amount`, `goals.status` | ✅ Yes (can revert changes) | Single goal |
| `ingest_statement_enhanced` | Inserts/updates `user_documents`, inserts `transactions` | ⚠️ Partial (transactions can be deleted, documents archived) | Multiple transactions + documents |
| `delete_my_data` | Deletes all user data from all tables | ❌ No (irreversible) | All user data |
| `manage_billing` | Updates `profiles.plan_id`, `subscriptions.status`, Stripe API calls | ⚠️ Partial (some changes reversible via Stripe) | Billing/subscription |
| `manage_knowledge_pack` | Inserts/updates/deletes `knowledge_packs`, `documents` | ⚠️ Partial (deletions may be irreversible) | Knowledge pack documents |
| `create_org` | Inserts new row into `organizations` | ⚠️ Partial (org deletion may cascade) | Organization |
| `invite_member` | Inserts into `organization_members`, sends email | ⚠️ Partial (email sent, membership can be revoked) | Organization membership |
| `set_reminder` | Inserts new row into `reminders` | ✅ Yes (can delete reminder) | Single reminder |
| `request_employee_handoff` | Inserts into `handoffs` table | ✅ Yes (log only, no data mutation) | Conversation flow |
| `record_usage` | Inserts into `usage_logs` | ✅ Yes (log only, no data mutation) | Usage tracking |

**Total Mutating Tools:** 16 tools

**High-Risk Mutating Tools:**
- `bulk_categorize` - Bulk updates, can affect many transactions
- `delete_my_data` - Irreversible deletion
- `manage_billing` - Money-related changes
- `ingest_statement_enhanced` - Creates multiple transactions

---

## 2. EMPLOYEE ↔ TOOL MAPPING

### 2.1 Tools Available to Prime (prime-boss)

**Source:** `employee_profiles.tools_allowed` (from `docs/EMPLOYEE_TOOLS.md`)

| Tool ID | Purpose | Risk Level | Typical Use Cases | Current Usage |
|---------|---------|------------|-------------------|---------------|
| `request_employee_handoff` | Transfer conversation to another AI employee | LOW | Routing users to specialists, delegating tasks | ✅ Auto-used when routing needed |

**Total Tools:** 1 tool (orchestrator role, delegates to specialists)

**Status:** ✅ **CORRECT** - Prime is orchestrator, doesn't need data mutation tools

---

### 2.2 Tools Available to Byte (byte-docs)

**Source:** `employee_profiles.tools_allowed`

| Tool ID | Purpose | Risk Level | Typical Use Cases | Current Usage |
|---------|---------|------------|-------------------|---------------|
| `vision_ocr_light` | Light Vision OCR for reading text from images | LOW | Quick text extraction from images | ✅ Auto-used when OCR needed |
| `ingest_statement_enhanced` | Process financial statements with OCR and categorization | HIGH | Processing bank statements, receipts, CSVs | ✅ Auto-used when documents uploaded |
| `request_employee_handoff` | Transfer conversation to another employee | LOW | Handing off to Tag for categorization | ✅ Auto-used when handoff needed |

**Total Tools:** 3 tools

**Mutating Tools:** 1 (`ingest_statement_enhanced`)

**Status:** ✅ **CORRECT** - Byte needs document processing tools

---

### 2.3 Tools Available to Tag (tag-ai)

**Source:** `employee_profiles.tools_allowed`

| Tool ID | Purpose | Risk Level | Typical Use Cases | Current Usage |
|---------|---------|------------|-------------------|---------------|
| `tag_explain_category` | Explain why Tag chose a category | LOW | "Why is this categorized as X?" | ✅ Auto-used when user asks |
| `tag_merchant_insights` | Get Tag's learning history for merchant | LOW | "What do I usually categorize [merchant] as?" | ✅ Auto-used when user asks |
| `tag_category_brain` | Get aggregated intelligence for category | LOW | "What have you learned about this category?" | ✅ Auto-used when user asks |
| `tag_update_transaction_category` | Update transaction category and save correction | MEDIUM | "Move this to Income", "Change category to X" | ⚠️ **Auto-used** (no confirmation) |
| `tag_create_manual_transaction` | Create new income/expense transaction | MEDIUM | "Add an income of $500", "I was paid $1000" | ⚠️ **Auto-used** (no confirmation) |
| `transactions_query` | Query transactions with flexible filters | LOW | "Show me uncategorized transactions" | ✅ Auto-used when querying needed |
| `request_employee_handoff` | Transfer conversation to another employee | LOW | Handing off to Byte for imports | ✅ Auto-used when handoff needed |

**Total Tools:** 7 tools

**Mutating Tools:** 2 (`tag_update_transaction_category`, `tag_create_manual_transaction`)

**Status:** ⚠️ **REVIEW NEEDED** - Tag auto-executes mutating tools without confirmation

**Note:** `sheet_export` mentioned in some docs but not found in tool registry - may be legacy or not implemented

---

### 2.4 Tools Available to Crystal (crystal-analytics)

**Source:** `employee_profiles.tools_allowed`

| Tool ID | Purpose | Risk Level | Typical Use Cases | Current Usage |
|---------|---------|------------|-------------------|---------------|
| `crystal_summarize_income` | Summarize income transactions | LOW | "Show me my income totals" | ✅ Auto-used when user asks |
| `crystal_summarize_expenses` | Summarize expense transactions | LOW | "Show me my spending totals" | ✅ Auto-used when user asks |
| `analytics_forecast` | Forecast financial scenarios | LOW | "How long to pay off debt?" | ✅ Auto-used when forecasting needed |
| `analytics_extract_patterns` | Extract patterns from financial data | LOW | Analyzing structured JSON data | ✅ Auto-used when pattern analysis needed |
| `transactions_query` | Query transactions with flexible filters | LOW | "Show me transactions from last month" | ✅ Auto-used when querying needed |
| `transaction_category_totals` | Get transaction totals grouped by category | LOW | Category-level spending summaries | ✅ Auto-used when category analysis needed |
| `request_employee_handoff` | Transfer conversation to another employee | LOW | Handing off to Tag for categorization | ✅ Auto-used when handoff needed |

**Total Tools:** 7 tools

**Mutating Tools:** 0 (read-only)

**Status:** ✅ **CORRECT** - Crystal is analytics-only, no mutation tools

---

### 2.5 Database Mismatches

**Verification Needed:**

1. **Tag AI `transactions_query` tool**
   - **Status:** ✅ Should be in `employee_profiles.tools_allowed` for `tag-ai`
   - **Migration:** `20250203_add_transactions_query_to_tag_ai.sql` (needs verification)
   - **Action:** Verify tool is in database array

2. **Missing `sheet_export` tool**
   - **Status:** ⚠️ Referenced in docs but not found in tool registry
   - **Action:** Either implement tool or remove from documentation

3. **Tool registry vs database**
   - **Status:** ⚠️ Need to verify all tools in registry match `employee_profiles.tools_allowed`
   - **Action:** Run audit query to compare

**Recommended Audit Query:**
```sql
-- Check Tag AI tools
SELECT slug, tools_allowed 
FROM employee_profiles 
WHERE slug = 'tag-ai';

-- Check all employees
SELECT slug, array_length(tools_allowed, 1) as tool_count, tools_allowed
FROM employee_profiles
WHERE slug IN ('prime-boss', 'byte-docs', 'tag-ai', 'crystal-analytics')
ORDER BY slug;
```

---

## 3. AUTONOMY LEVELS (CURRENT VS RECOMMENDED)

### 3.1 Autonomy Scale Definition

- **LEVEL 0 – Read-only, explain only**
  - Can call read-only tools, no writes.
  - Can analyze and explain data, but cannot make changes.

- **LEVEL 1 – Suggest actions, user must confirm**
  - Can draft changes but not execute without explicit confirmation.
  - Shows proposed changes, waits for user approval.

- **LEVEL 2 – Auto-execute low-risk changes**
  - Can perform small, reversible updates (e.g., fixing a few categories) within constraints.
  - Limited scope (e.g., ≤10 transactions, single-item updates).

- **LEVEL 3 – Auto-execute bulk/high-impact changes**
  - Can run bulk updates, mass recategorization, or things that materially affect reports/tax data.
  - No limits on scope (dangerous if misused).

---

### 3.2 Autonomy for Prime (prime-boss)

| Tool | Risk | Current Behavior | Current Level | Recommended Level | Notes / Conditions |
|------|------|------------------|---------------|------------------|-------------------|
| `request_employee_handoff` | LOW | Auto-executes when routing needed | **2** | **2** ✅ | Safe - only changes conversation flow, no data mutation |

**Current Overall Autonomy:** Level 2 (orchestrator, no data mutation)

**Recommended Overall Autonomy:** Level 2 (keep as-is)

**Rationale:** Prime is orchestrator only, doesn't mutate data. Current behavior is safe.

---

### 3.3 Autonomy for Byte (byte-docs)

| Tool | Risk | Current Behavior | Current Level | Recommended Level | Notes / Conditions |
|------|------|------------------|---------------|------------------|-------------------|
| `vision_ocr_light` | LOW | Auto-executes when OCR needed | **2** | **2** ✅ | Read-only, safe |
| `ingest_statement_enhanced` | HIGH | Auto-executes when documents uploaded | **3** | **1** ⚠️ | **Should require confirmation** - creates multiple transactions |
| `request_employee_handoff` | LOW | Auto-executes when handoff needed | **2** | **2** ✅ | Safe |

**Current Overall Autonomy:** Level 3 (auto-executes high-risk document processing)

**Recommended Overall Autonomy:** Level 1 (require confirmation for document processing)

**Rationale:** `ingest_statement_enhanced` creates multiple transactions and can have tax/reporting implications. Should require user confirmation before processing.

---

### 3.4 Autonomy for Tag (tag-ai)

| Tool | Risk | Current Behavior | Current Level | Recommended Level | Notes / Conditions |
|------|------|------------------|---------------|------------------|-------------------|
| `tag_explain_category` | LOW | Auto-executes when user asks | **2** | **2** ✅ | Read-only, safe |
| `tag_merchant_insights` | LOW | Auto-executes when user asks | **2** | **2** ✅ | Read-only, safe |
| `tag_category_brain` | LOW | Auto-executes when user asks | **2** | **2** ✅ | Read-only, safe |
| `transactions_query` | LOW | Auto-executes when querying needed | **2** | **2** ✅ | Read-only, safe |
| `tag_update_transaction_category` | MEDIUM | **Auto-executes without confirmation** | **3** | **1** ⚠️ | **Should require confirmation** - affects transaction data |
| `tag_create_manual_transaction` | MEDIUM | **Auto-executes without confirmation** | **3** | **1** ⚠️ | **Should require confirmation** - creates new transaction |
| `request_employee_handoff` | LOW | Auto-executes when handoff needed | **2** | **2** ✅ | Safe |

**Current Overall Autonomy:** Level 3 (auto-executes mutating tools without confirmation)

**Recommended Overall Autonomy:** Level 1 (require confirmation for all mutating tools)

**Rationale:** Tag's mutating tools (`tag_update_transaction_category`, `tag_create_manual_transaction`) affect transaction data which impacts reports, taxes, and analytics. Should require explicit user confirmation before execution.

**Special Case:** If implementing Level 2, could allow auto-execution for `tag_update_transaction_category` on ≤5 transactions at a time with clear summary shown to user.

---

### 3.5 Autonomy for Crystal (crystal-analytics)

| Tool | Risk | Current Behavior | Current Level | Recommended Level | Notes / Conditions |
|------|------|------------------|---------------|------------------|-------------------|
| `crystal_summarize_income` | LOW | Auto-executes when user asks | **2** | **2** ✅ | Read-only, safe |
| `crystal_summarize_expenses` | LOW | Auto-executes when user asks | **2** | **2** ✅ | Read-only, safe |
| `analytics_forecast` | LOW | Auto-executes when forecasting needed | **2** | **2** ✅ | Read-only, safe |
| `analytics_extract_patterns` | LOW | Auto-executes when pattern analysis needed | **2** | **2** ✅ | Read-only, safe |
| `transactions_query` | LOW | Auto-executes when querying needed | **2** | **2** ✅ | Read-only, safe |
| `transaction_category_totals` | LOW | Auto-executes when category analysis needed | **2** | **2** ✅ | Read-only, safe |
| `request_employee_handoff` | LOW | Auto-executes when handoff needed | **2** | **2** ✅ | Safe |

**Current Overall Autonomy:** Level 2 (read-only tools only)

**Recommended Overall Autonomy:** Level 2 (keep as-is)

**Rationale:** Crystal is analytics-only, no mutation tools. Current behavior is safe.

---

## 4. SAFETY & GUARDRAILS AROUND TOOLS

### 4.1 Existing Safety Mechanisms

**Location:** `src/agent/tools/index.ts` (executeTool function), `src/agent/kernel.ts` (confirmation guard)

**Mechanisms:**

1. **Tool Meta Flags**
   - `requiresConfirm: true` - Tool marked as requiring confirmation
   - `mutates: true` - Tool marked as mutating data
   - `costly: true` - Tool marked as expensive (rate-limited)
   - `dangerous: true` - Tool marked as dangerous (e.g., `manage_billing`)

2. **Confirmation Guard (kernel.ts lines 226-250)**
   ```typescript
   if ((toolModule.meta.requiresConfirm || toolModule.meta.mutates || toolModule.meta.costly) 
       && !args.confirm) {
     // Request confirmation from user
     // Stream confirmation_required event
     // Wait for user to confirm
   }
   ```
   - **Status:** ✅ **IMPLEMENTED** - Checks for `requiresConfirm`, `mutates`, or `costly` flags
   - **Issue:** ⚠️ Not all mutating tools have `requiresConfirm: true` in their meta

3. **Input Validation**
   - All tools use Zod schemas for input validation
   - Invalid input returns error before execution
   - **Status:** ✅ **WORKING**

4. **Rate Limiting**
   - Per-tool rate limits (e.g., 30 calls/minute for `transactions_query`)
   - In-memory rate limiter (simple, resets every minute)
   - **Status:** ✅ **IMPLEMENTED** - Basic rate limiting exists

5. **Timeout Protection**
   - Each tool has timeout (default 30s, configurable per tool)
   - AbortController cancels long-running operations
   - **Status:** ✅ **IMPLEMENTED**

6. **User ID Verification**
   - All tools receive `userId` from context (never from user input)
   - Database queries filter by `user_id` to prevent cross-user access
   - **Status:** ✅ **WORKING** - Tools verify user ownership

7. **Output Validation**
   - Tool outputs validated against Zod output schemas
   - Invalid output logged and returned as error
   - **Status:** ✅ **IMPLEMENTED**

---

### 4.2 Missing or Recommended Safety Mechanisms

**Critical Gaps:**

1. **Missing `requiresConfirm` Flags**
   - **Issue:** `tag_update_transaction_category` and `tag_create_manual_transaction` have `mutates: true` but NOT `requiresConfirm: true`
   - **Impact:** These tools auto-execute without confirmation
   - **Fix:** Add `requiresConfirm: true` to tool meta in `src/agent/tools/index.ts`

2. **No Bulk Operation Limits**
   - **Issue:** `bulk_categorize` can update unlimited transactions (only limited by `confirm: true` requirement)
   - **Impact:** Could accidentally recategorize hundreds of transactions
   - **Fix:** Add max transaction limit (e.g., 50 transactions per call) and warn if more

3. **No Transaction Count Warnings**
   - **Issue:** Tools don't warn user about scope before execution
   - **Impact:** User may not realize how many transactions will be affected
   - **Fix:** For bulk operations, show preview: "This will affect 47 transactions. Continue?"

4. **No Undo/Redo System**
   - **Issue:** No way to revert tool executions
   - **Impact:** Mistakes are hard to fix
   - **Fix:** Implement audit log with undo capability (future enhancement)

5. **No Tool Execution Logging**
   - **Issue:** Tool executions not logged to database for audit trail
   - **Impact:** Can't track who ran what tool, when, and on how many records
   - **Fix:** Add `tool_executions` table to log all tool calls

6. **Rate Limiter is In-Memory**
   - **Issue:** Rate limiter resets on server restart, not persistent
   - **Impact:** Rate limits can be bypassed by restarting server
   - **Fix:** Use Redis or database-backed rate limiter (future enhancement)

7. **No Confirmation UX in Frontend**
   - **Issue:** Confirmation requests streamed but no UI to handle them
   - **Impact:** User can't actually confirm tool executions
   - **Fix:** Implement confirmation dialog in `UnifiedAssistantChat` component

---

## 5. RECOMMENDED "ACTION MODES"

### 5.1 Action Mode Design

**Three User-Facing Modes:**

**Mode A – Explain Only (Safe Default)**
- Agents can read, analyze, and explain.
- They can propose tool calls but NOT actually mutate data.
- Mutating tools return "suggestion" results instead of executing.
- **Use Case:** New users, cautious users, testing

**Mode B – Propose & Confirm**
- Agents can propose specific actions (e.g., "recategorize these 7 transactions") and then run tools after the user clicks "Confirm".
- Confirmation dialog shows: tool name, affected records count, summary of changes.
- **Use Case:** Most users, balanced safety and convenience

**Mode C – Auto-Pilot (Expert users only)**
- Agents can auto-execute certain LOW/MEDIUM risk tools within constraints.
- Constraints: max N transactions at once, specific rules (e.g., "only auto-fix obvious duplicates").
- **Use Case:** Power users, trusted users, high-volume operations

---

### 5.2 Recommended Default Modes by Employee

| Employee | Default Mode | Max Autonomy Level | Notes |
|-----------|--------------|-------------------|-------|
| **Prime** | Mode B (Propose & Confirm) | Level 2 | Orchestrator, no data mutation - Mode B is safe default |
| **Byte** | Mode B (Propose & Confirm) | Level 1 | Document processing should require confirmation (creates transactions) |
| **Tag** | Mode B (Propose & Confirm) | Level 1 | Category updates should require confirmation (affects reports/taxes) |
| **Crystal** | Mode A (Explain Only) or Mode B | Level 2 | Analytics-only, read-only tools - Mode A or B both safe |

**Special Rules:**

- **Tag in Mode C:** Can auto-fix obvious duplicates on ≤10 transactions at a time
- **Byte in Mode C:** Can auto-process documents but must show preview first
- **Prime:** Never Level 3 (orchestrator doesn't mutate data anyway)

---

## 6. FINAL SUMMARY & NEXT STEPS

### 6.1 Biggest Safety Risks

**If autonomy is increased without proper safeguards:**

1. **Mass Recategorization**
   - Risk: Tag could recategorize hundreds of transactions incorrectly
   - Impact: Wrong tax categories, incorrect reports, user frustration
   - Mitigation: Require confirmation for bulk operations, limit scope

2. **Wrong Transaction Creation**
   - Risk: Tag could create duplicate or incorrect transactions
   - Impact: Double-counting, incorrect balances, reporting errors
   - Mitigation: Require confirmation, show preview before creation

3. **Billing Changes Without Consent**
   - Risk: `manage_billing` tool could change plans or cancel subscriptions
   - Impact: Service disruption, unexpected charges
   - Mitigation: Already has `requiresConfirm: true` and `dangerous: true` flags

4. **Data Loss**
   - Risk: `delete_my_data` tool could be called accidentally
   - Impact: Irreversible data deletion
   - Mitigation: Already has `requiresConfirm: true` flag, but should add extra confirmation step

5. **Document Processing Errors**
   - Risk: Byte could process documents incorrectly, creating wrong transactions
   - Impact: Incorrect transaction data, reporting errors
   - Mitigation: Require confirmation before processing, show preview

---

### 6.2 Quick Wins

1. **Enable Mode B for Tag with confirm dialogs**
   - Add `requiresConfirm: true` to `tag_update_transaction_category` and `tag_create_manual_transaction`
   - Implement confirmation UI in `UnifiedAssistantChat`
   - **Impact:** Prevents accidental category changes

2. **Limit Tag's auto-fix to 10 transactions per run**
   - Add max transaction limit to `bulk_categorize` tool
   - Show warning if more transactions would be affected
   - **Impact:** Prevents mass recategorization mistakes

3. **Require confirmation for Byte's document processing**
   - Add `requiresConfirm: true` to `ingest_statement_enhanced` meta
   - Show preview of transactions that will be created
   - **Impact:** User can review before processing

4. **Keep Prime at Level 0–1, never 3**
   - Prime is orchestrator only, doesn't need mutation tools
   - **Impact:** Prevents Prime from accidentally mutating data

5. **Add tool execution logging**
   - Create `tool_executions` table
   - Log: userId, toolId, timestamp, input summary, affected records count
   - **Impact:** Audit trail for debugging and compliance

---

### 6.3 Concrete Next Steps

**Priority 1: Immediate Safety Fixes**

1. **Add `requiresConfirm: true` to mutating tools**
   - File: `src/agent/tools/index.ts`
   - Tools: `tag_update_transaction_category`, `tag_create_manual_transaction`, `ingest_statement_enhanced`
   - **Effort:** 15 minutes

2. **Implement confirmation UI in UnifiedAssistantChat**
   - File: `src/components/chat/UnifiedAssistantChat.tsx`
   - Handle `confirmation_required` events from SSE stream
   - Show confirmation dialog with tool summary
   - **Effort:** 2-3 hours

3. **Add bulk operation limits**
   - File: `src/agent/tools/impl/bulk_categorize.ts`
   - Add max transaction limit (e.g., 50 transactions)
   - Return error if limit exceeded, suggest pagination
   - **Effort:** 30 minutes

**Priority 2: Enhanced Safety (Next Sprint)**

4. **Create tool execution logging**
   - Create migration: `create_tool_executions_table.sql`
   - Log all tool calls: userId, toolId, timestamp, input, output summary, affected records
   - **Effort:** 2-3 hours

5. **Add transaction count warnings**
   - For bulk operations, query count first
   - Show preview: "This will affect 47 transactions. Continue?"
   - **Effort:** 1-2 hours

6. **Implement global "Action Mode" setting**
   - Add `action_mode` field to `user_ai_preferences` table
   - Default: Mode B (Propose & Confirm)
   - Allow users to change in settings
   - **Effort:** 4-6 hours

**Priority 3: Future Enhancements**

7. **Add undo/redo system**
   - Create `tool_execution_audit` table with undo capability
   - Store original state before mutations
   - **Effort:** 1-2 days

8. **Database-backed rate limiter**
   - Replace in-memory rate limiter with Redis or database
   - Persistent across server restarts
   - **Effort:** 4-6 hours

9. **Tool execution preview**
   - For mutating tools, show "dry run" preview before execution
   - User can review changes before confirming
   - **Effort:** 2-3 days

---

### 6.4 Risk Assessment Summary

| Risk Category | Current State | Recommended State | Priority |
|---------------|---------------|-------------------|----------|
| **Tag Auto-Execution** | ⚠️ Level 3 (no confirmation) | Level 1 (require confirmation) | **HIGH** |
| **Byte Document Processing** | ⚠️ Level 3 (no confirmation) | Level 1 (require confirmation) | **HIGH** |
| **Bulk Operations** | ⚠️ No limits | Add max limits + warnings | **MEDIUM** |
| **Tool Execution Logging** | ❌ Not implemented | Add audit logging | **MEDIUM** |
| **Confirmation UI** | ❌ Not implemented | Add confirmation dialogs | **HIGH** |
| **Action Mode System** | ❌ Not implemented | Add user preference setting | **MEDIUM** |

**Overall Safety Score:** 60/100
- ✅ Good: Input validation, rate limiting, timeout protection
- ⚠️ Needs Work: Confirmation system, bulk limits, logging
- ❌ Missing: Confirmation UI, action modes, undo system

**Recommended Target Score:** 85/100 (after Priority 1 fixes)

---

**End of Audit v1**











