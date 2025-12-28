# Employee Tools Matrix

**Last Updated**: November 20, 2025  
**Source**: `employee_profiles.tools_allowed` column  
**Phase**: 1.4 - Tool Access Audit Complete

---

## Tool Access by Employee

| Employee | Slug | Role | Tools Count | Tools |
|----------|------|------|-------------|-------|
| **Prime** | `prime-boss` | CEO & Orchestrator | 1 | `request_employee_handoff` |
| **Byte** | `byte-docs` | Document Processing | 3 | `vision_ocr_light`, `ingest_statement_enhanced`, `request_employee_handoff` |
| **Tag** | `tag-ai` | Categorization Specialist | 7 | `tag_explain_category`, `tag_merchant_insights`, `tag_category_brain`, `tag_update_transaction_category`, `tag_create_manual_transaction`, `transactions_query`, `request_employee_handoff` |
| **Crystal** | `crystal-ai` | Financial Insights Analyst | 7 | `crystal_summarize_income`, `crystal_summarize_expenses`, `analytics_forecast`, `analytics_extract_patterns`, `transactions_query`, `transaction_category_totals`, `request_employee_handoff` |
| **Finley** | `finley-ai` | Wealth & Forecast AI | 7 | `finley_debt_payoff_forecast`, `finley_savings_forecast`, `finley_loan_forecast`, `transactions_query`, `account_balances_query`, `goals_query`, `request_employee_handoff` |
| **Goalie** | `goalie-ai` | AI Goal Concierge | 11 | `goalie_create_goal`, `goalie_list_goals`, `goalie_update_goal_progress`, `goalie_summarize_goals`, `goalie_suggest_actions`, `crystal_summarize_expenses`, `crystal_summarize_income`, `finley_savings_forecast`, `finley_debt_payoff_forecast`, `transactions_query`, `request_employee_handoff` |
| **Liberty** | `liberty-ai` | Financial Freedom Coach | 8 | `transactions_query`, `crystal_summarize_expenses`, `crystal_summarize_income`, `finley_debt_payoff_forecast`, `finley_savings_forecast`, `goalie_list_goals`, `goalie_create_goal`, `request_employee_handoff` |
| **Blitz** | `blitz-ai` | Rapid Action Plans | 4 | `transactions_query`, `goalie_list_goals`, `goalie_suggest_actions`, `request_employee_handoff` |
| **Chime** | `chime-ai` | Smart Notifications | 7 | `chime_generate_notification`, `chime_list_obligations`, `chime_summarize_upcoming_obligations`, `chime_list_upcoming_notifications`, `chime_draft_notification_copy`, `transactions_query`, `request_employee_handoff` |
| **Ledger** | `ledger-tax` | Tax Optimization | 4 | `transactions_query`, `transaction_category_totals`, `crystal_summarize_expenses`, `request_employee_handoff` |

---

## Tool Categories

### Employee-Specific Tools

**Tag Tools** (5):
- `tag_explain_category` - Explain categorization decisions
- `tag_merchant_insights` - Get merchant learning history
- `tag_category_brain` - Get category intelligence
- `tag_update_transaction_category` - Update category (mutates)
- `tag_create_manual_transaction` - Create transaction (mutates)

**Crystal Tools** (2):
- `crystal_summarize_income` - Summarize income
- `crystal_summarize_expenses` - Summarize expenses

**Finley Tools** (3):
- `finley_debt_payoff_forecast` - Debt payoff timeline
- `finley_savings_forecast` - Savings growth projection
- `finley_loan_forecast` - Loan/mortgage payoff

**Goalie Tools** (5):
- `goalie_create_goal` - Create goal (mutates)
- `goalie_list_goals` - List goals
- `goalie_update_goal_progress` - Update progress (mutates)
- `goalie_summarize_goals` - Summarize goals
- `goalie_suggest_actions` - Suggest actions

**Chime Tools** (5):
- `chime_generate_notification` - Generate notification text
- `chime_list_obligations` - List recurring obligations
- `chime_summarize_upcoming_obligations` - Upcoming obligations summary
- `chime_list_upcoming_notifications` - List queued notifications
- `chime_draft_notification_copy` - Draft notification copy

### Shared Query Tools

**Data Access**:
- `transactions_query` - Query transactions (used by 9 employees)
- `transaction_category_totals` - Category totals (used by Crystal, Ledger)
- `account_balances_query` - Account balances (used by Finley)
- `goals_query` - Query goals (used by Finley)

**Analytics**:
- `analytics_forecast` - Financial forecasts (used by Crystal)
- `analytics_extract_patterns` - Extract patterns (used by Crystal)

**Cross-Employee Tools**:
- `crystal_summarize_expenses` - Used by Goalie, Liberty, Ledger
- `crystal_summarize_income` - Used by Goalie, Liberty
- `finley_savings_forecast` - Used by Goalie, Liberty
- `finley_debt_payoff_forecast` - Used by Goalie, Liberty
- `goalie_list_goals` - Used by Liberty, Blitz
- `goalie_create_goal` - Used by Liberty
- `goalie_suggest_actions` - Used by Blitz

### System Tools

**Handoff**:
- `request_employee_handoff` - Transfer conversation (used by all 10 employees)

**Document Processing**:
- `vision_ocr_light` - Light OCR (used by Byte)
- `ingest_statement_enhanced` - Statement processing (used by Byte)

---

## Design Principles

1. **Employee-Specific Tools**: Each employee has tools matching their core function
2. **Query Access**: Employees that need data have `transactions_query` access
3. **Cross-Employee Tools**: Employees can use other employees' analysis tools when appropriate
4. **Handoff Capability**: All employees can hand off to specialists
5. **Minimal Access**: Employees only get tools they actually need

---

## Tool Usage Patterns

### Tag
- Uses own tools for categorization
- Uses `transactions_query` to see transactions before categorizing
- Can hand off to Crystal for analysis

### Crystal
- Uses own tools for summaries
- Uses `transactions_query` and `transaction_category_totals` for analysis
- Can hand off to Finley for forecasting

### Finley
- Uses own forecast tools
- Uses query tools to get data
- Can hand off to Goalie for goal creation

### Goalie
- Uses own goal management tools
- Uses Crystal/Finley tools for analysis
- Uses `transactions_query` to analyze spending
- Can hand off to Finley for complex forecasting

### Liberty
- Uses Crystal/Finley tools for debt analysis
- Uses Goalie tools to link strategies to goals
- Uses `transactions_query` to find fees
- Can hand off to specialists

### Blitz
- Uses Goalie tools for action planning
- Uses `transactions_query` for context
- Can hand off to specialists

### Chime
- Uses own notification tools
- Uses `transactions_query` to detect patterns
- Can hand off to Liberty for debt strategy

### Ledger
- Uses Crystal tools for expense analysis
- Uses `transactions_query` and `transaction_category_totals` for tax analysis
- Can hand off to Crystal for deeper analysis

---

## Verification

After running migration `20251120_fix_employee_tool_access.sql`:

```sql
SELECT 
  slug,
  title,
  array_length(tools_allowed, 1) as tool_count,
  tools_allowed
FROM employee_profiles
WHERE is_active = true
ORDER BY slug;
```

Expected tool counts:
- prime-boss: 1
- byte-docs: 3
- tag-ai: 7
- crystal-ai: 7
- finley-ai: 7
- goalie-ai: 11
- liberty-ai: 8
- blitz-ai: 4
- chime-ai: 7
- ledger-tax: 4

---

**End of Documentation**



