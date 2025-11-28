> **NOTE: This document is now archived. For the latest system overview, see [XSPENSESAI_SYSTEM.md](../XSPENSESAI_SYSTEM.md).**

# Finley AI - Phase 1 Forecasting

**Status:** ✅ **Phase 1 Complete**  
**Date:** February 20, 2025

---

## 📋 Overview

Finley is XspensesAI's **Wealth & Forecasting Planner** — a friendly long-term planning and forecasting assistant that helps users understand their financial future with clear, encouraging forecasts based on real data.

---

## 🎯 What Finley Does in Phase 1

Finley helps users answer forecasting and planning questions by:

1. **Fetching Real Financial Data**
   - Uses Crystal's tools to get actual income and expense summaries
   - Never guesses or hallucinates financial figures
   - Always works with real transaction data

2. **Debt Payoff Forecasting**
   - Calculates how long it will take to pay off debts
   - Shows month-by-month projections
   - Considers interest rates and payment amounts

3. **Savings Projections**
   - Forecasts how much users can save by a future date
   - Based on current spending patterns
   - Accounts for income and expenses

4. **Scenario Analysis**
   - "What if I save $500/month?"
   - "What if I increase my payment by $50?"
   - Helps users explore different financial scenarios

---

## 🛠️ Tools Finley Uses

### Crystal Tools (Data Fetching)
- **`crystal_summarize_income`** - Gets real income totals and patterns
- **`crystal_summarize_expenses`** - Gets real expense totals and patterns

### Finley Tools (Forecasting)
- **`finley_debt_payoff_forecast`** - Calculates debt payoff timelines
- **`finley_savings_forecast`** - Projects savings growth over time

---

## 💬 Example Questions Users Should Ask Finley

### Debt Payoff Questions
- "How long to pay off my $2,000 credit card if I pay $200/month?"
- "When will this debt be paid off?"
- "How long will it take me to pay off this card?"
- "Calculate my debt payoff timeline"

### Savings Forecast Questions
- "How much can I save by December if I keep spending like this?"
- "What will I save in 6 months?"
- "How much money will I have in 2028?"
- "Forecast my savings for next year"

### Planning Questions
- "Plan my debt payoff timeline"
- "What if I save $500 a month?"
- "If I keep paying $300/month, when will I be debt-free?"
- "How much can I save by next year?"

### Scenario Analysis
- "What if I increase my monthly payment by $50?"
- "If I save $500/month, how much will I have in 2 years?"
- "What if I pay off my debt faster?"

---

## 🔄 How Finley Works

### Step-by-Step Flow

1. **User asks a forecasting question**
   - Example: "How much can I save by December?"

2. **Router routes to Finley**
   - Detects forecasting keywords (forecast, save by, plan, etc.)
   - Routes to `finley-ai` employee

3. **Finley fetches real data**
   - Calls `crystal_summarize_income` to get income totals
   - Calls `crystal_summarize_expenses` to get expense totals
   - Uses real transaction data, not guesses

4. **Finley calculates forecast**
   - Uses `finley_savings_forecast` tool for savings projections
   - Uses `finley_debt_payoff_forecast` for debt calculations
   - Shows month-by-month projections

5. **Finley explains results**
   - Breaks down calculations in simple terms
   - Reminds users that forecasts are estimates
   - Encourages and supports users

---

## 🎨 Finley's Communication Style

- **Friendly and Encouraging**: Like a supportive financial coach
- **Clear and Simple**: Uses "grade 4 math" so everyone understands
- **Honest**: Always explains that forecasts are estimates, not guarantees
- **Data-Driven**: Never guesses — always uses real financial data
- **Helpful**: Asks clarifying questions when needed

---

## 📊 Example Response

**User:** "How much can I save by December if I keep spending like this?"

**Finley's Process:**
1. Calls `crystal_summarize_income` → Gets average monthly income
2. Calls `crystal_summarize_expenses` → Gets average monthly expenses
3. Calculates: Income - Expenses = Monthly Savings
4. Uses `finley_savings_forecast` to project to December
5. Responds: "Based on your current spending patterns, you're averaging $2,500/month in income and $2,000/month in expenses. That means you're saving about $500/month. If you keep this up, you'll have approximately $5,000 saved by December! 🎉 Remember, this is an estimate based on your current patterns — life changes will affect the actual amount."

---

## 🔧 Technical Details

### Employee Configuration
- **Slug:** `finley-ai`
- **Model:** `gpt-4o`
- **Temperature:** `0.5` (balanced for calculations)
- **Max Tokens:** `3000` (enough for detailed explanations)

### Routing Patterns
Finley routes questions containing:
- `forecast`, `future`, `plan`, `planning`
- `save by`, `save up`, `how much can I save`
- `how long to pay off`, `pay off`, `debt payoff`
- `by December`, `by [month]`, `next year`
- `what if`, `scenario`, `projection`

### Database Migration
- Migration file: `supabase/migrations/20250220_add_finley_phase1.sql`
- Updates Finley's `tools_allowed` array
- Updates Finley's `system_prompt` with Phase 1 instructions
- Idempotent (safe to run multiple times)

---

## ✅ Phase 1 Acceptance Criteria

- [x] Finley exists in `employee_profiles` with correct model/config
- [x] Finley has access to Crystal tools (`crystal_summarize_income`, `crystal_summarize_expenses`)
- [x] Finley has access to forecasting tools (`finley_debt_payoff_forecast`, `finley_savings_forecast`)
- [x] Router routes forecasting questions to `finley-ai`
- [x] Finley's system prompt instructs tool usage
- [x] TypeScript builds without errors
- [x] Tests verify routing works correctly

---

## 🧪 Testing

### Test Router Logic
```bash
npm run test:finley-routing
```

### Test Employee Registry
```bash
npm run test:registry
```

### Test via HTTP (requires Netlify dev running)
```bash
curl -X POST http://localhost:8888/.netlify/functions/chat \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "userId": "YOUR_USER_ID",
    "message": "How much can I save by December if I keep spending like this?"
  }' | grep -i "X-Employee"
```

**Expected:** `X-Employee: finley-ai`

---

## 🚀 Next Steps (Future Phases)

- **Phase 2:** More sophisticated forecasting models
- **Phase 3:** Retirement planning tools
- **Phase 4:** Investment growth projections
- **Phase 5:** Budget optimization recommendations

---

**Status:** ✅ **Phase 1 Complete and Production-Ready**

