# Phase 1.4 - Tool Inventory & Employee Tool Access Audit

**Date**: November 20, 2025  
**Purpose**: Audit and fix employee tool access

---

## 1. Complete Tool Inventory

### All Tools Registered in `src/agent/tools/index.ts`

**Total**: 50 tools

#### Tag Tools (5)
- `tag_explain_category` - Explain why Tag chose a category
- `tag_merchant_insights` - Get merchant learning history
- `tag_category_brain` - Get aggregated category intelligence
- `tag_update_transaction_category` - Update transaction category (mutates)
- `tag_create_manual_transaction` - Create manual transaction (mutates)

#### Crystal Tools (2)
- `crystal_summarize_income` - Summarize income transactions
- `crystal_summarize_expenses` - Summarize expense transactions

#### Finley Tools (3)
- `finley_debt_payoff_forecast` - Calculate debt payoff timeline
- `finley_savings_forecast` - Calculate savings growth
- `finley_loan_forecast` - Calculate loan/mortgage payoff

#### Goalie Tools (5)
- `goalie_create_goal` - Create financial goal (mutates)
- `goalie_list_goals` - List user goals
- `goalie_update_goal_progress` - Update goal progress (mutates)
- `goalie_summarize_goals` - Summarize goals with stats
- `goalie_suggest_actions` - Suggest actions based on goals

#### Chime Tools (5)
- `chime_summarize_upcoming_obligations` - List upcoming obligations
- `chime_list_obligations` - List all recurring obligations
- `chime_list_upcoming_notifications` - List queued notifications
- `chime_draft_notification_copy` - Draft notification text
- `chime_generate_notification` - Generate notification from scenario

#### General/Query Tools (6)
- `transactions_query` - Query transactions with filters
- `transaction_category_totals` - Get totals by category
- `account_balances_query` - Query account balances
- `goals_query` - Query financial goals
- `create_goal` - Create goal (generic, mutates)
- `update_goal` - Update goal (generic, mutates)

#### Analytics Tools (2)
- `analytics_forecast` - Forecast financial scenarios
- `analytics_extract_patterns` - Extract patterns from data

#### Handoff Tools (1)
- `request_employee_handoff` - Transfer conversation to another employee

#### Document Processing Tools (2)
- `vision_ocr_light` - Light OCR for text extraction
- `ingest_statement_enhanced` - Process statements with OCR

#### System/Admin Tools (19)
- `delete_my_data` - Delete all user data (mutates, dangerous)
- `export_my_data` - Export user data
- `detect_anomalies` - Detect spending anomalies
- `detect_anomalies_advanced` - Advanced anomaly detection
- `merchant_lookup` - Look up merchant info
- `bulk_categorize` - Bulk categorize transactions (mutates)
- `check_usage_limits` - Check plan limits
- `record_usage` - Record resource usage
- `manage_billing` - Handle billing operations (mutates, dangerous)
- `search_docs` - Search knowledge packs
- `safe_web_research` - Research from approved sources
- `manage_knowledge_pack` - Manage knowledge packs (mutates)
- `create_org` - Create organization (mutates)
- `invite_member` - Invite team member (mutates)
- `set_reminder` - Schedule reminders (mutates)
- `generate_monthly_report_enhanced` - Generate monthly reports

---

## 2. Current Employee Tool Assignments

### From `20251120_consolidate_employee_definitions.sql`:

**Prime (prime-boss)**:
- Current: `['request_employee_handoff']`
- Status: ✅ Correct (after Phase 1.2)

**Byte (byte-docs)**:
- Current: `['vision_ocr_light', 'ingest_statement_enhanced']`
- Status: ✅ Correct

**Tag (tag-ai)**:
- Current: `['tag_explain_category', 'tag_merchant_insights', 'tag_category_brain', 'tag_update_transaction_category', 'tag_create_manual_transaction', 'request_employee_handoff']`
- Status: ✅ Correct

**Crystal (crystal-ai)**:
- Current: `['crystal_summarize_income', 'crystal_summarize_expenses', 'analytics_forecast', 'analytics_extract_patterns', 'transactions_query']`
- Status: ✅ Correct

**Finley (finley-ai)**:
- Current: `['finley_debt_payoff_forecast', 'finley_savings_forecast', 'finley_loan_forecast', 'transactions_query', 'account_balances_query', 'goals_query']`
- Status: ✅ Correct

**Goalie (goalie-ai)**:
- Current: `['goalie_create_goal', 'goalie_list_goals', 'goalie_update_goal_progress', 'goalie_summarize_goals', 'goalie_suggest_actions', 'crystal_summarize_expenses', 'crystal_summarize_income', 'finley_savings_forecast', 'finley_debt_payoff_forecast', 'transactions_query']`
- Status: ✅ Correct (has cross-employee tools for analysis)

**Liberty (liberty-ai)**:
- Current: `['transactions_query', 'crystal_summarize_expenses', 'crystal_summarize_income', 'finley_debt_payoff_forecast', 'finley_savings_forecast', 'goalie_list_goals', 'goalie_create_goal', 'request_employee_handoff']`
- Status: ✅ Correct (has cross-employee tools)

**Blitz (blitz-ai)**:
- Current: `[]` (empty array)
- Status: ⚠️ Missing tools (needs action planning tools)

**Chime (chime-ai)**:
- Current: `['chime_generate_notification', 'chime_list_obligations', 'chime_summarize_upcoming_obligations', 'chime_list_upcoming_notifications', 'chime_draft_notification_copy']`
- Status: ✅ Correct

**Ledger (ledger-tax)**:
- Current: `[]` (empty array)
- Status: ⚠️ Missing tools (needs tax/reporting tools)

---

## 3. Intended Tool Matrix (Design)

### Prime (prime-boss)
**Role**: CEO, Orchestrator, Dispatcher  
**Tools**:
- `request_employee_handoff` ✅ (delegation)

**Rationale**: Prime delegates, doesn't need data tools directly.

---

### Byte (byte-docs)
**Role**: Document Processing Specialist  
**Tools**:
- `vision_ocr_light` ✅
- `ingest_statement_enhanced` ✅
- `request_employee_handoff` (can hand off to Tag/Crystal after processing)

**Rationale**: Byte processes documents, may need to hand off for categorization/analysis.

---

### Tag (tag-ai)
**Role**: Categorization Specialist  
**Tools**:
- `tag_explain_category` ✅
- `tag_merchant_insights` ✅
- `tag_category_brain` ✅
- `tag_update_transaction_category` ✅
- `tag_create_manual_transaction` ✅
- `transactions_query` (to see transactions before categorizing)
- `request_employee_handoff` ✅

**Rationale**: Tag needs all its own tools + query access + handoff capability.

---

### Crystal (crystal-ai)
**Role**: Financial Insights Analyst  
**Tools**:
- `crystal_summarize_income` ✅
- `crystal_summarize_expenses` ✅
- `analytics_forecast` ✅
- `analytics_extract_patterns` ✅
- `transactions_query` ✅
- `transaction_category_totals` (for category-level analysis)
- `request_employee_handoff` (can hand off to Finley for forecasting)

**Rationale**: Crystal analyzes spending, needs query tools + forecasting.

---

### Finley (finley-ai)
**Role**: Wealth & Forecast AI  
**Tools**:
- `finley_debt_payoff_forecast` ✅
- `finley_savings_forecast` ✅
- `finley_loan_forecast` ✅
- `transactions_query` ✅
- `account_balances_query` ✅
- `goals_query` ✅
- `request_employee_handoff` (can hand off to Goalie for goal creation)

**Rationale**: Finley forecasts, needs all data query tools.

---

### Goalie (goalie-ai)
**Role**: AI Goal Concierge  
**Tools**:
- `goalie_create_goal` ✅
- `goalie_list_goals` ✅
- `goalie_update_goal_progress` ✅
- `goalie_summarize_goals` ✅
- `goalie_suggest_actions` ✅
- `crystal_summarize_expenses` ✅ (for spending analysis)
- `crystal_summarize_income` ✅ (for income analysis)
- `finley_savings_forecast` ✅ (for savings goals)
- `finley_debt_payoff_forecast` ✅ (for debt goals)
- `transactions_query` ✅ (to analyze spending patterns)
- `request_employee_handoff` (can hand off to Finley for complex forecasting)

**Rationale**: Goalie manages goals but needs analysis tools to provide smart recommendations.

---

### Liberty (liberty-ai)
**Role**: Financial Freedom & Protection Coach  
**Tools**:
- `transactions_query` ✅ (to find fees and debt patterns)
- `crystal_summarize_expenses` ✅ (to analyze spending)
- `crystal_summarize_income` ✅ (to understand income)
- `finley_debt_payoff_forecast` ✅ (to show payoff timelines)
- `finley_savings_forecast` ✅ (for emergency fund planning)
- `goalie_list_goals` ✅ (to link strategies to goals)
- `goalie_create_goal` ✅ (to create debt-free goals)
- `request_employee_handoff` ✅

**Rationale**: Liberty needs debt/payoff tools + Crystal/Finley analysis + Goalie integration.

---

### Blitz (blitz-ai)
**Role**: Rapid Action Plans & Checklists  
**Tools**:
- `transactions_query` (to analyze current state)
- `goalie_list_goals` (to see user goals)
- `goalie_suggest_actions` (to get action recommendations)
- `request_employee_handoff` (can hand off to specialists)

**Rationale**: Blitz creates action plans, needs goal/transaction context.

---

### Chime (chime-ai)
**Role**: Smart Notifications & Nudges  
**Tools**:
- `chime_generate_notification` ✅
- `chime_list_obligations` ✅
- `chime_summarize_upcoming_obligations` ✅
- `chime_list_upcoming_notifications` ✅
- `chime_draft_notification_copy` ✅
- `transactions_query` (to detect recurring patterns)
- `request_employee_handoff` (can hand off to Liberty for debt strategy)

**Rationale**: Chime manages notifications, may need transaction queries for detection.

---

### Ledger (ledger-tax)
**Role**: Tax Optimization & Compliance  
**Tools**:
- `transactions_query` (to find deductible expenses)
- `transaction_category_totals` (to summarize by category)
- `crystal_summarize_expenses` (to analyze spending for deductions)
- `request_employee_handoff` (can hand off to Crystal for analysis)

**Rationale**: Ledger needs transaction access for tax analysis.

---

## 4. Issues Found

### Missing Tools

1. **Tag**: Missing `transactions_query` (needs to see transactions before categorizing)
2. **Crystal**: Missing `transaction_category_totals` (useful for category analysis)
3. **Crystal**: Missing `request_employee_handoff` (should be able to hand off to Finley)
4. **Finley**: Missing `request_employee_handoff` (should be able to hand off to Goalie)
5. **Goalie**: Missing `request_employee_handoff` (should be able to hand off to Finley)
6. **Byte**: Missing `request_employee_handoff` (should be able to hand off after processing)
7. **Blitz**: Missing all tools (currently empty array)
8. **Ledger**: Missing all tools (currently empty array)
9. **Chime**: Missing `transactions_query` and `request_employee_handoff`

---

## 5. Recommended Tool Matrix (Final)

| Employee | Tools |
|----------|-------|
| **prime-boss** | `request_employee_handoff` |
| **byte-docs** | `vision_ocr_light`, `ingest_statement_enhanced`, `request_employee_handoff` |
| **tag-ai** | `tag_explain_category`, `tag_merchant_insights`, `tag_category_brain`, `tag_update_transaction_category`, `tag_create_manual_transaction`, `transactions_query`, `request_employee_handoff` |
| **crystal-ai** | `crystal_summarize_income`, `crystal_summarize_expenses`, `analytics_forecast`, `analytics_extract_patterns`, `transactions_query`, `transaction_category_totals`, `request_employee_handoff` |
| **finley-ai** | `finley_debt_payoff_forecast`, `finley_savings_forecast`, `finley_loan_forecast`, `transactions_query`, `account_balances_query`, `goals_query`, `request_employee_handoff` |
| **goalie-ai** | `goalie_create_goal`, `goalie_list_goals`, `goalie_update_goal_progress`, `goalie_summarize_goals`, `goalie_suggest_actions`, `crystal_summarize_expenses`, `crystal_summarize_income`, `finley_savings_forecast`, `finley_debt_payoff_forecast`, `transactions_query`, `request_employee_handoff` |
| **liberty-ai** | `transactions_query`, `crystal_summarize_expenses`, `crystal_summarize_income`, `finley_debt_payoff_forecast`, `finley_savings_forecast`, `goalie_list_goals`, `goalie_create_goal`, `request_employee_handoff` |
| **blitz-ai** | `transactions_query`, `goalie_list_goals`, `goalie_suggest_actions`, `request_employee_handoff` |
| **chime-ai** | `chime_generate_notification`, `chime_list_obligations`, `chime_summarize_upcoming_obligations`, `chime_list_upcoming_notifications`, `chime_draft_notification_copy`, `transactions_query`, `request_employee_handoff` |
| **ledger-tax** | `transactions_query`, `transaction_category_totals`, `crystal_summarize_expenses`, `request_employee_handoff` |

---

**End of Inventory**



